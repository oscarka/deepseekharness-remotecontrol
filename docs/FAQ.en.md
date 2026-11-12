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
| Claude Code | ✅ | ✅ | ✅ | planned | ❌ |

DSH, Antigravity IDE, OpenAI Codex, and Tencent WorkBuddy all support **full interactive remote control** (live transcripts, prompts, emergency stop, mobile approvals/question popups, and live mid-run steering). Claude Code currently runs per-turn via `--resume` (watch, prompt, and stop work; mobile approvals are planned). Controls that a backend can't support are automatically hidden.

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
| Your laptop | same Wi-Fi only | 0 |
| Home NAS / server | same Wi-Fi only | hardware |
| Google Cloud Run | anywhere (4G/5G/Wi-Fi) | scales to zero when idle (~$0 in free tier) |
| Cloud / Railway | anywhere | server or platform fee |
| Laptop + tunnel | anywhere | 0 |

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

## Why doesn't Claude Code have mobile approvals yet?

Approvals require a persistent "ask before executing" protocol hook:

- **DSH / Antigravity IDE / OpenAI Codex (`app-server`) / Tencent WorkBuddy (`ACP`)**: native interactive protocols — all working with mobile approvals, question cards, and live mid-run steering
- **Claude Code**: currently invoked per-turn via `claude --resume`; `PreToolUse` permission hook integration is planned

## Found a vulnerability?

Use GitHub Security Advisories, not a public issue. Details in [SECURITY.md](../SECURITY.md).

---

Something not covered? [Open an issue](https://github.com/oscarka/deepseekharness-remotecontrol/issues/new/choose).
