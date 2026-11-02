# dsh-feishu

把正在运行的 DSH 任务接到飞书，用**长连接**远程查看、停止、审批和继续；同时支持接入 **Google Cloud Run 页面总控台** 实现多台电脑共享同一个飞书机器人、一键切换主控电脑、以及页面化一键迁移/清理 DSH 数据。

## 使用方式

平时不推送。离开电脑时发「连接」（或点卡片上的「连接远程」）进入远程模式：

1. 先告诉你**有几个任务正在运行**。
2. 其余任务按最后互动时间排序。
3. 连接卡片顶部是「需要你」收件箱：待审批可直接批准/拒绝，最近异常和刚完成的任务可直接查看。
4. 点任意任务的「查看详情」直接打开，不用先选中或切换。
5. 运行中的任务只能停止；已完成/空闲的任务在详情底部有输入框，输入后直接让它继续。
6. 输入框提交后，**同一张详情卡**先变成「已发送，执行中…」，结果出来后原地变回可继续的状态；不会留下旧的输入框或停止按钮。
7. 连接期间只推**任务完成/异常**和**审批**；2 小时无操作自动断开。
8. 完成/异常推送**本身就是一张任务卡**：直接显示渲染后的输出和输入框，不需要再点「查看详情」。同一任务的新推送会把旧卡归档，避免留下多个可输入框。
9. 多台电脑接入 `FEISHU_HUB_URL` 时，发送 `主机` 或 `!hosts` 即可在飞书卡片中查看所有电脑并一键切换当前控制的电脑。

## 安装

Desktop App 使用 `desktop` profile：

```bash
dsh plugin --profile desktop add /path/to/deepseekharness-remotecontrol/dsh-feishu
```

创建密钥文件（不要提交、不要发到聊天里）：

```bash
install -m 600 /dev/null ~/.dsh/feishu.env
cat > ~/.dsh/feishu.env <<'EOF'
FEISHU_HOST_NAME=MacBook-Pro
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_ALLOWED_OPEN_IDS=ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# 可选：接入 Google Cloud Run 页面总控台以支持多电脑切换与一键迁移
FEISHU_HUB_URL=https://your-service.run.app
FEISHU_HUB_TOKEN=your-secret-token
EOF
chmod 600 ~/.dsh/feishu.env
```

`FEISHU_ALLOWED_OPEN_IDS` 逗号分隔。第一次可以先留空，给机器人发 `/whoami` 拿 `open_id`，再填入并重启。

## 命令

| 命令 | 作用 |
| --- | --- |
| `连接` / `!connect` | 进入远程模式，显示运行数和任务列表 |
| `断开` / `!disconnect` | 退出远程模式 |
| `!sessions` | 任务列表；`!sessions all` 包含空会话 |
| `主机` / `!hosts` | 查看多台电脑状态并在飞书内一键切换主控电脑 |
| `!host <id>` | 切换飞书主控到指定电脑 |
| `!web` | 查看 Web 页面总控台地址 |
| `!approve <code>` | 批准一次 |
| `!deny <code>` | 拒绝 |
| `!whoami` | 查看自己的 `open_id`（允许列表为空时也可用） |
| `!ping` | 检查桥是否在线 |
| `!help` | 使用说明 |

## 测试

```bash
cd dsh-feishu
npm test
```
