(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LitpathWorkspace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var WORKSPACE_VERSION = 1;
  var PROJECT_VERSION = 5;
  var STRATEGY_IDS = ['focus', 'coverage', 'contrast'];

  function timestamp(value) {
    return value || new Date().toISOString();
  }

  function id(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return prefix + '-' + crypto.randomUUID();
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function safeId(value, prefix) {
    var candidate = String(value || '');
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : id(prefix);
  }

  function plainClone(value, fallback) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return fallback; }
  }

  function createProjectState(options) {
    var input = options || {};
    var now = timestamp(input.now);
    return {
      id: safeId(input.id, 'project'),
      version: PROJECT_VERSION,
      project: {
        title: String(input.title || '').trim(),
        topic: String(input.topic || '').trim(),
        deadline: String(input.deadline || ''),
        years: String(input.years || ''),
        cnTarget: Number.isFinite(Number(input.cnTarget)) ? Math.max(0, Number(input.cnTarget)) : 0,
        enTarget: Number.isFinite(Number(input.enTarget)) ? Math.max(0, Number(input.enTarget)) : 0,
        researchStage: String(input.researchStage || 'coursework'),
        deliveryGoal: String(input.deliveryGoal || 'class-report'),
        weeklyHours: Number.isFinite(Number(input.weeklyHours)) ? Math.min(40, Math.max(1, Math.round(Number(input.weeklyHours)))) : 5,
        reviewFeedback: null,
        include: String(input.include || '').trim(),
        exclude: String(input.exclude || '').trim(),
        types: Array.isArray(input.types) ? input.types.slice() : ['期刊论文', '会议论文', '研究报告']
      },
      concepts: {
        a: '',
        b: '',
        c: '',
        aEn: '',
        bEn: '',
        cEn: ''
      },
      queries: { cn: '', en: '' },
      searchLogs: [],
      records: [],
      strategyDecisions: [],
      strategyChoiceId: '',
      strategyProposal: null,
      finalChecks: { quantity: false, mapping: false, metadata: false, trace: false },
      createdAt: now,
      updatedAt: now
    };
  }

  function normalizeProject(raw, now) {
    var base = createProjectState({ now: now });
    var incoming = raw && typeof raw === 'object' ? raw : {};
    var project = incoming.project && typeof incoming.project === 'object' ? incoming.project : {};
    return {
      id: safeId(incoming.id, 'project'),
      version: PROJECT_VERSION,
      project: Object.assign(base.project, project),
      concepts: Object.assign(base.concepts, incoming.concepts || {}),
      queries: Object.assign(base.queries, incoming.queries || {}),
      searchLogs: Array.isArray(incoming.searchLogs) ? incoming.searchLogs.slice() : [],
      records: Array.isArray(incoming.records) ? incoming.records.slice() : [],
      strategyDecisions: Array.isArray(incoming.strategyDecisions)
        ? plainClone(incoming.strategyDecisions, [])
        : [],
      strategyChoiceId: STRATEGY_IDS.indexOf(incoming.strategyChoiceId) >= 0 ? incoming.strategyChoiceId : '',
      strategyProposal: incoming.strategyProposal && typeof incoming.strategyProposal === 'object' && !Array.isArray(incoming.strategyProposal)
        ? plainClone(incoming.strategyProposal, null)
        : null,
      finalChecks: Object.assign(base.finalChecks, incoming.finalChecks || {}),
      createdAt: incoming.createdAt || incoming.updatedAt || base.createdAt,
      updatedAt: incoming.updatedAt || base.updatedAt
    };
  }

  function normalizeWorkspace(raw, legacy, now) {
    var source = raw && typeof raw === 'object' ? raw : null;
    var projects = source && Array.isArray(source.projects)
      ? source.projects.map(function (project) { return normalizeProject(project, now); })
      : [];
    if (!projects.length && legacy && typeof legacy === 'object') projects.push(normalizeProject(legacy, now));
    if (!projects.length) projects.push(createProjectState({ now: now }));
    var active = source && projects.some(function (project) { return project.id === source.activeProjectId; })
      ? source.activeProjectId
      : projects[0].id;
    return {
      version: WORKSPACE_VERSION,
      activeProjectId: active,
      projects: projects,
      updatedAt: source && source.updatedAt ? source.updatedAt : timestamp(now)
    };
  }

  function getActiveProject(workspace) {
    if (!workspace || !Array.isArray(workspace.projects)) return null;
    return workspace.projects.find(function (project) { return project.id === workspace.activeProjectId; }) || workspace.projects[0] || null;
  }

  function addProject(workspace, project) {
    var normalized = normalizeWorkspace(workspace);
    var nextProject = normalizeProject(project);
    return {
      version: WORKSPACE_VERSION,
      activeProjectId: nextProject.id,
      projects: normalized.projects.concat(nextProject),
      updatedAt: new Date().toISOString()
    };
  }

  function upsertActiveProject(workspace, project) {
    var normalized = normalizeWorkspace(workspace);
    var nextProject = normalizeProject(project);
    var found = false;
    var projects = normalized.projects.map(function (item) {
      if (item.id !== nextProject.id) return item;
      found = true;
      return nextProject;
    });
    if (!found) projects.push(nextProject);
    return {
      version: WORKSPACE_VERSION,
      activeProjectId: nextProject.id,
      projects: projects,
      updatedAt: new Date().toISOString()
    };
  }

  function selectProject(workspace, projectId) {
    var normalized = normalizeWorkspace(workspace);
    if (!normalized.projects.some(function (project) { return project.id === projectId; })) return normalized;
    normalized.activeProjectId = projectId;
    normalized.updatedAt = new Date().toISOString();
    return normalized;
  }

  function formalRecords(records) {
    return (Array.isArray(records) ? records : []).filter(function (record) { return !record.demo; });
  }

  return {
    WORKSPACE_VERSION: WORKSPACE_VERSION,
    PROJECT_VERSION: PROJECT_VERSION,
    createProjectState: createProjectState,
    safeId: safeId,
    normalizeProject: normalizeProject,
    normalizeWorkspace: normalizeWorkspace,
    getActiveProject: getActiveProject,
    addProject: addProject,
    upsertActiveProject: upsertActiveProject,
    selectProject: selectProject,
    formalRecords: formalRecords
  };
});
