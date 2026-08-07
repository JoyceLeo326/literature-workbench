const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('ships a self-contained static runtime with no owner credentials', () => {
  const envPath = path.join(root, '.env.example');
  const build = fs.readFileSync(path.join(root, 'scripts', 'build-pages.mjs'), 'utf8');
  assert.equal(fs.existsSync(envPath), true, '.env.example must exist');
  assert.match(fs.readFileSync(envPath, 'utf8'), /^COST_MODE=zero_owner_cost$/m);
  assert.doesNotMatch(build, /cost-policy\.js|server|function/i);
});

test('published runtime has no external metadata API, CDN or paid fallback path', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const runtime = `${index}\n${script}\n${sw}`;

  assert.doesNotMatch(index, /data-cost-mode|本地 0 成本|无自动账单/);
  assert.doesNotMatch(runtime, /api\.crossref\.org|api\.openalex\.org|fonts\.(?:googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/);
  assert.doesNotMatch(script, /\bfetch\s*\(|requestPublicJson|paidFallback/i);
  assert.match(index, /仅在浏览器内校验格式/);
  assert.match(script, /DOI 格式有效/);
  assert.doesNotMatch(sw, /cost-policy\.js/);
});

test('keeps the complete local workflow available without network services', () => {
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const docPath = path.join(root, 'docs', 'zero-owner-cost.md');

  ['lookupDOI', 'importCSV', 'importBibTeX', 'importRIS', 'exportCSV', 'exportJSON', 'exportSynthesis', 'exportBibTeX', 'exportReport', 'renderScreening'].forEach((capability) => {
    assert.match(script, new RegExp('function\\s+' + capability + '\\b'));
  });
  assert.equal(fs.existsSync(docPath), true, 'runtime boundary document must exist');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.match(doc, /## 当前已实现/);
  assert.match(doc, /localStorage/);
  assert.match(doc, /不发起境外元数据 API 请求/);
  assert.match(doc, /IndexedDB（后续路线，未实现）/);
  assert.match(doc, /BYOS（后续路线，未实现）/);
  assert.match(readme, /不依赖境外运行时 API/);
});
