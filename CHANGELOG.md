# Changelog

本项目的重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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
