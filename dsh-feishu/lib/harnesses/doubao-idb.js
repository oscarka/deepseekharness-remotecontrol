import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import v8 from 'node:v8'

const IDB_CACHE = new Map()

export function normalizeEpochMs(val) {
  const n = Number(val)
  if (!Number.isFinite(n) || n <= 0) return 0
  if (n > 1e9 && n < 1e11) return Math.round(n * 1000)
  return Math.round(n)
}

export function snappyUncompress(buf) {
  let pos = 0
  let ulen = 0
  let shift = 0
  while (pos < buf.length) {
    const b = buf[pos++]
    ulen |= (b & 0x7f) << shift
    if (!(b & 0x80)) break
    shift += 7
  }
  if (ulen <= 0 || ulen > 32 * 1024 * 1024) return Buffer.alloc(0)
  const out = Buffer.alloc(ulen)
  let op = 0
  while (pos < buf.length && op < ulen) {
    const tag = buf[pos++]
    const type = tag & 3
    if (type === 0) {
      let len = (tag >> 2) + 1
      if (len > 60) {
        const extra = len - 60
        len = 1
        for (let i = 0; i < extra && pos < buf.length; i++) len += buf[pos++] << (8 * i)
      }
      const copyLen = Math.min(len, buf.length - pos, ulen - op)
      if (copyLen <= 0) break
      buf.copy(out, op, pos, pos + copyLen)
      pos += copyLen
      op += copyLen
    } else {
      let len = 0
      let offset = 0
      if (type === 1) {
        len = ((tag >> 2) & 7) + 4
        offset = ((tag & 0xe0) << 3) | (buf[pos++] || 0)
      } else if (type === 2) {
        if (pos + 2 > buf.length) break
        len = (tag >> 2) + 1
        offset = buf.readUInt16LE(pos)
        pos += 2
      } else {
        if (pos + 4 > buf.length) break
        len = (tag >> 2) + 1
        offset = buf.readUInt32LE(pos)
        pos += 4
      }
      if (offset <= 0 || offset > op) break
      const limit = Math.min(len, ulen - op)
      for (let i = 0; i < limit; i++) {
        out[op] = out[op - offset]
        op++
      }
    }
  }
  return op === ulen ? out : out.subarray(0, op)
}

function readVarint(buf, p) {
  let v = 0
  let s = 0
  while (p < buf.length && s <= 49) {
    const x = buf[p++]
    v += (x & 0x7f) * 2 ** s
    if (!(x & 0x80)) return [v, p]
    s += 7
  }
  return [0, p]
}

export function readLevelDbWalRecords(buf) {
  const BLOCK = 32768
  const records = []
  let cur = []
  for (let off = 0; off < buf.length; off += BLOCK) {
    const end = Math.min(off + BLOCK, buf.length)
    let pos = off
    while (pos + 7 <= end) {
      const len = buf.readUInt16LE(pos + 4)
      const type = buf[pos + 6]
      pos += 7
      if (type === 0 || pos + len > end) break
      const frag = buf.subarray(pos, pos + len)
      pos += len
      if (type === 1) {
        records.push(frag)
      } else if (type === 2) {
        cur = [frag]
      } else if (type === 3 && cur.length) {
        cur.push(frag)
      } else if (type === 4 && cur.length) {
        cur.push(frag)
        records.push(Buffer.concat(cur))
        cur = []
      }
    }
  }
  return records
}

export function readLevelDbSstBlocks(buf) {
  if (buf.length < 48) return []
  const decodeBlock = (off, size) => {
    if (off < 0 || size <= 0 || off + size >= buf.length) return Buffer.alloc(0)
    const raw = buf.subarray(off, off + size)
    return buf[off + size] === 1 ? snappyUncompress(raw) : raw
  }
  try {
    const p0 = buf.length - 48
    const [, p1] = readVarint(buf, p0)
    const [, p2] = readVarint(buf, p1)
    const [idxOff, p3] = readVarint(buf, p2)
    const [idxSize] = readVarint(buf, p3)
    const idx = decodeBlock(idxOff, idxSize)
    if (idx.length < 4) return []
    const numRestarts = idx.readUInt32LE(idx.length - 4)
    const limit = idx.length - 4 * (1 + numRestarts)
    if (limit <= 0) return []
    const out = []
    let ip = 0
    while (ip < limit) {
      const [, i1] = readVarint(idx, ip)
      const [nonShared, i2] = readVarint(idx, i1)
      const [valLen, i3] = readVarint(idx, i2)
      const valStart = i3 + nonShared
      if (valStart + valLen > limit || i3 <= ip) break
      const [bOff, v1] = readVarint(idx, valStart)
      const [bSize] = readVarint(idx, v1)
      const blk = decodeBlock(bOff, bSize)
      if (blk.length > 0) out.push(blk)
      ip = valStart + valLen
    }
    return out
  } catch {
    return []
  }
}

function extractBlocksTextAndThinking(blocks = []) {
  if (!Array.isArray(blocks)) return { text: '', thinking: '', allFinished: true }
  const textParts = []
  const thinkingParts = []
  let allFinished = true
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    if (b.is_finish === false) allFinished = false
    const thinkBlk = b.content?.thinking_block
    if (thinkBlk) {
      const title = String(thinkBlk.finish_title || thinkBlk.streaming_title || '').trim()
      if (title && !thinkingParts.includes(title)) thinkingParts.push(title)
      continue
    }
    const txtBlk = b.content?.text_block
    if (txtBlk) {
      const isCollapsedThinking = Boolean(b.parent_id || b.control_info?.collapse_block_id)
      const txt = String(txtBlk.text || '').trim()
      const sum = String(txtBlk.summary || '').trim()
      if (isCollapsedThinking) {
        if (txt) thinkingParts.push(txt)
        else if (sum && thinkingParts.length === 0) thinkingParts.push(sum)
      } else if (txt) {
        textParts.push(txt)
      }
    }
  }
  return {
    text: textParts.join('\n').trim(),
    thinking: thinkingParts.join('\n').trim(),
    allFinished,
  }
}

function ingestV8Object(obj, conversationsById, turnsByConvId) {
  if (!obj || typeof obj !== 'object') return
  if (typeof obj.schema === 'string' && obj.schema.startsWith('conversation-list-data-')) {
    const list = obj.data?.conversations
    if (Array.isArray(list)) {
      for (const c of list) {
        const id = String(c?.conversation_id || '').trim()
        if (!id) continue
        const prev = conversationsById.get(id) || {}
        conversationsById.set(id, {
          id,
          name: String(c.name || prev.name || '').trim(),
          type: Number(c.conversation_type ?? prev.type ?? 0),
          updateTimeMs: normalizeEpochMs(c.update_time) || prev.updateTimeMs || 0,
          createTimeMs: normalizeEpochMs(c.create_time) || prev.createTimeMs || 0,
          pinned: Boolean(c.pinned ?? prev.pinned),
        })
      }
    }
    return
  }

  const taskMap = obj.state?.mainTaskDataMap
  if (!taskMap || typeof taskMap !== 'object') return
  for (const [taskKey, task] of Object.entries(taskMap)) {
    if (!task || typeof task !== 'object') continue
    const fallbackConvId = String(task.requestQuery?.syncTask?.client_meta?.conversation_id || '').trim()
    const baseTimeMs = normalizeEpochMs(task.createTime) || normalizeEpochMs(task.requestQuery?.syncTask?.option?.create_time_ms)
    let convId = fallbackConvId
    let userText = ''
    let userTimeMs = baseTimeMs

    const sentValues = task.sentMessages && typeof task.sentMessages === 'object' ? Object.values(task.sentMessages) : []
    for (const sm of sentValues) {
      if (sm?.conversationId) convId = String(sm.conversationId).trim()
      const blocks = sm?.extra?.content_blocks_v2 || sm?.extra?.content_block || []
      const parsed = extractBlocksTextAndThinking(blocks)
      if (parsed.text) userText = parsed.text
      const ct = normalizeEpochMs(sm?.extra?.create_time)
      if (ct) userTimeMs = ct
    }
    if (!userText) {
      const syncMsgs = task.requestQuery?.syncTask?.messages
      if (Array.isArray(syncMsgs)) {
        for (const m of syncMsgs) {
          const parsed = extractBlocksTextAndThinking(m?.content_block || m?.content_blocks_v2 || [])
          if (parsed.text) userText = parsed.text
        }
      }
    }

    let assistantText = ''
    let assistantThinking = ''
    let assistantTimeMs = userTimeMs ? userTimeMs + 1 : 0
    let isStreaming = false
    const recvValues = task.receivedMessages && typeof task.receivedMessages === 'object' ? Object.values(task.receivedMessages) : []
    for (const rm of recvValues) {
      if (rm?.conversationId) convId = String(rm.conversationId).trim()
      const extra = rm?.extra || {}
      const blocks = extra.content_blocks_v2 || extra.content_block || []
      const parsed = extractBlocksTextAndThinking(blocks)
      if (parsed.text) assistantText = parsed.text
      if (parsed.thinking) assistantThinking = parsed.thinking
      const finishMs = normalizeEpochMs(extra.ext?.finish_time_ms) || normalizeEpochMs(extra.create_time)
      if (finishMs) assistantTimeMs = finishMs
      const extFinished = extra.ext?.is_finish === '1' || extra.ext?.is_finish === true
      isStreaming = !extFinished && !parsed.allFinished
    }

    if (!convId || (!userText && !assistantText && !assistantThinking)) continue
    if (!turnsByConvId.has(convId)) turnsByConvId.set(convId, new Map())
    turnsByConvId.get(convId).set(String(task.sessionId || taskKey), {
      turnId: String(task.sessionId || taskKey),
      convId,
      userText,
      userTimeMs,
      assistantText,
      assistantThinking,
      assistantTimeMs,
      isStreaming,
    })
  }
}

export function discoverDoubaoIndexedDbDirs(doubaoHome = '') {
  if (!doubaoHome || !existsSync(doubaoHome)) return []
  const dirs = new Set()
  const candidates = [
    join(doubaoHome, 'Default', 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb'),
    join(doubaoHome, 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) dirs.add(resolve(c))
  }
  try {
    for (const entry of readdirSync(doubaoHome, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('Profile ')) {
        const p = join(doubaoHome, entry.name, 'IndexedDB', 'chrome_doubao-chat_0.indexeddb.leveldb')
        if (existsSync(p)) dirs.add(resolve(p))
      }
    }
  } catch {}
  return [...dirs]
}

export function readDoubaoSandboxMeta(doubaoHome = '') {
  const cwdByConvId = new Map()
  const localToRealId = new Map()
  if (!doubaoHome || !existsSync(doubaoHome)) return { cwdByConvId, localToRealId }
  const candidates = [
    join(doubaoHome, 'Default', 'saman_shell_db_storage'),
    join(doubaoHome, 'saman_shell_db_storage'),
  ]
  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    try {
      for (const f of readdirSync(dir).filter(n => n.endsWith('.log') || n.endsWith('.ldb'))) {
        const raw = readFileSync(join(dir, f), 'utf8')
        const marker = '"entriesBySandboxId":'
        let idx = 0
        while (true) {
          const pos = raw.indexOf(marker, idx)
          if (pos === -1) break
          const chunk = raw.slice(pos, Math.min(raw.length, pos + 4096))
          const re = /"conversationId":"([^"]+)"(?:,"localConversationId":"([^"]+)")?[\s\S]{0,400}?"cwd":"([^"]+)"/g
          let m
          while ((m = re.exec(chunk)) !== null) {
            cwdByConvId.set(m[1], m[3])
            if (m[2]) localToRealId.set(m[2], m[1])
          }
          idx = pos + marker.length
        }
      }
    } catch {}
  }
  return { cwdByConvId, localToRealId }
}

export function readDoubaoSandboxCwds(doubaoHome = '') {
  return readDoubaoSandboxMeta(doubaoHome).cwdByConvId
}

export function readDoubaoIndexedDbSnapshot(doubaoHome = '') {
  const idbDirs = discoverDoubaoIndexedDbDirs(doubaoHome)
  const conversationsById = new Map()
  const rawTurnsByConvId = new Map()
  const { cwdByConvId, localToRealId } = readDoubaoSandboxMeta(doubaoHome)
  if (idbDirs.length === 0) {
    return { conversationsById, turnsByConvId: rawTurnsByConvId, cwdByConvId, localToRealId, latestMtimeMs: 0 }
  }

  let sigParts = []
  let latestMtimeMs = 0
  const filesToRead = []
  for (const dir of idbDirs) {
    try {
      const names = readdirSync(dir).filter(n => n.endsWith('.ldb') || n.endsWith('.log')).sort()
      const ldbs = names.filter(n => n.endsWith('.ldb'))
      const logs = names.filter(n => n.endsWith('.log'))
      for (const name of [...ldbs, ...logs]) {
        const full = join(dir, name)
        const st = statSync(full)
        if (st.mtimeMs > latestMtimeMs) latestMtimeMs = st.mtimeMs
        sigParts.push(`${full}:${st.size}:${Math.round(st.mtimeMs)}`)
        filesToRead.push({ full, isLog: name.endsWith('.log') })
      }
    } catch {}
  }

  const cacheKey = resolve(doubaoHome)
  const sig = sigParts.join('|')
  const cached = IDB_CACHE.get(cacheKey)
  if (cached && cached.sig === sig) {
    return {
      conversationsById: cached.conversationsById,
      turnsByConvId: cached.turnsByConvId,
      cwdByConvId,
      localToRealId,
      latestMtimeMs: cached.latestMtimeMs,
    }
  }

  for (const { full, isLog } of filesToRead) {
    try {
      const raw = readFileSync(full)
      const chunks = isLog ? readLevelDbWalRecords(raw) : readLevelDbSstBlocks(raw)
      for (const chunk of chunks) {
        if (
          !chunk.includes('conversation') &&
          !chunk.includes('mainTaskDataMap') &&
          !chunk.includes('sentMessages')
        ) {
          continue
        }
        for (let i = 0; i < chunk.length - 4; i++) {
          if (chunk[i] === 0xff && chunk[i + 1] >= 13 && chunk[i + 1] <= 22 && chunk[i + 2] === 0x6f) {
            try {
              const obj = v8.deserialize(chunk.subarray(i))
              ingestV8Object(obj, conversationsById, rawTurnsByConvId)
            } catch {}
          }
        }
      }
    } catch {}
  }

  // Remap temporary `local_*` conversation IDs to canonical server IDs when known,
  // and drop unmapped `local_*` transient drafts so phantom duplicates never appear.
  const turnsByConvId = new Map()
  for (const [cid, turnMap] of rawTurnsByConvId.entries()) {
    const resolvedId = localToRealId.get(cid) || cid
    if (resolvedId.startsWith('local_')) continue
    if (!turnsByConvId.has(resolvedId)) turnsByConvId.set(resolvedId, new Map())
    const dst = turnsByConvId.get(resolvedId)
    for (const [tk, tv] of turnMap.entries()) {
      dst.set(tk, { ...tv, convId: resolvedId })
    }
  }

  IDB_CACHE.set(cacheKey, { sig, conversationsById, turnsByConvId, latestMtimeMs })
  return { conversationsById, turnsByConvId, cwdByConvId, localToRealId, latestMtimeMs }
}
