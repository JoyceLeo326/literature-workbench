const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const policyPath = path.join(root, 'cost-policy.js');
const cost = fs.existsSync(policyPath) ? require(policyPath) : {};

test('ships an explicit zero-owner-cost default configuration', () => {
  const envPath = path.join(root, '.env.example');
  assert.equal(fs.existsSync(policyPath), true, 'cost-policy.js must exist');
  assert.equal(fs.existsSync(envPath), true, '.env.example must exist');
  assert.match(fs.readFileSync(envPath, 'utf8'), /^COST_MODE=zero_owner_cost$/m);
  assert.equal(cost.DEFAULT_COST_MODE, 'zero_owner_cost');
  assert.equal(typeof cost.createCostPolicy, 'function');
  assert.equal(typeof cost.requestPublicJson, 'function');
});

test('forces zero owner cost and never enables automatic billing or paid fallback', () => {
  const policy = cost.createCostPolicy({ COST_MODE: 'paid_owner_account' });

  assert.equal(policy.mode, 'zero_owner_cost');
  assert.equal(policy.ownerMonthlyBudget, 0);
  assert.equal(policy.automaticBilling, false);
  assert.equal(policy.allowsPaidFallback, false);
  assert.equal(policy.forcedZeroCost, true);
  assert.equal(policy.providers.crossref.enabled, true);
  assert.equal(policy.providers.crossref.paidFallback, false);
  assert.equal(policy.providers.openalex.enabled, false);
  assert.equal(policy.providers.openalex.paidFallback, false);
  assert.match(policy.providers.openalex.reason, /未集成/);
});

test('allows only the Crossref public endpoint and returns successful JSON', async () => {
  const requests = [];
  const payload = { message: { title: ['Public metadata'] } };
  const result = await cost.requestPublicJson(
    'crossref',
    'https://api.crossref.org/works/10.1000/test',
    async (url, options) => {
      requests.push({ url, options });
      return { ok: true, status: 200, json: async () => payload };
    }
  );

  assert.deepEqual(result, payload);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.Accept, 'application/json');
  await assert.rejects(
    cost.requestPublicJson('crossref', 'https://paid.example.com/works/test', async () => ({ ok: true, json: async () => ({}) })),
    (error) => error.code === 'ENDPOINT_NOT_ALLOWED' && error.paidFallbackAttempted === false
  );
});

test('fails closed on public API limits and outages without attempting a paid fallback', async () => {
  let calls = 0;
  await assert.rejects(
    cost.requestPublicJson('crossref', 'https://api.crossref.org/works/10.1000/limited', async () => {
      calls += 1;
      return { ok: false, status: 429, statusText: 'Too Many Requests' };
    }),
    (error) => error.code === 'PUBLIC_API_RATE_LIMITED' &&
      error.recoverableLocally === true &&
      error.paidFallbackAttempted === false &&
      /本地录入或导入/.test(error.message)
  );
  assert.equal(calls, 1);

  await assert.rejects(
    cost.requestPublicJson('crossref', 'https://api.crossref.org/works/10.1000/offline', async () => {
      throw new Error('network unavailable');
    }),
    (error) => error.code === 'PUBLIC_API_UNAVAILABLE' &&
      error.recoverableLocally === true &&
      error.paidFallbackAttempted === false
  );
});

test('blocks non-integrated OpenAlex and unknown providers before network access', async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return { ok: true, json: async () => ({}) }; };

  await assert.rejects(
    cost.requestPublicJson('openalex', 'https://api.openalex.org/works', fetcher),
    (error) => error.code === 'PROVIDER_NOT_ALLOWED' && error.paidFallbackAttempted === false
  );
  await assert.rejects(
    cost.requestPublicJson('commercial-metadata', 'https://example.com', fetcher),
    (error) => error.code === 'PROVIDER_NOT_ALLOWED' && error.paidFallbackAttempted === false
  );
  assert.equal(calls, 0);
});

test('integrates the boundary in UI and documentation without claiming future capabilities', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const docPath = path.join(root, 'docs', 'zero-owner-cost.md');

  assert.match(index, /data-cost-mode="zero_owner_cost"/);
  assert.match(index, /本地 0 成本/);
  assert.match(index, /无付费服务 · 无自动账单/);
  assert.match(index, /<script src="cost-policy\.js"><\/script>[\s\S]*<script src="script\.js"><\/script>/);
  assert.match(script, /CostPolicy\.requestPublicJson\('crossref'/);
  assert.doesNotMatch(script, /fetch\('https:\/\/api\.crossref\.org/);
  assert.match(script, /本地录入或导入/);
  assert.match(sw, /cost-policy\.js/);

  ['importCSV', 'importBibTeX', 'importRIS', 'exportCSV', 'exportJSON', 'exportSynthesis', 'exportBibTeX', 'exportReport', 'renderScreening'].forEach((capability) => {
    assert.match(script, new RegExp('function\\s+' + capability + '\\b'));
  });

  assert.equal(fs.existsSync(docPath), true, 'docs/zero-owner-cost.md must exist');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.match(doc, /## 当前已实现/);
  assert.match(doc, /localStorage/);
  assert.match(doc, /IndexedDB（后续路线，未实现）/);
  assert.match(doc, /BYOS（后续路线，未实现）/);
  assert.match(doc, /### 商业部署路线：Cloudflare Pages/);
  assert.match(doc, /Vercel Hobby 仅用于个人、非商业作品演示/);
  assert.match(doc, /官方配额与条款会变化/);
  assert.match(doc, /OCR、云同步、成本仪表盘均未实现/);
  assert.match(doc, /https:\/\/developers\.cloudflare\.com\/pages\/platform\/limits\//);
  assert.match(doc, /https:\/\/vercel\.com\/docs\/plans\/hobby/);
  assert.match(readme, /docs\/zero-owner-cost\.md/);
  assert.doesNotMatch(readme, /生产部署：Vercel/);
});
