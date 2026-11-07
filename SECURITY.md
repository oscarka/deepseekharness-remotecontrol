# 安全策略

## 支持范围

只有 `main` 分支的最新提交会收到安全修复。项目当前处于 `0.x` 阶段，接口与配置项可能变化，但安全问题的修复会优先合入。

## 报告漏洞

**请不要开公开 issue。**

请通过 GitHub 的 [Private Vulnerability Reporting](https://github.com/oscarka/deepseekharness-remotecontrol/security/advisories/new) 提交，或直接联系仓库维护者。请附上：

- 复现步骤或 PoC
- 影响范围（能读到什么、能改什么）
- 你使用的版本 / commit

48 小时内会有人回复。在修复发布前，请不要公开细节。

---

## 威胁模型

### 信任边界

| 组件 | 是否可信 | 说明 |
| --- | --- | --- |
| 你的电脑与 `~/.dsh/` | ✅ 可信 | 会话、密钥、审计日志都在这里 |
| 自托管 Hub | ⚠️ 半可信 | 能看到会话元数据与**明文**会话快照；看不到 E2EE 分享的明文 |
| 飞书开放平台 | ⚠️ 半可信 | 消息内容会经过飞书服务器，按你的租户策略留存 |
| APNs | ⚠️ 半可信 | 只承载推送载荷，不含会话正文 |
| 公网其他人 | ❌ 不可信 | 不应能连上任何东西 |

**关键结论**：这个项目不是"端到端加密的聊天工具"。如果你不希望会话内容经过飞书或你的 Hub，就不要把内容发进去。E2EE 只覆盖 `!share` 生成的分享链接。

### 攻击面

1. **Hub 的 HTTP 接口** —— 唯一对外暴露的面。
2. **飞书机器人** —— 任何能给机器人发消息的人。
3. **本地插件进程** —— 运行在 DSH 进程内，拥有 `ctx.agents` 权限。
4. **供应链** —— 插件会被装进 DSH，代码可读性很重要。

---

## 已实现的控制

### 认证

- Hub 所有 `/api/*` 接口（除 `/api/pairing/exchange`、`/api/auth/verify`、`/healthz`）都要求 `HUB_TOKEN`。
- 比对使用 `timingSafeEqual`，避免时序侧信道（`hub/server.js`）。
- 支持三种携带方式：`Authorization: Bearer <token>`、`X-Hub-Token` 头、`?token=` 查询参数。**推荐只用前两种**（见「已知限制」）。

### 手机配对

- 6 位配对码，有 TTL，一次性使用。
- 失败尝试按来源分桶限流，1 分钟窗口内超过阈值返回 `429`（`hub/hub-core.js`）。

### 密钥与文件权限

- `~/.dsh/feishu.env` 必须是 `0600`；启动时 `stat` 校验，组或其他用户可读则**直接拒绝启动**（`dsh-feishu/lib/config.js`）。
- 设备密钥 `~/.dsh/feishu-host.json`、审计日志 `~/.dsh/feishu-audit.jsonl` 写入时强制 `0600`。
- 环境变量优先级高于密钥文件，便于在 CI/容器里注入。

### 授权

- `FEISHU_ALLOWED_OPEN_IDS` 白名单之外的发送者不会拿到任何会话内容。
- `allowGroup` 默认关闭；群聊需要显式开启。
- 每个 agent 同时只能绑定一个控制会话，重新绑定会撤销旧会话的审批权。

### 工作区隔离

- 文件浏览与预览限制在工作区根目录内：先 `realpath` 解析，再做前缀比对，符号链接指向根目录外会被跳过（`dsh-feishu/lib/workspace-ops.js`）。
- 预览内容会经过 `redact.js` 脱敏常见凭据。

### 数据保护

- 分享使用 AES-256-GCM，随机 256 位密钥，密钥只存在于 URL 的 `#k=` 片段，**不会出现在任何 HTTP 请求里**。
- Hub 只存密文与 IV。
- 迁移快照使用加密压缩包，可选是否包含凭据文件。

---

## 已知限制

这些是当前实现里真实存在的短板，请按需加固：

1. **VAPID 密钥有回退链。** 未设置 `VAPID_SECRET` 时，会依次回退到 `HUB_TOKEN`、`FEISHU_HUB_TOKEN`，最后是内置常量。这意味着 **Hub token 泄露 = 推送身份泄露**。生产部署务必设置独立的 `VAPID_SECRET`：

   ```bash
   export VAPID_SECRET="$(openssl rand -hex 32)"
   ```

2. **`?token=` 查询参数会进日志。** 网关访问日志、浏览器历史、`Referer` 都可能记录完整 URL。请只用 `Authorization` 头。

3. **Cloud Run 的 Hub 状态默认落在 `/tmp`。** 容器重启后会话元数据与分享密文会丢失。需要持久化就把 `HUB_STATE_FILE` 指向挂载卷。

4. **单实例假设。** 部署脚本固定 `--max-instances 1`。多实例会导致状态不一致，不要横向扩容。

5. **插件拥有 DSH 的全部 agent 权限。** 它能读会话、发指令、执行工作区操作。安装前请自己 review 代码，不要装来路不明的 fork。

6. **分享链接即授权。** 任何拿到 `#k=` 链接的人都能解密。转发前想清楚。

7. **删除不是加密擦除。** 从 Hub 删掉分享只移除索引，底层文件系统可能仍留有数据。

8. **飞书侧留存不受本项目控制。** 消息在飞书服务器上的保留策略由你的租户管理员决定。

---

## 部署检查清单

```text
[ ] HUB_TOKEN 是随机生成的强密钥（≥ 32 hex 字符），不是密码
[ ] VAPID_SECRET 单独设置，且不等于 HUB_TOKEN
[ ] Hub 只通过 HTTPS 暴露；不要用明文 HTTP 跑公网
[ ] FEISHU_ALLOWED_OPEN_IDS 已填，且只包含你自己的 open_id
[ ] ~/.dsh/feishu.env 权限是 0600
[ ] 没有把 feishu.env、feishu-host.json、hub-state.json 提交进 git
[ ] Cloud Run 的 max-instances = 1
[ ] 如果用了持久卷，确认它没有被其他服务共享
```

## 密钥轮换

| 密钥 | 轮换方式 | 影响 |
| --- | --- | --- |
| 飞书 `App Secret` | 飞书开放平台重置 | 更新所有机器的 `feishu.env`，重启插件 |
| `HUB_TOKEN` | 改环境变量并重新部署 | 所有手机需要重新登录；Web Push 若未设 `VAPID_SECRET` 会一起变，需重新订阅 |
| `VAPID_SECRET` | 改环境变量并重新部署 | 已有推送订阅全部失效，需要用户重新授权通知 |
| 设备密钥 | Web 总控台「吊销设备」或删 `feishu-host.json` | 该设备需重新配对 |

---

## English summary

This is an independent, self-hosted remote-control bridge for AI coding agents. It holds a Feishu app secret, a hub token and a device private key. Report vulnerabilities via GitHub Security Advisories, not public issues. The main things to harden in a production deployment: set a dedicated `VAPID_SECRET`, use `Authorization` headers instead of `?token=`, keep `~/.dsh/feishu.env` at `0600`, keep the hub at a single instance, and remember that a share link is a bearer credential.
