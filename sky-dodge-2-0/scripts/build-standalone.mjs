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
  const expression = /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+\.css)">/g;
  const matches = [...html.matchAll(expression)];
  let result = html;
  for (const match of matches) {
    const reference = match[1];
    if (!reference) continue;
    const cssPath = path.resolve(temporaryDirectory, reference.replace(/^\.\//, ''));
    const css = await fs.readFile(cssPath, 'utf8');
    result = result.replace(match[0], `<style>\n${css}\n</style>`);
  }
  return result;
}

async function inlineScripts(html) {
  const expression = /<script\s+type="module"\s+crossorigin\s+src="([^"]+\.js)"><\/script>/g;
  const matches = [...html.matchAll(expression)];
  let result = html;
  for (const match of matches) {
    const reference = match[1];
    if (!reference) continue;
    const scriptPath = path.resolve(temporaryDirectory, reference.replace(/^\.\//, ''));
    const source = (await fs.readFile(scriptPath, 'utf8'))
      .replace(/\/\/# sourceMappingURL=.*$/gm, '')
      .replace(/<\/script/gi, '<\\/script');
    result = result.replace(match[0], `<script type="module">\n${source}\n</script>`);
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

    const unresolvedAsset = /(?:src|href)="\.\/assets\//.exec(html);
    if (unresolvedAsset) throw new Error(`Standalone build still references ${unresolvedAsset[0]}`);
    await fs.writeFile(outputPath, html, 'utf8');
    const stats = await fs.stat(outputPath);
    console.log(`Standalone Sky Dodge 2.0: ${outputPath} (${Math.ceil(stats.size / 1024)} KiB)`);
  } finally {
    assertSafeTemporaryDirectory();
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
