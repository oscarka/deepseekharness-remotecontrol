import { execFile, spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const CLAUDE_SESSION_PREFIX = 'claude:'

export function isClaudeSessionId(id = '') {
  return String(id || '').startsWith(CLAUDE_SESSION_PREFIX)
}

export function toRawClaudeId(id = '') {
  const s = String(id || '')
  return s.startsWith(CLAUDE_SESSION_PREFIX) ? s.slice(CLAUDE_SESSION_PREFIX.length) : s
}

export function findClaudeBinary(customPath = '') {
  const home = homedir()
  const candidates = [
    customPath,
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    join(home, '.local/bin/claude'),
    join(home, '.claude/local/claude'),
  ].filter(Boolean)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return ''
}

function walkClaudeProjectFiles(dir, maxDepth = 3, depth = 0, out = []) {
  if (!dir || !existsSync(dir) || depth > maxDepth) return out
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        walkClaudeProjectFiles(full, maxDepth, depth + 1, out)
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

function extractCleanPromptTitle(raw = '') {
  const text = String(raw || '').trim()
  if (!text) return ''
  const currentReqMatch = text.match(/当前请求:\s*\n+([^\n]+)/)
  if (currentReqMatch?.[1]) {
    return currentReqMatch[1].trim().slice(0, 48)
  }
  const firstLine =
    text
      .replace(/^#+\s*/gm, '')
      .split('\n')
      .map(l => l.trim())
      .find(Boolean) || ''
  return firstLine.replace(/\s+/g, ' ').slice(0, 48)
}

export function parseClaudeSessionContent(rawContent = '', fallbackId = '') {
  const lines = String(rawContent || '').split('\n').filter(Boolean)
  let sessionId = fallbackId
  let cwd = ''
  let model = ''
  let lastRole = 'idle'
  let lastStepIndex = 0
  const transcript = []

  for (let i = 0; i < lines.length; i++) {
    let rec
    try {
      rec = JSON.parse(lines[i])
    } catch {
      continue
    }
    lastStepIndex = i
    if (rec.sessionId) sessionId = rec.sessionId
    if (rec.cwd) cwd = rec.cwd
    const ts = rec.timestamp ? Date.parse(rec.timestamp) || 0 : 0

    if (rec.type === 'user' && rec.message) {
      let text = ''
      if (typeof rec.message.content === 'string') {
        text = rec.message.content
      } else if (Array.isArray(rec.message.content)) {
        text = rec.message.content
          .filter(c => c.type === 'text' && c.text)
          .map(c => c.text)
          .join('\n')
      }
      const trimmed = String(text || '').trim()
      if (trimmed) {
        lastRole = 'user'
        transcript.push({
          index: transcript.length,
          role: 'user',
          text: trimmed,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: ts || Date.now(),
        })
      }
    } else if (rec.type === 'assistant' && rec.message) {
      if (rec.isApiErrorMessage && String(rec.error || '') === 'authentication_failed') {
        continue
      }
      if (rec.message.model && rec.message.model !== '<synthetic>') {
        model = rec.message.model
      }
      const content = Array.isArray(rec.message.content) ? rec.message.content : []
      const textParts = []
      const thinkingParts = []
      const tools = []
      const toolCalls = []

      for (const block of content) {
        if (block.type === 'text' && block.text) {
          textParts.push(block.text)
        } else if (block.type === 'thinking' && block.thinking) {
          thinkingParts.push(block.thinking)
        } else if (block.type === 'tool_use') {
          const name = block.name || 'tool'
          if (!tools.includes(name)) tools.push(name)
          toolCalls.push({
            name,
            argsSummary: JSON.stringify(block.input || {}).slice(0, 120),
          })
        }
      }

      const text = textParts.join('\n').trim()
      const thinking = thinkingParts.join('\n').trim()
      if (text || thinking || tools.length > 0) {
        lastRole = 'assistant'
        transcript.push({
          index: transcript.length,
          role: 'assistant',
          text,
          thinking,
          tools,
          toolCalls,
          time: ts || Date.now(),
        })
      }
    }
  }

  return {
    sessionId,
    cwd,
    model,
    lastRole,
    lastStepIndex,
    transcript: transcript.slice(-80),
  }
}

export class ClaudeAdapter {
  constructor({
    claudeHome = join(homedir(), '.claude'),
    binaryPath = '',
    maxSessions = 10,
    execImpl = undefined,
    spawnImpl = spawn,
  } = {}) {
    this.id = 'claude'
    this.label = 'Claude Code'
    this.icon = '✴️'
    this.claudeHome = claudeHome
    this.binaryPath = binaryPath || findClaudeBinary()
    this.maxSessions = maxSessions
    this.execImpl = execImpl
    this.spawnImpl = spawnImpl
    this.fileCache = new Map()
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
    const projectsDir = join(this.claudeHome, 'projects')
    const hasDir = existsSync(projectsDir)
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    return {
      installed: hasBin || hasDir,
      hasBinary: hasBin,
      binaryPath: this.binaryPath,
      projectsDir: hasDir ? projectsDir : '',
    }
  }

  async hasExternalClaudeProcess() {
    const runExec = this.execImpl || execFileAsync
    try {
      const { stdout } = await runExec('ps', ['-ax', '-o', 'command='], { timeout: 1500 })
      const lines = String(stdout || '').split('\n')
      return lines.some(line => /\bclaude\b/.test(line) && !line.includes('probe-harnesses'))
    } catch {
      return false
    }
  }

  async listSessions({ now = Date.now() } = {}) {
    const projectsDir = join(this.claudeHome, 'projects')
    if (!existsSync(projectsDir)) return []
    const files = walkClaudeProjectFiles(projectsDir, 3)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, Math.max(this.maxSessions * 3, 25))

    if (files.length === 0) return []
    const hasBin = Boolean(this.binaryPath && existsSync(this.binaryPath))
    const anyRecentFile = files.some(f => now - f.mtimeMs < 45_000)
    const externalRunning = anyRecentFile ? await this.hasExternalClaudeProcess() : false

    const results = []
    for (const file of files) {
      if (results.length >= this.maxSessions) break
      let parsed = this.fileCache.get(file.path)
      if (!parsed || parsed.mtimeMs !== file.mtimeMs || parsed.size !== file.size) {
        try {
          const raw = readFileSync(file.path, 'utf8')
          const fallbackUuid = basename(file.path, '.jsonl')
          const data = parseClaudeSessionContent(raw, fallbackUuid)
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

      const { sessionId, cwd, model, lastRole, lastStepIndex, transcript } = parsed.data
      const hasAssistantReply = transcript.some(m => m.role === 'assistant')
      if (!sessionId || this.deletedIds.has(sessionId) || transcript.length === 0 || !hasAssistantReply) continue
      const fullId = `${CLAUDE_SESSION_PREFIX}${sessionId}`
      const isManagedRunning = this.activeRuns.has(sessionId)
      const isExternallyActive =
        !isManagedRunning && lastRole === 'user' && now - file.mtimeMs < 45_000 && externalRunning

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
        extractCleanPromptTitle(firstUser?.text)
        || `Claude (${sessionId.slice(0, 8)})`

      results.push({
        id: fullId,
        rawId: sessionId,
        harness: 'claude',
        harnessLabel: 'Claude Code',
        title,
        status,
        statusLabel,
        turnState: status === 'running' ? 'running' : 'idle',
        controlMode,
        cwd: cwd || '',
        model: model || 'claude',
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

  async createSession({ prompt, cwd, execImpl } = {}) {
    const text = String(prompt || '').trim()
    if (!text) return { ok: false, error: '请输入新建任务的指令内容' }
    const bin = this.binaryPath || findClaudeBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 claude CLI 可执行文件' }
    }
    const args = ['-p', text]
    if (runExec) {
      await runExec(bin || 'claude', args, { cwd: cwd || undefined, timeout: 60_000 })
      return {
        ok: true,
        harness: 'claude',
        message: '已在电脑端启动新的 Claude Code 任务',
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
      harness: 'claude',
      message: '已在电脑端启动新的 Claude Code 后台任务',
    }
  }

  async sendPrompt({ sessionId, text, cwd, mode = 'prompt', execImpl } = {}) {
    const rawId = toRawClaudeId(sessionId)
    const prompt = String(text || '').trim()
    if (!prompt) return { ok: false, error: '请输入指令内容' }
    if (this.activeRuns.has(rawId)) {
      return {
        ok: false,
        busy: true,
        error: '该 Claude Code 会话正在后台执行上一条指令，不支持并发插话，请等待本轮完成或先点击停止',
      }
    }
    if (mode === 'steer') {
      return {
        ok: false,
        busy: true,
        error: 'Claude Code CLI 不支持运行中途插话（Steer），请等待当前回合完成或先点击停止',
      }
    }
    const bin = this.binaryPath || findClaudeBinary()
    const runExec = execImpl || this.execImpl
    if (!bin && !runExec) {
      return { ok: false, error: '当前电脑未检测到 claude CLI 可执行文件' }
    }
    const args = ['--resume', rawId, '-p', prompt]
    if (runExec) {
      await runExec(bin || 'claude', args, { cwd: cwd || undefined, timeout: 60_000 })
      return {
        ok: true,
        agentId: `${CLAUDE_SESSION_PREFIX}${rawId}`,
        message: `已在 Claude Code 会话 (${rawId.slice(0, 8)}) 中继续执行`,
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
      agentId: `${CLAUDE_SESSION_PREFIX}${rawId}`,
      message: `已在 Claude Code 会话 (${rawId.slice(0, 8)}) 中启动后台续跑`,
    }
  }

  async stopSession({ sessionId } = {}) {
    const rawId = toRawClaudeId(sessionId)
    const child = this.activeRuns.get(rawId)
    if (child && typeof child.kill === 'function') {
      try {
        child.kill('SIGTERM')
      } catch {}
      this.activeRuns.delete(rawId)
      return { ok: true, agentId: sessionId, message: '已中止 Claude Code 后台任务' }
    }
    return { ok: false, error: '该 Claude Code 会话当前没有受管运行中的后台进程' }
  }

  async deleteSession({ sessionId } = {}) {
    const rawId = toRawClaudeId(sessionId)
    this.deletedIds.add(rawId)
    return { ok: true }
  }
}
