import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  loadAntigravityIdeSessions,
  setAntigravityConversationPinned,
} from '../lib/antigravity-ide.js'
import { CodexAdapter } from '../lib/harnesses/codex-adapter.js'
import { WorkBuddyAdapter } from '../lib/harnesses/workbuddy-adapter.js'
import { HubAgent } from '../lib/hub-agent.js'
import {
  readDshWorkspaceStorage,
  setSessionPinnedInDshWorkspaceStorage,
} from '../lib/workspace-ops.js'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'

test('DSH workspace.json global.pinnedSessionIds syncs bidirectionally without losing workspace tables', async () => {
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-pin-test-'))
  try {
    const storagesDir = join(dshHome, 'storages')
    await mkdir(storagesDir, { recursive: true })
    await writeFile(
      join(storagesDir, 'workspace.json'),
      JSON.stringify({
        unit: { version: 2 },
        global: {
          initialized: true,
          workspaceIds: ['ws-1'],
          archivedSessionIds: ['session-archived-1'],
          pinnedSessionIds: ['session-existing-pin'],
        },
        tables: {
          workspaces: {
            'ws-1': { id: 'ws-1', cwd: '/Users/dev/project', sessionIds: ['session-existing-pin', 'session-new-pin'] },
          },
        },
      }),
      'utf8',
    )

    const initial = await readDshWorkspaceStorage(dshHome)
    assert.equal(initial.pinnedSet.has('session-existing-pin'), true)
    assert.equal(initial.pinnedSet.has('session-new-pin'), false)

    const pinRes = await setSessionPinnedInDshWorkspaceStorage(dshHome, 'session-new-pin', true)
    assert.equal(pinRes.ok, true)

    const afterPin = await readDshWorkspaceStorage(dshHome)
    assert.equal(afterPin.pinnedSet.has('session-existing-pin'), true)
    assert.equal(afterPin.pinnedSet.has('session-new-pin'), true)
    assert.equal(afterPin.archivedSet.has('session-archived-1'), true)
    assert.equal(afterPin.raw.tables.workspaces['ws-1'].cwd, '/Users/dev/project')

    const unpinRes = await setSessionPinnedInDshWorkspaceStorage(dshHome, 'session-existing-pin', false)
    assert.equal(unpinRes.ok, true)

    const afterUnpin = await readDshWorkspaceStorage(dshHome)
    assert.equal(afterUnpin.pinnedSet.has('session-existing-pin'), false)
    assert.equal(afterUnpin.pinnedSet.has('session-new-pin'), true)
  } finally {
    await rm(dshHome, { recursive: true, force: true })
  }
})

test('CodexAdapter reads and writes .codex-global-state.json pinned-thread-ids cleanly', async () => {
  const codexHome = await mkdtemp(join(tmpdir(), 'codex-pin-test-'))
  try {
    const dayDir = join(codexHome, 'sessions', '2026', '11', '19')
    await mkdir(dayDir, { recursive: true })
    const threadId = '019abcde-1111-7222-8333-444455556666'
    const sessionJsonl = [
      JSON.stringify({
        timestamp: '2026-11-19T02:00:00.000Z',
        type: 'session_meta',
        payload: { id: threadId, cwd: '/Users/dev/codex-app' },
      }),
      JSON.stringify({
        timestamp: '2026-11-19T02:00:01.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'Check Codex pin sync' }],
        },
      }),
      JSON.stringify({
        timestamp: '2026-11-19T02:00:02.000Z',
        type: 'response_item',
        payload: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Codex pin sync verified.' }],
        },
      }),
    ].join('\n')
    await writeFile(join(dayDir, `rollout-2026-11-19T02-00-00-${threadId}.jsonl`), `${sessionJsonl}\n`, 'utf8')
    await writeFile(
      join(codexHome, '.codex-global-state.json'),
      JSON.stringify({
        'active-workspace-roots': ['/Users/dev/codex-app'],
        'pinned-thread-ids': [threadId],
      }),
      'utf8',
    )

    const adapter = new CodexAdapter({ codexHome })
    const list1 = await adapter.listSessions()
    const s1 = list1.find(s => s.id === `codex:${threadId}`)
    assert.ok(s1)
    assert.equal(s1.pinned, true)

    await adapter.pinSession({ sessionId: `codex:${threadId}`, pinned: false })
    const rawAfterUnpin = JSON.parse(await readFile(join(codexHome, '.codex-global-state.json'), 'utf8'))
    assert.deepEqual(rawAfterUnpin['active-workspace-roots'], ['/Users/dev/codex-app'])
    assert.deepEqual(rawAfterUnpin['pinned-thread-ids'], [])

    const list2 = await adapter.listSessions()
    assert.equal(list2.find(s => s.id === `codex:${threadId}`)?.pinned, false)

    await adapter.pinSession({ sessionId: `codex:${threadId}`, pinned: true })
    const list3 = await adapter.listSessions()
    assert.equal(list3.find(s => s.id === `codex:${threadId}`)?.pinned, true)
  } finally {
    await rm(codexHome, { recursive: true, force: true })
  }
})

test('WorkBuddyAdapter pinSession persists and surfaces pinned state across listSessions', async () => {
  const wbHome = await mkdtemp(join(tmpdir(), 'wb-pin-test-'))
  try {
    await writeFile(
      join(wbHome, 'sessions.json'),
      JSON.stringify([
        {
          id: 'wb-sess-1',
          title: 'WorkBuddy Pin Test',
          cwd: '/Users/dev/wb-proj',
          updated_at: Date.now(),
        },
      ]),
      'utf8',
    )

    const adapter = new WorkBuddyAdapter({ workbuddyHome: wbHome })
    const before = await adapter.listSessions()
    const itemBefore = before.find(s => s.id === 'workbuddy:wb-sess-1')
    assert.ok(itemBefore)
    assert.equal(itemBefore.pinned, false)

    const pinRes = await adapter.pinSession({ sessionId: 'workbuddy:wb-sess-1', pinned: true })
    assert.equal(pinRes.ok, true)

    const after = await adapter.listSessions()
    assert.equal(after.find(s => s.id === 'workbuddy:wb-sess-1')?.pinned, true)
  } finally {
    await rm(wbHome, { recursive: true, force: true })
  }
})

test('HubCore and HubAgent synchronize pins bidirectionally across mobile API and desktop heartbeats', async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), 'hub-pin-e2e-'))
  try {
    const dshHome = join(tmpRoot, 'dsh')
    await mkdir(join(dshHome, 'storages'), { recursive: true })
    let clock = 1_795_060_000_000
    const hub = new HubCore({
      stateFile: join(tmpRoot, 'hub-state.json'),
      now: () => clock,
    })

    // 1. Desktop heartbeat arrives with a session initially pinned on desktop (e.g. Codex) and one unpinned DSH session
    hub.handleHeartbeat({
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      bridgeState: {
        tasks: [
          {
            id: 'codex:desk-pinned-1',
            harness: 'codex',
            title: 'Desktop Pinned Thread',
            status: 'idle',
            pinned: true,
            transcript: [{ role: 'user', text: 'hi' }],
          },
          {
            id: 'session-dsh-2',
            harness: 'dsh',
            title: 'Mobile Will Pin Me',
            status: 'idle',
            pinned: false,
            transcript: [{ role: 'user', text: 'hello' }],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })

    // Desktop-pinned session is immediately reflected in Hub sessionPinState for all mobile clients
    assert.equal(hub.getFullState().sessionPinState['codex:desk-pinned-1']?.pinned, true)

    // 2. Mobile user pins `session-dsh-2` via Hub API -> queues `pin_session` command to host
    clock += 1000
    const pinOut = hub.setSessionPinned({
      sessionId: 'session-dsh-2',
      hostId: 'mac-studio',
      pinned: true,
      source: 'client',
    })
    assert.equal(pinOut.ok, true)
    assert.equal(hub.getFullState().sessionPinState['session-dsh-2']?.pinned, true)

    // Even if host was offline for 20s before pulling the command, the pull heartbeat must NOT clobber client pin!
    clock += 20_000
    const hbPull = hub.handleHeartbeat({
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      bridgeState: {
        tasks: [
          {
            id: 'codex:desk-pinned-1',
            harness: 'codex',
            title: 'Desktop Pinned Thread',
            status: 'idle',
            pinned: true,
            transcript: [{ role: 'user', text: 'hi' }],
          },
          {
            id: 'session-dsh-2',
            harness: 'dsh',
            title: 'Mobile Will Pin Me',
            status: 'idle',
            pinned: false,
            transcript: [{ role: 'user', text: 'hello' }],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })
    const pinCmd = hbPull.commands.find(c => c.type === 'pin_session' && c.agentId === 'session-dsh-2')
    assert.ok(pinCmd, 'Expected HubCore to dispatch pin_session to mac-studio')
    assert.equal(pinCmd.pinned, true)
    assert.equal(hub.getFullState().sessionPinState['session-dsh-2']?.pinned, true)

    // 3. Host HubAgent executes `pin_session` and writes directly into DSH workspace.json
    const hubAgent = new HubAgent({
      config: { dshHome, hostId: 'mac-studio', enableExternalHarnesses: false },
      bridge: { agents: new Map(), getStateSnapshot: () => ({ tasks: [], approvals: [], workspaces: [] }) },
    })
    const cmdRes = await hubAgent.handleHubCommand(pinCmd)
    assert.equal(cmdRes.ok, true)
    const wsAfterMobilePin = await readDshWorkspaceStorage(dshHome)
    assert.equal(wsAfterMobilePin.pinnedSet.has('session-dsh-2'), true)

    // Host reports updated `pinned: true` on next heartbeat
    clock += 2_000
    hub.handleHeartbeat({
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      commandResults: [cmdRes],
      bridgeState: {
        tasks: [
          {
            id: 'codex:desk-pinned-1',
            harness: 'codex',
            title: 'Desktop Pinned Thread',
            status: 'idle',
            pinned: true,
            transcript: [{ role: 'user', text: 'hi' }],
          },
          {
            id: 'session-dsh-2',
            harness: 'dsh',
            title: 'Mobile Will Pin Me',
            status: 'idle',
            pinned: true,
            transcript: [{ role: 'user', text: 'hello' }],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })

    // 4. Later, user unpins BOTH sessions directly inside their Desktop harnesses -> Hub updates sessionPinState to false!
    clock += 15_000
    hub.handleHeartbeat({
      hostId: 'mac-studio',
      hostName: 'Mac Studio',
      bridgeState: {
        tasks: [
          {
            id: 'codex:desk-pinned-1',
            harness: 'codex',
            title: 'Desktop Pinned Thread',
            status: 'idle',
            pinned: false,
            transcript: [{ role: 'user', text: 'hi' }],
          },
          {
            id: 'session-dsh-2',
            harness: 'dsh',
            title: 'Mobile Will Pin Me',
            status: 'idle',
            pinned: false,
            transcript: [{ role: 'user', text: 'hello' }],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })
    assert.equal(hub.getFullState().sessionPinState['codex:desk-pinned-1']?.pinned, false)
    assert.equal(hub.getFullState().sessionPinState['session-dsh-2']?.pinned, false)
  } finally {
    await rm(tmpRoot, { recursive: true, force: true })
  }
})

test('Antigravity IDE annotations/<convId>.pbtxt and UpdateConversationAnnotations RPC sync pinned state bidirectionally', async () => {
  const agyRoot = await mkdtemp(join(tmpdir(), 'agy-pin-test-'))
  try {
    const brainDir = join(agyRoot, 'brain')
    const annDir = join(agyRoot, 'annotations')
    const convId = 'e5b8d936-c3cb-4634-bfac-83fed58c8f1b'
    const logsDir = join(brainDir, convId, '.system_generated', 'logs')
    await mkdir(logsDir, { recursive: true })
    await mkdir(annDir, { recursive: true })

    const transcriptLines = [
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: '2026-11-19T03:00:00Z',
        content: '<USER_REQUEST>\n检查 Antigravity 置顶联通\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: '2026-11-19T03:00:05Z',
        content: '已读取 annotations.pbtxt 并打通双向置顶。',
      }),
    ].join('\n')
    await writeFile(join(logsDir, 'transcript.jsonl'), `${transcriptLines}\n`, 'utf8')
    await writeFile(
      join(annDir, `${convId}.pbtxt`),
      'title:"手机视频加载与文件慢排查方案"  last_user_view_time:{seconds:1795058158  nanos:829000000}  pinned:true',
      'utf8',
    )

    const noopExec = async () => ({ stdout: '' })
    const noopFetch = async () => ({ ok: false, status: 503 })

    // 1. Desktop Antigravity IDE `.pbtxt` (`pinned:true`) is surfaced immediately on `agy-ide:<convId>`
    const list1 = await loadAntigravityIdeSessions({
      brainDirs: [brainDir],
      execImpl: noopExec,
      fetchImpl: noopFetch,
    })
    const sess1 = list1.find(s => s.id === `agy-ide:${convId}`)
    assert.ok(sess1)
    assert.equal(sess1.title, '手机视频加载与文件慢排查方案')
    assert.equal(sess1.pinned, true)

    // 2. Offline `.pbtxt` unpin preserves title & last_user_view_time while clearing `pinned:true`
    const unpinDisk = await setAntigravityConversationPinned(`agy-ide:${convId}`, false, {
      brainDirs: [brainDir],
      execImpl: noopExec,
      fetchImpl: noopFetch,
    })
    assert.equal(unpinDisk.ok, true)
    assert.equal(unpinDisk.method, 'pbtxt')
    const pbtxtAfterUnpin = await readFile(join(annDir, `${convId}.pbtxt`), 'utf8')
    assert.match(pbtxtAfterUnpin, /title:"手机视频加载与文件慢排查方案"/)
    assert.doesNotMatch(pbtxtAfterUnpin, /pinned:true/)

    const list2 = await loadAntigravityIdeSessions({
      brainDirs: [brainDir],
      execImpl: noopExec,
      fetchImpl: noopFetch,
    })
    assert.equal(list2.find(s => s.id === `agy-ide:${convId}`)?.pinned, false)

    // 3. Live Connect-RPC `UpdateConversationAnnotations` sends `{ cascadeId, annotations: { pinned: true }, mergeAnnotations: true }`
    const rpcCalls = []
    const mockExec = async (cmd) => {
      if (cmd === 'ps') {
        return { stdout: '12345 /Users/cc/.gemini/bin/agy --hub --hub-port=59123 --csrf_token=test-csrf\n' }
      }
      return { stdout: '' }
    }
    const mockFetch = async (url, opts) => {
      rpcCalls.push({ url: String(url), body: JSON.parse(opts?.body || '{}'), headers: opts?.headers || {} })
      return { ok: true, status: 200, json: async () => ({}) }
    }

    const pinRpc = await setAntigravityConversationPinned(`agy-ide:${convId}`, true, {
      brainDirs: [brainDir],
      execImpl: mockExec,
      fetchImpl: mockFetch,
    })
    assert.equal(pinRpc.ok, true)
    assert.equal(pinRpc.method, 'connect-rpc')
    const updateCall = rpcCalls.find(c => c.url.endsWith('/UpdateConversationAnnotations'))
    assert.ok(updateCall)
    assert.deepEqual(updateCall.body, {
      cascadeId: convId,
      annotations: { pinned: true },
      mergeAnnotations: true,
    })
  } finally {
    await rm(agyRoot, { recursive: true, force: true })
  }
})

test('Zero-lag conclusion state: inflightCommands clear immediately on conclusion and /api/events avoids proxy gzip buffering', async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), 'hub-realtime-lag-'))
  let clock = 1_795_070_000_000
  const hub = new HubCore({
    stateFile: join(tmpRoot, 'hub-state.json'),
    now: () => clock,
  })
  const { server } = createHubServer({
    hub,
    token: 'test-realtime-zero-lag-secret-123456',
    requireToken: true,
    sseMaxLifetimeMs: 120,
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    // 1. Host online with initial 2-message session
    hub.handleHeartbeat({
      hostId: 'mac-pro',
      hostName: 'Mac Pro',
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-fast',
            harness: 'antigravity-ide',
            title: 'Fast Turn Test',
            status: 'idle',
            transcript: [
              { role: 'user', text: 'first' },
              { role: 'assistant', text: 'done 1' },
            ],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })

    // 2. Mobile queues an image-only prompt (`text: ''`) and host pulls it into `inflightCommands`
    clock += 500
    hub.queueCommand('mac-pro', {
      type: 'prompt',
      agentId: 'agy-ide:conv-fast',
      text: '',
    })
    clock += 200
    const hbPull = hub.handleHeartbeat({
      hostId: 'mac-pro',
      hostName: 'Mac Pro',
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-fast',
            harness: 'antigravity-ide',
            title: 'Fast Turn Test',
            status: 'idle',
            transcript: [
              { role: 'user', text: 'first' },
              { role: 'assistant', text: 'done 1' },
            ],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })
    assert.equal(hbPull.commands.length, 1)
    assert.equal(hub.getFullState().hosts[0].inflightCommands.length, 1)

    // 3. Task finishes 2s later (`status: 'idle'`, `lastConclusionAt > cmd.createdAt`) -> `inflightCommands` MUST be 0 immediately!
    clock += 2000
    hub.handleHeartbeat({
      hostId: 'mac-pro',
      hostName: 'Mac Pro',
      bridgeState: {
        tasks: [
          {
            id: 'agy-ide:conv-fast',
            harness: 'antigravity-ide',
            title: 'Fast Turn Test',
            status: 'idle',
            isMidTurn: false,
            turnState: 'conclusion',
            lastConclusionAt: clock,
            transcript: [
              { role: 'user', text: 'first' },
              { role: 'assistant', text: 'done 1' },
              { role: 'user', text: '[手机端上传图片附件]' },
              { role: 'assistant', text: '图片已分析完毕' },
            ],
          },
        ],
        approvals: [],
        workspaces: [],
      },
    })
    assert.equal(
      hub.getFullState().hosts[0].inflightCommands.length,
      0,
      'Concluded turn must immediately clear inflightCommands so mobile list never lingers on 运行中',
    )

    // 4. Verify `/api/events` streams uncompressed identity (no content-encoding: gzip proxy buffering)
    const { port } = server.address()
    const sseResp = await fetch(
      `http://127.0.0.1:${port}/api/events?initial=0&delta=1&token=test-realtime-zero-lag-secret-123456`,
      { headers: { 'accept-encoding': 'gzip, deflate, br' } },
    )
    assert.equal(sseResp.status, 200)
    assert.equal(sseResp.headers.get('content-encoding'), null)
    await sseResp.text()
  } finally {
    await new Promise(resolve => server.close(resolve))
    await rm(tmpRoot, { recursive: true, force: true })
  }
})
