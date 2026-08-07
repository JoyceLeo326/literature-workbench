const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const decision = require(path.join(root, 'decision-core.js'));

const project = {
  topic: '生成式人工智能对高校写作反馈的影响',
  include: '高校学生，写作反馈，实证研究',
  cnTarget: 12,
  enTarget: 24
};
const records = [
  {
    id: 'traceable-current', language: '英文', title: 'Generative AI feedback in higher education writing',
    abstract: 'An empirical study of student writing feedback with limitations and non-significant effects.',
    authors: 'Lin; Wu', source: 'Computers and Education', year: new Date().getFullYear(),
    doi: '10.1000/example', status: '待核验', evidenceGrade: '高'
  },
  {
    id: 'thin-old', language: '中文', title: '人工智能概论', abstract: '', authors: '', source: '', year: '2008',
    status: '待补全'
  }
];

test('research profile, language gap and feedback causally change the policy', () => {
  const course = decision.buildPolicy(
    { researchStage: 'coursework', deliveryGoal: 'class-report', weeklyHours: 3 },
    project,
    { cn: 11, en: 2 },
    null
  );
  const review = decision.buildPolicy(
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 12 },
    project,
    { cn: 11, en: 2 },
    { signal: 'claim-too-strong' }
  );
  assert.equal(course.languageFocus, '英文');
  assert.notDeepEqual(course.weights, review.weights);
  assert.ok(review.weights.contrast > course.weights.contrast);
  assert.notEqual(course.batchSize, review.batchSize);
});

test('priority scoring ranks traceable, relevant evidence first and explains why', () => {
  const ranked = decision.rankRecords(
    records,
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 8 },
    project,
    { cn: 11, en: 2 },
    { signal: 'missing-sources' }
  );
  assert.equal(ranked[0].record.id, 'traceable-current');
  assert.ok(ranked[0].priority.score > ranked[1].priority.score);
  assert.ok(ranked[0].priority.reasons.some((reason) => /来源|英文/.test(reason)));
  assert.ok(ranked[0].priority.next.length > 0);
});

test('feedback becomes a concrete next-round search action', () => {
  const missing = decision.buildSearchPlan(
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 8 }, project,
    { cn: 11, en: 2 }, { signal: 'missing-sources' }
  );
  const strong = decision.buildSearchPlan(
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 8 }, project,
    { cn: 11, en: 2 }, { signal: 'claim-too-strong' }
  );
  assert.match(missing[2].copy, /补查|来源|数据库/);
  assert.match(strong[2].copy, /反向词|反证/);
  assert.notEqual(missing[2].copy, strong[2].copy);
});

test('product uses in-app search logging and human-confirmed export dialogs', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const build = fs.readFileSync(path.join(root, 'scripts', 'build-pages.mjs'), 'utf8');
  for (const marker of [
    'data-search-log-modal', 'data-search-log-form', 'data-export-confirm-modal',
    'data-export-human-check', 'data-strategy-weights', 'data-priority-queue', 'data-library-sort'
  ]) assert.match(html, new RegExp(marker));
  assert.doesNotMatch(script, /window\.prompt\s*\(/);
  assert.match(script, /requestExport\(/);
  assert.match(script, /confirmExport\(/);
  assert.match(build, /decision-core\.js/);
});
