<p align="center">
  <img src="docs/assets/banner.svg" alt="DSH Remote Control" width="100%" />
</p>

<h1 align="center">DSH Remote Control</h1>

<p align="center">
  <strong>Watch and steer your AI coding sessions from your phone</strong> — view live progress, send prompts, stop tasks, and approve tool calls or selection popups in one tap with DSH / Antigravity IDE.<br/>
  Session data stays on your own machines; host the control hub wherever you want.
</p>

<p align="center">
  <a href="https://railway.app/new/template?template=https://github.com/oscarka/deepseekharness-remotecontrol"><img src="https://railway.app/button.svg" alt="Deploy on Railway" height="28" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3B82F6.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node >= 20" />
  <img src="https://img.shields.io/badge/docker-amd64%20%7C%20arm64%20%7C%20armv7-2496ED?logo=docker&logoColor=white" alt="Multi-arch Docker" />
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="#1-30-second-quick-start">30s Quick Start</a> · <a href="#2-the-7-step-onboarding-flow">7-Step Flow</a> · <a href="#3-capability-matrix-honest-edition">Capabilities</a> · <a href="docs/self-hosting.md">Self-Hosting Guide</a> · <a href="SECURITY.md">Security</a>
</p>

---

## 1. 30-Second Quick Start

> **Security Requirement**: Starting without `HUB_TOKEN` is refused by default to prevent accidental public exposure.

```bash
docker run -d \
  --name dsh-remote-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="choose-a-strong-password" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

Or run directly with Node.js (zero runtime dependencies, auto-persists to `~/.dsh/hub-state.json`):

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol
HUB_TOKEN="choose-a-strong-password" PORT=8080 npm start
```

---

## 2. The 7-Step Onboarding Flow

No matter where you deploy the Hub, the onboarding flow is always these 7 steps (no Feishu/Lark account required):

| Step | Device | Action |
|---|---|---|
| ① | Deployment host | Start the Hub and get **1 URL + 1 Admin Password (`HUB_TOKEN`)** |
| ② | **Computer** | Open the URL in your browser and sign in with the password |
| ③ | **Computer** | The page shows **"Computer not connected"** with a **one-line install command** + **enrollment code** |
| ④ | **Computer** | Paste and run the command in your terminal (auto-installs, pairs with a dedicated host token, and enables auto-start) |
| ⑤ | **Computer** | The browser page automatically refreshes and shows your computer |
| ⑥ | **Phone** | Tap **"📱 Phone QR Login"** on the computer and scan the QR code with your phone camera (no password typing needed; `localhost` automatically switches to your LAN IP) |
| ⑦ | **Phone** | Watch tasks, send prompts, stop runs, and approve tool calls or selection popups |

**Add a second computer**: Repeat steps ②–⑤ using the same enrollment code (multi-use within its validity window). Each computer receives its own revocable credential (`hstk_...`).

---

## 3. Capability Matrix (Honest Edition)

| Backend | Watch Sessions | Send Prompts | Stop | **Phone Approval & Selection Popups** | Live Steer |
|---|:---:|:---:|:---:|:---:|:---:|
| **DSH** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Antigravity IDE** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Claude Code** | ✅ | ✅ | ✅ | Planned | ❌ |
| **Codex** | ✅ | ✅ | ✅ | Planned | ❌ |

- **UI renders strictly by this matrix**: unsupported actions are never shown as fake buttons.
- **Clear detection during install**: if only Codex/Claude Code is installed, the installer explicitly notes that observation + prompt/stop mode is active and phone approvals require DSH or Antigravity IDE.

---

## 4. Six Deployment Options, Same 7-Step Flow

| Scenario | Option | Cost | Difficulty |
|---|---|---|---|
| Fastest cloud trial | Railway 1-Click Template | ~$5/mo after trial | ★ |
| Own VPS / Server | Docker Compose + Reverse Proxy | Server cost | ★★ |
| Own Domain at Home | Cloudflare Tunnel | Domain cost | ★★ |
| Domestic NAT Traversal | FRP / Sakier / Cpolar | Free tier available | ★★ |
| Tailscale User | Tailscale Funnel | Free | ★★★ |
| Home Wi-Fi Only | LAN (`http://192.168.x.x:8080`) | Free | ★ |

See **[docs/self-hosting.md](docs/self-hosting.md)** for step-by-step Reverse Proxy, HTTPS, NAS, and Raspberry Pi configurations.

---

## 5. Security

- **Refuses to start without `HUB_TOKEN`**.
- **Per-host credentials (`hstk_...`) + Ed25519 public-key pinning**: computers join via time-limited enrollment codes without ever touching your master `HUB_TOKEN`, and any machine can be revoked individually in the UI.
- **Anti-spoofing rate limiter**: uses the rightmost trusted proxy hop or raw socket IP.
- **AES-256-GCM end-to-end encrypted shares**: decryption keys stay in the `#k=` URL fragment and never touch the server.

See **[SECURITY.md](SECURITY.md)** for full details.

---

## 6. Contributing & License

```bash
npm install
npm run build
npm test
```

[MIT](LICENSE) © 2026 oscarka
