'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('a blank workspace opens on a human start desk instead of a long form', () => {
  const html = read('index.html');
  const script = read('script.js');

  assert.match(html, /data-start-desk/);
  assert.match(html, /data-start-template="coursework"/);
  assert.match(html, /data-start-template="review"/);
  assert.match(html, /data-start-template="brief"/);
  assert.match(html, /data-start-blank/);
  assert.match(script, /STARTER_TEMPLATES/);
  assert.match(script, /applyStarterTemplate/);
  assert.match(script, /location\.hash\.replace\('#', ''\) \|\| 'overview'/);
});

test('the product keeps one visible checkpoint across the research journey', () => {
  const html = read('index.html');
  const script = read('script.js');

  for (const marker of [
    'data-product-checkpoint',
    'data-checkpoint-stage',
    'data-checkpoint-title',
    'data-checkpoint-copy',
    'data-checkpoint-action',
  ]) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(script, /renderProductCheckpoint/);
  assert.match(script, /nextResearchAction/);
});

test('mobile navigation describes four user chapters, not seven internal modules', () => {
  const html = read('index.html');
  const mobileNav = html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/);

  assert.ok(mobileNav, 'mobile navigation exists');
  assert.equal((mobileNav[0].match(/data-mobile-chapter=/g) || []).length, 4);
  for (const label of ['开始', '找证据', '做判断', '带走']) {
    assert.match(mobileNav[0], new RegExp(`<span>${label}<\\/span>`));
  }
});

test('starter templates never fabricate literature records or claims', () => {
  const script = read('script.js');
  const starterBlock = script.match(/var STARTER_TEMPLATES =[\s\S]*?\n  };/);

  assert.ok(starterBlock, 'starter template definitions exist');
  assert.doesNotMatch(starterBlock[0], /records|title:\s*['"][^'"]+文献|abstract|doi|coreFinding/);
});
