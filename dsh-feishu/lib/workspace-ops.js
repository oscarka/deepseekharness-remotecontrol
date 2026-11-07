import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { chmod, lstat, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import * as zlib from 'node:zlib'
import { cleanForChat, redactText } from './redact.js'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

function isSystemInjectedUserText(text) {
  const t = String(text ?? '').trim()
  if (!t) return true
  if (t.startsWith('Current runtime context.')) return true
  if (t.startsWith('<system-reminder>')) return true
  if (t.startsWith('Time sampled while preparing turn')) return true
  return false
}

const MAX_PREVIEW_BYTES = 256 * 1024 // 256 KiB max text/code file preview
const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024 // 5 MiB max image preview
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.pnpm-store', '.cache', '.DS_Store', 'dist', 'build'])

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/**
 * Load or generate a persistent host cryptographic identity (Ed25519 / SHA-256 fingerprint)
 * for device pinning (replaces dsh.r2049.cn device identity descriptor).
 */
export async function loadOrCreateHostIdentity(dshHome) {
  const file = join(resolve(dshHome || '/tmp'), 'feishu-host.json')
  try {
    const raw = JSON.parse(await readFile(file, 'utf8'))
    if (raw?.publicKey && raw?.fingerprint) {
      return raw
    }
  } catch {
    // generate new identity below
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const pubDer = publicKey.export({ type: 'spki', format: 'der' })
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' })
  const pubBase64 = pubDer.toString('base64url')
  const fingerprint = formatFingerprint(pubDer)

  const record = {
    algorithm: 'Ed25519',
    publicKey: pubBase64,
    privateKey: privDer.toString('base64url'),
    fingerprint,
    createdAt: Date.now(),
  }

  try {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(file, JSON.stringify(record, null, 2), { mode: 0o600 })
    if (process.platform !== 'win32') await chmod(file, 0o600)
  } catch {
    // ignore write error on read-only test paths
  }
  return record
}

export function formatFingerprint(buffer) {
  const hex = createHash('sha256').update(buffer).digest('hex').slice(0, 12).toUpperCase()
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)}`
}

function parseToolArgsObject(rawArgs) {
  if (!rawArgs) return {}
  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) return rawArgs
  if (typeof rawArgs === 'string') {
    try {
      const parsed = JSON.parse(rawArgs)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      return { raw: rawArgs }
    }
  }
  return {}
}

function extractPrimaryArgSummary(argsObj) {
  const cmd = argsObj.command ?? argsObj.cmd ?? argsObj.CommandLine ?? argsObj.script ?? ''
  if (typeof cmd === 'string' && cmd.trim()) {
    const firstLine = cmd.trim().split('\n')[0].trim()
    return firstLine.length > 96 ? `${firstLine.slice(0, 96)}…` : firstLine
  }
  const filePath =
    argsObj.path ??
    argsObj.file_path ??
    argsObj.filePath ??
    argsObj.Path ??
    argsObj.TargetFile ??
    argsObj.target_file ??
    argsObj.cwd ??
    ''
  if (typeof filePath === 'string' && filePath.trim()) {
    return filePath.trim().replace(/^\/Users\/[^/]+/, '~')
  }
  const query = argsObj.pattern ?? argsObj.query ?? argsObj.regex ?? argsObj.glob ?? argsObj.url ?? ''
  if (typeof query === 'string' && query.trim()) {
    return query.trim().slice(0, 96)
  }
  const keys = Object.keys(argsObj)
  if (keys.length === 0) return ''
  try {
    const s = JSON.stringify(argsObj)
    return s.length > 96 ? `${s.slice(0, 96)}…` : s
  } catch {
    return ''
  }
}

function buildDshToolRecord(name, callId, rawArgs, resultText = '') {
  const cleanName = String(name || 'tool')
  const argsObj = parseToolArgsObject(rawArgs)
  const summary = redactText(extractPrimaryArgSummary(argsObj))
  let argsDetail = ''
  const cmd = argsObj.command ?? argsObj.cmd ?? argsObj.CommandLine ?? ''
  if (typeof cmd === 'string' && cmd.trim()) {
    argsDetail = `$ ${redactText(cmd.trim()).slice(0, 3500)}`
  } else if (Object.keys(argsObj).length > 0) {
    try {
      argsDetail = redactText(JSON.stringify(argsObj, null, 2)).slice(0, 2500)
    } catch {
      argsDetail = summary
    }
  }
  const cleanResult = resultText ? redactText(String(resultText).trim()).slice(0, 2500) : ''
  const detailParts = []
  if (argsDetail) detailParts.push(argsDetail)
  if (cleanResult) detailParts.push(`--- 执行输出 ---\n${cleanResult}`)
  return {
    name: cleanName,
    id: String(callId || ''),
    summary,
    commandLine: detailParts.join('\n\n') || summary || '执行完毕',
  }
}

/**
 * Merge consecutive `assistant` step items within a single turn (between `user` messages)
 * so 10-20 intermediate thinking + tool execution steps collapse into one turn bubble
 * with full thinking steps, full tool call details, and the complete untruncated final reply.
 */
export function mergeTurnAssistantMessages(items) {
  if (!Array.isArray(items) || items.length === 0) return []
  const merged = []
  let pendingAsst = null

  const flushAsst = () => {
    if (!pendingAsst) return
    const thoughtList = pendingAsst._thoughts.filter(Boolean)
    const combinedThinking =
      thoughtList.length === 0
        ? ''
        : thoughtList.length === 1
          ? thoughtList[0]
          : thoughtList
              .map((t, idx) => `【思考 ${idx + 1}】\n${t}`)
              .join('\n\n')
    const textList = pendingAsst._texts.filter(Boolean)
    const combinedText = cleanForChat(textList.join('\n\n').trim(), 48000)
    const tools = pendingAsst._tools
    merged.push({
      index: merged.length,
      role: 'assistant',
      text: combinedText,
      thinking: combinedThinking,
      thinkingStepCount: thoughtList.length,
      tools,
      time: pendingAsst.time || 0,
    })
    pendingAsst = null
  }

  for (const item of items) {
    if (!item) continue
    if (item.role !== 'assistant') {
      flushAsst()
      const { toolCalls: _omitToolCalls, ...rest } = item
      merged.push({
        ...rest,
        index: merged.length,
      })
      continue
    }
    if (!pendingAsst) {
      pendingAsst = {
        time: item.time || 0,
        _thoughts: [],
        _texts: [],
        _tools: [],
        _seenToolIds: new Set(),
      }
    }
    if (item.time && item.time > pendingAsst.time) {
      pendingAsst.time = item.time
    }
    if (item.thinking && String(item.thinking).trim()) {
      pendingAsst._thoughts.push(String(item.thinking).trim())
    }
    if (item.text && String(item.text).trim()) {
      pendingAsst._texts.push(String(item.text).trim())
    }
    const itemTools =
      Array.isArray(item.tools) && item.tools.length > 0
        ? item.tools
        : Array.isArray(item.toolCalls)
          ? item.toolCalls
          : []
    for (const t of itemTools) {
      if (!t) continue
      const tid = typeof t === 'object' ? String(t.id || '') : ''
      if (tid && pendingAsst._seenToolIds.has(tid)) continue
      if (tid) pendingAsst._seenToolIds.add(tid)
      pendingAsst._tools.push(
        typeof t === 'string' ? { name: t, id: '', summary: '', commandLine: '执行完毕' } : t,
      )
    }
  }
  flushAsst()

  // Keep full fidelity on the most recent 4 merged items (2 full Q&A rounds),
  // and trim oversized thinking/tool outputs on older historical turns so mobile state stays fast.
  const recentCutoff = Math.max(0, merged.length - 4)
  return merged.map((m, idx) => {
    if (m.role !== 'assistant') return m
    const isRecent = idx >= recentCutoff
    const maxThink = isRecent ? 16000 : 2000
    const maxTools = isRecent ? 40 : 18
    const maxCmd = isRecent ? 1800 : 360
    const maxText = isRecent ? 48000 : 24000
    return {
      ...m,
      text: m.text && m.text.length > maxText ? m.text.slice(0, maxText) : m.text,
      thinking: m.thinking && m.thinking.length > maxThink ? `${m.thinking.slice(0, maxThink)}\n...(历史思考已折叠)...` : m.thinking,
      tools: Array.isArray(m.tools)
        ? m.tools.slice(0, maxTools).map(t => ({
            name: t.name || 'tool',
            id: t.id || '',
            summary: t.summary ? String(t.summary).slice(0, 180) : '',
            commandLine: t.commandLine ? String(t.commandLine).slice(0, maxCmd) : '执行完毕',
          }))
        : [],
    }
  })
}

/**
 * Extract full structured conversation transcript and tool activity from a live agent
 * (for Full Remote Web Chat UI and E2EE Conversation Replay).
 */
export function extractSessionTranscript(agent, maxMessages = 24) {
  if (!agent) return []
  let rawMessages = []
  try {
    rawMessages = agent.session?.deriveMessages?.() ?? []
  } catch {
    rawMessages = []
  }

  const toolResultsByCallId = new Map()
  const rawLog = Array.isArray(agent.session?.log) ? agent.session.log : []
  for (const ev of rawLog) {
    if (ev?.type === 'tool/result') {
      const msg = ev.data?.message || {}
      const cid = String(msg?.source?.callId || ev.data?.callId || msg?.toolCallId || '')
      if (!cid) continue
      const blocks = Array.isArray(msg?.content) ? msg.content : []
      const outText = blocks
        .filter(b => b?.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('\n')
        .trim()
      if (outText) toolResultsByCallId.set(cid, outText)
    }
  }

  for (const msg of rawMessages) {
    if (msg?.role === 'tool') {
      const cid = String(msg?.source?.callId || msg?.toolCallId || msg?.id || '')
      if (!cid || toolResultsByCallId.has(cid)) continue
      const blocks = Array.isArray(msg?.content) ? msg.content : []
      const outText = blocks
        .filter(b => b?.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('\n')
        .trim()
      if (outText) toolResultsByCallId.set(cid, outText)
    }
  }

  const mapped = []
  for (const msg of rawMessages) {
    const role = String(msg?.role ?? 'unknown')
    if (role === 'tool' || role === 'system' || role === 'developer') continue
    const blocks = Array.isArray(msg?.content) ? msg.content : []
    const textParts = []
    const thinkingParts = []
    const tools = []

    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue
      if (block.type === 'text' && typeof block.text === 'string') {
        textParts.push(redactText(block.text))
      } else if (block.type === 'thinking' || block.type === 'reasoning') {
        const thought = typeof block.thinking === 'string' ? block.thinking : typeof block.text === 'string' ? block.text : ''
        if (thought) thinkingParts.push(redactText(thought).slice(0, 8000))
      } else if (block.type === 'tool_use' || block.type === 'tool_call' || block.type === 'tool-call') {
        const callId = String(block.id || '')
        tools.push(
          buildDshToolRecord(
            block.name || block.toolName || 'tool',
            callId,
            block.arguments ?? block.input,
            toolResultsByCallId.get(callId) || '',
          ),
        )
      }
    }

    if (textParts.length === 0 && typeof msg?.content === 'string') {
      textParts.push(redactText(msg.content))
    }

    const joinedText = cleanForChat(textParts.join('\n').trim(), 48000)
    if (role === 'user' && isSystemInjectedUserText(joinedText)) {
      continue
    }
    if (!joinedText && !thinkingParts.length && !tools.length) {
      continue
    }

    mapped.push({
      index: mapped.length,
      role,
      text: joinedText,
      thinking: thinkingParts.join('\n').trim(),
      tools,
      toolCalls: tools,
      time: msg?.time || msg?.createdAt || 0,
    })
  }

  return mergeTurnAssistantMessages(mapped).slice(-maxMessages)
}

function decompressMultiFrameZstd(rawBuf) {
  if (typeof zlib.zstdDecompressSync !== 'function') return ''
  const offsets = []
  let idx = 0
  while ((idx = rawBuf.indexOf(ZSTD_MAGIC, idx)) !== -1) {
    offsets.push(idx)
    idx += 4
  }
  if (offsets.length === 0) return ''
  let out = ''
  for (let i = 0; i < offsets.length; i += 1) {
    const slice = rawBuf.subarray(offsets[i], offsets[i + 1] || rawBuf.length)
    try {
      out += zlib.zstdDecompressSync(slice).toString('utf8')
    } catch {
      // ignore partial frame
    }
  }
  return out
}

export async function renameDiskSession(dshHome, sessionId, newTitle) {
  const id = String(sessionId ?? '').trim()
  const title = String(newTitle ?? '').trim()
  if (!dshHome || !id || !title) return { ok: false, error: '会话 ID 或新标题不能为空' }
  const mapFile = join(resolve(dshHome), 'session-titles.json')
  let titlesMap = {}
  try {
    titlesMap = JSON.parse(await readFile(mapFile, 'utf8'))
  } catch {
    titlesMap = {}
  }
  titlesMap[id] = title
  await writeFile(mapFile, JSON.stringify(titlesMap, null, 2), 'utf8')
  return { ok: true, id, title }
}

/**
 * Read real historical DSH v4 sessions (`session.v4.jsonl.zstd`) directly from `~/.dsh/sessions`
 * so the Web UI displays all of the user's real projects & conversations even when DSH Desktop
 * hasn't hydrated them into memory yet.
 */
const dshSessionParseCache = new Map()

export async function loadDiskSessionsFromDshHome(dshHome, { maxSessions = 25, maxMessages = 20 } = {}) {
  if (!dshHome) return []
  const sessionsRoot = join(resolve(dshHome), 'sessions')
  let customTitles = {}
  try {
    customTitles = JSON.parse(await readFile(join(resolve(dshHome), 'session-titles.json'), 'utf8'))
  } catch {
    customTitles = {}
  }
  let projDirs = []
  try {
    projDirs = await readdir(sessionsRoot, { withFileTypes: true })
  } catch {
    return []
  }

  const results = []
  for (const projEntry of projDirs) {
    if (!projEntry.isDirectory()) continue
    const projPath = join(sessionsRoot, projEntry.name)
    let sessDirs = []
    try {
      sessDirs = await readdir(projPath, { withFileTypes: true })
    } catch {
      continue
    }

    for (const sessEntry of sessDirs) {
      if (!sessEntry.isDirectory()) continue
      const zstdPath = join(projPath, sessEntry.name, 'session.v4.jsonl.zstd')
      let fileStat
      try {
        fileStat = await stat(zstdPath)
      } catch {
        continue
      }
      if (!fileStat.isFile() || fileStat.size < 100) continue

      const cachedKey = `${Math.round(fileStat.mtimeMs)}:${fileStat.size}:${customTitles[sessEntry.name] || ''}`
      const cachedEntry = dshSessionParseCache.get(zstdPath)
      if (cachedEntry && cachedEntry.cachedKey === cachedKey && cachedEntry.session) {
        const customOverride = customTitles[cachedEntry.session.id]
        results.push({
          ...cachedEntry.session,
          ...(customOverride ? { title: customOverride } : {}),
        })
        continue
      }

      try {
        const rawBuf = await readFile(zstdPath)
        const text = decompressMultiFrameZstd(rawBuf)
        if (!text) continue
        const lines = text
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(line => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter(Boolean)

        const header = lines.find(e => e.type === 'session') || {}
        const cwd = String(header.cwd || '').trim()
        const titles = lines.filter(e => e.type === 'session/title' && e.data?.title)
        const title = String(titles.at(-1)?.data?.title || '').trim()

        // Map tool/result outputs by callId so tool/call records include real execution output
        const toolResultsByCallId = new Map()
        for (const e of lines) {
          if (e.type === 'tool/result') {
            const msg = e.data?.message || {}
            const cid = String(msg?.source?.callId || e.data?.callId || msg?.toolCallId || '')
            if (!cid) continue
            const blocks = Array.isArray(msg?.content) ? msg.content : []
            const outText = blocks
              .filter(b => b?.type === 'text' && typeof b.text === 'string')
              .map(b => b.text)
              .join('\n')
              .trim()
            if (outText) toolResultsByCallId.set(cid, outText)
          }
        }

        // Group tool/call events by turn+step so we can attach them to assistant messages
        const toolsByStep = new Map()
        for (const e of lines) {
          if (e.type === 'tool/call' && e.data?.name) {
            const key = `${e.data.turn ?? 0}:${e.data.step ?? 0}`
            const arr = toolsByStep.get(key) || []
            const callId = String(e.data.callId || e.data.id || '')
            arr.push(
              buildDshToolRecord(
                e.data.name,
                callId,
                e.data.arguments ?? e.data.input ?? e.data.args,
                toolResultsByCallId.get(callId) || '',
              ),
            )
            toolsByStep.set(key, arr)
          }
        }

        const rawTranscript = []
        let lastOutput = ''
        let lastConclusionText = ''
        let runningSummary = ''
        let lastActivity = Math.round(fileStat.mtimeMs)
        let lastUserInputAt = 0
        let lastConclusionAt = 0

        for (const e of lines) {
          if (e.time && e.time > lastActivity) lastActivity = e.time
          if (e.type === 'user/message') {
            if (e.data?.source?.kind && e.data.source.kind !== 'user') continue
            const blocks = Array.isArray(e.data?.content) ? e.data.content : []
            const userText = cleanForChat(
              blocks
                .filter(b => b?.type === 'text' && typeof b.text === 'string')
                .map(b => redactText(b.text))
                .join('\n')
                .trim(),
              48000,
            )
            if (!userText || isSystemInjectedUserText(userText)) continue
            lastUserInputAt = e.time || lastActivity
            runningSummary = '💭 正在思考与分析...'
            rawTranscript.push({
              index: rawTranscript.length,
              role: 'user',
              text: userText,
              thinking: '',
              tools: [],
              toolCalls: [],
              time: e.time || 0,
            })
          } else if (e.type === 'assistant/message') {
            const blocks = Array.isArray(e.data?.message?.content) ? e.data.message.content : []
            const asstText = cleanForChat(
              blocks
                .filter(b => b?.type === 'text' && typeof b.text === 'string')
                .map(b => redactText(b.text))
                .join('\n')
                .trim(),
              48000,
            )
            const thinkingText = blocks
              .filter(b => (b?.type === 'reasoning' || b?.type === 'thinking') && typeof (b.text || b.thinking) === 'string')
              .map(b => redactText(b.text || b.thinking))
              .join('\n')
              .trim()
              .slice(0, 8000)
            const stepKey = `${e.data?.turn ?? 0}:${e.data?.step ?? 0}`
            const stepTools = [...(toolsByStep.get(stepKey) || [])]
            const seenStepToolIds = new Set(stepTools.map(t => t.id).filter(Boolean))
            for (const b of blocks) {
              if (b?.type === 'tool-call' || b?.type === 'tool_use' || b?.type === 'tool_call') {
                const cid = String(b.id || '')
                if (cid && seenStepToolIds.has(cid)) continue
                if (cid) seenStepToolIds.add(cid)
                stepTools.push(
                  buildDshToolRecord(
                    b.name || b.toolName || 'tool',
                    cid,
                    b.arguments ?? b.input,
                    toolResultsByCallId.get(cid) || '',
                  ),
                )
              }
            }
            if (!asstText && !thinkingText && stepTools.length === 0) continue
            if (asstText) lastOutput = asstText.slice(0, 8000)
            if (stepTools.length > 0) {
              runningSummary = `🔧 正在执行: ${stepTools.map(t => (t.summary ? `${t.name} (${t.summary})` : t.name)).join(' · ')}`.slice(0, 240)
            } else if (asstText) {
              lastConclusionAt = e.time || lastActivity
              lastConclusionText = asstText.slice(0, 8000)
            } else if (thinkingText) {
              runningSummary = `💭 正在思考: ${thinkingText.replace(/\s+/g, ' ').slice(0, 120)}`
            }
            rawTranscript.push({
              index: rawTranscript.length,
              role: 'assistant',
              text: asstText,
              thinking: thinkingText,
              tools: stepTools,
              toolCalls: stepTools,
              time: e.time || 0,
            })
          }
        }

        const transcript = mergeTurnAssistantMessages(rawTranscript)

        // Skip completely empty sessions with no user messages
        if (transcript.length === 0) continue

        const id = header.id || sessEntry.name
        const shortId = id.startsWith('session-') ? id.slice(8, 16) : id.slice(0, 8)
        const projectParts = cwd.split('/').filter(Boolean)
        const rawProj = projectParts.at(-1) || '默认项目'
        const project = rawProj === 'default-workspace' ? '默认工作区' : rawProj
        const hasConcluded = lastConclusionAt > 0 && lastConclusionAt >= lastUserInputAt

        const sessionObj = {
          id,
          shortId,
          harness: 'dsh',
          harnessLabel: 'DeepSeek Harness',
          title: customTitles[id] || title || transcript[0]?.text?.slice(0, 36) || '历史会话',
          status: 'idle',
          turnState: hasConcluded ? 'conclusion' : 'idle',
          statusLabel: hasConcluded ? '🔵 已出结论' : '已完成',
          project,
          cwd,
          lastActivity,
          updatedAt: lastActivity,
          lastConclusionAt,
          lastOutput: lastConclusionText || lastOutput,
          runningSummary: runningSummary || lastOutput,
          queuedSteers: [],
          transcript: transcript.slice(-maxMessages),
        }
        dshSessionParseCache.set(zstdPath, { cachedKey, session: sessionObj })
        results.push({ ...sessionObj })
      } catch {
        // ignore unreadable session file
      }
    }
  }

  results.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  return results.slice(0, maxSessions)
}

export function invalidateDshSessionParseCache() {
  dshSessionParseCache.clear()
}

/**
 * Create a new agent session on the host (or initialize an empty one).
 */
export async function createNewAgentSession(agents, { cwd = process.cwd(), title = '' } = {}) {
  const cleanCwd = String(cwd || process.cwd()).trim()
  const cleanTitle = String(title || '远程新建任务').trim()

  let agent = null
  if (typeof agents.createViaController === 'function') {
    agent = await agents.createViaController({ cwd: cleanCwd, title: cleanTitle })
  } else if (typeof agents.create === 'function') {
    const res = await agents.create({ cwd: cleanCwd, title: cleanTitle })
    agent = res?.agent || res
  } else if (typeof agents.spawn === 'function') {
    agent = await agents.spawn({ cwd: cleanCwd, title: cleanTitle })
  } else if (typeof agents.newSession === 'function') {
    agent = await agents.newSession({ cwd: cleanCwd, title: cleanTitle })
  } else if (Array.isArray(agents._list) || typeof agents.add === 'function') {
    const id = `session-${randomBytes(4).toString('hex')}-${Date.now().toString(36)}`
    agent = {
      id,
      status: 'idle',
      session: {
        header: { cwd: cleanCwd },
        log: [{ type: 'session/title', time: Date.now(), data: { title: cleanTitle } }],
        _messages: [],
        deriveMessages() {
          return this._messages ?? []
        },
      },
      followup({ content }) {
        const text = content?.[0]?.text ?? ''
        this.session._messages = [
          ...(this.session._messages ?? []),
          { role: 'user', content: [{ type: 'text', text }] },
        ]
        this.status = 'running'
      },
      async whenIdle() {
        this.status = 'idle'
      },
      async cancel() {
        this.cancelled = true
        this.status = 'idle'
      },
    }
    if (typeof agents.add === 'function') agents.add(agent)
    else if (Array.isArray(agents._list)) agents._list.push(agent)
  } else {
    const existingEmpty = (agents.list?.() ?? []).find(a => {
      const msgs = a.session?.deriveMessages?.() ?? []
      return a.status === 'idle' && msgs.length === 0
    })
    if (existingEmpty) {
      agent = existingEmpty
      if (agent.session?.header) agent.session.header.cwd = cleanCwd
      if (Array.isArray(agent.session?.log)) {
        agent.session.log.push({ type: 'session/title', time: Date.now(), data: { title: cleanTitle } })
      }
    }
  }

  return agent || null
}

/**
 * Rename an existing agent session.
 */
export function renameAgentSession(agent, newTitle) {
  if (!agent) return { ok: false, error: '找不到目标会话' }
  const title = String(newTitle ?? '').trim()
  if (!title) return { ok: false, error: '新标题不能为空' }
  if (typeof agent.rename === 'function') {
    agent.rename(title)
  }
  if (!agent.session) agent.session = {}
  if (!Array.isArray(agent.session.log)) agent.session.log = []
  agent.session.log.push({
    type: 'session/title',
    time: Date.now(),
    data: { title },
  })
  return { ok: true, id: agent.id, title }
}

/**
 * Delete a session from live agents registry and/or ~/.dsh/sessions.
 */
export async function deleteAgentSession(agents, agentId, dshHome = '') {
  const id = String(agentId ?? '').trim()
  if (!id) return { ok: false, error: '缺少会话 ID' }
  const agent = agents.get?.(id)
  if (agent && agent.status === 'running' && typeof agent.cancel === 'function') {
    try {
      await agent.cancel({ kind: 'user' })
    } catch {
      // ignore cancel error
    }
  }
  let removedLive = false
  if (typeof agents.delete === 'function') {
    await agents.delete(id)
    removedLive = true
  } else if (typeof agents.remove === 'function') {
    await agents.remove(id)
    removedLive = true
  } else if (Array.isArray(agents._list)) {
    const idx = agents._list.findIndex(a => a.id === id)
    if (idx >= 0) {
      agents._list.splice(idx, 1)
      removedLive = true
    }
  }

  let removedDisk = false
  if (dshHome) {
    const safeId = basename(id)
    const sessionsDir = join(resolve(dshHome), 'sessions')
    const candidates = [
      join(sessionsDir, safeId),
      join(sessionsDir, `${safeId}.json`),
    ]
    try {
      const subDirs = await readdir(sessionsDir, { withFileTypes: true })
      for (const d of subDirs) {
        if (d.isDirectory()) {
          candidates.push(join(sessionsDir, d.name, safeId))
        }
      }
    } catch {
      // ignore missing sessionsDir
    }
    for (const candidate of candidates) {
      try {
        await stat(candidate)
        await rm(candidate, { recursive: true, force: true })
        removedDisk = true
      } catch {
        // ignore missing file
      }
    }
  }

  return { ok: true, id, removedLive, removedDisk }
}

/**
 * Read-only workspace directory listing (strictly confined inside workspace root).
 */
export async function listWorkspaceFiles(workspaceRoot, subDir = '') {
  try {
    if (!workspaceRoot) return { ok: false, error: '该任务未关联工作区目录' }
    const root = await resolveRealRoot(workspaceRoot)
    const cleanSub = String(subDir || '').replace(/^([/\\])+/, '').trim()
    if (cleanSub.startsWith('..') || cleanSub.includes(`..${sep}`) || cleanSub.includes('../')) {
      return { ok: false, error: '拒绝越界访问工作区以外的目录' }
    }
    const targetDir = cleanSub ? resolve(root, cleanSub) : root
    const realTarget = await resolveSafeTarget(root, targetDir)

    const dirEntries = await readdir(realTarget, { withFileTypes: true })
    const entries = []
    for (const entry of dirEntries) {
      if (IGNORED_DIRS.has(entry.name)) continue
      const fullPath = join(realTarget, entry.name)
      let info
      try {
        info = await lstat(fullPath)
      } catch {
        continue
      }
      if (info.isSymbolicLink()) {
        try {
          const linked = await realpath(fullPath)
          if (linked !== root && !linked.startsWith(root + sep)) continue
          info = await stat(linked)
        } catch {
          continue
        }
      }
      const relPath = relative(root, fullPath).split(sep).join('/')
      const isDirectory = info.isDirectory()
      entries.push({
        name: entry.name,
        relPath,
        isDirectory,
        type: isDirectory ? 'dir' : 'file',
        size: info.isFile() ? info.size : 0,
        mtimeMs: Math.round(info.mtimeMs),
      })
    }

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return {
      ok: true,
      rootCwd: root,
      subDir: cleanSub,
      entries: entries.slice(0, 200),
    }
  } catch (error) {
    return { ok: false, error: error?.message || '读取目录失败' }
  }
}

/**
 * Read-only workspace file preview (strictly confined inside workspace root, with secret redaction).
 */
export async function readWorkspaceFile(workspaceRoot, relPath = '') {
  try {
    if (!workspaceRoot) return { ok: false, error: '该任务未关联工作区目录' }
    const root = await resolveRealRoot(workspaceRoot)
    const rawRel = String(relPath || '').replace(/^([/\\])+/, '').trim()
    if (!rawRel || rawRel.startsWith('..') || rawRel.includes(`..${sep}`) || rawRel.includes('../')) {
      return { ok: false, error: '拒绝越界访问工作区外部文件' }
    }
    const targetFile = resolve(root, rawRel)
    const realFile = await resolveSafeTarget(root, targetFile)
    const info = await stat(realFile)
    if (!info.isFile()) {
      return { ok: false, error: '目标路径不是普通文件' }
    }

    const ext = extname(realFile).toLowerCase()
    if (IMAGE_MIME[ext]) {
      if (info.size > MAX_IMAGE_PREVIEW_BYTES) {
        return { ok: false, error: '图片文件超过 5MB 预览上限' }
      }
      const bytes = await readFile(realFile)
      return {
        ok: true,
        relPath: rawRel,
        name: basename(realFile),
        ext,
        kind: 'image',
        mime: IMAGE_MIME[ext],
        size: info.size,
        dataBase64: bytes.toString('base64'),
      }
    }

    const bytes = await readFile(realFile)
    const truncated = bytes.length > MAX_PREVIEW_BYTES
    const slice = truncated ? bytes.subarray(0, MAX_PREVIEW_BYTES) : bytes
    if (slice.includes(0)) {
      return {
        ok: true,
        relPath: rawRel,
        name: basename(realFile),
        ext,
        kind: 'binary',
        size: info.size,
        content: `[二进制文件，大小 ${info.size} 字节，不支持直接文本预览]`,
      }
    }

    const rawText = slice.toString('utf8')
    return {
      ok: true,
      relPath: rawRel,
      name: basename(realFile),
      ext,
      kind: 'text',
      size: info.size,
      truncated,
      content: redactText(rawText),
    }
  } catch (error) {
    return { ok: false, error: error?.message || '读取文件失败' }
  }
}

async function resolveRealRoot(workspaceRoot) {
  const root = resolve(workspaceRoot)
  try {
    return await realpath(root)
  } catch {
    return root
  }
}

async function resolveSafeTarget(realRoot, candidatePath) {
  if (candidatePath !== realRoot && !candidatePath.startsWith(realRoot + sep)) {
    throw new Error('拒绝越界访问工作区外部路径')
  }
  let real
  try {
    real = await realpath(candidatePath)
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('文件或目录不存在')
    throw error
  }
  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new Error('拒绝通过符号链接越界访问工作区外部文件')
  }
  return real
}
