(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathDecision = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STAGE_LABELS = { coursework: '课程研究', thesis: '论文阶段', professional: '工作研究' };
  var GOAL_LABELS = { 'class-report': '课堂汇报', proposal: '开题方案', review: '文献综述' };
  var FEEDBACK_LABELS = {
    'scope-too-broad': '收紧研究边界',
    'missing-sources': '补齐来源与语种',
    'claim-too-strong': '优先寻找反证与限制',
    'synthesis-unclear': '补齐可比较的证据字段',
    'handoff-hard': '增强来源与判断留痕',
    worked: '沿当前路径继续'
  };

  function text(value) { return String(value == null ? '' : value).trim(); }
  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function profileOf(input) {
    input = input || {};
    return {
      researchStage: STAGE_LABELS[input.researchStage] ? input.researchStage : 'coursework',
      deliveryGoal: GOAL_LABELS[input.deliveryGoal] ? input.deliveryGoal : 'class-report',
      weeklyHours: clamp(Math.round(number(input.weeklyHours, 5)), 1, 40)
    };
  }
  function feedbackOf(input) {
    input = input || {};
    return { signal: FEEDBACK_LABELS[input.signal] ? input.signal : '', note: text(input.note) };
  }
  function terms(value) {
    var raw = text(value).toLowerCase();
    var chunks = raw.split(/[\s,，、;；:：()（）/]+/).filter(function (item) { return item.length > 1; });
    var chinese = raw.match(/[\u4e00-\u9fff]{2,6}/g) || [];
    return Array.from(new Set(chunks.concat(chinese))).slice(0, 28);
  }
  function containsAny(value, candidates) {
    var haystack = text(value).toLowerCase();
    return candidates.some(function (candidate) { return haystack.indexOf(candidate) >= 0; });
  }

  function buildPolicy(profileInput, project, counts, feedbackInput) {
    var profile = profileOf(profileInput);
    var feedback = feedbackOf(feedbackInput);
    var goalWeights = {
      'class-report': { relevance: 35, traceability: 20, completeness: 20, recency: 10, contrast: 15 },
      proposal: { relevance: 28, traceability: 27, completeness: 18, recency: 12, contrast: 15 },
      review: { relevance: 25, traceability: 25, completeness: 20, recency: 10, contrast: 20 }
    };
    var weights = Object.assign({}, goalWeights[profile.deliveryGoal]);
    if (profile.researchStage === 'thesis') {
      weights.traceability += 5;
      weights.relevance += 3;
      weights.recency -= 3;
      weights.completeness -= 5;
    } else if (profile.researchStage === 'professional') {
      weights.recency += 10;
      weights.relevance += 3;
      weights.contrast -= 5;
      weights.completeness -= 5;
      weights.traceability -= 3;
    }
    if (feedback.signal === 'missing-sources') {
      weights.traceability += 6;
      weights.completeness += 4;
      weights.relevance -= 5;
      weights.recency -= 5;
    } else if (feedback.signal === 'claim-too-strong') {
      weights.contrast += 10;
      weights.relevance -= 5;
      weights.completeness -= 5;
    } else if (feedback.signal === 'synthesis-unclear') {
      weights.completeness += 10;
      weights.recency -= 5;
      weights.relevance -= 5;
    } else if (feedback.signal === 'handoff-hard') {
      weights.traceability += 8;
      weights.completeness += 2;
      weights.recency -= 5;
      weights.contrast -= 5;
    }
    var total = Object.keys(weights).reduce(function (sum, key) { return sum + weights[key]; }, 0) || 100;
    Object.keys(weights).forEach(function (key) { weights[key] = Math.round(weights[key] / total * 100); });
    var duration = profile.weeklyHours <= 3 ? 25 : profile.weeklyHours <= 8 ? 50 : 90;
    var batchSize = profile.weeklyHours <= 3 ? 3 : profile.weeklyHours <= 8 ? 6 : 10;
    var cnTarget = Math.max(0, number(project && project.cnTarget, 0));
    var enTarget = Math.max(0, number(project && project.enTarget, 0));
    var cnCount = Math.max(0, number(counts && counts.cn, 0));
    var enCount = Math.max(0, number(counts && counts.en, 0));
    var cnGap = Math.max(0, cnTarget - cnCount);
    var enGap = Math.max(0, enTarget - enCount);
    var languageFocus = enGap > cnGap ? '英文' : cnGap > enGap ? '中文' : '中英并行';
    return {
      profile: profile,
      feedback: feedback,
      weights: weights,
      duration: duration,
      batchSize: batchSize,
      languageFocus: languageFocus,
      headline: STAGE_LABELS[profile.researchStage] + ' · ' + GOAL_LABELS[profile.deliveryGoal],
      tradeoff: profile.weeklyHours <= 3
        ? '先核验少量锚点来源，暂缓扩张候选池。'
        : profile.weeklyHours <= 8
          ? '在代表性与覆盖面之间保持一轮可完成的批次。'
          : '扩大覆盖面，同时保留反证与低一致性结果。',
      feedbackCopy: feedback.signal ? FEEDBACK_LABELS[feedback.signal] : '尚无上一轮反馈'
    };
  }

  function buildSearchPlan(profile, project, counts, feedback) {
    var policy = buildPolicy(profile, project, counts, feedback);
    var goal = policy.profile.deliveryGoal;
    var focus = goal === 'proposal' ? '方法、机制与可行性' : goal === 'review' ? '主题分歧、反证与边界' : '代表性结论与可讲述脉络';
    var feedbackTask = {
      'scope-too-broad': '收紧对象、情境或年份后再跑同一检索式',
      'missing-sources': '补查缺口最大的语种与数据库，并记录未命中项',
      'claim-too-strong': '加入反向词、限制词与无显著结果，主动找反证',
      'synthesis-unclear': '优先寻找研究对象和方法可比较的材料',
      'handoff-hard': '补齐 DOI、来源与检索批次，保证同伴能够复跑',
      worked: '保留当前检索式，向相邻概念做一轮扩展'
    }[policy.feedback.signal] || '先完成一轮锚点检索，再根据命中情况调整概念组';
    return [
      { id: 'anchor', index: '01', title: '建立锚点', copy: '先在' + policy.languageFocus + '来源中定位 ' + policy.batchSize + ' 篇高相关材料，重点看' + focus + '。', meta: policy.duration + ' 分钟 · 高相关优先' },
      { id: 'contrast', index: '02', title: '寻找分歧', copy: goal === 'review' || policy.feedback.signal === 'claim-too-strong' ? '加入相反结论、限制条件和不同研究设计，避免只保留支持预期的材料。' : '用不同对象、方法或时期复跑一次，检查当前结论是否依赖单一情境。', meta: '反证权重 ' + policy.weights.contrast + '%' },
      { id: 'close', index: '03', title: '回应反馈', copy: feedbackTask + '。', meta: policy.feedbackCopy }
    ];
  }

  function scoreRecord(record, profile, project, counts, feedback) {
    record = record || {};
    var policy = buildPolicy(profile, project, counts, feedback);
    var weights = policy.weights;
    var haystack = [record.title, record.abstract, record.keywords, record.notes, record.source].join(' ').toLowerCase();
    var topicTerms = terms([project && project.topic, project && project.include].join(' '));
    var hits = topicTerms.filter(function (term) { return haystack.indexOf(term) >= 0; }).length;
    var relevance = topicTerms.length ? clamp(hits / Math.min(topicTerms.length, 6), 0, 1) : 0.45;
    var traceability = record.doi || record.url ? 1 : record.source || record.database ? 0.55 : 0.1;
    var completeFields = [record.title, record.abstract, record.authors, record.source, record.year].filter(function (value) { return text(value); }).length;
    var completeness = completeFields / 5;
    var year = number(record.year, 0);
    var currentYear = new Date().getFullYear();
    var recency = year ? clamp(1 - Math.max(0, currentYear - year) / 15, 0.1, 1) : 0.15;
    var contrast = containsAny(haystack, ['相反', '限制', '无显著', '不一致', '反例', 'however', 'limitation', 'non-significant', 'contradict']) ? 1 : 0.35;
    if (record.evidenceGrade === '高') traceability = Math.max(traceability, 0.9);
    if (record.status === '待核验') completeness = Math.min(1, completeness + 0.08);
    var score = Math.round(
      relevance * weights.relevance +
      traceability * weights.traceability +
      completeness * weights.completeness +
      recency * weights.recency +
      contrast * weights.contrast
    );
    var reasons = [];
    var gaps = [];
    if (relevance >= 0.5) reasons.push('贴近研究边界'); else gaps.push('相关性待判断');
    if (traceability >= 0.9) reasons.push('来源可追溯'); else gaps.push('补 DOI 或原文链接');
    if (completeness >= 0.8) reasons.push('字段较完整'); else gaps.push('补齐题录字段');
    if (recency >= 0.75 && policy.profile.researchStage === 'professional') reasons.push('近期证据');
    if (contrast >= 0.9) reasons.push('包含分歧或限制');
    var language = record.language === '英文' ? '英文' : '中文';
    if (policy.languageFocus === language) {
      score = Math.min(100, score + 6);
      reasons.push('回应' + language + '缺口');
    }
    return {
      score: score,
      level: score >= 78 ? '优先核验' : score >= 58 ? '本轮处理' : '候选保留',
      reasons: reasons.slice(0, 3),
      next: gaps[0] || (record.status === '已核验' ? '进入人工筛选' : '回到原文核验')
    };
  }

  function rankRecords(records, profile, project, counts, feedback) {
    return (records || []).map(function (record, index) {
      return { record: record, priority: scoreRecord(record, profile, project, counts, feedback), index: index };
    }).sort(function (a, b) {
      return b.priority.score - a.priority.score || a.index - b.index;
    });
  }

  return {
    buildPolicy: buildPolicy,
    buildSearchPlan: buildSearchPlan,
    scoreRecord: scoreRecord,
    rankRecords: rankRecords
  };
});
