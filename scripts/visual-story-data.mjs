export const VISUAL_LANGUAGE = `Use case: illustration-story
Asset type: literature-workbench journey scene
Style/medium: editorial gouache illustration with subtle paper grain, grounded contemporary research setting
Subject continuity: Lin is the same adult Chinese woman researcher with shoulder-length black hair and a moss-green cardigan
Composition/framing: landscape 3:2, medium-wide eye-level view, clear action, responsive-crop safe
Color palette: deep teal, warm ivory, muted cinnabar accents
Constraints: no readable text, no logos, no watermark, no third-party brands, no floating UI, anatomically plausible hands, one coherent scene`;

const usedIn = ['visual-story-v3.js'];

function story(number, slug, phase, title, person, situation, action, productState, outcome, alt, promptScene) {
  return {
    id: `lit-v3-${String(number).padStart(2, '0')}-${slug}`,
    file: `assets/story-v3/lit-${String(number).padStart(2, '0')}-${slug}.webp`,
    phase,
    title,
    person,
    situation,
    action,
    productState,
    outcome,
    alt,
    prompt: `${VISUAL_LANGUAGE}\n${promptScene}`,
    usedIn,
    coreReachable: number <= 20,
    width: 768,
    height: 512,
    review: { subject: true, hands: true, text: true, realism: true, watermark: true, trademarks: true }
  };
}

export const STORIES = [
  story(1, 'focus-question', 'orient', '先停下无边界的收集', '研究生林', '开题汇报只剩三天，几十篇文献仍无法汇成问题。', '关掉多余标签页，在空白卡片上写下一个可回答的问题。', '研究边界待建立', '零散兴趣变成可以继续核验的第一问。', '林在雨夜书桌前收起散乱资料，在空白卡片上写下聚焦问题。', `Primary request: A Chinese graduate student named Lin sits at a compact apartment desk at dusk, closing a wall of browser tabs and writing one focused research question on a blank index card; stacks of mixed Chinese and English papers surround her, and her tense posture begins to settle.
Scene/backdrop: lived-in small study with rain on the window and warm desk lamp
Lighting/mood: deep teal dusk, warm amber lamp, calm after overwhelm`),
  story(2, 'deadline-scope', 'orient', '期限决定本轮边界', '研究生林', '可用时间与候选材料规模明显不匹配。', '把三天期限放在资料堆旁，圈出本轮实际能核验的范围。', '期限与投入时间已记录', '宏大目标被拆成本轮可以交付的范围。', '林把期限卡放在高高的资料堆旁，圈出本轮能够完成的范围。', `Primary request: Lin places a three-day deadline card beside an overfull stack of papers, then draws a smaller circle around the sources she can realistically review; anxiety becomes a concrete scope decision.
Scene/backdrop: same apartment study at early morning, wall calendar shapes without legible writing
Lighting/mood: cool dawn with a warm desk lamp, focused urgency`),
  story(3, 'broad-narrow-choice', 'orient', '宽题与窄题摆上桌', '林与导师', '一个方向覆盖全面却无法按时完成，另一个方向更窄但证据可控。', '并排比较两张研究地图，指向更适合期限的窄路线。', '两套范围方案可比较', '林理解了收窄范围会放弃什么，也知道为什么选择它。', '林和导师在研讨桌前比较一张铺满卡片的宽题地图与一张聚焦地图。', `Primary request: Lin and her older woman research adviser compare two physical research maps on a seminar table, one visibly sprawling and one tightly bounded; Lin points to the narrower route while the adviser shows its tradeoff.
Scene/backdrop: quiet university seminar room with corkboard and blank cards
Lighting/mood: soft overcast daylight, candid collaborative concentration`),
  story(4, 'bilingual-concepts', 'orient', '中英文概念互相照见', '林与图书馆员', '中文概念直接翻译后遗漏了常用英文表达。', '把两组概念卡按含义配对，并把歧义卡单独放置。', '双语概念组已形成', '检索词不再依赖单一语言的直译。', '林与图书馆员在咨询桌上连接两组不同颜色的概念卡。', `Primary request: Lin and a male librarian arrange two color-coded clusters of blank concept cards, connecting equivalent ideas with string while setting ambiguous cards aside.
Scene/backdrop: public university library consultation desk
Lighting/mood: warm afternoon light, patient discovery`),
  story(5, 'search-route-choice', 'orient', '检索路线也有取舍', '研究生林', '广泛路线可能找到更多材料，却会挤压核验时间。', '比较广搜与聚焦两条路线，把木标放在符合期限的一条上。', '检索策略待确认', '路线的收益和代价在执行前已经可见。', '林在图书馆桌面比较两条检索路线，并把木标放在聚焦路线。', `Primary request: Lin compares two hand-drawn search routes on a large table, one broad route through many shelves and one focused route through fewer sources; she places a small wooden marker on the route that fits her deadline.
Scene/backdrop: map-like research planning table in a library alcove
Lighting/mood: top-lit quiet clarity, visible choice and consequence`),
  story(6, 'inclusion-rules', 'orient', '先用样例检验规则', '研究生林', '抽象纳入条件遇到真实论文时仍有模糊地带。', '用三张样例卡试跑规则，分别放入纳入、排除和待定托盘。', '筛选规则已试跑', '规则中的歧义在大批筛选前被发现。', '林把三张样例论文卡分别放进纳入、排除与待定托盘。', `Primary request: Lin tests three sample paper cards against a row of blank inclusion and exclusion cards, moving one into keep, one into exclude, and leaving one uncertain.
Scene/backdrop: tidy study table with three clearly separated trays
Lighting/mood: neutral morning light, careful rule-setting`),
  story(7, 'empty-project-confirm', 'orient', '从示例回到自己的问题', '研究生林', '默认示例足够完整，却不是她真实要做的研究。', '比较示例文件夹与空白文件夹，主动选择空白项目。', '新项目由用户确认', '第一次使用可以借鉴示例，也不会被示例绑住。', '林在阅读室比较示例文件夹与空白文件夹，伸手选择后者。', `Primary request: Lin sits before an intentionally cleared desk, compares a prepared example folder with an empty folder, then deliberately chooses the empty folder to begin her own project.
Scene/backdrop: calm reading room with two physical folders and a single notebook
Lighting/mood: bright morning, confident clean start`),
  story(8, 'library-discovery', 'orient', '发现不等于纳入', '研究生林', '书架上两本材料都很吸引人，推车里还有更多相关标题。', '拿出边界卡逐一核对，暂不因新鲜感扩大范围。', '候选材料待核验', '意外发现被记录，但没有破坏本轮边界。', '林站在书架之间，用边界卡检查手中的两本候选资料。', `Primary request: Lin stands between tall library shelves holding two promising books while a cart of unrelated material blocks the aisle; she checks both books against her small boundary card before moving on.
Scene/backdrop: deep university library stacks
Lighting/mood: shafts of afternoon light, discovery disciplined by scope`),
  story(9, 'audience-goal', 'orient', '先确认交给谁', '研究生林', '课堂汇报、论文章节和工作简报需要不同的证据密度。', '比较三种空白交付版式，选择以导师为首位读者的论文章节。', '交付目标已选择', '后续综合有了明确读者与篇幅约束。', '林在桌上比较课堂讲义、论文章节与简报三种交付版式。', `Primary request: Lin lays three blank deliverable mockups on a table—a classroom handout, a thesis chapter, and a briefing folder—then selects the thesis chapter after picturing her adviser as the first reader.
Scene/backdrop: seminar preparation room
Lighting/mood: warm late afternoon, purposeful audience awareness`),
  story(10, 'scope-saved', 'orient', '边界保存后，桌面能继续走', '研究生林', '过量材料仍在眼前，容易让刚做出的范围失效。', '把范围卡固定在视线内，将未来再看材料移入独立盒子。', '研究边界已保存', '当前工作区只保留本轮真正要处理的材料。', '林把范围卡固定在书桌上方，并把资料整理进不同待办盒。', `Primary request: Lin pins one concise blank scope card above her desk and moves overflowing paper piles into clearly separated future-review boxes; her work surface becomes navigable.
Scene/backdrop: same apartment study transformed from clutter to ordered stations
Lighting/mood: early evening, relief and readiness`),
  story(11, 'query-workshop', 'search', '检索式先小步试跑', '林与图书馆员', '第一次组合包含太多概念，结果模式过于宽泛。', '搭建概念链并移除一块限制条件，对比前后结果分布。', '检索式草稿可编辑', '林得到一条可解释、仍需按数据库调整的起始式。', '林与图书馆员在咨询桌上重组概念卡并比较两组结果分布。', `Primary request: Lin and the male librarian assemble a search string from blank concept tiles, test an over-broad chain, remove one tile, and compare the narrower result pattern on paper.
Scene/backdrop: library consultation desk with abstract dot patterns only
Lighting/mood: neutral task lighting, experimental collaboration`),
  story(12, 'candidate-wave', 'search', '候选潮水先留下来源', '林与档案员', '一次检索带来大量候选，来源与批次容易混在一起。', '把候选卡按数据库与检索批次放入不同托盘。', '检索日志已保存', '每张候选材料都能回到它出现的查询。', '林与档案员把大量候选卡按来源分别放进编号托盘。', `Primary request: Lin and a middle-aged woman archivist receive a wave of blank paper cards from several archive boxes, then sort the cards into source-specific trays while preserving each batch together.
Scene/backdrop: records room with rolling shelves and a large sorting table
Lighting/mood: active morning, ordered response to volume`),
  story(13, 'duplicate-pair', 'search', '相似记录不急着删除', '研究生林', '两条题录标题近似，但版本与来源可能不同。', '在灯桌上并排核对两张记录与对应原文封面。', '重复项待人工确认', '真正重复与不同版本被区分，来源关系被保留。', '林在灯桌上并排核对两张近似题录卡和两份来源封面。', `Primary request: Lin compares two nearly identical paper records on a light table, tracing each one back to a different physical source cover before deciding whether they are duplicates.
Scene/backdrop: quiet archive verification station
Lighting/mood: crisp focused light, forensic care`),
  story(14, 'title-abstract-screen', 'search', '标题不够时，再看摘要', '研究生林', '候选标题与主题相近，但研究对象并不明确。', '先看标题卡，再打开摘要页，最后把材料留在待定区。', '初筛状态已记录', '不确定材料没有被草率纳入或排除。', '林从标题卡翻到摘要页，把仍不确定的材料放入待定托盘。', `Primary request: Lin lifts a title card, opens a longer abstract sheet beneath it, and places the uncertain paper into a clearly separate middle tray rather than the keep or exclude tray.
Scene/backdrop: compact screening desk with three trays
Lighting/mood: soft daylight, deliberate uncertainty`),
  story(15, 'evidence-tradeoff', 'search', '漂亮结论与相关证据', '研究生林', '一篇结论有吸引力却偏离研究对象，另一篇样本小但直接回答问题。', '把两篇论文放在纳入条件两侧，逐项比较相关性与局限。', '两项候选正在比较', '选择依据回到研究边界，而不是结论是否顺眼。', '林在桌上比较两篇方向不同的论文，并用边界卡逐项判断。', `Primary request: Lin weighs two candidate studies side by side: one polished but off-scope and one modest but directly relevant, using her boundary card as the deciding reference.
Scene/backdrop: evening study table with balanced two-column arrangement
Lighting/mood: warm lamp, honest intellectual tension`),
  story(16, 'exclusion-reason', 'search', '排除也留下原因', '研究生林', '排除数量增加后，仅靠记忆无法解释每一次决定。', '把一张偏题材料移入排除盒，同时在理由标签上做无文字记号。', '排除理由已保存', '后来者能够复核这次排除，而不是只看到消失的记录。', '林把偏题材料放进排除盒，并为它附上一张理由标签。', `Primary request: Lin moves one off-scope paper into an exclusion box and attaches a color-coded blank reason tag before closing the lid, keeping the decision trace visible.
Scene/backdrop: orderly screening station with open ledger
Lighting/mood: calm afternoon, accountable decision`),
  story(17, 'grey-literature-check', 'search', '灰色来源单独核验', '林与档案员', '一份机构报告可能补充缺口，但缺少正式出版信息。', '戴手套检查来源页、日期痕迹与归档路径，把它标为待核。', '来源状态为待核验', '材料被保留为线索，却没有冒充已确认的学术证据。', '林与档案员戴手套检查一份机构报告的来源页和归档盒。', `Primary request: Lin and the archivist inspect an unbranded institutional report with gloves, checking its source page, date marks, and archive box before placing it in a pending-verification sleeve.
Scene/backdrop: archive reading room
Lighting/mood: subdued neutral light, cautious verification`),
  story(18, 'missing-language', 'search', '语种缺口变成任务', '研究生林', '英文候选很多，中文情境证据明显不足。', '在双栏来源墙前把稀疏一侧圈出，并新增一组中文检索卡。', '语种缺口已识别', '缺口被转成下一轮具体检索动作。', '林面对一侧密集一侧稀疏的来源墙，为稀疏一侧补上检索卡。', `Primary request: Lin stands before a two-column source wall, notices that one language side has far fewer cards, circles that sparse area, and prepares a fresh cluster of search tiles for it.
Scene/backdrop: project room with abstract card wall
Lighting/mood: cool daylight, gap becomes action`),
  story(19, 'peer-double-screen', 'search', '分歧不被平均掉', '林与同伴', '两人对同一条候选材料作出不同筛选判断。', '各自展示选择卡，回到纳入条件逐条说明理由。', '筛选分歧待协商', '争议保留在记录中，并形成更清楚的判断边界。', '林与同伴在双屏工作台前展示不同判断卡并讨论依据。', `Primary request: Lin and a female peer reviewer sit at a dual-screen desk, each holding a different decision card for the same study, then point back to the shared boundary sheet to resolve the disagreement.
Scene/backdrop: collaborative library workstation
Lighting/mood: evening task light, respectful disagreement`),
  story(20, 'screening-checkpoint', 'search', '检查路径，而不只看数量', '林与导师', '筛选已完成一轮，但遗漏风险仍不清楚。', '在白板前回放检索批次、待定项与排除理由。', '筛选检查点已完成', '下一轮补查聚焦到可解释的缺口。', '林与导师在白板前回放检索批次、待定项与排除路径。', `Primary request: Lin and her adviser review a physical pathway of search batches, pending cards, and exclusion trays on a whiteboard, focusing on where evidence might still be missing rather than celebrating volume.
Scene/backdrop: seminar room checkpoint
Lighting/mood: clear morning, rigorous pause`),
  story(21, 'full-text-return', 'evidence', '摘要之后回到原文', '研究生林', '摘要给出方向，却不足以判断方法与限制。', '逐页阅读原文，在不同纸条上摘出对象、方法、发现和限制。', '证据提取进行中', '每条发现都有可回查的原文位置。', '林在安静桌前逐页阅读论文，并把方法、发现与限制分开摘录。', `Primary request: Lin reads a full paper page by page, placing separate blank extraction slips for participants, method, finding, and limitation beside the open source.
Scene/backdrop: silent reading room desk
Lighting/mood: concentrated midday light, slow verification`),
  story(22, 'sample-comparison', 'evidence', '相同结论背后的样本不同', '研究生林', '两项研究结论相似，但研究对象与规模差异明显。', '用两组人物轮廓卡比较样本构成与适用边界。', '样本差异已标注', '结论不再被错误地当作可以直接合并。', '林用两组不同规模的人物轮廓卡比较两项研究的样本。', `Primary request: Lin compares two study samples using two clearly different groups of simple human-shaped paper tokens, noticing that similar findings came from unlike populations.
Scene/backdrop: evidence lab table, no digital interface
Lighting/mood: clean top light, analytical clarity`),
  story(23, 'methods-table', 'evidence', '方法差异摆到同一张桌', '林与方法顾问', '多项研究使用不同测量方式，结果无法直接并列。', '把量表、访谈和观察三类方法卡排成对照矩阵。', '方法字段已归一', '可以看见哪些分歧可能来自测量方法。', '林与方法顾问把量表、访谈和观察卡排成清晰对照矩阵。', `Primary request: Lin and a method adviser arrange three distinct method families—questionnaire sheets, interview cards, and observation notes—into a comparison matrix on a long table.
Scene/backdrop: methodology workshop room
Lighting/mood: neutral studio daylight, structured comparison`),
  story(24, 'conflicting-findings', 'evidence', '相反证据同时留在桌上', '研究生林', '两组研究对同一关系给出相反方向结果。', '把两组证据放在跷跷板式桌面两侧，追查情境与方法差异。', '冲突证据已并置', '分歧成为分析对象，而不是被删掉的噪声。', '林在桌面两侧摆放方向相反的证据组，并检查中间的情境卡。', `Primary request: Lin keeps two opposing evidence clusters visible on both sides of a balanced table, tracing the disagreement back through context and method cards instead of removing either side.
Scene/backdrop: dark teal evidence room
Lighting/mood: dramatic but grounded side light, constructive tension`),
  story(25, 'limitations-highlight', 'evidence', '限制写在发现旁边', '研究生林', '关键发现很醒目，限制却藏在原文后部。', '把限制摘录卡贴到对应发现卡旁，保持两者成对。', '发现与限制已绑定', '综合时不会只带走最漂亮的结论。', '林把限制卡紧贴在对应发现卡旁，形成不可分开的证据对。', `Primary request: Lin pairs every finding card with its matching limitation card, physically clipping each pair together so the caveat cannot be separated from the result.
Scene/backdrop: intimate evidence desk with brass clips
Lighting/mood: warm focused light, disciplined honesty`),
  story(26, 'grade-confirmation', 'evidence', '证据等级由人确认', '研究生林', '系统提示某条记录字段完整，但质量仍需人工判断。', '比较两张等级建议卡，回看方法页后亲手盖下确认印记。', '人工证据等级已确认', '建议与最终判断分别留下，不伪装成自动结论。', '独自工作的林在两张只有圆点数量差异的证据等级卡之间比较，回看原文后亲手确认。', `Primary request: Lin works alone at the desk. Two suggested evidence-grade cards using only different counts of plain solid circles lie flat beside the open source method page; Lin compares them and uses her right hand to place one plain confirmation token beside her chosen card.
Scene/backdrop: verification desk with paper ledger
Lighting/mood: crisp task light, explicit human responsibility
Extra constraint: exactly two visible human hands, both belonging to Lin; no other person or hand; grade cards contain only plain solid circles; absolutely no stars, letters, numbers, writing, seals with glyphs, or pseudo-text`),
  story(27, 'citation-trace', 'evidence', '每个主张都能回到来源', '研究生林', '一条综合句找不到最初支持它的原文位置。', '沿着线绳从主张卡反向追到摘录、题录和原始页。', '引用链已修复', '读者可以从结论逐步回到来源。', '林沿着线绳从主张卡追到摘录卡、题录卡与打开的原文。', `Primary request: Lin follows a physical red thread from a claim card back through an excerpt slip and citation card to the exact open source page, repairing a broken trace.
Scene/backdrop: archive-style traceability wall and desk
Lighting/mood: focused evening light, satisfying reconnection`),
  story(28, 'theme-clusters', 'evidence', '证据开始形成主题', '研究生林', '摘录数量增加后，逐篇排列已经看不见关系。', '把证据卡按共同机制分成主题簇，同时保留跨簇连接。', '主题标签已形成', '支持、分歧与缺口在同一张关系图上出现。', '林把大量证据卡聚成几个主题簇，并用细线保留跨簇联系。', `Primary request: Lin groups many evidence cards into several meaningful thematic clusters while preserving a few cross-cluster threads that show tension and overlap.
Scene/backdrop: large cork work wall
Lighting/mood: late afternoon, patterns emerging from complexity`),
  story(29, 'bias-reflection', 'evidence', '给偏好留一面镜子', '研究生林', '自己更容易重视支持预期的研究。', '把最喜欢的证据组移到一旁，重新检查反例和低等级证据。', '偏好风险已记录', '不确定性与反例重新进入综合。', '林在镜面旁把偏爱的证据组移开，重新查看被忽略的反例。', `Primary request: Lin pauses beside a subtle mirror, moves her favored evidence cluster aside, and deliberately reopens a smaller counterexample stack she had overlooked.
Scene/backdrop: quiet study at night
Lighting/mood: introspective blue-green shadows, honest self-correction`),
  story(30, 'missing-data-task', 'evidence', '缺失字段变成核验队列', '研究生林', '多条记录缺少年份、来源或方法信息。', '把不同缺口的卡片排入可执行的核验队列。', '质量缺口已排队', '下一次工作从最影响判断的缺失项开始。', '林把缺年份、缺来源和缺方法的卡片排成优先核验队列。', `Primary request: Lin sorts incomplete evidence cards into a prioritized verification queue, placing missing-source and missing-method cards ahead of cosmetic gaps.
Scene/backdrop: morning project desk with stepped trays
Lighting/mood: bright practical light, actionable recovery`),
  story(31, 'three-structures', 'synthesize', '三种综合结构同场比较', '研究生林', '相同证据可以按时间、主题或争议组织。', '在地面展开三张不同结构地图，逐一查看会突出与隐藏什么。', '综合方案待选择', '选择前可以比较真实差异，而不是接受唯一推荐。', '林站在三张时间线、主题树与争议图式的综合地图之间。', `Primary request: Lin stands over three distinct evidence layouts on the floor—a timeline path, a branching theme tree, and a two-sided controversy map—comparing what each reveals and hides.
Scene/backdrop: spacious studio research room
Lighting/mood: high soft daylight, consequential choice`),
  story(32, 'timeline-structure', 'synthesize', '时间线显示变化', '研究生林', '政策与研究结论跨年份变化，直接按主题会丢失转折。', '把关键证据按时间铺开，标出前后定义变化。', '时间线方案已预览', '历史转折清楚，但横向争议仍需补充。', '林沿长桌按时间排列证据卡，停在一个明显的转折位置。', `Primary request: Lin lays evidence cards along a long chronological table and pauses at a visible turning point where definitions and findings change direction.
Scene/backdrop: long archive table
Lighting/mood: raking afternoon light, sense of progression`),
  story(33, 'theme-tree', 'synthesize', '主题树看见机制', '研究生林', '材料来自不同年份，但围绕几个共同机制反复出现。', '把主张分成树干与分支，将证据挂到对应机制。', '主题树方案已预览', '机制关系清楚，但时间变化被弱化。', '林在墙面搭建一棵由主题主干和证据分支组成的纸卡树。', `Primary request: Lin builds a branching paper tree on the wall, placing mechanism cards on the trunk and evidence clusters on the matching branches.
Scene/backdrop: project studio wall
Lighting/mood: warm indirect light, organic structure without decoration`),
  story(34, 'controversy-map', 'synthesize', '争议图保留分歧', '研究生林', '两派证据持续冲突，平均化会失去问题核心。', '把支持与反对证据分列两侧，在中间放置情境差异。', '争议图方案已预览', '冲突清楚，但需要更强的来源核验。', '林把支持与反对证据放在两侧，并在中间排列情境差异卡。', `Primary request: Lin creates a two-sided controversy map, keeping supporting studies on one side and opposing studies on the other with context cards bridging the middle.
Scene/backdrop: dark project wall with balanced composition
Lighting/mood: focused spot lighting, rigorous tension`),
  story(35, 'structure-comparison', 'synthesize', '不是选最好，而是选最合适', '林与同伴', '三种结构各有优势，没有一套适合所有交付。', '用读者、期限、证据量三张约束卡逐项比较方案。', '结构差异已对照', '林能说明选择理由，也能看见主动放弃的部分。', '林与同伴用三张约束卡比较桌上的三种综合结构。', `Primary request: Lin and her peer compare the three synthesis layouts against three concrete constraint cards representing reader, deadline, and evidence volume.
Scene/backdrop: collaborative studio table
Lighting/mood: neutral daylight, transparent tradeoffs`),
  story(36, 'synthesis-confirm', 'synthesize', '建议之后再由人确认', '研究生林', '系统建议争议图，但林的交付对象更需要机制脉络。', '把建议卡与个人选择卡分开放置，确认主题树并记录原因。', '综合结构已人工确认', '推荐与确认没有混成同一个系统动作。', '林把系统建议卡放在一侧，亲手确认另一张主题树选择卡。', `Primary request: Lin keeps a suggested layout card visibly separate from her own confirmation card, then chooses the theme-tree structure and records the reason in a paper ledger.
Scene/backdrop: clean decision desk
Lighting/mood: warm decisive light, human agency`),
  story(37, 'argument-draft', 'synthesize', '从逐篇复述走向论证', '研究生林', '初稿仍按论文顺序堆叠，读者看不见主张。', '先放主张卡，再配支持证据、反例与限定条件。', '第一段论证已形成', '段落有了可复核的论证骨架。', '林在夜晚依次摆放主张、支持证据、反例与限定条件卡。', `Primary request: Lin composes the first real argument by placing a claim card first, then supporting evidence, a counterexample, and a boundary card in a deliberate sequence.
Scene/backdrop: apartment desk at night
Lighting/mood: amber lamp against deep teal, breakthrough after slow work`),
  story(38, 'counterexample-revision', 'synthesize', '反例让句子变得更准确', '研究生林', '一条反例削弱了原本过强的主张。', '划掉过度概括的草稿，把限定条件插入主张与证据之间。', '主张已降强度', '结论更窄，却更忠于现有证据。', '林在草稿旁加入反例卡，并把限定条件插进论证结构。', `Primary request: Lin revises an overconfident draft after placing a counterexample card beside it, inserting a clear boundary card between the claim and its evidence.
Scene/backdrop: close but landscape writing desk scene
Lighting/mood: cool dawn, precise correction`),
  story(39, 'quality-review', 'synthesize', '交付前先看缺口', '林与导师', '综合已经成形，但来源、新近性和反证分布不均。', '共同查看三组质量缺口卡，决定先补哪一项。', '质量报告已复核', '返工顺序由风险决定，而不是继续润色表面。', '林与导师在桌前查看来源、新近性与反证三组质量缺口。', `Primary request: Lin and her adviser review three quality-gap clusters—source trace, recency, and counterevidence—and move the highest-risk cluster to the front of the revision queue.
Scene/backdrop: seminar review table
Lighting/mood: clear daylight, constructive scrutiny`),
  story(40, 'version-archive', 'synthesize', '旧版本不被新建议覆盖', '研究生林', '反馈带来新结构提案，但上一版仍需可追溯。', '把已确认版本封存入档案袋，把新提案放在旁边等待确认。', 'V1 已归档，V2 待确认', '版本变化可以比较，历史判断不会消失。', '林把已确认版本装入档案袋，并将新提案单独放在待确认托盘。', `Primary request: Lin seals the confirmed first version in an archive envelope and places a new proposal beside it in a separate pending-confirmation tray.
Scene/backdrop: orderly versioning desk
Lighting/mood: quiet evening, continuity and control`),
  story(41, 'export-choice', 'deliver', '先选择要带走什么', '研究生林', '完整备份、题录表与综合稿适合不同用途。', '比较三种交付包的内容与继续方式，选择本次需要的组合。', '导出类型待确认', '交付文件与使用场景一一对应。', '林在桌上比较完整备份、题录表与综合稿三种交付包。', `Primary request: Lin compares three distinct physical delivery bundles—a complete archive, a citation table, and a synthesis document—before choosing the combination her adviser needs.
Scene/backdrop: clean delivery preparation table
Lighting/mood: bright morning, practical choice`),
  story(42, 'csv-check', 'deliver', '表格先抽查再交付', '研究生林', '导出表格可能丢失中文字符或列顺序。', '打开打印预览样张，逐列核对几个中英文记录。', 'CSV 导出待人工确认', '编码与字段问题在离开工作台前被发现。', '林用打印样张逐列核对中英文题录与字段顺序。', `Primary request: Lin checks a printed spreadsheet proof row by row, comparing several Chinese and English citation cards before approving the table export.
Scene/backdrop: daylight desk with grid paper, no readable text
Lighting/mood: crisp neutral light, meticulous final check`),
  story(43, 'markdown-handoff', 'deliver', '综合稿说明如何继续', '研究生林', '一份成稿没有说明证据边界，接手者仍会迷路。', '在综合稿旁加入来源目录、限制卡与下一步说明。', 'Markdown 交付包已组成', '读者既能阅读结论，也能继续核验。', '林把综合稿、来源目录、限制卡与下一步说明整理为一套交付包。', `Primary request: Lin assembles a handoff bundle with a main synthesis document, source index, visible limitation card, and a next-step note, all clearly related but separate.
Scene/backdrop: library delivery desk
Lighting/mood: warm afternoon, thoughtful completeness`),
  story(44, 'mobile-note', 'deliver', '通勤线索先被接住', '研究生林', '新线索出现在通勤途中，无法立即完成核验。', '在手机上记录来源外观与待核问题，标记回桌面继续。', '移动端线索已保存', '线索没有丢失，也没有被误当作已确认材料。', '林在地铁座位上用手机记录一本资料的待核线索。', `Primary request: Lin sits on a commuter train and records a new source lead on her phone while keeping the physical clue card visible, clearly marking it for later verification rather than treating it as confirmed.
Scene/backdrop: ordinary city metro carriage
Lighting/mood: soft morning transit light, continuity across devices`),
  story(45, 'broken-citation-review', 'deliver', '同行从断点反向检查', '林与同伴', '同伴点击一处主张后无法顺利回到原始来源。', '沿交付包逐层查找，在断开的引用链位置停下并标记。', '引用断点已发现', '交付前出现了可修复的真实问题。', '同伴从综合稿追查来源，在断开的引用链处示意林暂停。', `Primary request: A peer reviewer traces a claim backward through Lin's handoff bundle, stops at a broken citation link represented by a visibly separated thread, and signals the exact repair point.
Scene/backdrop: shared review desk
Lighting/mood: neutral evening light, useful friction`),
  story(46, 'scope-feedback', 'deliver', '范围反馈回到边界', '林与导师', '导师认为结论覆盖了项目未研究的人群。', '把反馈卡放回最初边界图，对比当前主张超出的区域。', '范围反馈已记录', '下一版会收窄主张，而不是只改措辞。', '林与导师把反馈卡放回边界图，指出主张超出的区域。', `Primary request: Lin and her adviser place a feedback card back onto the original boundary map, revealing where the current claim extends beyond the studied population.
Scene/backdrop: seminar table with earlier materials revisited
Lighting/mood: focused daylight, feedback reconnects to origin`),
  story(47, 'source-feedback-plan', 'deliver', '来源不足会重开检索', '研究生林', '同伴指出近三年英文证据不足。', '把反馈拆成语种、年份与数据库三个检索任务，重新打开候选托盘。', '下一轮检索提案已形成', '反馈改变了下一轮计划，而不是停留在评论里。', '林把来源不足反馈拆成三张任务卡，并重新打开候选资料托盘。', `Primary request: Lin turns a missing-sources feedback card into three concrete task cards for language, recency, and search venue, then reopens the candidate tray.
Scene/backdrop: project desk transitioning back into search mode
Lighting/mood: renewed morning energy, feedback becomes work`),
  story(48, 'v2-comparison', 'deliver', 'V1 与新提案并排确认', '研究生林', '新反馈改变了检索重点与综合结构，需要决定是否形成 V2。', '并排查看已确认 V1 与待确认提案的差异卡。', 'V2 等待用户确认', '变化被明确展示，不会静默覆盖旧版本。', '林并排比较封存的 V1 与带有差异卡的新提案。', `Primary request: Lin compares a sealed first-version folder with a new pending proposal, using a small set of visible difference cards before deciding whether to confirm version two.
Scene/backdrop: version comparison table
Lighting/mood: balanced neutral light, transparent change`),
  story(49, 'mentor-handoff', 'deliver', '导师接过完整上下文', '林与导师', '单独一份成稿不足以解释筛选与限制。', '把边界、检索记录、排除理由、证据与综合稿逐件交接。', '研究包已交付', '导师能够从任一争议点继续复核。', '林向导师交接包含边界、筛选、证据与综合稿的完整研究包。', `Primary request: Lin hands her adviser a coherent research package containing the boundary map, search log, exclusion ledger, evidence folders, and final synthesis as distinct visible components.
Scene/backdrop: university office handoff
Lighting/mood: warm late afternoon, earned trust without celebration`),
  story(50, 'morning-continuation', 'deliver', '交付之后，问题仍然开放', '研究生林', '第一轮已经交付，新反馈与未答问题仍在桌上。', '把归档包放上书架，打开一张新的空白问题卡。', '本轮完成，可继续迭代', '研究有了可交接的停靠点，也保留下一轮入口。', '清晨的林把交付包归档后，在安静书桌上打开新的空白问题卡。', `Primary request: At sunrise, Lin places the completed research package on a shelf, returns to a clear desk, and opens one fresh blank question card for the next iteration.
Scene/backdrop: same apartment study now calm and ordered
Lighting/mood: soft gold dawn over deep teal shadows, quiet continuation`)
];
