# Changelog

本项目的重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
