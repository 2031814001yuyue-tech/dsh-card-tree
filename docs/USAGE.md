# 使用说明（详细）

> 快速上手看 [README](../README.md)；安装/更新/卸载看 [INSTALL.md](../INSTALL.md)；
> 内部实现与 HTTP 合同看 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 入口

**左侧栏「对话树」图标**（和 插件 / 任务看板 / 自动化任务 并列）→ 全屏工作台：
左栏卡片树，右栏选中卡片的问答，底部固定输入框。想回会话就点左侧栏对应的会话。

页面切换用 `layout.selectPanel('dsh-card-tree')`，回会话用 `selectPanel(null)`。

## 会话输入框接管（树模式）

被绑定过的会话（`state.json` 的 `sessions` 字段：`sessionId → projectId`），
底部原生输入框会被替换成卡片树输入条：

- 显示项目名、卡片数、最近一条回答预览、提问框、「展开对话树」「退出对话树」
- 在这里提问 = 在这棵树里开一张新的**根卡片**，并流式写入回答
- 原生输入框被藏起来，不会出现「两个输入框不知道往哪打字」
- 「退出对话树」解绑并自动重挂载会话，原生输入框回来
- 未绑定的会话完全不受影响

绑定目前只有接口层（`POST /session {op:'bind', sessionId, projectId?}`）；界面上已经没有绑定入口。

## 生长方式

输入框底部工具行只有一个模式胶囊 `↳ 深入 ▾`，点开才是选项（每项一句说明，当前项打勾）：

| 模式 | 语义 | 上下文 |
|---|---|---|
| **深入** | 以上游卡片为主题往下一层 | 根 → 父卡片的全部问答 |
| **追问** | **不新增节点**，在当前卡片里接着问 | 祖先链 + 本卡问答 + 本卡已有的追问线程 |
| **发散** | 同一层级开一条新线程 | 同「深入」，但和兄弟卡片互不影响 |
| **独立** | 新建一张**不连到树里**的卡片 | 只有它自己的问题，不继承任何上下文 |

- 默认「深入」：打字、Enter 即走；改过方向后会被记住（localStorage），非默认方向时胶囊高亮；
  没有选中卡片时胶囊隐藏（此时提问只会开新树根，或按 `独立` 建一张孤卡）
- **分支重答**在卡片动作栏：`重答 ▾` → `重答`（同上下文重跑）或 `分支重答`（保留这一版，从同一问题另开同层卡片）
- **追问**以缩进细线的形式挂在卡片回答下面（问题 + Markdown 回答 + 工具步骤 + 运行中「停止」），
  卡片不新增节点；左栏该行显示 `+N` 表示追问条数
- **独立**卡片在左栏有「独立」小标签，之后也能在全览里用 ↗ 手柄拖进树里
- 其余动作：复制（Markdown）、删除、停止、项目设定（项目级 system prompt，支持 `{title}` 占位）

## 界面细节

- 顶栏一行：树图标 · 可改名的项目标题 · `▾` 项目切换（含新建）· 「N 张卡片 · 模型名」·
  **全览** · 列表面板开关 · `⋯`（项目设定 / 导出 / 导入 / 新建 / 删除项目）
- 左栏：按层级缩进，右侧数字是子卡片数；有子卡片的行左侧 `▾` 可收起/展开该分支（状态记在 localStorage）
- 左栏与右栏之间有**可拖动分隔条**（190–620px，松手记住）；顶栏面板图标可一键收起整个列表
- 左栏标题下方是**搜索框**：按问题与回答在整棵树里过滤，命中卡片平铺显示（忽略层级），清空恢复树形
- `⋯` 里可**导出/导入项目 JSON**；删除项目后提示条上的「撤销」可恢复（项目级撤销）
- 详情页顶部有**上下文徽标**（`上下文 ~12k/16k · 2 已折叠`）：本次实际发出去的估算用量、预算、折叠张数
- 生成被中断（点停止 / 连接断 / DSH 重启）时卡片进入**「生成中断」**：保留已生成部分，
  详情页出现「继续」，以追问形式让模型接着写，而不是从头重来

## 全览（结构图编辑器）

| 操作 | 做法 |
|---|---|
| 挪位置 | 按住节点拖动，松手记住（`card.pos`，只在本地，不影响对话） |
| 改分支 | 悬停 → 右上角 ↗ 手柄拖到另一张卡片上松手（连同子树挂过去） |
| 建引用 | 悬停 → 右上角 ⇢ 手柄拖到目标卡片，建立**虚线引用** |
| 删引用 | 直接点那条虚线，或卡片详情里引用小卡片的 `×` |
| 删节点 / 分支 | 悬停 → 右上角 × → 确认弹层写明删几张 → 确认；左栏每行悬停也有垃圾桶 |
| 回到自动布局 | 提示行右侧「自动排列」，清掉所有手动位置 |

悬停节点弹出气泡预览（模式 / 时间 / 问题 / 回答摘要）；**点节点直接进入该卡片并自动关闭全览**。
连线拒绝成环（不能挂到自己的子卡片下）和正在生成的卡片。

**引用边**：虚线、不改层级，只让被引用卡片的问答进入本卡上下文（最多 8 张、不能引用自己、
对方未答完时跳过）。同一对卡片之间**最多一条**虚线：A→B 后再 B→A 不会多画；载入旧数据时
重复/反向引用会被合并。删掉卡片时指向它的虚线自动消失。方向仍保留在数据里（A→B 只影响 A 的上下文）。

## 它能读写你的文件吗？

**只读，不会改你的机器。** 每次回答仍是一次 `ctx.get('llm').stream({provider, model, messages, system, tools})`，
只是带一份只读工具白名单。内置的通用部分：

| 类别 | 例子 | 需要绑会话吗 |
|---|---|---|
| 只读文件/检索 | `read`、`glob`、`grep`、`web_search`、`web_fetch`、`working_directory` | 要 |
| 只读会话/任务查询 | `session_search`、`session_event_read`、`task_board_list`、`list_agents` | 不用 |

链路：模型返回 `tool-call` → 宿主 `ctx.get('tools').execute(...)` → 结果作为 `tool` 消息塞回 →
再流一轮，最多 6 轮。白名单之外全部挡掉（`write` / `edit` / `pwsh` / `terminal_*` /
`task_board_create` / 发消息类接口），文件工具仍受 DSH 沙箱与审批约束。
回答下方折叠显示「工具调用 · N」，`state.json` 里也存每张卡的 `steps`。

### 加自己机器上的只读工具（不进仓库）

内置名单故意只放任何机器都有的通用工具。你机器上额外装的插件（示例：`my_plugin_status`）
写在数据目录的 `tools.json` 里，和 `state.json` 同级：

```json
{
  "tools": ["my_plugin_status", "my_plugin_read"],
  "prefixes": ["my_plugin_"],
  "params": { "my_plugin_read": ["info", "list"] }
}
```

- `tools`：精确名字；`prefixes`：整前缀信任（只放你确认过「这个插件只会读」的前缀）
- `params`：带 `action`/`mode` 参数的工具，只放行查询类取值（防止同一工具里藏写操作）
- 改完刷新页面或重载插件生效；`/dsh-card-tree/health` 里能看到 `readonly.builtin` / `readonly.local` 数量
- 写错 JSON 不会崩：控制台打一条 warning，按空配置继续

这样公开的源码里永远看不到你个人装了哪些插件。

## 附件：图片与文件

输入框左下角 `+`，或直接 `Ctrl/⌘ + V` 粘贴（剪贴板里的图片/文件），最多 6 个、单个 12 MB。

| 类型 | 处理方式 |
|---|---|
| 图片（PNG/JPEG/WebP/GIF） | 走 DSH 附件服务，作为 `image` 块；当前模型看不了图时自动换一个支持的模型并在页面提示 |
| 文本类（txt/md/csv/json/代码） | 内联成文本块，任何模型都能读；内容落盘在 `attachments/`，`state.json` 只记文件名与大小 |
| 其它二进制（pdf/docx/zip） | 走 DSH 附件服务，作为 `file` 块发送 |

附件跟着卡片走（`card.attachments` / `followUp.attachments`），重答、复制、全览都还在；
发送前顶部显示待发附件小卡片，可逐个移除。

## 模型与思考程度

模型取自 DSH 当前默认（`agentDefaultModel.currentSelection()`），也可以在输入框左下角模型按钮里自选；
列表来自 `llm.listProviders()` + `listModels()`。选择写在 `state.json` 的 `model` 字段；
按项目选择时写 `project.model`（项目级模型）。选「跟随 DSH 默认」回到默认。

模型按钮右边还有**「思考程度」**按钮（模型支持时出现）：选项来自
`llm.resolveModelInfo(...).reasoning.efforts`，写 `state.model.reasoningEffort`，生成时通过
`llm.stream({..., reasoningEffort})` 传入；选「模型默认」回到 `reasoning.defaultEffort`。

## 上下文是怎么拼的

把「根 → 当前卡片父级」链上所有有回答的卡片按 `user / assistant` 交替拼进 messages，最后接当前问题。
**引用卡片**以 `【引用卡片·<对方问题>】` + `<对方回答>` 插在祖先链之后，system 里说明「不在父链上、按需参考」。
若模型不接受这种角色序列，自动退化成单轮文本（历史内嵌在 user 消息里），换模型不会直接报错。

**预算是硬的**：按模型上下文窗口 × 0.55，扣 system 与输出余量后作为预算；估算「中文≈1 字/token、
英文≈4 字符/token」。祖先从最老的开始折算：先压成前 320 字，仍超就整张丢弃；引用卡片独立预算
（最多 25%、单张 2400 字）；工具结果单条 8000、合计 24000 字符。折叠/丢弃张数写进 `start` 事件与详情徽标。

system prompt 还会告诉模型「你在对话树里的位置」：项目名、层级、模式、上级问题，
以及「上游是问答成对的卡片链，不是聊天记录」。

## 数据、备份与迁移

- 数据目录：`%USERPROFILE%\.dsh\card-tree\`
  - `state.json`：项目/卡片/绑定/模型（原子写；损坏时改名为 `state.json.broken`，以空状态启动，不覆盖）
  - `attachments/`：文本附件正文
  - `backups/`：每次改写前自动快照，`state-<UTC 时间>.json`，最多 30 份、最快 5 分钟一份
- 载入时把上次中断的 `running` 卡片/追问标成「生成中断」（有内容）或「上一次生成被中断」（无内容）
- 绑定失效（会话或项目被删）会自动清理

**从备份恢复**：

```powershell
Get-ChildItem "$env:USERPROFILE\.dsh\card-tree\backups" | Sort-Object LastWriteTime -Descending |
  ForEach-Object { $s = Get-Content $_.FullName -Raw | ConvertFrom-Json
    "{0}  {1}  {2}" -f $_.Name, $s.projects.Count, (($s.projects | ForEach-Object { $_.title }) -join ' / ') }
```

挑中后关掉插件面板，把该备份复制成 `state.json`（先备份当前文件），再重新点开「对话树」。

**换机器**：拷贝整个 `%USERPROFILE%\.dsh\card-tree\` 目录（`state.json` + `attachments/`；
只搬 `state.json` 会让文本附件变成「文件缺失」）。会话 id 对不上时绑定自动清理，卡片不受影响。

## HTTP / SSE

插件自己用，也可以脚本调用。完整表见 [ARCHITECTURE.md §3](ARCHITECTURE.md)，要点：
`GET /state`、`GET /health`、`GET /models`、`GET /effort`、`POST /model`、`POST /project`、`POST /session`、
`POST /card`（含 `reparent` / `layout` / `follow` / `ref`）、`POST /send`（SSE）、`POST /stop`。
SSE 帧：`start` / `delta`（**累计文本**）/ `tool` / `notice` / `done` / `aborted` / `error`；
`start` 带 `runId` 与上下文预算结果，追问帧额外带 `followUpId`。
`saveState` 写盘失败直接返回 500；每次成功写入自增 `revision`。

## 用到的 DSH 座位

| 座位 | 用途 |
|---|---|
| `main`（keyed，key = `dsh-card-tree`） | 全屏「对话树」中央页面 |
| `sidebar.panellist`（id = `dsh-card-tree`） | 左侧栏面板图标 |
| `conversation.composer`（chain，priority 50） | 树模式会话里替换原生输入框 |

启动时会探测座位与 `llm` / `tools` / `attachments` / `agentDefaultModel` 服务，
缺失就在面板顶部显示黄色横幅，也可访问 `/dsh-card-tree/health` 查看。
