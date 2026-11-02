# DeepSeek Harness · 飞书遥控与 Google Cloud Run 多机总控台

通过**飞书自建应用长连接**在手机端日常控制 DeepSeek Harness（查看运行中任务、审批工具调用、原地卡片输入继续、接收完成/异常与多媒体推送），并配套一个可一键部署到 **Google Cloud Run**（或本地运行）的**页面化多机总控台**，轻松实现：

1. **平时用飞书日常控制**：纯出站长连接（无需电脑公网 IP 或端口映射），离开电脑时发 `连接` 开启推送与卡片审批，回来发 `断开` 恢复安静。
2. **一个飞书机器人控制多台电脑（零冲突）**：总控台自动协调多台电脑的飞书长连接主从状态（Active / Standby），可在 Web 页面或飞书里发 `!hosts`（或 `主机`）一键切换当前飞书控制的电脑。
3. **页面化一键跨电脑迁移与临时清理**：在总控台网页上选择「源电脑 ➔ 目标电脑」，一键将 `~/.dsh` 会话历史与配置加密压缩迁移到新电脑、自动切换飞书控制权，并可选**自动清空源电脑上的会话数据**（适合临时换机办公）。

---

## 目录结构

```text
deepseekharness-remotecontrol/
├── dsh-feishu/                 # DSH 本地插件（跑在每台电脑的 DSH Desktop / dsh web 进程内）
│   ├── index.js                # 插件入口
│   ├── cordis.patch.yml        # DSH bundle 配置补丁
│   ├── lib/
│   │   ├── bridge.js           # 飞书交互卡片、审批拦截、完成推送、!hosts 多机切换
│   │   ├── feishu-transport.js # 飞书 WebSocket 长连接客户端（支持 Active/Standby 动态启停）
│   │   ├── hub-agent.js        # 与 Cloud Run 总控中心心跳同步、指令执行、快照收发
│   │   ├── migration.js        # ~/.dsh 数据盘点、快照打包导出、恢复导入、安全清理
│   │   ├── config.js           # 环境变量与 0600 密钥文件加载
│   │   ├── commands.js         # 命令解析
│   │   ├── audit.js            # 0600 JSONL 审计日志
│   │   └── redact.js           # 敏感凭据自动脱敏
│   └── test/                   # 单元与多机迁移全链路集成测试（36 项）
├── hub/                        # Google Cloud Run 页面化多机总控中心
│   ├── server.js               # 零外部依赖的 HTTP/REST 总控服务
│   ├── hub-core.js             # 多机在线状态、飞书主控协调、快照中转与一键迁移状态机
│   └── public/index.html       # 响应式可视化总控面板（多机切换、任务审批、一键迁移与清理）
├── Dockerfile                  # Cloud Run 标准容器构建文件
├── deploy-cloudrun.sh          # 一键部署到 Google Cloud Run 脚本
└── docs / 调研文档
    ├── DSH-远程访问评估.md
    ├── 完整RemoteWeb调查.md
    ├── 飞书控制方案与安全加固.md
    └── DSH-插件管理参考.md
```

---

## 快速开始

### 第一步：部署页面总控台到 Google Cloud Run（可选，支持多机切换与页面化迁移）

如果你希望有一个随时可打开的网页来切换多台电脑、页面化查看任务或一键迁移/清理电脑数据：

```bash
# 方式 A：一键部署到 Google Cloud Run
export PROJECT_ID="你的-gcp-project-id"
export REGION="asia-east1"
export HUB_TOKEN="自定义一个强密码Token"
./deploy-cloudrun.sh

# 方式 B：或者在本地 / 内网机器直接启动
HUB_TOKEN="自定义一个强密码Token" PORT=8080 npm start
```

打开部署后的 Cloud Run URL（或 `http://127.0.0.1:8080`），点击右上角 **「⚙️ 新电脑接入与配置生成」**，即可直接生成每台电脑的配置文件。

---

### 第二步：在每台电脑上安装 `dsh-feishu` 插件

1. **安装插件到 DSH**：

```bash
dsh plugin --profile desktop add /path/to/deepseekharness-remotecontrol/dsh-feishu
# 如果使用 dsh web：
dsh plugin --profile web add /path/to/deepseekharness-remotecontrol/dsh-feishu
```

2. **创建 0600 权限的 `~/.dsh/feishu.env` 配置文件**：

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

> **提示**：
> - 如果只有单台电脑，不需要设置 `FEISHU_HUB_URL` 和 `FEISHU_HUB_TOKEN`，插件会直接连入飞书。
> - 如果有多台电脑，在每台电脑设置不同的 `FEISHU_HOST_NAME`（如 `办公Mac`、`家里MacBook`）和相同的 `FEISHU_APP_ID` / `FEISHU_HUB_URL`，总控台会自动让当前主控电脑连接飞书、其余电脑处于飞书待机状态，彻底避免多机争抢飞书消息。

---

## 平时如何使用（飞书端 + 页面端）

### 1. 日常飞书单聊控制

| 飞书发送 | 作用 |
| --- | --- |
| `连接` / `!connect` | 开启远程模式（2 小时有效），汇总运行中任务、待审批与离线期间完成的任务 |
| `断开` / `!disconnect` | 退出远程模式，停止完成推送 |
| `!sessions` | 打开任务列表卡片（点击「查看详情」可停止运行中任务，或在底部输入框直接继续已完成任务） |
| `主机` / `!hosts` | 查看当前飞书绑定的是哪台电脑，并显示所有在线电脑按钮，点击即可**一键把飞书切换到另一台电脑** |
| `!host <电脑名或ID>` | 直接将飞书控制权切换到指定电脑 |
| `!web` | 获取 Google Cloud Run 页面总控台链接 |
| `!approve <code>` / `!deny <code>` | 批准或拒绝工具调用（卡片上也可直接点击按钮） |
| `!whoami` | 查看自己的飞书 `open_id` |

### 2. Google Cloud Run 页面端操作

在浏览器打开你的 Cloud Run 页面总控台：

- **切换飞书主控电脑**：在电脑卡片上点击 **「🎯 设为飞书主控」**，飞书机器人即刻切换到该电脑。
- **跨电脑一键迁移与临时移除**：
  - 在 **「⚡ 一键跨机转移向导」** 中选择 `源电脑` ➔ `目标电脑`。
  - 勾选 `迁移后自动移除源电脑上的 DSH 会话与配置`。
  - 点击 **「🚀 立即一键迁移」**：源电脑会自动将会话与配置打包上传并清空本机数据，目标电脑自动下载恢复并接管飞书控制。
- **单机备份与恢复**：随时点击电脑卡片上的 **「📦 导出备份到云端」** 或 **「🧹 临时清空本机」**（清空前会自动在云端留存一份快照，保留远控连接，日后可随时一键恢复回该电脑）。

---

## 运行测试

```bash
npm test
```
