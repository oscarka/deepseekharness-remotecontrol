---
name: pocketagents
description: Launch, connect, configure, and troubleshoot PocketAgents — the self-hosted mobile remote control console for Claude Code, OpenAI Codex, Antigravity IDE, DeepSeek Harness (DSH), and WorkBuddy. Use when the user wants to control coding agents from their phone, print a terminal QR code, enable mobile permission approvals, deploy a 24/7 Railway or Docker Hub, or diagnose host daemon, hook, or push notification issues.
---

# PocketAgents

**PocketAgents** (`oscarka/pocketagents`) lets you monitor and control local AI coding sessions across **Claude Code**, **OpenAI Codex**, **Antigravity IDE**, **DeepSeek Harness (DSH)**, and **WorkBuddy** directly from your phone — 100% self-hosted with zero third-party vendor relay.

- **Repository**: https://github.com/oscarka/pocketagents
- **npm CLI**: `npx pocketagents`
- **Multi-arch Docker Image**: `ghcr.io/oscarka/pocketagents:latest`
- **Live Interactive Sandbox (zero install, zero backend)**: https://pocketagents.agentrun.vip/?demo=1

---

## 1. Quick Decision Tree

Choose the right workflow based on what the user wants:

| Goal | Action |
| :--- | :--- |
| **Instant local control on same Wi-Fi (5s, zero config)** | Run `npx pocketagents` |
| **Try the mobile UI without installing anything** | Share https://pocketagents.agentrun.vip/?demo=1 |
| **24/7 cellular (4G/5G) access across multiple computers** | Deploy the self-hosted Hub (Railway 1-click or Docker) and enroll each machine with `/install.sh` or `connect-host.sh` |
| **Enable or remove Claude Code mobile permission hook** | Run `npx pocketagents --install-claude-hook` or `--uninstall-claude-hook` |
| **Check why mobile sync, approvals, or push aren't working** | Run the Diagnostics checklist in Section 5 |

---

## 2. 5-Second Local Mode (Same Wi-Fi + Terminal QR)

Start the embedded local Control Hub + session watcher in one command (requires Node.js >= 20):

```bash
npx pocketagents
```

What this does automatically:
1. Starts an embedded Control Hub on port `8788` (auto-falls back if busy) with a persistent admin token stored at `~/.dsh/local-hub.token`.
2. Auto-discovers local sessions from **Claude Code**, **OpenAI Codex**, **Antigravity IDE**, **DSH**, **WorkBuddy**, and **Doubao**.
3. Prints a scannable **terminal QR code** and a 24-hour passwordless LAN pairing link (`http://<lan-ip>:8788/?pair=...`).

Useful CLI flags:
- `--port <number>` — choose a specific Hub port (default `8788`)
- `--hub-only` — start only the Control Hub without watching local sessions (ideal for a VPS/NAS)
- `--no-qr` — suppress ASCII QR output
- `--no-claude-hook` — skip auto-registering the Claude Code hook in `~/.claude/settings.json`
- `--install-claude-hook` / `--uninstall-claude-hook` — manage the Claude Code `PermissionRequest` hook standalone

> **Note for background agent execution**: `npx pocketagents` is a long-running foreground server. Start it as a daemon/background process (or tell the user to run it in their terminal so they can scan the QR code directly), and avoid blocking your turn waiting for it to exit.

---

## 3. Claude Code Mobile Permission Approvals

PocketAgents integrates with Claude Code's official `PermissionRequest` hook (`dsh-feishu/lib/claude-permission-hook.js`) so `Bash`, `Edit`, `Write`, `MCP`, and `AskUserQuestion` prompts appear on your phone and in the Swipe Triage deck.

- **Automatic safety**: The hook automatically checks whether a live PocketAgents watcher (`~/.claude/.dsh-remote-approvals/.watcher-alive.json` or `~/.dsh/daemon.lock`) is currently running. If PocketAgents is stopped, the hook exits immediately (`<5ms`, exit `0`) so Claude Code never blocks your terminal.
- **No duplicate prompts**: When installed via the Claude Code plugin (`--from-plugin`), the hook yields immediately if `~/.claude/settings.json` already registers `claude-permission-hook.js`.
- **Manual management**:
  ```bash
  npx pocketagents --install-claude-hook
  npx pocketagents --uninstall-claude-hook
  ```

---

## 4. 24/7 Cellular (4G/5G) Cloud Hub & Multi-Host Enrollment

For away-from-desk access over 4G/5G and unified control of multiple computers (Mac + Linux + NAS):

### Step A: Deploy Your Own Control Hub
- **Option 1 — Railway 1-Click Template (fastest, ~1 min)**:
  Open https://railway.com/deploy/dsh-remote-control-hub?referralCode=44kg1p (uses `ghcr.io/oscarka/pocketagents:latest`, auto-generates `HUB_TOKEN`, provides instant HTTPS with SSE).
- **Option 2 — Docker (VPS / NAS / Raspberry Pi)**:
  ```bash
  docker run -d --name pocketagents-hub \
    --restart unless-stopped \
    -p 8788:8788 \
    -e HUB_TOKEN="replace-with-strong-secret" \
    -v pocketagents-data:/data \
    ghcr.io/oscarka/pocketagents:latest
  ```

### Step B: Enroll Each Computer (No Public IP Needed)
1. Open your Control Hub URL in a browser and sign in with `HUB_TOKEN`.
2. Open **Settings → Add Computer** to copy the 15-minute one-line enrollment command (`curl -fsSL https://<your-hub>/install.sh | bash -s -- <CODE>`), or run `./connect-host.sh` inside a local checkout.
3. The host daemon connects **outbound** over HTTPS and installs itself as a persistent background service (`launchd` on macOS, `systemd` on Linux).

---

## 5. Diagnostics & Troubleshooting

Run targeted read-only checks before suggesting fixes:

1. **Check host daemon liveness (macOS / Linux)**:
   - macOS LaunchAgent: `launchctl list | grep dsh`
   - Lockfile & recent logs: inspect `~/.dsh/daemon.lock` and `tail -n 60 ~/.dsh/hub-daemon.log`
   - Never print raw `HUB_TOKEN`, `FEISHU_HUB_TOKEN`, or `~/.dsh/local-hub.token` values into chat responses.
2. **Check Control Hub health**:
   - `curl -sS https://<your-hub>/api/health` (or `http://127.0.0.1:8788/api/health`) — verify `ok: true`, version, and connected host count.
3. **Antigravity IDE approval click didn't fire on macOS**:
   - macOS **System Settings → Privacy & Security → Accessibility** must allow the terminal / Node runtime running PocketAgents (or tap **Boost Speed → Unlock Accessibility Permission** in the mobile console).
4. **iPhone not receiving lock-screen Web Push**:
   - iOS requires adding the Hub URL via **Safari → Share → Add to Home Screen**, opening it from the Home Screen icon, and enabling push under **Settings → Enable Push**.
5. **Stop or uninstall the background host daemon**:
   - Run `./connect-host.sh --uninstall` or on macOS: `launchctl unload ~/Library/LaunchAgents/com.dsh.remotecontrol.plist`.

---

## 6. Security & Privacy Guardrails

- **Never leak credentials**: Redact `HUB_TOKEN`, `FEISHU_HUB_TOKEN`, `hst_...` host tokens, pairing URLs (`?pair=...`), and `~/.dsh/feishu.env` contents whenever summarizing diagnostics or logs.
- **Keep it self-hosted**: Always point users to their own local Hub, Railway instance, or Docker server — PocketAgents has zero vendor SaaS relay.
