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
  'experience-core.js',
  'story-core.js',
  'decision-core.js',
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
for (const directory of ['brand', 'story']) {
  fs.cpSync(path.join(root, 'assets', directory), path.join(output, 'assets', directory), { recursive: true });
}
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, '404.html'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Pages artifact ready: ${files.length + 3} entries`);
