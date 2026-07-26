const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const corePath = path.join(root, 'literature-core.js');
const core = fs.existsSync(corePath) ? require(corePath) : {};

test('exposes the local screening and synthesis core', () => {
  assert.equal(fs.existsSync(corePath), true, 'literature-core.js must exist');
  assert.equal(typeof core.normalizeSynthesis, 'function');
  assert.equal(typeof core.summarizeScreening, 'function');
  assert.equal(typeof core.filterEvidence, 'function');
  assert.equal(typeof core.buildGapSummary, 'function');
  assert.equal(typeof core.buildMarkdownSynthesis, 'function');
});

test('normalizes every persisted screening field without inventing evidence', () => {
  const normalized = core.normalizeSynthesis({
    screeningDecision: '纳入',
    exclusionReason: '  研究对象不符  ',
    coreFinding: '  创新投入与生产率呈正向关联  ',
    evidenceGrade: '高',
    themeTags: '平台治理， 区域创新, 平台治理'
  });

  assert.deepEqual(normalized, {
    screeningDecision: '纳入',
    exclusionReason: '研究对象不符',
    coreFinding: '创新投入与生产率呈正向关联',
    evidenceGrade: '高',
    themeTags: ['平台治理', '区域创新']
  });
  assert.equal(core.normalizeSynthesis({ screeningDecision: '自动纳入' }).screeningDecision, '未筛选');
  assert.equal(core.normalizeSynthesis({ evidenceGrade: '顶级' }).evidenceGrade, '未评级');
});

test('summarizes manual screening decisions and synthesis completeness', () => {
  const summary = core.summarizeScreening([
    { screeningDecision: '纳入', coreFinding: '发现 A', evidenceGrade: '高', themeTags: ['主题甲'] },
    { screeningDecision: '排除', exclusionReason: '对象不符', coreFinding: '排除项摘记', evidenceGrade: '高', themeTags: ['不计入综合'] },
    { screeningDecision: '未筛选' },
    { screeningDecision: '纳入', coreFinding: '', evidenceGrade: '未评级', themeTags: [] }
  ]);

  assert.deepEqual(summary, {
    total: 4,
    pending: 1,
    included: 2,
    excluded: 1,
    findings: 1,
    graded: 1,
    tagged: 1
  });
});

test('filters the evidence matrix by decision, grade, theme, and text', () => {
  const records = [
    { id: 'a', title: '平台创新的生产率效应', authors: '甲', screeningDecision: '纳入', evidenceGrade: '高', themeTags: ['平台治理'], coreFinding: '存在正向效应' },
    { id: 'b', title: '绿色创新案例', authors: '乙', screeningDecision: '纳入', evidenceGrade: '中', themeTags: ['绿色创新'], coreFinding: '案例差异明显' },
    { id: 'c', title: '新闻报道', authors: '丙', screeningDecision: '排除', evidenceGrade: '未评级', themeTags: ['平台治理'], coreFinding: '' }
  ];

  const result = core.filterEvidence(records, {
    decision: '纳入',
    evidenceGrade: '高',
    theme: '平台治理',
    query: '生产率'
  });

  assert.deepEqual(result.map((record) => record.id), ['a']);
});

test('describes research gaps as current-workspace signals rather than formal claims', () => {
  const gap = core.buildGapSummary([
    { screeningDecision: '纳入', evidenceGrade: '高', themeTags: ['数字化'], coreFinding: '发现 A' },
    { screeningDecision: '纳入', evidenceGrade: '低', themeTags: ['数字化'], coreFinding: '' },
    { screeningDecision: '纳入', evidenceGrade: '未评级', themeTags: ['绿色创新'], coreFinding: '发现 B' },
    { screeningDecision: '排除', evidenceGrade: '高', themeTags: ['不计入'], coreFinding: '排除项' }
  ]);

  assert.equal(gap.included, 3);
  assert.equal(gap.incompleteFindings, 1);
  assert.equal(gap.ungradedEvidence, 1);
  assert.deepEqual(gap.themes.map((theme) => [theme.name, theme.count]), [['数字化', 2], ['绿色创新', 1]]);
  assert.match(gap.note, /仅基于当前工作台/);
  assert.match(gap.note, /不构成系统综述结论/);
});

test('builds an auditable Markdown synthesis with included evidence and exclusions', () => {
  const markdown = core.buildMarkdownSynthesis(
    { title: '创新研究', topic: '创新与增长', include: '同行评议研究', exclude: '新闻稿' },
    [
      { title: '研究 | A', authors: '甲', year: '2025', source: '期刊', doi: '10.1/a', url: '', screeningDecision: '纳入', evidenceGrade: '高', themeTags: ['创新'], coreFinding: '发现 | A' },
      { title: '材料 B', authors: '乙', year: '2024', source: '网站', doi: '', url: 'https://example.com', screeningDecision: '排除', exclusionReason: '材料类型不符', evidenceGrade: '未评级', themeTags: [], coreFinding: '' }
    ]
  );

  assert.match(markdown, /^# 创新研究｜证据综合/m);
  assert.match(markdown, /## 筛选概览/);
  assert.match(markdown, /\| 核心发现 \|/);
  assert.match(markdown, /研究 \\| A/);
  assert.match(markdown, /发现 \\| A/);
  assert.match(markdown, /材料类型不符/);
  assert.match(markdown, /研究空白提示（工作台描述）/);
  assert.match(markdown, /不构成系统综述结论/);
});

test('integrates the workspace between library and quality while preserving existing workflows', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  const libraryNav = index.indexOf('data-nav="library"');
  const synthesisNav = index.indexOf('data-nav="screening"');
  const qualityNav = index.indexOf('data-nav="quality"');
  assert.ok(libraryNav >= 0 && synthesisNav > libraryNav && qualityNav > synthesisNav);

  assert.match(index, /data-view="screening"/);
  assert.match(index, /data-screening-summary/);
  assert.match(index, /data-screen-filter-decision/);
  assert.match(index, /data-screen-filter-grade/);
  assert.match(index, /data-screen-filter-theme/);
  assert.match(index, /data-screening-body/);
  assert.match(index, /data-gap-summary/);
  assert.match(index, /data-export="synthesis"/);

  ['screeningDecision', 'exclusionReason', 'coreFinding', 'evidenceGrade', 'themeTags'].forEach((field) => {
    assert.match(script, new RegExp(field));
  });
  assert.match(script, /renderScreening/);
  assert.match(script, /data-screen-field/);
  assert.match(script, /buildMarkdownSynthesis/);
  assert.match(script, /JSON\.stringify\(snapshot, null, 2\)/);

  ['lookupDOI', 'importCSV', 'importBibTeX', 'importRIS', 'exportCSV', 'exportJSON', 'exportBibTeX', 'exportReport'].forEach((capability) => {
    assert.match(script, new RegExp('function\\s+' + capability + '\\b'));
  });

  assert.match(styles, /\.evidence-table/);
  assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.evidence-table/);
  assert.match(readme, /筛选与综合/);
  assert.match(readme, /Markdown/);
  assert.match(readme, /不构成系统综述结论/);
  assert.match(serviceWorker, /literature-core\.js/);
});
