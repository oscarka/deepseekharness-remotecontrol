import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { chmod, lstat, mkdir, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, normalize, relative, resolve, sep } from 'node:path'
import { cleanForChat, redactText } from './redact.js'

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

/**
 * Extract full structured conversation transcript and tool activity from a live agent
 * (for Full Remote Web Chat UI and E2EE Conversation Replay).
 */
export function extractSessionTranscript(agent, maxMessages = 60) {
  if (!agent) return []
  let rawMessages = []
  try {
    rawMessages = agent.session?.deriveMessages?.() ?? []
  } catch {
    rawMessages = []
  }

  return rawMessages.slice(-maxMessages).map((msg, idx) => {
    const role = String(msg?.role ?? 'unknown')
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
        if (thought) thinkingParts.push(redactText(thought).slice(0, 1000))
      } else if (block.type === 'tool_use' || block.type === 'tool_call') {
        tools.push({
          name: String(block.name || block.toolName || 'tool'),
          id: String(block.id || ''),
        })
      }
    }

    if (textParts.length === 0 && typeof msg?.content === 'string') {
      textParts.push(redactText(msg.content))
    }

    return {
      index: idx,
      role,
      text: cleanForChat(textParts.join('\n').trim(), 4000),
      thinking: thinkingParts.join('\n').trim(),
      tools,
      toolCalls: tools,
      time: msg?.time || msg?.createdAt || 0,
    }
  })
}

/**
 * Create a new agent session on the host (or initialize an empty one).
 */
export async function createNewAgentSession(agents, { cwd = process.cwd(), title = '' } = {}) {
  const cleanCwd = String(cwd || process.cwd()).trim()
  const cleanTitle = String(title || '远程新建任务').trim()

  let agent = null
  if (typeof agents.create === 'function') {
    agent = await agents.create({ cwd: cleanCwd, title: cleanTitle })
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
    const candidates = [
      join(resolve(dshHome), 'sessions', safeId),
      join(resolve(dshHome), 'sessions', `${safeId}.json`),
    ]
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
