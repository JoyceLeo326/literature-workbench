(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathStory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CHAPTERS = [
    { id: 'orient', index: '01', title: '让问题落地', eyebrow: 'ORIENT', copy: '把模糊兴趣压成一条可检验、可交付的研究边界。' },
    { id: 'screen', index: '02', title: '在噪声中取舍', eyebrow: 'SCREEN', copy: '保留检索路径，也保留每一次纳入与排除的理由。' },
    { id: 'evidence', index: '03', title: '让证据互相照见', eyebrow: 'EVIDENCE', copy: '回到原文，辨认支持、分歧、限制与仍然缺席的声音。' },
    { id: 'synthesize', index: '04', title: '从材料走向论证', eyebrow: 'SYNTHESIZE', copy: '比较不同结构，让观点、证据与边界形成一条可复查的线。' },
    { id: 'deliver', index: '05', title: '把研究交到别人手里', eyebrow: 'DELIVER', copy: '用清晰的文件、引用与说明，让下一位读者能继续工作。' },
    { id: 'continue', index: '06', title: '把反馈变成下一轮', eyebrow: 'CONTINUE', copy: '研究不是封箱；一次追问会重新打开检索、核验与写作。' }
  ];

  var SCENES = [
    { id: 'wenjing-01', chapter: 'orient', title: '暮色里的那句追问', role: '起点', asset: 'assets/story/wenjing-01-dusk-question.webp', alt: '研究者林在暮色书桌前面对散落文献，写下第一条研究问题', copy: '林面对几十个标签页，却无法回答导师的那句“你究竟要证明什么”。她先停下收集，写下一个可以被证据回答的问题。' },
    { id: 'wenjing-02', chapter: 'orient', title: '边界不是一道墙', role: '选择', asset: 'assets/story/wenjing-02-question-boundary.webp', alt: '林在纸上划定研究对象、年份与排除条件的边界', copy: '她把对象、关系、年份和不纳入的材料逐项写清。边界没有缩小好奇心，却让每一次取舍都有了依据。' },
    { id: 'wenjing-03', chapter: 'orient', title: '方法顾问画出检索路', role: '协作', asset: 'assets/story/wenjing-03-search-route.webp', alt: '方法顾问在资料室白板上连接中英文概念与检索路径', copy: '方法顾问把问题拆成概念组，补上同义词与中英文表达。检索不再是一串关键词，而是一张可以复跑的路线图。' },
    { id: 'wenjing-04', chapter: 'orient', title: '档案员打开候选潮', role: '转折', asset: 'assets/story/wenjing-04-candidate-wave.webp', alt: '档案员面对大量候选文献卡片，标记来源与检索批次', copy: '候选文献像潮水涌来。档案员没有替林做判断，只把来源、批次和查询时间一一留下，让结果能够回到起点。' },
    { id: 'wenjing-05', chapter: 'screen', title: '第一场艰难取舍', role: '冲突', asset: 'assets/story/wenjing-05-screening-tradeoff.webp', alt: '林在两篇相近论文之间对照纳入条件并记录取舍', copy: '一篇结论漂亮却偏离对象，另一篇样本有限却直面问题。林对照边界作出选择，同时写下为什么，而不只留下一个勾。' },
    { id: 'wenjing-06', chapter: 'screen', title: '相反的证据同时成立', role: '冲突', asset: 'assets/story/wenjing-06-conflicting-evidence.webp', alt: '林在双屏上比较结论相反的两组研究证据', copy: '两组研究给出相反方向的结果。她没有删除不顺眼的那一组，而是追查样本、情境和测量方式之间的差异。' },
    { id: 'wenjing-07', chapter: 'screen', title: '排除也必须留痕', role: '判断', asset: 'assets/story/wenjing-07-exclusion-ledger.webp', alt: '林在排除台账中逐条填写重复、偏题与来源不足的理由', copy: '重复发表、来源不明、只擦过关键词的材料被移出候选区。每条排除理由都留在台账里，供后来者复核。' },
    { id: 'wenjing-08', chapter: 'screen', title: '导师检查的不是数量', role: '检查点', asset: 'assets/story/wenjing-08-mentor-checkpoint.webp', alt: '林与导师在白板前检查筛选路径和遗漏风险', copy: '导师没有先问收了多少篇，而是问遗漏可能藏在哪里。林据此补查灰色来源，并调整下一轮检索重点。' },
    { id: 'wenjing-09', chapter: 'evidence', title: '回到原文的慢工作', role: '核验', asset: 'assets/story/wenjing-09-evidence-extraction.webp', alt: '林逐段阅读原文并摘录研究对象、方法、发现与限制', copy: '摘要只够定位，不能替代判断。林回到原文，把对象、方法、发现和限制拆进同一套证据字段。' },
    { id: 'wenjing-10', chapter: 'evidence', title: '证据开始形成星座', role: '发现', asset: 'assets/story/wenjing-10-evidence-constellation.webp', alt: '林把不同论文的证据卡连接成主题与分歧星座图', copy: '孤立的摘录逐渐聚成主题，有些互相支持，有些彼此拉扯。关系图第一次显出研究问题真正的结构。' },
    { id: 'wenjing-11', chapter: 'evidence', title: '给自己的偏好留一盏灯', role: '反思', asset: 'assets/story/wenjing-11-bias-review.webp', alt: '林在安静桌前审视证据选择中的偏好与盲点', copy: '她发现自己更容易保留支持预期的结果，于是重新查看低等级证据和被忽略的反例，标注判断的不确定性。' },
    { id: 'wenjing-12', chapter: 'evidence', title: '同伴提出另一种读法', role: '协商', asset: 'assets/story/wenjing-12-peer-synthesis-choice.webp', alt: '林与同伴围绕同一组证据讨论两种不同的综合路径', copy: '同伴从相同材料中看见另一条解释。两人不急着统一答案，而是比较哪条路径更忠于证据与边界。' },
    { id: 'wenjing-13', chapter: 'synthesize', title: '第一段真正的论证', role: '推进', asset: 'assets/story/wenjing-13-argument-writing.webp', alt: '林在夜晚把主张、证据和限定条件写成第一段论证', copy: '她不再按论文逐篇复述，而是先提出主张，再放入支持与反例，并明确这段话在什么条件下才成立。' },
    { id: 'wenjing-14', chapter: 'synthesize', title: '三种结构摆上桌面', role: '取舍', asset: 'assets/story/wenjing-14-three-structures.webp', alt: '林比较时间线、主题树和争议图三种综述结构', copy: '时间线清楚却淡化争议，主题树完整却容易平铺，争议图锋利却要求更强证据。她根据交付对象做出选择。' },
    { id: 'wenjing-15', chapter: 'synthesize', title: '每句话都能回到来源', role: '追溯', asset: 'assets/story/wenjing-15-citation-trace.webp', alt: '林沿着引用标记从论证段落返回原始文献页面', copy: '林逐句检查主张与引用的距离。读者点击引用时，能够回到原始题录、摘录位置和核验状态。' },
    { id: 'wenjing-16', chapter: 'synthesize', title: '把不知道写进结论', role: '边界', asset: 'assets/story/wenjing-16-evidence-limit.webp', alt: '林在结论旁用朱砂色标注证据限制与未知区域', copy: '证据不足的地方没有被漂亮措辞遮住。她把样本偏差、情境限制和仍未回答的问题写进结论边界。' },
    { id: 'wenjing-17', chapter: 'deliver', title: '交付对象改变表达', role: '选择', asset: 'assets/story/wenjing-17-deliverable-choice.webp', alt: '林在汇报、开题和综述三种交付版式之间作出选择', copy: '同一套证据面向课堂、开题与综述，需要不同的重点和篇幅。她先确认读者，再决定呈现结构。' },
    { id: 'wenjing-18', chapter: 'deliver', title: '同行从断点进入', role: '检验', asset: 'assets/story/wenjing-18-peer-review.webp', alt: '同行评审者从交付文件中的证据断点追查原始来源', copy: '同伴故意从一个有争议的结论进入，沿着引用和筛选记录反向追查。能否走通，成为交付前最真实的检验。' },
    { id: 'wenjing-19', chapter: 'deliver', title: '一句反馈重新打开检索', role: '反馈', asset: 'assets/story/wenjing-19-feedback-reopens-search.webp', alt: '林看到来源不足的反馈后重新打开检索路径与候选池', copy: '“英文证据不足”没有停留在评论区。文径把它转成下一轮检索任务，保留原交付，同时重新打开候选池。' },
    { id: 'wenjing-20', chapter: 'deliver', title: '证据包终于可以交接', role: '交付', asset: 'assets/story/wenjing-20-evidence-package.webp', alt: '林整理包含目录、证据矩阵、引用库和质量报告的交付包', copy: '目录、证据矩阵、引用库、质量报告与完整备份进入同一套交付包。每个文件都说明用途和继续方式。' },
    { id: 'wenjing-21', chapter: 'continue', title: '通勤途中接住线索', role: '连续', asset: 'assets/story/wenjing-21-mobile-continuity.webp', alt: '林在通勤途中用手机查看研究进度并记录待核验线索', copy: '新的线索出现在通勤路上。她用手机记下来源和待核问题，回到桌面后仍能接着同一条研究路径工作。' },
    { id: 'wenjing-22', chapter: 'continue', title: '导师接过完整上下文', role: '交接', asset: 'assets/story/wenjing-22-supervisor-handoff.webp', alt: '林向导师交接带有研究边界、筛选理由和证据限制的材料', copy: '导师收到的不只是一份成稿，还有边界、检索式、排除理由和限制。新的追问因此能够落到具体证据上。' },
    { id: 'wenjing-23', chapter: 'continue', title: '下一轮从反馈出发', role: '循环', asset: 'assets/story/wenjing-23-next-iteration.webp', alt: '林把同行反馈转成下一轮核验、检索和改写任务', copy: '林把反馈分成范围、来源、论证与交接四类。每一类都指向不同的下一步，而不是让研究重新从零开始。' },
    { id: 'wenjing-24', chapter: 'continue', title: '日出时，问题仍然开放', role: '结果', asset: 'assets/story/wenjing-24-sunrise-finale.webp', alt: '清晨日光照进资料室，林面对完整证据路径与新的研究问题', copy: '天亮时，交付已经完整，问题仍保持开放。她知道哪些已经被证据支持，也知道下一轮应该从哪里继续。' }
  ];

  var SIGNALS = {
    'scope-too-broad': { label: '研究范围仍然太宽', chapter: 'orient', sceneId: 'wenjing-02', view: 'scope', title: '重新压实研究边界', copy: '回到对象、关系、年份与排除条件，先缩小一个会引发返工的口子。' },
    'missing-sources': { label: '关键来源或语种不足', chapter: 'screen', sceneId: 'wenjing-05', view: 'queries', title: '补一轮定向检索', copy: '沿现有检索留痕补查缺席来源，并把新增候选与原结果分开记录。' },
    'claim-too-strong': { label: '结论强于现有证据', chapter: 'evidence', sceneId: 'wenjing-11', view: 'screening', title: '重查证据与限定条件', copy: '回到原文核验样本、情境与限制，收窄无法被当前证据支持的表述。' },
    'synthesis-unclear': { label: '综合结构还不清楚', chapter: 'synthesize', sceneId: 'wenjing-14', view: 'screening', title: '比较三种综合结构', copy: '用时间、主题和争议三种路径重排同一组证据，再选择最适合交付对象的一条。' },
    'handoff-hard': { label: '别人难以接着工作', chapter: 'deliver', sceneId: 'wenjing-20', view: 'delivery', title: '重做可追溯交接', copy: '补齐目录、来源、筛选理由与限制，让接手者能从任一结论回到原始证据。' },
    worked: { label: '本轮有效，继续推进', chapter: 'continue', sceneId: 'wenjing-23', view: 'overview', title: '进入下一轮研究', copy: '保留本轮路径，把新的追问转成一条明确的检索、核验或改写任务。' }
  };

  function chapterById(id) {
    return CHAPTERS.filter(function (chapter) { return chapter.id === id; })[0] || CHAPTERS[0];
  }

  function normalizeFeedback(input) {
    var source = input && typeof input === 'object' ? input : {};
    var signal = Object.prototype.hasOwnProperty.call(SIGNALS, source.signal) ? source.signal : '';
    return {
      signal: signal,
      note: String(source.note || '').trim().slice(0, 240),
      updatedAt: String(source.updatedAt || '')
    };
  }

  function recommendedChapter(profile, feedback, counts) {
    var review = normalizeFeedback(feedback);
    if (review.signal) {
      var response = SIGNALS[review.signal];
      return Object.assign({}, chapterById(response.chapter), { reason: '根据上一轮反馈：“' + response.label + '”' });
    }
    var input = profile || {};
    var stats = counts || {};
    var total = Math.max(0, Number(stats.total) || 0);
    var verified = Math.max(0, Number(stats.verified) || 0);
    if (!total) return Object.assign({}, chapterById('orient'), { reason: '从一个可回答的问题开始' });
    if (!verified || verified < Math.ceil(total * .35)) return Object.assign({}, chapterById('screen'), { reason: '候选已经出现，先完成取舍与核验' });
    if (input.deliveryGoal === 'review' && verified >= 4) return Object.assign({}, chapterById('synthesize'), { reason: '综述交付需要先形成证据关系' });
    if (input.researchStage === 'professional' && verified >= 5) return Object.assign({}, chapterById('deliver'), { reason: '工作研究要尽快形成可交接依据' });
    if (input.researchStage === 'thesis' || input.deliveryGoal === 'proposal') return Object.assign({}, chapterById('evidence'), { reason: '论文与开题阶段优先检查证据边界' });
    return Object.assign({}, chapterById('evidence'), { reason: '已有材料，下一步回到原文建立关系' });
  }

  function nextMove(input) {
    var feedback = normalizeFeedback(input);
    var move = SIGNALS[feedback.signal] || SIGNALS.worked;
    return {
      signal: feedback.signal || 'worked',
      label: move.label,
      chapter: move.chapter,
      sceneId: move.sceneId,
      view: move.view,
      title: move.title,
      copy: move.copy + (feedback.note ? ' 你补充的是：' + feedback.note : '')
    };
  }

  function feedbackLines(input) {
    var feedback = normalizeFeedback(input);
    if (!feedback.signal) return ['上一轮反馈：尚未记录'];
    var move = nextMove(feedback);
    return [
      '上一轮反馈：' + move.label,
      '下一轮动作：' + move.title,
      feedback.note ? '补充说明：' + feedback.note : ''
    ].filter(Boolean);
  }

  return {
    CHAPTERS: CHAPTERS,
    SCENES: SCENES,
    SIGNALS: SIGNALS,
    normalizeFeedback: normalizeFeedback,
    recommendedChapter: recommendedChapter,
    nextMove: nextMove,
    feedbackLines: feedbackLines,
    chapterById: chapterById
  };
});
