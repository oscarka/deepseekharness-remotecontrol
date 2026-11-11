import fs from 'node:fs'
import os from 'node:os'
import net from 'node:net'
import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import { execFile, execFileSync, spawn as cpSpawn } from 'node:child_process'
import { decorateTaskMetadata, DEFAULT_HARNESS_CAPABILITIES } from '../harness-router.js'

export const WORKBUDDY_SESSION_PREFIX = 'workbuddy:'
const MAX_TRANSCRIPT_MESSAGES = 80

export function isWorkBuddySessionId(sessionId = '') {
  return String(sessionId || '').startsWith(WORKBUDDY_SESSION_PREFIX)
}

export function toRawWorkBuddyId(sessionId = '') {
  const value = String(sessionId || '')
  return value.startsWith(WORKBUDDY_SESSION_PREFIX)
    ? value.slice(WORKBUDDY_SESSION_PREFIX.length)
    : value
}

function truncateText(text = '', maxLen = 1600) {
  const normalized = String(text || '').trim()
  if (!normalized) return ''
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized
}

function safeJsonParse(raw = '') {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getWorkBuddyHome(overrideDir = '') {
  if (overrideDir) return path.resolve(overrideDir)
  if (process.env.WORKBUDDY_CONFIG_DIR) return path.resolve(process.env.WORKBUDDY_CONFIG_DIR)
  if (process.env.CODEBUDDY_CONFIG_DIR) return path.resolve(process.env.CODEBUDDY_CONFIG_DIR)
  const wbDir = path.join(os.homedir(), '.workbuddy')
  const cbDir = path.join(os.homedir(), '.codebuddy')
  try {
    if (!fs.existsSync(wbDir) && fs.existsSync(cbDir)) return cbDir
  } catch {
    // ignore
  }
  return wbDir
}

export function getWorkBuddySidecarSocketPath(workbuddyHome = getWorkBuddyHome()) {
  try {
    const endpointFile = path.join(workbuddyHome, 'wbipc', 'endpoint.json')
    if (fs.existsSync(endpointFile)) {
      const parsed = safeJsonParse(fs.readFileSync(endpointFile, 'utf8'))
      const ep = typeof parsed?.endpoint === 'string' ? parsed.endpoint.trim() : ''
      if (ep && (ep.startsWith('\\\\.\\pipe\\') || fs.existsSync(ep))) {
        return ep
      }
    }
  } catch {
    // ignore wbipc/endpoint.json read errors
  }

  if (process.platform === 'win32') {
    const hash = crypto
      .createHash('sha1')
      .update(path.resolve(workbuddyHome))
      .digest('hex')
      .slice(0, 16)
    return `\\\\.\\pipe\\workbuddy-sidecar-${hash}`
  }
  const uid = typeof process.getuid === 'function' ? String(process.getuid()) : (process.env.USER || 'default')
  const userHash = crypto.createHash('sha1').update(uid).digest('hex').slice(0, 6)
  const dirHash = crypto.createHash('sha1').update(path.resolve(workbuddyHome)).digest('hex').slice(0, 12)
  const exactPath = path.join(os.tmpdir(), `wb-${userHash}`, dirHash, 'sidecar.sock')
  try {
    if (fs.existsSync(exactPath)) return exactPath
    for (const rootTmp of new Set([os.tmpdir(), '/tmp'])) {
      if (!fs.existsSync(rootTmp)) continue
      const wbDirs = fs.readdirSync(rootTmp).filter(name => name.startsWith(`wb-${userHash}`) || name.startsWith('wb-'))
      for (const wbDir of wbDirs) {
        const wbFull = path.join(rootTmp, wbDir)
        const subDirs = fs.readdirSync(wbFull)
        for (const sub of subDirs) {
          const subFull = path.join(wbFull, sub)
          const candidate = path.join(subFull, 'sidecar.sock')
          if (fs.existsSync(candidate)) return candidate
          try {
            const sidecarSocks = fs
              .readdirSync(subFull)
              .filter(f => /^sidecar(-[a-z0-9]+)?\.sock$/i.test(f))
            if (sidecarSocks.length > 0) return path.join(subFull, sidecarSocks[0])
          } catch {
            // ignore non-directory entries
          }
          const wbipcDir = path.join(subFull, 'wbipc')
          if (fs.existsSync(wbipcDir)) {
            const socks = fs.readdirSync(wbipcDir).filter(f => f.endsWith('.sock'))
            if (socks.length > 0) return path.join(wbipcDir, socks[0])
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return exactPath
}

export function findWorkBuddyBinary() {
  const home = os.homedir()
  const candidates = [
    process.env.WORKBUDDY_BIN,
    process.env.CODEBUDDY_BIN,
    '/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy',
    path.join(home, 'Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy'),
    '/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy-lowmem',
    path.join(home, 'Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy-lowmem'),
    '/Applications/WorkBuddy.app/Contents/Resources/app/node_modules/@tencent/codebuddy-cli/bin/codebuddy',
    '/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/node_modules/@tencent/codebuddy-cli/bin/codebuddy',
    path.join(home, 'Applications/WorkBuddy.app/Contents/Resources/app/node_modules/@tencent/codebuddy-cli/bin/codebuddy'),
    path.join(home, 'Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/node_modules/@tencent/codebuddy-cli/bin/codebuddy'),
    '/Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy',
    path.join(home, 'Applications/WorkBuddy.app/Contents/MacOS/WorkBuddy'),
    path.join(home, '.workbuddy', 'bin', 'codebuddy'),
    path.join(home, '.codebuddy', 'bin', 'codebuddy'),
    '/opt/homebrew/bin/codebuddy',
    '/usr/local/bin/codebuddy',
    '/usr/bin/codebuddy',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // ignore
    }
  }

  for (const binName of ['codebuddy', 'workbuddy']) {
    try {
      const resolved = execFileSync(process.platform === 'win32' ? 'where' : 'which', [binName], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1500,
      }).trim().split(/\r?\n/)[0]
      if (resolved && fs.existsSync(resolved)) return resolved
    } catch {
      // ignore
    }
  }
  return ''
}

const DEFAULT_WORKBUDDY_MODELS = [
  { value: 'auto', label: 'Auto (WorkBuddy 智能路由)', default: true },
  { value: 'deepseek-v3-2-volc', label: 'DeepSeek V3.2 (Volc)' },
  { value: 'kimi-k2.5', label: 'Kimi K2.5' },
  { value: 'glm-5.1', label: 'GLM-5.1' },
  { value: 'glm-5.0', label: 'GLM-5.0' },
  { value: 'glm-5.0-turbo', label: 'GLM-5.0 Turbo' },
  { value: 'glm-5v-turbo', label: 'GLM-5V Turbo' },
  { value: 'minimax-m2.7', label: 'MiniMax M2.7' },
  { value: 'fast-model', label: 'Fast Model (WorkBuddy 极速)' },
  { value: 'deepseek-v3.1', label: 'DeepSeek V3.1 (WorkBuddy)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'hunyuan-turbos', label: 'Hunyuan TurboS' },
]

export function discoverWorkBuddyModels(workbuddyHome = getWorkBuddyHome()) {
  const models = []
  const seen = new Set()
  let defaultModel = ''

  const addModel = (val, label = '', isDefault = false) => {
    const cleanVal = String(val || '').trim()
    if (!cleanVal || seen.has(cleanVal)) return
    seen.add(cleanVal)
    models.push({
      id: cleanVal,
      value: cleanVal,
      label: String(label || cleanVal).trim(),
      ...(isDefault ? { default: true } : {}),
    })
  }

  try {
    const configCandidates = [
      path.join(workbuddyHome, 'config.json'),
      path.join(workbuddyHome, 'settings.json'),
      path.join(workbuddyHome, 'models.json'),
      path.join(os.homedir(), '.codebuddy', 'config.json'),
    ]
    for (const cfgPath of configCandidates) {
      if (!fs.existsSync(cfgPath)) continue
      const parsed = safeJsonParse(fs.readFileSync(cfgPath, 'utf8'))
      if (!parsed || typeof parsed !== 'object') continue
      if (!Array.isArray(parsed) && typeof parsed.model === 'string' && parsed.model.trim()) {
        defaultModel = parsed.model.trim()
        addModel(defaultModel, `${defaultModel}`, true)
      }
      const modelEntries = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed.models) ? parsed.models : [])
      for (const entry of modelEntries) {
        if (typeof entry === 'string') addModel(entry, entry)
        else if (entry && typeof entry === 'object') {
          addModel(
            entry.id || entry.value || entry.model || entry.slug,
            entry.label || entry.displayName || entry.name,
            Boolean(entry.default),
          )
        }
      }
    }
  } catch {
    // ignore config read errors
  }

  for (const fallback of DEFAULT_WORKBUDDY_MODELS) {
    addModel(fallback.value, fallback.label, !defaultModel && Boolean(fallback.default))
  }

  if (!defaultModel && models.length > 0) {
    defaultModel = models[0].value
    models[0].default = true
  }
  const matched = models.find(m => m.value === defaultModel) || models[0]
  return {
    defaultModel: defaultModel || 'auto',
    defaultLabel: matched ? `${matched.label} (默认)` : 'Auto (WorkBuddy 智能路由) (默认)',
    models,
  }
}

export function isWorkBuddyAuthError(err) {
  const msg = String(err?.message || err || '')
  if (err?.data?.category === 'auth') return true
  return /authentication required|\/login\b|not logged in|please sign in|unauthorized/i.test(msg)
}

export function formatWorkBuddyAuthError(binaryPath = '', workbuddyHome = getWorkBuddyHome()) {
  const bin = binaryPath || '/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/cli/bin/codebuddy'
  const loginCmd = `CODEBUDDY_FORCE_LITE_WB_BUNDLE=1 WORKBUDDY_CONFIG_DIR="${workbuddyHome}" CODEBUDDY_CONFIG_DIR="${workbuddyHome}" "${bin}"`
  return `WorkBuddy CLI 尚未登录账号（桌面端加密凭证不与独立 CLI 共享）。请在电脑终端运行一次：${loginCmd} 并输入 /login 完成授权登录，之后无需重启即可直接在手机发送消息。`
}

export function queryWorkBuddySidecar(socketPath, method, params = {}, timeoutMs = 1500) {
  return new Promise(resolve => {
    if (!socketPath || (!socketPath.startsWith('\\\\.\\pipe\\') && !fs.existsSync(socketPath))) {
      resolve(null)
      return
    }
    const baseName = path.basename(socketPath)
    if (socketPath.includes(`${path.sep}wbipc${path.sep}`) || /^b-[a-f0-9]+\.sock$/i.test(baseName)) {
      // wbipc sockets speak Electron renderer wbipc protocol, not sidecar JSON-RPC
      resolve(null)
      return
    }
    const reqId = `wb-rpc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    let buffer = ''
    let settled = false

    const finish = val => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        socket.destroy()
      } catch {
        // ignore
      }
      resolve(val)
    }

    const socket = net.createConnection(socketPath, () => {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: reqId,
        method,
        params,
      })
      socket.write(`${payload}\n`)
    })

    const timer = setTimeout(() => finish(null), timeoutMs)

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const msg = safeJsonParse(trimmed)
        if (msg && msg.id === reqId) {
          if (msg.error) finish(null)
          else finish(msg.result ?? null)
          return
        }
      }
    })

    socket.on('error', () => finish(null))
    socket.on('end', () => finish(null))
  })
}

export function cleanWorkBuddyUserText(rawText = '') {
  const raw = String(rawText || '')
  if (!raw) return ''
  const withoutReminder = raw.replace(/<system-reminder[\s\S]*?<\/system-reminder>/gi, '').trim()
  const queryMatch = withoutReminder.match(/<user_query>([\s\S]*?)<\/user_query>/i)
  if (queryMatch) return queryMatch[1].trim()
  return withoutReminder.replace(/<\/?user_query>/gi, '').trim()
}

function extractTextFromAcpContent(content) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (!part) return ''
        if (typeof part === 'string') return part
        if (part.type === 'thinking' || part.type === 'reasoning' || part.type === 'tool_use' || part.type === 'tool_call' || part.type === 'function_call') {
          return ''
        }
        return extractTextFromAcpContent(part)
      })
      .filter(Boolean)
      .join('\n')
  }
  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text
    if (content.content) return extractTextFromAcpContent(content.content)
  }
  return ''
}

export function parseWorkBuddyReplayEvents(events = []) {
  const transcript = []
  const recentActivity = []
  let lastProgress = ''
  let aiTitle = ''
  let cwd = ''

  const ensureAssistantMsg = timeMs => {
    const last = transcript.at(-1)
    if (last && last.role === 'assistant') return last
    const msg = {
      index: transcript.length,
      role: 'assistant',
      text: '',
      thinking: '',
      tools: [],
      toolCalls: [],
      time: timeMs || Date.now(),
    }
    transcript.push(msg)
    return msg
  }

  for (const item of events) {
    if (!item || typeof item !== 'object') continue
    if (typeof item.cwd === 'string' && item.cwd.trim() && !cwd) {
      cwd = item.cwd.trim()
    }
    if (item.type === 'ai-title' && typeof item.aiTitle === 'string' && item.aiTitle.trim()) {
      aiTitle = item.aiTitle.trim()
      continue
    }
    const update = item.update || item.params?.update || item
    const tag = update.sessionUpdate || update.type || item.type || ''
    const ts = item.timestamp
      ? (typeof item.timestamp === 'number' ? item.timestamp : (Number(new Date(item.timestamp)) || Date.now()))
      : Date.now()
    const iso = new Date(ts).toISOString()

    if (tag === 'user_message_chunk' || tag === 'user_message' || item.role === 'user') {
      const rawText = extractTextFromAcpContent(update.content ?? update.text ?? item.content ?? item.text)
      const text = cleanWorkBuddyUserText(rawText)
      if (!text) continue
      const prev = transcript.at(-1)
      if (prev && prev.role === 'user' && tag === 'user_message_chunk') {
        prev.text = `${prev.text}${text}`
      } else {
        transcript.push({
          index: transcript.length,
          role: 'user',
          text,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: ts,
        })
      }
      recentActivity.push({ role: 'user', text: truncateText(text, 1600), at: iso })
    } else if (tag === 'agent_message_chunk' || tag === 'agent_message' || item.role === 'assistant') {
      const rawContent = update.content ?? update.text ?? item.content ?? item.text
      if (Array.isArray(rawContent)) {
        for (const part of rawContent) {
          if (!part || typeof part !== 'object') continue
          if (part.type === 'thinking' || part.type === 'reasoning') {
            const thoughtText = String(part.thinking || part.text || '').trim()
            if (thoughtText) {
              const msg = ensureAssistantMsg(ts)
              msg.thinking = msg.thinking ? `${msg.thinking}\n${thoughtText}` : thoughtText
              msg.time = ts
              recentActivity.push({ role: 'thought', text: truncateText(msg.thinking, 1600), at: iso })
            }
          } else if (part.type === 'tool_use' || part.type === 'tool_call' || part.type === 'function_call') {
            const title = part.name || part.title || part.toolName || 'Tool Call'
            const msg = ensureAssistantMsg(ts)
            if (!msg.tools.includes(title)) msg.tools.push(title)
            msg.toolCalls.push({
              name: title,
              argsSummary: String(part.input?.command || part.arguments || part.title || '').slice(0, 120),
            })
            recentActivity.push({ role: 'tool', text: `Running ${title}`, at: iso })
            lastProgress = `Running ${title}`
          }
        }
      }
      const text = extractTextFromAcpContent(rawContent)
      if (!text) continue
      const msg = ensureAssistantMsg(ts)
      if (tag === 'agent_message_chunk') {
        msg.text = `${msg.text || ''}${text}`
      } else {
        msg.text = msg.text ? `${msg.text}\n\n${text}` : text
      }
      msg.time = ts
      lastProgress = truncateText(msg.text, 260)
      const prevAct = recentActivity.at(-1)
      if (prevAct && prevAct.role === 'assistant') {
        prevAct.text = truncateText(msg.text, 1600)
        prevAct.at = iso
      } else {
        recentActivity.push({ role: 'assistant', text: truncateText(msg.text, 1600), at: iso })
      }
    } else if (tag === 'agent_thought_chunk' || tag === 'agent_thought' || item.role === 'thought') {
      const text = extractTextFromAcpContent(update.content ?? update.text ?? item.content ?? item.text)
      if (!text) continue
      const msg = ensureAssistantMsg(ts)
      msg.thinking = `${msg.thinking || ''}${text}`
      msg.time = ts
      const prevAct = recentActivity.at(-1)
      if (prevAct && prevAct.role === 'thought') {
        prevAct.text = truncateText(msg.thinking, 1600)
        prevAct.at = iso
      } else {
        recentActivity.push({ role: 'thought', text: truncateText(msg.thinking, 1600), at: iso })
      }
    } else if (tag === 'tool_call') {
      const title = update.title || update.toolName || update.kind || 'Tool Call'
      const msg = ensureAssistantMsg(ts)
      if (!msg.tools.includes(title)) msg.tools.push(title)
      msg.toolCalls.push({
        name: title,
        argsSummary: String(update.rawInput?.command || update.title || '').slice(0, 120),
      })
      recentActivity.push({ role: 'tool', text: `Running ${title}`, at: iso })
      lastProgress = `Running ${title}`
    } else if (tag === 'tool_call_update') {
      if (update.status === 'completed' || update.status === 'failed') {
        const title = update.title || update.toolName || update.kind || 'tool'
        recentActivity.push({
          role: 'tool',
          text: `${update.status === 'failed' ? 'Failed' : 'Completed'}: ${title}`,
          at: iso,
        })
      }
    }
  }

  return {
    transcript: transcript.slice(-MAX_TRANSCRIPT_MESSAGES).map((m, idx) => ({ ...m, index: idx })),
    recentActivity: recentActivity.slice(-MAX_TRANSCRIPT_MESSAGES),
    lastProgress,
    aiTitle,
    cwd,
  }
}

/**
 * HTTP + SSE ACP (Agent Client Protocol) client for WorkBuddy / CodeBuddy.
 */
export class WorkBuddyAcpClient extends EventEmitter {
  constructor(options = {}) {
    super()
    this.acpEndpoint = String(options.acpEndpoint || '').replace(/\/+$/, '')
    this.fetchImpl = options.fetchImpl || globalThis.fetch
    this.openSseImpl = options.openSseImpl || null
    this.connectionId = ''
    this.sessionToken = ''
    this.connected = false
    this.nextId = 1
    this.sseReq = null
  }

  async connect() {
    if (this.connected && this.connectionId) return
    if (!this.acpEndpoint) {
      throw new Error('WorkBuddy ACP endpoint is not configured')
    }

    const res = await this.fetchImpl(`${this.acpEndpoint}/connect`, {
      method: 'POST',
      headers: {
        'x-codebuddy-request': '1',
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`WorkBuddy /connect failed with HTTP ${res.status}`)
    }
    const data = await res.json()
    const payload = data?.data || data || {}
    this.connectionId = payload.connectionId || `wb-conn-${Date.now()}`
    this.sessionToken = payload.sessionToken || ''
    this.connected = true

    this._startSseStream()

    await this.request('initialize', {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true,
      },
      clientInfo: {
        name: 'deepseekharness-hub',
        title: 'DeepSeekHarness Hub',
        version: '0.5.1',
      },
    })
  }

  _startSseStream() {
    if (typeof this.openSseImpl === 'function') {
      this.sseReq = this.openSseImpl({
        acpEndpoint: this.acpEndpoint,
        connectionId: this.connectionId,
        sessionToken: this.sessionToken,
        onPayload: payload => this._handleSsePayload(payload),
      })
      return
    }

    try {
      const url = new URL(this.acpEndpoint)
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 80,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'x-codebuddy-request': '1',
            'acp-connection-id': this.connectionId,
            ...(this.sessionToken ? { 'acp-session-token': this.sessionToken } : {}),
          },
        },
        res => {
          res.setEncoding('utf8')
          let buffer = ''
          res.on('data', chunk => {
            buffer += chunk
            buffer = this._parseSseBlocksFromBuffer(buffer, parsed => this._handleSsePayload(parsed))
          })
          res.on('end', () => {
            this.connected = false
            this.emit('close')
          })
          res.on('error', err => {
            this.connected = false
            if (this.listenerCount('error') > 0) this.emit('error', err)
          })
        },
      )
      req.on('error', err => {
        this.connected = false
        if (this.listenerCount('error') > 0) this.emit('error', err)
      })
      req.end()
      this.sseReq = req
    } catch {
      // ignore SSE stream startup errors in headless test environments
    }
  }

  _parseSseBlocksFromBuffer(buffer, onMessage) {
    const blocks = buffer.split(/\r?\n\r?\n/)
    const rest = blocks.pop() || ''
    for (const block of blocks) {
      const dataLines = block
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
      if (!dataLines.length) continue
      const rawData = dataLines.join('\n').trim()
      if (!rawData) continue
      const parsed = safeJsonParse(rawData)
      if (parsed) onMessage(parsed)
    }
    return rest
  }

  _handleSsePayload(msg) {
    if (!msg || typeof msg !== 'object') return
    if (msg.id !== undefined && msg.method) {
      this.emit('serverRequest', msg)
      return
    }
    if (msg.method) {
      this.emit('notification', msg)
    }
  }

  async request(method, params = {}) {
    const id = this.nextId++
    const body = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }
    const res = await this.fetchImpl(this.acpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'x-codebuddy-request': '1',
        ...(this.connectionId ? { 'acp-connection-id': this.connectionId } : {}),
        ...(this.sessionToken ? { 'acp-session-token': this.sessionToken } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      let detail = ''
      try {
        detail = (await res.text()).trim().slice(0, 240)
      } catch {
        // ignore
      }
      throw new Error(`WorkBuddy RPC ${method} failed with HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
    }

    let gotRpcResponse = false
    let rpcResult = undefined
    let rpcError = null

    const handleMessage = msg => {
      if (!msg || typeof msg !== 'object') return
      if (msg.id === id && !msg.method) {
        gotRpcResponse = true
        if (msg.error) {
          const err = new Error(msg.error.message || JSON.stringify(msg.error))
          err.code = msg.error.code
          err.data = msg.error.data
          rpcError = err
        } else {
          rpcResult = msg.result !== undefined ? msg.result : msg
        }
        return
      }
      this._handleSsePayload(msg)
    }

    const contentType = String(res.headers?.get?.('content-type') || '').toLowerCase()
    if (contentType.includes('text/event-stream') && res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            if (buffer.trim()) {
              this._parseSseBlocksFromBuffer(`${buffer}\n\n`, handleMessage)
            }
            break
          }
          buffer += decoder.decode(value, { stream: true })
          buffer = this._parseSseBlocksFromBuffer(buffer, handleMessage)
          if (gotRpcResponse) {
            try {
              await reader.cancel()
            } catch {
              // ignore reader cancel errors
            }
            break
          }
        }
      } finally {
        try {
          reader.releaseLock?.()
        } catch {
          // ignore
        }
      }
      if (rpcError) throw rpcError
      return rpcResult ?? {}
    }

    const text = await res.text()
    if (!text.trim()) return {}
    const parsed = safeJsonParse(text)
    if (parsed) {
      if (parsed.error) {
        const err = new Error(parsed.error.message || JSON.stringify(parsed.error))
        err.code = parsed.error.code
        err.data = parsed.error.data
        throw err
      }
      return parsed.result !== undefined ? parsed.result : parsed
    }

    this._parseSseBlocksFromBuffer(`${text}\n\n`, handleMessage)
    if (rpcError) throw rpcError
    if (gotRpcResponse) return rpcResult ?? {}
    return {}
  }

  async respond(id, result = {}) {
    const body = {
      jsonrpc: '2.0',
      id,
      result,
    }
    await this.fetchImpl(this.acpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'x-codebuddy-request': '1',
        ...(this.connectionId ? { 'acp-connection-id': this.connectionId } : {}),
        ...(this.sessionToken ? { 'acp-session-token': this.sessionToken } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  close() {
    this.connected = false
    if (this.sseReq && typeof this.sseReq.destroy === 'function') {
      try {
        this.sseReq.destroy()
      } catch {
        // ignore
      }
    }
    this.sseReq = null
  }
}

export class WorkBuddyAdapter {
  constructor(options = {}) {
    this.id = 'workbuddy'
    this.label = 'WorkBuddy'
    this.icon = '🐼'
    this.workbuddyHome = getWorkBuddyHome(options.workbuddyHome)
    this.binaryPath = options.binaryPath !== undefined ? options.binaryPath : findWorkBuddyBinary()
    this.sidecarSocketPath = options.sidecarSocketPath || getWorkBuddySidecarSocketPath(this.workbuddyHome)
    this.hasExplicitEndpoint = Boolean(options.acpEndpoint || process.env.WORKBUDDY_ACP_ENDPOINT)
    this.defaultEndpoint = options.acpEndpoint || process.env.WORKBUDDY_ACP_ENDPOINT || ''
    this.fetchImpl = options.fetchImpl || globalThis.fetch
    this.openSseImpl = options.openSseImpl || null
    this.querySidecarImpl = options.querySidecarImpl || queryWorkBuddySidecar
    this.queryDbImpl = options.queryDbImpl || null
    this.spawnImpl = options.spawnImpl || cpSpawn
    this.logger = options.logger || null
    this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null
    this.runtimeSessions = new Map()
    this.clientsByEndpoint = new Map()
    this.pendingApprovalsByCode = new Map()
    this.deletedIds = new Set()
    this.spawnedServeProc = null
    this.spawnedEndpoint = ''
  }

  _formatError(err) {
    if (isWorkBuddyAuthError(err)) {
      return formatWorkBuddyAuthError(this.binaryPath, this.workbuddyHome)
    }
    return String(err?.message || err || 'Unknown WorkBuddy error')
  }

  _resetSpawnedServe() {
    const deadEndpoint = this.spawnedEndpoint
    for (const client of this.clientsByEndpoint.values()) {
      client.close()
    }
    this.clientsByEndpoint.clear()
    if (!this.hasExplicitEndpoint) {
      this.defaultEndpoint = ''
    }
    if (deadEndpoint) {
      for (const entry of this.runtimeSessions.values()) {
        if (entry.acpEndpoint === deadEndpoint) {
          entry.acpEndpoint = ''
        }
      }
    }
    this.spawnedEndpoint = ''
    if (this.spawnedServeProc && typeof this.spawnedServeProc.kill === 'function') {
      try {
        this.spawnedServeProc.kill()
      } catch {
        // ignore
      }
      this.spawnedServeProc = null
    }
  }

  isAvailable() {
    try {
      if (this.binaryPath || this.defaultEndpoint) return true
      if (fs.existsSync(this.workbuddyHome)) return true
      if (this.sidecarSocketPath && !this.sidecarSocketPath.startsWith('\\\\.\\pipe\\') && fs.existsSync(this.sidecarSocketPath)) return true
    } catch {
      // ignore
    }
    return false
  }

  getCapabilities() {
    const installed = this.isAvailable()
    return {
      canView: true,
      canCreateSession: installed,
      canPrompt: installed,
      canSteer: installed,
      canStop: true,
      canApprove: installed,
      approvalStatus: installed ? 'supported' : 'planned',
    }
  }

  getModelCatalog() {
    return discoverWorkBuddyModels(this.workbuddyHome)
  }

  async detectHealth() {
    const installed = this.isAvailable()
    const hasSidecar = Boolean(
      this.defaultEndpoint ||
      (this.sidecarSocketPath && !this.sidecarSocketPath.startsWith('\\\\.\\pipe\\') && fs.existsSync(this.sidecarSocketPath)),
    )
    return {
      installed,
      hasBinary: Boolean(this.binaryPath),
      binaryPath: this.binaryPath || '',
      attachedDesktop: hasSidecar,
      workbuddyHome: this.workbuddyHome,
    }
  }

  getHarnessDescriptor() {
    const installed = this.isAvailable()
    const hasSidecar = Boolean(
      this.defaultEndpoint ||
      (this.sidecarSocketPath && !this.sidecarSocketPath.startsWith('\\\\.\\pipe\\') && fs.existsSync(this.sidecarSocketPath)),
    )
    const catalog = discoverWorkBuddyModels(this.workbuddyHome)
    return {
      id: 'workbuddy',
      label: 'WorkBuddy',
      installed,
      status: installed ? 'ready' : 'missing',
      binaryPath: this.binaryPath || null,
      workbuddyHome: this.workbuddyHome,
      protocol: 'acp-http-sse',
      attachedDesktop: hasSidecar,
      capabilities: { ...DEFAULT_HARNESS_CAPABILITIES.workbuddy },
      models: catalog.models,
      modelCatalog: catalog,
    }
  }

  _ensureRuntimeEntry(rawId, defaults = {}) {
    let entry = this.runtimeSessions.get(rawId)
    const now = Date.now()
    if (!entry) {
      entry = {
        rawId,
        id: `${WORKBUDDY_SESSION_PREFIX}${rawId}`,
        title: defaults.title || `WorkBuddy (${String(rawId).slice(0, 8)})`,
        cwd: defaults.cwd || process.cwd(),
        model: defaults.model || '',
        status: defaults.status || 'idle',
        turnState: defaults.turnState || 'idle',
        runningSummary: defaults.runningSummary || '',
        createdAt: defaults.createdAt || now,
        updatedAt: defaults.updatedAt || now,
        lastReplayUpdatedAt: 0,
        lastProgress: defaults.lastProgress || 'Ready in WorkBuddy',
        transcript: Array.isArray(defaults.transcript) ? [...defaults.transcript] : [],
        recentActivity: Array.isArray(defaults.recentActivity) ? [...defaults.recentActivity] : [],
        pendingApproval: null,
        acpEndpoint: defaults.acpEndpoint || this.defaultEndpoint || '',
        assistantBuffer: '',
        thoughtBuffer: '',
        isLoadingSession: false,
        onFirstProgress: null,
      }
      this.runtimeSessions.set(rawId, entry)
    } else {
      if (defaults.title && (!entry.title || entry.title.startsWith('WorkBuddy (') || !defaults.title.startsWith('WorkBuddy ('))) {
        entry.title = defaults.title
      }
      if (defaults.cwd && !entry.cwd) entry.cwd = defaults.cwd
      if (defaults.model && !entry.model) entry.model = defaults.model
      if (defaults.acpEndpoint && !entry.acpEndpoint) entry.acpEndpoint = defaults.acpEndpoint
      if (defaults.updatedAt && defaults.updatedAt > (entry.updatedAt || 0)) {
        entry.updatedAt = defaults.updatedAt
      }
    }
    return entry
  }

  _appendUserMessage(entry, text) {
    const clean = String(text || '').trim()
    if (!clean) return
    const now = Date.now()
    entry.transcript.push({
      index: entry.transcript.length,
      role: 'user',
      text: clean,
      thinking: '',
      tools: [],
      toolCalls: [],
      time: now,
    })
    if (entry.transcript.length > MAX_TRANSCRIPT_MESSAGES) {
      entry.transcript.splice(0, entry.transcript.length - MAX_TRANSCRIPT_MESSAGES)
    }
    entry.recentActivity.push({
      role: 'user',
      text: truncateText(clean, 1600),
      at: new Date(now).toISOString(),
    })
    entry.updatedAt = now
  }

  _ensureAssistantMessage(entry) {
    const now = Date.now()
    const last = entry.transcript.at(-1)
    if (last && last.role === 'assistant') return last
    const msg = {
      index: entry.transcript.length,
      role: 'assistant',
      text: '',
      thinking: '',
      tools: [],
      toolCalls: [],
      time: now,
    }
    entry.transcript.push(msg)
    return msg
  }

  _upsertStreamingActivity(entry, role, fullText) {
    const normalized = truncateText(fullText, 1600)
    if (!normalized) return
    const now = Date.now()
    const iso = new Date(now).toISOString()
    const last = entry.recentActivity.at(-1)
    if (last && last.role === role && last.streaming) {
      last.text = normalized
      last.at = iso
    } else {
      entry.recentActivity.push({
        role,
        text: normalized,
        at: iso,
        streaming: true,
      })
      if (entry.recentActivity.length > MAX_TRANSCRIPT_MESSAGES) {
        entry.recentActivity.splice(0, entry.recentActivity.length - MAX_TRANSCRIPT_MESSAGES)
      }
    }
    entry.updatedAt = now
  }

  _finalizeStreamingActivities(entry) {
    for (const act of entry.recentActivity) {
      if (act.streaming) delete act.streaming
    }
    entry.assistantBuffer = ''
    entry.thoughtBuffer = ''
  }

  async _getClientForEndpoint(acpEndpoint) {
    const targetEndpoint = acpEndpoint || this.defaultEndpoint || (await this._resolveDefaultAcpEndpoint())
    if (!targetEndpoint) {
      throw new Error('WorkBuddy ACP 服务未启动，请先打开 WorkBuddy 桌面端或安装 codebuddy CLI')
    }
    let client = this.clientsByEndpoint.get(targetEndpoint)
    if (client && client.connected) return client

    client = new WorkBuddyAcpClient({
      acpEndpoint: targetEndpoint,
      fetchImpl: this.fetchImpl,
      openSseImpl: this.openSseImpl,
    })
    this._bindClientEvents(client)
    try {
      await client.connect()
      this.clientsByEndpoint.set(targetEndpoint, client)
      return client
    } catch (err) {
      client.close()
      this.clientsByEndpoint.delete(targetEndpoint)
      throw err
    }
  }

  async _resolveDefaultAcpEndpoint() {
    if (this.defaultEndpoint) return this.defaultEndpoint

    try {
      const sidecarList = await this.querySidecarImpl(this.sidecarSocketPath, 'session.list', {})
      if (sidecarList?.acpEndpoint && typeof sidecarList.acpEndpoint === 'string') {
        this.defaultEndpoint = sidecarList.acpEndpoint
        return sidecarList.acpEndpoint
      }
      const sessions = Array.isArray(sidecarList) ? sidecarList : (sidecarList?.sessions || [])
      for (const s of sessions) {
        if (s?.acpEndpoint) {
          this.defaultEndpoint = s.acpEndpoint
          return s.acpEndpoint
        }
      }
    } catch {
      // ignore
    }

    if (this.binaryPath && typeof this.spawnImpl === 'function') {
      const port = 43820 + Math.floor(Math.random() * 1000)
      const endpoint = `http://127.0.0.1:${port}/api/v1/acp`
      try {
        this.logger?.log?.(`[dsh-feishu] 🐼 Spawning WorkBuddy ACP server on 127.0.0.1:${port}...`)
        const proc = this.spawnImpl(
          this.binaryPath,
          ['--serve', '--port', String(port), '--auth', 'none'],
          {
            cwd: process.cwd(),
            env: {
              ...process.env,
              CODEBUDDY_FORCE_LITE_WB_BUNDLE: '1',
              CODEBUDDY_CONFIG_DIR: this.workbuddyHome,
              WORKBUDDY_CONFIG_DIR: this.workbuddyHome,
            },
            stdio: 'ignore',
            detached: true,
          },
        )
        proc?.on?.('error', () => {})
        if (proc && typeof proc.unref === 'function') proc.unref()
        this.spawnedServeProc = proc
        this.spawnedEndpoint = endpoint
        if (this.spawnImpl === cpSpawn && this.fetchImpl === globalThis.fetch) {
          await new Promise(resolve => {
            let attempts = 0
            const tryConnect = () => {
              attempts++
              const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
                sock.destroy()
                resolve()
              })
              sock.on('error', () => {
                sock.destroy()
                if (attempts >= 60) resolve()
                else setTimeout(tryConnect, 150)
              })
            }
            tryConnect()
          })
        }
        this.defaultEndpoint = endpoint
        return endpoint
      } catch {
        // ignore spawn errors
      }
    }

    return ''
  }

  _bindClientEvents(client) {
    client.on('error', () => {
      client.connected = false
    })
    client.on('close', () => {
      client.connected = false
    })
    client.on('notification', msg => {
      const { method, params = {} } = msg
      if (method !== 'session/update') return
      const rawId = params.sessionId ? toRawWorkBuddyId(params.sessionId) : ''
      if (!rawId) return
      const entry = this._ensureRuntimeEntry(rawId, { acpEndpoint: client.acpEndpoint })
      const update = params.update || {}
      const tag = update.sessionUpdate || update.type || ''

      if (tag === 'session_info_update' && update.title) {
        entry.title = String(update.title).trim()
        entry.updatedAt = Date.now()
        this.onStateChange?.()
        return
      }

      if (entry.isLoadingSession) {
        // Ignore historical replay chunks emitted during session/load; transcript is already loaded from JSONL/replay
        return
      }

      if (tag === 'agent_message_chunk') {
        const delta = extractTextFromAcpContent(update.content ?? update.text)
        if (delta) {
          entry.assistantBuffer = `${entry.assistantBuffer || ''}${delta}`
          const msgObj = this._ensureAssistantMessage(entry)
          msgObj.text = entry.assistantBuffer
          msgObj.time = Date.now()
          entry.lastProgress = truncateText(entry.assistantBuffer, 260)
          entry.runningSummary = '✍️ WorkBuddy 正在生成回复...'
          if (entry.status !== 'approval') {
            entry.status = 'running'
            entry.turnState = 'thinking'
          }
          this._upsertStreamingActivity(entry, 'assistant', entry.assistantBuffer)
          entry.onFirstProgress?.()
          this.onStateChange?.()
        }
      } else if (tag === 'agent_thought_chunk') {
        const delta = extractTextFromAcpContent(update.content ?? update.text)
        if (delta) {
          entry.thoughtBuffer = `${entry.thoughtBuffer || ''}${delta}`
          const msgObj = this._ensureAssistantMessage(entry)
          msgObj.thinking = entry.thoughtBuffer
          msgObj.time = Date.now()
          entry.lastProgress = `Thinking: ${truncateText(entry.thoughtBuffer, 220)}`
          entry.runningSummary = '💭 WorkBuddy 正在深度思考...'
          if (entry.status !== 'approval') {
            entry.status = 'running'
            entry.turnState = 'thinking'
          }
          this._upsertStreamingActivity(entry, 'thought', entry.thoughtBuffer)
          entry.onFirstProgress?.()
          this.onStateChange?.()
        }
      } else if (tag === 'tool_call') {
        const title = update.title || update.toolName || update.kind || 'Tool Call'
        const msgObj = this._ensureAssistantMessage(entry)
        if (!msgObj.tools.includes(title)) msgObj.tools.push(title)
        msgObj.toolCalls.push({
          name: title,
          argsSummary: String(update.rawInput?.command || update.title || '').slice(0, 120),
        })
        entry.lastProgress = `Running: ${truncateText(title, 220)}`
        entry.runningSummary = `🔧 WorkBuddy 正在执行: ${truncateText(title, 48)}`
        if (entry.status !== 'approval') {
          entry.status = 'running'
          entry.turnState = 'tool'
        }
        entry.recentActivity.push({
          role: 'tool',
          text: `Running ${title}`,
          at: new Date().toISOString(),
        })
        entry.updatedAt = Date.now()
        entry.onFirstProgress?.()
        this.onStateChange?.()
      } else if (tag === 'tool_call_update') {
        if (update.status === 'completed' || update.status === 'failed') {
          const title = update.title || update.toolName || update.kind || 'tool'
          entry.recentActivity.push({
            role: 'tool',
            text: `${update.status === 'failed' ? 'Failed' : 'Completed'}: ${title}`,
            at: new Date().toISOString(),
          })
          entry.updatedAt = Date.now()
          this.onStateChange?.()
        }
      }
    })

    client.on('serverRequest', msg => {
      const { id: rpcId, method, params = {} } = msg
      const rawId = params.sessionId ? toRawWorkBuddyId(params.sessionId) : ''
      const entry = rawId
        ? this._ensureRuntimeEntry(rawId, { acpEndpoint: client.acpEndpoint })
        : [...this.runtimeSessions.values()][0]
      if (!entry) return

      if (method === 'session/request_permission' || method === 'requestPermission') {
        const code = `WB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const toolCall = params.toolCall || {}
        const rawOptions = Array.isArray(params.options) && params.options.length > 0
          ? params.options
          : [
              { optionId: 'allow_once', name: '批准本次执行', kind: 'allow_once' },
              { optionId: 'allow_always', name: '始终允许', kind: 'allow_always' },
              { optionId: 'reject_once', name: '拒绝', kind: 'reject_once' },
            ]
        const approval = {
          code,
          agentId: entry.id,
          sessionId: entry.id,
          harness: 'workbuddy',
          kind: 'permission',
          interactionType: 'approval',
          toolName: toolCall.title || toolCall.kind || 'WorkBuddy Permission',
          promptTitle: `WorkBuddy 权限请求 · ${toolCall.title || toolCall.kind || 'Tool'}`,
          command: toolCall.rawInput?.command || toolCall.title || 'Approve tool execution',
          reason: toolCall.rawInput?.command || toolCall.title || 'WorkBuddy 请求执行工具权限',
          options: rawOptions.map(o => o.name || o.label || o.optionId),
          rawOptions,
          cwd: entry.cwd,
          createdAt: Date.now(),
        }
        entry.pendingApproval = approval
        entry.status = 'approval'
        entry.turnState = 'approval'
        entry.runningSummary = `⏳ 待你授权: ${truncateText(approval.toolName, 48)}`
        entry.lastProgress = `Waiting approval: ${truncateText(approval.toolName, 180)}`
        entry.updatedAt = Date.now()
        this.pendingApprovalsByCode.set(code, {
          rpcId,
          method,
          params,
          entry,
          client,
          approval,
        })
        this.logger?.log?.(`[dsh-feishu] ⏳ WorkBuddy permission requested (${code}): ${approval.toolName}`)
        entry.onFirstProgress?.()
        this.onStateChange?.()
        return
      }

      if (method === '_codebuddy.ai/question' || method === 'session/question') {
        const code = `WBQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const rawQuestions = Array.isArray(params.questions) ? params.questions : []
        const normalizedQuestions = rawQuestions.map((q, idx) => ({
          id: q.id || q.header || `q_${idx}`,
          header: q.header || `问题 ${idx + 1}`,
          question: q.question || q.prompt || '',
          multiSelect: Boolean(q.multiSelect),
          options: Array.isArray(q.options)
            ? q.options.map(o => ({
                label: typeof o === 'string' ? o : (o.label || o.value || ''),
                description: typeof o === 'object' ? (o.description || '') : '',
              }))
            : [],
        }))
        const firstQ = normalizedQuestions[0] || { question: 'WorkBuddy 需要你的确认选择', options: [] }
        const flatOptions = firstQ.options.map(o => o.label)
        const approval = {
          code,
          agentId: entry.id,
          sessionId: entry.id,
          harness: 'workbuddy',
          kind: 'question',
          interactionType: 'question',
          toolCallId: params.toolCallId || '',
          toolName: firstQ.header || 'WorkBuddy 提问',
          promptTitle: firstQ.header || 'WorkBuddy 需要你做出选择',
          question: firstQ.question,
          questions: normalizedQuestions,
          options: flatOptions,
          reason: firstQ.question,
          cwd: entry.cwd,
          createdAt: Date.now(),
        }
        entry.pendingApproval = approval
        entry.status = 'approval'
        entry.turnState = 'approval'
        entry.runningSummary = `⏳ WorkBuddy 提问: ${truncateText(firstQ.question, 48)}`
        entry.lastProgress = `Question: ${truncateText(firstQ.question, 180)}`
        entry.updatedAt = Date.now()
        this.pendingApprovalsByCode.set(code, {
          rpcId,
          method,
          params,
          entry,
          client,
          approval,
        })
        this.logger?.log?.(`[dsh-feishu] ⏳ WorkBuddy question requested (${code}): ${firstQ.question}`)
        entry.onFirstProgress?.()
        this.onStateChange?.()
      }
    })
  }

  _findProjectJsonlPath(rawId, cwd = '') {
    const projectsRoot = path.join(this.workbuddyHome, 'projects')
    try {
      if (!fs.existsSync(projectsRoot)) return ''
      if (cwd) {
        const slug = String(cwd).replace(/^[\\/]+/, '').replace(/[^a-zA-Z0-9]/g, '-')
        if (slug) {
          const directCandidate = path.join(projectsRoot, slug, `${rawId}.jsonl`)
          if (fs.existsSync(directCandidate)) return directCandidate
        }
      }
      const subDirs = fs.readdirSync(projectsRoot, { withFileTypes: true })
      for (const dirent of subDirs) {
        if (!dirent.isDirectory()) continue
        const candidate = path.join(projectsRoot, dirent.name, `${rawId}.jsonl`)
        if (fs.existsSync(candidate)) return candidate
      }
    } catch {
      // ignore
    }
    return ''
  }

  async _readDbSessions() {
    if (typeof this.queryDbImpl === 'function') {
      return (await this.queryDbImpl(this.workbuddyHome)) || []
    }

    const results = []
    const jsonPath = path.join(this.workbuddyHome, 'sessions.json')
    try {
      if (fs.existsSync(jsonPath)) {
        const parsed = safeJsonParse(fs.readFileSync(jsonPath, 'utf8'))
        const rows = Array.isArray(parsed) ? parsed : (parsed?.sessions || [])
        for (const r of rows) {
          if (r && r.id) results.push(r)
        }
      }
    } catch {
      // ignore
    }

    const dbCandidates = [
      path.join(this.workbuddyHome, 'workbuddy.db'),
      path.join(this.workbuddyHome, 'data', 'workbuddy.db'),
      path.join(this.workbuddyHome, 'storage', 'workbuddy.db'),
    ]
    for (const dbPath of dbCandidates) {
      if (!fs.existsSync(dbPath)) continue
      try {
        const rows = await new Promise(resolve => {
          execFile(
            'sqlite3',
            [
              '-json',
              dbPath,
              'SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 50;',
            ],
            { timeout: 1500 },
            (err, stdout) => {
              if (err || !stdout) {
                resolve([])
                return
              }
              resolve(safeJsonParse(stdout) || [])
            },
          )
        })
        for (const row of rows) {
          const rowId = row?.id || row?.session_id
          const isDeleted = typeof row?.deleted_at === 'number'
            ? row.deleted_at > 0
            : (
                row?.deleted_at !== null &&
                row?.deleted_at !== undefined &&
                String(row.deleted_at).trim() !== '' &&
                Number(row.deleted_at) !== 0 &&
                Number(row.deleted_at) !== -1
              )
          if (!rowId || isDeleted) continue
          const rawIdStr = String(rowId)
          const cwdVal = row.cwd || row.workspace_path || row.project_path || ''
          let updatedAtVal = row.updated_at
          const jsonlPath = this._findProjectJsonlPath(rawIdStr, cwdVal)
          if (jsonlPath) {
            try {
              const st = fs.statSync(jsonlPath)
              const dbUpdMs = Number(new Date(Number(updatedAtVal) || updatedAtVal)) || 0
              if (st.mtimeMs > dbUpdMs) {
                updatedAtVal = Math.floor(st.mtimeMs)
              }
            } catch {
              // ignore stat errors
            }
          }
          const normalizedRow = {
            ...row,
            id: rawIdStr,
            cwd: cwdVal,
            title: row.custom_title || row.title || row.name || '',
            updated_at: updatedAtVal,
          }
          if (!results.some(existing => existing.id === normalizedRow.id)) {
            results.push(normalizedRow)
          }
        }
      } catch {
        // ignore sqlite3 errors
      }
    }

    const sessionsDir = path.join(this.workbuddyHome, 'sessions')
    try {
      if (fs.existsSync(sessionsDir)) {
        const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'))
        for (const f of files) {
          const rawId = path.basename(f, '.json')
          if (!rawId || results.some(existing => existing.id === rawId)) continue
          const fullPath = path.join(sessionsDir, f)
          const st = fs.statSync(fullPath)
          const parsed = safeJsonParse(fs.readFileSync(fullPath, 'utf8'))
          const events = Array.isArray(parsed) ? parsed : (parsed?.events || parsed?.data?.events || [])
          results.push({
            id: rawId,
            title: parsed?.title || parsed?.custom_title || '',
            cwd: parsed?.cwd || '',
            model: parsed?.model || '',
            status: parsed?.status || 'idle',
            created_at: parsed?.created_at || st.birthtimeMs || st.mtimeMs,
            updated_at: parsed?.updated_at || st.mtimeMs,
            ...(Array.isArray(events) && events.length > 0 ? { events } : {}),
          })
        }
      }
    } catch {
      // ignore
    }

    const projectsDir = path.join(this.workbuddyHome, 'projects')
    try {
      if (fs.existsSync(projectsDir)) {
        const projectFolders = fs.readdirSync(projectsDir, { withFileTypes: true })
        for (const folder of projectFolders) {
          if (!folder.isDirectory()) continue
          const folderPath = path.join(projectsDir, folder.name)
          const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jsonl'))
          for (const f of files) {
            const rawId = path.basename(f, '.jsonl')
            if (!rawId || results.some(existing => existing.id === rawId)) continue
            const fullPath = path.join(folderPath, f)
            const st = fs.statSync(fullPath)
            const lines = fs
              .readFileSync(fullPath, 'utf8')
              .split(/\r?\n/)
              .map(l => safeJsonParse(l.trim()))
              .filter(Boolean)
            const parsed = parseWorkBuddyReplayEvents(lines)
            if (parsed.transcript.length === 0) continue
            const firstUserText = parsed.transcript.find(m => m.role === 'user')?.text || ''
            results.push({
              id: rawId,
              title: parsed.aiTitle || truncateText(firstUserText, 60) || '',
              cwd: parsed.cwd || '',
              model: '',
              status: 'idle',
              created_at: st.birthtimeMs || st.mtimeMs,
              updated_at: st.mtimeMs,
              events: lines,
            })
          }
        }
      }
    } catch {
      // ignore
    }

    return results
  }

  async _fetchReplayForSession(rawId, acpEndpoint = '', cwd = '') {
    try {
      const localReplayPath = path.join(this.workbuddyHome, 'sessions', `${rawId}.json`)
      if (fs.existsSync(localReplayPath)) {
        const parsed = safeJsonParse(fs.readFileSync(localReplayPath, 'utf8'))
        const events = Array.isArray(parsed) ? parsed : (parsed?.events || parsed?.data?.events || [])
        if (events.length > 0) return parseWorkBuddyReplayEvents(events)
      }
    } catch {
      // ignore
    }

    try {
      const jsonlPath = this._findProjectJsonlPath(rawId, cwd)
      if (jsonlPath && fs.existsSync(jsonlPath)) {
        const lines = fs
          .readFileSync(jsonlPath, 'utf8')
          .split(/\r?\n/)
          .map(l => safeJsonParse(l.trim()))
          .filter(Boolean)
        if (lines.length > 0) {
          const parsed = parseWorkBuddyReplayEvents(lines)
          if (parsed.transcript.length > 0 || parsed.recentActivity.length > 0) {
            return parsed
          }
        }
      }
    } catch {
      // ignore
    }

    const targetEndpoint = acpEndpoint || this.defaultEndpoint
    if (!targetEndpoint) return null
    try {
      const origin = new URL(targetEndpoint).origin
      const res = await this.fetchImpl(
        `${origin}/api/v1/sessions/${encodeURIComponent(rawId)}/replay?limit=500`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'x-codebuddy-request': '1',
          },
        },
      )
      if (!res.ok) return null
      const body = await res.json()
      const events = body?.data?.events || body?.events || []
      if (!Array.isArray(events) || events.length === 0) return null
      return parseWorkBuddyReplayEvents(events)
    } catch {
      return null
    }
  }

  _formatSessionRecord(entry) {
    const status = String(entry.status || 'idle').toLowerCase()
    const isRunning = status === 'running'
    const isApproval = status === 'approval' || Boolean(entry.pendingApproval)
    const effectiveStatus = isApproval ? 'approval' : isRunning ? 'running' : 'idle'
    const statusLabel = isApproval
      ? entry.pendingApproval?.kind === 'question'
        ? '⏳ 待你选择'
        : '⏳ 待你授权'
      : isRunning
        ? '🟢 运行中'
        : '🔵 可续聊'
    const transcript = Array.isArray(entry.transcript) ? entry.transcript : []
    const firstUser = transcript.find(m => m.role === 'user')
    const lastAssistant = [...transcript].reverse().find(m => m.role === 'assistant')
    const updatedAtMs = typeof entry.updatedAt === 'number'
      ? entry.updatedAt
      : (Number(new Date(entry.updatedAt)) || Date.now())

    return decorateTaskMetadata({
      id: entry.id,
      rawId: entry.rawId,
      rawSessionId: entry.rawId,
      title: entry.title || `WorkBuddy (${String(entry.rawId).slice(0, 8)})`,
      status: effectiveStatus,
      statusLabel,
      turnState: entry.turnState || (isApproval ? 'approval' : isRunning ? 'thinking' : 'idle'),
      runningSummary: entry.runningSummary || '',
      harness: 'workbuddy',
      harnessLabel: 'WorkBuddy',
      controlMode: isRunning || isApproval ? 'managed' : 'idle-resumable',
      executionMode: 'managed',
      ownership: 'managed',
      controllable: true,
      Controller: 'hub',
      cwd: entry.cwd || process.cwd(),
      directory: entry.cwd || process.cwd(),
      projectDir: entry.cwd || process.cwd(),
      model: entry.model || 'auto',
      lastActivity: updatedAtMs,
      updatedAt: updatedAtMs,
      lastStepIndex: Math.max(0, transcript.length - 1),
      preview: String(lastAssistant?.text || firstUser?.text || entry.lastProgress || '').slice(0, 160),
      lastProgress: entry.lastProgress || 'Ready in WorkBuddy',
      pendingApproval: entry.pendingApproval || null,
      capabilities: { ...DEFAULT_HARNESS_CAPABILITIES.workbuddy },
      transcript,
      recentActivity: Array.isArray(entry.recentActivity) ? [...entry.recentActivity] : [],
      stateMeta: {
        source: 'workbuddy-acp',
        observedAt: updatedAtMs,
        confidence: 'high',
      },
    })
  }

  async listSessions() {
    if (!this.isAvailable() && this.runtimeSessions.size === 0) return []

    try {
      const sidecarList = await this.querySidecarImpl(this.sidecarSocketPath, 'session.list', {})
      const activeSidecarSessions = Array.isArray(sidecarList) ? sidecarList : (sidecarList?.sessions || [])
      for (const s of activeSidecarSessions) {
        const rawId = s?.sessionId || s?.id
        if (!rawId || this.deletedIds.has(rawId)) continue
        if (s.acpEndpoint && !this.defaultEndpoint) {
          this.defaultEndpoint = s.acpEndpoint
        }
        this._ensureRuntimeEntry(rawId, {
          acpEndpoint: s.acpEndpoint || this.defaultEndpoint,
          cwd: s.cwd || process.cwd(),
        })
      }
    } catch {
      // ignore
    }

    const dbRows = await this._readDbSessions()
    for (const row of dbRows) {
      const rawId = String(row.id || '').trim()
      if (!rawId || this.deletedIds.has(rawId)) continue
      const createdAt = row.created_at
        ? Number(new Date(Number(row.created_at) || row.created_at)) || Date.now()
        : (Number(new Date(row.createdAt || Date.now())) || Date.now())
      const updatedAt = row.updated_at
        ? Number(new Date(Number(row.updated_at) || row.updated_at)) || createdAt
        : (Number(new Date(row.updatedAt || createdAt)) || createdAt)
      const entry = this._ensureRuntimeEntry(rawId, {
        title: row.custom_title || row.title || `WorkBuddy (${rawId.slice(0, 8)})`,
        cwd: row.cwd || process.cwd(),
        model: row.model || '',
        status: String(row.status || '').toLowerCase() === 'running' ? 'running' : 'idle',
        createdAt,
        updatedAt,
      })

      const needsReplayRefresh =
        entry.transcript.length === 0 ||
        (entry.status !== 'running' && entry.status !== 'approval' && updatedAt > (entry.lastReplayUpdatedAt || 0))
      if (needsReplayRefresh) {
        if (Array.isArray(row.events) && row.events.length > 0) {
          const parsed = parseWorkBuddyReplayEvents(row.events)
          entry.transcript = parsed.transcript
          entry.recentActivity = parsed.recentActivity
          if (parsed.lastProgress) entry.lastProgress = parsed.lastProgress
          if (parsed.aiTitle && (!entry.title || entry.title.startsWith('WorkBuddy ('))) {
            entry.title = parsed.aiTitle
          }
          if (parsed.cwd && !entry.cwd) entry.cwd = parsed.cwd
          entry.lastReplayUpdatedAt = updatedAt
        } else {
          const replayed = await this._fetchReplayForSession(rawId, entry.acpEndpoint, entry.cwd)
          if (replayed && (replayed.transcript.length > 0 || replayed.recentActivity.length > 0)) {
            entry.transcript = replayed.transcript
            entry.recentActivity = replayed.recentActivity
            if (replayed.lastProgress) entry.lastProgress = replayed.lastProgress
            if (replayed.aiTitle && (!entry.title || entry.title.startsWith('WorkBuddy ('))) {
              entry.title = replayed.aiTitle
            }
            if (replayed.cwd && !entry.cwd) entry.cwd = replayed.cwd
            entry.lastReplayUpdatedAt = updatedAt
          }
        }
      }
    }

    const all = [...this.runtimeSessions.values()]
      .filter(e => !this.deletedIds.has(e.rawId))
      .map(e => this._formatSessionRecord(e))
    all.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    return all
  }

  async getSession(sessionId = '') {
    const rawId = toRawWorkBuddyId(sessionId)
    if (!rawId || this.deletedIds.has(rawId)) return null
    if (!this.runtimeSessions.has(rawId)) {
      await this.listSessions()
    }
    const entry = this.runtimeSessions.get(rawId)
    if (!entry) return null
    if (entry.transcript.length === 0) {
      const replayed = await this._fetchReplayForSession(rawId, entry.acpEndpoint, entry.cwd)
      if (replayed && (replayed.transcript.length > 0 || replayed.recentActivity.length > 0)) {
        entry.transcript = replayed.transcript
        entry.recentActivity = replayed.recentActivity
        if (replayed.lastProgress) entry.lastProgress = replayed.lastProgress
        if (replayed.aiTitle && (!entry.title || entry.title.startsWith('WorkBuddy ('))) {
          entry.title = replayed.aiTitle
        }
        if (replayed.cwd && !entry.cwd) entry.cwd = replayed.cwd
      }
    }
    return this._formatSessionRecord(entry)
  }

  async _awaitEarlyPromptOutcome(entry, promptPromise, windowMs = 180) {
    let timer = null
    const firstProgressPromise = new Promise(resolve => {
      entry.onFirstProgress = () => {
        entry.onFirstProgress = null
        resolve({ ok: true, streaming: true })
      }
    })
    const timeoutPromise = new Promise(resolve => {
      timer = setTimeout(() => resolve({ ok: true, pending: true }), windowMs)
      timer.unref?.()
    })
    try {
      return await Promise.race([promptPromise, firstProgressPromise, timeoutPromise])
    } finally {
      entry.onFirstProgress = null
      if (timer) clearTimeout(timer)
    }
  }

  async startSession({ title = '', prompt = '', text = '', cwd = process.cwd(), model = '' } = {}) {
    const cleanPrompt = String(prompt || text || title || '').trim()
    if (!cleanPrompt) {
      return { ok: false, error: 'Prompt is required to start a WorkBuddy session.' }
    }
    const resolvedCwd = cwd ? path.resolve(cwd) : process.cwd()
    const explicitModel = model && model !== 'auto' && model !== 'fast-model' ? model : ''

    try {
      const client = await this._getClientForEndpoint(this.defaultEndpoint)
      const newRes = await client.request('session/new', {
        cwd: resolvedCwd,
        mcpServers: [],
        ...(explicitModel ? { model: explicitModel } : {}),
      })
      const rawId = toRawWorkBuddyId(newRes?.sessionId || newRes?.id || `wb-${Date.now()}`)
      const resolvedTitle = truncateText(title || cleanPrompt, 90)
      const entry = this._ensureRuntimeEntry(rawId, {
        title: resolvedTitle,
        cwd: resolvedCwd,
        model: model || newRes?.models?.currentModelId || 'auto',
        status: 'running',
        turnState: 'thinking',
        runningSummary: '💭 WorkBuddy 正在思考与执行...',
        acpEndpoint: client.acpEndpoint,
      })

      if (explicitModel) {
        try {
          await client.request('session/set_model', {
            sessionId: rawId,
            modelId: explicitModel,
          })
        } catch {
          // ignore set_model failure if already set in session/new
        }
      }

      entry.assistantBuffer = ''
      entry.thoughtBuffer = ''
      this._appendUserMessage(entry, cleanPrompt)
      entry.lastProgress = `Prompt: ${truncateText(cleanPrompt, 160)}`
      entry.status = 'running'
      entry.turnState = 'thinking'

      const promptPromise = this._dispatchPromptAsync(client, entry, cleanPrompt)
      const earlyOutcome = await this._awaitEarlyPromptOutcome(entry, promptPromise)
      if (earlyOutcome && earlyOutcome.ok === false) {
        return {
          ok: false,
          agentId: entry.id,
          sessionId: entry.id,
          error: earlyOutcome.error,
        }
      }

      return {
        ok: true,
        harness: 'workbuddy',
        agentId: entry.id,
        sessionId: entry.id,
        title: resolvedTitle,
        cwd: resolvedCwd,
        session: this._formatSessionRecord(entry),
        message: `🚀 已在电脑端启动 WorkBuddy 会话「${resolvedTitle.slice(0, 28)}」`,
      }
    } catch (err) {
      if (isWorkBuddyAuthError(err)) {
        this._resetSpawnedServe()
      }
      const friendly = this._formatError(err)
      this.logger?.warn?.(`[dsh-feishu] ⚠️ WorkBuddy startSession failed: ${friendly}`)
      return {
        ok: false,
        error: isWorkBuddyAuthError(err) ? friendly : `WorkBuddy startSession failed: ${friendly}`,
      }
    }
  }

  async createSession(opts = {}) {
    return this.startSession(opts)
  }

  _dispatchPromptAsync(client, entry, text) {
    return Promise.resolve()
      .then(async () => {
        const res = await client.request('session/prompt', {
          sessionId: entry.rawId,
          prompt: [{ type: 'text', text }],
        })
        const streamedText = entry.assistantBuffer || ''
        this._finalizeStreamingActivities(entry)
        const replyText = extractTextFromAcpContent(res?.content || res?.text || '')
        if (
          isWorkBuddyAuthError(res?.error) ||
          isWorkBuddyAuthError(replyText) ||
          isWorkBuddyAuthError(streamedText)
        ) {
          throw new Error(
            replyText || streamedText || 'Authentication required. Please use /login command to sign in to your account',
          )
        }
        if (replyText) {
          const msgObj = this._ensureAssistantMessage(entry)
          if (!msgObj.text.includes(replyText)) {
            msgObj.text = msgObj.text ? `${msgObj.text}\n${replyText}` : replyText
          }
          msgObj.time = Date.now()
          entry.lastProgress = truncateText(msgObj.text, 260)
          if (!entry.recentActivity.some(a => a.role === 'assistant' && a.text.includes(replyText))) {
            entry.recentActivity.push({
              role: 'assistant',
              text: truncateText(replyText, 1600),
              at: new Date().toISOString(),
            })
          }
        }
        if (!entry.pendingApproval) {
          entry.status = 'idle'
          entry.turnState = 'conclusion'
          entry.runningSummary = ''
        }
        entry.updatedAt = Date.now()
        this.logger?.log?.(`[dsh-feishu] ✅ WorkBuddy turn completed (${entry.rawId.slice(0, 8)})`)
        this.onStateChange?.()
        return { ok: true }
      })
      .catch(err => {
        const authFailed = isWorkBuddyAuthError(err)
        const friendlyMsg = this._formatError(err)
        this._finalizeStreamingActivities(entry)
        entry.status = 'idle'
        entry.turnState = 'interrupted'
        entry.runningSummary = ''
        entry.lastProgress = `Error: ${truncateText(friendlyMsg, 220)}`
        const errMsgObj = this._ensureAssistantMessage(entry)
        errMsgObj.text = `⚠️ ${friendlyMsg}`
        errMsgObj.time = Date.now()
        entry.recentActivity.push({
          role: 'system',
          text: `WorkBuddy error: ${friendlyMsg}`,
          at: new Date().toISOString(),
        })
        entry.updatedAt = Date.now()
        if (authFailed) {
          this._resetSpawnedServe()
        }
        this.logger?.warn?.(`[dsh-feishu] ⚠️ WorkBuddy prompt error (${entry.rawId.slice(0, 8)}): ${friendlyMsg}`)
        this.onStateChange?.()
        return { ok: false, error: friendlyMsg, isAuthError: authFailed }
      })
  }

  async sendPrompt({ sessionId = '', prompt = '', text = '', cwd = '', model = '', mode = 'prompt' } = {}) {
    const rawId = toRawWorkBuddyId(sessionId)
    const cleanPrompt = String(prompt || text || '').trim()
    if (!rawId || !cleanPrompt) {
      return { ok: false, error: 'sessionId and prompt are required.' }
    }

    const existing = this.runtimeSessions.get(rawId)
    if (existing && (existing.status === 'running' || mode === 'steer')) {
      return this.steer({ sessionId, prompt: cleanPrompt, cwd, model })
    }

    const explicitModel = model && model !== 'auto' && model !== 'fast-model' ? model : ''

    try {
      const entry = this._ensureRuntimeEntry(rawId, {
        cwd: cwd || process.cwd(),
        model: model || '',
      })
      if (model) entry.model = model
      const client = await this._getClientForEndpoint(entry.acpEndpoint)

      entry.isLoadingSession = true
      try {
        await client.request('session/load', {
          sessionId: rawId,
          cwd: entry.cwd || process.cwd(),
          mcpServers: [],
          takeWriter: true,
          _meta: { 'codebuddy.ai/takeWriter': true },
        })
      } catch (loadErr) {
        if (!/already loaded/i.test(String(loadErr?.message || ''))) {
          throw loadErr
        }
      } finally {
        entry.isLoadingSession = false
        entry.assistantBuffer = ''
        entry.thoughtBuffer = ''
      }

      if (explicitModel) {
        try {
          await client.request('session/set_model', {
            sessionId: rawId,
            modelId: explicitModel,
          })
        } catch {
          // ignore
        }
      }

      this._appendUserMessage(entry, cleanPrompt)
      entry.status = 'running'
      entry.turnState = 'thinking'
      entry.runningSummary = '💭 WorkBuddy 正在思考与执行...'
      entry.lastProgress = `Prompt: ${truncateText(cleanPrompt, 160)}`
      this.onStateChange?.()

      const promptPromise = this._dispatchPromptAsync(client, entry, cleanPrompt)
      const earlyOutcome = await this._awaitEarlyPromptOutcome(entry, promptPromise)
      if (earlyOutcome && earlyOutcome.ok === false) {
        return {
          ok: false,
          agentId: entry.id,
          sessionId: entry.id,
          error: earlyOutcome.error,
        }
      }

      return {
        ok: true,
        agentId: entry.id,
        sessionId: entry.id,
        session: this._formatSessionRecord(entry),
        message: `🚀 已在 WorkBuddy 会话 (${rawId.slice(0, 8)}) 中继续执行`,
      }
    } catch (err) {
      if (isWorkBuddyAuthError(err)) {
        this._resetSpawnedServe()
      }
      const friendly = this._formatError(err)
      this.logger?.warn?.(`[dsh-feishu] ⚠️ WorkBuddy sendPrompt failed (${rawId.slice(0, 8)}): ${friendly}`)
      return {
        ok: false,
        error: isWorkBuddyAuthError(err) ? friendly : `WorkBuddy sendPrompt failed: ${friendly}`,
      }
    }
  }

  async steer({ sessionId = '', prompt = '', text = '', cwd = '', model = '' } = {}) {
    const rawId = toRawWorkBuddyId(sessionId)
    const cleanPrompt = String(prompt || text || '').trim()
    if (!rawId || !cleanPrompt) {
      return { ok: false, error: 'sessionId and prompt are required for WorkBuddy steering.' }
    }

    const entry = this.runtimeSessions.get(rawId)
    if (!entry || entry.status !== 'running') {
      return this.sendPrompt({ sessionId, prompt: cleanPrompt, cwd, model, mode: 'prompt' })
    }

    try {
      const client = await this._getClientForEndpoint(entry.acpEndpoint)
      this._appendUserMessage(entry, cleanPrompt)
      entry.runningSummary = '⚡ 已实时注入补充指令 (Steer)，WorkBuddy 正在调整执行...'
      entry.lastProgress = `Steered: ${truncateText(cleanPrompt, 160)}`

      try {
        await client.request('session/request_yield', { sessionId: rawId })
      } catch {
        // optional if server goes straight to enqueue_message
      }
      await client.request('session/enqueue_message', {
        sessionId: rawId,
        prompt: [{ type: 'text', text: cleanPrompt }],
      })

      return {
        ok: true,
        steered: true,
        agentId: entry.id,
        sessionId: entry.id,
        session: this._formatSessionRecord(entry),
        message: `⚡ 已向正在运行的 WorkBuddy 会话 (${rawId.slice(0, 8)}) 实时注入指令`,
      }
    } catch {
      return this.sendPrompt({ sessionId, prompt: cleanPrompt, cwd, model, mode: 'prompt' })
    }
  }

  async stopSession({ sessionId = '' } = {}) {
    const rawId = toRawWorkBuddyId(sessionId)
    if (!rawId) return { ok: false, error: 'sessionId is required.' }
    const entry = this.runtimeSessions.get(rawId)
    try {
      const client = await this._getClientForEndpoint(entry?.acpEndpoint || this.defaultEndpoint)
      await client.request('session/cancel', { sessionId: rawId })
      if (entry) {
        this._finalizeStreamingActivities(entry)
        entry.status = 'idle'
        entry.turnState = 'interrupted'
        entry.runningSummary = ''
        entry.pendingApproval = null
        entry.lastProgress = 'Stopped by user'
        entry.updatedAt = Date.now()
      }
      return {
        ok: true,
        agentId: `${WORKBUDDY_SESSION_PREFIX}${rawId}`,
        sessionId: `${WORKBUDDY_SESSION_PREFIX}${rawId}`,
        message: `⏹ 已停止 WorkBuddy 会话 (${rawId.slice(0, 8)})`,
      }
    } catch (err) {
      return { ok: false, error: `WorkBuddy stopSession failed: ${err.message}` }
    }
  }

  async resolveApproval({ sessionId = '', code = '', allow = true, optionIndex, answers } = {}) {
    const upperCode = String(code || '').trim().toUpperCase()
    let pending = upperCode ? this.pendingApprovalsByCode.get(upperCode) : null
    if (!pending && sessionId) {
      const rawId = toRawWorkBuddyId(sessionId)
      for (const candidate of this.pendingApprovalsByCode.values()) {
        if (candidate.entry.rawId === rawId) {
          pending = candidate
          break
        }
      }
    }
    if (!pending) {
      return { ok: false, error: `未找到待处理的 WorkBuddy 审批或提问 (${upperCode || sessionId})` }
    }

    const { rpcId, method, params, entry, client, approval } = pending
    this.pendingApprovalsByCode.delete(approval.code)
    entry.pendingApproval = null
    entry.status = allow ? 'running' : 'idle'
    entry.turnState = allow ? 'thinking' : 'idle'
    entry.runningSummary = allow ? '💭 已授权，WorkBuddy 正在继续执行...' : ''
    entry.updatedAt = Date.now()

    try {
      if (method === '_codebuddy.ai/question' || method === 'session/question') {
        const formattedAnswers = {}
        const qList = Array.isArray(approval.questions) ? approval.questions : []
        if (Array.isArray(answers)) {
          for (let i = 0; i < qList.length; i++) {
            const q = qList[i]
            const key = q.header || q.id || `q_${i}`
            const rawAns = answers[i]
            if (Array.isArray(rawAns)) formattedAnswers[key] = rawAns.map(String)
            else if (rawAns && typeof rawAns === 'object') {
              formattedAnswers[key] = Array.isArray(rawAns.answers)
                ? rawAns.answers.map(String)
                : [String(rawAns.answer ?? rawAns.value ?? rawAns.label ?? '')].filter(Boolean)
            } else if (rawAns !== undefined) {
              formattedAnswers[key] = [String(rawAns)]
            }
          }
        } else if (answers && typeof answers === 'object') {
          for (const [k, v] of Object.entries(answers)) {
            formattedAnswers[k] = Array.isArray(v) ? v.map(String) : [String(v)]
          }
        } else if (typeof optionIndex === 'number') {
          const idx0 = optionIndex >= 1 && approval.options?.[optionIndex - 1] && !approval.options?.[optionIndex]
            ? optionIndex - 1
            : optionIndex
          const chosen = approval.options?.[idx0] ?? approval.options?.[optionIndex - 1] ?? approval.options?.[0]
          const firstHeader = qList[0]?.header || qList[0]?.id || 'q_0'
          if (chosen) formattedAnswers[firstHeader] = [String(chosen)]
        } else if (approval.options?.length > 0) {
          const firstHeader = qList[0]?.header || qList[0]?.id || 'q_0'
          formattedAnswers[firstHeader] = [approval.options[0]]
        }

        try {
          await client.request('_codebuddy.ai/resolveInterruption', {
            sessionId: entry.rawId,
            toolCallId: params.toolCallId || approval.toolCallId,
            decision: allow ? 'approve' : 'reject',
            answers: formattedAnswers,
          })
        } catch {
          // also reply directly via JSON-RPC response below
        }

        await client.respond(rpcId, {
          outcome: allow
            ? { outcome: 'submitted', data: { answers: formattedAnswers } }
            : { outcome: 'cancelled', reason: 'user_rejected' },
        })
        return {
          ok: true,
          code: approval.code,
          agentId: entry.id,
          sessionId: entry.id,
          decision: allow ? 'answered' : 'rejected',
          message: allow ? '✅ 已提交选择并继续执行 WorkBuddy 任务' : '已取消该问题选择',
        }
      }

      const rawOpts = approval.rawOptions || []
      let chosenOptionId = allow ? 'allow_once' : 'reject_once'
      if (!allow) {
        const rejectOpt = rawOpts.find(o => String(o.kind || o.optionId).includes('reject'))
        if (rejectOpt?.optionId) chosenOptionId = rejectOpt.optionId
      } else if (typeof optionIndex === 'number' && optionIndex >= 1 && rawOpts[optionIndex - 1]?.optionId) {
        const candidate = rawOpts[optionIndex - 1]
        if (!String(candidate.kind || candidate.optionId).includes('reject')) {
          chosenOptionId = candidate.optionId
        }
      } else if (typeof optionIndex === 'number' && optionIndex === 0 && rawOpts[0]?.optionId) {
        chosenOptionId = rawOpts[0].optionId
      } else {
        const allowOpt = rawOpts.find(o => String(o.kind || o.optionId).includes('allow'))
        if (allowOpt?.optionId) chosenOptionId = allowOpt.optionId
      }

      await client.respond(rpcId, {
        outcome: {
          outcome: 'selected',
          optionId: chosenOptionId,
        },
      })

      return {
        ok: true,
        code: approval.code,
        agentId: entry.id,
        sessionId: entry.id,
        decision: allow ? 'allowed-once' : 'rejected',
        message: allow ? '✅ 已批准 WorkBuddy 执行操作' : '🚫 已拒绝 WorkBuddy 执行该操作',
      }
    } catch (err) {
      return {
        ok: false,
        error: `WorkBuddy resolveApproval failed: ${err.message}`,
      }
    }
  }

  async renameSession({ sessionId = '', title = '' } = {}) {
    const rawId = toRawWorkBuddyId(sessionId)
    const cleanTitle = String(title || '').trim()
    if (!rawId || !cleanTitle) {
      return { ok: false, error: 'sessionId and title are required.' }
    }
    const entry = this._ensureRuntimeEntry(rawId, { title: cleanTitle })
    entry.title = cleanTitle
    entry.updatedAt = Date.now()
    return {
      ok: true,
      agentId: entry.id,
      sessionId: entry.id,
      title: cleanTitle,
    }
  }

  async deleteSession({ sessionId = '' } = {}) {
    const rawId = toRawWorkBuddyId(sessionId)
    if (!rawId) return { ok: false, error: 'sessionId is required.' }
    this.deletedIds.add(rawId)
    this.runtimeSessions.delete(rawId)
    return { ok: true, agentId: `${WORKBUDDY_SESSION_PREFIX}${rawId}` }
  }

  shutdown() {
    this._resetSpawnedServe()
  }
}
