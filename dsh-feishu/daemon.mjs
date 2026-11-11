#!/usr/bin/env node
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
import { resolveConfig, loadSettings } from './lib/config.js'
import { acquireDaemonLock } from './lib/daemon-lock.js'
import { FeishuBridge } from './lib/bridge.js'
import { HubAgent } from './lib/hub-agent.js'
import { listWorkspaceFiles, readWorkspaceFile } from './lib/workspace-ops.js'

import { WorkBuddyAdapter } from './lib/harnesses/workbuddy-adapter.js'

const once = process.argv.includes('--once')
const replace = process.argv.includes('--replace')
const workbuddyLogin = process.argv.includes('--workbuddy-login')
const config = await loadSettings(resolveConfig())

const runStandaloneWorkBuddyLogin = async () => {
  const wbAdapter = new WorkBuddyAdapter({ logger: console })
  if (!wbAdapter.isAvailable()) {
    console.error('❌ 未检测到本机安装的 WorkBuddy / codebuddy CLI')
    return false
  }
  console.log('🔐 正在拉起 WorkBuddy CLI 浏览器授权登录，请在电脑弹出的浏览器页面点击确认授权...')
  const authRes = await wbAdapter.authenticate()
  wbAdapter.shutdown()
  if (authRes?.ok) {
    const who = authRes.userInfo?.userName || authRes.userInfo?.userId || '已授权账号'
    console.log(`✅ WorkBuddy CLI 浏览器授权成功 (${who})！正在运行的后台守护进程将自动生效。`)
    return true
  }
  console.warn(`⚠️ WorkBuddy CLI 浏览器授权未完成: ${authRes?.error || 'unknown error'}`)
  return false
}

if (workbuddyLogin && once && !config.hubUrl) {
  const ok = await runStandaloneWorkBuddyLogin()
  process.exit(ok ? 0 : 1)
}

if (!config.hubUrl) {
  console.error('❌ 缺少 FEISHU_HUB_URL 配置，请先在 ~/.dsh/feishu.env 中设置 FEISHU_HUB_URL 和 FEISHU_HUB_TOKEN')
  process.exit(1)
}

let daemonLock = null
let hubAgent = null
if (!once) {
  daemonLock = await acquireDaemonLock({
    dshHome: config.dshHome,
    hostId: config.hostId,
    replace,
  })
  if (!daemonLock.acquired) {
    if (workbuddyLogin) {
      const ok = await runStandaloneWorkBuddyLogin()
      process.exit(ok ? 0 : 1)
    }
    console.log(
      `ℹ️ 守护进程已在运行中 (PID: ${daemonLock.existing?.pid || 'unknown'}, bootId: ${daemonLock.existing?.bootId || ''})，本次启动自动退出（如需替换请加 --replace）`,
    )
    process.exit(0)
  }
  const cleanupLock = () => {
    try {
      hubAgent?.stop?.()
    } catch {}
    try {
      daemonLock?.release?.()
    } catch {}
  }
  process.once('exit', cleanupLock)
  process.once('SIGINT', () => {
    cleanupLock()
    process.exit(0)
  })
  process.once('SIGTERM', () => {
    cleanupLock()
    process.exit(0)
  })
}

const bridge = new FeishuBridge({
  config,
  agents: {
    list: () => [],
    get: () => undefined,
  },
  sendText: async () => ({ messageId: 'noop' }),
  sendCard: async () => ({ messageId: 'noop' }),
})

hubAgent = new HubAgent({
  config,
  bridge,
  transport: null,
  audit: null,
  logger: console,
  bootId: daemonLock?.bootId,
  bootEpochMs: daemonLock?.startedAt,
})

if (workbuddyLogin) {
  const wbAdapter = hubAgent.harnessRouter?.getAdapter?.('workbuddy')
  if (wbAdapter && typeof wbAdapter.authenticate === 'function') {
    console.log('🔐 正在拉起 WorkBuddy CLI 浏览器授权登录，请在电脑弹出的浏览器页面点击确认授权...')
    const authRes = await wbAdapter.authenticate()
    if (authRes?.ok) {
      const who = authRes.userInfo?.userName || authRes.userInfo?.userId || '已授权账号'
      console.log(`✅ WorkBuddy CLI 浏览器授权成功 (${who})！`)
    } else {
      console.warn(`⚠️ WorkBuddy CLI 浏览器授权未完成: ${authRes?.error || 'unknown error'}`)
    }
  } else {
    console.warn('⚠️ 未检测到可用的 WorkBuddy 适配器，跳过 --workbuddy-login')
  }
}

// Pre-populate default workspace file tree so Web UI file browser is ready immediately
try {
  const defaultDir = config.defaultWorkspace || process.cwd()
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
  // ignore initial workspace preview errors
}

await hubAgent.tick()

const extSessions = Array.isArray(hubAgent.cachedExternalSessions) ? hubAgent.cachedExternalSessions : []
const wbSessionsCount = extSessions.filter(s => s?.harness === 'workbuddy').length
const codexSessionsCount = extSessions.filter(s => s?.harness === 'codex').length
console.log(`✅ 已连接总控中心: ${config.hubUrl}`)
console.log(`💻 当前电脑名称: ${config.hostName} (${config.hostId})`)
console.log(
  `📂 已同步本机 DSH 会话数: ${hubAgent.cachedDiskSessions?.length || 0} 条 | ⚡ Antigravity IDE 会话数: ${hubAgent.cachedAgySessions?.length || 0} 条 | 🐼 WorkBuddy 会话数: ${wbSessionsCount} 条 | 🧠 Codex 会话数: ${codexSessionsCount} 条`,
)

if (!once) {
  hubAgent.start()
  console.log('🟢 后台常驻心跳已启动（每 2.5 秒同步一次状态与远程指令）...')
  setInterval(() => {}, 60_000)
} else {
  hubAgent.stop()
}
