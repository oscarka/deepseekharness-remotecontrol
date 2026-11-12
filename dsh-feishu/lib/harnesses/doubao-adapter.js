import { existsSync, readdirSync, readFileSync, statSync, watch } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { discoverDoubaoIndexedDbDirs, readDoubaoIndexedDbSnapshot } from './doubao-idb.js'

export const DOUBAO_SESSION_PREFIX = 'doubao:'
export const DOUBAO_BOARD_RUNNING_STALE_MS = 10 * 60_000
export const DOUBAO_WATCH_DEBOUNCE_MS = 300

export function isDoubaoSessionId(id = '') {
  return String(id || '').startsWith(DOUBAO_SESSION_PREFIX)
}

export function toRawDoubaoId(id = '') {
  const s = String(id || '')
  return s.startsWith(DOUBAO_SESSION_PREFIX) ? s.slice(DOUBAO_SESSION_PREFIX.length) : s
}

export function parseIsoMs(raw = '') {
  const clean = String(raw || '')
    .trim()
    .replace(/(\.\d{3})\d+(Z|[+-]\d{2}:?\d{2})$/, '$1$2')
  const ms = Date.parse(clean)
  return Number.isFinite(ms) ? ms : 0
}

export function getDoubaoDataRoot(overrideDir = '') {
  if (overrideDir) return resolve(overrideDir)
  if (process.env.FEISHU_DOUBAO_HOME) return resolve(process.env.FEISHU_DOUBAO_HOME)
  if (process.env.DOUBAO_HOME) return resolve(process.env.DOUBAO_HOME)
  const home = homedir()
  if (process.platform === 'win32') {
    const winCandidates = [
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Doubao', 'User Data') : '',
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Doubao') : '',
      process.env.APPDATA ? join(process.env.APPDATA, 'Doubao', 'User Data') : '',
    ].filter(Boolean)
    return winCandidates.find(p => existsSync(p)) || winCandidates[0] || join(home, 'AppData', 'Local', 'Doubao', 'User Data')
  }
  if (process.platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Doubao')
  }
  return join(home, '.config', 'Doubao')
}

export function getDoubaoChatsDir(overrideDir = '') {
  if (overrideDir) return resolve(overrideDir)
  if (process.env.DOUBAO_CHATS_DIR) return resolve(process.env.DOUBAO_CHATS_DIR)
  return join(homedir(), 'Doubao')
}

export function findDoubaoAppPath(customPath = '') {
  const home = homedir()
  const candidates = [
    customPath,
    process.env.DOUBAO_APP_PATH,
    '/Applications/Doubao.app',
    join(home, 'Applications', 'Doubao.app'),
  ].filter(Boolean)
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return ''
}

export function discoverDoubaoModels() {
  return {
    defaultModel: 'auto',
    defaultLabel: '豆包 Seed (桌面端默认)',
    models: [
      { id: 'auto', value: 'auto', label: '豆包 Seed (桌面端默认)', default: true },
      { id: 'doubao-seed-thinking', value: 'doubao-seed-thinking', label: '豆包 · 深度思考 (任务模式)' },
      { id: 'doubao-seed-fast', value: 'doubao-seed-fast', label: '豆包 · 极速对话' },
    ],
  }
}

export function discoverDoubaoSessionRoots(doubaoHome = getDoubaoDataRoot()) {
  if (!doubaoHome || !existsSync(doubaoHome)) return []
  const roots = new Set()
  const directCandidates = [
    join(doubaoHome, 'Default', '.doubao', 'agent_mode', 'workspace', '.sessions'),
    join(doubaoHome, '.doubao', 'agent_mode', 'workspace', '.sessions'),
    join(doubaoHome, 'agent_mode', 'workspace', '.sessions'),
    join(doubaoHome, '.sessions'),
  ]
  for (const c of directCandidates) {
    if (existsSync(c)) roots.add(resolve(c))
  }
  try {
    for (const entry of readdirSync(doubaoHome, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('Profile ')) {
        const p = join(doubaoHome, entry.name, '.doubao', 'agent_mode', 'workspace', '.sessions')
        if (existsSync(p)) roots.add(resolve(p))
      }
    }
  } catch {}
  return [...roots]
}

export function parseDoubaoAssignment(rawText = '') {
  const text = String(rawText || '')
  const roleMatch = text.match(/^-\s*Role:\s*(\S+)/m)
  const createdMatch = text.match(/^-\s*Created:\s*(\S+)/m)
  const demands = []
  const re = /^## \[([^\]]+)\]\s*需求[^\n]*\n([\s\S]*?)(?=\n## \[|$)/gm
  let m
  while ((m = re.exec(text)) !== null) {
    const promptText = String(m[2] || '').trim()
    if (promptText) {
      demands.push({
        time: parseIsoMs(m[1]),
        text: promptText,
      })
    }
  }
  return {
    role: roleMatch ? roleMatch[1].trim() : '',
    createdMs: createdMatch ? parseIsoMs(createdMatch[1]) : 0,
    demands,
  }
}

export function parseDoubaoBoard(rawText = '', sessionDir = '') {
  const text = String(rawText || '')
  const updatedMatch = text.match(/_最后更新：([^_]+)_/)
  const updatedMs = updatedMatch ? parseIsoMs(updatedMatch[1]) : 0
  const tasks = []
  const artifacts = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue
    const cols = trimmed.slice(1, -1).split('|').map(c => c.trim())
    if (cols.length < 4) continue
    if (cols[0] === '任务ID' || /^-+$/.test(cols[0].replace(/\s+/g, ''))) continue
    const [taskId, title, organizer, status, artifactPath = '', artifactLink = ''] = cols
    if (!taskId && !title) continue
    tasks.push({ taskId, title, organizer, status, artifactPath, artifactLink })
    if (artifactPath && artifactPath !== '-') {
      const resolvedPath = artifactPath.startsWith('/')
        ? artifactPath
        : sessionDir
          ? join(sessionDir, artifactPath)
          : artifactPath
      if (!artifacts.includes(resolvedPath)) artifacts.push(resolvedPath)
    }
  }
  const hasRunningTask = tasks.some(t => /进行中|执行中|running|in_progress|working/i.test(t.status))
  return { updatedMs, tasks, artifacts, hasRunningTask }
}

export function parseDoubaoTrajectory(rawJsonl = '', fallbackTimeMs = 0) {
  const lines = String(rawJsonl || '').split(/\r?\n/).filter(Boolean)
  const items = []
  for (const line of lines) {
    let rec
    try {
      rec = JSON.parse(line)
    } catch {
      continue
    }
    const ts = parseIsoMs(rec.timestamp || rec.created_at || '') || Number(rec.time) || fallbackTimeMs
    if (rec.role === 'user') {
      const content = typeof rec.content === 'string'
        ? rec.content
        : Array.isArray(rec.content)
          ? rec.content.filter(b => b?.type === 'text' && b.text).map(b => b.text).join('\n')
          : ''
      if (content.trim()) {
        items.push({
          role: 'user',
          text: content.trim(),
          thinking: '',
          tools: [],
          toolCalls: [],
          time: ts,
        })
      }
    } else if (rec.role === 'assistant') {
      const textParts = []
      const thinkingParts = []
      const tools = []
      const toolCalls = []
      if (typeof rec.reasoning_content === 'string' && rec.reasoning_content.trim()) {
        thinkingParts.push(rec.reasoning_content.trim())
      }
      if (typeof rec.thinking === 'string' && rec.thinking.trim()) {
        thinkingParts.push(rec.thinking.trim())
      }
      if (typeof rec.content === 'string' && rec.content.trim()) {
        textParts.push(rec.content.trim())
      } else if (Array.isArray(rec.content)) {
        for (const block of rec.content) {
          if (block?.type === 'text' && block.text) textParts.push(block.text)
          else if (block?.type === 'thinking' && block.thinking) thinkingParts.push(block.thinking)
          else if ((block?.type === 'tool_use' || block?.type === 'tool_call') && block.name) {
            if (!tools.includes(block.name)) tools.push(block.name)
            toolCalls.push({
              name: block.name,
              argsSummary: JSON.stringify(block.input || block.arguments || {}).slice(0, 120),
            })
          }
        }
      }
      if (Array.isArray(rec.tool_calls)) {
        for (const tc of rec.tool_calls) {
          const name = tc?.function?.name || tc?.name || 'tool'
          const rawArgs = tc?.function?.arguments ?? tc?.arguments ?? {}
          if (!tools.includes(name)) tools.push(name)
          toolCalls.push({
            name,
            argsSummary: (typeof rawArgs === 'string' ? rawArgs : JSON.stringify(rawArgs)).slice(0, 120),
          })
        }
      }
      const text = textParts.join('\n').trim()
      const thinking = thinkingParts.join('\n').trim()
      if (text || thinking || tools.length > 0) {
        items.push({
          role: 'assistant',
          text,
          thinking,
          tools,
          toolCalls,
          time: ts,
        })
      }
    }
  }
  return items
}

export function mergeDoubaoDemandsAndTrajectory(demands = [], trajItems = [], fallbackTimeMs = 0) {
  const hasUserInTraj = trajItems.some(m => m.role === 'user')
  const merged = []
  if (hasUserInTraj) {
    const firstTrajIsAssistant = trajItems[0]?.role === 'assistant'
    if (firstTrajIsAssistant && demands.length > 0) {
      const d0 = String(demands[0].text || '').trim()
      if (d0 && !trajItems.some(m => m.role === 'user' && String(m.text || '').trim() === d0)) {
        merged.push({
          role: 'user',
          text: d0,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: demands[0].time || trajItems[0].time || fallbackTimeMs,
        })
      }
    }
    merged.push(...trajItems)
    for (const d of demands) {
      const dt = String(d.text || '').trim()
      if (!dt) continue
      if (!merged.some(m => m.role === 'user' && String(m.text || '').trim() === dt)) {
        merged.push({
          role: 'user',
          text: dt,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: d.time || fallbackTimeMs,
        })
      }
    }
  } else {
    const groups = []
    let cur = []
    for (const item of trajItems) {
      cur.push(item)
      const isFinalReply = Boolean(item.text) && (!item.tools || item.tools.length === 0)
      if (isFinalReply) {
        groups.push(cur)
        cur = []
      }
    }
    if (cur.length > 0) groups.push(cur)

    const maxLen = Math.max(demands.length, groups.length)
    for (let i = 0; i < maxLen; i += 1) {
      if (i < demands.length) {
        merged.push({
          role: 'user',
          text: demands[i].text,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: demands[i].time || fallbackTimeMs,
        })
      }
      if (i < groups.length) {
        for (const a of groups[i]) {
          merged.push({
            ...a,
            time: a.time || demands[i]?.time || fallbackTimeMs,
          })
        }
      }
    }
  }
  return merged.map((m, idx) => ({ ...m, index: idx }))
}

function extractCleanTitle(raw = '') {
  const firstLine = String(raw || '')
    .replace(/^#+\s*/gm, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .find(Boolean) || ''
  return firstLine.replace(/\s+/g, ' ').slice(0, 48)
}

export function mergeDoubaoIdbTurns(baseTranscript = [], idbTurns = [], fallbackTimeMs = 0) {
  const out = baseTranscript.map(m => ({ ...m }))
  const sortedTurns = [...idbTurns].sort((a, b) => (a.userTimeMs || 0) - (b.userTimeMs || 0))
  for (const turn of sortedTurns) {
    const uText = String(turn.userText || '').trim()
    const aText = String(turn.assistantText || '').trim()
    const aThink = String(turn.assistantThinking || '').trim()
    let uIdx = -1
    if (uText) {
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].role === 'user' && String(out[i].text || '').trim() === uText) {
          uIdx = i
          break
        }
      }
      if (uIdx === -1) {
        out.push({
          role: 'user',
          text: uText,
          thinking: '',
          tools: [],
          toolCalls: [],
          time: turn.userTimeMs || fallbackTimeMs,
        })
        uIdx = out.length - 1
      }
    }
    if (!aText && !aThink) continue
    let existingAssistantIdx = -1
    if (uIdx >= 0) {
      for (let j = uIdx + 1; j < out.length; j++) {
        if (out[j].role === 'user') break
        if (out[j].role === 'assistant' && (!out[j].tools || out[j].tools.length === 0)) {
          existingAssistantIdx = j
        }
      }
    }
    const newAssistant = {
      role: 'assistant',
      text: aText,
      thinking: aThink,
      tools: [],
      toolCalls: [],
      time: turn.assistantTimeMs || turn.userTimeMs || fallbackTimeMs,
    }
    if (existingAssistantIdx >= 0) {
      if (aText && !out[existingAssistantIdx].text) out[existingAssistantIdx].text = aText
      if (aThink && !out[existingAssistantIdx].thinking) out[existingAssistantIdx].thinking = aThink
      if (turn.assistantTimeMs) out[existingAssistantIdx].time = turn.assistantTimeMs
    } else if (uIdx >= 0 && uIdx < out.length - 1) {
      let insertAt = uIdx + 1
      while (insertAt < out.length && out[insertAt].role !== 'user') insertAt++
      out.splice(insertAt, 0, newAssistant)
    } else {
      out.push(newAssistant)
    }
  }
  return out.map((m, idx) => ({ ...m, index: idx }))
}

export class DoubaoAdapter {
  constructor({
    doubaoHome = '',
    chatsDir = '',
    appPath = '',
    maxSessions = 15,
    execImpl = undefined,
    onStateChange = null,
  } = {}) {
    this.id = 'doubao'
    this.label = '豆包电脑版'
    this.icon = '🫘'
    this.doubaoHome = getDoubaoDataRoot(doubaoHome)
    this.chatsDir = getDoubaoChatsDir(chatsDir)
    this.appPath = appPath || findDoubaoAppPath()
    this.maxSessions = maxSessions
    this.execImpl = execImpl
    this.onStateChange = onStateChange
    this.deletedIds = new Set()
    this.customTitles = new Map()
    this.fallbackSeenAt = new Map()
    this.lastIdbDigest = ''
    this.wsWatchTimer = null
    this.idbWatchTimer = null
    this.watchers = new Map()
    this._setupWatchers()
  }

  _computeIdbDigest(snap) {
    const parts = []
    for (const [cid, m] of snap.conversationsById.entries()) {
      parts.push(`c:${cid}:${m.name}:${m.updateTimeMs}`)
    }
    for (const [cid, tmap] of snap.turnsByConvId.entries()) {
      for (const [tid, t] of tmap.entries()) {
        parts.push(`t:${cid}:${tid}:${t.userText.length}:${t.assistantText.length}:${t.isStreaming ? 1 : 0}`)
      }
    }
    return parts.join('|')
  }

  _setupWatchers() {
    if (typeof this.onStateChange !== 'function') return
    for (const root of discoverDoubaoSessionRoots(this.doubaoHome)) {
      if (this.watchers.has(root)) continue
      try {
        const w = watch(root, { persistent: false }, () => {
          if (this.wsWatchTimer) return
          this.wsWatchTimer = setTimeout(() => {
            this.wsWatchTimer = null
            this.onStateChange?.()
          }, DOUBAO_WATCH_DEBOUNCE_MS)
          this.wsWatchTimer.unref?.()
        })
        w.on('error', () => {
          try { w.close() } catch {}
          this.watchers.delete(root)
        })
        this.watchers.set(root, w)
      } catch {}
    }
    for (const idbDir of discoverDoubaoIndexedDbDirs(this.doubaoHome)) {
      if (this.watchers.has(idbDir)) continue
      try {
        const w = watch(idbDir, { persistent: false }, () => {
          if (this.idbWatchTimer) return
          this.idbWatchTimer = setTimeout(() => {
            this.idbWatchTimer = null
            try {
              const snap = readDoubaoIndexedDbSnapshot(this.doubaoHome)
              const nextDigest = this._computeIdbDigest(snap)
              if (nextDigest === this.lastIdbDigest) return
              this.lastIdbDigest = nextDigest
            } catch {}
            this.onStateChange?.()
          }, DOUBAO_WATCH_DEBOUNCE_MS)
          this.idbWatchTimer.unref?.()
        })
        w.on('error', () => {
          try { w.close() } catch {}
          this.watchers.delete(idbDir)
        })
        this.watchers.set(idbDir, w)
      } catch {}
    }
  }

  shutdown() {
    if (this.wsWatchTimer) {
      clearTimeout(this.wsWatchTimer)
      this.wsWatchTimer = null
    }
    if (this.idbWatchTimer) {
      clearTimeout(this.idbWatchTimer)
      this.idbWatchTimer = null
    }
    for (const w of this.watchers.values()) {
      try { w.close() } catch {}
    }
    this.watchers.clear()
  }

  getCapabilities() {
    return {
      canView: true,
      canCreateSession: false,
      canPrompt: false,
      canSteer: false,
      canStop: false,
      canApprove: false,
    }
  }

  async detectHealth() {
    const appPath = this.appPath || findDoubaoAppPath()
    const hasApp = Boolean(appPath && existsSync(appPath))
    const sessionRoots = discoverDoubaoSessionRoots(this.doubaoHome)
    const indexedDbDirs = discoverDoubaoIndexedDbDirs(this.doubaoHome)
    return {
      installed: hasApp || sessionRoots.length > 0 || indexedDbDirs.length > 0,
      hasApp,
      appPath,
      sessionRoots,
      indexedDbDirs,
    }
  }

  async listSessions({ now = Date.now(), maxMessages = 80 } = {}) {
    this._setupWatchers()
    const roots = discoverDoubaoSessionRoots(this.doubaoHome)
    const idbSnap = readDoubaoIndexedDbSnapshot(this.doubaoHome)
    this.lastIdbDigest = this._computeIdbDigest(idbSnap)
    if (roots.length === 0 && idbSnap.turnsByConvId.size === 0) return []

    const sessionMap = new Map()
    for (const root of roots) {
      try {
        for (const entry of readdirSync(root, { withFileTypes: true })) {
          if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('local_')) continue
          if (/^(lock|tmp|temp|heartbeat|cache)$/i.test(entry.name)) continue
          const full = join(root, entry.name)
          try {
            const st = statSync(full)
            sessionMap.set(entry.name, { id: entry.name, dir: full, mtimeMs: st.mtimeMs })
          } catch {}
        }
      } catch {}
    }
    for (const [convId, turnMap] of idbSnap.turnsByConvId.entries()) {
      if (convId.startsWith('local_')) continue
      if (!sessionMap.has(convId)) {
        const meta = idbSnap.conversationsById.get(convId)
        let maxTurnMs = meta?.updateTimeMs || meta?.createTimeMs || 0
        for (const t of turnMap.values()) {
          maxTurnMs = Math.max(maxTurnMs, t.assistantTimeMs || 0, t.userTimeMs || 0)
        }
        if (!maxTurnMs) {
          if (!this.fallbackSeenAt.has(convId)) {
            this.fallbackSeenAt.set(convId, Math.round(idbSnap.latestMtimeMs || now))
          }
          maxTurnMs = this.fallbackSeenAt.get(convId)
        }
        sessionMap.set(convId, { id: convId, dir: '', mtimeMs: maxTurnMs })
      }
    }

    const sessionDirs = [...sessionMap.values()].sort((a, b) => b.mtimeMs - a.mtimeMs)
    const results = []

    for (const sess of sessionDirs) {
      if (this.deletedIds.has(sess.id)) continue

      const idbMeta = idbSnap.conversationsById.get(sess.id) || null
      const idbTurns = idbSnap.turnsByConvId.has(sess.id)
        ? [...idbSnap.turnsByConvId.get(sess.id).values()]
        : []

      let contentMtimeMs = idbMeta?.updateTimeMs || 0
      for (const t of idbTurns) {
        contentMtimeMs = Math.max(contentMtimeMs, t.assistantTimeMs || 0, t.userTimeMs || 0)
      }

      const boardPath = sess.dir ? join(sess.dir, 'board.md') : ''
      let boardInfo = { updatedMs: 0, tasks: [], artifacts: [], hasRunningTask: false }
      if (boardPath && existsSync(boardPath)) {
        try {
          const bst = statSync(boardPath)
          if (bst.mtimeMs > contentMtimeMs) contentMtimeMs = bst.mtimeMs
          boardInfo = parseDoubaoBoard(readFileSync(boardPath, 'utf8'), sess.dir)
          if (boardInfo.updatedMs > contentMtimeMs) contentMtimeMs = boardInfo.updatedMs
        } catch {}
      }

      const agentsDir = sess.dir ? join(sess.dir, 'agents') : ''
      let mainAgent = null
      const subAgents = []
      if (agentsDir && existsSync(agentsDir)) {
        try {
          for (const agEntry of readdirSync(agentsDir, { withFileTypes: true })) {
            if (!agEntry.isDirectory() || agEntry.name.startsWith('.')) continue
            const sysDir = join(agentsDir, agEntry.name, 'system')
            const assignPath = join(sysDir, 'assignment.md')
            const trajPath = join(sysDir, 'trajectory.jsonl')
            let assignInfo = { role: '', createdMs: 0, demands: [] }
            let trajRaw = ''
            let agMtime = 0
            if (existsSync(assignPath)) {
              try {
                const ast = statSync(assignPath)
                agMtime = Math.max(agMtime, ast.mtimeMs)
                assignInfo = parseDoubaoAssignment(readFileSync(assignPath, 'utf8'))
              } catch {}
            }
            if (existsSync(trajPath)) {
              try {
                const tst = statSync(trajPath)
                agMtime = Math.max(agMtime, tst.mtimeMs)
                trajRaw = readFileSync(trajPath, 'utf8')
              } catch {}
            }
            if (agMtime > contentMtimeMs) contentMtimeMs = agMtime
            const candidate = {
              agentId: agEntry.name,
              role: assignInfo.role || (agEntry.name.startsWith('m_') ? 'main' : 'sub'),
              createdMs: assignInfo.createdMs,
              demands: assignInfo.demands,
              trajItems: parseDoubaoTrajectory(trajRaw, Math.round(agMtime || contentMtimeMs || sess.mtimeMs)),
              mtimeMs: agMtime,
            }
            if (candidate.role === 'main' || (!mainAgent && agEntry.name.startsWith('m_'))) {
              mainAgent = candidate
            } else {
              subAgents.push(candidate)
            }
          }
        } catch {}
      }

      if (!mainAgent && subAgents.length > 0) {
        mainAgent = subAgents.shift()
      }

      const latestMtimeMs = contentMtimeMs || sess.mtimeMs
      const fallbackMs = Math.round(latestMtimeMs)
      const baseTranscript = mainAgent
        ? mergeDoubaoDemandsAndTrajectory(mainAgent.demands, mainAgent.trajItems, fallbackMs)
        : []
      const fullTranscript = mergeDoubaoIdbTurns(baseTranscript, idbTurns, fallbackMs)
      const hasUserTurn = fullTranscript.some(m => m.role === 'user' && Boolean(String(m.text || '').trim()))
      // Skip pre-warmed empty greeting stubs (0 user messages & 0 board tasks) so phantom welcome tabs never pin at top
      if (!hasUserTurn && boardInfo.tasks.length === 0) continue

      const lastMsg = fullTranscript[fullTranscript.length - 1] || null
      const lastRole = lastMsg?.role || 'idle'
      const boardRunningFresh =
        boardInfo.hasRunningTask && now - latestMtimeMs < DOUBAO_BOARD_RUNNING_STALE_MS
      const subAgentActive =
        (boardInfo.tasks.length === 0 || boardRunningFresh) &&
        subAgents.some(sa => now - (sa.mtimeMs || 0) < 30_000)
      const idbStreaming = idbTurns.some(t => t.isStreaming && now - (t.assistantTimeMs || t.userTimeMs || 0) < 120_000)
      const isActivelyRunning =
        boardRunningFresh ||
        subAgentActive ||
        idbStreaming ||
        (lastRole === 'user' && now - latestMtimeMs < 60_000)

      const status = isActivelyRunning ? 'running' : 'idle'
      const controlMode = 'observe-only'
      const statusLabel = isActivelyRunning ? '🟢 任务执行中' : '👀 仅观测'

      const firstUser = fullTranscript.find(m => m.role === 'user')
      const lastAssistant = [...fullTranscript].reverse().find(m => m.role === 'assistant')
      const boardTitle = boardInfo.tasks[0]?.title || ''
      const title =
        this.customTitles.get(sess.id) ||
        idbMeta?.name ||
        boardTitle ||
        extractCleanTitle(firstUser?.text) ||
        `豆包任务 (${sess.id.slice(-6)})`

      const rawArtifactPaths = [...boardInfo.artifacts]
      const attachDir = sess.dir ? join(sess.dir, 'attachments') : ''
      if (attachDir && existsSync(attachDir)) {
        try {
          for (const f of readdirSync(attachDir)) {
            if (!f.startsWith('.')) rawArtifactPaths.push(join(attachDir, f))
          }
        } catch {}
      }
      if (boardPath && existsSync(boardPath)) {
        rawArtifactPaths.push(boardPath)
      }
      const seenArtPaths = new Set()
      const artifacts = []
      for (const rawPath of rawArtifactPaths) {
        const cleanPath = String(rawPath || '').trim()
        if (!cleanPath || seenArtPaths.has(cleanPath)) continue
        seenArtPaths.add(cleanPath)
        const name = basename(cleanPath)
        const isBoard = name === 'board.md'
        let artMtimeMs = Math.round(latestMtimeMs)
        try {
          if (existsSync(cleanPath)) artMtimeMs = Math.round(statSync(cleanPath).mtimeMs)
        } catch {}
        const matchedBoardRow = boardInfo.tasks.find(t => t.artifactPath && cleanPath.endsWith(basename(t.artifactPath)))
        artifacts.push({
          name,
          path: cleanPath,
          kind: isBoard ? 'task' : 'artifact',
          title: isBoard ? '任务看板' : '豆包产物',
          summary: isBoard
            ? (boardInfo.tasks.length > 0 ? `共 ${boardInfo.tasks.length} 项子任务 (${boardTitle || 'board.md'})` : '豆包 Agent 任务公告板')
            : (matchedBoardRow ? `${matchedBoardRow.title} (${matchedBoardRow.status})` : name),
          mtimeMs: artMtimeMs,
        })
      }

      let resolvedCwd = idbSnap.cwdByConvId.get(sess.id) || sess.dir || ''
      if (idbSnap.cwdByConvId.has(sess.id) && existsSync(resolvedCwd)) {
        try {
          for (const f of readdirSync(resolvedCwd)) {
            if (!f.startsWith('.')) {
              const fullDeliv = join(resolvedCwd, f)
              if (!seenArtPaths.has(fullDeliv) && statSync(fullDeliv).isFile()) {
                seenArtPaths.add(fullDeliv)
                artifacts.push({
                  name: f,
                  path: fullDeliv,
                  kind: 'artifact',
                  title: '豆包产物',
                  summary: f,
                  mtimeMs: Math.round(statSync(fullDeliv).mtimeMs),
                })
              }
            }
          }
        } catch {}
      } else if (sess.dir && !idbSnap.cwdByConvId.has(sess.id) && this.chatsDir && existsSync(join(this.chatsDir, 'chats'))) {
        try {
          const dateDirs = readdirSync(join(this.chatsDir, 'chats'), { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'))
            .map(d => join(this.chatsDir, 'chats', d.name))
          for (const dd of dateDirs) {
            const subs = readdirSync(dd, { withFileTypes: true }).filter(s => !s.name.startsWith('.'))
            const nonEmptySub = subs.find(s => {
              if (!s.isDirectory()) return true
              try {
                return readdirSync(join(dd, s.name)).some(x => !x.startsWith('.'))
              } catch {
                return false
              }
            })
            if (nonEmptySub) {
              resolvedCwd = nonEmptySub.isDirectory() ? join(dd, nonEmptySub.name) : dd
              break
            }
          }
        } catch {}
      }

      const hasConcluded = status !== 'running' && lastRole === 'assistant' && Boolean(lastAssistant?.text)
      const transcript = fullTranscript.slice(-maxMessages)
      const projectLabel = idbMeta?.type === 1 ? '豆包对话' : '豆包工作'

      results.push({
        id: `${DOUBAO_SESSION_PREFIX}${sess.id}`,
        rawId: sess.id,
        harness: 'doubao',
        harnessLabel: '豆包电脑版',
        project: projectLabel,
        title,
        status,
        statusLabel,
        turnState: status === 'running' ? 'running' : hasConcluded ? 'conclusion' : 'idle',
        lastConclusionAt: hasConcluded ? Math.round(latestMtimeMs) : 0,
        controlMode,
        cwd: resolvedCwd,
        model: '豆包 Seed',
        lastRole,
        lastActivity: Math.round(latestMtimeMs),
        updatedAt: Math.round(latestMtimeMs),
        lastStepIndex: fullTranscript.length - 1,
        messageCount: fullTranscript.length,
        lastOutput: String(lastAssistant?.text || firstUser?.text || '').slice(0, 240),
        preview: String(lastAssistant?.text || firstUser?.text || '').slice(0, 160),
        runningSummary: isActivelyRunning
          ? (boardInfo.tasks.find(t => /进行中|执行中|running/i.test(t.status))?.title || '🫘 豆包正在执行任务...')
          : '',
        artifacts,
        transcript,
        stateMeta: {
          source: idbTurns.length > 0 ? 'doubao-indexeddb+workspace' : 'doubao-agent-workspace',
          observedAt: Math.round(latestMtimeMs),
          confidence: 'high',
        },
      })
    }
    results.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    return results.slice(0, this.maxSessions)
  }

  async createSession() {
    return {
      ok: false,
      error: '豆包电脑版当前为仅观测模式（Observe-Only），暂不支持远程新建对话，请在电脑端豆包操作',
    }
  }

  async sendPrompt() {
    return {
      ok: false,
      error: '豆包电脑版当前为仅观测模式（Observe-Only），暂不支持远程发送指令，请在电脑端豆包操作',
    }
  }

  async stopSession() {
    return {
      ok: false,
      error: '豆包电脑版当前为仅观测模式（Observe-Only），暂不支持远程停止任务，请在电脑端豆包操作',
    }
  }

  async renameSession({ sessionId, title } = {}) {
    const rawId = toRawDoubaoId(sessionId)
    const clean = String(title || '').trim().slice(0, 64)
    if (!clean) return { ok: false, error: '标题不能为空' }
    this.customTitles.set(rawId, clean)
    return { ok: true, title: clean }
  }

  async deleteSession({ sessionId } = {}) {
    const rawId = toRawDoubaoId(sessionId)
    this.deletedIds.add(rawId)
    return { ok: true }
  }
}
