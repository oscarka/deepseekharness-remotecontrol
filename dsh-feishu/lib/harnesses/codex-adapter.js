import { execFile, spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
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
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    join(home, '.codex/plugins/.plugin-appserver/codex'),
    join(home, '.npm-global/bin/codex'),
  ].filter(Boolean)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return ''
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
        } catch {}
      }
    }
  } catch {}
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

  const appendAssistant = (text, time) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    const prev = transcript[transcript.length - 1]
    if (prev && prev.role === 'assistant' && prev.text === trimmed) return
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
      } else if (p.type === 'function_call' || p.type === 'custom_tool_call') {
        const toolName = p.name || 'tool'
        let prev = transcript[transcript.length - 1]
        if (!prev || prev.role !== 'assistant') {
          prev = {
            index: transcript.length,
            role: 'assistant',
            text: '',
            thinking: '',
            tools: [],
            toolCalls: [],
            time: ts || Date.now(),
          }
          transcript.push(prev)
        }
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

export class CodexAdapter {
  constructor({
    codexHome = join(homedir(), '.codex'),
    binaryPath = '',
    maxSessions = 12,
    execImpl = undefined,
    spawnImpl = spawn,
  } = {}) {
    this.id = 'codex'
    this.label = 'Codex'
    this.icon = '🧠'
    this.codexHome = codexHome
    this.binaryPath = binaryPath || findCodexBinary()
    this.maxSessions = maxSessions
    this.execImpl = execImpl
    this.spawnImpl = spawnImpl
    this.fileCache = new Map()
    this.indexCache = { mtimeMs: 0, titles: new Map() }
    this.activeRuns = new Map()
    this.deletedIds = new Set()
  }

  getCapabilities() {
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    return {
      canCreateSession: hasBin,
      canPrompt: hasBin,
      canSteer: false,
      canStop: true,
      canApprove: false,
    }
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
        } catch {}
      }
      this.indexCache = { mtimeMs: st.mtimeMs, titles }
    } catch {}
    return this.indexCache.titles
  }

  async hasExternalCodexProcess(now = Date.now()) {
    const runExec = this.execImpl || execFileAsync
    try {
      const { stdout } = await runExec('ps', ['-ax', '-o', 'command='], { timeout: 1500 })
      const lines = String(stdout || '').split('\n')
      return lines.some(line => /\bcodex\b/.test(line) && !line.includes('probe-harnesses'))
    } catch {
      return false
    }
  }

  async listSessions({ now = Date.now() } = {}) {
    const sessionsDir = join(this.codexHome, 'sessions')
    if (!existsSync(sessionsDir)) return []
    const files = walkJsonlFiles(sessionsDir, 4)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, this.maxSessions)

    if (files.length === 0) return []
    const titles = this.loadThreadTitles()
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    const anyRecentFile = files.some(f => now - f.mtimeMs < 45_000)
    const externalRunning = anyRecentFile ? await this.hasExternalCodexProcess(now) : false

    const results = []
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

      const { sessionId, cwd, model, turnState, lastStepIndex, transcript } = parsed.data
      if (!sessionId || this.deletedIds.has(sessionId)) continue
      const fullId = `${CODEX_SESSION_PREFIX}${sessionId}`
      const isManagedRunning = this.activeRuns.has(sessionId)
      const isExternallyActive =
        !isManagedRunning && turnState === 'running' && now - file.mtimeMs < 60_000 && externalRunning

      let status = 'idle'
      let statusLabel = hasBin ? '🔵 可续聊' : '👀 仅观测'
      let controlMode = hasBin ? 'idle-resumable' : 'observe-only'
      let confidence = 'high'
      let source = 'jsonl-tail'

      if (isManagedRunning) {
        status = 'running'
        statusLabel = '🟢 运行中'
        controlMode = 'managed'
        source = 'cli-managed'
        confidence = 'high'
      } else if (isExternallyActive) {
        status = 'running'
        statusLabel = '👀 终端运行中'
        controlMode = 'observe-only'
        source = 'jsonl-tail'
        confidence = 'medium'
      }

      const firstUser = transcript.find(m => m.role === 'user')
      const lastAssistant = [...transcript].reverse().find(m => m.role === 'assistant')
      const title =
        titles.get(sessionId)
        || cleanTitle(firstUser?.text)
        || `Codex (${sessionId.slice(0, 8)})`

      results.push({
        id: fullId,
        rawId: sessionId,
        harness: 'codex',
        harnessLabel: 'Codex',
        title,
        status,
        statusLabel,
        turnState: status === 'running' ? 'running' : 'idle',
        controlMode,
        cwd: cwd || '',
        model: model || 'codex',
        lastActivity: Math.round(file.mtimeMs),
        updatedAt: Math.round(file.mtimeMs),
        lastStepIndex,
        preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
        transcript,
        stateMeta: {
          source,
          observedAt: Math.round(file.mtimeMs),
          confidence,
        },
      })
    }
    return results
  }

  async createSession({ prompt, cwd, imagePaths = [], execImpl } = {}) {
    const text = String(prompt || '').trim()
    if (!text) return { ok: false, error: '请输入新建任务的指令内容' }
    const bin = this.binaryPath || findCodexBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 codex CLI 可执行文件' }
    }
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const args = ['exec', text, ...imgFlags, '--skip-git-repo-check', '--json']
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
    child.on('exit', () => this.activeRuns.delete(runKey))
    child.on('error', () => this.activeRuns.delete(runKey))
    return {
      ok: true,
      harness: 'codex',
      message: '已在电脑端启动新的 Codex 后台任务',
    }
  }

  async sendPrompt({ sessionId, text, cwd, imagePaths = [], mode = 'prompt', execImpl } = {}) {
    const rawId = toRawCodexId(sessionId)
    const prompt = String(text || '').trim()
    if (!prompt) return { ok: false, error: '请输入指令内容' }
    if (this.activeRuns.has(rawId)) {
      return {
        ok: false,
        busy: true,
        error: '该 Codex 会话正在后台执行上一条指令，不支持并发插话，请等待本轮完成或先点击停止',
      }
    }
    if (mode === 'steer') {
      return {
        ok: false,
        busy: true,
        error: 'Codex CLI 不支持运行中途插话（Steer），请等待当前回合完成或先点击停止',
      }
    }
    const bin = this.binaryPath || findCodexBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 codex CLI 可执行文件' }
    }
    const imgFlags = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).flatMap(p => ['-i', p]) : []
    const args = ['exec', 'resume', rawId, prompt, ...imgFlags, '--skip-git-repo-check', '--json']
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
    child.on('exit', () => {
      this.activeRuns.delete(rawId)
    })
    child.on('error', () => {
      this.activeRuns.delete(rawId)
    })
    return {
      ok: true,
      agentId: `${CODEX_SESSION_PREFIX}${rawId}`,
      message: `已在 Codex 会话 (${rawId.slice(0, 8)}) 中启动后台续跑`,
    }
  }

  async stopSession({ sessionId } = {}) {
    const rawId = toRawCodexId(sessionId)
    const child = this.activeRuns.get(rawId)
    if (child && typeof child.kill === 'function') {
      try {
        child.kill('SIGTERM')
      } catch {}
      this.activeRuns.delete(rawId)
      return { ok: true, agentId: sessionId, message: '已中止 Codex 后台任务' }
    }
    return { ok: false, error: '该 Codex 会话当前没有受管运行中的后台进程' }
  }

  async deleteSession({ sessionId } = {}) {
    const rawId = toRawCodexId(sessionId)
    this.deletedIds.add(rawId)
    return { ok: true }
  }
}
