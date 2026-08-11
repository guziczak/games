import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standalonePath = path.join(projectRoot, 'index.html');
const screenshotDirectory = process.env.SMOKE_SCREENSHOT_DIR
  ? path.resolve(process.env.SMOKE_SCREENSHOT_DIR)
  : null;

function findEdge() {
  const candidates = [
    process.env.EDGE_PATH,
    path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.PROGRAMFILES ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) throw new Error('Microsoft Edge was not found; set EDGE_PATH to its executable');
  return executable;
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a CDP port'));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pollJson(url, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await delay(80);
  }
  throw new Error(`CDP did not become ready: ${lastError instanceof Error ? lastError.message : 'timeout'}`);
}

class CdpClient {
  #socket;
  #nextId = 1;
  #pending = new Map();
  #events = [];

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket timeout')), 8_000);
      socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      socket.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('CDP WebSocket connection failed'));
      }, { once: true });
    });
    return new CdpClient(socket);
  }

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', (message) => {
      const payload = JSON.parse(String(message.data));
      if (payload.id) {
        const pending = this.#pending.get(payload.id);
        if (!pending) return;
        this.#pending.delete(payload.id);
        if (payload.error) pending.reject(new Error(payload.error.message));
        else pending.resolve(payload.result);
      } else {
        this.#events.push(payload);
      }
    });
  }

  send(method, params = {}) {
    const id = this.#nextId;
    this.#nextId += 1;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  events(method) {
    return this.#events.filter((event) => event.method === method);
  }

  close() {
    this.#socket.close();
  }
}

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  }
  return response.result?.value;
}

async function captureScreenshot(client, filename) {
  if (!screenshotDirectory) return;
  await fs.mkdir(screenshotDirectory, { recursive: true });
  const screenshot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.writeFile(path.join(screenshotDirectory, filename), Buffer.from(screenshot.data, 'base64'));
}

async function assertDoubleTapDoesNotZoom(client, x, y) {
  const scaleBefore = await evaluate(client, 'visualViewport?.scale ?? 1');
  for (let tap = 0; tap < 2; tap += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 71, radiusX: 8, radiusY: 8, force: 1 }],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await delay(105);
  }
  await delay(360);
  const scaleAfter = await evaluate(client, 'visualViewport?.scale ?? 1');
  assert(
    Math.abs(scaleAfter - scaleBefore) < 0.01,
    `double tap changed viewport scale ${scaleBefore} -> ${scaleAfter}`,
  );
}

async function waitForValue(client, expression, predicate, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await evaluate(client, expression);
    if (predicate(value)) return value;
    await delay(80);
  }
  throw new Error(`Timed out waiting for: ${expression}; last value: ${JSON.stringify(value)}`);
}

async function restartInMode(client, mode) {
  await evaluate(client, '__SKY_DODGE_2__.restart()');
  await waitForValue(client, '__SKY_DODGE_2__.phase()', (value) => value === 'running');
  await evaluate(client, `__SKY_DODGE_2__.forceMode(${JSON.stringify(mode)})`);
  await waitForValue(client, '__SKY_DODGE_2__.snapshot().mode.active', (value) => value === mode);
}

async function assertModeMechanics(client) {
  await restartInMode(client, 'frog');
  await waitForValue(
    client,
    '__SKY_DODGE_2__.snapshot().mode.frog.phase',
    (value) => value === 'clinging',
    6_000,
  );
  await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "ability-start" })');
  await waitForValue(client, '__SKY_DODGE_2__.snapshot().mode.frog.phase', (value) => value === 'charging');
  await delay(180);
  await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "ability-release" })');
  const frogLaunch = await waitForValue(
    client,
    '({ phase: __SKY_DODGE_2__.snapshot().mode.frog.phase, vy: __SKY_DODGE_2__.snapshot().player.vy })',
    (value) => value?.phase === 'airborne' && value.vy > 0,
  );
  assert(frogLaunch.vy > 0, 'frog did not launch away from the floor');

  await restartInMode(client, 'rubber');
  await evaluate(client, `(() => {
    __SKY_DODGE_2__.dispatch({ type: 'ability-start' });
    __SKY_DODGE_2__.dispatch({ type: 'ability-aim', vector: { x: -0.72, y: 0.46 } });
    __SKY_DODGE_2__.dispatch({ type: 'ability-release' });
  })()`);
  const rubberLaunch = await waitForValue(
    client,
    '({ phase: __SKY_DODGE_2__.snapshot().mode.rubber.phase, vx: __SKY_DODGE_2__.snapshot().player.vx, vy: __SKY_DODGE_2__.snapshot().player.vy })',
    (value) => value?.phase === 'flying' && Math.abs(value.vx) > 0.5 && Math.abs(value.vy) > 0.5,
  );
  assert(rubberLaunch.vx > 0 && rubberLaunch.vy < 0, 'rubber launch vector does not oppose the pull');

  await restartInMode(client, 'steel');
  const steelImpact = await waitForValue(
    client,
    '({ status: __SKY_DODGE_2__.snapshot().status, heat: __SKY_DODGE_2__.snapshot().mode.steel.heat })',
    (value) => value?.status === 'running' && value.heat > 0,
    6_000,
  );
  assert(steelImpact.heat > 0, 'steel did not convert an impact into heat');

  await restartInMode(client, 'ghost');
  await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "ability-start" })');
  const ghostStart = await waitForValue(
    client,
    '({ phase: __SKY_DODGE_2__.snapshot().mode.ghost.phase, energy: __SKY_DODGE_2__.snapshot().mode.ghost.energy })',
    (value) => value?.phase === 'phasing',
  );
  await delay(180);
  const ghostEnergy = await evaluate(client, '__SKY_DODGE_2__.snapshot().mode.ghost.energy');
  assert(ghostEnergy < ghostStart.energy, 'ghost phase did not drain energy');
  await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "ability-release" })');
  await waitForValue(client, '__SKY_DODGE_2__.snapshot().mode.ghost.phase', (value) => value === 'material');

  await restartInMode(client, 'stork');
  await evaluate(client, `globalThis.__sky2StorkPilot = setInterval(() => {
    const state = __SKY_DODGE_2__.snapshot();
    if (state.player.y < 4.4) __SKY_DODGE_2__.dispatch({ type: 'flap' });
  }, 90)`);
  try {
    await waitForValue(client, '!document.querySelector("#storkActionButton").disabled', (value) => value === true, 7_000);
    await evaluate(client, `(() => {
      __SKY_DODGE_2__.dispatch({ type: 'ability-start' });
      __SKY_DODGE_2__.dispatch({ type: 'ability-aim', vector: { x: 0, y: 0.72 } });
    })()`);
    await waitForValue(client, '__SKY_DODGE_2__.snapshot().mode.stork.phase', (value) => value === 'aiming');
    await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "ability-release" })');
    const storkVault = await waitForValue(
      client,
      '({ phase: __SKY_DODGE_2__.snapshot().mode.stork.phase, uses: __SKY_DODGE_2__.snapshot().mode.stork.uses })',
      (value) => value?.phase === 'vaulting' && value.uses === 2,
    );
    assert(storkVault.uses === 2, 'stork PIK did not consume exactly one use');
  } finally {
    await evaluate(client, 'clearInterval(globalThis.__sky2StorkPilot); delete globalThis.__sky2StorkPilot');
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const html = await fs.readFile(standalonePath, 'utf8');
  assert(html.includes('Standalone build:'), 'index.html is not the generated standalone build');
  assert(!/<(?:script|link)\b[^>]*(?:src|href)=/i.test(html), 'index.html contains an external script or stylesheet');

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sky-dodge-2-smoke-'));
  const port = await findFreePort();
  const fileUrl = pathToFileURL(standalonePath).href;
  const browser = spawn(findEdge(), [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${temporaryDirectory}`,
    fileUrl,
  ], { stdio: 'ignore', windowsHide: true });

  let client;
  try {
    const targets = await pollJson(`http://127.0.0.1:${port}/json/list`);
    const page = targets.find((target) => target.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('Edge did not expose a page target');
    client = await CdpClient.connect(page.webSocketDebuggerUrl);
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Page.enable');

    await waitForValue(client, 'globalThis.__SKY_DODGE_2__?.phase()', (value) => value === 'menu', 15_000);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1440,
      screenHeight: 900,
    });
    await delay(150);
    await captureScreenshot(client, 'sky-dodge-2-menu.png');
    const protocol = await evaluate(client, 'location.protocol');
    assert(protocol === 'file:', `expected file: protocol, received ${protocol}`);
    const resources = await evaluate(client, 'performance.getEntriesByType("resource").map((entry) => entry.name)');
    assert(Array.isArray(resources) && resources.length === 0, `standalone loaded external resources: ${JSON.stringify(resources)}`);

    await evaluate(client, 'document.querySelector("#startButton").click()');
    await waitForValue(client, 'globalThis.__SKY_DODGE_2__?.phase()', (value) => value === 'running');
    await evaluate(client, `(() => {
      const canvas = document.querySelector('#gameCanvas');
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 41, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 120, clientY: 220 }));
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 41, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 120, clientY: 220 }));
    })()`);
    const flying = await waitForValue(
      client,
      '({ tick: __SKY_DODGE_2__.snapshot().clock.tick, vy: __SKY_DODGE_2__.snapshot().player.vy })',
      (value) => value?.tick > 0 && value.vy > 0,
    );
    assert(flying.vy > 0, 'canvas pointer did not flap');

    if (screenshotDirectory) {
      await evaluate(client, `globalThis.__sky2SmokePilot = setInterval(() => {
        const state = __SKY_DODGE_2__.snapshot();
        if (state.player.y < 4.8) __SKY_DODGE_2__.dispatch({ type: 'flap' });
      }, 80)`);
      await delay(2_600);
      await captureScreenshot(client, 'sky-dodge-2-gameplay.png');
      await evaluate(client, 'clearInterval(globalThis.__sky2SmokePilot); delete globalThis.__sky2SmokePilot');
    }

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });
    await delay(250);
    const mobileLayout = await evaluate(client, `(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      canvasWidth: document.querySelector('#gameCanvas').getBoundingClientRect().width,
      canvasHeight: document.querySelector('#gameCanvas').getBoundingClientRect().height
    }))()`);
    assert(mobileLayout.width === 390, `unexpected mobile width ${mobileLayout.width}`);
    assert(mobileLayout.scrollWidth === 390, `horizontal overflow ${mobileLayout.scrollWidth}`);
    assert(mobileLayout.canvasWidth === 390, 'canvas does not cover mobile viewport');

    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await assertDoubleTapDoesNotZoom(client, 190, 430);

    // Reset after the viewport transition so the visual capture cannot race a
    // boundary death caused by time spent resizing the headless browser.
    await evaluate(client, '__SKY_DODGE_2__.restart()');
    await waitForValue(client, '__SKY_DODGE_2__.phase()', (value) => value === 'running');
    await evaluate(client, '__SKY_DODGE_2__.forceMode("stork")');
    await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "flap" })');
    await delay(80);
    await captureScreenshot(client, 'sky-dodge-2-mobile-stork.png');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625,
      mobile: true,
      screenWidth: 412,
      screenHeight: 915,
    });
    await delay(180);
    const androidLayout = await evaluate(client, `(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      canvasWidth: document.querySelector('#gameCanvas').getBoundingClientRect().width
    }))()`);
    assert(androidLayout.width === 412, `unexpected Android width ${androidLayout.width}`);
    assert(androidLayout.scrollWidth === 412, `Android horizontal overflow ${androidLayout.scrollWidth}`);
    assert(androidLayout.canvasWidth === 412, 'canvas does not cover Android viewport');
    await assertDoubleTapDoesNotZoom(client, 206, 460);

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 800,
      height: 450,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: 800,
      screenHeight: 450,
    });
    await delay(180);
    const landscapeLayout = await evaluate(client, `(() => {
      const rect = (selector) => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom };
      };
      const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const score = rect('.score-cluster');
      const dna = rect('.dna-panel');
      const mode = rect('.mode-cluster');
      const mute = rect('#muteButton');
      const pik = rect('#storkActionButton');
      const pause = rect('#pauseButton');
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hudOverlap: overlap(score, dna) || overlap(dna, mode) || overlap(mode, mute),
        controlsOverlap: overlap(pik, pause),
        controlsInside: pik.left >= 0 && pik.right <= innerWidth && pik.top >= 0 && pik.bottom <= innerHeight
          && pause.left >= 0 && pause.right <= innerWidth && pause.top >= 0 && pause.bottom <= innerHeight
      };
    })()`);
    assert(landscapeLayout.width === 800 && landscapeLayout.scrollWidth === 800, 'landscape viewport overflow');
    assert(!landscapeLayout.hudOverlap, 'landscape HUD overlaps');
    assert(!landscapeLayout.controlsOverlap && landscapeLayout.controlsInside, 'landscape controls overlap or overflow');

    for (const mode of ['frog', 'rubber', 'steel', 'ghost', 'stork']) {
      await evaluate(client, '__SKY_DODGE_2__.dispatch({ type: "flap" })');
      await evaluate(client, `__SKY_DODGE_2__.forceMode(${JSON.stringify(mode)})`);
      await delay(70);
      const activeMode = await evaluate(client, '__SKY_DODGE_2__.snapshot().mode.active');
      assert(activeMode === mode, `failed to enter ${mode}`);
    }

    await assertModeMechanics(client);

    for (let restart = 0; restart < 12; restart += 1) {
      await evaluate(client, '__SKY_DODGE_2__.restart()');
    }
    await waitForValue(client, '__SKY_DODGE_2__.phase()', (value) => value === 'running');
    const resetState = await evaluate(client, '({ score: __SKY_DODGE_2__.snapshot().score.total, mode: __SKY_DODGE_2__.snapshot().mode.active })');
    assert(resetState.score === 0 && resetState.mode === 'normal', 'restart did not fully reset the run');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });
    await waitForValue(client, '__SKY_DODGE_2__.phase()', (value) => value === 'game-over', 8_000);
    const gameOverTypography = await evaluate(client, `(() => {
      const title = document.querySelector('.game-over-title');
      const card = document.querySelector('.game-over-card');
      const results = document.querySelector('.results');
      const titleRect = title.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const resultsRect = results.getBoundingClientRect();
      const style = getComputedStyle(title);
      return {
        text: title.textContent.trim(),
        letterSpacing: Number.parseFloat(style.letterSpacing),
        wordSpacing: Number.parseFloat(style.wordSpacing),
        inside: titleRect.left >= cardRect.left && titleRect.right <= cardRect.right,
        separated: titleRect.bottom <= resultsRect.top,
        scrollWidth: document.documentElement.scrollWidth,
      };
    })()`);
    assert(gameOverTypography.text === 'KONIEC LOTU', 'game-over title changed unexpectedly');
    assert(gameOverTypography.letterSpacing > 0 && gameOverTypography.wordSpacing > 0, 'game-over title spacing is not explicit');
    assert(gameOverTypography.inside && gameOverTypography.separated, 'game-over title overflows or overlaps results');
    assert(gameOverTypography.scrollWidth === 390, 'game-over screen causes mobile overflow');
    await captureScreenshot(client, 'sky-dodge-2-game-over.png');

    await delay(150);
    const runtimeExceptions = client.events('Runtime.exceptionThrown');
    const logErrors = client.events('Log.entryAdded').filter((event) => event.params?.entry?.level === 'error');
    assert(runtimeExceptions.length === 0, `runtime exceptions: ${JSON.stringify(runtimeExceptions)}`);
    assert(logErrors.length === 0, `browser log errors: ${JSON.stringify(logErrors)}`);

    console.log(`PASS file:// standalone, ${Math.ceil(html.length / 1024)} KiB, iPhone ${mobileLayout.width}×${mobileLayout.height}, Android ${androidLayout.width}×915, landscape ${landscapeLayout.width}×450, tick ${flying.tick}`);
  } finally {
    client?.close();
    browser.kill();
    await new Promise((resolve) => {
      if (browser.exitCode !== null) resolve();
      else {
        browser.once('exit', resolve);
        setTimeout(resolve, 2_000);
      }
    });
    const resolvedTemporary = path.resolve(temporaryDirectory);
    if (path.dirname(resolvedTemporary) === path.resolve(os.tmpdir())
      && path.basename(resolvedTemporary).startsWith('sky-dodge-2-smoke-')) {
      await fs.rm(resolvedTemporary, { recursive: true, force: true });
    }
  }
}

await main();
