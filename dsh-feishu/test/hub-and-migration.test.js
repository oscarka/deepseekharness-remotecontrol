import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readdir, rm, stat, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FeishuBridge } from '../lib/bridge.js'
import { resolveConfig } from '../lib/config.js'
import { HubAgent } from '../lib/hub-agent.js'
import { acquireDaemonLock } from '../lib/daemon-lock.js'
import { HarnessRouter } from '../lib/harness-router.js'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { ClaudeAdapter } from '../lib/harnesses/claude-adapter.js'
import { CodexAdapter, CodexAppServerClient, discoverCodexModels } from '../lib/harnesses/codex-adapter.js'
import {
  discoverWorkBuddyModels,
  parseWorkBuddyReplayEvents,
  queryWorkBuddySidecar,
  WorkBuddyAcpClient,
  WorkBuddyAdapter,
} from '../lib/harnesses/workbuddy-adapter.js'
import { applyStateHysteresis, executeAntigravityIdeAction, loadAntigravityIdeSessions, parseAntigravityTranscript } from '../lib/antigravity-ide.js'
import { checkAccessibilityPermission, fastScanBrainDirs, getTurboNativeBinaryPath } from '../../dsh-turbo/index.js'
import { createSnapshotBuffer, inspectDshHome, restoreSnapshotBuffer, wipeDshHome } from '../lib/migration.js'
import { createHubServer } from '../../hub/server.js'
import { HubCore } from '../../hub/hub-core.js'
import {
  parseHttpByteRange,
  parseImageDimensions,
  readWorkspaceFileFastMeta,
  readWorkspaceFileStreamChunk,
} from '../lib/workspace-ops.js'

for (const k of ['ANTIGRAVITY_LS_ADDRESS', 'ANTIGRAVITY_CSRF_TOKEN', 'FEISHU_DSH_HOME', 'DSH_HOME']) {
  delete process.env[k]
}

const APP_ID = 'cli_0123456789abcdef'
const USER = 'ou_user_1'
const CHAT = 'oc_chat_1'

function makeAgent(id = 'session-test-1111', title = '测试多机任务') {
  return {
    id,
    status: 'idle',
    session: {
      header: { cwd: '/Users/dev/workspace' },
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
    assert.match(htmlText, /DeepSeek Harness 自托管全功能总控台/)

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

test('reverse-engineered server features: Ed25519 identity pinning/revocation, QR pairing, WebRTC/TURN signaling, remote new/steer/rename/delete, workspace file browser, and E2EE encrypted share replay', async () => {
  const { createDecipheriv } = await import('node:crypto')
  const dshDir = await mkdtemp(join(tmpdir(), 'dsh-re-home-'))
  const wsDir = await mkdtemp(join(tmpdir(), 'dsh-re-ws-'))
  const outsideDir = await mkdtemp(join(tmpdir(), 'dsh-re-outside-'))

  const hub = new HubCore()
  const { fetchAdapter } = createHubServer({ hub, token: 'super-secret-hub-token' })
  const hubUrl = 'https://selfhosted-hub.example.com'
  const authHeaders = {
    'content-type': 'application/json',
    authorization: 'Bearer super-secret-hub-token',
  }

  try {
    // Prepare workspace files
    await mkdir(join(wsDir, 'src'), { recursive: true })
    await writeFile(join(wsDir, 'src', 'app.js'), 'const apiKey = "sk-1234567890abcdef";\nconsole.log("hello world");\n')
    await writeFile(join(outsideDir, 'secret.txt'), 'TOP_SECRET_OUTSIDE')

    const liveList = []
    const agent1 = makeAgent('session-re-1001', '初始重构任务')
    agent1.session.header.cwd = wsDir
    agent1.session._messages = [
      { role: 'user', content: [{ type: 'text', text: '帮我重构登录模块' }] },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '先检查 auth.js 的依赖关系' },
          { type: 'tool_use', name: 'read_file', input: { path: 'src/app.js' } },
          { type: 'text', text: '登录模块重构完成，已提取通用鉴权中间件。' },
        ],
      },
    ]
    liveList.push(agent1)

    const agentsRegistry = {
      list: () => liveList,
      get: id => liveList.find(a => a.id === id),
      create({ cwd, title } = {}) {
        const created = makeAgent(`session-created-${liveList.length + 1}`, title || '新建会话')
        created.session.header.cwd = cwd || wsDir
        liveList.push(created)
        return created
      },
      delete(id) {
        const idx = liveList.findIndex(a => a.id === id)
        if (idx >= 0) liveList.splice(idx, 1)
      },
    }

    const transport = makeMockTransport()
    const config = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'studio-workstation',
      hostName: 'MacStudio工作站',
      hubUrl,
      hubToken: 'super-secret-hub-token',
      dshHome: dshDir,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridge = new FeishuBridge({ config, agents: agentsRegistry, transport })
    const hubAgent = new HubAgent({ config, bridge, transport, fetchImpl: fetchAdapter })
    bridge.setHubAgent(hubAgent)

    // 1. First heartbeat auto-creates Ed25519 identity and pins fingerprint on Hub
    await hubAgent.tick()
    const state1 = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const hostInfo = state1.hosts[0]
    assert.equal(hostInfo.hostId, 'studio-workstation')
    assert.equal(hostInfo.trustStatus, 'pinned')
    assert.match(hostInfo.fingerprint, /^[0-9A-F]{4} [0-9A-F]{4} [0-9A-F]{4}$/)
    assert.equal(hostInfo.bridgeState.tasks[0].transcript.length, 2)
    assert.equal(hostInfo.bridgeState.tasks[0].transcript[1].tools[0].name, 'read_file')

    // 2. Spoofed publicKey is rejected with PEER_IDENTITY_MISMATCH (403)
    const spoofRes = await fetchAdapter(`${hubUrl}/api/heartbeat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        hostId: 'studio-workstation',
        hostName: 'SpoofedHost',
        identity: { publicKey: 'FAKE_PUBLIC_KEY', fingerprint: '0000 0000 0000' },
      }),
    })
    assert.equal(spoofRes.status, 403)
    const spoofJson = await spoofRes.json()
    assert.equal(spoofJson.code, 'PEER_IDENTITY_MISMATCH')

    // 3. Revoke device & restore device trust
    const revokeRes = await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/trust`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'revoke' }),
    })
    assert.equal(revokeRes.status, 200)
    const blockedHb = await fetchAdapter(`${hubUrl}/api/heartbeat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        hostId: 'studio-workstation',
        identity: hubAgent.identity,
      }),
    })
    assert.equal(blockedHb.status, 403)
    assert.equal((await blockedHb.json()).code, 'DEVICE_REVOKED')

    // Restore trust and re-pin
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/trust`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'reset_pin' }),
    })
    await hubAgent.tick()
    assert.equal(hub.hosts.get('studio-workstation').trust.status, 'pinned')

    // 4. One-Time 6-Digit Pairing Code / QR Sign-in
    const pairCreateRes = await fetchAdapter(`${hubUrl}/api/pairing/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ hostId: 'studio-workstation' }),
    })
    const { pairing } = await pairCreateRes.json()
    assert.equal(pairing.code.length, 6)

    // Exchange without auth header succeeds once and returns token
    const pairEx1 = await fetchAdapter(`${hubUrl}/api/pairing/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: pairing.code }),
    })
    assert.equal(pairEx1.status, 200)
    const pairExData = await pairEx1.json()
    assert.equal(pairExData.ok, true)
    assert.equal(pairExData.token, 'super-secret-hub-token')

    // Replaying the same one-time code is rejected
    const pairEx2 = await fetchAdapter(`${hubUrl}/api/pairing/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: pairing.code }),
    })
    assert.equal(pairEx2.status, 401)

    // 5. Self-Hosted WebRTC Signaling & TURN Credentials
    const turnRes = await fetchAdapter(`${hubUrl}/api/v1/turn/credentials`, {
      method: 'GET',
      headers: authHeaders,
    })
    const turnData = await turnRes.json()
    assert.equal(turnData.ok, true)
    assert.ok(turnData.username.endsWith(':dsh-peer'))
    assert.ok(turnData.credential.length > 5)

    await fetchAdapter(`${hubUrl}/api/v1/signaling`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        targetId: 'studio-workstation',
        fromId: 'mobile-web',
        type: 'signal.offer',
        payload: { sdp: 'v=0...' },
      }),
    })
    const sigPull = await (
      await fetchAdapter(`${hubUrl}/api/v1/signaling/studio-workstation`, { headers: authHeaders })
    ).json()
    assert.equal(sigPull.messages.length, 1)
    assert.equal(sigPull.messages[0].type, 'signal.offer')

    // 6. Remote Session Creation (new_session), Mid-Run Steer (steer), Rename & Delete
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'new_session',
        cwd: wsDir,
        title: '远程新建的测试会话',
        prompt: '初始化项目结构',
      }),
    })
    await hubAgent.tick()
    await new Promise(resolve => setTimeout(resolve, 25))
    assert.equal(liveList.length, 2)
    const createdAgent = liveList[1]
    assert.equal(createdAgent.session._messages[0].content[0].text, '初始化项目结构')

    // Mid-run Steer queueing when agent is running
    let resolveIdle
    agent1.status = 'running'
    agent1.whenIdle = () =>
      new Promise(r => {
        resolveIdle = r
      })
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'steer',
        agentId: agent1.id,
        text: '顺便把单元测试也加上',
        interrupt: false,
      }),
    })
    await hubAgent.tick()
    assert.deepEqual(bridge.steerQueues.get(agent1.id), ['顺便把单元测试也加上'])

    // When agent1 transitions from running -> idle, queued steer is automatically drained!
    agent1.whenIdle = async () => {
      agent1.status = 'idle'
    }
    if (resolveIdle) resolveIdle()
    agent1.status = 'idle'
    bridge.drainSteerQueue(agent1)
    await new Promise(resolve => setTimeout(resolve, 25))
    assert.equal(agent1.session._messages.at(-2).content[0].text, '顺便把单元测试也加上')

    // Rename session
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'rename_session',
        agentId: agent1.id,
        title: '已重命名的核心任务',
      }),
    })
    await hubAgent.tick()
    assert.equal(bridge.taskTitle(agent1), '已重命名的核心任务')

    // 7. Remote Workspace File Explorer + Path Traversal Protection + Secret Redaction
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'list_files',
        agentId: agent1.id,
        cwd: wsDir,
        subDir: 'src',
      }),
    })
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'read_file',
        agentId: agent1.id,
        cwd: wsDir,
        relPath: 'src/app.js',
      }),
    })
    // Also attempt path traversal outside workspace root
    const traversalCmd = await (
      await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'read_file',
          agentId: agent1.id,
          cwd: wsDir,
          relPath: '../secret.txt',
        }),
      })
    ).json()
    await hubAgent.tick()
    await hubAgent.tick() // push commandResults to Hub

    const stateAfterFs = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const hostAfterFs = stateAfterFs.hosts[0]
    assert.equal(hostAfterFs.lastFsListing.entries[0].name, 'app.js')
    // Verify secret sk-... inside src/app.js was automatically redacted!
    assert.match(hostAfterFs.lastFilePreview.content, /\[REDACTED\]/)
    assert.ok(!hostAfterFs.lastFilePreview.content.includes('sk-1234567890abcdef'))
    assert.match(hostAfterFs.lastFilePreview.content, /hello world/)

    // Verify path traversal was blocked
    const traversalResult = await (
      await fetchAdapter(`${hubUrl}/api/commands/${traversalCmd.command.id}`, { headers: authHeaders })
    ).json()
    assert.equal(traversalResult.result.ok, false)
    assert.match(traversalResult.result.error, /越界访问/)

    // 8. End-to-End Encrypted (AES-256-GCM) Conversation Share & Replay (replaces go.dshtui.com)
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'share_session',
        agentId: agent1.id,
      }),
    })
    await hubAgent.tick()
    await hubAgent.tick()

    const stateAfterShare = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const shareMeta = stateAfterShare.shares[0]
    assert.ok(shareMeta.id.startsWith('shr-'))
    const shareUrl = stateAfterShare.hosts[0].lastShareResult.shareUrl
    assert.match(shareUrl, /\/share\/shr-.*#k=/)

    // Verify replay HTML page is served publicly without HUB_TOKEN
    const replayPageRes = await fetchAdapter(`${hubUrl}/share/${shareMeta.id}`)
    assert.equal(replayPageRes.status, 200)
    assert.match(await replayPageRes.text(), /AES-256-GCM 端到端加密回放/)

    // Verify public encrypted blob contains ONLY ciphertext + IV, and decrypts cleanly with #k= key
    const publicBlobRes = await (await fetchAdapter(`${hubUrl}/api/shares/${shareMeta.id}/public`)).json()
    const keyBase64Url = shareUrl.split('#k=')[1]
    const keyBuf = Buffer.from(keyBase64Url, 'base64url')
    const ivBuf = Buffer.from(publicBlobRes.share.ivBase64, 'base64')
    const combinedBuf = Buffer.from(publicBlobRes.share.ciphertextBase64, 'base64')
    const ciphertext = combinedBuf.subarray(0, combinedBuf.length - 16)
    const authTag = combinedBuf.subarray(combinedBuf.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', keyBuf, ivBuf)
    decipher.setAuthTag(authTag)
    const decryptedJson = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    const decryptedPayload = JSON.parse(decryptedJson)
    assert.equal(decryptedPayload.title, '已重命名的核心任务')
    assert.ok(decryptedPayload.transcript.some(m => m.text.includes('登录模块重构完成')))

    // 9. Delete session remotely
    await fetchAdapter(`${hubUrl}/api/hosts/studio-workstation/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'delete_session',
        agentId: createdAgent.id,
      }),
    })
    await hubAgent.tick()
    assert.equal(liveList.length, 1)

    await bridge.dispose()
  } finally {
    await rm(dshDir, { recursive: true, force: true })
    await rm(wsDir, { recursive: true, force: true })
    await rm(outsideDir, { recursive: true, force: true })
  }
})

test('iPhone Home Screen PWA & W3C Web Push (RFC 8292 VAPID + RFC 8291 aes128gcm): manifest, service worker, encrypted push delivery, and automatic approval/completion lock-screen alerts', async () => {
  const { createECDH, randomBytes } = await import('node:crypto')
  const {
    createVapidHeaders,
    decryptWebPushPayload,
    generateOrLoadVapidKeys,
    verifyVapidJwt,
  } = await import('../../hub/web-push.js')

  // Capture all outgoing Web Push requests sent to Apple APNs (web.push.apple.com)
  const interceptedPushes = []
  const mockApplePushFetch = async (url, init) => {
    interceptedPushes.push({ url, init })
    return { status: 201, ok: true }
  }

  const hub = new HubCore({ pushFetch: mockApplePushFetch })
  const { fetchAdapter } = createHubServer({ hub, token: 'pwa-secret-token' })
  const hubUrl = 'https://dsh-pwa.example.run.app'
  const authHeaders = {
    'content-type': 'application/json',
    authorization: 'Bearer pwa-secret-token',
  }

  // 1. Verify PWA Manifest, Icon, and Service Worker endpoints
  const manifestRes = await fetchAdapter(`${hubUrl}/manifest.json`)
  assert.equal(manifestRes.status, 200)
  const manifest = await manifestRes.json()
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.short_name, 'DSH 远控')

  const iconRes = await fetchAdapter(`${hubUrl}/apple-touch-icon.png`)
  assert.equal(iconRes.status, 200)
  assert.match(await iconRes.text(), /<svg/)

  const swRes = await fetchAdapter(`${hubUrl}/sw.js`)
  assert.equal(swRes.status, 200)
  const swText = await swRes.text()
  assert.match(swText, /showNotification/)
  assert.match(swText, /setAppBadge/)
  assert.match(swText, /NOTIFICATION_CLICK/)

  // 2. Verify deterministic VAPID ES256 key derivation & Apple-compatible JWT `sub` claim (never `.local`)
  const vapidKeys = generateOrLoadVapidKeys(null, { seed: 'test-seed-1' })
  const vapidKeysColdRestart = generateOrLoadVapidKeys(null, { seed: 'test-seed-1' })
  assert.equal(vapidKeys.publicKey, vapidKeysColdRestart.publicKey)
  const { authorization, jwt } = createVapidHeaders('https://web.push.apple.com/Q1abc123', vapidKeys)
  assert.match(authorization, /^vapid t=.*, k=/)
  const verifiedPayload = verifyVapidJwt(jwt, vapidKeys)
  assert.equal(verifiedPayload.aud, 'https://web.push.apple.com')
  assert.equal(verifiedPayload.sub, 'mailto:admin@dshtui.com')
  assert.doesNotMatch(verifiedPayload.sub, /\.local$/i)

  // 3. Simulate iPhone Safari subscribing to Web Push via /api/push/subscribe
  const vapidPubRes = await (await fetchAdapter(`${hubUrl}/api/push/vapid-public-key`, { headers: authHeaders })).json()
  assert.equal(vapidPubRes.ok, true)
  assert.equal(vapidPubRes.publicKey, hub.getVapidPublicKey())

  const iphoneEcdh = createECDH('prime256v1')
  iphoneEcdh.generateKeys()
  const iphoneAuthSecret = randomBytes(16)
  const iphoneSubscription = {
    endpoint: 'https://web.push.apple.com/QDshIphoneLockScreenEndpoint001',
    keys: {
      p256dh: iphoneEcdh.getPublicKey().toString('base64url'),
      auth: iphoneAuthSecret.toString('base64url'),
    },
  }

  const subRes = await (
    await fetchAdapter(`${hubUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        subscription: iphoneSubscription,
        deviceName: 'Oscar 的 iPhone 16 Pro',
      }),
    })
  ).json()
  assert.equal(subRes.ok, true)
  assert.equal(subRes.subscription.endpointHost, 'web.push.apple.com')

  // 4. Test manual lock-screen push (/api/push/test) & decrypt RFC 8291 aes128gcm binary payload on simulated iPhone
  const testPushRes = await (
    await fetchAdapter(`${hubUrl}/api/push/test`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: '🔔 iPhone 桌面锁屏测试',
        body: '这是一条端到端加密的 Web Push 锁屏通知',
      }),
    })
  ).json()
  assert.equal(testPushRes.ok, true)
  assert.equal(testPushRes.sentCount, 1)
  assert.equal(interceptedPushes.length, 1)

  const sentReq = interceptedPushes[0]
  assert.equal(sentReq.url, iphoneSubscription.endpoint)
  assert.equal(sentReq.init.headers['content-encoding'], 'aes128gcm')
  assert.match(sentReq.init.headers.authorization, /^vapid t=/)

  const decryptedTestStr = decryptWebPushPayload(sentReq.init.body, iphoneEcdh, iphoneAuthSecret)
  const decryptedTestObj = JSON.parse(decryptedTestStr)
  assert.equal(decryptedTestObj.title, '🔔 iPhone 桌面锁屏测试')
  assert.equal(decryptedTestObj.body, '这是一条端到端加密的 Web Push 锁屏通知')

  // 5. Verify automatic lock-screen Web Push on Pending Approval & Task Completion
  // Step 5a: Host reports a running task and a pending tool approval
  await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'mac-pro',
      hostName: '办公MacPro',
      bridgeState: {
        runningCount: 1,
        taskCount: 1,
        tasks: [{ id: 'session-push-1', title: '部署生产环境', status: 'running', lastOutput: '正在构建镜像...' }],
        approvals: [
          {
            code: 'APV999',
            agentId: 'session-push-1',
            title: '部署生产环境',
            toolName: 'bash',
            reason: '执行 ./deploy-cloudrun.sh',
          },
        ],
      },
    }),
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(interceptedPushes.length, 2)
  const approvalPush = JSON.parse(decryptWebPushPayload(interceptedPushes[1].init.body, iphoneEcdh, iphoneAuthSecret))
  assert.match(approvalPush.title, /⏳ \[办公MacPro\] 待审批/)
  assert.match(approvalPush.body, /deploy-cloudrun\.sh/)
  assert.equal(approvalPush.data.code, 'APV999')

  // Step 5b: Task transitions from running -> idle (completed) -> triggers automatic completion Web Push!
  await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'mac-pro',
      hostName: '办公MacPro',
      bridgeState: {
        runningCount: 0,
        taskCount: 1,
        tasks: [{ id: 'session-push-1', title: '部署生产环境', status: 'idle', lastOutput: '部署成功，服务已上线！' }],
        approvals: [],
      },
    }),
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(interceptedPushes.length, 3)
  const donePush = JSON.parse(decryptWebPushPayload(interceptedPushes[2].init.body, iphoneEcdh, iphoneAuthSecret))
  assert.match(donePush.title, /✅ \[办公MacPro\] 任务完成：部署生产环境/)
  assert.match(donePush.body, /部署成功，服务已上线/)

  // 6. Verify SSE /api/events endpoint
  const sseRes = await fetchAdapter(`${hubUrl}/api/events`, { headers: authHeaders })
  assert.equal(sseRes.status, 200)
  assert.match(await sseRes.text(), /^event: state\ndata: /)
})

test('antigravity-ide integration: transcript parsing, pending approval detection, and remote control actions', async () => {
  const tmpDsh = await mkdtemp(join(tmpdir(), 'dsh-agy-home-'))
  const tmpBrain = await mkdtemp(join(tmpdir(), 'dsh-agy-brain-'))
  const tmpWorkspace = await mkdtemp(join(tmpdir(), 'dsh-agy-ws-'))

  try {
    await writeFile(join(tmpWorkspace, 'README.md'), '# Antigravity IDE Demo Project\nHello from workspace.\n')

    const convId = 'fcba452e-076a-4750-998f-0c357e11b7ad'
    const convLogsDir = join(tmpBrain, convId, '.system_generated', 'logs')
    await mkdir(convLogsDir, { recursive: true })

    const nowIso = new Date().toISOString()
    const transcriptLines = [
      JSON.stringify({
        step_index: 1,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: nowIso,
        content: `<USER_REQUEST>\n帮我检查 @[${tmpWorkspace}/README.md] 并运行部署脚本\n</USER_REQUEST>`,
      }),
      JSON.stringify({
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: nowIso,
        thinking: '先读取 README.md 了解项目结构。',
        content: '正在读取项目说明文档...',
        tool_calls: [
          { id: 'tc-silent', name: 'task_boundary', arguments: JSON.stringify({ TaskName: 'Init' }) },
          { id: 'tc-read', name: 'view_file', arguments: JSON.stringify({ AbsolutePath: join(tmpWorkspace, 'README.md') }) },
        ],
      }),
      JSON.stringify({
        step_index: 4,
        type: 'CHECKPOINT',
        status: 'DONE',
        created_at: nowIso,
        user_objective: '检查 README 并执行部署脚本验证',
      }),
      JSON.stringify({
        step_index: 5,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: nowIso,
        thinking: '需要执行宿主机部署命令，请求用户批准 BypassSandbox。',
        content: '请批准执行部署脚本：',
        tool_calls: [
          {
            id: 'tc-cmd',
            name: 'run_command',
            arguments: JSON.stringify({
              CommandLine: './deploy-prod.sh --check',
              Cwd: tmpWorkspace,
              BypassSandbox: true,
              toolSummary: 'Execute production check script',
            }),
          },
        ],
      }),
    ]
    await writeFile(join(convLogsDir, 'transcript.jsonl'), transcriptLines.join('\n') + '\n', 'utf8')

    // 1. Direct unit test of parseAntigravityTranscript
    const parsed = parseAntigravityTranscript(transcriptLines.join('\n'), {
      conversationId: convId,
      mtimeMs: Date.now(),
      now: Date.now(),
    })
    assert.ok(parsed)
    assert.equal(parsed.id, `agy-ide:${convId}`)
    assert.equal(parsed.harness, 'antigravity-ide')
    assert.equal(parsed.title, '检查 README 并执行部署脚本验证')
    assert.equal(parsed.cwd, tmpWorkspace)
    assert.equal(parsed.status, 'approval')
    assert.ok(parsed.pendingApproval)
    assert.equal(parsed.pendingApproval.code, 'AGY-FCBA45-5')
    assert.equal(parsed.pendingApproval.promptTitle, 'Allow execute production check script?')
    assert.equal(parsed.pendingApproval.subtitle, 'the auto-run safety check did not reach a decision')
    assert.equal(parsed.pendingApproval.options.length, 4)
    assert.equal(parsed.pendingApproval.options[0].label, 'Yes, allow this time')
    assert.match(parsed.pendingApproval.reason, /deploy-prod\.sh/)

    // Verify silent tools (task_boundary) were filtered while view_file and run_command remain
    const assistantMsgs = parsed.transcript.filter(m => m.role === 'assistant')
    assert.equal(assistantMsgs.length, 2)
    assert.equal(assistantMsgs[0].tools.length, 1)
    assert.equal(assistantMsgs[0].tools[0].name, 'view_file')
    assert.equal(assistantMsgs[0].thinking, '先读取 README.md 了解项目结构。')

    // 2. If real historical conversation fcba452e-076a-4750-998f-0c357e11b7ad exists on disk, verify it parses cleanly too
    const realHistPath = '/Users/dev/.gemini/antigravity-ide/brain/fcba452e-076a-4750-998f-0c357e11b7ad/.system_generated/logs/transcript.jsonl'
    try {
      const realRaw = await readFile(realHistPath, 'utf8')
      const realParsed = parseAntigravityTranscript(realRaw, {
        conversationId: convId,
        mtimeMs: Date.now() - 86400_000,
      })
      assert.ok(realParsed)
      assert.equal(realParsed.id, `agy-ide:${convId}`)
      assert.ok(realParsed.transcript.length >= 2)
      assert.match(realParsed.cwd, /google-skills|Users\/cc/)
    } catch {
      // Skip if not running on cc's machine
    }

    // 3. Test HubAgent + HubCore integration with Antigravity IDE sessions & remote control commands
    const hub = new HubCore()
    const { fetchAdapter } = createHubServer({ hub, token: 'agy-secret' })
    const hubUrl = 'https://dsh-hub.example.run.app'
    const authHeaders = {
      'content-type': 'application/json',
      authorization: 'Bearer agy-secret',
    }

    const executedCalls = []
    const mockExec = async (bin, args) => {
      executedCalls.push({ bin, args })
      return { stdout: 'ok\n', stderr: '' }
    }

    const dshAgent = makeAgent('dsh-sess-1', 'DSH原生任务')
    const transport = makeMockTransport()
    const config = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'cc-mac',
      hostName: 'cc 的 Mac',
      hubUrl,
      hubToken: 'agy-secret',
      dshHome: tmpDsh,
      antigravityBrainDirs: [tmpBrain],
      enableAntigravityIde: true,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridge = new FeishuBridge({
      config,
      agents: { list: () => [dshAgent], get: id => (id === dshAgent.id ? dshAgent : undefined) },
      transport,
    })
    const hubAgent = new HubAgent({
      config,
      bridge,
      transport,
      fetchImpl: fetchAdapter,
      execImpl: mockExec,
    })
    bridge.setHubAgent(hubAgent)

    // Initial tick syncs both DSH and Antigravity IDE sessions + pending approval
    await hubAgent.tick()

    let state = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const hostState = state.hosts.find(h => h.hostId === 'cc-mac')
    assert.ok(hostState)
    assert.equal(hostState.bridgeState.tasks.length, 2)
    const agyTask = hostState.bridgeState.tasks.find(t => t.id === `agy-ide:${convId}`)
    assert.ok(agyTask)
    assert.equal(agyTask.harness, 'antigravity-ide')
    assert.equal(agyTask.status, 'approval')
    assert.equal(hostState.bridgeState.approvals.length, 1)
    assert.equal(hostState.bridgeState.approvals[0].code, 'AGY-FCBA45-5')

    // 3a. Remote approve command for Antigravity IDE pending approval
    await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ type: 'approve', code: 'AGY-FCBA45-5' }),
    })
    await hubAgent.tick()
    await hubAgent.tick()

    assert.ok(executedCalls.some(c => c.bin === 'osascript'))
    state = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const hostAfterApprove = state.hosts.find(h => h.hostId === 'cc-mac')
    assert.equal(hostAfterApprove.bridgeState.approvals.length, 0)

    // 3b. Remote prompt command to Antigravity IDE session
    await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'prompt',
        agentId: `agy-ide:${convId}`,
        text: '请继续检查日志并汇报结果',
      }),
    })
    await hubAgent.tick()
    await hubAgent.tick()
    assert.ok(
      executedCalls.some(
        c =>
          (c.args && c.args.includes('send-message') && c.args.includes(convId)) ||
          c.bin === 'pbcopy' ||
          c.bin === 'osascript',
      ),
    )

    // 3c. Rename Antigravity IDE session
    await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'rename_session',
        agentId: `agy-ide:${convId}`,
        title: 'Antigravity IDE 生产部署核查',
      }),
    })
    await hubAgent.tick()
    await hubAgent.tick()

    state = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    const renamedTask = state.hosts
      .find(h => h.hostId === 'cc-mac')
      .bridgeState.tasks.find(t => t.id === `agy-ide:${convId}`)
    assert.equal(renamedTask.title, 'Antigravity IDE 生产部署核查')

    // 3d. Create E2EE Share Snapshot for Antigravity IDE session
    const shareDispatch = await (
      await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'share_session',
          agentId: `agy-ide:${convId}`,
        }),
      })
    ).json()
    await hubAgent.tick()
    await hubAgent.tick()

    state = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
    assert.equal(state.shares.length, 1)
    assert.ok(state.shares[0].id.startsWith('shr-'))
    const shareCmdRes = await (
      await fetchAdapter(`${hubUrl}/api/commands/${shareDispatch.command.id}`, { headers: authHeaders })
    ).json()
    assert.equal(shareCmdRes.result.ok, true)
    assert.ok(shareCmdRes.result.shareUrl.includes('#k='))

    // 3e. List files in Antigravity IDE session's workspace
    const listDispatch = await (
      await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'list_files',
          agentId: `agy-ide:${convId}`,
        }),
      })
    ).json()
    await hubAgent.tick()
    await hubAgent.tick()

    const listCmdRes = await (
      await fetchAdapter(`${hubUrl}/api/commands/${listDispatch.command.id}`, { headers: authHeaders })
    ).json()
    assert.equal(listCmdRes.result.ok, true)
    assert.ok(listCmdRes.result.entries.some(e => e.name === 'README.md'))

    // 4. Verify dsh-turbo Rust native accelerator, telemetry reporting, and remote permission/upgrade commands
    if (process.platform === 'darwin') {
      const nativeBin = getTurboNativeBinaryPath()
      assert.ok(nativeBin.endsWith('dsh-turbo-native'))
      const scanRes = await fastScanBrainDirs([tmpBrain])
      assert.ok(scanRes?.ok)
      assert.equal(scanRes.engine, 'rust-native')
      assert.equal(scanRes.items.length, 1)
      assert.equal(scanRes.items[0].convId, convId)

      const axRes = await checkAccessibilityPermission({ prompt: false })
      assert.equal(axRes.ok, true)
      assert.equal(typeof axRes.trusted, 'boolean')
    }

    assert.equal(hostState.bridgeState.turbo.enabled, true)

    const axDispatch = await (
      await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ type: 'request_ax_permission' }),
      })
    ).json()
    await hubAgent.tick()
    await hubAgent.tick()
    const axCmdRes = await (
      await fetchAdapter(`${hubUrl}/api/commands/${axDispatch.command.id}`, { headers: authHeaders })
    ).json()
    assert.equal(axCmdRes.result.ok, true)
    assert.equal(axCmdRes.result.prompted, true)

    const upgDispatch = await (
      await fetchAdapter(`${hubUrl}/api/hosts/cc-mac/command`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ type: 'upgrade_turbo' }),
      })
    ).json()
    await hubAgent.tick()
    await hubAgent.tick()
    const upgCmdRes = await (
      await fetchAdapter(`${hubUrl}/api/commands/${upgDispatch.command.id}`, { headers: authHeaders })
    ).json()
    assert.equal(upgCmdRes.result.ok, true)
  } finally {
    await rm(tmpDsh, { recursive: true, force: true })
    await rm(tmpBrain, { recursive: true, force: true })
    await rm(tmpWorkspace, { recursive: true, force: true })
  }
})

test('remote mode: Web UI remote_mode / remote_toggle both switch Feishu notifications', async () => {
  const tmpDsh = await mkdtemp(join(tmpdir(), 'dsh-remote-mode-'))
  try {
    const agent = makeAgent('session-remote-mode-1', '远程通知测试')
    const transport = makeMockTransport()
    const config = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'remote-mode-host',
      hostName: '远程通知机',
      hubUrl: 'https://dsh-hub.example.run.app',
      hubToken: 'remote-mode-token',
      dshHome: tmpDsh,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridge = new FeishuBridge({
      config,
      agents: { list: () => [agent], get: id => (id === agent.id ? agent : undefined) },
      transport,
    })
    const hubAgent = new HubAgent({
      config,
      bridge,
      transport,
      fetchImpl: async () => new Response('{}', { status: 500 }),
    })
    bridge.setHubAgent(hubAgent)

    // 当前 Web UI 使用的叫法
    const on = await hubAgent.handleHubCommand({ type: 'remote_mode', active: true })
    assert.equal(on.ok, true)
    assert.equal(on.remoteActive, true)
    assert.equal(bridge.getSnapshotState().remoteActive, true)

    // 兼容旧版 Web UI 的 remote_toggle/enable 叫法
    const off = await hubAgent.handleHubCommand({ type: 'remote_toggle', enable: false })
    assert.equal(off.ok, true)
    assert.equal(off.remoteActive, false)
    assert.equal(bridge.getSnapshotState().remoteActive, false)
  } finally {
    await rm(tmpDsh, { recursive: true, force: true })
  }
})

test('antigravity-ide turnState: distinguishes running thinking/tool steps from final conclusion and interrupted states', () => {
  const convId = '11223344-5566-7788-99aa-bbccddeeff00'
  const t0 = Date.now() - 5000
  const baseUserStep = JSON.stringify({
    step_index: 1,
    type: 'USER_INPUT',
    status: 'DONE',
    created_at: new Date(t0).toISOString(),
    content: '<USER_REQUEST>\n检查状态机逻辑\n</USER_REQUEST>',
  })
  const toolStep = JSON.stringify({
    step_index: 2,
    type: 'PLANNER_RESPONSE',
    status: 'DONE',
    created_at: new Date(t0 + 1000).toISOString(),
    thinking: '正在读取文件分析中...',
    tool_calls: [{ id: 'tc-1', name: 'read_file', arguments: '{"Path":"/Users/dev/app/index.js"}' }],
  })
  const genericStep = JSON.stringify({
    step_index: 3,
    type: 'GENERIC',
    status: 'DONE',
    created_at: new Date(t0 + 2000).toISOString(),
    content: 'Showing lines 1-50',
  })

  // 1. Mid-turn (after GENERIC tool output while AI thinks about next step) -> running, no conclusion yet
  const midTurnParsed = parseAntigravityTranscript([baseUserStep, toolStep, genericStep].join('\n'), {
    conversationId: convId,
    mtimeMs: t0 + 2000,
    now: t0 + 3000,
  })
  assert.equal(midTurnParsed.status, 'running')
  assert.equal(midTurnParsed.turnState, 'running')
  assert.equal(midTurnParsed.isMidTurn, true)
  assert.equal(midTurnParsed.lastConclusionAt, 0)

  // 2. Final conclusion step (PLANNER_RESPONSE with content and no tool_calls) -> immediately idle + conclusion
  const conclusionStep = JSON.stringify({
    step_index: 4,
    type: 'PLANNER_RESPONSE',
    status: 'DONE',
    created_at: new Date(t0 + 4000).toISOString(),
    thinking: '分析完毕，给出最终结论。',
    content: '状态机检查已完成，共有 3 种核心高亮状态。',
  })
  const concludedParsed = parseAntigravityTranscript(
    [baseUserStep, toolStep, genericStep, conclusionStep].join('\n'),
    {
      conversationId: convId,
      mtimeMs: t0 + 4000,
      now: t0 + 4500,
    },
  )
  assert.equal(concludedParsed.status, 'idle')
  assert.equal(concludedParsed.turnState, 'conclusion')
  assert.equal(concludedParsed.isMidTurn, false)
  assert.equal(concludedParsed.statusLabel, '🔵 已出结论')
  assert.ok(concludedParsed.lastConclusionAt >= t0 + 4000)

  // 3. Stream interrupted error step (>15s ago) -> interrupted state
  const errStep = JSON.stringify({
    step_index: 5,
    type: 'ERROR_MESSAGE',
    status: 'DONE',
    created_at: new Date(t0 + 2000).toISOString(),
    content: 'Error: The stream was interrupted.',
  })
  const interruptedParsed = parseAntigravityTranscript([baseUserStep, toolStep, errStep].join('\n'), {
    conversationId: convId,
    mtimeMs: t0 + 2000,
    now: t0 + 25_000,
  })
  assert.equal(interruptedParsed.status, 'idle')
  assert.equal(interruptedParsed.turnState, 'interrupted')
  assert.equal(interruptedParsed.statusLabel, '⚠️ 中断待继续')
})

test('antigravity-ide Connect-RPC prompt delivery & merged Web UI Markdown/UX helpers', async () => {
  const prevAddr = process.env.ANTIGRAVITY_LS_ADDRESS
  const prevCsrf = process.env.ANTIGRAVITY_CSRF_TOKEN
  process.env.ANTIGRAVITY_LS_ADDRESS = '127.0.0.1:51749'
  process.env.ANTIGRAVITY_CSRF_TOKEN = 'test-csrf-token-123'

  try {
    const rpcCalls = []
    const mockFetch = async (url, init) => {
      rpcCalls.push({ url, init })
      return new Response(JSON.stringify({}), { status: 200 })
    }

    const res = await executeAntigravityIdeAction(
      {
        type: 'prompt',
        agentId: 'agy-ide:5ce97dab-7b27-4285-9b3f-f8d35fc6f541',
        text: '测试输入框直接发送指令',
      },
      {
        execImpl: async () => ({ stdout: '', stderr: '' }),
        fetchImpl: mockFetch,
      },
    )

    assert.equal(res.ok, true)
    assert.equal(res.method, 'connect-rpc')
    assert.ok(rpcCalls.some(c => /LoadTrajectory$/.test(c.url)))
    const sendCall = rpcCalls.find(c => /SendUserCascadeMessage$/.test(c.url))
    assert.ok(sendCall)
    assert.equal(sendCall.init.headers['x-codeium-csrf-token'], 'test-csrf-token-123')
    const sentBody = JSON.parse(sendCall.init.body)
    assert.equal(sentBody.cascadeId, '5ce97dab-7b27-4285-9b3f-f8d35fc6f541')
    assert.deepEqual(sentBody.items, [{ text: '测试输入框直接发送指令' }])
    assert.ok(sentBody.cascadeConfig?.plannerConfig?.planModel)
    assert.ok(sentBody.customAgentSpec?.builtinAgent?.defaultAgent)
  } finally {
    if (prevAddr === undefined) delete process.env.ANTIGRAVITY_LS_ADDRESS
    else process.env.ANTIGRAVITY_LS_ADDRESS = prevAddr
    if (prevCsrf === undefined) delete process.env.ANTIGRAVITY_CSRF_TOKEN
    else process.env.ANTIGRAVITY_CSRF_TOKEN = prevCsrf
  }

  // Verify Vite + Preact built bundle preserves all merged features & Rust turbo controls
  const indexHtml = await readFile(join(process.cwd(), 'hub/public/index.html'), 'utf8')
  const assetFiles = await readdir(join(process.cwd(), 'hub/public/assets'))
  const assetContents = await Promise.all(
    assetFiles.map(name => readFile(join(process.cwd(), 'hub/public/assets', name), 'utf8')),
  )
  const fullBundle = [indexHtml, ...assetContents].join('\n')
  assert.match(indexHtml, /id="app"/)
  assert.match(fullBundle, /function renderMarkdown\(/)
  assert.match(fullBundle, /function shouldSendOnEnter\(/)
  assert.match(fullBundle, /function shouldShowInstallHint\(/)
  assert.match(fullBundle, /function previewKind\(/)
  assert.match(fullBundle, /function shouldDismissHorizontalSwipe\(/)
  assert.match(fullBundle, /row-state-running/)
  assert.match(fullBundle, /row-state-conclusion/)
  assert.doesNotMatch(fullBundle, /renderChatMessages\(/)
  assert.match(fullBundle, /data\?\.ready/)
  assert.match(fullBundle, /lastRenderedStripKey/)
  assert.match(fullBundle, /lastRenderedListKey/)
  assert.match(fullBundle, /function openTurboGuideSheet\(/)
  assert.match(fullBundle, /function upgradeHostTurbo\(/)
  assert.match(fullBundle, /function requestHostAxPermission\(/)
})

test('antigravity-ide revert rollback & HubCore heartbeat deduplication', () => {
  const convId = '99887766-5544-3322-1100-aabbccddeeff'
  const t0 = Date.now() - 10_000
  const steps = [
    JSON.stringify({
      step_index: 0,
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: new Date(t0).toISOString(),
      content: '<USER_REQUEST>\n第一轮提问\n</USER_REQUEST>',
    }),
    JSON.stringify({
      step_index: 1,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: new Date(t0 + 1000).toISOString(),
      content: '第一轮回答',
    }),
    JSON.stringify({
      step_index: 2,
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: new Date(t0 + 2000).toISOString(),
      content: '<USER_REQUEST>\n将要被撤回的错误提问\n</USER_REQUEST>',
    }),
    JSON.stringify({
      step_index: 3,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: new Date(t0 + 3000).toISOString(),
      content: '将要被撤回的旧回答',
    }),
  ]

  // Case A: User clicked "Revert" in Antigravity IDE (in-memory stepCount dropped to 2, disk not rewritten yet)
  const revertedInMemory = parseAntigravityTranscript(steps.join('\n'), {
    conversationId: convId,
    mtimeMs: t0 + 3000,
    now: t0 + 4000,
    liveStepCount: 2,
    liveLastUserInputStepIndex: 0,
    liveStatus: 'CASCADE_RUN_STATUS_IDLE',
  })
  assert.equal(revertedInMemory.transcript.length, 2)
  assert.equal(revertedInMemory.transcript[0].text, '第一轮提问')
  assert.equal(revertedInMemory.transcript[1].text, '第一轮回答')

  // Case B: User sent a new replacement message after revert (append-only transcript.jsonl has step_index dropping back to 2)
  const stepsAfterResend = [
    ...steps,
    JSON.stringify({
      step_index: 2,
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: new Date(t0 + 5000).toISOString(),
      content: '<USER_REQUEST>\n撤回后重新发送的新提问\n</USER_REQUEST>',
    }),
    JSON.stringify({
      step_index: 3,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: new Date(t0 + 6000).toISOString(),
      content: '撤回后生成的新回答',
    }),
  ]
  const parsedAfterResend = parseAntigravityTranscript(stepsAfterResend.join('\n'), {
    conversationId: convId,
    mtimeMs: t0 + 6000,
    now: t0 + 7000,
  })
  assert.equal(parsedAfterResend.transcript.length, 4)
  assert.equal(parsedAfterResend.transcript[2].text, '撤回后重新发送的新提问')
  assert.equal(parsedAfterResend.transcript[3].text, '撤回后生成的新回答')
  assert.ok(!parsedAfterResend.transcript.some(m => m.text.includes('将要被撤回')))

  // Case C: HubCore suppresses duplicate SSE state broadcasts when heartbeat payload is unchanged
  let currentNow = 100_000
  const hub = new HubCore({ now: () => currentNow })
  let sseEmissions = 0
  hub.onStateChange(() => {
    sseEmissions += 1
  })
  const basePayload = {
    hostId: 'mac-1',
    hostName: 'Mac 1',
    bridgeState: {
      tasks: [{ id: 't1', title: 'Task 1', status: 'idle', transcript: [{ role: 'user', text: 'hi' }] }],
      approvals: [],
    },
  }
  hub.handleHeartbeat(basePayload)
  assert.equal(sseEmissions, 1)

  currentNow += 1500
  hub.handleHeartbeat(basePayload)
  assert.equal(sseEmissions, 1) // Unchanged within 12s -> no redundant SSE broadcast

  currentNow += 1500
  hub.handleHeartbeat({
    ...basePayload,
    bridgeState: {
      tasks: [{ id: 't1', title: 'Task 1', status: 'running', transcript: [{ role: 'user', text: 'hi' }] }],
      approvals: [],
    },
  })
  assert.equal(sseEmissions, 2) // State changed -> immediately broadcast
})

test('Vite + Preact bundle, static /assets/* serving, voice input abort state machine, binary file preview, and push deep-link routing work end-to-end', async () => {
  const assetDir = new URL('../../hub/public/assets/', import.meta.url)
  const assetFiles = await readdir(assetDir)
  const jsAsset = assetFiles.find(f => f.endsWith('.js'))
  const cssAsset = assetFiles.find(f => f.endsWith('.css'))
  assert.ok(jsAsset, 'Expected built Preact JS asset in hub/public/assets/')
  assert.ok(cssAsset, 'Expected built CSS asset in hub/public/assets/')

  const html = await readFile(new URL('../../hub/public/index.html', import.meta.url), 'utf8')
  const jsCode = await readFile(new URL(`../../hub/public/assets/${jsAsset}`, import.meta.url), 'utf8')
  const cssCode = await readFile(new URL(`../../hub/public/assets/${cssAsset}`, import.meta.url), 'utf8')
  const bundle = `${html}\n${jsCode}\n${cssCode}`

  assert.match(bundle, /chatVoiceBtn/)
  assert.match(bundle, /newTaskVoiceBtn/)
  assert.match(bundle, /function toggleVoiceInput\(/)
  assert.match(bundle, /function stopVoiceInput\(/)
  assert.match(bundle, /rec\.abort\(\)/)
  assert.match(bundle, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/)
  assert.match(bundle, /kind === "binary"|kind === 'binary'/)
  assert.match(bundle, /function tryOpenDeepLinkTarget\(/)
  assert.match(bundle, /NOTIFICATION_CLICK/)

  // Verify createHubServer serves /assets/* with immutable cache headers via fetchAdapter
  const { fetchAdapter } = createHubServer({ token: 'test-token' })
  const jsRes = await fetchAdapter(`https://dsh-hub.example.run.app/assets/${jsAsset}`)
  assert.equal(jsRes.status, 200)
  assert.match(jsRes.headers.get('content-type') || '', /javascript/)
  assert.match(jsRes.headers.get('cache-control') || '', /immutable/)

  const cssRes = await fetchAdapter(`https://dsh-hub.example.run.app/assets/${cssAsset}`)
  assert.equal(cssRes.status, 200)
  assert.match(cssRes.headers.get('content-type') || '', /text\/css/)

  // Verify voice input start -> result -> toggle stop (rec.abort() + callback detachment + UI reset)
  const hookSource = await readFile(new URL('../../hub/web/src/hooks/useVoiceInput.ts', import.meta.url), 'utf8')
  const cleanJs = hookSource
    .replace(/export interface[\s\S]*?\n\}\n/, '')
    .replace(/export function /g, 'function ')
    .replace(/: any/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: void/g, '')
    .replace(/\?\s*:\s*VoiceControllerDeps/g, '')
    .replace(/ as [A-Za-z0-9_| <>]+/g, '')
    .replace(/\(window\)/g, 'window')

  let abortCalled = 0
  let stopCalled = 0
  let startCalled = 0
  let lastInstance = null

  const makeHintBar = () => {
    const classes = new Set(['voice-hint-bar'])
    return {
      textContent: '',
      style: { display: 'none' },
      classes,
      classList: {
        add(...items) { for (const c of items) classes.add(c) },
        remove(...items) { for (const c of items) classes.delete(c) },
        contains(c) { return classes.has(c) },
      },
    }
  }

  const fakeElements = {
    globalPromptInput: {
      value: '已有前缀 ',
      focused: false,
      clicked: false,
      disabled: false,
      focus() { this.focused = true },
      click() { this.clicked = true },
    },
    chatVoiceHintBar: makeHintBar(),
    newTaskVoiceHintBar: makeHintBar(),
    chatVoiceBtn: {
      textContent: '🎤',
      attrs: {},
      classes: new Set(['voice-btn']),
      classList: {
        toggle(cls, force) {
          if (force) fakeElements.chatVoiceBtn.classes.add(cls)
          else fakeElements.chatVoiceBtn.classes.delete(cls)
        },
        contains(cls) {
          return fakeElements.chatVoiceBtn.classes.has(cls)
        },
      },
      setAttribute(k, v) { this.attrs[k] = v },
    },
    newTaskVoiceBtn: {
      id: 'newTaskVoiceBtn',
      textContent: '🎤 语音输入',
      attrs: {},
      classes: new Set(['voice-pill-btn']),
      classList: {
        toggle(cls, force) {
          if (force) fakeElements.newTaskVoiceBtn.classes.add(cls)
          else fakeElements.newTaskVoiceBtn.classes.delete(cls)
        },
        contains(cls) {
          return fakeElements.newTaskVoiceBtn.classes.has(cls)
        },
      },
      setAttribute(k, v) { this.attrs[k] = v },
    },
  }

  assert.doesNotMatch(bundle, /豆包/, 'Bundle must not contain any third-party Doubao IME prompts')

  const fakeWindow = {
    webkitSpeechRecognition: class FakeSpeechRecognition {
      constructor() {
        lastInstance = this
      }
      start() { startCalled += 1 }
      abort() { abortCalled += 1 }
      stop() { stopCalled += 1 }
    },
  }
  const fakeDocument = {
    activeElement: null,
    getElementById(id) { return fakeElements[id] || null },
  }
  // Simulate mobile iPhone — directly invokes phone's built-in SpeechRecognition WITHOUT popping up keyboard!
  const fakeNavigator = {
    language: 'zh-Hans-CN',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    standalone: false,
    maxTouchPoints: 5,
  }
  const toasts = []
  let composerInputCalls = 0

  const factory = new Function(
    'window',
    'document',
    'navigator',
    `${cleanJs}\nreturn { toggleVoiceInput, stopVoiceInput, isVoiceRecording, hideVoiceHintBar, mergeSpeechResults };`,
  )
  const voice = factory(fakeWindow, fakeDocument, fakeNavigator)
  const deps = {
    showToast(msg) { toasts.push(msg) },
    onComposerInput() { composerInputCalls += 1 },
  }

  // 0) mergeSpeechResults handles both segmented and cumulative WebKit results without duplication
  assert.equal(
    voice.mergeSpeechResults([
      { 0: { transcript: '我说了一句' } },
      { 0: { transcript: '我说了一句还没结束' } },
    ]),
    '我说了一句还没结束',
  )
  assert.equal(
    voice.mergeSpeechResults([
      { 0: { transcript: '第一句，' } },
      { 0: { transcript: '第二句' } },
    ]),
    '第一句，第二句',
  )

  // 1) Mobile iPhone Safari: directly starts continuous webkitSpeechRecognition WITHOUT focusing input (no keyboard popup)
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(startCalled, 1)
  assert.equal(lastInstance.lang, 'zh-CN')
  assert.equal(lastInstance.continuous, true)
  assert.equal(voice.isVoiceRecording(), true)
  assert.equal(fakeElements.globalPromptInput.focused, false)
  assert.equal(fakeElements.chatVoiceBtn.classList.contains('recording'), true)
  assert.equal(fakeElements.chatVoiceBtn.textContent, '⏹')
  assert.equal(fakeElements.chatVoiceBtn.attrs['aria-pressed'], 'true')
  assert.equal(fakeElements.chatVoiceHintBar.style.display, 'flex')
  assert.equal(fakeElements.chatVoiceHintBar.classList.contains('recording'), true)

  // 2) Speech recognition emits interim + final result on iPhone AND survives mid-thought pause (no-speech + onend auto-restart!)
  lastInstance.onresult({
    resultIndex: 0,
    results: [
      { isFinal: false, 0: { transcript: '帮我检查' } },
    ],
  })
  lastInstance.onresult({
    resultIndex: 0,
    results: [
      { isFinal: true, 0: { transcript: '帮我检查测试' } },
    ],
  })
  assert.equal(fakeElements.globalPromptInput.value, '已有前缀 帮我检查测试')
  assert.equal(composerInputCalls, 2)

  // Simulate iOS Safari firing no-speech / onend during a 3s breathing pause -> stays recording & seamlessly restarts!
  lastInstance.onerror({ error: 'no-speech' })
  assert.equal(voice.isVoiceRecording(), true)
  lastInstance.onend()
  assert.equal(voice.isVoiceRecording(), true)
  assert.equal(fakeElements.chatVoiceBtn.textContent, '⏹')
  await new Promise(r => setTimeout(r, 220))
  assert.equal(startCalled, 2, 'Should auto-spawn fresh SpeechRecognition chunk after pause onend')
  lastInstance.onresult({
    resultIndex: 0,
    results: [
      { isFinal: true, 0: { transcript: '顺便看下日志' } },
    ],
  })
  assert.equal(fakeElements.globalPromptInput.value, '已有前缀 帮我检查测试，顺便看下日志')

  // 3) Second click immediately stops recording, calls abort() + stop(), detaches callbacks, resets UI & hint bar
  const savedOnResult = lastInstance.onresult
  assert.equal(typeof savedOnResult, 'function')
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(voice.isVoiceRecording(), false)
  assert.equal(abortCalled, 1)
  assert.equal(stopCalled, 1)
  assert.equal(lastInstance.onresult, null)
  assert.equal(lastInstance.onerror, null)
  assert.equal(lastInstance.onend, null)
  assert.equal(fakeElements.chatVoiceBtn.classList.contains('recording'), false)
  assert.equal(fakeElements.chatVoiceBtn.textContent, '🎤')
  assert.equal(fakeElements.chatVoiceBtn.attrs['aria-pressed'], 'false')
  assert.equal(fakeElements.chatVoiceHintBar.style.display, 'none')
  assert.ok(toasts.some(t => t.includes('已关闭语音输入')))

  // 4) New task voice button switches '🎤 语音输入' <-> '⏹ 停止听写' and surfaces audio-capture conflict clearly
  fakeElements.newTaskInput = { value: '', focused: false, disabled: false, focus() { this.focused = true } }
  voice.toggleVoiceInput('newTaskInput', 'newTaskVoiceBtn', deps)
  assert.equal(startCalled, 3)
  assert.equal(fakeElements.newTaskVoiceBtn.textContent, '⏹ 停止听写')
  lastInstance.onerror({ error: 'audio-capture' })
  assert.equal(voice.isVoiceRecording(), false)
  assert.equal(fakeElements.newTaskVoiceBtn.textContent, '🎤 语音输入')
  assert.ok(toasts.some(t => t.includes('麦克风被后台软件占用')))

  // 5) Disabled input (running non-steerable or observe-only session) shows immediate explanation toast
  fakeElements.globalPromptInput.disabled = true
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(startCalled, 3)
  assert.ok(toasts.some(t => t.includes('暂不可语音输入')))
  fakeElements.globalPromptInput.disabled = false

  // 6) If iOS standalone container rejects with service-not-allowed, gracefully remembers block & focuses input once
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(startCalled, 4)
  lastInstance.onerror({ error: 'service-not-allowed' })
  assert.equal(voice.isVoiceRecording(), false)
  assert.equal(fakeElements.globalPromptInput.focused, true)
  voice.hideVoiceHintBar()
})

test('v0.6.4: WeChat-style Hold-to-Talk voice interaction (release to send, slide left to cancel, slide right to edit)', async () => {
  const hookSource = await readFile(new URL('../../hub/web/src/hooks/useVoiceInput.ts', import.meta.url), 'utf8')
  const cleanJs = hookSource
    .replace(/export interface[\s\S]*?\n\}\n/, '')
    .replace(/export function /g, 'function ')
    .replace(/: any/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: void/g, '')
    .replace(/\?\s*:\s*VoiceControllerDeps/g, '')
    .replace(/ as [A-Za-z0-9_| <>]+/g, '')
    .replace(/\(window\)/g, 'window')

  const makeEl = (initialClasses = []) => {
    const classes = new Set(initialClasses)
    return {
      textContent: '',
      value: '',
      disabled: false,
      focused: false,
      attrs: {},
      style: { display: 'none' },
      classes,
      classList: {
        add(...items) { for (const c of items) classes.add(c) },
        remove(...items) { for (const c of items) classes.delete(c) },
        toggle(c, force) {
          const next = force === undefined ? !classes.has(c) : Boolean(force)
          if (next) classes.add(c)
          else classes.delete(c)
        },
        contains(c) { return classes.has(c) },
      },
      setAttribute(k, v) { this.attrs[k] = v },
      focus() { this.focused = true },
      setSelectionRange() {},
    }
  }

  const els = {
    globalPromptInput: makeEl(['chat-input']),
    composerUnifiedCard: makeEl(['composer-unified-card']),
    chatVoiceBtn: makeEl(['voice-btn', 'mode-toggle-btn']),
    wechatHoldTalkBtn: makeEl(['wechat-hold-talk-btn']),
    wechatHoldTalkLabel: makeEl(),
    wechatVoiceOverlay: makeEl(['wechat-voice-overlay']),
    wechatOverlayTranscript: makeEl(['wechat-voice-transcript']),
    wechatOverlayStatus: makeEl(['wechat-voice-status-text']),
    wechatZoneCancel: makeEl(['wechat-voice-action-item']),
    wechatZoneEdit: makeEl(['wechat-voice-action-item']),
    chatVoiceHintBar: makeEl(['voice-hint-bar']),
    newTaskVoiceHintBar: makeEl(['voice-hint-bar']),
  }

  let lastRec = null
  let startCount = 0
  let stopCount = 0
  let abortCount = 0
  let sentPrompts = []
  const toasts = []

  const fakeWin = {
    innerWidth: 390,
    innerHeight: 844,
    webkitSpeechRecognition: class {
      constructor() { lastRec = this }
      start() { startCount += 1 }
      stop() { stopCount += 1 }
      abort() { abortCount += 1 }
    },
    addEventListener() {},
    removeEventListener() {},
  }
  const fakeDoc = {
    visibilityState: 'visible',
    activeElement: null,
    getElementById(id) { return els[id] || null },
  }
  const fakeNav = { language: 'zh-CN', maxTouchPoints: 5 }

  const factory = new Function(
    'window',
    'document',
    'navigator',
    `${cleanJs}\nreturn { computeHoldZone, initWechatVoiceMode, isWechatVoiceMode, toggleWechatVoiceMode, startHoldVoice, moveHoldVoice, endHoldVoice, consumeReturnToVoiceAfterSend };`,
  )
  const wv = factory(fakeWin, fakeDoc, fakeNav)
  const deps = {
    showToast(msg) { toasts.push(msg) },
    onComposerInput() {},
    sendPrompt() { sentPrompts.push(els.globalPromptInput.value) },
  }

  // 1) Gesture zone geometry: bottom bar -> send; upper-left -> cancel; upper-right -> edit
  assert.equal(wv.computeHoldZone(195, 800, 390, 844, 800), 'send')
  assert.equal(wv.computeHoldZone(60, 790, 390, 844, 800), 'send', 'Horizontal drift near bottom stays send')
  assert.equal(wv.computeHoldZone(90, 680, 390, 844, 800), 'cancel')
  assert.equal(wv.computeHoldZone(300, 680, 390, 844, 800), 'edit')

  // 2) Mobile defaults to WeChat Hold-to-Talk mode out of the box
  wv.initWechatVoiceMode()
  assert.equal(wv.isWechatVoiceMode(), true)
  assert.equal(els.composerUnifiedCard.classList.contains('wechat-voice-mode'), true)
  assert.equal(els.chatVoiceBtn.textContent, '⌨️ 打字')

  // 3) Hold -> speak -> release directly -> flushes final tail audio via stop()+onend and immediately sends!
  assert.equal(wv.startHoldVoice(195, 800, deps), true)
  assert.equal(startCount, 1)
  assert.equal(els.wechatVoiceOverlay.style.display, 'flex')
  assert.equal(els.wechatVoiceOverlay.classList.contains('zone-send'), true)
  lastRec.onresult({ results: [{ 0: { transcript: '帮我跑一下单元测试' } }] })
  assert.equal(els.wechatOverlayTranscript.textContent, '帮我跑一下单元测试')

  wv.endHoldVoice(deps)
  assert.equal(stopCount, 1)
  // Simulate final tail syllable arriving right after finger lift before onend
  lastRec.onresult({ results: [{ 0: { transcript: '帮我跑一下单元测试并汇报结果' } }] })
  lastRec.onend()
  assert.equal(abortCount >= 1, true)
  assert.equal(els.wechatVoiceOverlay.style.display, 'none')
  assert.deepStrictEqual(sentPrompts, ['帮我跑一下单元测试并汇报结果'])

  // 4) Hold -> speak -> slide left-up ('cancel') -> release -> discards speech, sends nothing
  els.globalPromptInput.value = ''
  wv.startHoldVoice(195, 800, deps)
  lastRec.onresult({ results: [{ 0: { transcript: '这句说错了不要发' } }] })
  assert.equal(wv.moveHoldVoice(80, 660), 'cancel')
  assert.equal(els.wechatVoiceOverlay.classList.contains('zone-cancel'), true)
  assert.equal(els.wechatZoneCancel.classList.contains('active'), true)
  wv.endHoldVoice(deps)
  assert.equal(sentPrompts.length, 1, 'Cancelled speech must NOT be sent')
  assert.equal(els.globalPromptInput.value, '')
  assert.ok(toasts.some(t => t.includes('已取消语音')))

  // 5) Hold -> speak -> slide right-up ('edit') -> release -> switches to text input for editing, then returns to voice mode after send
  wv.startHoldVoice(195, 800, deps)
  lastRec.onresult({ results: [{ 0: { transcript: '先放入输入框让我改两个字' } }] })
  assert.equal(wv.moveHoldVoice(310, 660), 'edit')
  assert.equal(els.wechatVoiceOverlay.classList.contains('zone-edit'), true)
  assert.equal(els.wechatZoneEdit.classList.contains('active'), true)
  wv.endHoldVoice(deps)
  lastRec.onend()
  assert.equal(sentPrompts.length, 1, 'Edit mode must NOT auto-send')
  assert.equal(wv.isWechatVoiceMode(), false, 'Should reveal text input for editing')
  assert.equal(els.globalPromptInput.value, '先放入输入框让我改两个字')
  assert.equal(els.globalPromptInput.focused, true)
  assert.equal(wv.consumeReturnToVoiceAfterSend(), true)
})

test('antigravity-ide approval sync & RPC: suppresses false-positive pendingApproval when computer auto-approved, annotates sandbox retry, and approves via HandleCascadeUserInteraction RPC', async () => {
  const convId = '5ce97dab-7b27-4285-9b3f-f8d35fc6f541'
  const nowIso = new Date().toISOString()
  const lines = [
    JSON.stringify({
      step_index: 1,
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: nowIso,
      content: '<USER_REQUEST>\n提交并推送代码\n</USER_REQUEST>',
    }),
    // 1) Sandboxed attempt that fails with Operation not permitted
    JSON.stringify({
      step_index: 2,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: nowIso,
      thinking: '先尝试沙盒内 git add',
      tool_calls: [
        {
          id: 'tc-sandbox-1',
          name: 'run_command',
          arguments: {
            CommandLine: 'git add connect-host.sh',
            BypassSandbox: false,
            toolSummary: 'Stage LaunchAgent daemon',
          },
        },
      ],
    }),
    JSON.stringify({
      step_index: 3,
      type: 'GENERIC',
      status: 'DONE',
      created_at: nowIso,
      content:
        "Exit code 128\nfatal: Unable to create '/Users/dev/deepseekharness-remote/.git/index.lock': Operation not permitted",
    }),
    // 2) Unsandboxed retry (BypassSandbox: true) currently executing or waiting
    JSON.stringify({
      step_index: 4,
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: nowIso,
      thinking: '切换 BypassSandbox: true 重新执行 git add',
      tool_calls: [
        {
          id: 'tc-unsandboxed-2',
          name: 'run_command',
          arguments: {
            CommandLine: 'git add connect-host.sh',
            BypassSandbox: true,
            toolSummary: 'Stage LaunchAgent daemon',
          },
        },
      ],
    }),
  ].join('\n')

  // Case A: Computer ALREADY auto-approved `git add` ("Always allow"), so LanguageServer liveSummary has waitingSteps: []
  const autoApprovedParsed = parseAntigravityTranscript(lines, {
    conversationId: convId,
    mtimeMs: Date.now(),
    hasLiveSummary: true,
    liveWaitingSteps: [],
  })
  assert.equal(autoApprovedParsed.pendingApproval, null)
  assert.equal(autoApprovedParsed.status, 'running')
  // Verify the sandboxed step (index 1 in transcript) is clearly annotated as a sandbox probe retry
  const sandboxMsg = autoApprovedParsed.transcript.find(
    m => m.role === 'assistant' && m.thinking.includes('先尝试沙盒内 git add'),
  )
  assert.ok(sandboxMsg)
  assert.ok(sandboxMsg.toolCalls[0].command.includes('🛡️ 沙盒模式试探受限 (Operation not permitted)'))

  // Case B: Computer is genuinely waiting for approval in LanguageServer (`waitingSteps` is non-empty)
  const waitingParsed = parseAntigravityTranscript(lines, {
    conversationId: convId,
    mtimeMs: Date.now(),
    hasLiveSummary: true,
    liveWaitingSteps: [
      {
        stepIndex: 6,
        step: {
          status: 'CORTEX_STEP_STATUS_WAITING',
          metadata: {
            sourceTrajectoryStepInfo: {
              trajectoryId: 'traj-998877',
              stepIndex: 6,
              cascadeId: convId,
            },
          },
          requestedInteraction: {
            permission: {
              resource: {
                action: 'PERMISSION_ACTION_EXECUTE',
                target: 'git add connect-host.sh',
              },
              persistSuggestionType: 'PERSIST_SUGGESTION_TYPE_ALLOW_BINARY',
              suggestedPersistPattern: 'unsandboxed(git add *)',
            },
          },
        },
      },
    ],
  })
  assert.ok(waitingParsed.pendingApproval)
  assert.equal(waitingParsed.status, 'approval')
  assert.equal(waitingParsed.pendingApproval.waitingStepIndex, 6)
  assert.equal(waitingParsed.pendingApproval.trajectoryId, 'traj-998877')
  assert.equal(waitingParsed.pendingApproval.suggestedPersistPattern, 'unsandboxed(git add *)')

  // Case C: Mobile user taps Approve (Option 3: Always allow) -> calls HandleCascadeUserInteraction Connect-RPC directly
  const rpcCalls = []
  const res = await executeAntigravityIdeAction(
    {
      type: 'approve',
      agentId: `agy-ide:${convId}`,
      optionIndex: 3,
      pendingApproval: waitingParsed.pendingApproval,
    },
    {
      execImpl: async (bin, args) => {
        if (bin === 'ps') {
          return {
            stdout:
              '/Applications/Antigravity.app/Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm --csrf_token test-csrf-999\n',
          }
        }
        if (bin === 'lsof') {
          return {
            stdout: 'language_ 12345 cc 10u IPv4 0x123 0t0 TCP 127.0.0.1:59123 (LISTEN)\n',
          }
        }
        return { stdout: '' }
      },
      fetchImpl: async (url, init) => {
        const body = init?.body ? JSON.parse(init.body) : {}
        rpcCalls.push({ url: String(url), body })
        if (String(url).endsWith('/GetAllCascadeTrajectories')) {
          return new Response(
            JSON.stringify({
              trajectorySummaries: {
                [convId]: {
                  trajectoryId: 'traj-998877',
                  status: 'CASCADE_RUN_STATUS_WAITING_FOR_USER',
                  waitingSteps: [
                    {
                      stepIndex: 6,
                      step: {
                        metadata: {
                          sourceTrajectoryStepInfo: {
                            trajectoryId: 'traj-998877',
                            stepIndex: 6,
                            cascadeId: convId,
                          },
                        },
                        requestedInteraction: {
                          permission: {
                            suggestedPersistPattern: 'unsandboxed(git add *)',
                          },
                        },
                      },
                    },
                  ],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (String(url).endsWith('/HandleCascadeUserInteraction')) {
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('not found', { status: 404 })
      },
    },
  )

  assert.equal(res.ok, true)
  assert.equal(res.engine, 'connect-rpc')
  const handleCall = rpcCalls.find(c => c.url.endsWith('/HandleCascadeUserInteraction'))
  assert.ok(handleCall)
  assert.equal(handleCall.body.cascadeId, convId)
  assert.equal(handleCall.body.interaction.trajectoryId, 'traj-998877')
  assert.equal(handleCall.body.interaction.stepIndex, 6)
  assert.equal(handleCall.body.interaction.permission.allow, true)
  assert.equal(handleCall.body.interaction.permission.scope, 'PERMISSION_SCOPE_GLOBAL')
  assert.deepEqual(handleCall.body.interaction.permission.persistGrants.allow, ['unsandboxed(git add *)'])

  // Case D: Desktop already clicked Approve first (`waitingSteps: []`, step 6 is DONE with historical `requestedInteraction`),
  // then mobile user taps stale Approve button -> MUST return `alreadySettled: true` (connect-rpc-noop)
  // and MUST NEVER fall back to native keystroke `approve-1` / `osascript` (which previously typed literal "1" into desktop chat!)
  const staleExecBins = []
  const staleRpcCalls = []
  const staleRes = await executeAntigravityIdeAction(
    {
      type: 'approve',
      agentId: `agy-ide:${convId}`,
      optionIndex: 1,
      pendingApproval: waitingParsed.pendingApproval,
    },
    {
      execImpl: async (bin) => {
        staleExecBins.push(bin)
        if (bin === 'ps') {
          return {
            stdout:
              '/Applications/Antigravity.app/Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm --csrf_token test-csrf-999\n',
          }
        }
        if (bin === 'lsof') {
          return {
            stdout: 'language_ 12345 cc 10u IPv4 0x123 0t0 TCP 127.0.0.1:59123 (LISTEN)\n',
          }
        }
        return { stdout: '' }
      },
      fetchImpl: async (url, init) => {
        const body = init?.body ? JSON.parse(init.body) : {}
        staleRpcCalls.push({ url: String(url), body })
        if (String(url).endsWith('/GetAllCascadeTrajectories')) {
          return new Response(
            JSON.stringify({
              trajectorySummaries: {
                [convId]: {
                  trajectoryId: 'traj-998877',
                  status: 'CASCADE_RUN_STATUS_RUNNING',
                  waitingSteps: [],
                },
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (String(url).endsWith('/GetCascadeTrajectorySteps')) {
          return new Response(
            JSON.stringify({
              steps: [
                {}, {}, {}, {}, {}, {},
                {
                  status: 'CORTEX_STEP_STATUS_DONE',
                  requestedInteraction: {
                    permission: { suggestedPersistPattern: 'unsandboxed(git add *)' },
                  },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (String(url).endsWith('/HandleCascadeUserInteraction')) {
          return new Response('step is no longer waiting', { status: 400 })
        }
        return new Response('not found', { status: 404 })
      },
    },
  )
  assert.equal(staleRes.ok, true)
  assert.equal(staleRes.alreadySettled, true)
  assert.equal(staleRes.engine, 'connect-rpc-noop')
  assert.equal(staleRpcCalls.some(c => c.url.endsWith('/HandleCascadeUserInteraction')), false)
  assert.equal(staleExecBins.includes('osascript'), false)
  assert.equal(staleExecBins.some(b => String(b).includes('dsh-turbo')), false)
})

test('Mobile UX Enhancements (#1, #3, #6, #13): 5MB image preview stripped from getFullState & streamed via /file-preview, offline command queueing/cancel/TTL, pairing rate-limit, and build metadata', async () => {
  const hub = new HubCore({ token: 'mobile-ux-token' })
  const { fetchAdapter } = createHubServer({ hub, token: 'mobile-ux-token' })
  const hubUrl = 'https://dsh-mobile-ux.example.run.app'
  const authHeaders = {
    'content-type': 'application/json',
    authorization: 'Bearer mobile-ux-token',
  }

  // 1. Verify /healthz and /api/state expose build metadata (#13)
  const healthRes = await (await fetchAdapter(`${hubUrl}/healthz`)).json()
  assert.equal(healthRes.ok, true)
  assert.equal(healthRes.build.version, '0.6.4')
  assert.ok(healthRes.build.uiBuild)
  assert.ok(healthRes.build.startedAt > 0)

  // 1b. Verify liteHeartbeat requests needFullSync on cold Hub, then succeeds once full bridgeState is synced
  const coldLite = await (await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'lite-mac',
      hostName: 'Lite Mac',
      liteHeartbeat: true,
      bridgeStateSig: 'sig-v1',
      expectedTaskCount: 2,
    }),
  })).json()
  assert.equal(coldLite.ok, true)
  assert.equal(coldLite.needFullSync, true)

  await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'lite-mac',
      hostName: 'Lite Mac',
      bridgeStateSig: 'sig-v1',
      bridgeState: { tasks: [{ id: 't1', title: 'Task 1' }, { id: 't2', title: 'Task 2' }], approvals: [], workspaces: [] },
    }),
  })

  const warmLite = await (await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'lite-mac',
      hostName: 'Lite Mac',
      liteHeartbeat: true,
      bridgeStateSig: 'sig-v1',
      expectedTaskCount: 2,
      systemTelemetry: { battery: { percent: 95, charging: true } },
    }),
  })).json()
  assert.equal(warmLite.ok, true)
  assert.equal(Boolean(warmLite.needFullSync), false)

  // 2. Verify 5MB image preview does not bloat /api/state and streams cleanly via /api/hosts/:hostId/file-preview (#3)
  const fake5MbBuf = Buffer.alloc(5 * 1024 * 1024, 0x89)
  const fake5MbBase64 = fake5MbBuf.toString('base64')
  await fetchAdapter(`${hubUrl}/api/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      commandResults: [
        {
          commandId: 'cmd-img-5mb',
          type: 'read_file',
          ok: true,
          relPath: 'assets/hero-5mb.png',
          mimeType: 'image/png',
          size: fake5MbBuf.length,
          dataBase64: fake5MbBase64,
        },
      ],
    }),
  })

  const stateRes = await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })
  const stateRawText = await stateRes.text()
  // /api/state payload must stay lightweight (<100KB) even after a 5MB image preview
  assert.ok(stateRawText.length < 100_000, `Expected /api/state < 100KB, got ${stateRawText.length} bytes`)
  const stateJson = JSON.parse(stateRawText)
  const hostState = stateJson.hosts.find(h => h.hostId === 'mac-studio')
  assert.equal(hostState.lastFilePreview.hasBlob, true)
  assert.equal(hostState.lastFilePreview.dataBase64, undefined)
  assert.match(hostState.lastFilePreview.previewUrl, /\/api\/hosts\/mac-studio\/file-preview\?at=/)

  // Fetch the binary image from /api/hosts/mac-studio/file-preview
  const imgRes = await fetchAdapter(`${hubUrl}${hostState.lastFilePreview.previewUrl}`, {
    headers: { authorization: 'Bearer mobile-ux-token' },
  })
  assert.equal(imgRes.status, 200)
  assert.equal(imgRes.headers.get('content-type'), 'image/png')
  assert.match(imgRes.headers.get('cache-control') || '', /max-age=300/)
  const streamedBuf = Buffer.from(await imgRes.arrayBuffer())
  assert.equal(streamedBuf.length, fake5MbBuf.length)

  // Clear preview blob
  const delPreviewRes = await (
    await fetchAdapter(`${hubUrl}/api/hosts/mac-studio/file-preview`, {
      method: 'DELETE',
      headers: authHeaders,
    })
  ).json()
  assert.equal(delPreviewRes.ok, true)

  // 3. Offline command queueing, cancellation, and TTL expiration (#1)
  // Mark host as last seen 5 minutes ago (offline)
  hub.hosts.get('mac-studio').lastSeen = Date.now() - 5 * 60_000
  const queuedCmdRes = await (
    await fetchAdapter(`${hubUrl}/api/hosts/mac-studio/command`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'prompt',
        agentId: 'task-offline-1',
        text: '重构登录页面',
      }),
    })
  ).json()
  assert.equal(queuedCmdRes.ok, true)
  assert.equal(queuedCmdRes.command.queued, true)
  assert.ok(queuedCmdRes.command.expiresAt > Date.now())

  const stateWithQueued = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
  const pendingCmds = stateWithQueued.hosts.find(h => h.hostId === 'mac-studio').pendingCommands
  assert.equal(pendingCmds.length, 1)
  assert.equal(pendingCmds[0].id, queuedCmdRes.command.id)

  // Cancel the queued command from mobile UI before host wakes up
  const cancelRes = await (
    await fetchAdapter(`${hubUrl}/api/commands/${queuedCmdRes.command.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
  ).json()
  assert.equal(cancelRes.ok, true)
  assert.equal(cancelRes.commandId, queuedCmdRes.command.id)

  const stateAfterCancel = await (await fetchAdapter(`${hubUrl}/api/state`, { headers: authHeaders })).json()
  assert.equal(stateAfterCancel.hosts.find(h => h.hostId === 'mac-studio').pendingCommands.length, 0)

  // Queue another command and simulate TTL expiration before host heartbeat
  const { command: expiredCmd } = hub.queueCommand('mac-studio', {
    type: 'prompt',
    agentId: 'task-offline-1',
    text: '过期指令不应被执行',
  })
  expiredCmd.expiresAt = Date.now() - 1000
  const hbAfterWake = hub.handleHeartbeat({
    hostId: 'mac-studio',
    hostName: 'Mac Studio',
  })
  assert.equal(hbAfterWake.commands.length, 0)

  // 4. Pairing code creation & exchange brute-force rate limiting (#6)
  const pairCreate = await (
    await fetchAdapter(`${hubUrl}/api/pairing/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ ttlMs: 180_000 }),
    })
  ).json()
  assert.equal(pairCreate.ok, true)
  assert.match(pairCreate.code, /^[A-Z0-9]{6}$/)

  for (let i = 0; i < 10; i += 1) {
    const badRes = await fetchAdapter(`${hubUrl}/api/pairing/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
      body: JSON.stringify({ code: '000000' }),
    })
    assert.equal(badRes.status, 401)
  }
  const rateLimitedRes = await fetchAdapter(`${hubUrl}/api/pairing/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' },
    body: JSON.stringify({ code: pairCreate.code }),
  })
  assert.equal(rateLimitedRes.status, 429)

  // 5. Verify v2 audit fixes (N1, N3, N6, N7, N10, and sendApprovalDecision renderAll fix)
  const apiHealth = await (await fetchAdapter(`${hubUrl}/api/health`)).json()
  assert.equal(apiHealth.ok, true)

  // N3: Expired image blob returns 404 instead of empty 200 text/plain
  hub.hosts.get('mac-studio').lastFilePreview = {
    relPath: 'assets/expired.png',
    mimeType: 'image/png',
    hasBlob: true,
    updatedAt: Date.now(),
  }
  hub.filePreviewBlobs.delete('mac-studio')
  const expiredBlobRes = await fetchAdapter(`${hubUrl}/api/hosts/mac-studio/file-preview`, {
    headers: { authorization: 'Bearer mobile-ux-token' },
  })
  assert.equal(expiredBlobRes.status, 404)

  // N7 & N10: getFullState prunes expired queued commands immediately and records text in recentResults
  const { command: expInPoll } = hub.queueCommand('mac-studio', {
    type: 'prompt',
    agentId: 'task-offline-2',
    text: '手机轮询时直接过期的指令',
  })
  expInPoll.expiresAt = Date.now() - 500
  const stateAfterPollExpire = hub.getFullState()
  const studioHostAfterExpire = stateAfterPollExpire.hosts.find(h => h.hostId === 'mac-studio')
  assert.equal(studioHostAfterExpire.pendingCommands.length, 0)
  const expResult = studioHostAfterExpire.recentResults.find(r => r.commandId === expInPoll.id)
  assert.ok(expResult)
  assert.equal(expResult.expired, true)
  assert.equal(expResult.text, '手机轮询时直接过期的指令')

  // N1: listShares includes both id and shareId, and deleteShare clears host.lastShareResult
  const createdShare = hub.createShare({
    hostId: 'mac-studio',
    hostName: 'Mac Studio',
    agentId: 'task-1',
    title: 'Share N1 Test',
    ciphertextBase64: 'YWJj',
    ivBase64: 'MTIz',
  })
  hub.hosts.get('mac-studio').lastShareResult = {
    ok: true,
    shareId: createdShare.id,
    shareUrl: `https://example.com/?share=${createdShare.id}#k=xyz`,
  }
  const sharesList = hub.listShares()
  assert.equal(sharesList[0].id, createdShare.id)
  assert.equal(sharesList[0].shareId, createdShare.id)
  hub.deleteShare(createdShare.id)
  assert.equal(hub.hosts.get('mac-studio').lastShareResult, null)

  // Verify controller.js does not contain undefined renderApp() call
  const controllerSrc = await readFile(new URL('../../hub/web/src/controller.js', import.meta.url), 'utf8')
  assert.doesNotMatch(controllerSrc, /\brenderApp\s*\(/)
})

test('Phase 1A & 1B Stability Suite: daemon lockfile, server-authoritative approval settling/failed ledger, syncMeta bootEpoch anti-rollback, 5s stateMeta hysteresis, and HarnessRouter observe-only protection', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-phase1-'))
  try {
    // 1. Daemon Lockfile (`acquireDaemonLock`): wx atomic lock, contention refusal, stale cleanup, and --replace handover
    const alivePids = new Set([10001])
    const killedSignals = []
    const isAliveMock = pid => alivePids.has(Number(pid))
    const killMock = (pid, sig) => {
      killedSignals.push({ pid: Number(pid), sig })
      if (sig === 'SIGTERM' || sig === 'SIGKILL') {
        alivePids.delete(Number(pid))
      }
    }

    const lock1 = await acquireDaemonLock({
      dshHome: tmpDir,
      hostId: 'mac-lock-test',
      pid: 10001,
      bootId: 'boot-10001',
      isAliveImpl: isAliveMock,
      killImpl: killMock,
    })
    assert.equal(lock1.acquired, true)

    // Second instance without `replace` must be refused while 10001 is alive
    const lock2 = await acquireDaemonLock({
      dshHome: tmpDir,
      hostId: 'mac-lock-test',
      pid: 10002,
      bootId: 'boot-10002',
      replace: false,
      isAliveImpl: isAliveMock,
      killImpl: killMock,
    })
    assert.equal(lock2.acquired, false)
    assert.equal(lock2.reason, 'ALREADY_RUNNING')
    assert.equal(lock2.existing.pid, 10001)

    // Third instance with `replace: true` sends SIGTERM to 10001 and takes over
    alivePids.add(10003)
    const lock3 = await acquireDaemonLock({
      dshHome: tmpDir,
      hostId: 'mac-lock-test',
      pid: 10003,
      bootId: 'boot-10003',
      replace: true,
      isAliveImpl: isAliveMock,
      killImpl: killMock,
    })
    assert.equal(lock3.acquired, true)
    assert.equal(lock3.replacedPid, 10001)
    assert.ok(killedSignals.some(k => k.pid === 10001 && k.sig === 'SIGTERM'))

    // Old lock1.release() must NOT delete lock3's lockfile because bootId changed
    assert.equal(lock1.release(), false)
    assert.equal(lock3.release(), true)

    // 2. Server-Authoritative Approval Ledger (`settling` -> `failed` -> retry `settling` -> `settled`)
    let nowMs = 1_700_000_000_000
    const hub = new HubCore({ now: () => nowMs })
    const hostId = 'mac-ledger'
    const baseApproval = {
      code: 'AGY-LEDGER-1',
      agentId: 'agy-ide:conv-1',
      toolName: 'run_command',
      promptTitle: 'Allow git commit?',
      reason: 'git commit -m test',
    }
    hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-a', bootEpochMs: nowMs, seq: 1, capturedAt: nowMs },
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-1',
            title: '提交代码',
            status: 'approval',
            turnState: 'approval',
            pendingApproval: baseApproval,
            transcript: [{ role: 'user', text: '提交' }],
          },
        ],
        approvals: [baseApproval],
      },
    })

    // User clicks Approve on mobile -> enters `settling` state (45s TTL)
    const queuedApprove = hub.queueCommand(hostId, {
      type: 'approval',
      code: 'AGY-LEDGER-1',
      agentId: 'agy-ide:conv-1',
      allow: true,
      optionIndex: 1,
    })
    assert.equal(queuedApprove.ok, true)

    let state = hub.getFullState()
    let hostView = state.hosts.find(h => h.hostId === hostId)
    assert.equal(hostView.bridgeState.approvals.length, 1)
    assert.equal(hostView.bridgeState.approvals[0].settling, true)
    assert.equal(hostView.bridgeState.approvals[0].settlingDecision, 'approve')
    assert.equal(hostView.bridgeState.tasks[0].pendingApproval.settling, true)

    // Host sends a heartbeat BEFORE executing the approval (snapshot still has AGY-LEDGER-1) -> must stay `settling: true`, no bounce-back!
    nowMs += 1500
    const hbPull = hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-a', bootEpochMs: nowMs - 1500, seq: 2, capturedAt: nowMs },
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-1',
            title: '提交代码',
            status: 'approval',
            turnState: 'approval',
            pendingApproval: baseApproval,
            transcript: [{ role: 'user', text: '提交' }],
          },
        ],
        approvals: [baseApproval],
      },
    })
    assert.equal(hbPull.commands.length, 1)
    state = hub.getFullState()
    hostView = state.hosts.find(h => h.hostId === hostId)
    assert.equal(hostView.bridgeState.approvals[0].settling, true)

    // Suppose host reports failure (`ok: false`) -> transitions to `failed` with visible `lastError`
    nowMs += 500
    hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-a', bootEpochMs: nowMs - 2000, seq: 3, capturedAt: nowMs },
      commandResults: [
        {
          id: queuedApprove.command.id,
          type: 'approval',
          code: 'AGY-LEDGER-1',
          ok: false,
          error: 'Connect-RPC 端口未响应',
        },
      ],
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-1',
            title: '提交代码',
            status: 'approval',
            turnState: 'approval',
            pendingApproval: baseApproval,
            transcript: [{ role: 'user', text: '提交' }],
          },
        ],
        approvals: [baseApproval],
      },
    })
    state = hub.getFullState()
    hostView = state.hosts.find(h => h.hostId === hostId)
    assert.equal(hostView.bridgeState.approvals[0].settling, false)
    assert.equal(hostView.bridgeState.approvals[0].lastError, 'Connect-RPC 端口未响应')

    // User retries Approve -> host reports `ok: true` -> settled & removed even if snapshot momentarily still carries it
    const retryApprove = hub.queueCommand(hostId, {
      type: 'approval',
      code: 'AGY-LEDGER-1',
      agentId: 'agy-ide:conv-1',
      allow: true,
      optionIndex: 1,
    })
    nowMs += 500
    hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-a', bootEpochMs: nowMs - 2500, seq: 4, capturedAt: nowMs },
      commandResults: [
        {
          id: retryApprove.command.id,
          type: 'approval',
          code: 'AGY-LEDGER-1',
          ok: true,
        },
      ],
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-1',
            title: '提交代码',
            status: 'approval',
            turnState: 'approval',
            pendingApproval: baseApproval,
            transcript: [{ role: 'user', text: '提交' }],
          },
        ],
        approvals: [baseApproval],
      },
    })
    state = hub.getFullState()
    hostView = state.hosts.find(h => h.hostId === hostId)
    assert.equal(hostView.bridgeState.approvals.length, 0)
    assert.equal(hostView.bridgeState.tasks[0].pendingApproval, null)
    assert.equal(hostView.bridgeState.tasks[0].status, 'running')

    // 3. Anti-Rollback `syncMeta`: out-of-order seq ignored, daemon restart with new bootId accepted
    const staleHb = hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-a', bootEpochMs: nowMs - 2500, seq: 3, capturedAt: nowMs - 500 },
      bridgeState: {
        tasks: [{ id: 'stale-task', title: '旧包不应覆盖' }],
        approvals: [],
      },
    })
    assert.equal(staleHb.staleSnapshotIgnored, true)
    assert.equal(hub.getFullState().hosts.find(h => h.hostId === hostId).bridgeState.tasks[0].id, 'agy-ide:conv-1')

    // Daemon restarts (`boot-b`, `seq: 1`, newer `bootEpochMs`) -> must be accepted!
    nowMs += 2000
    const restartHb = hub.handleHeartbeat({
      hostId,
      hostName: 'Mac Ledger',
      syncMeta: { bootId: 'boot-b', bootEpochMs: nowMs, seq: 1, capturedAt: nowMs },
      bridgeState: {
        tasks: [{ id: 'fresh-after-restart', title: '重启后新任务', status: 'idle' }],
        approvals: [],
      },
    })
    assert.equal(restartHb.staleSnapshotIgnored, false)
    assert.equal(
      hub.getFullState().hosts.find(h => h.hostId === hostId).bridgeState.tasks[0].id,
      'fresh-after-restart',
    )

    // 4. 5-second Hysteresis Window (`applyStateHysteresis`)
    const hCache = new Map()
    const tHigh = 10_000
    const highSession = applyStateHysteresis(
      {
        id: 'agy-ide:hyst-1',
        status: 'approval',
        turnState: 'approval',
        statusLabel: '⏳ 待审批',
        lastStepIndex: 4,
        transcript: [{ role: 'user', text: 'test' }],
        pendingApproval: { code: 'AGY-HYST-4' },
        stateMeta: { source: 'ls-rpc', observedAt: tHigh, confidence: 'high' },
      },
      hCache,
      tHigh,
    )
    assert.equal(highSession.status, 'approval')

    // 2.5s later (within 5s window), low-confidence mtime-decay tries to flip it to idle -> blocked!
    const lowWithinWindow = applyStateHysteresis(
      {
        id: 'agy-ide:hyst-1',
        status: 'idle',
        turnState: 'idle',
        statusLabel: '已完成',
        lastStepIndex: 4,
        transcript: [{ role: 'user', text: 'test' }],
        pendingApproval: null,
        stateMeta: { source: 'mtime-decay', observedAt: tHigh + 2500, confidence: 'low' },
      },
      hCache,
      tHigh + 2500,
    )
    assert.equal(lowWithinWindow.status, 'approval')
    assert.equal(lowWithinWindow.pendingApproval?.code, 'AGY-HYST-4')
    assert.equal(lowWithinWindow.stateMeta.hysteresisProtected, true)

    // 6s later (past 5s window), low-confidence decay is allowed to settle to idle
    const lowAfterWindow = applyStateHysteresis(
      {
        id: 'agy-ide:hyst-1',
        status: 'idle',
        turnState: 'idle',
        statusLabel: '已完成',
        lastStepIndex: 4,
        transcript: [{ role: 'user', text: 'test' }],
        pendingApproval: null,
        stateMeta: { source: 'mtime-decay', observedAt: tHigh + 6000, confidence: 'low' },
      },
      hCache,
      tHigh + 6000,
    )
    assert.equal(lowAfterWindow.status, 'idle')

    // 5. Thin `HarnessRouter`: `observe-only` vs `idle-resumable` external adapter routing
    const router = new HarnessRouter()
    const promptedExternal = []
    router.registerAdapter({
      id: 'codex',
      label: 'Codex CLI',
      icon: '🧠',
      async listSessions() {
        return [
          {
            id: 'codex:active-tty-1',
            harness: 'codex',
            harnessLabel: 'Codex CLI',
            controlMode: 'observe-only',
            title: '终端正在运行的 Codex',
            status: 'running',
            cwd: '/Users/dev/proj',
            transcript: [{ role: 'user', text: '跑测试' }],
          },
          {
            id: 'codex:idle-2',
            harness: 'codex',
            harnessLabel: 'Codex CLI',
            controlMode: 'idle-resumable',
            title: '空闲可续跑的 Codex',
            status: 'idle',
            cwd: '/Users/dev/proj',
            transcript: [{ role: 'user', text: '已完成任务' }],
          },
        ]
      },
      async sendPrompt({ sessionId, text }) {
        promptedExternal.push({ sessionId, text })
        return { ok: true, sessionId, message: '已通过 codex exec resume 续跑' }
      },
    })

    const { fetchAdapter } = createHubServer({ hub, token: 'router-token' })
    const config = resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      hostId: 'mac-router',
      hostName: 'Mac Router',
      hubUrl: 'https://dsh-router.example.run.app',
      hubToken: 'router-token',
      dshHome: tmpDir,
      enableAntigravityIde: false,
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    })
    const bridge = new FeishuBridge({
      config,
      agents: { list: () => [], get: () => undefined },
      transport: makeMockTransport(),
    })
    const hubAgent = new HubAgent({
      config,
      bridge,
      transport: null,
      fetchImpl: fetchAdapter,
      harnessRouter: router,
    })
    await hubAgent.tick()

    const observeRes = await hubAgent.handleHubCommand({
      type: 'prompt',
      agentId: 'codex:active-tty-1',
      text: '试图插手独立终端',
    })
    assert.equal(observeRes.ok, false)
    assert.match(observeRes.error, /只读观测模式/)

    const resumeRes = await hubAgent.handleHubCommand({
      type: 'prompt',
      agentId: 'codex:idle-2',
      text: '继续优化代码',
    })
    assert.equal(resumeRes.ok, true)
    assert.equal(promptedExternal.length, 1)
    assert.equal(promptedExternal[0].sessionId, 'codex:idle-2')
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('Phase 2: CodexAdapter & ClaudeAdapter parse real JSONL schemas, detect controlMode, and resume via CLI', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-phase2-adapters-'))
  try {
    const codexHome = join(tmpDir, '.codex')
    const codexDayDir = join(codexHome, 'sessions', '2026', '05', '22')
    await mkdir(codexDayDir, { recursive: true })
    const fakeCodexBin = join(tmpDir, 'fake-codex')
    await writeFile(fakeCodexBin, '#!/bin/sh\nexit 0\n', { mode: 0o755 })

    const codexUuid = '019e4ec0-4edb-75c2-89c3-376ce1028246'
    await writeFile(
      join(codexHome, 'session_index.jsonl'),
      JSON.stringify({
        id: codexUuid,
        thread_name: '明确 AI Agent Hosting 边界',
        updated_at: '2026-05-22T08:15:23.726204Z',
      }) + '\n',
      'utf8',
    )
    const codexRolloutLines = [
      JSON.stringify({
        timestamp: '2026-05-22T08:14:46.306Z',
        type: 'session_meta',
        payload: { id: codexUuid, cwd: '/Users/dev/my-webapp', model_provider: 'openai' },
      }),
      JSON.stringify({
        timestamp: '2026-05-22T08:15:08.279Z',
        type: 'event_msg',
        payload: { type: 'user_message', message: '看看内容，理解一下我要做什么' },
      }),
      JSON.stringify({
        timestamp: '2026-05-22T08:15:26.824Z',
        type: 'event_msg',
        payload: { type: 'agent_message', message: '我理解你要做的是面向中国 AI 开发者的 Agent 一键发布平台。' },
      }),
      JSON.stringify({
        timestamp: '2026-05-22T08:15:26.863Z',
        type: 'event_msg',
        payload: { type: 'task_complete', turn_id: 'turn-1' },
      }),
    ]
    await writeFile(
      join(codexDayDir, `rollout-2026-05-22T16-14-46-${codexUuid}.jsonl`),
      codexRolloutLines.join('\n') + '\n',
      'utf8',
    )

    const claudeHome = join(tmpDir, '.claude')
    const claudeProjDir = join(claudeHome, 'projects', '-Users-dev-agent-demo')
    await mkdir(claudeProjDir, { recursive: true })
    const fakeClaudeBin = join(tmpDir, 'fake-claude')
    await writeFile(fakeClaudeBin, '#!/bin/sh\nexit 0\n', { mode: 0o755 })

    const claudeUuid = '7417154f-5cf2-498b-bdcf-380337e11411'
    const claudeLines = [
      JSON.stringify({
        type: 'user',
        sessionId: claudeUuid,
        cwd: '/Users/dev/agent-demo',
        timestamp: '2026-05-15T01:09:33.930Z',
        message: { role: 'user', content: '当前请求:\n写一个完整的Python数据分析脚本' },
      }),
      JSON.stringify({
        type: 'assistant',
        sessionId: claudeUuid,
        cwd: '/Users/dev/agent-demo',
        timestamp: '2026-05-15T01:10:12.108Z',
        message: {
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          content: [
            { type: 'thinking', thinking: '先设计 CSV 解析与统计模块' },
            { type: 'tool_use', name: 'write_file', input: { path: '/Users/dev/agent-demo/data_analysis.py' } },
            { type: 'text', text: '脚本已创建：data_analysis.py' },
          ],
        },
      }),
    ]
    await writeFile(join(claudeProjDir, `${claudeUuid}.jsonl`), claudeLines.join('\n') + '\n', 'utf8')

    const executedCmds = []
    const mockExec = async (bin, args) => {
      if (bin === 'ps') return { stdout: '' }
      executedCmds.push({ bin, args })
      return { stdout: '{"ok":true}\n' }
    }

    const codexAdapter = new CodexAdapter({
      codexHome,
      binaryPath: fakeCodexBin,
      execImpl: mockExec,
    })
    const claudeAdapter = new ClaudeAdapter({
      claudeHome,
      binaryPath: fakeClaudeBin,
      execImpl: mockExec,
    })

    const codexSessions = await codexAdapter.listSessions()
    assert.equal(codexSessions.length, 1)
    assert.equal(codexSessions[0].id, `codex:${codexUuid}`)
    assert.equal(codexSessions[0].title, '明确 AI Agent Hosting 边界')
    assert.equal(codexSessions[0].controlMode, 'idle-resumable')
    assert.equal(codexSessions[0].cwd, '/Users/dev/my-webapp')
    assert.equal(codexSessions[0].transcript.length, 2)

    const claudeSessions = await claudeAdapter.listSessions()
    assert.equal(claudeSessions.length, 1)
    assert.equal(claudeSessions[0].id, `claude:${claudeUuid}`)
    assert.equal(claudeSessions[0].title, '写一个完整的Python数据分析脚本')
    assert.equal(claudeSessions[0].controlMode, 'idle-resumable')
    assert.equal(claudeSessions[0].transcript.length, 2)
    assert.deepEqual(claudeSessions[0].transcript[1].tools, ['write_file'])

    const codexRes = await codexAdapter.sendPrompt({
      sessionId: `codex:${codexUuid}`,
      text: '补充 Dockerfile 示例',
      cwd: '/Users/dev/my-webapp',
    })
    assert.equal(codexRes.ok, true)
    assert.equal(executedCmds[0].bin, fakeCodexBin)
    assert.deepEqual(executedCmds[0].args.slice(0, 4), ['exec', 'resume', codexUuid, '补充 Dockerfile 示例'])

    const claudeRes = await claudeAdapter.sendPrompt({
      sessionId: `claude:${claudeUuid}`,
      text: '增加箱线图支持',
      cwd: '/Users/dev/agent-demo',
    })
    assert.equal(claudeRes.ok, true)
    assert.equal(executedCmds[1].bin, fakeClaudeBin)
    assert.deepEqual(executedCmds[1].args, ['--resume', claudeUuid, '-p', '增加箱线图支持'])

    const codexNewRes = await codexAdapter.createSession({
      prompt: '初始化 FastAPI Agent Hosting 骨架',
      cwd: '/Users/dev/my-webapp',
    })
    assert.equal(codexNewRes.ok, true)
    assert.equal(executedCmds[2].bin, fakeCodexBin)
    assert.deepEqual(executedCmds[2].args.slice(0, 2), ['exec', '初始化 FastAPI Agent Hosting 骨架'])

    const claudeNewRes = await claudeAdapter.createSession({
      prompt: '编写单元测试',
      cwd: '/Users/dev/agent-demo',
    })
    assert.equal(claudeNewRes.ok, true)
    assert.equal(executedCmds[3].bin, fakeClaudeBin)
    assert.deepEqual(executedCmds[3].args, ['-p', '编写单元测试'])

    // Verify background spawn lifecycle (managed while running -> stopSession SIGTERM -> deleteSession)
    let killedSignal = ''
    const spawnCodex = new CodexAdapter({
      codexHome,
      binaryPath: fakeCodexBin,
      spawnImpl: () => ({
        on() { },
        kill(sig) {
          killedSignal = sig
        },
      }),
    })
    const bgRes = await spawnCodex.sendPrompt({
      sessionId: `codex:${codexUuid}`,
      text: '后台运行长任务',
      cwd: '/Users/dev/my-webapp',
    })
    assert.equal(bgRes.ok, true)
    const runningList = await spawnCodex.listSessions()
    assert.equal(runningList[0].status, 'running')
    assert.equal(runningList[0].controlMode, 'managed')

    const stopRes = await spawnCodex.stopSession({ sessionId: `codex:${codexUuid}` })
    assert.equal(stopRes.ok, true)
    assert.equal(killedSignal, 'SIGTERM')

    await spawnCodex.deleteSession({ sessionId: `codex:${codexUuid}` })
    const afterDelete = await spawnCodex.listSessions()
    assert.equal(afterDelete.length, 0)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('antigravity-ide walkthrough & artifacts: surfaces tool-call and disk walkthroughs across multi-step turns and wire compaction', async () => {
  const tmpBrain = await mkdtemp(join(tmpdir(), 'dsh-agy-walkthrough-'))
  try {
    const convId = '0c207017-d77d-4e20-b6f6-4476dd169553'
    const convDir = join(tmpBrain, convId)
    const logsDir = join(convDir, '.system_generated', 'logs')
    await mkdir(logsDir, { recursive: true })

    const walkthroughPath = join(convDir, 'walkthrough.md')
    await writeFile(walkthroughPath, '# Walkthrough\n\nVerified all mobile fixes.\n', 'utf8')
    await writeFile(
      `${walkthroughPath}.metadata.json`,
      JSON.stringify({
        artifactType: 'ARTIFACT_TYPE_WALKTHROUGH',
        summary: 'Complete verification walkthrough with screenshots.',
        updatedAt: '2026-11-10T05:00:00Z',
      }),
      'utf8',
    )

    const t0 = Date.now() - 60_000
    // Simulate a multi-step turn: USER_INPUT -> write_file(walkthrough.md) -> 8 run_command steps -> final PLANNER_RESPONSE without explicit link
    const steps = [
      JSON.stringify({
        step_index: 1,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: new Date(t0).toISOString(),
        content: '<USER_REQUEST>\n请完成修改并生成 walkthrough\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: new Date(t0 + 1000).toISOString(),
        thinking: '先写 walkthrough.md',
        content: '',
        tool_calls: [
          {
            id: 'tc-wt',
            name: 'write_file',
            arguments: JSON.stringify({
              Path: walkthroughPath,
              Content: '# Walkthrough\n\nVerified all mobile fixes.\n',
              Overwrite: true,
              ArtifactMetadata: {
                Summary: 'Complete verification walkthrough with screenshots.',
                UserFacing: true,
                RequestFeedback: false,
              },
            }),
          },
        ],
      }),
    ]
    for (let k = 0; k < 8; k += 1) {
      steps.push(
        JSON.stringify({
          step_index: 3 + k * 2,
          type: 'PLANNER_RESPONSE',
          status: 'DONE',
          created_at: new Date(t0 + 2000 + k * 500).toISOString(),
          thinking: `执行验证步骤 ${k + 1}`,
          content: '',
          tool_calls: [
            {
              id: `tc-cmd-${k}`,
              name: 'run_command',
              arguments: JSON.stringify({
                CommandLine: `echo step-${k + 1}`,
                BypassSandbox: false,
                toolSummary: `Verify step ${k + 1}`,
              }),
            },
          ],
        }),
      )
    }
    steps.push(
      JSON.stringify({
        step_index: 20,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: new Date(t0 + 10_000).toISOString(),
        thinking: '全部验证通过，汇报结果。',
        content: '所有修改已完成并通过验证，详情请查看 Walkthrough。',
      }),
    )

    await writeFile(join(logsDir, 'transcript.jsonl'), steps.join('\n') + '\n', 'utf8')

    const sessions = await loadAntigravityIdeSessions({
      brainDirs: [tmpBrain],
      maxSessions: 10,
      maxMessages: 25,
    })
    assert.equal(sessions.length, 1)
    const sess = sessions[0]
    assert.ok(Array.isArray(sess.artifacts))
    assert.equal(sess.artifacts.length, 1)
    assert.equal(sess.artifacts[0].kind, 'walkthrough')
    assert.equal(sess.artifacts[0].name, 'walkthrough.md')
    assert.equal(sess.artifacts[0].path, walkthroughPath)
    assert.match(sess.artifacts[0].summary, /Complete verification walkthrough/)

    // Consecutive non-waiting assistant steps in the turn are merged into 1 assistant message containing the walkthrough link & artifact card
    assert.equal(sess.transcript.length, 2)
    const asstMsg = sess.transcript[1]
    assert.equal(asstMsg.role, 'assistant')
    assert.ok(asstMsg.text.includes(walkthroughPath))
    assert.ok(Array.isArray(asstMsg.artifacts))
    assert.equal(asstMsg.artifacts[0].path, walkthroughPath)

    // Verify HubCore wire compaction preserves session.artifacts and message.artifacts
    const hub = new HubCore()
    const compacted = hub.compactBridgeStateForWire({
      tasks: [sess],
      approvals: [],
      workspaces: [],
    })
    assert.equal(compacted.tasks[0].artifacts.length, 1)
    assert.equal(compacted.tasks[0].transcript.at(-1).artifacts[0].path, walkthroughPath)

    // Verify background image hydration (`silentPreview: true`) caches image blob without overwriting `host.lastFilePreview`
    hub.handleHeartbeat({
      hostId: 'mac-wt',
      hostName: 'Walkthrough Mac',
      bridgeState: { tasks: [sess], approvals: [], workspaces: [] },
    })
    hub.onCommandResult('mac-wt', {
      id: 'cmd-wt-doc',
      type: 'read_file',
      ok: true,
      relPath: walkthroughPath,
      name: 'walkthrough.md',
      ext: '.md',
      size: 42,
      kind: 'text',
      mime: 'text/markdown',
      content: '# Walkthrough\n\n![img](/tmp/shot.png)\n',
    })
    assert.equal(hub.getFullState().hosts[0].lastFilePreview.name, 'walkthrough.md')

    const silentCmd = hub.queueCommand('mac-wt', {
      type: 'read_file',
      relPath: '/tmp/shot.png',
      silentPreview: true,
    })
    hub.onCommandResult('mac-wt', {
      id: silentCmd.command.id,
      type: 'read_file',
      ok: true,
      relPath: '/tmp/shot.png',
      name: 'shot.png',
      ext: '.png',
      size: 16,
      kind: 'image',
      mime: 'image/png',
      dataBase64: Buffer.from('fake-png-bytes').toString('base64'),
    })
    // `host.lastFilePreview` must remain `walkthrough.md`, while `/tmp/shot.png` is still cached in `filePreviewHistory`!
    assert.equal(hub.getFullState().hosts[0].lastFilePreview.name, 'walkthrough.md')
    assert.equal(hub.getFilePreviewBlob('mac-wt', null, '/tmp/shot.png')?.name, 'shot.png')

    // Verify per-conversation liveModel resolves placeholder enum to human-readable label
    const parsedWithModel = parseAntigravityTranscript(steps.join('\n'), {
      conversationId: convId,
      liveModel: 'MODEL_PLACEHOLDER_M402',
    })
    assert.equal(parsedWithModel.model, 'Claude Opus 5.5 (High)')
  } finally {
    await rm(tmpBrain, { recursive: true, force: true })
  }
})

test('Phase 3 Deep Integration: Codex app-server JSON-RPC & WorkBuddy ACP HTTP+SSE full managed lifecycle (streaming, steer, approvals, questions, model discovery)', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-codex-wb-deep-'))
  try {
    const codexHome = join(tmpDir, 'codex-home')
    const wbHome = join(tmpDir, 'workbuddy-home')
    await mkdir(codexHome, { recursive: true })
    await mkdir(wbHome, { recursive: true })

    // 1. Test Codex model discovery from config.toml & models_cache.json
    await writeFile(
      join(codexHome, 'config.toml'),
      'model = "gpt-5.5"\nmodel_reasoning_effort = "xhigh"\n',
      'utf8',
    )
    await writeFile(
      join(codexHome, 'models_cache.json'),
      JSON.stringify({
        models: [
          { slug: 'gpt-5.5', display_name: 'GPT-5.5 Flagship', visibility: 'list' },
          { slug: 'gpt-5.4-mini', display_name: 'GPT-5.4 Mini', visibility: 'list' },
        ],
      }),
      'utf8',
    )
    const codexCatalog = discoverCodexModels(codexHome)
    assert.equal(codexCatalog.defaultModel, 'gpt-5.5')
    assert.match(codexCatalog.defaultLabel, /GPT-5.5 Flagship \(xhigh\)/)
    assert.ok(codexCatalog.models.some(m => m.value === 'gpt-5.5'))

    // 2. Test CodexAppServerClient & CodexAdapter over bidirectional stdio JSON-RPC 2.0
    const fakeCodexBin = join(codexHome, 'codex')
    await writeFile(fakeCodexBin, '#!/bin/sh\n', 'utf8')

    let serverStdin = null
    let serverStdout = null
    const receivedRpcRequests = []
    const receivedRpcResponses = []

    const mockCodexSpawn = () => {
      serverStdin = new PassThrough()
      serverStdout = new PassThrough()
      const stderr = new PassThrough()
      const proc = new EventEmitter()
      proc.stdin = serverStdin
      proc.stdout = serverStdout
      proc.stderr = stderr
      proc.killed = false
      proc.kill = () => {
        proc.killed = true
        proc.emit('exit', 0)
      }

      let buf = ''
      serverStdin.on('data', chunk => {
        buf += chunk.toString('utf8')
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          const msg = JSON.parse(line)
          if (msg.method && msg.id !== undefined) {
            receivedRpcRequests.push(msg)
            if (msg.method === 'initialize') {
              serverStdout.write(`${JSON.stringify({ id: msg.id, result: { userAgent: 'codex-test/1.0' } })}\n`)
            } else if (msg.method === 'thread/start') {
              serverStdout.write(
                `${JSON.stringify({
                  id: msg.id,
                  result: {
                    thread: { id: 'thread-cdx-001', cwd: msg.params.cwd },
                    cwd: msg.params.cwd,
                    model: msg.params.model || 'gpt-5.5',
                  },
                })}\n`,
              )
            } else if (msg.method === 'turn/start') {
              serverStdout.write(
                `${JSON.stringify({
                  id: msg.id,
                  result: { turn: { id: 'turn-cdx-101', status: 'inProgress', items: [] } },
                })}\n`,
              )
            } else if (msg.method === 'turn/steer') {
              serverStdout.write(
                `${JSON.stringify({
                  id: msg.id,
                  result: { turnId: msg.params.expectedTurnId },
                })}\n`,
              )
            } else if (msg.method === 'turn/interrupt' || msg.method === 'thread/name/set') {
              serverStdout.write(`${JSON.stringify({ id: msg.id, result: {} })}\n`)
            }
          } else if (msg.id !== undefined && msg.result !== undefined) {
            receivedRpcResponses.push(msg)
          }
        }
      })
      return proc
    }

    const codexAdapter = new CodexAdapter({
      codexHome,
      binaryPath: fakeCodexBin,
      spawnImpl: mockCodexSpawn,
      useAppServer: true,
    })

    // Start new session via `codex app-server`
    const createdCdx = await codexAdapter.createSession({
      title: '重构支付网关',
      prompt: '请帮我重构支付网关并添加重试测试',
      cwd: '/Users/dev/pay',
      model: 'gpt-5.5',
    })
    assert.equal(createdCdx.ok, true)
    assert.equal(createdCdx.agentId, 'codex:thread-cdx-001')

    // Simulate streaming reasoning & agent message delta from `codex app-server`
    serverStdout.write(
      `${JSON.stringify({
        method: 'item/reasoning/summaryTextDelta',
        params: { threadId: 'thread-cdx-001', itemId: 'item-msg-1', delta: '正在分析支付模块依赖...' },
      })}\n`,
    )
    serverStdout.write(
      `${JSON.stringify({
        method: 'item/agentMessage/delta',
        params: { threadId: 'thread-cdx-001', itemId: 'item-msg-1', delta: '已完成接口梳理，准备执行测试。' },
      })}\n`,
    )

    let cdxSessions = await codexAdapter.listSessions()
    assert.equal(cdxSessions.length, 1)
    assert.equal(cdxSessions[0].status, 'running')
    assert.equal(cdxSessions[0].controlMode, 'managed')
    assert.match(cdxSessions[0].transcript.at(-1).thinking, /正在分析支付模块依赖/)
    assert.match(cdxSessions[0].transcript.at(-1).text, /已完成接口梳理/)

    // Mid-turn steer while turn-cdx-101 is active
    const steerCdx = await codexAdapter.sendPrompt({
      sessionId: 'codex:thread-cdx-001',
      text: '顺便加上幂等键校验',
      mode: 'steer',
    })
    assert.equal(steerCdx.ok, true)
    assert.equal(steerCdx.steered, true)
    assert.ok(receivedRpcRequests.some(r => r.method === 'turn/steer' && r.params.expectedTurnId === 'turn-cdx-101'))

    // Simulate command execution approval request from `codex app-server`
    serverStdout.write(
      `${JSON.stringify({
        id: 501,
        method: 'item/commandExecution/requestApproval',
        params: {
          threadId: 'thread-cdx-001',
          turnId: 'turn-cdx-101',
          itemId: 'cmd-99',
          command: 'npm run test:integration',
          cwd: '/Users/dev/pay',
          reason: '需要运行集成测试验证幂等键',
        },
      })}\n`,
    )

    cdxSessions = await codexAdapter.listSessions()
    assert.equal(cdxSessions[0].status, 'approval')
    assert.ok(cdxSessions[0].pendingApproval?.code.startsWith('CDX-'))
    const cdxApprovalCode = cdxSessions[0].pendingApproval.code

    // Approve from mobile with optionIndex=2 (acceptForSession)
    const approveCdxRes = await codexAdapter.resolveApproval({
      sessionId: 'codex:thread-cdx-001',
      code: cdxApprovalCode,
      allow: true,
      optionIndex: 2,
    })
    assert.equal(approveCdxRes.ok, true)
    assert.equal(approveCdxRes.decision, 'allowed-session')
    assert.deepEqual(receivedRpcResponses.at(-1), {
      jsonrpc: '2.0',
      id: 501,
      result: { decision: 'acceptForSession' },
    })

    // Simulate multi-choice question (`item/tool/requestUserInput`) from `codex app-server`
    serverStdout.write(
      `${JSON.stringify({
        id: 502,
        method: 'item/tool/requestUserInput',
        params: {
          threadId: 'thread-cdx-001',
          turnId: 'turn-cdx-101',
          itemId: 'ask-1',
          questions: [
            {
              id: 'storage_engine',
              header: '幂等存储引擎',
              question: '请选择幂等键存储方案：',
              options: [
                { label: 'Redis Cluster', description: '低延迟分布式缓存' },
                { label: 'PostgreSQL Unique Index', description: '事务强一致' },
              ],
            },
          ],
        },
      })}\n`,
    )

    cdxSessions = await codexAdapter.listSessions()
    assert.equal(cdxSessions[0].status, 'approval')
    assert.equal(cdxSessions[0].pendingApproval?.kind, 'question')
    const cdxQCode = cdxSessions[0].pendingApproval.code
    assert.ok(cdxQCode.startsWith('CDXQ-'))

    const answerCdxRes = await codexAdapter.resolveApproval({
      sessionId: 'codex:thread-cdx-001',
      code: cdxQCode,
      allow: true,
      answers: [['Redis Cluster']],
    })
    assert.equal(answerCdxRes.ok, true)
    assert.deepEqual(receivedRpcResponses.at(-1), {
      jsonrpc: '2.0',
      id: 502,
      result: {
        answers: {
          storage_engine: { answers: ['Redis Cluster'] },
        },
      },
    })

    // Interrupt turn
    const stopCdxRes = await codexAdapter.stopSession({ sessionId: 'codex:thread-cdx-001' })
    assert.equal(stopCdxRes.ok, true)
    assert.ok(receivedRpcRequests.some(r => r.method === 'turn/interrupt'))

    // 3. Test WorkBuddyAdapter & WorkBuddyAcpClient (HTTP + SSE ACP protocol)
    await writeFile(
      join(wbHome, 'sessions.json'),
      JSON.stringify([
        {
          id: 'wb-sess-01',
          title: '小程序登录鉴权改造',
          cwd: '/Users/dev/miniapp',
          model: 'deepseek-v3.1',
          status: 'idle',
          updated_at: Date.now() - 5000,
        },
      ]),
      'utf8',
    )

    let ssePush = null
    const wbRpcCalls = []
    const wbRpcResponses = []

    const wbAdapter = new WorkBuddyAdapter({
      workbuddyHome: wbHome,
      acpEndpoint: 'http://127.0.0.1:43999/api/v1/acp',
      openSseImpl: ({ onPayload }) => {
        ssePush = onPayload
        return { destroy() { } }
      },
      fetchImpl: async (url, init = {}) => {
        const u = String(url)
        if (u.includes('/api/v1/sessions/wb-sess-01/replay')) {
          return new Response(
            JSON.stringify({
              data: {
                events: [
                  {
                    timestamp: Date.now() - 10_000,
                    update: { sessionUpdate: 'user_message', content: '请检查微信登录 token 刷新逻辑' },
                  },
                  {
                    timestamp: Date.now() - 8000,
                    update: { sessionUpdate: 'agent_message', content: '已定位到 refreshToken 过期未续期问题。' },
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        if (u.endsWith('/connect')) {
          return new Response(
            JSON.stringify({ connectionId: 'wb-conn-test', sessionToken: 'wb-tok-test' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        const body = init.body ? JSON.parse(init.body) : {}
        if (body.method) {
          wbRpcCalls.push(body)
          if (body.method === 'initialize') {
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: 1 } }), { status: 200 })
          }
          if (body.method === 'session/new') {
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { sessionId: 'wb-sess-02' } }), { status: 200 })
          }
          if (body.method === 'session/prompt') {
            return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { content: '已完成改造。' } }), { status: 200 })
          }
          return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: {} }), { status: 200 })
        }
        if (body.id !== undefined && body.result !== undefined) {
          wbRpcResponses.push(body)
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        }
        return new Response('{}', { status: 200 })
      },
    })

    // List persisted + replayed sessions
    let wbSessions = await wbAdapter.listSessions()
    assert.equal(wbSessions.length, 1)
    assert.equal(wbSessions[0].id, 'workbuddy:wb-sess-01')
    assert.equal(wbSessions[0].harness, 'workbuddy')
    assert.equal(wbSessions[0].transcript.length, 2)
    assert.match(wbSessions[0].transcript[1].text, /refreshToken/)

    // Start new session in WorkBuddy
    const startWb = await wbAdapter.createSession({
      title: '接入微信支付回调',
      prompt: '实现微信支付 V3 签名验证中间件',
      cwd: '/Users/dev/miniapp',
      model: 'deepseek-v3.1',
    })
    assert.equal(startWb.ok, true)
    assert.equal(startWb.agentId, 'workbuddy:wb-sess-02')

    // Stream thought & message chunks over SSE
    ssePush({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'wb-sess-02',
        update: { sessionUpdate: 'agent_thought_chunk', content: '先校验 Wechatpay-Signature 头...' },
      },
    })
    ssePush({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId: 'wb-sess-02',
        update: { sessionUpdate: 'agent_message_chunk', content: '正在编写验签中间件...' },
      },
    })

    // Steer running WorkBuddy session
    const steerWb = await wbAdapter.steer({
      sessionId: 'workbuddy:wb-sess-02',
      prompt: '请同时支持平台证书公钥与微信支付公钥两种模式',
    })
    assert.equal(steerWb.ok, true)
    assert.equal(steerWb.steered, true)
    assert.ok(wbRpcCalls.some(c => c.method === 'session/request_yield'))
    assert.ok(wbRpcCalls.some(c => c.method === 'session/enqueue_message'))

    // Simulate `session/request_permission` over SSE
    ssePush({
      jsonrpc: '2.0',
      id: 701,
      method: 'session/request_permission',
      params: {
        sessionId: 'wb-sess-02',
        toolCall: {
          toolCallId: 'tc-wb-1',
          title: 'Execute Bash: npm test',
          kind: 'execute',
          rawInput: { command: 'npm test' },
        },
        options: [
          { optionId: 'allow_once', name: 'Allow Once', kind: 'allow_once' },
          { optionId: 'reject_once', name: 'Reject', kind: 'reject_once' },
        ],
      },
    })

    wbSessions = await wbAdapter.listSessions()
    const sess02 = wbSessions.find(s => s.id === 'workbuddy:wb-sess-02')
    assert.equal(sess02.status, 'approval')
    assert.ok(sess02.pendingApproval?.code.startsWith('WB-'))
    const wbPermCode = sess02.pendingApproval.code

    const resolveWbPerm = await wbAdapter.resolveApproval({
      sessionId: 'workbuddy:wb-sess-02',
      code: wbPermCode,
      allow: true,
      optionIndex: 1,
    })
    assert.equal(resolveWbPerm.ok, true)
    assert.deepEqual(wbRpcResponses.at(-1), {
      jsonrpc: '2.0',
      id: 701,
      result: { outcome: { outcome: 'selected', optionId: 'allow_once' } },
    })

    // Simulate `_codebuddy.ai/question` over SSE
    ssePush({
      jsonrpc: '2.0',
      id: 702,
      method: '_codebuddy.ai/question',
      params: {
        sessionId: 'wb-sess-02',
        toolCallId: 'tc-wb-q1',
        questions: [
          {
            header: '回调框架',
            question: '你希望使用哪个 Web 框架挂载回调路由？',
            options: [{ label: 'Fastify' }, { label: 'Express' }],
          },
        ],
      },
    })

    wbSessions = await wbAdapter.listSessions()
    const sess02AfterQ = wbSessions.find(s => s.id === 'workbuddy:wb-sess-02')
    assert.equal(sess02AfterQ.status, 'approval')
    assert.equal(sess02AfterQ.pendingApproval?.kind, 'question')
    const wbQCode = sess02AfterQ.pendingApproval.code
    assert.ok(wbQCode.startsWith('WBQ-'))

    const resolveWbQ = await wbAdapter.resolveApproval({
      sessionId: 'workbuddy:wb-sess-02',
      code: wbQCode,
      allow: true,
      answers: [['Fastify']],
    })
    assert.equal(resolveWbQ.ok, true)
    assert.ok(
      wbRpcCalls.some(
        c =>
          c.method === '_codebuddy.ai/resolveInterruption' &&
          c.params.decision === 'approve' &&
          c.params.answers['回调框架']?.[0] === 'Fastify',
      ),
    )

    wbAdapter.shutdown()
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('Fast FS Tunnel & Mobile Media Streaming (Plan 1 + Plan 2): HTTP 206 Range video, ETag 304, read-only mediaTicket, smart sips thumb & walkthrough prewarm', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-fast-fs-media-'))
  try {
    const wsDir = join(tmpDir, 'workspace')
    const dshHome = join(tmpDir, 'dsh-home')
    const brainDir = join(tmpDir, 'brain', 'conv-media-01')
    await mkdir(join(wsDir, 'assets'), { recursive: true })
    await mkdir(dshHome, { recursive: true })
    await mkdir(brainDir, { recursive: true })

    // 1. Create sample MP4 bytes (fake ftyp mp42 box + deterministic payload), code file, and walkthrough.md
    const mp4Buf = Buffer.alloc(4096)
    Buffer.from('00000018667479706d703432', 'hex').copy(mp4Buf, 0)
    for (let i = 12; i < mp4Buf.length; i += 1) mp4Buf[i] = i % 251
    await writeFile(join(wsDir, 'assets', 'demo.mp4'), mp4Buf)
    await writeFile(join(wsDir, 'assets', 'clip.mov'), mp4Buf.subarray(0, 512))
    await writeFile(join(wsDir, 'src-note.md'), '# Fast Read\nToken sk-1234567890abcdefghijklmnop should be redacted\n', 'utf8')
    const wtPath = join(brainDir, 'walkthrough.md')
    await writeFile(wtPath, '# Walkthrough Prewarmed\nInstant 0ms mobile open!\n', 'utf8')

    // 2. Unit-check parseHttpByteRange & PNG dimension parser
    assert.deepEqual(parseHttpByteRange('bytes=0-1', 4096), { ok: true, start: 0, end: 1 })
    assert.deepEqual(parseHttpByteRange('bytes=100-', 4096, 1024), { ok: true, start: 100, end: 1123 })
    assert.deepEqual(parseHttpByteRange('bytes=-16', 4096), { ok: true, start: 4080, end: 4095 })
    assert.equal(parseHttpByteRange('bytes=5000-5010', 4096).unsatisfied, true)

    // Construct a minimal PNG header with width=750, height=3200 (tall screenshot)
    const tallPngHeader = Buffer.alloc(32)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]).copy(tallPngHeader, 0)
    tallPngHeader.writeUInt32BE(750, 16)
    tallPngHeader.writeUInt32BE(3200, 20)
    assert.deepEqual(parseImageDimensions(tallPngHeader), { width: 750, height: 3200 })

    // 3. Spin up Hub + HubAgent (with walkthrough artifact on live session)
    const hub = new HubCore()
    const { fetchAdapter } = createHubServer({ hub, token: 'master-secret-999', requireToken: true })
    const liveTask = makeAgent('sess-media-1', '移动端视频与秒开测试')
    liveTask.session.header.cwd = wsDir
    const cfg = resolveConfig({
      appId: APP_ID,
      appSecret: 'sec_xxx',
      hubUrl: 'http://hub.local',
      hubToken: 'master-secret-999',
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      dshHome,
      antigravityBrainDirs: [join(tmpDir, 'brain')],
      enableAntigravityIde: false,
      enableExternalHarnesses: false,
    })
    const bridge = new FeishuBridge({
      config: cfg,
      agents: {
        list: () => [liveTask],
        get: id => (id === liveTask.id ? liveTask : undefined),
      },
      sender: { sendText: async () => ({}), sendCard: async () => ({}), updateCard: async () => ({}) },
      audit: { write: async () => { } },
      logger: { info() { }, warn() { }, error() { } },
    })
    const hostAgent = new HubAgent({
      config: cfg,
      bridge,
      fetchImpl: fetchAdapter,
    })
    // Inject walkthrough artifact on cachedAgySessions / bridge task via prewarm check
    const origCollect = bridge.getSnapshotState.bind(bridge)
    bridge.getSnapshotState = () => {
      const s = origCollect()
      if (s.tasks?.[0]) {
        s.tasks[0].artifacts = [{ name: 'walkthrough.md', path: wtPath, mtimeMs: 1700000001000 }]
      }
      return s
    }

    await hostAgent.tick()

    // 4. Verify mediaTicket is issued in /api/state and enforces strict read-only boundary
    const stateRes = await fetchAdapter('http://hub.local/api/state', {
      headers: { authorization: 'Bearer master-secret-999' },
    })
    assert.equal(stateRes.status, 200)
    const stateJson = await stateRes.json()
    assert.match(stateJson.mediaTicket || '', /^mt1\.\d+\.[A-Za-z0-9_-]+$/)
    const mt = stateJson.mediaTicket

    // Rejects mediaTicket on admin/write endpoints!
    const forbiddenCmd = await fetchAdapter(`http://hub.local/api/hosts/mac-studio/command?mt=${encodeURIComponent(mt)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'prompt', agentId: liveTask.id, text: 'hack' }),
    })
    assert.equal(forbiddenCmd.status, 401)
    const forbiddenState = await fetchAdapter(`http://hub.local/api/state?mt=${encodeURIComponent(mt)}`)
    assert.equal(forbiddenState.status, 401)

    // 5. Walkthrough prewarm hits Hub hotCache in 0ms WITHOUT needing another hostAgent.tick()!
    const wtReadRes = await fetchAdapter(
      `http://hub.local/api/hosts/mac-studio/fs/read?path=${encodeURIComponent(wtPath)}&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
    )
    assert.equal(wtReadRes.status, 200)
    const wtReadJson = await wtReadRes.json()
    assert.equal(wtReadJson.ok, true)
    assert.equal(wtReadJson.hotCache, true)
    assert.match(wtReadJson.content, /Walkthrough Prewarmed/)

    // 6. Fast FS list & video read & HTTP 206 Partial Content Range streaming
    const listPromise = fetchAdapter(
      `http://hub.local/api/hosts/mac-studio/fs/list?path=assets&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
    )
    await new Promise(r => setTimeout(r, 15))
    await hostAgent.tick()
    const listRes = await listPromise
    assert.equal(listRes.status, 200)
    const listJson = await listRes.json()
    assert.equal(listJson.ok, true)
    assert.ok(listJson.entries.some(e => e.name === 'demo.mp4'))

    const videoMetaPromise = fetchAdapter(
      `http://hub.local/api/hosts/mac-studio/fs/read?path=${encodeURIComponent('assets/demo.mp4')}&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
    )
    await new Promise(r => setTimeout(r, 15))
    await hostAgent.tick()
    const videoMetaRes = await videoMetaPromise
    assert.equal(videoMetaRes.status, 200)
    const videoMeta = await videoMetaRes.json()
    assert.equal(videoMeta.kind, 'video')
    assert.equal(videoMeta.mime, 'video/mp4')
    assert.equal(videoMeta.size, 4096)

    // iOS Safari initial probe: Range: bytes=0-1 -> 206 Partial Content (exact 2 bytes!)
    const probePromise = fetchAdapter(
      `http://hub.local/api/hosts/mac-studio/fs/stream?path=${encodeURIComponent('assets/demo.mp4')}&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
      { headers: { range: 'bytes=0-1' } },
    )
    await new Promise(r => setTimeout(r, 15))
    await hostAgent.tick()
    const probeRes = await probePromise
    assert.equal(probeRes.status, 206)
    assert.equal(probeRes.headers.get('accept-ranges'), 'bytes')
    assert.equal(probeRes.headers.get('content-range'), 'bytes 0-1/4096')
    const probeBuf = Buffer.from(await probeRes.arrayBuffer())
    assert.equal(probeBuf.length, 2)
    assert.deepEqual(probeBuf, mp4Buf.subarray(0, 2))

    // ETag If-None-Match -> 304 Not Modified
    const etag = probeRes.headers.get('etag')
    assert.ok(etag, 'Expected ETag header on video stream')
    const cached304Promise = fetchAdapter(
      `http://hub.local/api/hosts/mac-studio/fs/stream?path=${encodeURIComponent('assets/demo.mp4')}&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
      { headers: { 'if-none-match': etag } },
    )
    await new Promise(r => setTimeout(r, 15))
    await hostAgent.tick()
    const cached304Res = await cached304Promise
    assert.equal(cached304Res.status, 304)

    // 7. Real sips smart thumbnail test on repo's docs/assets/step1-login-zh.png (>300KB PNG if present, or generated large PNG)
    const realPngPath = join(process.cwd(), 'docs/assets/step1-login-zh.png')
    const realMeta = await readWorkspaceFileFastMeta(process.cwd(), 'docs/assets/step1-login-zh.png')
    assert.equal(realMeta.ok, true)
    assert.equal(realMeta.kind, 'image')
    if (process.platform === 'darwin' && realMeta.size > 300 * 1024) {
      const thumbChunk = await readWorkspaceFileStreamChunk(process.cwd(), 'docs/assets/step1-login-zh.png', {
        thumb: true,
        dshHome,
      })
      assert.equal(thumbChunk.ok, true)
      assert.equal(thumbChunk.isThumb, true)
      assert.equal(thumbChunk.mime, 'image/jpeg')
      assert.ok(thumbChunk.buffer.length < realMeta.size, 'Smart JPEG thumbnail should be smaller than raw PNG')
    } else if (process.platform === 'darwin') {
      // Create a >350KB uncompressed BMP/PNG via sips from step1-login-zh.png to verify >300KB compression
      const bigBmp = join(wsDir, 'assets', 'big-screen.bmp')
      const { execFile } = await import('node:child_process')
      const { promisify } = await import('node:util')
      await promisify(execFile)('/usr/bin/sips', ['-s', 'format', 'bmp', realPngPath, '--out', bigBmp])
      const bmpStat = await stat(bigBmp)
      if (bmpStat.size > 300 * 1024) {
        const thumbChunk = await readWorkspaceFileStreamChunk(wsDir, 'assets/big-screen.bmp', {
          thumb: true,
          dshHome,
        })
        assert.equal(thumbChunk.ok, true)
        assert.equal(thumbChunk.isThumb, true)
        assert.equal(thumbChunk.mime, 'image/jpeg')
        assert.ok(thumbChunk.buffer.length < bmpStat.size * 0.4, 'Thumbnail should shrink >300KB image substantially')
      }
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('In-flight prompt tracking: sent messages never vanish between command pull and disk transcript sync (even on repeated text)', () => {
  let nowMs = 1_770_000_000_000
  const hub = new HubCore({ now: () => nowMs })
  hub.handleHeartbeat({
    hostId: 'mac-pro',
    hostName: 'Mac Pro',
    bridgeState: {
      tasks: [
        {
          id: 'sess-1',
          status: 'idle',
          messageCount: 2,
          transcript: [
            { role: 'user', text: '继续' },
            { role: 'assistant', text: '第一阶段已完成。' },
          ],
        },
      ],
      approvals: [],
      workspaces: [],
    },
  })

  // User sends repeated text '继续' on mobile
  const enq = hub.queueCommand('mac-pro', {
    type: 'prompt',
    agentId: 'sess-1',
    text: '继续',
  })
  assert.equal(enq.ok, true)

  // Host pulls the command via liteHeartbeat BEFORE disk transcript has the new '继续'
  nowMs += 150
  const pullRes = hub.handleHeartbeat({
    hostId: 'mac-pro',
    hostName: 'Mac Pro',
    liteHeartbeat: true,
    expectedTaskCount: 1,
  })
  assert.equal(pullRes.commands.length, 1)

  // During execution gap: pendingCommands is empty, but inflightCommands MUST still preserve the second '继续'
  const gapState = hub.getFullState()
  const gapHost = gapState.hosts.find(h => h.hostId === 'mac-pro')
  assert.equal(gapHost.pendingCommands.length, 0)
  assert.equal(gapHost.inflightCommands.length, 1)
  assert.equal(gapHost.inflightCommands[0].text, '继续')
  assert.equal(gapHost.inflightCommands[0].baselineSameCount, 1)

  // Once Host finishes writing the new '继续' to disk and sends full heartbeat, inflightCommands auto-retires
  nowMs += 900
  hub.handleHeartbeat({
    hostId: 'mac-pro',
    hostName: 'Mac Pro',
    bridgeState: {
      tasks: [
        {
          id: 'sess-1',
          status: 'running',
          messageCount: 3,
          transcript: [
            { role: 'user', text: '继续' },
            { role: 'assistant', text: '第一阶段已完成。' },
            { role: 'user', text: '继续' },
          ],
        },
      ],
      approvals: [],
      workspaces: [],
    },
  })
  const syncedState = hub.getFullState()
  const syncedHost = syncedState.hosts.find(h => h.hostId === 'mac-pro')
  assert.equal(syncedHost.inflightCommands.length, 0)
})

test('WorkBuddy real local SQLite + Unix sidecar socket + HTTP/SSE stream + HubAgent command routing', async () => {
  const { execFileSync } = await import('node:child_process')
  const net = await import('node:net')
  const http = await import('node:http')

  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-e2e-'))
  const wbHome = join(tmpDir, 'workbuddy')
  const dshHome = join(tmpDir, 'dsh')
  await mkdir(join(wbHome, 'sessions'), { recursive: true })
  await mkdir(dshHome, { recursive: true })

  let sidecarServer = null
  let acpHttpServer = null
  const activeSseResponses = new Set()

  try {
    // 1. Create a real SQLite workbuddy.db (deliberately omitting optional `model` column to verify schema resilience)
    const dbPath = join(wbHome, 'workbuddy.db')
    const t0 = Date.now() - 20_000
    execFileSync('sqlite3', [
      dbPath,
      `
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        cwd TEXT,
        title TEXT,
        custom_title TEXT,
        status TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        deleted_at INTEGER
      );
      INSERT INTO sessions (id, cwd, title, custom_title, status, created_at, updated_at, deleted_at)
      VALUES ('wb-sqlite-01', '/Users/dev/wechat-pay', '初始标题', '微信支付V3重构', 'idle', ${t0}, ${t0 + 1000}, NULL);
      `,
    ])

    let replayEvents = [
      {
        timestamp: t0,
        update: { sessionUpdate: 'user_message', content: '帮我梳理微信支付回调逻辑' },
      },
      {
        timestamp: t0 + 1000,
        update: { sessionUpdate: 'agent_message', content: '第一轮：已梳理证书加载与验签流程。' },
      },
    ]

    // 2. Start a real local HTTP + SSE ACP server
    const rpcReceived = []
    const rpcResponded = []
    acpHttpServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (req.method === 'GET' && url.pathname.includes('/replay')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: { events: replayEvents } }))
        return
      }
      if (req.method === 'POST' && url.pathname.endsWith('/connect')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: { connectionId: 'conn-real-1', sessionToken: 'tok-real-1' } }))
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/acp') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        res.write(': connected\n\n')
        activeSseResponses.add(res)
        req.on('close', () => activeSseResponses.delete(res))
        return
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/acp') {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          const parsed = JSON.parse(body || '{}')
          if (parsed.method) {
            rpcReceived.push(parsed)
            if (parsed.method === 'initialize') {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { protocolVersion: 1 } }))
              return
            }
            if (parsed.method === 'session/new') {
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { sessionId: 'wb-live-02' } }))
              return
            }
            if (parsed.method === 'session/prompt') {
              // Hold prompt slightly so SSE chunks & permission can be tested, or return when resolved
              setTimeout(() => {
                for (const sse of activeSseResponses) {
                  sse.write(
                    `data: ${JSON.stringify({
                      jsonrpc: '2.0',
                      method: 'session/update',
                      params: {
                        sessionId: parsed.params.sessionId,
                        update: { sessionUpdate: 'agent_message_chunk', content: '正在通过真实 SSE 推送回复...' },
                      },
                    })}\n\n`,
                  )
                  sse.write(
                    `data: ${JSON.stringify({
                      jsonrpc: '2.0',
                      id: 901,
                      method: 'session/request_permission',
                      params: {
                        sessionId: parsed.params.sessionId,
                        toolCall: {
                          toolCallId: 'tc-real-1',
                          title: 'Bash: git status',
                          kind: 'execute',
                          rawInput: { command: 'git status' },
                        },
                        options: [
                          { optionId: 'allow_once', name: '批准一次', kind: 'allow_once' },
                          { optionId: 'reject_once', name: '拒绝', kind: 'reject_once' },
                        ],
                      },
                    })}\n\n`,
                  )
                }
              }, 20)
              setTimeout(() => {
                if (!res.writableEnded) {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { content: '最终执行完毕' } }))
                }
              }, 250)
              return
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: {} }))
            return
          }
          if (parsed.id !== undefined && parsed.result !== undefined) {
            rpcResponded.push(parsed)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{}')
        })
      }
    })

    await new Promise(resolve => acpHttpServer.listen(0, '127.0.0.1', resolve))
    const acpPort = acpHttpServer.address().port
    const acpEndpoint = `http://127.0.0.1:${acpPort}/api/v1/acp`

    // 3. Start a real Unix domain socket sidecar server
    const sockPath = join(tmpDir, 'sidecar.sock')
    sidecarServer = net.createServer(socket => {
      let buf = ''
      socket.on('data', chunk => {
        buf += chunk.toString('utf8')
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          const req = JSON.parse(line)
          if (req.method === 'session.list') {
            socket.write(
              `${JSON.stringify({
                jsonrpc: '2.0',
                id: req.id,
                result: {
                  acpEndpoint,
                  sessions: [{ sessionId: 'wb-sqlite-01', cwd: '/Users/dev/wechat-pay', acpEndpoint }],
                },
              })}\n`,
            )
          }
        }
      })
    })
    await new Promise(resolve => sidecarServer.listen(sockPath, resolve))

    // 4. Verify HubAgent with legacy default `enabledHarnesses: ['dsh', 'antigravity-ide', 'codex', 'claude']`
    //    still registers WorkBuddyAdapter and routes commands end-to-end!
    const bridge = new FeishuBridge({
      config: resolveConfig({ dshHome }),
      agents: { list: () => [], get: () => undefined },
      sendText: async () => ({ messageId: 'm1' }),
      sendCard: async () => ({ messageId: 'c1' }),
    })

    const hubAgent = new HubAgent({
      config: {
        ...resolveConfig({ dshHome }),
        hostId: 'mac-wb-test',
        hostName: 'MacBook-WB',
        hubUrl: 'http://hub.local',
        hubToken: 'tok',
        enableAntigravityIde: false,
        enabledHarnesses: ['dsh', 'antigravity-ide', 'codex', 'claude'],
        workbuddyHome: wbHome,
      },
      bridge,
      execImpl: async () => ({ stdout: '', stderr: '' }),
      fetchImpl: (url, init) => {
        const u = String(url)
        if (u.startsWith('http://127.0.0.1:')) return globalThis.fetch(url, init)
        return Promise.resolve(new Response(JSON.stringify({ ok: true, commands: [] }), { status: 200 }))
      },
    })

    const wbAdapter = hubAgent.harnessRouter.getAdapter('workbuddy')
    assert.ok(wbAdapter, 'WorkBuddyAdapter should be registered even on legacy 4-harness config')
    wbAdapter.sidecarSocketPath = sockPath

    await hubAgent.refreshDshStats(true)
    let wbSess = hubAgent.cachedExternalSessions.find(s => s.id === 'workbuddy:wb-sqlite-01')
    assert.ok(wbSess, 'Should discover session from real SQLite workbuddy.db')
    assert.equal(wbSess.title, '微信支付V3重构')
    assert.equal(wbSess.transcript.length, 2)
    assert.match(wbSess.transcript[1].text, /第一轮：已梳理证书加载/)

    // 5. Simulate user chatting in WorkBuddy Desktop (SQLite updated_at advances + new replay event)
    const t1 = Date.now()
    replayEvents.push({
      timestamp: t1,
      update: { sessionUpdate: 'agent_message', content: '第二轮：桌面端新增了退款接口实现。' },
    })
    execFileSync('sqlite3', [
      dbPath,
      `UPDATE sessions SET updated_at = ${t1} WHERE id = 'wb-sqlite-01';`,
    ])

    await hubAgent.refreshDshStats(true)
    wbSess = hubAgent.cachedExternalSessions.find(s => s.id === 'workbuddy:wb-sqlite-01')
    assert.match(wbSess.transcript.at(-1).text, /第二轮：桌面端新增了退款接口实现/)

    // 6. Test creating a new WorkBuddy session via HubAgent command and receiving real SSE chunks + permission approval
    const createRes = await hubAgent.handleHubCommand({
      type: 'new_session',
      harness: 'workbuddy',
      title: '测试真实SSE与审批',
      prompt: '请检查 git 状态',
      cwd: '/Users/dev/wechat-pay',
      model: 'claude-sonnet-4-6',
    })
    assert.equal(createRes.ok, true)
    assert.equal(createRes.agentId, 'workbuddy:wb-live-02')
    assert.equal(hubAgent.sessionModelOverrides.get('workbuddy:wb-live-02'), 'claude-sonnet-4-6')

    // Wait for real SSE chunk and permission request to arrive over TCP
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 25))
      await hubAgent.refreshDshStats(true)
      const live = hubAgent.cachedExternalSessions.find(s => s.id === 'workbuddy:wb-live-02')
      if (live?.pendingApproval?.code) break
    }

    await hubAgent.tick()
    const liveSess = hubAgent.cachedExternalSessions.find(s => s.id === 'workbuddy:wb-live-02')
    assert.ok(liveSess)
    assert.equal(liveSess.status, 'approval')
    assert.ok(liveSess.pendingApproval?.code.startsWith('WB-'))
    assert.match(liveSess.transcript.at(-1)?.text || '', /正在通过真实 SSE 推送回复/)

    const approveRes = await hubAgent.handleHubCommand({
      type: 'approve',
      code: liveSess.pendingApproval.code,
      agentId: 'workbuddy:wb-live-02',
      optionIndex: 1,
    })
    assert.equal(approveRes.ok, true)
    assert.equal(rpcResponded.at(-1)?.id, 901)
    assert.equal(rpcResponded.at(-1)?.result?.outcome?.optionId, 'allow_once')

    wbAdapter.shutdown()
  } finally {
    for (const sse of activeSseResponses) {
      try { sse.end() } catch { }
    }
    if (sidecarServer) await new Promise(resolve => sidecarServer.close(resolve))
    if (acpHttpServer) {
      acpHttpServer.closeAllConnections?.()
      await new Promise(resolve => acpHttpServer.close(resolve))
    }
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('WorkBuddy v5.9.3 projects JSONL transcript parsing & wbipc/endpoint.json discovery', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-v593-'))
  try {
    const wbHome = join(tmpDir, '.workbuddy')
    const wbipcDir = join(wbHome, 'wbipc')
    const projSlugDir = join(wbHome, 'projects', 'Users-digtalhealthlink-WorkBuddy-2026-11-10-15-09-31')
    await mkdir(wbipcDir, { recursive: true })
    await mkdir(projSlugDir, { recursive: true })

    const fakeSockPath = join(tmpDir, 'b-b7602d5aabc793dd.sock')
    await writeFile(fakeSockPath, '', 'utf8')
    await writeFile(
      join(wbipcDir, 'endpoint.json'),
      JSON.stringify({ endpoint: fakeSockPath, ticket: 'test-ticket' }),
      'utf8',
    )

    const sessionId = '869a441a-5fd3-4862-8bf8-deb63bbfea5a'
    const jsonlLines = [
      JSON.stringify({
        type: 'session-meta',
        id: 'meta-1',
        sessionId,
        timestamp: 1794294571000,
        meta: { 'codebuddy.ai/hostKind': 'unopted' },
      }),
      JSON.stringify({
        id: 'msg-user-1',
        timestamp: 1794294571675,
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: '<system-reminder data-role="user-context">\nSOUL.md context...\n</system-reminder>\n<user_query>你好</user_query>',
          },
        ],
        sessionId,
        cwd: '/Users/digtalhealthlink/WorkBuddy/2026-11-10-15-09-31',
      }),
      JSON.stringify({
        id: 'title-1',
        timestamp: 1794294573000,
        type: 'ai-title',
        aiTitle: '你好',
        sessionId,
        cwd: '/Users/digtalhealthlink/WorkBuddy/2026-11-10-15-09-31',
      }),
      JSON.stringify({
        id: 'msg-asst-1',
        timestamp: 1794294574445,
        type: 'message',
        role: 'assistant',
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: '你好！👋 很高兴见到你。\n\n我是 WorkBuddy，你的智能助手。',
          },
        ],
        sessionId,
        cwd: '/Users/digtalhealthlink/WorkBuddy/2026-11-10-15-09-31',
      }),
    ]
    await writeFile(join(projSlugDir, `${sessionId}.jsonl`), jsonlLines.join('\n') + '\n', 'utf8')

    const wb = new WorkBuddyAdapter({
      workbuddyHome: wbHome,
      querySidecarImpl: async () => null,
      queryDbImpl: async () => [
        {
          id: sessionId,
          title: '你好',
          cwd: '/Users/digtalhealthlink/WorkBuddy/2026-11-10-15-09-31',
          status: 'completed',
          model: 'fast-model',
          deleted_at: null,
          created_at: 1794294571675,
          updated_at: 1794294574445,
        },
      ],
    })

    const health = await wb.detectHealth()
    assert.equal(health.installed, true)
    assert.equal(health.attachedDesktop, true)
    assert.equal(wb.sidecarSocketPath, fakeSockPath)

    const sessions = await wb.listSessions()
    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].id, `workbuddy:${sessionId}`)
    assert.equal(sessions[0].title, '你好')
    assert.equal(sessions[0].transcript.length, 2)
    assert.equal(sessions[0].transcript[0].role, 'user')
    assert.equal(sessions[0].transcript[0].text, '你好')
    assert.equal(sessions[0].transcript[1].role, 'assistant')
    assert.match(sessions[0].transcript[1].text, /我是 WorkBuddy，你的智能助手/)
    wb.shutdown()
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('WorkBuddy v5.9.3 Streamable HTTP POST SSE frames, takeWriter session/load, auth error surfacing, and wbipc fast-skip', async () => {
  const http = await import('node:http')
  const net = await import('node:net')
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-sse-post-'))
  let acpServer = null
  let wbipcDummyServer = null

  try {
    // 1. Verify wbipc socket (b-*.sock) is skipped immediately instead of hanging 1.5s
    const wbipcDir = join(tmpDir, 'wbipc')
    await mkdir(wbipcDir, { recursive: true })
    const wbipcSock = join(wbipcDir, 'b-b7602d5aabc793dd.sock')
    wbipcDummyServer = net.createServer(() => {
      // Intentionally never replies to sidecar JSON-RPC (simulates real wbipc socket)
    })
    await new Promise(resolve => wbipcDummyServer.listen(wbipcSock, resolve))
    const tStart = Date.now()
    const sidecarRes = await queryWorkBuddySidecar(wbipcSock, 'session.list', {}, 1500)
    assert.equal(sidecarRes, null)
    assert.ok(Date.now() - tStart < 150, 'wbipc socket should fast-skip without waiting 1500ms timeout')

    // 2. Start a real HTTP server speaking WorkBuddy v5.9.3 Streamable HTTP (`text/event-stream` on POST /api/v1/acp)
    let isLoggedIn = false
    let authCalledMethods = []
    let resolvePendingAuth = null
    let pendingPromptSseRes = null
    let pendingPromptReqId = null

    acpServer = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (req.method === 'POST' && url.pathname.endsWith('/connect')) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: { connectionId: 'conn-v593', sessionToken: '' } }))
        return
      }
      if (req.method === 'GET' && url.pathname === '/api/v1/acp') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' })
        res.write(':ok\n\n')
        return
      }
      if (req.method === 'POST' && url.pathname === '/api/v1/acp') {
        let raw = ''
        req.on('data', c => { raw += c })
        req.on('end', () => {
          const msg = JSON.parse(raw || '{}')
          if (msg.method === 'initialize') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream' })
            res.end(
              `:ok\n\nevent: message\ndata: ${JSON.stringify({
                jsonrpc: '2.0',
                id: msg.id,
                result: {
                  protocolVersion: 1,
                  authMethods: [{ id: 'external', name: 'WorkBuddy Account' }],
                },
              })}\n\n`,
            )
            return
          }
          if (msg.method === 'authenticate') {
            authCalledMethods.push(msg.params?.methodId)
            res.writeHead(200, { 'Content-Type': 'text/event-stream' })
            res.write(':ok\n\n')
            resolvePendingAuth = () => {
              isLoggedIn = true
              res.end(
                `event: message\ndata: ${JSON.stringify({
                  jsonrpc: '2.0',
                  id: msg.id,
                  result: {
                    _meta: {
                      'codebuddy.ai/userinfo': {
                        userId: 'u-1001',
                        userName: 'digtalhealthlink',
                      },
                    },
                  },
                })}\n\n`,
              )
            }
            return
          }
          if (msg.method === 'session/load') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream' })
            if (!msg.params?.takeWriter || !msg.params?._meta?.['codebuddy.ai/takeWriter']) {
              res.end(
                `:ok\n\nevent: message\ndata: ${JSON.stringify({
                  jsonrpc: '2.0',
                  id: msg.id,
                  error: {
                    code: -32000,
                    message: 'Persistent Session already has an external writer',
                    data: { reason: 'writer_occupied' },
                  },
                })}\n\n`,
              )
              return
            }
            if (!isLoggedIn) {
              res.end(
                `:ok\n\nevent: message\ndata: ${JSON.stringify({
                  jsonrpc: '2.0',
                  id: msg.id,
                  error: {
                    code: -32000,
                    message: 'Authentication required. Please use /login command to sign in to your account',
                    data: { category: 'auth' },
                  },
                })}\n\n`,
              )
              return
            }
            // Replay historical chunk BEFORE id result (must be ignored by entry.isLoadingSession!)
            res.write(
              `:ok\n\nevent: message\ndata: ${JSON.stringify({
                jsonrpc: '2.0',
                method: 'session/update',
                params: {
                  sessionId: msg.params.sessionId,
                  update: { sessionUpdate: 'agent_message_chunk', content: 'OLD_HISTORY_REPLAY_SHOULD_IGNORE' },
                },
              })}\n\n`,
            )
            res.end(
              `event: message\ndata: ${JSON.stringify({
                jsonrpc: '2.0',
                id: msg.id,
                result: { models: { currentModelId: 'auto' } },
              })}\n\n`,
            )
            return
          }
          if (msg.method === 'session/prompt') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream' })
            res.write(':ok\n\n')
            // Stream chunk 1 + in-band serverRequest (session/request_permission) on the POST SSE stream!
            res.write(
              `event: message\ndata: ${JSON.stringify({
                jsonrpc: '2.0',
                method: 'session/update',
                params: {
                  sessionId: msg.params.sessionId,
                  update: { sessionUpdate: 'agent_message_chunk', content: '第一段流式回复，' },
                },
              })}\n\n`,
            )
            res.write(
              `event: message\ndata: ${JSON.stringify({
                jsonrpc: '2.0',
                id: 888,
                method: 'session/request_permission',
                params: {
                  sessionId: msg.params.sessionId,
                  toolCall: { toolCallId: 'tc-post-1', title: 'Bash: ls -la', kind: 'execute' },
                  options: [{ optionId: 'allow_once', name: '允许', kind: 'allow_once' }],
                },
              })}\n\n`,
            )
            pendingPromptSseRes = res
            pendingPromptReqId = msg.id
            return
          }
          if (msg.id === 888 && msg.result) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
            if (pendingPromptSseRes && !pendingPromptSseRes.writableEnded) {
              pendingPromptSseRes.write(
                `event: message\ndata: ${JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'session/update',
                  params: {
                    sessionId: '869a441a-5fd3-4862-8bf8-deb63bbfea5a',
                    update: { sessionUpdate: 'agent_message_chunk', content: '授权通过后完成第二段回复！' },
                  },
                })}\n\n`,
              )
              pendingPromptSseRes.end(
                `event: message\ndata: ${JSON.stringify({
                  jsonrpc: '2.0',
                  id: pendingPromptReqId,
                  result: { stopReason: 'end_turn' },
                })}\n\n`,
              )
            }
            return
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{}')
        })
      }
    })

    await new Promise(resolve => acpServer.listen(0, '127.0.0.1', resolve))
    const port = acpServer.address().port
    const endpoint = `http://127.0.0.1:${port}/api/v1/acp`

    const wbHome = join(tmpDir, '.workbuddy')
    const projDir = join(wbHome, 'projects', 'Users-test-proj')
    await mkdir(projDir, { recursive: true })
    const sessId = '869a441a-5fd3-4862-8bf8-deb63bbfea5a'
    await writeFile(
      join(projDir, `${sessId}.jsonl`),
      [
        JSON.stringify({ type: 'message', role: 'user', content: [{ type: 'input_text', text: '<user_query>你好</user_query>' }], cwd: '/Users/test/proj', timestamp: 1000 }),
        JSON.stringify({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '你好！我是 WorkBuddy。' }], cwd: '/Users/test/proj', timestamp: 2000 }),
      ].join('\n') + '\n',
      'utf8',
    )

    const logs = []
    const wb = new WorkBuddyAdapter({
      workbuddyHome: wbHome,
      acpEndpoint: endpoint,
      logger: {
        log: m => logs.push(m),
        warn: m => logs.push(m),
      },
    })

    await wb.listSessions()

    // 3. Before CLI login -> sendPrompt fails fast, surfaces browser OAuth notice, and automatically triggers ACP authenticate({ methodId: 'external' })!
    const unauthRes = await wb.sendPrompt({
      sessionId: `workbuddy:${sessId}`,
      text: '帮我看看目录结构',
    })
    assert.equal(unauthRes.ok, false)
    assert.match(unauthRes.error, /WorkBuddy CLI 需首次授权登录/)
    assert.match(unauthRes.error, /--workbuddy-login/)

    for (let i = 0; i < 20 && !resolvePendingAuth; i++) {
      await new Promise(r => setTimeout(r, 20))
    }
    assert.deepEqual(authCalledMethods, ['external'])
    assert.equal(typeof resolvePendingAuth, 'function')

    // Simulate user clicking "确认授权" in browser -> ACP authenticate resolves!
    resolvePendingAuth()
    for (let i = 0; i < 20; i++) {
      const s = await wb.getSession(`workbuddy:${sessId}`)
      if (s?.lastProgress?.includes('已完成登录授权')) break
      await new Promise(r => setTimeout(r, 20))
    }
    const authedSess = await wb.getSession(`workbuddy:${sessId}`)
    assert.match(authedSess.lastProgress, /digtalhealthlink/)

    // 4. Next sendPrompt succeeds immediately without restarting adapter,
    //    passes takeWriter:true, ignores historical replay, streams POST SSE chunks, and handles in-stream permission!
    const okRes = await wb.sendPrompt({
      sessionId: `workbuddy:${sessId}`,
      text: '帮我看看目录结构',
    })
    assert.equal(okRes.ok, true)

    // Wait briefly for in-stream permission frame on POST SSE stream
    for (let i = 0; i < 20; i++) {
      const s = await wb.getSession(`workbuddy:${sessId}`)
      if (s?.pendingApproval?.code) break
      await new Promise(r => setTimeout(r, 20))
    }

    let sess = await wb.getSession(`workbuddy:${sessId}`)
    assert.equal(sess.status, 'approval')
    assert.ok(sess.pendingApproval?.code.startsWith('WB-'))
    assert.ok(!sess.transcript.some(m => m.text.includes('OLD_HISTORY_REPLAY_SHOULD_IGNORE')))
    assert.match(sess.transcript.at(-1).text, /第一段流式回复/)

    const approveOut = await wb.resolveApproval({
      sessionId: `workbuddy:${sessId}`,
      code: sess.pendingApproval.code,
      allow: true,
      optionIndex: 1,
    })
    assert.equal(approveOut.ok, true)

    // Wait for POST SSE stream to finish after approval
    for (let i = 0; i < 20; i++) {
      sess = await wb.getSession(`workbuddy:${sessId}`)
      if (sess.status === 'idle') break
      await new Promise(r => setTimeout(r, 20))
    }

    assert.equal(sess.status, 'idle')
    assert.equal(sess.transcript.at(-1).text, '第一段流式回复，授权通过后完成第二段回复！')
    wb.shutdown()
  } finally {
    if (wbipcDummyServer) await new Promise(resolve => wbipcDummyServer.close(resolve))
    if (acpServer) {
      acpServer.closeAllConnections?.()
      await new Promise(resolve => acpServer.close(resolve))
    }
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('WorkBuddy bundled CLI spawns with isolated ACC_PRODUCT_CONFIG_PATH (workbuddy-cli) to avoid Desktop auth file collision', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-product-cfg-'))
  const prevAccPath = process.env.ACC_PRODUCT_CONFIG_PATH
  delete process.env.ACC_PRODUCT_CONFIG_PATH
  try {
    const cliRoot = join(tmpDir, 'WorkBuddy.app', 'Contents', 'Resources', 'app.asar.unpacked', 'cli')
    const binDir = join(cliRoot, 'bin')
    const binPath = join(binDir, 'codebuddy')
    const wbHome = join(tmpDir, '.workbuddy')
    await mkdir(binDir, { recursive: true })
    await writeFile(binPath, '#!/usr/bin/env node\n', 'utf8')
    await writeFile(
      join(cliRoot, 'product.json'),
      JSON.stringify({
        productName: 'WorkBuddy',
        productConfigPathEnv: 'ACC_PRODUCT_CONFIG_PATH',
        endpoint: 'https://www.workbuddy.cn',
        stagingEndpoint: 'https://staging.workbuddy.cn',
        authentication: {
          id: 'workbuddy-desktop',
          type: 'account-scoped-external-link',
          label: 'TencentCloud',
          attributes: {
            platform: 'workbuddy',
            prefixPath: '/plugin',
          },
        },
      }),
      'utf8',
    )

    let capturedSpawn = null
    const wb = new WorkBuddyAdapter({
      workbuddyHome: wbHome,
      binaryPath: binPath,
      querySidecarImpl: async () => null,
      spawnImpl: (cmd, args, opts) => {
        capturedSpawn = { cmd, args, opts }
        const fakeProc = new EventEmitter()
        fakeProc.unref = () => { }
        fakeProc.kill = () => { }
        return fakeProc
      },
      fetchImpl: async url => {
        if (String(url).endsWith('/connect')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { connectionId: 'conn-iso-1', sessionToken: 'tok-1' } }),
          }
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }),
        }
      },
      openSseImpl: () => ({ destroy() { } }),
    })

    const resolvedEndpoint = await wb._resolveDefaultAcpEndpoint()
    assert.match(resolvedEndpoint, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1\/acp$/)
    assert.ok(capturedSpawn, 'spawnImpl should be invoked')
    assert.equal(capturedSpawn.cmd, binPath)
    assert.equal(capturedSpawn.opts.env.CODEBUDDY_FORCE_LITE_WB_BUNDLE, '1')
    assert.equal(capturedSpawn.opts.env.CODEBUDDY_CONFIG_DIR, wbHome)
    assert.equal(capturedSpawn.opts.env.WORKBUDDY_CONFIG_DIR, wbHome)

    const expectedProductCfgPath = join(wbHome, 'dsh-cli-product.json')
    assert.equal(capturedSpawn.opts.env.ACC_PRODUCT_CONFIG_PATH, expectedProductCfgPath)

    const writtenProductCfg = JSON.parse(await readFile(expectedProductCfgPath, 'utf8'))
    assert.equal(writtenProductCfg.endpoint, 'https://www.workbuddy.cn')
    assert.equal(writtenProductCfg.authentication.id, 'workbuddy-cli')
    assert.equal(writtenProductCfg.authentication.type, 'account-scoped-external-link')
    assert.equal(writtenProductCfg.authentication.attributes.platform, 'workbuddy')

    // Also verify WorkBuddyAcpClient.authenticate defaults to 'internal' when authMethods is empty
    let sentMethodId = ''
    const client = new WorkBuddyAcpClient({
      acpEndpoint: resolvedEndpoint,
      fetchImpl: async (_url, init) => {
        const parsed = JSON.parse(init.body)
        if (parsed.method === 'authenticate') {
          sentMethodId = parsed.params?.methodId || ''
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result: { ok: true } }),
        }
      },
      openSseImpl: () => ({ destroy() { } }),
    })
    await client.authenticate()
    assert.equal(sentMethodId, 'internal')

    wb.shutdown()
  } finally {
    if (prevAccPath === undefined) delete process.env.ACC_PRODUCT_CONFIG_PATH
    else process.env.ACC_PRODUCT_CONFIG_PATH = prevAccPath
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('hub graceful SSE rotation (<300s Cloud Run limit) & idempotent command retry deduplication', async () => {
  const hub = new HubCore({ now: () => 1_710_000_000_000 })
  hub.handleHeartbeat({
    hostId: 'mac-sse-test',
    hostName: 'Mac SSE Test',
    bridgeState: {
      tasks: [{ id: 'agy-ide:conv-sse', title: 'SSE Test', status: 'approval', transcript: [] }],
      approvals: [{ code: 'AGY-CONVSSE-1', agentId: 'agy-ide:conv-sse', promptTitle: 'Allow read_file?' }],
      workspaces: [],
    },
  })

  // 1. Verify explicit command id deduplication across queued -> inflight -> completed (safe client retry on Load failed)
  const firstPrompt = hub.queueCommand('mac-sse-test', {
    id: 'cmd-idem-prompt-1',
    type: 'prompt',
    agentId: 'agy-ide:conv-sse',
    text: '重试幂等验证',
  })
  assert.equal(firstPrompt.ok, true)
  assert.equal(Boolean(firstPrompt.deduplicated), false)

  const retryWhileQueued = hub.queueCommand('mac-sse-test', {
    id: 'cmd-idem-prompt-1',
    type: 'prompt',
    agentId: 'agy-ide:conv-sse',
    text: '重试幂等验证',
  })
  assert.equal(retryWhileQueued.ok, true)
  assert.equal(retryWhileQueued.deduplicated, true)
  assert.equal(hub.hosts.get('mac-sse-test').commands.length, 1)

  // Host pulls command -> moves to inflightCommands
  const pulled = hub.handleHeartbeat({ hostId: 'mac-sse-test', hostName: 'Mac SSE Test', liteHeartbeat: true })
  assert.equal(pulled.commands.length, 1)
  const retryWhileInflight = hub.queueCommand('mac-sse-test', {
    id: 'cmd-idem-prompt-1',
    type: 'prompt',
    agentId: 'agy-ide:conv-sse',
    text: '重试幂等验证',
  })
  assert.equal(retryWhileInflight.ok, true)
  assert.equal(retryWhileInflight.deduplicated, true)
  assert.equal(hub.hosts.get('mac-sse-test').commands.length, 0)

  // Approval retry with same code + id also deduplicates cleanly
  const firstApp = hub.queueCommand('mac-sse-test', {
    id: 'cmd-idem-app-1',
    type: 'approval',
    code: 'AGY-CONVSSE-1',
    allow: true,
    optionIndex: 1,
  })
  const secondApp = hub.queueCommand('mac-sse-test', {
    id: 'cmd-idem-app-1',
    type: 'approval',
    code: 'AGY-CONVSSE-1',
    allow: true,
    optionIndex: 1,
  })
  assert.equal(firstApp.ok, true)
  assert.equal(secondApp.ok, true)
  assert.equal(secondApp.deduplicated, true)
  assert.equal(hub.hosts.get('mac-sse-test').commands.length, 1)

  // 2. Verify real HTTP /api/events rotates gracefully with `event: rotate` and clean EOF before hard proxy timeout
  const { server } = createHubServer({
    hub,
    token: 'test-sse-rotate-secret-token-1234',
    requireToken: true,
    sseMaxLifetimeMs: 70,
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const clientResp = await fetch(
      `http://127.0.0.1:${port}/api/events?initial=0&token=test-sse-rotate-secret-token-1234`,
      { headers: { 'accept-encoding': 'gzip' } },
    )
    assert.equal(clientResp.status, 200)
    const clientBody = await clientResp.text()
    assert.match(clientBody, /retry: 1000/)
    assert.match(clientBody, /event: rotate/)
    assert.match(clientBody, /"reason":"max_lifetime"/)

    const hostResp = await fetch(
      `http://127.0.0.1:${port}/api/events?mode=host&hostId=mac-sse-test&token=test-sse-rotate-secret-token-1234`,
    )
    assert.equal(hostResp.status, 200)
    const hostBody = await hostResp.text()
    assert.match(hostBody, /retry: 1000/)
    assert.match(hostBody, /event: rotate/)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
})

test('WorkBuddy per-cwd ACP server pool & bidirectional workbuddy.db SQLite sync keep Desktop sessions and transcripts aligned', async () => {
  const { execFileSync } = await import('node:child_process')
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-cwd-sync-'))
  try {
    const wbHome = join(tmpDir, '.workbuddy')
    await mkdir(wbHome, { recursive: true })
    const dbPath = join(wbHome, 'workbuddy.db')

    const existingId = '869a441a-5fd3-4862-8bf8-deb63bbfea5a'
    const existingCwd = '/Users/digtalhealthlink/WorkBuddy/2026-11-10-15-09-31'
    const realUserId = 'a7c651f6-2ead-4e43-b753-15bb704ce89e'

    // 1. Seed real SQLite workbuddy.db matching WorkBuddy v5.9.3 schema
    execFileSync('sqlite3', [
      dbPath,
      `
      CREATE TABLE workspaces (
        path TEXT PRIMARY KEY,
        last_opened_at INTEGER NOT NULL
      );
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        cwd TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT,
        custom_title TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_activity_at INTEGER,
        deleted_at INTEGER,
        is_playground INTEGER DEFAULT 0,
        source_mode TEXT DEFAULT 'craft',
        mode TEXT DEFAULT 'craft',
        model TEXT DEFAULT 'fast-model',
        permission_mode TEXT DEFAULT 'bypassPermissions',
        use_sandbox_cli INTEGER DEFAULT 1,
        addon_selection TEXT,
        transport TEXT DEFAULT 'local',
        unread INTEGER DEFAULT 0
      );
      INSERT INTO workspaces (path, last_opened_at) VALUES ('${existingCwd}', 1700000001000);
      INSERT INTO sessions (
        id, cwd, user_id, title, status, created_at, updated_at, last_activity_at, is_playground
      ) VALUES (
        '${existingId}', '${existingCwd}', '${realUserId}', '你好', 'completed', 1700000000000, 1700000002000, 1700000002000, 1
      );
      `,
    ])

    // Seed Desktop project JSONL + dot-path project JSONL to verify slug resolution
    const existingProjDir = join(wbHome, 'projects', 'Users-digtalhealthlink-WorkBuddy-2026-11-10-15-09-31')
    const dotProjDir = join(wbHome, 'projects', 'Users-digtalhealthlink-.dsh-remotecontrol')
    await mkdir(existingProjDir, { recursive: true })
    await mkdir(dotProjDir, { recursive: true })
    await writeFile(
      join(existingProjDir, `${existingId}.jsonl`),
      [
        JSON.stringify({ type: 'message', role: 'user', content: [{ type: 'input_text', text: '<user_query>你好</user_query>' }], cwd: existingCwd, timestamp: 1700000001000 }),
        JSON.stringify({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '你好！我是 WorkBuddy。' }], cwd: existingCwd, timestamp: 1700000002000 }),
      ].join('\n') + '\n',
      'utf8',
    )
    await writeFile(join(dotProjDir, 'dot-sess-01.jsonl'), '{"type":"message"}\n', 'utf8')

    const spawnedCalls = []
    const rpcByOrigin = new Map()
    const binPath = join(tmpDir, 'fake-codebuddy')
    await writeFile(binPath, '#!/usr/bin/env node\n', 'utf8')

    const deadPorts = new Set()
    const wb = new WorkBuddyAdapter({
      workbuddyHome: wbHome,
      binaryPath: binPath,
      querySidecarImpl: async () => null,
      spawnImpl: (cmd, args, opts) => {
        const portIdx = args.indexOf('--port')
        const port = portIdx !== -1 ? args[portIdx + 1] : '0'
        spawnedCalls.push({ cmd, args, cwd: opts.cwd, port })
        const proc = new EventEmitter()
        proc.unref = () => {}
        proc.kill = () => {
          proc.killed = true
        }
        return proc
      },
      fetchImpl: async (url, init = {}) => {
        const u = new URL(String(url))
        if (deadPorts.has(u.port)) {
          throw new Error(`fetch failed: connect ECONNREFUSED 127.0.0.1:${u.port}`)
        }
        if (u.pathname.endsWith('/connect')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { connectionId: `conn-${u.port}`, sessionToken: '' } }),
          }
        }
        const parsed = init.body ? JSON.parse(init.body) : {}
        const list = rpcByOrigin.get(u.origin) || []
        list.push(parsed)
        rpcByOrigin.set(u.origin, list)

        let result = {}
        if (parsed.method === 'initialize') {
          result = { protocolVersion: 1, authMethods: [{ id: 'internal', name: 'TencentCloud' }] }
        } else if (parsed.method === 'authenticate') {
          result = { _meta: { 'codebuddy.ai/userinfo': { userId: realUserId, userName: 'digtalhealthlink' } } }
        } else if (parsed.method === 'session/load') {
          result = { models: { currentModelId: 'fast-model' } }
        } else if (parsed.method === 'session/new') {
          result = { sessionId: 'wb-phone-new-99', models: { currentModelId: 'fast-model' } }
        } else if (parsed.method === 'session/prompt') {
          result = { content: [{ type: 'text', text: `来自端口 ${u.port} 的 AI 回复` }] }
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          text: async () => JSON.stringify({ jsonrpc: '2.0', id: parsed.id, result }),
        }
      },
      openSseImpl: () => ({ destroy() { } }),
    })

    // Dot-preserving slug & explicit project cwd resolution checks
    assert.equal(
      wb._findProjectJsonlPath('dot-sess-01', '/Users/digtalhealthlink/.dsh/remotecontrol'),
      join(dotProjDir, 'dot-sess-01.jsonl'),
    )
    assert.equal(wb._resolveDefaultNewSessionCwd('/Users/digtalhealthlink/MyRepo'), '/Users/digtalhealthlink/MyRepo')

    // 2. First run CLI authenticate() -> spawns server #1 in process.cwd()
    const authOut = await wb.authenticate()
    assert.equal(authOut.ok, true)
    assert.equal(spawnedCalls.length, 1)
    assert.equal(spawnedCalls[0].cwd, process.cwd())

    // 3. Send prompt from phone to existing Desktop session `你好` WITHOUT pre-calling listSessions()
    //    Must discover cwd from workbuddy.db and spawn server #2 in `existingCwd` (never reusing process.cwd() server!)
    const promptOut = await wb.sendPrompt({
      sessionId: `workbuddy:${existingId}`,
      text: '手机端追问：今天天气怎么样？',
    })
    assert.equal(promptOut.ok, true)
    assert.equal(spawnedCalls.length, 2, 'Should spawn a dedicated ACP server in the session exact cwd')
    assert.equal(spawnedCalls[1].cwd, existingCwd)

    // Wait for async prompt completion & SQLite sync
    let dbExistingRows = []
    for (let i = 0; i < 80; i++) {
      const s = await wb.getSession(`workbuddy:${existingId}`)
      dbExistingRows = JSON.parse(
        execFileSync('sqlite3', ['-json', dbPath, `SELECT * FROM sessions WHERE id = '${existingId}';`], { encoding: 'utf8' }) || '[]',
      )
      if (s?.status === 'idle' && s.transcript.length === 4 && dbExistingRows[0]?.status === 'completed') break
      await new Promise(r => setTimeout(r, 20))
    }

    // Verify listSessions() preserves all 4 messages (2 Desktop + 2 Phone) and does NOT clobber with older disk JSONL
    const listedAfterPrompt = await wb.listSessions()
    const targetSess = listedAfterPrompt.find(s => s.id === `workbuddy:${existingId}`)
    assert.ok(targetSess)
    assert.equal(targetSess.cwd, existingCwd)
    assert.equal(targetSess.transcript.length, 4)
    assert.equal(targetSess.transcript[2].text, '手机端追问：今天天气怎么样？')
    assert.match(targetSess.transcript[3].text, new RegExp(`来自端口 ${spawnedCalls[1].port} 的 AI 回复`))

    assert.equal(dbExistingRows.length, 1)
    assert.equal(dbExistingRows[0].user_id, realUserId)
    assert.equal(dbExistingRows[0].title, '你好')
    assert.equal(dbExistingRows[0].status, 'completed')
    assert.ok(dbExistingRows[0].updated_at > 1700000002000)

    // 4. Start a brand-new WorkBuddy session from the phone -> spawns server #3 in newCwd & inserts into workbuddy.db!
    const newCwd = '/Users/digtalhealthlink/WorkBuddy/2026-11-11-20-30-00'
    const newOut = await wb.startSession({
      title: '手机新建大盘复盘',
      prompt: '帮我复盘今日 A 股板块轮动',
      cwd: newCwd,
    })
    assert.equal(newOut.ok, true)
    assert.equal(newOut.agentId, 'workbuddy:wb-phone-new-99')
    assert.equal(spawnedCalls.length, 3)
    assert.equal(spawnedCalls[2].cwd, newCwd)

    let dbNewRows = []
    for (let i = 0; i < 80; i++) {
      const s = await wb.getSession('workbuddy:wb-phone-new-99')
      dbNewRows = JSON.parse(
        execFileSync('sqlite3', ['-json', dbPath, "SELECT * FROM sessions WHERE id = 'wb-phone-new-99';"], { encoding: 'utf8' }) || '[]',
      )
      if (s?.status === 'idle' && dbNewRows[0]?.status === 'completed') break
      await new Promise(r => setTimeout(r, 20))
    }

    assert.equal(dbNewRows.length, 1)
    assert.equal(dbNewRows[0].cwd, newCwd)
    assert.equal(dbNewRows[0].user_id, realUserId)
    assert.equal(dbNewRows[0].title, '手机新建大盘复盘')
    assert.equal(dbNewRows[0].is_playground, 1)
    assert.equal(dbNewRows[0].status, 'completed')

    const dbWorkspaces = JSON.parse(
      execFileSync('sqlite3', ['-json', dbPath, `SELECT * FROM workspaces WHERE path = '${newCwd}';`], { encoding: 'utf8' }),
    )
    assert.equal(dbWorkspaces.length, 1)

    // 5. Simulate spawned server #2 dying -> next sendPrompt transparently evicts dead endpoint & respawns server #4 in existingCwd
    deadPorts.add(spawnedCalls[1].port)
    const retryPromptOut = await wb.sendPrompt({
      sessionId: `workbuddy:${existingId}`,
      text: '服务重启后追问：近7天趋势如何？',
    })
    assert.equal(retryPromptOut.ok, true)
    assert.equal(spawnedCalls.length, 4, 'Should auto-respawn a fresh ACP server when cached server died')
    assert.equal(spawnedCalls[3].cwd, existingCwd)

    for (let i = 0; i < 80; i++) {
      const s = await wb.getSession(`workbuddy:${existingId}`)
      const rows = JSON.parse(
        execFileSync('sqlite3', ['-json', dbPath, `SELECT status FROM sessions WHERE id = '${existingId}';`], { encoding: 'utf8' }) || '[]',
      )
      if (s?.status === 'idle' && s.transcript.length === 6 && rows[0]?.status === 'completed') break
      await new Promise(r => setTimeout(r, 20))
    }
    const recoveredSess = await wb.getSession(`workbuddy:${existingId}`)
    assert.equal(recoveredSess.transcript.length, 6)
    assert.match(recoveredSess.transcript[5].text, new RegExp(`来自端口 ${spawnedCalls[3].port} 的 AI 回复`))

    // 5b. Simulate active session running while server #4 dies -> steer() evicts dead endpoint, respawns server #5 without duplicating user bubble!
    const runtimeEntry = wb.runtimeSessions.get(existingId)
    runtimeEntry.status = 'running'
    deadPorts.add(spawnedCalls[3].port)
    const steerRecoveredOut = await wb.steer({
      sessionId: `workbuddy:${existingId}`,
      text: '运行中服务器重拉插话：补一条风险提示',
    })
    assert.equal(steerRecoveredOut.ok, true)
    assert.equal(spawnedCalls.length, 5, 'steer() should evict dead ACP server and respawn cleanly')
    assert.equal(spawnedCalls[4].cwd, existingCwd)

    for (let i = 0; i < 80; i++) {
      const s = await wb.getSession(`workbuddy:${existingId}`)
      const rows = JSON.parse(
        execFileSync('sqlite3', ['-json', dbPath, `SELECT status FROM sessions WHERE id = '${existingId}';`], { encoding: 'utf8' }) || '[]',
      )
      if (s?.status === 'idle' && s.transcript.length === 8 && rows[0]?.status === 'completed') break
      await new Promise(r => setTimeout(r, 20))
    }
    const afterSteerRecover = await wb.getSession(`workbuddy:${existingId}`)
    assert.equal(afterSteerRecover.transcript.length, 8, 'User prompt must NOT be duplicated when steer falls back to sendPrompt')
    assert.equal(afterSteerRecover.transcript[6].text, '运行中服务器重拉插话：补一条风险提示')
    assert.match(afterSteerRecover.transcript[7].text, new RegExp(`来自端口 ${spawnedCalls[4].port} 的 AI 回复`))

    // 6. Verify renameSession & deleteSession also sync to workbuddy.db
    await wb.renameSession({ sessionId: 'workbuddy:wb-phone-new-99', title: 'A股收盘总结' })
    const renamedRows = JSON.parse(
      execFileSync('sqlite3', ['-json', dbPath, "SELECT title, custom_title FROM sessions WHERE id = 'wb-phone-new-99';"], { encoding: 'utf8' }),
    )
    assert.equal(renamedRows[0].custom_title, 'A股收盘总结')

    await wb.deleteSession({ sessionId: 'workbuddy:wb-phone-new-99' })
    const deletedRows = JSON.parse(
      execFileSync('sqlite3', ['-json', dbPath, "SELECT deleted_at FROM sessions WHERE id = 'wb-phone-new-99';"], { encoding: 'utf8' }),
    )
    assert.ok(deletedRows[0].deleted_at > 0)

    wb.shutdown()
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('daemon.mjs --workbuddy-login runs as a standalone one-shot CLI command without FEISHU_HUB_URL or --once and exits cleanly', async () => {
  const { createServer } = await import('node:http')
  const { execFile: cpExecFile } = await import('node:child_process')
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-wb-login-cli-'))
  const fakeBin = join(tmpDir, 'fake-codebuddy')
  await writeFile(fakeBin, '#!/usr/bin/env node\nprocess.exit(0)\n', { mode: 0o755 })

  let authCalled = 0
  const mockAcpServer = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1')
    if (req.method === 'POST' && u.pathname.endsWith('/connect')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ connectionId: 'conn-login-1', sessionToken: 'tok-login-1' }))
      return
    }
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
      return
    }
    const chunks = []
    for await (const ch of req) chunks.push(ch)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
    if (body.method === 'initialize') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: { authMethods: [{ id: 'oauth-browser' }] } }))
      return
    }
    if (body.method === 'authenticate') {
      authCalled += 1
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: { _meta: { 'codebuddy.ai/userinfo': { userName: 'TestWBUser', userId: 'u-wb-88' } } },
        }),
      )
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: {} }))
  })

  try {
    const port = await new Promise((resolve, reject) => {
      mockAcpServer.listen(0, '127.0.0.1', () => resolve(mockAcpServer.address().port))
      mockAcpServer.on('error', reject)
    })

    const daemonScript = new URL('../daemon.mjs', import.meta.url).pathname
    const out = await new Promise((resolve, reject) => {
      cpExecFile(
        process.execPath,
        [daemonScript, '--workbuddy-login'],
        {
          timeout: 5000,
          env: {
            ...process.env,
            FEISHU_DSH_HOME: tmpDir,
            DSH_HOME: tmpDir,
            FEISHU_HUB_URL: '',
            FEISHU_HUB_TOKEN: '',
            WORKBUDDY_CONFIG_DIR: tmpDir,
            WORKBUDDY_BIN: fakeBin,
            WORKBUDDY_ACP_ENDPOINT: `http://127.0.0.1:${port}/acp`,
          },
        },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(`exit=${err.code} stdout=${stdout} stderr=${stderr} msg=${err.message}`))
          resolve({ stdout, stderr })
        },
      )
    })

    assert.equal(authCalled, 1)
    assert.match(out.stdout, /WorkBuddy CLI 浏览器授权成功 \(TestWBUser\)/)
  } finally {
    await new Promise(r => mockAcpServer.close(r)).catch(() => {})
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('v0.5.9 Mobile Foreground Connection Stability: hot/cold wire compaction budget, on-demand full transcript hydration, SSE burst coalescing, and semver upgrade checks', async () => {
  const { gzipSync } = await import('node:zlib')
  const hub = new HubCore()

  // 1. Simulate 3 Macs × 22 sessions = 66 sessions with heavy assistant replies & thinking (~20MB raw uncompacted)
  for (let hIdx = 1; hIdx <= 3; hIdx += 1) {
    const tasks = Array.from({ length: 22 }, (_, tIdx) => {
      const msgTotal = tIdx === 0 ? 18 : 10
      const transcript = Array.from({ length: msgTotal }, (__, mIdx) =>
        mIdx % 2 === 0
          ? { role: 'user', text: `User prompt ${mIdx} on host-${hIdx} task-${tIdx}` }
          : {
              role: 'assistant',
              text: `Reply ${hIdx}-${tIdx}-${mIdx}: ` + 'A'.repeat(tIdx === 0 ? 52_000 : 28_000),
              thinking: `Thought ${hIdx}-${tIdx}-${mIdx}: ` + 'T'.repeat(7_000),
              tools: Array.from({ length: 12 }, (___, k) => ({
                name: 'run_command',
                id: `tc-${k}`,
                summary: `Step ${k}`,
                commandLine: `echo ${k} ` + 'X'.repeat(500),
              })),
            },
      )
      return {
        id: `sess-${hIdx}-${tIdx}`,
        title: `Session ${tIdx}`,
        status: tIdx === 1 ? 'running' : 'idle',
        updatedAt: Date.now() - tIdx * 15 * 60_000,
        sessionRev: `rev-${hIdx}-${tIdx}`,
        messageCount: msgTotal,
        transcript,
      }
    })
    hub.handleHeartbeat({
      hostId: `mac-${hIdx}`,
      hostName: `Mac-${hIdx}`,
      bridgeState: { tasks, approvals: [], workspaces: [] },
    })
  }

  const wireState = hub.getFullState()
  const hotTask = wireState.hosts[0].bridgeState.tasks[0]
  const coldTask = wireState.hosts[0].bridgeState.tasks[8]

  // Hot top session retains 14 messages; recent reply budget is full 48,000 chars (zero conclusion truncation)
  assert.equal(hotTask.transcript.length, 14)
  assert.equal(hotTask.omittedTranscriptCount, 4)
  assert.equal(hotTask.transcript.at(-1).text.length, 48_000)

  // Cold historical idle session (index >= 6 & older than 60m) compacts to 3 messages & <=2,400 chars, marking wireTruncated: true
  assert.equal(coldTask.transcript.length, 3)
  assert.equal(coldTask.wireTruncated, true)
  assert.equal(coldTask.transcript.at(-1).text.length, 2400)

  // On-demand hydration via getSessionFullTranscript still returns all 10 uncompacted messages (full >28k chars)!
  const hydrated = hub.getSessionFullTranscript('mac-1', 'sess-1-8')
  assert.equal(hydrated.ok, true)
  assert.equal(hydrated.transcript.length, 10)
  assert.ok(hydrated.transcript.at(-1).text.length > 28_000)

  // Total compressed /api/state across all 3 Macs (66 heavy sessions) must stay tiny (<160KB gzipped vs ~1MB previously!)
  const wireJson = JSON.stringify({ ok: true, ...wireState })
  const gzBytes = gzipSync(Buffer.from(wireJson, 'utf8')).length
  assert.ok(gzBytes < 160_000, `Expected gzipped 66-session /api/state < 160KB, got ${gzBytes} bytes`)

  // 2. Verify browser SSE burst coalescing in createHubServer while keeping HubCore.onStateChange synchronous
  let syncHookCalls = 0
  const unsubSync = hub.onStateChange(() => {
    syncHookCalls += 1
  })
  const { server } = createHubServer({
    hub,
    token: 'test-v059-sse-coalesce-secret-123456',
    requireToken: true,
    sseMinIntervalMs: 90,
    sseMaxLifetimeMs: 320,
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const sseResp = await fetch(
      `http://127.0.0.1:${port}/api/events?initial=0&token=test-v059-sse-coalesce-secret-123456`,
      {
        headers: {
          'accept-encoding': 'gzip',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      },
    )
    assert.equal(sseResp.status, 200)
    const sseTextPromise = sseResp.text()

    // Fire 6 rapid multi-host state mutations immediately once SSE stream is open
    for (let i = 0; i < 6; i += 1) {
      hub.handleHeartbeat({
        hostId: `mac-${(i % 3) + 1}`,
        hostName: `Mac-${(i % 3) + 1}`,
        bridgeState: {
          tasks: [{ id: `rapid-${i}`, title: `Rapid ${i}`, status: 'running', transcript: [] }],
          approvals: [],
          workspaces: [],
        },
      })
    }
    assert.equal(syncHookCalls, 6)

    const rawSse = await sseTextPromise
    const stateFrames = rawSse.match(/^event: state$/gm) || []
    // Leading frame + 1 coalesced trailing frame (2 frames total, never all 6!)
    assert.ok(
      stateFrames.length >= 2 && stateFrames.length <= 3,
      `Expected 6 rapid heartbeats to coalesce into 2-3 SSE frames, got ${stateFrames.length}`,
    )
    assert.match(rawSse, /rapid-5/)
  } finally {
    unsubSync()
    await new Promise(resolve => server.close(resolve))
  }

  // 3. Verify built frontend bundle contains v0.5.9 foreground connection resilience & semver host upgrade helpers
  const assetFiles = await readdir(join(process.cwd(), 'hub/public/assets'))
  const jsContents = await Promise.all(
    assetFiles.filter(f => f.endsWith('.js')).map(f => readFile(join(process.cwd(), 'hub/public/assets', f), 'utf8')),
  )
  const bundleSrc = jsContents.join('\n')
  assert.match(bundleSrc, /function compareSemver\(/)
  assert.match(bundleSrc, /function scheduleFallbackStateSync\(/)
  assert.match(bundleSrc, /function hydrateColdSessionTranscript\(/)
  assert.match(bundleSrc, /sseRotatingUntil/)
})

test('v0.6.0 Incremental SSE Delta Sync, Zero Conclusion Truncation & Safe Mobile Screenshot Upload', async () => {
  const { gzipSync } = await import('node:zlib')
  const { captureStateDigest, buildStateDelta } = await import('../../hub/delta-state.js')
  const { applyStateDelta } = await import('../../hub/web/src/state/delta-merge.js')

  const baseTs = 1_760_000_000_000
  let nowMs = baseTs
  const hub = new HubCore({ now: () => nowMs })

  // 1. Populate 3 Macs × 20 sessions, including a recently concluded session at taskIdx = 9 with a 42,000-char conclusion
  const full42kConclusion = '结论摘要：\n' + '完整深度分析内容段落——绝不截断。'.repeat(2600)
  assert.ok(full42kConclusion.length > 41_000 && full42kConclusion.length < 48_000)

  const buildHostTasks = (hIdx, activeStep = 1) =>
    Array.from({ length: 20 }, (_, tIdx) => {
      if (hIdx === 1 && tIdx === 9) {
        return {
          id: 'agy-ide:concluded-9',
          title: '深度架构结论会话',
          status: 'idle',
          turnState: 'conclusion',
          lastConclusionAt: baseTs - 8 * 60_000,
          updatedAt: baseTs - 8 * 60_000,
          sessionRev: 'rev-conc-9',
          messageCount: 2,
          transcript: [
            { role: 'user', text: '请输出完整结论报告' },
            { role: 'assistant', text: full42kConclusion },
          ],
        }
      }
      if (hIdx === 1 && tIdx === 0) {
        return {
          id: 'agy-ide:running-0',
          title: '正在流式输出的会话',
          status: 'running',
          turnState: 'running',
          updatedAt: nowMs,
          sessionRev: `rev-run-${activeStep}`,
          runningSummary: `Step ${activeStep}`,
          messageCount: 2,
          transcript: [
            { role: 'user', text: '开始执行任务' },
            { role: 'assistant', text: `进度更新 #${activeStep}: ` + '流式增量内容 '.repeat(60) },
          ],
        }
      }
      return {
        id: `sess-${hIdx}-${tIdx}`,
        title: `Historical ${hIdx}-${tIdx}`,
        status: 'idle',
        updatedAt: baseTs - (tIdx + 10) * 15 * 60_000,
        sessionRev: `rev-${hIdx}-${tIdx}`,
        messageCount: 4,
        transcript: [
          { role: 'user', text: `Prompt ${hIdx}-${tIdx}` },
          { role: 'assistant', text: `History ${hIdx}-${tIdx}: ` + 'H'.repeat(3000) },
        ],
      }
    })

  for (let hIdx = 1; hIdx <= 3; hIdx += 1) {
    hub.handleHeartbeat({
      hostId: `mac-${hIdx}`,
      hostName: `Mac-${hIdx}`,
      workspaces: Array.from({ length: 15 }, (_, w) => ({
        name: `proj-${hIdx}-${w}`,
        cwd: `/Users/dev/proj-${hIdx}-${w}`,
      })),
      bridgeState: {
        tasks: buildHostTasks(hIdx, 1),
        approvals: [],
        workspaces: Array.from({ length: 15 }, (_, w) => ({
          name: `proj-${hIdx}-${w}`,
          cwd: `/Users/dev/proj-${hIdx}-${w}`,
        })),
      },
    })
  }

  const stateV1 = hub.getFullState()
  assert.ok(stateV1.stateSeq >= 4)

  // Verify recently concluded session at taskIdx === 9 retains 100% of its >41,000-char conclusion!
  const concludedWire = stateV1.hosts[0].bridgeState.tasks[9]
  assert.equal(concludedWire.id, 'agy-ide:concluded-9')
  assert.equal(concludedWire.wireTruncated, false)
  assert.equal(concludedWire.transcript.at(-1).text, full42kConclusion)

  // 2. Capture digest at stateV1, advance 1 running task on mac-1, and verify delta size & bit-for-bit merge equality
  const digestV1 = captureStateDigest(stateV1)
  nowMs += 1500
  hub.handleHeartbeat({
    hostId: 'mac-1',
    hostName: 'Mac-1',
    bridgeState: {
      tasks: buildHostTasks(1, 2),
      approvals: [],
      workspaces: stateV1.hosts[0].bridgeState.workspaces,
    },
  })
  const stateV2 = hub.getFullState()
  assert.equal(stateV2.stateSeq, stateV1.stateSeq + 1)

  const { hasChanges, delta } = buildStateDelta(digestV1, stateV2)
  assert.equal(hasChanges, true)
  assert.equal(delta.prevSeq, stateV1.stateSeq)
  assert.equal(delta.stateSeq, stateV2.stateSeq)
  // Only mac-1 changed, and only 1 task (`agy-ide:running-0`) is in upsertedTasks!
  assert.equal(delta.hosts.length, 1)
  assert.equal(delta.hosts[0].hostId, 'mac-1')
  assert.equal(delta.hosts[0].upsertedTasks.length, 1)
  assert.equal(delta.hosts[0].upsertedTasks[0].id, 'agy-ide:running-0')
  assert.equal(delta.hosts[0].bridgeMeta, undefined)

  const fullGzBytes = gzipSync(Buffer.from(JSON.stringify(stateV2), 'utf8')).length
  const deltaGzBytes = gzipSync(Buffer.from(JSON.stringify(delta), 'utf8')).length
  assert.ok(deltaGzBytes < 2500, `Expected gzipped state_delta < 2.5KB, got ${deltaGzBytes} bytes`)
  assert.ok(deltaGzBytes < fullGzBytes * 0.25, `Expected delta (${deltaGzBytes}B) << full (${fullGzBytes}B)`)

  const merged = applyStateDelta(stateV1, delta)
  assert.equal(merged.ok, true)
  assert.equal(merged.noop, false)
  assert.deepStrictEqual(merged.state, stateV2)

  // Duplicate / already-applied delta is a clean no-op; sequence gap requests resync
  const dupMerge = applyStateDelta(stateV2, delta)
  assert.equal(dupMerge.ok, true)
  assert.equal(dupMerge.noop, true)
  const gapMerge = applyStateDelta(stateV1, { ...delta, prevSeq: stateV1.stateSeq + 5, stateSeq: stateV1.stateSeq + 6 })
  assert.equal(gapMerge.ok, false)
  assert.equal(gapMerge.reason, 'seq_mismatch')

  // 3. Verify live HTTP `/api/events?initial=0&delta=1&seq=...` emits `event: state_delta` and catches up on seq gap
  const { server } = createHubServer({
    hub,
    token: 'test-v060-delta-sse-secret-123456',
    requireToken: true,
    sseMinIntervalMs: 50,
    sseMaxLifetimeMs: 260,
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'

    // 3a. Aligned seq -> emits ping + `event: state_delta` (zero full `event: state` frames!)
    const alignedResp = await fetch(
      `http://127.0.0.1:${port}/api/events?initial=0&delta=1&seq=${stateV2.stateSeq}&token=test-v060-delta-sse-secret-123456`,
      { headers: { 'accept-encoding': 'gzip', 'user-agent': ua } },
    )
    assert.equal(alignedResp.status, 200)
    const alignedTextPromise = alignedResp.text()
    nowMs += 1000
    hub.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac-1',
      bridgeState: {
        tasks: buildHostTasks(1, 3),
        approvals: [],
        workspaces: stateV1.hosts[0].bridgeState.workspaces,
      },
    })
    const alignedRaw = await alignedTextPromise
    assert.equal((alignedRaw.match(/^event: state$/gm) || []).length, 0)
    assert.ok((alignedRaw.match(/^event: state_delta$/gm) || []).length >= 1)
    assert.match(alignedRaw, /进度更新 #3/)

    // 3b. Stale seq on reconnect -> immediately emits catch-up `event: state`
    const staleResp = await fetch(
      `http://127.0.0.1:${port}/api/events?initial=0&delta=1&seq=1&token=test-v060-delta-sse-secret-123456`,
      { headers: { 'accept-encoding': 'gzip', 'user-agent': ua } },
    )
    const staleRaw = await staleResp.text()
    assert.equal((staleRaw.match(/^event: state$/gm) || []).length, 1)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }

  // 4. Verify frontend bundle includes delta SSE, WebKit-safe screenshot compressor, command timeout & SSE teardown
  const assetFiles = await readdir(join(process.cwd(), 'hub/public/assets'))
  const jsContents = await Promise.all(
    assetFiles.filter(f => f.endsWith('.js')).map(f => readFile(join(process.cwd(), 'hub/public/assets', f), 'utf8')),
  )
  const bundleSrc = jsContents.join('\n')
  assert.match(bundleSrc, /state_delta/)
  assert.match(bundleSrc, /function applyStateDelta\(/)
  assert.match(bundleSrc, /createObjectURL/)
  assert.match(bundleSrc, /function apiFetchWithTimeout\(/)
  assert.match(bundleSrc, /function closeSSE\(/)
})

test('v0.6.1: compact session list labels, multi-mini host disambiguation, timestamp workspace labels & SVG sprite badges', async () => {
  const {
    renderHarnessBadgeHtml,
    formatCompactProjectLabel,
    normalizeDeviceModelShort,
    buildShortHostNameMap,
    stripRedundantProjectPrefix,
  } = await import('../../hub/web/src/utils/session-labels.js')

  // 1. User's 3 real Macs: Air + 2 Mac minis (Chinese `的` and macOS pinyin `de` hostname)
  const threeMacsMap = buildShortHostNameMap([
    { hostId: 'ccs-macbook-air', hostName: 'cc的MacBook Air' },
    { hostId: 'digtalhealthlinkdemac-mini', hostName: 'digtalhealthlink的Mac mini' },
    { hostId: 'no2demac-mini', hostName: 'no2demac-mini' },
  ])
  assert.deepStrictEqual(threeMacsMap, {
    'ccs-macbook-air': 'Air',
    'digtalhealthlinkdemac-mini': 'digtal·Mini',
    'no2demac-mini': 'no2·Mini',
  })

  // Single Mac mini without collision keeps readable `Mac mini`
  const singleMiniMap = buildShortHostNameMap([
    { hostId: 'ccs-macbook-air', hostName: 'cc的MacBook Air' },
    { hostId: 'digtalhealthlinkdemac-mini', hostName: 'digtalhealthlink的Mac mini' },
  ])
  assert.deepStrictEqual(singleMiniMap, {
    'ccs-macbook-air': 'Air',
    'digtalhealthlinkdemac-mini': 'Mac mini',
  })

  // Corporate numbered hosts sharing 6-char prefix remain distinct
  const numberedMap = buildShortHostNameMap([
    { hostId: 'm1', hostName: 'studio-node-1的Mac mini' },
    { hostId: 'm2', hostName: 'studio-node-2的Mac mini' },
  ])
  assert.notEqual(numberedMap.m1, numberedMap.m2)
  assert.equal(normalizeDeviceModelShort('MacBook Pro 16'), 'MBP')

  // 2. Timestamped WorkBuddy playground folders: today -> H:mm, yesterday -> MM/DD HH:mm (no collision!), cross-year -> YYYY/MM/DD HH:mm
  const refNow = new Date(2026, 10, 11, 14, 30, 0) // 2026-11-11 14:30 local
  assert.equal(formatCompactProjectLabel('2026-11-11-11-59-48', refNow), '11:59')
  assert.equal(formatCompactProjectLabel('2026-11-11-09-05-00', refNow), '9:05')
  assert.equal(formatCompactProjectLabel('2026-11-10-15-09-31', refNow), '11/10 15:09')
  assert.equal(formatCompactProjectLabel('2026-11-10-10-12-05', refNow), '11/10 10:12')
  assert.notEqual(
    formatCompactProjectLabel('2026-11-10-15-09-31', refNow),
    formatCompactProjectLabel('2026-11-10-10-12-05', refNow),
  )
  assert.equal(formatCompactProjectLabel('2026-11-10', refNow), '11/10')
  assert.equal(formatCompactProjectLabel('2025-12-31-09-05-00', refNow), '2025/12/31 09:05')
  assert.equal(formatCompactProjectLabel('deepseekharness-remote', refNow), 'deepseekharness-remote')
  assert.equal(formatCompactProjectLabel('', refNow), '默认工作区')

  // 3. Redundant `<project> / ` prefix stripping
  assert.equal(
    stripRedundantProjectPrefix('deepseekharness-remote / 开源准备与文档审查', 'deepseekharness-remote'),
    '开源准备与文档审查',
  )
  assert.equal(stripRedundantProjectPrefix('2026-11-10-15-09-31 / 你好', '2026-11-10-15-09-31'), '你好')
  assert.equal(stripRedundantProjectPrefix('独立标题不含前缀', 'blender'), '独立标题不含前缀')

  // 4. SVG badge HTML & compiled bundle checks (WebKit-safe 24x24 sprite + intrinsic 16x16 fallback)
  const ideBadge = renderHarnessBadgeHtml('antigravity-ide', 'row', 'Antigravity IDE')
  assert.match(ideBadge, /width="16" height="16" viewBox="0 0 24 24"/)
  assert.match(ideBadge, /<use href="#dsh-icon-ide"\/>/)
  assert.match(renderHarnessBadgeHtml('workbuddy', 'pill'), /#dsh-icon-workbuddy/)
  assert.match(renderHarnessBadgeHtml('codex', 'chip'), /#dsh-icon-codex/)
  assert.match(renderHarnessBadgeHtml('claude', 'inline'), /#dsh-icon-claude/)
  assert.match(renderHarnessBadgeHtml('dsh', 'row'), /#dsh-icon-dsh/)

  const assetFiles = await readdir(join(process.cwd(), 'hub/public/assets'))
  const jsContents = await Promise.all(
    assetFiles.filter(f => f.endsWith('.js')).map(f => readFile(join(process.cwd(), 'hub/public/assets', f), 'utf8')),
  )
  const bundleSrc = jsContents.join('\n')
  assert.match(bundleSrc, /dshHarnessSvgDefs/)
  assert.match(bundleSrc, /width="24" height="24" viewBox="0 0 24 24"/)
  assert.match(bundleSrc, /dsh-icon-workbuddy/)
  assert.match(bundleSrc, /dsh-icon-codex/)
})
