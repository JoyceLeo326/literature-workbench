const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('research profile changes the journey, advice, and delivery context', () => {
  const experience = require(path.join(root, 'experience-core.js'));
  const novice = experience.normalizeProfile({ researchStage: 'coursework', deliveryGoal: 'class-report', weeklyHours: 3 });
  const advanced = experience.normalizeProfile({ researchStage: 'thesis', deliveryGoal: 'proposal', weeklyHours: 10 });
  assert.notDeepEqual(experience.buildJourney(novice, { title: '平台治理研究' }, { total: 4, verified: 1 }), experience.buildJourney(advanced, { title: '平台治理研究' }, { total: 4, verified: 1 }));
  assert.notEqual(experience.personalizeAdvice('补齐来源', novice), experience.personalizeAdvice('补齐来源', advanced));
  assert.match(experience.profileLines(novice).join('\n'), /课程研究/);
});

test('ships an immersive profile surface and a mainland-first Pages artifact', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
  for (const marker of ['name="researchStage"', 'name="deliveryGoal"', 'name="weeklyHours"', 'data-research-journey']) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(script, /LitpathExperience/);
  assert.match(script, /profileLines/);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /pages-dist/);
  assert.match(html, /rel="canonical" href="https:\/\/joyceleo326\.github\.io\/literature-workbench\/"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /http-equiv="Content-Security-Policy"[^>]*connect-src 'self'/);
  assert.match(html, /http-equiv="Content-Security-Policy"[^>]*script-src 'self'/);
  assert.match(html, /http-equiv="Content-Security-Policy"[^>]*worker-src 'self' blob:/);
  const headers = vercel.headers.flatMap((entry) => entry.headers).map((header) => `${header.key}: ${header.value}`).join('\n');
  assert.match(headers, /Content-Security-Policy:.*connect-src 'self'/);
  assert.match(headers, /Content-Security-Policy:.*script-src 'self'/);
  assert.match(headers, /Content-Security-Policy:.*frame-ancestors 'none'/);
  assert.match(headers, /Content-Security-Policy:.*worker-src 'self' blob:/);
  assert.doesNotMatch(`${html}\n${script}`, /零成本|0 成本|无需登录|评委|MVP|教学演示/);
  assert.doesNotMatch(`${html}\n${script}`, /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|api\.crossref\.org|api\.openalex\.org|\bfetch\s*\(/);
  assert.doesNotMatch(css, /body\s*\{[^}]*\bmin-width\s*:\s*320px\b/s, 'a 320px viewport must not inherit a fixed body width in addition to its scrollbar');
  assert.match(css, /\.account-link\s*\{[^}]*\bmin-width\s*:\s*44px\b/s, 'the compact account entry must remain a full touch target');
  assert.match(css, /\.button\.small\s*\{[^}]*\bmin-height\s*:\s*44px\b/s, 'compact actions must remain full touch targets');
  assert.notEqual(vercel.cleanUrls, true, 'the production root must resolve index.html instead of redirecting it to a missing clean URL');
});
