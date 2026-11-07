import { randomInt } from 'node:crypto'
import { chmod, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, extname, resolve, sep } from 'node:path'
import { parseCommand, splitFirstArg } from './commands.js'
import { cleanForChat, safeError } from './redact.js'
import {
  createNewAgentSession,
  deleteAgentSession,
  extractSessionTranscript,
  listWorkspaceFiles,
  readWorkspaceFile,
  renameAgentSession,
} from './workspace-ops.js'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export class FeishuBridge {
  constructor({ config, agents, transport, audit, logger, initialControlChat = '', initialRemoteState = null, now = () => Date.now() }) {
    this.config = config
    this.agents = agents
    this.transport = transport
    this.audit = audit
    this.logger = logger
    this.now = now
    this.bindings = new Map()
    this.agentBindings = new Map()
    this.pending = new Map()
    this.seen = new Set()
    this.seenOrder = []
    this.promptChains = new Map()
    this.deniedAt = new Map()
    this.userHits = new Map()
    this.controlChatId = initialControlChat || null
    this.choices = new Map()
    this.agentWatch = new Map()
    this.bridgeBusy = new Map()
    this.notifiedApprovals = new Map()
    this.notifyTimer = null
    this.digestTimer = null
    this.digestFlushing = false
    this.notifyQueue = []
    this.taskCards = new Map()
    this.cardActionSeen = new Map()
    this.recentCompletions = new Map()
    this.sentVideos = new Set()
    this.notifying = false
    this.disposed = false
    this.remoteTimer = null
    this.hubAgent = null
    this.feishuStandby = false
    this.steerQueues = new Map()
    this.remote = {
      active: initialRemoteState?.active === true,
      lastActivity: Number(initialRemoteState?.lastActivity) || 0,
      completed: Array.isArray(initialRemoteState?.completed) ? initialRemoteState.completed.slice(-50) : [],
    }
  }

  setHubAgent(hubAgent) {
    this.hubAgent = hubAgent
  }

  async handleEvent(data) {
    if (this.disposed) return
    const eventId = this.eventId(data)
    if (this.config.debugEvents) {
      await this.audit?.write('event_received', {
        eventId,
        appId: data?.app_id,
        chatType: data?.message?.chat_type,
        messageType: data?.message?.message_type,
        senderType: data?.sender?.sender_type,
      })
    }
    if (!this.markSeen(eventId)) return

    const appId = data?.app_id
    if (this.config.appId && appId && appId !== this.config.appId) {
      this.logger?.warn?.('dsh-feishu: ignored event from a different app_id')
      return
    }
    if (this.config.tenantKey && data?.tenant_key && data.tenant_key !== this.config.tenantKey) {
      this.logger?.warn?.('dsh-feishu: ignored event from a different tenant')
      return
    }

    const sender = data?.sender ?? {}
    const openId = sender?.sender_id?.open_id
    if (!openId || sender?.sender_type === 'app' || sender?.sender_type === 'bot') return

    const message = data?.message ?? {}
    const chatId = message.chat_id
    const chatType = message.chat_type
    if (!chatId || !message.message_id) return
    if (chatType !== 'p2p' && !this.config.allowGroup) return

    const text = extractText(message)
    if (text === undefined) {
      if (chatType === 'p2p' && this.isAllowed(openId)) {
        await this.safeSend(chatId, '目前只支持文本消息。')
      }
      return
    }

    const cleanText = stripMentions(text, message.mentions)
    const command = parseCommand(cleanText)
    if (command.kind === 'command' && command.name === 'whoami') {
      await this.audit?.write('whoami', { eventId, openId, chatId })
      await this.safeSend(chatId, `你的 open_id：${openId}\n把它加入 allowedOpenIds 后重启 dsh web。`)
      return
    }

    if (!this.isAllowed(openId)) {
      await this.audit?.write('denied_user', { eventId, openId, chatId })
      await this.maybeTellDenied(chatId, openId)
      return
    }

    if (chatType !== 'p2p') {
      const mentions = Array.isArray(message.mentions) ? message.mentions : []
      if (mentions.length === 0) return
    }

    if (!this.allowRate(openId)) {
      await this.audit?.write('rate_limited', { eventId, openId, chatId })
      return
    }

    await this.handleText({ chatId, openId, text: cleanText, messageId: message.message_id, eventId })
  }

  isRemoteActive() {
    if (!this.remote.active) return false
    return this.now() - this.remote.lastActivity < this.config.remoteIdleMs
  }

  async saveRemoteState() {
    const path = this.config.remoteStateFile
    if (!path) return
    try {
      await writeFile(path, JSON.stringify({
        active: this.remote.active,
        lastActivity: this.remote.lastActivity,
        completed: this.remote.completed.slice(-50),
      }), { mode: 0o600 })
      await chmod(path, 0o600)
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: could not persist remote state: ${safeError(error)}`)
    }
  }

  touchRemote() {
    if (!this.remote.active) return
    this.remote.lastActivity = this.now()
    void this.saveRemoteState()
  }

  async checkRemoteExpiry() {
    if (this.disposed || !this.remote.active) return
    if (this.now() - this.remote.lastActivity < this.config.remoteIdleMs) return
    this.remote.active = false
    await this.saveRemoteState()
    if (this.controlChatId) {
      await this.safeSend(this.controlChatId, '远程模式已自动断开（2 小时无操作）。\n完成不再推送；审批仍会提醒。下次发「连接」继续。')
    }
  }

  async connectRemote(chatId, openId) {
    this.controlChatId = chatId
    void this.saveControlChat(chatId)
    const wasActive = this.isRemoteActive()
    this.remote.active = true
    this.remote.lastActivity = this.now()
    await this.saveRemoteState()
    await this.audit?.write('remote_connect', { chatId, openId, wasActive })
    const queued = this.remote.completed.slice()
    const ok = await this.safeSendCard(chatId, this.connectCard(chatId, queued), this.connectText(chatId, queued))
    if (ok) {
      this.remote.completed = this.remote.completed.filter(item => !queued.includes(item))
      for (const entry of this.recentCompletions.values()) entry.inboxSeen = this.now()
      await this.saveRemoteState()
    }
  }

  async disconnectRemote(chatId, openId) {
    this.remote.active = false
    await this.saveRemoteState()
    await this.audit?.write('remote_disconnect', { chatId, openId })
    await this.safeSend(chatId, '已断开远程模式。\n完成不再推送；审批仍会提醒。下次发「连接」继续。')
  }

  connectText(chatId, queued = []) {
    const { live } = this.collectTasks(false)
    const running = live.filter(agent => agent.status === 'running').length
    const lines = [`已连接 · ${running} 个任务正在运行`]
    for (const [index, agent] of live.slice(0, 10).entries()) {
      lines.push(`${index + 1}. ${statusLabel(agent.status)} ${this.taskTitle(agent)}`)
    }
    if (queued.length > 0) {
      const failed = queued.filter(item => item.kind !== 'completed').length
      const completed = queued.length - failed
      lines.push('', `你离开期间：${completed} 个完成${failed > 0 ? `，${failed} 个异常` : ''}。`)
    }
    lines.push('', '点任务「查看详情」；运行中的只能停止，完成后的详情里可以直接输入继续。')
    return lines.join('\n')
  }

  needsElements(chatId, queued = []) {
    const elements = []
    const now = this.now()
    const approvals = [...this.pending.values()]
      .filter(entry => !entry.settled && entry.chatId === chatId)
      .filter(entry => now - entry.createdAt <= this.config.approvalTtlSeconds * 1000)
      .slice(-2)
    const recent = [...this.recentCompletions.values()]
      .filter(entry => now - entry.at < 30 * 60_000)
      .filter(entry => !entry.inboxSeen)
      .sort((a, b) => b.at - a.at)
    const queuedFailures = [...queued].reverse()
      .filter(entry => entry.kind !== 'completed')
      .slice(0, 2)
      .map(entry => ({ ...entry, inboxSeen: 0 }))
    const failures = [...queuedFailures, ...recent.filter(entry => entry.kind !== 'completed')].slice(0, 2)
    const completed = [...queued].reverse()
      .filter(entry => entry.kind === 'completed')
      .slice(0, 3)
      .map(entry => ({ ...entry, inboxSeen: 0 }))
    const seen = new Set(completed.map(entry => entry.agentId))
    for (const entry of recent.filter(item => item.kind === 'completed').slice(0, 3)) {
      if (!seen.has(entry.agentId)) {
        completed.push(entry)
        seen.add(entry.agentId)
      }
    }
    if (approvals.length === 0 && failures.length === 0 && completed.length === 0) return elements
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: '**需要你**' } })
    if (approvals.length > 0) {
      elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**待审批 ${approvals.length}**` } })
      for (const entry of approvals) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `⏳ **${escapeCard(entry.title || this.taskTitle(this.agents.get(entry.agentId)))}**\n${escapeCard(entry.toolName)} · ${escapeCard(cleanForChat(entry.reason || '未提供原因', 160))}`,
          },
        })
        elements.push({
          tag: 'action',
          actions: [
            cardButton('批准一次', 'primary', { action: 'approve', code: entry.code }),
            cardButton('拒绝', 'danger', { action: 'deny', code: entry.code }),
          ],
        })
      }
    }
    if (failures.length > 0) {
      elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**异常 ${failures.length}**` } })
      for (const entry of failures) {
        elements.push({ tag: 'div', text: { tag: 'lark_md', content: `⚠️ **${escapeCard(entry.title)}**\n${escapeCard(entry.status || 'failed')}` } })
        elements.push({ tag: 'action', actions: [cardButton('查看详情', 'default', { action: 'view', id: entry.agentId })] })
      }
    }
    if (completed.length > 0) {
      elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**刚完成 ${completed.length}**` } })
      for (const entry of completed.slice(0, 3)) {
        const summary = entry.summary || (this.agents.get(entry.agentId) ? summarize(this.lastAssistantText(this.agents.get(entry.agentId))) : '')
        elements.push({
          tag: 'div',
          text: { tag: 'lark_md', content: `✅ **${escapeCard(entry.title)}**${summary ? `\n${escapeCard(summary)}` : ''}` },
        })
        elements.push({ tag: 'action', actions: [cardButton('继续', 'default', { action: 'view', id: entry.agentId })] })
      }
    }
    elements.push({ tag: 'hr' })
    return elements
  }

  connectCard(chatId, queued = []) {
    const card = this.sessionsCard(chatId, false, 0)
    const { live } = this.collectTasks(false)
    const running = live.filter(agent => agent.status === 'running').length
    const intro = [`远程模式已开启（2 小时内有效）`, `${running} 个任务正在运行`]
    if (queued.length > 0) {
      const failed = queued.filter(item => item.kind !== 'completed').length
      const completed = queued.length - failed
      intro.push(`离开期间 ${completed} 个完成${failed > 0 ? ` · ${failed} 个异常` : ''}`)
    }
    card.header.title.content = '已连接 · 远程模式'
    card.elements.unshift({ tag: 'note', elements: [{ tag: 'plain_text', content: intro.join(' · ') }] })
    const needs = this.needsElements(chatId, queued)
    if (needs.length > 0) card.elements.splice(1, 0, ...needs)
    card.elements.push({ tag: 'action', actions: [cardButton('断开远程', 'default', { action: 'disconnect' })] })
    return card
  }

  /** Watch all live agents and push completion/error notifications. */
  startNotifier() {
    if (this.notifyTimer || this.disposed || !this.config.notify) return
    this.notifyTimer = setInterval(() => {
      void this.pollAgents()
    }, this.config.notifyIntervalMs)
    this.notifyTimer.unref?.()
    if (!this.remoteTimer) {
      this.remoteTimer = setInterval(() => { void this.checkRemoteExpiry() }, 60_000)
      this.remoteTimer.unref?.()
    }
    void this.pollAgents()
  }

  stopNotifier() {
    if (!this.notifyTimer) return
    clearInterval(this.notifyTimer)
    this.notifyTimer = null
    if (this.remoteTimer) {
      clearInterval(this.remoteTimer)
      this.remoteTimer = null
    }
  }

  async pollAgents() {
    if (this.disposed || this.notifying || !this.config.notify) return
    this.notifying = true
    try {
      const live = this.agents.list()
      const liveIds = new Set(live.map(agent => agent.id))
      for (const id of this.agentWatch.keys()) {
        if (!liveIds.has(id)) this.agentWatch.delete(id)
      }
      for (const agent of live) {
        const status = String(agent.status ?? 'unknown')
        const previous = this.agentWatch.get(agent.id)
        if (!previous) {
          this.agentWatch.set(agent.id, { status })
          continue
        }
        if (previous.status === status) continue
        const wasRunning = previous.status === 'running'
        this.agentWatch.set(agent.id, { status })
        if (status === 'running' && !wasRunning && this.controlChatId) {
          // If a detail card is already open, turn its input into the running state
          // immediately instead of leaving a form that the handler would reject.
          await this.quietUpdateTaskCard(this.controlChatId, agent, this.detailCard(agent))
        }
        if (status === 'idle' && wasRunning) {
          if (this.drainSteerQueue(agent)) continue
          // A prompt sent through this bridge already returns its own reply.
          if (this.bridgeBusy.has(agent.id)) continue
          if (this.isRemoteActive()) this.queueNotification(agent, 'completed')
          else this.queueCompletion(agent, 'completed')
        } else if ((status === 'error' || status === 'failed') && previous.status !== status) {
          if (this.isRemoteActive()) this.queueNotification(agent, 'failed', status)
          else this.queueCompletion(agent, status)
        }
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: notification poll failed: ${safeError(error)}`)
    } finally {
      this.notifying = false
    }
  }

  queueNotification(agent, kind = 'completed', status = '') {
    const existing = this.notifyQueue.find(item => item.agent.id === agent.id)
    const entry = {
      agent,
      kind,
      status,
      at: this.now(),
      title: this.taskTitle(agent),
      summary: kind === 'completed' ? summarize(this.lastAssistantText(agent)) : '',
    }
    if (existing) Object.assign(existing, entry)
    else this.notifyQueue.push(entry)
    const previousRecent = this.recentCompletions.get(agent.id)
    this.recentCompletions.set(agent.id, { ...entry, agent: undefined, inboxSeen: previousRecent?.inboxSeen ?? 0 })
    while (this.recentCompletions.size > 20) {
      this.recentCompletions.delete(this.recentCompletions.keys().next().value)
    }
    this.scheduleDigest()
  }

  scheduleDigest() {
    if (this.digestTimer || this.disposed) return
    this.digestTimer = setTimeout(() => {
      this.digestTimer = null
      void this.flushDigest()
    }, this.config.notifyDigestMs)
    this.digestTimer.unref?.()
  }

  async flushDigest() {
    if (this.disposed || this.digestFlushing) return
    if (this.digestTimer) {
      clearTimeout(this.digestTimer)
      this.digestTimer = null
    }
    const entries = this.notifyQueue.splice(0)
    if (entries.length === 0) return
    if (!this.isRemoteActive()) {
      for (const entry of entries) this.queueCompletion(entry.agent, entry.kind)
      return
    }
    this.digestFlushing = true
    try {
      // Each completion is pushed as its own full task card (with an input form).
      // A merged digest cannot offer unambiguous controls for several tasks, so it
      // is intentionally not used for completion/failure pushes.
      for (const entry of entries) {
        if (entry.kind === 'failed') await this.notifyFailure(entry.agent, entry.status || 'failed')
        else await this.notifyCompletion(entry.agent)
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: digest failed: ${safeError(error)}`)
    } finally {
      this.digestFlushing = false
      if (this.notifyQueue.length > 0) this.scheduleDigest()
    }
  }

  async sendDigest(entries) {
    const chatId = this.controlChatId
    if (!chatId) return
    const completed = entries.filter(item => item.kind !== 'failed').length
    const failed = entries.length - completed
    const card = this.digestCard(entries)
    const text = [
      failed > 0 ? `⚠️ ${completed} 个完成 · ${failed} 个异常` : `✅ ${entries.length} 个任务完成`,
      ...entries.map(item => `- ${item.title}${item.summary ? `：${item.summary}` : ''}`),
    ].join('\n')
    await this.safeSendCard(chatId, card, text)
    for (const entry of entries) {
      await this.quietUpdateTaskCard(chatId, entry.agent, this.detailCard(entry.agent))
    }
    await this.audit?.write('notification', {
      kind: 'digest',
      chatId,
      agents: entries.map(item => item.agent.id),
      completed,
      failed,
    })
  }

  queueCompletion(agent, kind = 'completed') {
    const entry = {
      agentId: agent.id,
      title: this.taskTitle(agent),
      kind,
      status: kind === 'completed' ? '' : kind,
      at: this.now(),
    }
    const recent = this.remote.completed.at(-1)
    if (recent?.agentId === entry.agentId && this.now() - recent.at < 60_000) return
    this.remote.completed.push(entry)
    if (this.remote.completed.length > 50) this.remote.completed.shift()
    void this.saveRemoteState()
    void this.audit?.write('notification_queued', { kind, agentId: agent.id })
  }

  async saveControlChat(chatId) {
    const path = this.config.controlChatFile
    if (!path) return
    try {
      await writeFile(path, `${chatId}\n`, { mode: 0o600 })
      await chmod(path, 0o600)
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: could not persist control chat: ${safeError(error)}`)
    }
  }

  async notifyCompletion(agent) {
    const chatId = this.controlChatId
    if (!chatId) return
    const ok = await this.sendNewTaskCard(chatId, agent, 'completed')
    await this.audit?.write('notification', { kind: 'completed', agentId: agent.id, chatId, ok })
  }

  async notifyFailure(agent, status) {
    const chatId = this.controlChatId
    if (!chatId) return
    const ok = await this.sendNewTaskCard(chatId, agent, 'failed', { status })
    await this.audit?.write('notification', { kind: 'failed', agentId: agent.id, chatId, status, ok })
  }

  async notifyApproval(request, chatId) {
    if (this.disposed) return
    const agentId = request?.agent?.id ?? 'unknown'
    const key = request?.callId || `${agentId}:${request?.toolName ?? 'unknown'}`
    const now = this.now()
    for (const [oldKey, ts] of this.notifiedApprovals) {
      if (now - ts > 10 * 60_000) this.notifiedApprovals.delete(oldKey)
    }
    if (this.notifiedApprovals.has(key)) return
    this.notifiedApprovals.set(key, now)
    const reason = reasonText(request?.displayReason || request?.reason) || '未提供原因'
    const title = this.taskTitle(request?.agent)
    const lines = [
      `⚠️ 任务在等审批：${title}`,
      `项目：${projectName(cwdOf(request?.agent))} · ${shortId(agentId)}`,
      `工具：${request?.toolName ?? 'unknown'}`,
      `原因：${cleanForChat(reason, 500)}`,
      '',
      `远程模式未开启，审批在 Web 处理；发「连接」后新的审批才会发到这里。`,
    ]
    await this.safeSendCard(chatId, this.unboundApprovalCard(request), lines.join('\n'))
    await this.audit?.write('notification', { kind: 'approval', agentId, chatId, toolName: request?.toolName })
  }

  eventId(data) {
    return (
      data?.event_id ||
      data?.uuid ||
      `${data?.message?.chat_id ?? ''}:${data?.message?.message_id ?? ''}`
    )
  }

  markSeen(id) {
    if (!id || this.seen.has(id)) return false
    this.seen.add(id)
    this.seenOrder.push(id)
    while (this.seenOrder.length > this.config.dedupeLimit) {
      this.seen.delete(this.seenOrder.shift())
    }
    return true
  }

  isAllowed(openId) {
    return this.config.allowedOpenIds.includes(openId)
  }

  allowRate(openId) {
    const now = this.now()
    const windowStart = now - 60_000
    const hits = (this.userHits.get(openId) ?? []).filter(time => time > windowStart)
    if (hits.length >= 20) {
      this.userHits.set(openId, hits)
      return false
    }
    hits.push(now)
    this.userHits.set(openId, hits)
    return true
  }

  async maybeTellDenied(chatId, openId) {
    const last = this.deniedAt.get(openId) ?? 0
    if (this.now() - last < 10 * 60_000) return
    this.deniedAt.set(openId, this.now())
    await this.safeSend(chatId, '无权限。发送 /whoami 查看你的 open_id，交给管理员加入白名单。')
  }

  async handleText({ chatId, openId, text, messageId, eventId }) {
    // The most recent chat that successfully reached the bridge is the
    // remote-control chat. Notifications go there even when no session is
    // bound, so a user can watch every live task from one place.
    if (this.controlChatId !== chatId) {
      this.controlChatId = chatId
      void this.saveControlChat(chatId)
    }
    this.touchRemote()
    const keyword = String(text).trim().replace(/^[!/]+/, '').toLowerCase()
    if (['连接', '远程', 'connect'].includes(keyword)) {
      await this.connectRemote(chatId, openId)
      return
    }
    if (['断开', '结束远程', 'disconnect'].includes(keyword)) {
      await this.disconnectRemote(chatId, openId)
      return
    }
    if (['主机', '电脑', '切换主机', '切换电脑'].includes(keyword)) {
      await this.sendHosts(chatId)
      return
    }
    const command = parseCommand(text)
    if (command.kind === 'unknown') {
      await this.safeSend(chatId, `未知命令 /${command.name}。发送 /help 查看可用命令。`)
      return
    }
    if (command.kind === 'command') {
      await this.handleCommand({ chatId, openId, command, eventId })
      return
    }
    if (command.text.length === 0) return
    if (command.text.length > 8000) {
      await this.safeSend(chatId, '消息太长（上限 8000 字符），请拆分成多条。')
      return
    }
    if (!this.isRemoteActive()) {
      await this.safeSend(chatId, '先发「连接」进入远程模式。\n现在也可以发 !sessions 查看任务，点详情查看。')
      return
    }
    await this.safeSend(chatId, '点开任务详情，在输入框里发指令。\n发 !sessions 看任务列表。')
  }

  async handleCommand({ chatId, openId, command, eventId }) {
    const { name, args } = command
    await this.audit?.write('command', { eventId, openId, chatId, command: name })
    switch (name) {
      case 'help':
        await this.safeSendCard(chatId, this.helpCard(), HELP)
        return
      case 'sessions': {
        const showAll = splitFirstArg(args).trim().toLowerCase() === 'all'
        await this.sendSessions(chatId, showAll)
        return
      }
      case 'use':
        await this.safeSend(chatId, '不用先选任务。点列表里的「查看详情」，运行中的只能停止，完成后的详情里可以直接输入继续。')
        return
      case 'status':
        await this.sendSessions(chatId)
        return
      case 'stop':
        await this.safeSend(chatId, '请在任务详情里点「停止执行」；这里不猜你要停哪个任务。')
        return
      case 'approve':
      case 'deny':
        await this.resolveApproval({ chatId, openId, code: splitFirstArg(args).toUpperCase(), decision: name === 'approve' ? 'allowed-once' : 'rejected', eventId })
        return
      case 'new': {
        const promptText = String(args ?? '').trim()
        if (!promptText) {
          await this.safeSend(chatId, '请在 Web 里新建会话；也可以直接发送 !new <任务指令> 在当前电脑新建会话。')
          return
        }
        const { live } = this.collectTasks(true)
        const defaultCwd = cwdOf(live[0]) || process.cwd()
        const created = await createNewAgentSession(this.agents, {
          cwd: defaultCwd,
          title: promptText.slice(0, 36),
        })
        if (!created) {
          await this.safeSend(chatId, '当前 DSH 环境暂不支持直接创建会话，请在 Web 界面新建。')
          return
        }
        await this.safeSend(chatId, `✨ 已新建会话：${this.taskTitle(created)} (${shortId(created.id)})\n工作区：${defaultCwd}`)
        void this.enqueuePrompt(chatId, () =>
          this.runPromptForAgent({
            chatId,
            openId,
            agent: created,
            text: promptText,
            messageId: `feishu-new-${Date.now()}`,
            eventId: eventId || `feishu-new-${Date.now()}`,
          }),
        )
        return
      }
      case 'steer': {
        const steerText = String(args ?? '').trim()
        if (!steerText) {
          await this.safeSend(chatId, '用法：!steer <插话指令> — 向正在运行（或最近活跃）的任务追加指令。')
          return
        }
        const { live } = this.collectTasks(false)
        const targetAgent = live.find(a => a.status === 'running') || this.resolveAgent(chatId) || live[0]
        if (!targetAgent) {
          await this.safeSend(chatId, '当前没有可插话的任务会话。')
          return
        }
        const res = await this.steerTask(targetAgent, steerText, { interrupt: false, chatId, openId })
        await this.safeSend(chatId, res.message)
        return
      }
      case 'files': {
        const subDir = String(args ?? '').trim()
        const { live } = this.collectTasks(true)
        const targetAgent = this.resolveAgent(chatId) || live[0]
        const rootCwd = cwdOf(targetAgent) || process.cwd()
        const listing = await listWorkspaceFiles(rootCwd, subDir)
        if (!listing.ok) {
          await this.safeSend(chatId, `无法读取目录：${listing.error}`)
          return
        }
        const lines = [
          `📂 工作区文件 (${listing.rootCwd}${listing.subDir ? `/${listing.subDir}` : ''})：`,
          ...listing.entries.slice(0, 30).map(item =>
            item.isDirectory ? `📁 ${item.name}/` : `📄 ${item.name} (${item.size} B)`,
          ),
        ]
        if (listing.entries.length === 0) lines.push('（空目录）')
        await this.safeSend(chatId, lines.join('\n'))
        return
      }
      case 'share': {
        const { live } = this.collectTasks(true)
        const targetAgent = this.resolveAgent(chatId) || live[0]
        if (!targetAgent) {
          await this.safeSend(chatId, '当前没有可分享的会话。')
          return
        }
        if (!this.hubAgent || typeof this.hubAgent.createEncryptedShare !== 'function') {
          await this.safeSend(chatId, '请先配置 Web 总控中心（FEISHU_HUB_URL 或 FEISHU_WEB_PORT）以生成端到端加密分享链接。')
          return
        }
        const shared = await this.hubAgent.createEncryptedShare(targetAgent)
        if (!shared.ok) {
          await this.safeSend(chatId, `生成加密分享链接失败：${shared.error}`)
          return
        }
        await this.safeSend(
          chatId,
          `🔒 已生成端到端加密（AES-256-GCM）会话回放链接：\n${shared.shareUrl}\n（解密密钥仅保存在 URL #k= 锚点中，服务端无法解密）`,
        )
        return
      }
      case 'whoami':
        await this.safeSend(chatId, `你的 open_id：${openId}`)
        return
      case 'ping':
        await this.safeSend(chatId, `pong（主机: ${this.config.hostName || 'local'} · live agents: ${this.agents.list().length}）`)
        return
      case 'hosts':
        await this.sendHosts(chatId)
        return
      case 'host': {
        const target = splitFirstArg(args).trim()
        if (!target) {
          await this.sendHosts(chatId)
        } else {
          await this.switchHostFromFeishu(chatId, openId, target)
        }
        return
      }
      case 'web': {
        const url = this.hubAgent?.getPublicWebUrl?.() || this.config.hubUrl || (this.config.localWebPort ? `http://127.0.0.1:${this.config.localWebPort}` : '')
        if (url) {
          await this.safeSend(chatId, `🌐 Web 页面控制中心：${url}\n当前飞书绑定主机：${this.config.hostName} (${this.config.hostId})`)
        } else {
          await this.safeSend(chatId, `当前主机：${this.config.hostName} (${this.config.hostId})\n暂未配置 Web 控制中心地址（可在 ~/.dsh/feishu.env 设置 FEISHU_HUB_URL 或 FEISHU_WEB_PORT）。`)
        }
        return
      }
      default:
        await this.safeSend(chatId, '未知命令。发送 /help。')
    }
  }

  drainSteerQueue(agent) {
    const queue = this.steerQueues.get(agent?.id)
    if (!Array.isArray(queue) || queue.length === 0) return false
    const nextText = queue.shift()
    if (queue.length === 0) this.steerQueues.delete(agent.id)
    const chatId = this.controlChatId || ''
    void this.enqueuePrompt(agent?.id || chatId || 'steer-queue', () =>
      this.runPromptForAgent({
        chatId,
        openId: 'steer-queue',
        agent,
        text: nextText,
        messageId: `steer-${Date.now()}`,
        eventId: `steer-${Date.now()}`,
      }),
    )
    return true
  }

  async steerTask(agent, text, { interrupt = false, chatId = '', openId = 'web-admin' } = {}) {
    if (!agent) return { ok: false, error: '找不到该任务会话' }
    const clean = String(text ?? '').trim()
    if (!clean) return { ok: false, error: '插话内容不能为空' }

    if (agent.status === 'running') {
      if (interrupt && typeof agent.cancel === 'function') {
        try {
          await agent.cancel({ kind: 'user' })
        } catch {
          // ignore cancel error
        }
        if (agent.status === 'running') {
          const list = this.steerQueues.get(agent.id) ?? []
          list.push(clean)
          this.steerQueues.set(agent.id, list)
          return {
            ok: true,
            mode: 'interrupt-queued',
            queuedCount: list.length,
            message: `⚡ 已请求打断「${this.taskTitle(agent)}」并排入新指令（停止后立即执行）`,
          }
        }
      } else if (typeof agent.steer === 'function') {
        agent.steer({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'user',
          content: [{ type: 'text', text: clean }],
          source: { kind: 'user' },
        })
        return {
          ok: true,
          mode: 'native-steer',
          message: `⚡ 已向运行中任务「${this.taskTitle(agent)}」实时注入指令`,
        }
      } else {
        const list = this.steerQueues.get(agent.id) ?? []
        list.push(clean)
        this.steerQueues.set(agent.id, list)
        return {
          ok: true,
          mode: 'queued-steer',
          queuedCount: list.length,
          message: `⚡ 已将插话指令加入「${this.taskTitle(agent)}」队列（当前步骤完成后自动接续执行，队列 ${list.length} 条）`,
        }
      }
    }

    const targetChat = chatId || this.controlChatId || ''
    if (targetChat) {
      await this.sendDetail(targetChat, agent, { phase: 'accepted' })
    }
    void this.enqueuePrompt(agent?.id || targetChat || 'web-console', () =>
      this.runPromptForAgent({
        chatId: targetChat,
        openId,
        agent,
        text: clean,
        messageId: `steer-${Date.now()}`,
        eventId: `steer-${Date.now()}`,
      }),
    )
    return {
      ok: true,
      mode: 'immediate',
      message: `🚀 已向任务「${this.taskTitle(agent)}」发送指令`,
    }
  }

  enqueuePrompt(chatId, task) {
    const previous = this.promptChains.get(chatId) ?? Promise.resolve()
    const next = previous.then(task, task).finally(() => {
      if (this.promptChains.get(chatId) === next) this.promptChains.delete(chatId)
    })
    this.promptChains.set(chatId, next)
    return next
  }

  async runPromptForAgent({ chatId, openId, agent, text, messageId, eventId }) {
    await this.audit?.write('prompt', {
      eventId,
      openId,
      chatId,
      agentId: agent.id,
      messageId,
      chars: text.length,
    })
    let before = 0
    try {
      before = agent.session?.deriveMessages?.().length ?? 0
    } catch {
      before = 0
    }
    this.bridgeBusy.set(agent.id, (this.bridgeBusy.get(agent.id) ?? 0) + 1)
    try {
      agent.followup({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      })
      await agent.whenIdle()
      const reply = this.lastAssistantText(agent, before)
      if (chatId) {
        if (reply) {
          await this.sendDetail(chatId, agent)
        } else {
          await this.safeSend(chatId, '执行结束，但没有可展示的输出。')
          await this.sendDetail(chatId, agent)
        }
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: prompt failed: ${safeError(error)}`)
      if (chatId) {
        await this.safeSend(chatId, `执行失败：${safeError(error)}`)
        await this.sendDetail(chatId, agent)
      }
    } finally {
      const remaining = (this.bridgeBusy.get(agent.id) ?? 1) - 1
      if (remaining > 0) this.bridgeBusy.set(agent.id, remaining)
      else this.bridgeBusy.delete(agent.id)
      if (agent.status === 'idle') {
        this.drainSteerQueue(agent)
      }
    }
  }

  async runPrompt({ chatId, openId, text, messageId, eventId }) {
    const agent = this.resolveAgent(chatId)
    if (!agent) {
      await this.safeSend(chatId, '当前聊天还没有绑定会话。发送 /sessions 选择，或 /use <id>。')
      return
    }
    await this.audit?.write('prompt', {
      eventId,
      openId,
      chatId,
      agentId: agent.id,
      messageId,
      chars: text.length,
    })
    await this.safeSend(chatId, `已收到，发给 ${agent.id}。完成后我会把结果发在这里。`)
    let before = 0
    try {
      before = agent.session?.deriveMessages?.().length ?? 0
    } catch {
      before = 0
    }
    this.bridgeBusy.set(agent.id, (this.bridgeBusy.get(agent.id) ?? 0) + 1)
    try {
      agent.followup({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      })
      await agent.whenIdle()
      const reply = this.lastAssistantText(agent, before)
      if (reply) {
        await this.safeSendCard(chatId, this.completionCard(agent), reply)
      } else {
        await this.safeSend(chatId, `执行结束，但没有可展示的 assistant 文本。用 !status 查看 ${shortId(agent.id)} 的状态。`)
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: prompt failed: ${safeError(error)}`)
      await this.safeSend(chatId, `执行失败：${safeError(error)}`)
    } finally {
      const remaining = (this.bridgeBusy.get(agent.id) ?? 1) - 1
      if (remaining > 0) this.bridgeBusy.set(agent.id, remaining)
      else this.bridgeBusy.delete(agent.id)
    }
  }

  resolveAgent(chatId) {
    const binding = this.bindings.get(chatId)
    if (binding) {
      const agent = this.agents.get(binding.agentId)
      if (agent) {
        this.agentBindings.set(agent.id, chatId)
        return agent
      }
      this.bindings.delete(chatId)
      this.agentBindings.delete(binding.agentId)
    }
    const live = this.agents.list()
    if (live.length === 1) {
      this.bind(chatId, binding?.openId, live[0].id)
      return live[0]
    }
    return undefined
  }

  bind(chatId, openId, requested) {
    const live = this.agents.list()
    let choiceLabel = ''
    if (/^[1-9][0-9]*$/.test(requested)) {
      const ids = this.choices.get(chatId) ?? []
      const index = Number(requested) - 1
      if (!ids[index]) return `编号 ${requested} 不在上次列表里，请先发 !sessions 重新看一遍。`
      requested = ids[index]
      choiceLabel = `${index + 1}`
    }
    const matches = live.filter(agent => agent.id === requested || agent.id.startsWith(requested))
    if (matches.length === 0) return `没有找到任务 ${requested}。发送 !sessions 查看。`
    if (matches.length > 1) {
      return `前缀 ${requested} 匹配到多个会话，请写长一点：\n${matches.map(agent => `- ${agent.id}`).join('\n')}`
    }
    const agent = matches[0]
    const previous = this.bindings.get(chatId)
    if (previous) this.agentBindings.delete(previous.agentId)
    // One agent has one controlling chat; rebinding must not leave a second
    // chat able to answer the same approval.
    for (const [otherChat, binding] of this.bindings) {
      if (otherChat !== chatId && binding.agentId === agent.id) this.bindings.delete(otherChat)
    }
    this.bindings.set(chatId, { agentId: agent.id, openId })
    this.agentBindings.set(agent.id, chatId)
    const label = choiceLabel ? `${choiceLabel}. ` : ''
    return `已绑定 ${label}${this.taskTitle(agent)}\n项目：${projectName(cwdOf(agent))} · ${shortId(agent.id)}\n状态：${agent.status ?? 'unknown'}`
  }

  collectTasks(showAll = false) {
    const all = this.agents.list().slice()
    const live = showAll ? all : all.filter(agent => agent.status === 'running' || sessionHasContent(agent))
    const hidden = all.length - live.length
    live.sort((a, b) => {
      const rank = agent => (agent.status === 'running' ? 0 : 1)
      return rank(a) - rank(b) || this.lastActivity(b) - this.lastActivity(a)
    })
    return { all, live, hidden }
  }

  formatSessions(chatId, showAll = false) {
    const { all, live, hidden } = this.collectTasks(showAll)
    if (all.length === 0) return '当前没有 live 会话。请先在 dsh web 里打开或新建会话。'
    if (live.length === 0) {
      this.choices.set(chatId, [])
      return `当前没有有内容的任务。\n另有 ${hidden} 个空会话，发 !sessions all 查看。`
    }
    this.choices.set(chatId, live.map(agent => agent.id))
    const shown = live.slice(0, 15)
    const running = live.filter(agent => agent.status === 'running').length
    const lines = shown.map((agent, index) => {
      const title = this.taskTitle(agent)
      const status = statusLabel(agent.status)
      const project = projectName(cwdOf(agent))
      return `${index + 1}. ${status} ${title}\n   ${project} · ${relativeTime(this.lastActivity(agent), this.now())}`
    })
    const notes = []
    if (live.length > shown.length) notes.push(`只显示前 ${shown.length} 个，共 ${live.length} 个。`)
    if (hidden > 0) notes.push(`另有 ${hidden} 个空会话没显示；发 !sessions all 查看。`)
    const more = notes.length > 0 ? `\n\n${notes.join('\n')}` : ''
    return `当前有 ${running} 个正在运行，共 ${live.length} 个有内容的任务：\n\n${lines.join('\n')}${more}\n\n点任务「查看详情」。`
  }

  async sendSessions(chatId, showAll = false, page = 0) {
    const text = this.formatSessions(chatId, showAll)
    const card = this.sessionsCard(chatId, showAll, page)
    return this.safeSendCard(chatId, card, text)
  }

  async sendStatus(chatId) {
    const agent = this.resolveAgent(chatId)
    if (!agent) {
      await this.sendSessions(chatId)
      return
    }
    return this.sendDetail(chatId, agent)
  }

  archivedCard(agent) {
    const title = this.taskTitle(agent)
    return {
      config: { wide_screen_mode: true },
      header: { template: 'grey', title: { tag: 'plain_text', content: `已归档 · ${title}` } },
      elements: [
        { tag: 'note', elements: [{ tag: 'plain_text', content: '这张任务卡已被新的推送卡取代。继续操作请用最新一张。' }] },
      ],
    }
  }

  async sendTaskVideos(chatId, agent, videos) {
    if (typeof this.transport.sendVideo !== 'function') return
    for (const video of videos) {
      const videoKey = `${agent.id}:${video.path}`
      if (this.sentVideos.has(videoKey)) continue
      try {
        await this.transport.sendVideo(chatId, video.path)
        this.sentVideos.add(videoKey)
      } catch (error) {
        this.logger?.warn?.(`dsh-feishu: video send failed: ${safeError(error)}`)
        await this.audit?.write('media_send_failed', {
          kind: 'video',
          agentId: agent.id,
          name: video.name || basename(video.path),
          error: safeError(error),
        })
        await this.safeSend(chatId, `视频发送失败：${video.name || basename(video.path)}`)
      }
    }
  }

  async sendNewTaskCard(chatId, agent, phase = 'normal', extra = {}) {
    const reply = this.lastAssistantText(agent)
    const media = await this.prepareMedia(agent, reply)
    const state = phase === 'completed' ? '已完成' : phase === 'failed' ? '任务异常' : String(agent.status ?? 'unknown')
    const fallback = [
      `任务：${this.taskTitle(agent)}`,
      `状态：${state}`,
      `项目：${projectName(cwdOf(agent))} · ${shortId(agent.id)}`,
      `最近输出：\n${reply || '暂无输出'}`,
    ].join('\n')
    const sent = await this.sendNewCard(
      chatId,
      this.detailCard(agent, media, { phase, status: extra.status }),
      fallback,
    )
    if (!sent.ok) return false
    if (!sent.messageId) return true
    const key = this.cardKey(chatId, agent.id)
    const existing = this.taskCards.get(key)
    if (existing?.messageId && existing.messageId !== sent.messageId) {
      await this.quietUpdateTaskCard(chatId, agent, this.archivedCard(agent))
    }
    this.taskCards.set(key, { messageId: sent.messageId, chatId, updatedAt: this.now() })
    await this.sendTaskVideos(chatId, agent, media.videos)
    return true
  }

  async sendDetail(chatId, agent, options = {}) {
    const accepted = options.phase === 'accepted'
    const reply = this.lastAssistantText(agent)
    const media = accepted ? { images: [], videos: [] } : await this.prepareMedia(agent, reply)
    const fallback = [
      `任务：${this.taskTitle(agent)}`,
      `状态：${accepted ? '已发送，执行中' : agent.status ?? 'unknown'}`,
      `项目：${projectName(cwdOf(agent))} · ${shortId(agent.id)}`,
      `最近输出：\n${reply || '暂无输出'}`,
    ].join('\n')
    const result = await this.sendTrackedCard(
      chatId,
      this.detailCard(agent, media, { phase: accepted ? 'accepted' : 'normal' }),
      this.cardKey(chatId, agent.id),
      fallback,
      options.messageId,
    )
    if (result.ok && !accepted) await this.sendTaskVideos(chatId, agent, media.videos)
    return result.ok
  }

  presentedFiles(agent) {
    const log = agent?.session?.log
    if (!Array.isArray(log)) return []
    const files = []
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const event = log[index]
      if (event?.type !== 'deliverables/presented') continue
      for (const item of event.data?.files ?? []) {
        if (typeof item?.path === 'string' && item.path) files.push(item.path)
      }
      if (files.length > 0) break
    }
    return [...new Set(files)]
  }

  async prepareMedia(agent, text) {
    const images = []
    const videos = []
    const cwd = cwdOf(agent)
    if (!cwd) return { images, videos }
    const root = resolve(cwd)
    let realRoot = root
    try {
      realRoot = await realpath(root)
    } catch {
      // Keep the resolved path if the working directory has gone away.
    }
    const seen = new Set()
    const candidates = []
    const consider = (raw, name = '') => {
      let value = String(raw ?? '').trim().replace(/^file:\/\//, '')
      if (!value || /^https?:/i.test(value) || seen.has(value)) return
      if (value.startsWith('~/')) value = value.replace(/^~/, process.env.HOME ?? '')
      const target = resolve(root, value)
      if (target !== root && !target.startsWith(root + sep)) return
      if (seen.has(target)) return
      const ext = extname(target).toLowerCase()
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.webm'].includes(ext)) return
      seen.add(value)
      seen.add(target)
      candidates.push({ target, ext, name: name || basename(target) })
    }
    for (const file of this.presentedFiles(agent)) consider(file)
    for (const match of String(text ?? '').matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
      consider(match[2], match[1])
    }
    for (const match of String(text ?? '').matchAll(/(?:^|[\s(])((?:\/|~\/)[^\s`"'）)]+\.(?:png|jpe?g|gif|webp|mp4|mov|webm))(?:$|[\s)])/gi)) {
      consider(match[1])
    }
    for (const match of String(text ?? '').matchAll(/(?:^|[\s`])((?:\.\/)?[A-Za-z0-9_./-]+\.(?:png|jpe?g|gif|webp|mp4|mov|webm))(?:$|[\s`])/gi)) {
      consider(match[1])
    }
    for (const candidate of candidates) {
      try {
        const real = await realpath(candidate.target)
        if (real !== realRoot && !real.startsWith(realRoot + sep)) continue
        const info = await stat(real)
        if (!info.isFile()) continue
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(candidate.ext)) {
          if (info.size > 10 * 1024 * 1024 || typeof this.transport.uploadImage !== 'function') continue
          const imgKey = await this.transport.uploadImage(real)
          if (imgKey) images.push({ imgKey, name: candidate.name })
        } else if (info.size <= 30 * 1024 * 1024) {
          videos.push({ path: real, name: candidate.name })
        }
      } catch {
        // A path mentioned in the output may no longer exist; ignore it.
      }
    }
    return { images, videos }
  }

  taskStateLabel(agent) {
    if (agent.status === 'running') return statusLabel(agent.status)
    const recent = this.recentCompletions.get(agent.id)
    if (recent && this.now() - recent.at < 10 * 60_000) {
      return recent.kind === 'completed' ? '✅ 刚完成' : '⚠️ 异常'
    }
    return statusLabel(agent.status)
  }

  sessionsCard(chatId, showAll = false, page = 0) {
    const { all, live, hidden } = this.collectTasks(showAll)
    const pageSize = 5
    const pages = Math.max(1, Math.ceil(live.length / pageSize))
    const current = Math.min(Math.max(0, Number(page) || 0), pages - 1)
    const start = current * pageSize
    const slice = live.slice(start, start + pageSize)
    this.choices.set(chatId, live.map(agent => agent.id))
    const elements = []
    if (all.length === 0) {
      elements.push({ tag: 'div', text: { tag: 'lark_md', content: '当前没有 live 会话。请在 DSH 里打开一个任务。' } })
    } else if (live.length === 0) {
      elements.push({ tag: 'div', text: { tag: 'lark_md', content: `当前没有有内容的任务。\n另有 ${hidden} 个空会话。` } })
    } else {
      const runningCount = live.filter(agent => agent.status === 'running').length
      elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: `${runningCount} 个正在运行 · 点「查看详情」直接打开；完成后可在详情里输入继续。` }] })
      const entries = slice.map((agent, index) => ({ agent, number: start + index + 1 }))
      const groups = [
        ['运行中', entries.filter(item => item.agent.status === 'running')],
        ['空闲 / 最近', entries.filter(item => item.agent.status !== 'running')],
      ].filter(([, items]) => items.length > 0)
      for (const [label, items] of groups) {
        elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**${label}**` } })
        for (const { agent, number } of items) {
          const line = `**${number}. ${escapeCard(this.taskTitle(agent))}**\n${this.taskStateLabel(agent)} · ${escapeCard(projectName(cwdOf(agent)))} · ${relativeTime(this.lastActivity(agent), this.now())}`
          elements.push({ tag: 'div', text: { tag: 'lark_md', content: line } })
          elements.push({
            tag: 'action',
            actions: [cardButton('查看详情', 'default', { action: 'view', id: agent.id })],
          })
        }
      }
      const footer = []
      if (current > 0) footer.push(cardButton('上一页', 'default', { action: 'sessions', page: current - 1, all: showAll }))
      if (current + 1 < pages) footer.push(cardButton('下一页', 'default', { action: 'sessions', page: current + 1, all: showAll }))
      if (hidden > 0 || showAll) footer.push(cardButton(showAll ? '只看有内容' : '显示空会话', 'default', { action: 'sessions', all: !showAll, page: 0 }))
      footer.push(cardButton('使用说明', 'default', { action: 'help' }))
      if (footer.length > 0) elements.push({ tag: 'hr' }, { tag: 'action', actions: footer })
    }
    return {
      config: { wide_screen_mode: true },
      header: { template: 'blue', title: { tag: 'plain_text', content: live.length > 0 ? `任务 · ${live.length} 个` : '任务列表' } },
      elements,
    }
  }

  detailCard(agent, media = { images: [], videos: [] }, view = {}) {
    const accepted = view.phase === 'accepted'
    const completedPush = view.phase === 'completed'
    const failedPush = view.phase === 'failed'
    const failureStatus = view.status || agent.status
    const reply = this.lastAssistantText(agent)
    const running = agent.status === 'running' || accepted
    const statusLine = accepted
      ? '🟡 已发送，执行中…'
      : completedPush
      ? '✅ 已完成'
      : failedPush
      ? `⚠️ 任务异常：${statusLabel(failureStatus)}`
      : statusLabel(agent.status)
    const content = accepted
      ? '已发送，等待任务输出…'
      : reply
      ? normalizeMarkdown(cleanForChat(reply, 2500))
        .replace(/!\[[^\]]*\]\([^)\s]+\)/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      : '暂无输出'
    const elements = [
      { tag: 'div', text: { tag: 'lark_md', content: `**${statusLine}**` } },
      { tag: 'note', elements: [{ tag: 'plain_text', content: `${projectName(cwdOf(agent))} · ${relativeTime(this.lastActivity(agent), this.now())}` }] },
      { tag: 'hr' },
      { tag: 'div', text: { tag: 'lark_md', content: '**输出内容**' } },
      cardOutput(content),
    ]
    for (const image of media.images ?? []) {
      elements.push({ tag: 'img', img_key: image.imgKey, alt: { tag: 'plain_text', content: image.name }, mode: 'fit_horizontal', preview: true })
    }
    for (const video of media.videos ?? []) {
      elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: `视频已单独发送：${video.name}` }] })
    }
    if (running) {
      elements.push(
        { tag: 'note', elements: [{ tag: 'plain_text', content: accepted ? '指令已发送，正在执行。完成后这里会更新结果。' : '任务运行中，不能发新指令。完成后这里会出现输入框。' }] },
        {
          tag: 'action',
          actions: [
            cardButton('停止执行', 'danger', { action: 'stop', id: agent.id }),
            cardButton('返回列表', 'default', { action: 'sessions' }),
          ],
        },
      )
    } else {
      const inputNote = completedPush
        ? '任务已完成，在下面输入指令即可继续。'
        : failedPush
        ? '任务异常结束，可以输入指令重试。'
        : '在下面输入指令，让它继续工作。'
      elements.push(
        { tag: 'note', elements: [{ tag: 'plain_text', content: inputNote }] },
        {
          tag: 'form',
          name: `prompt_${agent.id}`,
          elements: [
            {
              tag: 'input',
              name: 'prompt',
              placeholder: { tag: 'plain_text', content: '例如：继续，把视频重新导出' },
              max_length: 1000,
            },
            {
              tag: 'button',
              name: `submit_${agent.id}`,
              type: 'primary',
              action_type: 'form_submit',
              text: { tag: 'plain_text', content: '发送' },
              value: { action: 'prompt', id: agent.id },
            },
          ],
        },
        { tag: 'action', actions: [cardButton('返回列表', 'default', { action: 'sessions' })] },
      )
    }
    const taskTitle = this.taskTitle(agent)
    const headerTitle = completedPush
      ? `✅ 已完成 · ${taskTitle}`
      : failedPush
      ? `⚠️ 任务异常 · ${taskTitle}`
      : taskTitle
    return {
      config: { wide_screen_mode: true },
      header: {
        template: running ? 'orange' : failedPush || agent.status === 'error' || agent.status === 'failed' ? 'red' : 'green',
        title: { tag: 'plain_text', content: headerTitle },
      },
      elements,
    }
  }

  completionCard(agent) {
    const reply = this.lastAssistantText(agent)
    return {
      config: { wide_screen_mode: true },
      header: { template: 'green', title: { tag: 'plain_text', content: '✅ 已完成' } },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${escapeCard(this.taskTitle(agent))}**` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `${projectName(cwdOf(agent))} · ${relativeTime(this.lastActivity(agent), this.now())}` }] },
        { tag: 'div', text: { tag: 'lark_md', content: `**总结**\n${summarize(reply)}` } },
        {
          tag: 'action',
          actions: [cardButton('查看详情', 'primary', { action: 'view', id: agent.id })],
        },
      ],
    }
  }

  digestCard(entries) {
    const failed = entries.filter(item => item.kind === 'failed').length
    const completed = entries.length - failed
    const title = failed > 0
      ? `⚠️ ${completed} 完成 · ${failed} 异常`
      : `✅ ${entries.length} 个任务完成`
    const elements = []
    for (const entry of entries.slice(0, 5)) {
      const mark = entry.kind === 'failed' ? '⚠️' : '✅'
      const body = entry.kind === 'failed'
        ? `状态：${escapeCard(entry.status || 'failed')}`
        : summarize(entry.summary || this.lastAssistantText(entry.agent))
      elements.push({
        tag: 'div',
        text: { tag: 'lark_md', content: `**${mark} ${escapeCard(entry.title)}**\n${body}` },
      })
      elements.push({
        tag: 'action',
        actions: [cardButton('查看详情', 'default', { action: 'view', id: entry.agent.id })],
      })
    }
    if (entries.length > 5) {
      elements.push({ tag: 'note', elements: [{ tag: 'plain_text', content: `另有 ${entries.length - 5} 个任务，进任务列表看。` }] })
    }
    elements.push({ tag: 'hr' }, { tag: 'action', actions: [cardButton('任务列表', 'primary', { action: 'sessions' })] })
    return {
      config: { wide_screen_mode: true },
      header: { template: failed > 0 ? 'orange' : 'green', title: { tag: 'plain_text', content: title } },
      elements,
    }
  }

  failureCard(agent, status) {
    return {
      config: { wide_screen_mode: true },
      header: { template: 'red', title: { tag: 'plain_text', content: '⚠️ 任务异常' } },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${escapeCard(this.taskTitle(agent))}**` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `${projectName(cwdOf(agent))} · ${relativeTime(this.lastActivity(agent), this.now())}` }] },
        { tag: 'div', text: { tag: 'lark_md', content: `状态：${escapeCard(status)}` } },
        { tag: 'action', actions: [cardButton('查看详情', 'primary', { action: 'view', id: agent.id })] },
      ],
    }
  }

  approvalCard(entry, request) {
    const reason = reasonText(request?.displayReason || request?.reason) || '未提供原因'
    const title = this.taskTitle(request?.agent)
    return {
      config: { wide_screen_mode: true },
      header: { template: 'orange', title: { tag: 'plain_text', content: '⏳ 需要审批' } },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${escapeCard(title)}**` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `${entry.toolName} · ${projectName(cwdOf(request?.agent))}` }] },
        { tag: 'div', text: { tag: 'lark_md', content: `**原因**\n${escapeCard(cleanForChat(reason, 500))}` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `${this.config.approvalTtlSeconds} 秒内有效，只批准这一次。` }] },
        {
          tag: 'action',
          actions: [
            cardButton('批准一次', 'primary', { action: 'approve', code: entry.code }),
            cardButton('拒绝', 'danger', { action: 'deny', code: entry.code }),
          ],
        },
      ],
    }
  }

  unboundApprovalCard(request) {
    const reason = reasonText(request?.displayReason || request?.reason) || '未提供原因'
    return {
      config: { wide_screen_mode: true },
      header: { template: 'orange', title: { tag: 'plain_text', content: '⏳ 等审批' } },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: `**${escapeCard(this.taskTitle(request?.agent))}**` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: `${request?.toolName ?? 'unknown'} · ${projectName(cwdOf(request?.agent))}` }] },
        { tag: 'div', text: { tag: 'lark_md', content: `**原因**\n${escapeCard(cleanForChat(reason, 500))}` } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: '远程模式未开启，审批还留在 Web。想看任务就点详情；要在这里批准，先发「连接」。' }] },
        {
          tag: 'action',
          actions: [
            cardButton('查看详情', 'primary', { action: 'view', id: request?.agent?.id }),
            cardButton('返回列表', 'default', { action: 'sessions' }),
          ],
        },
      ],
    }
  }

  helpCard() {
    return {
      config: { wide_screen_mode: true },
      header: { template: 'blue', title: { tag: 'plain_text', content: '使用说明' } },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content: '**进入远程模式**\n发「连接」开始，发「断开」结束。\n2 小时无操作会自动断开。' } },
        { tag: 'note', elements: [{ tag: 'plain_text', content: '连接后只推任务完成和审批；其他时间保持安静。' }] },
        { tag: 'hr' },
        { tag: 'div', text: { tag: 'lark_md', content: '**查看任务**\n点列表里的「查看详情」。\n\n**运行中**：只能停止，不能发新指令。\n**已完成 / 空闲**：看输出，底部输入框可以直接让它继续。' } },
        { tag: 'hr' },
        { tag: 'div', text: { tag: 'lark_md', content: '**文字命令**\n`!sessions` 任务列表\n`!help` 这条说明\n`!approve <code>` / `!deny <code>` 处理审批' } },
        { tag: 'action', actions: [cardButton('连接远程', 'primary', { action: 'connect' }), cardButton('打开任务列表', 'default', { action: 'sessions' })] },
      ],
    }
  }

  async safeSendCard(chatId, card, fallbackText = '') {
    if (this.disposed) return false
    if (typeof this.transport.sendCard !== 'function') {
      return fallbackText ? this.safeSend(chatId, fallbackText) : false
    }
    try {
      await this.transport.sendCard(chatId, card)
      return true
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: card send failed: ${safeError(error)}`)
      return fallbackText ? this.safeSend(chatId, fallbackText) : false
    }
  }

  cardKey(chatId, agentId) {
    return `${chatId}:${agentId}`
  }

  extractMessageId(response) {
    return response?.data?.message_id ?? response?.message_id ?? response?.data?.messageId ?? ''
  }

  async sendTrackedCard(chatId, card, key, fallbackText = '', preferredMessageId = '') {
    if (this.disposed) return { ok: false, messageId: '', updated: false }
    if (!key) return { ok: await this.safeSendCard(chatId, card, fallbackText), messageId: '', updated: false }
    const stored = this.taskCards.get(key) ?? (preferredMessageId ? { messageId: preferredMessageId, chatId } : undefined)
    if (stored?.messageId && typeof this.transport.updateCard === 'function') {
      try {
        await this.transport.updateCard(stored.messageId, card)
        this.taskCards.set(key, { messageId: stored.messageId, chatId, updatedAt: this.now() })
        return { ok: true, messageId: stored.messageId, updated: true }
      } catch (error) {
        this.logger?.warn?.(`dsh-feishu: card update failed: ${safeError(error)}`)
        this.taskCards.delete(key)
      }
    }
    if (typeof this.transport.sendCard !== 'function') {
      const ok = fallbackText ? await this.safeSend(chatId, fallbackText) : false
      return { ok, messageId: '', updated: false }
    }
    try {
      const response = await this.transport.sendCard(chatId, card)
      const messageId = this.extractMessageId(response)
      if (messageId) this.taskCards.set(key, { messageId, chatId, updatedAt: this.now() })
      return { ok: true, messageId, updated: false }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: card send failed: ${safeError(error)}`)
      const ok = fallbackText ? await this.safeSend(chatId, fallbackText) : false
      return { ok, messageId: '', updated: false }
    }
  }

  async sendNewCard(chatId, card, fallbackText = '') {
    if (this.disposed) return { ok: false, messageId: '' }
    if (typeof this.transport.sendCard !== 'function') {
      const ok = fallbackText ? await this.safeSend(chatId, fallbackText) : false
      return { ok, messageId: '' }
    }
    try {
      const response = await this.transport.sendCard(chatId, card)
      return { ok: true, messageId: this.extractMessageId(response) }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: card send failed: ${safeError(error)}`)
      const ok = fallbackText ? await this.safeSend(chatId, fallbackText) : false
      return { ok, messageId: '' }
    }
  }

  async quietUpdateTaskCard(chatId, agent, card) {
    const key = this.cardKey(chatId, agent.id)
    const stored = this.taskCards.get(key)
    if (!stored?.messageId || typeof this.transport.updateCard !== 'function') return false
    try {
      await this.transport.updateCard(stored.messageId, card)
      return true
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: quiet card update failed: ${safeError(error)}`)
      return false
    }
  }

  cardActionKey(event, action, value) {
    return JSON.stringify({
      messageId: event?.messageId ?? '',
      openId: event?.operator?.openId ?? '',
      action,
      id: value?.id ?? '',
      code: value?.code ?? '',
      page: value?.page ?? '',
      all: value?.all ?? '',
      prompt: event?.formValue?.prompt ?? value?.text ?? '',
    })
  }

  seenCardAction(key) {
    const now = this.now()
    for (const [oldKey, at] of this.cardActionSeen) {
      if (now - at > 30_000) this.cardActionSeen.delete(oldKey)
    }
    if (this.cardActionSeen.has(key)) return true
    this.cardActionSeen.set(key, now)
    return false
  }

  async handleCardAction(event) {
    const openId = event?.operator?.openId
    const chatId = event?.chatId
    const toast = (type, content) => ({ toast: { type, content } })
    if (!openId || !chatId) return toast('error', '无法识别操作')
    if (!this.isAllowed(openId)) {
      await this.audit?.write('card_denied', { openId, chatId })
      return toast('error', '无权限')
    }
    if (this.controlChatId !== chatId) {
      this.controlChatId = chatId
      void this.saveControlChat(chatId)
    }
    this.touchRemote()
    let value = event?.action?.value ?? {}
    if (typeof value === 'string') {
      try { value = JSON.parse(value) } catch { value = {} }
    }
    let agent = value.id ? this.agents.get(String(value.id)) : undefined
    if (!agent) {
      const match = /^submit_(.+)$/.exec(String(event?.action?.name ?? ''))
      if (match) agent = this.agents.get(match[1])
    }
    const action = value.action ?? value.a ?? (event?.formValue?.prompt && agent ? 'prompt' : undefined)
    // Prompt submission is the only action that mutates a task; approval codes are
    // already one-time and stop/connect are safe to retry after a transient error.
    const guarded = action === 'prompt'
    if (guarded && this.seenCardAction(this.cardActionKey(event, action, value))) {
      return toast('info', '这次操作已经处理过了')
    }
    await this.audit?.write('card_action', { openId, chatId, action, agentId: agent?.id, messageId: event?.messageId })
    try {
      switch (action) {
        case 'connect':
          await this.connectRemote(chatId, openId)
          return toast('success', '已进入远程模式')
        case 'disconnect':
          await this.disconnectRemote(chatId, openId)
          return toast('success', '已断开远程模式')
        case 'sessions':
          await this.sendSessions(chatId, value.all === true, Number(value.page) || 0)
          return toast('success', '任务列表已刷新')
        case 'view':
          if (!agent) return toast('error', '这个任务已经不在了')
          {
            const ok = await this.sendNewTaskCard(chatId, agent, 'normal')
            return toast(ok ? 'success' : 'error', ok ? '已打开任务详情' : '打开失败，请重试')
          }
        case 'prompt': {
          if (!agent) return toast('error', '这个任务已经不在了')
          if (agent.status === 'running') return toast('error', '任务正在运行，完成后才能发新指令')
          const prompt = String(event?.formValue?.prompt ?? value.text ?? '').trim()
          if (!prompt) return toast('error', '请先输入指令')
          if (prompt.length > 1000) return toast('error', '指令太长（上限 1000 字）')
          await this.sendDetail(chatId, agent, { phase: 'accepted', messageId: event?.messageId })
          void this.enqueuePrompt(chatId, () => this.runPromptForAgent({
            chatId,
            openId,
            agent,
            text: prompt,
            messageId: event?.messageId,
            eventId: event?.messageId,
          }))
          return toast('success', '已发送，完成后把结果发这里')
        }
        case 'stop': {
          if (!agent) return toast('error', '这个任务已经不在了')
          await agent.cancel({ kind: 'user' })
          await this.safeSend(chatId, `已请求停止：${this.taskTitle(agent)}`)
          await this.sendDetail(chatId, agent)
          return toast('success', '已请求停止')
        }
        case 'approve':
        case 'deny':
          await this.resolveApproval({
            chatId,
            openId,
            code: String(value.code ?? '').toUpperCase(),
            decision: action === 'approve' ? 'allowed-once' : 'rejected',
            eventId: event?.messageId,
          })
          return toast('success', action === 'approve' ? '已批准一次' : '已拒绝')
        case 'help':
          await this.safeSendCard(chatId, this.helpCard(), HELP)
          return toast('success', '已发送帮助')
        case 'hosts':
          await this.sendHosts(chatId)
          return toast('success', '主机列表已刷新')
        case 'switch_host': {
          const targetHost = String(value.hostId ?? '').trim()
          if (!targetHost) return toast('error', '未指定目标电脑')
          const switched = await this.switchHostFromFeishu(chatId, openId, targetHost)
          return toast(switched ? 'success' : 'error', switched ? `已切换飞书控制到 ${targetHost}` : '切换失败，请检查总控中心')
        }
        default:
          return toast('error', '未知操作')
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: card handler failed: ${safeError(error)}`)
      return toast('error', '操作失败，请重试')
    }
  }

  formatStatus(chatId) {
    const agent = this.resolveAgent(chatId)
    if (!agent) {
      const live = this.agents.list()
      return live.length === 0
        ? '当前没有 live 会话。'
        : `当前聊天还没有选择任务。\n\n${this.formatSessions(chatId)}`
    }
    const reply = this.lastAssistantText(agent)
    const lines = [
      `任务：${this.taskTitle(agent)}`,
      `状态：${agent.status ?? 'unknown'}`,
      `项目：${projectName(cwdOf(agent))} · ${shortId(agent.id)}`,
      `目录：${cwdOf(agent) || '未知'}`,
      `最近活动：${relativeTime(this.lastActivity(agent), this.now())}`,
    ]
    if (reply) lines.push(`最近输出：\n${reply}`)
    return lines.join('\n')
  }

  taskTitle(agent) {
    const log = agent?.session?.log
    if (Array.isArray(log)) {
      for (let index = log.length - 1; index >= 0; index -= 1) {
        const event = log[index]
        if (event?.type !== 'session/title') continue
        const title = oneLine(event.data?.title)
        if (title) return trimTitle(title)
      }
    }
    let messages = []
    try {
      messages = agent?.session?.deriveMessages?.() ?? []
    } catch {
      return '空会话（未开始）'
    }
    for (const message of messages) {
      if (message?.role !== 'user') continue
      const text = oneLine(contentText(message.content))
      if (text) return trimTitle(text)
    }
    return '空会话（未开始）'
  }

  lastActivity(agent) {
    const log = agent?.session?.log
    const time = Array.isArray(log) ? log.at(-1)?.time : undefined
    return Number.isFinite(time) ? time : 0
  }

  lastAssistantText(agent, fromIndex = 0) {
    let messages = []
    try {
      messages = agent.session?.deriveMessages?.() ?? []
    } catch {
      return ''
    }
    for (let index = messages.length - 1; index >= Math.max(0, fromIndex); index -= 1) {
      const message = messages[index]
      if (message?.role !== 'assistant') continue
      const text = contentText(message.content)
      if (text) return cleanForChat(text, this.config.maxReplyChars)
    }
    return ''
  }

  /** Approval waterfall answerer. Remote mode intercepts; otherwise delegate to Web. */
  onApproval(request, next) {
    if (this.disposed) return next()
    const chatId = this.controlChatId
    if (!chatId) return next()
    if (!this.isRemoteActive()) {
      if (this.config.notify && this.config.notifyApprovals) void this.notifyApproval(request, chatId)
      return next()
    }
    const code = this.newCode()
    const entry = {
      code,
      chatId,
      agentId: request.agent.id,
      toolName: request.toolName ?? 'unknown',
      callId: request.callId,
      title: this.taskTitle(request.agent),
      reason: reasonText(request.displayReason || request.reason) || '未提供原因',
      createdAt: this.now(),
      settled: false,
      resolve: undefined,
      timer: undefined,
      abort: undefined,
      requestSignal: request.signal,
    }
    const promise = new Promise(resolve => {
      entry.resolve = resolve
    })
    entry.timer = setTimeout(() => {
      this.settle(entry, 'rejected', 'timeout')
      void this.safeSend(chatId, `审批 ${code} 已超时，按拒绝处理。`)
    }, this.config.approvalTtlSeconds * 1000)
    entry.timer.unref?.()
    this.pending.set(code, entry)
    if (request.signal) {
      entry.abort = () => this.settle(entry, 'cancelled', 'cancelled')
      if (request.signal.aborted) {
        entry.abort()
        return promise
      }
      request.signal.addEventListener('abort', entry.abort, { once: true })
    }
    const reason = reasonText(request.displayReason || request.reason) || '未提供原因'
    const text = [
      `需要审批：${this.taskTitle(request.agent)}`,
      `工具：${entry.toolName}`,
      `项目：${projectName(cwdOf(request.agent))} · ${shortId(entry.agentId)}`,
      `原因：${cleanForChat(reason, 500)}`,
      '',
      `回复 /approve ${code} 批准一次，或 /deny ${code} 拒绝。`,
      `${this.config.approvalTtlSeconds} 秒内有效，仅对这一次调用有效。`,
    ].join('\n')
    this.safeSendCard(chatId, this.approvalCard(entry, request), text).then(ok => {
      if (!ok) this.settle(entry, 'unavailable', 'send_failed')
    })
    void this.audit?.write('approval_requested', {
      chatId,
      agentId: entry.agentId,
      toolName: entry.toolName,
      callId: entry.callId,
    })
    return promise
  }

  async resolveApproval({ chatId, openId, code, decision, eventId }) {
    if (!code) {
      await this.safeSend(chatId, '用法：/approve <code> 或 /deny <code>')
      return
    }
    const entry = this.pending.get(code)
    if (!entry) {
      await this.safeSend(chatId, '这个审批码不存在或已过期。')
      return
    }
    if (entry.chatId !== chatId) {
      await this.audit?.write('approval_wrong_chat', { eventId, openId, chatId, code })
      await this.safeSend(chatId, '这个审批不属于当前聊天。')
      return
    }
    const before = entry.settled
    this.settle(entry, decision, 'user')
    if (before) {
      await this.safeSend(chatId, '这个审批已经处理过了。')
      return
    }
    await this.audit?.write('approval_decided', {
      eventId,
      openId,
      chatId,
      agentId: entry.agentId,
      toolName: entry.toolName,
      decision,
    })
    await this.safeSend(chatId, decision === 'allowed-once' ? `已批准 ${code}（仅这一次）。` : `已拒绝 ${code}。`)
  }

  settle(entry, outcome, reason) {
    if (entry.settled) return
    entry.settled = true
    if (entry.timer) clearTimeout(entry.timer)
    if (entry.abort && entry.requestSignal) entry.requestSignal.removeEventListener('abort', entry.abort)
    this.pending.delete(entry.code)
    void this.audit?.write('approval_settled', {
      agentId: entry.agentId,
      toolName: entry.toolName,
      outcome,
      reason,
    })
    entry.resolve(outcome)
  }

  newCode() {
    for (;;) {
      let code = ''
      for (let index = 0; index < CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]
      }
      if (!this.pending.has(code)) return code
    }
  }

  async safeSend(chatId, text) {
    if (this.disposed) return false
    try {
      await this.transport.sendText(chatId, text)
      return true
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: send failed: ${safeError(error)}`)
      return false
    }
  }

  async sendHosts(chatId) {
    const fleet = this.hubAgent?.getFleetSummary?.() ?? []
    const hostName = this.config.hostName || '本机'
    const hostId = this.config.hostId || 'local'
    const { live } = this.collectTasks(false)
    const running = live.filter(agent => agent.status === 'running').length
    const webUrl = this.hubAgent?.getPublicWebUrl?.() || this.config.hubUrl || (this.config.localWebPort ? `http://127.0.0.1:${this.config.localWebPort}` : '')

    const lines = [
      `🖥 当前飞书主控电脑：${hostName} (${hostId})`,
      `运行中任务：${running} · 远程推送：${this.isRemoteActive() ? '已开启' : '未开启'}`,
    ]
    if (fleet.length > 0) {
      lines.push('', '已接入总控中心的电脑：')
      for (const h of fleet) {
        const mark = h.hostId === hostId ? '🟢 [当前飞书主控]' : h.online ? '⚪ [在线待机]' : '🔴 [离线]'
        lines.push(`- ${h.hostName} (${h.hostId}) ${mark} · 任务 ${h.taskCount ?? 0}`)
      }
      lines.push('', '发送 !host <主机ID> 或点击卡片按钮即可将飞书切换到另一台电脑。')
    }
    if (webUrl) {
      lines.push('', `🌐 页面总控台：${webUrl}`)
    }
    const card = this.hostsCard(fleet, webUrl)
    return this.safeSendCard(chatId, card, lines.join('\n'))
  }

  hostsCard(fleet = [], webUrl = '') {
    const hostName = this.config.hostName || '本机'
    const hostId = this.config.hostId || 'local'
    const { live } = this.collectTasks(false)
    const running = live.filter(agent => agent.status === 'running').length
    const elements = [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**🖥 当前飞书主控：${escapeCard(hostName)}** (\`${escapeCard(hostId)}\`)\n${running} 个任务运行中 · 共 ${live.length} 个活跃任务`,
        },
      },
    ]
    if (webUrl) {
      elements.push({
        tag: 'note',
        elements: [{ tag: 'plain_text', content: `Web 页面总控台：${webUrl}` }],
      })
    }
    if (fleet.length > 0) {
      elements.push({ tag: 'hr' }, { tag: 'div', text: { tag: 'lark_md', content: '**多电脑总控列表**' } })
      for (const item of fleet) {
        const isCurrent = item.hostId === hostId
        const stateText = isCurrent
          ? '🟢 当前飞书主控'
          : item.online
          ? '⚪ 在线（待机）'
          : '🔴 离线'
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**${escapeCard(item.hostName || item.hostId)}** (\`${escapeCard(item.hostId)}\`)\n${stateText} · 运行中 ${item.runningCount ?? 0} · 会话 ${item.sessionCount ?? item.taskCount ?? 0}`,
          },
        })
        if (!isCurrent && item.online) {
          elements.push({
            tag: 'action',
            actions: [
              cardButton(`切换飞书到 ${item.hostName || item.hostId}`, 'primary', {
                action: 'switch_host',
                hostId: item.hostId,
              }),
            ],
          })
        }
      }
    } else {
      elements.push({
        tag: 'note',
        elements: [{ tag: 'plain_text', content: '提示：在多台电脑配置相同的 FEISHU_HUB_URL 后，即可在此处或 Web 页面一键切换飞书控制的电脑并迁移数据。' }],
      })
    }
    elements.push(
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          cardButton('打开任务列表', 'primary', { action: 'sessions' }),
          cardButton('刷新主机状态', 'default', { action: 'hosts' }),
        ],
      },
    )
    return {
      config: { wide_screen_mode: true },
      header: { template: 'blue', title: { tag: 'plain_text', content: `多机控制 · ${hostName}` } },
      elements,
    }
  }

  async switchHostFromFeishu(chatId, openId, requestedHost) {
    if (!this.hubAgent || typeof this.hubAgent.requestSwitchHost !== 'function') {
      await this.safeSend(chatId, '当前未连接多机总控中心（FEISHU_HUB_URL），无法跨电脑切换。')
      return false
    }
    const target = String(requestedHost ?? '').trim()
    if (!target) {
      await this.sendHosts(chatId)
      return false
    }
    if (target === this.config.hostId || target.toLowerCase() === String(this.config.hostName).toLowerCase()) {
      await this.safeSend(chatId, `当前已经在控制本机：${this.config.hostName} (${this.config.hostId})`)
      return true
    }
    const ok = await this.hubAgent.requestSwitchHost(target)
    if (ok) {
      await this.audit?.write('host_switch_requested', { chatId, openId, from: this.config.hostId, to: target })
      await this.safeSend(chatId, `🔄 已请求将飞书控制权切换到电脑「${target}」。本机即将进入飞书待机模式，由目标电脑接管对话…`)
      return true
    }
    await this.safeSend(chatId, `切换失败：未找到在线主机「${target}」或总控中心未响应。发送 !hosts 查看可用电脑。`)
    return false
  }

  getSnapshotState() {
    const { all, live } = this.collectTasks(true)
    const now = this.now()
    const workspaceSet = new Set()
    for (const agent of all) {
      const c = cwdOf(agent)
      if (c) workspaceSet.add(c)
    }
    if (workspaceSet.size === 0) workspaceSet.add(process.cwd())

    return {
      hostId: this.config.hostId || 'local',
      hostName: this.config.hostName || 'Local-Host',
      remoteActive: this.isRemoteActive(),
      remoteLastActivity: this.remote.lastActivity,
      feishuConnected: Boolean(this.transport?.connected),
      feishuStandby: Boolean(this.feishuStandby),
      controlChatId: this.controlChatId || '',
      runningCount: live.filter(agent => agent.status === 'running').length,
      taskCount: all.length,
      workspaces: [...workspaceSet].slice(0, 12),
      tasks: all.slice(0, 30).map(agent => ({
        id: agent.id,
        shortId: shortId(agent.id),
        title: this.taskTitle(agent),
        status: String(agent.status ?? 'unknown'),
        statusLabel: this.taskStateLabel(agent),
        project: projectName(cwdOf(agent)),
        cwd: cwdOf(agent),
        lastActivity: this.lastActivity(agent),
        lastOutput: cleanForChat(this.lastAssistantText(agent), 1500),
        queuedSteers: (this.steerQueues.get(agent.id) ?? []).slice(),
        transcript: extractSessionTranscript(agent, 40),
      })),
      approvals: [...this.pending.values()]
        .filter(entry => !entry.settled && now - entry.createdAt <= this.config.approvalTtlSeconds * 1000)
        .map(entry => ({
          code: entry.code,
          agentId: entry.agentId,
          title: entry.title || this.taskTitle(this.agents.get(entry.agentId)),
          toolName: entry.toolName,
          reason: cleanForChat(entry.reason, 400),
          createdAt: entry.createdAt,
          expiresAt: entry.createdAt + this.config.approvalTtlSeconds * 1000,
        })),
    }
  }

  async executeHubCommand(cmd = {}) {
    if (this.disposed) return { ok: false, error: 'disposed' }
    const type = String(cmd.type ?? '').trim()
    await this.audit?.write('hub_command', { type, id: cmd.id, agentId: cmd.agentId })
    switch (type) {
      case 'remote_mode': {
        const active = cmd.active !== false
        this.remote.active = active
        if (active) this.remote.lastActivity = this.now()
        await this.saveRemoteState()
        return { ok: true, remoteActive: this.isRemoteActive() }
      }
      case 'new_session': {
        const { live } = this.collectTasks(true)
        const targetCwd = String(cmd.cwd ?? '').trim() || cwdOf(live[0]) || process.cwd()
        const promptText = String(cmd.prompt ?? cmd.text ?? '').trim()
        const title = String(cmd.title ?? '').trim() || (promptText ? promptText.slice(0, 36) : '新远程会话')
        const created = await createNewAgentSession(this.agents, {
          cwd: targetCwd,
          title,
        })
        if (!created) {
          return { ok: false, error: '当前 DSH 实例不支持动态创建会话' }
        }
        if (promptText) {
          const chatId = this.controlChatId || ''
          void this.enqueuePrompt(created.id || chatId || 'web-console', () =>
            this.runPromptForAgent({
              chatId,
              openId: 'web-admin',
              agent: created,
              text: promptText,
              messageId: `web-new-${cmd.id || Date.now()}`,
              eventId: `web-new-${cmd.id || Date.now()}`,
            }),
          )
        }
        return {
          ok: true,
          agentId: created.id,
          title: this.taskTitle(created),
          cwd: targetCwd,
          message: `已创建新会话「${this.taskTitle(created)}」`,
        }
      }
      case 'prompt': {
        const targetAgentId = String(cmd.agentId ?? '')
        let agent = this.agents.get(targetAgentId)
        if (!agent && typeof this.agents.resolveOrResume === 'function') {
          agent = await this.agents.resolveOrResume(targetAgentId)
        }
        if (!agent) return { ok: false, error: '找不到该任务会话' }
        if (agent.status === 'running') {
          if (cmd.allowSteer) {
            return await this.steerTask(agent, cmd.text, {
              interrupt: Boolean(cmd.interrupt),
              chatId: this.controlChatId || '',
            })
          }
          return { ok: false, error: '任务正在运行中，无法发送普通指令（可使用插话 Steer 或打断重发）' }
        }
        const text = String(cmd.text ?? '').trim()
        if (!text) return { ok: false, error: '指令内容不能为空' }
        const chatId = this.controlChatId || 'web-console'
        if (this.controlChatId) {
          await this.sendDetail(this.controlChatId, agent, { phase: 'accepted' })
        }
        void this.enqueuePrompt(agent.id || chatId, () =>
          this.runPromptForAgent({
            chatId: this.controlChatId || '',
            openId: 'web-admin',
            agent,
            text,
            messageId: `web-${cmd.id || Date.now()}`,
            eventId: `web-${cmd.id || Date.now()}`,
          }),
        )
        return { ok: true, message: '指令已发送给任务' }
      }
      case 'steer': {
        const targetAgentId = String(cmd.agentId ?? '')
        let agent = this.agents.get(targetAgentId)
        if (!agent && typeof this.agents.resolveOrResume === 'function') {
          agent = await this.agents.resolveOrResume(targetAgentId)
        }
        if (!agent) return { ok: false, error: '找不到该任务会话' }
        return await this.steerTask(agent, cmd.text, {
          interrupt: Boolean(cmd.interrupt),
          chatId: this.controlChatId || '',
        })
      }
      case 'rename_session': {
        const targetAgentId = String(cmd.agentId ?? '')
        let agent = this.agents.get(targetAgentId)
        if (!agent && typeof this.agents.resolveOrResume === 'function') {
          agent = await this.agents.resolveOrResume(targetAgentId)
        }
        if (!agent) return { ok: false, error: '找不到该任务会话' }
        const renamed = renameAgentSession(agent, cmd.title)
        if (!renamed.ok) return renamed
        return { ok: true, agentId: agent.id, title: renamed.title, message: `已重命名会话为「${renamed.title}」` }
      }
      case 'delete_session': {
        const agentId = String(cmd.agentId ?? '').trim()
        const deleted = await deleteAgentSession(this.agents, agentId, this.config.dshHome)
        if (!deleted.ok) return deleted
        this.steerQueues.delete(agentId)
        return { ok: true, agentId, message: `已删除会话 ${shortId(agentId)}` }
      }
      case 'list_files': {
        const agent = cmd.agentId ? this.agents.get(String(cmd.agentId)) : null
        const { live } = this.collectTasks(true)
        const rootCwd = String(cmd.cwd || cwdOf(agent) || cwdOf(live[0]) || process.cwd()).trim()
        const subDir = String(cmd.subDir ?? '').trim()
        const res = await listWorkspaceFiles(rootCwd, subDir)
        return {
          ...res,
          agentId: cmd.agentId || agent?.id || '',
          message: res.ok ? `已读取目录 ${res.subDir || '/'}` : res.error,
        }
      }
      case 'read_file': {
        const agent = cmd.agentId ? this.agents.get(String(cmd.agentId)) : null
        const { live } = this.collectTasks(true)
        const rootCwd = String(cmd.cwd || cwdOf(agent) || cwdOf(live[0]) || process.cwd()).trim()
        const relPath = String(cmd.relPath ?? '').trim()
        const res = await readWorkspaceFile(rootCwd, relPath)
        return {
          ...res,
          agentId: cmd.agentId || agent?.id || '',
          message: res.ok ? `已读取文件 ${res.relPath}` : res.error,
        }
      }
      case 'stop': {
        const agent = this.agents.get(String(cmd.agentId ?? ''))
        if (!agent) return { ok: false, error: '找不到该任务会话' }
        this.steerQueues.delete(agent.id)
        await agent.cancel({ kind: 'user' })
        if (this.controlChatId) {
          await this.sendDetail(this.controlChatId, agent)
        }
        return { ok: true, message: '已请求停止任务' }
      }
      case 'approve':
      case 'deny': {
        const code = String(cmd.code ?? '').trim().toUpperCase()
        const entry = this.pending.get(code)
        if (!entry || entry.settled) return { ok: false, error: '审批码不存在或已处理' }
        const decision = type === 'approve' ? 'allowed-once' : 'rejected'
        this.settle(entry, decision, 'web-admin')
        if (entry.chatId) {
          await this.safeSend(
            entry.chatId,
            decision === 'allowed-once'
              ? `🌐 已在 Web 控制台批准 ${code}（仅这一次）。`
              : `🌐 已在 Web 控制台拒绝 ${code}。`,
          )
        }
        return { ok: true, code, decision }
      }
      default:
        return { ok: false, error: `未知指令类型: ${type}` }
    }
  }

  async dispose() {
    this.disposed = true
    this.stopNotifier()
    if (this.digestTimer) {
      clearTimeout(this.digestTimer)
      this.digestTimer = null
    }
    this.agentWatch.clear()
    this.bridgeBusy.clear()
    this.choices.clear()
    this.notifiedApprovals.clear()
    for (const entry of this.pending.values()) this.settle(entry, 'cancelled', 'shutdown')
    this.pending.clear()
    this.bindings.clear()
    this.agentBindings.clear()
    this.promptChains.clear()
    this.taskCards.clear()
    this.cardActionSeen.clear()
    this.notifyQueue = []
    this.recentCompletions.clear()
    this.sentVideos.clear()
    this.steerQueues.clear()
  }
}

function extractText(message) {
  if (message?.message_type !== 'text') return undefined
  try {
    const parsed = JSON.parse(message.content)
    return typeof parsed?.text === 'string' ? parsed.text : undefined
  } catch {
    return undefined
  }
}

function stripMentions(text, mentions) {
  let result = text
  for (const mention of Array.isArray(mentions) ? mentions : []) {
    if (mention?.key) result = result.split(mention.key).join('')
  }
  return result.trim()
}

function contentText(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()
}

function sessionHasContent(agent) {
  const log = agent?.session?.log
  if (!Array.isArray(log)) return true
  for (const event of log) {
    if (!event || typeof event !== 'object') continue
    if (event.type === 'user/message' || event.type === 'assistant/message') return true
    if (event.type === 'session/title' && oneLine(event.data?.title)) return true
    if (event.type === 'agent/inbox/spliced' && Array.isArray(event.data?.inserted) && event.data.inserted.length > 0) return true
  }
  return false
}

function normalizeMarkdown(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+(.+)$/gm, '**$1**')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function summarize(value) {
  const text = normalizeMarkdown(value)
    .replace(/```[\s\S]*?```/g, ' [代码] ')
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleanForChat(text, 180) || '（没有可展示的输出）'
}

function cardOutput(content) {
  if (content.length <= 450) {
    return { tag: 'div', text: { tag: 'lark_md', content } }
  }
  return {
    tag: 'collapsible_panel',
    expanded: false,
    header: { title: { tag: 'plain_text', content: `输出较长（${content.length} 字），点这里展开` } },
    elements: [{ tag: 'div', text: { tag: 'lark_md', content } }],
  }
}

function cardButton(text, type, value) {
  return { tag: 'button', type, text: { tag: 'plain_text', content: text }, value }
}

function escapeCard(value) {
  return String(value ?? '').replace(/[*_~`]/g, '')
}

function reasonText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    if (typeof value.reason === 'string') return value.reason
    if (typeof value.message === 'string') return value.message
    if (typeof value.zh === 'string') return value.zh
    if (typeof value.en === 'string') return value.en
    if (typeof value.text === 'string') return value.text
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return value === undefined || value === null ? '' : String(value)
}

function shortId(id) {
  const raw = String(id ?? 'unknown')
  return raw.startsWith('session-') ? raw.slice(8, 16) : raw.slice(0, 8)
}

function projectName(cwd) {
  if (!cwd) return '未知项目'
  const parts = String(cwd).split('/').filter(Boolean)
  const name = parts.at(-1) || '未知项目'
  return name === 'default-workspace' ? '默认工作区' : name
}

function statusLabel(status) {
  if (status === 'running') return '🟢 运行中'
  if (status === 'idle') return '⚪ 空闲'
  if (status === 'error' || status === 'failed') return '🔴 异常'
  return `⚪ ${status ?? 'unknown'}`
}

function relativeTime(time, now) {
  if (!time) return '时间未知'
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function oneLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function trimTitle(value) {
  const title = oneLine(value)
  return title.length > 42 ? `${title.slice(0, 42)}…` : title
}

function cwdOf(agent) {
  return agent?.session?.header?.cwd ?? agent?.session?.cwd ?? ''
}

function shortCwd(cwd) {
  if (!cwd) return '?'
  const parts = String(cwd).split('/').filter(Boolean)
  return parts.length <= 2 ? `/${parts.join('/')}` : `…/${parts.slice(-2).join('/')}`
}

const HELP = `飞书遥控：
发「连接」进入远程模式，发「断开」结束。
连接后只推任务完成和审批；2 小时无操作自动断开。

查看任务：
!sessions — 任务列表
点「查看详情」打开任务
运行中只能停止；已完成/空闲可在详情输入框里继续

命令：
!approve <code> — 批准一次
!deny <code> — 拒绝
!help — 这条说明`
