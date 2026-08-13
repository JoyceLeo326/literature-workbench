'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('saving a complete research boundary advances to the three-strategy decision', () => {
  const script = read('script.js');
  const handlerStart = script.indexOf("$('[data-scope-form]').addEventListener('submit'");
  const saveHandler = handlerStart >= 0 ? script.slice(handlerStart, handlerStart + 2_500) : '';

  assert.ok(saveHandler, 'scope submit handler exists');
  assert.match(saveHandler, /showView\('queries'\)/);
  assert.match(saveHandler, /data-strategy-desk/);
});

test('mobile primary navigation keeps research boundary instead of a late quality view', () => {
  const html = read('index.html');
  const nav = html.match(/<nav class="mobile-nav"[\s\S]*?<\/nav>/);

  assert.ok(nav, 'mobile navigation exists');
  assert.match(nav[0], /data-nav="scope"[\s\S]*?<span>边界<\/span>/);
  assert.doesNotMatch(nav[0], /data-nav="quality"/);
});

test('the public product does not present same-device storage as online login', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /data-auth-(?:login|register|modal|guest|profile)/);
  assert.doesNotMatch(html, />\s*(?:登录|注册|创建账户)\s*</);
});

test('the primary runtime and release no longer ship the fifty-image gallery', () => {
  const html = read('index.html');
  const script = read('script.js');
  const build = read('scripts/build-pages.mjs');
  const serviceWorker = read('sw.js');
  const workflow = read('.github/workflows/ci.yml');

  assert.doesNotMatch(html, /data-field-stories|50 个真实研究处境|展开全部 50/);
  assert.doesNotMatch(script, /loadFieldStories|renderFieldStories|LitpathVisualStoryV3/);
  assert.doesNotMatch(build, /visual-story-v3\.js|story-v3/);
  assert.doesNotMatch(serviceWorker, /story-v3/);
  assert.doesNotMatch(workflow, /fifty images|validate-image-delta/i);
});
