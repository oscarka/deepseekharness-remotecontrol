# Changelog

本项目的重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
