const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Decision = require('../decision-core.js');
const Workspace = require('../workspace-core.js');

const NOW = '2026-08-07T08:00:00.000Z';
const baseProject = {
  title: '平台劳动研究',
  topic: '算法管理如何影响外卖骑手的工作自主性',
  deadline: '2026-08-21',
  cnTarget: 8,
  enTarget: 8,
  include: '平台劳动 算法管理 骑手',
  exclude: '纯技术路线优化'
};

function candidates(profile = {}, project = baseProject, counts = {}, feedback = {}) {
  return Decision.buildStrategyCandidates(
    { researchStage: 'coursework', deliveryGoal: 'class-report', weeklyHours: 5, ...profile },
    project,
    { total: 4, cn: 3, en: 1, verified: 2, ...counts },
    feedback,
    { now: NOW }
  );
}

test('always produces exactly three decision-ready strategies with explicit consequences', () => {
  const result = candidates();
  assert.equal(result.length, 3);
  assert.deepEqual(new Set(result.map((item) => item.id)).size, 3);
  assert.deepEqual([...result.map((item) => item.rank)].sort(), [1, 2, 3]);

  for (const strategy of result) {
    for (const field of ['title', 'summary', 'gain', 'tradeoff', 'fit', 'basis', 'firstAction', 'reviewPrompt']) {
      assert.ok(strategy[field].length >= 8, `${strategy.id}.${field} must be substantive`);
    }
    assert.equal(strategy.route.length, 3);
    assert.ok(strategy.score > 0);
    assert.ok(strategy.score <= 100, `${strategy.id}.score must remain interpretable`);
  }
});

test('real profile, language gaps, time and feedback causally rerank the three strategies', () => {
  assert.equal(candidates({}, baseProject, {}, { signal: 'scope-too-broad' })[0].id, 'focus');
  assert.equal(candidates(
    { deliveryGoal: 'proposal' },
    { ...baseProject, cnTarget: 4, enTarget: 18 },
    { total: 3, cn: 3, en: 0, verified: 1 },
    { signal: 'missing-sources' }
  )[0].id, 'coverage');
  assert.equal(candidates(
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 12 },
    baseProject,
    { total: 12, cn: 6, en: 6, verified: 10 },
    { signal: 'claim-too-strong' }
  )[0].id, 'contrast');

  const tight = candidates({ weeklyHours: 2 }, { ...baseProject, deadline: '2026-08-10' });
  const roomy = candidates({ weeklyHours: 14 }, { ...baseProject, deadline: '2026-10-10' });
  assert.notEqual(tight.find((item) => item.id === 'focus').score, roomy.find((item) => item.id === 'focus').score);
  assert.notEqual(tight.find((item) => item.id === 'coverage').firstAction, roomy.find((item) => item.id === 'coverage').firstAction);
});

test('a confirmed decision becomes V1 and real feedback creates a factual V2 proposal', () => {
  const contextV1 = Decision.buildDecisionContext(
    { researchStage: 'coursework', deliveryGoal: 'class-report', weeklyHours: 5 },
    baseProject,
    { total: 4, cn: 3, en: 1, verified: 2 },
    {},
    { now: NOW }
  );
  const v1 = Decision.createDecision({
    context: contextV1,
    candidateId: 'coverage',
    version: 1,
    confirmedAt: '2026-08-07 16:00'
  });

  assert.equal(v1.version, 1);
  assert.equal(v1.candidate.id, 'coverage');
  assert.match(v1.signature, /coverage$/);

  const contextV2 = Decision.buildDecisionContext(
    { researchStage: 'thesis', deliveryGoal: 'review', weeklyHours: 10 },
    baseProject,
    { total: 7, cn: 4, en: 3, verified: 5 },
    { signal: 'claim-too-strong', note: '现有结论缺少限制条件与反例。' },
    { now: NOW }
  );
  const proposal = Decision.buildDecisionProposal({
    previous: v1,
    context: contextV2,
    candidateId: 'contrast',
    createdAt: '2026-08-07 16:30'
  });

  assert.equal(proposal.version, 2);
  assert.equal(proposal.baseVersion, 1);
  assert.equal(proposal.candidateId, 'contrast');
  assert.equal(proposal.current, false);
  assert.ok(proposal.changes.some((line) => line.includes('真实反馈')));
  assert.ok(proposal.changes.some((line) => line.includes('人工选择')));

  const v2 = Decision.createDecision({
    context: contextV2,
    candidateId: proposal.candidateId,
    previous: v1,
    version: proposal.version,
    confirmedAt: '2026-08-07 16:40'
  });
  const archive = Decision.buildDecisionArchive([v1, v2], null);
  assert.match(archive, /V1/);
  assert.match(archive, /V2/);
  assert.match(archive, /真实反馈/);
  assert.match(archive, /代价/);
  assert.match(archive, /相比 V1/);
});

test('an unchanged context and choice does not invent a new proposal', () => {
  const context = Decision.buildDecisionContext({}, baseProject, {}, {}, { now: NOW });
  const v1 = Decision.createDecision({ context, candidateId: 'focus', confirmedAt: '2026-08-07 16:00' });
  assert.equal(Decision.buildDecisionProposal({ previous: v1, context, candidateId: 'focus' }), null);
  assert.deepEqual(Decision.diffDecisionContexts(context, context), []);
  assert.equal(Decision.decisionFeedbackChanged(
    { signal: 'worked', note: '本轮有效', updatedAt: '2026-08-07T08:00:00.000Z' },
    { signal: 'worked', note: '本轮有效', updatedAt: '2026-08-07T09:00:00.000Z' }
  ), false);
  assert.equal(Decision.decisionFeedbackChanged(
    { signal: 'worked', note: '本轮有效' },
    { signal: 'worked', note: '本轮仍有效，但新增一条限制' }
  ), true);
});

test('workspace normalization preserves confirmed versions, selection and a pending proposal', () => {
  const project = Workspace.createProjectState({ now: NOW });
  const context = Decision.buildDecisionContext({}, baseProject, {}, {}, { now: NOW });
  const v1 = Decision.createDecision({ context, candidateId: 'focus', confirmedAt: '2026-08-07 16:00' });
  const nextContext = Decision.buildDecisionContext(
    {},
    baseProject,
    {},
    { signal: 'missing-sources', note: '英文证据不足' },
    { now: NOW }
  );
  const proposal = Decision.buildDecisionProposal({ previous: v1, context: nextContext, candidateId: 'coverage' });
  project.strategyDecisions = [v1];
  project.strategyChoiceId = 'coverage';
  project.strategyProposal = proposal;

  const restored = Workspace.normalizeProject(JSON.parse(JSON.stringify(project)), NOW);
  assert.equal(Workspace.PROJECT_VERSION, 5);
  assert.equal(restored.strategyDecisions.length, 1);
  assert.equal(restored.strategyDecisions[0].candidate.id, 'focus');
  assert.equal(restored.strategyChoiceId, 'coverage');
  assert.equal(restored.strategyProposal.version, 2);
  assert.ok(restored.strategyProposal.changes.some((line) => line.includes('真实反馈')));

  const invalid = Workspace.normalizeProject({
    strategyChoiceId: 'not-a-strategy',
    strategyDecisions: 'not-an-array',
    strategyProposal: '<script>'
  }, NOW);
  assert.equal(invalid.strategyChoiceId, '');
  assert.deepEqual(invalid.strategyDecisions, []);
  assert.equal(invalid.strategyProposal, null);
});

test('version history is never truncated or renumbered after twelve confirmations', () => {
  const context = Decision.buildDecisionContext({}, baseProject, {}, {}, { now: NOW });
  const template = Decision.createDecision({ context, candidateId: 'focus', confirmedAt: '2026-08-07 16:00' });
  const rawHistory = Array.from({ length: 14 }, (_, index) => ({
    ...JSON.parse(JSON.stringify(template)),
    version: index + 1,
    confirmedAt: `2026-08-${String(index + 1).padStart(2, '0')} 16:00`
  }));

  const normalized = Decision.normalizeDecisionHistory(rawHistory);
  assert.equal(normalized.length, 14);
  assert.deepEqual(normalized.map((entry) => entry.version), Array.from({ length: 14 }, (_, index) => index + 1));

  const project = Workspace.normalizeProject({ strategyDecisions: rawHistory }, NOW);
  assert.equal(project.strategyDecisions.length, 14);
  assert.equal(project.strategyDecisions[0].version, 1);
  assert.equal(project.strategyDecisions[13].version, 14);
});

test('feedback notes become truthful differences and remain visible in the archive', () => {
  const previousContext = Decision.buildDecisionContext(
    {}, baseProject, {},
    { signal: 'missing-sources', note: '英文研究不足。' },
    { now: NOW }
  );
  const nextContext = Decision.buildDecisionContext(
    {}, baseProject, {},
    { signal: 'missing-sources', note: '英文已补三篇，但关键数据库仍缺失。' },
    { now: NOW }
  );
  const v1 = Decision.createDecision({ context: previousContext, candidateId: 'coverage', confirmedAt: '2026-08-07 16:00' });
  const v2 = Decision.createDecision({ context: nextContext, candidateId: 'coverage', previous: v1, confirmedAt: '2026-08-07 16:30' });

  assert.ok(v2.changes.some((line) => line.includes('现场补充')));
  assert.ok(v2.changes.some((line) => line.includes('英文已补三篇')));
  const archive = Decision.buildDecisionArchive([v1, v2], null);
  assert.match(archive, /现场补充：英文研究不足/);
  assert.match(archive, /现场补充：英文已补三篇/);
  assert.doesNotMatch(v2.changes.join('\n'), /从“补齐来源与语种”更新为“补齐来源与语种”/);
});

test('every editable project field in the decision signature produces a factual diff', () => {
  const previous = Decision.buildDecisionContext({}, baseProject, {}, {}, { now: NOW });
  const cases = [
    ['title', '平台劳动新题名', '任务名称'],
    ['topic', '平台劳动中的工作时间控制', '研究问题'],
    ['deadline', '2026-09-01', '交付日期'],
    ['years', '2020-2026', '年份范围'],
    ['cnTarget', 16, '文献目标'],
    ['include', '仅纳入同行评议实证研究', '纳入条件'],
    ['exclude', '排除纯观点文章', '排除条件']
  ];
  for (const [field, value, expected] of cases) {
    const next = Decision.buildDecisionContext({}, { ...baseProject, [field]: value }, {}, {}, { now: NOW });
    const changes = Decision.diffDecisionContexts(previous, next);
    assert.ok(changes.length > 0, `${field} must not produce an empty diff`);
    assert.ok(changes.some((line) => line.includes(expected)), `${field} must name the changed fact`);
  }
  const nextCounts = Decision.buildDecisionContext({}, baseProject, { total: 5, cn: 0, en: 0, verified: 0 }, {}, { now: NOW });
  const previousCounts = Decision.buildDecisionContext({}, baseProject, { total: 4, cn: 0, en: 0, verified: 0 }, {}, { now: NOW });
  assert.ok(Decision.diffDecisionContexts(previousCounts, nextCounts).some((line) => line.includes('题录与核验进度')));
});

test('malformed imported decision contexts are deeply normalized without crashing archive or diff', () => {
  const malformed = [{
    version: 7,
    confirmedAt: '<script>alert(1)</script>',
    context: { policy: {} },
    candidate: { id: 'focus', label: '<img src=x onerror=alert(1)>' },
    signature: 'forged',
    changes: ['<b>forged</b>']
  }];
  const normalized = Decision.normalizeDecisionHistory(malformed);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].version, 7);
  assert.equal(normalized[0].context.profile.researchStage, 'coursework');
  assert.ok(normalized[0].context.policy.weights.relevance > 0);
  assert.doesNotThrow(() => Decision.diffDecisionContexts(normalized[0].context, Decision.buildDecisionContext()));
  assert.doesNotThrow(() => Decision.buildDecisionArchive(normalized, { context: { policy: {} }, candidateId: 'focus' }));
  assert.notEqual(normalized[0].signature, 'forged');
  assert.equal(Decision.normalizeDecisionContext({ feedback: { note: 'x'.repeat(600) } }).feedback.note.length, 240);
  const malformedProposal = {
    version: 999,
    candidateId: 'not-real',
    context: { policy: {}, feedback: { signal: 'missing-sources', note: `first\n${'z'.repeat(600)}` } },
    changes: Array.from({ length: 1000 }, () => 'forged')
  };
  const safeProposal = Decision.normalizeDecisionProposal(malformedProposal, normalized[0]);
  assert.equal(safeProposal.version, normalized[0].version + 1);
  assert.ok(safeProposal.feedbackNote.length <= 240);
  assert.doesNotMatch(safeProposal.feedbackNote, /[\r\n]/);
  assert.ok(safeProposal.changes.length < 50);
  const safeArchive = Decision.buildDecisionArchive(normalized, malformedProposal);
  assert.doesNotMatch(safeArchive, /V999|forgedforged/);
});

test('product exposes a complete human-confirmed decision desk and versioned export', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

  for (const marker of [
    'data-strategy-desk',
    'data-strategy-context',
    'data-strategy-candidates',
    'data-strategy-accept',
    'data-confirm-strategy',
    'data-strategy-proposal',
    'data-strategy-diff',
    'data-strategy-feedback-form',
    'data-strategy-history',
    'data-export="strategy"'
  ]) assert.match(html, new RegExp(marker));

  assert.match(script, /Decision\.buildDecisionProposal/);
  assert.match(script, /Decision\.buildDecisionArchive/);
  assert.match(script, /function confirmStrategyDecision/);
  assert.match(script, /function exportStrategy/);
  assert.match(script, /Decision\.decisionFeedbackChanged/);
  assert.match(script, /反馈没有变化，当前 V.*保持有效/);
  const feedbackHandler = script.slice(
    script.indexOf('function applyResearchFeedback'),
    script.indexOf('function submitStrategyFeedback')
  );
  assert.doesNotMatch(feedbackHandler, /refreshStrategyProposalState/);
  assert.match(script, /strategyDecisions/);
  assert.match(script, /strategyProposal/);
  assert.match(script, /new Blob/);
  assert.match(html, /data-strategy-proposal-note/);
  assert.match(script, /现场补充/);
  assert.match(fs.readFileSync(path.join(root, 'styles.css'), 'utf8'), /\.strategy-candidate-summary[^}]*font-size:\s*12px/);
  assert.doesNotMatch(html, /无需登录|本机|当前设备|本地起步|0成本|零成本|账号稍后再说/);
});
