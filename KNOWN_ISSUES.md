# 已知问题

这里记录**已知的、目前不打算马上修**的限制。开 issue 之前先看一眼，能省双方的时间。

如果你遇到的**不在这个列表里**，那很可能是真 bug，欢迎报。

---

## 能力限制

### Claude Code 暂不支持手机审批与运行中实时插话

- **现象**：用 Claude Code 时，界面上没有「批准」按钮，任务运行中也不能实时追加指令（DSH、Antigravity IDE、OpenAI Codex、腾讯 WorkBuddy 均已完整支持手机审批、选择题弹窗与运行中实时插话）
- **原因**：Claude Code 适配器目前通过 `claude --resume` 按轮次调用，尚未接入常驻交互钩子
- **临时办法**：需要手机审批或实时插话时优先用 DSH / Antigravity / Codex / WorkBuddy；在 Claude Code 中可先停止当前轮次再带新指令继续
- **状态**：计划中

### WorkBuddy 首次远程发消息需在电脑浏览器点一次授权

- **现象**：首次从手机给腾讯 WorkBuddy 发消息时，提示需完成一次浏览器登录授权，同时电脑自动弹出浏览器授权页
- **原因**：WorkBuddy 桌面端通过系统钥匙串（Electron `safeStorage`）加密保存 `workbuddy-desktop.info`，外部 CLI 进程无法直接解密；因此守护进程通过官方 `ACC_PRODUCT_CONFIG_PATH` 为 CLI 隔离了独立的 `workbuddy-cli` OAuth 凭证（`workbuddy-cli.info`），与桌面端登录态互不覆盖、互不顶号
- **解决办法**：首次在电脑弹出的浏览器页面点一次「确认授权」即可永久生效；也可在电脑终端主动运行一次 `node dsh-feishu/daemon.mjs --workbuddy-login` 提前完成授权
- **状态**：安全隔离设计如此

### WorkBuddy 桌面端对已打开会话有内存缓存

- **现象**：手机上给 WorkBuddy 会话发消息并收到回复后（数据已完整写入 `~/.workbuddy/projects/<slug>/<id>.jsonl` 与 `workbuddy.db`，手机新建对话也会自动归入 `~/WorkBuddy/<时间戳>` Playground 目录），电脑上正在运行且**此前已点开过该会话**的 WorkBuddy 桌面端不会实时刷新显示新消息
- **原因**：WorkBuddy 桌面端后台 `daemon-app-server`（`ConversationBridge._pool`）与渲染层（`rehydrateConversation`）将已加载会话缓存在内存中，不监听外部进程对 `.jsonl` 的追加写入；其内部网关受进程内存随机密钥保护，外部进程不应绕过
- **解决办法**：手机端可随时连续收发；桌面端此前未点开过的会话（含手机新建会话）在重开或首次加载时直接可见；对于已在桌面端打开过的旧会话，回到电脑前按 `Cmd + Q` 重开一次 WorkBuddy 桌面端即可完整加载手机期间的全部对话记录
- **状态**：上游桌面端架构限制

---

## 部署限制

### 只支持单实例

- **现象**：多开几个容器，各管各的，数据不共享
- **原因**：状态存在进程内存里（会话索引、审批队列、心跳）
- **临时办法**：只跑一个实例；需要更多并发就升配置
- **状态**：非目标，不打算支持集群

### 没挂数据卷，重启就丢

- **现象**：Docker 容器重启后，配对记录、设备信任、分享链接没了（本机直接跑 `npm start` 默认会自动持久化到 `~/.dsh/hub-state.json`）
- **原因**：容器内未挂载持久化目录时，状态随容器销毁
- **临时办法**：Docker 启动时挂一个卷，并把 `HUB_STATE_FILE` 指到卷里
- **状态**：文档会写清楚，不做自动迁移

### Railway 免费额度撑不住常驻服务

- **现象**：部署两三天后服务停了
- **原因**：Free 计划每月只有 $1 额度；0.5 GB 常驻内存约 $5/月
- **临时办法**：升级到 Hobby（$5/月），或者部署到 Google Cloud Run / 自己的服务器
- **状态**：不是 bug，是平台定价

---

## 环境限制

### 电脑睡眠或关机就断开

- **现象**：手机连不上，任务停在半路
- **原因**：任务在你自己电脑上跑，Hub 只做中转，不替你执行
- **临时办法**：把电脑设成不睡眠；或用一台常开的机器（如 Mac mini）跑任务
- **状态**：设计如此

### Windows 未验证

- **现象**：一键接入脚本是 bash + LaunchAgent，Windows 上用不了
- **原因**：目前只面向 macOS 和 Linux
- **临时办法**：手动起后台进程，参考 `daemon.mjs`
- **状态**：待补

### Tailscale 登录在国内可能需要代理

- **现象**：登录页打不开，或一直转圈
- **原因**：登录要走它的官网，国内访问不稳定
- **临时办法**：登录时挂代理；登录后设备间通常能直连
- **状态**：环境问题，非项目可控

---

## 安全相关

### 飞书需要一个自建应用

- **现象**：不能像普通机器人那样扫码即用
- **原因**：走的是飞书自建应用的长连接，需要 App ID / Secret，企业环境还要管理员审核
- **临时办法**：直接用手机 Web 总控台（含 iOS 主屏幕 Web Push 锁屏通知），不配飞书也能完整使用
- **状态**：设计如此

---

## 报新问题

不在上面的，请 [开 issue](https://github.com/oscarka/deepseekharness-remotecontrol/issues/new/choose)，附上：

- 操作系统与版本
- 用的哪个 harness（DSH / Antigravity / Codex / WorkBuddy / Claude）
- 部署方式（本地 / 服务器 / Cloud Run / Railway）
- 相关日志（**记得去掉 token 和路径里的用户名**）

安全漏洞不要开公开 issue，走 [SECURITY.md](SECURITY.md) 的私密报告。
