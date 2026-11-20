import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as zlib from 'node:zlib'
import {
  loadAntigravityIdeSessions,
  setAntigravityConversationTitle,
} from '../lib/antigravity-ide.js'
import { ClaudeAdapter } from '../lib/harnesses/claude-adapter.js'
import { HubAgent } from '../lib/hub-agent.js'
import {
  clearCustomSessionTitle,
  loadDiskSessionsFromDshHome,
  renameDiskSession,
} from '../lib/workspace-ops.js'

function createFakeAntigravityTranscript(brainDir, convId, promptText = 'hello from desktop') {
  const logsDir = join(brainDir, convId, '.system_generated', 'logs')
  mkdirSync(logsDir, { recursive: true })
  const lines = [
    JSON.stringify({
      step_index: 0,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      status: 'DONE',
      created_at: new Date(Date.now() - 15_000).toISOString(),
      content: promptText,
    }),
    JSON.stringify({
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      created_at: new Date(Date.now() - 5_000).toISOString(),
      content: 'Done!',
    }),
  ]
  writeFileSync(join(logsDir, 'transcript.jsonl'), `${lines.join('\n')}\n`, 'utf8')
}

describe('Bidirectional Session Title Sync (Antigravity IDE, Claude Code, DSH)', () => {
  it('syncs Antigravity IDE titles via UpdateConversationAnnotations RPC, pbtxt fallback, and desktop -> mobile read', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'dsh-agy-title-sync-'))
    try {
      const agyRoot = join(tmpRoot, 'antigravity')
      const brainDir = join(agyRoot, 'brain')
      const annDir = join(agyRoot, 'annotations')
      const dshHome = join(tmpRoot, 'dsh-home')
      mkdirSync(annDir, { recursive: true })
      mkdirSync(dshHome, { recursive: true })

      const convId = '11111111-2222-3333-4444-555555555555'
      createFakeAntigravityTranscript(brainDir, convId, 'Initial prompt text')
      writeFileSync(
        join(annDir, `${convId}.pbtxt`),
        'title:"Old Desktop Title"  last_user_view_time:{seconds:1795158000  nanos:0}  pinned:true',
        'utf8',
      )

      // 1. Offline pbtxt fallback preserves pinned:true & last_user_view_time and updates title
      const offlineRes = await setAntigravityConversationTitle(`agy-ide:${convId}`, '手机改的新名字', {
        brainDirs: [brainDir],
        execImpl: async () => ({ stdout: '' }),
        fetchImpl: null,
      })
      assert.equal(offlineRes.ok, true)
      assert.equal(offlineRes.method, 'pbtxt')
      const afterPbtxt = readFileSync(join(annDir, `${convId}.pbtxt`), 'utf8')
      assert.ok(afterPbtxt.includes('title:"手机改的新名字"'))
      assert.ok(afterPbtxt.includes('pinned:true'))
      assert.ok(afterPbtxt.includes('last_user_view_time:{seconds:1795158000  nanos:0}'))

      // 2. Desktop -> Mobile read picks up the updated pbtxt title cleanly
      const loadedOffline = await loadAntigravityIdeSessions({
        brainDirs: [brainDir],
        dshHome,
        execImpl: async () => ({ stdout: '' }),
        fetchImpl: null,
      })
      assert.equal(loadedOffline.length, 1)
      assert.equal(loadedOffline[0].title, '手机改的新名字')
      assert.equal(loadedOffline[0].pinned, true)

      // 3. Online Connect-RPC UpdateConversationAnnotations sends `{ cascadeId, annotations: { title }, mergeAnnotations: true }`
      const rpcCalls = []
      const fakeExec = async () => ({
        stdout: '9999 /Users/cc/.gemini/bin/agy --hub --hub-port=54999 --csrf_token=tok-title-test\n',
      })
      const fakeFetch = async (url, opts) => {
        const body = opts?.body ? JSON.parse(opts.body) : {}
        rpcCalls.push({ url, body })
        if (url.endsWith('/GetAllCascadeTrajectories')) {
          return {
            ok: true,
            json: async () => ({
              trajectorySummaries: {
                [convId]: {
                  summary: 'Old Summary',
                  annotations: { title: '电脑刚改的新标题', pinned: true },
                  status: 'CASCADE_RUN_STATUS_IDLE',
                  lastModifiedTime: new Date().toISOString(),
                },
              },
            }),
          }
        }
        return { ok: true, json: async () => ({}) }
      }

      // Live annotations.title from Desktop wins immediately over stale summary/pbtxt
      const loadedLive = await loadAntigravityIdeSessions({
        brainDirs: [brainDir],
        dshHome,
        execImpl: fakeExec,
        fetchImpl: fakeFetch,
      })
      assert.equal(loadedLive[0].title, '电脑刚改的新标题')

      // Phone -> Desktop RPC call sends UpdateConversationAnnotations with annotations.title
      const rpcRes = await setAntigravityConversationTitle(`agy-ide:${convId}`, '两端互通测试', {
        brainDirs: [brainDir],
        execImpl: fakeExec,
        fetchImpl: fakeFetch,
      })
      assert.equal(rpcRes.ok, true)
      assert.equal(rpcRes.method, 'connect-rpc')
      const updateCall = rpcCalls.find(c => c.url.endsWith('/UpdateConversationAnnotations'))
      assert.ok(updateCall, 'expected UpdateConversationAnnotations RPC call')
      assert.deepEqual(updateCall.body, {
        cascadeId: convId,
        annotations: { title: '两端互通测试' },
        mergeAnnotations: true,
      })

      // 4. HubAgent rename_session routes Antigravity natively and clears stale session-titles.json override
      writeFileSync(
        join(dshHome, 'session-titles.json'),
        JSON.stringify({ [`agy-ide:${convId}`]: '旧的锁死标题' }),
        'utf8',
      )
      const hubAgent = new HubAgent({
        config: {
          dshHome,
          hubUrl: 'http://127.0.0.1:1',
          hubToken: 'tok',
          hostId: 'h1',
          hostName: 'TestMac',
          antigravityBrainDirs: [brainDir],
        },
        bridge: {
          agents: { list: () => [], get: () => undefined },
          executeHubCommand: async () => ({ ok: true }),
        },
        execImpl: fakeExec,
        fetchImpl: fakeFetch,
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      })
      hubAgent.cachedAgySessions = [{ id: `agy-ide:${convId}`, title: '旧的锁死标题' }]
      const cmdRes = await hubAgent.handleHubCommand({
        id: 'cmd-rename-agy',
        type: 'rename_session',
        agentId: `agy-ide:${convId}`,
        title: '同步成功标题',
      })
      assert.equal(cmdRes.ok, true)
      assert.equal(cmdRes.title, '同步成功标题')
      assert.equal(hubAgent.cachedAgySessions[0].title, '同步成功标题')
      const remainingOverrides = JSON.parse(readFileSync(join(dshHome, 'session-titles.json'), 'utf8'))
      assert.equal(`agy-ide:${convId}` in remainingOverrides, false)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  it('syncs Claude Code custom-title records bidirectionally in ~/.claude/projects/*.jsonl', async () => {
    const tmpClaudeHome = mkdtempSync(join(tmpdir(), 'dsh-claude-title-sync-'))
    try {
      const projDir = join(tmpClaudeHome, 'projects', '-tmp-demo')
      mkdirSync(projDir, { recursive: true })
      const rawId = 'sess-claude-rename-1'
      const jsonlPath = join(projDir, `${rawId}.jsonl`)
      writeFileSync(
        jsonlPath,
        [
          JSON.stringify({
            type: 'user',
            sessionId: rawId,
            cwd: '/tmp/demo',
            timestamp: new Date(Date.now() - 10_000).toISOString(),
            message: { role: 'user', content: 'Help me refactor auth middleware' },
          }),
          JSON.stringify({
            type: 'assistant',
            sessionId: rawId,
            timestamp: new Date(Date.now() - 5_000).toISOString(),
            message: { role: 'assistant', content: [{ type: 'text', text: 'Refactored!' }] },
          }),
        ].join('\n') + '\n',
        'utf8',
      )

      const adapter = new ClaudeAdapter({ claudeHome: tmpClaudeHome, binaryPath: '' })
      let sessions = await adapter.listSessions()
      assert.equal(sessions.length, 1)
      assert.equal(sessions[0].title, 'Help me refactor auth middleware')

      // Phone -> Claude Code native custom-title append
      const renRes = await adapter.renameSession({
        sessionId: `claude:${rawId}`,
        title: '鉴权中间件重构',
      })
      assert.equal(renRes.ok, true)
      assert.equal(renRes.method, 'claude-jsonl')
      sessions = await adapter.listSessions()
      assert.equal(sessions[0].title, '鉴权中间件重构')

      // Desktop Claude Code `/rename` appends another custom-title -> Mobile picks it up automatically
      writeFileSync(
        jsonlPath,
        readFileSync(jsonlPath, 'utf8') +
          `${JSON.stringify({ type: 'custom-title', customTitle: '桌面端新名称', sessionId: rawId })}\n`,
        'utf8',
      )
      sessions = await adapter.listSessions()
      assert.equal(sessions[0].title, '桌面端新名称')
    } finally {
      rmSync(tmpClaudeHome, { recursive: true, force: true })
    }
  })

  it('appends native zstd session/title frame for offline DSH sessions and clears stale session-titles.json', async () => {
    const tmpDshHome = mkdtempSync(join(tmpdir(), 'dsh-disk-title-sync-'))
    try {
      const sessId = 'session-title-test-1'
      const sessDir = join(tmpDshHome, 'sessions', 'demo-proj', sessId)
      mkdirSync(sessDir, { recursive: true })
      const zstdPath = join(sessDir, 'session.v4.jsonl.zstd')

      const baseLines = [
        JSON.stringify({ type: 'session', id: sessId, cwd: '/tmp/demo-proj', time: Date.now() - 20_000 }),
        JSON.stringify({ type: 'session/title', time: Date.now() - 19_000, data: { title: '原始桌面标题' } }),
        JSON.stringify({
          type: 'user/message',
          time: Date.now() - 18_000,
          data: { message: { content: [{ type: 'text', text: 'Run tests' }] } },
        }),
        JSON.stringify({
          type: 'assistant/message',
          time: Date.now() - 10_000,
          data: { message: { content: [{ type: 'text', text: 'All tests passed.' }] } },
        }),
      ].join('\n') + '\n'

      writeFileSync(zstdPath, zlib.zstdCompressSync(Buffer.from(baseLines, 'utf8')))
      writeFileSync(
        join(tmpDshHome, 'session-titles.json'),
        JSON.stringify({ [sessId]: '旧的私有标题' }),
        'utf8',
      )

      const ren = await renameDiskSession(tmpDshHome, sessId, '手机同步的新标题')
      assert.equal(ren.ok, true)
      assert.equal(ren.method, 'dsh-zstd')

      const overridesAfter = JSON.parse(readFileSync(join(tmpDshHome, 'session-titles.json'), 'utf8'))
      assert.equal(sessId in overridesAfter, false)

      let sessions = await loadDiskSessionsFromDshHome(tmpDshHome, { syncWorkspaceStorage: false })
      assert.equal(sessions.length, 1)
      assert.equal(sessions[0].title, '手机同步的新标题')

      // Subsequent desktop rename appended as another zstd frame wins immediately
      const desktopFrame = zlib.zstdCompressSync(
        Buffer.from(
          `${JSON.stringify({ type: 'session/title', time: Date.now() + 1000, data: { title: '电脑二次改名' } })}\n`,
          'utf8',
        ),
      )
      writeFileSync(zstdPath, Buffer.concat([readFileSync(zstdPath), desktopFrame]))
      sessions = await loadDiskSessionsFromDshHome(tmpDshHome, { syncWorkspaceStorage: false })
      assert.equal(sessions[0].title, '电脑二次改名')

      // clearCustomSessionTitle works safely on missing/present keys
      const clr = await clearCustomSessionTitle(tmpDshHome, ['non-existent'])
      assert.equal(clr.ok, true)
      assert.equal(clr.removed, false)
    } finally {
      rmSync(tmpDshHome, { recursive: true, force: true })
    }
  })
})
