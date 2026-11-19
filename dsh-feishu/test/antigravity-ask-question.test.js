import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  executeAntigravityIdeAction,
  normalizeAntigravityQuestions,
  parseAntigravityTranscript,
} from '../lib/antigravity-ide.js'

describe('Antigravity ask_question multiple-choice parsing & mobile answer submission', () => {
  it('parses ask_question tool_calls (single & multi-select) into structured kind=question pendingApproval', () => {
    const jsonl = [
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        created_at: '2026-11-19T11:00:00Z',
        content: '帮我选一下 Google 云服务器配置',
      }),
      JSON.stringify({
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        created_at: '2026-11-19T11:00:05Z',
        content: '开机器和整理 Docker 前，请帮我拍板这 3 个选项，选完我直接开始搭：',
        tool_calls: [
          {
            id: 'call_q1',
            name: 'ask_question',
            arguments: {
              questions: [
                {
                  question: '优先使用哪个 GCP 机房？',
                  is_multi_select: false,
                  options: [
                    '(Recommended) 香港 asia-east2',
                    '新加坡 asia-southeast1',
                    '台湾 asia-east1',
                  ],
                },
                {
                  question: '机器配置选哪种？',
                  is_multi_select: false,
                  options: ['(Recommended) e2-standard-2 (2C8G)', 'e2-standard-4 (4C16G)'],
                },
                {
                  question: '需要顺手配置哪些组件？',
                  is_multi_select: true,
                  options: ['Nginx HTTPS 自动续期', 'Docker Compose 编排', '自动每日数据库备份'],
                },
              ],
            },
          },
        ],
      }),
    ].join('\n')

    const parsed = parseAntigravityTranscript(jsonl, {
      conversationId: 'conv-minihealth-01',
      now: Date.parse('2026-11-19T11:01:00Z'),
      hasLiveSummary: true,
      liveWaitingSteps: [{ stepIndex: 2, step: { status: 'CORTEX_STEP_STATUS_WAITING' } }],
    })

    assert.ok(parsed?.pendingApproval, 'expected pendingApproval for ask_question')
    assert.equal(parsed.pendingApproval.kind, 'question')
    assert.equal(parsed.pendingApproval.toolName, 'ask_question')
    assert.equal(parsed.pendingApproval.questions.length, 3)
    assert.equal(parsed.pendingApproval.questions[0].question, '优先使用哪个 GCP 机房？')
    assert.equal(parsed.pendingApproval.questions[0].multiSelect, false)
    assert.equal(parsed.pendingApproval.questions[0].options.length, 3)
    assert.equal(parsed.pendingApproval.questions[0].options[0].label, '(Recommended) 香港 asia-east2')
    assert.equal(parsed.pendingApproval.questions[2].multiSelect, true)
    assert.equal(parsed.pendingApproval.questions[2].options.length, 3)
    assert.notEqual(parsed.pendingApproval.promptTitle, 'Allow agent question?')
  })

  it('hydrates truncated ask_question tool_calls from fullContentByStepIndex map', () => {
    const compactJsonl = [
      JSON.stringify({
        step_index: 0,
        type: 'USER_INPUT',
        created_at: '2026-11-19T11:00:00Z',
        content: '帮我做架构选型',
      }),
      JSON.stringify({
        step_index: 1,
        type: 'PLANNER_RESPONSE',
        created_at: '2026-11-19T11:00:05Z',
        content: '请选择：',
        truncated_fields: ['tool_calls'],
        tool_calls: [{ id: 'call_trunc', name: 'ask_question', arguments: {} }],
      }),
    ].join('\n')

    const fullMap = new Map([
      [
        1,
        {
          content: '请选择以下 2 个关键选项：',
          tool_calls: [
            {
              id: 'call_trunc',
              name: 'ask_question',
              arguments: {
                questions: [
                  { question: '数据库选型？', options: ['(Recommended) Postgres', 'MySQL'] },
                  { question: '缓存方案？', options: ['Redis', '内存缓存'] },
                ],
              },
            },
          ],
        },
      ],
    ])

    const parsed = parseAntigravityTranscript(compactJsonl, {
      conversationId: 'conv-trunc-q',
      now: Date.parse('2026-11-19T11:01:00Z'),
      fullContentByStepIndex: fullMap,
    })

    assert.equal(parsed.pendingApproval?.kind, 'question')
    assert.equal(parsed.pendingApproval?.questions?.length, 2)
    assert.equal(parsed.pendingApproval.questions[0].options[0].label, '(Recommended) Postgres')
  })

  it('normalizes JSON-stringified questions arrays safely', () => {
    const out = normalizeAntigravityQuestions(
      JSON.stringify([{ question: 'Deploy target?', options: ['Railway', 'GCE VM'], is_multi_select: false }]),
    )
    assert.equal(out.length, 1)
    assert.equal(out[0].options[1].label, 'GCE VM')
  })

  it('submits structured ask_question answers via HandleCascadeUserInteraction or falls back to SendUserCascadeMessage (never permission)', async () => {
    const calls = []
    const mockExec = async () => ({
      stdout: '12345 /Applications/Antigravity.app/Contents/Resources/app/extensions/antigravity/bin/language_server_macos_arm --csrf_token tok-q --extension_server_port 55111\n',
    })
    const mockExecWithLsof = async (cmd, args) => {
      if (cmd === 'ps') {
        return {
          stdout: '12345 /Applications/Antigravity.app/bin/language_server --csrf_token tok-q\n',
        }
      }
      if (cmd === 'lsof') {
        return {
          stdout: 'p12345\nn127.0.0.1:49999\n',
        }
      }
      return mockExec(cmd, args)
    }
    const mockFetch = async (url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {}
      calls.push({ url: String(url), body })
      if (String(url).endsWith('/GetAllCascadeTrajectories')) {
        return {
          ok: true,
          json: async () => ({
            trajectorySummaries: {
              'conv-q-99': {
                trajectoryId: 'conv-q-99',
                status: 'CASCADE_RUN_STATUS_WAITING_FOR_USER',
                waitingSteps: [
                  {
                    stepIndex: 4,
                    step: {
                      status: 'CORTEX_STEP_STATUS_WAITING',
                      requestedInteraction: {
                        askQuestion: {
                          questions: [{ question: '机房选哪个？', options: ['香港', '新加坡'] }],
                        },
                      },
                    },
                  },
                ],
              },
            },
          }),
        }
      }
      if (String(url).endsWith('/HandleCascadeUserInteraction')) {
        // Simulate RPC rejecting custom askQuestion proto shape -> must fall back to SendUserCascadeMessage!
        return { ok: false, status: 400, json: async () => ({ error: 'invalid field' }) }
      }
      if (String(url).endsWith('/GetCascadeTrajectorySteps')) {
        return { ok: true, json: async () => ({ steps: [] }) }
      }
      if (String(url).endsWith('/SendUserCascadeMessage')) {
        return { ok: true, json: async () => ({ ok: true }) }
      }
      return { ok: true, json: async () => ({}) }
    }

    const res = await executeAntigravityIdeAction(
      {
        type: 'approve',
        code: 'AGY-CONVQ9-1',
        agentId: 'agy-ide:conv-q-99',
        answers: { q_1: '(Recommended) 香港 asia-east2' },
        questions: [{ id: 'q_1', question: '机房选哪个？', options: [{ label: '(Recommended) 香港 asia-east2' }] }],
        pendingApproval: {
          kind: 'question',
          toolName: 'ask_question',
          waitingStepIndex: 4,
        },
      },
      { execImpl: mockExecWithLsof, fetchImpl: mockFetch },
    )

    assert.equal(res.ok, true)
    assert.equal(res.engine, 'connect-rpc-question-message')
    const msgCall = calls.find(c => c.url.endsWith('/SendUserCascadeMessage'))
    assert.ok(msgCall, 'expected SendUserCascadeMessage fallback call')
    assert.match(msgCall.body.items[0].text, /香港 asia-east2/)
    // Verify we NEVER sent a bogus permission interaction
    const permCalls = calls.filter(c => c.url.endsWith('/HandleCascadeUserInteraction') && c.body?.interaction?.permission)
    assert.equal(permCalls.length, 0)
  })
})
