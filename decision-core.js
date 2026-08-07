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
    return {
      signal: FEEDBACK_LABELS[input.signal] ? input.signal : '',
      note: text(input.note).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
    };
  }

  function decisionFeedbackChanged(previousInput, nextInput) {
    var previous = feedbackOf(previousInput);
    var next = feedbackOf(nextInput);
    return previous.signal !== next.signal || previous.note !== next.note;
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

  function isoDate(value) {
    var source = text(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(source) ? source : '';
  }

  function decisionProject(project) {
    var source = project && typeof project === 'object' ? project : {};
    return {
      title: text(source.title).slice(0, 100),
      topic: text(source.topic).slice(0, 600),
      deadline: isoDate(source.deadline),
      years: text(source.years).slice(0, 80),
      cnTarget: Math.max(0, Math.round(number(source.cnTarget, 0))),
      enTarget: Math.max(0, Math.round(number(source.enTarget, 0))),
      include: text(source.include).slice(0, 800),
      exclude: text(source.exclude).slice(0, 800)
    };
  }

  function decisionCounts(counts) {
    var source = counts && typeof counts === 'object' ? counts : {};
    return {
      total: Math.max(0, Math.round(number(source.total, 0))),
      cn: Math.max(0, Math.round(number(source.cn, 0))),
      en: Math.max(0, Math.round(number(source.en, 0))),
      verified: Math.max(0, Math.round(number(source.verified, 0)))
    };
  }

  function deadlineState(deadline, nowValue) {
    var date = isoDate(deadline);
    if (!date) return { days: null, band: '未设置', label: '交付时间未设置' };
    var now = nowValue ? new Date(nowValue) : new Date();
    var target = new Date(date + 'T00:00:00');
    if (Number.isNaN(now.getTime()) || Number.isNaN(target.getTime())) return { days: null, band: '未设置', label: '交付时间未设置' };
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { days: days, band: '已到期', label: '交付时间已到' };
    if (days <= 7) return { days: days, band: '一周内', label: '距交付 ' + days + ' 天' };
    if (days <= 21) return { days: days, band: '三周内', label: '距交付 ' + days + ' 天' };
    return { days: days, band: '三周以上', label: '距交付 ' + days + ' 天' };
  }

  function buildDecisionContext(profileInput, projectInput, countsInput, feedbackInput, options) {
    var profile = profileOf(profileInput);
    var project = decisionProject(projectInput);
    var counts = decisionCounts(countsInput);
    var feedback = feedbackOf(feedbackInput);
    var deadline = deadlineState(project.deadline, options && options.now);
    var policy = buildPolicy(profile, project, counts, feedback);
    return {
      profile: profile,
      project: project,
      counts: counts,
      feedback: feedback,
      deadline: deadline,
      policy: {
        weights: Object.assign({}, policy.weights),
        duration: policy.duration,
        batchSize: policy.batchSize,
        languageFocus: policy.languageFocus,
        headline: policy.headline,
        feedbackCopy: policy.feedbackCopy
      }
    };
  }

  function normalizeDecisionContext(value) {
    var source = value && typeof value === 'object' ? value : {};
    var normalized = buildDecisionContext(source.profile, source.project, source.counts, source.feedback);
    var suppliedDeadline = source.deadline && typeof source.deadline === 'object' ? source.deadline : null;
    var deadlineBands = ['未设置', '已到期', '一周内', '三周内', '三周以上'];
    if (suppliedDeadline && deadlineBands.indexOf(suppliedDeadline.band) >= 0 && text(suppliedDeadline.label)) {
      normalized.deadline = {
        days: suppliedDeadline.days == null ? null : Math.round(number(suppliedDeadline.days, 0)),
        band: suppliedDeadline.band,
        label: text(suppliedDeadline.label).slice(0, 80)
      };
    }
    return normalized;
  }

  function candidateScore(id, context) {
    var profile = context.profile;
    var feedback = context.feedback.signal;
    var project = context.project;
    var counts = context.counts;
    var cnGap = Math.max(0, project.cnTarget - counts.cn);
    var enGap = Math.max(0, project.enTarget - counts.en);
    var largestGap = Math.max(cnGap, enGap);
    var urgent = context.deadline.band === '一周内' || context.deadline.band === '已到期';
    if (id === 'focus') {
      return 58 + (profile.weeklyHours <= 3 ? 18 : profile.weeklyHours <= 8 ? 7 : 0) +
        (urgent ? 14 : 0) + (profile.deliveryGoal === 'class-report' ? 7 : 0) +
        (feedback === 'scope-too-broad' ? 30 : 0);
    }
    if (id === 'coverage') {
      return 56 + Math.min(22, largestGap * 2) + (profile.deliveryGoal === 'proposal' ? 8 : 0) +
        (feedback === 'missing-sources' ? 32 : feedback === 'handoff-hard' ? 12 : 0) +
        (counts.verified < counts.total ? 5 : 0);
    }
    return 55 + (profile.deliveryGoal === 'review' ? 18 : 0) + (profile.researchStage === 'thesis' ? 10 : 0) +
      (profile.weeklyHours >= 9 ? 8 : 0) +
      (feedback === 'claim-too-strong' || feedback === 'synthesis-unclear' ? 32 : feedback === 'worked' ? 6 : 0);
  }

  function strategyDefinitions(context) {
    var policy = context.policy;
    var profile = context.profile;
    var counts = context.counts;
    var project = context.project;
    var feedback = context.feedback.signal ? FEEDBACK_LABELS[context.feedback.signal] : '尚未带回真实反馈';
    var language = policy.languageFocus;
    var unverified = Math.max(0, counts.total - counts.verified);
    var goal = GOAL_LABELS[profile.deliveryGoal];
    var time = context.deadline.label + '，每周可投入 ' + profile.weeklyHours + ' 小时';
    return [
      {
        id: 'focus',
        label: '边界收束',
        title: '先让问题变得可回答',
        summary: '把对象、情境、年份与排除条件压缩成一轮能够完成的检索边界。',
        gain: '减少无关命中和后续返工，让第一批材料直接服务“' + goal + '”。',
        tradeoff: '暂缓扩大数据库与相邻主题，边缘材料会留到下一轮再判断。',
        fit: '适合时间紧、主题仍宽，或反馈指出研究边界尚未收紧的阶段。',
        basis: time + '；当前任务为' + STAGE_LABELS[profile.researchStage] + '；' + feedback + '。',
        firstAction: '用 ' + policy.duration + ' 分钟重写一条纳入条件和一条排除条件，再核验 ' + Math.min(3, Math.max(1, policy.batchSize)) + ' 篇锚点来源。',
        reviewPrompt: '新命中记录中，有多少篇能够直接回答当前问题，而不是只与主题相关？',
        route: ['重写可回答问题', '锁定纳入与排除', '核验少量锚点']
      },
      {
        id: 'coverage',
        label: '缺口补证',
        title: '先补最薄弱的证据来源',
        summary: '把语种、来源与可追溯字段的缺口变成明确的补证批次。',
        gain: '优先补齐' + language + '材料与来源线索，降低结论建立在单一来源上的风险。',
        tradeoff: '本轮不会追求完整综合；新增材料仍需逐篇回到原文核验。',
        fit: '适合语种目标未达成、可追溯来源不足，或团队需要接续工作的阶段。',
        basis: language + '缺口优先；当前中文 ' + counts.cn + '/' + project.cnTarget + '、英文 ' + counts.en + '/' + project.enTarget + '；待核验 ' + unverified + ' 篇。',
        firstAction: '在' + language + '来源中补查 ' + policy.batchSize + ' 篇候选，逐条补齐 DOI、原文链接与检索批次。',
        reviewPrompt: '新增来源是否改变了当前判断，还是只增加了同类材料的数量？',
        route: ['定位最大语种缺口', '补查可追溯来源', '回到原文核验']
      },
      {
        id: 'contrast',
        label: '反证综合',
        title: '先让相反证据进入同一张表',
        summary: '围绕争议、限制与无显著结果建立可比较的证据矩阵。',
        gain: '让结论同时面对支持、限制与反例，更适合形成可复查的综合判断。',
        tradeoff: '推进速度更慢，并要求补齐研究对象、方法与结论边界等比较字段。',
        fit: '适合论文或综述阶段、结论可能强于证据，或综合结构仍不清楚的阶段。',
        basis: goal + '的反证权重为 ' + policy.weights.contrast + '%；已核验 ' + counts.verified + '/' + counts.total + ' 篇；' + feedback + '。',
        firstAction: '加入相反词、限制词和无显著结果，建立至少 ' + Math.min(4, Math.max(2, Math.ceil(policy.batchSize / 2))) + ' 组可比较证据。',
        reviewPrompt: '哪些结论只在特定对象、方法或时期成立？',
        route: ['主动寻找反例', '对齐比较字段', '写清结论边界']
      }
    ];
  }

  function candidatesFromContext(context) {
    return strategyDefinitions(context).map(function (candidate, index) {
      return Object.assign({}, candidate, { score: clamp(candidateScore(candidate.id, context), 0, 100), stableIndex: index });
    }).sort(function (left, right) {
      return right.score - left.score || left.stableIndex - right.stableIndex;
    }).map(function (candidate, index) {
      var copy = Object.assign({}, candidate, { rank: index + 1 });
      delete copy.stableIndex;
      return copy;
    });
  }

  function buildStrategyCandidates(profile, project, counts, feedback, options) {
    return candidatesFromContext(buildDecisionContext(profile, project, counts, feedback, options));
  }

  function sameList(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every(function (value, index) { return value === right[index]; });
  }

  function contextSignature(context) {
    var value = normalizeDecisionContext(context);
    return JSON.stringify({
      profile: value.profile,
      project: value.project,
      counts: value.counts,
      feedback: value.feedback,
      deadlineBand: value.deadline && value.deadline.band,
      policy: value.policy
    });
  }

  function decisionSignature(context, candidateId) {
    return contextSignature(context) + '|' + text(candidateId);
  }

  function diffDecisionContexts(previousInput, nextInput) {
    var previous = normalizeDecisionContext(previousInput);
    var next = normalizeDecisionContext(nextInput);
    var changes = [];
    if (previous.profile.researchStage !== next.profile.researchStage) changes.push('研究阶段从“' + STAGE_LABELS[previous.profile.researchStage] + '”改为“' + STAGE_LABELS[next.profile.researchStage] + '”');
    if (previous.profile.deliveryGoal !== next.profile.deliveryGoal) changes.push('交付目标从“' + GOAL_LABELS[previous.profile.deliveryGoal] + '”改为“' + GOAL_LABELS[next.profile.deliveryGoal] + '”');
    if (previous.profile.weeklyHours !== next.profile.weeklyHours) changes.push('每周投入从 ' + previous.profile.weeklyHours + ' 小时改为 ' + next.profile.weeklyHours + ' 小时');
    if (previous.project.title !== next.project.title) changes.push('任务名称从“' + (previous.project.title || '未命名') + '”改为“' + (next.project.title || '未命名') + '”');
    if (previous.project.topic !== next.project.topic) changes.push('研究问题已经改写');
    if (previous.project.deadline !== next.project.deadline) changes.push('交付日期从“' + (previous.project.deadline || '未设置') + '”改为“' + (next.project.deadline || '未设置') + '”');
    if (previous.project.years !== next.project.years) changes.push('年份范围从“' + (previous.project.years || '未设置') + '”改为“' + (next.project.years || '未设置') + '”');
    if (previous.project.cnTarget !== next.project.cnTarget || previous.project.enTarget !== next.project.enTarget) changes.push('中英文文献目标已经调整');
    if (previous.project.include !== next.project.include) changes.push('纳入条件已经改写');
    if (previous.project.exclude !== next.project.exclude) changes.push('排除条件已经改写');
    if (previous.counts.total !== next.counts.total || previous.counts.cn !== next.counts.cn || previous.counts.en !== next.counts.en || previous.counts.verified !== next.counts.verified) changes.push('题录与核验进度从总计 ' + previous.counts.total + '、中文 ' + previous.counts.cn + '、英文 ' + previous.counts.en + '、已核验 ' + previous.counts.verified + ' 更新为总计 ' + next.counts.total + '、中文 ' + next.counts.cn + '、英文 ' + next.counts.en + '、已核验 ' + next.counts.verified);
    if (previous.feedback.signal !== next.feedback.signal) changes.push('真实反馈从“' + (previous.policy.feedbackCopy || '尚无上一轮反馈') + '”更新为“' + (next.policy.feedbackCopy || '尚无上一轮反馈') + '”');
    if (previous.feedback.note !== next.feedback.note) {
      if (!previous.feedback.note) changes.push('新增现场补充：“' + next.feedback.note + '”');
      else if (!next.feedback.note) changes.push('现场补充已移除，原记录为“' + previous.feedback.note + '”');
      else changes.push('现场补充从“' + previous.feedback.note + '”更新为“' + next.feedback.note + '”');
    }
    if (previous.deadline.band !== next.deadline.band) changes.push('交付时间状态从“' + previous.deadline.band + '”进入“' + next.deadline.band + '”');
    if (previous.policy.languageFocus !== next.policy.languageFocus) changes.push('优先补证语种从“' + previous.policy.languageFocus + '”调整为“' + next.policy.languageFocus + '”');
    var weightNames = { relevance: '边界相关', traceability: '来源追溯', completeness: '字段完整', recency: '时间新近', contrast: '反证分歧' };
    Object.keys(weightNames).forEach(function (key) {
      if (previous.policy.weights[key] !== next.policy.weights[key]) changes.push(weightNames[key] + '权重从 ' + previous.policy.weights[key] + '% 调整为 ' + next.policy.weights[key] + '%');
    });
    var previousCandidates = candidatesFromContext(previous);
    var nextCandidates = candidatesFromContext(next);
    var previousOrder = previousCandidates.map(function (candidate) { return candidate.id; });
    var nextOrder = nextCandidates.map(function (candidate) { return candidate.id; });
    if (!sameList(previousOrder, nextOrder)) changes.push('方案顺序从“' + previousCandidates.map(function (candidate) { return candidate.label; }).join(' → ') + '”调整为“' + nextCandidates.map(function (candidate) { return candidate.label; }).join(' → ') + '”');
    previousCandidates.forEach(function (candidate) {
      var nextCandidate = nextCandidates.filter(function (item) { return item.id === candidate.id; })[0];
      if (nextCandidate && candidate.score !== nextCandidate.score) changes.push('“' + candidate.label + '”依据分从 ' + candidate.score + ' 调整为 ' + nextCandidate.score);
      if (nextCandidate && candidate.firstAction !== nextCandidate.firstAction) changes.push('“' + candidate.label + '”第一步已经改写');
    });
    return changes;
  }

  function candidateSnapshot(candidate) {
    var source = candidate && typeof candidate === 'object' ? candidate : {};
    return {
      id: ['focus', 'coverage', 'contrast'].indexOf(source.id) >= 0 ? source.id : 'focus',
      label: text(source.label).slice(0, 40),
      title: text(source.title).slice(0, 120),
      summary: text(source.summary).slice(0, 500),
      gain: text(source.gain).slice(0, 500),
      tradeoff: text(source.tradeoff).slice(0, 500),
      fit: text(source.fit).slice(0, 500),
      basis: text(source.basis).slice(0, 800),
      firstAction: text(source.firstAction).slice(0, 500),
      reviewPrompt: text(source.reviewPrompt).slice(0, 500),
      route: Array.isArray(source.route) ? source.route.map(text).filter(Boolean).slice(0, 6) : [],
      score: clamp(Math.round(number(source.score, 0)), 0, 100),
      rank: Math.max(1, Math.round(number(source.rank, 1)))
    };
  }

  function createDecision(input) {
    var source = input && typeof input === 'object' ? input : {};
    var context = source.context && typeof source.context === 'object'
      ? normalizeDecisionContext(source.context)
      : buildDecisionContext(source.profile, source.project, source.counts, source.feedback, source.options);
    var candidates = candidatesFromContext(context);
    var requestedCandidate = candidates.filter(function (item) { return item.id === source.candidateId; })[0] || null;
    var candidate = requestedCandidate || candidates[0];
    var previous = source.previous && typeof source.previous === 'object' ? source.previous : null;
    var changes = previous && previous.context ? diffDecisionContexts(previous.context, context) : [];
    if (previous && previous.candidate && previous.candidate.id !== candidate.id) changes.push('人工选择从“' + previous.candidate.label + '”改为“' + candidate.label + '”');
    return {
      version: Math.max(1, Math.round(number(source.version, previous ? number(previous.version, 0) + 1 : 1))),
      confirmedAt: text(source.confirmedAt).slice(0, 60) || '已由研究者确认',
      context: context,
      candidate: candidateSnapshot(candidate),
      signature: decisionSignature(context, candidate.id),
      changes: changes
    };
  }

  function normalizeDecisionHistory(value) {
    if (!Array.isArray(value)) return [];
    var lastVersion = 0;
    return value.map(function (entry) {
      var source = entry && typeof entry === 'object' ? entry : {};
      var context = normalizeDecisionContext(source.context);
      var suppliedVersion = Math.max(1, Math.round(number(source.version, lastVersion + 1)));
      var version = suppliedVersion > lastVersion ? suppliedVersion : lastVersion + 1;
      lastVersion = version;
      var validCandidate = source.candidate && ['focus', 'coverage', 'contrast'].indexOf(source.candidate.id) >= 0;
      var candidate = validCandidate
        ? candidateSnapshot(source.candidate)
        : candidateSnapshot(candidatesFromContext(context)[0]);
      return {
        version: version,
        confirmedAt: text(source.confirmedAt).slice(0, 60) || '已确认',
        context: context,
        candidate: candidate,
        signature: decisionSignature(context, candidate.id),
        changes: Array.isArray(source.changes) ? source.changes.map(text).filter(Boolean).slice(0, 40) : []
      };
    });
  }

  function buildDecisionProposal(input) {
    var source = input && typeof input === 'object' ? input : {};
    var previous = source.previous && typeof source.previous === 'object' ? source.previous : null;
    if (!previous || !previous.context) return null;
    var context = source.context && typeof source.context === 'object'
      ? normalizeDecisionContext(source.context)
      : buildDecisionContext(source.profile, source.project, source.counts, source.feedback, source.options);
    var candidates = candidatesFromContext(context);
    var requestedCandidate = candidates.filter(function (item) { return item.id === source.candidateId; })[0] || null;
    var candidate = requestedCandidate || candidates[0];
    var signature = decisionSignature(context, candidate.id);
    if (signature === previous.signature) return null;
    var changes = diffDecisionContexts(previous.context, context);
    if (previous.candidate && previous.candidate.id !== candidate.id) {
      changes.push((requestedCandidate ? '人工选择' : '建议路线') + '从“' + previous.candidate.label + '”改为“' + candidate.label + '”');
    }
    return {
      version: Math.max(1, Math.round(number(source.version, number(previous.version, 0) + 1))),
      baseVersion: Math.max(1, Math.round(number(previous.version, 1))),
      createdAt: text(source.createdAt).slice(0, 60) || '等待研究者确认',
      context: context,
      candidateId: candidate.id,
      candidateLabel: candidate.label,
      candidate: candidateSnapshot(candidate),
      signature: signature,
      feedbackLabel: context.policy.feedbackCopy,
      feedbackNote: context.feedback.note,
      changes: changes,
      current: false
    };
  }

  function normalizeDecisionProposal(value, previous) {
    if (!value || typeof value !== 'object' || !previous || !previous.context || !value.context || typeof value.context !== 'object') return null;
    return buildDecisionProposal({
      previous: previous,
      context: normalizeDecisionContext(value.context),
      candidateId: value.candidateId,
      version: Math.max(1, Math.round(number(previous.version, 0)) + 1),
      createdAt: value.createdAt
    });
  }

  function buildDecisionArchive(historyInput, proposalInput) {
    var history = normalizeDecisionHistory(historyInput);
    var proposal = proposalInput && history.length ? normalizeDecisionProposal(proposalInput, history[history.length - 1]) : null;
    var lines = ['## 研究策略决策版本', ''];
    if (!history.length) lines.push('尚未确认研究策略。', '');
    history.forEach(function (decision) {
      lines.push('### V' + decision.version + ' · ' + decision.candidate.label);
      lines.push('- 确认时间：' + decision.confirmedAt);
      lines.push('- 研究阶段：' + STAGE_LABELS[decision.context.profile.researchStage]);
      lines.push('- 交付目标：' + GOAL_LABELS[decision.context.profile.deliveryGoal]);
      lines.push('- 真实反馈：' + decision.context.policy.feedbackCopy);
      if (decision.context.feedback.note) lines.push('- 现场补充：' + decision.context.feedback.note);
      lines.push('- 人工确认：' + decision.candidate.title);
      lines.push('- 收益：' + decision.candidate.gain);
      lines.push('- 代价：' + decision.candidate.tradeoff);
      lines.push('- 适用依据：' + decision.candidate.basis);
      lines.push('- 第一行动：' + decision.candidate.firstAction);
      lines.push('- 复盘问题：' + decision.candidate.reviewPrompt);
      if (decision.changes.length) lines.push('- 相比 V' + (decision.version - 1) + '：' + decision.changes.join('；'));
      lines.push('');
    });
    if (proposal) {
      lines.push('### V' + Math.max(1, Math.round(number(proposal.version, history.length + 1))) + ' · 待人工确认');
      lines.push('- 真实反馈：' + text(proposal.feedbackLabel || (proposal.context && proposal.context.policy && proposal.context.policy.feedbackCopy) || '尚未记录'));
      if (proposal.feedbackNote) lines.push('- 现场补充：' + proposal.feedbackNote);
      lines.push('- 当前候选：' + text(proposal.candidateLabel || '等待选择'));
      lines.push('- 事实差异：' + (Array.isArray(proposal.changes) && proposal.changes.length ? proposal.changes.map(text).filter(Boolean).join('；') : '尚无结构性变化'));
      lines.push('');
    }
    return lines.join('\n');
  }

  return {
    buildPolicy: buildPolicy,
    buildSearchPlan: buildSearchPlan,
    scoreRecord: scoreRecord,
    rankRecords: rankRecords,
    decisionFeedbackChanged: decisionFeedbackChanged,
    buildDecisionContext: buildDecisionContext,
    normalizeDecisionContext: normalizeDecisionContext,
    buildStrategyCandidates: buildStrategyCandidates,
    decisionSignature: decisionSignature,
    diffDecisionContexts: diffDecisionContexts,
    createDecision: createDecision,
    normalizeDecisionHistory: normalizeDecisionHistory,
    buildDecisionProposal: buildDecisionProposal,
    normalizeDecisionProposal: normalizeDecisionProposal,
    buildDecisionArchive: buildDecisionArchive
  };
});
