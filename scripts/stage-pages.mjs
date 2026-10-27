import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.resolve(root, '_site');
if (path.dirname(output) !== root) throw new Error('Invalid Pages output path');

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output);

const rootFiles = (await fs.readdir(root, { withFileTypes: true }))
  .filter(item => item.isFile() && (item.name === '.nojekyll' || /\.(?:html|css|js)$/.test(item.name)))
  .map(item => item.name);

async function copyPublicFile(relative) {
  if (relative.startsWith('/') || relative.split('/').includes('..')) {
    throw new Error(`Unsafe public path: ${relative}`);
  }
  const source = path.resolve(root, relative);
  const destination = path.resolve(output, relative);
  if (!source.startsWith(root + path.sep) || !destination.startsWith(output + path.sep)) {
    throw new Error(`Path escaped project: ${relative}`);
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

for (const file of rootFiles) await copyPublicFile(file);
if (!rootFiles.includes('index.html')) throw new Error('index.html is required');

const publicAssets = new Set();
const sourceFiles = [...rootFiles];
for (const file of rootFiles.filter(name => name.endsWith('.html'))) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href|poster|data-src)\s*=\s*["']\.\/(assets\/[A-Za-z0-9._/-]+)(?:\?[^"']*)?["']/g)) {
    publicAssets.add(match[1]);
  }
}

// CSS and JS can refer to local assets without an HTML attribute.
for (const file of sourceFiles.filter(name => /\.(?:css|js)$/.test(name))) {
  const content = await fs.readFile(path.join(root, file), 'utf8');
  for (const match of content.matchAll(/\.\/(assets\/[A-Za-z0-9._/-]+)/g)) {
    publicAssets.add(match[1]);
  }
}

for (const asset of [...publicAssets].sort()) await copyPublicFile(asset);
await copyPublicFile('assets/vendor/NOTICE.txt');
console.log(`Staged ${rootFiles.length} root files and ${publicAssets.size} referenced assets`);
