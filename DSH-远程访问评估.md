# DeepSeek Harness 远程访问评估

> 评估时间：2026-10-29  
> 本机环境：macOS，DeepSeek Harness Desktop `0.2.1-rc.3`，Web GUI `127.0.0.1:56430`  
> 评估对象：[liguobao/ds-harness-remote](https://github.com/liguobao/ds-harness-remote)（下称 DSH Remote）

## 一、先说结论

1. **截至今天，DeepSeek Harness 没有面向终端用户的“官方远程控制 / 手机扫码接管”产品。**
   官方提供的是 `dsh web` 的网络绑定能力：可以把 Web UI 绑到某个具体网卡地址，用启动 token + 签名 Cookie 认证，可加 TLS，也可放在反向代理后面。它解决的是“用浏览器访问 dsh web”，**不是“用手机接管 Desktop 里正在跑的那条会话”**。
2. **如果目标是“锁屏后，用手机查看 Desktop 里正在跑的任务并继续操作”，官方路径目前做不到。**
   Desktop 自己的 `127.0.0.1:56430` 要求认证 token，且只监听 loopback；官方 CLI 又明确禁止启动保留的 `desktop` profile。官方 `dsh web` 是另一个 profile/host 进程，不能接管 Desktop 进程里的实时会话。
3. **DSH Remote 是目前功能最完整的社区方案，确实能补上这个缺口，但要按“高权限第三方”对待。**
   它的 E2EE、设备固定、权限白名单设计明显高于一般“内网穿透”项目；但它是个人主导、未独立审计、依赖作者托管服务、远程终端默认开启，而且作者自己的验收清单里 Desktop/Android 真机跨设备项仍未完成。
4. **综合评分：功能 9/10，安全设计 8/10，成熟度 6/10，官方兼容性 6/10，信任成本 5/10。**
   适合个人可信环境先试用；不建议在未做权限收敛的情况下，作为生产仓库/敏感凭据的唯一远程入口。

---

## 二、官方到底有什么

### 2.1 官方 Web 远程绑定（真实可用）

官方 `dsh web` 支持：

```bash
dsh --profile web --host 10.0.0.7 --port 3080
dsh --profile web --host 10.0.0.7 --tls-cert ./chain.pem --tls-key ./key.pem
dsh --profile web --host 10.0.0.7 --public-url https://app.example/ --trusted-host app.example
```

规则（来自本机 `dsh --profile web --help` 与官方 package README）：

- `--host` 只接受**一个具体的本机 IPv4/IPv6 地址**，拒绝 `0.0.0.0`/`::` 这类通配地址。
- 启动会打印带一次性 token 的 URL；浏览器访问后换签名 Cookie，之后 URL 不再带 token。
- 无 Cookie 的 `/api` 返回 401；Host/Origin 不匹配返回 403。
- 可选手工 TLS；没有 ACME、没有自签兜底、没有 HTTP→HTTPS 跳转。
- 反向代理场景要同时配 `--public-url` 和 `--trusted-host`，否则浏览器信任栅栏会拒绝。
- 默认端口 3080，Desktop 当前实例是 56430。

**我在本机做的隔离实测**（临时 `DSH_HOME`，不碰用户配置）：

| 测试 | 结果 |
| --- | --- |
| `dsh --profile web --host 10.10.112.192 --port 0` | 正常监听，提示明文 HTTP 风险 |
| 带 token 访问 `/?token=...` | `303`，下发 `HttpOnly; SameSite=Strict` Cookie |
| 带 Cookie 访问 `/api/...` | 返回 404（认证已过，只是该路径不对，不再是 401） |
| 不带 Cookie 访问 `/api/...` | `401` |
| 带 Cookie 但伪造 `Host: evil.example` | `403` |

结论：**官方远程访问本身是通的、认证是硬的**，但它是一个独立的 `web` profile 进程。

### 2.2 为什么它接管不了 Desktop 的当前任务

- Desktop 使用保留的 `desktop` profile；官方 CLI 明确拒绝 boot/config-dump 这个 profile，只有 Electron 自己管理。
- Desktop 的 loopback 服务同样要求认证 token；我直接访问只拿到 401，也没有找到面向用户的“复制远程访问链接”入口。
- `~/.dsh/sessions` 是共享的历史目录，但“正在运行”的会话归属 Desktop 的 host 进程；官方没有把实时会话移交给另一个 host 的机制。
- 所以官方 `dsh web` 能看到/继续的是它自己进程里的会话，而不是 Desktop 窗口里正在跑的那条。

**官方可行但不够“原地接管”的做法**：把工作迁到一台常开的机器/常开的 `dsh web` 进程，手机通过 Tailscale / 反向代理访问它。锁屏、关显示器都不影响，只要机器不休眠。

---

## 三、DSH Remote 是什么

项目定位：给 DeepSeek Harness 装一个 Remote 插件，让 Host 只主动向外建连，客户端通过账号 + 端到端加密通道访问 Host 的官方 Harness 界面/会话。不是远程桌面，也不是通用 SSH 隧道。

### 3.1 组成

```text
Desktop / Remote Web / Android / iOS
        ↕ 账号认证 + Noise IK 端到端加密
Remote 插件（Host 上的 DSH 进程）
        ↕ 官方 Typert Remote / Session API 白名单
Harness 会话、工作区、审批、终端、文件预览
```

- **Host 端**：DSH 插件，挂在 Desktop/`web`/dsh-TUI profile 里。
- **客户端**：Desktop 内置 Remote 侧栏、`https://dsh.r2049.cn` Web、Android APK、iOS TestFlight。
- **Server**：默认用作者的 `dsh.r2049.cn`；仓库里也有一个单账号最小自托管 Server（`apps/server`，Docker）。
- **网络**：`LAN → P2P → TURN → Relay` 依次尝试；Host 不监听公网端口，不需要端口映射。
- **加密**：`Noise_IK_25519_ChaChaPoly_SHA256`；设备 X25519 身份密钥本地生成，服务端只存公钥；账号 membership + 本地 identity pinning 双重校验。

### 3.2 能做什么

- 从另一台设备继续同一个 Harness 会话，查看历史/流式输出。
- 发文字/图片 Prompt，回答 Agent 的问题，处理权限审批。
- 切换模型、改设置、看工作区文件（只读预览）、开远程终端（可关）。
- 可选 Codex / Cursor / Claude / Pi / OpenCode / Antigravity 等 ACP 后端。
- 可选 `remote_*` 工具，让本机 Agent 反过来发现/驱动远端 Host。
- 多客户端可同时连一个 Host，RPC/流按连接隔离。

### 3.3 项目活跃度（GitHub，2026-10-29）

| 指标 | 数值 |
| --- | --- |
| Stars | 921 |
| Forks | 87 |
| Open issues | 15 |
| 创建时间 | 2026-08-14 |
| 最近推送 | 2026-10-29 |
| 最近 100 次提交 | 6 天内，liguobao 72 次，其余为贡献者 |
| 最新 release | `v0.5.23`（2026-10-29），npm + APK + 浏览器包 |
| 许可 | 插件包 MIT（仓库根目录没有统一 LICENSE 文件） |
| CI | GitHub Actions：check / test / build / bundle 校验 |
| 自动化测试 | 作者记录 847 tests（0.5.20 合并后） |

节奏非常快，文档也异常完整（E2EE、网络、协议、安装、兼容性、隐私都有独立文档），这在同类项目里少见。

---

## 四、我在本机的隔离实测

目的：验证 `0.5.23` 在你这台机器的 DSH `0.2.1-rc.3` 上到底能不能装、能不能起。

做法：使用 Desktop 自带的官方 CLI（`/Applications/DeepSeek Harness.app/.../runtime/cli/bin/dsh`），把 `DSH_HOME` 指向 `/tmp` 下的临时目录，**不修改你的 `~/.dsh`**。

| 步骤 | 结果 |
| --- | --- |
| `dsh plugin --profile web add -w ds-harness-remote@0.5.23` | 成功，41 个包，约 10.7s |
| `dsh --profile web --no-open --port 0` | 成功启动 |
| 插件日志 | `host identity ready`；`client remote-mode identity ready` |
| 未登录时 | `ACCOUNT_AUTH_REQUIRED`，符合预期 |
| `GET /ds-harness-remote/status.events`（带登录 Cookie） | `200`，`text/event-stream`，返回 Host 状态 JSON |
| `POST /ds-harness-remote/status` | 路由存在，返回结构化 bad-request（说明控制路由已注册） |

**结论**：`0.5.23` 在 `0.2.1-rc.3` 的 **web profile** 上可以正常加载，控制路由可注册。  
**未验证**：Desktop profile 的实际控制路由、扫码/账号登录、跨设备提示/审批。清理时已删除临时目录和进程。

### 关于 issue #185（rc.3 下 Desktop 控制路由不注册）

- 报告版本：0.5.19 / 0.5.20；现象是 `/ds-harness-remote/status` 404，界面卡在“控制通道仍在启动”。
- 作者定位到 `connection.rpc.handle` 在 rc.3 已不存在；`9d44f82`（0.5.22）引入 `webServer` 优先分支，`25475e8`（也是 0.5.22）让 `rpc.handle` 变成可选，两者都没有时安全跳过而不是卡死。
- 所以 **0.5.22/0.5.23 很可能已经修好 Desktop 路径**，但 issue 仍开着，报告人没有回来确认；项目的 `compatibility.md` 也仍把 rc.1 作为基线，没有把 rc.3 写进已验证范围。

**建议**：装 0.5.23 后，先看 Remote 设置页是否显示“控制通道已就绪”，再看 Host 是否 online；不要拿 0.5.19/0.5.20 的旧结论判断新版本。

---

## 五、安全评估

### 5.1 做得好的地方

- **真正的端到端加密**：业务消息在客户端加密、Host 解密；Server/Relay/TURN 只搬密文。
- **设备身份固定**：Host/Client 各有独立 X25519 密钥；已知 deviceId 换公钥会被拒绝，不是“第一次见到就信”。
- **双重授权**：Server 账号 membership + 本地 pinning，缺一不可。
- **白名单而非通用 RPC**：只暴露官方 Harness 的固定 endpoint；不开放通用 shell、通用文件系统、远程桌面。
- **协议细节严谨**：Noise prologue 绑定 connectionId/hostDeviceId/clientDeviceId；分片、重放、乱序、超限都 fail closed；4 MiB 消息上限。
- **权限仍在 Host**：Agent 工具审批、sandbox、permission preset 继续生效；远程端不能绕过。
- **文件预览只读**：不能写、删、上传、执行或调用本机外部程序打开。
- **可撤销**：移除设备会吊销凭据、membership 和活动连接。
- **自托管选项**：不想信任作者服务器，可以自己跑 `apps/server`（单账号、Docker、HTTPS 反代）。

### 5.2 必须知道的风险

1. **它不是官方项目**。README 自己写明 "independent community project and is not an official DeepSeek product"。
2. **远程终端默认开启**。官方文档原话：终端用 Host 本地 `terminal.enabled` 开关（默认开），**以 Host 用户身份运行，独立于 Agent 审批**。也就是说，能登录你 Remote 账号并连上 Host 的人，可能直接拿到一个 shell，不需要逐条工具审批。这是整个方案最大的风险点。
3. **账号 = 控制权**。E2EE 保护的是“服务端看不到”，不保护“账号被盗”。一旦账号/设备被攻破，攻击者可以驱动 Agent 执行代码、读工作区、开终端。务必用唯一强密码 + OAuth 侧 2FA。
4. **托管服务是个人域名**。默认 Server 是 `dsh.r2049.cn`，由作者运营；它能看到的元数据包括账号/设备归属、在线状态、连接时间、协议版本、网络路径、流量大小/时序，但看不到 Prompt/对话/工具输出/工作区路径/文件内容。没有公开 SLA、合规认证或独立安全审计。
5. **没有独立密码学审计**。作者明确写“长期连接 rekey 和独立密码安全审查仍在路线图中”。
6. **供应链面不小**：插件注入 DSH 客户端，npm 依赖 41 个包；Android APK 需要侧载，iOS 只有 TestFlight。
7. **远程工具默认注入**：0.5.22 起 `remote_*` 工具默认开启，会把远端主机名、工作区路径、会话历史带进本机 Agent 的工具上下文。不需要时建议关掉。
8. **Linux 安装器以 root 运行**（本项目自己的文档写明），macOS 不走 root；如果你以后在 Linux 上部署，要特别注意。

### 5.3 安全边界一句话

> 它防的是“中继服务器/网络路径偷看”，不防“你自己的账号被钓鱼”“你授权的手机被入侵”“Host 本机被入侵”。  
> 对个人自用是合理设计；对高敏感代码/生产凭据，不能只靠它。

---

## 六、可靠性与兼容性

### 6.1 已知问题（截至 2026-10-29）

- **#185**：rc.3 Desktop 控制路由不注册。修复已进 0.5.22/0.5.23，issue 未关闭；本机 web profile 实测正常，Desktop 未实测。
- **#140**：P2P/TURN/Relay 连接一段时间后掉线，表现为“连一会儿变灰，重开 App 恢复”。作者说已修复并加了 debug 日志，issue 仍开着；根因讨论几度反转，说明网络路径的现场定位并不轻松。
- **Android 息屏/省电**：作者 TODO 记录小米等机型在息屏约 5.7 秒后冻结 UID、断开 TCP；FGS/wake lock 也未必能扛住厂商策略。**手机端“锁屏后持续在线”并没有被证明是稳的**。
- **真机验收缺口**：作者 TODO 明确列着“Desktop/Android 加密跨设备验收”“真实 0.2.1 Host 的 Desktop/Android 验收”“Windows/独立 Remote Web/APK 真机回归”等未完成项。
- **兼容性基线**：开发基线是 `dsh-v0.2.1-rc.1`；peer range 接纳 `0.2.1`/`0.2.2` 预发布，但文档说“版本范围不代表 runtime 验收通过”，rc.3 未列入已验证。

### 6.2 这对“锁屏后使用”意味着什么

- **Mac 锁屏本身不是问题**：macOS 锁屏不会杀进程；只要系统不睡眠、网络不断，Host 就在线。
- **Mac 睡眠才是问题**：合盖/系统睡眠会让 Host 掉线；需要 `caffeinate` 或“接通电源时防止自动睡眠”，笔记本合盖通常仍会睡。
- **手机端后台才是真问题**：Android 厂商省电策略可能杀掉长连接；iOS 后台同样受限。指望“锁屏几小时后打开 App 立刻看到实时状态”，在当前版本不能打包票，重连逻辑才是关键。

---

## 七、和另外两条路线的对比

| 方案 | 是否官方 | 能否接管 Desktop 当前会话 | 手机体验 | 安全模型 | 主要代价 |
| --- | --- | --- | --- | --- | --- |
| 官方 `dsh web --host` + Tailscale/反代 | ✅ 官方 | ❌ 独立 web profile | 浏览器（桌面 UI，移动端一般） | token + 签名 Cookie + Host/Origin + 可选 TLS | 需要常开进程/机器；要自己解决网络入口 |
| **DSH Remote** | ❌ 社区 | ✅ 可以（同一 Host 会话） | 原生 Android + Web + iOS beta | Noise E2EE + 账号 + 设备 pinning + 白名单 | 信任作者服务/账号；终端默认开；非官方 |
| dsh-pocket（另一社区项目） | ❌ 社区 | ✅ 直接反代官方 UI，同屏 | 扫码 + 移动端适配，较简单 | 访问密码 + Cloudflare 隧道；无 E2E | 公网暴露面更大；GPL-2.0；最近更新停在 10-17 |

补充：`shaobeichen/dsh-pocket` 有 2517 stars，思路是“把官方 `dsh web` 反代出来 + 二维码 + 密码 + cloudflared”，优点是同屏、不用另装 App；缺点是密码即全部权限、公网隧道把可执行代码的 UI 暴露到互联网、没有 DSH Remote 那种设备身份固定/E2EE。它的 issue 里也有“远程访问永久 401/503”这类严重问题。**它更适合“局域网/ Tailscale 内自己用”，不适合直接开公网。**

---

## 八、给你的建议

### 方案 A：坚持官方，接受“换一个 host”

适合：你更在意“官方支持/可维护”，不执着于接管 Desktop 窗口里的那一条会话。

1. 找一台常开的 Mac mini / Linux 小主机，或让当前 Mac 不睡眠。
2. 起一个常驻 `dsh web`：
   ```bash
   dsh --profile web --host <Tailscale或局域网IP> --port 3080
   ```
   需要公网就前面挂 Caddy/Nginx 或 Tailscale Serve，配 `--public-url` + `--trusted-host`，并上 TLS。
3. 手机通过 Tailscale/反代打开带 token 的 URL；首次换 Cookie 后收藏。
4. 把日常工作迁到这个 `dsh web` 实例；Desktop 只作为本地窗口。

优点：官方、认证硬、无第三方插件、升级风险低。  
缺点：不是 Desktop 当前会话；移动端 UI 不是原生 App；要自己维护入口和常开机器。

### 方案 B：要“手机接管 Desktop 现成会话”，用 DSH Remote，但做权限收敛

适合：你就是要“电脑上跑着，锁屏后手机上接着看/审批/发指令”。

1. Desktop → 扩展/插件管理 → 从 npm 安装 `ds-harness-remote@0.5.23`，重启 Desktop。
2. 打开 Remote 侧栏，登录（OAuth 扫码或账号密码），确认 Host 显示 online。
3. **先关掉不需要的能力**：
   - 远程终端（最大的 shell 风险）；
   - 不用的 ACP 后端（Codex/Cursor/Claude/Pi/OpenCode/Antigravity）；
   - `remote_*` 工具注入（不需要让本机 Agent 反向驱动远端时）。
4. 账号安全：唯一强密码；OAuth 侧开 2FA；不要在多地复用。
5. 如果在意“作者的服务器能看到元数据”，用 `apps/server` 自托管（Docker + HTTPS 反代 + 强密码），Host 和手机都指向你的 Server。
6. Mac 保持不睡眠：接通电源时用 `caffeinate -s`（或系统设置里允许“显示器关闭时防止自动睡眠”）；合盖会睡，别合盖。
7. 做一次真实演练：
   - 锁屏 → 手机切 4G → 打开 App → 发一条 prompt；
   - 触发一次工具审批 → 在手机上批准/拒绝；
   - 锁屏 10 分钟后再回来 → 看是否自动重连；
   - 杀掉 App/切网络 → 看是否恢复。
8. 版本策略：先钉 0.5.23；不要追每次 release；升级前看 #185/#140 和兼容性文档；出问题能回退。

优点：功能最完整、原生 App、E2E、设备固定、可自托管。  
缺点：非官方、高权限、托管服务信任、rc.3 Desktop 路径需实测、手机后台稳定性未验收。

### 方案 C：只要“同屏”，用 dsh-pocket，但只限可信网络

适合：你不想装第二个 App，只想手机打开和电脑一样的界面。

- 局域网/ Tailscale 内使用，密码 12 位以上；
- 不要在公网直接开 cloudflared 快速隧道；要用就命名隧道 + 强密码 + 用完即关；
- 接受“密码即全部权限”，不要把它当成 DSH Remote 那种设备级安全。

### 不建议

- 直接把 Desktop 的 `56430` 端口映射到公网；
- 用 `--host 0.0.0.0` 之类通配（官方也拒绝）；
- 把带 token 的 URL、二维码、密码发到群里；
- 在敏感仓库/生产凭据环境里默认开启远程终端。

---

## 九、最终判断

**官方远程控制：没有。** 官方只有 `dsh web` 的网络绑定 + token/TLS/反代，能远程用 Web UI，但接管不了 Desktop 正在跑的会话。

**DSH Remote：值得试，但不是“无脑装”。**  
它的架构和文档质量在社区项目里属于上乘，E2EE/设备固定/白名单的设计是认真的；0.5.23 在 rc.3 的 web profile 上我已验证可加载。问题在于：非官方、个人主导、托管服务、终端默认开、rc.3 Desktop 未官方验收、手机后台稳定性有已知坑。把它当“高权限远程管理工具”，先收权限、先演练，再决定是否长期用。

**如果你只想要一个稳的官方方案**：把工作放到常开的 `dsh web` 主机上，Tailscale/反代 + token + TLS；这是目前唯一“官方支持且可长期维护”的远程路径。

---

## 参考

- DSH Remote 仓库：<https://github.com/liguobao/ds-harness-remote>
- 端到端加密：<https://github.com/liguobao/ds-harness-remote/blob/main/docs/end-to-end-encryption.md>
- 网络与传输：<https://github.com/liguobao/ds-harness-remote/blob/main/docs/network.md>
- 安装说明：<https://github.com/liguobao/ds-harness-remote/blob/main/docs/installation.md>
- 兼容性：<https://github.com/liguobao/ds-harness-remote/blob/main/docs/compatibility.md>
- 自托管 Server：<https://github.com/liguobao/ds-harness-remote/blob/main/apps/server/README.md>
- rc.3 控制路由 issue：<https://github.com/liguobao/ds-harness-remote/issues/185>
- 连接掉线 issue：<https://github.com/liguobao/ds-harness-remote/issues/140>
- dsh-pocket：<https://github.com/shaobeichen/dsh-pocket>
