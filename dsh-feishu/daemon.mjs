#!/usr/bin/env node
import { resolveConfig, loadSettings } from './lib/config.js'
import { FeishuBridge } from './lib/bridge.js'
import { HubAgent } from './lib/hub-agent.js'
import { listWorkspaceFiles, readWorkspaceFile } from './lib/workspace-ops.js'

const once = process.argv.includes('--once')
const config = await loadSettings(resolveConfig())

if (!config.hubUrl) {
  console.error('❌ 缺少 FEISHU_HUB_URL 配置，请先在 ~/.dsh/feishu.env 中设置 FEISHU_HUB_URL 和 FEISHU_HUB_TOKEN')
  process.exit(1)
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

const hubAgent = new HubAgent({
  config,
  bridge,
  transport: null,
  audit: null,
  logger: console,
})

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

console.log(`✅ 已连接总控中心: ${config.hubUrl}`)
console.log(`💻 当前电脑名称: ${config.hostName} (${config.hostId})`)
console.log(`📂 已同步本机 DSH 会话数: ${hubAgent.cachedDiskSessions?.length || 0} 条`)

if (!once) {
  hubAgent.start()
  console.log('🟢 后台常驻心跳已启动（每 2.5 秒同步一次状态与远程指令）...')
  setInterval(() => {}, 60_000)
}
