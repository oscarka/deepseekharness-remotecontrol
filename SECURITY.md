<a id="en"></a>

<p align="right"><strong>🇺🇸 English</strong> · <a href="#zh">🇨🇳 简体中文</a></p>

# Security Policy

## Supported Versions

Security fixes are delivered on the latest commit of the `main` branch. While the project is in `0.x`, interfaces and configuration options may evolve, with security fixes prioritized first.

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Submit reports privately via [GitHub Private Vulnerability Reporting](https://github.com/oscarka/deepseekharness-remotecontrol/security/advisories/new) or contact the repository maintainer directly. Please include:

- Steps to reproduce or a minimal PoC
- Impact scope (what can be read, modified, or executed)
- Version / commit hash tested

We will respond promptly. Please allow time for a fix before public disclosure.

---

## Threat Model

### Trust Boundaries

| Component | Trust Level | Notes |
| --- | --- | --- |
| Your computer & `~/.dsh/` | ✅ Trusted | Local AI sessions, host keys, and audit logs live here |
| Your self-hosted Hub | ⚠️ Semi-trusted | Holds session metadata & **plaintext** active conversation snapshots in memory; cannot decrypt E2EE share payloads |
| Feishu Open Platform *(optional)* | ⚠️ Semi-trusted | If configured, Feishu bot messages traverse Feishu servers under your tenant retention policy |
| APNs / Web Push endpoints | ⚠️ Semi-trusted | Carries encrypted RFC 8291 push notifications without full transcript bodies |
| Public Internet | ❌ Untrusted | Must never gain unauthenticated access to any endpoint |

**Key Takeaway**: This is a self-hosted remote control bridge, not an end-to-end encrypted messenger between your computer and Hub. Only share links (`/share/:id#k=...`) are end-to-end encrypted client-side. Deploy the Hub only on infrastructure or cloud accounts that you control.

### Attack Surface

1. **Control Hub HTTP Endpoints** — The only internet-facing surface when deployed remotely.
2. **Feishu Bot *(optional)*** — Anyone able to message your custom Feishu app (filtered by `FEISHU_ALLOWED_OPEN_IDS`).
3. **Local Host Daemon (`dsh-feishu`)** — Runs under your user account on your machine and connects **outbound** to your Hub (no inbound port forwarding required).
4. **Supply Chain** — The Hub server has zero third-party runtime dependencies by design to keep auditing straightforward.

---

## Implemented Security Controls

### Authentication & Per-Host Isolation

- The Hub **refuses to start** unless `HUB_TOKEN` is configured (`hub/server.js`).
- All `/api/*` and `/fs/*` routes require authentication except public bootstrap/health endpoints (`/healthz`, `/api/auth/verify`, `/api/pairing/exchange`, `/api/enroll/exchange`), with constant-time `timingSafeEqual` token comparison.
- **Per-computer isolated credentials**: Enrolling a computer via a 15-minute enrollment code issues a dedicated revocable host token (`hst_...`) pinned to the machine's Ed25519 public key fingerprint. Revoking one computer never disrupts other hosts.
- **Read-only media tickets**: Inline images and `HTTP 206 Range` video streams use short-lived, path-scoped HMAC `mediaTicket` query tokens so `HUB_TOKEN` is never exposed in `<img src>` or `<video src>` URLs.

### Pairing & Rate Limiting

- 6-digit phone QR / pairing codes are single-use with a short TTL (3 minutes).
- Authentication and pairing endpoints enforce per-client-IP rate limiting (returning `429` on brute-force attempts, honoring `X-Forwarded-For` only when `TRUST_PROXY=1` or running on Cloud Run).

### Secret File Permissions

- `~/.dsh/feishu.env` must have `0600` permissions; `dsh-feishu/lib/config.js` verifies `stat` at startup and refuses to run if group/world-readable.
- Host identity keys (`~/.dsh/feishu-host.json`) and audit logs (`~/.dsh/feishu-audit.jsonl`) are written with mode `0600`.

### Authorization & Workspace Confinement

- On Feishu, senders outside `FEISHU_ALLOWED_OPEN_IDS` receive nothing; group chats (`allowGroup`) are disabled by default.
- File browsing and reverse-tunnel reads are strictly confined to registered workspace roots via `realpath` prefix verification — symlinks pointing outside the workspace root are rejected (`dsh-feishu/lib/workspace-ops.js`), and common credential patterns pass through `redact.js`.

### End-to-End Encrypted Share Links

- Replay links (`/share/:id#k=...`) are encrypted locally using AES-256-GCM with a random 256-bit key. The key lives exclusively in the URL `#k=` fragment and is **never sent in HTTP requests**; the Hub stores only ciphertext and IV.

---

## Known Limitations

Please review and harden as needed for production deployments:

1. **`VAPID_SECRET` fallback chain**: When `VAPID_SECRET` is unset, Web Push key derivation falls back to `HUB_TOKEN`. Set a dedicated `VAPID_SECRET` in production so rotating `HUB_TOKEN` or push keys stays independent:
   ```bash
   export VAPID_SECRET="$(openssl rand -hex 32)"
   ```
2. **Avoid `?token=` query parameters**: Prefer `Authorization: Bearer <token>` or `X-Hub-Token` headers so tokens never appear in reverse-proxy access logs or browser history.
3. **Ephemeral `/tmp` storage on Cloud Run**: By default on Cloud Run, state falls back to `/tmp` (though enrolled `hst_...` hosts auto-recover seamlessly on heartbeat). Mount a volume and set `HUB_STATE_FILE` if you require persistent E2EE share links across cold restarts.
4. **Single-instance design**: Keep `--max-instances 1` on Cloud Run; in-memory live state and SSE streams are not shared across horizontal replicas.
5. **Full local agent privileges**: The host daemon can read transcripts, send prompts, and approve commands on your machine. Always inspect code before installing third-party forks.
6. **Share links are bearer credentials**: Anyone holding the full `#k=` URL can decrypt that shared snapshot.
7. **Logical deletion**: Deleting a share removes its index entry rather than cryptographically wiping underlying disk blocks.
8. **Feishu server retention**: If Feishu integration is enabled, message retention on Feishu's cloud is governed by your Feishu tenant settings.

---

## Deployment Hardening Checklist

```text
[ ] HUB_TOKEN is a strong random secret (e.g. >= 32 hex chars)
[ ] VAPID_SECRET is set separately and differs from HUB_TOKEN
[ ] Hub is exposed over HTTPS only (never plain HTTP over public networks)
[ ] ~/.dsh/feishu.env permissions are set to 0600
[ ] FEISHU_ALLOWED_OPEN_IDS (if using Feishu) contains only your own open_id
[ ] Never commit feishu.env, feishu-host.json, or hub-state.json to git
[ ] Cloud Run --max-instances is set to 1
[ ] Persistent volume (if mounted) is not shared with untrusted containers
```

## Secret Rotation

| Secret | How to Rotate | Impact |
| --- | --- | --- |
| `HUB_TOKEN` | Change in Web Settings or update env var & redeploy | Browsers must sign in again; enrolled `hst_...` computers keep working unless revoked |
| Host Credential (`hst_...`) | Tap **🚫 Revoke Token** in Web Settings or delete `feishu-host.json` | Only that specific computer is disconnected and must re-enroll |
| `VAPID_SECRET` | Update env var & redeploy | Existing Web Push subscriptions expire; re-enable Push in phone Settings |
| Feishu `App Secret` | Reset in Feishu Open Platform console | Update `feishu.env` on Feishu-enabled hosts and restart daemon |

---

<a id="zh"></a>

<p align="right"><a href="#en">🇺🇸 English</a> · <strong>🇨🇳 简体中文</strong></p>

# 安全策略

## 支持范围

只有 `main` 分支的最新提交会收到安全修复。项目当前处于 `0.x` 阶段，接口与配置项可能变化，但安全问题的修复会优先合入。

## 报告漏洞

**请不要开公开 issue。**

请通过 GitHub 的 [Private Vulnerability Reporting](https://github.com/oscarka/deepseekharness-remotecontrol/security/advisories/new) 提交，或直接联系仓库维护者。请附上：

- 复现步骤或 PoC
- 影响范围（能读到什么、能改什么）
- 你使用的版本 / commit

会尽快回复。在修复发布前，请不要公开细节。

---

## 威胁模型

### 信任边界

| 组件 | 是否可信 | 说明 |
| --- | --- | --- |
| 你的电脑与 `~/.dsh/` | ✅ 可信 | 会话、密钥、审计日志都在这里 |
| 自托管 Hub | ⚠️ 半可信 | 能看到会话元数据与**明文**活跃会话快照；看不到 E2EE 分享的明文 |
| 飞书开放平台 *(可选)* | ⚠️ 半可信 | 若启用飞书通道，消息内容会经过飞书服务器，按你的租户策略留存 |
| APNs / Web Push | ⚠️ 半可信 | 只承载加密推送通知，不含完整会话正文 |
| 公网其他人 | ❌ 不可信 | 不应能连上任何未授权接口 |

**关键结论**：这个项目是自托管的远程控制桥，不是电脑到 Hub 之间的端到端加密聊天软件。E2EE 端到端加密仅覆盖 `/share/:id#k=...` 生成的分享回放链接。请只把 Hub 部署在你自己掌控的设备或云账号上。

### 攻击面

1. **Hub 的 HTTP 接口** —— 远程部署时唯一对外暴露的面。
2. **飞书机器人 *(可选)*** —— 任何能给机器人发消息的人（受 `FEISHU_ALLOWED_OPEN_IDS` 白名单拦截）。
3. **本机守护进程 (`dsh-feishu`)** —— 运行在你自己的电脑用户下，**主动向外**连接 Hub（电脑无需公网 IP 或开放入站端口）。
4. **供应链** —— Hub 服务端保持零第三方运行时依赖，便于直接阅读审计源码。

---

## 已实现的控制

### 认证与一机一证隔离

- 未设置 `HUB_TOKEN` 时 Hub **直接拒绝裸奔启动**（`hub/server.js`）。
- 所有 `/api/*` 与 `/fs/*` 接口（除公开探活与配对交换接口外）均强制鉴权，并使用 `timingSafeEqual` 防止时序侧信道。
- **每台电脑独立可吊销凭证**：通过 15 分钟配对码接入的每台电脑都会获得独立的 `hst_...` 凭证并绑定 Ed25519 设备公钥指纹；在手机端吊销某一台电脑不会影响其他机器。
- **短效只读媒体票据 (`mediaTicket`)**：聊天内嵌图片与 `HTTP 206` 视频流使用绑定文件路径与有效期的 HMAC 只读票据，避免在 `<img src>` / `<video src>` 中暴露主密码 `HUB_TOKEN`。

### 手机配对与防爆破限流

- 6 位手机扫码/免密配对码有效期 3 分钟，一次性使用即销毁。
- 登录与配对接口均按真实客户端 IP 分桶限流，超限返回 `429`（仅在 `TRUST_PROXY=1` 或 Cloud Run 环境下信任代理转发头，防止伪造 IP 绕过限流）。

### 密钥与文件权限

- `~/.dsh/feishu.env` 必须是 `0600`；启动时 `stat` 校验，组或其他用户可读则**直接拒绝启动**（`dsh-feishu/lib/config.js`）。
- 设备密钥 `~/.dsh/feishu-host.json`、审计日志 `~/.dsh/feishu-audit.jsonl` 写入时强制 `0600`。
- 环境变量优先级高于密钥文件，便于在 CI/容器里注入。

### 授权与工作区目录隔离

- `FEISHU_ALLOWED_OPEN_IDS` 白名单之外的发送者不会拿到任何会话内容；`allowGroup` 默认关闭。
- 文件浏览与反向隧道读取严格限制在工作区根目录内：先 `realpath` 解析，再做前缀比对，指向根目录外的符号链接一律拦截（`dsh-feishu/lib/workspace-ops.js`），常见凭据模式经过 `redact.js` 脱敏。

### 端到端加密分享

- 分享链接使用 AES-256-GCM 与随机 256 位密钥在本地完成加密，解密密钥只存在于 URL 的 `#k=` 片段，**不会出现在任何 HTTP 请求里**；Hub 只存密文与 IV。

---

## 已知限制

这些是当前实现里真实存在的边界，生产部署请按需加固：

1. **VAPID 密钥有回退链。** 未设置 `VAPID_SECRET` 时会回退使用 `HUB_TOKEN` 派生推送密钥。生产部署建议单独设置独立的 `VAPID_SECRET`：
   ```bash
   export VAPID_SECRET="$(openssl rand -hex 32)"
   ```
2. **`?token=` 查询参数会进日志。** 网关访问日志、浏览器历史可能记录完整 URL，请优先使用 `Authorization` 请求头。
3. **Cloud Run 默认状态落在 `/tmp`。** 容器冷启动重启后分享密文会清空（已配对电脑的 `hst_...` 凭证会在心跳时自动无感恢复）；如需持久保存分享链接，请挂载数据卷并指定 `HUB_STATE_FILE`。
4. **单实例假设。** 部署脚本固定 `--max-instances 1`，多实例会导致内存态与 SSE 流不一致，请勿横向扩容。
5. **守护进程拥有本机完整开发工具权限。** 它能读会话、发指令、执行审批操作。安装前请自行审阅代码，不要安装来路不明的 fork。
6. **分享链接即授权。** 任何拿到完整 `#k=` 链接的人都能解密该快照，转发前请确认。
7. **删除不是加密擦除。** 从 Hub 删掉分享只移除索引，底层存储块可能仍留有残留。
8. **飞书侧留存不受本项目控制。** 若启用飞书通道，消息在飞书服务器上的保留策略由你的飞书租户管理员决定。

---

## 部署检查清单

```text
[ ] HUB_TOKEN 是随机生成的强密钥（如 ≥ 32 hex 字符），避免弱口令
[ ] VAPID_SECRET 单独设置，且不等于 HUB_TOKEN
[ ] Hub 只通过 HTTPS 暴露；不要用明文 HTTP 跑公网
[ ] ~/.dsh/feishu.env 权限是 0600
[ ] FEISHU_ALLOWED_OPEN_IDS（若启用飞书）只包含你自己的 open_id
[ ] 没有把 feishu.env、feishu-host.json、hub-state.json 提交进 git
[ ] Cloud Run 的 max-instances = 1
[ ] 如果挂载了持久卷，确认它没有被其他不可信服务共享
```

## 密钥轮换

| 密钥 | 轮换方式 | 影响 |
| --- | --- | --- |
| `HUB_TOKEN` | 在网页「设置 → 修改密码」或改环境变量重新部署 | 已登录浏览器需重新解锁；已配对电脑（`hst_...` 独立凭证）继续正常工作 |
| 单机凭证 (`hst_...`) | Web 总控台点「🚫 吊销凭证」或删本机 `feishu-host.json` | 仅该台电脑断开并需重新配对，不影响其他电脑 |
| `VAPID_SECRET` | 改环境变量并重新部署 | 已有锁屏推送订阅失效，需在手机设置里重新点一次开启推送 |
| 飞书 `App Secret` | 飞书开放平台重置 | 更新对应机器的 `feishu.env` 并重启守护进程 |
