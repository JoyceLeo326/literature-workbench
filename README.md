# 文径 · 文献研究工作台

[打开文径（GitHub Pages）](https://joyceleo326.github.io/literature-workbench/) · [备用入口（Vercel）](https://literature-workbench.vercel.app/)

文径把一项文献任务拆成可复查的连续流程：定义研究边界、建立检索式、维护题录、完成人工筛选与证据综合、检查质量、整理交付。用户选择研究阶段、交付目标和每周可投入时间后，工作台会据此组织四段研究旅程、下一步建议与导出上下文。访客可以直接开始工作；右上角账户入口用于在同一设备上区分研究空间。

## 一条会被反馈改写的研究故事

总览中的 24 幅连续画面覆盖提问、边界、检索、筛选、核验、综合、交付与迭代六章。它不是与功能分离的展示画廊：当前研究阶段、交付目标、文献数量、核验进度会决定建议进入的章节；用户保存“范围太宽、来源不足、结论过强、结构不清或难以交接”等反馈后，故事入口、下一步任务和交付报告会一起变化。完整的视觉识别、场景清单与插画真实性边界见 [视觉识别与叙事资产](docs/visual-identity.md)。

## 核心工作流

1. 为每个研究项目设置问题、年份、目标数量、纳入条件与排除条件。
2. 从中英文概念组生成布尔检索式，并记录检索平台、时间与结果说明。
3. 手动录入或导入 CSV、JSON、BibTeX、RIS 题录；也可通过 DOI 向 Crossref 补全元数据。
4. 逐条保存筛选决定、排除理由、核心发现、人工证据等级与主题标签。
5. 按决定、等级、主题和文本筛选证据矩阵，检查重复、缺失和来源可追溯性。
6. 导出 UTF-8 BOM CSV、完整 JSON、BibTeX、Markdown 证据综合与质量报告。

研究画像并非装饰字段：课程研究、论文阶段和工作研究对应不同的证据节奏；课堂汇报、开题方案和文献综述会改变建议重点，投入时间则决定每周建议的专注时段。画像会随项目保存在浏览器中，并写入 Markdown 综合与质量报告。

## 产品能力

- 多研究项目创建、切换与自动保存；
- 标题、摘要、作者、单位、年份、来源、DOI、原文链接、PDF 文件名等完整题录字段；
- 独立的筛选与综合工作区，以及语言和状态筛选、批量核验、编辑、删除与最近更新；
- 规范化 PDF 文件名与交付清单；
- 完整 JSON 往返保留筛选和综合字段；
- 六章 24 幕研究叙事、研究画像推荐入口与反馈驱动的下一轮路径；
- PWA 离线重载与桌面、平板、手机响应式布局；
- 同设备账户采用 PBKDF2-SHA-256 派生密码摘要，不保存明文密码。

证据等级与研究结论始终由使用者判断。字段分布提示只反映当前项目中的资料，不代替回到原文核验，也不构成系统综述结论。

## 数据与账户

研究项目保存在当前浏览器中，不会自动上传。登录与注册是可选入口，用于在同一设备上区分研究空间；完整 JSON 可随时导出并再次导入。Crossref 不可用时，手动录入、导入、筛选、综合和导出仍可继续。

## 本地运行

```bash
python -m http.server 4173
```

打开 `http://localhost:4173`。

## 验证

```bash
node --test tests/*.test.cjs
node --check script.js
node --check literature-core.js
node --check workspace-core.js
node --check account-core.js
node --check cost-policy.js
node --check experience-core.js
node --check story-core.js
node scripts/build-pages.mjs
node scripts/scan-secrets.mjs . pages-dist
```

`pages-dist/` 是 GitHub Pages 的纯静态发布目录；构建与部署工作流会在上传前复跑行为测试，并对当前树和发布产物执行不回显密钥值的扫描。

维护者侧的服务与部署边界见 [运行约束说明](docs/zero-owner-cost.md)。
