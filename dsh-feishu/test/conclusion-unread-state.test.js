import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseAntigravityTranscript } from '../lib/antigravity-ide.js'
import { HubCore } from '../../hub/hub-core.js'

describe('conclusion detection & unread badge reliability', () => {
  it('sets Antigravity lastConclusionAt to completion mtime rather than step.created_at from start of generation', () => {
    const tStart = 1795133637000 // exact second PLANNER_RESPONSE started thinking
    const tFinish = tStart + 42_509 // finished writing 42.5s later
    const jsonl = [
      JSON.stringify({
        step_index: 10,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: new Date(tStart).toISOString(),
        content: '<USER_REQUEST>\n怎么创建匿名中文channel\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 11,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: new Date(tStart).toISOString(),
        content: '直接建一个品牌频道（Brand Account）即可。',
      }),
    ].join('\n')

    const parsed = parseAntigravityTranscript(jsonl, {
      conversationId: '7bf2f32f-ca8d-4c8a-8291-cf7190d1a921',
      mtimeMs: tFinish,
      now: tFinish + 500,
      liveStatus: 'CASCADE_RUN_STATUS_IDLE',
      hasLiveSummary: true,
    })

    assert.equal(parsed.status, 'idle')
    assert.equal(parsed.turnState, 'conclusion')
    assert.equal(parsed.isMidTurn, false)
    assert.equal(parsed.lastConclusionAt, tFinish)
    assert.ok(parsed.lastConclusionAt > tStart + 40_000)
  })

  it('does not trap isMidTurn=true when a trailing metadata step follows a concluded PLANNER_RESPONSE', () => {
    const t0 = 1795134000000
    const jsonl = [
      JSON.stringify({
        step_index: 1,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: new Date(t0).toISOString(),
        content: '<USER_REQUEST>\n总结一下\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 2,
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        created_at: new Date(t0 + 1000).toISOString(),
        content: '已完成全部检查并输出结论。',
      }),
      JSON.stringify({
        step_index: 3,
        type: 'CHECKPOINT',
        status: 'DONE',
        created_at: new Date(t0 + 5000).toISOString(),
        content: '',
      }),
    ].join('\n')

    const parsed = parseAntigravityTranscript(jsonl, {
      conversationId: 'meta-trailing-1111',
      mtimeMs: t0 + 5000,
      now: t0 + 5500,
      liveStatus: 'CASCADE_RUN_STATUS_IDLE',
      hasLiveSummary: true,
    })

    assert.equal(parsed.status, 'idle')
    assert.equal(parsed.turnState, 'conclusion')
    assert.equal(parsed.isMidTurn, false)
    assert.equal(parsed.lastConclusionAt, t0 + 5000)
  })

  it('detects fast idle->idle conclusions, preserves unread against non-conclusion read receipts, and clears inflight immediately', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pa-conc-unread-'))
    try {
      let clock = 1795134000000
      const hub = new HubCore({ stateFile: join(root, 'hub-state.json'), now: () => clock })
      await hub.init()

      const events = []
      hub.onStateChange((evt) => events.push(typeof evt === 'string' ? evt : evt?.type))

      // 1. Initial idle seed (should NOT fire push or mark unread)
      hub.handleHeartbeat({
        hostId: 'air',
        hostName: 'MacBook Air',
        bridgeState: {
          tasks: [
            {
              id: 'agy-ide:fast-1',
              harness: 'antigravity-ide',
              title: '快速回复测试',
              status: 'idle',
              turnState: 'conclusion',
              isMidTurn: false,
              lastStepIndex: 10,
              lastConclusionAt: clock - 60_000,
              updatedAt: clock - 60_000,
              lastOutput: '上一轮旧结论',
              transcript: [
                { role: 'user', text: '旧问题', time: clock - 70_000 },
                { role: 'assistant', text: '上一轮旧结论', time: clock - 60_000 },
              ],
            },
          ],
          approvals: [],
        },
      })
      assert.equal(hub.pushHistory.length, 0)
      assert.equal(hub.getFullState().sessionReadState['agy-ide:fast-1'], undefined)

      // 2. Fast turn completes between heartbeats (idle -> idle with new step & new conclusion text)
      clock += 2_000
      hub.handleHeartbeat({
        hostId: 'air',
        hostName: 'MacBook Air',
        bridgeState: {
          tasks: [
            {
              id: 'agy-ide:fast-1',
              harness: 'antigravity-ide',
              title: '快速回复测试',
              status: 'idle',
              turnState: 'conclusion',
              isMidTurn: false,
              lastStepIndex: 12,
              lastConclusionAt: clock,
              updatedAt: clock,
              lastOutput: '这是 1.5 秒内刚出炉的新结论！',
              transcript: [
                { role: 'user', text: '新问题', time: clock - 1500 },
                { role: 'assistant', text: '这是 1.5 秒内刚出炉的新结论！', time: clock },
              ],
            },
          ],
          approvals: [],
        },
      })
      assert.equal(hub.pushHistory.length, 1)
      assert.equal(hub.getFullState().sessionReadState['agy-ide:fast-1']?.unread, true)
      assert.ok(events.includes('task_concluded'))

      // 3. A stale running/approval read receipt MUST NOT wipe unread=true
      const ignoredRead = hub.markSessionRead({
        sessionId: 'agy-ide:fast-1',
        sig: 'running:11:正在思考',
        at: clock + 500,
      })
      assert.equal(ignoredRead.preservedUnread, true)
      assert.equal(hub.getFullState().sessionReadState['agy-ide:fast-1']?.unread, true)

      const ignoredApprovalRead = hub.markSessionRead({
        sessionId: 'agy-ide:fast-1',
        sig: 'approval:11:Allow command?',
        at: clock + 600,
      })
      assert.equal(ignoredApprovalRead.preservedUnread, true)
      assert.equal(hub.getFullState().sessionReadState['agy-ide:fast-1']?.unread, true)

      // 4. Genuine conclusion read clears unread cleanly
      hub.markSessionRead({
        sessionId: 'agy-ide:fast-1',
        sig: 'conclusion:12:这是 1.5 秒内刚出炉的新结论！',
        at: clock + 1000,
      })
      assert.equal(hub.getFullState().sessionReadState['agy-ide:fast-1']?.unread, false)

      // 5. pruneInflightCommands clears immediately when updatedAt > ic.createdAt even if legacy host sent stale lastConclusionAt
      const hostRec = hub.hosts.get('air')
      hostRec.inflightCommands = [
        {
          id: 'cmd-1',
          type: 'prompt',
          agentId: 'agy-ide:fast-1',
          text: '继续',
          createdAt: clock + 1500,
          pulledAt: clock + 1600,
          baselineSameCount: 1,
          baselineTotalCount: 2,
        },
      ]
      hostRec.bridgeState.tasks[0].lastConclusionAt = clock + 1000 // stale created_at < cmd.createdAt
      hostRec.bridgeState.tasks[0].updatedAt = clock + 5000 // actual finish > cmd.createdAt
      const kept = hub.pruneInflightCommands(hostRec, clock + 5500)
      assert.equal(kept.length, 0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
