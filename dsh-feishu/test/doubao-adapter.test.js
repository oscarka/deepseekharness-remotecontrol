import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import v8 from 'node:v8'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'
import { decorateTaskMetadata, summarizeInstalledHarnesses } from '../lib/harness-router.js'
import { DoubaoAdapter } from '../lib/harnesses/doubao-adapter.js'
import { HubAgent } from '../lib/hub-agent.js'

function buildWalRecord(v8Payloads = []) {
  const body = Buffer.concat([Buffer.alloc(12), ...v8Payloads.map(obj => v8.serialize(obj))])
  const header = Buffer.alloc(7)
  header.writeUInt16LE(body.length, 4)
  header[6] = 1 // FULL record
  return Buffer.concat([header, body])
}

test('DoubaoAdapter parses workspace + Chromium IndexedDB V8 stream + sandbox CWD in pure observe-only mode', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'doubao-parse-'))
  try {
    const sessDir = join(
      tmp,
      'Default',
      '.doubao',
      'agent_mode',
      'workspace',
      '.sessions',
      '38452759446281474',
    )
    const mainSys = join(sessDir, 'agents', 'm_main01', 'system')
    const subSys = join(sessDir, 'agents', 's_worker01', 'system')
    const attachDir = join(sessDir, 'attachments')
    const chatsDeliverableDir = join(tmp, 'DoubaoChats', 'chats', '2026-11-11', 'quarterly-sales')
    mkdirSync(mainSys, { recursive: true })
    mkdirSync(subSys, { recursive: true })
    mkdirSync(attachDir, { recursive: true })
    mkdirSync(chatsDeliverableDir, { recursive: true })

    writeFileSync(join(attachDir, 'report.xlsx'), 'mock-xlsx-binary')
    writeFileSync(join(chatsDeliverableDir, 'summary.md'), '# 季度销售总结\n同比增长 28%。')

    // 1. Active running state on board.md + recent mtime
    writeFileSync(
      join(sessDir, 'board.md'),
      [
        '# 任务公告板（board.md）· session 38452759446281474',
        '',
        `_最后更新：${new Date().toISOString()}_`,
        '',
        '| 任务ID | 标题 | Organizer | 状态 | 产物路径 | 产物链接 |',
        '| --- | --- | --- | --- | --- | --- |',
        '| t1 | 整理季度销售周报 | m_main01 | 已完成 | attachments/report.xlsx | - |',
        '| t2 | 汇总子代理竞品调研 | s_worker01 | 进行中 | - | - |',
      ].join('\n'),
    )

    writeFileSync(
      join(mainSys, 'assignment.md'),
      [
        '# Assignment',
        '- Agent ID: m_main01',
        '- Role: main',
        '- Assigned by: user',
        '- Created: 2026-11-10T07:09:44.362259204Z',
        '',
        '## [2026-11-10T07:09:44.362259204Z] 需求',
        '帮我整理季度销售周报并导出表格',
        '',
        '## [2026-11-10T07:12:10.111222333Z] 需求',
        '再补充一份竞品调研对比',
      ].join('\n'),
    )

    writeFileSync(
      join(mainSys, 'trajectory.jsonl'),
      [
        JSON.stringify({
          role: 'assistant',
          reasoning_content: '先调用表格技能生成周报',
          tool_calls: [{ function: { name: 'sheet_create', arguments: '{"file":"report.xlsx"}' } }],
        }),
        JSON.stringify({
          role: 'assistant',
          content: '已为你整理好季度销售周报并生成 report.xlsx。',
        }),
        JSON.stringify({
          role: 'assistant',
          reasoning_content: '派发子代理 s_worker01 拉取竞品公开数据',
          tool_calls: [{ function: { name: 'dispatch_subagent', arguments: '{"agent":"s_worker01"}' } }],
        }),
      ].join('\n'),
    )

    writeFileSync(
      join(subSys, 'assignment.md'),
      [
        '# Assignment',
        '- Agent ID: s_worker01',
        '- Role: subagent',
        '- Created: 2026-11-10T07:12:15.000000000Z',
        '',
        '## [2026-11-10T07:12:15.000000000Z] 需求',
        '抓取前三大竞品价格表',
      ].join('\n'),
    )
    writeFileSync(
      join(subSys, 'trajectory.jsonl'),
      JSON.stringify({ role: 'assistant', content: '正在抓取竞品公开报价...' }),
    )

    const adapter = new DoubaoAdapter({
      doubaoHome: tmp,
      chatsDir: join(tmp, 'DoubaoChats'),
    })

    const runningList = await adapter.listSessions({ now: Date.now() })
    assert.equal(runningList.length, 1)
    const runningSess = runningList[0]
    assert.equal(runningSess.id, 'doubao:38452759446281474')
    assert.equal(runningSess.status, 'running')
    assert.equal(runningSess.controlMode, 'observe-only')
    assert.equal(runningSess.runningSummary, '汇总子代理竞品调研')
    assert.equal(runningSess.cwd, chatsDeliverableDir)
    assert.ok(runningSess.transcript.length >= 4)
    assert.equal(runningSess.transcript[0].role, 'user')
    assert.equal(runningSess.transcript[0].text, '帮我整理季度销售周报并导出表格')
    assert.ok(runningSess.transcript.some(m => m.role === 'user' && m.text === '再补充一份竞品调研对比'))

    // Structured artifacts for Web UI cards
    assert.ok(runningSess.artifacts.every(a => typeof a === 'object' && a.name && a.path))
    assert.ok(runningSess.artifacts.some(a => a.name === 'report.xlsx' && a.kind === 'artifact'))
    assert.ok(runningSess.artifacts.some(a => a.name === 'board.md' && a.kind === 'task'))

    // 2. Write Chromium IndexedDB WAL + saman_shell_db_storage + mark board completed
    const idbDir = join(tmp, 'Default', 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb')
    const samanDir = join(tmp, 'Default', 'saman_shell_db_storage')
    mkdirSync(idbDir, { recursive: true })
    mkdirSync(samanDir, { recursive: true })
    writeFileSync(
      join(samanDir, '000003.log'),
      JSON.stringify({
        entriesBySandboxId: {
          'sb-1': { conversationId: '38452759446281474', cwd: chatsDeliverableDir },
        },
      }),
    )
    writeFileSync(
      join(idbDir, '000003.log'),
      buildWalRecord([
        {
          schema: 'conversation-list-data-overall-v2',
          data: {
            conversations: [
              {
                conversation_id: '38452759446281474',
                conversation_type: 3,
                name: 'Q4销售与竞品分析',
                update_time: '1794295000',
              },
            ],
          },
        },
        {
          state: {
            mainTaskDataMap: {
              'turn-final': {
                stage: 'sync',
                sessionId: 'turn-final',
                createTime: 1794295000000,
                sentMessages: {
                  m1: {
                    conversationId: '38452759446281474',
                    extra: {
                      create_time: 1794295000000,
                      content_blocks_v2: [{ content: { text_block: { text: '再补充一份竞品调研对比' } } }],
                    },
                  },
                },
                receivedMessages: {
                  m2: {
                    conversationId: '38452759446281474',
                    extra: {
                      ext: { is_finish: '1', finish_time_ms: '1794295005000' },
                      content_blocks_v2: [
                        { block_id: 'tb1', content: { thinking_block: { finish_title: '核对三大竞品最新报价' } }, is_finish: true },
                        { block_id: 'ans1', content: { text_block: { text: '竞品调研对比已完成并同步至看板。' } }, is_finish: true },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ]),
    )

    writeFileSync(
      join(sessDir, 'board.md'),
      [
        '# 任务公告板（board.md）· session 38452759446281474',
        '_最后更新：2026-11-10T07:15:00.000Z_',
        '| 任务ID | 标题 | Organizer | 状态 | 产物路径 | 产物链接 |',
        '| --- | --- | --- | --- | --- | --- |',
        '| t1 | 整理季度销售周报 | m_main01 | 已完成 | attachments/report.xlsx | - |',
        '| t2 | 汇总子代理竞品调研 | s_worker01 | 已完成 | - | - |',
      ].join('\n'),
    )
    const oldTime = new Date(Date.now() - 120_000)
    utimesSync(join(sessDir, 'board.md'), oldTime, oldTime)
    utimesSync(join(mainSys, 'trajectory.jsonl'), oldTime, oldTime)
    utimesSync(join(subSys, 'trajectory.jsonl'), oldTime, oldTime)

    const idleList = await adapter.listSessions({ now: Date.now() })
    assert.equal(idleList[0].status, 'idle')
    assert.equal(idleList[0].controlMode, 'observe-only')
    assert.equal(idleList[0].title, 'Q4销售与竞品分析')
    assert.ok(idleList[0].artifacts.some(a => a.name === 'summary.md'))
    const lastTurn = idleList[0].transcript[idleList[0].transcript.length - 1]
    assert.equal(lastTurn.role, 'assistant')
    assert.equal(lastTurn.thinking, '核对三大竞品最新报价')
    assert.equal(lastTurn.text, '竞品调研对比已完成并同步至看板。')

    // 3. Verify observe-only rejection on createSession / sendPrompt / stopSession
    assert.equal((await adapter.createSession({ prompt: 'hi' })).ok, false)
    assert.equal((await adapter.sendPrompt({ sessionId: 'doubao:38452759446281474', text: 'hi' })).ok, false)
    assert.equal((await adapter.stopSession({ sessionId: 'doubao:38452759446281474' })).ok, false)

    adapter.shutdown()
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('End-to-end HubServer + HubAgent + DoubaoAdapter full lifecycle: sync, prewarm, FS preview, new_session, prompt, steer, stop, rename, delete', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'doubao-e2e-full-'))
  let server = null
  let hubAgent = null
  try {
    const sessDir = join(
      tmp,
      'Default',
      '.doubao',
      'agent_mode',
      'workspace',
      '.sessions',
      '99887766554433221',
    )
    const sysDir = join(sessDir, 'agents', 'm_e2e', 'system')
    const attachDir = join(sessDir, 'attachments')
    const chatsSubDir = join(tmp, 'DoubaoChats', 'chats', '2026-11-11', 'deliverables')
    mkdirSync(sysDir, { recursive: true })
    mkdirSync(attachDir, { recursive: true })
    mkdirSync(chatsSubDir, { recursive: true })

    writeFileSync(join(attachDir, 'metrics.csv'), 'day,dau\n2026-11-11,12800\n')
    writeFileSync(
      join(sessDir, 'board.md'),
      [
        '# 任务公告板（board.md）· session 99887766554433221',
        '_最后更新：2026-11-10T08:00:00Z_',
        '| 任务ID | 标题 | Organizer | 状态 | 产物路径 | 产物链接 |',
        '| --- | --- | --- | --- | --- | --- |',
        '| t1 | DAU 日报生成 | m_e2e | 已完成 | attachments/metrics.csv | - |',
      ].join('\n'),
    )
    const assignPath = join(sysDir, 'assignment.md')
    writeFileSync(
      assignPath,
      [
        '# Assignment',
        '- Role: main',
        '- Created: 2026-11-10T07:59:00Z',
        '',
        '## [2026-11-10T07:59:00Z] 需求',
        '生成今日 DAU 日报',
      ].join('\n'),
    )
    writeFileSync(
      join(sysDir, 'trajectory.jsonl'),
      JSON.stringify({ role: 'assistant', content: '已生成 DAU 日报并保存为 metrics.csv。' }),
    )
    const past = new Date(Date.now() - 90_000)
    utimesSync(join(sessDir, 'board.md'), past, past)
    utimesSync(join(sysDir, 'trajectory.jsonl'), past, past)

    const token = 'E2EDoubaoStrongToken2026'
    const hub = new HubCore({ stateFile: join(tmp, 'hub-state.json') })
    await hub.init()
    const created = createHubServer({ hub, token, requireToken: true })
    server = created.server
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    const baseUrl = `http://127.0.0.1:${port}`
    const authHeaders = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    }

    const osascriptCalls = []
    const mockExec = async (bin, args) => {
      if (bin === 'osascript') {
        osascriptCalls.push(args.join(' '))
      }
      return { stdout: 'ok', stderr: '' }
    }

    const prevChatsEnv = process.env.DOUBAO_CHATS_DIR
    process.env.DOUBAO_CHATS_DIR = join(tmp, 'DoubaoChats')

    try {
      hubAgent = new HubAgent({
        config: {
          dshHome: join(tmp, 'dsh-home'),
          doubaoHome: tmp,
          enabledHarnesses: ['doubao'],
          hostId: 'mac-doubao-e2e',
          hostName: 'Mac Doubao E2E',
          hubUrl: baseUrl,
          hubToken: token,
        },
        bridge: {
          agents: new Map(),
          getSnapshotState: () => ({ tasks: [], approvals: [] }),
          getPendingApprovals: () => [],
          executeHubCommand: async () => ({ ok: false, error: '找不到该任务会话' }),
        },
        transport: null,
        audit: { log: async () => {} },
        logger: { log: () => {}, warn: () => {} },
        execImpl: mockExec,
      })

      // 1. Initial tick syncs session + prewarms board.md
      await hubAgent.tick()

      const state1 = await (await fetch(`${baseUrl}/api/state`, { headers: authHeaders })).json()
      const tasks1 = state1.hosts?.[0]?.bridgeState?.tasks || []
      const dbTask = tasks1.find(t => t.id === 'doubao:99887766554433221')
      assert.ok(dbTask, 'Doubao session should be synced to Hub')
      assert.equal(dbTask.title, 'DAU 日报生成')
      assert.equal(dbTask.harnessLabel, '豆包电脑版')
      assert.equal(dbTask.controlMode, 'observe-only')
      assert.equal(dbTask.capabilities.canPrompt, false)
      assert.equal(dbTask.capabilities.canCreateSession, false)
      assert.equal(dbTask.capabilities.canStop, false)
      assert.equal(dbTask.capabilities.canSteer, false)

      // 2. Preview prewarmed board.md (0ms hotCache) AND cross-root attachments/metrics.csv via Hub /api/hosts/:hostId/fs/read
      const boardPreviewRes = await fetch(
        `${baseUrl}/api/hosts/mac-doubao-e2e/fs/read?agentId=${encodeURIComponent(dbTask.id)}&path=${encodeURIComponent(join(sessDir, 'board.md'))}`,
        { headers: authHeaders },
      )
      const boardPreview = await boardPreviewRes.json()
      assert.equal(boardPreview.ok, true)
      assert.equal(boardPreview.hotCache, true, 'board.md should hit 0ms prewarmed hotCache')
      assert.match(boardPreview.content, /DAU 日报生成/)

      // Trigger async /fs/read for attachments/metrics.csv while ticking HubAgent to serve Fast FS request
      const csvPreviewPromise = fetch(
        `${baseUrl}/api/hosts/mac-doubao-e2e/fs/read?agentId=${encodeURIComponent(dbTask.id)}&path=${encodeURIComponent(join(attachDir, 'metrics.csv'))}`,
        { headers: authHeaders },
      ).then(r => r.json())
      await new Promise(r => setTimeout(r, 60))
      await hubAgent.tick()
      const csvPreview = await csvPreviewPromise
      assert.equal(csvPreview.ok, true)
      assert.match(csvPreview.content, /12800/)

      // Helper to queue command on Hub, run HubAgent ticks, and inspect command result
      const dispatchAndSettle = async payload => {
        const qRes = await (
          await fetch(`${baseUrl}/api/hosts/mac-doubao-e2e/command`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload),
          })
        ).json()
        assert.equal(qRes.ok, true)
        const cmdId = qRes.command.id
        await hubAgent.tick()
        await hubAgent.tick()
        const st = await (await fetch(`${baseUrl}/api/state`, { headers: authHeaders })).json()
        const hostResults = st.hosts?.[0]?.recentResults || []
        const rec = hostResults.find(c => c.id === cmdId)
        return { cmdId, rec, fullRes: hub.commandResultsById.get(cmdId), state: st }
      }

      // 3. new_session / prompt / steer / stop -> cleanly blocked in observe-only mode (zero osascript calls)
      const newOut = await dispatchAndSettle({
        type: 'new_session',
        harness: 'doubao',
        prompt: '帮我写一份周会纪要模板',
      })
      assert.equal(newOut.rec?.ok, false)
      assert.equal(osascriptCalls.length, 0)

      const promptOut = await dispatchAndSettle({
        type: 'prompt',
        agentId: dbTask.id,
        text: '请再增加7日留存率指标',
      })
      assert.equal(promptOut.rec?.ok, false)

      const steerOut = await dispatchAndSettle({
        type: 'steer',
        agentId: dbTask.id,
        text: '中途插话测试',
      })
      assert.equal(steerOut.rec?.ok, false)

      const stopOut = await dispatchAndSettle({
        type: 'stop',
        agentId: dbTask.id,
      })
      assert.equal(stopOut.rec?.ok, false)
      assert.equal(osascriptCalls.length, 0)

      // 4. load_full_transcript
      const fullTrOut = await dispatchAndSettle({
        type: 'load_full_transcript',
        agentId: dbTask.id,
      })
      assert.equal(fullTrOut.rec?.ok, true)
      assert.equal(fullTrOut.fullRes?.transcript?.length, 2)

      // 5. rename_session & delete_session
      const renameOut = await dispatchAndSettle({
        type: 'rename_session',
        agentId: dbTask.id,
        title: '核心增长日报 (已归档)',
      })
      assert.equal(renameOut.rec?.ok, true)
      const renamedTask = renameOut.state.hosts[0].bridgeState.tasks.find(t => t.id === dbTask.id)
      assert.equal(renamedTask.title, '核心增长日报 (已归档)')

      const delOut = await dispatchAndSettle({
        type: 'delete_session',
        agentId: dbTask.id,
      })
      assert.equal(delOut.rec?.ok, true)
      const tasksAfterDel = delOut.state.hosts[0].bridgeState.tasks
      assert.ok(!tasksAfterDel.some(t => t.id === dbTask.id), 'Deleted session should be hidden from Hub state')
    } finally {
      if (prevChatsEnv === undefined) delete process.env.DOUBAO_CHATS_DIR
      else process.env.DOUBAO_CHATS_DIR = prevChatsEnv
    }
  } finally {
    hubAgent?.stop()
    if (server) await new Promise(resolve => server.close(resolve))
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('HarnessRouter summarizeInstalledHarnesses and decorateTaskMetadata support doubao cleanly', () => {
  const summaryOnlyDoubao = summarizeInstalledHarnesses({ hasDoubao: true })
  assert.ok(summaryOnlyDoubao.detected.includes('doubao'))

  const summaryWithAgy = summarizeInstalledHarnesses({ hasAntigravity: true, hasDoubao: true })
  assert.equal(summaryWithAgy.mode, 'full')
  assert.match(summaryWithAgy.enabledHarnesses, /doubao/)

  const decorated = decorateTaskMetadata({
    id: 'doubao:12345',
    harness: 'doubao',
    status: 'running',
    controlMode: 'observe-only',
    transcript: [{ role: 'user', text: 'hi' }],
  })
  assert.equal(decorated.harnessLabel, '豆包电脑版')
  assert.equal(decorated.controlMode, 'observe-only')
  assert.equal(decorated.capabilities.canPrompt, false)
  assert.equal(decorated.capabilities.canCreateSession, false)
  assert.equal(decorated.capabilities.canStop, false)
  assert.equal(decorated.capabilities.canSteer, false)
  assert.equal(decorated.capabilities.canApprove, false)
})

test('DoubaoAdapter filters empty welcome stubs, local_* transient drafts, and never floats updatedAt on background IndexedDB heartbeats', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'doubao-antiphantom-'))
  try {
    // 1. Pre-warmed empty welcome tab (0 user turns, only assistant greeting, brand-new mtime)
    const stubSys = join(
      tmp,
      'Default',
      '.doubao',
      'agent_mode',
      'workspace',
      '.sessions',
      '38459999999999999',
      'agents',
      'm_warm01',
      'system',
    )
    mkdirSync(stubSys, { recursive: true })
    writeFileSync(
      join(stubSys, 'trajectory.jsonl'),
      JSON.stringify({ role: 'assistant', content: '你好！有什么我可以帮你的吗？' }),
    )

    // 2. IndexedDB with:
    //    - unmapped `local_99999` transient draft (must be ignored)
    //    - mapped `local_10001` -> `38451111111111111` (must merge into real ID without duplicate)
    //    - real session `38452222222222222` with NO explicit create_time (must NOT float to `now` on subsequent ticks)
    const idbDir = join(tmp, 'Default', 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb')
    const samanDir = join(tmp, 'Default', 'saman_shell_db_storage')
    mkdirSync(idbDir, { recursive: true })
    mkdirSync(samanDir, { recursive: true })
    writeFileSync(
      join(samanDir, '000001.log'),
      JSON.stringify({
        entriesBySandboxId: {
          sb1: {
            conversationId: '38451111111111111',
            localConversationId: 'local_10001',
            cwd: tmp,
          },
        },
      }),
    )
    const walPath = join(idbDir, '000002.log')
    writeFileSync(
      walPath,
      buildWalRecord([
        {
          state: {
            mainTaskDataMap: {
              t_unmapped: {
                sessionId: 't_unmapped',
                sentMessages: {
                  s1: {
                    conversationId: 'local_99999',
                    extra: { content_blocks_v2: [{ content: { text_block: { text: '未同步草稿' } } }] },
                  },
                },
              },
              t_mapped: {
                sessionId: 't_mapped',
                createTime: 1794000000000,
                sentMessages: {
                  s2: {
                    conversationId: 'local_10001',
                    extra: {
                      create_time: 1794000000000,
                      content_blocks_v2: [{ content: { text_block: { text: '整理周报' } } }],
                    },
                  },
                },
                receivedMessages: {
                  r2: {
                    conversationId: '38451111111111111',
                    extra: {
                      ext: { is_finish: '1', finish_time_ms: '1794000005000' },
                      content_blocks_v2: [{ content: { text_block: { text: '已整理完成' } }, is_finish: true }],
                    },
                  },
                },
              },
              t_notime: {
                sessionId: 't_notime',
                sentMessages: {
                  s3: {
                    conversationId: '38452222222222222',
                    extra: { content_blocks_v2: [{ content: { text_block: { text: '无时间戳历史问答' } } }] },
                  },
                },
                receivedMessages: {
                  r3: {
                    conversationId: '38452222222222222',
                    extra: {
                      ext: { is_finish: '1' },
                      content_blocks_v2: [{ content: { text_block: { text: '好的' } }, is_finish: true }],
                    },
                  },
                },
              },
            },
          },
        },
      ]),
    )
    const oldWalDate = new Date(1793900000000)
    utimesSync(walPath, oldWalDate, oldWalDate)

    const adapter = new DoubaoAdapter({ doubaoHome: tmp })
    const tick1 = await adapter.listSessions({ now: 1795000000000 })
    const ids1 = tick1.map(s => s.id)
    assert.ok(!ids1.includes('doubao:38459999999999999'), 'Empty welcome greeting stub must be filtered')
    assert.ok(!ids1.some(id => id.includes('local_')), 'local_* draft IDs must never appear')
    assert.deepEqual(ids1, ['doubao:38451111111111111', 'doubao:38452222222222222'])

    const noTimeSess1 = tick1.find(s => s.id === 'doubao:38452222222222222')
    assert.equal(noTimeSess1.updatedAt, 1793900000000)

    // Simulate Doubao background CCM policy heartbeat touching IndexedDB WAL mtime 10 minutes later
    const newerHeartbeatDate = new Date(1795600000000)
    utimesSync(walPath, newerHeartbeatDate, newerHeartbeatDate)

    const tick2 = await adapter.listSessions({ now: 1795600000000 })
    const noTimeSess2 = tick2.find(s => s.id === 'doubao:38452222222222222')
    assert.equal(
      noTimeSess2.updatedAt,
      noTimeSess1.updatedAt,
      'Background IndexedDB WAL touch must NOT float session updatedAt to top',
    )
    assert.equal(tick2[0].id, 'doubao:38451111111111111', 'Newer real conversation stays above older session')
    adapter.shutdown()
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('DoubaoAdapter expires stale board.md running tasks, keeps pure chats free of unrelated chatsDir folders, and caches unchanged WAL/SST files cleanly', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'doubao-hardening-'))
  try {
    // 1. Stale Agent Workspace task where board.md still says "进行中" after Doubao was closed 25 mins ago
    const staleSessDir = join(
      tmp,
      'Default',
      '.doubao',
      'agent_mode',
      'workspace',
      '.sessions',
      '38457777777777777',
    )
    const staleSys = join(staleSessDir, 'agents', 'm_stale', 'system')
    const unrelatedChatsSub = join(tmp, 'DoubaoChats', 'chats', '2026-10-01', 'old-project')
    mkdirSync(staleSys, { recursive: true })
    mkdirSync(unrelatedChatsSub, { recursive: true })
    writeFileSync(join(unrelatedChatsSub, 'old.txt'), 'unrelated old deliverable')

    const twentyFiveMinsAgoIso = '2026-11-11T10:00:00.000Z'
    const twentyFiveMinsAgoMs = Date.parse(twentyFiveMinsAgoIso)
    const nowMs = twentyFiveMinsAgoMs + 25 * 60_000

    writeFileSync(
      join(staleSessDir, 'board.md'),
      [
        '# 任务公告板（board.md）',
        `_最后更新：${twentyFiveMinsAgoIso}_`,
        '| 任务ID | 标题 | Organizer | 状态 | 产物路径 | 产物链接 |',
        '| --- | --- | --- | --- | --- | --- |',
        '| t1 | 中途中断的爬虫任务 | m_stale | 进行中 | - | - |',
      ].join('\n'),
    )
    writeFileSync(
      join(staleSys, 'assignment.md'),
      [
        '# Assignment',
        '- Role: main',
        `- Created: ${twentyFiveMinsAgoIso}`,
        '',
        `## [${twentyFiveMinsAgoIso}] 需求`,
        '抓取示例列表',
      ].join('\n'),
    )
    writeFileSync(
      join(staleSys, 'trajectory.jsonl'),
      JSON.stringify({ role: 'assistant', content: '开始初始化任务...' }),
    )
    const staleDate = new Date(twentyFiveMinsAgoMs)
    utimesSync(join(staleSessDir, 'board.md'), staleDate, staleDate)
    utimesSync(join(staleSys, 'assignment.md'), staleDate, staleDate)
    utimesSync(join(staleSys, 'trajectory.jsonl'), staleDate, staleDate)
    utimesSync(staleSessDir, staleDate, staleDate)

    // 2. Pure IndexedDB casual chat (no workspace dir, no sandbox cwd) across two WAL files
    const idbDir = join(tmp, 'Default', 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb')
    mkdirSync(idbDir, { recursive: true })
    writeFileSync(
      join(idbDir, '000001.log'),
      buildWalRecord([
        {
          schema: 'conversation-list-data-overall-v2',
          data: {
            conversations: [
              {
                conversation_id: '38458888888888888',
                conversation_type: 1,
                name: '日常闲聊食谱',
                update_time: String(Math.floor((nowMs - 60_000) / 1000)),
              },
            ],
          },
        },
      ]),
    )
    writeFileSync(
      join(idbDir, '000002.log'),
      buildWalRecord([
        {
          state: {
            mainTaskDataMap: {
              turn_recipe: {
                sessionId: 'turn_recipe',
                createTime: nowMs - 60_000,
                sentMessages: {
                  u1: {
                    conversationId: '38458888888888888',
                    extra: {
                      create_time: nowMs - 60_000,
                      content_blocks_v2: [{ content: { text_block: { text: '番茄炒蛋先放蛋还是番茄？' } } }],
                    },
                  },
                },
                receivedMessages: {
                  a1: {
                    conversationId: '38458888888888888',
                    extra: {
                      ext: { is_finish: '1', finish_time_ms: String(nowMs - 55_000) },
                      content_blocks_v2: [{ content: { text_block: { text: '建议先炒鸡蛋盛出备用，再炒番茄出汁。' } }, is_finish: true }],
                    },
                  },
                },
              },
            },
          },
        },
      ]),
    )

    const adapter = new DoubaoAdapter({
      doubaoHome: tmp,
      chatsDir: join(tmp, 'DoubaoChats'),
    })
    const list1 = await adapter.listSessions({ now: nowMs })
    const staleTask = list1.find(s => s.id === 'doubao:38457777777777777')
    const casualChat = list1.find(s => s.id === 'doubao:38458888888888888')

    assert.ok(staleTask)
    assert.equal(staleTask.status, 'idle', 'Stale board.md running task (>10m without updates) must not stay stuck in running')
    assert.equal(staleTask.statusLabel, '👀 仅观测')
    assert.equal(staleTask.cwd, unrelatedChatsSub, 'Workspace session still resolves chats deliverable fallback when no sandbox entry exists')

    assert.ok(casualChat)
    assert.equal(casualChat.project, '豆包对话')
    assert.equal(casualChat.cwd, '', 'Pure IndexedDB chat without workspace/sandbox must not hijack unrelated chatsDir folders')

    // Append a new WAL file while 000001.log stays cached; verify merged metadata + new turn stay intact
    writeFileSync(
      join(idbDir, '000003.log'),
      buildWalRecord([
        {
          state: {
            mainTaskDataMap: {
              turn_recipe_2: {
                sessionId: 'turn_recipe_2',
                createTime: nowMs - 10_000,
                sentMessages: {
                  u2: {
                    conversationId: '38458888888888888',
                    extra: {
                      create_time: nowMs - 10_000,
                      content_blocks_v2: [{ content: { text_block: { text: '要加一点糖提鲜吗？' } } }],
                    },
                  },
                },
                receivedMessages: {
                  a2: {
                    conversationId: '38458888888888888',
                    extra: {
                      ext: { is_finish: '1', finish_time_ms: String(nowMs - 8_000) },
                      content_blocks_v2: [{ content: { text_block: { text: '加半小勺白糖能中和番茄酸味。' } }, is_finish: true }],
                    },
                  },
                },
              },
            },
          },
        },
      ]),
    )
    const list2 = await adapter.listSessions({ now: nowMs })
    const casualChat2 = list2.find(s => s.id === 'doubao:38458888888888888')
    assert.equal(casualChat2.title, '日常闲聊食谱', 'Cached 000001.log conversation title remains intact when 000003.log is added')
    assert.equal(casualChat2.transcript.length, 4)

    adapter.shutdown()
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
