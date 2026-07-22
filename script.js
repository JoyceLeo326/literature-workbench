(function () {
  'use strict';

  var STORAGE_KEY = 'litpath-workbench-v1';
  var VERSION = 2;
  var Synthesis = window.LitpathSynthesis;
  var selectedIds = new Set();
  var pendingDelete = null;
  var issueFilter = 'all';

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function uid() { return 'lit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function nowISO() { return new Date().toISOString(); }
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
    return {
      version: VERSION,
      project: {
        title: '科技创新与产业升级文献整理',
        topic: '科技创新政策、企业创新能力与产业升级之间的作用机制',
        deadline: '2026-07-19',
        years: '2015-2026',
        cnTarget: 40,
        enTarget: 20,
        include: '直接讨论科技创新、企业创新或产业升级；摘要和作者信息完整；来源可追溯；中文或英文。',
        exclude: '新闻稿、营销软文、无作者来源材料；重复发表；仅提及关键词但不回答研究问题。',
        types: ['期刊论文', '会议论文', '研究报告']
      },
      concepts: {
        a: '科技创新, 技术创新, 创新能力',
        b: '企业, 产业, 制造业',
        c: '产业升级, 高质量发展, 生产率',
        aEn: 'technological innovation, innovation capability, R&D',
        bEn: 'firm, industry, manufacturing',
        cEn: 'industrial upgrading, productivity, high-quality development'
      },
      queries: { cn: '', en: '' },
      searchLogs: [],
      records: [],
      finalChecks: { quantity: false, mapping: false, metadata: false, trace: false },
      updatedAt: nowISO()
    };
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return defaultState();
      var base = defaultState();
      return {
        version: VERSION,
        project: Object.assign(base.project, saved.project || {}),
        concepts: Object.assign(base.concepts, saved.concepts || {}),
        queries: Object.assign(base.queries, saved.queries || {}),
        searchLogs: Array.isArray(saved.searchLogs) ? saved.searchLogs : [],
        records: Array.isArray(saved.records) ? saved.records.map(normalizeRecord) : [],
        finalChecks: Object.assign(base.finalChecks, saved.finalChecks || {}),
        updatedAt: saved.updatedAt || nowISO()
      };
    } catch (error) {
      return defaultState();
    }
  }

  var state = loadState();

  function saveState(message) {
    state.updatedAt = nowISO();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    var status = $('[data-save-status]');
    if (status) {
      status.textContent = '正在保存…';
      window.setTimeout(function () { status.textContent = message || '所有更改已保存'; }, 180);
    }
  }

  function normalizeRecord(record) {
    var synthesis = Synthesis.normalizeSynthesis(record);
    return {
      id: record.id || uid(),
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

  function demoRecords() {
    return [
      normalizeRecord({ language: '中文', title: '演示记录｜科技创新政策与企业创新绩效研究', abstract: '用于演示目录字段、筛选与质量检查的中文样例摘要，不作为正式文献交付。', authors: '示例作者甲；示例作者乙', affiliation: '示例研究机构', year: '2024', type: '期刊论文', source: '演示来源', database: '知网', keywords: '科技创新, 创新绩效', fileName: 'CN-001-2024-示例作者甲-科技创新政策.pdf', status: '已核验', screeningDecision: '纳入', coreFinding: '演示摘记：用于展示核心发现字段，不代表真实研究结论。', evidenceGrade: '高', themeTags: ['创新政策', '企业绩效'], demo: true }),
      normalizeRecord({ language: '英文', title: 'Demo record | Technological innovation and productivity', abstract: 'An English demonstration abstract for testing metadata completion, filtering, and export. It is not part of a formal literature delivery.', authors: 'Example Author A; Example Author B', affiliation: 'Example Research Institute', year: '2023', type: '期刊论文', source: 'Demo Journal', doi: '10.0000/demo.2023.001', url: 'https://example.org/demo-001', database: 'Google Scholar', keywords: 'innovation, productivity', fileName: 'EN-001-2023-ExampleAuthor-TechnologicalInnovation.pdf', status: '已核验', screeningDecision: '纳入', coreFinding: 'Demo note for testing the evidence matrix; not a literature claim.', evidenceGrade: '中', themeTags: ['技术创新', '生产率'], demo: true }),
      normalizeRecord({ language: '中文', title: '演示记录｜产业升级的创新驱动机制', abstract: '该记录用于测试待核验状态和来源检查，正式使用时应替换为数据库导出的原始摘要。', authors: '示例作者丙', affiliation: '示例高校', year: '2022', type: '研究报告', source: '演示报告', url: 'https://example.org/demo-002', database: '万方', keywords: '产业升级, 创新驱动', fileName: 'CN-002-2022-示例作者丙-产业升级.pdf', status: '待核验', screeningDecision: '排除', exclusionReason: '演示用排除理由：材料类型不符合当前边界。', demo: true }),
      normalizeRecord({ language: '英文', title: 'Demo record | Innovation capability in manufacturing firms', abstract: 'This record intentionally omits a source link so that the quality module can surface a traceability issue.', authors: 'Example Author C', affiliation: '', year: '2021', type: '会议论文', source: 'Demo Conference', database: 'OpenAlex', keywords: 'innovation capability, manufacturing', fileName: 'EN-002-2021-ExampleAuthor-InnovationCapability.pdf', status: '待核验', demo: true }),
      normalizeRecord({ language: '中文', title: '演示记录｜企业研发投入与高质量发展', abstract: '', authors: '示例作者丁', affiliation: '示例高校', year: '2020', type: '期刊论文', source: '演示期刊', database: '知网', keywords: '研发投入, 高质量发展', fileName: '', status: '待补全', demo: true }),
      normalizeRecord({ language: '中文', title: '演示记录｜产业升级的创新驱动机制', abstract: '故意保留的重复题名记录，用于展示重复检测与问题定位。', authors: '示例作者戊', affiliation: '示例机构', year: '2022', type: '期刊论文', source: '另一演示来源', database: '万方', keywords: '产业升级', fileName: 'CN-003-2022-示例作者戊-产业升级.pdf', status: '待核验', demo: true })
    ];
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

  function analyzeQuality() {
    var issues = [];
    var titleMap = {};
    var doiMap = {};
    state.records.forEach(function (record) {
      var missing = [];
      ['title', 'abstract', 'authors'].forEach(function (key) { if (!record[key]) missing.push({ title: 'title', abstract: '摘要', authors: '作者' }[key]); });
      if (!record.year) missing.push('年份');
      if (!record.source) missing.push('期刊 / 来源');
      if (!record.fileName) missing.push('PDF 文件名');
      if (missing.length) issues.push({ type: 'missing', id: record.id, title: record.title || '未命名记录', message: '缺少：' + missing.join('、') });
      if (!record.doi && !record.url) issues.push({ type: 'source', id: record.id, title: record.title || '未命名记录', message: '缺少 DOI 或原文链接，来源不可直接追溯' });
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
    var cn = state.records.filter(function (record) { return record.language === '中文'; }).length;
    var en = state.records.filter(function (record) { return record.language === '英文'; }).length;
    var verified = state.records.filter(function (record) { return record.status === '已核验'; }).length;
    return { total: state.records.length, cn: cn, en: en, verified: verified };
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
    setProgress('[data-total-progress]', totalTarget ? c.total / totalTarget * 100 : 100);
    setProgress('[data-cn-progress]', cnTarget ? c.cn / cnTarget * 100 : 100);
    setProgress('[data-en-progress]', enTarget ? c.en / enTarget * 100 : 100);
    setProgress('[data-verified-progress]', c.total ? c.verified / c.total * 100 : 0);
    $('[data-total-copy]').textContent = c.total ? '已完成 ' + Math.round(c.total / Math.max(totalTarget, 1) * 100) + '%' : '尚未录入文献';
    $('[data-cn-copy]').textContent = c.cn >= cnTarget ? '中文目标已完成' : '还需 ' + Math.max(0, cnTarget - c.cn) + ' 篇';
    $('[data-en-copy]').textContent = c.en >= enTarget ? '英文目标已完成' : '还需 ' + Math.max(0, enTarget - c.en) + ' 篇';
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
    var screening = Synthesis.summarizeScreening(state.records);
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
    var screening = Synthesis.summarizeScreening(state.records);
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
    $('[data-advice-copy]').textContent = advice.copy;
    $('[data-advice-action]').setAttribute('data-target-view', advice.view);
    var issues = analyzeQuality();
    $('[data-mini-qa]').textContent = state.records.length ? (issues.length ? issues.length + ' 个问题待处理' : '基础检查通过') : '尚无记录';
    $('[data-mini-qa-copy]').textContent = state.records.length ? (issues.length ? '进入质量检查定位问题。' : '继续完成原文核验和交付清单。') : '添加文献后会自动检查。';
  }

  function renderRecent() {
    var container = $('[data-recent-list]');
    var records = state.records.slice().sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); }).slice(0, 4);
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
    return state.records.filter(function (record) {
      var haystack = [record.title, record.authors, record.keywords, record.source].join(' ').toLowerCase();
      return (!search || haystack.indexOf(search) >= 0) && (language === 'all' || record.language === language) && (status === 'all' || record.status === status);
    });
  }

  function statusClass(status) { return status === '已核验' ? 'complete' : status === '待补全' ? 'missing' : 'review'; }
  function renderLibrary() {
    var records = filteredRecords();
    var body = $('[data-library-body]');
    var empty = $('[data-library-empty]');
    body.innerHTML = records.map(function (record) {
      return '<tr class="' + (selectedIds.has(record.id) ? 'is-selected' : '') + '" data-record-id="' + record.id + '">' +
        '<td><input type="checkbox" data-select-record="' + record.id + '" aria-label="选择 ' + escapeHTML(record.title || '未命名记录') + '" ' + (selectedIds.has(record.id) ? 'checked' : '') + '></td>' +
        '<td><span class="language-badge ' + (record.language === '英文' ? 'en' : '') + '">' + record.language + '</span></td>' +
        '<td><strong class="record-title">' + escapeHTML(record.title || '未命名记录') + '</strong><small class="record-source">' + escapeHTML(record.source || '来源待补') + ' · ' + escapeHTML(record.type) + (record.demo ? ' · 演示数据' : '') + '</small></td>' +
        '<td>' + escapeHTML(record.authors || '待补') + '</td>' +
        '<td>' + escapeHTML(record.year || '—') + '</td>' +
        '<td><span class="record-status ' + statusClass(record.status) + '">' + record.status + '</span></td>' +
        '<td><div class="row-actions"><button type="button" data-edit-record="' + record.id + '" aria-label="编辑文献"><svg><use href="#i-edit"/></svg></button><button type="button" data-delete-record="' + record.id + '" aria-label="删除文献"><svg><use href="#i-trash"/></svg></button></div></td></tr>';
    }).join('');
    empty.hidden = state.records.length > 0;
    body.hidden = records.length === 0;
    if (state.records.length && !records.length) {
      empty.hidden = false;
      empty.innerHTML = '<svg><use href="#i-search"/></svg><h3>没有匹配的记录</h3><p>尝试不同关键词，或清除当前筛选条件。</p><button class="button button-secondary" type="button" data-clear-filters>清除筛选</button>';
    }
    $('[data-library-summary]').textContent = records.length === state.records.length ? state.records.length + ' 篇记录' : '显示 ' + records.length + ' / ' + state.records.length + ' 篇';
    var selectAll = $('[data-select-all]');
    var visibleIds = records.map(function (record) { return record.id; });
    selectAll.checked = visibleIds.length > 0 && visibleIds.every(function (id) { return selectedIds.has(id); });
    selectAll.indeterminate = visibleIds.some(function (id) { return selectedIds.has(id); }) && !selectAll.checked;
    renderBulkBar();
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
    var gap = Synthesis.buildGapSummary(state.records);
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
    var summary = Synthesis.summarizeScreening(state.records);
    $('[data-screen-pending]').textContent = summary.pending;
    $('[data-screen-included]').textContent = summary.included;
    $('[data-screen-excluded]').textContent = summary.excluded;
    $('[data-screen-findings]').textContent = summary.findings;
    $('[data-screen-completeness]').textContent = summary.findings + ' / ' + summary.included + ' 条已纳入记录';
    $$('[data-screen-pending-count]').forEach(function (el) { el.textContent = summary.pending; });

    var themeSelect = $('[data-screen-filter-theme]');
    var selectedTheme = themeSelect.value || 'all';
    var themes = [];
    state.records.forEach(function (record) {
      Synthesis.normalizeSynthesis(record).themeTags.forEach(function (theme) { if (themes.indexOf(theme) < 0) themes.push(theme); });
    });
    themes.sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); });
    themeSelect.innerHTML = '<option value="all">全部主题</option>' + themes.map(function (theme) { return screeningOption(theme, selectedTheme); }).join('');
    themeSelect.value = themes.indexOf(selectedTheme) >= 0 ? selectedTheme : 'all';

    var records = Synthesis.filterEvidence(state.records, screeningFilters());
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
    $('[data-screening-visible]').textContent = '显示 ' + records.length + ' / ' + state.records.length + ' 篇';
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
    if (!current.length) {
      container.innerHTML = '<div class="issue-empty"><strong>' + (state.records.length ? '当前范围未发现问题' : '还没有可以检查的记录') + '</strong><span>' + (state.records.length ? '仍建议在交付前抽查原始文献。' : '添加文献后会自动生成问题清单。') + '</span></div>';
    } else {
      container.innerHTML = current.map(function (issue) {
        return '<div class="issue-item"><span><svg><use href="#i-alert"/></svg></span><div><strong>' + escapeHTML(issue.title) + '</strong><small>' + escapeHTML(issue.message) + '</small></div><button type="button" data-edit-record="' + issue.id + '">处理</button></div>';
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
    $('[data-report-status]').textContent = issues.length ? issues.length + ' 个问题将写入报告' : (state.records.length ? '基础检查通过' : '等待生成');
  }

  function renderSearchLogs() {
    var container = $('[data-search-log]');
    if (!state.searchLogs.length) {
      container.innerHTML = '<div class="log-empty">还没有检索记录。执行查询后，将平台与结果数量记在这里。</div>';
      return;
    }
    container.innerHTML = state.searchLogs.slice().reverse().slice(0, 8).map(function (log) {
      return '<div class="log-row"><span>' + formatTime(log.createdAt) + '</span><strong>' + escapeHTML(log.platform || '综合检索') + ' · ' + escapeHTML(log.note || '未填写结果数') + '</strong><small>' + (log.language || '中英') + '</small></div>';
    }).join('');
  }

  function fillForms() {
    var scope = $('[data-scope-form]');
    ['title', 'topic', 'deadline', 'years', 'include', 'exclude'].forEach(function (key) { if (scope.elements[key]) scope.elements[key].value = state.project[key] || ''; });
    scope.elements.cnTarget.value = state.project.cnTarget;
    scope.elements.enTarget.value = state.project.enTarget;
    $$('input[name="types"]', scope).forEach(function (input) { input.checked = state.project.types.indexOf(input.value) >= 0; });
    var query = $('[data-query-form]');
    Object.keys(state.concepts).forEach(function (key) { if (query.elements[key]) query.elements[key].value = state.concepts[key]; });
    $('[data-query-output="cn"]').textContent = state.queries.cn;
    $('[data-query-output="en"]').textContent = state.queries.en;
  }

  function renderProjectMeta() {
    $$('[data-project-title]').forEach(function (el) { el.textContent = state.project.title || '未命名研究任务'; });
    $('[data-deadline-label]').textContent = formatDate(state.project.deadline);
  }

  function renderAll() {
    renderProjectMeta();
    renderMetrics();
    renderWorkflow();
    renderAdvice();
    renderRecent();
    renderLibrary();
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
  }

  function openRecordModal(id) {
    var modal = $('[data-record-modal]');
    var form = $('[data-record-form]');
    form.reset();
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
    modal.classList.remove('is-visible');
    window.setTimeout(function () { modal.hidden = true; closeBackdropIfClear(); }, 180);
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

  function formDataObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = safeText(value).trim(); });
    return data;
  }

  function validateRecordForm(form) {
    var first = null;
    ['title', 'abstract', 'authors'].forEach(function (key) {
      var field = form.elements[key];
      var invalid = !field.value.trim();
      field.classList.toggle('is-error', invalid);
      if (invalid && !first) first = field;
    });
    if (first) {
      first.focus();
      toast('请先补齐标题、摘要和作者信息。', 'error');
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
    var button = $('[data-doi-lookup]');
    button.disabled = true;
    button.textContent = '正在查询…';
    fetch('https://api.crossref.org/works/' + encodeURIComponent(doi), { headers: { Accept: 'application/json' } })
      .then(function (response) { if (!response.ok) throw new Error('Crossref 未找到该 DOI'); return response.json(); })
      .then(function (payload) {
        var item = payload && payload.message ? payload.message : {};
        var authors = (item.author || []).map(function (author) { return [author.given, author.family].filter(Boolean).join(' '); }).join('; ');
        var dateParts = item.published && item.published['date-parts'] && item.published['date-parts'][0];
        form.elements.title.value = (item.title && item.title[0]) || form.elements.title.value;
        form.elements.authors.value = authors || form.elements.authors.value;
        form.elements.year.value = (dateParts && dateParts[0]) || form.elements.year.value;
        form.elements.source.value = (item['container-title'] && item['container-title'][0]) || item.publisher || form.elements.source.value;
        form.elements.url.value = item.URL || ('https://doi.org/' + doi);
        form.elements.type.value = /proceedings|conference/i.test(item.type || '') ? '会议论文' : '期刊论文';
        form.elements.language.value = item.language && item.language.toLowerCase().indexOf('zh') === 0 ? '中文' : '英文';
        form.elements.doi.value = doi;
        toast('DOI 元数据已补全，请核对摘要与作者单位');
      })
      .catch(function (error) { toast(error.message + '，请检查 DOI 后重试。', 'error'); })
      .finally(function () { button.disabled = false; button.textContent = '自动补全'; });
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
      if (!record.title || !record.abstract || !record.authors || (!record.doi && !record.url)) { blocked += 1; return; }
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
    var rows = state.records.map(function (record, index) {
      return [index + 1, record.language, record.title, record.abstract, record.authors, record.affiliation, record.year, record.type, record.source, record.keywords, record.doi, record.url, record.fileName, record.status, record.database, record.notes, record.screeningDecision, record.exclusionReason, record.coreFinding, record.evidenceGrade, record.themeTags.join('；')];
    });
    var csv = '\ufeff' + [headers].concat(rows).map(function (row) { return row.map(csvEscape).join(','); }).join('\r\n');
    downloadFile('文径-文献目录-' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv;charset=utf-8');
    toast('文献目录 CSV 已导出');
  }
  function exportJSON() {
    downloadFile('文径-完整备份-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(state, null, 2), 'application/json;charset=utf-8');
    toast('完整项目备份已导出');
  }
  function exportSynthesis() {
    var content = Synthesis.buildMarkdownSynthesis(state.project, state.records);
    downloadFile('文径-证据综合-' + new Date().toISOString().slice(0, 10) + '.md', content, 'text/markdown;charset=utf-8');
    toast('Markdown 证据综合已导出');
  }
  function bibEscape(value) { return safeText(value).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim(); }
  function bibKey(record, index) {
    var author = safeText(record.authors).split(/[;；,，]/)[0].split(/\s+/).pop() || 'record';
    return (author + (record.year || 'nd') + (index + 1)).replace(/[^a-zA-Z0-9_-]/g, '') || ('record' + (index + 1));
  }
  function exportBibTeX() {
    var content = state.records.map(function (record, index) {
      var type = record.type === '会议论文' ? 'inproceedings' : record.type === '研究报告' ? 'techreport' : record.type === '学位论文' ? 'thesis' : 'article';
      var fields = [
        ['title', record.title], ['author', safeText(record.authors).split(/[;；]/).join(' and ')], ['year', record.year],
        [type === 'inproceedings' ? 'booktitle' : type === 'article' ? 'journal' : 'institution', record.source],
        ['abstract', record.abstract], ['keywords', record.keywords], ['doi', normalizeDOI(record.doi)], ['url', record.url], ['note', record.notes]
      ].filter(function (pair) { return pair[1]; });
      return '@' + type + '{' + bibKey(record, index) + ',\n' + fields.map(function (pair) { return '  ' + pair[0] + ' = {' + bibEscape(pair[1]) + '}'; }).join(',\n') + '\n}';
    }).join('\n\n');
    downloadFile('文径-引用库-' + new Date().toISOString().slice(0, 10) + '.bib', content, 'application/x-bibtex;charset=utf-8');
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
    downloadFile('文径-质量检查报告-' + new Date().toISOString().slice(0, 10) + '.txt', qualityReport(), 'text/plain;charset=utf-8');
    toast('质量检查报告已导出');
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
            var jsonRecords = parsed.map(normalizeRecord);
            assignMissingFileNames(jsonRecords);
            state.records = state.records.concat(jsonRecords);
          }
          else if (parsed.records && Array.isArray(parsed.records)) {
            var incoming = parsed;
            state = {
              version: VERSION,
              project: Object.assign(defaultState().project, incoming.project || {}),
              concepts: Object.assign(defaultState().concepts, incoming.concepts || {}),
              queries: Object.assign(defaultState().queries, incoming.queries || {}),
              searchLogs: Array.isArray(incoming.searchLogs) ? incoming.searchLogs : [],
              records: incoming.records.map(normalizeRecord),
              finalChecks: Object.assign(defaultState().finalChecks, incoming.finalChecks || {}),
              updatedAt: nowISO()
            };
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

  function bindEvents() {
    document.addEventListener('click', function (event) {
      var nav = event.target.closest('[data-nav]');
      if (nav) { event.preventDefault(); showView(nav.getAttribute('data-nav')); return; }
      if (event.target.closest('[data-menu]')) { $('#sidebar').classList.toggle('is-open'); return; }
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
      if (event.target.closest('[data-log-query]')) {
        var platform = window.prompt('检索平台', '知网 / Google Scholar');
        if (platform === null) return;
        var note = window.prompt('结果数量或筛选说明', '初检结果待筛选');
        if (note === null) return;
        state.searchLogs.push({ id: uid(), platform: platform.trim() || '综合检索', note: note.trim() || '未填写结果数', language: /Scholar|Web|Scopus|OpenAlex/i.test(platform) ? '英文' : '中文', createdAt: nowISO() });
        saveState(); renderAll(); toast('本次检索已记录'); return;
      }
      if (event.target.closest('[data-load-demo]')) {
        if (state.records.some(function (record) { return record.demo; })) { toast('演示数据已经载入'); return; }
        state.records = demoRecords().concat(state.records); saveState(); renderAll(); toast('已载入 6 条演示记录'); return;
      }
      var clear = event.target.closest('[data-clear-filters]');
      if (clear) { $('#library-search').value = ''; $('[data-filter-language]').value = 'all'; $('[data-filter-status]').value = 'all'; renderLibrary(); return; }
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
        var type = exportButton.getAttribute('data-export');
        if (type === 'csv') exportCSV(); else if (type === 'json') exportJSON(); else if (type === 'bibtex') exportBibTeX(); else if (type === 'synthesis') exportSynthesis(); else exportReport();
        return;
      }
      if (event.target.closest('[data-doi-lookup]')) { lookupDOI(); return; }
      if (event.target.closest('[data-copy-manifest]')) { copyText(manifestText(), '文件命名与目录规范已复制'); return; }
      if (event.target.closest('[data-import-trigger]')) { $('[data-import-input]').click(); return; }
      if (event.target.closest('[data-advice-action]')) { showView(event.target.closest('[data-advice-action]').getAttribute('data-target-view')); return; }
      if (event.target.closest('[data-refresh-advice]')) { renderAdvice(); toast('任务建议已更新'); return; }
    });

    $('[data-record-form]').addEventListener('submit', saveRecord);
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
        types: $$('input[name="types"]:checked', form).map(function (input) { return input.value; })
      });
      saveState(); renderAll(); toast('研究边界已保存');
    });
    $('[data-query-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      state.concepts = Object.assign(state.concepts, formDataObject(event.currentTarget));
      generateQueries(); saveState(); renderAll(); toast('中英文检索式已生成');
    });
    $('#library-search').addEventListener('input', renderLibrary);
    $('[data-filter-language]').addEventListener('change', renderLibrary);
    $('[data-filter-status]').addEventListener('change', renderLibrary);
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
    $('[data-screening-body]').addEventListener('change', function (event) {
      var field = event.target.closest('[data-screen-field]');
      var row = field && field.closest('[data-record-id]');
      if (!field || !row) return;
      var record = state.records.filter(function (item) { return item.id === row.getAttribute('data-record-id'); })[0];
      if (!record) return;
      var key = field.getAttribute('data-screen-field');
      record[key] = key === 'themeTags' ? Synthesis.splitThemeTags(field.value) : field.value;
      Object.assign(record, Synthesis.normalizeSynthesis(record));
      record.updatedAt = nowISO();
      saveState('筛选信息已保存');
      renderScreening();
      renderWorkflow();
      renderAdvice();
    });
    $$('[data-final-check]').forEach(function (input) {
      input.addEventListener('change', function () { state.finalChecks[input.getAttribute('data-final-check')] = input.checked; saveState(); renderQuality(); });
    });
    $('[data-import-input]').addEventListener('change', function (event) { handleImport(event.target.files[0]); event.target.value = ''; });
    $('[data-modal-backdrop]').addEventListener('click', function () { if (!$('[data-record-modal]').hidden) closeRecordModal(); else if (!$('[data-confirm-modal]').hidden) closeConfirm(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') { if (!$('[data-record-modal]').hidden) closeRecordModal(); else if (!$('[data-confirm-modal]').hidden) closeConfirm(); } });
    $$('.workflow-steps li').forEach(function (item) { item.addEventListener('click', function () { showView(item.getAttribute('data-step')); }); });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(function () {});
  }

  fillForms();
  bindEvents();
  renderAll();
  showView(location.hash.replace('#', '') || 'overview');
  registerServiceWorker();
})();
