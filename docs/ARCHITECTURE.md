# 架构说明

一份给未来改这个插件的人（也包括未来的我）的速查。分三块：**运行时结构**、**数据模型**、**改动指引**。

## 1. 运行时结构

插件是一个标准 DSH bundle，两个半边：

```
             ┌───────────────────────────── DSH Web UI ─────────────────────────────┐
             │  main(keyed) 页面       sidebar.panellist 图标    conversation.composer │
             └───────────────▲──────────────────▲──────────────────────▲────────────┘
                             │                  │                      │
                     client.js（React，单文件，通过 window.__ModuleLoader__ 加载）
                             │  fetch('/dsh-card-tree/*')  + SSE
                             ▼
             ┌──────────────────────────────────────────────────────────────┐
             │ index.js（宿主半边，apply(ctx) 内注册 webServer prefix 路由）   │
             │   ├─ 状态：~/.dsh/card-tree/state.json（原子写）                │
             │   ├─ 模型：ctx.get('llm').stream(...) / agentDefaultModel       │
             │   ├─ 工具：ctx.get('tools').execute(...)（只读白名单，≤6 轮）    │
             │   └─ 附件：ctx.get('attachments').saveImage / admitEncodedFile │
             └──────────────────────────────────────────────────────────────┘
```

两条链路都是**插件自己的**，不复用 DSH 的会话消息：卡片树不是会话，只是借用
`conversation.composer` 在「被绑定的会话」里替换输入框。这一点是刻意的——见第 4 节。

## 2. 数据模型（state.json）

```jsonc
{
  "version": 1,
  "revision": 12,                                    // 每次成功写盘 +1
  "savedAt": "ISO",
  "activeProjectId": "p_xxx",
  "sessions": { "<sessionId>": "<projectId>" },   // 会话 ↔ 树绑定
  "model": { "provider": "...", "model": "...", "reasoningEffort": "..." } | null,
  "projects": [
    {
      "id": "p_xxx",
      "title": "项目名",
      "system": "项目专属背景/规则",             // 可选，拼进 system prompt
      "model": { ... } | null,                   // 可选，项目级模型覆盖（优先于顶层 model）
      "cards": [
        {
          "id": "c_xxx",
          "parentId": "c_yyy" | null,           // 唯一的树结构来源
          "mode": "root" | "child" | "diverge" | "branch" | "isolated",
          "prompt": "问题",
          "answer": "回答（Markdown）",
          "status": "idle" | "running" | "done" | "partial" | "error",
          "runId": "run_xxx" | null,             // 正在生成的那一次的 id（/stop 用它精确定位）
          "error": null | "错误文本",
          "stats": { "approxTokens", "budget", "foldedCards", "droppedCards", "droppedRefs", "refs" },
          "tools": ["read", "web_search"],        // 本轮用到的工具名
          "steps": [{ "name", "arguments", "ok", "preview" }],
          "followUps": [                         // 卡片内的追问线程：不新增节点
            {
              "id": "f_xxx",
              "prompt": "追问",
              "answer": "回答（Markdown）",
              "status": "idle" | "running" | "done" | "partial" | "error",
              "error": null | "错误文本",
              "tools": [], "steps": [], "stats": null,
              "attachments": [ /* 同 card.attachments */ ],
              "createdAt": "ISO", "updatedAt": "ISO"
            }
          ],
          "attachments": [
            // 文本类附件内容落盘在 ~/.dsh/card-tree/attachments/，state 里只留指针
            { "kind": "text",  "name", "bytes", "chars", "truncated", "file": "attachments/att-….txt" },
            { "kind": "image", "name", "bytes", "mediaType", "ref": { ... } },
            { "kind": "file",  "name", "bytes", "ref": { ... } }
          ],
          "refs": ["c_zzz"],                      // 虚线引用：只进上下文，不改树结构，最多 MAX_REFS=8
          "createdAt": "ISO", "updatedAt": "ISO"
        }
      ]
    }
  ]
}
```

不变式：

- `parentId` 是树的唯一真相，兄弟顺序 = 数组顺序。
- `card.pos`（可选）只是全览的手动坐标，不参与任何上下文装配；`{op:'layout'}` 写、`'reset'` 清。
- 改父节点走 `{op:'reparent'}`：会拒绝成环（`isDescendant`）和 `running` 中的卡片，并把 `mode` 同步成 `child`/`root`。
- `mode: "isolated"` 的卡片 `parentId` 恒为 `null`，不继承任何上下文；之后仍可在全览里用 ↗ 手柄手工挂到树上。
- `followUps` 只是卡片内部的问答线程：不进 `childrenOf`、不参与树结构、不影响 `parentId`；追问的上下文 =
  祖先链 + 本卡片问答 + 本卡片里更早的追问（`answeredFollowUps`），见 `buildMessages(..., {followUp})`。
- `refs` 是**引用边**（全览里的虚线）：只影响上下文，不影响 `parentId`/层级；`{op:'ref'}` 增删，
  最多 `MAX_REFS = 8`、不能引用自己、目标未答完时 `resolvedRefs` 会跳过；删除卡片时其它卡片的 `refs` 会被清掉。
  一对卡片**最多一条虚线**：反向引用（B 已指向 A 时再 A → B）是 no-op；`loadState` 里的 `pruneRefs(project)`
  会把旧数据里的重复 id 和一对反向引用折叠成一条，客户端画线时也按无序对去重。
- 每张卡片同时至多一次生成：`/send` 前会对同卡片其它 run 调 `abortRuns`，`target.status === 'running'` 时直接 409。
- **`status: "partial"`**：被停止或中断时，如果已经流出了一部分文本，就保留下来并进入 partial；
  `error` 仍是「有 error 文本」的失败。载入 state 时 `running` 会按有没有 `answer` 落成 partial 或 error。
- `runId` 是「这一次生成」的 id：`/send` 生成、`start` 帧返回、写进 `card.runId`，`/stop {runId}` 用它精确定位；
  `controllers` 的值是 `{controller, projectId, cardId, followUpId}` 条目。
- `attachments` 里的 `ref` 由 DSH 附件服务签发（`sha256:` 形式），插件不再引用原始 base64；
  文本类附件内容落盘，`state.json` 只记 `file` 指针（旧数据里内联的 `text` 字段仍然兼容）。
- `revision` / `savedAt`：每次成功 `saveState` 自增与刷新；写盘失败会抛错让请求返回 500，不会假成功。
- 载入时 `status: "running"` 会改成 `partial`/`error`；损坏的 state 文件被改名为
  `state.json.broken` 后以空状态启动，绝不覆盖。

## 3. HTTP / SSE 合同

基址：`http://127.0.0.1:<GUI 端口>/dsh-card-tree`（`webServer.register({kind:'prefix'})`）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/state` | 全量状态（含 `revision`/`savedAt`）+ 当前模型 + 默认 system |
| GET | `/health` | 兼容性自检：插件版本、Node 版本、`revision`、四个宿主服务是否挂载、缺失列表。客户端启动时拉一次，缺失就在面板顶部显示黄色横幅 |
| GET | `/models?projectId=` | provider/model 目录（给模型选择器）；带 projectId 时 `current` 反映项目级覆盖 |
| GET | `/effort?provider=&model=&projectId=` | 该模型的推理档位 `{ efforts:[{id,name,description}], defaultEffort, current }`（给思考程度选择器） |
| POST | `/model` | `{op:'set'|'reset', projectId?}`：带 projectId 写 `project.model`，否则写 `state.model` |
| POST | `/project` | `{op:'create'|'update'|'delete'}`；`{op:'import', project}` 导入（规范 id/卡片字段，`running` 落成 error） |
| POST | `/session` | `{op:'bind'|'unbind'}` 会话 ↔ 树 |
| POST | `/card` | `{op:'create'|'update'|'delete'}`；另有 `{op:'reparent', cardId, parentId}`（改父节点，成环被拒）、`{op:'layout', positions:{cardId:{x,y}}\|'reset'}`（全览手动坐标）、`{op:'follow', cardId, prompt}`（卡片内追问，返回的 snapshot 里多一条 `card.followUps`）和 `{op:'ref', cardId, targetId, remove?}`（虚线引用，写 `card.refs`，最多 8 条、不能引用自己） |
| POST | `/send` | 开 SSE 生成一张卡片或一条追问；可带 `attachments` 与 `followUpId`；`start` 帧返回 `runId` 与上下文预算 |
| POST | `/stop` | `{runId}` 精确停止；兼容旧的 `{projectId, cardId, followUpId?}`；目标落成 `partial`（有文本）或 `idle` |

`/send` 的 SSE 帧（`data: <json>\n\n`）：

```
start   {runId, provider, model, tools:[name], contextWindow, budget, approxTokens,
         foldedCards, droppedCards, droppedRefs, refs}    ── 开始（含上下文预算结果）
delta   {text}                                     ── 累计文本（不是增量！client 用 replace）
tool    {phase:'start', calls:[{name, arguments}]}
tool    {phase:'end', steps:[{name, arguments, ok, preview}]}
notice  {text}                                     ── 例如「当前模型看不了图，已改用 X」
done    {card, model, stats}
aborted {card, answer, status}                     ── 被停止/中断：status 可能是 partial
error   {card, error}
```

生成追问时，上面每一帧都会多一个 `followUpId` 字段；`card` 仍然是整张卡片（含 `followUps` 数组）。
生成 key（`state.streaming` / `state.toolSteps` / `state.runs` / `state.contexts`）：
普通卡片是 `cardId`，追问是 `cardId + ':' + followUpId`。

`delta` 携带**累计文本**是 client 渲染 SSE 的关键约束：用 `patch` 覆盖，不要 `+=`。
client 侧还有一层 rAF 合并（`streamPending` + `streamFrame`），一帧最多 patch 一次，
避免每 token 都触发整棵组件树重渲染。

## 4. 为什么是「全局面板 + 输入框接管」，而不是会话标签页

最初版本把卡片树挂在 `conversation.view`（会话顶部标签页）。问题：没法程序化打开它，
用户点侧栏入口时要先切到某个会话再点标签。改成现在的三座位组合后：

| 座位 | 为什么用它 |
|---|---|
| `main`（keyed） | 中央页面唯一入口，能用 `layout.selectPanel(key)` 打开，root 作用域、不绑定会话 |
| `sidebar.panellist` | 左侧栏图标，`id` 与 `main` 的 key 相同，标签由侧栏从注册元数据解析 |
| `conversation.composer`（chain，priority 50） | 唯一能**按会话条件替换输入框**的座位；`select(owner)` 里查绑定表，没绑定就返回 null 走原生输入框 |

不能做的两件事（已验证）：`conversation.session` 是 single 且没有 fallback，静态 shadow 会波及所有会话；
`conversation.view` 无法从外部激活（`viewRequest/openView` 只能由已挂载的视图内部调用）。

## 5. 生成链路

```
/send
 ├─ 读 state、找 project/card(+followUpId)、防重入（target.status === 'running' 直接 409）
 │     并先 abortRuns 掉同一张卡片上的旧 run
 ├─ runId = nid('run')；target.status='running'、写入 runId；saveState 失败 → 500（改动不假装成功）
 ├─ 附件：body.attachments → prepareAttachments → target.attachments
 │        （文本落盘 attachments/；有图片且当前模型 inputModalities 不含 'image'
 │         → resolveImageModel 自动换模型 + notice）
 ├─ 目标 target：普通卡片 = card；追问 = card.followUps 里那一条
 ├─ openStream(res)  →  SSE（追问时每帧多带 followUpId）
 ├─ runStream（最多 MAX_TOOL_ROUNDS = 6 轮）：
 │    contextWindow → budget = max(1500, floor(window*0.55) - system - 1200)
 │    system = buildSystem(project, card, {followUp})  ← 树语义 + 项目背景 + 追问说明 + 引用提示
 │    plan = planContext(...)                          ← 祖先折叠/丢弃 + 引用预算，stats 回填
 │    messages = buildMessages(..., {followUp})         ← 祖先卡片 + 引用卡片 + 本卡片问答 + 更早的追问
 │              失败时 buildFlattenedMessages(...)       ← 单轮文本兜底
 │    emit start（含 runId / budget / approxTokens / 折叠张数）
 │    streamOnce: llm.stream({provider, model, messages, system, tools, signal})
 │      ├─ text-delta  → emit delta（累计文本）
 │      ├─ block-end(tool-call) → 收集
 │      └─ finish: error/aborted 转成异常
 │    有 tool-call → toolCallAllowed 逐个校验（名字白名单 + tools.json 的参数限制）
 │                 → 不通过则整批拒绝、按 tool 结果回填错误（绝不执行）
 │                 → emit tool:start → tools.execute({calls, signal, agent})
 │                 → 结果按 8000 字符/条、24000 字符/轮截断
 │                 → emit tool:end → 追加 assistant(tool-call) + tool 结果消息 → 再 stream
 │    每 2.5s onPartial(composite()) 落一次盘（DSH 崩了也能留下 partial）
 └─ 结束：写 target.answer / steps / tools / stats / status，saveState，emit done
     被停止/中断：status = partial（有文本）或 idle/error，error 文案「生成被中断，已保留上面这部分。」
```

工具白名单见 `index.js` 的 `READONLY_TOOLS` + `READONLY_PREFIXES` + `TOOL_PARAM_ALLOW`；
**执行前**会对每个 tool-call 再判一次 `toolCallAllowed`（不只是过滤 schema），不在名单里的一律拒绝。
文件/终端工具需要真实会话的 agent（`resolveSessionAgent`），插件全局工具不需要。
只读白名单分两层：`READONLY_TOOLS` 是随仓库分发的通用集合；机器本地插件写进数据目录的
`tools.json`（`{tools, prefixes, params}`），由 `readLocalToolConfig()` 合并——这样公开源码不含个人插件清单。

## 6. 客户端结构（client.js）

单文件，按以下顺序排列（改之前先看这一段，别拆文件）：

1. `COPY`（zh/en 两份键集合，必须一一对应，`scripts/verify.mjs` 会查）
2. localStorage 相关：`TREE_OPEN_KEY` / `TREE_WIDTH_*` / `COLLAPSED_KEY` / `MODE_KEY`
3. `createStore()`：状态 + `useSyncExternalStore` 订阅；含 SSE 解析（rAF 合并）、附件读取（FileReader→base64）、
   项目名/背景防抖保存（450ms）、`importProject`/`restoreProject`、`loadModels`/`setModel`/`loadEfforts`/`setEffort`（带 projectId）
4. 模块级 `services.layout` / `goToPanel()` / `goToConversation()` / `remountConversation()`
5. CSS 模板串（只用 `--dsw-alias-*` token）
6. 图标 `svg()` + `Glyph*`，`Menu`，`ModelPicker`，`EffortPicker`
7. 业务组件：`Row` / `TreeRows`（含搜索过滤）/ `Overview`（拖动、↗ 改父级、⇢ 引用虚线、删除/自动排列）/
   `ToolSteps` / `Detail`（追问线程、引用区、partial 与「继续」、上下文徽标、`重答 ▾`）/
   `Composer`（模式胶囊菜单 `↳ 深入 ▾`，方向记在 localStorage）/ `TreeComposer`（会话输入框接管）/
   `Root`（搜索、导出/导入、删除撤销、
   Escape 关闭顺序、错误/通知 toast）
8. `apply(ctx)`：注册三个座位 + 返回 disposer

## 7. 改动指引

- **加一个 HTTP 接口**：`handleRequest` 里加分支 + README 接口表 + `scripts/verify.mjs` 里补一条纯逻辑测试（如果能纯函数化）。
- **改提示词**：只动 `DEFAULT_SYSTEM` / `MODE_TEXT` / `buildSystem`，别在 `runStream` 里拼字符串。
- **加一个座位**：先 `cordis_inspect_query`（client Slots / `listSubTree`）确认注册字段与 ownerProps，
  再在 `apply(ctx)` 里用 `ctx.slots.inject(name, () => ctx.slots.register(opts, Comp))` 包一层。
- **改完必须**：`node scripts/verify.mjs` → 全 PASS → DSH 里 `set_bundle` 关再开 → 用 HTTP 探针跑一张卡片。
- **不要**：在 client.js 里 `require('./x')`（bundle 只加载单入口）、新增 session event type、
  用字面色写样式（主题切换会坏）。
