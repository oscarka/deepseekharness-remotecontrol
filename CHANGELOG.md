# Changelog

本项目的重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.9.4] - 2026-11-20

### Added

- **滑卡批阅（Swipe Triage）结论卡与展开全文弹窗一键「🔊 播报全文」（`hub/web/src/triage-deck.js` / `hub/web/src/controller.js` / `hub/web/src/styles/triage-deck.css`）**：
  - 结论预览卡底栏与展开全文弹窗顶部新增同步联动的 `🔊 播报全文` / `⏹ 停止` / `⚡ 重点 / 📖 全文` / `1x–1.5x` 语音播报控件与 `📋 复制全文`，复用防 GC、WakeLock 与 iOS 分段接力引擎，后台自动预拉取未截断全文并在切卡、归档、搁置或长按说话时自动静音。
- **多电脑启动自动迁移历史手机改名（`dsh-feishu/lib/hub-agent.js` / `dsh-feishu/lib/workspace-ops.js`）**：
  - `HubAgent.start()` 新增 `migrateLegacyCustomTitles()`：任意已接入的电脑更新重启后，自动将本机 `~/.dsh/session-titles.json` 残留的手机改名写回该电脑对应的 Antigravity IDE（`UpdateConversationAnnotations` / `.pbtxt`）、Claude Code（`.jsonl` `custom-title`）与离线 DSH（原生 zstd `session/title` 帧）并清理旧覆写，跨多台电脑只需在手机「设置 → 已接入电脑」点一下 `⚡ 更新电脑端` 即可全部自动对齐。

## [0.9.3] - 2026-11-20

### Fixed

- **打通全引擎手机 ↔ 电脑双向会话重命名同步（`dsh-feishu/lib/antigravity-ide.js` / `dsh-feishu/lib/harnesses/claude-adapter.js` / `dsh-feishu/lib/workspace-ops.js` / `dsh-feishu/lib/hub-agent.js` / `hub/web/src/controller.js`）**：
  - **Antigravity IDE**：新增 `setAntigravityConversationTitle`，手机改名直接调用 Connect-RPC `UpdateConversationAnnotations`（`annotations: { title }`, `mergeAnnotations: true`）实时刷新桌面侧边栏，离线自动回退原子更新 `annotations/<convId>.pbtxt`（完整保留 `pinned:true` 与浏览时间）；读取侧优先取实时 `annotations.title` 与 `.pbtxt` 标题，并支持八进制 UTF-8 解码；
  - **Claude Code**：`ClaudeAdapter` 新增原生 `renameSession()`（向 `~/.claude/projects/*.jsonl` 追加官方 `custom-title` 记录）与 `custom-title` / `agent-name` 双向解析；
  - **DSH（离线会话）**：`renameDiskSession` 优先向未加锁的 `session.v4.jsonl.zstd` 追加原生 zstd `session/title` 帧，回退 `session-titles.json` 时记录时间戳并与桌面端最新 `session/title` 按时间仲裁；
  - **根治旧覆写锁死反向同步**：原生改名成功后自动清理 `~/.dsh/session-titles.json` 中对应旧覆写键，确保之后在电脑端改名也能立刻同步回手机；前端 `saveInlineRename` 同步补齐乐观更新，手机点保存零延迟刷新标题。

## [0.9.2] - 2026-11-20

### Added

- **多端原生 Agent 插件配置（Antigravity / Claude Code / OpenAI Codex · GitHub 直装免审核）**：
  - **Antigravity 原生插件（`plugin.json` + `assets/logo.svg` + `skills/pocketagents/SKILL.md`）**：严格遵循官方 `plugin.json` 规范（含 3 条 `suggestedPrompts` 与品牌 SVG 图标），通过 `agy plugin validate` 零警告校验；
  - **Claude Code 原生插件与 GitHub 插件市场（`.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` + `.claude-plugin/hooks.json`）**：支持 `/plugin marketplace add oscarka/pocketagents` 与 `/plugin install pocketagents@pocketagents` 零审核直装，通过 `claude plugin validate` 校验，并将 `PermissionRequest` Hook 严格隔离在 `.claude-plugin/` 内避免泄漏到 Antigravity；
  - **OpenAI Codex 原生插件与仓库市场（`.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` + `plugins/pocketagents/`）**：完整提供 `interface`（`shortDescription <= 30`、`defaultPrompt`、品牌配色与图标），并将市场本地源指向子目录 `./plugins/pocketagents` 以规避 `codex-rs` #17066 根路径校验限制；
  - **全套多端插件清单回归测试（`dsh-feishu/test/plugin-manifests.test.js`）**：自动化守卫版本一致性、文件存在性、多端技能/图标同步及防串台隔离。

### Fixed

- **Claude Code 审批 Hook 零阻塞活性守卫与插件防重复弹窗（`dsh-feishu/lib/claude-permission-hook.js` / `dsh-feishu/lib/harnesses/claude-adapter.js`）**：
  - `ClaudeAdapter.listPendingApprovals()` 自动维护 `~/.claude/.dsh-remote-approvals/.watcher-alive.json` 心跳并与 `~/.dsh/daemon.lock` 双路互补；当本机未运行 PocketAgents 监听进程时，Hook 在 `<5ms` 内立即无感退出并回退终端原生授权弹窗，彻底杜绝关闭服务后卡住终端的问题；
  - 插件通道（`--from-plugin`）检测到 `~/.claude/settings.json` 已安装同类 Hook 时自动退让，避免同一权限请求弹出双份审批卡。
- **修复 GitHub Actions npm 暂存校验窗口期并发发布误报失败（`.github/workflows/publish-npm.yml`）**：
  - 将 npm 自动化审核期的 `Cannot publish over previously staged version` 识别为幂等成功，避免 `v*.*.*` Tag 与 GitHub Release 连续触发时误发失败邮件。

## [0.9.1] - 2026-11-20

### Changed

- **全线统一为 PocketAgents（`github.com/oscarka/pocketagents` / `npx pocketagents` / `ghcr.io/oscarka/pocketagents:latest` / `pocketagents.agentrun.vip/?demo=1`）**：
  - GitHub 仓库、npm 包（含 OIDC Trusted Publishing Provenance 认证）、多架构 Docker 镜像与在线交互 Demo 域名全面统一为 **`pocketagents`**，彻底消除单复数割裂。

### Fixed

- **收紧手机端对话详情页滑动返回手势至仅限页面左侧边缘（`hub/web/src/controller.js` / `hub/web/src/utils/gestures.ts`）**：
  - 移除全屏任意区域及右侧向左滑触发返回列表的逻辑，改为仅当手指起手落点位于屏幕左侧边缘带（约屏幕宽度 14%、48–72px）且向右拖动时触发返回会话列表，正文中间与最右侧区域滑动不再误触后退。
- **根治手机端「已出结论」蓝色未读状态漏显或延迟的问题（`dsh-feishu/lib/antigravity-ide.js` / `hub/hub-core.js` / `hub/web/src/controller.js`）**：
  - 修复 Antigravity `lastConclusionAt` 误取 `PLANNER_RESPONSE.created_at`（生成起点、早于实际完结 26–63 秒且截断到整秒）导致比手机 `seenAt` / `cmd.createdAt` 更早、从而漏显 `🔵 已出结论` 或滞留 `● 运行中` 的根因，改为完结时取 `Math.max(lastConclusionAt, lastActivity)` 并同步修复尾随元数据步滞留 `isMidTurn` 与缓存命中状态未重算；
  - `HubCore` 新增极速 `idle -> idle` 完结内容签名比对，即便回复在单次心跳内完成或途经偶发丢包也能立刻置 `sessionReadState.unread = true`、推送与广播 `task_concluded`；同时拦截 `running:`/`approval:` 非结论已读回执覆盖未读态；
  - 前端在锁屏/切后台（`visibilityState === 'hidden'`）时不再静默把新结论标为已读，点进运行中/待授权会话不再误发覆盖未读态的已读回执，并在关闭对话返回列表时立即刷新未读徽章。

## [0.9.0] - 2026-11-19

### Changed

- **品牌正式升级为 PocketAgents（`github.com/oscarka/pocketagents` / `npx pocketagents`）**：
  - GitHub 仓库原地更名为 `oscarka/pocketagents`（自动保留 `oscarka/deepseekharness-remotecontrol` 永久 301 重定向，老外链与 DSH 插件市场零断链）；
  - `package.json`、CLI 入口（`npx pocketagents`，同时保留 `dsh-remote` 别名）、Demo 沙盒、Docker 镜像（`ghcr.io/oscarka/pocketagents:latest`）、中英 Hero Banner 与双语 README 全面升级为 **PocketAgents**。

## [0.8.21] - 2026-11-19

### Fixed

- **修复 Antigravity `ask_question` 手机提交选择后被误判为「跳过弹窗」并停止运行的问题（`dsh-feishu/lib/antigravity-ide.js` / `hub/web/src/controller.js`）**：
  - 移除会因 Protobuf JSON 静默丢弃未知字段而被 Antigravity 当成“用户跳过弹窗”的 `HandleCascadeUserInteraction` 猜测提交；
  - 改为先通过 `CancelCascadeInvocation` 无痛解除等待态（不再产生“看到您刚才跳过了弹窗”废话回复），随即通过 `SendUserCascadeMessage`（含短退避重试）将手机勾选的完整选项直接发送回原对话，确保 Antigravity 立即切入 `RUNNING` 继续干活；前端 `submitDshQuestionAnswers` 同步透传 `questions` 题干。

## [0.8.20] - 2026-11-19

### Fixed

- **修复 Antigravity IDE `ask_question` 多选题在手机端误显示为「Allow agent question? / Yes, allow this time」且丢弃真实选项的问题（`dsh-feishu/lib/antigravity-ide.js` / `dsh-feishu/lib/hub-agent.js`）**：
  - `parseAntigravityToolCalls` 与 `loadTruncatedStepContents` 完整解析并回补被截断的 `ask_question` 工具参数 `questions`（含单选/多选与 `(Recommended)` 选项），同时补齐 `liveWaitingSteps` 兜底提取，将 `kind: 'question'` 与完整 `questions` 数组透传至 `pendingApproval`，手机对话页与滑卡批阅均直接渲染可点选的交互多选卡；
  - `hub-agent.js` 向 `executeAntigravityIdeAction` 透传用户的 `answers` 与 `questions`，提交时优先尝试结构化 `HandleCascadeUserInteraction`、不兼容时自动整理所选选项通过 `SendUserCascadeMessage` 精准回复回原对话，绝不再误发 `permission` 授权或盲敲按键。

## [0.8.19] - 2026-11-19

### Added

- **Claude Code 原生手机审批与滑卡批阅（`dsh-feishu/lib/claude-permission-hook.js` / `dsh-feishu/lib/harnesses/claude-adapter.js` / `dsh-turbo/index.js` / `scripts/cli.mjs`）**：
  - 接入 Claude Code 官方 `PermissionRequest` Hook：支持 Bash、Edit、Write、MCP 工具审批与 `AskUserQuestion` 结构化多选题，通过 `~/.claude/.dsh-remote-approvals/` 原子文件通道与 `<120ms` FSEvents 监听实时同步到手机端与滑卡批阅（Swipe Triage）；
  - 手机点选「本次允许」「本对话内始终允许（输出官方 `updatedPermissions`）」「拒绝」或提交多选答案（`updatedInput.answers`）后 `<50ms` 回写并自动唤醒 Claude Code 继续执行；若用户在电脑端直接处理或进程退出则自动按 PID 活性清理过期卡片，绝不阻塞终端；
  - `scripts/cli.mjs` 新增 `--install-claude-hook`、`--uninstall-claude-hook`、`--no-claude-hook`，检测到 `~/.claude` 时幂等无损合入 `settings.json` 并完整保留用户已有全部 Hook。

## [0.8.18] - 2026-11-19

### Added

- **一行 `npx` 零配置终端出码秒开（`scripts/cli.mjs` / `dsh-feishu/lib/terminal-qr.js` / `package.json`）**：
  - 在 `package.json` 暴露 `"bin"` 可执行命令（`deepseekharness-remotecontrol` 与 `dsh-remote`）：任何开发者只需在终端运行 `npx deepseekharness-remotecontrol`（无需 `git clone`、无需 Railway、无需配密码），即可在 3 秒内自动拉起本机嵌入式总控台与本地会话发现进程（自动接入 Claude Code / OpenAI Codex / Antigravity IDE / DSH / WorkBuddy / 豆包），并用零依赖 ISO/IEC 18004 Unicode 半块编码直接在终端打印手机可扫二维码（支持深/浅色终端自适应黑字白底静区）与 24h 一次性免密配对码。
- **零后端、零数据泄露交互式沙盒演示模式 `?demo=1`（`hub/web/src/demo-sandbox.js` / `hub/web/src/controller.js` / `hub/web/src/components/TopBar.tsx`）**：
  - 打开任意总控台网址加 `?demo=1`（如 `https://harness.agentrun.vip/?demo=1`）即刻进入纯浏览器内存沙盒，**零网络 API 请求、零读取真实 `HUB_TOKEN`、零写入真实缓存**；内置双主机（`MacBook Pro · Office` + `Mac mini · Home`）与 5 大引擎（Claude Code、Antigravity IDE、Codex、DSH、WorkBuddy）演示会话，完整可交互体验滑卡批阅、一键放行命令、多选架构提问、HTML 交互沙盒预览、`🔊 播报` 与自由发消息模拟回复，并提供顶部一键复制 `npx` 命令与重置按钮。
- **README 首屏与视觉全面焕新（`README.md` / `README.en.md` / `README.zh-CN.md` / `docs/assets/*`）**：
  - 重新定位首屏主叙事为 **Claude Code、OpenAI Codex、Antigravity IDE 与 DeepSeek Harness 统一手机总控台**，将「在线交互式 Demo (`?demo=1`)」与「一行 `npx` 终端扫码」前置到首屏第一折叠，替换全套最新高清移动端截图（含置顶对话、滑卡批阅与审批卡片）并补全多处英文 i18n 细节。

## [0.8.17] - 2026-11-19

### Fixed

- **显式展示 Antigravity 流中断 / `ERROR_MESSAGE` 异常提示，彻底消除“停在工具步骤后面一片空白”的困惑（`dsh-feishu/lib/antigravity-ide.js` / `hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - `parseAntigravityTranscript` 新增对连续 `ERROR_MESSAGE`（如网络断流 `Error: The stream was interrupted...` 且尾部跟着空内容 `PLANNER_RESPONSE`）的折叠提取与展示：自动渲染独立 `⚠️ 执行中断（连续发生 N 次）` 气泡并将状态标为 `⚠️ 中断待继续`；
  - 手机聊天页在遇到旧版远端宿主机停在工具步骤（`isStalledMidTurn`）时，直接在底部工具步骤下方展示醒目琥珀色提示条，明确告知本轮在工具步骤后中断未生成最终回复，可一键点下方「▶ 继续执行下一步」续跑。

## [0.8.16] - 2026-11-19

### Fixed

- **修复会话列表预览错显示「上上轮旧回复」导致点开后看不到该回复的假象（`dsh-feishu/lib/antigravity-ide.js` / `hub/web/src/controller.js`）**：
  - 修复 `parseAntigravityTranscript` 在新 `USER_INPUT` 到来时未重置 `lastOutput`，导致后续轮次若停留在纯工具调用步骤（`isMidTurn: true`、未产出最终总结文本）时，列表预览仍沿用多轮前的历史回复文案；
  - 手机与网页端 `controller.js` 列表预览改为严格以当前会话最新一条消息（`lastMsg.text`）为准，彻底保证列表预览与点开后的底部消息 100% 一致（即使远程旧版本宿主机暂未更新也能立即生效）；且当会话在工具步骤中途停住（`isMidTurn` / `isToolStepOnly`）时不再误判为已出结论，而是明确标注 `🔧 停在步骤:`。

## [0.8.15] - 2026-11-19

### Fixed

- **彻底消除「已收到推送通知但会话列表仍卡在『运行中』几秒后才变『已出结论』」的四重延迟瓶颈（`hub/server.js` / `hub/hub-core.js` / `hub/web/src/controller.js` / `dsh-feishu/lib/antigravity-ide.js`）**：
  - **移除 `/api/events` SSE 流的 `gzip` 压缩缓冲并提速推送阈值**：CDN 与移动端 HTTP/2 代理会对开启 `content-encoding: gzip` 的微小 `state_delta` 帧产生数秒缓冲（导致直连 APNs 的系统推送先到、页面 SSE 状态却滞后数秒）；现改为无缓冲原始流（`no-store, no-transform`），默认节流从 `450ms` 降至 `80ms`，且任务出结论/待审批事件走 `<=30ms` 极速通道；
  - **Service Worker 收到系统推送即刻唤醒前台页面拉新（`PUSH_RECEIVED` + `NOTIFICATION_CLICK`）**：`sw.js` 在收到 `push` 的瞬间向所有已打开页面广播 `PUSH_RECEIVED`，点击通知或切回前台（`idleMs > 1.2s`）均无条件立即触发 `fetchState({ forceFresh: true })`（修复此前切后台不足 15 秒切回或点击已有会话通知时不拉取最新状态的盲区）；
  - **修复 `inflightCommands` / 乐观消息在任务已出结论后仍强行覆盖 `运行中` 的问题**：当服务端会话已进入 `idle` 结论态（`lastConclusionAt > cmd.createdAt` 或消息数已跨过完整一轮问答，含纯图片消息）时立即清理在途标记，并将 Antigravity `RUNNING` RPC 缓存周期从 `2.5s` 缩短至 `350ms`，同时兼容 Codex Electron `electron-persisted-atom-state` 置顶字段。

## [0.8.14] - 2026-11-19

### Added & Fixed

- **打通 Antigravity IDE 原生 `Pinned Conversations` 双向实时同步与手机端「📌 置顶对话」独立分区展示（`dsh-feishu/lib/antigravity-ide.js` / `dsh-turbo/index.js` / `hub/web/src/controller.js`）**：
  - 实时解析 `~/.gemini/antigravity/annotations/<convId>.pbtxt`（`pinned:true`）与 LanguageServer `GetAllCascadeTrajectories`（`annotations.pinned`），并在 `TurboController` 增加 `annotations/` 目录 FSEvents 监听（`<150ms` 唤醒同步），电脑端在 Antigravity IDE 侧栏置顶/取消置顶后手机端立即联动；
  - 手机端置顶或取消置顶 Antigravity IDE 会话时，直接通过 Connect-RPC `UpdateConversationAnnotations`（`mergeAnnotations: true`，离线时自动原子回写 `.pbtxt`）实时刷新 Antigravity IDE 侧栏；
  - 手机与网页端会话列表新增与 Antigravity IDE 一致的 **「📌 置顶对话」/「全部对话」** 分组栏及醒目 `📌 置顶` 胶囊角标，即使会话处于绿色运行中或蓝色新结论状态也一目了然。

## [0.8.13] - 2026-11-19

### Added & Fixed

- **打通多设备总控台与电脑端各 Harness 会话置顶（Pin）双向实时互通（`hub/hub-core.js` / `hub/server.js` / `dsh-feishu/lib/hub-agent.js` / `workspace-ops.js` / `codex-adapter.js` / `workbuddy-adapter.js` / `doubao-adapter.js` / `controller.js`）**：
  - 彻底改变此前手机端仅存单机 `localStorage` 且忽略电脑端 `pinned` 字段的割裂状态：Hub 新增跨设备持久化 `sessionPinState` 与 `POST /api/sessions/pin`（含旧本地置顶无损自动上云迁移），通过增量 SSE 秒级同步到所有手机、PWA 与桌面网页；
  - 双向打通各桌面端工具原生置顶存储：**DSH 桌面版**（`~/.dsh/storages/workspace.json` `global.pinnedSessionIds` 双向读写）、**Codex 桌面版**（`~/.codex/.codex-global-state.json` `pinned-thread-ids` 双向读写）、**WorkBuddy**（`workbuddy.db` + `pinned-sessions.json` 双向读写）、**豆包电脑版**（LevelDB `pinned` 同步展示），以及 **Antigravity IDE / Claude Code** 主机级 `pinned-sessions.json` 跨设备持久同步。
- **彻底消除 GitHub Actions `CI & Multi-Arch Docker Publish` 偶发 `SQLITE_BUSY` 报错邮件并固化防复发规则（`dsh-feishu/test/hub-and-migration.test.js` / `.github/workflows/*.yml` / `.agent/rules/ci-zero-failure-gate.md`）**：
  - 修复测试轮询与 WorkBuddy 后台异步落库并发访问 `workbuddy.db` 时 `sqlite3` CLI 默认 `busy_timeout = 0ms` 触发 `database is locked (5)` 的偶发竞态：全量补齐 `['-cmd', '.timeout 5000']` 与 `PRAGMA journal_mode=WAL;`，并在 CI 工作流启用 `--test-concurrency=4` 与 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`；
  - 在仓库内落地持久工作区规则 `.agent/rules/ci-zero-failure-gate.md`，强制后续所有开发会话遵守推送前全量单测门禁、SQLite 锁超时规范与推送后 CI 一次绿灯验收。

## [0.8.12] - 2026-11-19

### Fixed

- **用户发送的图片气泡内直接渲染高清缩略图并支持随时点开大图预览（`hub/web/src/controller.js` / `hub/web/src/styles/app.css` / `dsh-feishu/lib/workspace-ops.js`）**：
  - 彻底清除此前用户蓝色气泡内裸露的长串 `[手机端上传图片附件 (N 张)...]: - 📎 ... /Users/.../.dsh-uploads/...` 路径文本，改为自动解析并渲染为固定尺寸防抖缩略图卡片（同时支持发送瞬间的本地乐观预览与历史会话落盘加载）；
  - 点击任意自己发过的截图即可直接唤起文件预览抽屉查看高清大图、双指缩放或长按保存，并支持 `.dsh-uploads` 主路径与 `.user_uploaded` 备用路径双保险自动回退。
- **彻底根治查看会话时（图片加载 / 全文补齐 / 流式更新）突然往上跳回好几屏旧对话的顽疾（`hub/web/src/controller.js`）**：
  - 废弃以静态 `scrollHeight - scrollTop < 120` 判断是否在底部的脆弱逻辑（前序图片解码撑高或正文补齐会瞬间放大 `scrollHeight` 导致误判离开底部，进而在下次重绘时锁死旧 `prevScrollTop` 把画面拽回早期对话）；
  - 升级为基于**真实手势意图的状态机贴底锁（`chatPinnedToBottom`）** + `#chatMessages` 捕获阶段 `load` 事件与 `ResizeObserver` 实时贴底补偿：只要用户未主动手势上滑翻看历史，无论前序多少张截图陆续加载完毕还是流式消息持续增长，视口始终稳稳停留在最新消息底部；当用户主动上滑阅读历史或点击「加载早先记录」时，按底部相对高度差保持当前阅读段落纹丝不动。

## [0.8.11] - 2026-11-19

### Changed & Fixed

- **「AI 交付文档」与「Files With Changes」默认收起不展开 + 交付文档补齐折叠按钮 + 确认已阅按钮点击后消失（`hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - 进入任意会话时，底部的「📋 AI 交付文档 / Walkthrough (N)」与「📄 N Files With Changes」均默认收起为单行紧凑摘要栏，彻底解决多产物（如 15 份报告）铺满整屏的问题；
  - 为「AI 交付文档」标题栏新增一键展开/收起按钮（`展开 ⌄` ↔ `收起 ⌃`），支持点击整条标题栏或右侧胶囊随时展开查看全部交付文档；
  - 修复点击「确认已阅」后按钮仅变成绿色 `✓ 已确认` 仍占位置的问题——点击确认后该按钮立即彻底消失（仅在后续 AI 产生新文件改动时重新出现）。

## [0.8.10] - 2026-11-19

### Fixed

- **彻底修复「Files With Changes」卡片底栏按钮无效/错位问题（`hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - 将此前无点击事件的 `📄 N Files With Changes ⌃` 升级为可折叠/展开交互按钮，点击即可收起或展开文件明细（`⌃` ↔ `⌄`）并持久化保存状态；
  - 将此前与「查看改动」重复绑定到目录浏览的占位 `Accept all` 按钮改为真实的**「确认已阅」**（`✓ 已确认`）状态按钮：一键确认当前批次改动并自动收起卡片，若后续 AI 继续修改文件会自动重新点亮；
  - 「查看改动」升级为在文件抽屉内秒开**本会话改动文件专页**（支持点击任意文件直达预览或切回全目录浏览），同时修复 `openInChatFileDrawer()` 打开目录时未清理上次残留文件预览导致画面卡在旧预览的 Bug。

## [0.8.9] - 2026-11-19

### Changed & Fixed

- **重构会话底部「AI 交付文档 / Walkthrough」与「Files With Changes」卡片的浅/深色自适应配色、字体排版与防截断布局（`hub/web/src/styles/app.css` / `hub/web/src/controller.js`）**：
  - 移除此前硬编码的纯黑 `#18181b` 背景与 `#f8fafc` 行内亮字，全面改用主题语义变量（`--surface` / `--surface-2` / `--border` / `--text` / `--primary-soft`），使浅色模式下卡片自然融入聊天流、深色模式下自动切换高对比深色风格；
  - 将整行强迫等宽字体调整为系统原生无衬线字体，仅在 `+302 -165` 改动统计列保留 `tabular-nums` 等宽对齐；
  - 修复长文件名重复渲染与 `flex-shrink: 0` 无省略导致的右侧 `体验网页 ›` / `打开 ›` 被裁切出屏问题，确保右侧操作提示始终完整对齐显示。
- **文件预览抽屉支持「手动上拉手柄展开至近全屏」与一键展开/收起（`hub/web/src/components/Sheets.tsx` / `hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - 为 `#inChatFileSheet` 顶部手柄条与标题栏新增实时跟手**上拉展开**手势（`80dvh` ↔ `97dvh - safe-top`），支持展开态中度下拉回弹回默认高度、继续大幅下拉顺滑关闭，并新增手柄单击与右上角 `⤢` / `⤡` 按钮一键切换；
  - 抽屉展开至近全屏时，内嵌图片（`54dvh -> 76dvh`）、视频（`54dvh -> 74dvh`）与 HTML 预览（`62dvh -> 82dvh`）同步放大，代码与目录列表同步多显示近 20% 可视区域。

## [0.8.8] - 2026-11-18

### Fixed

- **彻底根治手机发送带图消息中途被后台升级重载打断导致文字与图片丢失的问题（`hub/server.js` / `hub/web/src/controller.js`）**：
  - 移除 `/sw.js` `activate` 阶段的强制 `client.navigate()` 页面跳转，并在前端 `hasActiveUserInputInProgress()` 中严禁在**会话页打开、相册选图中、存在未发图片附件或上传请求进行中**时执行任何后台自动重载；
  - 新增发前持久化保护发件箱（`dsh_inflight_outbox_v1` WAL）：点击发送后先将文字与压缩截图写入 `sessionStorage`，仅在服务端确认 `200 OK` 后才清除——即便发送中途断网、切后台被回收或强刷页面，重进后也会自动将未送达的文字与截图恢复回输入框；
  - 将带图指令跨洋上传超时从 `15s` 放宽至 `45s`，并将提示优化为发前显示 `⏳ 正在上传截图并发送…`、服务端确认送达后才提示 `🖼️ 已发送截图与指令`。

## [0.8.7] - 2026-11-18

### Fixed

- **修复点进对话「第 1 秒截断 280 字 vs 1 秒后跳变全文、底部交付卡片被挤压成两条细线」的问题（`hub/web/src/controller.js` / `hub/web/src/styles/app.css` / `hub/hub-core.js`）**：
  - 首屏通过 `lite=1` 秒开列表后，立即在后台静默升级一次完整热会话状态（48,000 字无截断）并将 SSE 实时流切换至非截断增量流，使点开任何近期会话第 0 秒即展示 100% 最终全文，彻底消灭 1 秒后正文突变与滚动跳动；
  - 修正热会话在保留最近 14 条完整消息时误标 `wireTruncated: true` 的问题，并在 `localStorage` 本地首屏缓存中保留前 8 个会话的完整正文与变更文件；
  - 为 `.chat-messages > *` 补齐 `flex-shrink: 0`，根治长回复超出屏幕高度时 Flexbox 将底部 `.agy-session-artifacts-card`（AI 交付文档卡片）与 `.agy-files-changed-card` 挤压成 `0px` 双横线的布局 Bug。

## [0.8.6] - 2026-11-18

### Changed

- **大幅提高列表下拉刷新阻尼与防误触阈值（`hub/web/src/controller.js`）**：
  - 新增前 `32px` 零弹出防误触死区，日常翻到列表顶部或随手下滑绝不抖动；
  - 第一段同步状态阈值由 `58px` 提升 `2.7 倍` 至 **`155px`**（且改为静默拉取不再闪烁顶部断线横幅），第二段清缓存强制重刷前端阈值由 `128px` 提升 `2.2 倍` 至 **`285px`**，并实时显示深拉蓄力百分比（`1%~99%` -> `⚡ 已拉满！`），需要真正使劲拉到底才会触发整页重载。

## [0.8.5] - 2026-11-18

### Fixed

- **彻底修复 iOS 主屏幕 PWA 会话详情页「左滑/右滑手势返回」无响应问题（`hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - 消除原版仅右边缘 `48px` 允许左滑及 `75%~width-48` 盲区限制，现支持在会话页任意位置**左滑（`dx < 0`）或右滑（`dx > 0`）** 双向顺滑跟手返回会话列表；
  - 为 `.chat-messages` 显式补齐 `overflow-x: hidden` 并移除对行内 `code` 的 `pan-x` 声明，根治长文本/链接撑宽导致整个消息流被误判为横向滚动容器而吞掉全部左滑手势的问题；
  - 新增单手拇指弧线起手容差、长按选字防误触保护，以及触屏按住期间暂缓 SSE / 历史补拉对 `#chatMessages` 的 `innerHTML` 重写，防止触点目标节点中途脱离 DOM 导致 `touchmove`/`touchend` 断流。

## [0.8.4] - 2026-11-18

### Added

- **主屏幕 PWA 二段式下拉刷新与深拉强制清缓存升新版手势（`hub/web/src/App.tsx` / `hub/web/src/styles/app.css` / `hub/web/src/controller.js` / `hub/server.js`）**：
  - 针对 iOS 添加到主屏幕后无地址栏刷新按钮的痛点，在主列表顶部新增二段式阻尼下拉交互：**轻拉（`>= 58px`）** 同步最新会话状态与实时流，**使劲深拉（`>= 128px`）** 触发震动反馈并一键清空全部本地 `CacheStorage` 强制拉取最新前端构建版本（同时完整保留 iOS Web Push 锁屏推送订阅）；
  - 在「设备与设置」底部版本栏同步增加 `🔄 强制刷新前端版本（清缓存重载）` 按钮，并在 `/sw.js` `activate` 清理旧壳缓存时主动调用 `WindowClient.navigate` 救活历史旧版窗口。

## [0.8.3] - 2026-11-18

### Added

- **新建远程任务支持远程目录树浏览与一键新建工作区文件夹（`hub/web/src/components/Sheets.tsx` / `hub/web/src/controller.js` / `dsh-feishu/lib/hub-agent.js`）**：
  - 在新建任务工作区栏新增 `📂 选择目录` 与 `＋ 新工作区` 双入口，支持逐级浏览远程电脑目录树并选定任意文件夹作为工作区，或指定父目录创建全新项目文件夹（`~` 自动展开、启动任务前自动 `mkdir -p` 创建目录）。

### Fixed

- **修复 `sw.js` 静态缓存名与 `initialUiBuild` 导致手机端卡在旧版前端包的锁死问题（`hub/server.js` / `hub/web/src/controller.js`）**：`/sw.js` 现动态嵌入当前构建号 `dsh-app-shell-v1-<uiBuild>` 并在激活清理旧壳后通知客户端，前端改为从实际加载的 `<script src="/assets/index-*.js">` 读取构建号并通过 `?_r=` 无感刷新切换新版。
- **跨洋 1080p60 超高码率视频 HLS 零卡顿调优（`dsh-feishu/lib/hls-streamer.js`）**：将 HLS 切片步长优化为 `4s` 并增设手机预览 `-fpsmax 30` 限帧（单片约 `400 KB` 即可提供 `4.0 秒` 播放缓冲，减少 50% 跨洋请求握手开销）。
- **补齐滑卡批阅模式（`Triage Deck`）全英文界面本地化联动（`hub/web/src/triage-deck.js` / `hub/web/src/components/TriageDeck.tsx` / `hub/web/src/controller.js`）**。
- **修复手机会话详情页手势侧滑返回失灵与首次打开空白需轻触才渲染的问题（`hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：放宽会话右滑返回起手热区并支持右边缘左滑返回，移除导致 iOS WebKit 离屏图层瓦片空白的遗留 `-webkit-overflow-scrolling: touch` 并增补滑入动画完成后的强制瓦片刷新。

## [0.8.2] - 2026-11-18

### Added

- **行业标准 HLS（`m3u8 + 2s .ts`）跨平台自适应视频流引擎与本地缓存自动回收（`dsh-feishu/lib/hls-streamer.js` / `hub/server.js` / `hub/web/src/utils/hlsPlayer.js`）**：
  - 纯 Node.js `< 1ms` 解析 ISO BMFF `mvhd` 总时长并立即生成完整 `#EXT-X-ENDLIST` VOD 播放列表，低码率兼容视频直接 `-c:v copy` 无损秒切，百 MB 级高码率成片采用 `ffmpeg -hls_flags temp_file+independent_segments` 渐进式 `2s` 切片（单片约 `250–400 KB`，首片 `< 300ms` 产出，支持任意拖动进度条按需跳切与离开页面 `25s` 自动停编码释放 CPU）；
  - 苹果 iOS / macOS Safari 走系统原生 HLS 内核零开销播放，Windows / Linux / Android / Chrome / Edge / 飞书内置浏览器按需懒加载内置 `hls.js` MSE 引擎播放，遇未升级旧版节点自动无感回退 `/fs/stream`；
  - 内置 `~/.dsh/cache/hls` 及时自动清理机制（空闲 `2 小时` 过期、`512 MiB` 容量上限与 `24` 个目录上限 LRU 淘汰、每 `10 分钟` 后台定时巡检，同步清扫 `cache/thumbs` 中残留的超时 `.tmp-*.mp4` 文件）；
  - 为 Host SSE（`isHostMode`）、`/fs/stream` 与 `/fs/hls/*` 补齐 `X-Accel-Buffering: no` 与 `TCP_NODELAY`，并在 WebRTC 局域网候选中过滤代理虚拟网卡（`utun` / `198.18.x.x`，保留物理网卡与 Tailscale `100.64.0.0/10`）。

## [0.8.1] - 2026-11-18

### Performance

- **根治每次升级后首次打开链接慢的三段式瀑布流（`hub/server.js` / `hub/hub-core.js` / `hub/web/index.html` / `hub/web/src/controller.js`）**：
  - 升级 `/sw.js` 为自动注册的原子级 `Stale-While-Revalidate` 应用壳缓存（`dsh-app-shell-v1`），老用户升级后点开直接从手机本地闪存 `< 100ms` 瞬时渲染，后台原子预热全套新哈希 JS/CSS 后再切换壳缓存；
  - 在 `index.html` `<head>` 中与下载 JS/CSS 同步并行发起 `/api/state?lite=1`（`window.__dshPreloadState`），消除等待 JS 下载解析完才拉取状态的串行跨洋回合；
  - 深度瘦身 `lite=1` 状态包（剥离闲置 `lastFilePreview`、`lastFsListing`、大体积 `recentResults` 及冷会话冗余摘要），体积再降约 65%；
  - 服务端内置静态资源内存级 Brotli-6 / Gzip-9 预压缩缓存，并在启动后 `800ms` 自动请求 `PUBLIC_URL` 预热边缘 CDN 缓存。

## [0.8.0] - 2026-11-18

### Added

- **滑卡批阅模式（`Triage Deck`）（`hub/web/src/components/TriageDeck.tsx` / `hub/web/src/triage-deck.js` / `hub/web/src/styles/triage-deck.css`）**：
  - 在筛选栏左侧新增四宫格入口，支持以沉浸式手势卡片栈逐张快速处理待审批命令、多选提问卡、未读结论与中断任务（右滑批准/已读、左滑跳过、`↩ 撤回` 与原地详情抽屉）。
- **原生全尺寸高清光栅 PNG 应用图标（`hub/web/public/` / `hub/server.js` / `hub/web/index.html`）**：
  - 内置 `180×180` `/apple-touch-icon.png`、`192×192` `/icon-192.png`、`512×512` `/icon-512.png`、`32×32` `/favicon-32x32.png`、`/favicon.ico` 与高清矢量 `/icon.svg`，彻底修复 iOS Safari「添加到主屏幕」拒收 SVG 图标导致退化为灰色字母 `D` 的问题。

### Fixed

- **手机端跨洋弱网首屏秒开、独立验密防误报与 SSE 序列对齐防卡死（`hub/hub-core.js` / `hub/server.js` / `hub/web/src/controller.js`）**：
  - 新增 `/api/state?lite=1` 与 `/api/events?lite=1` 首屏精简传输协议，首屏体积降低约 75%，点开历史或运行中长对话时自动按需无感拼接完整上下文；
  - 新增超轻量 `POST /api/auth/verify` 验密接口与 Token 代数防竞态保护，消除慢网下误报「密码错误」及未登录态 `401` 轮询风暴；
  - 修复 `lite=1` 模式下 SSE `stateSeq` 不对齐引发的反复重拉与并发 `/transcript` 阻塞，限制本地快照缓存有效期为 `1 小时`，并补齐 iOS 切回前台（`visibilitychange` / `pageshow`）即时静默同步。
- **热更新零白屏保护与指南首选 Railway 调整（`hub/server.js` / `hub/web/index.html` / `hub/web/src/controller.js` / `README*`）**：
  - 移除服务端 `uiBuild` 更新时强行打断当前前台页面的 `window.location.reload()`，改为退入后台且无未发草稿时无感更新；
  - 服务端新增旧哈希 `/assets/index-*.js|.css` 的 `no-store` 平滑兜底与静态资源 `HEAD` 支持，前端新增 `vite:preloadError` 自动重试与首次解锁同步骨架态，并将部署文档第一推荐方式统一调整为 Railway。

## [0.7.9] - 2026-11-18

### Fixed

- **修复语音播报（`🔊 播报`）朗读带代码的 AI 回复时中途自动停掉的问题（`hub/web/src/utils/speech.js` / `hub/web/src/controller.js`）**：
  - 将活跃 `SpeechSynthesisUtterance` 实例存入全局强引用池 `window.__dshPinnedUtterances`，防止后台 SSE 状态更新触发浏览器 JS 垃圾回收（GC）导致播报半截哑火；
  - 将一次性批量入队改为逐句接力串联（`speakChunkAt`）+ `900ms` 防假死看门狗（自动恢复 `paused` 挂起与漏触发 `onend`）+ 单句合成异常自动跳过续读，并对中英高频切换的代码解释在 iOS WebKit 上按句切分、在 Chromium / WebView 上限制单片 `<= 11s` 彻底避开 15 秒超时掐断；
  - 按 CommonMark §4.5 规范重写代码块围栏配对（核对反引号长度并放行单行 ```` ```html``` ```` 行内代码），杜绝嵌套代码块或代码内模板字符串反引号把后半篇正文吞掉（4 行以上代码块自动口语化提示行数与语言）；清理 `<video>` 等尖括号与 `{ } [ ] | =` 符号防止触发系统 TTS SSML 解析中断，并修复 `video.src` / `res.ok` 被误判为文件后缀的问题；
  - 默认播报模式切换为 **`📖 全文`**（`dsh_tts_mode_v2`，保留一键切换 **`⚡ 重点`** 摘要），并在播报期间持有 `navigator.wakeLock` 防止手机 30 秒自动息屏挂起语音。

## [0.7.8] - 2026-11-18

### Added

- **零外部依赖 WebRTC `RTCDataChannel` 点对点音视频直连引擎（`dsh-feishu/lib/webrtc-p2p.js` / `hub/web/src/utils/webrtcMedia.js` / `hub/hub-core.js`）**：
  - 纯 Node.js 内置模块实现完整 WebRTC 数据通道协议栈（ICE Lite/Full 连通性校验 + STUN `srflx` 公网打洞 + DTLS 1.2 `TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256` 含 RFC 7627 `extended_master_secret` + SCTP CRC-32c / DCEP / 滑动窗口 `SACK` 确认与快速重传），零 npm 运行时依赖；
  - 新增 `POST /api/hosts/:hostId/fs/rtc-offer` 信令协商接口（支持 `mediaTicket` 与 `HUB_TOKEN` 双鉴权），手机在线看视频（`⚡ P2P 极速直连 · 零缓冲秒播`）与无损下载视频（`⬇️ 保存/分享视频`）优先直连电脑跑满局域网 / Tailscale / 国内直连带宽，UDP 受阻时 `1.5s` 内无感回退 HTTP 小分片流水线。

### Fixed

- **根治跨洋 Cloud Run 在线看视频与下载视频频繁 `504` 超时失败（`dsh-feishu/lib/workspace-ops.js` / `dsh-feishu/lib/hub-agent.js` / `hub/hub-core.js` / `hub/web/src/controller.js`）**：
  - 将视频在线播放单次 `HTTP 206` 分片上限由 `16 MiB` 下调为首包 **`1 MiB`**（秒拿 `moov` 与首帧）+ 后续每片 **`2 MiB`**，彻底避开 Google Cloud Run HTTP/1.1 整包请求体缓冲在跨洋上行波动时撞击 `60s` 网关超时；
  - 实现预览与下载分流：`> 4 MiB` 视频手机在线观看默认走 `720p` 硬件加速极速秒看流（`?preview=1`，支持一键切换 `🎞️ 尝试原片直出`），点击 `⬇️ 保存/分享视频` 始终保存 100% 无损原片，并升级为 **`2 MiB × 3` 路并发拉取 + 单片 3 次指数退避自动重试 + `navigator.wakeLock` 防息屏断流**；
  - 新增 Host SSE `event: fs_abort` 断流信号透传，手机端超时或划走时立即在 Mac 端 `abort()` 掐断进行中的 `/api/fs-tunnel` 上传流并销毁本地文件读取流，防止僵尸分片堵死上行带宽；
  - 修复 `<video onerror>` 将网络 `504` 波动误判为编码不兼容进而对标准 H.264 视频盲目触发 `?transcode=1` 全片重压的问题，并放开 `/tmp` 及系统临时目录下安全音视频/图文产物的只读预览与下载。

## [0.7.7] - 2026-11-17

### Fixed

- **修复已发送消息偶发残留在输入框草稿中的问题（`hub/web/src/controller.js` / `hub/web/src/components/ChatStage.tsx`）**：
  - 修复手机 5G 传图或发完即切后台/锁屏导致请求体虽已送达服务端执行、回包却被系统中断（`Load failed`）进而把已发文字误回填输入框并在 `visibilitychange` / `pagehide` 重新写入 `dsh_draft_v1_` 草稿的问题；
  - 修复 iOS 系统键盘语音听写/中文输入法在未失焦状态下点「发送」后异步延迟回写缓冲文本及 `composerDraftTimer` 竞态的问题；
  - 新增基于会话尾部消息基线计数的 `reconcileDeliveredComposerDraft` 自动对账清理（同步自动清除 `v0.7.6` 及更早版本已残留在手机 `localStorage` 里的旧消息草稿，同时保留用户真正重打的同词未发草稿）。

## [0.7.6] - 2026-11-17

### Fixed

- **交付文档胶囊去重与长文件名省略号修复（`dsh-feishu/lib/antigravity-ide.js` / `hub/web/src/utils/markdown.ts` / `hub/web/src/styles/app.css`）**：
  - 修复自定义 `.md` 产物标题拼成 `stem: stem.md`、在每步工具层提前注入 `📋 **[...](...)**\n> summary` 导致正文自身已带文件链接时重复渲染两次，以及 `📋` 与行内胶囊拆行、Flex 容器未包内联省略层导致长文件名被半字硬裁切的问题；同时前端 `formatAssistantText` 新增兼容去重清洗，无需等待远端旧版守护进程升级即可立即生效。
- **手机端长按保存图片失效与误选右上角「`📎 引用`」修复（`hub/web/src/controller.js` / `hub/web/src/styles/app.css`）**：
  - 修复 `setupSheetSwipeDismiss` 无滑动死区导致手指微颤打断图片长按，以及 iOS 主屏幕独立应用模式（Standalone PWA）屏蔽 `<img>` 原生菜单并向最近可选文字回退选中 `📎 引用` 的问题；支持主屏幕模式长按图片 `450ms` 预取文件并在松手时直接唤起系统原生保存/分享面板，同步在图片预览栏新增一键 **`⬇️ 保存图片`** 按钮，并为工具栏/面包屑补齐 `user-select: none`。
- **未发送上传图片跨会话串台与切回丢失修复（`hub/web/src/controller.js`）**：
  - 将聊天输入框待发送图片由全局单数组改为按 `sessionId` 独立隔离（`chatAttachmentsBySession` + `sessionStorage` 草稿持久化），切换其他会话不再带走当前未发图片，切回原会话时图片与待发送文字完整保留。

## [0.7.5] - 2026-11-17

### Added

- **iPhone 锁屏通知与飞书推送卡片高信噪比提纯引擎（`hub/push-formatter.js` / `hub/hub-core.js` / `dsh-feishu/lib/bridge.js`）**：
  - 单台电脑自动隐藏冗余机器全名（多机接入时智能消歧显示如 `办公·MBP · `），自动剥除会话标题重复项目/时间戳前缀、Markdown 标记、代码块、`file://` 长路径、环境变量前缀、`run_command (BypassSandbox)` 内部代号与开场客套话，并自动保留句末追问；双端屏蔽后台子智能体（Subagent）通知、为未确认瞬态审批增加 `1.5s` 防闪断去抖、按 `session-<id>` 自动顶替同会话过期横幅、修复 `running → approval → idle` 完成漏推问题；飞书长回复（`> 450` 字）推送卡片改为顶部直接露出 3 行核心结论 + 底部折叠完整正文。

### Fixed

- **手机原生语音识别防截断与同音改字去重（`hub/web/src/hooks/useVoiceInput.ts` / `controller.js`）**：
  - 移除松手后 `380ms` 强行 `abort()` 截断逻辑，改为监听系统整句级同音字修正定稿（`isFinal: true`）或 `onend` 后 `60ms` 极速发送（保留 `1200ms` 防挂起兜底）；为 `mergeSpeechResults` 增加最长公共子序列对齐与多候选置信度择优（`maxAlternatives = 3`）防止系统回溯改字时错句与正句重复拼接；换气断流自动续接延迟由 `150–180ms` 压至 `25ms`；补齐连续听写直接点击「发送」（`flushVoiceInputBeforeSend`）与连按两条语音的尾音收尾保护。

## [0.7.4] - 2026-11-16

### Added

- **AI 回复零配置纯算法语音播报（`hub/web/src/utils/speech.js` / `controller.js`）**：
  - 在每条 AI 回复底部紧邻 `📋 复制全文` 新增 **`🔊 播报`** 按钮，基于零 LLM、零人工词表的结构化 Markdown AST 清洗、词法可发音度分类与 TextRank 图排序摘要算法（`< 5ms`），支持 **`⚡ 重点` / `📖 全文`** 切换、优选系统神经网络单嗓子不断气直读、语音输入防串音自动停播，以及 `onboundary` + 已播时长双保险的**原地无损倍速切换（`1x / 1.25x / 1.5x`）**。

### Fixed

- **Cloud Run 反向文件隧道断连清理、多 `language_server` 摘要仲裁与内嵌视频懒加载（`hub/server.js` / `hub/hub-core.js` / `antigravity-ide.js` / `deploy-cloudrun.sh`）**：
  - 透传客户端断开 `AbortController` 信号并及时回收 `/api/fs-tunnel` 流槽位；多实例 `language_server` 按 `lastModifiedTime` 与活跃状态确定性择优；内嵌 `<video>` 改为 `preload="none"`；Cloud Run 默认升级为 `1Gi` 内存、`200` 并发与 `--cpu-boost`。
- **CI 发布防并发撞车与 README 折叠历史记录（`publish-npm.yml` / `docker-publish.yml` / `README*.md`）**：
  - 增加 GitHub Actions 工作流级 `concurrency` 互斥锁与 `EPUBLISHCONFLICT` 幂等保护，并将中英文 README 历史更新记录收敛为单行 `<details>` 折叠面板。

## [0.7.0] - 2026-11-12

### Added

- **全面支持上架 DSH Market 与官方 `dsh plugin` 一键安装（根目录标准 DSH Bundle 规范）**：
  - 仓库根目录补齐标准 DSH 插件清单与元数据（`package.json` 的 `dsh.bundle.patch`、`engines.dsh: ">=0.2.0"`、`exports`、`icon.svg`、`locale/en.json`、`locale/zh.json`、`locale/zh-CN.json`、`cordis.patch.yml` 与 `index.js`），支持通过 DSH 插件市场或 `dsh plugin --profile desktop add github:oscarka/deepseekharness-remotecontrol` 直接一键安装启用，同时完整兼容现有 Cloud Run / Docker / Railway 零依赖部署与 `connect-host.sh` 守护进程。
- **插件市场用户「零配置局域网总控台」即装即用模式（`dsh-feishu/lib/local-hub.js` / `dsh-feishu/index.js`）**：
  - 从 DSH 插件市场安装后若尚未配置远程 `hubUrl` 或飞书应用，插件自动在本机嵌入式拉起零依赖总控台（默认监听 `8788`，端口冲突时智能复用同机已启动的本地总控台或自动回退空闲端口），自动生成并持久化本机管理员密码（`~/.dsh/local-hub.token`）与 24 小时免密扫码配对链接（`~/.dsh/local-hub-info.json`），手机连同一 Wi-Fi 打开链接即可免配置直接遥控本机 DSH、Antigravity、Codex、Claude Code、WorkBuddy 与豆包；当用户后续配置 Cloud Run / Railway `hubUrl` 时无缝切换至云端跨网模式。

## [0.6.9] - 2026-11-12

### Added

- **零依赖智能媒体探测与三档自适应兼容流引擎（`workspace-ops.js` / `controller.js` / `filePreview.ts`）**：
  - 纯 Node.js 零外部依赖解析 ISO BMFF（`.mp4` / `.m4v` / `.mov`）盒子结构与 `avcC` 编码档位（`< 2ms`），自动分流 **L1 原画直出**（`H.264 yuv420p + faststart`）、**L2 无损毫秒级重封装**（`ffmpeg -c copy -movflags +faststart`，解决 `moov` 索引在文件尾或 `.mov` 容器）与 **L3 硬件优先兼容转码**（macOS `h264_videotoolbox` 硬件加速 → 跨平台 `libx264` 偶像素缩放保底 → macOS 原生 `/usr/bin/avconvert Preset1920x1080` 免依赖兜底，彻底解决 Blender / OpenCV 默认导出 `H.264 High 4:4:4 yuv444p`、`mp4v`、`hev1`、`.webm`、`.mkv`、`.avi` 在 iOS Safari 无法播放的问题），并内置并发请求单航道锁（Single-Flight Lock）与前端 `<video>` 错误 + 黑屏双保险自动降级。

### Changed

- **全链路真流式穿透隧道（True Stream Piping）与大文件多段无损拼接下载（`server.js` / `hub-core.js` / `hub-agent.js` / `controller.js`）**：
  - 移除 `/api/fs-tunnel/:reqId` 原先整块缓存在云端内存的 `readRawBodyBuffer` 存储转发，改为 `createReadStream` → `Readable.toWeb` → `stream.pipeline` 零缓冲直通转发，首字节响应（TTFB）降至 `< 100ms`，彻底消除跨国大视频上传引发的 `15s 504` 超时与云端内存峰值；`download=1` 遇到 `> 16 MiB` 文件返回 `HTTP 206` 时，前端自动循环拉取后续 `Range` 分片并无损拼装原始字节（规避 Cloud Run HTTP/1.1 `32 MiB` 网关单请求上限与 `16 MiB` 截断）。
- **无状态确定性媒体票据（Stateless Deterministic `mediaTicket`）**：
  - `HubCore` 基于 `HUB_TOKEN` 通过 HMAC-SHA256 确定性派生 `mediaTicket` 签名密钥（无密码本地模式持久化 `mediaSeed`，修改管理员密码时立即轮转失效），Cloud Run 缩容冷启动、Railway 重部署或多实例负载均衡下手机已打开页面的图片/视频流不再出现偶发 `401`。

## [0.6.8] - 2026-11-12

### Added

- **接入「豆包电脑版 (Doubao Desktop)」只读观测适配器（`doubao-adapter.js` / `harness-router.js` / `session-labels.js`）**：
  - 自动发现并解析本机豆包电脑版会话记录与 `aiboard` 编程任务，内置增量单文件 LevelDB + 沙盒元数据缓存与 `300ms` 监听防抖、`10 分钟` 异常强退僵尸运行态超时清理、纯闲聊会话空 `cwd` 隔离，以及观察态聊天框自动隐藏语音/图片发送栏与设置页第 6 行能力边界展示。
- **手机端 HTML 网页交互预览与全屏体验（`html-sandbox.js` / `markdown.ts` / `Sheets.tsx` / `controller.js` / `server.js`）**：
  - 全面覆盖 3 种场景：① 对话内 ```` ```html ```` 代码块右上角直接点 **`🌐 交互预览`**；② 对话中的 `.html` 本地路径胶囊（`` `demo.html` `` / `[index.html](file:///...)`）与产物卡片点 **`🌐 体验网页 ›`**；③ 文件抽屉或「项目文件」页直接打开 `.html` 文件。
  - 采用无同源权限的隔离沙盒 `<iframe sandbox="allow-scripts allow-forms allow-modals allow-popups" srcdoc="...">`（阻断读取 `HUB_TOKEN` 与 `localStorage`），自动补全移动端自适应 `<meta name="viewport">`，通过只读短效 `mediaTicket`（服务端精准下发 `Access-Control-Allow-Origin: *`）自动重写相对路径 CSS/JS/图片资源，并内置带顶部安全区 **`‹ 返回对话`** 栏与 **`</> 源码` / `🌐 预览`** 一键切换的 `#htmlPreviewOverlay` 全屏浮层。

### Fixed

- **修复手机 / iOS 主屏幕 PWA 点击「下载视频 / 下载文件」跳入无返回键系统预览死胡同页的问题（`controller.js`）**：
  - 移除会导致独立全屏窗口顶层跳转的裸 `<a href="...download=1" download>` 链接，改为原地流式 `fetch`（实时显示百分比进度）后直接唤起手机系统原生分享/保存面板（支持一键「存储视频」到系统相册、「存储到“文件”」、AirDrop 或微信发送；大文件蜂窝网络超时自动降级为二次轻触 `0ms` 瞬时拉起面板），全程不离开当前对话与预览页。

## [0.6.7] - 2026-11-12

### Fixed

- **会话列表排序优先级修正**（`session-labels.js` / `controller.js`）：将置顶会话（`📌 已置顶`）真正固定在列表最顶部（置顶组内仍按状态紧急度排序），并将未读完结结论 / 中断会话（`🔵 已出结论` / `⚠️ 中断待继续`）排在后台 `● 运行中` 会话之上，避免刚跑完出结论或手动置顶的对话被后台长任务挤到下方。
- **「设备与设置 → 各后端功能边界（诚实矩阵）」与电脑详情徽章同步更新**：补齐五大工具（`DSH`、`Antigravity IDE`、`Codex`、`WorkBuddy`、`Claude Code`）官方品牌矢量徽章与最新能力状态（`Codex` 与 `WorkBuddy` 均已完整支持手机审批与实时插话），并同步刷新 README 中英文配图。

## [0.6.6] - 2026-11-12

### Changed

- 全新重构「✨ 新建远程对话任务」半屏面板（`Sheets.tsx` / `controller.js` / `app.css`）：
  - 合并顶部「💻 执行电脑」与「⚡ 执行引擎」为双行紧凑结构化卡片
  - 「📁 项目工作区」改为单行横滑胶囊 + `全部 (N) ▾` 独立带搜索抽屉（`#newTaskProjectPickerSheet`），告别多项目折行刷屏并把首屏空间留给大号任务输入框
  - 输入卡片内置底栏工具条（`🤖 模型`、`🖼️ 截图`、`🎤 语音`）：保留原生 `<button>` 直接唤起手机系统语音识别（免弹键盘、录音态红底脉冲 `⏹ 停止`），并优化模型简称清洗以保留 `(High)` / `(Low)` 档位与精确版本号

### Fixed

- 修复腾讯 WorkBuddy 存活进程心跳文件（`~/.workbuddy/sessions/<pid>.json`，每 30 秒刷新 `lastHeartbeat`）被误导入为幽灵会话并持续排在会话列表顶部的 Bug（`WorkBuddyAdapter` 跳过进程心跳锁文件并保持真实会话历史时间戳，`HubCore` 服务端双保险过滤旧节点上报的 `workbuddy:<pid>` 空记录）

## [0.6.5] - 2026-11-12

### Fixed

- 修复 iOS Safari 网页语音识别（`webkitSpeechRecognition`）转文字缺少标点符号的问题（`useVoiceInput.ts`）：
  - 新增 `650ms` 说话停顿实时断句检测器（停顿换气时在绿色气泡内实时补上逗号 `，` 或问号 `？`，且兼容苹果对断点前同音字的动态修正）
  - 新增多分段衔接标点（`mergeSpeechResults`）、中文连读疑问分句自动加问号（如 `…吗？…`）与松手收尾句末标点补全（`？` / `。`，自动剥离悬空尾逗号，同时开启标准 `unspokenPunctuation = true`）

## [0.6.4] - 2026-11-11

### Added

- 手机端升级为**微信同款「按住 说话」语音交互**（`useVoiceInput.ts` / `ChatStage.tsx` / `app.css`）：
  - 底部输入栏支持一键切换「`🎙️ 按住 说话`」大按钮模式与「`⌨️ 打字`」键盘模式（手机端默认开启按住说话，记忆用户偏好，有未发草稿时自动展露文本框）
  - 按住按钮立即唤起微信风格全屏录音浮层：绿色语音气泡实时展示已识别文字与动态声波动画（按住期间停顿换气同样无缝续听不断流）
  - 完整支持三向手势操作：**直接松手 → 立即发送消息**（内置 380ms 尾音收尾缓冲确保最后半句不漏字 + `abort()` 强制熄灭麦克风红点）、**左滑松手 → 取消不发**、**右滑到「文」松手 → 填入输入框修改后再发**（发完自动切回按住说话条）

## [0.6.3] - 2026-11-11

### Fixed

- 修复手机端语音识别在说话中途换气/短暂停顿时自动中断的问题：开启 `continuous = true` 持续听写模式，新增 iOS Safari 静默断流（`onend` / `no-speech`）180ms 无缝续接新实例机制与 `mergeSpeechResults` 累积叠字去重算法，并改为按每次说话动态顺延 60 秒空闲看门狗（直到用户主动点 `⏹` 或直接点「发送」才结束）

## [0.6.2] - 2026-11-11

### Fixed

- 恢复手机端点击 `🎤` 直接调用系统自带原生语音识别（`SpeechRecognition` / `webkitSpeechRecognition`）而无需弹起软键盘的能力（移除 `useVoiceInput.ts` 中的 `isMobileTouch` 人为封锁与 `<label>` 强制弹键盘行为，彻底清理所有第三方输入法提示文案，新增 `audio-capture` 麦克风占用明确提示）
- 优化 `applyLangToDom` 与 `autoGrowComposer`：默认中文模式下跳过每次 SSE 推送的全页面 DOM 遍历且绝不改写聚焦输入框的 `placeholder` 属性，流式输入/听写期间避免无谓高度重算，防止打断系统听写

## [0.6.1] - 2026-11-11

### Changed

- 精简会话列表与头部信息架构，全面升级官方品牌矢量图标体系（抽离独立模块 `hub/web/src/utils/session-labels.js`）：
  - 内置 Antigravity IDE、腾讯 WorkBuddy、OpenAI Codex、Claude Code、DeepSeek Harness 5 套官方矢量 `<symbol>` 图标（采用 `24×24` 离屏视口容器保障 iOS Safari WebKit `<mask>` / `<filter>` 零裁剪渲染，并为聊天头 `#chatSub` 增加增量 DOM 比对防流式重绘闪烁）
  - 会话列表标题自动剥离与下方 `📁 工作区` 标签重复的 `<project> / ` 前缀，消除双倍冗余
  - 多机视图下的电脑徽章自动简写（如 `cc的MacBook Air` → `Air`；多台同型号 Mac mini 智能区分归属前缀并兼容拼音 `de` 主机名，如 `digtal·Mini`、`no2·Mini`，告别双重省略号截断）
  - WorkBuddy 时间戳工作区目录（`YYYY-MM-DD-HH-mm-ss`）智能浓缩：今日显示 `11:59`，同年份跨日显示 `11/10 15:09`（避免多会话筛选胶囊同名碰撞），跨年显示 `2025/12/31 09:05`

## [0.6.0] - 2026-11-11

### Added

- 实现真正的 **SSE 增量状态推送 (`event: state_delta`)**：新增服务端差分引擎 `hub/delta-state.js` 与前端无损合并器 `hub/web/src/state/delta-merge.js`，`/api/events?delta=1` 仅推送发生变更的主机元数据与单条会话（压缩后每次更新仅 `~1–3 KB`，相比此前全量广播降低 **98%+** 移动端实时流量），内置单调递增 `stateSeq` 连续性校验与断序自动回退 `/api/state` 自愈能力
- 推进前端 `controller.js` 模块化拆分：抽离 `hub/web/src/state/delta-merge.js`、`hub/web/src/utils/image-compress.js` 与 `hub/web/src/utils/semver.js` 独立模块

### Fixed

- 彻底修复移动端「已出结论」长回复内容被截断的问题：
  - `HubCore.compactBridgeStateForWire` 将每个主机前 6 条、所有运行中/待审批、以及最近 60 分钟内刚出结论或活跃的会话均纳入热会话保护，最新回复与结论配额恢复至完整 **`48,000` 字**（零截断）
  - 在 `renderActiveChatStage` 渲染阶段增加 `_wireTruncated` 自动检测与静默全文回填（`hydrateColdSessionTranscript`），即使直接停留在会话内跨状态切换或打开早先冷门历史会话也自动补齐 100% 原始全文
- 修复移动端发送高分辨率截图/长截图后偶发卡死、导致短时间内打不开页面的问题：
  - `compressImageFile` 改为低内存 `URL.createObjectURL` 异步解码 + iOS WebKit 安全像素面积上限（`3.6M px`，规避 Safari `16.7M px` Canvas GPU 进程崩溃白屏）+ 绘制后立即释放显存（`canvas.width = 0`）+ 自适应阶梯 JPEG 压缩，并禁止解码失败时回退裸发数 MB 原始图片
  - `dispatchHostCommand` 增加 `AbortController` 请求超时保护（附图 15 秒 / 普通指令 10 秒 + `cache: 'no-store'`），杜绝移动网络代理偶发卡包拖死 iOS Safari 复用的单条 HTTP/2 连接
  - 在版本热更新 `location.reload()`、`pagehide` 与 `beforeunload` 前显式调用 `closeSSE()`，根除幽灵双路 SSE 并发占满带宽

## [0.5.9] - 2026-11-11

### Fixed

- 修复多主机大工作区下移动端前台频繁弹出「网络连接中断，正在自动重连…」的问题：
  - `HubCore.compactBridgeStateForWire` 区分活跃会话与冷门历史会话预算（活跃会话保留 14 条详情，冷门空闲会话压缩为 3 条短摘要并支持点开对话时毫秒级静默按需回填全文），将 3 台电脑 65+ 会话的 `/api/state` 与 SSE 单帧压缩体积从 ~1MB 降至 ~100–200KB
  - `hub/server.js` 为浏览器 `/api/events` SSE 增加首帧立即推送 + 450ms 多主机心跳突发合并节流、`TCP_NODELAY`、`X-Accel-Buffering: no` 与 12 秒保活 `ping`
  - 前端 `fetchState()` 升级为单飞去重 + 12 秒 `AbortController` 超时 + 350ms 自动静默重试 + SSE 存活感知防抖（SSE 正常收包时绝不因后台兜底拉取偶发重置而误报断网横幅），并消除点击审批/发消息后的重复 `/api/state` 并发洪峰与 240 秒 SSE 轮转时的冗余拉取
- 优化移动端「设备与设置」主机一键升级版本号语义比对（`compareSemver`），支持直接从手机一键触发旧版 Mac mini 拉取最新 `main` 并热重启守护进程

## [0.5.8] - 2026-11-11

### Added

- 完善腾讯 WorkBuddy（v5.9.3）真机生产闭环：通过 `ACC_PRODUCT_CONFIG_PATH` 隔离独立 `workbuddy-cli` OAuth 凭证（与桌面端钥匙串凭证互不覆盖，支持自动弹浏览器授权与 `node dsh-feishu/daemon.mjs --workbuddy-login` 一键独立预授权）、按会话 `cwd` 隔离 `codebuddy --serve` 进程池（含进程退出与断连自动驱逐重拉，覆盖新建、追问与实时插话）、手机新建会话自动创建 `~/WorkBuddy/<时间戳>` Playground 目录，以及 `workbuddy.db` 与 `.jsonl` 双向落盘同步

## [0.5.7] - 2026-11-11

### Fixed

- 修复 iOS 主屏幕模式（Standalone PWA）点击语音按钮无法唤起系统键盘的问题：移动端统一采用手机自带键盘 / 豆包语音输入，升级为原生 `<label for>` 无拦截焦点关联并适配灵动岛安全区引导提示
- 修复电脑端先点审批、手机端再点残留按钮导致回退敲入数字 `"1"` 的竞态问题（待审批轨迹缓存缩短至 `350ms`，已处理审批幂等返回 `alreadySettled: true` 绝不触发模拟按键）
- 修复单元测试在宿主环境变量继承及空 `dshHome` 配置下的测试隔离问题

## [0.5.6] - 2026-11-11

### Fixed

- 修复 `/api/events` SSE 长连接满 300 秒被 Google Cloud Run 强制截断（`Truncated response body`）导致复用同一 HTTP/2 连接的 iOS 移动端 `POST /command` 偶发抛出 `Load failed` 审批异常报错的问题（新增 240 秒服务端优雅轮转 `event: rotate` + 浏览器与 Host 端平滑换流）
- 为 `dispatchHostCommand` 与 `HubCore.queueCommand` 增加客户端幂等 `id` 去重及网络闪断自动静默重试，消除手机唤醒/切网瞬间的偶发红字报错

## [0.5.5] - 2026-11-11

### Added

- 独立反向 HTTP 流式文件与媒体直连隧道（`/api/hosts/:hostId/fs/list|read|stream` + `/api/fs-tunnel/:reqId` + Host SSE `event: fs_req` 0ms 唤醒）
- 移动端原生视频预览与拖动分片秒播（`HTTP 206 Partial Content` + `Accept-Ranges: bytes` + `ETag` `304` 协商缓存 + `ffmpeg` / macOS `avconvert` 一键 H.264 转码兜底）
- 保长截图清晰度的 `sips` 智能缩略图（`> 300KB` 位图自动压缩并保留无损原图一键切换）、`walkthrough.md` 增量热缓存预热，以及不暴露 `HUB_TOKEN` 的短效只读 `mediaTicket` 票据
- OpenAI Codex（`codex app-server` JSON-RPC）与腾讯 WorkBuddy（ACP HTTP+SSE）全托管流式控制、实时插话与移动端权限审批支持

### Fixed

- 修复移动端/跨 Cloud Run 发送消息时，在「Host 心跳拉走指令 ~ 会话日志落盘回传」空窗期内气泡先消失再重现的问题（新增 `inflightCommands` 桥接与同名短句基线计数防误删）
- 修复 `deploy-cloudrun.sh` 升级已有 Cloud Run 服务时未保留线上 `HUB_TOKEN` 的问题

## [0.5.4] - 2026-11-10

### Added

- Antigravity IDE `walkthrough.md` 及产物文件在移动端对话气泡内的可点击胶囊与 Markdown 原生渲染预览
- 会话级模型双向同步（Antigravity IDE LanguageServer / DSH 会话模型识别与持久化）
- 首屏 `0ms` 本地快照瞬时渲染，彻底消除移动端浏览器打开时的白屏等待
- 中英双语 README（`README.md` / `README.zh-CN.md` / `README.en.md`）、`FAQ.md`、`SECURITY.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md` 与 `LICENSE`（MIT）

### Changed

- 极速心跳与增量同步（`v0.5.3`）：稳态网络流量降低 99.9%，静态资源与 API 全面启用 Gzip 压缩
- 移动端语音输入直接唤起系统键盘原生麦克风 / 豆包语音输入
- 重写 README：提供 3 步快速启动路径与中英双语实机演示 GIF（`docs/assets/`）
- 关于第三方托管服务的表述改为「兼容 / 可替代」，并补充独立性免责声明

## [0.2.0] - 2026-11-07

### Added

- 多 Harness 支持：Codex、Claude Code 适配器与能力矩阵，`FEISHU_ENABLED_HARNESSES` 开关
- 移动端体验优化：底部 5 Tab、手势、语音输入、深色模式修正
- 服务端 JSON gzip 压缩、会话记录裁剪、SSE 去重、预览快速切片
- 会话思考过程与工具步骤合并展示，完整工具参数/结果提取，回复上限提升到 48k
- 主机守护进程支持 macOS LaunchAgent 注册

### Fixed

- 修复 Apple APNs 403 `BadJwtToken`（`.local` subject），VAPID 改为确定性派生并自动重同步
- 修复空闲 POSIX 会话 `session.lock` 未释放导致 headless 恢复失败
- 修复审批回调 `renderAll` 崩溃及第二轮审计发现的 N1–N12 问题
- 修复语音输入中断生命周期、二进制预览与推送深链缺失

## [0.1.0] - 2026-11-02

### Added

- 飞书自建应用长连接遥控：`!sessions` / `!new` / `!steer` / `!files` / `!share`
- 工具审批卡片、完成与异常推送、白名单与审计日志
- 自托管 Hub：多机主从切换、一键迁移与源机清理
- 远程会话管理、工作区文件树与安全预览
- AES-256-GCM 端到端加密分享与回放
- Ed25519 设备指纹锁定 / 吊销、6 位配对码
- iOS 主屏幕 PWA 与 W3C Web Push（RFC 8292 / RFC 8291）
- 自托管 WebRTC 信令与 TURN 临时凭据
