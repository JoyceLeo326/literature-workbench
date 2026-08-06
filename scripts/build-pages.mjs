import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'pages-dist');
if (path.dirname(output) !== root || path.basename(output) !== 'pages-dist') {
  throw new Error('Unexpected Pages output path.');
}

const files = [
  'index.html',
  'styles.css',
  'script.js',
  'account-core.js',
  'cost-policy.js',
  'experience-core.js',
  'story-core.js',
  'literature-core.js',
  'workspace-core.js',
  'manifest.webmanifest',
  'sw.js',
  'favicon.svg'
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const relative of files) {
  fs.copyFileSync(path.join(root, relative), path.join(output, relative));
}
const assets = path.join(root, 'assets');
if (fs.existsSync(assets)) fs.cpSync(assets, path.join(output, 'assets'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, '404.html'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Pages artifact ready: ${files.length + 3} entries`);
