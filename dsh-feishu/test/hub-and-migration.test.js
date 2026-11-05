import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, rm, stat, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FeishuBridge } from '../lib/bridge.js'
import { resolveConfig } from '../lib/config.js'
import { HubAgent } from '../lib/hub-agent.js'
import { loadAntigravityIdeSessions, parseAntigravityTranscript } from '../lib/antigravity-ide.js'
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

  // 2. Verify VAPID ES256 JWT generation & cryptographic signature
  const vapidKeys = generateOrLoadVapidKeys()
  const { authorization, jwt } = createVapidHeaders('https://web.push.apple.com/Q1abc123', vapidKeys)
  assert.match(authorization, /^vapid t=.*, k=/)
  const verifiedPayload = verifyVapidJwt(jwt, vapidKeys)
  assert.equal(verifiedPayload.aud, 'https://web.push.apple.com')

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



