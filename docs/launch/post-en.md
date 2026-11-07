# Show HN: Self-hosted remote control for AI coding agents

> 发布渠道：Hacker News (Show HN) / Reddit r/LocalLLaMA
> 配图：首屏 GIF；HN 正文不要放图，放在仓库里

**What it is**

A small self-hosted hub plus a phone-friendly web console that lets you watch and steer coding agents running on your own machine — and, where the agent supports it, approve tool calls from your phone.

**Why I built it**

Coding agents stop and ask for approval before running commands. If you're away from the desk, the task just sits there. Existing options were either notification-only bots (you can see the request but can't answer it) or tmux-over-SSH (works, but you're squinting at a terminal on a phone).

**How it works**

- A hub (Node, no dependencies) runs wherever you want: your laptop, a NAS, a VPS, or Railway.
- Your machine connects out to the hub. No inbound ports, no port forwarding.
- The console is a PWA. Add it to your home screen and it behaves like an app.
- Approvals go through each harness's native hook where one exists, not screen-scraping and synthetic keystrokes.

**What actually works today**

| | watch | prompt | stop | approve |
|---|:---:|:---:|:---:|:---:|
| DSH | ✅ | ✅ | ✅ | ✅ |
| Antigravity IDE | ✅ | ✅ | ✅ | ✅ |
| Claude Code | ✅ | ✅ | ✅ | planned |
| Codex | ✅ | ✅ | ✅ | exploring |

Claude Code exposes a `PreToolUse` hook and a permission-prompt tool, so the path is clear. Codex needs its app-server mode, which is a bigger change — I haven't done it yet.

**Deploy**

```bash
docker run -d --name dsh-hub -p 8080:8080 \
  -e HUB_TOKEN=<password> -v dsh-hub-data:/data \
  ghcr.io/oscarka/dsh-hub:0.3.0
```

There's also a Railway template if you'd rather not run a server. It's about $5/month there — the free credit doesn't cover an always-on process.

**Limitations, up front**

- Your computer has to stay awake. The hub relays; it doesn't execute anything.
- Single instance only — state lives in process memory.
- macOS and Linux; Windows is untested.
- One maintainer, no SLA.

**What I'd like feedback on**

The approval adapter design. Specifically: is `PreToolUse` the right hook for Claude Code, or is `--permission-prompt-tool` a better fit for a remote-approval flow? And has anyone driven Codex's app-server approval requests from an external process?

Repo: https://github.com/oscarka/deepseekharness-remotecontrol
