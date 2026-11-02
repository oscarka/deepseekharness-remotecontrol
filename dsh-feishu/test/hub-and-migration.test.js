import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, rm, stat, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FeishuBridge } from '../lib/bridge.js'
import { resolveConfig } from '../lib/config.js'
import { HubAgent } from '../lib/hub-agent.js'
import { createSnapshotBuffer, inspectDshHome, restoreSnapshotBuffer, wipeDshHome } from '../lib/migration.js'
import { createHubServer } from '../../hub/server.js'
import { HubCore } from '../../hub/hub-core.js'

const APP_ID = 'cli_0123456789abcdef'
const USER = 'ou_user_1'
const CHAT = 'oc_chat_1'

function makeAgent(id = 'session-test-1111', title = '测试多机任务') {
  return {
    id,
    status: 'idle',
    session: {
      header: { cwd: '/Users/cc/workspace' },
      log: [{ type: 'session/title', time: Date.now(), data: { title } }],
      deriveMessages() {
        return this._messages ?? []
      },
    },
    followup({ content }) {
      const text = content?.[0]?.text ?? ''
      this.session._messages = [
        ...(this.session._messages ?? []),
        { role: 'user', content: [{ type: 'text', text }] },
        { role: 'assistant', content: [{ type: 'text', text: `reply:${text}` }] },
      ]
      this.status = 'running'
    },
    async whenIdle() {
      this.status = 'idle'
    },
    async cancel() {
      this.cancelled = true
      this.status = 'idle'
    },
  }
}

function makeMockTransport() {
  const sent = []
  const sentCards = []
  let cardSeq = 0
  return {
    connected: true,
    started: true,
    sent,
    sentCards,
    async start() {
      this.started = true
      this.connected = true
    },
    async stop() {
      this.started = false
      this.connected = false
    },
    async sendText(chatId, text) {
      sent.push({ chatId, text })
    },
    async sendCard(chatId, card) {
      const messageId = `card-${++cardSeq}`
      sentCards.push({ chatId, card, messageId })
      return { data: { message_id: messageId } }
    },
    async updateCard(messageId, card) {
      const existing = sentCards.find(item => item.messageId === messageId)
      if (existing) existing.card = card
      return { code: 0 }
    },
  }
}

test('migration: inspect, snapshot export, restore, and safe wipe work end-to-end', async () => {
  const srcDir = await mkdtemp(join(tmpdir(), 'dsh-mig-src-'))
  const dstDir = await mkdtemp(join(tmpdir(), 'dsh-mig-dst-'))
  try {
    await mkdir(join(srcDir, 'sessions'), { recursive: true })
    await writeFile(join(srcDir, 'sessions', 's1.json'), JSON.stringify({ id: 's1', messages: ['hello'] }))
    await writeFile(join(srcDir, 'sessions', 's2.json'), JSON.stringify({ id: 's2', messages: ['world'] }))
    await writeFile(join(srcDir, 'settings.json'), JSON.stringify({ theme: 'dark' }))
    await writeFile(join(srcDir, 'feishu.env'), 'FEISHU_APP_ID=cli_0123456789abcdef\n', { mode: 0o600 })

    const stats = await inspectDshHome(srcDir)
    assert.equal(stats.exists, true)
    assert.equal(stats.sessionCount, 2)
    assert.equal(stats.hasFeishuEnv, true)
    assert.ok(stats.totalBytes > 0)

    // Export without credentials by default
    const { buffer, meta } = await createSnapshotBuffer(srcDir, {
      hostId: 'mac-a',
      hostName: 'Mac-A',
      includeCredentials: false,
    })
    assert.equal(meta.sessionCount, 2)
    assert.ok(buffer.length > 0)

    // Restore into dstDir
    const restored = await restoreSnapshotBuffer(dstDir, buffer)
    assert.equal(restored.sessionCount, 2)
    assert.equal(restored.sourceHostName, 'Mac-A')
    const s1Text = await readFile(join(dstDir, 'sessions', 's1.json'), 'utf8')
    assert.match(s1Text, /hello/)

    // feishu.env was excluded because includeCredentials=false
    await assert.rejects(() => stat(join(dstDir, 'feishu.env')))

    // Soft wipe srcDir: removes sessions & settings.json, keeps feishu.env
    const wiped = await wipeDshHome(srcDir, { keepCredentials: true })
    assert.ok(wiped.wipedEntries >= 2)
    const afterStats = await inspectDshHome(srcDir)
    assert.equal(afterStats.sessionCount, 0)
    assert.equal(afterStats.hasFeishuEnv, true)
  } finally {
    await rm(srcDir, { recursive: true, force: true })
    await rm(dstDir, { recursive: true, force: true })
  }
})

test('hub & multi-host: active/standby Feishu switching, Web control commands, and one-click cross-host migration', async () => {
  const dirA = await mkdtemp(join(tmpdir(), 'dsh-host-a-'))
  const dirB = await mkdtemp(join(tmpdir(), 'dsh-host-b-'))

  const hub = new HubCore()
  const { fetchAdapter } = createHubServer({ hub, token: 'test-secret-token' })
  const hubUrl = 'https://dsh-hub.example.run.app'

  try {
    // 0. Check Web UI HTML & Auth protection
    const htmlRes = await fetchAdapter(`${hubUrl}/`)
    assert.equal(htmlRes.status, 200)
    const htmlText = await htmlRes.text()
    assert.match(htmlText, /飞书多机总控台/)

    const unauthRes = await fetchAdapter(`${hubUrl}/api/state`)
    assert.equal(unauthRes.status, 401)

    // Seed Host A ~/.dsh with session data
    await mkdir(join(dirA, 'sessions'), { recursive: true })
    await writeFile(join(dirA, 'sessions', 'sess-alpha.json'), JSON.stringify({ title: 'Alpha Session' }))
    await writeFile(join(dirA, 'settings.json'), JSON.stringify({ model: 'deepseek-chat' }))
    await writeFile(join(dirA, 'feishu.env'), 'FEISHU_APP_ID=cli_0123456789abcdef\n', { mode: 0o600 })

    const agentA = makeAgent('session-a-1', 'HostA视频任务')
    const transportA = makeMockTransport()
    const configA = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'mac-office',
      hostName: '办公Mac',
      hubUrl,
      hubToken: 'test-secret-token',
      dshHome: dirA,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridgeA = new FeishuBridge({
      config: configA,
      agents: { list: () => [agentA], get: id => (id === agentA.id ? agentA : undefined) },
      transport: transportA,
    })
    const hubAgentA = new HubAgent({
      config: configA,
      bridge: bridgeA,
      transport: transportA,
      fetchImpl: fetchAdapter,
    })
    bridgeA.setHubAgent(hubAgentA)

    const agentB = makeAgent('session-b-1', 'HostB渲染任务')
    const transportB = makeMockTransport()
    const configB = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'macbook-home',
      hostName: '家里MacBook',
      hubUrl,
      hubToken: 'test-secret-token',
      dshHome: dirB,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridgeB = new FeishuBridge({
      config: configB,
      agents: { list: () => [agentB], get: id => (id === agentB.id ? agentB : undefined) },
      transport: transportB,
    })
    const hubAgentB = new HubAgent({
      config: configB,
      bridge: bridgeB,
      transport: transportB,
      fetchImpl: fetchAdapter,
    })
    bridgeB.setHubAgent(hubAgentB)

    // 1. Host A heartbeats first -> becomes active Feishu host
    await hubAgentA.tick()
    assert.equal(hub.activeHostId, 'mac-office')
    assert.equal(bridgeA.feishuStandby, false)
    assert.equal(transportA.started, true)

    // 2. Host B heartbeats second -> automatically enters Feishu standby (preventing bot conflict!)
    await hubAgentB.tick()
    assert.equal(bridgeB.feishuStandby, true)
    assert.equal(transportB.started, false)

    // Refresh Host A's fleet summary
    await hubAgentA.tick()
    assert.equal(hubAgentA.getFleetSummary().length, 2)

    // 3. User sends !hosts in Feishu to Host A -> gets multi-host card with switch button
    await bridgeA.handleEvent({
      event_id: 'evt-hosts-1',
      app_id: APP_ID,
      sender: { sender_type: 'user', sender_id: { open_id: USER } },
      message: {
        message_id: 'msg-hosts-1',
        chat_id: CHAT,
        chat_type: 'p2p',
        message_type: 'text',
        content: JSON.stringify({ text: '!hosts' }),
      },
    })
    const hostsCard = transportA.sentCards.at(-1).card
    assert.match(JSON.stringify(hostsCard), /办公Mac/)
    assert.match(JSON.stringify(hostsCard), /家里MacBook/)
    assert.match(JSON.stringify(hostsCard), /switch_host/)

    // 4. Web UI sends a prompt command to Host A via Hub API
    const cmdRes = await fetchAdapter(`${hubUrl}/api/hosts/mac-office/command`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-secret-token',
      },
      body: JSON.stringify({ type: 'prompt', agentId: agentA.id, text: '从Web页面发出的指令' }),
    })
    assert.equal(cmdRes.status, 200)
    await hubAgentA.tick()
    await new Promise(resolve => setTimeout(resolve, 25))
    assert.equal(agentA.session._messages[0].content[0].text, '从Web页面发出的指令')

    // 5. Trigger One-Click Migration from Host A -> Host B with wipeSource=true & switchFeishu=true
    const migRes = await fetchAdapter(`${hubUrl}/api/migrate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-secret-token',
      },
      body: JSON.stringify({
        sourceHostId: 'mac-office',
        targetHostId: 'macbook-home',
        wipeSource: true,
        switchFeishu: true,
        includeCredentials: false,
      }),
    })
    const migData = await migRes.json()
    assert.equal(migData.ok, true)

    // Host A ticks: exports snapshot to Hub, which queues import on Host B + wipe on Host A + switches Feishu
    await hubAgentA.tick()
    // Next tick on Host A executes the queued wipe_host and transitions Host A to Feishu standby
    await hubAgentA.tick()
    // Host B ticks: downloads & restores snapshot into dirB, and activates its Feishu connection!
    await hubAgentB.tick()
    // Report final command results back to Hub
    await hubAgentB.tick()

    const stateRes = await fetchAdapter(`${hubUrl}/api/state`, {
      headers: { authorization: 'Bearer test-secret-token' },
    })
    const state = await stateRes.json()
    assert.equal(state.activeHostId, 'macbook-home')
    assert.equal(state.migrations[0].status, 'completed')

    // Verify Host B now has the migrated session file and active Feishu connection
    const restoredSession = await readFile(join(dirB, 'sessions', 'sess-alpha.json'), 'utf8')
    assert.match(restoredSession, /Alpha Session/)
    assert.equal(bridgeB.feishuStandby, false)
    assert.equal(transportB.started, true)

    // Verify Host A was wiped (sessions removed, feishu.env preserved) and is now in Feishu standby
    const statsAAfter = await inspectDshHome(dirA)
    assert.equal(statsAAfter.sessionCount, 0)
    assert.equal(statsAAfter.hasFeishuEnv, true)
    assert.equal(bridgeA.feishuStandby, true)
    assert.equal(transportA.started, false)

    // 6. Test switching back from Host B to Host A via Feishu card action (`switch_host`)
    const switchToast = await bridgeB.handleCardAction({
      messageId: 'card-switch-1',
      chatId: CHAT,
      operator: { openId: USER },
      action: { value: { action: 'switch_host', hostId: 'mac-office' }, tag: 'button' },
    })
    assert.match(switchToast.toast.content, /已切换飞书控制到 mac-office/)
    await hubAgentB.tick()
    await hubAgentA.tick()
    assert.equal(hub.activeHostId, 'mac-office')
    assert.equal(bridgeA.feishuStandby, false)
    assert.equal(bridgeB.feishuStandby, true)

    await bridgeA.dispose()
    await bridgeB.dispose()
  } finally {
    await rm(dirA, { recursive: true, force: true })
    await rm(dirB, { recursive: true, force: true })
  }
})
