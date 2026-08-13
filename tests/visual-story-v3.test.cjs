const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('keeps optional scene archives outside the primary research journey', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  assert.doesNotMatch(html, /data-field-stories|src="visual-story-v3\.js"/);
  assert.doesNotMatch(script, /LitpathVisualStoryV3|renderFieldStories|loadFieldStories/);
  assert.doesNotMatch(serviceWorker, /story-v3|visual-story-v3/);
});

test('Pages build publishes only product-critical story assets', () => {
  const build = spawnSync(process.execPath, [path.join(root, 'scripts', 'build-pages.mjs')], { encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const output = path.join(root, 'pages-dist');
  assert.equal(fs.existsSync(path.join(output, 'assets', 'story')), true);
  assert.equal(fs.existsSync(path.join(output, 'assets', 'story-v3')), false);
  assert.equal(fs.existsSync(path.join(output, 'visual-story-v3.js')), false);
  assert.equal(fs.existsSync(path.join(output, 'account-core.js')), false);
});
