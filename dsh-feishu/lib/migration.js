import { chmod, lstat, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, relative, resolve, sep } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { homedir } from 'node:os'

const SKIP_DIRS = new Set([
  'node_modules',
  '.pnpm-store',
  '.cache',
  '.git',
  'tmp',
  '.dsh-tmp',
  'logs',
])

const SKIP_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
])

const CREDENTIAL_FILES = new Set([
  'feishu.env',
])

const KEEP_ON_SOFT_WIPE = new Set([
  'feishu.env',
  'feishu-host.json',
])

const MAX_SINGLE_FILE_BYTES = 20 * 1024 * 1024 // 20 MiB per file cap for portable snapshot

/**
 * Inspect the local ~/.dsh directory and return statistics for the Web UI & Feishu card.
 */
export async function inspectDshHome(dshHome) {
  const root = resolve(dshHome)
  let rootInfo
  try {
    rootInfo = await stat(root)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        exists: false,
        dshHome: root,
        sessionCount: 0,
        fileCount: 0,
        totalBytes: 0,
        hasFeishuEnv: false,
        updatedAt: 0,
      }
    }
    throw error
  }
  if (!rootInfo.isDirectory()) {
    return {
      exists: false,
      dshHome: root,
      sessionCount: 0,
      fileCount: 0,
      totalBytes: 0,
      hasFeishuEnv: false,
      updatedAt: 0,
    }
  }

  let sessionCount = 0
  try {
    const sessionsDir = join(root, 'sessions')
    const entries = await readdir(sessionsDir)
    sessionCount = entries.filter(name => !name.startsWith('.')).length
  } catch {
    sessionCount = 0
  }

  let hasFeishuEnv = false
  try {
    const envStat = await stat(join(root, 'feishu.env'))
    hasFeishuEnv = envStat.isFile()
  } catch {
    hasFeishuEnv = false
  }

  const walked = await walkFiles(root, root, { includeCredentials: true, collectData: false })
  return {
    exists: true,
    dshHome: root,
    sessionCount,
    fileCount: walked.files.length,
    totalBytes: walked.totalBytes,
    hasFeishuEnv,
    updatedAt: walked.latestMtimeMs || rootInfo.mtimeMs || Date.now(),
  }
}

/**
 * Create a compressed portable snapshot buffer (.dshsnap.gz) from dshHome.
 */
export async function createSnapshotBuffer(dshHome, options = {}) {
  const root = resolve(dshHome)
  const includeCredentials = options.includeCredentials === true
  const inspection = await inspectDshHome(root)
  const walked = await walkFiles(root, root, { includeCredentials, collectData: true })

  const payload = {
    format: 'dsh-snapshot-v1',
    createdAt: Date.now(),
    hostId: String(options.hostId ?? ''),
    hostName: String(options.hostName ?? ''),
    note: String(options.note ?? ''),
    includeCredentials,
    sessionCount: inspection.sessionCount,
    fileCount: walked.files.length,
    totalBytes: walked.totalBytes,
    files: walked.files,
  }

  const rawJson = Buffer.from(JSON.stringify(payload), 'utf8')
  const buffer = gzipSync(rawJson, { level: 6 })

  return {
    buffer,
    meta: {
      format: payload.format,
      createdAt: payload.createdAt,
      hostId: payload.hostId,
      hostName: payload.hostName,
      note: payload.note,
      includeCredentials,
      sessionCount: payload.sessionCount,
      fileCount: payload.fileCount,
      totalBytes: payload.totalBytes,
      compressedBytes: buffer.length,
    },
  }
}

/**
 * Restore a snapshot buffer (.dshsnap.gz or raw JSON buffer) into dshHome.
 */
export async function restoreSnapshotBuffer(dshHome, inputBuffer, options = {}) {
  const root = resolve(dshHome)
  assertSafeDshPath(root)
  const rawBuffer = Buffer.isBuffer(inputBuffer) ? inputBuffer : Buffer.from(inputBuffer)
  let jsonText
  if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
    jsonText = gunzipSync(rawBuffer).toString('utf8')
  } else {
    jsonText = rawBuffer.toString('utf8')
  }

  let payload
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('Invalid snapshot archive: could not parse JSON payload')
  }

  if (payload?.format !== 'dsh-snapshot-v1' || !Array.isArray(payload.files)) {
    throw new Error('Unsupported snapshot format (expected dsh-snapshot-v1)')
  }

  await mkdir(root, { recursive: true, mode: 0o700 })

  let restoredFiles = 0
  for (const item of payload.files) {
    const relPath = normalize(String(item?.relPath ?? '')).replace(/^([/\\])+/, '')
    if (!relPath || relPath.startsWith('..') || relPath.includes(`..${sep}`) || relPath.includes('../')) {
      throw new Error(`Unsafe relative path in snapshot: ${item?.relPath}`)
    }
    if (options.skipCredentials && CREDENTIAL_FILES.has(relPath)) {
      continue
    }
    const target = resolve(root, relPath)
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`Path escapes target directory: ${relPath}`)
    }

    await mkdir(dirname(target), { recursive: true, mode: 0o700 })
    const data = Buffer.from(String(item.dataBase64 ?? ''), 'base64')
    const isSensitive = CREDENTIAL_FILES.has(relPath) || relPath.startsWith('feishu-')
    const mode = isSensitive ? 0o600 : (typeof item.mode === 'number' ? (item.mode & 0o777) : 0o644)
    await writeFile(target, data, { mode })
    if (process.platform !== 'win32') {
      await chmod(target, isSensitive ? 0o600 : mode)
    }
    restoredFiles += 1
  }

  return {
    restoredFiles,
    sessionCount: Number(payload.sessionCount) || 0,
    sourceHostId: String(payload.hostId ?? ''),
    sourceHostName: String(payload.hostName ?? ''),
    createdAt: Number(payload.createdAt) || 0,
  }
}

/**
 * Safely wipe DSH sessions and state from the current computer.
 * By default, keeps feishu.env and feishu-host.json so the machine stays controllable
 * for a future restore unless keepCredentials === false.
 */
export async function wipeDshHome(dshHome, options = {}) {
  const root = resolve(dshHome)
  assertSafeDshPath(root)
  const keepCredentials = options.keepCredentials !== false

  let entries
  try {
    entries = await readdir(root)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { wipedEntries: 0, keptCredentials: keepCredentials }
    }
    throw error
  }

  let wipedEntries = 0
  for (const name of entries) {
    if (keepCredentials && KEEP_ON_SOFT_WIPE.has(name)) {
      continue
    }
    const target = join(root, name)
    await rm(target, { recursive: true, force: true })
    wipedEntries += 1
  }

  return {
    wipedEntries,
    keptCredentials: keepCredentials,
  }
}

function assertSafeDshPath(root) {
  const clean = resolve(root)
  const home = resolve(homedir())
  if (clean === '/' || clean === home || clean.length < 5) {
    throw new Error(`Refusing to modify unsafe root path: ${clean}`)
  }
}

async function walkFiles(root, currentDir, { includeCredentials, collectData }) {
  const files = []
  let totalBytes = 0
  let latestMtimeMs = 0

  let entries
  try {
    entries = await readdir(currentDir, { withFileTypes: true })
  } catch {
    return { files, totalBytes, latestMtimeMs }
  }

  for (const entry of entries) {
    if (SKIP_FILES.has(entry.name)) continue
    const fullPath = join(currentDir, entry.name)
    const relPath = relative(root, fullPath).split(sep).join('/')
    if (!includeCredentials && CREDENTIAL_FILES.has(relPath)) continue

    let info
    try {
      info = await lstat(fullPath)
    } catch {
      continue
    }
    if (info.isSymbolicLink()) continue

    if (info.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      const sub = await walkFiles(root, fullPath, { includeCredentials, collectData })
      files.push(...sub.files)
      totalBytes += sub.totalBytes
      if (sub.latestMtimeMs > latestMtimeMs) latestMtimeMs = sub.latestMtimeMs
    } else if (info.isFile()) {
      if (info.size > MAX_SINGLE_FILE_BYTES) continue
      totalBytes += info.size
      if (info.mtimeMs > latestMtimeMs) latestMtimeMs = info.mtimeMs
      if (collectData) {
        const bytes = await readFile(fullPath)
        files.push({
          relPath,
          size: info.size,
          mode: info.mode & 0o777,
          mtimeMs: Math.round(info.mtimeMs),
          dataBase64: bytes.toString('base64'),
        })
      } else {
        files.push({
          relPath,
          size: info.size,
          mtimeMs: Math.round(info.mtimeMs),
        })
      }
    }
  }

  return { files, totalBytes, latestMtimeMs }
}
