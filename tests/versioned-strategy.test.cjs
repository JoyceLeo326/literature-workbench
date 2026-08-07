const test = require('node:test');
const assert = require('node:assert/strict');

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
