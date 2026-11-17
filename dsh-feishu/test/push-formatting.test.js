import test from 'node:test'
import assert from 'node:assert/strict'
import { HubCore } from '../../hub/hub-core.js'
import {
  extractCleanConclusionPushBody,
  extractCleanApprovalPushContent,
  formatWebPushNotification,
} from '../../hub/push-formatter.js'
import { FeishuBridge } from '../lib/bridge.js'
import { resolveConfig } from '../lib/config.js'

test('push-formatter: strips Markdown syntax, file:// paths, polite openings, and preserves trailing questions', () => {
  const rawConclusion = [
    '好的，我已经帮你把语音输入的问题全部排查并修好了：',
    '',
    '### 这次揪出来并修掉的核心问题',
    '1. **松手 0.38 秒截断**：以前在 [useVoiceInput.ts](file:///Users/cc/deepseekharness-remote/hub/web/src/hooks/useVoiceInput.ts#L1188-L1215) 里只留了 `380ms`，现已改为等 `isFinal` 定稿后立即发送。',
    '2. 全量 99 项测试全部通过。',
    '',
    '```bash',
    'npm test',
    '```',
    '',
    '要不要我现在部署到 Cloud Run？',
  ].join('\n')

  const body = extractCleanConclusionPushBody(rawConclusion, {
    cwd: '/Users/cc/deepseekharness-remote',
    maxChars: 86,
  })

  assert.doesNotMatch(body, /file:\/\//, 'Must strip 100-char file:// URLs')
  assert.doesNotMatch(body, /###|\*\*|`/, 'Must strip raw Markdown markers')
  assert.doesNotMatch(body, /好的，我已经帮你/, 'Must skip pure polite opening filler line')
  assert.doesNotMatch(body, /npm test/, 'Must omit fenced code blocks')
  assert.match(body, /useVoiceInput\.ts/, 'Should preserve clean filename')
  assert.ok(body.endsWith('要不要我现在部署到 Cloud Run？'), `Should preserve trailing CTA question, got: ${body}`)
  assert.ok(body.length <= 88, `Body must fit lock-screen banner budget, got ${body.length}: ${body}`)
})

test('push-formatter: cleans internal tool jargon, env vars, and absolute paths in approval notifications', () => {
  const app = {
    code: 'AGY-E5B8D9-42',
    agentId: 'agy-ide:e5b8d936',
    title: 'deepseekharness-remote / 语音识别修复与实测',
    project: 'deepseekharness-remote',
    cwd: '/Users/cc/deepseekharness-remote',
    toolName: 'run_command (BypassSandbox)',
    commandLine:
      'CLOUDSDK_METRICS_ENVIRONMENT=datacloud.antigravity gcloud run deploy dsh-remotecontrol-hub --project gen-lang-client-0884226164',
    reason:
      'Deploy hub to Google Cloud Run: CLOUDSDK_METRICS_ENVIRONMENT=datacloud.antigravity gcloud run deploy dsh-remotecontrol-hub --project gen-lang-client-0884226164',
  }

  // Single host: omits machine name completely
  const singlePush = formatWebPushNotification({
    kind: 'approval',
    hosts: [{ hostId: 'mac-1', hostName: 'ccdeMacBook-Air.local' }],
    hostId: 'mac-1',
    hostName: 'ccdeMacBook-Air.local',
    approval: app,
  })
  assert.equal(singlePush.title, '⏳ 需批准 · 语音识别修复与实测')
  assert.doesNotMatch(singlePush.body, /run_command|BypassSandbox|CLOUDSDK_METRICS_ENVIRONMENT|点击立即处理/)
  assert.match(singlePush.body, /^Deploy hub to Google Cloud Run：gcloud run deploy dsh-remotecontrol-hub/)
  assert.equal(singlePush.tag, 'session-agy-ide:e5b8d936')

  // Multi-host: includes compact disambiguated host prefix
  const multiPush = formatWebPushNotification({
    kind: 'completed',
    hosts: [
      { hostId: 'mac-office', hostName: '办公MacBookPro' },
      { hostId: 'mac-home', hostName: '家里MacBookPro' },
    ],
    hostId: 'mac-office',
    hostName: '办公MacBookPro',
    task: {
      id: 'agy-ide:e5b8d936',
      title: 'deepseekharness-remote / 语音识别修复与实测',
      project: 'deepseekharness-remote',
      lastOutput: '已全部修复并上线。',
    },
  })
  assert.equal(multiPush.title, '✅ 办公·MBP · 语音识别修复与实测')
  assert.equal(multiPush.body, '已全部修复并上线。')

  // Question with options: displays concise options inline
  const qPush = extractCleanApprovalPushContent({
    kind: 'question',
    toolName: 'ask_user_question',
    questions: [
      {
        question: '选择哪种语音播报方案？',
        options: [{ label: '(Recommended) 单嗓子直读' }, { label: '双语切词' }],
      },
    ],
  })
  assert.equal(qPush.badge, '💬 待你选择')
  assert.equal(qPush.body, '选择哪种语音播报方案？（单嗓子直读 / 双语切词）')
})

test('HubCore Web Push: suppresses background subagents & ephemeral jsonl-tail auto-approved flashes', async () => {
  const hub = new HubCore()
  await hub.init()

  // 1) Seed running main session + running background subagent
  hub.handleHeartbeat({
    hostId: 'mac-air',
    hostName: 'ccdeMacBook-Air.local',
    bridgeState: {
      tasks: [
        {
          id: 'agy-ide:main-1',
          harness: 'antigravity-ide',
          title: '2026-11-17-08-40-19 / 主会话重构推送',
          project: '2026-11-17-08-40-19',
          status: 'running',
          turnState: 'running',
          stateMeta: { source: 'jsonl-tail' },
          transcript: [{ role: 'user', text: '帮我重构推送' }],
        },
        {
          id: 'agy-ide:sub-99',
          harness: 'antigravity-ide',
          isSubagent: true,
          parentConversationId: 'main-1',
          title: 'Codebase Researcher',
          status: 'running',
          turnState: 'running',
          transcript: [{ role: 'user', text: 'Search files' }],
        },
      ],
      approvals: [],
    },
  })
  assert.equal(hub.pushHistory.length, 0)

  // 2) Subagent finishes -> MUST NOT trigger any Web Push!
  //    Simultaneously, an unconfirmed jsonl-tail approval flashes briefly on main-1:
  hub.handleHeartbeat({
    hostId: 'mac-air',
    hostName: 'ccdeMacBook-Air.local',
    bridgeState: {
      tasks: [
        {
          id: 'agy-ide:main-1',
          harness: 'antigravity-ide',
          title: '2026-11-17-08-40-19 / 主会话重构推送',
          project: '2026-11-17-08-40-19',
          status: 'approval',
          turnState: 'approval',
          stateMeta: { source: 'jsonl-tail' },
          transcript: [{ role: 'user', text: '帮我重构推送' }],
        },
        {
          id: 'agy-ide:sub-99',
          harness: 'antigravity-ide',
          isSubagent: true,
          parentConversationId: 'main-1',
          title: 'Codebase Researcher',
          status: 'idle',
          turnState: 'conclusion',
          lastConclusionAt: Date.now(),
          lastOutput: 'Found 12 files.',
          transcript: [{ role: 'user', text: 'Search files' }],
        },
      ],
      approvals: [
        {
          code: 'AGY-FLASH-1',
          harness: 'antigravity-ide',
          agentId: 'agy-ide:main-1',
          title: '2026-11-17-08-40-19 / 主会话重构推送',
          toolName: 'run_command (BypassSandbox)',
          commandLine: 'npm test',
          reason: 'Run tests: npm test',
        },
      ],
    },
  })
  assert.equal(hub.pushHistory.length, 0, 'Subagent completion and unconfirmed jsonl-tail flash must not push yet')

  // Computer auto-allows within 300ms (< 1500ms debounce) and task completes!
  await new Promise(r => setTimeout(r, 250))
  hub.handleHeartbeat({
    hostId: 'mac-air',
    hostName: 'ccdeMacBook-Air.local',
    bridgeState: {
      tasks: [
        {
          id: 'agy-ide:main-1',
          harness: 'antigravity-ide',
          title: '2026-11-17-08-40-19 / 主会话重构推送',
          project: '2026-11-17-08-40-19',
          status: 'idle',
          turnState: 'conclusion',
          lastStepIndex: 10,
          lastConclusionAt: Date.now(),
          lastOutput: '### 修改总结\n已完成推送降噪改造，所有测试通过。',
          transcript: [{ role: 'user', text: '帮我重构推送' }],
        },
      ],
      approvals: [],
    },
  })

  // Wait past 1600ms to prove the cancelled flash timer never fires!
  await new Promise(r => setTimeout(r, 1400))
  assert.equal(hub.pushHistory.length, 1)
  assert.equal(hub.pushHistory[0].title, '✅ 主会话重构推送')
  assert.equal(hub.pushHistory[0].body, '已完成推送降噪改造，所有测试通过。')
  assert.equal(hub.pushHistory[0].tag, 'session-agy-ide:main-1')
})

test('FeishuBridge push cards: suppresses subagents, exposes visible conclusion summary above >450-char collapsible panel, and cleans approval jargon', async () => {
  const sentCards = []
  const mainAgent = {
    id: 'session-main-feishu',
    status: 'running',
    session: {
      header: { cwd: '/Users/cc/deepseekharness-remote' },
      log: [
        {
          type: 'session/title',
          time: Date.now(),
          data: { title: 'deepseekharness-remote / 推送卡片精简' },
        },
      ],
      deriveMessages() {
        return this._messages ?? []
      },
    },
  }
  const subAgent = {
    id: 'session-sub-feishu',
    isSubagent: true,
    status: 'running',
    session: {
      header: { cwd: '/Users/cc/deepseekharness-remote', origin: 'subagent' },
      log: [{ type: 'session/title', time: Date.now(), data: { title: '内部子代理' } }],
      deriveMessages: () => [{ role: 'assistant', content: [{ type: 'text', text: 'subagent done' }] }],
    },
  }

  const bridge = new FeishuBridge({
    config: resolveConfig({
      appId: 'cli_test123',
      allowedOpenIds: ['ou_1'],
      dshHome: '',
      auditFile: '',
      controlChatFile: '',
      remoteStateFile: '',
    }),
    agents: {
      list: () => [mainAgent, subAgent],
      get: id => (id === mainAgent.id ? mainAgent : id === subAgent.id ? subAgent : undefined),
    },
    transport: {
      async sendText() {},
      async sendCard(chatId, card) {
        sentCards.push({ chatId, card })
        return { data: { message_id: `msg-${sentCards.length}` } }
      },
      async updateCard() {
        return { code: 0 }
      },
    },
  })

  try {
    await bridge.connectRemote('oc_chat_1', 'ou_1')
    const baseCount = sentCards.length

    await bridge.pollAgents()
    // Subagent finishes -> must be ignored
    subAgent.status = 'idle'
    // Main agent finishes with a >500-char reply containing file:// links and Markdown noise
    mainAgent.session._messages = [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text:
              '好的，我已经全部排查完毕：\n\n### 改造说明\n已修改 [hub-core.js](file:///Users/cc/deepseekharness-remote/hub/hub-core.js#L1120) 与 [bridge.js](file:///Users/cc/deepseekharness-remote/dsh-feishu/lib/bridge.js#L1250)，彻底去掉无用套话。\n\n' +
              '详细变更记录补充说明。'.repeat(55) +
              '\n\n需要我现在上线吗？',
          },
        ],
      },
    ]
    mainAgent.status = 'idle'
    await bridge.pollAgents()
    await bridge.flushDigest()

    const newCards = sentCards.slice(baseCount)
    assert.equal(newCards.length, 1, 'Only main agent should push a Feishu card; subagent must be suppressed')
    const card = newCards[0].card
    assert.equal(card.header.title.content, '✅ 已完成 · 推送卡片精简')

    const topDivs = card.elements.filter(el => el.tag === 'div').map(el => el.text.content)
    assert.equal(topDivs.length, 1, 'Should show 1 crisp visible summary div without redundant **✅ 已完成** / **输出内容** labels')
    assert.doesNotMatch(topDivs[0], /file:\/\//)
    assert.match(topDivs[0], /hub-core\.js/)
    assert.match(topDivs[0], /需要我现在上线吗？/)

    const collapse = card.elements.find(el => el.tag === 'collapsible_panel')
    assert.ok(collapse, 'Full >450-char text should still be accessible in collapsible_panel below summary')
    assert.doesNotMatch(JSON.stringify(collapse), /file:\/\//, 'Dead local file:// links in Feishu full panel should be converted to inline code')

    // Check approvalCard formatting
    const appCard = bridge.approvalCard(
      { code: 'ABC123', toolName: 'run_command (BypassSandbox)' },
      {
        agent: mainAgent,
        commandLine: 'CLOUDSDK_METRICS_ENVIRONMENT=datacloud.antigravity gcloud run deploy dsh-remotecontrol-hub',
        reason: 'Deploy hub: CLOUDSDK_METRICS_ENVIRONMENT=datacloud.antigravity gcloud run deploy dsh-remotecontrol-hub',
      },
    )
    const appSerialized = JSON.stringify(appCard)
    assert.match(appSerialized, /终端命令 · deepseekharness-remote/)
    assert.doesNotMatch(appSerialized, /BypassSandbox|CLOUDSDK_METRICS_ENVIRONMENT|\*\*原因\*\*/)
    assert.match(appSerialized, /Deploy hub：gcloud run deploy dsh-remotecontrol-hub/)
  } finally {
    await bridge.dispose()
  }
})
