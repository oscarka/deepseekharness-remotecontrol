<p align="center">
  <img src="docs/assets/banner.svg" alt="DSH Remote Control" width="100%" />
</p>

<h1 align="center">DSH Remote Control</h1>

<p align="center">
  <strong>Watch and steer your AI coding tasks from your phone — check progress, send prompts, stop runs, and directly approve dangerous actions or selection popups with DSH.</strong><br/>
  Not "yet another ChatGPT client", and not a hosted SaaS. Your data stays on your own machines; you decide where to put the control hub.
</p>

<p align="center">
  <a href="https://railway.app/template?referralCode=dsh-remote"><img src="https://railway.app/button.svg" alt="Deploy on Railway" height="28" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3B82F6.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/arch-amd64%20%7C%20arm64%20%7C%20armv7-10B981.svg" alt="Multi-Arch" />
  <img src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node >= 20" />
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/self--hosted-zero--trust-0EA5E9.svg" alt="Self-Hosted" /></a>
</p>

<p align="center">
  <a href="README.md"><strong>🇨🇳 简体中文</strong></a> · <strong>🇺🇸 English</strong> · <a href="#2-run-in-30-seconds-one-docker-command">30s Quick Start</a> · <a href="#3-the-complete-7-step-flow-single-main-path">7-Step Flow</a> · <a href="#4-deployment-options-six-paths-same-destination">6 Deploy Options</a> · <a href="docs/self-hosting.md">Self-Hosting Guide</a> · <a href="SECURITY.md">Security</a>
</p>

<p align="center">
  <img src="docs/assets/demo.svg" alt="DSH Remote Control 7-Step Flow Demo" width="100%" />
</p>

---

## 1. Capability Matrix (Honest Edition)

The web UI renders strictly according to this table: **unsupported actions are never shown as fake buttons**. During installation, the script automatically detects which tools are installed on your computer and clearly states the active mode.

| Backend Tool | Watch Sessions | Send Prompts | Stop | **Phone Approval** | Live Steer |
|---|:---:|:---:|:---:|:---:|:---:|
| **DSH (DeepSeek Harness)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Antigravity IDE** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Claude Code** | ✅ | ✅ | ✅ | Planned | ❌ |
| **Codex** | ✅ | ✅ | ✅ | Planned | ❌ |

> If only Codex or Claude Code is installed, the installer explicitly tells you: *"Currently in observation mode; phone approval requires DSH (watching sessions, sending prompts, and stopping are supported)."*

---

## 2. Run in 30 Seconds (One Docker Command)

Multi-arch images (`linux/amd64`, `linux/arm64`, `linux/arm/v7`) run natively on Apple Silicon Macs, standard Linux servers, NAS devices, and Raspberry Pi. Setting an admin password (`HUB_TOKEN`) is mandatory (startup without a password is refused), and `/data` persists state across restarts:

```bash
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="choose-a-strong-password" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

Or start directly from source (zero third-party runtime dependencies; auto-persists to `~/.dsh/hub-state.json`):

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol
HUB_TOKEN="choose-a-strong-password" PORT=8080 npm start
```

---

## 3. The Complete 7-Step Flow (Single Main Path)

No matter where you deploy the Hub, the onboarding flow is always this single main path (**no Feishu/Lark configuration required**):

| Step | Device | What to Do |
|:---:|---|---|
| **①** | Deployment host | Deploy the Hub and get **1 URL + 1 Admin Password** (printed directly in startup logs) |
| **②** | **Computer** | Open the URL in your browser and sign in with the admin password |
| **③** | **Computer** | The page shows *"Computer not connected"* with **1 install command** + **1 enrollment code** |
| **④** | **Computer** | Paste and run the command in your terminal (auto-installs, auto-connects, registers auto-start) |
| **⑤** | **Computer** | The browser page refreshes automatically and displays this computer |
| **⑥** | **Phone** | Tap *"📱 Phone QR Login"* and **scan the QR code on your computer** (no password typing on phone; `localhost` automatically switches to your LAN IP) |
| **⑦** | **Phone** | Watch tasks, send prompts, stop runs, and approve dangerous actions or selection popups |

- **Add a second computer**: Repeat steps ②–⑤ using the same enrollment code (multi-use within its 15-minute validity window) without restarting the Hub.
- **Clear separation of roles**: The **URL** is the single entry point, the **Password** proves you are the owner, and the **Enrollment Code** lets computers join with their own independently revocable credentials.

---

## 4. Deployment Options (Six Paths, Same Destination)

All six deployment paths converge into the exact **7-step flow** above. See **[docs/self-hosting.md](docs/self-hosting.md)** for full configurations:

| Your Scenario | Option | Cost | Difficulty | Entry / Notes |
|---|---|---|:---:|---|
| Fastest cloud trial | **Railway 1-Click Deploy** | 30-day trial, then ~\$5/mo | ★ | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template?referralCode=dsh-remote) |
| Have a VPS / Server | **Docker + Domain HTTPS** | Server cost | ★★ | Built-in `docker-compose.yml` + Caddy/Nginx |
| Have a Domain, No Public IP | **Cloudflare Named Tunnel** | Domain renewal | ★★ | Local Docker + `cloudflared tunnel` HTTPS |
| Domestic Network / NAT | **NAT Traversal Service** | Free tier available | ★★ | Local Docker + cpolar / frp / natapp |
| Tailscale User | **Tailscale Funnel** | 0 | ★★★ | `tailscale serve` / `tailscale funnel` |
| Home Wi-Fi Only | **LAN / NAS / Raspberry Pi** | 0 | ★ | Run the Docker command above; scan QR on home Wi-Fi |

<details>
<summary><b>Optional Extension: Connect Feishu/Lark Bot Notifications & Cards</b> (click to expand)</summary>

The Web & Mobile PWA console works 100% without Feishu. If you also want task completion cards and approval alerts inside Feishu/Lark:
1. Create an enterprise custom app on the [Feishu Open Platform](https://open.feishu.cn/), enable the Bot capability, request `im:message.p2p_msg:readonly` and `im:message:send_as_bot`, and enable **Long Connection** for `im.message.receive_v1`.
2. Add `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, and `FEISHU_ALLOWED_OPEN_IDS` to `~/.dsh/feishu.env`.

</details>

---

## 5. Why Phone Approval Currently Requires DSH / Antigravity + Roadmap

Approving dangerous actions (such as `rm`, network calls, or file writes) or interactive selection popups (`ask_user_question`) requires the coding tool to expose a pre-execution interception hook or in-process RPC channel:

- **DSH & Antigravity IDE**: Provide built-in live plugin/RPC hooks, enabling 1-tap phone approval/rejection, interactive option selection, 45-second timeout protection, and conflict prevention.
- **Upcoming Approval Expansion Roadmap (P3)**:
  1. **Claude Code Approval (Priority)** — Official `PreToolUse` hooks and permission proxy make the integration path straightforward.
  2. **Codex Approval** — Requires switching from one-shot CLI resume to persistent server mode.
  3. **Universal Terminal Fallback** — Terminal screen capture + remote keystroke injection to cover all other CLI tools.

### Explicitly Out of Scope

- ❌ **No hosted SaaS service** — Your data stays on your own machines and your own Hub.
- ❌ **No multi-chat abstraction (Telegram / WeChat)** — Keep the codebase focused and lightweight.
- ❌ **No multi-instance clustering** — Single instance + `/data` persistent volume is the simplest, most reliable architecture.

---

## 6. Security

- **Refuses to start without a password**: Exiting immediately when `HUB_TOKEN` is unset prevents accidental unauthenticated exposure on the public internet.
- **Per-computer dedicated credentials & instant single-host revocation**: Computers joining via an enrollment code receive a scoped credential (`hst_...`) that can only report heartbeats for that specific machine; click *"Revoke"* in the web UI to cut off a machine without rotating your master password.
- **Spoof-proof real IP rate limiting + enrollment circuit breaker**: Uses the underlying socket IP (or rightmost trusted proxy hop) and revokes enrollment codes after repeated failed attempts.
- **Non-root container execution**: The Docker image runs as the unprivileged `node` user, and `~/.dsh/feishu.env` enforces `0600` file permissions.
- **End-to-end encrypted shares**: Session replays are encrypted in the browser with AES-256-GCM; the decryption key lives only in the `#key=` URL fragment and never touches the server.

See **[SECURITY.md](SECURITY.md)** for the full threat model and vulnerability disclosure policy.

---

## 7. Contributing & License

Issues and PRs are welcome! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** and the engineering plan **[docs/PLAN.md](docs/PLAN.md)** before getting started.

```bash
npm install                      # Install frontend build dependencies
npm --prefix dsh-feishu install  # Install plugin test dependencies
npm test                         # Run unit & integration test suite
npm run build                    # Build static web UI bundle
```

[MIT](LICENSE) © 2026 oscarka
