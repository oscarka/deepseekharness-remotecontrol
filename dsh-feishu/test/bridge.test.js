import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FeishuBridge } from '../lib/bridge.js'
import { resolveConfig, parseEnvFile } from '../lib/config.js'
import { parseCommand } from '../lib/commands.js'
import { redactText, truncateText } from '../lib/redact.js'

const APP_ID = 'cli_0123456789abcdef'
const USER = 'ou_user_1'
const CHAT = 'oc_chat_1'

function makeAgent(id = 'session-abcdef12-3456') {
  return {
    id,
    status: 'idle',
    session: {
      header: { cwd: '/Users/dev/workspace' },
      log: [{ type: 'session/title', time: Date.now(), data: { title: '测试任务' } }],
      deriveMessages() {
        return this._messages ?? []
      },
    },
    followup({ content }) {
      const text = content?.[0]?.text ?? ''
      this.session._messages = [
        ...(this.session._messages ?? []),
        { role: 'user', content: [{ type: 'text', text }] },
        { role: 'assistant', content: [{ type: 'text', text: `echo:${text}` }] },
      ]
      this.status = 'running'
    },
    async whenIdle() {
      this.status = 'idle'
    },
    async cancel() {
      this.cancelled = true
    },
  }
}

function makeHarness({ agents = [makeAgent()], config = {}, cards = false, now } = {}) {
  const sent = []
  const sentCards = []
  const updatedCards = []
  const auditEvents = []
  let cardSeq = 0
  const transport = {
    async sendText(chatId, text) {
      sent.push({ chatId, text })
    },
  }
  if (cards) {
    transport.sendCard = async (chatId, card) => {
      const messageId = `card-${++cardSeq}`
      sentCards.push({ chatId, card, messageId })
      return { data: { message_id: messageId } }
    }
    transport.updateCard = async (messageId, card) => {
      updatedCards.push({ messageId, card })
      const existing = sentCards.find(item => item.messageId === messageId)
      if (existing) existing.card = card
      else sentCards.push({ chatId: CHAT, card, messageId })
      return { code: 0 }
    }
  }
  const audit = {
    async write(action, fields) {
      auditEvents.push({ action, ...fields })
    },
  }
  const bridge = new FeishuBridge({
    config: resolveConfig({
      appId: APP_ID,
      allowedOpenIds: [USER],
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
      ...config,
    }),
    agents: {
      list: () => agents,
      get: id => agents.find(agent => agent.id === id),
    },
    transport,
    audit,
    now,
  })
  return { bridge, agents, sent, sentCards, updatedCards, auditEvents }
}

function event(text, overrides = {}) {
  return {
    event_id: overrides.event_id ?? `event-${Math.random()}`,
    app_id: APP_ID,
    sender: {
      sender_type: 'user',
      sender_id: { open_id: overrides.open_id ?? USER },
    },
    message: {
      message_id: overrides.message_id ?? `msg-${Math.random()}`,
      chat_id: overrides.chat_id ?? CHAT,
      chat_type: overrides.chat_type ?? 'p2p',
      message_type: overrides.message_type ?? 'text',
      content: overrides.content ?? JSON.stringify({ text }),
      mentions: overrides.mentions,
    },
  }
}

function cardAction(value, formValue) {
  return {
    messageId: 'card-message',
    chatId: CHAT,
    operator: { openId: USER },
    action: { value, tag: 'button' },
    formValue,
  }
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 10))
  await new Promise(resolve => setTimeout(resolve, 10))
}

test('parseEnvFile handles export, quotes, comments', () => {
  const parsed = parseEnvFile(`
# comment
export FEISHU_APP_ID=cli_0123456789abcdef
FEISHU_APP_SECRET="secret value"
OTHER='x # y'
PLAIN=value # trailing
`)
  assert.equal(parsed.FEISHU_APP_ID, 'cli_0123456789abcdef')
  assert.equal(parsed.FEISHU_APP_SECRET, 'secret value')
  assert.equal(parsed.OTHER, 'x # y')
  assert.equal(parsed.PLAIN, 'value')
})

test('redactText and truncateText', () => {
  assert.match(redactText('key sk-1234567890abcdef'), /sk-\[REDACTED\]/)
  assert.match(redactText('Authorization: Bearer abcdefghijklmnop'), /Bearer \[REDACTED\]/)
  assert.match(redactText('password = "hunter22222"'), /password = "\[REDACTED\]"/)
  assert.ok(truncateText('a'.repeat(100), 30).includes('已截断'))
})

test('parseCommand', () => {
  assert.deepEqual(parseCommand('/status'), { kind: 'command', name: 'status', args: '' })
  assert.deepEqual(parseCommand('!sessions'), { kind: 'command', name: 'sessions', args: '' })
  assert.equal(parseCommand('hello').kind, 'prompt')
  assert.equal(parseCommand('/nope').kind, 'unknown')
})

test('whoami works before allowlist', async () => {
  const { bridge, sent } = makeHarness({ config: { allowedOpenIds: [] } })
  await bridge.handleEvent(event('/whoami'))
  assert.match(sent[0].text, new RegExp(USER))
})

test('unauthorized user is denied and audited', async () => {
  const { bridge, sent, auditEvents } = makeHarness()
  await bridge.handleEvent(event('hello', { open_id: 'ou_other' }))
  assert.match(sent[0].text, /无权限/)
  assert.ok(auditEvents.some(item => item.action === 'denied_user'))
})

test('dedupe ignores a repeated event_id', async () => {
  const { bridge, sent } = makeHarness()
  const payload = event('hello', { event_id: 'same-event' })
  await bridge.handleEvent(payload)
  await flush()
  const firstCount = sent.length
  await bridge.handleEvent(payload)
  await flush()
  assert.equal(sent.length, firstCount)
})

test('normal text is not a prompt; it points to task details', async () => {
  const { bridge, sent } = makeHarness()
  await bridge.handleEvent(event('hello'))
  assert.match(sent[0].text, /先发「连接」/)
})

test('connect sends an overview with running count and sorted tasks', async () => {
  const running = makeAgent('session-running-1111')
  running.status = 'running'
  running.session.log = [{ type: 'session/title', time: Date.now(), data: { title: '正在跑的任务' } }]
  const idle = makeAgent('session-idle-2222')
  idle.session.log = [{ type: 'session/title', time: Date.now() - 60_000, data: { title: '空闲任务' } }]
  const { bridge, sentCards } = makeHarness({ agents: [idle, running], cards: true })
  await bridge.handleEvent(event('连接'))
  const card = sentCards.at(-1).card
  assert.equal(card.header.title.content, '已连接 · 远程模式')
  const notes = card.elements.filter(item => item.tag === 'note').flatMap(item => item.elements ?? []).map(item => item.content).join('\n')
  assert.match(notes, /1 个任务正在运行/)
  const text = JSON.stringify(card)
  assert.ok(text.indexOf('正在跑的任务') < text.indexOf('空闲任务'))
  assert.ok(bridge.isRemoteActive())
  await bridge.dispose()
})

test('disconnect turns pushes off', async () => {
  const { bridge, sent } = makeHarness({ cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.handleEvent(event('断开'))
  assert.equal(bridge.isRemoteActive(), false)
  assert.ok(sent.some(item => /已断开远程模式/.test(item.text)))
  await bridge.dispose()
})

test('clicking a task opens its detail without any control step', async () => {
  const agent = makeAgent('session-open-3333')
  agent.session.log = [{ type: 'session/title', time: Date.now(), data: { title: '直接打开的任务' } }]
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('!sessions'))
  await bridge.handleCardAction(cardAction({ action: 'view', id: agent.id }))
  const card = sentCards.at(-1).card
  assert.equal(card.header.title.content, '直接打开的任务')
  assert.ok(card.elements.some(element => element.tag === 'form'))
  assert.ok(!JSON.stringify(card).includes('"action":"use"'))
  await bridge.dispose()
})

test('running task detail has no input or continue, only stop/back', async () => {
  const agent = makeAgent('session-run-detail')
  agent.status = 'running'
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.sendDetail(CHAT, agent)
  const card = sentCards.at(-1).card
  assert.ok(!card.elements.some(element => element.tag === 'form'))
  const buttons = card.elements.flatMap(element => element.actions ?? [])
  assert.ok(buttons.some(button => button.value.action === 'stop'))
  assert.ok(!buttons.some(button => button.value.action === 'prompt'))
  await bridge.dispose()
})

test('idle task detail contains an input form and no continue button', async () => {
  const agent = makeAgent('session-idle-detail')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.sendDetail(CHAT, agent)
  const card = sentCards.at(-1).card
  const form = card.elements.find(element => element.tag === 'form')
  assert.ok(form)
  assert.equal(form.elements[0].tag, 'input')
  assert.equal(form.elements[1].action_type, 'form_submit')
  assert.ok(!JSON.stringify(card).includes('继续执行'))
  await bridge.dispose()
})

test('input form sends a prompt to that exact task', async () => {
  const agent = makeAgent('session-input-4444')
  const { bridge, sent, sentCards } = makeHarness({ agents: [agent], cards: true })
  const result = await bridge.handleCardAction(cardAction({ action: 'prompt', id: agent.id }, { prompt: '继续做视频' }))
  assert.match(result.toast.content, /已发送/)
  await flush()
  assert.equal(agent.session._messages[0].content[0].text, '继续做视频')
  assert.ok(sentCards.length > 0)
  await bridge.dispose()
})

test('running task rejects the input form', async () => {
  const agent = makeAgent('session-input-running')
  agent.status = 'running'
  const { bridge } = makeHarness({ agents: [agent], cards: true })
  const result = await bridge.handleCardAction(cardAction({ action: 'prompt', id: agent.id }, { prompt: '再改一下' }))
  assert.match(result.toast.content, /正在运行/)
  assert.equal(agent.session._messages, undefined)
  await bridge.dispose()
})

test('markdown headings are normalized before being put in a card', async () => {
  const agent = makeAgent('session-md-5555')
  agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '# 结果\n\n- 第一项\n- 第二项' }] }]
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.sendDetail(CHAT, agent)
  const text = JSON.stringify(sentCards.at(-1).card)
  assert.ok(text.includes('**结果**'))
  assert.ok(!text.includes('# 结果'))
  await bridge.dispose()
})

test('local images in output are uploaded and shown in the detail card', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-feishu-media-'))
  const agent = makeAgent('session-media-6666')
  agent.session.header.cwd = dir
  agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '看这张图：![截图](shot.png)' }] }]
  await writeFile(join(dir, 'shot.png'), Buffer.from('not-a-real-png'))
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  bridge.transport.uploadImage = async () => 'img_key_1'
  await bridge.sendDetail(CHAT, agent)
  const card = sentCards.at(-1).card
  const image = card.elements.find(element => element.tag === 'img')
  assert.equal(image.img_key, 'img_key_1')
  await bridge.dispose()
  await rm(dir, { recursive: true, force: true })
})

test('completion pushes only while remote mode is active', async () => {
  const agent = makeAgent('session-notify-7777')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.pollAgents()
  agent.status = 'running'
  await bridge.pollAgents()
  agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: 'task done' }] }]
  agent.status = 'idle'
  await bridge.pollAgents()
  assert.equal(sentCards.length, 0)
  await bridge.handleEvent(event('连接'))
  const afterConnect = sentCards.length
  agent.status = 'running'
  await bridge.pollAgents()
  agent.status = 'idle'
  await bridge.pollAgents()
  await bridge.flushDigest()
  const completion = sentCards.slice(afterConnect).find(item => item.card.header.title.content.startsWith('✅ 已完成'))
  assert.ok(completion)
  assert.match(JSON.stringify(completion.card), /task done/)
  assert.ok(completion.card.elements.some(element => element.tag === 'form'))
  assert.ok(!JSON.stringify(completion.card).includes('查看详情'))
  await bridge.dispose()
})

test('offline completions show up when connecting again', async () => {
  const agent = makeAgent('session-queue-8888')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.pollAgents()
  agent.status = 'running'
  await bridge.pollAgents()
  agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: 'done offline' }] }]
  agent.status = 'idle'
  await bridge.pollAgents()
  await bridge.handleEvent(event('连接'))
  const card = sentCards.at(-1).card
  assert.match(JSON.stringify(card), /离开期间 1 个完成/)
  await bridge.dispose()
})

test('approval in remote mode is actionable from the card without binding', async () => {
  const agent = makeAgent('session-approval-9999')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  const request = { agent, toolName: 'bash', callId: 'call-card-1', reason: '需要运行测试', signal: new AbortController().signal }
  const outcome = bridge.onApproval(request, () => 'next')
  await flush()
  const approval = sentCards.find(item => item.card.header.title.content === '⏳ 需要审批')
  assert.ok(approval)
  const approve = approval.card.elements.flatMap(element => element.actions ?? []).find(button => button.value.action === 'approve')
  const result = await bridge.handleCardAction(cardAction(approve.value))
  assert.match(result.toast.content, /已批准/)
  assert.equal(await outcome, 'allowed-once')
  await bridge.dispose()
})

test('approval while disconnected still notifies but delegates to Web', async () => {
  const agent = makeAgent('session-approval-off')
  const { bridge, sent } = makeHarness({ agents: [agent] })
  await bridge.handleEvent(event('!sessions'))
  const request = { agent, toolName: 'bash', callId: 'call-off-1', reason: '需要写入', signal: new AbortController().signal }
  assert.equal(bridge.onApproval(request, () => 'next'), 'next')
  await flush()
  assert.ok(sent.some(item => /任务在等审批/.test(item.text) && /Web/.test(item.text)))
  assert.equal(bridge.pending.size, 0)
  await bridge.dispose()
})

test('remote mode expires after the idle window', async () => {
  let now = 1_000_000
  const { bridge, sent } = makeHarness({ cards: true, now: () => now, config: { remoteIdleMs: 300_000 } })
  await bridge.handleEvent(event('连接'))
  assert.equal(bridge.isRemoteActive(), true)
  now += 301_000
  assert.equal(bridge.isRemoteActive(), false)
  await bridge.checkRemoteExpiry()
  assert.ok(sent.some(item => /自动断开/.test(item.text)))
  await bridge.dispose()
})

test('reason object renders in Chinese, not [object Object]', async () => {
  const agent = makeAgent('session-reason-0000')
  const { bridge, sent } = makeHarness({ agents: [agent] })
  await bridge.handleEvent(event('!sessions'))
  const request = {
    agent,
    toolName: 'bash',
    callId: 'call-reason-1',
    reason: { en: 'Allow this operation', zh: '允许这次操作' },
    signal: new AbortController().signal,
  }
  assert.equal(bridge.onApproval(request, () => 'next'), 'next')
  await flush()
  const text = sent.map(item => item.text).join('\n')
  assert.match(text, /允许这次操作/)
  assert.ok(!text.includes('[object Object]'))
  await bridge.dispose()
})

test('empty sessions are hidden unless !sessions all is used', async () => {
  const real = makeAgent('session-real-1234')
  real.session.log = [{ type: 'session/title', time: Date.now(), data: { title: '真实任务' } }]
  const empty = makeAgent('session-empty-1234')
  empty.session.log = []
  const { bridge, sent } = makeHarness({ agents: [empty, real] })
  await bridge.handleEvent(event('!sessions'))
  assert.match(sent[0].text, /真实任务/)
  assert.ok(!sent[0].text.includes('空会话（未开始）'))
  assert.match(sent[0].text, /另有 1 个空会话/)
  await bridge.handleEvent(event('!sessions all'))
  assert.match(sent[1].text, /空会话/)
  await bridge.dispose()
})

test('loadSettings reads allowlist and group flag from env file', async () => {
  const { loadSettings } = await import('../lib/config.js')
  const dir = await mkdtemp(join(tmpdir(), 'dsh-feishu-'))
  const file = join(dir, 'feishu.env')
  await writeFile(file, 'FEISHU_APP_ID=cli_0123456789abcdef\nFEISHU_APP_SECRET=abc\nFEISHU_ALLOWED_OPEN_IDS=ou_a,ou_b\nFEISHU_ALLOW_GROUP=true\n', { mode: 0o600 })
  const settings = await loadSettings({ appSecretFile: file, allowedOpenIds: [], allowGroup: false, appId: '' }, {})
  assert.equal(settings.appId, 'cli_0123456789abcdef')
  assert.equal(settings.appSecret, 'abc')
  assert.deepEqual(settings.allowedOpenIds, ['ou_a', 'ou_b'])
  assert.equal(settings.allowGroup, true)
  await rm(dir, { recursive: true, force: true })
})

test('submitting a prompt updates the same detail card through accepted and result states', async () => {
  const agent = makeAgent('session-live-card-1111')
  const { bridge, sentCards, updatedCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.sendDetail(CHAT, agent)
  const messageId = sentCards.at(-1).messageId
  const result = await bridge.handleCardAction(cardAction({ action: 'prompt', id: agent.id }, { prompt: '继续做视频' }))
  assert.match(result.toast.content, /已发送/)
  await flush()
  const accepted = updatedCards.find(item => item.messageId === messageId && JSON.stringify(item.card).includes('已发送，执行中'))
  assert.ok(accepted)
  const finalCard = sentCards.find(item => item.messageId === messageId).card
  assert.ok(finalCard.elements.some(element => element.tag === 'form'))
  assert.ok(!JSON.stringify(finalCard).includes('已发送，执行中'))
  await bridge.dispose()
})

test('repeated card submission is ignored within the guard window', async () => {
  const agent = makeAgent('session-idempotent-2222')
  const { bridge } = makeHarness({ agents: [agent], cards: true })
  const action = cardAction({ action: 'prompt', id: agent.id }, { prompt: '继续' })
  await bridge.handleCardAction(action)
  const second = await bridge.handleCardAction(action)
  assert.match(second.toast.content, /已经处理过/)
  await flush()
  const prompts = agent.session._messages.filter(message => message.role === 'user')
  assert.equal(prompts.length, 1)
  await bridge.dispose()
})

test('connect inbox shows pending approvals with inline buttons', async () => {
  const agent = makeAgent('session-inbox-3333')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  const request = { agent, toolName: 'bash', callId: 'call-inbox-1', reason: '需要写文件', signal: new AbortController().signal }
  const pending = bridge.onApproval(request, () => 'next')
  await flush()
  assert.ok(sentCards.at(-1).card.header.title.content === '⏳ 需要审批')
  await bridge.connectRemote(CHAT, USER)
  const card = sentCards.at(-1).card
  const serialized = JSON.stringify(card)
  assert.match(serialized, /需要你/)
  assert.match(serialized, /待审批 1/)
  assert.match(serialized, /"action":"approve"/)
  assert.match(serialized, /"action":"deny"/)
  bridge.settle([...bridge.pending.values()][0], 'rejected', 'test')
  await pending
  await bridge.dispose()
})

test('multiple completions in the window each become an actionable task card', async () => {
  const first = makeAgent('session-digest-4444')
  const second = makeAgent('session-digest-5555')
  const { bridge, sentCards } = makeHarness({ agents: [first, second], cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.pollAgents()
  first.status = 'running'
  second.status = 'running'
  await bridge.pollAgents()
  first.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '第一个完成' }] }]
  second.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '第二个完成' }] }]
  first.status = 'idle'
  second.status = 'idle'
  await bridge.pollAgents()
  await bridge.flushDigest()
  const completions = sentCards.filter(item => item.card.header.title.content.startsWith('✅ 已完成'))
  assert.equal(completions.length, 2)
  assert.ok(completions.every(item => item.card.elements.some(element => element.tag === 'form')))
  assert.match(JSON.stringify(completions.map(item => item.card)), /第一个完成/)
  assert.match(JSON.stringify(completions.map(item => item.card)), /第二个完成/)
  assert.equal(sentCards.filter(item => item.card.header.title.content === '✅ 2 个任务完成').length, 0)
  await bridge.dispose()
})

test('completion archives the old open card and pushes a new task card with input', async () => {
  const agent = makeAgent('session-open-complete-6666')
  const { bridge, sentCards, updatedCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.pollAgents()
  await bridge.sendDetail(CHAT, agent)
  const oldMessageId = sentCards.at(-1).messageId
  agent.status = 'running'
  await bridge.pollAgents()
  agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '完成' }] }]
  agent.status = 'idle'
  await bridge.pollAgents()
  await bridge.flushDigest()
  const archived = updatedCards.filter(item => item.messageId === oldMessageId).at(-1)
  assert.ok(archived)
  assert.match(JSON.stringify(archived.card), /已归档/)
  assert.ok(!JSON.stringify(archived.card).includes('停止执行'))
  const completion = sentCards.find(item => item.card.header.title.content.startsWith('✅ 已完成'))
  assert.ok(completion)
  assert.notEqual(completion.messageId, oldMessageId)
  assert.ok(completion.card.elements.some(element => element.tag === 'form'))
  await bridge.dispose()
})

test('task list marks a recently completed task as just completed', async () => {
  const agent = makeAgent('session-just-completed-7777')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.pollAgents()
  agent.status = 'running'
  await bridge.pollAgents()
  agent.status = 'idle'
  await bridge.pollAgents()
  await bridge.flushDigest()
  await bridge.sendSessions(CHAT)
  const card = sentCards.at(-1).card
  assert.match(JSON.stringify(card), /刚完成/)
  await bridge.dispose()
})


test('media paths cannot escape the session directory through a symlink', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-feishu-root-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-feishu-outside-'))
  try {
    const secret = join(outside, 'secret.png')
    await writeFile(secret, 'not really an image')
    await symlink(secret, join(root, 'link.png'))
    const agent = makeAgent('session-symlink-9999')
    agent.session.header.cwd = root
    agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '![x](link.png)' }] }]
    const uploads = []
    const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
    bridge.transport.uploadImage = async path => {
      uploads.push(path)
      return 'img-key'
    }
    await bridge.sendDetail(CHAT, agent)
    assert.equal(uploads.length, 0)
    assert.ok(!JSON.stringify(sentCards.at(-1).card).includes('img-key'))
    await bridge.dispose()
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})

test('offline failures appear in the connect inbox as异常', async () => {
  const agent = makeAgent('session-offline-fail-8888')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.handleEvent(event('断开'))
  await bridge.pollAgents()
  agent.status = 'running'
  await bridge.pollAgents()
  agent.status = 'error'
  await bridge.pollAgents()
  await bridge.handleEvent(event('连接'))
  const card = sentCards.at(-1).card
  const serialized = JSON.stringify(card)
  assert.match(serialized, /异常 1/)
  assert.match(serialized, /离开期间 0 个完成 · 1 个异常/)
  await bridge.dispose()
})

test('failure pushes are also full task cards with input', async () => {
  const agent = makeAgent('session-fail-card-1212')
  const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
  await bridge.handleEvent(event('连接'))
  await bridge.pollAgents()
  agent.status = 'running'
  await bridge.pollAgents()
  agent.status = 'error'
  await bridge.pollAgents()
  await bridge.flushDigest()
  const failure = sentCards.find(item => item.card.header.title.content.startsWith('⚠️ 任务异常'))
  assert.ok(failure)
  assert.ok(failure.card.elements.some(element => element.tag === 'form'))
  assert.ok(!JSON.stringify(failure.card).includes('查看详情'))
  await bridge.dispose()
})

test('presented deliverables are sent even when the assistant text omits the path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-feishu-present-'))
  try {
    const video = join(root, 'result.mp4')
    await writeFile(video, 'fake video bytes')
    const agent = makeAgent('session-presented-1313')
    agent.session.header.cwd = root
    agent.session._messages = [{ role: 'assistant', content: [{ type: 'text', text: '这版好了，你看一下。' }] }]
    agent.session.log.push({
      type: 'deliverables/presented',
      time: Date.now(),
      data: { files: [{ path: video, description: '最终视频' }] },
    })
    const videoSends = []
    const { bridge, sentCards } = makeHarness({ agents: [agent], cards: true })
    bridge.transport.sendVideo = async (chatId, path) => { videoSends.push({ chatId, path }) }
    await bridge.sendDetail(CHAT, agent)
    assert.equal(videoSends.length, 1)
    assert.ok(videoSends[0].path.endsWith('/result.mp4'))
    assert.match(JSON.stringify(sentCards.at(-1).card), /视频已单独发送/)
    await bridge.dispose()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('dsh disk sessions are idle-resumable (never observe-only) and HubCore reconciles legacy observe-only dsh tasks', async () => {
  const { decorateTaskMetadata } = await import('../lib/harness-router.js')
  const { HubCore } = await import('../../hub/hub-core.js')
  const { buildDshHeadlessPatchFile } = await import('../lib/harnesses/dsh-headless-adapter.js')

  const diskDshTask = decorateTaskMetadata(
    { id: 'session-no2-test', harness: 'dsh', title: 'no2 DSH session', status: 'idle', transcript: [] },
    { isLiveDsh: false },
  )
  assert.equal(diskDshTask.controlMode, 'idle-resumable')
  assert.equal(diskDshTask.capabilities.canPrompt, true)

  const cachedStaleDshTask = decorateTaskMetadata(
    {
      id: 'session-no2-cached',
      harness: 'dsh',
      controlMode: 'observe-only',
      capabilities: { canPrompt: false },
    },
    { isLiveDsh: false },
  )
  assert.equal(cachedStaleDshTask.controlMode, 'idle-resumable')
  assert.equal(cachedStaleDshTask.capabilities.canPrompt, true)

  const hub = new HubCore({ hubToken: 'test-token' })
  await hub.handleHeartbeat({
    hostId: 'mac-mini-01',
    hostName: 'mac-mini',
    syncMeta: { bootId: 'boot-new', bootEpochMs: 2000, seq: 10 },
    bridgeState: {
      tasks: [
        {
          id: 'session-legacy-observe',
          harness: 'dsh',
          title: 'Legacy Read-Only Task',
          status: 'idle',
          controlMode: 'observe-only',
          capabilities: { canPrompt: false },
          transcript: [],
        },
      ],
      approvals: [],
      workspaces: [],
    },
  })

  const fullState = hub.getFullState()
  const hostState = fullState.hosts.find(h => h.hostId === 'mac-mini-01')
  assert.equal(hostState.bridgeState.tasks[0].controlMode, 'idle-resumable')
  assert.equal(hostState.bridgeState.tasks[0].capabilities.canPrompt, true)

  // Stale process heartbeat must not steal queued commands
  hub.queueCommand('mac-mini-01', { type: 'prompt', sessionId: 'session-legacy-observe', text: 'hello' })
  const staleRes = await hub.handleHeartbeat({
    hostId: 'mac-mini-01',
    hostName: 'mac-mini',
    syncMeta: { bootId: 'boot-old', bootEpochMs: 1000, seq: 99 },
    bridgeState: { tasks: [], approvals: [], workspaces: [] },
  })
  assert.equal(staleRes.staleSnapshotIgnored, true)
  assert.equal(staleRes.commands.length, 0)

  const activeRes = await hub.handleHeartbeat({
    hostId: 'mac-mini-01',
    hostName: 'mac-mini',
    syncMeta: { bootId: 'boot-new', bootEpochMs: 2000, seq: 11 },
    bridgeState: hostState.bridgeState,
  })
  assert.equal(activeRes.commands.length, 1)
  assert.equal(activeRes.commands[0].text, 'hello')

  const root = await mkdtemp(join(tmpdir(), 'dsh-headless-patch-'))
  try {
    const patchPath = buildDshHeadlessPatchFile(root)
    assert.ok(patchPath.endsWith('headless-remote-patch.yml'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }

  // Verify turn-level assistant step merging, full reply preservation (>4000 chars), and tool argument/result extraction
  const { extractSessionTranscript, mergeTurnAssistantMessages } = await import('../lib/workspace-ops.js')
  const longFinalReply = '## 完整评估报告\n\n' + '核心结论段落内容。'.repeat(600) // ~5400 chars (> old 4000 limit)
  const longThought1 = '思考步骤一详情。'.repeat(200) // ~1400 chars (> old 1000 limit)
  const longThought2 = '思考步骤二详情。'.repeat(200)

  const fakeAgent = {
    session: {
      log: [
        {
          type: 'tool/result',
          data: {
            message: {
              source: { kind: 'tool', callId: 'call-1' },
              content: [{ type: 'text', text: 'M hub/hub-core.js\nM hub/web/src/controller.js' }],
            },
          },
        },
      ],
      deriveMessages() {
        return [
          {
            role: 'user',
            content: [{ type: 'text', text: '请帮我评估方案并检查本地改动' }],
          },
          {
            role: 'assistant',
            content: [
              { type: 'reasoning', text: longThought1 },
              { type: 'tool-call', id: 'call-1', name: 'bash', arguments: JSON.stringify({ command: 'git status -s' }) },
            ],
          },
          {
            role: 'assistant',
            content: [
              { type: 'reasoning', text: longThought2 },
              { type: 'text', text: longFinalReply },
            ],
          },
        ]
      },
    },
  }

  const extracted = extractSessionTranscript(fakeAgent, 40)
  assert.equal(extracted.length, 2)
  assert.equal(extracted[0].role, 'user')
  assert.equal(extracted[1].role, 'assistant')
  assert.equal(extracted[1].thinkingStepCount, 2)
  assert.ok(extracted[1].thinking.includes('【思考 1】'))
  assert.ok(extracted[1].thinking.includes('【思考 2】'))
  assert.ok(extracted[1].thinking.length > 2500)
  assert.equal(extracted[1].text.length, longFinalReply.length)
  assert.equal(extracted[1].tools.length, 1)
  assert.equal(extracted[1].tools[0].name, 'bash')
  assert.equal(extracted[1].tools[0].summary, 'git status -s')
  assert.match(extracted[1].tools[0].commandLine, /\$ git status -s/)
  assert.match(extracted[1].tools[0].commandLine, /--- 执行输出 ---/)
  assert.match(extracted[1].tools[0].commandLine, /hub\/hub-core\.js/)
})

test('persistCommandAttachments saves mobile screenshots to workspace and enriches prompts across harnesses', async () => {
  const { persistCommandAttachments } = await import('../lib/workspace-ops.js')
  const { HubCore } = await import('../../hub/hub-core.js')
  const { existsSync, readFileSync } = await import('node:fs')

  const root = await mkdtemp(join(tmpdir(), 'dsh-upload-test-'))
  try {
    // 1x1 PNG in base64
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII='

    const saved = await persistCommandAttachments(
      [
        {
          name: 'mobile-screen-1.png',
          mimeType: 'image/png',
          dataBase64: `data:image/png;base64,${samplePngBase64}`,
        },
      ],
      {
        cwd: root,
        dshHome: root,
        agentId: 'codex:019c0000-1111-2222-3333-444444444444',
        now: 1793960000000,
      },
    )

    assert.equal(saved.savedFiles.length, 1)
    assert.equal(saved.imagePaths.length, 1)
    assert.ok(existsSync(saved.imagePaths[0]))
    assert.ok(saved.imagePaths[0].includes('.dsh-uploads'))
    const diskBuf = readFileSync(saved.imagePaths[0])
    assert.ok(diskBuf.length > 20)

    const enriched = saved.enrichPrompt('请看这张报错截图')
    assert.match(enriched, /请看这张报错截图/)
    assert.match(enriched, /手机端上传图片附件/)
    assert.ok(enriched.includes(saved.imagePaths[0]))

    // Verify HubCore keeps attachments in host.commands for heartbeat delivery,
    // while stripping raw base64 from HTTP echo and getFullState()
    const hub = new HubCore({ stateFile: join(root, 'hub-state.json') })
    hub.handleHeartbeat({
      hostId: 'mac-test',
      hostName: 'Mac Test',
      bridgeState: { tasks: [], approvals: [], workspaces: [] },
    })
    const qRes = hub.queueCommand('mac-test', {
      type: 'prompt',
      agentId: 'codex:019c0000-1111-2222-3333-444444444444',
      text: '帮我看截图',
      attachments: [
        {
          name: 'shot.png',
          mimeType: 'image/png',
          dataBase64: samplePngBase64,
        },
      ],
    })
    assert.equal(qRes.ok, true)
    assert.equal(qRes.command.attachmentCount, 1)
    assert.equal(qRes.command.attachments, undefined)

    const fullState = hub.getFullState()
    const pendingInState = fullState.hosts[0].pendingCommands[0]
    assert.equal(pendingInState.attachments, undefined)

    // When host heartbeats, it receives the full attachments payload
    const hbRes = hub.handleHeartbeat({
      hostId: 'mac-test',
      hostName: 'Mac Test',
      bridgeState: { tasks: [], approvals: [], workspaces: [] },
    })
    assert.equal(hbRes.commands.length, 1)
    assert.equal(hbRes.commands[0].attachments.length, 1)
    assert.equal(hbRes.commands[0].attachments[0].dataBase64, samplePngBase64)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('approval lifecycle closure: 45s TTL expiry, dedupe, cancel cleanup, actionId matching, ledger persistence, and full transcript API', async () => {
  const { HubCore } = await import('../../hub/hub-core.js')
  const { HarnessRouter } = await import('../lib/harness-router.js')

  const root = await mkdtemp(join(tmpdir(), 'dsh-approval-closure-'))
  try {
    const stateFile = join(root, 'hub-state.json')
    const hub = new HubCore({ stateFile })
    await hub.init()

    const longTranscript = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `Message #${i + 1}`,
    }))

    hub.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac 1',
      bridgeState: {
        tasks: [
          {
            id: 'agent-1',
            title: 'Long Session',
            status: 'approval',
            transcript: longTranscript,
          },
        ],
        approvals: [
          {
            code: 'AP-100',
            agentId: 'agent-1',
            toolName: 'bash',
            reason: 'rm -rf /tmp/demo',
          },
        ],
        workspaces: [],
      },
    })

    // 1. Wire state compacts top session to 14 messages and exposes omittedTranscriptCount,
    //    while getSessionFullTranscript returns all 20 messages.
    const wireState = hub.getFullState()
    const wireTask = wireState.hosts[0].bridgeState.tasks[0]
    assert.equal(wireTask.transcript.length, 14)
    assert.equal(wireTask.totalTranscriptCount, 20)
    assert.equal(wireTask.omittedTranscriptCount, 6)
    assert.equal(wireTask.hasMoreTranscript, true)

    const fullTr = hub.getSessionFullTranscript('mac-1', 'agent-1')
    assert.equal(fullTr.ok, true)
    assert.equal(fullTr.transcript.length, 20)
    assert.equal(fullTr.transcript[0].text, 'Message #1')

    // 2. Queue approval command -> has 45s TTL and deduplicates double clicks while settling
    const q1 = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-100',
      agentId: 'agent-1',
      allow: true,
    })
    assert.equal(q1.ok, true)
    assert.ok(q1.command.expiresAt > Date.now() + 40000)
    assert.ok(q1.command.expiresAt <= Date.now() + 46000)

    const q2 = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-100',
      agentId: 'agent-1',
      allow: true,
    })
    assert.equal(q2.ok, true)
    assert.equal(q2.deduplicated, true)
    assert.equal(q2.command.id, q1.command.id)
    assert.equal(hub.hosts.get('mac-1').commands.length, 1)

    // 3. Persist and restore approvalLedger across Hub restarts
    await hub.persist()
    const hubRestarted = new HubCore({ stateFile })
    await hubRestarted.init()
    const restoredEntry = hubRestarted.approvalLedger.get('mac-1:AP-100')
    assert.ok(restoredEntry)
    assert.equal(restoredEntry.status, 'settling')
    assert.equal(restoredEntry.actionId, q1.command.id)

    // 4. Cancel command -> clears approvalLedger immediately
    const cRes = hub.cancelCommand(q1.command.id)
    assert.equal(cRes.ok, true)
    assert.equal(hub.approvalLedger.has('mac-1:AP-100'), false)

    // 5. Re-queue and test 45s TTL expiry: offline host reconnecting after TTL NEVER receives timed-out approval
    const q3 = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-100',
      agentId: 'agent-1',
      allow: true,
    })
    assert.equal(q3.ok, true)
    // Simulate 46 seconds passing before host reconnects
    hub.hosts.get('mac-1').commands[0].expiresAt = Date.now() - 1000
    const hbAfterTtl = hub.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac 1',
      bridgeState: {
        tasks: [{ id: 'agent-1', title: 'Long Session', status: 'approval', transcript: [] }],
        approvals: [{ code: 'AP-100', agentId: 'agent-1', toolName: 'bash' }],
        workspaces: [],
      },
    })
    assert.equal(hbAfterTtl.commands.length, 0)
    assert.equal(hub.approvalLedger.get('mac-1:AP-100')?.status, 'failed')

    // 6. Stale command result cannot settle a newer approval actionId
    const q4 = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-100',
      agentId: 'agent-1',
      allow: false,
    })
    assert.equal(q4.ok, true)
    assert.equal(hub.approvalLedger.get('mac-1:AP-100')?.status, 'settling')
    // Deliver a late result from an older actionId (q3.command.id)
    hub.onCommandResult('mac-1', {
      id: q3.command.id,
      type: 'approval',
      code: 'AP-100',
      ok: true,
    })
    // Ledger for q4 must still be settling, not prematurely settled!
    assert.equal(hub.approvalLedger.get('mac-1:AP-100')?.status, 'settling')
    assert.equal(hub.approvalLedger.get('mac-1:AP-100')?.actionId, q4.command.id)

    // Now deliver matching result for q4
    hub.onCommandResult('mac-1', {
      id: q4.command.id,
      type: 'approval',
      code: 'AP-100',
      ok: true,
    })
    assert.equal(hub.approvalLedger.get('mac-1:AP-100')?.status, 'settled')

    // 7. HarnessRouter last-known-good fallback on transient adapter error
    const router = new HarnessRouter({ enabledHarnesses: ['dsh', 'codex'] })
    let shouldFail = false
    router.registerAdapter({
      id: 'codex',
      async listSessions() {
        if (shouldFail) throw new Error('EBUSY transient sqlite lock')
        return [{ id: 'codex:sess-1', harness: 'codex', title: 'Codex Task' }]
      },
    })
    const firstList = await router.listExternalSessions()
    assert.equal(firstList.length, 1)
    assert.equal(firstList[0].id, 'codex:sess-1')

    shouldFail = true
    const fallbackList = await router.listExternalSessions()
    assert.equal(fallbackList.length, 1)
    assert.equal(fallbackList[0].id, 'codex:sess-1')
    assert.match(fallbackList[0].stateMeta.lastScanError, /EBUSY/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('real DSH v4 zstd active lock guard, 409 approval conflict, disk transcript hasMore, and attachment restart persistence', async () => {
  const { HubCore } = await import('../../hub/hub-core.js')
  const { isDshSessionActivelyWriting } = await import('../lib/harnesses/dsh-headless-adapter.js')
  const { loadDiskSessionsFromDshHome, invalidateDshSessionParseCache, persistCommandAttachments } = await import(
    '../lib/workspace-ops.js'
  )
  const { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } = await import('node:fs')
  const zlib = await import('node:zlib')

  const root = await mkdtemp(join(tmpdir(), 'dsh-v4-audit-closure-'))
  try {
    // 1. Real DSH v4 format: session.v4.jsonl.zstd active writing detection
    const sessDir = join(root, 'sessions', 'proj-1', 'session-v4-real')
    mkdirSync(sessDir, { recursive: true })
    const zstdPath = join(sessDir, 'session.v4.jsonl.zstd')
    const lockPath = join(sessDir, 'session.lock')
    writeFileSync(lockPath, '12345\n', 'utf8')

    const midTurnLines = [
      JSON.stringify({ type: 'session', id: 'session-v4-real', cwd: root, time: 1794000000000 }),
      JSON.stringify({
        type: 'user/message',
        time: 1794000001000,
        data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Run test suite' }] },
      }),
      JSON.stringify({
        type: 'tool/call',
        time: 1794000002000,
        data: { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: { command: 'npm test' } },
      }),
    ].join('\n')
    writeFileSync(zstdPath, zlib.zstdCompressSync(Buffer.from(`${midTurnLines}\n`, 'utf8')))

    // Even when mtime is 20 seconds old (beyond 6s mtime gate, within 90s mid-turn window),
    // zstd decompression detects the unfinished tool/call turn!
    const nowMs = Date.now()
    const twentySecAgo = new Date(nowMs - 20_000)
    utimesSync(zstdPath, twentySecAgo, twentySecAgo)
    assert.equal(isDshSessionActivelyWriting(sessDir, { now: nowMs }), true)

    // Once assistant/message concludes with final text and mtime is > 6s old, session is idle
    const concludedLines = [
      midTurnLines,
      JSON.stringify({
        type: 'assistant/message',
        time: 1794000005000,
        data: {
          turn: 1,
          step: 2,
          message: { role: 'assistant', content: [{ type: 'text', text: 'All tests passed.' }] },
        },
      }),
    ].join('\n')
    writeFileSync(zstdPath, zlib.zstdCompressSync(Buffer.from(`${concludedLines}\n`, 'utf8')))
    utimesSync(zstdPath, twentySecAgo, twentySecAgo)
    assert.equal(isDshSessionActivelyWriting(sessDir, { now: nowMs }), false)

    // If mtime is fresh (1s ago), conservative mtime gate treats it as active immediately
    const oneSecAgo = new Date(nowMs - 1000)
    utimesSync(zstdPath, oneSecAgo, oneSecAgo)
    assert.equal(isDshSessionActivelyWriting(sessDir, { now: nowMs }), true)

    // 2. Approval conflict: allow first, deny second returns 409 APPROVAL_CONFLICT (never silently keeps allow)
    const stateFile = join(root, 'hub-state.json')
    const hub = new HubCore({ stateFile })
    await hub.init()
    hub.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac 1',
      bridgeState: {
        tasks: [
          {
            id: 'session-v4-real',
            title: 'Disk DSH Session',
            status: 'approval',
            messageCount: 100,
            totalTranscriptCount: 100,
            transcript: Array.from({ length: 14 }, (_, i) => ({
              role: i % 2 === 0 ? 'user' : 'assistant',
              text: `Msg ${i + 87}`,
            })),
          },
        ],
        approvals: [{ code: 'AP-200', agentId: 'session-v4-real', toolName: 'bash' }],
        workspaces: [],
      },
    })

    const allowRes = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-200',
      agentId: 'session-v4-real',
      allow: true,
    })
    assert.equal(allowRes.ok, true)

    const denyConflictRes = hub.queueCommand('mac-1', {
      type: 'approval',
      code: 'AP-200',
      agentId: 'session-v4-real',
      allow: false,
    })
    assert.equal(denyConflictRes.ok, false)
    assert.equal(denyConflictRes.statusCode, 409)
    assert.equal(denyConflictRes.code, 'APPROVAL_CONFLICT')
    assert.equal(denyConflictRes.conflict, true)
    assert.equal(denyConflictRes.existingDecision, 'approve')

    // 3. getSessionFullTranscript sets hasMore=true when bridgeState only has 14 of 100 messages,
    //    and load_full_transcript result is stripped from recentResults in getFullState()
    const partialTr = hub.getSessionFullTranscript('mac-1', 'session-v4-real')
    assert.equal(partialTr.ok, true)
    assert.equal(partialTr.transcript.length, 14)
    assert.equal(partialTr.totalCount, 100)
    assert.equal(partialTr.hasMore, true)

    const full100 = Array.from({ length: 100 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      text: `Msg ${i + 1}`,
    }))
    hub.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac 1',
      commandResults: [
        {
          id: 'cmd-full-tr',
          type: 'load_full_transcript',
          ok: true,
          agentId: 'session-v4-real',
          totalCount: 100,
          transcript: full100,
        },
      ],
    })
    const afterFullTr = hub.getSessionFullTranscript('mac-1', 'session-v4-real')
    assert.equal(afterFullTr.transcript.length, 100)
    assert.equal(afterFullTr.hasMore, false)

    // Verify recentResults in getFullState() does NOT carry the 100-item transcript array
    const stateAfter = hub.getFullState()
    const recent = stateAfter.hosts[0].recentResults.find(r => r.id === 'cmd-full-tr')
    assert.ok(recent)
    assert.equal(recent.transcript, undefined)
    assert.equal(recent.transcriptCount, 100)
    // While commandResultsById still has the full transcript for polling
    assert.equal(hub.getCommandResult('cmd-full-tr').transcript.length, 100)

    // Also verify loadDiskSessionsFromDshHome cache slices by maxMessages properly
    invalidateDshSessionParseCache()
    const manyTurnsLines = [
      JSON.stringify({ type: 'session', id: 'session-v4-real', cwd: root, time: 1794000000000 }),
    ]
    for (let i = 0; i < 20; i += 1) {
      manyTurnsLines.push(
        JSON.stringify({
          type: 'user/message',
          time: 1794000010000 + i * 2000,
          data: { source: { kind: 'user' }, content: [{ type: 'text', text: `User turn ${i + 1}` }] },
        }),
      )
      manyTurnsLines.push(
        JSON.stringify({
          type: 'assistant/message',
          time: 1794000011000 + i * 2000,
          data: {
            turn: i + 1,
            step: 1,
            message: { role: 'assistant', content: [{ type: 'text', text: `Assistant reply ${i + 1}` }] },
          },
        }),
      )
    }
    writeFileSync(zstdPath, zlib.zstdCompressSync(Buffer.from(`${manyTurnsLines.join('\n')}\n`, 'utf8')))
    utimesSync(zstdPath, twentySecAgo, twentySecAgo)

    const defaultDisk = await loadDiskSessionsFromDshHome(root, { maxMessages: 14 })
    assert.equal(defaultDisk[0].transcript.length, 14)
    assert.equal(defaultDisk[0].messageCount, 40)
    assert.equal(defaultDisk[0].totalTranscriptCount, 40)

    const expandedDisk = await loadDiskSessionsFromDshHome(root, { maxMessages: 300 })
    assert.equal(expandedDisk[0].transcript.length, 40)

    // 4. Attachments persist across Hub restart and .dsh-uploads/.gitignore is written automatically
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII='
    hub.queueCommand('mac-1', {
      type: 'prompt',
      agentId: 'session-v4-real',
      text: 'Offline queued with screenshot',
      attachments: [{ name: 'test.jpg', mimeType: 'image/jpeg', dataBase64: samplePngBase64 }],
    })
    await hub.persist()

    const hub2 = new HubCore({ stateFile })
    await hub2.init()
    const hb2 = hub2.handleHeartbeat({
      hostId: 'mac-1',
      hostName: 'Mac 1',
      bridgeState: { tasks: [], approvals: [], workspaces: [] },
    })
    const promptCmd = hb2.commands.find(c => c.type === 'prompt')
    assert.ok(promptCmd)
    assert.equal(promptCmd.attachments.length, 1)
    assert.equal(promptCmd.attachments[0].dataBase64, samplePngBase64)

    // Magic-byte PNG detection (even though name was test.jpg!) and .dsh-uploads/.gitignore creation
    const savedInfo = await persistCommandAttachments(promptCmd.attachments, {
      cwd: root,
      dshHome: root,
    })
    assert.equal(savedInfo.ok, true)
    assert.ok(savedInfo.imagePaths[0].endsWith('.png'))
    assert.ok(existsSync(join(root, '.dsh-uploads', '.gitignore')))
    assert.equal(readFileSync(join(root, '.dsh-uploads', '.gitignore'), 'utf8'), '*\n')

    // Invalid/empty attachment returns ok: false
    const badInfo = await persistCommandAttachments([{ name: 'empty.png', dataBase64: '' }], {
      cwd: root,
      dshHome: root,
    })
    assert.equal(badInfo.ok, false)
    assert.equal(badInfo.savedFiles.length, 0)
    assert.ok(badInfo.error.length > 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('long-running DSH tool turn (>120s/300s) lock protection & server-authoritative approval TTL bypass prevention', async () => {
  const { HubCore } = await import('../../hub/hub-core.js')
  const { isDshSessionActivelyWriting } = await import('../lib/harnesses/dsh-headless-adapter.js')
  const { loadDiskSessionsFromDshHome, invalidateDshSessionParseCache } = await import('../lib/workspace-ops.js')
  const { mkdirSync, utimesSync, writeFileSync } = await import('node:fs')
  const zlib = await import('node:zlib')

  const root = await mkdtemp(join(tmpdir(), 'dsh-long-turn-and-ttl-'))
  try {
    // 1. Long-running tool turn: `sleep 300` where transcript mtime is 2 minutes and 5 minutes old
    const sessDir = join(root, 'sessions', 'proj-long', 'session-sleep-300')
    mkdirSync(sessDir, { recursive: true })
    const zstdPath = join(sessDir, 'session.v4.jsonl.zstd')
    const lockPath = join(sessDir, 'session.lock')
    writeFileSync(lockPath, '99999\n', 'utf8')

    const longRunningLines = [
      JSON.stringify({ type: 'session', id: 'session-sleep-300', cwd: root, time: 1794000000000 }),
      JSON.stringify({
        type: 'user/message',
        time: 1794000001000,
        data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Run 5-minute build' }] },
      }),
      JSON.stringify({
        type: 'tool/call',
        time: 1794000002000,
        data: { turn: 1, step: 1, callId: 'c-long', name: 'bash', arguments: { command: 'sleep 300' } },
      }),
    ].join('\n')
    writeFileSync(zstdPath, zlib.zstdCompressSync(Buffer.from(`${longRunningLines}\n`, 'utf8')))

    const nowMs = Date.now()
    // 120 seconds (2 minutes) old
    const twoMinAgo = new Date(nowMs - 120_000)
    utimesSync(zstdPath, twoMinAgo, twoMinAgo)
    assert.equal(isDshSessionActivelyWriting(sessDir, { now: nowMs }), true)

    // 300 seconds (5 minutes) old
    const fiveMinAgo = new Date(nowMs - 300_000)
    utimesSync(zstdPath, fiveMinAgo, fiveMinAgo)
    assert.equal(isDshSessionActivelyWriting(sessDir, { now: nowMs }), true)

    // Also verify loadDiskSessionsFromDshHome reports status='running' for a 5-minute-old unfinished tool turn with session.lock
    invalidateDshSessionParseCache()
    const diskList = await loadDiskSessionsFromDshHome(root)
    assert.equal(diskList.length, 1)
    assert.equal(diskList[0].status, 'running')

    // 2. Server-authoritative approval TTL: client expiresAt: 0 or ttlMs: 999999999 CANNOT bypass 45s TTL
    const hub = new HubCore({ stateFile: join(root, 'hub-state.json') })
    await hub.init()
    hub.handleHeartbeat({
      hostId: 'mac-ttl',
      hostName: 'Mac TTL',
      bridgeState: {
        tasks: [{ id: 'agent-ttl', title: 'TTL Test', status: 'approval', transcript: [] }],
        approvals: [{ code: 'AP-TTL-1', agentId: 'agent-ttl', toolName: 'bash' }],
        workspaces: [],
      },
    })

    const bypassAttempt1 = hub.queueCommand('mac-ttl', {
      type: 'approval',
      code: 'AP-TTL-1',
      agentId: 'agent-ttl',
      allow: true,
      expiresAt: 0,
      ttlMs: 999_999_999,
    })
    assert.equal(bypassAttempt1.ok, true)
    // Must enforce ~45s TTL, never 0 or 999999999!
    assert.ok(bypassAttempt1.command.expiresAt > Date.now() + 40_000)
    assert.ok(bypassAttempt1.command.expiresAt <= Date.now() + 46_000)
    assert.equal(
      hub.approvalLedger.get('mac-ttl:AP-TTL-1')?.expiresAt,
      bypassAttempt1.command.expiresAt,
    )

    // Simulate 46 seconds passing: command must be pruned and NEVER delivered to host
    hub.hosts.get('mac-ttl').commands[0].expiresAt = Date.now() - 1000
    const hbAfter = hub.handleHeartbeat({
      hostId: 'mac-ttl',
      hostName: 'Mac TTL',
      bridgeState: {
        tasks: [{ id: 'agent-ttl', title: 'TTL Test', status: 'approval', transcript: [] }],
        approvals: [{ code: 'AP-TTL-1', agentId: 'agent-ttl', toolName: 'bash' }],
        workspaces: [],
      },
    })
    assert.equal(hbAfter.commands.length, 0)
    assert.equal(hub.approvalLedger.get('mac-ttl:AP-TTL-1')?.status, 'failed')

    // 3. Server-side attachment count limit (>4 rejected with 413)
    const tooManyAtt = hub.queueCommand('mac-ttl', {
      type: 'prompt',
      agentId: 'agent-ttl',
      text: 'too many',
      attachments: [
        { name: '1.png', dataBase64: 'AAAA' },
        { name: '2.png', dataBase64: 'AAAA' },
        { name: '3.png', dataBase64: 'AAAA' },
        { name: '4.png', dataBase64: 'AAAA' },
        { name: '5.png', dataBase64: 'AAAA' },
      ],
    })
    assert.equal(tooManyAtt.ok, false)
    assert.equal(tooManyAtt.statusCode, 413)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})




