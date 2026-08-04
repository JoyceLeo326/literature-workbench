(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathExperience = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STAGES = {
    coursework: { label: '课程研究', subject: '把散落材料收束成一条能讲清楚的论证线', pace: '先搭骨架，再逐篇补证据' },
    thesis: { label: '论文阶段', subject: '让研究问题、证据与结论经得起逐项追问', pace: '优先锁定核心来源与争议' },
    professional: { label: '工作研究', subject: '把文献判断转化成可执行的业务依据', pace: '先回答决策问题，再扩展背景' }
  };
  var GOALS = {
    'class-report': { label: '课堂汇报', finish: '形成一份脉络清楚、出处可回看的汇报底稿', focus: '观点线索与代表性证据' },
    proposal: { label: '开题方案', finish: '交付问题明确、缺口可信、路径可行的开题依据', focus: '研究缺口与方法边界' },
    review: { label: '文献综述', finish: '沉淀可复查、可继续扩写的综述证据库', focus: '主题聚类与证据分歧' }
  };

  function allowed(value, values, fallback) {
    return Object.prototype.hasOwnProperty.call(values, value) ? value : fallback;
  }

  function normalizeProfile(input) {
    var source = input || {};
    var hours = Number(source.weeklyHours);
    return {
      researchStage: allowed(source.researchStage, STAGES, 'coursework'),
      deliveryGoal: allowed(source.deliveryGoal, GOALS, 'class-report'),
      weeklyHours: Number.isFinite(hours) ? Math.min(40, Math.max(1, Math.round(hours))) : 5
    };
  }

  function profileLines(input) {
    var profile = normalizeProfile(input);
    return [
      '研究阶段：' + STAGES[profile.researchStage].label,
      '交付目标：' + GOALS[profile.deliveryGoal].label,
      '每周投入：' + profile.weeklyHours + ' 小时'
    ];
  }

  function buildJourney(input, project, counts) {
    var profile = normalizeProfile(input);
    var stage = STAGES[profile.researchStage];
    var goal = GOALS[profile.deliveryGoal];
    var title = String(project && project.title || '当前研究任务').trim() || '当前研究任务';
    var total = Math.max(0, Number(counts && counts.total) || 0);
    var verified = Math.max(0, Number(counts && counts.verified) || 0);
    var sessions = Math.max(1, Math.ceil(profile.weeklyHours / 2));
    var next = total === 0
      ? '先用一轮 30 分钟检索找到 3 篇锚点文献'
      : verified < total
        ? '先核验 ' + Math.min(total - verified, sessions) + ' 篇关键来源'
        : '从已核验记录中提炼分歧与空白';
    return [
      { beat: '起点', title: stage.label, copy: '你正在推进「' + title + '」，眼前要解决的是：' + stage.subject + '。' },
      { beat: '冲突', title: total ? '证据还没有完全就位' : '主题很大，第一步容易失焦', copy: total ? '已收录 ' + total + ' 篇，其中 ' + verified + ' 篇完成原文核验；真正的风险是把“收集过”误当成“证实过”。' : '先选择能支撑“' + goal.focus + '”的材料，避免一开始就在无关结果中消耗时间。' },
      { beat: '选择', title: sessions + ' 个专注时段', copy: '本周按约 ' + sessions + ' 个两小时以内的时段推进：' + next + '；节奏采用“' + stage.pace + '”。' },
      { beat: '结果', title: goal.label, copy: '每次判断都保留题录、来源与筛选理由，最终' + goal.finish + '。' }
    ];
  }

  function personalizeAdvice(base, input) {
    var profile = normalizeProfile(input);
    var goal = GOALS[profile.deliveryGoal];
    var block = profile.weeklyHours <= 3 ? '一次 25 分钟专注' : profile.weeklyHours <= 8 ? '一个 50 分钟时段' : '两个 45 分钟时段';
    return String(base || '').trim() + ' 先用' + block + '处理“' + goal.focus + '”，完成后留下可复查的来源与判断。';
  }

  return {
    normalizeProfile: normalizeProfile,
    profileLines: profileLines,
    buildJourney: buildJourney,
    personalizeAdvice: personalizeAdvice
  };
});
