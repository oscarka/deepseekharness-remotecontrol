import { execFile } from 'node:child_process'
import { createHash, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { chmod, lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, networkInterfaces } from 'node:os'
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import * as zlib from 'node:zlib'
import { cleanForChat, redactText } from './redact.js'

const execFileAsync = promisify(execFile)

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
const MAX_IMAGE_PREVIEW_BYTES = 5 * 1024 * 1024 // 5 MiB max inline legacy image preview
const DEFAULT_STREAM_CHUNK_BYTES = 8 * 1024 * 1024 // 8 MiB open-ended Range slice (16 MiB closed-range cap, safe below Serverless 32 MiB ingress limits)
const THUMB_MIN_BYTES = 300 * 1024 // Keep small images (<300 KiB) untouched
const MAX_MEDIA_CACHE_FILES = 100
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.pnpm-store', '.cache', '.DS_Store', 'dist', 'build'])

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}

const VIDEO_MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
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
    const maxThink = isRecent ? 12000 : 800
    const maxTools = isRecent ? 25 : 8
    const maxCmd = isRecent ? 1200 : 220
    const maxText = isRecent ? 48000 : 12000
    return {
      ...m,
      text: m.text && m.text.length > maxText ? m.text.slice(0, maxText) : m.text,
      thinking: m.thinking && m.thinking.length > maxThink ? `${m.thinking.slice(0, maxThink)}\n...(历史思考已折叠)...` : m.thinking,
      tools: Array.isArray(m.tools)
        ? m.tools.slice(0, maxTools).map(t => ({
            name: t.name || 'tool',
            id: t.id || '',
            summary: t.summary ? String(t.summary).slice(0, 160) : '',
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

    const rawJoinedText = textParts.join('\n').trim()
    const formattedUserReply =
      role === 'user' && msg?.source?.kind === 'user-question-reply'
        ? formatUserQuestionReplyText(rawJoinedText)
        : rawJoinedText
    const joinedText = cleanForChat(formattedUserReply, 48000)
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
 * Read `<dshHome>/storages/workspace.json` so the remote controller and DSH Desktop
 * share the exact same `archivedSessionIds` filter and workspace session membership.
 */
export async function readDshWorkspaceStorage(dshHome) {
  if (!dshHome) {
    return { raw: null, storagePath: '', archivedSet: new Set(), pinnedSet: new Set() }
  }
  const storagePath = join(resolve(dshHome), 'storages', 'workspace.json')
  try {
    const parsed = JSON.parse(await readFile(storagePath, 'utf8'))
    const archived = Array.isArray(parsed?.global?.archivedSessionIds)
      ? parsed.global.archivedSessionIds.map(id => String(id || '').trim()).filter(Boolean)
      : []
    const pinned = Array.isArray(parsed?.global?.pinnedSessionIds)
      ? parsed.global.pinnedSessionIds.map(id => String(id || '').trim()).filter(Boolean)
      : []
    return {
      raw: parsed,
      storagePath,
      archivedSet: new Set(archived),
      pinnedSet: new Set(pinned),
    }
  } catch {
    return { raw: null, storagePath, archivedSet: new Set(), pinnedSet: new Set() }
  }
}

/**
 * Ensure any unarchived DSH sessions created from the Phone Web UI or headless CLI
 * are registered inside `<dshHome>/storages/workspace.json` (`tables.workspaces[wsId].sessionIds`)
 * so DSH Desktop's workspace sidebar displays the exact same conversation list.
 */
export async function syncDshWorkspaceStorage(dshHome, activeSessions = [], preloadedStorage = null) {
  if (!dshHome || !Array.isArray(activeSessions) || activeSessions.length === 0) {
    return { updated: false, addedSessionIds: [] }
  }
  const { raw, storagePath, archivedSet } =
    preloadedStorage && preloadedStorage.raw !== undefined
      ? preloadedStorage
      : await readDshWorkspaceStorage(dshHome)
  if (
    !raw ||
    typeof raw !== 'object' ||
    !raw.tables ||
    typeof raw.tables.workspaces !== 'object' ||
    !raw.tables.workspaces
  ) {
    return { updated: false, addedSessionIds: [] }
  }

  const workspacesTable = raw.tables.workspaces
  const accounted = new Set(archivedSet)
  const wsByPath = new Map()
  let isV2Schema = raw.unit?.version === 2

  for (const [wsId, record] of Object.entries(workspacesTable)) {
    if (!record || typeof record !== 'object') continue
    if (typeof record.title === 'string' || typeof record.createdAt === 'string') {
      isV2Schema = true
    }
    const wsPath = String(record.path || '').trim()
    if (wsPath) {
      wsByPath.set(wsPath, [wsId, record])
      const cleanPath = wsPath.replace(/\/+$/, '')
      if (cleanPath) wsByPath.set(cleanPath, [wsId, record])
      try {
        const realWsPath = await resolveRealRoot(wsPath)
        if (realWsPath) wsByPath.set(realWsPath, [wsId, record])
      } catch {}
    }
    if (Array.isArray(record.sessionIds)) {
      for (const sid of record.sessionIds) {
        if (sid) accounted.add(String(sid))
      }
    }
  }

  let dirty = false
  const addedSessionIds = []
  // Iterate from oldest to newest so prepending places newest at index 0
  const ordered = [...activeSessions].sort((a, b) => (a.lastActivity || 0) - (b.lastActivity || 0))
  for (const item of ordered) {
    const sid = String(item?.id || item?.sessionId || '').trim()
    const rawCwd = String(item?.cwd || '').trim()
    if (!sid || !rawCwd || accounted.has(sid)) continue

    let canonicalCwd = rawCwd
    try {
      canonicalCwd = await resolveRealRoot(rawCwd)
    } catch {
      canonicalCwd = rawCwd
    }
    const cleanRaw = rawCwd.replace(/\/+$/, '')
    const cleanCanon = canonicalCwd.replace(/\/+$/, '')
    let matched =
      wsByPath.get(canonicalCwd) ||
      wsByPath.get(cleanCanon) ||
      wsByPath.get(rawCwd) ||
      wsByPath.get(cleanRaw)

    if (!matched) {
      let dirExists = false
      try {
        const st = await stat(canonicalCwd)
        dirExists = st.isDirectory()
      } catch {
        dirExists = false
      }
      if (!dirExists) continue
      const newWsId = randomUUID()
      const nowIso = new Date().toISOString()
      const wsTitle = basename(canonicalCwd) || canonicalCwd
      const newRecord = isV2Schema
        ? {
            path: canonicalCwd,
            title: wsTitle,
            sessionIds: [sid],
            createdAt: nowIso,
            updatedAt: nowIso,
          }
        : {
            id: newWsId,
            path: canonicalCwd,
            sessionIds: [sid],
            createdAt: Date.now(),
          }
      workspacesTable[newWsId] = newRecord
      if (!raw.global || typeof raw.global !== 'object') {
        raw.global = { workspaceIds: [], archivedSessionIds: [], pinnedSessionIds: [] }
      }
      if (!Array.isArray(raw.global.workspaceIds)) {
        raw.global.workspaceIds = []
      }
      if (!raw.global.workspaceIds.includes(newWsId)) {
        raw.global.workspaceIds = [newWsId, ...raw.global.workspaceIds]
      }
      matched = [newWsId, newRecord]
      wsByPath.set(canonicalCwd, matched)
      wsByPath.set(cleanCanon, matched)
      accounted.add(sid)
      addedSessionIds.push(sid)
      dirty = true
      continue
    }

    const [, record] = matched
    if (!Array.isArray(record.sessionIds)) {
      record.sessionIds = []
    }
    if (!record.sessionIds.includes(sid)) {
      record.sessionIds = [sid, ...record.sessionIds]
      if (typeof record.updatedAt === 'string' || isV2Schema) {
        record.updatedAt = new Date().toISOString()
      }
      accounted.add(sid)
      addedSessionIds.push(sid)
      dirty = true
    }
  }

  if (dirty && storagePath) {
    try {
      await mkdir(dirname(storagePath), { recursive: true })
      await writeFile(storagePath, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 })
    } catch {
      return { updated: false, addedSessionIds: [] }
    }
  }
  return { updated: dirty, addedSessionIds }
}

/**
 * Remove a deleted session ID from `<dshHome>/storages/workspace.json`.
 */
export async function removeSessionFromDshWorkspaceStorage(dshHome, sessionId) {
  const sid = String(sessionId || '').trim()
  if (!dshHome || !sid) return false
  const { raw, storagePath } = await readDshWorkspaceStorage(dshHome)
  if (!raw || typeof raw !== 'object') return false
  let dirty = false
  if (Array.isArray(raw.global?.archivedSessionIds) && raw.global.archivedSessionIds.includes(sid)) {
    raw.global.archivedSessionIds = raw.global.archivedSessionIds.filter(id => id !== sid)
    dirty = true
  }
  if (Array.isArray(raw.global?.pinnedSessionIds) && raw.global.pinnedSessionIds.includes(sid)) {
    raw.global.pinnedSessionIds = raw.global.pinnedSessionIds.filter(id => id !== sid)
    dirty = true
  }
  const workspacesTable = raw.tables?.workspaces
  if (workspacesTable && typeof workspacesTable === 'object') {
    for (const record of Object.values(workspacesTable)) {
      if (record && Array.isArray(record.sessionIds) && record.sessionIds.includes(sid)) {
        record.sessionIds = record.sessionIds.filter(id => id !== sid)
        if (typeof record.updatedAt === 'string') {
          record.updatedAt = new Date().toISOString()
        }
        dirty = true
      }
    }
  }
  if (dirty && storagePath) {
    try {
      await writeFile(storagePath, `${JSON.stringify(raw, null, 2)}\n`, { mode: 0o600 })
      return true
    } catch {
      return false
    }
  }
  return false
}

/**
 * Read real historical DSH v4 sessions (`session.v4.jsonl.zstd`) directly from `~/.dsh/sessions`
 * so the Web UI displays all of the user's real projects & conversations even when DSH Desktop
 * hasn't hydrated them into memory yet.
 */
const dshSessionParseCache = new Map()

export function normalizeUserQuestionsList(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return []
  return rawQuestions
    .map((q, idx) => {
      if (!q || typeof q !== 'object') return null
      const question = String(q.question || q.title || '').trim()
      if (!question) return null
      const id = String(q.id || `q-${idx + 1}`).trim()
      const header = String(q.header || '').trim()
      const detail = String(q.detail || '').trim()
      const multiSelect = Boolean(q.multi_select ?? q.multiSelect)
      const options = Array.isArray(q.options)
        ? q.options
            .map(o => {
              if (typeof o === 'string') return { label: o.trim(), description: '' }
              if (!o || typeof o !== 'object') return null
              const label = String(o.label || o.title || '').trim()
              if (!label) return null
              return {
                label,
                description: String(o.description || o.desc || '').trim(),
              }
            })
            .filter(Boolean)
        : []
      return {
        id,
        header,
        question,
        ...(detail ? { detail } : {}),
        multiSelect,
        options,
      }
    })
    .filter(Boolean)
}

export function formatUserQuestionReplyText(rawText) {
  const clean = String(rawText ?? '').trim()
  if (!clean) return ''
  try {
    const parsed = JSON.parse(clean)
    if (
      parsed &&
      (parsed.kind === 'answer_to_pending_question' || Array.isArray(parsed.answers))
    ) {
      const qMap = new Map()
      if (Array.isArray(parsed.questions)) {
        for (const q of parsed.questions) {
          if (q?.id) qMap.set(String(q.id), q.header || q.question || q.id)
        }
      }
      const parts = []
      for (const ans of parsed.answers || []) {
        if (!ans || typeof ans !== 'object') continue
        const selected = Array.isArray(ans.selected) ? ans.selected.filter(Boolean) : []
        const custom = String(ans.custom || '').trim()
        const val = [...selected, ...(custom ? [custom] : [])].join('、')
        if (!val) continue
        const label = qMap.get(String(ans.id || ''))
        parts.push(label && (parsed.answers || []).length > 1 ? `[${label}] ${val}` : val)
      }
      if (parts.length > 0) {
        return `✅ 已选择：${parts.join('；')}`
      }
    }
  } catch {
    // not JSON, return as-is
  }
  return clean
}

function extractRawPendingDshInteraction(lines = []) {
  const questionsByCallId = new Map()
  const approvalsById = new Map()

  for (const e of lines) {
    if (!e || typeof e !== 'object') continue
    const toolCallName = e.data?.name || e.data?.toolName
    if (e.type === 'tool/call' && toolCallName) {
      const toolName = String(toolCallName)
      const callId = String(e.data.callId || e.data.id || '').trim()
      if (!callId) continue
      const rawArgs = e.data.arguments ?? e.data.input ?? e.data.args
      let parsedArgs = rawArgs
      if (typeof rawArgs === 'string') {
        try {
          parsedArgs = JSON.parse(rawArgs)
        } catch {
          parsedArgs = null
        }
      }
      if (toolName === 'ask_user_question' && parsedArgs && typeof parsedArgs === 'object') {
        const questions = normalizeUserQuestionsList(parsedArgs.questions)
        if (questions.length > 0) {
          questionsByCallId.set(callId, {
            kind: 'question',
            toolName: 'ask_user_question',
            callId,
            questions,
            state: 'open',
            time: e.time || 0,
          })
        }
      } else if (toolName === 'exit_plan_mode') {
        const plan = String(parsedArgs?.plan || '').trim()
        const questions = [
          {
            id: 'plan-review',
            header: 'Plan review',
            question: 'Approve this plan and leave plan mode?',
            ...(plan ? { detail: plan } : {}),
            multiSelect: false,
            options: [
              {
                label: 'Approve',
                description: 'Leave plan mode; the plan is carried out from the next step.',
              },
              {
                label: 'Keep planning',
                description: 'Stay in plan mode; feedback goes back to the model.',
              },
            ],
          },
        ]
        questionsByCallId.set(callId, {
          kind: 'question',
          toolName: 'exit_plan_mode',
          callId,
          questions,
          state: 'open',
          time: e.time || 0,
        })
      }
    } else if (e.type === 'tool/result') {
      const msg = e.data?.message || e.data || {}
      const cid = String(msg?.source?.callId || e.data?.callId || msg?.toolCallId || '').trim()
      if (!cid) continue
      for (const [appId, app] of approvalsById.entries()) {
        if (app.callId === cid) approvalsById.delete(appId)
      }
      const qEntry = questionsByCallId.get(cid)
      if (!qEntry) continue
      const blocks = Array.isArray(msg?.content) ? msg.content : []
      const outText =
        typeof msg?.content === 'string'
          ? msg.content.trim()
          : blocks
              .filter(b => b?.type === 'text' && typeof b.text === 'string')
              .map(b => b.text)
              .join('\n')
              .trim()
      let isContinued =
        e.data?.error?.code === 'TOOL_OUTCOME_UNKNOWN' ||
        e.data?.outcome === 'TOOL_OUTCOME_UNKNOWN'
      if (!isContinued && outText) {
        try {
          const parsedOut = JSON.parse(outText)
          if (parsedOut && parsedOut.pending === true) {
            isContinued = true
          }
        } catch {}
      }
      if (isContinued && qEntry.toolName === 'ask_user_question') {
        qEntry.state = 'continued'
      } else {
        questionsByCallId.delete(cid)
      }
    } else if (e.type === 'approval/asked' && e.data?.id) {
      const appId = String(e.data.id).trim()
      const rawReason = e.data.reason
      const reasonStr =
        typeof rawReason === 'string'
          ? rawReason
          : rawReason?.zh || rawReason?.en || rawReason?.reason || rawReason?.message || ''
      approvalsById.set(appId, {
        kind: 'approval',
        approvalId: appId,
        toolName: String(e.data.toolName || 'tool'),
        callId: String(e.data.callId || ''),
        reason: String(reasonStr || '请求执行权限').trim(),
        time: e.time || 0,
      })
    } else if (e.type === 'approval/decided' && e.data?.id) {
      approvalsById.delete(String(e.data.id).trim())
    } else if (e.type === 'user/message') {
      const srcKind = e.data?.source?.kind
      if (srcKind === 'user-question-reply') {
        const replyCallId = String(e.data?.source?.callId || '').trim()
        if (replyCallId) {
          questionsByCallId.delete(replyCallId)
        } else {
          questionsByCallId.clear()
        }
      } else if (!srcKind || srcKind === 'user') {
        const blocks = Array.isArray(e.data?.content) ? e.data.content : []
        const txt =
          typeof e.data?.content === 'string'
            ? e.data.content.trim()
            : blocks
                .filter(b => b?.type === 'text' && typeof b.text === 'string')
                .map(b => b.text)
                .join('\n')
                .trim()
        if (txt && !isSystemInjectedUserText(txt)) {
          questionsByCallId.clear()
          approvalsById.clear()
        }
      }
    }
  }

  const latestQuestion = [...questionsByCallId.values()].at(-1) || null
  const latestApproval = [...approvalsById.values()].at(-1) || null
  return { latestQuestion, latestApproval }
}

function materializePendingDshInteraction(
  rawPending,
  { sessionId = '', title = '', project = '', cwd = '', hasLock = false, ageMs = 0 } = {},
) {
  if (!rawPending) return null
  const cleanSid = String(sessionId).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || 'SESS'
  const q = rawPending.latestQuestion
  if (q) {
    const isFreshContinued = q.state === 'continued' && ageMs <= 24 * 60 * 60_000
    const isFreshOpen = q.state === 'open' && (hasLock || ageMs <= 15 * 60_000)
    if (isFreshContinued || isFreshOpen) {
      const cleanCid = String(q.callId).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || 'CALL'
      const firstQ = q.questions[0]
      const promptTitle =
        q.toolName === 'exit_plan_mode'
          ? '📋 计划审批：是否批准该方案并退出计划模式？'
          : firstQ?.question || '请做出选择以继续'
      const reason = q.questions
        .map(
          item =>
            `${item.header ? `[${item.header}] ` : ''}${item.question}${
              item.options?.length ? ` (${item.options.map(o => o.label).join(' / ')})` : ''
            }`,
        )
        .join('；')
      return {
        code: `DSHQ-${cleanSid}-${cleanCid}`,
        kind: 'question',
        harness: 'dsh',
        agentId: sessionId,
        title: title || '等待你做出选择',
        project,
        cwd,
        toolName: q.toolName,
        callId: q.callId,
        questionState: q.state,
        promptTitle,
        reason: cleanForChat(reason, 400),
        questions: q.questions,
        createdAt: q.time || Date.now(),
      }
    }
  }
  const app = rawPending.latestApproval
  if (app && (hasLock || ageMs <= 5 * 60_000) && ageMs <= 15 * 60_000) {
    const cleanAid = String(app.approvalId).replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || 'APPR'
    return {
      code: `DSHA-${cleanSid}-${cleanAid}`,
      kind: 'approval',
      harness: 'dsh',
      agentId: sessionId,
      title: title || app.toolName,
      project,
      cwd,
      toolName: app.toolName,
      callId: app.callId,
      approvalId: app.approvalId,
      promptTitle: `等待你确认工具调用：${app.toolName}`,
      reason: cleanForChat(app.reason || '请求执行权限', 400),
      createdAt: app.time || Date.now(),
    }
  }
  return null
}

export function extractPendingDshInteractionFromEvents(lines = [], meta = {}) {
  const raw = extractRawPendingDshInteraction(lines)
  return materializePendingDshInteraction(raw, meta)
}

export async function readPendingDshInteractions(dshHome) {
  if (!dshHome) return []
  try {
    const file = join(resolve(dshHome), 'pending-interactions.json')
    const raw = JSON.parse(await readFile(file, 'utf8'))
    const now = Date.now()
    const list = Array.isArray(raw?.items) ? raw.items : []
    return list.filter(item => item && (!item.expiresAt || item.expiresAt > now))
  } catch {
    return []
  }
}

export async function upsertPendingDshInteraction(dshHome, entry) {
  if (!dshHome || !entry?.code) return
  try {
    const file = join(resolve(dshHome), 'pending-interactions.json')
    const existing = await readPendingDshInteractions(dshHome)
    const filtered = existing.filter(
      item =>
        item.code !== entry.code &&
        !(entry.callId && item.callId === entry.callId && item.agentId === entry.agentId),
    )
    filtered.push(entry)
    await mkdir(resolve(dshHome), { recursive: true })
    await writeFile(file, JSON.stringify({ updatedAt: Date.now(), items: filtered }, null, 2), {
      mode: 0o600,
    })
  } catch {}
}

export async function removePendingDshInteraction(dshHome, { code = '', callId = '', agentId = '' } = {}) {
  if (!dshHome) return
  try {
    const file = join(resolve(dshHome), 'pending-interactions.json')
    const existing = await readPendingDshInteractions(dshHome)
    const cleanCode = String(code || '').trim().toUpperCase()
    const filtered = existing.filter(item => {
      if (cleanCode && String(item.code || '').toUpperCase() === cleanCode) return false
      if (callId && item.callId === callId && (!agentId || item.agentId === agentId)) return false
      return true
    })
    if (filtered.length !== existing.length) {
      await writeFile(file, JSON.stringify({ updatedAt: Date.now(), items: filtered }, null, 2), {
        mode: 0o600,
      })
    }
  } catch {}
}

export async function readPendingDshInteractionResponses(dshHome) {
  if (!dshHome) return []
  try {
    const file = join(resolve(dshHome), 'pending-interaction-responses.json')
    const raw = JSON.parse(await readFile(file, 'utf8'))
    const now = Date.now()
    const list = Array.isArray(raw?.items) ? raw.items : []
    return list.filter(item => item && now - (item.at || 0) <= 60_000)
  } catch {
    return []
  }
}

export async function writePendingDshInteractionResponse(dshHome, respEntry) {
  if (!dshHome || !respEntry) return
  try {
    const file = join(resolve(dshHome), 'pending-interaction-responses.json')
    const existing = await readPendingDshInteractionResponses(dshHome)
    const cleanCode = String(respEntry.code || '').trim().toUpperCase()
    const filtered = existing.filter(
      item =>
        !(cleanCode && String(item.code || '').toUpperCase() === cleanCode) &&
        !(respEntry.callId && item.callId === respEntry.callId && item.agentId === respEntry.agentId),
    )
    filtered.push({
      ...respEntry,
      code: cleanCode,
      at: Date.now(),
    })
    await mkdir(resolve(dshHome), { recursive: true })
    await writeFile(file, JSON.stringify({ updatedAt: Date.now(), items: filtered }, null, 2), {
      mode: 0o600,
    })
  } catch {}
}

export async function consumePendingDshInteractionResponse(
  dshHome,
  { code = '', callId = '', agentId = '' } = {},
) {
  if (!dshHome) return null
  try {
    const file = join(resolve(dshHome), 'pending-interaction-responses.json')
    const existing = await readPendingDshInteractionResponses(dshHome)
    const cleanCode = String(code || '').trim().toUpperCase()
    let matched = null
    const remaining = []
    for (const item of existing) {
      const codeMatch = cleanCode && String(item.code || '').toUpperCase() === cleanCode
      const callMatch =
        Boolean(callId && item.callId && item.callId === callId) &&
        (!agentId || !item.agentId || item.agentId === agentId)
      const agentFallbackMatch =
        !cleanCode && !callId && Boolean(agentId && item.agentId === agentId)
      if (!matched && (codeMatch || callMatch || agentFallbackMatch)) {
        matched = item
      } else {
        remaining.push(item)
      }
    }
    if (matched) {
      await writeFile(file, JSON.stringify({ updatedAt: Date.now(), items: remaining }, null, 2), {
        mode: 0o600,
      })
    }
    return matched
  } catch {
    return null
  }
}


export async function loadDiskSessionsFromDshHome(
  dshHome,
  { maxSessions = 25, maxMessages = 14, includeArchived = false, syncWorkspaceStorage = true } = {},
) {
  if (!dshHome) return []
  const sessionsRoot = join(resolve(dshHome), 'sessions')
  const wsStorage = await readDshWorkspaceStorage(dshHome)
  const archivedSet = includeArchived ? new Set() : wsStorage.archivedSet
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
      if (archivedSet.has(sessEntry.name)) continue
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
        if (archivedSet.has(cachedEntry.session.id)) continue
        const customOverride = customTitles[cachedEntry.session.id]
        const fullTr = Array.isArray(cachedEntry.fullTranscript)
          ? cachedEntry.fullTranscript
          : cachedEntry.session.transcript || []
        let hasLockNow = false
        try {
          await stat(join(projPath, sessEntry.name, 'session.lock'))
          hasLockNow = true
        } catch {}
        const ageNow = Date.now() - fileStat.mtimeMs
        const isActivelyRunningNow =
          hasLockNow && (ageNow <= 6000 || (ageNow <= 45000 && !cachedEntry.hasConcluded))
        const effTitleNow = customOverride || cachedEntry.session.title
        const pendingApprovalNow = materializePendingDshInteraction(
          cachedEntry.rawPendingInteraction,
          {
            sessionId: cachedEntry.session.id,
            title: effTitleNow,
            project: cachedEntry.session.project,
            cwd: cachedEntry.session.cwd,
            hasLock: hasLockNow,
            ageMs: ageNow,
          },
        )
        results.push({
          ...cachedEntry.session,
          ...(customOverride ? { title: customOverride } : {}),
          status: pendingApprovalNow ? 'approval' : isActivelyRunningNow ? 'running' : 'idle',
          isMidTurn: Boolean(pendingApprovalNow) || !cachedEntry.hasConcluded,
          turnState: pendingApprovalNow
            ? 'approval'
            : isActivelyRunningNow
              ? 'running'
              : cachedEntry.hasConcluded
                ? 'conclusion'
                : 'idle',
          statusLabel: pendingApprovalNow
            ? pendingApprovalNow.kind === 'question'
              ? '⏳ 待你选择'
              : '⏳ 待你授权'
            : isActivelyRunningNow
              ? '🟢 运行中'
              : cachedEntry.hasConcluded
                ? '🔵 已出结论'
                : '已完成',
          pendingApproval: pendingApprovalNow || null,
          messageCount: fullTr.length,
          totalTranscriptCount: fullTr.length,
          transcript: fullTr.slice(-maxMessages),
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
        if (header.origin === 'subagent') continue
        const headerId = String(header.id || sessEntry.name).trim()
        if (archivedSet.has(headerId)) continue
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
        let sessionModel = ''
        let lastActivity = Math.round(fileStat.mtimeMs)
        let lastUserInputAt = 0
        let lastConclusionAt = 0

        for (const e of lines) {
          if (e.time && e.time > lastActivity) lastActivity = e.time
          if (e.type === 'request/header' && e.data?.header?.config?.model) {
            const prov = String(e.data.header.config.provider || '').trim()
            const mod = String(e.data.header.config.model || '').trim()
            const eff = String(e.data.header.config.reasoningEffort || '').trim()
            if (mod) sessionModel = prov ? `${prov}::${mod}${eff ? `::${eff}` : ''}` : mod
          } else if (e.type === 'request/context' && e.data?.model && !sessionModel) {
            const prov = String(e.data.provider || '').trim()
            const mod = String(e.data.model || '').trim()
            if (mod) sessionModel = prov ? `${prov}::${mod}` : mod
          }
          if (e.type === 'user/message') {
            const srcKind = e.data?.source?.kind
            if (srcKind && srcKind !== 'user' && srcKind !== 'user-question-reply') continue
            const blocks = Array.isArray(e.data?.content) ? e.data.content : []
            const rawUserText = blocks
              .filter(b => b?.type === 'text' && typeof b.text === 'string')
              .map(b => redactText(b.text))
              .join('\n')
              .trim()
            const formattedUserText =
              srcKind === 'user-question-reply'
                ? formatUserQuestionReplyText(rawUserText)
                : rawUserText
            const userText = cleanForChat(formattedUserText, 48000)
            if (!userText || isSystemInjectedUserText(userText)) continue
            lastUserInputAt = e.time || lastActivity
            lastConclusionAt = 0
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
          } else if (e.type === 'tool/call' || e.type === 'tool/result') {
            lastConclusionAt = 0
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
            if (asstText) lastOutput = asstText.slice(0, 600)
            if (stepTools.length > 0) {
              lastConclusionAt = 0
              runningSummary = `🔧 正在执行: ${stepTools.map(t => (t.summary ? `${t.name} (${t.summary})` : t.name)).join(' · ')}`.slice(0, 240)
            } else if (asstText) {
              lastConclusionAt = e.time || lastActivity
              lastConclusionText = asstText.slice(0, 600)
            } else if (thinkingText) {
              lastConclusionAt = 0
              runningSummary = `💭 正在思考: ${thinkingText.replace(/\s+/g, ' ').slice(0, 120)}`
            }
            rawTranscript.push({
              index: rawTranscript.length,
              role: 'assistant',
              text: asstText,
              thinking: thinkingText,
              tools: stepTools,
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
        let hasLock = false
        try {
          await stat(join(projPath, sessEntry.name, 'session.lock'))
          hasLock = true
        } catch {}
        const ageMs = Date.now() - fileStat.mtimeMs
        const isActivelyRunning =
          hasLock && (ageMs <= 6000 || (ageMs <= 45000 && !hasConcluded))
        const effTitle = customTitles[id] || title || transcript[0]?.text?.slice(0, 36) || '历史会话'
        const rawPendingInteraction = extractRawPendingDshInteraction(lines)
        const pendingApproval = materializePendingDshInteraction(rawPendingInteraction, {
          sessionId: id,
          title: effTitle,
          project,
          cwd,
          hasLock,
          ageMs,
        })

        const sessionObj = {
          id,
          shortId,
          harness: 'dsh',
          harnessLabel: 'DeepSeek Harness',
          ...(sessionModel ? { model: sessionModel } : {}),
          title: effTitle,
          status: pendingApproval ? 'approval' : isActivelyRunning ? 'running' : 'idle',
          isMidTurn: Boolean(pendingApproval) || !hasConcluded,
          turnState: pendingApproval
            ? 'approval'
            : isActivelyRunning
              ? 'running'
              : hasConcluded
                ? 'conclusion'
                : 'idle',
          statusLabel: pendingApproval
            ? pendingApproval.kind === 'question'
              ? '⏳ 待你选择'
              : '⏳ 待你授权'
            : isActivelyRunning
              ? '🟢 运行中'
              : hasConcluded
                ? '🔵 已出结论'
                : '已完成',
          pendingApproval: pendingApproval || null,
          project,
          cwd,
          lastActivity,
          updatedAt: lastActivity,
          lastConclusionAt,
          lastOutput: lastConclusionText || lastOutput,
          runningSummary: runningSummary || lastOutput,
          queuedSteers: [],
          messageCount: transcript.length,
          totalTranscriptCount: transcript.length,
          transcript: transcript.slice(-maxMessages),
        }
        dshSessionParseCache.set(zstdPath, {
          cachedKey,
          hasConcluded,
          rawPendingInteraction,
          fullTranscript: transcript,
          session: sessionObj,
        })
        results.push({ ...sessionObj })
      } catch {
        // ignore unreadable session file
      }
    }
  }

  results.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  if (syncWorkspaceStorage && results.length > 0) {
    try {
      await syncDshWorkspaceStorage(dshHome, results, wsStorage)
    } catch {
      // ignore storage sync errors
    }
  }
  return results.slice(0, maxSessions)
}

export function invalidateDshSessionParseCache() {
  dshSessionParseCache.clear()
}

/**
 * Parse macOS `pmset -g batt` output into structured battery & power source telemetry.
 */
export function parsePmsetBatteryOutput(rawText = '') {
  const text = String(rawText || '')
  const acPower = /Now drawing from\s+'AC Power'/i.test(text)
  const battMatch = /InternalBattery[^\n\t]*\t\s*(\d+)%;\s*([^;]+);\s*([^;\n]+)/i.exec(text)
  if (battMatch) {
    const percent = Math.max(0, Math.min(100, Number(battMatch[1]) || 0))
    const stateRaw = String(battMatch[2] || '').trim().toLowerCase()
    const remRaw = String(battMatch[3] || '')
      .replace(/present:\s*(true|false)/gi, '')
      .replace(/remaining/gi, '')
      .trim()
    const timeRemaining =
      remRaw && !/^0:00$|^no estimate$|^\(no estimate\)$/i.test(remRaw) ? remRaw : ''
    const charging =
      acPower ||
      stateRaw === 'charging' ||
      stateRaw === 'charged' ||
      stateRaw === 'finishing charge'
    const lowBattery = !acPower && percent <= 20
    const icon = lowBattery ? '🪫' : acPower ? '🔋⚡' : '🔋'
    let label = ''
    if (acPower && (stateRaw === 'charged' || percent >= 99)) {
      label = `${percent}% · 电源供电`
    } else if (acPower) {
      label = `${percent}% · 充电中${timeRemaining ? ` (${timeRemaining})` : ''}`
    } else {
      label = `${percent}% · 电池放电${timeRemaining ? ` (约剩 ${timeRemaining})` : ''}`
    }
    return {
      hasBattery: true,
      acPower,
      percent,
      charging,
      state: stateRaw || (acPower ? 'charged' : 'discharging'),
      timeRemaining,
      lowBattery,
      icon,
      label,
      shortLabel: `${percent}%${acPower ? '⚡' : ''}`,
    }
  }
  return {
    hasBattery: false,
    acPower: true,
    percent: null,
    charging: true,
    state: 'ac-only',
    timeRemaining: '',
    lowBattery: false,
    icon: '🔌',
    label: '台式机电源常供',
    shortLabel: '电源直供',
  }
}

let cachedSystemTelemetry = null
let cachedSystemTelemetryAt = 0
let cachedHwPortMap = null
let cachedHwPortMapAt = 0

/**
 * Collect real-time host power/battery & network interface/latency telemetry.
 * Cached for 15s (with instant RTT updates) so 1.5s heartbeats incur zero overhead.
 */
export async function collectHostSystemTelemetry({
  lastRttMs = null,
  execImpl = execFileAsync,
  force = false,
  platform = execImpl !== execFileAsync ? 'darwin' : process.platform,
} = {}) {
  const now = Date.now()
  const rttMs = Number(lastRttMs) > 0 ? Math.round(Number(lastRttMs)) : null

  if (!force && cachedSystemTelemetry && now - cachedSystemTelemetryAt < 15_000) {
    const net = cachedSystemTelemetry.network || {}
    const effectiveRtt = rttMs ?? net.rttMs ?? null
    const quality = !effectiveRtt
      ? 'good'
      : effectiveRtt <= 180
        ? 'excellent'
        : effectiveRtt <= 450
          ? 'good'
          : 'slow'
    const qualityLabel = quality === 'excellent' ? '极佳' : quality === 'good' ? '良好' : '较慢'
    return {
      ...cachedSystemTelemetry,
      network: {
        ...net,
        rttMs: effectiveRtt,
        quality,
        qualityLabel,
        label: `${net.kindLabel || '在线'}${net.localIp ? ` (${net.localIp})` : ''}${effectiveRtt ? ` · ${effectiveRtt}ms` : ''}`,
        shortLabel: `${net.kindLabel || '在线'}${effectiveRtt ? ` ${effectiveRtt}ms` : ''}`,
      },
      updatedAt: now,
    }
  }

  let power = {
    hasBattery: false,
    acPower: true,
    percent: null,
    charging: true,
    state: 'ac-only',
    timeRemaining: '',
    lowBattery: false,
    icon: '🔌',
    label: '电源直供',
    shortLabel: '电源直供',
  }

  if (platform === 'darwin') {
    try {
      const res = await execImpl('/usr/bin/pmset', ['-g', 'batt'], { timeout: 1500 })
      const stdout = typeof res === 'string' ? res : res?.stdout || ''
      power = parsePmsetBatteryOutput(stdout)
    } catch {
      // keep default AC power
    }
  } else if (platform === 'linux') {
    try {
      let capStr = ''
      let statusStr = ''
      for (const batDir of ['BAT0', 'BAT1', 'battery']) {
        try {
          capStr = await readFile(`/sys/class/power_supply/${batDir}/capacity`, 'utf8')
          statusStr = await readFile(`/sys/class/power_supply/${batDir}/status`, 'utf8')
          break
        } catch {}
      }
      if (capStr) {
        const percent = Math.max(0, Math.min(100, Number(capStr.trim()) || 0))
        const stateRaw = statusStr.trim().toLowerCase()
        const acPower = stateRaw !== 'discharging'
        const lowBattery = !acPower && percent <= 20
        power = {
          hasBattery: true,
          acPower,
          percent,
          charging: acPower,
          state: stateRaw,
          timeRemaining: '',
          lowBattery,
          icon: lowBattery ? '🪫' : acPower ? '🔋⚡' : '🔋',
          label: `${percent}% · ${acPower ? '电源供电' : '电池放电'}`,
          shortLabel: `${percent}%${acPower ? '⚡' : ''}`,
        }
      }
    } catch {}
  }

  // Hardware port mapping on macOS (e.g., en0 -> Wi-Fi, en5 -> LAN)
  if (platform === 'darwin' && (!cachedHwPortMap || now - cachedHwPortMapAt > 300_000)) {
    const map = new Map()
    try {
      const res = await execImpl('/usr/sbin/networksetup', ['-listallhardwareports'], { timeout: 1500 })
      const out = typeof res === 'string' ? res : res?.stdout || ''
      const blocks = out.split(/\n\s*\n/)
      for (const blk of blocks) {
        const portMatch = /Hardware Port:\s*([^\n]+)/i.exec(blk)
        const devMatch = /Device:\s*([^\s\n]+)/i.exec(blk)
        if (portMatch && devMatch) {
          map.set(devMatch[1].trim(), portMatch[1].trim())
        }
      }
    } catch {}
    cachedHwPortMap = map
    cachedHwPortMapAt = now
  }

  let primaryIface = ''
  let localIp = ''
  let hasVpn = false

  if (platform === 'darwin') {
    try {
      const res = await execImpl('/usr/sbin/scutil', ['--nwi'], { timeout: 1200 })
      const out = typeof res === 'string' ? res : res?.stdout || ''
      const m = /^\s*([a-z0-9]+)\s*:\s*flags[^\n]*\n\s*address\s*:\s*([0-9.]+)/im.exec(out)
      if (m) {
        primaryIface = m[1].trim()
        localIp = m[2].trim()
      }
    } catch {}
  }

  try {
    const ifaces = networkInterfaces()
    for (const [name, addrs] of Object.entries(ifaces || {})) {
      for (const addr of addrs || []) {
        const isV4 = addr.family === 'IPv4' || addr.family === 4
        if (!isV4 || addr.internal) continue
        if (/^(utun|tun|tap|wg|tailscale)/i.test(name)) {
          hasVpn = true
          continue
        }
        if (!primaryIface || (!localIp && name === primaryIface)) {
          primaryIface = name
          localIp = addr.address
        }
      }
    }
  } catch {}

  const hwPortName = (cachedHwPortMap && primaryIface && cachedHwPortMap.get(primaryIface)) || ''
  let kind = 'network'
  let kindLabel = '在线'
  let netIcon = '🌐'
  if (/wi-fi|airport|wlan/i.test(hwPortName) || /^wl/i.test(primaryIface)) {
    kind = 'wifi'
    kindLabel = 'Wi-Fi'
    netIcon = '📶'
  } else if (/ethernet|lan|thunderbolt|usb/i.test(hwPortName) || /^eth/i.test(primaryIface)) {
    kind = 'ethernet'
    kindLabel = '有线网络'
    netIcon = '🌐'
  } else if (primaryIface === 'en0') {
    kind = 'wifi'
    kindLabel = 'Wi-Fi'
    netIcon = '📶'
  } else if (primaryIface) {
    kindLabel = primaryIface
  }

  const quality = !rttMs ? 'good' : rttMs <= 180 ? 'excellent' : rttMs <= 450 ? 'good' : 'slow'
  const qualityLabel = quality === 'excellent' ? '极佳' : quality === 'good' ? '良好' : '较慢'

  const network = {
    online: true,
    kind,
    kindLabel,
    iface: primaryIface,
    hwPort: hwPortName,
    localIp,
    hasVpn,
    rttMs,
    quality,
    qualityLabel,
    icon: netIcon,
    label: `${kindLabel}${localIp ? ` (${localIp})` : ''}${rttMs ? ` · ${rttMs}ms` : ''}`,
    shortLabel: `${kindLabel}${rttMs ? ` ${rttMs}ms` : ''}`,
  }

  cachedSystemTelemetry = {
    power,
    network,
    updatedAt: now,
  }
  cachedSystemTelemetryAt = now
  return cachedSystemTelemetry
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
    try {
      await removeSessionFromDshWorkspaceStorage(dshHome, id)
    } catch {
      // ignore workspace.json cleanup error
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

async function resolveWorkspaceOrArtifactFile(workspaceRoot, relPath = '', { extraRoots = [] } = {}) {
  const originalRel = String(relPath || '').trim()
  let cleanedInput = originalRel.replace(/^file:\/\//i, '').replace(/#L\d+(?:-L?\d+)?$/i, '').trim()
  try {
    if (cleanedInput.includes('%')) cleanedInput = decodeURIComponent(cleanedInput)
  } catch {}
  if (cleanedInput.startsWith('~/')) {
    cleanedInput = join(homedir(), cleanedInput.slice(2))
  }

  const rawRel = cleanedInput.replace(/^([/\\])+/, '').trim()
  if (!rawRel || rawRel.startsWith('..') || rawRel.includes(`..${sep}`) || rawRel.includes('../') || cleanedInput.includes('../')) {
    return { ok: false, error: '拒绝越界访问工作区外部文件' }
  }

  const root = workspaceRoot ? await resolveRealRoot(workspaceRoot) : ''
  let realFile = ''
  if (cleanedInput.startsWith('/')) {
    const candidateAbs = resolve(cleanedInput)
    const candidateReal = await realpath(candidateAbs).catch(() => candidateAbs)
    const extraResolved = []
    for (const r of extraRoots || []) {
      if (r) extraResolved.push(await resolveRealRoot(r))
    }
    const allowedArtifactRoots = [
      root,
      ...extraResolved,
      await resolveRealRoot(join(homedir(), '.gemini', 'antigravity', 'brain')),
      await resolveRealRoot(join(homedir(), '.gemini', 'antigravity-ide', 'brain')),
      await resolveRealRoot(join(homedir(), '.dsh')),
    ].filter(Boolean)
    let matchedRoot = null
    for (const ar of allowedArtifactRoots) {
      if (ar && (candidateReal === ar || candidateReal.startsWith(ar + sep))) {
        matchedRoot = ar
        break
      }
    }
    if (matchedRoot) {
      realFile = await resolveSafeTarget(matchedRoot, candidateReal)
    } else if (root) {
      const targetFile = resolve(root, rawRel)
      realFile = await resolveSafeTarget(root, targetFile)
    } else {
      return { ok: false, error: '该任务未关联工作区目录' }
    }
  } else if (root) {
    const targetFile = resolve(root, rawRel)
    realFile = await resolveSafeTarget(root, targetFile)
  } else {
    return { ok: false, error: '该任务未关联工作区目录' }
  }

  const returnRelPath = originalRel.startsWith('/') || originalRel.startsWith('file://')
    ? originalRel
    : rawRel

  let info = null
  try {
    info = await stat(realFile)
  } catch (statErr) {
    if (root && /\/\.gemini\/antigravity(?:-ide)?\/brain\//.test(cleanedInput)) {
      const baseName = basename(cleanedInput)
      for (const fallbackCandidate of [resolve(root, 'out', baseName), resolve(root, baseName)]) {
        try {
          const safeFallback = await resolveSafeTarget(root, fallbackCandidate)
          const fbInfo = await stat(safeFallback)
          if (fbInfo.isFile()) {
            realFile = safeFallback
            info = fbInfo
            break
          }
        } catch {
          // continue
        }
      }
    }
    if (!info) throw statErr
  }
  if (!info.isFile()) {
    return { ok: false, error: '目标路径不是普通文件' }
  }
  return {
    ok: true,
    realFile,
    info,
    returnRelPath,
    ext: extname(realFile).toLowerCase(),
    name: basename(realFile),
  }
}

/**
 * Read-only workspace file preview (strictly confined inside workspace root or AI artifact roots, with secret redaction).
 */
export async function readWorkspaceFile(workspaceRoot, relPath = '') {
  try {
    const resolved = await resolveWorkspaceOrArtifactFile(workspaceRoot, relPath)
    if (!resolved.ok) return resolved
    const { realFile, info, returnRelPath, ext, name } = resolved

    if (VIDEO_MIME[ext]) {
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'video',
        mime: VIDEO_MIME[ext],
        size: info.size,
        mtimeMs: Math.round(info.mtimeMs),
      }
    }

    if (IMAGE_MIME[ext]) {
      if (info.size > MAX_IMAGE_PREVIEW_BYTES) {
        return { ok: false, error: '图片文件超过 5MB 预览上限' }
      }
      const bytes = await readFile(realFile)
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'image',
        mime: IMAGE_MIME[ext],
        size: info.size,
        dataBase64: bytes.toString('base64'),
      }
    }

    const truncated = info.size > MAX_PREVIEW_BYTES
    let slice
    if (truncated) {
      const fh = await open(realFile, 'r')
      try {
        const buf = Buffer.allocUnsafe(MAX_PREVIEW_BYTES)
        const { bytesRead } = await fh.read(buf, 0, MAX_PREVIEW_BYTES, 0)
        slice = buf.subarray(0, bytesRead)
      } finally {
        await fh.close()
      }
    } else {
      slice = await readFile(realFile)
    }

    if (slice.includes(0)) {
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'binary',
        size: info.size,
        content: `[二进制文件，大小 ${info.size} 字节，不支持直接文本预览]`,
      }
    }

    const rawText = slice.toString('utf8')
    return {
      ok: true,
      relPath: returnRelPath,
      name,
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

export function parseImageDimensions(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  }
  // WebP
  if (buf.length >= 30 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    const chunk = buf.subarray(12, 16).toString('ascii')
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
    }
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buf[offset + 1]
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) }
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2
        continue
      }
      const segLen = buf.readUInt16BE(offset + 2)
      if (segLen < 2) break
      offset += 2 + segLen
    }
  }
  return null
}

async function pruneMediaCacheDir(cacheDir, maxFiles = MAX_MEDIA_CACHE_FILES) {
  try {
    const names = await readdir(cacheDir)
    if (names.length <= maxFiles) return
    const items = []
    for (const n of names) {
      if (n.includes('.tmp-')) continue
      const p = join(cacheDir, n)
      try {
        const st = await stat(p)
        if (st.isFile()) items.push({ p, mtimeMs: st.mtimeMs })
      } catch {}
    }
    items.sort((a, b) => b.mtimeMs - a.mtimeMs)
    for (const old of items.slice(maxFiles)) {
      await rm(old.p, { force: true }).catch(() => {})
    }
  } catch {}
}

async function getOrCreateSmartThumbnail(
  realFile,
  info,
  ext,
  { dshHome = '', maxWidth = 1280, execImpl = execFileAsync } = {},
) {
  // Never downscale SVG vectors or animated GIFs; keep small images untouched (except HEIC/HEIF)
  if (ext === '.svg' || ext === '.gif') return null
  const isHeic = ext === '.heic' || ext === '.heif'
  if (!isHeic && info.size <= THUMB_MIN_BYTES) return null
  if (process.platform !== 'darwin') return null

  const cacheDir = join(resolve(dshHome || '/tmp'), 'cache', 'thumbs')
  const key = createHash('sha1')
    .update(`${realFile}:${info.size}:${Math.round(info.mtimeMs)}:w${maxWidth}`)
    .digest('hex')
    .slice(0, 24)
  const outPath = join(cacheDir, `${key}.jpg`)
  try {
    const cachedInfo = await stat(outPath)
    if (cachedInfo.isFile() && cachedInfo.size > 0) {
      return { filePath: outPath, size: cachedInfo.size, mime: 'image/jpeg' }
    }
  } catch {}

  let dims = null
  try {
    const fh = await open(realFile, 'r')
    try {
      const headLen = Math.min(info.size, 65536)
      const headBuf = Buffer.allocUnsafe(headLen)
      const { bytesRead } = await fh.read(headBuf, 0, headLen, 0)
      dims = parseImageDimensions(headBuf.subarray(0, bytesRead))
    } finally {
      await fh.close()
    }
  } catch {}

  await mkdir(cacheDir, { recursive: true })
  const tmpOut = join(cacheDir, `${key}.tmp-${randomBytes(3).toString('hex')}.jpg`)
  let sipsArgs
  if (dims?.width && dims?.height) {
    if (dims.width <= maxWidth) {
      // Preserve 100% pixel width for tall screenshots so small code/text stays sharp
      sipsArgs = ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', realFile, '--out', tmpOut]
    } else {
      const targetMaxSide =
        dims.height > dims.width
          ? Math.min(12000, Math.round((maxWidth * dims.height) / dims.width))
          : maxWidth
      sipsArgs = ['-Z', String(targetMaxSide), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', realFile, '--out', tmpOut]
    }
  } else {
    sipsArgs = ['-Z', '1920', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', realFile, '--out', tmpOut]
  }

  try {
    await execImpl('/usr/bin/sips', sipsArgs, { timeout: 8000 })
    const outInfo = await stat(tmpOut)
    if (!outInfo.isFile() || outInfo.size === 0 || (!isHeic && outInfo.size >= info.size)) {
      await rm(tmpOut, { force: true }).catch(() => {})
      return null
    }
    await rename(tmpOut, outPath)
    void pruneMediaCacheDir(cacheDir)
    return { filePath: outPath, size: outInfo.size, mime: 'image/jpeg' }
  } catch {
    await rm(tmpOut, { force: true }).catch(() => {})
    return null
  }
}

const inflightMediaJobs = new Map()
const videoProbeCache = new Map()

function withSingleFlightMediaJob(jobKey, fn) {
  if (inflightMediaJobs.has(jobKey)) {
    return inflightMediaJobs.get(jobKey)
  }
  const p = Promise.resolve()
    .then(fn)
    .finally(() => {
      inflightMediaJobs.delete(jobKey)
    })
  inflightMediaJobs.set(jobKey, p)
  return p
}

function iterIsoBoxes(buf, startOffset = 0, endOffset = buf.length) {
  const boxes = []
  let off = startOffset
  const limit = Math.min(endOffset, buf.length)
  while (off + 8 <= limit && boxes.length < 256) {
    let sz = buf.readUInt32BE(off)
    const type = buf.subarray(off + 4, off + 8).toString('ascii')
    let hdr = 8
    if (sz === 1) {
      if (off + 16 > limit) break
      sz = Number(buf.readBigUInt64BE(off + 8))
      hdr = 16
    } else if (sz === 0) {
      sz = limit - off
    }
    if (!Number.isFinite(sz) || sz < hdr || off + sz > limit) break
    boxes.push({
      type,
      boxOffset: off,
      boxEnd: off + sz,
      payloadOffset: off + hdr,
      payloadEnd: off + sz,
    })
    off += sz
  }
  return boxes
}

export function parseMoovVideoInfo(moovBuf) {
  if (!Buffer.isBuffer(moovBuf) || moovBuf.length < 8) {
    return { codec: null, avcProfile: null, avcLevel: null, width: 0, height: 0, audioCodec: null }
  }
  let payloadStart = 0
  let payloadEnd = moovBuf.length
  if (moovBuf.length >= 8 && moovBuf.subarray(4, 8).toString('ascii') === 'moov') {
    const outer = iterIsoBoxes(moovBuf, 0, moovBuf.length)[0]
    if (outer) {
      payloadStart = outer.payloadOffset
      payloadEnd = outer.payloadEnd
    }
  }

  let codec = null
  let avcProfile = null
  let avcLevel = null
  let width = 0
  let height = 0
  let audioCodec = null

  const topChildren = iterIsoBoxes(moovBuf, payloadStart, payloadEnd)
  for (const trak of topChildren) {
    if (trak.type !== 'trak') continue
    const trakChildren = iterIsoBoxes(moovBuf, trak.payloadOffset, trak.payloadEnd)
    const mdia = trakChildren.find(b => b.type === 'mdia')
    if (!mdia) continue
    const mdiaChildren = iterIsoBoxes(moovBuf, mdia.payloadOffset, mdia.payloadEnd)
    const hdlr = mdiaChildren.find(b => b.type === 'hdlr')
    if (!hdlr || hdlr.payloadEnd - hdlr.payloadOffset < 12) continue
    const handlerType = moovBuf.subarray(hdlr.payloadOffset + 8, hdlr.payloadOffset + 12).toString('ascii')
    const minf = mdiaChildren.find(b => b.type === 'minf')
    if (!minf) continue
    const stbl = iterIsoBoxes(moovBuf, minf.payloadOffset, minf.payloadEnd).find(b => b.type === 'stbl')
    if (!stbl) continue
    const stsd = iterIsoBoxes(moovBuf, stbl.payloadOffset, stbl.payloadEnd).find(b => b.type === 'stsd')
    if (!stsd || stsd.payloadEnd - stsd.payloadOffset < 16) continue
    const sampleEntries = iterIsoBoxes(moovBuf, stsd.payloadOffset + 8, stsd.payloadEnd)
    if (sampleEntries.length === 0) continue

    const entry = sampleEntries[0]
    const entryCodec = entry.type.trim().toLowerCase()
    if (handlerType === 'vide' && !codec) {
      codec = entryCodec
      if (entry.payloadEnd - entry.payloadOffset >= 28) {
        width = moovBuf.readUInt16BE(entry.payloadOffset + 24)
        height = moovBuf.readUInt16BE(entry.payloadOffset + 26)
      }
      if ((codec === 'avc1' || codec === 'avc3') && entry.payloadEnd - entry.payloadOffset >= 86) {
        const visualChildren = iterIsoBoxes(moovBuf, entry.payloadOffset + 78, entry.payloadEnd)
        const avcC = visualChildren.find(b => b.type === 'avcC')
        if (avcC && avcC.payloadEnd - avcC.payloadOffset >= 4) {
          avcProfile = moovBuf[avcC.payloadOffset + 1]
          avcLevel = moovBuf[avcC.payloadOffset + 3]
        }
      }
    } else if (handlerType === 'soun' && !audioCodec) {
      audioCodec = entryCodec
    }
  }

  return { codec, avcProfile, avcLevel, width, height, audioCodec }
}

const COMPAT_AVC_PROFILES = new Set([66, 77, 88, 100])

export async function probeVideoCompatibility(realFile, info, ext = '') {
  const cleanExt = String(ext || extname(realFile)).toLowerCase()
  const cacheKey = `${realFile}:${info.size}:${Math.round(info.mtimeMs)}`
  const cached = videoProbeCache.get(cacheKey)
  if (cached) return cached

  const store = val => {
    videoProbeCache.set(cacheKey, val)
    while (videoProbeCache.size > 200) {
      const oldest = videoProbeCache.keys().next().value
      videoProbeCache.delete(oldest)
    }
    return val
  }

  if (cleanExt !== '.mp4' && cleanExt !== '.m4v' && cleanExt !== '.mov') {
    const containerName = cleanExt.replace(/^\./, '') || 'unknown'
    return store({
      hasMoov: false,
      container: containerName,
      codec: cleanExt === '.webm' ? 'vp9/webm' : containerName,
      avcProfile: null,
      width: 0,
      height: 0,
      faststart: false,
      universalDirectPlay: false,
      strategy: 'transcode',
      reason: 'non_mp4_container',
    })
  }

  const containerName = cleanExt.slice(1)
  let firstMdatOffset = -1
  let moovBox = null
  let moovBuf = null

  const fh = await open(realFile, 'r')
  try {
    const hdrBuf = Buffer.allocUnsafe(16)
    let offset = 0
    for (let i = 0; i < 64 && offset + 8 <= info.size; i += 1) {
      const readLen = Math.min(16, info.size - offset)
      const { bytesRead } = await fh.read(hdrBuf, 0, readLen, offset)
      if (bytesRead < 8) break
      let sz = hdrBuf.readUInt32BE(0)
      const type = hdrBuf.subarray(4, 8).toString('ascii')
      let hdrLen = 8
      if (sz === 1) {
        if (bytesRead < 16) break
        sz = Number(hdrBuf.readBigUInt64BE(8))
        hdrLen = 16
      } else if (sz === 0) {
        sz = info.size - offset
      }
      if (!Number.isFinite(sz) || sz < hdrLen || offset + sz > info.size) break
      if (type === 'mdat' && sz > hdrLen && firstMdatOffset === -1) {
        firstMdatOffset = offset
      } else if (type === 'moov') {
        moovBox = {
          offset,
          payloadOffset: offset + hdrLen,
          payloadSize: sz - hdrLen,
        }
        break
      }
      offset += sz
    }

    if (moovBox && moovBox.payloadSize > 0) {
      const maxMoovRead = Math.min(moovBox.payloadSize, 4 * 1024 * 1024)
      const rawMoov = Buffer.allocUnsafe(maxMoovRead)
      const { bytesRead } = await fh.read(rawMoov, 0, maxMoovRead, moovBox.payloadOffset)
      moovBuf = rawMoov.subarray(0, bytesRead)
    }
  } finally {
    await fh.close()
  }

  if (!moovBox || !moovBuf) {
    return store({
      hasMoov: false,
      container: containerName,
      codec: 'unknown',
      avcProfile: null,
      width: 0,
      height: 0,
      faststart: true,
      universalDirectPlay: cleanExt !== '.mov',
      strategy: cleanExt === '.mov' ? 'transcode' : 'direct',
      reason: 'no_moov',
    })
  }

  const faststart = firstMdatOffset === -1 || moovBox.offset < firstMdatOffset
  const parsed = parseMoovVideoInfo(moovBuf)
  const codec = parsed.codec || 'unknown'
  const avcProfile = parsed.avcProfile
  const isCompatAvc =
    (codec === 'avc1' || codec === 'avc3') &&
    (avcProfile === null || COMPAT_AVC_PROFILES.has(avcProfile))

  if (isCompatAvc) {
    if ((cleanExt === '.mp4' || cleanExt === '.m4v') && (faststart || info.size <= 512 * 1024)) {
      return store({
        hasMoov: true,
        container: containerName,
        codec,
        avcProfile,
        width: parsed.width,
        height: parsed.height,
        faststart,
        universalDirectPlay: true,
        strategy: 'direct',
        reason: 'h264_yuv420p_faststart',
      })
    }
    return store({
      hasMoov: true,
      container: containerName,
      codec,
      avcProfile,
      width: parsed.width,
      height: parsed.height,
      faststart,
      universalDirectPlay: false,
      strategy: 'remux',
      reason: cleanExt === '.mov' ? 'mov_h264_remux' : 'moov_at_tail',
    })
  }

  if (codec === 'hvc1' && (cleanExt === '.mp4' || cleanExt === '.m4v') && (faststart || info.size <= 512 * 1024)) {
    return store({
      hasMoov: true,
      container: containerName,
      codec,
      avcProfile: null,
      width: parsed.width,
      height: parsed.height,
      faststart,
      universalDirectPlay: false,
      strategy: 'direct',
      reason: 'hevc_hvc1',
    })
  }

  const reason =
    avcProfile === 244
      ? 'h264_yuv444p'
      : avcProfile !== null
        ? `h264_profile_${avcProfile}`
        : `codec_${codec}`

  return store({
    hasMoov: true,
    container: containerName,
    codec,
    avcProfile,
    width: parsed.width,
    height: parsed.height,
    faststart,
    universalDirectPlay: false,
    strategy: 'transcode',
    reason,
  })
}

async function getOrCreateFastRemuxMp4(
  realFile,
  info,
  { dshHome = '', execImpl = execFileAsync } = {},
) {
  const cacheDir = join(resolve(dshHome || '/tmp'), 'cache', 'thumbs')
  const key = createHash('sha1')
    .update(`${realFile}:${info.size}:${Math.round(info.mtimeMs)}:remux1`)
    .digest('hex')
    .slice(0, 24)
  const outPath = join(cacheDir, `${key}-remux.mp4`)

  return withSingleFlightMediaJob(outPath, async () => {
    try {
      const cachedInfo = await stat(outPath)
      if (cachedInfo.isFile() && cachedInfo.size > 0) {
        return { filePath: outPath, size: cachedInfo.size, mime: 'video/mp4' }
      }
    } catch {}

    await mkdir(cacheDir, { recursive: true })
    const tmpOut = join(cacheDir, `${key}.tmp-${randomBytes(3).toString('hex')}.mp4`)
    try {
      await execImpl(
        'ffmpeg',
        ['-y', '-i', realFile, '-map', '0:v:0', '-map', '0:a?', '-c', 'copy', '-movflags', '+faststart', tmpOut],
        { timeout: 25_000 },
      )
      const outInfo = await stat(tmpOut)
      if (!outInfo.isFile() || outInfo.size === 0) {
        await rm(tmpOut, { force: true }).catch(() => {})
        return null
      }
      await rename(tmpOut, outPath)
      void pruneMediaCacheDir(cacheDir)
      return { filePath: outPath, size: outInfo.size, mime: 'video/mp4' }
    } catch {
      await rm(tmpOut, { force: true }).catch(() => {})
      return null
    }
  })
}

async function getOrCreateCompatibleMp4(
  realFile,
  info,
  { dshHome = '', execImpl = execFileAsync, platform = process.platform } = {},
) {
  const cacheDir = join(resolve(dshHome || '/tmp'), 'cache', 'thumbs')
  const key = createHash('sha1')
    .update(`${realFile}:${info.size}:${Math.round(info.mtimeMs)}:h264v2`)
    .digest('hex')
    .slice(0, 24)
  const outPath = join(cacheDir, `${key}-h264.mp4`)

  return withSingleFlightMediaJob(outPath, async () => {
    try {
      const cachedInfo = await stat(outPath)
      if (cachedInfo.isFile() && cachedInfo.size > 0) {
        return { filePath: outPath, size: cachedInfo.size, mime: 'video/mp4' }
      }
    } catch {}

    await mkdir(cacheDir, { recursive: true })
    const tmpOut = join(cacheDir, `${key}.tmp-${randomBytes(3).toString('hex')}.mp4`)
    const evenScaleFilter = "scale='min(1920,trunc(iw/2)*2)':-2,format=yuv420p"
    let converted = false

    // 1. macOS Apple Silicon / Intel VideoToolbox hardware H.264 encoder (5-10x faster, ~0% CPU contention)
    if (platform === 'darwin') {
      try {
        await execImpl(
          'ffmpeg',
          [
            '-y',
            '-i',
            realFile,
            '-vf',
            evenScaleFilter,
            '-c:v',
            'h264_videotoolbox',
            '-profile:v',
            'high',
            '-b:v',
            '4M',
            '-allow_sw',
            '1',
            '-movflags',
            '+faststart',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            tmpOut,
          ],
          { timeout: 55_000 },
        )
        converted = true
      } catch {
        await rm(tmpOut, { force: true }).catch(() => {})
      }
    }

    // 2. Cross-platform FFmpeg libx264 (Linux / Windows / macOS software fallback)
    if (!converted) {
      try {
        await execImpl(
          'ffmpeg',
          [
            '-y',
            '-i',
            realFile,
            '-vf',
            evenScaleFilter,
            '-c:v',
            'libx264',
            '-profile:v',
            'high',
            '-pix_fmt',
            'yuv420p',
            '-preset',
            'veryfast',
            '-crf',
            '24',
            '-movflags',
            '+faststart',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            tmpOut,
          ],
          { timeout: 55_000 },
        )
        converted = true
      } catch {
        await rm(tmpOut, { force: true }).catch(() => {})
      }
    }

    // 3. Zero-dependency macOS built-in avconvert fallback (ships on every Mac even without Homebrew/FFmpeg)
    if (!converted && platform === 'darwin') {
      try {
        await execImpl(
          '/usr/bin/avconvert',
          ['--source', realFile, '--output', tmpOut, '--preset', 'Preset1920x1080', '--replace'],
          { timeout: 55_000 },
        )
        converted = true
      } catch {
        await rm(tmpOut, { force: true }).catch(() => {})
      }
    }

    if (!converted) {
      await rm(tmpOut, { force: true }).catch(() => {})
      return null
    }
    try {
      const outInfo = await stat(tmpOut)
      if (!outInfo.isFile() || outInfo.size === 0) {
        await rm(tmpOut, { force: true }).catch(() => {})
        return null
      }
      await rename(tmpOut, outPath)
      void pruneMediaCacheDir(cacheDir)
      return { filePath: outPath, size: outInfo.size, mime: 'video/mp4' }
    } catch {
      await rm(tmpOut, { force: true }).catch(() => {})
      return null
    }
  })
}

export function parseHttpByteRange(rangeHeader, totalSize, maxChunkBytes = DEFAULT_STREAM_CHUNK_BYTES) {
  const raw = String(rangeHeader || '').trim()
  if (!raw || !raw.toLowerCase().startsWith('bytes=')) return null
  if (totalSize <= 0) return { ok: false, unsatisfied: true }
  const spec = raw.slice(6).split(',')[0].trim()
  const dashIdx = spec.indexOf('-')
  if (dashIdx === -1) return null
  const startStr = spec.slice(0, dashIdx).trim()
  const endStr = spec.slice(dashIdx + 1).trim()

  if (!startStr && endStr) {
    const suffixLen = Number.parseInt(endStr, 10)
    if (!Number.isFinite(suffixLen) || suffixLen <= 0) return { ok: false, unsatisfied: true }
    const start = Math.max(0, totalSize - suffixLen)
    const end = Math.min(totalSize - 1, start + maxChunkBytes * 2 - 1)
    return { ok: true, start, end }
  }

  const start = Number.parseInt(startStr, 10)
  if (!Number.isFinite(start) || start < 0 || start >= totalSize) {
    return { ok: false, unsatisfied: true }
  }
  if (!endStr) {
    const end = Math.min(totalSize - 1, start + maxChunkBytes - 1)
    return { ok: true, start, end }
  }
  const requestedEnd = Number.parseInt(endStr, 10)
  if (!Number.isFinite(requestedEnd) || requestedEnd < start) {
    return { ok: false, unsatisfied: true }
  }
  const cappedEnd = Math.min(totalSize - 1, requestedEnd, start + maxChunkBytes * 2 - 1)
  return { ok: true, start, end: cappedEnd }
}

export async function readWorkspaceFileFastMeta(workspaceRoot, relPath = '', { extraRoots = [] } = {}) {
  try {
    const resolved = await resolveWorkspaceOrArtifactFile(workspaceRoot, relPath, { extraRoots })
    if (!resolved.ok) return resolved
    const { realFile, info, returnRelPath, ext, name } = resolved
    const mtimeMs = Math.round(info.mtimeMs)
    const etag = `W/"${info.size.toString(16)}-${mtimeMs.toString(16)}"`

    if (VIDEO_MIME[ext]) {
      const videoProbe = await probeVideoCompatibility(realFile, info, ext).catch(() => null)
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'video',
        mime: VIDEO_MIME[ext],
        size: info.size,
        mtimeMs,
        etag,
        ...(videoProbe ? { videoProbe } : {}),
      }
    }

    if (IMAGE_MIME[ext]) {
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'image',
        mime: IMAGE_MIME[ext],
        size: info.size,
        mtimeMs,
        etag,
      }
    }

    const truncated = info.size > MAX_PREVIEW_BYTES
    let slice
    if (truncated) {
      const fh = await open(realFile, 'r')
      try {
        const buf = Buffer.allocUnsafe(MAX_PREVIEW_BYTES)
        const { bytesRead } = await fh.read(buf, 0, MAX_PREVIEW_BYTES, 0)
        slice = buf.subarray(0, bytesRead)
      } finally {
        await fh.close()
      }
    } else {
      slice = await readFile(realFile)
    }

    if (slice.includes(0)) {
      return {
        ok: true,
        relPath: returnRelPath,
        name,
        ext,
        kind: 'binary',
        size: info.size,
        mtimeMs,
        etag,
        content: `[二进制文件，大小 ${info.size} 字节，不支持直接文本预览]`,
      }
    }

    return {
      ok: true,
      relPath: returnRelPath,
      name,
      ext,
      kind: 'text',
      size: info.size,
      mtimeMs,
      etag,
      truncated,
      content: redactText(slice.toString('utf8')),
    }
  } catch (error) {
    return { ok: false, error: error?.message || '读取文件失败' }
  }
}

async function prepareWorkspaceFileStream(
  workspaceRoot,
  relPath = '',
  {
    rangeHeader = '',
    ifNoneMatch = '',
    thumb = false,
    transcode = false,
    download = false,
    raw = false,
    dshHome = '',
    extraRoots = [],
    maxChunkBytes = DEFAULT_STREAM_CHUNK_BYTES,
    execImpl = execFileAsync,
    platform = process.platform,
  } = {},
) {
  const resolved = await resolveWorkspaceOrArtifactFile(workspaceRoot, relPath, { extraRoots })
  if (!resolved.ok) return { ok: false, status: 404, error: resolved.error }
  const { realFile, info, ext, name } = resolved

  let streamFile = realFile
  let streamSize = info.size
  let streamMime = VIDEO_MIME[ext] || IMAGE_MIME[ext] || 'application/octet-stream'
  let variant = 'orig'
  let transcodeUnavailable = false

  if (thumb && IMAGE_MIME[ext] && !download && !raw) {
    const th = await getOrCreateSmartThumbnail(realFile, info, ext, { dshHome, execImpl })
    if (th) {
      streamFile = th.filePath
      streamSize = th.size
      streamMime = th.mime
      variant = 'th'
    }
  } else if (VIDEO_MIME[ext] && !download && !raw) {
    if (transcode) {
      const tc = await getOrCreateCompatibleMp4(realFile, info, { dshHome, execImpl, platform })
      if (tc) {
        streamFile = tc.filePath
        streamSize = tc.size
        streamMime = tc.mime
        variant = 'tc'
      } else {
        transcodeUnavailable = true
      }
    } else {
      const probe = await probeVideoCompatibility(realFile, info, ext).catch(() => null)
      if (probe?.strategy === 'remux') {
        const remuxed = await getOrCreateFastRemuxMp4(realFile, info, { dshHome, execImpl })
        if (remuxed) {
          streamFile = remuxed.filePath
          streamSize = remuxed.size
          streamMime = remuxed.mime
          variant = 'remux'
        } else if (ext === '.mov') {
          const tc = await getOrCreateCompatibleMp4(realFile, info, { dshHome, execImpl, platform })
          if (tc) {
            streamFile = tc.filePath
            streamSize = tc.size
            streamMime = tc.mime
            variant = 'tc'
          } else {
            transcodeUnavailable = true
          }
        }
      } else if (probe?.strategy === 'transcode') {
        const tc = await getOrCreateCompatibleMp4(realFile, info, { dshHome, execImpl, platform })
        if (tc) {
          streamFile = tc.filePath
          streamSize = tc.size
          streamMime = tc.mime
          variant = 'tc'
        } else {
          transcodeUnavailable = true
        }
      }
    }
  }

  const isThumb = variant === 'th'
  const transcoded = variant === 'tc'
  const remuxed = variant === 'remux'
  const mtimeMs = Math.round(info.mtimeMs)
  const etag = `W/"${info.size.toString(16)}-${mtimeMs.toString(16)}-${variant}"`

  if (!rangeHeader && ifNoneMatch && String(ifNoneMatch).trim() === etag) {
    return {
      ok: true,
      status: 304,
      name,
      mime: streamMime,
      etag,
      variant,
      isThumb,
      transcoded,
      remuxed,
      transcodeUnavailable,
      byteLength: 0,
      headers: {
        etag,
        'cache-control': 'private, max-age=86400',
      },
      buffer: Buffer.alloc(0),
    }
  }

  const baseHeaders = {
    'content-type': streamMime,
    'accept-ranges': 'bytes',
    etag,
    'cache-control': 'private, max-age=86400',
  }

  if (streamSize === 0) {
    return {
      ok: true,
      status: 200,
      name,
      mime: streamMime,
      etag,
      variant,
      isThumb,
      transcoded,
      remuxed,
      transcodeUnavailable,
      byteLength: 0,
      headers: { ...baseHeaders, 'content-length': '0' },
      buffer: Buffer.alloc(0),
    }
  }

  const parsedRange = parseHttpByteRange(rangeHeader, streamSize, maxChunkBytes)
  if (parsedRange) {
    if (!parsedRange.ok) {
      const contentRange = `bytes */${streamSize}`
      return {
        ok: false,
        status: 416,
        contentRange,
        headers: { 'content-range': contentRange },
        error: 'Requested Range Not Satisfiable',
      }
    }
    const { start, end } = parsedRange
    const chunkLen = end - start + 1
    const contentRange = `bytes ${start}-${end}/${streamSize}`
    return {
      ok: true,
      status: 206,
      name,
      mime: streamMime,
      etag,
      variant,
      isThumb,
      transcoded,
      remuxed,
      transcodeUnavailable,
      contentRange,
      byteLength: chunkLen,
      headers: {
        ...baseHeaders,
        'content-range': contentRange,
        'content-length': String(chunkLen),
      },
      streamSpec: { filePath: streamFile, start, end },
    }
  }

  // Non-Range GET: cap single HTTP/1.1 tunnel slice at 16 MiB (safe below Cloud Run / Cloudflare 32 MiB gateway ceiling)
  const maxNonRange = 16 * 1024 * 1024
  if (streamSize > maxNonRange) {
    const end = maxNonRange - 1
    const contentRange = `bytes 0-${end}/${streamSize}`
    return {
      ok: true,
      status: 206,
      name,
      mime: streamMime,
      etag,
      variant,
      isThumb,
      transcoded,
      remuxed,
      transcodeUnavailable,
      contentRange,
      byteLength: maxNonRange,
      headers: {
        ...baseHeaders,
        'content-range': contentRange,
        'content-length': String(maxNonRange),
      },
      streamSpec: { filePath: streamFile, start: 0, end },
    }
  }

  // Small text files (non-image, non-video) still undergo secret redaction
  if (!IMAGE_MIME[ext] && !VIDEO_MIME[ext]) {
    const fullBuf = await readFile(streamFile)
    if (!fullBuf.includes(0)) {
      const redacted = Buffer.from(redactText(fullBuf.toString('utf8')), 'utf8')
      return {
        ok: true,
        status: 200,
        name,
        mime: 'text/plain; charset=utf-8',
        etag,
        variant,
        isThumb,
        transcoded,
        remuxed,
        transcodeUnavailable,
        byteLength: redacted.length,
        headers: {
          ...baseHeaders,
          'content-type': 'text/plain; charset=utf-8',
          'content-length': String(redacted.length),
        },
        buffer: redacted,
      }
    }
    return {
      ok: true,
      status: 200,
      name,
      mime: streamMime,
      etag,
      variant,
      isThumb,
      transcoded,
      remuxed,
      transcodeUnavailable,
      byteLength: fullBuf.length,
      headers: {
        ...baseHeaders,
        'content-length': String(fullBuf.length),
        'content-disposition': `inline; filename="${encodeURIComponent(name)}"`,
      },
      buffer: fullBuf,
    }
  }

  return {
    ok: true,
    status: 200,
    name,
    mime: streamMime,
    etag,
    variant,
    isThumb,
    transcoded,
    remuxed,
    transcodeUnavailable,
    byteLength: streamSize,
    headers: {
      ...baseHeaders,
      'content-length': String(streamSize),
      'content-disposition': `inline; filename="${encodeURIComponent(name)}"`,
    },
    streamSpec: { filePath: streamFile, start: 0, end: streamSize - 1 },
  }
}

export async function openWorkspaceFileStream(workspaceRoot, relPath = '', options = {}) {
  try {
    const prep = await prepareWorkspaceFileStream(workspaceRoot, relPath, options)
    if (!prep.ok || prep.buffer !== undefined || !prep.streamSpec) {
      return prep
    }
    const { filePath, start, end } = prep.streamSpec
    const { streamSpec: _ignored, ...rest } = prep
    return {
      ...rest,
      createBodyStream: () => createReadStream(filePath, { start, end }),
    }
  } catch (error) {
    return { ok: false, status: 404, error: error?.message || '读取文件流失败' }
  }
}

export async function readWorkspaceFileStreamChunk(workspaceRoot, relPath = '', options = {}) {
  try {
    const prep = await prepareWorkspaceFileStream(workspaceRoot, relPath, options)
    if (!prep.ok || prep.buffer !== undefined || !prep.streamSpec) {
      return prep
    }
    const { filePath, start, end } = prep.streamSpec
    const { streamSpec: _ignored, ...rest } = prep
    const chunkLen = end - start + 1
    const fh = await open(filePath, 'r')
    let buf
    try {
      const rawBuf = Buffer.allocUnsafe(chunkLen)
      const { bytesRead } = await fh.read(rawBuf, 0, chunkLen, start)
      buf = rawBuf.subarray(0, bytesRead)
    } finally {
      await fh.close()
    }
    return {
      ...rest,
      byteLength: buf.length,
      buffer: buf,
    }
  } catch (error) {
    return { ok: false, status: 404, error: error?.message || '读取文件流失败' }
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

const MAX_ATTACHMENTS_PER_CMD = 4
const MAX_SINGLE_ATTACHMENT_BYTES = 8 * 1024 * 1024

function detectImageFormatFromBuffer(buf, mimeType = '', name = '') {
  if (Buffer.isBuffer(buf) && buf.length >= 12) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { ext: '.png', mime: 'image/png' }
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { ext: '.jpg', mime: 'image/jpeg' }
    }
    // GIF: GIF87a / GIF89a
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
      return { ext: '.gif', mime: 'image/gif' }
    }
    // WebP: RIFF....WEBP
    if (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { ext: '.webp', mime: 'image/webp' }
    }
    // ISO Base Media File Format (HEIC / HEIF / AVIF): ....ftypheic / ftypheix / ftypmif1 / ftypmsf1
    if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brand = buf.subarray(8, 12).toString('ascii').toLowerCase()
      if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
        return { ext: '.heic', mime: 'image/heic' }
      }
    }
  }
  const m = String(mimeType || '').toLowerCase()
  const ext = extname(String(name || '')).toLowerCase()
  if (m.includes('heic') || m.includes('heif') || ext === '.heic' || ext === '.heif') {
    return { ext: '.heic', mime: 'image/heic' }
  }
  if (m.includes('png') || ext === '.png') return { ext: '.png', mime: 'image/png' }
  if (m.includes('webp') || ext === '.webp') return { ext: '.webp', mime: 'image/webp' }
  if (m.includes('gif') || ext === '.gif') return { ext: '.gif', mime: 'image/gif' }
  return { ext: '.jpg', mime: 'image/jpeg' }
}

/**
 * Persist mobile-uploaded screenshot/photo attachments to the target workspace (`.dsh-uploads`)
 * and (when targeting Antigravity IDE) to the conversation's `.user_uploaded` brain directory
 * so all 4 harnesses (DSH, Antigravity IDE, Codex, Claude Code) can inspect the image directly.
 */
export async function persistCommandAttachments(
  attachments,
  { cwd = '', dshHome = '', agentId = '', now = Date.now() } = {},
) {
  const rawList = Array.isArray(attachments) ? attachments : []
  const list = rawList.slice(0, MAX_ATTACHMENTS_PER_CMD)
  const savedFiles = []
  const errors = []
  let rejectedCount = Math.max(0, rawList.length - list.length)

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i]
    if (!item || typeof item !== 'object') {
      rejectedCount += 1
      errors.push(`附件 #${i + 1} 格式无效`)
      continue
    }
    const rawB64 = String(item.dataBase64 || item.base64 || '').trim()
    if (!rawB64) {
      rejectedCount += 1
      errors.push(`附件 ${item.name || `#${i + 1}`} 内容为空`)
      continue
    }
    const cleanB64 = rawB64.replace(/^data:[^;]+;base64,/i, '')
    let buf
    try {
      buf = Buffer.from(cleanB64, 'base64')
    } catch {
      rejectedCount += 1
      errors.push(`附件 ${item.name || `#${i + 1}`} Base64 解码失败`)
      continue
    }
    if (!buf || buf.length === 0) {
      rejectedCount += 1
      errors.push(`附件 ${item.name || `#${i + 1}`} 解码后为空`)
      continue
    }
    if (buf.length > MAX_SINGLE_ATTACHMENT_BYTES) {
      rejectedCount += 1
      errors.push(`附件 ${item.name || `#${i + 1}`} 超过 8MB 上限`)
      continue
    }

    const detected = detectImageFormatFromBuffer(buf, item.mimeType || item.mime, item.name)
    let ext = detected.ext
    let effectiveMime = detected.mime
    const rawBase = basename(String(item.name || `screenshot-${i + 1}`), extname(String(item.name || '')))
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
      .slice(0, 32) || `screenshot_${i + 1}`
    const shortHex = randomBytes(3).toString('hex')
    let fileName = `mobile-${now}-${i + 1}-${rawBase}${ext}`

    let primaryPath = ''
    if (cwd) {
      try {
        const wsUploadDir = join(resolve(cwd), '.dsh-uploads')
        await mkdir(wsUploadDir, { recursive: true })
        // Ensure git never tracks .dsh-uploads in any project workspace
        const gitignorePath = join(wsUploadDir, '.gitignore')
        try {
          await writeFile(gitignorePath, '*\n', { flag: 'wx' })
        } catch {}
        const candidate = join(wsUploadDir, fileName)
        await writeFile(candidate, buf, { mode: 0o600 })
        primaryPath = candidate
      } catch {
        primaryPath = ''
      }
    }
    if (!primaryPath) {
      try {
        const fallbackDir = join(resolve(dshHome || '/tmp'), 'uploads')
        await mkdir(fallbackDir, { recursive: true })
        const candidate = join(fallbackDir, fileName)
        await writeFile(candidate, buf, { mode: 0o600 })
        primaryPath = candidate
      } catch (err) {
        rejectedCount += 1
        errors.push(`附件 ${item.name || `#${i + 1}`} 写入磁盘失败: ${err?.message || err}`)
        continue
      }
    }

    // If raw HEIC was uploaded on macOS, convert it to JPEG via /usr/bin/sips so Codex (-i) & Claude can read it
    if (ext === '.heic' && process.platform === 'darwin' && primaryPath) {
      const convertedPath = primaryPath.replace(/\.heic$/i, '.jpg')
      try {
        await execFileAsync('/usr/bin/sips', ['-s', 'format', 'jpeg', primaryPath, '--out', convertedPath])
        buf = await readFile(convertedPath)
        await rm(primaryPath, { force: true })
        primaryPath = convertedPath
        ext = '.jpg'
        effectiveMime = 'image/jpeg'
        fileName = basename(convertedPath)
      } catch {
        // Keep .heic file if sips conversion is unavailable
      }
    }

    let brainPath = ''
    const targetId = String(agentId || '')
    if (targetId.startsWith('agy-ide:') && process.env.HOME) {
      const rawConvId = targetId.slice('agy-ide:'.length).trim()
      if (rawConvId && !rawConvId.includes('/') && !rawConvId.includes('..')) {
        try {
          const agyUploadDir = join(
            process.env.HOME,
            '.gemini',
            'antigravity',
            'brain',
            rawConvId,
            '.user_uploaded',
          )
          await mkdir(agyUploadDir, { recursive: true })
          const candidate = join(agyUploadDir, `media_${now}_${shortHex}${ext}`)
          await writeFile(candidate, buf, { mode: 0o600 })
          brainPath = candidate
        } catch {
          brainPath = ''
        }
      }
    }

    savedFiles.push({
      name: item.name || fileName,
      fileName,
      mimeType: effectiveMime,
      size: buf.length,
      path: primaryPath,
      brainPath,
      preferredPath: primaryPath || brainPath,
    })
  }

  const imagePaths = savedFiles.map(f => f.preferredPath)
  const enrichPrompt = (baseText = '') => {
    const cleanBase = String(baseText ?? '').trim() || '请查看我从手机上传的图片并帮我分析处理：'
    if (savedFiles.length === 0) return cleanBase
    const lines = savedFiles.map((f, idx) => {
      const extraBrain = f.brainPath && f.brainPath !== f.path ? ` (备用路径: ${f.brainPath})` : ''
      return `- 📎 手机上传图片 ${idx + 1} (${f.name}): ${f.path}${extraBrain}`
    })
    return `${cleanBase}\n\n[手机端上传图片附件 (${savedFiles.length} 张) — 已保存至本机，请直接读取查看]:\n${lines.join('\n')}`
  }

  return {
    ok: rawList.length === 0 || savedFiles.length > 0,
    savedFiles,
    imagePaths,
    rejectedCount,
    errors,
    error: errors[0] || '',
    enrichPrompt,
  }
}
