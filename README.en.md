<p align="center">
  <img src="docs/assets/banner.svg" alt="DSH Remote Control" width="100%" />
</p>

<h1 align="center">DSH Remote Control</h1>

<p align="center">
  <strong>Put your running AI coding tasks in your pocket — check progress, send prompts, stop runs, or approve actions in one tap from your phone.</strong><br/>
  All code and transcripts stay on your own machines, never on a third-party hosted SaaS.
</p>

<p align="center">
  <a href="https://railway.app/template?referralCode=dsh-remote"><img src="https://railway.app/button.svg" alt="Deploy on Railway" height="28" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3B82F6.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Docker-Mac%20%7C%20Linux%20%7C%20NAS%20%7C%20Pi-10B981.svg" alt="Multi-Arch" />
  <img src="https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white" alt="Node >= 20" />
</p>

<p align="center">
  <a href="README.md"><strong>🇨🇳 简体中文</strong></a> · <strong>🇺🇸 English</strong> · <a href="#get-started-in-3-steps">3-Step Setup</a> · <a href="#supported-ai-coding-tools">Supported Tools</a> · <a href="#faq">FAQ</a> · <a href="docs/self-hosting.md">Self-Hosting Guide</a> · <a href="SECURITY.md">Security</a>
</p>

<p align="center">
  <img src="docs/assets/demo.svg" alt="DSH Remote Control Demo" width="100%" />
</p>

---

## Why This Exists

You kick off a 30-minute refactor or test suite on your computer and step away for coffee, a meeting, or the train. Three things inevitably happen:

- ☕ **It blocks waiting for your permission**: The AI wants to run a shell command or asks a multiple-choice question, and sits idle until you're back at your desk.
- 🚇 **It goes off track and you want to steer it**: Halfway through your commute you realize it's touching the wrong files, and you want to stop it or tell it *"don't touch the tests"* right now.
- 🎉 **You want to know the moment it finishes**: Instead of walking back to check your laptop every five minutes, get a lock-screen alert and send the next prompt straight from your phone.

**DSH Remote Control** puts all of your machines in one clean mobile web app — without uploading your codebase to a third-party cloud.

---

## Get Started in 3 Steps

No Feishu/Lark account required, and zero changes to your existing workflow:

### Step 1: Start Your Control Hub (Pick One)

- **🏠 Option A: Run Directly on Your Computer (Recommended · Free, No Docker or `npm install` Needed)**  
  The Hub is built with 100% native Node.js modules (zero runtime dependencies) and pre-built web assets. Just clone and start with a password:
  ```bash
  git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
  cd deepseekharness-remotecontrol
  HUB_TOKEN="choose-a-password" PORT=8080 npm start
  ```

- **🚇 Option B: Control from Anywhere Outside (1-Click Cloud Deploy)**  
  Click below to automatically deploy your own private Hub from GitHub in 3 minutes and get an HTTPS URL:  
  [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template?referralCode=dsh-remote) *(30-day free trial, then ~\$5/month)*

<details>
<summary>💡 <b>Want to use Docker on a VPS / NAS / Raspberry Pi, or use a Tunnel? Click to expand</b></summary>

If you prefer Docker (GitHub Actions automatically builds and publishes multi-arch images on every push to `main` — no manual upload required):

```bash
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="choose-a-password" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

| Your Setup | Recommended Option | Cost |
|---|---|---|
| Own Cloud Server (VPS) | Clone & run `npm start`, or `docker-compose.yml` + Caddy/Nginx | Server cost |
| Own Domain at Home (No Public IP) | Local `npm start` + Cloudflare Named Tunnel | Domain renewal |
| Behind NAT / Domestic Network | Local `npm start` + NAT traversal (frp / cpolar / Tailscale) | Free tier available |
| Synology NAS / Raspberry Pi | Run the Docker command above (`amd64` / `arm64` / `armv7`) | Free |

See the full configuration guide 👉 **[docs/self-hosting.md](docs/self-hosting.md)**

</details>

---

### Step 2: Connect Your Computer

1. Open the Hub URL in your **computer browser** and sign in with your password.
2. Copy the **one-line install command** shown on screen and run it in your terminal.
3. It pairs automatically, sets up background auto-start, and **your browser page refreshes to show your computer**.

---

### Step 3: Scan the QR Code on Your Phone

1. Tap **"📱 Phone QR Login"** on your computer screen.
2. **Scan the QR code with your phone camera** — you're logged in immediately without typing any password!  
   *(Tip: On iPhone Safari, tap **Share → Add to Home Screen** for a full-screen app experience with lock-screen push notifications.)*

---

## Supported AI Coding Tools

The UI only shows buttons for capabilities your backend actually supports — **never fake buttons**:

| Tool on Your Computer | Watch Progress | Send Prompts / New Task | Stop Run | **Phone Approvals & Question Popups** | Live Steer |
|---|:---:|:---:|:---:|:---:|:---:|
| **DSH (DeepSeek Harness)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Antigravity IDE** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Claude Code** | ✅ | ✅ | ✅ | Planned | — |
| **Codex** | ✅ | ✅ | ✅ | Planned | — |

> **Why do phone approvals currently require DSH or Antigravity?**  
> Intercepting dangerous commands requires a pre-execution hook (`PreToolUse`) or live RPC channel. DSH and Antigravity have built-in live channels; Claude Code hook integration and Codex persistent approval mode are on our roadmap. Even with only Claude Code or Codex installed, you can watch live progress, start tasks, send follow-ups, and stop runs from your phone.

---

## FAQ

**Q: Can I connect multiple computers (e.g., office Mac + home desktop)?**  
A: Yes! Run the same install command on your second computer (each enrollment code can connect multiple machines within 15 minutes) without restarting the Hub. Switch between machines or view all sessions together from the top bar.

**Q: Do I need a Feishu / Lark account?**  
A: **No.** Everything works in your phone browser / Home Screen PWA out of the box. If you also want Feishu bot cards, expand below:

<details>
<summary>🔌 <b>Optional: Connect a Feishu / Lark Bot (click to expand)</b></summary>

1. Create an enterprise custom app on the [Feishu Open Platform](https://open.feishu.cn/), enable Bot, request `im:message.p2p_msg:readonly` and `im:message:send_as_bot`, and select **Long Connection** for `im.message.receive_v1`.
2. Add `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, and `FEISHU_ALLOWED_OPEN_IDS` to `~/.dsh/feishu.env`.

</details>

**Q: Is it safe to expose the Hub on the internet?**  
A:
- **Refuses to start without a password**: Prevents accidental unauthenticated deployments.
- **Per-computer revocable credentials**: Each computer gets its own scoped token (`hst_...`) via the enrollment code and never touches your master password. You can revoke any machine in one tap from Settings.
- **Brute-force protection**: Real-IP rate limiting and automatic circuit breakers protect both login and pairing codes. See **[SECURITY.md](SECURITY.md)** for details.

<details>
<summary>🛠️ <b>Local Development & Contributing (click to expand)</b></summary>

Issues and PRs are welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[docs/PLAN.md](docs/PLAN.md)**.

```bash
npm install                      # Install frontend build dependencies
npm --prefix dsh-feishu install  # Install plugin test dependencies
npm test                         # Run full test suite
npm run build                    # Build static web UI bundle
```

</details>

---

[MIT License](LICENSE) © 2026 oscarka
