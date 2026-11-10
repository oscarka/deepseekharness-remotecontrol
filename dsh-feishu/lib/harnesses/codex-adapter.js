import { execFile, execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const CODEX_SESSION_PREFIX = 'codex:'

export function isCodexSessionId(id = '') {
  return String(id || '').startsWith(CODEX_SESSION_PREFIX)
}

export function toRawCodexId(id = '') {
  const s = String(id || '')
  return s.startsWith(CODEX_SESSION_PREFIX) ? s.slice(CODEX_SESSION_PREFIX.length) : s
}

export function findCodexBinary(customPath = '') {
  const home = homedir()
  const candidates = [
    customPath,
    process.env.CODEX_BIN,
    process.env.CODEX_CLI_PATH,
    '/Applications/Codex.app/Contents/Resources/codex',
    join(home, 'Applications/Codex.app/Contents/Resources/codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    join(home, '.codex/plugins/.plugin-appserver/codex'),
    join(home, '.npm-global/bin/codex'),
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p
    } catch { }
  }
  try {
    const resolved = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['codex'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
    }).trim().split(/\r?\n/)[0]
    if (resolved && existsSync(resolved)) return resolved
  } catch { }
  return ''
}

const codexModelsCache = new Map()

/**
 * Discover Codex models and user's configured default model from `~/.codex/config.toml`
 * and `~/.codex/models_cache.json`.
 */
export function discoverCodexModels(codexHome = join(homedir(), '.codex')) {
  const resolvedHome = resolve(codexHome || join(homedir(), '.codex'))
  const now = Date.now()
  const cached = codexModelsCache.get(resolvedHome)
  if (cached && now - cached.at < 30_000) {
    return cached.catalog
  }

  const models = []
  const seen = new Set()
  const addModel = (value, label) => {
    const v = String(value || '').trim()
    if (!v || seen.has(v)) return
    seen.add(v)
    models.push({ value: v, label: String(label || v).trim() })
  }

  let defaultModel = ''
  let defaultEffort = ''
  const configPath = join(resolvedHome, 'config.toml')
  try {
    if (existsSync(configPath)) {
      const rawCfg = readFileSync(configPath, 'utf8')
      const mMatch = rawCfg.match(/^\s*model\s*=\s*["']([^"']+)["']/m)
      const eMatch = rawCfg.match(/^\s*model_reasoning_effort\s*=\s*["']([^"']+)["']/m)
      if (mMatch) defaultModel = mMatch[1].trim()
      if (eMatch) defaultEffort = eMatch[1].trim()
    }
  } catch { }

  const cachePath = join(resolvedHome, 'models_cache.json')
  try {
    if (existsSync(cachePath)) {
      const parsed = JSON.parse(readFileSync(cachePath, 'utf8'))
      const list = Array.isArray(parsed?.models) ? parsed.models : []
      for (const m of list) {
        if (!m || typeof m !== 'object') continue
        if (m.visibility && m.visibility !== 'list') continue
        const slug = String(m.slug || m.id || m.model || '').trim()
        if (!slug) continue
        const display = String(m.display_name || m.displayName || slug).trim()
        addModel(slug, display)
      }
    }
  } catch { }

  addModel('gpt-5.5', 'GPT-5.5')
  addModel('gpt-5.4', 'GPT-5.4')
  addModel('gpt-5.4-mini', 'GPT-5.4-Mini')
  addModel('gpt-5.3-codex', 'GPT-5.3-Codex')
  addModel('o3', 'o3 (深度推理)')
  addModel('o4-mini', 'o4-mini (快速)')

  if (!defaultModel && models.length > 0) {
    defaultModel = models[0].value
  }
  const matched = models.find(m => m.value === defaultModel)
  const defaultLabel = matched
    ? `${matched.label}${defaultEffort ? ` (${defaultEffort})` : ''} (默认)`
    : `${defaultModel || 'GPT-5.5'} (默认)`

  const catalog = {
    defaultModel: defaultModel || 'gpt-5.5',
    defaultLabel,
    models,
  }
  codexModelsCache.set(resolvedHome, { at: now, catalog })
  return catalog
}

function walkJsonlFiles(dir, maxDepth = 4, depth = 0, out = []) {
  if (!dir || !existsSync(dir) || depth > maxDepth) return out
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        walkJsonlFiles(full, maxDepth, depth + 1, out)
      } else if (e.isFile() && e.name.endsWith('.jsonl')) {
        try {
          const st = statSync(full)
          out.push({ path: full, mtimeMs: st.mtimeMs, size: st.size })
        } catch { }
      }
    }
  } catch { }
  return out
}

function cleanTitle(raw = '') {
  const firstLine = String(raw || '')
    .replace(/^#+\s*/gm, '')
    .split('\n')
    .map(l => l.trim())
    .find(Boolean) || ''
  return firstLine
    .replace(/[】\])}']+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
}

export function parseCodexRolloutContent(rawContent = '', fallbackId = '') {
  const lines = String(rawContent || '').split('\n').filter(Boolean)
  let sessionId = fallbackId
  let cwd = ''
  let model = ''
  let turnState = 'idle'
  let lastStepIndex = 0
  const transcript = []

  const appendUser = (text, time) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    // Ignore giant developer/system permission blocks injected as user/developer context
    if (trimmed.startsWith('<permissions instructions>') || trimmed.startsWith('<environment_context>')) return
    const prev = transcript[transcript.length - 1]
    if (prev && prev.role === 'user' && prev.text === trimmed) return
    transcript.push({
      index: transcript.length,
      role: 'user',
      text: trimmed,
      thinking: '',
      tools: [],
      toolCalls: [],
      time: time || Date.now(),
    })
  }

  const ensureAssistant = time => {
    let prev = transcript[transcript.length - 1]
    if (!prev || prev.role !== 'assistant') {
      prev = {
        index: transcript.length,
        role: 'assistant',
        text: '',
        thinking: '',
        tools: [],
        toolCalls: [],
        time: time || Date.now(),
      }
      transcript.push(prev)
    }
    return prev
  }

  const appendAssistant = (text, time) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    const prev = transcript[transcript.length - 1]
    if (prev && prev.role === 'assistant' && prev.text === trimmed) return
    if (prev && prev.role === 'assistant' && !prev.text) {
      prev.text = trimmed
      if (time) prev.time = time
      return
    }
    transcript.push({
      index: transcript.length,
      role: 'assistant',
      text: trimmed,
      thinking: '',
      tools: [],
      toolCalls: [],
      time: time || Date.now(),
    })
  }

  for (let i = 0; i < lines.length; i++) {
    let rec
    try {
      rec = JSON.parse(lines[i])
    } catch {
      continue
    }
    lastStepIndex = i
    const ts = rec.timestamp ? Date.parse(rec.timestamp) || 0 : 0
    const p = rec.payload || {}

    if (rec.type === 'session_meta') {
      if (p.id) sessionId = p.id
      if (p.cwd) cwd = p.cwd
    } else if (rec.type === 'turn_context') {
      if (p.cwd) cwd = p.cwd
      if (p.model) model = p.model
    } else if (rec.type === 'event_msg') {
      if (p.type === 'task_started') {
        turnState = 'running'
      } else if (p.type === 'task_complete' || p.type === 'turn_aborted') {
        turnState = 'idle'
      } else if (p.type === 'user_message' && p.message) {
        appendUser(p.message, ts)
      } else if (p.type === 'agent_message' && p.message) {
        appendAssistant(p.message, ts)
      } else if (p.type === 'agent_reasoning' && p.text) {
        const msg = ensureAssistant(ts)
        const chunk = String(p.text).trim()
        if (chunk && !msg.thinking.includes(chunk)) {
          msg.thinking = msg.thinking ? `${msg.thinking}\n${chunk}` : chunk
        }
      }
    } else if (rec.type === 'response_item') {
      if (p.type === 'message' && p.role === 'user' && Array.isArray(p.content)) {
        const text = p.content
          .filter(c => c.type === 'input_text' && c.text)
          .map(c => c.text)
          .join('\n')
        appendUser(text, ts)
      } else if (p.type === 'message' && p.role === 'assistant' && Array.isArray(p.content)) {
        const text = p.content
          .filter(c => (c.type === 'output_text' || c.type === 'text') && c.text)
          .map(c => c.text)
          .join('\n')
        appendAssistant(text, ts)
      } else if (p.type === 'reasoning' && Array.isArray(p.summary)) {
        const summaryText = p.summary
          .map(s => (typeof s === 'string' ? s : s?.text || ''))
          .filter(Boolean)
          .join('\n')
          .trim()
        if (summaryText) {
          const msg = ensureAssistant(ts)
          if (!msg.thinking.includes(summaryText)) {
            msg.thinking = msg.thinking ? `${msg.thinking}\n${summaryText}` : summaryText
          }
        }
      } else if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        const toolName = p.name || 'tool'
        const prev = ensureAssistant(ts)
        if (!prev.tools.includes(toolName)) prev.tools.push(toolName)
        prev.toolCalls.push({
          name: toolName,
          argsSummary: String(p.arguments || p.input || '').slice(0, 120),
        })
      }
    }
  }

  return {
    sessionId,
    cwd,
    model,
    turnState,
    lastStepIndex,
    transcript: transcript.slice(-80),
  }
}

function makeApprovalCode(prefix, seed) {
  const hash = createHash('sha1').update(String(seed)).digest('hex').slice(0, 6).toUpperCase()
  return `${prefix}-${hash}`
}

/**
 * Bidirectional JSON-RPC 2.0 client for `codex app-server --listen stdio://`.
 * Unlocks full `managed` capabilities for Codex:
 * - Real-time streaming deltas (`item/agentMessage/delta`, `item/reasoning/*`)
 * - Mid-turn steering (`turn/steer`)
 * - Graceful turn interruption (`turn/interrupt`)
 * - Mobile command & file-patch approvals (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`)
 * - Interactive multi-choice question cards (`item/tool/requestUserInput`)
 */
export class CodexAppServerClient {
  constructor({
    binaryPath,
    codexHome = join(homedir(), '.codex'),
    spawnImpl = spawn,
    idleTimeoutMs = 10 * 60 * 1000,
  } = {}) {
    this.binaryPath = binaryPath
    this.codexHome = codexHome
    this.spawnImpl = spawnImpl
    this.idleTimeoutMs = idleTimeoutMs
    this.proc = null
    this.connectPromise = null
    this.nextId = 1
    this.pendingRpc = new Map()
    this.threads = new Map()
    this.pendingApprovals = new Map()
    this.loadedThreadIds = new Set()
    this.idleTimer = null
  }

  isConnected() {
    return Boolean(this.proc && !this.proc.killed && this.proc.stdin && !this.proc.stdin.destroyed)
  }

  touchIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    if (!this.idleTimeoutMs || this.idleTimeoutMs <= 0) return
    const hasActiveWork =
      this.pendingApprovals.size > 0 ||
      Array.from(this.threads.values()).some(t => t.status === 'running' || t.status === 'approval')
    if (hasActiveWork) return
    this.idleTimer = setTimeout(() => {
      const stillBusy =
        this.pendingApprovals.size > 0 ||
        Array.from(this.threads.values()).some(t => t.status === 'running' || t.status === 'approval')
      if (!stillBusy) {
        this.close()
      }
    }, this.idleTimeoutMs)
    this.idleTimer.unref?.()
  }

  async ensureConnected() {
    if (this.isConnected()) return true
    if (this.connectPromise) return this.connectPromise

    this.connectPromise = (async () => {
      const bin = this.binaryPath || findCodexBinary()
      if (!bin) throw new Error('未找到 codex CLI 可执行文件')
      const child = this.spawnImpl(bin, ['app-server', '--listen', 'stdio://'], {
        cwd: homedir(),
        env: {
          ...process.env,
          CODEX_HOME: this.codexHome,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      if (!child || !child.stdin || !child.stdout || typeof child.stdout.on !== 'function') {
        try {
          child?.kill?.('SIGTERM')
        } catch { }
        throw new Error('spawned process does not support stdio pipes for app-server')
      }

      this.proc = child
      let stdoutBuf = ''
      child.stdout.on('data', chunk => {
        stdoutBuf += String(chunk)
        let idx
        while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
          const line = stdoutBuf.slice(0, idx).trim()
          stdoutBuf = stdoutBuf.slice(idx + 1)
          if (!line) continue
          try {
            const msg = JSON.parse(line)
            this.handleMessage(msg)
          } catch { }
        }
      })

      child.stderr?.on('data', () => {
        // Consume stderr to prevent pipe backpressure
      })

      child.on('exit', () => {
        this.handleDisconnect(new Error('codex app-server process exited'))
      })
      child.on('error', err => {
        this.handleDisconnect(err)
      })

      await this.request(
        'initialize',
        {
          clientInfo: {
            name: 'dsh-remote',
            title: 'DSH Remote Control',
            version: '1.0.0',
          },
          capabilities: null,
        },
        4000,
      )
      this.notify('initialized')
      this.touchIdleTimer()
      return true
    })()

    try {
      return await this.connectPromise
    } catch (err) {
      this.close()
      throw err
    } finally {
      this.connectPromise = null
    }
  }

  handleDisconnect(err) {
    this.proc = null
    this.loadedThreadIds.clear()
    for (const [, pending] of this.pendingRpc) {
      clearTimeout(pending.timer)
      pending.reject(err || new Error('disconnected'))
    }
    this.pendingRpc.clear()
    for (const thread of this.threads.values()) {
      if (thread.status === 'running' || thread.status === 'approval') {
        thread.status = 'idle'
        thread.turnState = 'interrupted'
        thread.activeTurnId = null
        thread.pendingApproval = null
      }
    }
    this.pendingApprovals.clear()
  }

  close() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    const p = this.proc
    this.proc = null
    if (p) {
      try {
        p.kill('SIGTERM')
      } catch { }
    }
    this.handleDisconnect(new Error('closed'))
  }

  writeRaw(obj) {
    if (!this.isConnected()) throw new Error('codex app-server is not connected')
    this.proc.stdin.write(`${JSON.stringify(obj)}\n`)
  }

  notify(method, params = undefined) {
    const payload = { jsonrpc: '2.0', method }
    if (params !== undefined) payload.params = params
    this.writeRaw(payload)
  }

  request(method, params = {}, timeoutMs = 15_000) {
    const id = this.nextId++
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        this.pendingRpc.delete(id)
        rejectPromise(new Error(`codex app-server RPC timeout: ${method}`))
      }, timeoutMs)
      timer.unref?.()
      this.pendingRpc.set(id, { resolve: resolvePromise, reject: rejectPromise, timer, method })
      try {
        this.writeRaw({ jsonrpc: '2.0', id, method, params })
      } catch (err) {
        clearTimeout(timer)
        this.pendingRpc.delete(id)
        rejectPromise(err)
      }
    })
  }

  sendRpcResult(id, result) {
    this.writeRaw({ jsonrpc: '2.0', id, result })
  }

  ensureThreadState(threadId, defaults = {}) {
    const id = toRawCodexId(threadId)
    let state = this.threads.get(id)
    if (!state) {
      state = {
        id,
        cwd: defaults.cwd || '',
        model: defaults.model || '',
        title: defaults.title || '',
        status: 'idle',
        turnState: 'idle',
        activeTurnId: null,
        runningSummary: '',
        updatedAt: Date.now(),
        lastConclusionAt: 0,
        transcript: [],
        pendingApproval: null,
      }
      this.threads.set(id, state)
    } else {
      if (defaults.cwd && !state.cwd) state.cwd = defaults.cwd
      if (defaults.model) state.model = defaults.model
      if (defaults.title && !state.title) state.title = defaults.title
    }
    return state
  }

  ensureAssistantMessage(state, itemId = '') {
    let last = state.transcript[state.transcript.length - 1]
    if (itemId) {
      const byItem = [...state.transcript].reverse().find(m => m.role === 'assistant' && m._itemId === itemId)
      if (byItem) return byItem
    }
    if (!last || last.role !== 'assistant' || (itemId && last._itemId && last._itemId !== itemId && last.text)) {
      last = {
        index: state.transcript.length,
        role: 'assistant',
        text: '',
        thinking: '',
        tools: [],
        toolCalls: [],
        time: Date.now(),
        _itemId: itemId || '',
      }
      state.transcript.push(last)
    } else if (itemId && !last._itemId) {
      last._itemId = itemId
    }
    return last
  }

  appendUserMessage(state, text, time = Date.now()) {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    const last = state.transcript[state.transcript.length - 1]
    if (last && last.role === 'user' && last.text === trimmed) return
    state.transcript.push({
      index: state.transcript.length,
      role: 'user',
      text: trimmed,
      thinking: '',
      tools: [],
      toolCalls: [],
      time,
    })
    state.updatedAt = time
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return

    // 1. Response to client-initiated RPC request
    if (msg.id !== undefined && !msg.method) {
      const pending = this.pendingRpc.get(msg.id)
      if (!pending) return
      clearTimeout(pending.timer)
      this.pendingRpc.delete(msg.id)
      if (msg.error) {
        const err = new Error(msg.error.message || `RPC error (${pending.method})`)
        err.code = msg.error.code
        pending.reject(err)
      } else {
        pending.resolve(msg.result)
      }
      return
    }

    // 2. Server-initiated JSON-RPC request (Approvals & User Input Questions!)
    if (msg.id !== undefined && typeof msg.method === 'string') {
      this.handleServerRequest(msg.id, msg.method, msg.params || {})
      return
    }

    // 3. Server notification (Streaming deltas & lifecycle events)
    if (typeof msg.method === 'string') {
      this.handleNotification(msg.method, msg.params || {})
    }
  }

  handleServerRequest(jsonRpcId, method, params) {
    const threadId = toRawCodexId(params.threadId || params.conversationId || '')
    const state = threadId ? this.ensureThreadState(threadId, { cwd: params.cwd }) : null
    const now = Date.now()

    if (
      method === 'item/commandExecution/requestApproval' ||
      method === 'execCommandApproval'
    ) {
      const callId = String(params.itemId || params.approvalId || params.callId || jsonRpcId)
      const code = makeApprovalCode('CDX', `${threadId}:${callId}:${jsonRpcId}`)
      const cmdStr = Array.isArray(params.command)
        ? params.command.join(' ')
        : String(params.command || '')
      const approval = {
        code,
        kind: 'permission',
        harness: 'codex',
        agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
        callId,
        toolName: 'Bash',
        promptTitle: 'Codex 请求执行命令',
        reason: params.reason || (cmdStr ? `执行命令: ${cmdStr}` : '请求终端命令执行权限'),
        command: cmdStr,
        cwd: params.cwd || state?.cwd || '',
        createdAt: now,
        options: [
          { index: 1, label: '允许本次执行 (Accept)' },
          { index: 2, label: '本会话始终允许 (Accept for Session)' },
          { index: 3, label: '拒绝 (Decline)' },
        ],
      }
      this.pendingApprovals.set(code, {
        code,
        jsonRpcId,
        method,
        threadId,
        params,
        approval,
      })
      if (state) {
        state.status = 'approval'
        state.turnState = 'approval'
        state.pendingApproval = approval
        state.runningSummary = `⏳ 等待手机授权执行命令: ${cmdStr.slice(0, 48)}`
        state.updatedAt = now
      }
      this.touchIdleTimer()
      return
    }

    if (
      method === 'item/fileChange/requestApproval' ||
      method === 'applyPatchApproval' ||
      method === 'item/permissions/requestApproval'
    ) {
      const callId = String(params.itemId || params.callId || jsonRpcId)
      const code = makeApprovalCode('CDX', `${threadId}:${callId}:${jsonRpcId}`)
      const reason =
        params.reason ||
        (params.grantRoot ? `申请目录写入权限: ${params.grantRoot}` : '请求修改工作区文件')
      const approval = {
        code,
        kind: 'permission',
        harness: 'codex',
        agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
        callId,
        toolName: 'Edit',
        promptTitle: 'Codex 请求修改文件',
        reason,
        cwd: state?.cwd || '',
        createdAt: now,
        options: [
          { index: 1, label: '允许修改 (Accept)' },
          { index: 2, label: '本会话始终允许 (Accept for Session)' },
          { index: 3, label: '拒绝 (Decline)' },
        ],
      }
      this.pendingApprovals.set(code, {
        code,
        jsonRpcId,
        method,
        threadId,
        params,
        approval,
      })
      if (state) {
        state.status = 'approval'
        state.turnState = 'approval'
        state.pendingApproval = approval
        state.runningSummary = `⏳ 等待手机授权: ${reason.slice(0, 48)}`
        state.updatedAt = now
      }
      this.touchIdleTimer()
      return
    }

    if (method === 'item/tool/requestUserInput') {
      const callId = String(params.itemId || jsonRpcId)
      const code = makeApprovalCode('CDXQ', `${threadId}:${callId}:${jsonRpcId}`)
      const rawQuestions = Array.isArray(params.questions) ? params.questions : []
      const questions = rawQuestions.map((q, idx) => ({
        id: String(q.id || `q_${idx}`),
        header: String(q.header || `问题 ${idx + 1}`),
        question: String(q.question || ''),
        multiSelect: false,
        isOther: Boolean(q.isOther),
        isSecret: Boolean(q.isSecret),
        options: (Array.isArray(q.options) ? q.options : []).map(o => ({
          label: String(o.label || o.value || ''),
          description: String(o.description || ''),
        })),
      }))
      const reason = questions.map(q => q.question).filter(Boolean).join(' / ') || '请选择以继续执行'
      const approval = {
        code,
        kind: 'question',
        harness: 'codex',
        agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
        callId,
        toolName: 'request_user_input',
        promptTitle: 'Codex 请你选择',
        reason,
        questions,
        cwd: state?.cwd || '',
        createdAt: now,
      }
      this.pendingApprovals.set(code, {
        code,
        jsonRpcId,
        method,
        threadId,
        params,
        questions,
        approval,
      })
      if (state) {
        state.status = 'approval'
        state.turnState = 'approval'
        state.pendingApproval = approval
        state.runningSummary = `⏳ 等待你选择: ${reason.slice(0, 48)}`
        state.updatedAt = now
      }
      this.touchIdleTimer()
    }
  }

  handleNotification(method, params) {
    const now = Date.now()

    if (method === 'thread/started' && params.thread) {
      const t = params.thread
      const state = this.ensureThreadState(t.id, {
        cwd: t.cwd || '',
        title: t.name || cleanTitle(t.preview || ''),
      })
      this.loadedThreadIds.add(state.id)
      state.updatedAt = now
      return
    }

    if (method === 'thread/name/updated') {
      const threadId = toRawCodexId(params.threadId || '')
      if (threadId) {
        const state = this.ensureThreadState(threadId)
        if (params.threadName || params.name) {
          state.title = cleanTitle(params.threadName || params.name)
        }
      }
      return
    }

    if (method === 'turn/started') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      state.activeTurnId = params.turn?.id || state.activeTurnId || `turn-${now}`
      state.status = 'running'
      state.turnState = 'thinking'
      state.runningSummary = '💭 Codex 正在思考与执行...'
      state.updatedAt = now
      this.touchIdleTimer()
      return
    }

    if (method === 'turn/completed') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      state.activeTurnId = null
      state.pendingApproval = null
      const turnStatus = String(params.turn?.status || '')
      state.status = 'idle'
      state.turnState = turnStatus === 'interrupted' || turnStatus === 'cancelled' ? 'interrupted' : 'conclusion'
      state.lastConclusionAt = now
      state.runningSummary = ''
      state.updatedAt = now
      for (const [code, entry] of this.pendingApprovals.entries()) {
        if (entry.threadId === threadId) this.pendingApprovals.delete(code)
      }
      this.touchIdleTimer()
      return
    }

    if (method === 'item/started' && params.item) {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const item = params.item
      state.updatedAt = now

      if (item.type === 'userMessage' && Array.isArray(item.content)) {
        const text = item.content
          .filter(c => c.type === 'text' && c.text)
          .map(c => c.text)
          .join('\n')
        this.appendUserMessage(state, text, now)
      } else if (item.type === 'agentMessage') {
        const msg = this.ensureAssistantMessage(state, item.id)
        if (item.text) msg.text = item.text
        msg.time = now
      } else if (item.type === 'commandExecution') {
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes('Bash')) msg.tools.push('Bash')
        msg.toolCalls.push({
          name: 'Bash',
          argsSummary: String(item.command || '').slice(0, 120),
        })
        state.turnState = 'tool'
        state.runningSummary = `🔧 正在执行命令: ${String(item.command || '').slice(0, 56)}`
      } else if (item.type === 'fileChange') {
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes('Edit')) msg.tools.push('Edit')
        const files = (Array.isArray(item.changes) ? item.changes : [])
          .map(c => c?.path)
          .filter(Boolean)
          .join(', ')
        msg.toolCalls.push({
          name: 'Edit',
          argsSummary: files.slice(0, 120),
        })
        state.turnState = 'tool'
        state.runningSummary = `📝 正在修改文件: ${files.slice(0, 48) || 'workspace'}`
      } else if (item.type === 'mcpToolCall' || item.type === 'dynamicToolCall') {
        const toolName = String(item.tool || 'mcp_tool')
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes(toolName)) msg.tools.push(toolName)
        msg.toolCalls.push({
          name: toolName,
          argsSummary: JSON.stringify(item.arguments || {}).slice(0, 120),
        })
        state.turnState = 'tool'
        state.runningSummary = `🔌 正在调用工具: ${toolName}`
      }
      return
    }

    if (method === 'item/agentMessage/delta') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const msg = this.ensureAssistantMessage(state, params.itemId)
      msg.text = `${msg.text || ''}${String(params.delta || '')}`
      msg.time = now
      if (state.status !== 'approval') {
        state.status = 'running'
        state.turnState = 'thinking'
        state.runningSummary = '✍️ Codex 正在生成回复...'
      }
      state.updatedAt = now
      return
    }

    if (method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/textDelta') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const msg = this.ensureAssistantMessage(state, params.itemId)
      msg.thinking = `${msg.thinking || ''}${String(params.delta || '')}`
      msg.time = now
      if (state.status !== 'approval') {
        state.status = 'running'
        state.turnState = 'thinking'
        state.runningSummary = '💭 Codex 正在深度思考...'
      }
      state.updatedAt = now
      return
    }

    if (method === 'item/completed' && params.item) {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const item = params.item
      if (item.type === 'agentMessage' && item.text) {
        const msg = this.ensureAssistantMessage(state, item.id)
        msg.text = item.text
        msg.time = now
      } else if (item.type === 'reasoning' && Array.isArray(item.summary) && item.summary.length > 0) {
        const msg = this.ensureAssistantMessage(state, item.id)
        if (!msg.thinking) {
          msg.thinking = item.summary.join('\n')
        }
      }
      state.updatedAt = now
      return
    }

    if (method === 'serverRequest/resolved') {
      const reqId = params.requestId
      for (const [code, entry] of this.pendingApprovals.entries()) {
        if (entry.jsonRpcId === reqId) {
          this.pendingApprovals.delete(code)
          const st = this.threads.get(entry.threadId)
          if (st && st.pendingApproval?.code === code) {
            st.pendingApproval = null
            st.status = 'running'
            st.turnState = 'thinking'
          }
        }
      }
    }
  }

  buildUserInputArray(text = '', imagePaths = []) {
    const input = []
    const cleanText = String(text || '').trim()
    if (cleanText) {
      input.push({
        type: 'text',
        text: cleanText,
        text_elements: [],
      })
    }
    if (Array.isArray(imagePaths)) {
      for (const imgPath of imagePaths) {
        if (imgPath) {
          input.push({
            type: 'localImage',
            path: String(imgPath),
          })
        }
      }
    }
    return input
  }

  async startNewSession({ prompt, cwd, title = '', model = '', imagePaths = [] } = {}) {
    await this.ensureConnected()
    const targetCwd = cwd && existsSync(cwd) ? cwd : homedir()
    const cleanModel = String(model || '').trim() || undefined
    const startRes = await this.request('thread/start', {
      cwd: targetCwd,
      model: cleanModel,
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
    })
    const thread = startRes?.thread
    const threadId = thread?.id
    if (!threadId) throw new Error('codex app-server 未返回新会话 thread.id')
    this.loadedThreadIds.add(threadId)

    const resolvedTitle = cleanTitle(title || prompt) || `Codex (${threadId.slice(0, 8)})`
    const state = this.ensureThreadState(threadId, {
      cwd: startRes?.cwd || targetCwd,
      model: startRes?.model || cleanModel || 'codex',
      title: resolvedTitle,
    })
    if (title) {
      this.request('thread/name/set', { threadId, name: resolvedTitle }).catch(() => { })
    }

    this.appendUserMessage(state, prompt, Date.now())
    state.status = 'running'
    state.turnState = 'thinking'
    state.runningSummary = '💭 Codex 正在思考与执行...'

    const turnRes = await this.request('turn/start', {
      threadId,
      cwd: targetCwd,
      model: cleanModel,
      approvalPolicy: 'on-request',
      input: this.buildUserInputArray(prompt, imagePaths),
    })
    if (turnRes?.turn?.id) {
      state.activeTurnId = turnRes.turn.id
    }
    this.touchIdleTimer()
    return {
      ok: true,
      harness: 'codex',
      agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
      title: resolvedTitle,
      cwd: state.cwd,
      message: `🚀 已在电脑端启动 Codex 会话「${resolvedTitle.slice(0, 28)}」`,
    }
  }

  async sendOrSteerTurn({ sessionId, text, cwd, model = '', imagePaths = [], mode = 'prompt' } = {}) {
    await this.ensureConnected()
    const rawId = toRawCodexId(sessionId)
    const state = this.ensureThreadState(rawId, { cwd, model })
    const input = this.buildUserInputArray(text, imagePaths)
    const cleanModel = String(model || '').trim() || undefined

    // If a turn is currently running on this thread, steer it in real time via `turn/steer`!
    if (state.activeTurnId && (state.status === 'running' || mode === 'steer')) {
      try {
        this.appendUserMessage(state, text, Date.now())
        await this.request('turn/steer', {
          threadId: rawId,
          expectedTurnId: state.activeTurnId,
          input,
        })
        state.runningSummary = '⚡ 已实时注入补充指令 (Steer)，正在调整执行...'
        state.updatedAt = Date.now()
        this.touchIdleTimer()
        return {
          ok: true,
          steered: true,
          agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
          message: `⚡ 已向正在运行的 Codex 会话 (${rawId.slice(0, 8)}) 实时注入指令`,
        }
      } catch {
        // If active turn completed right before `turn/steer`, fall through to `turn/start`
      }
    }

    if (!this.loadedThreadIds.has(rawId)) {
      const resumeRes = await this.request('thread/resume', {
        threadId: rawId,
        cwd: (cwd && existsSync(cwd) ? cwd : state.cwd) || undefined,
        model: cleanModel,
        approvalPolicy: 'on-request',
      })
      this.loadedThreadIds.add(rawId)
      if (resumeRes?.cwd) state.cwd = resumeRes.cwd
      if (resumeRes?.model) state.model = resumeRes.model
    }

    this.appendUserMessage(state, text, Date.now())
    state.status = 'running'
    state.turnState = 'thinking'
    state.runningSummary = '💭 Codex 正在思考与执行...'

    const turnRes = await this.request('turn/start', {
      threadId: rawId,
      cwd: (cwd && existsSync(cwd) ? cwd : state.cwd) || undefined,
      model: cleanModel,
      approvalPolicy: 'on-request',
      input,
    })
    if (turnRes?.turn?.id) {
      state.activeTurnId = turnRes.turn.id
    }
    this.touchIdleTimer()
    return {
      ok: true,
      agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
      message: `🚀 已在 Codex 会话 (${rawId.slice(0, 8)}) 中继续执行`,
    }
  }

  async interruptTurn(sessionId) {
    const rawId = toRawCodexId(sessionId)
    const state = this.threads.get(rawId)
    if (!state || (!state.activeTurnId && state.status !== 'running' && state.status !== 'approval')) {
      return null
    }
    for (const [code, entry] of this.pendingApprovals.entries()) {
      if (entry.threadId === rawId) {
        try {
          this.sendRpcResult(entry.jsonRpcId, { decision: 'cancel' })
        } catch { }
        this.pendingApprovals.delete(code)
      }
    }
    const turnId = state.activeTurnId
    state.activeTurnId = null
    state.pendingApproval = null
    state.status = 'idle'
    state.turnState = 'interrupted'
    state.runningSummary = ''
    state.updatedAt = Date.now()
    if (turnId && this.isConnected()) {
      try {
        await this.request('turn/interrupt', { threadId: rawId, turnId }, 4000)
      } catch { }
    }
    this.touchIdleTimer()
    return {
      ok: true,
      agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
      message: `⏹ 已停止 Codex 会话 (${rawId.slice(0, 8)})`,
    }
  }

  resolvePendingApproval({ sessionId = '', code = '', allow = true, optionIndex = 1, answers = undefined } = {}) {
    const upperCode = String(code || '').trim().toUpperCase()
    const rawId = toRawCodexId(sessionId)
    let entry = upperCode ? this.pendingApprovals.get(upperCode) : null
    if (!entry && rawId) {
      for (const candidate of this.pendingApprovals.values()) {
        if (candidate.threadId === rawId) {
          entry = candidate
          break
        }
      }
    }
    if (!entry) {
      return { ok: false, error: '未找到待处理的 Codex 审批或选择项（可能已在电脑端处理或超时）' }
    }

    this.pendingApprovals.delete(entry.code)
    const state = this.threads.get(entry.threadId)
    if (state && state.pendingApproval?.code === entry.code) {
      state.pendingApproval = null
      state.status = allow ? 'running' : 'idle'
      state.turnState = allow ? 'thinking' : 'idle'
      state.runningSummary = allow ? '💭 已授权，Codex 正在继续执行...' : ''
      state.updatedAt = Date.now()
    }

    if (entry.method === 'item/tool/requestUserInput') {
      const answerMap = {}
      const qList = Array.isArray(entry.questions) ? entry.questions : []
      if (allow) {
        for (let i = 0; i < qList.length; i++) {
          const q = qList[i]
          let selected = []
          if (Array.isArray(answers) && answers[i] !== undefined) {
            const rawAns = answers[i]
            if (Array.isArray(rawAns)) selected = rawAns.map(String)
            else if (typeof rawAns === 'object' && rawAns !== null) {
              selected = Array.isArray(rawAns.answers)
                ? rawAns.answers.map(String)
                : [String(rawAns.answer ?? rawAns.value ?? rawAns.label ?? '')].filter(Boolean)
            } else {
              selected = [String(rawAns)]
            }
          } else if (typeof optionIndex === 'number' && q.options?.[optionIndex - 1]) {
            selected = [q.options[optionIndex - 1].label]
          } else if (q.options?.[0]) {
            selected = [q.options[0].label]
          }
          answerMap[q.id] = { answers: selected }
        }
      }
      this.sendRpcResult(entry.jsonRpcId, { answers: answerMap })
      this.touchIdleTimer()
      return {
        ok: true,
        code: entry.code,
        agentId: `${CODEX_SESSION_PREFIX}${entry.threadId}`,
        decision: allow ? 'answered' : 'rejected',
        message: allow ? '✅ 已提交选择并继续执行 Codex 任务' : '已取消该问题选择',
      }
    }

    if (entry.method === 'execCommandApproval' || entry.method === 'applyPatchApproval') {
      const decision = !allow
        ? 'denied'
        : optionIndex === 2
          ? 'approved_for_session'
          : 'approved'
      this.sendRpcResult(entry.jsonRpcId, { decision })
    } else {
      const decision = !allow
        ? 'decline'
        : optionIndex === 2
          ? 'acceptForSession'
          : 'accept'
      this.sendRpcResult(entry.jsonRpcId, { decision })
    }
    this.touchIdleTimer()
    return {
      ok: true,
      code: entry.code,
      agentId: `${CODEX_SESSION_PREFIX}${entry.threadId}`,
      decision: allow ? (optionIndex === 2 ? 'allowed-session' : 'allowed-once') : 'rejected',
      message: allow ? '✅ 已批准 Codex 执行操作' : '🚫 已拒绝 Codex 执行该操作',
    }
  }
}

export class CodexAdapter {
  constructor({
    codexHome = join(homedir(), '.codex'),
    binaryPath = '',
    maxSessions = 12,
    execImpl = undefined,
    spawnImpl = spawn,
    useAppServer = undefined,
  } = {}) {
    this.id = 'codex'
    this.label = 'Codex'
    this.icon = '🧠'
    this.codexHome = codexHome
    this.binaryPath = binaryPath || findCodexBinary()
    this.maxSessions = maxSessions
    this.execImpl = execImpl
    this.spawnImpl = spawnImpl
    this.useAppServer = useAppServer
    this.fileCache = new Map()
    this.indexCache = { mtimeMs: 0, titles: new Map() }
    this.activeRuns = new Map()
    this.deletedIds = new Set()
    this.appServer = new CodexAppServerClient({
      binaryPath: this.binaryPath,
      codexHome: this.codexHome,
      spawnImpl: this.spawnImpl,
    })
  }

  shouldUseAppServer() {
    if (this.useAppServer === false) return false
    if (this.useAppServer === true) return true
    if (this.execImpl) return false
    if (this.spawnImpl !== spawn) return false
    return Boolean(this.binaryPath && existsSync(this.binaryPath))
  }

  getCapabilities() {
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    return {
      canView: true,
      canCreateSession: hasBin,
      canPrompt: hasBin,
      canSteer: hasBin,
      canStop: true,
      canApprove: hasBin,
      approvalStatus: hasBin ? 'supported' : 'planned',
    }
  }

  getModelCatalog() {
    return discoverCodexModels(this.codexHome)
  }

  async detectHealth() {
    const sessionsDir = join(this.codexHome, 'sessions')
    const hasDir = existsSync(sessionsDir)
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    return {
      installed: hasBin || hasDir,
      hasBinary: hasBin,
      binaryPath: this.binaryPath,
      sessionsDir: hasDir ? sessionsDir : '',
    }
  }

  loadThreadTitles() {
    const indexPath = join(this.codexHome, 'session_index.jsonl')
    if (!existsSync(indexPath)) return this.indexCache.titles
    try {
      const st = statSync(indexPath)
      if (st.mtimeMs === this.indexCache.mtimeMs) return this.indexCache.titles
      const titles = new Map()
      const lines = readFileSync(indexPath, 'utf8').split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const j = JSON.parse(line)
          if (j.id && j.thread_name) {
            titles.set(j.id, cleanTitle(j.thread_name))
          }
        } catch { }
      }
      this.indexCache = { mtimeMs: st.mtimeMs, titles }
    } catch { }
    return this.indexCache.titles
  }

  async hasExternalCodexProcess() {
    const runExec = this.execImpl || execFileAsync
    try {
      const { stdout } = await runExec('ps', ['-ax', '-o', 'command='], { timeout: 1500 })
      const lines = String(stdout || '').split('\n')
      return lines.some(
        line =>
          /\bcodex\b/.test(line) &&
          !line.includes('probe-harnesses') &&
          !line.includes('app-server --listen stdio://'),
      )
    } catch {
      return false
    }
  }

  async listSessions({ now = Date.now() } = {}) {
    const sessionsDir = join(this.codexHome, 'sessions')
    const files = existsSync(sessionsDir)
      ? walkJsonlFiles(sessionsDir, 4)
          .sort((a, b) => b.mtimeMs - a.mtimeMs)
          .slice(0, this.maxSessions)
      : []

    const titles = this.loadThreadTitles()
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    const anyRecentFile = files.some(f => now - f.mtimeMs < 45_000)
    const externalRunning = anyRecentFile ? await this.hasExternalCodexProcess(now) : false

    const results = []
    const seenSessionIds = new Set()

    for (const file of files) {
      let parsed = this.fileCache.get(file.path)
      if (!parsed || parsed.mtimeMs !== file.mtimeMs || parsed.size !== file.size) {
        try {
          const raw = readFileSync(file.path, 'utf8')
          const fallbackUuid =
            basename(file.path, '.jsonl').match(/([0-9a-f]{8}-[0-9a-f-]{27})$/i)?.[1]
            || basename(file.path, '.jsonl')
          const data = parseCodexRolloutContent(raw, fallbackUuid)
          parsed = {
            mtimeMs: file.mtimeMs,
            size: file.size,
            data,
          }
          this.fileCache.set(file.path, parsed)
        } catch {
          continue
        }
      }

      const { sessionId, cwd, model, turnState, lastStepIndex, transcript: diskTranscript } = parsed.data
      if (!sessionId || this.deletedIds.has(sessionId)) continue
      seenSessionIds.add(sessionId)

      const fullId = `${CODEX_SESSION_PREFIX}${sessionId}`
      const liveThread = this.appServer?.threads.get(sessionId)
      const isAppServerActive = Boolean(
        liveThread && (liveThread.status === 'running' || liveThread.status === 'approval'),
      )
      const isLegacyRunning = this.activeRuns.has(sessionId)
      const isManagedRunning = isAppServerActive || isLegacyRunning
      const isExternallyActive =
        !isManagedRunning && turnState === 'running' && now - file.mtimeMs < 60_000 && externalRunning

      const transcript =
        liveThread && liveThread.transcript.length >= diskTranscript.length
          ? liveThread.transcript.map(({ _itemId, ...rest }, idx) => ({ ...rest, index: idx }))
          : diskTranscript

      let status = 'idle'
      let statusLabel = hasBin ? '🔵 可续聊' : '👀 仅观测'
      let controlMode = hasBin ? 'idle-resumable' : 'observe-only'
      let confidence = 'high'
      let source = 'jsonl-tail'
      let effectiveTurnState = 'idle'
      let runningSummary = ''
      let pendingApproval = null

      if (liveThread?.status === 'approval' && liveThread.pendingApproval) {
        status = 'approval'
        effectiveTurnState = 'approval'
        statusLabel = liveThread.pendingApproval.kind === 'question' ? '⏳ 待你选择' : '⏳ 待你授权'
        controlMode = 'managed'
        source = 'codex-app-server'
        runningSummary = liveThread.runningSummary || ''
        pendingApproval = liveThread.pendingApproval
      } else if (isManagedRunning) {
        status = 'running'
        effectiveTurnState = liveThread?.turnState || 'running'
        statusLabel = '🟢 运行中'
        controlMode = 'managed'
        source = isAppServerActive ? 'codex-app-server' : 'cli-managed'
        runningSummary = liveThread?.runningSummary || '💭 Codex 正在后台思考与执行...'
      } else if (isExternallyActive) {
        status = 'running'
        effectiveTurnState = 'running'
        statusLabel = '👀 终端运行中'
        controlMode = 'observe-only'
        source = 'jsonl-tail'
        confidence = 'medium'
      }

      const firstUser = transcript.find(m => m.role === 'user')
      const lastAssistant = [...transcript].reverse().find(m => m.role === 'assistant')
      const title =
        liveThread?.title
        || titles.get(sessionId)
        || cleanTitle(firstUser?.text)
        || `Codex (${sessionId.slice(0, 8)})`

      const hasConcluded = status === 'idle' && Boolean(lastAssistant?.text)
      const effectiveMtime = Math.max(Math.round(file.mtimeMs), liveThread?.updatedAt || 0)
      const lastConclusionAt = hasConcluded
        ? Math.max(Math.round(file.mtimeMs), liveThread?.lastConclusionAt || 0)
        : 0

      if (status === 'idle' && hasConcluded) {
        effectiveTurnState = 'conclusion'
      }

      results.push({
        id: fullId,
        rawId: sessionId,
        harness: 'codex',
        harnessLabel: 'Codex',
        title,
        status,
        statusLabel,
        turnState: effectiveTurnState,
        runningSummary,
        pendingApproval,
        lastConclusionAt,
        controlMode,
        cwd: liveThread?.cwd || cwd || '',
        model: liveThread?.model || model || 'codex',
        lastActivity: effectiveMtime,
        updatedAt: effectiveMtime,
        lastStepIndex: Math.max(lastStepIndex, transcript.length - 1),
        preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
        transcript,
        stateMeta: {
          source,
          observedAt: effectiveMtime,
          confidence,
        },
      })
    }

    // Include any newly created in-memory app-server threads not yet flushed to disk JSONL
    if (this.appServer?.threads.size > 0) {
      for (const [threadId, liveThread] of this.appServer.threads.entries()) {
        if (seenSessionIds.has(threadId) || this.deletedIds.has(threadId)) continue
        const transcript = liveThread.transcript.map(({ _itemId, ...rest }, idx) => ({ ...rest, index: idx }))
        const firstUser = transcript.find(m => m.role === 'user')
        const lastAssistant = [...transcript].reverse().find(m => m.role === 'assistant')
        const status = liveThread.status || 'idle'
        const isRunningOrApproval = status === 'running' || status === 'approval'
        results.unshift({
          id: `${CODEX_SESSION_PREFIX}${threadId}`,
          rawId: threadId,
          harness: 'codex',
          harnessLabel: 'Codex',
          title: liveThread.title || cleanTitle(firstUser?.text) || `Codex (${threadId.slice(0, 8)})`,
          status,
          statusLabel:
            status === 'approval'
              ? liveThread.pendingApproval?.kind === 'question'
                ? '⏳ 待你选择'
                : '⏳ 待你授权'
              : status === 'running'
                ? '🟢 运行中'
                : '🔵 可续聊',
          turnState: liveThread.turnState || (status === 'running' ? 'thinking' : 'idle'),
          runningSummary: liveThread.runningSummary || '',
          pendingApproval: liveThread.pendingApproval || null,
          lastConclusionAt: liveThread.lastConclusionAt || 0,
          controlMode: isRunningOrApproval ? 'managed' : 'idle-resumable',
          cwd: liveThread.cwd || '',
          model: liveThread.model || 'codex',
          lastActivity: liveThread.updatedAt || now,
          updatedAt: liveThread.updatedAt || now,
          lastStepIndex: Math.max(0, transcript.length - 1),
          preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
          transcript,
          stateMeta: {
            source: 'codex-app-server',
            observedAt: liveThread.updatedAt || now,
            confidence: 'high',
          },
        })
      }
    }

    return results
  }

  async createSession({ title = '', prompt, cwd, model = '', imagePaths = [], execImpl } = {}) {
    const text = String(prompt || '').trim()
    if (!text) return { ok: false, error: '请输入新建任务的指令内容' }
    const bin = this.binaryPath || findCodexBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 codex CLI 可执行文件' }
    }

    if (!runExec && this.shouldUseAppServer()) {
      try {
        return await this.appServer.startNewSession({
          title,
          prompt: text,
          cwd,
          model,
          imagePaths,
        })
      } catch {
        // Fall back to `codex exec` if `app-server` cannot start
      }
    }

    const cleanModel = String(model || '').trim()
    const modelFlags = cleanModel ? ['-m', cleanModel] : []
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const args = ['exec', ...modelFlags, text, ...imgFlags, '--skip-git-repo-check', '--json']
    if (runExec) {
      await runExec(bin || 'codex', args, { cwd: cwd || undefined, timeout: 60_000 })
      return {
        ok: true,
        harness: 'codex',
        message: '已在电脑端启动新的 Codex 任务',
      }
    }
    const child = this.spawnImpl(bin, args, {
      cwd: cwd && existsSync(cwd) ? cwd : homedir(),
      stdio: 'ignore',
      detached: false,
    })
    const runKey = `new-${Date.now()}`
    this.activeRuns.set(runKey, child)
    child.on?.('exit', () => this.activeRuns.delete(runKey))
    child.on?.('error', () => this.activeRuns.delete(runKey))
    return {
      ok: true,
      harness: 'codex',
      message: '已在电脑端启动新的 Codex 后台任务',
    }
  }

  async sendPrompt({ sessionId, text, cwd, model = '', imagePaths = [], mode = 'prompt', execImpl } = {}) {
    const rawId = toRawCodexId(sessionId)
    const prompt = String(text || '').trim()
    if (!prompt) return { ok: false, error: '请输入指令内容' }
    const bin = this.binaryPath || findCodexBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 codex CLI 可执行文件' }
    }

    if (!runExec && this.shouldUseAppServer()) {
      try {
        return await this.appServer.sendOrSteerTurn({
          sessionId: rawId,
          text: prompt,
          cwd,
          model,
          imagePaths,
          mode,
        })
      } catch {
        // Fall back to `codex exec resume` if `app-server` fails
      }
    }

    if (this.activeRuns.has(rawId)) {
      return {
        ok: false,
        busy: true,
        error: '该 Codex 会话正在后台执行上一条指令，请等待本轮完成或先点击停止',
      }
    }
    if (mode === 'steer') {
      return {
        ok: false,
        busy: true,
        error: '当前 Codex CLI 模式不支持运行中途插话（Steer），请等待当前回合完成或先点击停止',
      }
    }

    const cleanModel = String(model || '').trim()
    const modelFlags = cleanModel ? ['-m', cleanModel] : []
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const args = ['exec', 'resume', rawId, ...modelFlags, prompt, ...imgFlags, '--skip-git-repo-check', '--json']
    if (runExec) {
      await runExec(bin || 'codex', args, { cwd: cwd || undefined, timeout: 60_000 })
      return {
        ok: true,
        agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
        message: `已在 Codex 会话 (${rawId.slice(0, 8)}) 中继续执行`,
      }
    }
    const child = this.spawnImpl(bin, args, {
      cwd: cwd && existsSync(cwd) ? cwd : homedir(),
      stdio: 'ignore',
      detached: false,
    })
    this.activeRuns.set(rawId, child)
    child.on?.('exit', () => {
      this.activeRuns.delete(rawId)
    })
    child.on?.('error', () => {
      this.activeRuns.delete(rawId)
    })
    return {
      ok: true,
      agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
      message: `已在 Codex 会话 (${rawId.slice(0, 8)}) 中启动后台续跑`,
    }
  }

  async resolveApproval({ sessionId, code, allow = true, optionIndex = 1, answers = undefined } = {}) {
    if (!this.appServer) {
      return { ok: false, error: 'Codex app-server 未启动，无法响应审批' }
    }
    return this.appServer.resolvePendingApproval({
      sessionId,
      code,
      allow,
      optionIndex,
      answers,
    })
  }

  async stopSession({ sessionId } = {}) {
    const rawId = toRawCodexId(sessionId)
    if (this.appServer) {
      const interrupted = await this.appServer.interruptTurn(rawId)
      if (interrupted) return interrupted
    }
    const child = this.activeRuns.get(rawId)
    if (child && typeof child.kill === 'function') {
      try {
        child.kill('SIGTERM')
      } catch { }
      this.activeRuns.delete(rawId)
      return { ok: true, agentId: sessionId, message: '已中止 Codex 后台任务' }
    }
    return { ok: false, error: '该 Codex 会话当前没有受管运行中的后台进程' }
  }

  async renameSession({ sessionId, title } = {}) {
    const rawId = toRawCodexId(sessionId)
    const clean = cleanTitle(title)
    if (!rawId || !clean) return { ok: false, error: '会话 ID 或新标题不能为空' }
    try {
      mkdirSync(this.codexHome, { recursive: true })
      const indexPath = join(this.codexHome, 'session_index.jsonl')
      appendFileSync(
        indexPath,
        `${JSON.stringify({ id: rawId, thread_name: clean, updated_at: new Date().toISOString() })}\n`,
        'utf8',
      )
      this.indexCache.mtimeMs = 0
    } catch { }
    const live = this.appServer?.threads.get(rawId)
    if (live) live.title = clean
    if (this.appServer?.isConnected()) {
      this.appServer.request('thread/name/set', { threadId: rawId, name: clean }).catch(() => { })
    }
    return { ok: true, title: clean }
  }

  async deleteSession({ sessionId } = {}) {
    const rawId = toRawCodexId(sessionId)
    this.deletedIds.add(rawId)
    this.appServer?.threads.delete(rawId)
    return { ok: true }
  }
}
