const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const experience = fs.readFileSync(path.join(root, 'experience-core.js'), 'utf8');

test('起步页用真实交付组织选择，而不是口号或硬性数量', () => {
  assert.match(html, /先说清这次要交什么/);
  assert.match(html, /从一个具体交付开始/);
  assert.match(html, /课堂汇报/);
  assert.match(html, /开题 \/ 文献综述/);
  assert.match(html, /决策简报/);
  assert.match(html, /选择一个研究起点/);
  assert.doesNotMatch(html, /你要交的不是一堆链接/);
  assert.doesNotMatch(html, /50 分钟/);
  assert.doesNotMatch(html, /30 篇起步|60 篇起步|24 篇起步/);
  assert.doesNotMatch(experience, /50 分钟|25 分钟|45 分钟/);
});

test('起步页提供键盘可达的主内容入口与紧凑移动端节奏', () => {
  assert.match(html, /href="#main-content"/);
  assert.match(html, /id="main-content"/);
  assert.match(html, /data-start-hero/);
  assert.match(html, /data-start-template-meta/);
  assert.match(css, /\.skip-link/);
  assert.match(css, /\.start-desk-copy h2[^}]*font-size: clamp\(30px, 3\.4vw, 46px\)/);
  assert.match(css, /\.start-template[^}]*min-height: 132px/);
});

test('选择模板后会留下可识别的起点并把下一步说清楚', () => {
  assert.match(script, /starterTemplate/);
  assert.match(script, /已选起点/);
  assert.match(script, /补上真实主题与期限/);
  assert.match(html, /data-start-template-meta/);
});
