import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORIES, VISUAL_LANGUAGE } from './visual-story-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'assets', 'story-v3', 'manifest.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify({
  $schema: '../../docs/visual-story-manifest.schema.json',
  project: 'literature-workbench',
  version: 3,
  visualLanguage: VISUAL_LANGUAGE,
  generatedWith: 'built-in imagegen, one prompt per asset',
  assets: STORIES
}, null, 2)}\n`);
console.log(`Visual story manifest ready: ${STORIES.length} assets`);
