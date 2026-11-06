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
import { ClaudeAdapter } from '../lib/harnesses/claude-adapter.js'
import { CodexAdapter } from '../lib/harnesses/codex-adapter.js'
import { applyStateHysteresis, executeAntigravityIdeAction, loadAntigravityIdeSessions, parseAntigravityTranscript } from '../lib/antigravity-ide.js'
import { checkAccessibilityPermission, fastScanBrainDirs, getTurboNativeBinaryPath } from '../../dsh-turbo/index.js'
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
    const realHistPath = '/Users/cc/.gemini/antigravity-ide/brain/fcba452e-076a-4750-998f-0c357e11b7ad/.system_generated/logs/transcript.jsonl'
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
    tool_calls: [{ id: 'tc-1', name: 'read_file', arguments: '{"Path":"/Users/cc/app/index.js"}' }],
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

  const fakeElements = {
    globalPromptInput: {
      value: '已有前缀 ',
      focused: false,
      focus() { this.focused = true },
    },
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
    getElementById(id) { return fakeElements[id] || null },
  }
  const fakeNavigator = { language: 'zh-CN' }
  const toasts = []
  let composerInputCalls = 0

  const factory = new Function(
    'window',
    'document',
    'navigator',
    `${cleanJs}\nreturn { toggleVoiceInput, stopVoiceInput, isVoiceRecording };`,
  )
  const voice = factory(fakeWindow, fakeDocument, fakeNavigator)
  const deps = {
    showToast(msg) { toasts.push(msg) },
    onComposerInput() { composerInputCalls += 1 },
  }

  // 1) First click starts recording
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(startCalled, 1)
  assert.equal(voice.isVoiceRecording(), true)
  assert.equal(fakeElements.chatVoiceBtn.classList.contains('recording'), true)
  assert.equal(fakeElements.chatVoiceBtn.textContent, '⏹')
  assert.equal(fakeElements.chatVoiceBtn.attrs['aria-pressed'], 'true')

  // 2) Speech recognition emits interim + final result
  lastInstance.onresult({
    resultIndex: 0,
    results: [
      { isFinal: true, 0: { transcript: '帮我检查测试' } },
    ],
  })
  assert.equal(fakeElements.globalPromptInput.value, '已有前缀 帮我检查测试')
  assert.equal(composerInputCalls, 1)

  // 3) Second click immediately stops recording, calls abort() + stop(), detaches callbacks, resets UI
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
  assert.ok(toasts.some(t => t.includes('已关闭语音输入')))
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
        "Exit code 128\nfatal: Unable to create '/Users/cc/deepseekharness-remote/.git/index.lock': Operation not permitted",
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
  assert.equal(healthRes.build.version, '0.2.0')
  assert.ok(healthRes.build.uiBuild)
  assert.ok(healthRes.build.startedAt > 0)

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
            cwd: '/Users/cc/proj',
            transcript: [{ role: 'user', text: '跑测试' }],
          },
          {
            id: 'codex:idle-2',
            harness: 'codex',
            harnessLabel: 'Codex CLI',
            controlMode: 'idle-resumable',
            title: '空闲可续跑的 Codex',
            status: 'idle',
            cwd: '/Users/cc/proj',
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
        payload: { id: codexUuid, cwd: '/Users/cc/chinagooglerun', model_provider: 'openai' },
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
    const claudeProjDir = join(claudeHome, 'projects', '-Users-cc-hermes-agent')
    await mkdir(claudeProjDir, { recursive: true })
    const fakeClaudeBin = join(tmpDir, 'fake-claude')
    await writeFile(fakeClaudeBin, '#!/bin/sh\nexit 0\n', { mode: 0o755 })

    const claudeUuid = '7417154f-5cf2-498b-bdcf-380337e11411'
    const claudeLines = [
      JSON.stringify({
        type: 'user',
        sessionId: claudeUuid,
        cwd: '/Users/cc/hermes-agent',
        timestamp: '2026-05-15T01:09:33.930Z',
        message: { role: 'user', content: '当前请求:\n写一个完整的Python数据分析脚本' },
      }),
      JSON.stringify({
        type: 'assistant',
        sessionId: claudeUuid,
        cwd: '/Users/cc/hermes-agent',
        timestamp: '2026-05-15T01:10:12.108Z',
        message: {
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          content: [
            { type: 'thinking', thinking: '先设计 CSV 解析与统计模块' },
            { type: 'tool_use', name: 'write_file', input: { path: '/Users/cc/hermes-agent/data_analysis.py' } },
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
    assert.equal(codexSessions[0].cwd, '/Users/cc/chinagooglerun')
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
      cwd: '/Users/cc/chinagooglerun',
    })
    assert.equal(codexRes.ok, true)
    assert.equal(executedCmds[0].bin, fakeCodexBin)
    assert.deepEqual(executedCmds[0].args.slice(0, 4), ['exec', 'resume', codexUuid, '补充 Dockerfile 示例'])

    const claudeRes = await claudeAdapter.sendPrompt({
      sessionId: `claude:${claudeUuid}`,
      text: '增加箱线图支持',
      cwd: '/Users/cc/hermes-agent',
    })
    assert.equal(claudeRes.ok, true)
    assert.equal(executedCmds[1].bin, fakeClaudeBin)
    assert.deepEqual(executedCmds[1].args, ['--resume', claudeUuid, '-p', '增加箱线图支持'])
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})











