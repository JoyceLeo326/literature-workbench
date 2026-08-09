<p align="center">
  <img src="assets/brand/wenjing-brandkit-v1.png" alt="文径品牌与文献研究工作台视觉系统" width="100%" />
</p>

# 文径 · 文献研究工作台

把研究问题、检索过程、人工筛选、证据综合与交付版本放进同一条可复查的工作流。

[在线使用（GitHub Pages）](https://joyceleo326.github.io/literature-workbench/) · [备用入口（Vercel）](https://literature-workbench.vercel.app/) · [视觉识别与叙事资产](docs/visual-identity.md)

文径面向课程研究、论文准备、开题方案与工作型案头研究。它不会替使用者判断证据，也不会把自动生成的内容伪装成真实文献；它负责让问题边界、检索式、题录、筛选理由、证据等级、反馈和版本变化彼此可追溯。

## 从问题到交付

1. **建立研究项目**：填写研究问题、年份范围、研究阶段、交付目标、目标数量、纳入条件、排除条件、中英文概念组与可投入时间。
2. **比较三条研究策略**：系统结合画像、题录进度、语言缺口与交付期限，给出三条不同路线；每条路线都展示收益、代价、适用依据、第一步行动与复核问题。
3. **人工确认 V1**：选择路线并勾选接受对应取舍后，才会形成可交付的策略版本。没有人工确认时，下载不会被当作已批准结果。
4. **建立检索记录**：由中英文概念组生成布尔检索式，同时记录数据库、检索日期、结果数量和说明。生成的检索式仍需按目标数据库语法人工校正。
5. **维护题录与筛选**：可手动录入，或导入 CSV、JSON、BibTeX、RIS；逐条补充作者、单位、来源、年份、摘要、DOI、链接和 PDF 文件名，并保存纳入、排除、待定及排除理由。
6. **提取与综合证据**：记录核心发现、人工证据等级、主题标签与可追溯说明，在独立工作区检查来源、字段、新近性、反证和分歧。
7. **让反馈进入下一版**：选择“范围太宽、来源不足、结论过强、结构不清、难以交接”等反馈并写下现场说明；文径先展示事实差异提案，旧版继续保留，重新人工确认后再形成 V2 或后续版本。
8. **导出交付物**：下载 UTF-8 BOM CSV、完整 JSON、BibTeX、Markdown 证据综合、质量报告与策略版本档案；完整 JSON 可再次导入并继续工作。

### 第一次体验建议

打开在线入口后，可以直接使用默认示例理解流程，也可以新建空白项目：

1. 在“研究画像”中先确定研究阶段和交付目标；
2. 在“研究边界”中写清问题、年份与纳入/排除条件；
3. 查看三条策略，不只看推荐分数，还要阅读每条路线主动放弃了什么；
4. 确认一条 V1 后进入题录区，至少录入一条可回到原文核验的记录；
5. 完成一次筛选和一次证据提取，再回到策略区提交真实反馈；
6. 对照 V1 与新提案的字段差异，确认后导出 Markdown 策略档案与完整 JSON 备份。

## 核心能力

- 多研究项目创建、切换、自动保存、完整备份与恢复；
- 研究阶段、交付形式、期限、投入时间和语种缺口共同驱动的策略排序；
- 恰好三条差异化策略，以及显式收益、代价、适用依据和人工确认；
- 中英文概念组、布尔检索式、检索平台和检索批次记录；
- CSV、JSON、BibTeX、RIS 题录导入，以及 CSV、JSON、BibTeX 导出；
- 标题、摘要、作者、单位、年份、来源、DOI、原文链接、PDF 文件名等题录字段；
- 独立筛选与综合工作区、语言与状态筛选、批量核验、编辑和删除；
- 可解释证据权重、优先复核队列和质量缺口提示；这些字段分布提示不构成系统综述结论；
- V1 → 反馈提案 → 再确认 → V2 的完整版本账本，旧版本不会被覆盖；
- 六章 24 幕研究故事，当前项目状态会改变推荐章节与下一步行动；
- PWA 离线重载，以及桌面、平板和手机响应式布局。

## 图像叙事

`assets/story/` 中的 24 张 WebP 画面覆盖提问、边界、检索、筛选、核验、综合、交付与迭代。它们不是独立画廊：研究阶段、交付目标、题录数量、核验进度和反馈会共同决定故事入口、当前章节与下一步任务。品牌标志、色彩、构图规则和图像真实性边界记录在 [`docs/visual-identity.md`](docs/visual-identity.md)。

## 本地运行

公开产品是原生 HTML、CSS 和 JavaScript，不需要安装前端依赖。克隆仓库后在项目根目录启动静态服务器：

```bash
git clone https://github.com/JoyceLeo326/literature-workbench.git
cd literature-workbench
python -m http.server 4173
```

浏览器打开 <http://localhost:4173>。不要直接双击 `index.html`：Service Worker、文件下载和部分浏览器存储行为需要 HTTP 环境。

## 测试与构建

行为测试和发布脚本使用 Node.js 内置能力，无需额外安装 npm 包：

```bash
node --test tests/*.test.cjs
node --check script.js
node --check literature-core.js
node --check workspace-core.js
node --check account-core.js
node --check experience-core.js
node --check story-core.js
node --check decision-core.js
node scripts/build-pages.mjs
node scripts/scan-secrets.mjs . pages-dist
```

`node scripts/build-pages.mjs` 生成 `pages-dist/`。构建脚本只复制公开运行所需文件；`scan-secrets.mjs` 会同时检查源码和发布产物，并且不会在日志中回显凭据值。

## 部署

- `.github/workflows/ci.yml` 在提交和拉取请求中运行行为、语法与安全检查；
- `.github/workflows/deploy-pages.yml` 构建 `pages-dist/` 并发布 GitHub Pages；
- `vercel.json` 用于同一套静态产品的 Vercel 备用部署；
- 公开核心流程不依赖境外运行时 API、外部字体、CDN、数据库或 AI 服务。

## 目录结构

```text
.
├── index.html                 # 页面结构
├── styles.css                # 视觉系统与响应式布局
├── script.js                 # 页面编排、存储、导入导出
├── literature-core.js        # 题录与研究流程核心
├── decision-core.js          # 三策略、取舍与版本决策
├── workspace-core.js         # 项目工作区与数据规范化
├── story-core.js             # 24 幕叙事路由
├── account-core.js           # 可选账户界面的本地状态
├── assets/                   # 品牌、图标与故事画面
├── docs/                     # 视觉与产品说明
├── tests/                    # Node.js 行为测试
├── scripts/                  # Pages 构建与密钥扫描
└── .github/workflows/        # CI 与 Pages 发布
```

## 数据、隐私与安全

- 项目数据保存在当前浏览器存储中；清理站点数据、隐私模式限制或更换浏览器配置文件都可能让本地数据不可恢复，请定期导出完整 JSON。
- 账户入口是可选界面，公开静态版本不要求登录，也不提供跨设备云同步。
- 文径不会代替使用者填写来源、证据等级或研究结论，也不会主动上传文献、PDF 或项目数据。
- 仓库中的 `.env.example` 只列出可选配置名；不要把真实 API Key、令牌或个人研究数据提交到 Git。
- DOI 当前只做格式校验，不会联网补全元数据；原文与引用准确性必须由使用者核验。

## 已知边界

- 文径是研究流程与证据管理工具，不是自动系统综述服务，也不保证检索完整性。
- 检索式是可编辑草稿，不同数据库的字段名和语法需要人工适配。
- 证据权重、质量提示和优先队列只解释当前项目中的记录分布，不构成学术、医疗、法律或其他专业结论。
- 本地浏览器存储不等于长期归档；正式交付前应同时保存原文、数据库检索记录和导出的项目备份。
