<div align="center">
  <img src="docs/assets/hero-banner-zh.svg" alt="AI 编程手机总控台 — 手机遥控 Claude Code、OpenAI Codex、Antigravity IDE 与 DeepSeek Harness" width="100%" />

  <p align="center">
    <strong>把电脑上正在跑的 <a href="#支持的-ai-编程工具">Claude Code、OpenAI Codex、Antigravity IDE、DeepSeek Harness (DSH) 与 WorkBuddy</a> 装进手机口袋 —— 100% 开源自托管、零第三方中继。<br/>手机滑卡批阅、一键放行命令与多选弹窗、微信式按住说话插话、或点 <code>🔊 播报</code> 直接听结论。</strong>
  </p>

  <p align="center">
    <a href="https://harness.agentrun.vip/?demo=1&amp;lang=zh"><img src="https://img.shields.io/badge/%E2%9C%A8_%E5%9C%A8%E7%BA%BF%E4%BA%A4%E4%BA%92%E4%BD%93%E9%AA%8C_Demo-%E5%85%8D%E5%AE%89%E8%A3%85%E7%A7%92%E5%BC%80-10b981?style=for-the-badge" alt="在线交互体验 Demo" height="32" /></a>
    &nbsp;
    <a href="https://railway.com/deploy/dsh-remote-control-hub?referralCode=44kg1p&amp;utm_medium=integration&amp;utm_source=template&amp;utm_campaign=generic"><img src="https://railway.com/button.svg" alt="Deploy on Railway" height="32" /></a>
  </p>

  <p align="center">
    <strong>⚡ 5 秒连上你自己的 Mac / Linux（同一 Wi-Fi · 终端直接打印二维码 · 零配置）：</strong>
  </p>

```bash
npx deepseekharness-remotecontrol
```

  <p align="center">
    <sub>自动启动本地总控台、自动发现本机 Claude Code / Codex / Antigravity / DSH 会话，并在终端打印手机扫码免密二维码。</sub>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/npm-deepseekharness--remotecontrol-cb3837?logo=npm&logoColor=white" alt="npm package" />
    <img src="https://img.shields.io/badge/%E6%94%AF%E6%8C%81%E7%94%B5%E8%84%91-macOS%20%7C%20Linux%20%7C%20NAS%20%7C%20%E6%A0%91%E8%8E%93%E6%B4%BE-0f766e" alt="支持平台" />
    <img src="https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white" alt="Node >= 20" />
    <img src="https://img.shields.io/badge/%E6%8E%A7%E5%88%B6%E5%8F%B0%E7%95%8C%E9%9D%A2-%E4%B8%AD%E8%8B%B1%E5%8F%8C%E8%AF%AD%E8%87%AA%E5%8A%A8%E8%AF%86%E5%88%AB-2563eb" alt="中英双语控制台" />
  </p>

  <p align="center">
    <a href="./README.md">🇺🇸 English</a> · <strong>🇨🇳 简体中文</strong> · <a href="https://harness.agentrun.vip/?demo=1&amp;lang=zh">✨ 在线 Demo</a> · <a href="#三步快速上手">4G/5G 跨网部署</a> · <a href="#支持的-ai-编程工具">支持工具</a> · <a href="#最近版本更新记录">版本更新</a> · <a href="#常见问题">常见问题</a>
  </p>
</div>

<br/>

<table align="center">
  <tr>
    <td align="center" width="33%">
      <img src="docs/assets/screen-sessions-zh.png" width="250" alt="五大 AI 工具统一会话列表与置顶对话" /><br/>
      <sub><strong>① 五大工具会话一屏总览</strong><br/>统一看管 Claude Code、Antigravity IDE、Codex、DSH 与 WorkBuddy，支持原生「📌 置顶对话」与完结未读</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/screen-triage-zh.png" width="250" alt="滑卡批阅模式：右滑批准命令、多选题与未读结论" /><br/>
      <sub><strong>② 滑卡批阅模式（Swipe Triage）</strong><br/>像刷卡片一样右滑放行命令、回答多选架构题，或长按语音告诉 AI 改怎么干</sub>
    </td>
    <td align="center" width="33%">
      <img src="docs/assets/screen-approve-zh.png" width="250" alt="手机审批命令、微信式按住说话与语音播报" /><br/>
      <sub><strong>③ 审批 · 语音插话 · 听回复</strong><br/>手机点一下拍板执行，内置按住说话语音输入、<code>🔊 播报</code> 听结论与 HTML 沙盒交互预览</sub>
    </td>
  </tr>
</table>

<div align="center">
  <br/>
  <img src="docs/assets/live-demo-zh.gif" alt="15 秒真机流程演示：电脑卡在终端命令确认，手机点一下批准立即跑完单测并同步结论" width="100%" />
  <br/>
  <sub><strong>🎬 15 秒完整流程演示：</strong>左边电脑卡在单测命令授权 → 打开右侧手机控制台点一下 <code>Submit ↵</code> 批准 → 左边电脑瞬间继续跑完 42 项单测并把最新结论同步回手机。</sub>
</div>

---

## 为什么要做这个？

当你在电脑上用 **Claude Code**、**OpenAI Codex**、**Antigravity IDE**、**DeepSeek Harness (DSH)** 或 **腾讯 WorkBuddy** 跑一个长任务（重构代码、跑全量测试、部署服务）时，人一离开工位往往就会遇到这些痛点：

- **卡在弹窗干等**：AI 跑到一半弹出一个 *"是否允许执行 `npm run test:integration`？"* 或弹出一个多选确认框，你不点同意它就一直停在那里。
- **出门在外两眼一抹黑**：下楼买咖啡、在地铁上或躺在沙发上时，想看一眼任务跑完没有、按住语音像发微信一样说一句补充指令、传一张手机截图，或者发现跑偏了立即叫停。
- **多台电脑来回切**：公司一台 Mac、家里两台 Mac mini 都在跑任务，想在一个手机页面里统一看管。

**DSH Remote Control** 把你电脑上正在跑的 AI 编程会话装进手机浏览器里（内置**微信同款「按住说话」语音转文字 + 智能中文标点**、**`🔊 播报` 纯算法一键听回复（支持 `⚡ 重点` / `📖 全文` 切换与原地无损倍速）**，支持 iOS 16.4+ 添加到主屏幕开启原生锁屏推送，支持中英文自动识别与一键切换）。

---

## 先花 10 秒搞懂：自托管架构（不依赖任何第三方厂商中转）

整个系统只有两个极轻量的部分，控制权完全掌握在你自己手里：

```
┌──────────────────────────┐        HTTPS / 实时 SSE         ┌─────────────────────────────────┐
│     📱 你的手机 PWA      │  ◄─────────────────────────────►  │   🏠 你自己部署的控制台 Hub     │
│  审批 · 插话 · 查代码    │                                   │  (本机 / NAS / VPS / 你的云端)  │
└──────────────────────────┘                                   └────────────────┬────────────────┘
                                                                                │ 电脑主动向外连接 (免公网 IP)
                                                       ┌────────────────────────┴────────────────────────┐
                                                       ▼                                                 ▼
                                      ┌─────────────────────────────────┐               ┌─────────────────────────────────┐
                                      │ 💻 电脑 A (公司 MacBook-Pro)    │               │ 💻 电脑 B (家里主机 Mac-Studio) │
                                      │ DSH · Antigravity · Codex       │               │ DSH · Codex · WorkBuddy         │
                                      └─────────────────────────────────┘               └─────────────────────────────────┘
```

1. **控制台 (`Control Hub`)**：一个零外部依赖的轻量级 Node.js 网页服务，由你自己选择部署位置（首选 Railway 一键上云，也可部署在你自己的 VPS + Cloudflare CDN、NAS、本机电脑或 Cloud Run 上），不需要绑定到任何第三方厂商统一托管的 SaaS 中转服务。
2. **电脑端后台服务 (`connect-host.sh`)**：在你写代码的 Mac / Linux 电脑上用一行命令装好的后台小助手。它负责读取本机正在跑的 AI 任务并主动连上你的控制台（因此**你的电脑不需要公网 IP，也不用配路由器端口映射**）。

> **透明的数据边界说明**：你自己部署的控制台 Hub 会在内存中保存近期会话元信息与活跃对话快照，以便手机端秒开查看；你的项目完整源代码、截图与演示视频留在电脑本地，仅当你在手机里点开时通过独立反向 HTTP 流式隧道按需读取（支持 `HTTP 206 Range` 视频拖动分片秒播、长截图保真智能缩略图，以及不暴露主密码的短效只读 `mediaTicket` 票据）。生成的回放分享链接 (`/share/:id#k=...`) 采用浏览器端 AES-256-GCM 端到端加密。完整边界说明见 [`SECURITY.md`](./SECURITY.md)。

---

## 三步快速上手

> **⚡ 5 秒本机体验（一行 `npx` 终端出码 · 支持 Claude Code / Codex / Antigravity / DSH / WorkBuddy · 零配置）**：
> ```bash
> npx deepseekharness-remotecontrol
> ```
> 无需 `git clone`、无需云服务器、无需写配置：3 秒内自动启动本地总控台 + 扫描本机 AI 编程会话，并**直接在终端里打印手机可扫二维码**，手机连同一 Wi-Fi 扫一扫即刻免密遥控！
>
> **🔌 如果你在使用 DeepSeek Harness (DSH &gt;= 0.2.0)**，也可以直接在 **DSH 插件市场** 搜索安装，或运行：
> ```bash
> dsh plugin --profile desktop add github:oscarka/deepseekharness-remotecontrol
> # 若使用 dsh web，可将 desktop 换成 web
> ```
> 想出门在外用 **4G/5G 跨网 24 小时随时遥控多台电脑**？按下面 3 步部署你自己的云端总控台：

### 第 1 步：启动你的控制台（4 种方式任选其一）

你可以根据自己的使用场景，从下面 4 种方式里选最顺手的一种启动控制台：

#### 🌟 方式 A：Railway 网页一键部署（首选推荐 · 免装命令行，1 分钟搞定 24 小时 4G/5G 跨网远控）
如果你想在地铁、咖啡馆用手机 4G/5G 随时遥控家里或公司的电脑，又不想在本地折腾云平台 CLI 或自己维护服务器，直接点击本页顶部的 **Deploy on Railway** 按钮（或[直接打开官方一键模板](https://railway.com/deploy/dsh-remote-control-hub?referralCode=44kg1p&utm_medium=integration&utm_source=template&utm_campaign=generic)）：
- 模板会自动预生成随机强密码 `HUB_TOKEN`（你也可以在部署页直接改成自己好记的强密码）。
- 点一下 **Deploy** 约 1 分钟即自动分配公网 `https://` 域名，原生支持 SSE 实时长连接，多台电脑 24 小时在线常驻费用固定可控（Hobby 计划约 $5/月）。

#### 🏠 方式 B：克隆代码在电脑本机直接跑（最快 30 秒体验 · 同一 Wi-Fi 下 0 成本）
不需要云服务器，也不需要装 Docker。只要电脑有 Node.js（>= 20），克隆仓库加密码参数直接启动：

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol

# 把「自定义一个密码」换成你自己的密码
HUB_TOKEN="自定义一个密码" PORT=8080 npm start
```
终端会同时打印出本机地址 `http://localhost:8080` 和局域网地址 `http://192.168.1.x:8080`。

#### 🐳 方式 C：自有云服务器 / VPS / NAS / 树莓派（Docker 或搭配 Cloudflare CDN / 隧道）
如果你有自己的轻量云服务器 / VPS（推荐搭配 Nginx + Cloudflare 边缘 CDN 开启 HTTP/2 &amp; HTTP/3 加速）、群晖 NAS 或软路由，可以直接用一行 Docker 命令启动（或者本机 `npm start` 搭配 `cloudflared` / `cpolar` / `Tailscale`）：

```bash
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="自定义一个密码" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

#### ☁️ 方式 D：Google Cloud Run 云端脚本部署
如果你习惯使用 GCP `gcloud` 命令行部署，可直接运行项目自带的一键脚本（提示：由于接入的电脑守护进程会 24 小时保持 SSE 与心跳长连接，电脑在线期间 Cloud Run 实例会保持常驻计费而不会缩容到 0；多机长期在线更推荐上面的 Railway 或轻量 VPS 方案）：

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol

# 把 your-gcp-project-id 换成你的 Google Cloud 项目 ID，密码换成你自己的密码
GCP_PROJECT_ID="your-gcp-project-id" \
HUB_TOKEN="自定义一个安全密码" \
./deploy-cloudrun.sh
```
脚本跑完后会直接打印出你的专属 `https://dsh-remotecontrol-hub-xxx.run.app` 控制台网址。

<div align="center">
  <img src="docs/assets/step1-login-zh.png" width="260" alt="第 1 步：打开控制台网页并输入管理密码解锁" /><br/>
  <sub><strong>第 1 步对应画面：</strong>在电脑浏览器打开你的控制台网址，输入刚才设置的 <code>HUB_TOKEN</code> 密码解锁（右上角可随时一键切换中/英文）。</sub>
</div>

---

### 第 2 步：把你的电脑连上控制台（复制一行命令回车）

在电脑浏览器解锁进入控制台后，首页会直接显示**「💻 本机未接入 · 3 步开启手机远控」**引导卡片（自带 15 分钟有效的配对码）：

1. 点击卡片上的 **「📋 复制一行安装命令」**（如果你刚才已经克隆了仓库，也可以点「📋 已克隆仓库用此条」）。
2. 打开你电脑的终端（Terminal），粘贴并回车：
   ```bash
   curl -fsSL https://你的控制台网址/install.sh | bash -s -- --code ABCD-1234
   ```
3. 脚本会自动为这台电脑申请独立凭证、注册开机后台自启服务，2 秒内网页就会自动刷新显示「电脑已接入」！

<div align="center">
  <img src="docs/assets/step2-pair-zh.png" width="260" alt="第 2 步：复制控制台上的一行接入命令" /><br/>
  <sub><strong>第 2 步对应画面：</strong>直接点击卡片上的「📋 复制一行安装命令」到电脑终端粘贴运行，无需手动改任何配置文件。</sub>
</div>

---

### 第 3 步：拿出手机扫码，免密直接遥控

1. 在电脑浏览器的控制台页面上，点击 **「📱 手机扫码登录」**。
2. 拿出手机打开相机扫一扫屏幕上的二维码 —— **不用在手机上敲长密码**，扫码即刻解锁进入！
   - *贴心防坑*：如果你在电脑上是用 `http://localhost:8080` 打开的，弹窗会自动识别并把二维码网址切换为你电脑的局域网 IP（如 `http://192.168.1.x:8080`），确保手机连同一 Wi-Fi 时一扫就能通。
3. **iPhone 锁屏通知（强烈推荐）**：在手机 Safari 点底部 **「分享 → 添加到主屏幕」**，从桌面图标打开进入 **「设备与设置 → 📲 开启推送」**，任务跑完或需要你拍板时手机锁屏就会直接弹窗提醒。

<div align="center">
  <img src="docs/assets/step3-qr-zh.png" width="260" alt="第 3 步：手机相机扫码免密登录" /><br/>
  <sub><strong>第 3 步对应画面：</strong>点击「📱 手机扫码登录」，用手机相机扫一扫即可免输密码直接登录。</sub>
</div>

---

## 支持的 AI 编程工具

电脑接入后，后台服务会自动扫描并同步你电脑上以下 6 款工具的真实会话：

| AI 编程工具 | 手机看实时进度 | 新建 / 续聊发指令 | 紧急停止 | 手机批准命令与多选题弹窗 | 运行中实时插话 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **DeepSeek Harness (DSH)** | ✅ | ✅ | ✅ | ✅ *(支持命令审批 + `ask_user_question` 多选卡 + 方案确认卡)* | ✅ |
| **Antigravity IDE** | ✅ | ✅ | ✅ | ✅ *(Connect-RPC + 原生按键注入)* | ✅ |
| **OpenAI Codex** | ✅ | ✅ *(`codex app-server` + `codex exec` 兜底)* | ✅ | ✅ *(通过 `app-server` JSON-RPC 支持命令审批与提问卡)* | ✅ |
| **Tencent WorkBuddy** | ✅ | ✅ *(ACP HTTP+SSE)* | ✅ | ✅ *(支持 ACP 权限确认弹窗)* | ✅ |
| **Claude Code** | ✅ | ✅ *(通过 `claude --resume`)* | ✅ | ✅ *(官方 `PermissionRequest` Hook：支持 Bash、Edit、Write、MCP 与 `AskUserQuestion`)* | — |
| **豆包电脑版 (`Doubao Desktop`)** | ✅ *(只读观测)* | — | — | — | — |

---

<a id="最近版本更新记录"></a>
## 📅 最近版本更新记录

> 💡 按**自然日**折叠汇总，每条内保留完整子版本号；逐版本详细变更请见 [`CHANGELOG.md`](CHANGELOG.md)。

<details>
<summary><strong><code>2026-11-19 · v0.8.9–v0.8.21</code> — Antigravity 多选题修复、Claude Code 原生手机审批、<code>npx</code> 终端出码 &amp; <code>?demo=1</code> 沙盒</strong></summary>

- **修复 Antigravity `ask_question` 多选题渲染与提交续跑（`v0.8.20–v0.8.21`）**：完整解析 `ask_question` 的单选/多选题目并支持从 `transcript_full.jsonl` 回补被截断的 `tool_calls`，将 `kind: 'question'` 与完整选项数组透传至手机审批卡与滑卡批阅；提交时先通过 `CancelCascadeInvocation` 解除等待态，再通过 `SendUserCascadeMessage` 直接发送勾选结果，根治此前提交被误判为「跳过弹窗」并停跑的问题。
- **Claude Code 原生手机审批与滑卡批阅全面打通（`v0.8.19`）**：新增官方 `PermissionRequest` Hook 桥接脚本（`claude-permission-hook.js` + `--install-claude-hook` / `npx` 启动自动装配）与 `<120ms` FSEvents 瞬时监听，支持手机端一键放行、`本对话始终允许`（`updatedPermissions`）、拒绝与 `AskUserQuestion` 多选题回传，自此五大主力引擎（Claude Code、Codex、Antigravity IDE、DSH、WorkBuddy）全部满血支持手机审批。
- **一行 `npx` 终端出码 &amp; 零后端交互体验沙盒 `?demo=1`（`v0.8.18`）**：新增 `npx deepseekharness-remotecontrol`（`dsh-remote`）零配置命令行入口，3 秒拉起本地总控台 + 自动发现多引擎会话并在终端打印 ISO/IEC 18004 高对比度手机扫码二维码；上线纯浏览器内存隔离、零 API 请求零隐私泄露的 `?demo=1` 在线交互体验沙盒（双机 5 引擎、滑卡批阅、HTML 实时预览、自由发消息），全面焕新中英首屏定位与实机高清截图。
- **断流显式提示与列表预览严格对齐（`v0.8.16–v0.8.17`）**：修复新提问到来时未重置 `lastOutput` 导致旧回复串入列表预览的问题，改为严格对齐最新一条消息；自动提取并折叠展示 Antigravity `ERROR_MESSAGE` 连续断流报错（`⚠️ 执行中断` + `⚠️ 中断待继续`），并在聊天页停在工具步骤无最终总结时直接显示琥珀色续跑提示条。
- **零延迟结论同步（`v0.8.15`）**：移除 `/api/events` SSE 流的 `gzip` 压缩缓冲（消除 Cloudflare / 移动代理对微小增量帧的数秒缓冲，结论与审批事件 `<=30ms` 直推），打通 Service Worker `PUSH_RECEIVED` / `NOTIFICATION_CLICK` 与 `1.2s` 切回前台即刻强刷，任务出结论瞬间自动清理 `inflightCommands`，并将 Antigravity `RUNNING` RPC 缓存从 `2.5s` 压至 `350ms`。
- **多端与各 Harness 会话置顶（Pin）双向实时互通 &amp; 零误报 CI（`v0.8.13–v0.8.14`）**：升级为云端 Hub 持久化的 `sessionPinState`（`POST /api/sessions/pin` + SSE 增量广播），手机列表新增 **「📌 置顶对话」** 独立分组栏与 `📌 置顶` 角标，双向打通 **Antigravity IDE**（`annotations/<convId>.pbtxt` + Connect-RPC `UpdateConversationAnnotations` + FSEvents 监听）、**DSH 桌面版**（`workspace.json`）、**Codex 桌面版**（`.codex-global-state.json` 含 Electron Atom 状态）、**WorkBuddy**（`workbuddy.db` + `pinned-sessions.json`）与 **豆包**（LevelDB `pinned`）；全量补齐 `sqlite3` `.timeout 5000` + WAL 与 CI `--test-concurrency=4` 根治偶发锁库邮件。
- **用户已发截图缩略图预览 &amp; 根治消息流突变跳回旧对话（`v0.8.12`）**：用户气泡内裸露的本地图片路径改为固定比例可点击高清缩略图（支持 `.dsh-uploads` / `.user_uploaded` 双路径兜底、放大与长按保存）；升级为手势驱动 `chatPinnedToBottom` + 捕获阶段 `<img>` `load` 与 `ResizeObserver` 贴底锁，彻底根治加载图片或补齐正文时突然往上跳回旧对话的 Bug。
- **交付文档 / 改动文件卡片重构与文件抽屉上拉近全屏（`v0.8.9–v0.8.11`）**：移除硬编码纯黑底色与整行等宽字，改为浅/深色自适应主题卡片且默认单行缩略收起不占屏；补齐「AI 交付文档」`展开 ⌄ / 收起 ⌃` 与「Files With Changes」折叠、「查看改动」专页及「确认已阅」点后自动消失闭环；`#inChatFileSheet` 支持原生双挡位上拉展开至近全屏（`80dvh` ↔ `97dvh`）。

</details>

<details>
<summary><strong><code>2026-11-18 · v0.7.8–v0.8.8</code> — 滑卡批阅模式、HLS + WebRTC P2P 视频流、PWA 全屏手势 / 防丢 WAL &amp; 升级秒开</strong></summary>

- **发前防丢 WAL、零跳变直出全文 &amp; PWA 全屏手势打磨（`v0.8.4–v0.8.8`）**：新增 `dsh_inflight_outbox_v1` 发前预写发件箱并将带图上传超时延至 `45s`，严禁选图/上传或会话打开中触发后台重载；首屏 `lite=1` 后后台静默升级 48,000 字完整正文并修复底部卡片被 Flexbox 压扁；为 iOS 主屏幕 PWA 打造全区域双向跟手左滑/右滑返回（流式输出防断触）以及重阻尼二段式下拉刷新（`32px` 死区、`155px` 静默同步、`285px` 带百分比清缓存强更新）。
- **行业标准 HLS 切片视频流、零依赖 WebRTC P2P 与 Cloud Run 小分片流水线（`v0.7.8`, `v0.8.2–v0.8.3`）**：全面升级 RFC 8216 HLS（`index.m3u8` + `4s .ts` / `30fps` 限帧 + `hls.js` 跨平台按需加载 + `~/.dsh/cache/hls` 自动 GC），叠加纯 Node.js 零依赖 WebRTC `RTCDataChannel` 局域网/NAT 直连与 `1 MiB / 2 MiB` 小分片 `720p` 秒看流及 `fs_abort` 断流秒停；新建任务新增远程 `📂 选择目录` 与 `＋ 新工作区` 创建，并修复 SW 升级锁旧包与 iOS 空白瓦片问题。
- **滑卡批阅模式（`Triage Deck`）、升级后 `<100ms` 秒开 &amp; iOS 原生高清图标（`v0.8.0–v0.8.1`）**：新增四宫格沉浸式手势滑卡批阅审批/多选题/未读结论（含全英文模式）；引入 SW 本地应用壳缓存（`Stale-While-Revalidate`）、`<head>` 并行预拉 `?lite=1`（体量直降 ~75%）、Brotli/Gzip 内存预压、启动自动暖 CDN 与无白屏静默热升级；内置全尺寸光栅 PNG 图标修复 iOS 主屏幕灰字 `D` 问题。
- **AI 回复语音播报防断停修复（`v0.7.9`）**：强引用防 GC 回收 + CommonMark §4.5 代码围栏精准配对 + `WakeLock` 防息屏，默认 **`📖 全文`** 从头到尾不断流播报带代码长回复。

</details>

<details>
<summary><strong><code>2026-11-17 · v0.7.5–v0.7.7</code> — 原生语音精度跃升、双端推送提纯、长按存图、图片按会话隔离 &amp; 清除已发草稿残影</strong></summary>

- **已送达消息草稿自愈清理（`v0.7.7`）**：新增 `lastSentComposerGuard` 与 `reconcileDeliveredComposerDraft`，拦截 iOS 键盘延迟回写与 5G `Load failed` 误回填，彻底消除已发消息残留在输入框的问题。
- **交付文档胶囊去重、主屏幕长按存图 &amp; 图片附件按会话隔离（`v0.7.6`）**：去重 Antigravity 自定义 `.md` 报告重复摘要块并修复长胶囊省略号；主屏幕 PWA 支持长按 `450ms` 唤起系统保存/分享面板并杜绝误选 `📎 引用`；未发送截图按 `sessionId` 独立持久化隔离绝不串台。
- **手机原生语音识别跃升 &amp; iPhone / 飞书推送高信噪比提纯（`v0.7.5`）**：移除 `380ms` 提前截断改等 `isFinal` 同音修正定稿、LCS 去重合并与 `25ms` 换气极速续接；共享零模型 `push-formatter.js` 剥除 Markdown/路径/客套话、屏蔽 Subagent 噪声并补齐 `1.5s` 瞬态审批防闪断。

</details>

<details>
<summary><strong><code>2026-11-16 · v0.7.4</code> — AI 回复一键语音播报（<code>🔊 播报</code>）、Cloud Run 流式加固 &amp; 多实例同步</strong></summary>

- **零配置纯算法 AI 回复语音播报（`v0.7.4`）**：每条回复内置 **`🔊 播报`**（`< 5ms` 纯算法 Markdown 清洗、**`⚡ 重点`** / **`📖 全文`** 切换、原地无损 `1x / 1.25x / 1.5x` 变速与录音自动静音）。
- **Cloud Run 隧道断连自愈、多 `language_server` 仲裁 &amp; 流水线串行锁（`v0.7.4`）**：透传客户端断连 `AbortController` 及时释放隧道、按时间戳仲裁多 Antigravity 实例防止旧摘要覆盖，并为发布工作流增加并发串行锁。

</details>

<details>
<summary><strong><code>2026-11-15 · v0.7.3</code> — 正式收录官方插件市场 &amp; OIDC 免密溯源发布</strong></summary>

- **正式收录 `awesome-dsh-plugin` 官方列表 &amp; OIDC 可信发布（`v0.7.3`）**：补齐 `screenshots.json` 规范并入官方目录，切换为 GitHub Actions OIDC 免密可信发布（`npm publish --provenance` + SLSA v1 溯源签名）。

</details>

<details>
<summary><strong><code>2026-11-14 · v0.7.2</code> — OpenAI Codex 全功能深度远控引擎（<code>app-server</code> + <code>codex exec</code>）</strong></summary>

- **Codex 多轮续聊稳定化、推理档位与 MCP 审批（`v0.7.2`）**：轮次结束自动 `thread/unsubscribe` 释放单写者锁并支持残留锁自愈、`mergeCodexTranscripts` 无损合并历史与流式吐字；支持手机切换推理强度（`High` / `xHigh`）、实时 `📋 执行计划`、修改文件 Diff 卡片与 MCP 工具调用审批。

</details>

<details>
<summary><strong><code>2026-11-13 · v0.7.1</code> — 子智能体（Subagent）自动归并父对话 &amp; ChatGPT 无边框排版</strong></summary>

- **Subagent 自动归并父会话 &amp; 无边框文档流排版（`v0.7.1`）**：全链路识别 Antigravity / DSH / Claude Code 子智能体并折叠入父对话工具块，剔除独立僵尸子会话；移除 AI 回复外层气泡框释放约 `15%` 手机有效阅读宽度。

</details>

<details>
<summary><strong><code>2026-11-12 · v0.6.8–v0.7.0</code> — 上架 DSH Market 零配置插件、全格式自适应视频引擎、HTML 交互预览 &amp; 豆包观测</strong></summary>

- **DSH Market 一键安装与零配置嵌入式本地总控（`v0.7.0`）**：完整适配 DSH `>= 0.2.0` Bundle 插件规范，未配云端时自动启动 `8788` 本地总控与 Wi-Fi 扫码地址，配置 `FEISHU_HUB_URL` 后无缝切换跨网云端模式。
- **三档自适应视频兼容引擎与零缓冲流式隧道（`v0.6.9`）**：纯 Node.js `< 2ms` 解析 MP4/MOV 自动分流原画直出、`faststart` 无损重封装与硬解 H.264 转码，反向隧道 TTFB `< 100ms` 且支持大视频多段无损拼接下载。
- **手机端 HTML 隔离沙盒交互预览、iOS 原地保存视频、豆包观测 &amp; 微信式语音（`v0.6.3–v0.6.8`）**：支持代码块/产物 `.html` 直接在零权限沙盒内全屏交互体验；修复 iOS 视频下载死胡同改为原地流式拉取唤起系统分享；新增豆包电脑版观测适配器、微信同款「按住说话」与 `state_delta` 增量同步（省流 98%+）。

</details>

<details>
<summary><strong><code>2026-11-11 · v0.5.6–v0.5.8</code> — 反向流式文件隧道、<code>206 Range</code> 视频秒播、WorkBuddy 自愈 &amp; 手机语音</strong></summary>

- **腾讯 WorkBuddy 进程自愈、手机原生语音 &amp; 审批防误敲（`v0.5.7–v0.5.8`, `v0.6.2`）**：隔离 `workbuddy-cli` OAuth 凭证、按 `cwd` 维护 ACP 进程池断连自愈并双向同步 `workbuddy.db`；新增直调手机原生语音识别，并强化电脑已点审批的幂等 `alreadySettled` 防误敲保护。
- **反向流式文件隧道、`206 Range` 视频秒播 &amp; Codex/WorkBuddy 深度接入（`v0.5.3–v0.5.6`）**：新增 `/fs/list|read|stream` 与 `/api/fs-tunnel` 二进制通道、`240s` 优雅 SSE 轮转防 Cloud Run 截断、`inflightCommands` 发送零闪烁，以及 Codex `app-server` / WorkBuddy `ACP` 实时流式接入。

</details>

<details>
<summary><strong><code>2026-11-09 · v0.5.0</code> — 中英双语控制台、聊天内嵌本地图片 &amp; 文件速览胶囊</strong></summary>

- **控制台支持中英双语 (`中文` / `English`)**：自动根据浏览器语言识别中英文，并在登录框、顶栏与设置页提供 `🌐 EN / 中文` 一键切换按钮。
- **聊天直接渲染本地生成图 + 可点击文件胶囊**：DSH 与 Antigravity IDE 在本机生成的渲染对比图（含 `.gemini/antigravity/brain/` 产物与 `carousel` 轮播图）直接在手机聊天气泡内加载显示；对话中的 `[file.py](file:///...)` 路径自动渲染为可点击胶囊，配合 Hub 6 小时缓存与电脑端毫秒级 Fast-Flush 立即回传，点开代码和图片速度提升约 3–5 倍。
- **DSH 选择题与方案审批弹窗**：完整支持在手机端直接点选回答 DSH 的 `ask_user_question`（单选/多选/自定义输入）与 `exit_plan_mode` 方案确认弹窗。
- **新用户首次部署防坑闭环与 Cloud Run 自动重连**：非 Docker 直接运行 `npm start` 时自动回退持久化状态至 `~/.dsh/hub-state.json`；电脑用 `localhost` 打开生成手机二维码时自动修正为本机局域网 IP；Cloud Run 容器重部署或缩容重启后自动恢复已配对电脑的 `hst_...` 凭证。
- **多电脑电量与网络延迟监控**：在「设备与设置」卡片中实时展示笔记本电池百分比、充电/电源直供状态、低电量预警与 Wi-Fi/局域网延迟 (`rttMs`)。

</details>

<details>
<summary><strong><code>2026-11-07 · v0.4.0</code> — 一行命令配对接入、单机独立凭证吊销 &amp; 手机传截图</strong></summary>

- 新增 15 分钟有效的多机配对码与 `/install.sh` 一键接入流程；每台电脑分配独立可吊销的访问凭证与 Ed25519 设备指纹；支持在手机对话与新建任务时直接上传相册截图并自动压缩。

</details>

<details>
<summary><strong><code>2026-11-06 · v0.3.0</code> — 四大 AI 编程工具统一接入 &amp; Rust 极速实时引擎</strong></summary>

- 在 DSH 基础上新增对 Antigravity IDE、OpenAI Codex 与 Claude Code 的统一会话发现与远程控制，内置 `dsh-turbo` 原生加速模块与 SSE 双向实时流。

</details>

<details>
<summary><strong><code>2026-11-05 · v0.2.0</code> — iOS 16.4+ 锁屏 Web Push 推送、跨电脑迁移 &amp; 加密分享</strong></summary>

- 支持零外部依赖的 iPhone 主屏幕 Web Push 锁屏通知、跨电脑一键打包迁移 `~/.dsh` 会话，以及 AES-256-GCM 端到端加密会话回放分享链接 (`#k=`)。

</details>

---

## 安全与隐私设计

- **强制密码保护**：未设置 `HUB_TOKEN` 时服务端拒绝裸奔启动，登录与配对接口均内置防暴力破解限流。
- **一机一证随时吊销**：每台接入的电脑使用独立凭证 (`hst_...`)，如果某台旧电脑不用了，在手机「设置 → 已接入电脑」里点一下 **「🚫 吊销凭证」** 即可单独断开，不影响其他电脑。
- **端到端加密回放分享**：生成的会话分享链接在你的电脑本地完成 AES-256-GCM 加密，解密密钥只存在于链接末尾的 `#k=` 锚点中，不经过服务端。
- **插件本地权限透明披露**：作为 DSH 插件运行时，仅读取本机已安装 AI 编程工具的本地会话状态（如 `~/.dsh`、Antigravity、Codex、Claude Code、WorkBuddy、豆包会话目录）及你在手机端主动点开的工作区文件；**内置零第三方遥测与零外部厂商中转**，默认仅在本机局域网监听（需本机随机强密码或一次性配对码鉴权），仅在你主动配置 `FEISHU_HUB_URL` 或飞书自建应用凭证时才会向你指定的地址发起连接。

---

## 常见问题

<details>
<summary><strong>1. 手机上点了「允许」，为什么 Mac 上的 Antigravity IDE 没自动点确认？</strong></summary>
<br/>
首次在 macOS 使用时，打开电脑的<strong>「系统设置 → 隐私与安全性 → 辅助功能」</strong>，把你的终端（Terminal / iTerm）或 Node 勾上即可（也可以在手机控制台顶部点 <strong>「⚡ 极速 → 🔓 在电脑弹出辅助功能授权框」</strong> 一键唤起）。
</details>

<details>
<summary><strong>2. 为什么我的 iPhone 没收到锁屏推送通知？</strong></summary>
<br/>
苹果 iOS 规定只有「添加到主屏幕」的网页应用才能发锁屏推送。请用 iPhone 的 <strong>Safari</strong> 打开控制台网址，点底部 <strong>「分享 → 添加到主屏幕」</strong>，然后从手机桌面上的新图标点进去，在「设备与设置」里点「📲 开启推送」即可。
</details>

<details>
<summary><strong>3. 怎么在电脑上停止或卸载后台服务？</strong></summary>
<br/>
在项目目录执行 <code>./connect-host.sh --uninstall</code>，或者在终端运行：<br/>
<code>launchctl unload ~/Library/LaunchAgents/com.dsh.remotecontrol.plist</code>
</details>

<details>
<summary><strong>4. 手机给腾讯 WorkBuddy 发消息提示登录授权，或电脑上已打开的会话没实时刷出新消息？</strong></summary>
<br/>
• <strong>首次一次浏览器授权</strong>：WorkBuddy 桌面端通过系统钥匙串加密保存 GUI 登录态，因此守护进程为独立 CLI 隔离了专用 OAuth 凭证（<code>workbuddy-cli.info</code>），与桌面端互不顶号。首次从手机发消息时电脑会自动弹出浏览器授权页（也可在电脑运行 <code>node dsh-feishu/daemon.mjs --workbuddy-login</code> 提前完成），点一次「确认授权」即永久生效。<br/>
• <strong>桌面端缓存刷新</strong>：手机收发的消息均实时写入 <code>~/.workbuddy/projects/</code> 与 <code>workbuddy.db</code>；若某个会话此前已在电脑 WorkBuddy 窗口点开过（受桌面端内存缓存机制影响），回到电脑前按 <code>Cmd + Q</code> 重开一次 WorkBuddy 桌面端即可完整加载手机期间的全部记录。
</details>

---

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

