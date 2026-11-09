<p align="center">
  <img src="docs/assets/banner.svg" alt="DSH Remote Control" width="100%" />
</p>

<h1 align="center">DSH Remote Control</h1>

<p align="center">
  <strong>把电脑上正在跑的 AI 编码任务装进手机口袋——随时看进度、发指令、紧急叫停，或者点一下批准操作。</strong><br/>
  代码与对话全部留在你自己的电脑上，不经过任何第三方托管平台。
</p>

<p align="center">
  <a href="https://railway.app/template?referralCode=dsh-remote"><img src="https://railway.app/button.svg" alt="Deploy on Railway" height="28" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3B82F6.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Docker-Mac%20%7C%20Linux%20%7C%20NAS%20%7C%20树莓派-10B981.svg" alt="Multi-Arch" />
  <img src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node >= 20" />
</p>

<p align="center">
  <strong>🇨🇳 简体中文</strong> · <a href="README.en.md"><strong>🇺🇸 English</strong></a> · <a href="#三步用起来">三步上手</a> · <a href="#支持哪些-ai-编程工具">支持工具</a> · <a href="#常见问题">常见问题</a> · <a href="docs/self-hosting.md">进阶部署</a> · <a href="SECURITY.md">安全说明</a>
</p>

<p align="center">
  <img src="docs/assets/demo.svg" alt="DSH Remote Control Demo" width="100%" />
</p>

---

## 为什么要做这个？

当你在电脑上让 AI 跑一个耗时半小时的重构或测试，人离开工位去喝咖啡、开会或坐地铁时，往往会遇到这三件事：

- ☕ **卡在半路等确认**：AI 要执行终端命令或弹出选择题等你拍板，你不在电脑前，任务就一直干等。
- 🚇 **跑偏了想插句话**：在路上突然发现它改错了方向，想立刻喊停，或者补一句“别动测试文件”。
- 🎉 **跑完了想马上知道**：不想每隔五分钟回工位看一眼，跑完直接锁屏通知你，顺手在手机上接着布置下一步。

**DSH Remote Control** 就是为了解决这三件事：在手机网页（或添加到桌面当 App 用）里直接盯着并指挥你名下所有的电脑。

---

## 三步用起来

不需要配飞书，也不用改任何代码，总共就 **3 步**：

### 第 1 步：启动你的控制台（二选一）

- **🏠 方式 A：直接在电脑上跑（推荐 · 0 成本、不用装 Docker、连 `npm install` 都不用）**  
  控制台使用纯 Node.js 原生内置模块编写（零第三方运行时依赖），前端页面已预编译在仓库里，克隆下来直接带密码启动即可：
  ```bash
  git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
  cd deepseekharness-remotecontrol
  HUB_TOKEN="自定义一个密码" PORT=8080 npm start
  ```

- **🚇 方式 B：出门在外、坐地铁也要随时连（云端一键部署）**  
  点一下这个按钮，自动从 GitHub 源码部署一台专属云端控制台，拿到一个公网网址：  
  [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template?referralCode=dsh-remote) *(前 30 天免费体验，之后约 \$5/月)*

<details>
<summary>💡 <b>想用 Docker 跑在云服务器 / 群晖 NAS / 树莓派，或配内网穿透？点此展开</b></summary>

如果你习惯用 Docker（每次推送到 GitHub `main` 分支时，GitHub Actions 会自动构建并发布多架构镜像，无需手动上传）：

```bash
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="自定义一个密码" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

| 你的情况 | 推荐做法 | 成本 |
|---|---|---|
| 有云服务器 (VPS) | 克隆仓库跑 `npm start`，或用 `docker-compose.yml` + 域名反代 | 服务器本身 |
| 家里有域名、无公网 IP | 本地跑 `npm start` + Cloudflare 免费固定隧道 | 域名年费 |
| 国内网络、无公网 IP | 本地跑 `npm start` + 国内内网穿透（cpolar / frp / natapp） | 0 起 |
| 群晖 NAS / 树莓派 | 直接跑上面的 Docker 命令（原生支持 `amd64` / `arm64` / `armv7`） | 0 |

完整配置命令请看 👉 **[自托管与反代配置指南 (docs/self-hosting.md)](docs/self-hosting.md)**

</details>

---

### 第 2 步：把你的电脑连上去

1. 在**电脑浏览器**打开控制台网址，输入你刚才设的密码登录。
2. 页面会直接给你**一行安装命令**（自带临时配对码），点「复制」粘贴到电脑终端回车。
3. 脚本会自动连上并注册开机自启，**网页会自动刷新出现你这台电脑**。

---

### 第 3 步：拿手机扫个码，装进口袋

1. 点击电脑网页上的 **「📱 手机扫码登录」** 按钮。
2. 用**手机相机扫一下屏幕上的二维码**，不用在手机上输长密码，直接解锁进入！  
   *(小贴士：iPhone 用 Safari 打开后点底部「分享 → 添加到主屏幕」，就能像原生 App 一样全屏用并收锁屏通知。)*

---

## 支持哪些 AI 编程工具？

界面上**能做到的才显示按钮，做不到的绝不放假按钮**：

| 你电脑上的工具 | 手机看进度 | 手机发指令 / 新建 | 手机紧急停止 | **手机弹窗审批 / 做选择题** | 运行中实时插话 |
|---|:---:|:---:|:---:|:---:|:---:|
| **DSH (DeepSeek Harness)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Antigravity IDE** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Claude Code** | ✅ | ✅ | ✅ | 计划中 | — |
| **Codex** | ✅ | ✅ | ✅ | 计划中 | — |

> **为什么手机审批目前只有 DSH 和 Antigravity 能用？**  
> 因为拦截危险命令需要在工具执行前挂钩（Hook）。DSH 与 Antigravity 已内置实时通道；Claude Code 的执行前钩子与 Codex 的常驻审批模式正在适配中。即使你只装了 Claude Code 或 Codex，依然可以在手机上看进度、发新指令和随时喊停。

---

## 常见问题

**Q：我有两台电脑（比如公司 Mac + 家里电脑），怎么一起管？**  
A：在第 2 台电脑上同样复制那行安装命令运行即可（同一个配对码 15 分钟内可连加多台），无需重启控制台。左上角可以随时切换电脑或混排查看全部对话。

**Q：我不想折腾飞书企业应用，能用吗？**  
A：**完全可以，默认就不需要飞书。** 打开手机网页或添加到主屏幕就能用全部功能。如果你平时重度用飞书、想顺便在飞书里收卡片，可以展开下方说明按需开启：

<details>
<summary>🔌 <b>可选：同时接入飞书机器人通知（点开查看）</b></summary>

1. 在[飞书开放平台](https://open.feishu.cn/)创建企业自建应用并开启机器人，开通 `im:message.p2p_msg:readonly` 与 `im:message:send_as_bot` 权限，事件订阅选**长连接**并添加 `im.message.receive_v1`。
2. 在电脑的 `~/.dsh/feishu.env` 中填入 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_ALLOWED_OPEN_IDS` 即可。

</details>

**Q：把控制台放在公网上安全吗？**  
A：
- **不设密码拒绝启动**：防止误把空密码服务暴露在公网。
- **每台电脑独立凭证**：电脑凭临时配对码加入，不接触你的管理员主密码；哪台电脑不用了，在手机「设置」里点一下「吊销凭证」就能单独踢掉。
- **防爆破保护**：登录与配对码均带真实 IP 限流与错误次数自动熔断。更多细节见 **[SECURITY.md](SECURITY.md)**。

<details>
<summary>🛠️ <b>本地开发与贡献代码（点开查看）</b></summary>

欢迎提 Issue 和 PR！开始前可参考 **[CONTRIBUTING.md](CONTRIBUTING.md)** 与 **[docs/PLAN.md](docs/PLAN.md)**。

```bash
npm install                      # 安装前端构建依赖
npm --prefix dsh-feishu install  # 安装插件测试依赖
npm test                         # 运行完整测试套件
npm run build                    # 构建前端静态页面
```

</details>

---

[MIT License](LICENSE) © 2026 oscarka
