# Changelog

本项目的重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- `LICENSE`（MIT）
- 英文 README（`README.en.md`）
- `SECURITY.md`：威胁模型、已知限制、部署检查清单、密钥轮换
- `CONTRIBUTING.md`
- GitHub issue / PR 模板
- 首屏 banner 与 Social Preview 源文件（`docs/assets/`）

### Changed

- 重写 README：首屏改为「问题 → 架构 → 快速开始」，补充 30 秒本地启动路径
- 内部设计文档移入 `docs/design/`
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
