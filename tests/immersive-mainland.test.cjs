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
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');
  for (const marker of ['name="researchStage"', 'name="deliveryGoal"', 'name="weeklyHours"', 'data-research-journey']) {
    assert.match(html, new RegExp(marker));
  }
  assert.match(script, /LitpathExperience/);
  assert.match(script, /profileLines/);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /pages-dist/);
  assert.doesNotMatch(`${html}\n${script}`, /零成本|0 成本|无需登录|评委|MVP|教学演示/);
  assert.doesNotMatch(`${html}\n${script}`, /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/);
});
