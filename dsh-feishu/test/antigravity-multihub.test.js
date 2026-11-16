import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  compareTrajectoryCandidates,
  executeAntigravityIdeAction,
  loadAntigravityIdeSessions,
  parseAntigravityTranscript,
} from '../lib/antigravity-ide.js'

test('Antigravity IDE multi-hub trajectory merge prevents stale-IDLE / live-RUNNING state oscillation', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-agy-multihub-'))
  try {
    const convId = 'conv-multihub-oscillation-test'
    const logsDir = join(tmpDir, 'brain', convId, '.system_generated', 'logs')
    await mkdir(logsDir, { recursive: true })
    const t0 = Date.now() - 60_000
    const transcriptLines = [
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
        created_at: new Date(t0 + 5000).toISOString(),
        content: '第一轮旧回答（1055字状态）',
      }),
      JSON.stringify({
        step_index: 2,
        type: 'USER_INPUT',
        status: 'DONE',
        created_at: new Date(t0 + 20_000).toISOString(),
        content: '<USER_REQUEST>\n好多了，你可以完整的审查一遍吗\n</USER_REQUEST>',
      }),
      JSON.stringify({
        step_index: 3,
        type: 'PLANNER_RESPONSE',
        status: 'RUNNING',
        created_at: new Date(t0 + 55_000).toISOString(),
        thinking: '正在审查每一帧',
        tool_calls: [{ name: 'run_command', id: 'tc-1', args: { CommandLine: 'python3 check.py', toolSummary: 'list all 20 beats' } }],
      }),
    ]
    await writeFile(join(logsDir, 'transcript.jsonl'), transcriptLines.join('\n') + '\n', 'utf8')

    // Direct comparator sanity checks
    const staleCand = {
      hub: { address: '127.0.0.1:41001' },
      sum: {
        status: 'CASCADE_RUN_STATUS_IDLE',
        stepCount: 2,
        lastUserInputStepIndex: 0,
        lastModifiedTime: new Date(t0 + 5000).toISOString(),
      },
    }
    const liveCand = {
      hub: { address: '127.0.0.1:41002' },
      sum: {
        status: 'CASCADE_RUN_STATUS_RUNNING',
        stepCount: 4,
        lastUserInputStepIndex: 2,
        lastModifiedTime: new Date(t0 + 55_000).toISOString(),
      },
    }
    assert.ok(compareTrajectoryCandidates(liveCand, staleCand) > 0)
    assert.ok(compareTrajectoryCandidates(staleCand, liveCand) < 0)

    // Mock 2 LanguageServer hubs where stale hub deliberately responds AFTER live hub
    // and where model-lookup roundtrips would previously cause ping-pong oscillation.
    const execImpl = async (bin) => {
      if (bin === 'ps') {
        return {
          stdout: [
            '1001 agy --hub --hub-port=41001 --csrf_token=tok-stale',
            '1002 agy --hub --hub-port=41002 --csrf_token=tok-live',
          ].join('\n'),
        }
      }
      return { stdout: '' }
    }

    let pollRound = 0
    const fetchImpl = async (url) => {
      const u = String(url)
      const isStaleHub = u.includes('127.0.0.1:41001')
      const isLiveHub = u.includes('127.0.0.1:41002')
      if (u.endsWith('/GetAllCascadeTrajectories')) {
        // Alternate which hub finishes later to simulate race conditions
        if ((pollRound % 2 === 0 && isStaleHub) || (pollRound % 2 === 1 && isLiveHub)) {
          await new Promise(r => setTimeout(r, 25))
        }
        return new Response(
          JSON.stringify({
            trajectorySummaries: {
              [convId]: isStaleHub
                ? {
                    trajectoryId: 'traj-stale',
                    status: 'CASCADE_RUN_STATUS_IDLE',
                    stepCount: 2,
                    lastUserInputStepIndex: 0,
                    lastModifiedTime: new Date(t0 + 5000).toISOString(),
                  }
                : {
                    trajectoryId: 'traj-live',
                    status: 'CASCADE_RUN_STATUS_RUNNING',
                    stepCount: 4,
                    lastUserInputStepIndex: 2,
                    lastModifiedTime: new Date(t0 + 55_000).toISOString(),
                  },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (u.endsWith('/GetCascadeTrajectorySteps')) {
        if (isStaleHub) {
          await new Promise(r => setTimeout(r, 30))
        }
        return new Response(
          JSON.stringify({
            steps: [
              {
                userInput: {
                  userConfig: {
                    plannerConfig: {
                      planModel: isLiveHub ? 'Gemini 4 Carbon (Medium)' : 'Old Model',
                    },
                  },
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    }

    for (let i = 0; i < 4; i += 1) {
      pollRound = i
      const sessions = await loadAntigravityIdeSessions({
        brainDirs: [join(tmpDir, 'brain')],
        maxSessions: 10,
        now: t0 + 56_000 + i * 2500,
        execImpl,
        fetchImpl,
      })
      const target = sessions.find(s => s.rawId === convId)
      assert.ok(target, `round ${i} should find session`)
      assert.equal(target.status, 'running', `round ${i} must stay running and never flip to stale idle`)
      assert.equal(target.transcript.length, 4, `round ${i} must keep all 4 steps without rolling back`)
      assert.ok(
        target.transcript.some(m => m.text.includes('好多了，你可以完整的审查一遍吗')),
        `round ${i} must retain latest user message`,
      )
      assert.equal(target.model, 'Gemini 4 Carbon (Medium)')
    }

    // Stale liveLastModifiedMs older than disk mtimeMs must not roll back disk transcript
    const guarded = parseAntigravityTranscript(transcriptLines.join('\n'), {
      conversationId: convId,
      mtimeMs: t0 + 55_000,
      now: t0 + 56_000,
      liveStepCount: 2,
      liveLastUserInputStepIndex: 0,
      liveStatus: 'CASCADE_RUN_STATUS_IDLE',
      liveLastModifiedMs: t0 + 5000,
    })
    assert.equal(guarded.transcript.length, 4)

    // Multi-hub approval must find waitingSteps on Hub 2 even if Hub 1 has stale empty waitingSteps
    const approvedUrls = []
    const approveRes = await executeAntigravityIdeAction(
      { type: 'approve', agentId: `agy-ide:${convId}`, optionIndex: 1 },
      {
        execImpl,
        fetchImpl: async (url) => {
          const u = String(url)
          const isHub2 = u.includes('127.0.0.1:41002')
          if (u.endsWith('/GetAllCascadeTrajectories')) {
            return new Response(
              JSON.stringify({
                trajectorySummaries: {
                  [convId]: isHub2
                    ? {
                        trajectoryId: 'traj-live',
                        status: 'CASCADE_RUN_STATUS_WAITING_FOR_USER',
                        stepCount: 4,
                        waitingSteps: [{ stepIndex: 3, step: { requestedInteraction: { permission: {} } } }],
                      }
                    : {
                        trajectoryId: 'traj-stale',
                        status: 'CASCADE_RUN_STATUS_IDLE',
                        stepCount: 2,
                        waitingSteps: [],
                      },
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            )
          }
          if (u.endsWith('/HandleCascadeUserInteraction')) {
            approvedUrls.push(u)
            return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
          }
          return new Response('not found', { status: 404 })
        },
      },
    )
    assert.equal(approveRes.ok, true)
    assert.equal(approveRes.engine, 'connect-rpc')
    assert.ok(approvedUrls.some(u => u.includes('127.0.0.1:41002')))
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
