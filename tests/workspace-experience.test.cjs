const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workspacePath = path.join(root, 'workspace-core.js');
const accountPath = path.join(root, 'account-core.js');

test('creates a blank, traceable research project instead of seeded portfolio copy', () => {
  assert.equal(fs.existsSync(workspacePath), true, 'workspace-core.js must exist');
  const workspaceCore = require(workspacePath);
  const project = workspaceCore.createProjectState({ now: '2026-07-27T08:00:00.000Z' });

  assert.match(project.id, /^project-/);
  assert.equal(project.project.title, '');
  assert.equal(project.project.topic, '');
  assert.equal(project.project.deadline, '');
  assert.deepEqual(project.records, []);
  assert.equal(project.createdAt, '2026-07-27T08:00:00.000Z');
  assert.equal(project.updatedAt, '2026-07-27T08:00:00.000Z');
});

test('migrates a legacy single project and supports multiple active projects', () => {
  const workspaceCore = require(workspacePath);
  const legacy = {
    version: 2,
    project: { title: '旧项目', topic: '旧主题', deadline: '2026-08-01' },
    concepts: {},
    queries: {},
    searchLogs: [],
    records: [{ id: 'record-1', title: '真实题录' }],
    finalChecks: {},
    updatedAt: '2026-07-26T08:00:00.000Z'
  };

  const workspace = workspaceCore.normalizeWorkspace(null, legacy, '2026-07-27T08:00:00.000Z');
  assert.equal(workspace.projects.length, 1);
  assert.equal(workspace.projects[0].project.title, '旧项目');
  assert.equal(workspace.projects[0].records[0].title, '真实题录');
  assert.equal(workspace.activeProjectId, workspace.projects[0].id);

  const second = workspaceCore.createProjectState({
    title: '第二个项目',
    now: '2026-07-27T09:00:00.000Z'
  });
  const next = workspaceCore.addProject(workspace, second);
  assert.equal(next.projects.length, 2);
  assert.equal(next.activeProjectId, second.id);
  assert.equal(workspaceCore.getActiveProject(next).project.title, '第二个项目');
});

test('rejects imported identifiers that could become HTML attributes', () => {
  const workspaceCore = require(workspacePath);
  const malicious = 'x" onmouseover="alert(1)';
  const project = workspaceCore.normalizeProject({ id: malicious, project: {} });

  assert.match(project.id, /^project-/);
  assert.doesNotMatch(project.id, /["<>\s]/);
  assert.equal(workspaceCore.safeId('record-safe_123', 'record'), 'record-safe_123');
  assert.match(workspaceCore.safeId(malicious, 'record'), /^record-/);
});

test('keeps demonstration records out of formal counts and delivery data', () => {
  const workspaceCore = require(workspacePath);
  const records = [
    { id: 'formal-1', title: '真实文献', demo: false },
    { id: 'demo-1', title: '演示文献', demo: true }
  ];
  assert.deepEqual(workspaceCore.formalRecords(records).map((record) => record.id), ['formal-1']);
});

test('creates and verifies a real same-device account credential', async () => {
  assert.equal(fs.existsSync(accountPath), true, 'account-core.js must exist');
  const accountCore = require(accountPath);
  const account = await accountCore.createAccount({
    displayName: '研究者',
    email: 'Researcher@Example.com',
    password: 'correct horse battery staple',
    id: 'account-1',
    salt: new Uint8Array(16).fill(7),
    now: '2026-07-27T08:00:00.000Z'
  });

  assert.equal(account.email, 'researcher@example.com');
  assert.equal(account.displayName, '研究者');
  assert.equal(account.password, undefined);
  assert.ok(account.passwordHash.length > 20);
  assert.equal(await accountCore.verifyPassword(account, 'correct horse battery staple'), true);
  assert.equal(await accountCore.verifyPassword(account, 'wrong password'), false);
});

test('exposes project and optional account actions without internal cost copy', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  assert.match(index, /data-project-switcher/);
  assert.match(index, /data-create-project/);
  assert.match(index, /data-auth-login/);
  assert.match(index, /data-auth-register/);
  assert.match(script, /formalRecords/);
  assert.doesNotMatch(index, /零固定成本|0 成本|无自动账单|COST_MODE|实现阶段/);
  assert.doesNotMatch(index, /data-load-demo|载入演示数据/);
  assert.doesNotMatch(index, /本地保存|所有文件都在浏览器本地生成/);
  assert.doesNotMatch(script, /演示数据|本地录入/);
  assert.match(index, /data-import-trigger/);
  assert.match(index, /data-step="scope" role="button" tabindex="0"/);
  assert.match(index, /register-suffix/);
  assert.match(script, /location\.hostname === '127\.0\.0\.1'/);
  assert.match(script, /addEventListener\('input'[\s\S]*queueScreeningSave/);
  assert.match(script, /isValidPublicationYear/);
  assert.match(script, /isValidDOI/);
  assert.match(script, /isValidSourceUrl/);
  assert.match(script, /escapeHTML\(issue\.id\)/);
  assert.match(script, /function localDateStamp/);
  assert.doesNotMatch(script, /文径-[^']*new Date\(\)\.toISOString\(\)\.slice/);
  assert.match(script, /confirmDiscardForm/);
  assert.match(script, /addEventListener\('beforeunload'/);
  assert.doesNotMatch(script, /record\.type === '学位论文' \? 'thesis'/);
  assert.match(script, /type === 'misc' \? '学位论文'/);
  assert.match(serviceWorker, /!response \|\| !response\.ok/);
  assert.match(serviceWorker, /caches\.match\('\.\/index\.html'\)/);
});
