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
      header: { cwd: '/Users/cc/workspace' },
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
