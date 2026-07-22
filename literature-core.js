(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LitpathSynthesis = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DECISIONS = ['未筛选', '纳入', '排除'];
  var EVIDENCE_GRADES = ['未评级', '高', '中', '低'];

  function safeText(value) { return String(value == null ? '' : value); }

  function splitThemeTags(value) {
    var values = Array.isArray(value) ? value : safeText(value).split(/[,，;；\n]+/);
    var seen = {};
    return values.map(function (item) { return safeText(item).trim(); }).filter(function (item) {
      var key = item.toLowerCase();
      if (!item || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function normalizeSynthesis(record) {
    record = record || {};
    return {
      screeningDecision: DECISIONS.indexOf(record.screeningDecision) >= 0 ? record.screeningDecision : '未筛选',
      exclusionReason: safeText(record.exclusionReason).trim(),
      coreFinding: safeText(record.coreFinding).trim(),
      evidenceGrade: EVIDENCE_GRADES.indexOf(record.evidenceGrade) >= 0 ? record.evidenceGrade : '未评级',
      themeTags: splitThemeTags(record.themeTags)
    };
  }

  function summarizeScreening(records) {
    var summary = { total: 0, pending: 0, included: 0, excluded: 0, findings: 0, graded: 0, tagged: 0 };
    (records || []).forEach(function (record) {
      var synthesis = normalizeSynthesis(record);
      summary.total += 1;
      if (synthesis.screeningDecision === '纳入') {
        summary.included += 1;
        if (synthesis.coreFinding) summary.findings += 1;
        if (synthesis.evidenceGrade !== '未评级') summary.graded += 1;
        if (synthesis.themeTags.length) summary.tagged += 1;
      } else if (synthesis.screeningDecision === '排除') summary.excluded += 1;
      else summary.pending += 1;
    });
    return summary;
  }

  function filterEvidence(records, filters) {
    filters = filters || {};
    var query = safeText(filters.query).trim().toLowerCase();
    return (records || []).filter(function (record) {
      var synthesis = normalizeSynthesis(record);
      var haystack = [record.title, record.authors, record.source, synthesis.coreFinding, synthesis.exclusionReason, synthesis.themeTags.join(' ')].join(' ').toLowerCase();
      return (!filters.decision || filters.decision === 'all' || synthesis.screeningDecision === filters.decision) &&
        (!filters.evidenceGrade || filters.evidenceGrade === 'all' || synthesis.evidenceGrade === filters.evidenceGrade) &&
        (!filters.theme || filters.theme === 'all' || synthesis.themeTags.indexOf(filters.theme) >= 0) &&
        (!query || haystack.indexOf(query) >= 0);
    });
  }

  function buildGapSummary(records) {
    var included = (records || []).filter(function (record) { return normalizeSynthesis(record).screeningDecision === '纳入'; });
    var themes = {};
    var incompleteFindings = 0;
    var ungradedEvidence = 0;
    included.forEach(function (record) {
      var synthesis = normalizeSynthesis(record);
      if (!synthesis.coreFinding) incompleteFindings += 1;
      if (synthesis.evidenceGrade === '未评级') ungradedEvidence += 1;
      synthesis.themeTags.forEach(function (theme) {
        themes[theme] = themes[theme] || { name: theme, count: 0, findings: 0, graded: 0 };
        themes[theme].count += 1;
        if (synthesis.coreFinding) themes[theme].findings += 1;
        if (synthesis.evidenceGrade !== '未评级') themes[theme].graded += 1;
      });
    });
    return {
      included: included.length,
      incompleteFindings: incompleteFindings,
      ungradedEvidence: ungradedEvidence,
      untaggedEvidence: included.filter(function (record) { return normalizeSynthesis(record).themeTags.length === 0; }).length,
      themes: Object.keys(themes).map(function (key) { return themes[key]; }).sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'); }),
      note: '以下提示仅基于当前工作台已纳入记录的字段完整度与分布，不构成系统综述结论或对真实研究空白的自动判定。'
    };
  }

  function tableText(value) {
    return safeText(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim() || '—';
  }

  function buildMarkdownSynthesis(project, records) {
    project = project || {};
    records = records || [];
    var summary = summarizeScreening(records);
    var gap = buildGapSummary(records);
    var included = records.filter(function (record) { return normalizeSynthesis(record).screeningDecision === '纳入'; });
    var excluded = records.filter(function (record) { return normalizeSynthesis(record).screeningDecision === '排除'; });
    var lines = [
      '# ' + safeText(project.title || '未命名研究任务') + '｜证据综合',
      '',
      '> 本报告由浏览器依据人工录入字段确定性生成；不调用模型，也不构成系统综述结论。',
      '',
      '## 研究边界',
      '',
      '- 核心主题：' + safeText(project.topic || '未填写'),
      '- 纳入条件：' + safeText(project.include || '未填写'),
      '- 排除条件：' + safeText(project.exclude || '未填写'),
      '',
      '## 筛选概览',
      '',
      '- 题录总数：' + summary.total,
      '- 待筛选：' + summary.pending,
      '- 已纳入：' + summary.included,
      '- 已排除：' + summary.excluded,
      '- 已填写核心发现：' + summary.findings,
      '- 已人工标注证据等级：' + summary.graded,
      '',
      '## 纳入证据矩阵',
      '',
      '| 题名 | 作者 | 年份 | 来源 | 主题标签 | 证据等级 | 核心发现 | DOI / 链接 |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |'
    ];
    if (!included.length) lines.push('| 暂无已纳入记录 | — | — | — | — | — | — | — |');
    included.forEach(function (record) {
      var synthesis = normalizeSynthesis(record);
      lines.push('| ' + [record.title, record.authors, record.year, record.source, synthesis.themeTags.join('；'), synthesis.evidenceGrade, synthesis.coreFinding, record.doi || record.url].map(tableText).join(' | ') + ' |');
    });
    lines.push('', '## 排除记录', '', '| 题名 | 排除理由 |', '| --- | --- |');
    if (!excluded.length) lines.push('| 暂无已排除记录 | — |');
    excluded.forEach(function (record) {
      var synthesis = normalizeSynthesis(record);
      lines.push('| ' + tableText(record.title) + ' | ' + tableText(synthesis.exclusionReason) + ' |');
    });
    lines.push('', '## 研究空白提示（工作台描述）', '', gap.note, '');
    if (!gap.included) {
      lines.push('- 暂无已纳入记录，尚不能形成字段分布提示。');
    } else {
      lines.push('- ' + gap.incompleteFindings + ' 条已纳入记录尚未填写核心发现。');
      lines.push('- ' + gap.ungradedEvidence + ' 条已纳入记录尚未标注证据等级。');
      lines.push('- ' + gap.untaggedEvidence + ' 条已纳入记录尚未添加主题标签。');
      if (gap.themes.length) lines.push('- 当前主题分布：' + gap.themes.map(function (theme) { return theme.name + '（' + theme.count + '）'; }).join('、') + '。');
    }
    lines.push('');
    return lines.join('\n');
  }

  return {
    DECISIONS: DECISIONS.slice(),
    EVIDENCE_GRADES: EVIDENCE_GRADES.slice(),
    splitThemeTags: splitThemeTags,
    normalizeSynthesis: normalizeSynthesis,
    summarizeScreening: summarizeScreening,
    filterEvidence: filterEvidence,
    buildGapSummary: buildGapSummary,
    buildMarkdownSynthesis: buildMarkdownSynthesis
  };
});
