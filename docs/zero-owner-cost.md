# 项目所有者零固定成本策略

文径默认运行于 `COST_MODE=zero_owner_cost`。目标是让项目所有者没有固定基础设施成本、没有自动账单，也不因公共接口失败而静默切换到付费服务。

这是一条产品和部署边界，不是“任何参与者在任何环境下都永远不会产生费用”的承诺。网络、设备、域名或使用者自行选择的第三方服务仍可能由对应主体承担费用。

## 当前已实现

- 应用是静态 HTML / CSS / JavaScript，没有自建后端、数据库服务器或所有者侧 API 密钥。
- 正式题录、筛选决定、证据综合字段和终检状态当前保存在浏览器 `localStorage`；完整 JSON 可导出并再次导入。
- DOI 补全只调用 Crossref 免费公共 REST API。429、拒绝、网络中断或无效响应都会明确停止联网请求，不会尝试 Metadata Plus、代理接口或其他付费回退。
- 公共接口不可用时，手动录入、CSV / JSON / BibTeX / RIS 导入、筛选、综合和全部本地导出继续可用。
- `.env.example` 明确记录 `COST_MODE=zero_owner_cost`；浏览器运行时也硬性回落到同一模式，其他值不能开启付费能力。
- OCR、云同步、成本仪表盘均未实现；界面和文档不得把这些路线写成现有功能。

## 公共 API 边界

### Crossref

当前只允许 `https://api.crossref.org` 免费公共端点。Crossref 会用 HTTP 429 表示限流，且官方限制可能调整；实现按状态失败关闭并提示继续本地工作。参考 [Crossref Access and authentication](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)。

### OpenAlex

OpenAlex 当前未集成，也不配置项目所有者密钥。官方现行 API 需要 API key，并同时存在免费额度与付费计划；如果未来评估接入，必须单独设计使用者自带凭据、免费额度耗尽即停止的路径，不能由项目所有者账户自动付费。参考 [OpenAlex Developers](https://developers.openalex.org/)。

## IndexedDB（后续路线，未实现）

当前真实存储仍是 `localStorage`。后续若题录数量或字段体积明显增长，可按以下顺序迁移：

1. 新增带版本号的 IndexedDB 数据层和升级事务；
2. 首次启动只复制、不删除旧 `localStorage` 数据；
3. 校验记录数和 JSON 备份后，再由使用者确认清理旧数据；
4. 保持离线可用，不引入所有者侧数据库或后台任务。

在迁移代码、往返测试和回滚流程完成前，不得宣称已经使用 IndexedDB。

## BYOS（后续路线，未实现）

商业或多设备场景可以评估 Bring Your Own Storage：由使用者自行选择存储服务、创建凭据并承担对应关系和费用。路线设计至少需要：

- 凭据只保存在使用者设备，项目所有者不托管共享密钥；
- 明确 CORS、加密、撤销、冲突合并和数据导出规则；
- 默认关闭，连接失败时回到本地工作流；
- 不提供项目所有者账户下的自动付费兜底。

云同步尚未实现，当前不能跨设备同步。

## 部署路线

### 当前作品演示

Vercel Hobby 仅用于个人、非商业作品演示。Vercel 官方说明 Hobby 限制为个人、非商业使用；商业用途不得沿用这条部署路径。参考 [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) 和 [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)。

### 商业部署路线：Cloudflare Pages

商业发布路线保持纯静态：只向 Cloudflare Pages 发布现有静态资源，不启用 Pages Functions、Workers、R2、D1 或其他可能进入计费的产品。上线前必须复核账户计划、商业条款、构建限制和静态资源限制：

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)

官方配额与条款会变化，本文不固化具体额度，也不保证任何第三方会永久免费。每次商业上线前都应重新查看官方页面，并确保账户没有付费升级、按量计费或自动账单路径。

## 发布前零成本核对

- `COST_MODE` 保持 `zero_owner_cost`；
- 未提交 API key、支付信息或所有者侧云凭据；
- 公共 API 失败时只提示失败和本地替代路径；
- 本地录入、导入、筛选、综合、JSON 备份和导出可离线继续；
- 部署只包含静态资源；
- 商业发布前重新核对第三方官方条款与配额。
