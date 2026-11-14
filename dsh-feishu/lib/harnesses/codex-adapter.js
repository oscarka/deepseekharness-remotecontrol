import { execFile, execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
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

/**
 * Parse optional reasoning effort suffix (`model::effort` or `model@effort`, e.g. `gpt-5.4::high`, `gpt-5.4::xhigh`)
 * and normalize internal placeholders (`'codex'`, `'default'`, `'auto'`) so invalid model slugs are never sent.
 */
export function parseCodexModelAndEffort(rawModel = '') {
  const trimmed = String(rawModel || '').trim()
  if (!trimmed) return { model: undefined, effort: undefined }
  let modelPart = trimmed
  let effortPart = ''
  const sepMatch = trimmed.match(/^(.+?)(?:::|@)(minimal|low|medium|high|xhigh)$/i)
  if (sepMatch) {
    modelPart = sepMatch[1].trim()
    effortPart = sepMatch[2].toLowerCase()
  }
  const lower = modelPart.toLowerCase()
  const cleanModel =
    !modelPart || lower === 'codex' || lower === 'default' || lower === 'auto'
      ? undefined
      : modelPart
  return {
    model: cleanModel,
    effort: effortPart || undefined,
  }
}

export function normalizeCodexModel(model = '') {
  return parseCodexModelAndEffort(model).model
}

function listVersionedNodeBinDirs(baseDir, subPath = 'bin') {
  if (!baseDir || !existsSync(baseDir)) return []
  try {
    return readdirSync(baseDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))
      .map(e => join(baseDir, e.name, subPath))
  } catch {
    return []
  }
}

export function findCodexBinary(customPath = '') {
  const home = homedir()
  const nvmBins = listVersionedNodeBinDirs(join(home, '.nvm/versions/node'), 'bin')
  const fnmBins = [
    ...listVersionedNodeBinDirs(join(home, '.fnm/node-versions'), 'installation/bin'),
    ...listVersionedNodeBinDirs(join(home, 'Library/Application Support/fnm/node-versions'), 'installation/bin'),
    ...listVersionedNodeBinDirs(join(home, '.local/share/fnm/node-versions'), 'installation/bin'),
  ]
  const candidates = [
    customPath,
    process.env.CODEX_BIN,
    process.env.CODEX_CLI_PATH,
    '/Applications/Codex.app/Contents/Resources/codex',
    join(home, 'Applications/Codex.app/Contents/Resources/codex'),
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    join(home, '.local/bin/codex'),
    join(home, '.cargo/bin/codex'),
    join(home, '.bun/bin/codex'),
    join(home, '.volta/bin/codex'),
    join(home, 'Library/pnpm/codex'),
    join(home, '.local/share/pnpm/codex'),
    join(home, '.codex/plugins/.plugin-appserver/codex'),
    join(home, '.npm-global/bin/codex'),
    ...nvmBins.map(d => join(d, 'codex')),
    ...fnmBins.map(d => join(d, 'codex')),
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

export function buildCodexSpawnEnv(binaryPath = '', codexHome = join(homedir(), '.codex')) {
  const home = homedir()
  const pathSep = process.platform === 'win32' ? ';' : ':'
  const currentPath = String(process.env.PATH || '')
  const currentParts = currentPath.split(pathSep).filter(Boolean)
  const extraDirs = [
    binaryPath ? dirname(binaryPath) : '',
    process.execPath ? dirname(process.execPath) : '',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    join(home, '.local/bin'),
    join(home, '.npm-global/bin'),
    join(home, '.volta/bin'),
    join(home, '.bun/bin'),
    join(home, '.cargo/bin'),
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ].filter(Boolean)
  const mergedPath = [...new Set([...extraDirs, ...currentParts])].join(pathSep)
  return {
    ...process.env,
    PATH: mergedPath,
    CODEX_HOME: codexHome,
  }
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

  if (defaultModel) {
    addModel(defaultModel, defaultModel)
  }
  addModel('gpt-5.4', 'GPT-5.4')
  addModel('gpt-5.4::high', 'GPT-5.4 (High 推理)')
  addModel('gpt-5.4::xhigh', 'GPT-5.4 (xHigh 极客推理)')
  addModel('gpt-5.4-mini', 'GPT-5.4-Mini')
  addModel('gpt-5.3-codex', 'GPT-5.3-Codex')
  addModel('gpt-5.3-codex::high', 'GPT-5.3-Codex (High 推理)')
  addModel('gpt-5.2-codex', 'GPT-5.2-Codex')
  addModel('gpt-5.5', 'GPT-5.5')
  addModel('o3', 'o3 (深度推理)')
  addModel('o4-mini', 'o4-mini (快速)')

  if (!defaultModel && models.length > 0) {
    defaultModel = models[0].value
  }
  const matched = models.find(m => m.value === defaultModel)
  const defaultLabel = matched
    ? `${matched.label}${defaultEffort ? ` (${defaultEffort})` : ''} (默认)`
    : `${defaultModel || 'GPT-5.4'} (默认)`

  const catalog = {
    defaultModel: defaultModel || 'gpt-5.4',
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

function extractPatchFileStats(patchText = '', fallbackPath = '') {
  const results = []
  const text = String(patchText || '')
  if (!text && !fallbackPath) return results

  const lines = text.split('\n')
  let currentPath = fallbackPath || ''
  let added = 0
  let removed = 0
  const flushCurrent = () => {
    const cleanPath = String(currentPath || '').trim()
    if (!cleanPath) return
    results.push({
      path: cleanPath,
      name: basename(cleanPath),
      displayPath: cleanPath,
      added,
      removed,
    })
    added = 0
    removed = 0
  }

  for (const line of lines) {
    const patchHeader = line.match(/^\*\*\* (?:Update|Add|Delete) File:\s*(.+)$/)
    const gitHeader = line.match(/^\+\+\+\s+(?:b\/)?(.+)$/)
    if (patchHeader) {
      if (currentPath && (added > 0 || removed > 0)) flushCurrent()
      currentPath = patchHeader[1].trim()
      continue
    }
    if (gitHeader && gitHeader[1] !== '/dev/null') {
      if (currentPath && (added > 0 || removed > 0)) flushCurrent()
      currentPath = gitHeader[1].trim()
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed++
    }
  }
  if (currentPath) {
    flushCurrent()
  }
  return results
}

function mergeChangedFilesList(targetMap, entries = []) {
  for (const entry of entries) {
    if (!entry || !entry.path) continue
    const key = String(entry.path).trim()
    if (!key) continue
    const existing = targetMap.get(key)
    if (existing) {
      existing.added = Math.max(existing.added, Number(entry.added || 0))
      existing.removed = Math.max(existing.removed, Number(entry.removed || 0))
    } else {
      targetMap.set(key, {
        path: key,
        name: entry.name || basename(key),
        displayPath: entry.displayPath || key,
        added: Number(entry.added || 0),
        removed: Number(entry.removed || 0),
      })
    }
  }
}

export function parseCodexRolloutContent(rawContent = '', fallbackId = '', { maxMessages = 80 } = {}) {
  const lines = String(rawContent || '').split('\n').filter(Boolean)
  let sessionId = fallbackId
  let cwd = ''
  let model = ''
  let turnState = 'idle'
  let lastStepIndex = 0
  const transcript = []
  const changedFilesMap = new Map()

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
      if (p.type === 'task_started' || p.type === 'turn_started') {
        turnState = 'running'
      } else if (
        p.type === 'task_complete' ||
        p.type === 'turn_complete' ||
        p.type === 'turn_aborted' ||
        p.type === 'error' ||
        p.type === 'shutdown_complete'
      ) {
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
          .filter(c => (c.type === 'input_text' || c.type === 'text') && c.text)
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
        const rawInput = String(p.arguments || p.input || '')
        prev.toolCalls.push({
          name: toolName,
          argsSummary: rawInput.slice(0, 120),
        })
        if (toolName === 'apply_patch' || rawInput.includes('*** Update File:') || rawInput.includes('*** Add File:')) {
          mergeChangedFilesList(changedFilesMap, extractPatchFileStats(rawInput))
        }
      }
    }
  }

  const limit = Number(maxMessages) > 0 ? Number(maxMessages) : 80
  return {
    sessionId,
    cwd,
    model,
    turnState,
    lastStepIndex,
    totalTranscriptCount: transcript.length,
    changedFiles: Array.from(changedFilesMap.values()),
    transcript: transcript.slice(-limit),
  }
}

/**
 * Merge historical rollout transcript from disk (`diskTranscript`) with live streaming
 * transcript from `CodexAppServerClient` (`liveTranscript`) without losing prior turns
 * or hiding live streaming deltas.
 */
export function mergeCodexTranscripts(diskTranscript = [], liveTranscript = [], maxMessages = 80) {
  const limit = Number(maxMessages) > 0 ? Number(maxMessages) : 80
  const diskList = Array.isArray(diskTranscript) ? diskTranscript : []
  const liveList = Array.isArray(liveTranscript)
    ? liveTranscript.map(({ _itemId, ...rest }) => ({
        ...rest,
        tools: Array.isArray(rest.tools) ? [...rest.tools] : [],
        toolCalls: Array.isArray(rest.toolCalls) ? [...rest.toolCalls] : [],
      }))
    : []

  if (liveList.length === 0) return diskList.slice(-limit)
  if (diskList.length === 0) {
    return liveList.slice(-limit).map((m, idx) => ({ ...m, index: idx }))
  }

  // Case 1: `liveList` was already seeded with `diskList` (starts with the same first message)
  const startsWithDiskPrefix =
    liveList[0].role === diskList[0].role &&
    String(liveList[0].text || '').trim() === String(diskList[0].text || '').trim()

  if (startsWithDiskPrefix) {
    if (liveList.length >= diskList.length) {
      return liveList.slice(-limit).map((m, idx) => ({ ...m, index: idx }))
    }
    const merged = [...liveList, ...diskList.slice(liveList.length)]
    return merged.slice(-limit).map((m, idx) => ({ ...m, index: idx }))
  }

  // Case 2: `liveList` only contains newly appended turns since `app-server` attached
  const firstLive = liveList[0]
  let overlapIdx = -1
  for (let i = diskList.length - 1; i >= 0; i--) {
    if (
      diskList[i].role === firstLive.role &&
      String(diskList[i].text || '').trim() === String(firstLive.text || '').trim()
    ) {
      overlapIdx = i
      break
    }
  }

  const prefix = overlapIdx >= 0 ? diskList.slice(0, overlapIdx) : diskList
  const tailFromDisk = overlapIdx >= 0 ? diskList.slice(overlapIdx) : []
  const effectiveTail = liveList.length >= tailFromDisk.length ? liveList : tailFromDisk
  return [...prefix, ...effectiveTail].slice(-limit).map((m, idx) => ({ ...m, index: idx }))
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
    onStateChange = null,
    logger = null,
  } = {}) {
    this.binaryPath = binaryPath
    this.codexHome = codexHome
    this.spawnImpl = spawnImpl
    this.idleTimeoutMs = idleTimeoutMs
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null
    this.logger = logger
    this.proc = null
    this.connectPromise = null
    this.nextId = 1
    this.pendingRpc = new Map()
    this.threads = new Map()
    this.pendingApprovals = new Map()
    this.loadedThreadIds = new Set()
    this.idleTimer = null
  }

  notifyStateChange() {
    if (!this.onStateChange) return
    try {
      this.onStateChange()
    } catch { }
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

  async spawnAndInitializeAppServer(bin, args) {
    const child = this.spawnImpl(bin, args, {
      cwd: homedir(),
      env: buildCodexSpawnEnv(bin, this.codexHome),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    if (!child || !child.stdin || !child.stdout || typeof child.stdout.on !== 'function') {
      try {
        child?.kill?.('SIGTERM')
      } catch { }
      const err = new Error('spawned process does not support stdio pipes for app-server')
      err.isConnectError = true
      throw err
    }

    this.proc = child
    let stdoutBuf = ''
    let stderrBuf = ''
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

    child.stderr?.on('data', chunk => {
      // Consume stderr to prevent pipe backpressure while keeping a short diagnostic tail
      stderrBuf = (stderrBuf + String(chunk)).slice(-600)
    })

    child.on('exit', () => {
      if (this.proc === child) {
        const msg = stderrBuf.trim()
          ? `codex app-server exited: ${stderrBuf.trim().split('\n').pop()}`
          : 'codex app-server process exited'
        this.handleDisconnect(new Error(msg))
      }
    })
    child.on('error', err => {
      if (this.proc === child) {
        this.handleDisconnect(err)
      }
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
  }

  async ensureConnected() {
    if (this.isConnected()) return true
    if (this.connectPromise) return this.connectPromise

    this.connectPromise = (async () => {
      const bin = this.binaryPath || findCodexBinary()
      if (!bin) {
        const err = new Error('未找到 codex CLI 可执行文件')
        err.isConnectError = true
        throw err
      }
      try {
        return await this.spawnAndInitializeAppServer(bin, ['app-server', '--listen', 'stdio://'])
      } catch (firstErr) {
        this.close()
        // Older codex CLI versions default to stdio and reject `--listen stdio://`
        if (/--listen|unexpected argument|unknown option/i.test(String(firstErr?.message || ''))) {
          return await this.spawnAndInitializeAppServer(bin, ['app-server'])
        }
        firstErr.isConnectError = true
        throw firstErr
      }
    })()

    try {
      return await this.connectPromise
    } catch (err) {
      err.isConnectError = true
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
        effort: defaults.effort || '',
        title: defaults.title || '',
        status: 'idle',
        turnState: 'idle',
        activeTurnId: null,
        runningSummary: '',
        updatedAt: Date.now(),
        lastConclusionAt: 0,
        transcript: [],
        changedFiles: [],
        planSteps: [],
        pendingApproval: null,
      }
      this.threads.set(id, state)
    } else {
      if (defaults.cwd && !state.cwd) state.cwd = defaults.cwd
      if (defaults.model) state.model = defaults.model
      if (defaults.effort) state.effort = defaults.effort
      if (defaults.title && !state.title) state.title = defaults.title
    }
    return state
  }

  recordChangedFiles(state, entries = []) {
    if (!state || !Array.isArray(entries) || entries.length === 0) return
    const map = new Map()
    for (const fc of state.changedFiles || []) {
      if (fc?.path) map.set(fc.path, { ...fc })
    }
    mergeChangedFilesList(map, entries)
    state.changedFiles = Array.from(map.values())
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
      this.notifyStateChange()
      return
    }

    if (
      method === 'item/fileChange/requestApproval' ||
      method === 'applyPatchApproval' ||
      method === 'item/permissions/requestApproval' ||
      method === 'item/mcpToolCall/requestApproval' ||
      method === 'mcpToolCallApproval'
    ) {
      const isMcp = method === 'item/mcpToolCall/requestApproval' || method === 'mcpToolCallApproval'
      const callId = String(params.itemId || params.callId || jsonRpcId)
      const code = makeApprovalCode('CDX', `${threadId}:${callId}:${jsonRpcId}`)
      const toolLabel = isMcp ? String(params.tool || params.server || 'MCP') : 'Edit'
      const reason =
        params.reason ||
        (isMcp
          ? `请求调用 MCP 工具: ${toolLabel}`
          : params.grantRoot
            ? `申请目录写入权限: ${params.grantRoot}`
            : '请求修改工作区文件')
      const approval = {
        code,
        kind: 'permission',
        harness: 'codex',
        agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
        callId,
        toolName: toolLabel,
        promptTitle: isMcp ? 'Codex 请求调用 MCP 工具' : 'Codex 请求修改文件',
        reason,
        cwd: state?.cwd || '',
        createdAt: now,
        options: [
          { index: 1, label: '允许执行 (Accept)' },
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
      this.notifyStateChange()
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
      this.notifyStateChange()
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
      this.notifyStateChange()
      return
    }

    if (method === 'thread/closed' || method === 'thread/unloaded') {
      const threadId = toRawCodexId(params.threadId || params.thread?.id || '')
      if (threadId) {
        this.loadedThreadIds.delete(threadId)
      }
      this.notifyStateChange()
      return
    }

    if (method === 'thread/name/updated') {
      const threadId = toRawCodexId(params.threadId || '')
      if (threadId) {
        const state = this.ensureThreadState(threadId)
        if (params.threadName || params.name) {
          state.title = cleanTitle(params.threadName || params.name)
        }
        this.notifyStateChange()
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
      this.notifyStateChange()
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
      // Proactively unsubscribe & unload idle thread after turn completes so `~/.codex/thread-writer-locks/<id>.lock`
      // is released immediately and desktop Codex.app / TUI is never blocked by `-32600: already has an active writer`.
      if (this.loadedThreadIds.has(threadId)) {
        this.loadedThreadIds.delete(threadId)
        if (this.isConnected()) {
          this.request('thread/unsubscribe', { threadId }, 2500).catch(() => { })
        }
      }
      this.touchIdleTimer()
      this.notifyStateChange()
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
          .filter(c => (c.type === 'text' || c.type === 'input_text') && c.text)
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
        const changeList = Array.isArray(item.changes) ? item.changes : []
        const files = changeList
          .map(c => c?.path)
          .filter(Boolean)
          .join(', ')
        msg.toolCalls.push({
          name: 'Edit',
          argsSummary: files.slice(0, 120),
        })
        const extractedChanges = []
        for (const c of changeList) {
          if (!c?.path) continue
          const stats = extractPatchFileStats(c.diff || '', c.path)
          if (stats.length > 0) extractedChanges.push(...stats)
          else {
            extractedChanges.push({
              path: c.path,
              name: basename(c.path),
              displayPath: c.path,
              added: 0,
              removed: 0,
            })
          }
        }
        this.recordChangedFiles(state, extractedChanges)
        state.turnState = 'tool'
        state.runningSummary = `📝 正在修改文件: ${files.slice(0, 48) || 'workspace'}`
      } else if (item.type === 'webSearch' || item.type === 'web_search') {
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes('WebSearch')) msg.tools.push('WebSearch')
        const query = String(item.query || '').trim()
        msg.toolCalls.push({
          name: 'WebSearch',
          argsSummary: query.slice(0, 120),
        })
        state.turnState = 'tool'
        state.runningSummary = `🌐 正在搜索网页: ${query.slice(0, 48) || 'Web'}`
      } else if (item.type === 'plan' || item.type === 'todoList' || item.type === 'todo_list') {
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes('Plan')) msg.tools.push('Plan')
        const planText =
          item.text ||
          (Array.isArray(item.items)
            ? item.items.map(s => `${s.completed ? '[x]' : '[ ]'} ${s.text || s.step || ''}`).join('\n')
            : '')
        if (planText) {
          msg.thinking = msg.thinking ? `${msg.thinking}\n📋 执行计划:\n${planText}` : `📋 执行计划:\n${planText}`
        }
        state.turnState = 'thinking'
        state.runningSummary = '📋 Codex 正在规划执行步骤...'
      } else if (item.type === 'collabToolCall' || item.type === 'subagent') {
        const toolName = String(item.tool || 'Subagent')
        const msg = this.ensureAssistantMessage(state)
        if (!msg.tools.includes(toolName)) msg.tools.push(toolName)
        msg.toolCalls.push({
          name: toolName,
          argsSummary: String(item.prompt || '').slice(0, 120),
        })
        state.turnState = 'tool'
        state.runningSummary = `🤝 正在调用协作子智能体: ${toolName}`
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
      this.notifyStateChange()
      return
    }

    if (method === 'turn/plan/updated' || method === 'item/plan/delta') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const msg = this.ensureAssistantMessage(state, params.itemId)
      if (Array.isArray(params.plan)) {
        state.planSteps = params.plan
        const formatted = params.plan
          .map(p => {
            const mark = p.status === 'completed' ? '[x]' : p.status === 'inProgress' ? '[-]' : '[ ]'
            return `${mark} ${p.step || ''}`
          })
          .join('\n')
        const header = params.explanation ? `📋 ${params.explanation}\n${formatted}` : `📋 执行计划:\n${formatted}`
        msg.thinking = header
      } else if (params.delta) {
        msg.thinking = `${msg.thinking || ''}${String(params.delta)}`
      }
      if (state.status !== 'approval') {
        state.status = 'running'
        state.turnState = 'thinking'
        state.runningSummary = '📋 Codex 正在更新执行计划...'
      }
      state.updatedAt = now
      this.notifyStateChange()
      return
    }

    if (method === 'turn/diff/updated') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      if (params.diff) {
        this.recordChangedFiles(state, extractPatchFileStats(params.diff))
      }
      state.updatedAt = now
      this.notifyStateChange()
      return
    }

    if (method === 'item/commandExecution/outputDelta' || method === 'item/fileChange/outputDelta') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const deltaLine = String(params.delta || '')
        .trim()
        .split('\n')
        .filter(Boolean)
        .pop()
      if (deltaLine && state.status === 'running') {
        state.turnState = 'tool'
        state.runningSummary =
          method === 'item/commandExecution/outputDelta'
            ? `🔧 命令输出: ${deltaLine.slice(0, 56)}`
            : `📝 补丁输出: ${deltaLine.slice(0, 56)}`
      }
      state.updatedAt = now
      this.notifyStateChange()
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
      this.notifyStateChange()
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
      this.notifyStateChange()
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
      } else if (item.type === 'fileChange' && Array.isArray(item.changes)) {
        const extractedChanges = []
        for (const c of item.changes) {
          if (!c?.path) continue
          const stats = extractPatchFileStats(c.diff || '', c.path)
          if (stats.length > 0) extractedChanges.push(...stats)
          else {
            extractedChanges.push({
              path: c.path,
              name: basename(c.path),
              displayPath: c.path,
              added: 0,
              removed: 0,
            })
          }
        }
        this.recordChangedFiles(state, extractedChanges)
      } else if (item.type === 'commandExecution' && item.exitCode !== undefined && item.exitCode !== null) {
        const msg = this.ensureAssistantMessage(state)
        const lastBash = [...(msg.toolCalls || [])].reverse().find(tc => tc.name === 'Bash')
        if (lastBash && item.exitCode !== 0) {
          lastBash.argsSummary = `${lastBash.argsSummary} (exit ${item.exitCode})`.slice(0, 140)
        }
      }
      state.updatedAt = now
      this.notifyStateChange()
      return
    }

    if (method === 'error') {
      const threadId = toRawCodexId(params.threadId || '')
      if (!threadId) return
      const state = this.ensureThreadState(threadId)
      const errMsg = String(params.error?.message || params.message || 'Codex 执行出错')
      if (params.willRetry) {
        state.runningSummary = `⚠️ ${errMsg.slice(0, 56)}（正在自动重试...）`
      } else {
        const msg = this.ensureAssistantMessage(state)
        if (!msg.text) {
          msg.text = `⚠️ Codex 执行异常：${errMsg}`
        }
        state.activeTurnId = null
        state.status = 'idle'
        state.turnState = 'idle'
        state.runningSummary = ''
      }
      state.updatedAt = now
      this.notifyStateChange()
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
      this.notifyStateChange()
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

  tryClearThreadWriterLock(rawId) {
    if (!rawId || !this.codexHome) return false
    const lockPath = join(this.codexHome, 'thread-writer-locks', `${rawId}.lock`)
    try {
      if (existsSync(lockPath)) {
        unlinkSync(lockPath)
        return true
      }
    } catch { }
    return false
  }

  async resumeThreadWithRecovery(rawId, { cwd, model, effort, rolloutPath } = {}) {
    const parsedModel = parseCodexModelAndEffort(model)
    const cleanModel = parsedModel.model
    const cleanEffort = effort || parsedModel.effort
    const resolvedCwd = cwd && existsSync(cwd) ? cwd : undefined
    const baseParams = {
      threadId: rawId,
      cwd: resolvedCwd,
      model: cleanModel,
      ...(cleanEffort ? { effort: cleanEffort } : {}),
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
      excludeTurns: true,
    }
    try {
      const resumeRes = await this.request('thread/resume', baseParams)
      this.loadedThreadIds.add(rawId)
      return resumeRes
    } catch (err) {
      const errMsg = String(err?.message || '')
      // 1. Single-writer lock contention (`thread <id> already has an active writer`)
      if (/active writer|writer.?lock/i.test(errMsg)) {
        try {
          await this.request('thread/unsubscribe', { threadId: rawId }, 1500)
        } catch { }
        this.tryClearThreadWriterLock(rawId)
        const resumeRes = await this.request('thread/resume', baseParams)
        this.loadedThreadIds.add(rawId)
        return resumeRes
      }
      // 2. Rollout file not indexed in SQLite (`not found` / `no rollout`) -> pass explicit `path`
      if (rolloutPath && existsSync(rolloutPath)) {
        const resumeRes = await this.request('thread/resume', {
          ...baseParams,
          path: rolloutPath,
        })
        this.loadedThreadIds.add(rawId)
        return resumeRes
      }
      throw err
    }
  }

  async startNewSession({ prompt, cwd, title = '', model = '', imagePaths = [] } = {}) {
    await this.ensureConnected()
    const targetCwd = cwd && existsSync(cwd) ? cwd : homedir()
    const { model: cleanModel, effort: cleanEffort } = parseCodexModelAndEffort(model)
    const startRes = await this.request('thread/start', {
      cwd: targetCwd,
      model: cleanModel,
      ...(cleanEffort ? { effort: cleanEffort } : {}),
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
      effort: startRes?.reasoningEffort || cleanEffort || '',
      title: resolvedTitle,
    })
    if (title) {
      this.request('thread/name/set', { threadId, name: resolvedTitle }).catch(() => { })
    }

    const prevTranscriptLen = state.transcript.length
    this.appendUserMessage(state, prompt, Date.now())
    state.status = 'running'
    state.turnState = 'thinking'
    state.runningSummary = '💭 Codex 正在思考与执行...'
    this.notifyStateChange()

    try {
      const turnRes = await this.request('turn/start', {
        threadId,
        cwd: targetCwd,
        model: cleanModel,
        ...(cleanEffort ? { effort: cleanEffort } : {}),
        approvalPolicy: 'on-request',
        sandboxPolicy: { type: 'workspaceWrite' },
        input: this.buildUserInputArray(prompt, imagePaths),
      })
      if (turnRes?.turn?.id) {
        state.activeTurnId = turnRes.turn.id
      }
    } catch (turnErr) {
      state.status = 'idle'
      state.turnState = 'idle'
      state.runningSummary = ''
      state.activeTurnId = null
      state.transcript.length = prevTranscriptLen
      this.notifyStateChange()
      throw turnErr
    }

    this.touchIdleTimer()
    this.notifyStateChange()
    return {
      ok: true,
      harness: 'codex',
      agentId: `${CODEX_SESSION_PREFIX}${threadId}`,
      title: resolvedTitle,
      cwd: state.cwd,
      message: `🚀 已在电脑端启动 Codex 会话「${resolvedTitle.slice(0, 28)}」`,
    }
  }

  async sendOrSteerTurn({
    sessionId,
    text,
    cwd,
    model = '',
    imagePaths = [],
    mode = 'prompt',
    seedTranscript = null,
    rolloutPath = '',
  } = {}) {
    await this.ensureConnected()
    const rawId = toRawCodexId(sessionId)
    const { model: cleanModel, effort: cleanEffort } = parseCodexModelAndEffort(model)
    const state = this.ensureThreadState(rawId, { cwd, model: cleanModel, effort: cleanEffort })
    if (state.transcript.length === 0 && Array.isArray(seedTranscript) && seedTranscript.length > 0) {
      state.transcript = seedTranscript.map((m, idx) => ({
        ...m,
        index: idx,
        tools: Array.isArray(m.tools) ? [...m.tools] : [],
        toolCalls: Array.isArray(m.toolCalls) ? [...m.toolCalls] : [],
      }))
    }
    const input = this.buildUserInputArray(text, imagePaths)

    // If a turn is currently running on this thread, steer it in real time via `turn/steer`!
    if (state.activeTurnId && (state.status === 'running' || mode === 'steer')) {
      const steerPrevLen = state.transcript.length
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
        this.notifyStateChange()
        return {
          ok: true,
          steered: true,
          agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
          message: `⚡ 已向正在运行的 Codex 会话 (${rawId.slice(0, 8)}) 实时注入指令`,
        }
      } catch {
        // Roll back the optimistic user message before falling through to `turn/start`
        state.transcript.length = steerPrevLen
      }
    }

    const effectiveCwd = (cwd && existsSync(cwd) ? cwd : state.cwd) || undefined
    const wasLoaded = this.loadedThreadIds.has(rawId)
    if (!wasLoaded) {
      const resumeRes = await this.resumeThreadWithRecovery(rawId, {
        cwd: effectiveCwd,
        model: cleanModel,
        effort: cleanEffort,
        rolloutPath,
      })
      if (resumeRes?.cwd) state.cwd = resumeRes.cwd
      if (resumeRes?.model) state.model = resumeRes.model
      if (resumeRes?.reasoningEffort) state.effort = resumeRes.reasoningEffort
    }

    const prevTranscriptLen = state.transcript.length
    const prevStatus = state.status
    const prevTurnState = state.turnState
    const prevSummary = state.runningSummary

    this.appendUserMessage(state, text, Date.now())
    state.status = 'running'
    state.turnState = 'thinking'
    state.runningSummary = '💭 Codex 正在思考与执行...'
    this.notifyStateChange()

    const turnParams = {
      threadId: rawId,
      cwd: (cwd && existsSync(cwd) ? cwd : state.cwd) || undefined,
      model: cleanModel,
      ...(cleanEffort ? { effort: cleanEffort } : {}),
      approvalPolicy: 'on-request',
      input,
    }

    try {
      let turnRes
      try {
        turnRes = await this.request('turn/start', turnParams)
      } catch (firstTurnErr) {
        // If `rawId` was cached in `loadedThreadIds` but unloaded by `codex app-server` idle timer,
        // re-resume the thread and retry `turn/start` once.
        if (wasLoaded) {
          this.loadedThreadIds.delete(rawId)
          const resumeRes = await this.resumeThreadWithRecovery(rawId, {
            cwd: turnParams.cwd,
            model: cleanModel,
            effort: cleanEffort,
            rolloutPath,
          })
          if (resumeRes?.cwd) state.cwd = resumeRes.cwd
          if (resumeRes?.model) state.model = resumeRes.model
          turnRes = await this.request('turn/start', turnParams)
        } else {
          throw firstTurnErr
        }
      }
      if (turnRes?.turn?.id) {
        state.activeTurnId = turnRes.turn.id
      }
    } catch (turnErr) {
      state.status = prevStatus === 'running' ? 'idle' : prevStatus
      state.turnState = prevTurnState === 'thinking' ? 'idle' : prevTurnState
      state.runningSummary = prevSummary
      state.activeTurnId = null
      state.transcript.length = prevTranscriptLen
      this.notifyStateChange()
      throw turnErr
    }

    this.touchIdleTimer()
    this.notifyStateChange()
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
    this.notifyStateChange()
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
      this.notifyStateChange()
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
    this.notifyStateChange()
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
    onStateChange = null,
    logger = null,
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
    this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null
    this.logger = logger
    this.fileCache = new Map()
    this.sessionDiskMap = new Map()
    this.indexCache = { mtimeMs: 0, titles: new Map() }
    this.activeRuns = new Map()
    this.deletedIds = new Set()
    this.appServer = new CodexAppServerClient({
      binaryPath: this.binaryPath,
      codexHome: this.codexHome,
      spawnImpl: this.spawnImpl,
      onStateChange: this.onStateChange,
      logger: this.logger,
    })
  }

  notifyStateChange() {
    if (!this.onStateChange) return
    try {
      this.onStateChange()
    } catch { }
  }

  resolveBinaryPath() {
    if (this.binaryPath && existsSync(this.binaryPath)) return this.binaryPath
    const found = findCodexBinary(this.binaryPath)
    if (found) {
      this.binaryPath = found
      if (this.appServer) this.appServer.binaryPath = found
    }
    return this.binaryPath
  }

  shouldUseAppServer() {
    if (this.useAppServer === false) return false
    if (this.useAppServer === true) return true
    if (this.execImpl) return false
    if (this.spawnImpl !== spawn) return false
    const bin = this.resolveBinaryPath()
    return Boolean(bin && existsSync(bin))
  }

  getCapabilities() {
    const bin = this.resolveBinaryPath()
    const hasBin = Boolean(bin && existsSync(bin))
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
    const bin = this.resolveBinaryPath()
    const hasBin = Boolean(bin && existsSync(bin))
    return {
      installed: hasBin || hasDir,
      hasBinary: hasBin,
      binaryPath: bin,
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

  getSessionDiskMeta(rawId) {
    if (!rawId) return null
    const cached = this.sessionDiskMap.get(rawId)
    if (cached && cached.filePath && existsSync(cached.filePath)) {
      return cached
    }
    const sessionsDir = join(this.codexHome, 'sessions')
    if (!existsSync(sessionsDir)) return null
    const files = walkJsonlFiles(sessionsDir, 4).sort((a, b) => b.mtimeMs - a.mtimeMs)
    for (const file of files) {
      if (!file.path.includes(rawId) && files.length > 20) continue
      try {
        const raw = readFileSync(file.path, 'utf8')
        const fallbackUuid =
          basename(file.path, '.jsonl').match(/([0-9a-f]{8}-[0-9a-f-]{27})$/i)?.[1]
          || basename(file.path, '.jsonl')
        const data = parseCodexRolloutContent(raw, fallbackUuid)
        if (data.sessionId === rawId) {
          const meta = {
            filePath: file.path,
            cwd: data.cwd || '',
            model: data.model || '',
            transcript: data.transcript || [],
          }
          this.sessionDiskMap.set(rawId, meta)
          return meta
        }
      } catch { }
    }
    return null
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
          !line.includes('app-server') &&
          !line.includes('Codex Helper') &&
          !line.includes('crashpad_handler'),
      )
    } catch {
      return false
    }
  }

  async listSessions({ now = Date.now(), maxMessages = 80 } = {}) {
    const limit = Number(maxMessages) > 0 ? Number(maxMessages) : 80
    const sessionsDir = join(this.codexHome, 'sessions')
    const files = existsSync(sessionsDir)
      ? walkJsonlFiles(sessionsDir, 4)
          .sort((a, b) => b.mtimeMs - a.mtimeMs)
          .slice(0, this.maxSessions)
      : []

    const titles = this.loadThreadTitles()
    const bin = this.resolveBinaryPath()
    const hasBin = Boolean(bin && existsSync(bin))
    const anyRecentFile = files.some(f => now - f.mtimeMs < 45_000)
    const externalRunning = anyRecentFile ? await this.hasExternalCodexProcess(now) : false

    const results = []
    const seenSessionIds = new Set()

    for (const file of files) {
      let parsed = this.fileCache.get(file.path)
      if (!parsed || parsed.mtimeMs !== file.mtimeMs || parsed.size !== file.size || (parsed.maxMessages || 80) < limit) {
        try {
          const raw = readFileSync(file.path, 'utf8')
          const fallbackUuid =
            basename(file.path, '.jsonl').match(/([0-9a-f]{8}-[0-9a-f-]{27})$/i)?.[1]
            || basename(file.path, '.jsonl')
          const data = parseCodexRolloutContent(raw, fallbackUuid, { maxMessages: Math.max(limit, 240) })
          parsed = {
            mtimeMs: file.mtimeMs,
            size: file.size,
            maxMessages: Math.max(limit, 240),
            data,
          }
          this.fileCache.set(file.path, parsed)
        } catch {
          continue
        }
      }

      const {
        sessionId,
        cwd,
        model,
        turnState,
        lastStepIndex,
        totalTranscriptCount = 0,
        changedFiles: diskChangedFiles = [],
        transcript: fullDiskTranscript = [],
      } = parsed.data
      const diskTranscript = fullDiskTranscript.slice(-limit)
      if (!sessionId || this.deletedIds.has(sessionId)) continue
      seenSessionIds.add(sessionId)
      this.sessionDiskMap.set(sessionId, {
        filePath: file.path,
        cwd: cwd || '',
        model: model || '',
        transcript: diskTranscript || [],
      })

      const fullId = `${CODEX_SESSION_PREFIX}${sessionId}`
      const liveThread = this.appServer?.threads.get(sessionId)
      const isAppServerActive = Boolean(
        liveThread && (liveThread.status === 'running' || liveThread.status === 'approval'),
      )
      const isLegacyRunning = this.activeRuns.has(sessionId)
      const isManagedRunning = isAppServerActive || isLegacyRunning
      const isExternallyActive =
        !liveThread && !isManagedRunning && turnState === 'running' && now - file.mtimeMs < 60_000 && externalRunning

      const transcript = liveThread
        ? mergeCodexTranscripts(diskTranscript, liveThread.transcript, limit)
        : diskTranscript

      const changedFilesMap = new Map()
      mergeChangedFilesList(changedFilesMap, diskChangedFiles)
      if (liveThread?.changedFiles?.length) {
        mergeChangedFilesList(changedFilesMap, liveThread.changedFiles)
      }
      const changedFiles = Array.from(changedFilesMap.values())

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
        messageCount: Math.max(totalTranscriptCount, transcript.length),
        preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
        changedFiles,
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
        const transcript = liveThread.transcript
          .slice(-limit)
          .map(({ _itemId, ...rest }, idx) => ({ ...rest, index: idx }))
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
          messageCount: liveThread.transcript.length,
          preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
          changedFiles: Array.isArray(liveThread.changedFiles) ? liveThread.changedFiles : [],
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

  async spawnCliRun({
    bin,
    args,
    cwd,
    sessionId = '',
    promptText = '',
    title = '',
    model = '',
    seedTranscript = null,
  }) {
    const targetCwd = cwd && existsSync(cwd) ? cwd : homedir()
    const cleanModel = normalizeCodexModel(model)
    const child = this.spawnImpl(bin, args, {
      cwd: targetCwd,
      env: buildCodexSpawnEnv(bin, this.codexHome),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    })

    let currentKey = sessionId || `new-${Date.now()}`
    let resolvedThreadId = sessionId || ''
    this.activeRuns.set(currentKey, child)

    const bindThreadState = threadId => {
      if (!threadId || !this.appServer) return null
      const st = this.appServer.ensureThreadState(threadId, {
        cwd: targetCwd,
        model: cleanModel || 'codex',
        title: cleanTitle(title || promptText) || `Codex (${threadId.slice(0, 8)})`,
      })
      if (st.transcript.length === 0 && Array.isArray(seedTranscript) && seedTranscript.length > 0) {
        st.transcript = seedTranscript.map((m, idx) => ({
          ...m,
          index: idx,
          tools: Array.isArray(m.tools) ? [...m.tools] : [],
          toolCalls: Array.isArray(m.toolCalls) ? [...m.toolCalls] : [],
        }))
      }
      this.appServer.appendUserMessage(st, promptText, Date.now())
      st.status = 'running'
      st.turnState = 'thinking'
      st.runningSummary = '💭 Codex 正在后台思考与执行...'
      st.updatedAt = Date.now()
      return st
    }

    let state = resolvedThreadId ? bindThreadState(resolvedThreadId) : null
    const initialTranscriptLen = state ? Math.max(0, state.transcript.length - 1) : 0

    // Minimal unit-test spawn mocks may not expose `stdout` / `stderr` EventEmitters
    if (!child || !child.stdout || typeof child.stdout.on !== 'function') {
      child?.on?.('exit', () => {
        this.activeRuns.delete(currentKey)
        if (state && state.status === 'running') {
          state.status = 'idle'
          state.turnState = 'conclusion'
          state.runningSummary = ''
        }
        this.notifyStateChange()
      })
      child?.on?.('error', () => {
        this.activeRuns.delete(currentKey)
        if (state && state.status === 'running') {
          state.status = 'idle'
          state.turnState = 'idle'
          state.runningSummary = ''
        }
        this.notifyStateChange()
      })
      this.notifyStateChange()
      return {
        ok: true,
        harness: 'codex',
        ...(resolvedThreadId ? { agentId: `${CODEX_SESSION_PREFIX}${resolvedThreadId}` } : {}),
        message: resolvedThreadId
          ? `已在 Codex 会话 (${resolvedThreadId.slice(0, 8)}) 中启动后台续跑`
          : '已在电脑端启动新的 Codex 后台任务',
      }
    }

    let stdoutBuf = ''
    let stderrBuf = ''
    let cliErrorMsg = ''
    let resolveStartup = null
    const startupPromise = new Promise(r => {
      resolveStartup = r
    })

    const handleExecEvent = ev => {
      if (!ev || typeof ev !== 'object') return
      const now = Date.now()
      if (ev.type === 'thread.started' && ev.thread_id) {
        const tid = toRawCodexId(ev.thread_id)
        if (tid && tid !== currentKey) {
          this.activeRuns.delete(currentKey)
          currentKey = tid
          resolvedThreadId = tid
          this.activeRuns.set(currentKey, child)
        }
        state = bindThreadState(tid)
        this.notifyStateChange()
        resolveStartup?.({ ok: true, threadId: tid })
        return
      }
      if (ev.type === 'turn.started') {
        if (state) {
          state.status = 'running'
          state.turnState = 'thinking'
          state.runningSummary = '💭 Codex 正在思考与执行...'
          state.updatedAt = now
        }
        this.notifyStateChange()
        return
      }
      if ((ev.type === 'item.started' || ev.type === 'item.completed') && ev.item && state) {
        const item = ev.item
        state.updatedAt = now
        if ((item.type === 'agent_message' || item.type === 'agentMessage') && item.text) {
          const msg = this.appServer.ensureAssistantMessage(state, item.id)
          msg.text = item.text
          msg.time = now
          state.runningSummary = '✍️ Codex 正在生成回复...'
        } else if (item.type === 'reasoning' && (item.text || Array.isArray(item.summary))) {
          const msg = this.appServer.ensureAssistantMessage(state, item.id)
          const rText = item.text || (Array.isArray(item.summary) ? item.summary.join('\n') : '')
          if (rText) msg.thinking = rText
          msg.time = now
        } else if (item.type === 'command_execution' || item.type === 'commandExecution') {
          const msg = this.appServer.ensureAssistantMessage(state)
          if (!msg.tools.includes('Bash')) msg.tools.push('Bash')
          if (ev.type === 'item.started') {
            msg.toolCalls.push({
              name: 'Bash',
              argsSummary: String(item.command || '').slice(0, 120),
            })
            state.turnState = 'tool'
            state.runningSummary = `🔧 正在执行命令: ${String(item.command || '').slice(0, 56)}`
          }
        }
        this.notifyStateChange()
        return
      }
      if (ev.type === 'turn.completed') {
        if (state) {
          state.status = 'idle'
          state.turnState = 'conclusion'
          state.lastConclusionAt = now
          state.runningSummary = ''
          state.updatedAt = now
        }
        this.notifyStateChange()
        return
      }
      if (ev.type === 'turn.failed' || ev.type === 'error') {
        const msg = ev.error?.message || ev.message || 'Codex CLI 执行报错'
        cliErrorMsg = String(msg)
        if (state) {
          state.status = 'idle'
          state.turnState = 'idle'
          state.runningSummary = ''
          state.updatedAt = now
        }
        this.notifyStateChange()
        resolveStartup?.({ ok: false, error: cliErrorMsg })
      }
    }

    child.stdout.on('data', chunk => {
      stdoutBuf += String(chunk)
      let idx
      while ((idx = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, idx).trim()
        stdoutBuf = stdoutBuf.slice(idx + 1)
        if (!line) continue
        try {
          handleExecEvent(JSON.parse(line))
        } catch { }
      }
    })

    child.stderr?.on('data', chunk => {
      stderrBuf = (stderrBuf + String(chunk)).slice(-800)
    })

    child.on?.('exit', code => {
      if (stdoutBuf.trim()) {
        try {
          handleExecEvent(JSON.parse(stdoutBuf.trim()))
        } catch { }
        stdoutBuf = ''
      }
      this.activeRuns.delete(currentKey)
      if (code !== 0 && code !== null) {
        const errDetail =
          cliErrorMsg ||
          stderrBuf.trim().split('\n').filter(Boolean).slice(-2).join(' ') ||
          `Codex CLI 异常退出 (exit ${code})`
        if (state) {
          state.status = 'idle'
          state.turnState = 'idle'
          state.runningSummary = ''
          if (state.transcript.length === initialTranscriptLen + 1) {
            state.transcript.length = initialTranscriptLen
          }
        }
        this.notifyStateChange()
        resolveStartup?.({ ok: false, error: errDetail })
      } else {
        if (state && state.status === 'running') {
          state.status = 'idle'
          state.turnState = 'conclusion'
          state.lastConclusionAt = Date.now()
          state.runningSummary = ''
        }
        this.notifyStateChange()
        resolveStartup?.({ ok: true, threadId: resolvedThreadId })
      }
    })

    child.on?.('error', err => {
      this.activeRuns.delete(currentKey)
      if (state) {
        state.status = 'idle'
        state.turnState = 'idle'
        state.runningSummary = ''
        if (state.transcript.length === initialTranscriptLen + 1) {
          state.transcript.length = initialTranscriptLen
        }
      }
      this.notifyStateChange()
      resolveStartup?.({ ok: false, error: err?.message || '无法启动 codex CLI 进程' })
    })

    const startupTimer = new Promise(r => {
      const t = setTimeout(() => r({ ok: true, timeout: true }), 120)
      t.unref?.()
    })
    const outcome = await Promise.race([startupPromise, startupTimer])
    if (outcome && outcome.ok === false) {
      return {
        ok: false,
        error: outcome.error || 'Codex CLI 启动失败',
      }
    }

    const finalId = outcome?.threadId || resolvedThreadId
    return {
      ok: true,
      harness: 'codex',
      ...(finalId ? { agentId: `${CODEX_SESSION_PREFIX}${finalId}` } : {}),
      message: finalId
        ? `已在 Codex 会话 (${finalId.slice(0, 8)}) 中启动后台续跑`
        : '已在电脑端启动新的 Codex 后台任务',
    }
  }

  async createSession({ title = '', prompt, cwd, model = '', imagePaths = [], execImpl } = {}) {
    const hasImages = Array.isArray(imagePaths) && imagePaths.some(Boolean)
    const text = String(prompt || '').trim() || (hasImages ? '请查看附图并协助处理' : '')
    if (!text) return { ok: false, error: '请输入新建任务的指令内容' }
    const bin = this.resolveBinaryPath()
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
      } catch (err) {
        if (!err?.isConnectError) {
          return { ok: false, error: err?.message || 'Codex 启动新会话失败' }
        }
        // Fall back to `codex exec` if `app-server` cannot start/initialize
      }
    }

    const { model: cleanModel, effort: cleanEffort } = parseCodexModelAndEffort(model)
    const modelFlags = [
      ...(cleanModel ? ['-m', cleanModel] : []),
      ...(cleanEffort ? ['-c', `model_reasoning_effort="${cleanEffort}"`] : []),
    ]
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const promptArg = text.startsWith('-') ? ['--', text] : [text]
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--sandbox',
      'workspace-write',
      '--json',
      ...modelFlags,
      ...imgFlags,
      ...promptArg,
    ]
    if (runExec) {
      await runExec(bin || 'codex', args, { cwd: cwd || undefined, timeout: 60_000 })
      return {
        ok: true,
        harness: 'codex',
        message: '已在电脑端启动新的 Codex 任务',
      }
    }
    return this.spawnCliRun({
      bin,
      args,
      cwd,
      promptText: text,
      title,
      model: cleanModel,
    })
  }

  async sendPrompt({ sessionId, text, cwd, model = '', imagePaths = [], mode = 'prompt', execImpl } = {}) {
    const rawId = toRawCodexId(sessionId)
    const hasImages = Array.isArray(imagePaths) && imagePaths.some(Boolean)
    const prompt = String(text || '').trim() || (hasImages ? '请查看附图并协助处理' : '')
    if (!prompt) return { ok: false, error: '请输入指令内容' }
    const bin = this.resolveBinaryPath()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 codex CLI 可执行文件' }
    }

    const diskMeta = this.getSessionDiskMeta(rawId)
    const effectiveCwd = cwd || diskMeta?.cwd || undefined

    if (!runExec && this.shouldUseAppServer()) {
      try {
        return await this.appServer.sendOrSteerTurn({
          sessionId: rawId,
          text: prompt,
          cwd: effectiveCwd,
          model,
          imagePaths,
          mode,
          seedTranscript: diskMeta?.transcript || null,
          rolloutPath: diskMeta?.filePath || '',
        })
      } catch (err) {
        if (!err?.isConnectError) {
          return { ok: false, error: err?.message || 'Codex 发送指令失败' }
        }
        // Fall back to `codex exec resume` if `app-server` cannot start/initialize
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

    const { model: cleanModel, effort: cleanEffort } = parseCodexModelAndEffort(model)
    const modelFlags = [
      ...(cleanModel ? ['-m', cleanModel] : []),
      ...(cleanEffort ? ['-c', `model_reasoning_effort="${cleanEffort}"`] : []),
    ]
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const promptArg = prompt.startsWith('-') ? ['--', prompt] : [prompt]
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--sandbox',
      'workspace-write',
      '--json',
      ...modelFlags,
      'resume',
      '--all',
      ...imgFlags,
      rawId,
      ...promptArg,
    ]
    if (runExec) {
      await runExec(bin || 'codex', args, { cwd: effectiveCwd, timeout: 60_000 })
      return {
        ok: true,
        agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
        message: `已在 Codex 会话 (${rawId.slice(0, 8)}) 中继续执行`,
      }
    }
    return this.spawnCliRun({
      bin,
      args,
      cwd: effectiveCwd,
      sessionId: rawId,
      promptText: prompt,
      model: cleanModel,
      seedTranscript: diskMeta?.transcript || null,
    })
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
    const child = this.activeRuns.get(rawId)
    if (child && typeof child.kill === 'function') {
      try {
        child.kill('SIGTERM')
      } catch { }
      this.activeRuns.delete(rawId)
      if (this.appServer) {
        await this.appServer.interruptTurn(rawId).catch(() => { })
      }
      return { ok: true, agentId: sessionId, message: '已中止 Codex 后台任务' }
    }
    if (this.appServer) {
      const interrupted = await this.appServer.interruptTurn(rawId)
      if (interrupted) return interrupted
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
