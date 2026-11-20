#!/usr/bin/env node
// PocketAgents — One-command zero-config mobile console for Claude Code, OpenAI Codex, Antigravity IDE, DSH & WorkBuddy.
// Usage: npx pocketagents [--port 8788] [--hub-only] [--no-qr]

for (const k of [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'http_proxy',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
  'RPC_PROXY_DEST_OVERRIDE',
  'RPC_PROXY_HEADER_AS_EXTENSION',
  'ANTIGRAVITY_LS_ADDRESS',
  'ANTIGRAVITY_CSRF_TOKEN',
]) {
  delete process.env[k]
}

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from '../dsh-feishu/lib/config.js'
import { FeishuBridge } from '../dsh-feishu/lib/bridge.js'
import { HubAgent } from '../dsh-feishu/lib/hub-agent.js'
import { startEmbeddedLocalHub } from '../dsh-feishu/lib/local-hub.js'
import { renderTerminalQr } from '../dsh-feishu/lib/terminal-qr.js'
import {
  installClaudePermissionHook,
  isClaudePermissionHookInstalled,
  uninstallClaudePermissionHook,
} from '../dsh-feishu/lib/claude-permission-hook.js'
import { listWorkspaceFiles, readWorkspaceFile } from '../dsh-feishu/lib/workspace-ops.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_PATH = join(__dirname, '..', 'package.json')
let PKG_VERSION = '0.9.6'
try {
  PKG_VERSION = JSON.parse(readFileSync(PKG_PATH, 'utf8')).version || PKG_VERSION
} catch {
  // fallback to bundled version
}

export function parseCliArgs(argv = []) {
  const opts = {
    port: 8788,
    bindHost: '0.0.0.0',
    token: '',
    hubOnly: false,
    noQr: false,
    noClaudeHook: false,
    installClaudeHook: false,
    uninstallClaudeHook: false,
    once: false,
    help: false,
    version: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = String(argv[i] || '')
    if (arg === '-h' || arg === '--help') {
      opts.help = true
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true
    } else if (arg === '--hub-only') {
      opts.hubOnly = true
    } else if (arg === '--no-qr') {
      opts.noQr = true
    } else if (arg === '--no-claude-hook') {
      opts.noClaudeHook = true
    } else if (arg === '--install-claude-hook') {
      opts.installClaudeHook = true
    } else if (arg === '--uninstall-claude-hook') {
      opts.uninstallClaudeHook = true
    } else if (arg === '--once') {
      opts.once = true
    } else if (arg === '-p' || arg === '--port') {
      const next = Number(argv[i + 1])
      if (Number.isInteger(next) && next >= 0 && next <= 65535) {
        opts.port = next
        i += 1
      }
    } else if (arg.startsWith('--port=')) {
      const next = Number(arg.slice('--port='.length))
      if (Number.isInteger(next) && next >= 0 && next <= 65535) {
        opts.port = next
      }
    } else if (arg === '--host') {
      if (argv[i + 1]) {
        opts.bindHost = String(argv[i + 1])
        i += 1
      }
    } else if (arg.startsWith('--host=')) {
      opts.bindHost = arg.slice('--host='.length)
    } else if (arg === '--token') {
      if (argv[i + 1]) {
        opts.token = String(argv[i + 1])
        i += 1
      }
    } else if (arg.startsWith('--token=')) {
      opts.token = arg.slice('--token='.length)
    }
  }
  return opts
}

function printHelp() {
  console.log(`
PocketAgents v${PKG_VERSION}
Control Claude Code, OpenAI Codex, Antigravity IDE, DeepSeek Harness & WorkBuddy from your phone.

Usage:
  npx pocketagents [options]
  pocketagents [options]

Options:
  -p, --port <number>         Preferred Hub port (default: 8788, auto-fallback if busy)
      --host <addr>           Bind host (default: 0.0.0.0)
      --token <secret>        Custom HUB_TOKEN (default: saved in ~/.dsh/local-hub.token)
      --hub-only              Start only the web Control Hub without local session watcher
      --no-qr                 Skip printing the terminal QR code
      --install-claude-hook   Install Claude Code PermissionRequest hook into ~/.claude/settings.json
      --uninstall-claude-hook Remove Claude Code PermissionRequest hook from ~/.claude/settings.json
      --no-claude-hook        Skip auto-installing the Claude Code approval hook on startup
  -v, --version               Print version
  -h, --help                  Show this help

Examples:
  npx pocketagents              # Start local Hub + auto-watch local AI sessions + print QR
  npx pocketagents --port 9000  # Use a custom port
  npx pocketagents --hub-only   # Run Hub only (for VPS / server)

Want 24/7 cellular (4G/5G) access away from home Wi-Fi?
  Deploy on Railway (1-click) or Docker: https://github.com/oscarka/pocketagents
`.trim())
}

function summarizeDiscoveredSessions(hubAgent) {
  if (!hubAgent) return ''
  const ext = Array.isArray(hubAgent.cachedExternalSessions) ? hubAgent.cachedExternalSessions : []
  const counts = {
    claude: ext.filter(s => s?.harness === 'claude').length,
    codex: ext.filter(s => s?.harness === 'codex').length,
    antigravity: Array.isArray(hubAgent.cachedAgySessions) ? hubAgent.cachedAgySessions.length : 0,
    dsh: Array.isArray(hubAgent.cachedDiskSessions) ? hubAgent.cachedDiskSessions.length : 0,
    workbuddy: ext.filter(s => s?.harness === 'workbuddy').length,
    doubao: ext.filter(s => s?.harness === 'doubao').length,
  }
  const parts = []
  if (counts.claude) parts.push(`Claude Code (${counts.claude})`)
  if (counts.codex) parts.push(`Codex (${counts.codex})`)
  if (counts.antigravity) parts.push(`Antigravity IDE (${counts.antigravity})`)
  if (counts.dsh) parts.push(`DSH (${counts.dsh})`)
  if (counts.workbuddy) parts.push(`WorkBuddy (${counts.workbuddy})`)
  if (counts.doubao) parts.push(`Doubao (${counts.doubao})`)
  return parts.length > 0
    ? parts.join(' · ')
    : 'No active sessions yet — start a task in Claude Code, Codex, Antigravity, or DSH and it will appear automatically.'
}

export async function runCli(argv = process.argv.slice(2)) {
  const opts = parseCliArgs(argv)
  if (opts.version) {
    console.log(PKG_VERSION)
    return 0
  }
  if (opts.help) {
    printHelp()
    return 0
  }

  const baseConfig = resolveConfig()
  const claudeHome = baseConfig.claudeHome || process.env.CLAUDE_HOME || join(homedir(), '.claude')

  if (opts.installClaudeHook) {
    const res = installClaudePermissionHook({ claudeHome })
    if (!res.ok) {
      console.error(`❌ Failed to install Claude Code hook: ${res.error}`)
      return 1
    }
    console.log(`✅ Claude Code mobile approval hook installed in ${res.settingsPath}`)
    console.log('   Any Claude Code tool approval (Bash, Edit, Write, MCP, AskUserQuestion) will now appear on your phone.')
    return 0
  }

  if (opts.uninstallClaudeHook) {
    const res = uninstallClaudePermissionHook({ claudeHome })
    if (!res.ok) {
      console.error(`❌ Failed to uninstall Claude Code hook: ${res.error}`)
      return 1
    }
    console.log(
      res.removed
        ? `✅ Removed Claude Code mobile approval hook from ${res.settingsPath}`
        : `ℹ️ Claude Code mobile approval hook was not installed in ${res.settingsPath}`,
    )
    return 0
  }

  let claudeHookStatusNote = ''
  if (!opts.hubOnly && !opts.noClaudeHook && existsSync(claudeHome)) {
    if (!isClaudePermissionHookInstalled({ claudeHome })) {
      const hookRes = installClaudePermissionHook({ claudeHome })
      if (hookRes.ok) {
        claudeHookStatusNote = `✅ Auto-enabled Claude Code mobile approvals (${hookRes.settingsPath})`
      }
    } else {
      claudeHookStatusNote = '✅ Claude Code mobile approvals active (~/.claude/settings.json)'
    }
  }

  const silentLogger = {
    info: () => {},
    warn: msg => console.warn(msg),
    error: msg => console.error(msg),
  }

  const localHub = await startEmbeddedLocalHub({
    dshHome: baseConfig.dshHome,
    preferredPort: opts.port,
    bindHost: opts.bindHost,
    explicitToken: opts.token || process.env.HUB_TOKEN || '',
    hostId: baseConfig.hostId,
    logger: silentLogger,
  })

  let hubAgent = null
  if (!opts.hubOnly) {
    const effectiveConfig = {
      ...baseConfig,
      hubUrl: localHub.hubUrl,
      hubToken: localHub.hubToken,
    }
    const bridge = new FeishuBridge({
      config: effectiveConfig,
      agents: {
        list: () => [],
        get: () => undefined,
      },
      sendText: async () => ({ messageId: 'noop' }),
      sendCard: async () => ({ messageId: 'noop' }),
    })
    hubAgent = new HubAgent({
      config: effectiveConfig,
      bridge,
      transport: null,
      audit: null,
      logger: silentLogger,
      bootId: `cli-${Date.now().toString(36)}`,
      bootEpochMs: Date.now(),
    })

    // Seed workspace file list for instant mobile code browsing
    try {
      const defaultDir = effectiveConfig.defaultWorkspace || process.cwd()
      const fsList = await listWorkspaceFiles(defaultDir, '')
      if (fsList.ok) {
        hubAgent.pendingResults.push({
          id: 'init-fs-list',
          type: 'list_files',
          at: Date.now(),
          ...fsList,
        })
        const firstDoc = fsList.entries?.find(e => !e.isDirectory && /readme|package|\.py|\.js|\.md/i.test(e.name))
        if (firstDoc) {
          const fileRead = await readWorkspaceFile(defaultDir, firstDoc.relPath)
          if (fileRead.ok) {
            hubAgent.pendingResults.push({
              id: 'init-fs-read',
              type: 'read_file',
              at: Date.now(),
              ...fileRead,
            })
          }
        }
      }
    } catch {
      // ignore workspace preview errors
    }

    await hubAgent.tick()
  }

  const qrTargetUrl = localHub.pairUrl || localHub.localPairUrl || localHub.localUrl
  const useAnsi = !process.env.NO_COLOR && Boolean(process.stdout.isTTY)
  const qrBlock = opts.noQr ? '' : renderTerminalQr(qrTargetUrl, { margin: 2, indent: '  ', useAnsi })

  console.log('')
  console.log(`🚀 PocketAgents v${PKG_VERSION} — Ready on port ${localHub.port}`)
  console.log(`   💻 Host: ${baseConfig.hostName} (${baseConfig.hostId})`)
  if (!opts.hubOnly) {
    console.log(`   🔌 Synced: ${summarizeDiscoveredSessions(hubAgent)}`)
  }
  if (claudeHookStatusNote) {
    console.log(`   ${claudeHookStatusNote}`)
  }
  console.log('')

  if (qrBlock) {
    console.log('  📱 Scan with your phone camera (same Wi-Fi · 1-tap passwordless login):')
    console.log('')
    console.log(qrBlock)
    console.log('')
  }

  console.log(`  📱 Phone (LAN):    ${localHub.pairUrl}`)
  console.log(`  💻 This computer:  ${localHub.localPairUrl}`)
  if (localHub.pairCode) {
    console.log(`  🔑 Pair code:      ${localHub.pairCode}  (valid 24h)`)
  }
  if (localHub.tokenFile) {
    console.log(`  🔒 Admin token:    saved in ${localHub.tokenFile}`)
  }
  console.log('')
  console.log('  💡 Need 24/7 cellular (4G/5G) access away from Wi-Fi?')
  console.log('     Deploy your own Hub in 1 click on Railway or Docker:')
  console.log('     https://github.com/oscarka/pocketagents')
  console.log('')

  if (opts.once) {
    hubAgent?.stop?.()
    await localHub.close()
    return 0
  }

  if (hubAgent) {
    hubAgent.start()
  }

  console.log('  🟢 Watching local AI sessions live... Press Ctrl+C to stop.')

  await new Promise(resolve => {
    let shuttingDown = false
    const shutdown = async () => {
      if (shuttingDown) return
      shuttingDown = true
      console.log('\n🛑 Stopping PocketAgents...')
      try {
        hubAgent?.stop?.()
      } catch {}
      try {
        await localHub.close()
      } catch {}
      resolve()
    }
    process.once('SIGINT', () => void shutdown())
    process.once('SIGTERM', () => void shutdown())
  })

  return 0
}

function isInvokedAsCli() {
  if (!process.argv[1]) return false
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
  } catch {
    return fileURLToPath(import.meta.url) === process.argv[1]
  }
}

if (isInvokedAsCli()) {
  runCli()
    .then(code => {
      process.exit(code)
    })
    .catch(err => {
      console.error(`❌ Failed to start PocketAgents: ${err?.message || err}`)
      process.exit(1)
    })
}
