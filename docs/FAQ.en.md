# FAQ (English)

Condensed version of the [Chinese FAQ](FAQ.md). Answers are deliberately blunt, including the parts that aren't flattering.

## Do I need DSH installed?

No — you can use any one (or any mix) of the 5 supported AI coding tools:

| | watch | prompt | stop | approve & questions | steer |
|---|:---:|:---:|:---:|:---:|:---:|
| DSH | ✅ | ✅ | ✅ | ✅ | ✅ |
| Antigravity IDE | ✅ | ✅ | ✅ | ✅ | ✅ |
| OpenAI Codex | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tencent WorkBuddy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Claude Code | ✅ | ✅ | ✅ | ✅ | ❌ |

All 5 primary tools — DSH, Antigravity IDE, OpenAI Codex, Tencent WorkBuddy, and **Claude Code** — support **mobile approvals and question cards** (Claude Code integrates via its official `PermissionRequest` hook for Bash, Edit, Write, MCP, and `AskUserQuestion`; only live mid-run steering is unsupported due to upstream CLI limits). Controls that a backend can't support are automatically hidden.

## Does the phone need an app?

No. Open the hub URL in a browser. You can add it to your home screen.

That said, **add-to-home-screen and Web Push require HTTPS**. Over plain `http://192.168.x.x:8080` everything works except those two — a browser restriction, not a missing feature.

## Does my computer have to stay on?

Yes. Tasks run on your machine; the hub only relays. Sleep or shutdown and the phone can't reach it.

## Windows?

Untested. The one-command setup targets macOS (LaunchAgent) and Linux. On Windows you'd start the daemon manually.

## Do I have to deploy the hub to a cloud?

No. Where the hub lives decides where your phone can reach it:

| Hub location | Phone works from | Cost |
|---|---|---|
| Railway / Lightweight VPS | anywhere (4G/5G/Wi-Fi) | predictable flat fee (e.g. ~$5/mo Railway Hobby) |
| Your laptop | same Wi-Fi only | 0 |
| Home NAS / server | same Wi-Fi only | hardware |
| Laptop + tunnel | anywhere | 0 |
| Google Cloud Run | anywhere (4G/5G/Wi-Fi) | billed while active (stays resident while host daemons stay connected 24/7) |

"Nothing to deploy" and "works from anywhere" are mutually exclusive. Pick one.

## Is Railway free?

Not for an always-on process.

- 30-day trial with a one-time $5 credit
- After that, the Free plan gives **$1 per month**
- This hub needs ~0.5 GB resident, which is roughly **$5/month** on Railway

Budget for Hobby ($5/mo). Don't treat it as free hosting — the service stops when credit runs out.

## Does Tailscale work from China?

The login step hits their website, which is often slow and sometimes needs a proxy. After login, direct connections usually work; if NAT traversal fails, traffic falls back to relays that may be unreliable from China.

More reliable options there: run it on your own server, use a domestic tunnel service, or deploy to a PaaS.

## Does my data pass through third parties?

Depends where you put the hub. The project itself uploads nothing to any server.

The hub sees task lists, status, step summaries and pending approvals; full transcripts are fetched on demand.

Tunnel choice matters:
- **Tailscale**: encrypted device-to-device, not decrypted in the middle
- **Cloudflare Tunnel**: TLS terminates at Cloudflare's edge, so traffic passes through their servers

## Is Feishu required?

No. Feishu is an optional notification and approval channel. The web console works without it.

## How do Claude Code mobile approvals work?

- **DSH / Antigravity IDE / OpenAI Codex (`app-server`) / Tencent WorkBuddy (`ACP`)**: native interactive protocols — all working with mobile approvals, question cards, and live mid-run steering
- **Claude Code**: uses the official `PermissionRequest` hook (`npx pocketagents` auto-enables it, or install via `/plugin install pocketagents@pocketagents`) to approve Bash, Edit, Write, MCP, and `AskUserQuestion` prompts from your phone with zero terminal blocking when PocketAgents is stopped; only live mid-run steering is unsupported by the upstream CLI

## Found a vulnerability?

Use GitHub Security Advisories, not a public issue. Details in [SECURITY.md](../SECURITY.md).

---

Something not covered? [Open an issue](https://github.com/oscarka/pocketagents/issues/new/choose).
