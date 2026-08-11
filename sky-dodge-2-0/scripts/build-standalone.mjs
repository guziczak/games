import { build } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(projectRoot, 'index.source.html');
const outputPath = path.join(projectRoot, 'index.html');
const temporaryDirectory = path.join(projectRoot, '.standalone-build');

function assertSafeTemporaryDirectory() {
  if (path.dirname(temporaryDirectory) !== projectRoot || path.basename(temporaryDirectory) !== '.standalone-build') {
    throw new Error(`Refusing to clean unexpected build directory: ${temporaryDirectory}`);
  }
}

async function inlineStyles(html) {
  const expression = /<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi;
  const matches = [...html.matchAll(expression)];
  let result = html;
  for (const match of matches) {
    const reference = match[0].match(/\bhref=["']([^"']+\.css)["']/i)?.[1];
    if (!reference) continue;
    const cssPath = path.resolve(temporaryDirectory, reference.replace(/^\.\//, ''));
    const css = await fs.readFile(cssPath, 'utf8');
    result = result.replace(match[0], () => `<style>\n${css}\n</style>`);
  }
  return result;
}

async function inlineScripts(html) {
  const expression = /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']+\.js["'])[^>]*><\/script>/gi;
  const matches = [...html.matchAll(expression)];
  let result = html;
  const embeddedScripts = [];
  for (const match of matches) {
    const reference = match[0].match(/\bsrc=["']([^"']+\.js)["']/i)?.[1];
    if (!reference) continue;
    const scriptPath = path.resolve(temporaryDirectory, reference.replace(/^\.\//, ''));
    const source = (await fs.readFile(scriptPath, 'utf8'))
      .replace(/\/\/# sourceMappingURL=.*$/gm, '')
      .replace(/<\/script/gi, '<\\/script');
    result = result.replace(match[0], '');
    embeddedScripts.push(source);
  }
  if (embeddedScripts.length > 0) {
    // Chromium treats file:// module scripts as opaque-origin fetches and can
    // refuse even an inline module. A classic strict script at the end of body
    // has no fetch step and therefore works after a plain Windows double-click.
    const block = `<script>\n"use strict";\n${embeddedScripts.join('\n')}\n</script>`;
    // Use a replacer callback: bundled JavaScript legitimately contains `$&`
    // and `$`` sequences, which String.replace would otherwise expand as
    // replacement tokens and silently inject chunks of the HTML into the JS.
    result = result.replace('</body>', () => `${block}\n  </body>`);
  }
  return result;
}

async function main() {
  assertSafeTemporaryDirectory();
  const template = await fs.readFile(templatePath, 'utf8');
  await fs.writeFile(outputPath, template, 'utf8');

  try {
    await build({
      root: projectRoot,
      configFile: path.join(projectRoot, 'vite.config.ts'),
      build: {
        outDir: temporaryDirectory,
        emptyOutDir: true,
        sourcemap: true,
      },
      logLevel: 'info',
    });

    let html = await fs.readFile(path.join(temporaryDirectory, 'index.html'), 'utf8');
    html = await inlineStyles(html);
    html = await inlineScripts(html);
    html = html.replace(/<link\s+rel="modulepreload"[^>]*>/g, '');
    html = html.replace(
      '<head>',
      '<head>\n    <!-- Standalone build: CSS, TypeScript bundle, Three.js and procedural audio are embedded below. -->',
    );

    const unresolvedAsset = /(?:src|href)=["'](?:\.\/)?assets\//i.exec(html);
    if (unresolvedAsset) throw new Error(`Standalone build still references ${unresolvedAsset[0]}`);
    const externalRuntimeReference = /<(?:script|link)\b[^>]*(?:src|href)=["'](?:https?:|\/|\.\/)/i.exec(html);
    if (externalRuntimeReference) {
      throw new Error(`Standalone build still contains an external runtime reference: ${externalRuntimeReference[0]}`);
    }
    if (!html.includes('Standalone build:') || !html.includes('<style>') || !html.includes('<script>\n"use strict";')) {
      throw new Error('Standalone build did not inline both CSS and JavaScript');
    }
    html = html
      .replace(/[ \t]+$/gm, '')
      .replace(/^ +\t/gm, '\t');
    await fs.writeFile(outputPath, html, 'utf8');
    const stats = await fs.stat(outputPath);
    console.log(`Standalone Sky Dodge 2.0: ${outputPath} (${Math.ceil(stats.size / 1024)} KiB)`);
  } finally {
    assertSafeTemporaryDirectory();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
