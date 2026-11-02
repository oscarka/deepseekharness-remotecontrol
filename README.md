# DeepSeek Harness · 飞书遥控与全功能自托管总控中心（100% 脱离第三方服务器）

通过**飞书自建应用长连接**在手机端日常控制 DeepSeek Harness，并配套一个可一键部署到 **Google Cloud Run**（或本地运行）的**全功能自托管总控中心（Hub）**。

本项目不仅实现了你独有的**飞书多电脑主从切换 + 跨电脑一键迁移/临时清空**，还**完整逆向并自研实现了 `liguobao/ds-harness-remote` (`dsh.r2049.cn`) 与 `ccch1mneyyy/dsh-Go` (`go.dshtui.com`) 闭源服务端上的全部核心能力**，让你在不把任何控制权交给第三方服务器的前提下拥有全部功能：

### 核心能力一览

1. **平时用飞书日常控制（零公网端口暴露）**：
   - 纯出站长连接，离开电脑时发 `连接` 开启完成/异常推送与卡片审批，回来发 `断开` 恢复安静。
   - 支持在飞书直接发 `!new <任务指令>` 远程新建会话、发 `!steer <插话>` 向运行中任务实时插话、发 `!files` 查看工作区文件、发 `!share` 生成端到端加密对话回放链接。
2. **一个飞书机器人控制多台电脑（Active / Standby 自动协调）**：
   - 总控台自动协调多台电脑的飞书长连接主从状态，可在 Web 页面或飞书里发 `!hosts`（或 `主机`）一键切换当前飞书控制的电脑，彻底避免多机抢消息。
3. **跨电脑一键迁移与原机安全清空**：
   - 在总控台网页上选择「源电脑 ➔ 目标电脑」，一键将 `~/.dsh` 会话历史与配置加密压缩迁移到新电脑、自动切换飞书控制权，并可选**自动清空源电脑上的会话数据**（保留飞书连接配置以便随时迁回）。
4. **完整逆向并自托管实现 `dsh.r2049.cn` + `go.dshtui.com` 服务端全套功能**：
   - **远程新建/重命名/删除会话 + 完整对话/思考/工具步骤回放**：在自建 Web 总控台直接选工作区路径新建会话，展开查看每条消息的 `💭 思考过程` 与 `🔧 工具调用步骤`。
   - **运行中实时插话（Mid-run Steer）与打断重发（Interrupt）**：即使任务正在 `running`，也可实时注入补充指令或一键打断当前步骤重发新指令。
   - **远程工作区文件树浏览与代码/图片安全预览**：在 Web 页面直接浏览远程电脑工作区目录、预览代码与图片（严格限制在工作区根目录内，防符号链接越界，并自动脱敏密钥）。
   - **端到端加密（AES-256-GCM）会话分享与动画回放（替代 `go.dshtui.com/c/<id>#k=<key>`）**：在本机用随机 256 位密钥加密对话，服务端只存密文与 IV，解密密钥仅存在于 URL `#k=` 锚点中，打开 `/share/:id#k=...` 即可在浏览器本地解密并播放对话动画回放。
   - **Ed25519 设备公钥指纹锁定（Pinning）与吊销（Revocation）**：每台电脑自动生成 `feishu-host.json` 密钥对与 12 位十六进制指纹（如 `ABCD EF01 2345`），首次连接自动锁定公钥（防伪造顶替），支持在 Web 页面一键吊销或重置设备信任。
   - **手机 6 位配对码 / 免密链接登录 + 自托管 WebRTC 信令与 TURN 临时凭据签发**：完全脱离 `dsh.r2049.cn` 的配对与信令接口（`/api/pairing/*`、`/api/v1/signaling`、`/api/v1/turn/credentials`）。

---

## 目录结构

```text
deepseekharness-remotecontrol/
├── dsh-feishu/                 # DSH 本地插件（跑在每台电脑的 DSH Desktop / dsh web 进程内）
│   ├── index.js                # 插件入口
│   ├── cordis.patch.yml        # DSH bundle 配置补丁
│   ├── lib/
│   │   ├── bridge.js           # 飞书交互卡片、审批拦截、完成推送、多机切换、Steer 队列
│   │   ├── workspace-ops.js    # Ed25519 设备指纹、远程新建/重命名/删除会话、工作区文件树与安全预览
│   │   ├── feishu-transport.js # 飞书 WebSocket 长连接客户端（支持 Active/Standby 动态启停）
│   │   ├── hub-agent.js        # 与自建总控中心心跳同步、指令执行、快照收发、AES-256-GCM 加密分享
│   │   ├── migration.js        # ~/.dsh 数据盘点、快照打包导出、恢复导入、安全清理
│   │   ├── config.js           # 环境变量与 0600 密钥文件加载
│   │   ├── commands.js         # 命令解析
│   │   ├── audit.js            # 0600 JSONL 审计日志
│   │   └── redact.js           # 敏感凭据自动脱敏
│   └── test/                   # 单元与全链路集成测试（37 项）
├── hub/                        # 自托管 Google Cloud Run 页面化总控中心
│   ├── server.js               # 零外部依赖的 HTTP/REST + E2EE 回放页 + 信令/配对服务
│   ├── hub-core.js             # 多机状态、指纹锁定/吊销、飞书主控协调、快照迁移、加密分享存储
│   └── public/index.html       # 全功能可视化总控面板（Deepy 状态栏、文件浏览器、对话回放、迁移向导）
├── Dockerfile                  # Cloud Run 标准容器构建文件
└── deploy-cloudrun.sh          # 一键部署到 Google Cloud Run 脚本
```

---

## 快速开始

### 第一步：部署自托管总控中心到 Google Cloud Run（或本地运行）

```bash
# 方式 A：一键部署到你自己的 Google Cloud Run
export PROJECT_ID="你的-gcp-project-id"
export REGION="asia-east1"
export HUB_TOKEN="自定义一个强密码Token"
./deploy-cloudrun.sh

# 方式 B：或者在本地 / 内网服务器直接启动
HUB_TOKEN="自定义一个强密码Token" PORT=8080 npm start
```

---

### 第二步：在每台电脑上配置 `~/.dsh/feishu.env`

```bash
install -m 600 /dev/null ~/.dsh/feishu.env
cat > ~/.dsh/feishu.env <<'EOF'
FEISHU_HOST_NAME=办公Mac
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_ALLOWED_OPEN_IDS=ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_HUB_URL=https://你的-cloud-run-服务地址.run.app
FEISHU_HUB_TOKEN=你的总控台Token
EOF
chmod 600 ~/.dsh/feishu.env
```

---

## 飞书命令速查

| 飞书发送 | 作用 |
| --- | --- |
| `连接` / `!connect` | 开启远程模式（2 小时有效），汇总运行中任务、待审批与离线期间完成的任务 |
| `断开` / `!disconnect` | 退出远程模式，停止完成推送 |
| `!sessions` | 打开任务列表卡片（点击「查看详情」可停止运行中任务，或在底部输入框直接继续已完成任务） |
| `!new <任务指令>` | 在当前电脑工作区直接远程新建一个会话并开始执行 |
| `!steer <补充指令>` | 向正在运行（或最近活跃）的任务实时插话或排入下一轮队列 |
| `!files [子目录]` | 查看当前任务工作区目录下的文件列表 |
| `!share` | 为当前任务生成端到端加密（AES-256-GCM）对话回放分享链接 |
| `主机` / `!hosts` | 查看所有已接入电脑的状态卡片，点击按钮即可**一键把飞书切换到另一台电脑** |
| `!host <电脑名或ID>` | 直接将飞书控制权切换到指定电脑 |
| `!web` | 获取自托管 Web 页面总控台链接 |
| `!approve <code>` / `!deny <code>` | 批准或拒绝工具调用（卡片上也可直接点击按钮） |
| `!whoami` | 查看自己的飞书 `open_id` |

---

## 运行测试

```bash
npm test
```
