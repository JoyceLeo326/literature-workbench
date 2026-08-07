(function () {
  'use strict';

  var LEGACY_STORAGE_KEY = 'litpath-workbench-v1';
  var WORKSPACE_STORAGE_KEY = 'litpath-workspaces-v1';
  var ACCOUNT_STORAGE_KEY = 'litpath-local-accounts-v1';
  var SESSION_ACCOUNT_KEY = 'litpath-account-session-v1';
  var VERSION = 2;
  var Synthesis = window.LitpathSynthesis;
  var Workspace = window.LitpathWorkspace;
  var Account = window.LitpathAccount;
  var Experience = window.LitpathExperience;
  var Story = window.LitpathStory;
  var Decision = window.LitpathDecision;
  var selectedIds = new Set();
  var pendingDelete = null;
  var pendingExportType = '';
  var issueFilter = 'all';
  var dirtyForms = new Set();
  var screeningSaveTimer = null;
  var dialogReturnFocus = null;
  var storyProjectId = '';
  var activeStoryChapterId = '';
  var activeStorySceneId = '';

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function uid() { return 'lit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function nowISO() { return new Date().toISOString(); }
  function localDateStamp(value) {
    var date = value || new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }
  function safeText(value) { return String(value == null ? '' : value); }
  function escapeHTML(value) {
    return safeText(value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function formatDate(value) {
    if (!value) return '未设置';
    var date = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
    if (Number.isNaN(date.getTime())) return value;
    return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }
  function formatTime(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  function defaultState() {
    return Workspace.createProjectState();
  }

  function activeAccountId() {
    return sessionStorage.getItem(SESSION_ACCOUNT_KEY) || 'guest';
  }

  function scopedWorkspaceKey() {
    return WORKSPACE_STORAGE_KEY + ':' + activeAccountId();
  }

  function loadWorkspace() {
    try {
      var saved = JSON.parse(localStorage.getItem(scopedWorkspaceKey()) || 'null');
      var legacy = activeAccountId() === 'guest' ? JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null') : null;
      var normalized = Workspace.normalizeWorkspace(saved, legacy);
      normalized.projects = normalized.projects.map(function (project) {
        project.records = normalizeRecordList(project.records);
        project.searchLogs = Array.isArray(project.searchLogs) ? project.searchLogs.map(normalizeSearchLog) : [];
        return project;
      });
      return normalized;
    } catch (error) {
      return Workspace.normalizeWorkspace(null, null);
    }
  }

  var workspace = loadWorkspace();
  var state = Workspace.getActiveProject(workspace);

  function currentProfile() {
    return Experience.normalizeProfile(state.project);
  }

  function renderSaveStatus(message) {
    var status = $('[data-save-status]');
    if (status) status.textContent = dirtyForms.size ? '有未提交更改' : (message || '所有更改已保存');
  }
  function markFormDirty(form) {
    if (!form) return;
    dirtyForms.add(form);
    renderSaveStatus();
  }
  function clearFormDirty(form) {
    if (form) dirtyForms.delete(form);
    renderSaveStatus();
  }
  function confirmDiscardForm(form, message) {
    if (!form || !dirtyForms.has(form)) return true;
    if (!window.confirm(message || '当前表单有未提交更改。仍要关闭吗？')) return false;
    clearFormDirty(form);
    return true;
  }
  function confirmDiscardAll(message) {
    if (!dirtyForms.size) return true;
    if (!window.confirm(message || '当前表单有未提交更改。仍要继续吗？')) return false;
    dirtyForms.clear();
    renderSaveStatus();
    return true;
  }
  function confirmPendingTransition(message) {
    return !dirtyForms.size || window.confirm(message || '当前表单有未提交更改。仍要继续吗？');
  }

  function saveState(message) {
    state.updatedAt = nowISO();
    workspace = Workspace.upsertActiveProject(workspace, state);
    localStorage.setItem(scopedWorkspaceKey(), JSON.stringify(workspace));
    var status = $('[data-save-status]');
    if (status) {
      status.textContent = '正在保存…';
      window.setTimeout(function () { renderSaveStatus(message); }, 180);
    }
  }

  function normalizeRecord(record) {
    record = record && typeof record === 'object' ? record : {};
    var synthesis = Synthesis.normalizeSynthesis(record);
    return {
      id: Workspace.safeId(record.id, 'lit'),
      language: record.language === '英文' ? '英文' : '中文',
      title: safeText(record.title).trim(),
      abstract: safeText(record.abstract).trim(),
      authors: safeText(record.authors).trim(),
      affiliation: safeText(record.affiliation).trim(),
      year: safeText(record.year).trim(),
      type: record.type || '期刊论文',
      source: safeText(record.source).trim(),
      doi: safeText(record.doi).trim(),
      url: safeText(record.url).trim(),
      fileName: safeText(record.fileName).trim(),
      database: safeText(record.database).trim(),
      keywords: safeText(record.keywords).trim(),
      notes: safeText(record.notes).trim(),
      status: ['待补全', '待核验', '已核验'].indexOf(record.status) >= 0 ? record.status : '待核验',
      screeningDecision: synthesis.screeningDecision,
      exclusionReason: synthesis.exclusionReason,
      coreFinding: synthesis.coreFinding,
      evidenceGrade: synthesis.evidenceGrade,
      themeTags: synthesis.themeTags,
      createdAt: record.createdAt || nowISO(),
      updatedAt: record.updatedAt || nowISO(),
      demo: Boolean(record.demo)
    };
  }

  function normalizeSearchLog(log) {
    log = log && typeof log === 'object' ? log : {};
    var createdAt = safeText(log.createdAt);
    if (!createdAt || Number.isNaN(new Date(createdAt).getTime())) createdAt = nowISO();
    return {
      id: Workspace.safeId(log.id, 'log'),
      platform: safeText(log.platform).trim().slice(0, 120),
      note: safeText(log.note).trim().slice(0, 500),
      language: ['中文', '英文', '中英'].indexOf(log.language) >= 0 ? log.language : '中英',
      createdAt: createdAt
    };
  }

  function normalizeRecordList(records, reservedIds) {
    var used = new Set(Array.isArray(reservedIds) ? reservedIds : []);
    return (Array.isArray(records) ? records : []).map(function (record) {
      var normalized = normalizeRecord(record);
      while (used.has(normalized.id)) normalized.id = Workspace.safeId('', 'lit');
      used.add(normalized.id);
      return normalized;
    });
  }

  function formalRecords() {
    return Workspace.formalRecords(state.records);
  }

  function splitTerms(value) {
    return safeText(value).split(/[,，;；\n]+/).map(function (item) { return item.trim(); }).filter(Boolean);
  }
  function groupQuery(value, quote) {
    var terms = splitTerms(value);
    if (!terms.length) return '';
    return '(' + terms.map(function (term) { return quote ? '"' + term.replace(/"/g, '') + '"' : term; }).join(' OR ') + ')';
  }
  function generateQueries() {
    state.queries.cn = [groupQuery(state.concepts.a), groupQuery(state.concepts.b), groupQuery(state.concepts.c)].filter(Boolean).join(' AND ');
    state.queries.en = [groupQuery(state.concepts.aEn, true), groupQuery(state.concepts.bEn, true), groupQuery(state.concepts.cEn, true)].filter(Boolean).join(' AND ');
  }
  if (!state.queries.cn || !state.queries.en) generateQueries();

  function normalizeTitle(value) {
    return safeText(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
  }
  function normalizeDOI(value) {
    return safeText(value).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/\s+/g, '');
  }
  function isValidPublicationYear(value) {
    var year = safeText(value).trim();
    if (!year) return true;
    var maximum = new Date().getFullYear() + 1;
    return /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= maximum;
  }
  function isValidDOI(value) {
    var doi = normalizeDOI(value);
    return !doi || /^10\.\d{4,9}\/\S+$/i.test(doi);
  }
  function isValidSourceUrl(value) {
    var url = safeText(value).trim();
    if (!url) return true;
    try {
      var parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (error) {
      return false;
    }
  }

  function analyzeQuality() {
    var issues = [];
    var titleMap = {};
    var doiMap = {};
    formalRecords().forEach(function (record) {
      var missing = [];
      ['title', 'abstract', 'authors'].forEach(function (key) { if (!record[key]) missing.push({ title: 'title', abstract: '摘要', authors: '作者' }[key]); });
      if (!record.year) missing.push('年份');
      if (!record.source) missing.push('期刊 / 来源');
      if (!record.fileName) missing.push('PDF 文件名');
      if (missing.length) issues.push({ type: 'missing', id: record.id, title: record.title || '未命名记录', message: '缺少：' + missing.join('、') });
      if (record.year && !isValidPublicationYear(record.year)) issues.push({ type: 'missing', id: record.id, title: record.title || '未命名记录', message: '年份格式或范围无效' });
      if (!record.doi && !record.url) issues.push({ type: 'source', id: record.id, title: record.title || '未命名记录', message: '缺少 DOI 或原文链接，来源不可直接追溯' });
      if (record.doi && !isValidDOI(record.doi)) issues.push({ type: 'source', id: record.id, title: record.title || '未命名记录', message: 'DOI 格式无效，请回到来源核对' });
      if (record.url && !isValidSourceUrl(record.url)) issues.push({ type: 'source', id: record.id, title: record.title || '未命名记录', message: '原文链接格式无效' });
      var titleKey = normalizeTitle(record.title);
      if (titleKey) {
        titleMap[titleKey] = titleMap[titleKey] || [];
        titleMap[titleKey].push(record);
      }
      var doiKey = normalizeDOI(record.doi);
      if (doiKey) {
        doiMap[doiKey] = doiMap[doiKey] || [];
        doiMap[doiKey].push(record);
      }
    });
    Object.keys(titleMap).forEach(function (key) {
      if (titleMap[key].length > 1) titleMap[key].forEach(function (record) { issues.push({ type: 'duplicate', id: record.id, title: record.title, message: '与其他记录题名相同或高度一致' }); });
    });
    Object.keys(doiMap).forEach(function (key) {
      if (doiMap[key].length > 1) doiMap[key].forEach(function (record) { issues.push({ type: 'duplicate', id: record.id, title: record.title, message: 'DOI 重复：' + key }); });
    });
    var unique = {};
    return issues.filter(function (issue) {
      var key = issue.type + '|' + issue.id + '|' + issue.message;
      if (unique[key]) return false;
      unique[key] = true;
      return true;
    });
  }

  function counts() {
    var records = formalRecords();
    var cn = records.filter(function (record) { return record.language === '中文'; }).length;
    var en = records.filter(function (record) { return record.language === '英文'; }).length;
    var verified = records.filter(function (record) { return record.status === '已核验'; }).length;
    return { total: records.length, cn: cn, en: en, verified: verified };
  }

  function setProgress(selector, value) {
    var element = $(selector);
    if (element) element.style.width = clamp(value, 0, 100) + '%';
  }

  function calculateReadiness(issues) {
    var c = counts();
    var target = Number(state.project.cnTarget || 0) + Number(state.project.enTarget || 0);
    var quantity = target ? clamp(c.total / target, 0, 1) : 1;
    var completeness = c.total ? clamp(1 - issues.filter(function (i) { return i.type === 'missing'; }).length / c.total, 0, 1) : 0;
    var verification = c.total ? c.verified / c.total : 0;
    var checked = Object.keys(state.finalChecks).filter(function (key) { return state.finalChecks[key]; }).length / 4;
    return Math.round((quantity * .3 + completeness * .3 + verification * .25 + checked * .15) * 100);
  }

  function renderMetrics() {
    var c = counts();
    var cnTarget = Number(state.project.cnTarget || 0);
    var enTarget = Number(state.project.enTarget || 0);
    var totalTarget = cnTarget + enTarget;
    $('[data-total-count]').textContent = c.total;
    $('[data-cn-count]').textContent = c.cn;
    $('[data-en-count]').textContent = c.en;
    $('[data-verified-count]').textContent = c.verified;
    $('[data-total-target]').textContent = totalTarget;
    $('[data-cn-target]').textContent = cnTarget;
    $('[data-en-target]').textContent = enTarget;
    $('[data-overview-title]').textContent = totalTarget ? '把 ' + totalTarget + ' 篇文献，整理成一套可复查的研究底稿。' : '把散落的文献，整理成一套可复查的研究底稿。';
    setProgress('[data-total-progress]', totalTarget ? c.total / totalTarget * 100 : 0);
    setProgress('[data-cn-progress]', cnTarget ? c.cn / cnTarget * 100 : 0);
    setProgress('[data-en-progress]', enTarget ? c.en / enTarget * 100 : 0);
    setProgress('[data-verified-progress]', c.total ? c.verified / c.total * 100 : 0);
    $('[data-total-copy]').textContent = !totalTarget ? '尚未设置文献目标' : (c.total ? '已完成 ' + Math.round(c.total / totalTarget * 100) + '%' : '尚未录入文献');
    $('[data-cn-copy]').textContent = !cnTarget ? '尚未设置中文目标' : (c.cn >= cnTarget ? '中文目标已完成' : '还需 ' + Math.max(0, cnTarget - c.cn) + ' 篇');
    $('[data-en-copy]').textContent = !enTarget ? '尚未设置英文目标' : (c.en >= enTarget ? '英文目标已完成' : '还需 ' + Math.max(0, enTarget - c.en) + ' 篇');
    $('[data-verified-copy]').textContent = c.verified ? c.verified + ' 篇已回到原文确认' : '等待核验';
    $$('[data-nav-count]').forEach(function (el) { el.textContent = c.total; });
    $('[data-csv-status]').textContent = '包含 ' + c.total + ' 条记录';
  }

  function projectHasScope() {
    return Boolean(state.project.title && state.project.topic && state.project.deadline);
  }
  function renderWorkflow() {
    var issues = analyzeQuality();
    var c = counts();
    var screening = Synthesis.summarizeScreening(formalRecords());
    var steps = {
      scope: projectHasScope(),
      queries: Boolean(state.queries.cn && state.queries.en),
      library: c.total > 0,
      screening: c.total > 0 && screening.pending === 0,
      quality: c.total > 0 && screening.pending === 0 && issues.length === 0,
      delivery: Object.keys(state.finalChecks).every(function (key) { return state.finalChecks[key]; })
    };
    $$('.workflow-steps li').forEach(function (li) { li.classList.toggle('is-complete', Boolean(steps[li.getAttribute('data-step')])); });
    var stage = !steps.scope ? '明确边界' : !steps.queries ? '准备检索' : !steps.library ? '开始录入' : !steps.screening ? '筛选证据' : issues.length ? '质量检查' : !steps.delivery ? '交付终检' : '可以交付';
    $('[data-stage-pill]').textContent = stage;
  }

  function getAdvice() {
    var issues = analyzeQuality();
    var c = counts();
    var screening = Synthesis.summarizeScreening(formalRecords());
    var review = Story.normalizeFeedback(state.project.reviewFeedback);
    if (review.signal && review.signal !== 'worked') {
      var response = Story.nextMove(review);
      return { index: '↻', title: response.title, copy: response.copy, view: response.view };
    }
    if (!projectHasScope()) return { index: '01', title: '先确认研究主题', copy: '明确范围后再检索，可以减少后续返工。', view: 'scope' };
    if (!state.searchLogs.length) return { index: '02', title: '记录第一条检索式', copy: '保留平台、关键词和查询时间，后续才能复查。', view: 'queries' };
    if (!c.total) return { index: '03', title: '录入第一篇文献', copy: '从样例开始确认目录字段和摘要口径。', view: 'library' };
    if (screening.pending) return { index: '04', title: '筛选 ' + screening.pending + ' 条待判断记录', copy: '逐条对照纳入与排除条件，判断不会由工作台自动生成。', view: 'screening' };
    if (screening.findings < screening.included) return { index: '04', title: '补齐纳入记录的核心发现', copy: '回到原文摘记关键结果，并标注证据等级与主题。', view: 'screening' };
    if (issues.length) return { index: '05', title: '处理 ' + issues.length + ' 个质量问题', copy: '优先补齐摘要、作者和来源，再处理重复项。', view: 'quality' };
    if (c.verified < c.total) return { index: '05', title: '完成原文核验', copy: '还有 ' + (c.total - c.verified) + ' 篇记录尚未标记为已核验。', view: 'quality' };
    return { index: '06', title: '生成交付文件', copy: '目录已经通过基础检查，可以导出并完成终检。', view: 'delivery' };
  }
  function renderAdvice() {
    var advice = getAdvice();
    $('.advice-index').textContent = advice.index;
    $('[data-advice-title]').textContent = advice.title;
    $('[data-advice-copy]').textContent = Experience.personalizeAdvice(advice.copy, currentProfile());
    $('[data-advice-action]').setAttribute('data-target-view', advice.view);
    var issues = analyzeQuality();
    $('[data-mini-qa]').textContent = formalRecords().length ? (issues.length ? issues.length + ' 个问题待处理' : '基础检查通过') : '尚无记录';
    $('[data-mini-qa-copy]').textContent = formalRecords().length ? (issues.length ? '进入质量检查定位问题。' : '继续完成原文核验和交付清单。') : '添加文献后会自动检查。';
  }

  function renderJourney() {
    var container = $('[data-journey-grid]');
    if (!container) return;
    var journey = Experience.buildJourney(currentProfile(), state.project, counts());
    container.innerHTML = journey.map(function (item, index) {
      return '<article class="journey-beat"><span>0' + (index + 1) + ' · ' + escapeHTML(item.beat) + '</span><strong>' + escapeHTML(item.title) + '</strong><p>' + escapeHTML(item.copy) + '</p></article>';
    }).join('');
  }

  function storyDefaultMove(chapterId) {
    var moves = {
      orient: { view: 'scope', title: '写下研究边界', copy: '先确认对象、关系、年份、材料类型和明确的排除条件。' },
      screen: { view: 'screening', title: '处理下一组候选', copy: '逐条对照边界，保留纳入、排除和仍待核验的理由。' },
      evidence: { view: 'screening', title: '回到原文核验证据', copy: '补齐核心发现、证据等级、主题标签与限制条件。' },
      synthesize: { view: 'screening', title: '重排证据关系', copy: '比较主题、时间和争议结构，再选择最适合交付对象的一条。' },
      deliver: { view: 'delivery', title: '检查交付包', copy: '确认目录、引用、质量报告和完整备份都能被下一位读者复查。' },
      continue: { view: 'overview', title: '确认下一轮问题', copy: '把新的追问转成一个明确的检索、核验或改写动作。' }
    };
    return moves[chapterId] || moves.orient;
  }

  function renderStory() {
    var gallery = $('[data-story-gallery]');
    if (!gallery || !Story) return;
    var review = Story.normalizeFeedback(state.project.reviewFeedback);
    var recommended = Story.recommendedChapter(currentProfile(), review, counts());
    if (storyProjectId !== state.id || !Story.chapterById(activeStoryChapterId) || !activeStoryChapterId) {
      storyProjectId = state.id;
      activeStoryChapterId = recommended.id;
      activeStorySceneId = '';
    }

    var chapterScenes = Story.SCENES.filter(function (scene) { return scene.chapter === activeStoryChapterId; });
    var scene = Story.SCENES.filter(function (item) { return item.id === activeStorySceneId; })[0];
    if (!scene || scene.chapter !== activeStoryChapterId) {
      scene = chapterScenes[0];
      activeStorySceneId = scene.id;
    }
    var chapter = Story.chapterById(scene.chapter);
    var absoluteIndex = Story.SCENES.indexOf(scene) + 1;
    var image = $('[data-story-image]');
    image.src = scene.asset;
    image.alt = scene.alt;
    image.setAttribute('loading', absoluteIndex === 1 ? 'eager' : 'lazy');
    $('[data-story-scene-meta]').textContent = String(absoluteIndex).padStart(2, '0') + ' · ' + scene.role;
    $('[data-story-scene-title]').textContent = scene.title;
    $('[data-story-scene-copy]').textContent = scene.copy;
    $('[data-story-position]').textContent = String(absoluteIndex).padStart(2, '0') + ' / ' + Story.SCENES.length;
    $('[data-story-chapter-title]').textContent = chapter.title;
    $('[data-story-recommendation]').textContent = recommended.title;
    $('[data-story-reason]').textContent = recommended.reason;

    var move = review.signal ? Story.nextMove(review) : storyDefaultMove(recommended.id);
    $('[data-story-next-title]').textContent = move.title;
    $('[data-story-next-copy]').textContent = move.copy;
    $('[data-story-next-action]').setAttribute('data-target-view', move.view);

    $('[data-story-chapters]').innerHTML = Story.CHAPTERS.map(function (item) {
      var active = item.id === activeStoryChapterId;
      return '<button class="story-chapter story-control' + (active ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + active + '" data-story-chapter="' + escapeHTML(item.id) + '"><span>' + escapeHTML(item.index + ' · ' + item.eyebrow) + '</span><strong>' + escapeHTML(item.title) + '</strong></button>';
    }).join('');

    $('[data-story-scenes]').innerHTML = chapterScenes.map(function (item) {
      var active = item.id === activeStorySceneId;
      var number = Story.SCENES.indexOf(item) + 1;
      return '<button class="story-scene story-control' + (active ? ' is-active' : '') + '" type="button" data-story-scene="' + escapeHTML(item.id) + '" aria-current="' + (active ? 'true' : 'false') + '"><img src="' + escapeHTML(item.asset) + '" alt="" width="144" height="96" loading="lazy" decoding="async"><span><span>' + String(number).padStart(2, '0') + ' · ' + escapeHTML(item.role) + '</span><strong>' + escapeHTML(item.title) + '</strong></span></button>';
    }).join('');

    var form = $('[data-story-feedback-form]');
    if (form && !form.contains(document.activeElement)) {
      form.elements.signal.value = review.signal;
      form.elements.note.value = review.note;
    }
    var feedbackStatus = $('[data-story-feedback-status]');
    if (review.signal) {
      feedbackStatus.textContent = '已保存「' + Story.SIGNALS[review.signal].label + '」' + (review.updatedAt ? ' · ' + formatTime(review.updatedAt) : '') + '，下一轮路径已重排。';
    } else {
      feedbackStatus.textContent = '反馈保存后，会改写进入章节和任务建议。';
    }
  }

  function renderRecent() {
    var container = $('[data-recent-list]');
    var records = formalRecords().slice().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); }).slice(0, 4);
    if (!records.length) {
      container.innerHTML = '<div class="recent-empty">尚无文献记录。目录更新后会出现在这里。</div>';
      return;
    }
    container.innerHTML = records.map(function (record) {
      return '<div class="recent-item"><span>' + (record.language === '英文' ? 'EN' : 'CN') + '</span><div><strong>' + escapeHTML(record.title || '未命名记录') + '</strong><small>' + escapeHTML(record.authors || '作者待补') + ' · ' + escapeHTML(record.source || '来源待补') + '</small></div><em>' + formatTime(record.updatedAt) + '</em></div>';
    }).join('');
  }

  function filteredRecords() {
    var search = safeText($('#library-search').value).trim().toLowerCase();
    var language = $('[data-filter-language]').value;
    var status = $('[data-filter-status]').value;
    var records = formalRecords().filter(function (record) {
      var haystack = [record.title, record.authors, record.keywords, record.source].join(' ').toLowerCase();
      return (!search || haystack.indexOf(search) >= 0) && (language === 'all' || record.language === language) && (status === 'all' || record.status === status);
    });
    var sort = $('[data-library-sort]').value;
    if (sort === 'updated') return records.sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
    if (sort === 'year') return records.sort(function (a, b) { return Number(b.year || 0) - Number(a.year || 0); });
    return Decision.rankRecords(records, currentProfile(), state.project, counts(), state.project.reviewFeedback).map(function (item) { return item.record; });
  }

  function statusClass(status) { return status === '已核验' ? 'complete' : status === '待补全' ? 'missing' : 'review'; }
  function renderLibrary() {
    var records = filteredRecords();
    var total = formalRecords().length;
    var body = $('[data-library-body]');
    var empty = $('[data-library-empty]');
    body.innerHTML = records.map(function (record) {
      var safeId = escapeHTML(record.id);
      var priority = Decision.scoreRecord(record, currentProfile(), state.project, counts(), state.project.reviewFeedback);
      return '<tr class="' + (selectedIds.has(record.id) ? 'is-selected' : '') + '" data-record-id="' + safeId + '">' +
        '<td><input type="checkbox" data-select-record="' + safeId + '" aria-label="选择 ' + escapeHTML(record.title || '未命名记录') + '" ' + (selectedIds.has(record.id) ? 'checked' : '') + '></td>' +
        '<td><span class="language-badge ' + (record.language === '英文' ? 'en' : '') + '">' + record.language + '</span></td>' +
        '<td><strong class="record-title">' + escapeHTML(record.title || '未命名记录') + '</strong><small class="record-source">' + escapeHTML(record.source || '来源待补') + ' · ' + escapeHTML(record.type) + '</small><span class="priority-inline"><b>' + priority.score + '</b> ' + escapeHTML(priority.level) + ' · ' + escapeHTML(priority.next) + '</span></td>' +
        '<td>' + escapeHTML(record.authors || '待补') + '</td>' +
        '<td>' + escapeHTML(record.year || '—') + '</td>' +
        '<td><span class="record-status ' + statusClass(record.status) + '">' + record.status + '</span></td>' +
        '<td><div class="row-actions"><button type="button" data-edit-record="' + safeId + '" aria-label="编辑文献"><svg><use href="#i-edit"/></svg></button><button type="button" data-delete-record="' + safeId + '" aria-label="删除文献"><svg><use href="#i-trash"/></svg></button></div></td></tr>';
    }).join('');
    empty.hidden = total > 0;
    body.hidden = records.length === 0;
    if (total && !records.length) {
      empty.hidden = false;
      empty.innerHTML = '<svg><use href="#i-search"/></svg><h3>没有匹配的记录</h3><p>尝试不同关键词，或清除当前筛选条件。</p><button class="button button-secondary" type="button" data-clear-filters>清除筛选</button>';
    }
    $('[data-library-summary]').textContent = records.length === total ? total + ' 篇记录' : '显示 ' + records.length + ' / ' + total + ' 篇';
    var selectAll = $('[data-select-all]');
    var visibleIds = records.map(function (record) { return record.id; });
    selectAll.checked = visibleIds.length > 0 && visibleIds.every(function (id) { return selectedIds.has(id); });
    selectAll.indeterminate = visibleIds.some(function (id) { return selectedIds.has(id); }) && !selectAll.checked;
    renderBulkBar();
  }

  function renderDecisionStrategy() {
    var policy = Decision.buildPolicy(currentProfile(), state.project, counts(), state.project.reviewFeedback);
    var plan = Decision.buildSearchPlan(currentProfile(), state.project, counts(), state.project.reviewFeedback);
    $('[data-strategy-headline]').textContent = policy.headline;
    $('[data-strategy-language]').textContent = policy.languageFocus + '优先';
    $('[data-strategy-tradeoff]').textContent = policy.tradeoff + ' 本轮反馈：' + policy.feedbackCopy + '。';
    var weightLabels = { relevance: '边界相关', traceability: '来源追溯', completeness: '字段完整', recency: '时间新近', contrast: '反证分歧' };
    $('[data-strategy-weights]').innerHTML = Object.keys(weightLabels).map(function (key) {
      return '<div><span>' + weightLabels[key] + '</span><strong>' + policy.weights[key] + '%</strong><i><b style="width:' + policy.weights[key] + '%"></b></i></div>';
    }).join('');
    $('[data-search-plan]').innerHTML = plan.map(function (item) {
      return '<li><span>' + item.index + '</span><div><strong>' + escapeHTML(item.title) + '</strong><p>' + escapeHTML(item.copy) + '</p><small>' + escapeHTML(item.meta) + '</small></div></li>';
    }).join('');
  }

  function renderPriorityQueue() {
    var container = $('[data-priority-queue]');
    var records = Decision.rankRecords(formalRecords(), currentProfile(), state.project, counts(), state.project.reviewFeedback).slice(0, 3);
    if (!records.length) {
      container.innerHTML = '<div class="priority-empty"><strong>还没有待判断的题录</strong><span>录入第一篇文献后，这里会解释为什么它应当先处理。</span><button class="button button-primary" type="button" data-add-record>添加文献</button></div>';
      return;
    }
    container.innerHTML = records.map(function (item, index) {
      return '<button class="priority-card" type="button" data-edit-record="' + escapeHTML(item.record.id) + '"><span class="priority-rank">0' + (index + 1) + '</span><div><strong>' + escapeHTML(item.record.title || '未命名记录') + '</strong><p>' + escapeHTML(item.priority.reasons.join(' · ') || '需要人工判断与研究边界的关系') + '</p><small>下一步：' + escapeHTML(item.priority.next) + '</small></div><em><b>' + item.priority.score + '</b><span>' + escapeHTML(item.priority.level) + '</span></em></button>';
    }).join('');
  }

  function renderBulkBar() {
    var bar = $('[data-bulk-bar]');
    bar.hidden = selectedIds.size === 0;
    $('[data-selected-count]').textContent = selectedIds.size;
  }

  function screeningOption(value, current) {
    return '<option value="' + escapeHTML(value) + '" ' + (value === current ? 'selected' : '') + '>' + escapeHTML(value) + '</option>';
  }

  function screeningFilters() {
    return {
      decision: $('[data-screen-filter-decision]').value,
      evidenceGrade: $('[data-screen-filter-grade]').value,
      theme: $('[data-screen-filter-theme]').value,
      query: $('[data-screen-search]').value
    };
  }

  function renderGapSummary() {
    var gap = Synthesis.buildGapSummary(formalRecords());
    var container = $('[data-gap-summary]');
    var themeCopy = gap.themes.length
      ? gap.themes.map(function (theme) { return '<span><b>' + escapeHTML(theme.name) + '</b><small>' + theme.count + ' 条</small></span>'; }).join('')
      : '<p class="gap-empty">已纳入记录尚未添加主题标签。</p>';
    var sparse = gap.themes.filter(function (theme) { return theme.count === 1; }).map(function (theme) { return theme.name; });
    container.innerHTML = '<div class="gap-metrics">' +
      '<div><strong>' + gap.incompleteFindings + '</strong><span>条核心发现待补</span></div>' +
      '<div><strong>' + gap.ungradedEvidence + '</strong><span>条证据等级待标</span></div>' +
      '<div><strong>' + gap.untaggedEvidence + '</strong><span>条主题标签待补</span></div>' +
      '</div><div class="theme-distribution"><p>当前纳入记录的主题分布</p><div>' + themeCopy + '</div></div>' +
      (sparse.length ? '<p class="gap-signal">低覆盖主题（当前仅 1 条记录）：' + escapeHTML(sparse.join('、')) + '。建议复核检索与筛选范围，不自动推断为真实研究空白。</p>' : '') +
      '<p class="gap-note">' + escapeHTML(gap.note) + '</p>';
  }

  function renderScreening() {
    var official = formalRecords();
    var summary = Synthesis.summarizeScreening(official);
    $('[data-screen-pending]').textContent = summary.pending;
    $('[data-screen-included]').textContent = summary.included;
    $('[data-screen-excluded]').textContent = summary.excluded;
    $('[data-screen-findings]').textContent = summary.findings;
    $('[data-screen-completeness]').textContent = summary.findings + ' / ' + summary.included + ' 条已纳入记录';
    $$('[data-screen-pending-count]').forEach(function (el) { el.textContent = summary.pending; });

    var themeSelect = $('[data-screen-filter-theme]');
    var selectedTheme = themeSelect.value || 'all';
    var themes = [];
    official.forEach(function (record) {
      Synthesis.normalizeSynthesis(record).themeTags.forEach(function (theme) { if (themes.indexOf(theme) < 0) themes.push(theme); });
    });
    themes.sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); });
    themeSelect.innerHTML = '<option value="all">全部主题</option>' + themes.map(function (theme) { return screeningOption(theme, selectedTheme); }).join('');
    themeSelect.value = themes.indexOf(selectedTheme) >= 0 ? selectedTheme : 'all';

    var records = Synthesis.filterEvidence(official, screeningFilters());
    var body = $('[data-screening-body]');
    body.innerHTML = records.map(function (record) {
      var synthesis = Synthesis.normalizeSynthesis(record);
      return '<tr data-record-id="' + escapeHTML(record.id) + '">' +
        '<td data-label="题录"><strong class="evidence-title">' + escapeHTML(record.title || '未命名记录') + '</strong><small>' + escapeHTML(record.authors || '作者待补') + ' · ' + escapeHTML(record.year || '年份待补') + '</small></td>' +
        '<td data-label="筛选决定"><select data-screen-field="screeningDecision" aria-label="' + escapeHTML(record.title || '未命名记录') + '的筛选决定">' + Synthesis.DECISIONS.map(function (value) { return screeningOption(value, synthesis.screeningDecision); }).join('') + '</select></td>' +
        '<td data-label="核心发现"><textarea data-screen-field="coreFinding" rows="3" aria-label="' + escapeHTML(record.title || '未命名记录') + '的核心发现" placeholder="回到原文摘记，不自动生成">' + escapeHTML(synthesis.coreFinding) + '</textarea></td>' +
        '<td data-label="证据等级"><select data-screen-field="evidenceGrade" aria-label="' + escapeHTML(record.title || '未命名记录') + '的证据等级">' + Synthesis.EVIDENCE_GRADES.map(function (value) { return screeningOption(value, synthesis.evidenceGrade); }).join('') + '</select></td>' +
        '<td data-label="主题标签"><input data-screen-field="themeTags" aria-label="' + escapeHTML(record.title || '未命名记录') + '的主题标签" value="' + escapeHTML(synthesis.themeTags.join('，')) + '" placeholder="逗号分隔"></td>' +
        '<td data-label="排除理由"><textarea data-screen-field="exclusionReason" rows="3" aria-label="' + escapeHTML(record.title || '未命名记录') + '的排除理由" placeholder="排除时填写">' + escapeHTML(synthesis.exclusionReason) + '</textarea></td>' +
        '</tr>';
    }).join('');
    var empty = $('[data-screening-empty]');
    empty.hidden = records.length > 0;
    body.hidden = records.length === 0;
    $('[data-screening-visible]').textContent = '显示 ' + records.length + ' / ' + official.length + ' 篇';
    renderGapSummary();
  }

  function renderQuality() {
    var issues = analyzeQuality();
    var duplicates = issues.filter(function (i) { return i.type === 'duplicate'; });
    var missing = issues.filter(function (i) { return i.type === 'missing'; });
    var source = issues.filter(function (i) { return i.type === 'source'; });
    $('[data-duplicate-count]').textContent = duplicates.length;
    $('[data-missing-count]').textContent = missing.length;
    $('[data-source-count]').textContent = source.length;
    $$('[data-issue-count]').forEach(function (el) { el.textContent = issues.length; });
    var current = issueFilter === 'all' ? issues : issues.filter(function (i) { return i.type === issueFilter; });
    $('[data-issue-title]').textContent = issueFilter === 'duplicate' ? '疑似重复' : issueFilter === 'missing' ? '字段缺失' : issueFilter === 'source' ? '来源待核' : '全部问题';
    var container = $('[data-issue-list]');
    var hasRecords = formalRecords().length > 0;
    if (!current.length) {
      container.innerHTML = '<div class="issue-empty"><strong>' + (hasRecords ? '当前范围未发现问题' : '还没有可以检查的记录') + '</strong><span>' + (hasRecords ? '仍建议在交付前抽查原始文献。' : '添加文献后会自动生成问题清单。') + '</span></div>';
    } else {
      container.innerHTML = current.map(function (issue) {
        return '<div class="issue-item"><span><svg><use href="#i-alert"/></svg></span><div><strong>' + escapeHTML(issue.title) + '</strong><small>' + escapeHTML(issue.message) + '</small></div><button type="button" data-edit-record="' + escapeHTML(issue.id) + '">处理</button></div>';
      }).join('');
    }
    Object.keys(state.finalChecks).forEach(function (key) {
      var input = $('[data-final-check="' + key + '"]');
      if (input) input.checked = Boolean(state.finalChecks[key]);
    });
    var checked = Object.keys(state.finalChecks).filter(function (key) { return state.finalChecks[key]; }).length;
    $('[data-checklist-status]').textContent = checked + ' / 4';
    renderReadiness(issues);
  }

  function renderReadiness(issues) {
    issues = issues || analyzeQuality();
    var score = calculateReadiness(issues);
    $('[data-readiness-score]').textContent = score;
    $('[data-readiness-ring]').style.setProperty('--score', score * 3.6 + 'deg');
    var title = score >= 90 ? '已接近交付' : score >= 60 ? '继续处理问题清单' : score > 0 ? '先完善目录与核验' : '先完成研究边界';
    var copy = score >= 90 ? '基础质量已达标，请抽查原文并确认最终文件命名。' : '工作台会根据数量、字段完整性、核验状态和终检清单计算准备度。';
    $('[data-readiness-title]').textContent = title;
    $('[data-readiness-copy]').textContent = copy;
    $('[data-report-status]').textContent = issues.length ? issues.length + ' 个问题将写入报告' : (formalRecords().length ? '基础检查通过' : '等待生成');
  }

  function renderSearchLogs() {
    var container = $('[data-search-log]');
    if (!state.searchLogs.length) {
      container.innerHTML = '<div class="log-empty">还没有检索记录。执行查询后，将平台与结果数量记在这里。</div>';
      return;
    }
    container.innerHTML = state.searchLogs.slice().reverse().slice(0, 8).map(function (log) {
      return '<div class="log-row"><span>' + formatTime(log.createdAt) + '</span><strong>' + escapeHTML(log.platform || '综合检索') + ' · ' + escapeHTML(log.note || '未填写结果数') + '</strong><small>' + escapeHTML(log.language || '中英') + '</small></div>';
    }).join('');
  }

  function fillForms() {
    var scope = $('[data-scope-form]');
    if (!dirtyForms.has(scope)) {
      ['title', 'topic', 'deadline', 'years', 'include', 'exclude', 'researchStage', 'deliveryGoal', 'weeklyHours'].forEach(function (key) { if (scope.elements[key]) scope.elements[key].value = state.project[key] || ''; });
      scope.elements.cnTarget.value = state.project.cnTarget;
      scope.elements.enTarget.value = state.project.enTarget;
      $$('input[name="types"]', scope).forEach(function (input) { input.checked = state.project.types.indexOf(input.value) >= 0; });
    }
    var query = $('[data-query-form]');
    if (!dirtyForms.has(query)) Object.keys(state.concepts).forEach(function (key) { if (query.elements[key]) query.elements[key].value = state.concepts[key]; });
    $('[data-query-output="cn"]').textContent = state.queries.cn;
    $('[data-query-output="en"]').textContent = state.queries.en;
  }

  function renderProjectMeta() {
    $$('[data-project-title]').forEach(function (el) { el.textContent = state.project.title || '新研究项目'; });
    $('[data-deadline-label]').textContent = formatDate(state.project.deadline);
    var switcher = $('[data-project-switcher]');
    switcher.innerHTML = workspace.projects.map(function (project) {
      var title = project.project.title || '新研究项目';
      return '<option value="' + escapeHTML(project.id) + '"' + (project.id === state.id ? ' selected' : '') + '>' + escapeHTML(title) + '</option>';
    }).join('');
    switcher.value = state.id;
    renderAccount();
  }

  function renderAll() {
    renderProjectMeta();
    renderMetrics();
    renderWorkflow();
    renderAdvice();
    renderJourney();
    renderStory();
    renderDecisionStrategy();
    renderRecent();
    renderLibrary();
    renderPriorityQueue();
    renderScreening();
    renderQuality();
    renderSearchLogs();
    fillForms();
  }

  function viewLabel(view) {
    return { overview: '任务总览', scope: '研究边界', queries: '检索式', library: '文献目录', screening: '筛选与综合', quality: '质量检查', delivery: '交付中心' }[view] || '任务总览';
  }
  function showView(view) {
    if (!$('[data-view="' + view + '"]')) view = 'overview';
    $$('.view').forEach(function (section) { section.classList.toggle('is-active', section.getAttribute('data-view') === view); });
    $$('[data-nav]').forEach(function (item) { item.classList.toggle('is-active', item.getAttribute('data-nav') === view); });
    $('[data-view-kicker]').textContent = viewLabel(view);
    $('#sidebar').classList.remove('is-open');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#' + view);
  }

  function toast(message, type) {
    var region = $('[data-toast-region]');
    while (region.children.length >= 3) region.firstElementChild.remove();
    var element = document.createElement('div');
    element.className = 'toast' + (type === 'error' ? ' error' : '');
    element.innerHTML = '<svg><use href="#' + (type === 'error' ? 'i-alert' : 'i-check') + '"/></svg><span>' + escapeHTML(message) + '</span>';
    region.appendChild(element);
    window.setTimeout(function () {
      element.style.opacity = '0';
      element.style.transform = 'translateY(8px)';
      window.setTimeout(function () { element.remove(); }, 180);
    }, type === 'error' ? 5200 : 3200);
  }

  function openBackdrop() {
    if (!$('.modal.is-visible')) dialogReturnFocus = document.activeElement;
    var backdrop = $('[data-modal-backdrop]');
    backdrop.hidden = false;
    requestAnimationFrame(function () { backdrop.classList.add('is-visible'); });
    document.body.style.overflow = 'hidden';
  }
  function closeBackdropIfClear() {
    if ($('.modal.is-visible')) return;
    var backdrop = $('[data-modal-backdrop]');
    backdrop.classList.remove('is-visible');
    window.setTimeout(function () { backdrop.hidden = true; }, 180);
    document.body.style.overflow = '';
    if (dialogReturnFocus && dialogReturnFocus.isConnected && typeof dialogReturnFocus.focus === 'function') dialogReturnFocus.focus();
    dialogReturnFocus = null;
  }

  function openRecordModal(id) {
    var modal = $('[data-record-modal]');
    var form = $('[data-record-form]');
    form.reset();
    clearFormDirty(form);
    form.elements.id.value = '';
    form.elements.language.value = '中文';
    form.elements.status.value = '待核验';
    var record = id ? state.records.filter(function (item) { return item.id === id; })[0] : null;
    $('#record-modal-title').textContent = record ? '编辑文献' : '添加文献';
    if (record) Object.keys(record).forEach(function (key) { if (form.elements[key]) form.elements[key].value = record[key]; });
    openBackdrop();
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-visible'); });
    window.setTimeout(function () { form.elements.title.focus(); }, 180);
  }
  function closeRecordModal() {
    var modal = $('[data-record-modal]');
    var form = $('[data-record-form]');
    if (!confirmDiscardForm(form, '这篇文献有未保存更改。仍要关闭吗？')) return false;
    modal.classList.remove('is-visible');
    window.setTimeout(function () { modal.hidden = true; closeBackdropIfClear(); }, 180);
    return true;
  }

  function openConfirm(copy, action) {
    var modal = $('[data-confirm-modal]');
    $('[data-confirm-copy]').textContent = copy;
    pendingDelete = action;
    openBackdrop();
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-visible'); });
    window.setTimeout(function () { $('[data-confirm-delete]').focus(); }, 160);
  }
  function closeConfirm() {
    var modal = $('[data-confirm-modal]');
    modal.classList.remove('is-visible');
    pendingDelete = null;
    window.setTimeout(function () { modal.hidden = true; closeBackdropIfClear(); }, 180);
  }

  function openDialog(selector, focusSelector) {
    var modal = $(selector);
    openBackdrop();
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-visible'); });
    window.setTimeout(function () {
      var target = focusSelector ? $(focusSelector, modal) : $('input, textarea, button', modal);
      if (target) target.focus();
    }, 180);
  }

  function closeDialog(modal) {
    if (!modal) return;
    var projectForm = $('[data-project-form]', modal);
    if (projectForm && !confirmDiscardForm(projectForm, '新项目信息尚未提交。仍要关闭吗？')) return false;
    modal.classList.remove('is-visible');
    window.setTimeout(function () {
      modal.hidden = true;
      closeBackdropIfClear();
    }, 180);
    if (modal.matches('[data-export-confirm-modal]')) pendingExportType = '';
    return true;
  }

  function closeUtilityDialogs() {
    $$('.compact-modal.is-visible, .auth-modal.is-visible').forEach(closeDialog);
  }

  function openProjectDialog() {
    var form = $('[data-project-form]');
    form.reset();
    clearFormDirty(form);
    openDialog('[data-project-modal]', '[name="title"]');
  }

  function openSearchLogDialog() {
    var form = $('[data-search-log-form]');
    form.reset();
    var policy = Decision.buildPolicy(currentProfile(), state.project, counts(), state.project.reviewFeedback);
    form.elements.language.value = policy.languageFocus === '中英并行' ? '中英' : policy.languageFocus;
    $('[data-search-log-context]').innerHTML = '<span>本轮策略</span><strong>' + escapeHTML(policy.headline) + '</strong><p>' + escapeHTML(policy.tradeoff) + '</p>';
    openDialog('[data-search-log-modal]', '#search-log-platform');
  }

  function saveSearchLog(event) {
    event.preventDefault();
    var data = formDataObject(event.currentTarget);
    if (!data.platform || !data.note) {
      if (!data.platform) event.currentTarget.elements.platform.focus();
      else event.currentTarget.elements.note.focus();
      toast('请补齐检索平台和结果说明。', 'error');
      return;
    }
    state.searchLogs.push(normalizeSearchLog({ id: uid(), platform: data.platform, note: data.note, language: data.language, createdAt: nowISO() }));
    saveState('检索记录已保存');
    closeDialog($('[data-search-log-modal]'));
    renderAll();
    toast('本次检索已记录');
  }

  function switchProject(projectId) {
    if (!projectId || projectId === state.id) return;
    if (!confirmDiscardAll('当前表单有未提交更改。仍要切换项目吗？')) {
      $('[data-project-switcher]').value = state.id;
      return;
    }
    saveState();
    workspace = Workspace.selectProject(workspace, projectId);
    state = Workspace.getActiveProject(workspace);
    selectedIds.clear();
    localStorage.setItem(scopedWorkspaceKey(), JSON.stringify(workspace));
    renderAll();
    showView(projectHasScope() ? 'overview' : 'scope');
    toast('已切换研究项目');
  }

  function createProject(event) {
    event.preventDefault();
    var data = formDataObject(event.currentTarget);
    if (!safeText(data.title).trim()) {
      event.currentTarget.elements.title.classList.add('is-error');
      toast('请输入项目名称。', 'error');
      return;
    }
    clearFormDirty(event.currentTarget);
    saveState();
    var project = Workspace.createProjectState({ title: data.title, topic: data.topic });
    workspace = Workspace.addProject(workspace, project);
    state = Workspace.getActiveProject(workspace);
    selectedIds.clear();
    localStorage.setItem(scopedWorkspaceKey(), JSON.stringify(workspace));
    closeDialog($('[data-project-modal]'));
    renderAll();
    showView('scope');
    toast('研究项目已创建');
  }

  function loadAccounts() {
    try {
      var accounts = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '[]');
      return Array.isArray(accounts) ? accounts : [];
    } catch (error) {
      return [];
    }
  }

  function currentAccount() {
    var id = activeAccountId();
    return id === 'guest' ? null : loadAccounts().find(function (account) { return account.id === id; }) || null;
  }

  function renderAccount() {
    var account = currentAccount();
    $('[data-auth-guest]').hidden = Boolean(account);
    $('[data-auth-profile]').hidden = !account;
    if (!account) return;
    $('[data-auth-name]').textContent = account.displayName;
    $('[data-auth-avatar]').textContent = account.displayName.slice(0, 1).toUpperCase();
  }

  function setAuthMode(mode) {
    var isLogin = mode !== 'register';
    $('[data-login-form]').hidden = !isLogin;
    $('[data-register-form]').hidden = isLogin;
    $('#auth-modal-title').textContent = isLogin ? '登录文径' : '创建账户';
    $$('[data-auth-tab]').forEach(function (button) {
      var active = button.getAttribute('data-auth-tab') === (isLogin ? 'login' : 'register');
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function openAuthDialog(mode) {
    setAuthMode(mode);
    $('[data-login-form]').reset();
    $('[data-register-form]').reset();
    openDialog('[data-auth-modal]', mode === 'register' ? '#register-name' : '#login-email');
  }

  function activateAccount(account, keepCurrentWorkspace) {
    saveState();
    dirtyForms.clear();
    renderSaveStatus();
    sessionStorage.setItem(SESSION_ACCOUNT_KEY, account.id);
    if (keepCurrentWorkspace) {
      localStorage.setItem(scopedWorkspaceKey(), JSON.stringify(workspace));
    } else {
      workspace = loadWorkspace();
      state = Workspace.getActiveProject(workspace);
    }
    selectedIds.clear();
    closeDialog($('[data-auth-modal]'));
    renderAll();
    showView(projectHasScope() ? 'overview' : 'scope');
  }

  async function registerAccount(event) {
    event.preventDefault();
    if (!confirmPendingTransition('当前研究表单有未提交更改。仍要创建并切换到账户空间吗？')) return;
    var data = formDataObject(event.currentTarget);
    var accounts = loadAccounts();
    var email = Account.normalizeEmail(data.email);
    if (accounts.some(function (account) { return account.email === email; })) {
      toast('该邮箱已注册，请直接登录。', 'error');
      setAuthMode('login');
      $('[data-login-form]').elements.email.value = email;
      return;
    }
    var submit = $('button[type="submit"]', event.currentTarget);
    submit.disabled = true;
    submit.textContent = '正在创建…';
    try {
      var account = await Account.createAccount(data);
      accounts.push(account);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
      activateAccount(account, true);
      toast('账户已创建');
    } catch (error) {
      toast(error.message || '账户创建失败。', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = '创建账户';
    }
  }

  async function loginAccount(event) {
    event.preventDefault();
    if (!confirmPendingTransition('当前研究表单有未提交更改。仍要切换到账户空间吗？')) return;
    var data = formDataObject(event.currentTarget);
    var account = loadAccounts().find(function (item) { return item.email === Account.normalizeEmail(data.email); });
    var submit = $('button[type="submit"]', event.currentTarget);
    submit.disabled = true;
    submit.textContent = '正在登录…';
    try {
      if (!account || !(await Account.verifyPassword(account, data.password))) throw new Error('邮箱或密码不正确。');
      activateAccount(account, false);
      toast('欢迎回来，' + account.displayName);
    } catch (error) {
      toast(error.message || '登录失败。', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = '登录';
    }
  }

  function logoutAccount() {
    if (!confirmDiscardAll('当前研究表单有未提交更改。仍要退出账户吗？')) return;
    saveState();
    sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
    workspace = loadWorkspace();
    state = Workspace.getActiveProject(workspace);
    selectedIds.clear();
    renderAll();
    showView(projectHasScope() ? 'overview' : 'scope');
    toast('已退出账户');
  }

  function formDataObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = safeText(value).trim(); });
    return data;
  }

  function validateRecordForm(form) {
    var first = null;
    var message = '';
    ['title', 'abstract', 'authors'].forEach(function (key) {
      var field = form.elements[key];
      var invalid = !field.value.trim();
      field.classList.toggle('is-error', invalid);
      if (invalid && !first) {
        first = field;
        message = '请先补齐标题、摘要和作者信息。';
      }
    });
    var yearInvalid = !isValidPublicationYear(form.elements.year.value);
    form.elements.year.classList.toggle('is-error', yearInvalid);
    if (yearInvalid && !first) {
      first = form.elements.year;
      message = '年份应为 1900 到 ' + (new Date().getFullYear() + 1) + ' 之间的四位数。';
    }
    var doiInvalid = !isValidDOI(form.elements.doi.value);
    form.elements.doi.classList.toggle('is-error', doiInvalid);
    if (doiInvalid && !first) {
      first = form.elements.doi;
      message = '请输入有效 DOI，例如 10.1000/example。';
    }
    var urlInvalid = !isValidSourceUrl(form.elements.url.value);
    form.elements.url.classList.toggle('is-error', urlInvalid);
    if (urlInvalid && !first) {
      first = form.elements.url;
      message = '原文链接需使用完整的 http 或 https 地址。';
    }
    if (first) {
      first.focus();
      toast(message, 'error');
      return false;
    }
    return true;
  }

  function saveRecord(event) {
    event.preventDefault();
    var form = event.currentTarget;
    if (!validateRecordForm(form)) return;
    var data = formDataObject(form);
    var existingIndex = state.records.findIndex(function (record) { return record.id === data.id; });
    var existing = existingIndex >= 0 ? state.records[existingIndex] : null;
    if (!data.fileName) data.fileName = buildFileName(data, nextLanguageSequence(data.language, data.id));
    var record = normalizeRecord(Object.assign({}, existing || {}, data, { id: data.id || uid(), updatedAt: nowISO(), createdAt: existing ? existing.createdAt : nowISO() }));
    if (!record.title || !record.abstract || !record.authors) record.status = '待补全';
    if (existingIndex >= 0) state.records.splice(existingIndex, 1, record); else state.records.unshift(record);
    clearFormDirty(form);
    saveState();
    closeRecordModal();
    renderAll();
    toast(existing ? '文献记录已更新' : '文献已加入目录');
  }

  function cleanFilePart(value) {
    return safeText(value).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 42) || '待补';
  }
  function buildFileName(record, position) {
    var lang = record.language === '英文' ? 'EN' : 'CN';
    var firstAuthor = safeText(record.authors).split(/[;；,，]/)[0];
    return [lang, String(position || 1).padStart(3, '0'), cleanFilePart(record.year || '年份待补'), cleanFilePart(firstAuthor || '作者待补'), cleanFilePart(record.title || '题名待补')].join('-') + '.pdf';
  }
  function nextLanguageSequence(language, excludeId) {
    return state.records.filter(function (record) { return record.language === language && record.id !== excludeId; }).length + 1;
  }
  function assignMissingFileNames(records) {
    var counters = {
      '中文': state.records.filter(function (record) { return record.language === '中文'; }).length,
      '英文': state.records.filter(function (record) { return record.language === '英文'; }).length
    };
    records.forEach(function (record) {
      counters[record.language] += 1;
      if (!record.fileName) record.fileName = buildFileName(record, counters[record.language]);
    });
    return records;
  }

  function lookupDOI() {
    var form = $('[data-record-form]');
    var doi = normalizeDOI(form.elements.doi.value);
    if (!doi) { toast('请先输入 DOI。', 'error'); form.elements.doi.focus(); return; }
    if (!isValidDOI(doi)) { toast('请输入有效 DOI，例如 10.1000/example。', 'error'); form.elements.doi.focus(); return; }
    form.elements.doi.value = doi;
    form.elements.doi.classList.remove('is-error');
    markFormDirty(form);
    toast('DOI 格式有效；请继续依据原文核对题录字段');
  }

  function deleteIds(ids) {
    state.records = state.records.filter(function (record) { return ids.indexOf(record.id) < 0; });
    ids.forEach(function (id) { selectedIds.delete(id); });
    saveState();
    renderAll();
    toast('已删除 ' + ids.length + ' 条记录');
  }

  function markSelectedVerified() {
    var blocked = 0;
    state.records.forEach(function (record) {
      if (!selectedIds.has(record.id)) return;
      if (!record.title || !record.abstract || !record.authors || (!record.doi && !record.url) ||
        !isValidPublicationYear(record.year) || !isValidDOI(record.doi) || !isValidSourceUrl(record.url)) { blocked += 1; return; }
      record.status = '已核验';
      record.updatedAt = nowISO();
    });
    selectedIds.clear();
    saveState();
    renderAll();
    if (blocked) toast(blocked + ' 条记录因字段或来源缺失未能标记为已核验', 'error'); else toast('所选记录已标记为已核验');
  }

  function copyText(text, message) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(message || '已复制'); }).catch(function () { fallbackCopy(text, message); });
    } else fallbackCopy(text, message);
  }
  function fallbackCopy(text, message) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast(message || '已复制');
  }

  function csvEscape(value) {
    var text = safeText(value);
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function downloadFile(name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }
  function exportCSV() {
    var headers = ['序号', '语言', '文献标题', '摘要', '作者', '作者单位', '发表年份', '文献类型', '期刊/会议/来源', '关键词', 'DOI', '原文链接', 'PDF文件名', '下载状态', '检索来源', '备注', '筛选决定', '排除理由', '核心发现', '证据等级', '主题标签'];
    var rows = formalRecords().map(function (record, index) {
      return [index + 1, record.language, record.title, record.abstract, record.authors, record.affiliation, record.year, record.type, record.source, record.keywords, record.doi, record.url, record.fileName, record.status, record.database, record.notes, record.screeningDecision, record.exclusionReason, record.coreFinding, record.evidenceGrade, record.themeTags.join('；')];
    });
    var csv = '\ufeff' + [headers].concat(rows).map(function (row) { return row.map(csvEscape).join(','); }).join('\r\n');
    downloadFile('文径-文献目录-' + localDateStamp() + '.csv', csv, 'text/csv;charset=utf-8');
    toast('文献目录 CSV 已导出');
  }
  function exportJSON() {
    var snapshot = JSON.parse(JSON.stringify(state));
    snapshot.records = formalRecords();
    downloadFile('文径-完整备份-' + localDateStamp() + '.json', JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
    toast('完整项目备份已导出');
  }
  function exportSynthesis() {
    var content = [
      '# 研究交付画像',
      '',
      Experience.profileLines(currentProfile()).map(function (line) { return '- ' + line; }).join('\n'),
      Story.feedbackLines(state.project.reviewFeedback).map(function (line) { return '- ' + line; }).join('\n'),
      '',
      Synthesis.buildMarkdownSynthesis(state.project, formalRecords())
    ].join('\n');
    downloadFile('文径-证据综合-' + localDateStamp() + '.md', content, 'text/markdown;charset=utf-8');
    toast('Markdown 证据综合已导出');
  }
  function bibEscape(value) { return safeText(value).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim(); }
  function bibKey(record, index) {
    var author = safeText(record.authors).split(/[;；,，]/)[0].split(/\s+/).pop() || 'record';
    return (author + (record.year || 'nd') + (index + 1)).replace(/[^a-zA-Z0-9_-]/g, '') || ('record' + (index + 1));
  }
  function exportBibTeX() {
    var content = formalRecords().map(function (record, index) {
      var type = record.type === '会议论文' ? 'inproceedings' : record.type === '研究报告' ? 'techreport' : record.type === '学位论文' ? 'misc' : 'article';
      var venueField = type === 'inproceedings' ? 'booktitle' : type === 'article' ? 'journal' : type === 'techreport' ? 'institution' : 'howpublished';
      var fields = [
        ['title', record.title], ['author', safeText(record.authors).split(/[;；]/).join(' and ')], ['year', record.year],
        [venueField, record.source], ['type', type === 'misc' ? '学位论文' : ''],
        ['abstract', record.abstract], ['keywords', record.keywords], ['doi', normalizeDOI(record.doi)], ['url', record.url], ['note', record.notes]
      ].filter(function (pair) { return pair[1]; });
      return '@' + type + '{' + bibKey(record, index) + ',\n' + fields.map(function (pair) { return '  ' + pair[0] + ' = {' + bibEscape(pair[1]) + '}'; }).join(',\n') + '\n}';
    }).join('\n\n');
    downloadFile('文径-引用库-' + localDateStamp() + '.bib', content, 'application/x-bibtex;charset=utf-8');
    toast('BibTeX 引用库已导出');
  }
  function qualityReport() {
    var c = counts();
    var issues = analyzeQuality();
    var score = calculateReadiness(issues);
    var lines = [
      '文径｜文献整理质量检查报告',
      '',
      '任务：' + state.project.title,
      '研究主题：' + state.project.topic,
      Experience.profileLines(currentProfile()).join('\n'),
      Story.feedbackLines(state.project.reviewFeedback).join('\n'),
      '生成时间：' + new Date().toLocaleString('zh-CN'),
      '交付日期：' + formatDate(state.project.deadline),
      '',
      '一、完成进度',
      '- 总计：' + c.total + ' / ' + (Number(state.project.cnTarget) + Number(state.project.enTarget)),
      '- 中文：' + c.cn + ' / ' + state.project.cnTarget,
      '- 英文：' + c.en + ' / ' + state.project.enTarget,
      '- 已核验：' + c.verified,
      '- 交付准备度：' + score + '%',
      '',
      '二、质量问题'
    ];
    if (!issues.length) lines.push('- 基础检查未发现重复、字段缺失或来源缺失。');
    else issues.forEach(function (issue, index) { lines.push((index + 1) + '. [' + issue.type + '] ' + issue.title + '｜' + issue.message); });
    lines.push('', '三、终检清单');
    var checkLabels = { quantity: '数量与语言', mapping: '目录与文件', metadata: '核心字段', trace: '来源可追溯' };
    Object.keys(checkLabels).forEach(function (key) { lines.push('- [' + (state.finalChecks[key] ? 'x' : ' ') + '] ' + checkLabels[key]); });
    lines.push('', '四、检索留痕');
    if (!state.searchLogs.length) lines.push('- 尚无检索记录。');
    else state.searchLogs.forEach(function (log) { lines.push('- ' + formatTime(log.createdAt) + '｜' + log.platform + '｜' + log.note); });
    return lines.join('\n');
  }
  function exportReport() {
    downloadFile('文径-质量检查报告-' + localDateStamp() + '.txt', qualityReport(), 'text/plain;charset=utf-8');
    toast('质量检查报告已导出');
  }

  function runExport(type) {
    if (type === 'csv') exportCSV();
    else if (type === 'json') exportJSON();
    else if (type === 'bibtex') exportBibTeX();
    else if (type === 'synthesis') exportSynthesis();
    else exportReport();
  }

  function requestExport(type) {
    var labels = { csv: '文献目录 CSV', json: '完整项目备份 JSON', bibtex: 'BibTeX 引用库', synthesis: '证据综合 Markdown', report: '质量检查报告' };
    var c = counts();
    var issues = analyzeQuality();
    var screening = Synthesis.summarizeScreening(formalRecords());
    var checked = Object.keys(state.finalChecks).filter(function (key) { return state.finalChecks[key]; }).length;
    pendingExportType = labels[type] ? type : 'report';
    $('[data-export-confirm-summary]').innerHTML = '<span>即将生成</span><h3>' + escapeHTML(labels[pendingExportType]) + '</h3><div class="export-facts">' +
      '<p><b>' + c.total + '</b><small>题录记录</small></p>' +
      '<p><b>' + screening.included + '</b><small>人工纳入</small></p>' +
      '<p><b>' + c.verified + '</b><small>原文核验</small></p>' +
      '<p><b>' + issues.length + '</b><small>质量问题</small></p>' +
      '</div><p class="export-check-copy">终检清单已确认 ' + checked + ' / 4 项。文件会保留当前研究画像、上一轮反馈和判断留痕。</p>';
    $('[data-export-human-check]').checked = false;
    $('[data-confirm-export]').disabled = true;
    openDialog('[data-export-confirm-modal]', '[data-export-human-check]');
  }

  function confirmExport() {
    if (!$('[data-export-human-check]').checked || !pendingExportType) return;
    var type = pendingExportType;
    closeDialog($('[data-export-confirm-modal]'));
    window.setTimeout(function () { runExport(type); }, 190);
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (item) { return item.some(function (value) { return value.trim(); }); });
  }
  function importCSV(text) {
    var rows = parseCSV(text.replace(/^\ufeff/, ''));
    if (rows.length < 2) throw new Error('CSV 中没有可导入的记录。');
    var headers = rows[0].map(function (header) { return header.trim(); });
    var aliases = {
      language: ['语言'], title: ['文献标题', '标题', 'title'], abstract: ['摘要', 'abstract'], authors: ['作者', 'authors'], affiliation: ['作者单位', '单位'], year: ['发表年份', '年份', 'year'], type: ['文献类型', '类型'], source: ['期刊/会议/来源', '来源', '期刊', '期刊/会议'], keywords: ['关键词'], doi: ['DOI', 'doi'], url: ['原文链接', '链接', 'url'], fileName: ['PDF文件名', 'PDF 文件名', '文件名'], status: ['下载状态', '核验状态', '状态'], database: ['检索来源', '数据库'], notes: ['备注'], screeningDecision: ['筛选决定'], exclusionReason: ['排除理由'], coreFinding: ['核心发现'], evidenceGrade: ['证据等级'], themeTags: ['主题标签']
    };
    var indexMap = {};
    Object.keys(aliases).forEach(function (key) {
      indexMap[key] = headers.findIndex(function (header) { return aliases[key].indexOf(header) >= 0; });
    });
    if (indexMap.title < 0) throw new Error('CSV 缺少“文献标题”列。');
    var imported = rows.slice(1).map(function (cells) {
      var record = {};
      Object.keys(indexMap).forEach(function (key) { if (indexMap[key] >= 0) record[key] = cells[indexMap[key]] || ''; });
      return normalizeRecord(record);
    }).filter(function (record) { return record.title; });
    assignMissingFileNames(imported);
    state.records = state.records.concat(imported);
    return imported.length;
  }
  function importBibTeX(text) {
    var entries = [];
    var pattern = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)\n\s*\}/g;
    var match;
    while ((match = pattern.exec(text))) {
      var fields = {};
      var body = match[3];
      var fieldPattern = /(\w+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)")\s*,?/g;
      var field;
      while ((field = fieldPattern.exec(body))) fields[field[1].toLowerCase()] = (field[2] || field[3] || '').replace(/\s+/g, ' ').trim();
      entries.push(normalizeRecord({
        language: /[\u3400-\u9fff]/.test(fields.title || '') ? '中文' : '英文', title: fields.title, abstract: fields.abstract,
        authors: safeText(fields.author).split(/\s+and\s+/i).join('; '), year: fields.year, type: /inproceedings/i.test(match[1]) ? '会议论文' : /techreport/i.test(match[1]) ? '研究报告' : '期刊论文',
        source: fields.journal || fields.booktitle || fields.institution || fields.publisher, doi: fields.doi, url: fields.url,
        keywords: fields.keywords, notes: fields.note, database: 'BibTeX 导入', status: fields.title && fields.abstract && fields.author ? '待核验' : '待补全'
      }));
    }
    if (!entries.length) throw new Error('BibTeX 中没有可识别的题录。');
    assignMissingFileNames(entries);
    state.records = state.records.concat(entries);
    return entries.length;
  }
  function importRIS(text) {
    var blocks = text.split(/\nER\s*-\s*/i).map(function (item) { return item.trim(); }).filter(Boolean);
    var entries = blocks.map(function (block) {
      var data = {};
      block.split(/\r?\n/).forEach(function (line) {
        var match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
        if (!match) return;
        data[match[1]] = data[match[1]] || [];
        data[match[1]].push(match[2].trim());
      });
      var title = (data.TI || data.T1 || [])[0] || '';
      return normalizeRecord({
        language: /[\u3400-\u9fff]/.test(title) ? '中文' : '英文', title: title, abstract: (data.AB || []).join(' '),
        authors: (data.AU || data.A1 || []).join('; '), year: ((data.PY || data.Y1 || [])[0] || '').slice(0, 4),
        type: ((data.TY || [])[0] || '').match(/CONF|CPAPER/i) ? '会议论文' : '期刊论文', source: (data.JO || data.JF || data.T2 || [])[0] || '',
        doi: (data.DO || [])[0] || '', url: (data.UR || [])[0] || '', keywords: (data.KW || []).join(', '), notes: (data.N1 || []).join(' '),
        database: 'RIS 导入', status: title && (data.AB || []).length && (data.AU || data.A1 || []).length ? '待核验' : '待补全'
      });
    }).filter(function (record) { return record.title; });
    if (!entries.length) throw new Error('RIS 中没有可识别的题录。');
    assignMissingFileNames(entries);
    state.records = state.records.concat(entries);
    return entries.length;
  }
  function handleImport(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        if (/\.json$/i.test(file.name)) {
          var parsed = JSON.parse(reader.result);
          if (Array.isArray(parsed)) {
            var jsonRecords = normalizeRecordList(parsed, state.records.map(function (record) { return record.id; }));
            assignMissingFileNames(jsonRecords);
            state.records = state.records.concat(jsonRecords);
          }
          else if (parsed.records && Array.isArray(parsed.records)) {
            var incoming = parsed;
            state = Workspace.normalizeProject(incoming);
            state.records = normalizeRecordList(incoming.records);
            state.searchLogs = Array.isArray(incoming.searchLogs) ? incoming.searchLogs.map(normalizeSearchLog) : [];
            state.updatedAt = nowISO();
          } else throw new Error('JSON 不包含文献记录。');
          toast('项目备份已导入');
        } else if (/\.(bib|bibtex)$/i.test(file.name)) {
          var bibCount = importBibTeX(reader.result);
          toast('已从 BibTeX 导入 ' + bibCount + ' 条记录');
        } else if (/\.ris$/i.test(file.name)) {
          var risCount = importRIS(reader.result);
          toast('已从 RIS 导入 ' + risCount + ' 条记录');
        } else {
          var count = importCSV(reader.result);
          toast('已从 CSV 导入 ' + count + ' 条记录');
        }
        saveState();
        renderAll();
        showView('library');
      } catch (error) {
        toast(error.message || '文件无法导入，请检查格式。', 'error');
      }
    };
    reader.onerror = function () { toast('文件读取失败，请重新选择。', 'error'); };
    reader.readAsText(file, 'utf-8');
  }

  function manifestText() {
    return 'PDF 文件名：语言-序号-年份-第一作者-题名.pdf\n目录字段：序号｜语言｜标题｜摘要｜作者｜作者单位｜年份｜来源｜DOI｜原文链接｜PDF文件名｜状态｜检索来源｜备注｜筛选决定｜排除理由｜核心发现｜证据等级｜主题标签';
  }

  function updateScreeningField(field) {
    var row = field && field.closest('[data-record-id]');
    if (!field || !row) return false;
    var record = state.records.filter(function (item) { return item.id === row.getAttribute('data-record-id'); })[0];
    if (!record) return false;
    var key = field.getAttribute('data-screen-field');
    if (['screeningDecision', 'coreFinding', 'evidenceGrade', 'themeTags', 'exclusionReason'].indexOf(key) < 0) return false;
    record[key] = key === 'themeTags' ? Synthesis.splitThemeTags(field.value) : field.value;
    Object.assign(record, Synthesis.normalizeSynthesis(record));
    record.updatedAt = nowISO();
    return true;
  }

  function flushScreeningSave() {
    if (!screeningSaveTimer) return;
    window.clearTimeout(screeningSaveTimer);
    screeningSaveTimer = null;
    renderWorkflow();
    renderAdvice();
    renderGapSummary();
  }

  function queueScreeningSave(field, immediate) {
    if (!updateScreeningField(field)) return;
    if (screeningSaveTimer) window.clearTimeout(screeningSaveTimer);
    screeningSaveTimer = null;
    var status = $('[data-save-status]');
    if (status) status.textContent = '正在保存…';
    if (immediate) {
      saveState('筛选信息已保存');
      renderScreening();
      renderWorkflow();
      renderAdvice();
      return;
    }
    saveState('筛选信息已保存');
    screeningSaveTimer = window.setTimeout(flushScreeningSave, 240);
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      var nav = event.target.closest('[data-nav]');
      if (nav) { event.preventDefault(); showView(nav.getAttribute('data-nav')); return; }
      var storyChapter = event.target.closest('[data-story-chapter]');
      if (storyChapter) {
        activeStoryChapterId = storyChapter.getAttribute('data-story-chapter');
        activeStorySceneId = '';
        renderStory();
        return;
      }
      var storyScene = event.target.closest('[data-story-scene]');
      if (storyScene) {
        activeStorySceneId = storyScene.getAttribute('data-story-scene');
        var selectedScene = Story.SCENES.filter(function (item) { return item.id === activeStorySceneId; })[0];
        if (selectedScene) activeStoryChapterId = selectedScene.chapter;
        renderStory();
        return;
      }
      if (event.target.closest('[data-story-prev], [data-story-next]')) {
        var index = Story.SCENES.findIndex(function (item) { return item.id === activeStorySceneId; });
        var direction = event.target.closest('[data-story-prev]') ? -1 : 1;
        var nextIndex = (index + direction + Story.SCENES.length) % Story.SCENES.length;
        activeStorySceneId = Story.SCENES[nextIndex].id;
        activeStoryChapterId = Story.SCENES[nextIndex].chapter;
        renderStory();
        return;
      }
      var storyAction = event.target.closest('[data-story-next-action]');
      if (storyAction) { showView(storyAction.getAttribute('data-target-view')); return; }
      if (event.target.closest('[data-menu]')) { $('#sidebar').classList.toggle('is-open'); return; }
      if (event.target.closest('[data-create-project]')) { openProjectDialog(); return; }
      if (event.target.closest('[data-auth-login]')) { openAuthDialog('login'); return; }
      if (event.target.closest('[data-auth-register]')) { openAuthDialog('register'); return; }
      if (event.target.closest('[data-auth-logout]')) { logoutAccount(); return; }
      var authTab = event.target.closest('[data-auth-tab]');
      if (authTab) { setAuthMode(authTab.getAttribute('data-auth-tab')); return; }
      if (event.target.closest('[data-close-dialog]')) { closeUtilityDialogs(); return; }
      if (event.target.closest('[data-add-record]')) { openRecordModal(); return; }
      if (event.target.closest('[data-close-modal]')) { closeRecordModal(); return; }
      var edit = event.target.closest('[data-edit-record]');
      if (edit) { openRecordModal(edit.getAttribute('data-edit-record')); return; }
      var del = event.target.closest('[data-delete-record]');
      if (del) {
        var id = del.getAttribute('data-delete-record');
        openConfirm('这条文献记录将从当前浏览器中永久删除。建议先导出 JSON 备份。', function () { deleteIds([id]); });
        return;
      }
      if (event.target.closest('[data-cancel-confirm]')) { closeConfirm(); return; }
      if (event.target.closest('[data-confirm-delete]')) {
        var action = pendingDelete;
        closeConfirm();
        if (action) action();
        return;
      }
      var copyQuery = event.target.closest('[data-copy-query]');
      if (copyQuery) { copyText(state.queries[copyQuery.getAttribute('data-copy-query')], '检索式已复制'); return; }
      if (event.target.closest('[data-log-query]')) { openSearchLogDialog(); return; }
      var clear = event.target.closest('[data-clear-filters]');
      if (clear) { $('#library-search').value = ''; $('[data-library-sort]').value = 'priority'; $('[data-filter-language]').value = 'all'; $('[data-filter-status]').value = 'all'; renderLibrary(); return; }
      if (event.target.closest('[data-clear-screen-filters]')) {
        $('[data-screen-search]').value = '';
        $('[data-screen-filter-decision]').value = 'all';
        $('[data-screen-filter-grade]').value = 'all';
        $('[data-screen-filter-theme]').value = 'all';
        renderScreening();
        return;
      }
      var issueButton = event.target.closest('[data-issue-filter]');
      if (issueButton) { issueFilter = issueButton.getAttribute('data-issue-filter'); renderQuality(); $('[data-issue-list]').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (event.target.closest('[data-run-quality]')) { issueFilter = 'all'; renderQuality(); toast('质量检查已完成'); showView('quality'); return; }
      if (event.target.closest('[data-bulk-verify]')) { markSelectedVerified(); return; }
      if (event.target.closest('[data-bulk-delete]')) {
        var ids = Array.from(selectedIds);
        openConfirm('将删除所选 ' + ids.length + ' 条记录。此操作无法撤销。', function () { deleteIds(ids); });
        return;
      }
      var exportButton = event.target.closest('[data-export]');
      if (exportButton) {
        requestExport(exportButton.getAttribute('data-export'));
        return;
      }
      if (event.target.closest('[data-confirm-export]')) { confirmExport(); return; }
      if (event.target.closest('[data-doi-lookup]')) { lookupDOI(); return; }
      if (event.target.closest('[data-copy-manifest]')) { copyText(manifestText(), '文件命名与目录规范已复制'); return; }
      if (event.target.closest('[data-import-trigger]')) { $('[data-import-input]').click(); return; }
      if (event.target.closest('[data-advice-action]')) { showView(event.target.closest('[data-advice-action]').getAttribute('data-target-view')); return; }
      if (event.target.closest('[data-refresh-advice]')) { renderAdvice(); toast('任务建议已更新'); return; }
    });

    $('[data-record-form]').addEventListener('submit', saveRecord);
    $('[data-project-form]').addEventListener('submit', createProject);
    $('[data-search-log-form]').addEventListener('submit', saveSearchLog);
    $('[data-login-form]').addEventListener('submit', loginAccount);
    $('[data-register-form]').addEventListener('submit', registerAccount);
    $('[data-project-switcher]').addEventListener('change', function (event) { switchProject(event.target.value); });
    $('[data-story-feedback-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      var data = formDataObject(event.currentTarget);
      var review = Story.normalizeFeedback({ signal: data.signal, note: data.note, updatedAt: nowISO() });
      if (!review.signal) {
        event.currentTarget.elements.signal.focus();
        toast('请选择最接近本轮情况的一项。', 'error');
        return;
      }
      state.project.reviewFeedback = review;
      var move = Story.nextMove(review);
      storyProjectId = state.id;
      activeStoryChapterId = move.chapter;
      activeStorySceneId = move.sceneId;
      saveState('研究反馈已保存');
      renderAll();
      toast('下一轮路径已根据反馈更新');
    });
    $('[data-scope-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      var data = formDataObject(form);
      if (!data.title || !data.topic || !data.deadline) {
        ['title', 'topic', 'deadline'].forEach(function (key) { form.elements[key].classList.toggle('is-error', !form.elements[key].value.trim()); });
        toast('请补齐任务名称、核心主题和交付日期。', 'error');
        return;
      }
      state.project = Object.assign(state.project, data, {
        cnTarget: Math.max(0, Number(data.cnTarget || 0)),
        enTarget: Math.max(0, Number(data.enTarget || 0)),
        weeklyHours: Math.min(40, Math.max(1, Number(data.weeklyHours || 5))),
        types: $$('input[name="types"]:checked', form).map(function (input) { return input.value; })
      });
      clearFormDirty(form);
      saveState(); renderAll(); toast('研究边界已保存');
    });
    $('[data-query-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      var concepts = formDataObject(event.currentTarget);
      var hasChinese = Boolean(concepts.a || concepts.b || concepts.c);
      var hasEnglish = Boolean(concepts.aEn || concepts.bEn || concepts.cEn);
      if (!hasChinese && !hasEnglish) {
        event.currentTarget.elements.a.focus();
        toast('请先填写至少一组中文或英文概念。', 'error');
        return;
      }
      state.concepts = Object.assign(state.concepts, concepts);
      generateQueries();
      clearFormDirty(event.currentTarget);
      saveState();
      renderAll();
      toast(hasChinese && hasEnglish ? '中英文检索式已生成' : (hasChinese ? '中文检索式已生成；英文概念组为空' : '英文检索式已生成；中文概念组为空'));
    });
    $('#library-search').addEventListener('input', renderLibrary);
    $('[data-filter-language]').addEventListener('change', renderLibrary);
    $('[data-filter-status]').addEventListener('change', renderLibrary);
    $('[data-library-sort]').addEventListener('change', renderLibrary);
    $('[data-export-human-check]').addEventListener('change', function (event) { $('[data-confirm-export]').disabled = !event.target.checked; });
    $('[data-screen-search]').addEventListener('input', renderScreening);
    $('[data-screen-filter-decision]').addEventListener('change', renderScreening);
    $('[data-screen-filter-grade]').addEventListener('change', renderScreening);
    $('[data-screen-filter-theme]').addEventListener('change', renderScreening);
    $('[data-select-all]').addEventListener('change', function (event) {
      filteredRecords().forEach(function (record) { if (event.target.checked) selectedIds.add(record.id); else selectedIds.delete(record.id); });
      renderLibrary();
    });
    $('[data-library-body]').addEventListener('change', function (event) {
      var input = event.target.closest('[data-select-record]');
      if (!input) return;
      if (input.checked) selectedIds.add(input.getAttribute('data-select-record')); else selectedIds.delete(input.getAttribute('data-select-record'));
      renderLibrary();
    });
    $('[data-screening-body]').addEventListener('input', function (event) {
      var field = event.target.closest('[data-screen-field]');
      if (field) queueScreeningSave(field, false);
    });
    $('[data-screening-body]').addEventListener('change', function (event) {
      var field = event.target.closest('[data-screen-field]');
      if (field) queueScreeningSave(field, true);
    });
    $$('[data-final-check]').forEach(function (input) {
      input.addEventListener('change', function () { state.finalChecks[input.getAttribute('data-final-check')] = input.checked; saveState(); renderQuality(); });
    });
    $('[data-import-input]').addEventListener('change', function (event) { handleImport(event.target.files[0]); event.target.value = ''; });
    $('[data-modal-backdrop]').addEventListener('click', function () {
      if (!$('[data-record-modal]').hidden) closeRecordModal();
      else if (!$('[data-confirm-modal]').hidden) closeConfirm();
      else closeUtilityDialogs();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (!$('[data-record-modal]').hidden) closeRecordModal();
      else if (!$('[data-confirm-modal]').hidden) closeConfirm();
      else if ($('.compact-modal.is-visible, .auth-modal.is-visible')) closeUtilityDialogs();
      else if ($('#sidebar').classList.contains('is-open')) {
        $('#sidebar').classList.remove('is-open');
        $('[data-menu]').focus();
      }
    });
    document.addEventListener('input', function (event) {
      var form = event.target.closest('[data-scope-form], [data-query-form], [data-record-form], [data-project-form]');
      if (form) markFormDirty(form);
    });
    $$('.workflow-steps li').forEach(function (item) {
      item.addEventListener('click', function () { showView(item.getAttribute('data-step')); });
      item.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        showView(item.getAttribute('data-step'));
      });
    });
    window.addEventListener('pagehide', flushScreeningSave);
    window.addEventListener('beforeunload', function (event) {
      if (!dirtyForms.size) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  function registerServiceWorker() {
    var secureLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || secureLocalhost)) navigator.serviceWorker.register('./sw.js').catch(function () {});
  }

  fillForms();
  bindEvents();
  renderAll();
  showView(location.hash.replace('#', '') || (projectHasScope() ? 'overview' : 'scope'));
  registerServiceWorker();
})();
