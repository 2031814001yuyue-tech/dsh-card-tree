# 安装 / 更新 / 卸载

这个插件是 DSH 的 **bundle**（宿主半 `index.js` + 客户端半 `client.js`），
不是一个独立应用。它必须装进某个 DSH profile 才会出现在界面里。

## 前置条件

- 已经在用 DSH（桌面版或 `dsh web`），并且知道自己的 profile 名（默认 `desktop`）
- DSH 里至少配置了一个模型 provider（否则能打开面板，但提问会报「没有可用的默认模型」）
- 想用「会话输入框替换」的话，需要一个已经绑定过树的会话（绑定目前只在接口层）

## 方式 A：一键脚本（Windows，推荐）

在仓库目录里打开 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1
```

默认安装到 `desktop` profile。别的 profile：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 -Profile tui
```

脚本做三件事：

1. 用 `dsh plugin --profile <name> add <本目录>` 把包注册成 `link:` 依赖（需要 `dsh` 在 PATH 上）；
   没有 `dsh` 时会跳过这一步并提示你去看「方式 C」。
2. 把 `dsh-card-tree` 追加到 profile 的 `dsh.profile.bundles` 数组（先备份 `package.json`）。
3. 提示重启 DSH。

> 脚本只改 profile 的 `package.json` 和它的依赖，不动你的数据和其它插件。
> 不需要把本目录复制到别处——`link:` 依赖指回你 clone 的位置，改代码后重载即可。

## 方式 B：交给 DSH 里的助手（最省事）

把本目录的绝对路径发给 DSH 对话里的助手，让它执行：

```
plugin_manager action=install_bundle target=<本目录的绝对路径>
```

看到返回里 `application: "applied"` 且 `warnings: []` 就装好了；
然后刷新页面（新装 bundle 会热加载，通常不用重启）。

## 方式 C：完全手动

1. 把包注册进 profile：
   ```powershell
   dsh plugin --profile desktop add D:\path\to\card-tree
   ```
   没有 `dsh` CLI 时，手动在 `%USERPROFILE%\.dsh\profiles\desktop\package.json` 的
   `dependencies` 里加一行：
   ```json
   "dsh-card-tree": "link:D:/path/to/card-tree"
   ```
   然后在该 profile 目录跑一次 `pnpm install`。
2. 编辑同一个 `package.json`，把 `"dsh-card-tree"` 加到 `dsh.profile.bundles` 数组末尾：
   ```json
   "bundles": [ "...", "dsh-card-tree" ]
   ```
3. 重启 DSH。

## 验证装好了

- 左侧栏出现「对话树」图标（和 插件 / 任务看板 / 自动化任务 并列）→ 点开应看到工作台，而不是空白
- 在 DSH 里打开 `http://127.0.0.1:<端口>/dsh-card-tree/health`，应返回
  `{"ok":true,"health":{"version":"0.7.0","services":{"llm":true,...},"missing":[]}}`
- 仓库里跑 `node scripts/verify.mjs`，应输出 `PASS — 20/20 checks`（自检不依赖 DSH 运行）
- 如果面板顶部出现黄色「运行环境不完整」横幅：说明 DSH 升级后座位/服务改名了，
  按横幅里列的缺失去更新插件（`missing seats` 比 `missing services` 更严重，通常是 slot 名变了）

## 更新

- 方式 A/B 安装的是 `link:` 依赖，`git pull` 后重载即可：
  让助手执行 `plugin_manager action=set_bundle target=dsh-card-tree enabled=false`
  再 `enabled=true`（等价于热重载宿主与客户端），或直接重启 DSH。
- 如果只是改 `docs/` 或 `README.md`，不用重载。

## 卸载

1. 从 profile 的 `package.json` 的 `dsh.profile.bundles` 里删掉 `"dsh-card-tree"`
2. `dsh plugin --profile desktop remove dsh-card-tree`（或手动删 `node_modules/dsh-card-tree` 与 dependencies 里那行）
3. 重启 DSH
4. 插件数据不会自动删除：`%USERPROFILE%\.dsh\card-tree\`（`state.json` + `attachments/`）。
   想彻底清掉就手动删这个目录；想留着以后重装还能接着用，就保留。

## 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| 左侧栏没有图标 | bundle 没进 `dsh.profile.bundles`，或没重启；先看 `/dsh-card-tree/health` 是否有响应 |
| 面板一片空白 | 座位缺失（DSH 升级）。看面板横幅或浏览器 console 里的 `slot entry crashed` |
| 提示「没有可用的默认模型」 | 去 DSH 设置里配 provider/模型，或在树面板的模型选择器里选一个 |
| 发图报「当前模型不能读取图片」 | 当前模型不支持图片输入；插件会自动换一个支持图片的模型（顶部有提示） |
| 卡片里说「无法调用工具」 | 卡片只放行只读工具（`read/glob/grep/web_search` 和各插件的只读工具）；写文件、跑命令是故意挡住的 |
| 数据在哪 | `%USERPROFILE%\.dsh\card-tree\`，迁移/备份见 `README.md` |
| 端口是多少 | 看 DSH 启动时打印的 URL；桌面版每次启动可能不同，插件路由跟在同一个 origin 下 |

## 开发

```powershell
node scripts/verify.mjs     # 语法 + 元数据 + i18n/CSS 审计 + 宿主逻辑单测
```

架构、数据模型、HTTP/SSE 合同见 `docs/ARCHITECTURE.md`。
