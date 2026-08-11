const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'story-v3', 'manifest.json');

function webpDimensions(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'VP8 ', 'expected lossy VP8 WebP');
  assert.equal(bytes.subarray(23, 26).toString('hex'), '9d012a', 'missing VP8 key-frame signature');
  return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
}

test('ships fifty unique, decoded and genuinely consumed visual-story assets', () => {
  assert.equal(fs.existsSync(manifestPath), true, 'visual story manifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.version, 3);
  assert.equal(manifest.assets.length, 50);
  assert.equal(new Set(manifest.assets.map((asset) => asset.id)).size, 50);
  assert.equal(new Set(manifest.assets.map((asset) => asset.file)).size, 50);
  assert.equal(new Set(manifest.assets.map((asset) => asset.prompt)).size, 50);

  const runtime = fs.readFileSync(path.join(root, 'visual-story-v3.js'), 'utf8');
  assert.match(runtime, /fetch\('assets\/story-v3\/manifest\.json'/);
  assert.match(runtime, /manifest\.assets\.length < 50/);
  for (const asset of manifest.assets) {
    assert.deepEqual(asset.usedIn, ['visual-story-v3.js']);
    assert.ok(asset.person.length >= 2 && asset.situation.length >= 8 && asset.action.length >= 4);
    assert.ok(asset.productState.length >= 3 && asset.outcome.length >= 5 && asset.alt.length >= 8);
    assert.ok(asset.prompt.length >= 40);
    const file = path.join(root, asset.file);
    assert.deepEqual(webpDimensions(file), { width: 768, height: 512 });
    assert.ok(fs.statSync(file).size > 20_000, `${asset.file} must retain meaningful scene detail`);
  }

  const validation = spawnSync(process.execPath, [
    path.join(root, 'qa', 'validate-visual-story.mjs'),
    '--root', root,
    '--manifest', path.relative(root, manifestPath)
  ], { encoding: 'utf8' });
  assert.equal(validation.status, 0, validation.stderr || validation.stdout);
  const summary = JSON.parse(validation.stdout);
  assert.deepEqual(summary, { project: 'literature-workbench', assetCount: 50, uniqueHashes: 50, runtimeReachable: 50 });
});

test('makes at least twenty story scenes reachable in the core journey with stable image layout', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const runtime = fs.readFileSync(path.join(root, 'visual-story-v3.js'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const build = fs.readFileSync(path.join(root, 'scripts', 'build-pages.mjs'), 'utf8');

  for (const marker of ['data-field-stories', 'data-field-story-filters', 'data-field-story-grid', 'data-field-story-more']) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(html, /src="visual-story-v3\.js"/);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(manifest.assets.filter((asset) => asset.coreReachable).length >= 20);
  assert.match(script, /renderFieldStories/);
  assert.match(script, /loading:\s*['"]lazy['"]/);
  assert.match(script, /width:\s*768/);
  assert.match(script, /height:\s*512/);
  assert.match(css, /\.field-story-control[\s\S]*min-height:\s*44px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /@media\s*\(max-width:\s*430px\)[\s\S]*\.field-story-grid/);
  assert.match(build, /visual-story-v3\.js/);
});
