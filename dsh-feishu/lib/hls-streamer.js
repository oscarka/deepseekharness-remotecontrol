import { execFile, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const HLS_SEG_SECONDS = 4
export const DEFAULT_HLS_CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours idle TTL
export const DEFAULT_HLS_CACHE_MAX_BYTES = 512 * 1024 * 1024 // 512 MiB cap
export const DEFAULT_HLS_CACHE_MAX_ENTRIES = 24
const HLS_ENCODER_IDLE_STOP_MS = 25_000 // Stop background ffmpeg 25s after user stops watching
const HLS_SWEEP_INTERVAL_MS = 10 * 60 * 1000 // Sweep stale cache directories every 10 minutes

let defaultFfmpegChecked = false
let defaultFfmpegAvailable = false
const customExecFfmpegCache = new WeakMap()

const hlsSessions = new Map() // sessionKey -> HlsSessionState
const durationCache = new Map() // `${realFile}:${size}:${mtime}` -> number
const sweepSchedulers = new Set() // dshHome roots with active background sweep timer
let pruneInFlight = false

export async function isFfmpegAvailable({ execImpl = execFileAsync } = {}) {
  if (execImpl === execFileAsync) {
    if (defaultFfmpegChecked) return defaultFfmpegAvailable
    try {
      await execFileAsync('ffmpeg', ['-version'], { timeout: 4_000 })
      defaultFfmpegAvailable = true
    } catch {
      defaultFfmpegAvailable = false
    }
    defaultFfmpegChecked = true
    return defaultFfmpegAvailable
  }
  if (customExecFfmpegCache.has(execImpl)) {
    return customExecFfmpegCache.get(execImpl)
  }
  try {
    await execImpl('ffmpeg', ['-version'], { timeout: 4_000 })
    customExecFfmpegCache.set(execImpl, true)
    return true
  } catch {
    customExecFfmpegCache.set(execImpl, false)
    return false
  }
}

export async function probeVideoDurationSec(
  realFile,
  info,
  { hintDurationSec = 0, execImpl = execFileAsync } = {},
) {
  if (Number.isFinite(hintDurationSec) && hintDurationSec > 0.1) {
    return hintDurationSec
  }
  const cacheKey = `${realFile}:${info.size}:${Math.round(info.mtimeMs)}`
  const cached = durationCache.get(cacheKey)
  if (cached && cached > 0.1) return cached

  let resolvedSec = 0
  try {
    const { stdout } = await execImpl(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', realFile],
      { timeout: 6_000 },
    )
    const parsed = Number.parseFloat(String(stdout || '').trim())
    if (Number.isFinite(parsed) && parsed > 0.1) {
      resolvedSec = parsed
    }
  } catch {}

  if (resolvedSec <= 0.1) {
    try {
      await execImpl('ffmpeg', ['-hide_banner', '-i', realFile], { timeout: 5_000 })
    } catch (err) {
      const stderr = String(err?.stderr || err?.message || '')
      const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr)
      if (m) {
        resolvedSec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number.parseFloat(m[3])
      }
    }
  }

  if (resolvedSec > 0.1) {
    durationCache.set(cacheKey, resolvedSec)
    while (durationCache.size > 200) {
      const oldest = durationCache.keys().next().value
      durationCache.delete(oldest)
    }
    return resolvedSec
  }
  // Safe fallback estimate (~2 Mbps) if metadata is missing
  return Math.max(4, Math.min(3600, info.size / (256 * 1024)))
}

export function resolveHlsCacheDir(dshHome = '') {
  return join(resolve(dshHome || '/tmp'), 'cache', 'hls')
}

async function computeDirBytes(dirPath) {
  let total = 0
  try {
    const items = await readdir(dirPath, { withFileTypes: true })
    for (const it of items) {
      if (!it.isFile()) continue
      try {
        const st = await stat(join(dirPath, it.name))
        total += st.size
      } catch {}
    }
  } catch {}
  return total
}

export async function pruneHlsCacheDir(
  dshHome = '',
  {
    ttlMs = DEFAULT_HLS_CACHE_TTL_MS,
    maxBytes = DEFAULT_HLS_CACHE_MAX_BYTES,
    maxEntries = DEFAULT_HLS_CACHE_MAX_ENTRIES,
    now = Date.now(),
  } = {},
) {
  if (pruneInFlight) return { removedDirs: 0, freedBytes: 0 }
  pruneInFlight = true
  let removedDirs = 0
  let freedBytes = 0
  try {
    const hlsRoot = resolveHlsCacheDir(dshHome)
    const thumbsRoot = join(resolve(dshHome || '/tmp'), 'cache', 'thumbs')

    // 1. Clean up any abandoned .tmp-*.mp4 files in cache/thumbs (> 10 min old)
    try {
      const thumbEntries = await readdir(thumbsRoot, { withFileTypes: true })
      for (const te of thumbEntries) {
        if (!te.isFile() || !/\.tmp-[0-9a-f]+\.mp4$/i.test(te.name)) continue
        const fullTmp = join(thumbsRoot, te.name)
        try {
          const st = await stat(fullTmp)
          if (now - st.mtimeMs > 10 * 60 * 1000) {
            await rm(fullTmp, { force: true })
          }
        } catch {}
      }
    } catch {}

    // 2. Sweep cache/hls directories by idle TTL, count cap, and byte budget
    let entries = []
    try {
      entries = await readdir(hlsRoot, { withFileTypes: true })
    } catch {
      return { removedDirs: 0, freedBytes: 0 }
    }

    const dirs = []
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const fullDir = join(hlsRoot, ent.name)
      const memSession = hlsSessions.get(ent.name)
      if (memSession?.proc) {
        // Never delete a directory while ffmpeg is actively writing into it
        continue
      }
      try {
        const st = await stat(fullDir)
        const lastTouch = Math.max(st.mtimeMs, memSession?.lastAccessAt || 0)
        const bytes = await computeDirBytes(fullDir)
        dirs.push({ name: ent.name, fullDir, lastTouch, bytes })
      } catch {}
    }

    // Sort newest first so tail entries are evicted first
    dirs.sort((a, b) => b.lastTouch - a.lastTouch)

    let keptCount = 0
    let keptBytes = 0
    for (const d of dirs) {
      const expired = ttlMs >= 0 && now - d.lastTouch > ttlMs
      const overCount = keptCount >= maxEntries
      const overBytes = keptBytes + d.bytes > maxBytes && keptCount >= 1
      if (expired || overCount || overBytes) {
        await rm(d.fullDir, { recursive: true, force: true }).catch(() => {})
        hlsSessions.delete(d.name)
        removedDirs += 1
        freedBytes += d.bytes
      } else {
        keptCount += 1
        keptBytes += d.bytes
      }
    }
    return { removedDirs, freedBytes }
  } finally {
    pruneInFlight = false
  }
}

export function ensureHlsCleanupScheduler(dshHome = '') {
  const key = resolve(dshHome || '/tmp')
  if (sweepSchedulers.has(key)) return
  sweepSchedulers.add(key)
  const timer = setInterval(() => {
    void pruneHlsCacheDir(dshHome).catch(() => {})
  }, HLS_SWEEP_INTERVAL_MS)
  timer.unref?.()
}

export function buildVodM3u8Content(durationSec, segSeconds = HLS_SEG_SECONDS) {
  const safeDur = Math.max(0.5, Number(durationSec) || segSeconds)
  const segCount = Math.max(1, Math.ceil(safeDur / segSeconds))
  const targetDur = Math.max(1, Math.ceil(segSeconds))
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-PLAYLIST-TYPE:VOD',
    '#EXT-X-INDEPENDENT-SEGMENTS',
    `#EXT-X-TARGETDURATION:${targetDur}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
  ]
  for (let i = 0; i < segCount; i += 1) {
    const start = i * segSeconds
    const len = Math.max(0.1, Math.min(segSeconds, safeDur - start))
    const segName = `seg_${String(i).padStart(5, '0')}.ts`
    lines.push(`#EXTINF:${len.toFixed(6)},`)
    lines.push(segName)
  }
  lines.push('#EXT-X-ENDLIST')
  return { m3u8: lines.join('\n') + '\n', segCount }
}

function shouldUseLosslessHlsCopy(info, videoProbe, durationSec, raw = false) {
  const isAvc = videoProbe?.codec === 'avc1' || videoProbe?.codec === 'avc3'
  if (raw && isAvc && videoProbe?.universalDirectPlay) {
    return true
  }
  if (!videoProbe?.universalDirectPlay || !isAvc) return false
  if (!Number.isFinite(durationSec) || durationSec <= 0) return false
  const bps = (info.size * 8) / durationSec
  // Copy without re-encoding when original is already <= 2.4 Mbps (~600 KB per 2s segment) and <= 36 MiB
  return bps <= 2_400_000 && info.size <= 36 * 1024 * 1024
}

function segFileName(segIdx) {
  return `seg_${String(segIdx).padStart(5, '0')}.ts`
}

function stopSessionEncoder(session) {
  if (!session) return
  if (session.idleTimer) {
    clearTimeout(session.idleTimer)
    session.idleTimer = null
  }
  if (session.proc) {
    const p = session.proc
    session.proc = null
    try {
      p.kill('SIGTERM')
    } catch {}
  }
}

function bumpSessionActivity(session) {
  const now = Date.now()
  session.lastAccessAt = now
  if (session.dirPath) {
    const nowDate = new Date(now)
    void utimes(session.dirPath, nowDate, nowDate).catch(() => {})
  }
  if (session.idleTimer) {
    clearTimeout(session.idleTimer)
  }
  if (session.proc) {
    session.idleTimer = setTimeout(() => {
      stopSessionEncoder(session)
    }, HLS_ENCODER_IDLE_STOP_MS)
    session.idleTimer.unref?.()
  }
}

function buildFfmpegHlsArgs({ realFile, dirPath, mode, startSeg = 0, encoderKind = 'libx264' }) {
  const startSec = startSeg * HLS_SEG_SECONDS
  const segPattern = join(dirPath, 'seg_%05d.ts')
  const liveListPath = join(dirPath, 'live.m3u8')

  if (mode === 'copy') {
    return [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...(startSec > 0 ? ['-ss', String(startSec)] : []),
      '-i',
      realFile,
      ...(startSec > 0 ? ['-output_ts_offset', String(startSec)] : []),
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'copy',
      '-bsf:v',
      'h264_mp4toannexb',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ac',
      '2',
      '-f',
      'hls',
      '-hls_time',
      String(HLS_SEG_SECONDS),
      '-hls_list_size',
      '0',
      ...(startSeg > 0 ? ['-start_number', String(startSeg)] : []),
      '-hls_flags',
      'temp_file+independent_segments',
      '-hls_segment_filename',
      segPattern,
      liveListPath,
    ]
  }

  const vf = "scale='min(1280,trunc(iw/2)*2)':-2,format=yuv420p"
  const videoCodecArgs =
    encoderKind === 'videotoolbox'
      ? [
          '-vf',
          vf,
          '-fpsmax',
          '30',
          '-c:v',
          'h264_videotoolbox',
          '-profile:v',
          'main',
          '-b:v',
          '850k',
          '-maxrate',
          '1150k',
          '-bufsize',
          '2300k',
          '-allow_sw',
          '1',
          '-force_key_frames',
          `expr:gte(t,n_forced*${HLS_SEG_SECONDS})`,
        ]
      : [
          '-vf',
          vf,
          '-fpsmax',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-profile:v',
          'main',
          '-pix_fmt',
          'yuv420p',
          '-crf',
          '27',
          '-maxrate',
          '1000k',
          '-bufsize',
          '2000k',
          '-sc_threshold',
          '0',
          '-force_key_frames',
          `expr:gte(t,n_forced*${HLS_SEG_SECONDS})`,
        ]

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    ...(startSec > 0 ? ['-ss', String(startSec)] : []),
    '-i',
    realFile,
    ...(startSec > 0 ? ['-output_ts_offset', String(startSec)] : []),
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    ...videoCodecArgs,
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-ac',
    '2',
    '-f',
    'hls',
    '-hls_time',
    String(HLS_SEG_SECONDS),
    '-hls_list_size',
    '0',
    ...(startSeg > 0 ? ['-start_number', String(startSeg)] : []),
    '-hls_flags',
    'temp_file+independent_segments',
    '-hls_segment_filename',
    segPattern,
    liveListPath,
  ]
}

async function getHighestGeneratedSeg(dirPath, fromSeg = 0) {
  try {
    const names = await readdir(dirPath)
    let best = -1
    for (const n of names) {
      const m = /^seg_(\d{5})\.ts$/.exec(n)
      if (!m) continue
      const idx = Number.parseInt(m[1], 10)
      if (idx >= fromSeg && idx > best) best = idx
    }
    return best
  } catch {
    return -1
  }
}

function startSessionEncoder(session, startSeg = 0, { spawnImpl = spawn, platform = process.platform } = {}) {
  stopSessionEncoder(session)
  const encoderKind = session.preferVideotoolbox && platform === 'darwin' ? 'videotoolbox' : 'libx264'
  const args = buildFfmpegHlsArgs({
    realFile: session.realFile,
    dirPath: session.dirPath,
    mode: session.mode,
    startSeg,
    encoderKind,
  })
  const proc = spawnImpl('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  session.proc = proc
  session.procStartSeg = startSeg
  session.procFailed = false
  let stderrTail = ''
  proc.stderr?.on?.('data', chunk => {
    stderrTail = (stderrTail + chunk.toString('utf8')).slice(-600)
  })
  proc.on?.('exit', code => {
    if (session.proc === proc) {
      session.proc = null
      if (code && code !== 0) {
        session.procFailed = true
        session.lastError = stderrTail.trim() || `ffmpeg exited ${code}`
        if (encoderKind === 'libx264' && platform === 'darwin' && !session.preferVideotoolbox) {
          session.preferVideotoolbox = true
        }
      }
    }
  })
  proc.on?.('error', err => {
    if (session.proc === proc) {
      session.proc = null
      session.procFailed = true
      session.lastError = err?.message || String(err)
    }
  })
  bumpSessionActivity(session)
}

async function ensureSegmentFileOnDisk(
  session,
  segIdx,
  { timeoutMs = 15_000, spawnImpl = spawn, platform = process.platform } = {},
) {
  const clampedIdx = Math.max(0, Math.min(segIdx, session.segCount - 1))
  const targetPath = join(session.dirPath, segFileName(clampedIdx))

  const checkExisting = async () => {
    try {
      const st = await stat(targetPath)
      if (st.isFile() && st.size > 0) return st
    } catch {}
    return null
  }

  const immediate = await checkExisting()
  if (immediate) {
    bumpSessionActivity(session)
    return { ok: true, filePath: targetPath, size: immediate.size }
  }

  // Decide whether an existing running ffmpeg will reach `clampedIdx` within ~1-2s or if we must spawn/seek
  let needSpawn = !session.proc
  if (session.proc && session.mode !== 'copy') {
    if (clampedIdx < session.procStartSeg) {
      needSpawn = true
    } else {
      const highest = await getHighestGeneratedSeg(session.dirPath, session.procStartSeg)
      const currentPos = highest >= session.procStartSeg ? highest : session.procStartSeg
      if (clampedIdx > currentPos + 6) {
        needSpawn = true
      }
    }
  }

  if (needSpawn) {
    startSessionEncoder(session, session.mode === 'copy' ? 0 : clampedIdx, { spawnImpl, platform })
  } else {
    bumpSessionActivity(session)
  }

  const deadline = Date.now() + timeoutMs
  let retriedFallbackEncoder = false
  while (Date.now() < deadline) {
    const found = await checkExisting()
    if (found) {
      return { ok: true, filePath: targetPath, size: found.size }
    }
    if (!session.proc && session.procFailed && !retriedFallbackEncoder && platform === 'darwin') {
      retriedFallbackEncoder = true
      session.preferVideotoolbox = true
      startSessionEncoder(session, session.mode === 'copy' ? 0 : clampedIdx, { spawnImpl, platform })
    } else if (!session.proc && session.procFailed) {
      // Check one final time in case segment flushed right on exit
      const lastCheck = await checkExisting()
      if (lastCheck) return { ok: true, filePath: targetPath, size: lastCheck.size }
      return { ok: false, status: 502, error: session.lastError || 'HLS segment encode failed' }
    }
    await new Promise(r => setTimeout(r, 45))
  }

  return { ok: false, status: 504, error: 'HLS segment generation timed out' }
}

async function getOrCreateHlsSession(
  realFile,
  info,
  { videoProbe = null, raw = false, dshHome = '', execImpl = execFileAsync } = {},
) {
  ensureHlsCleanupScheduler(dshHome)
  const durationSec = await probeVideoDurationSec(realFile, info, {
    hintDurationSec: Number(videoProbe?.durationSec) || 0,
    execImpl,
  })
  const useCopy = shouldUseLosslessHlsCopy(info, videoProbe, durationSec, raw)
  const mode = useCopy ? 'copy' : 'pv720'
  const hash = createHash('sha1')
    .update(`${realFile}:${info.size}:${Math.round(info.mtimeMs)}:${mode}:hlsv2-${HLS_SEG_SECONDS}s`)
    .digest('hex')
    .slice(0, 24)

  const hlsRoot = resolveHlsCacheDir(dshHome)
  const dirPath = join(hlsRoot, hash)
  await mkdir(dirPath, { recursive: true })

  let session = hlsSessions.get(hash)
  if (!session) {
    const { m3u8, segCount } = buildVodM3u8Content(durationSec, HLS_SEG_SECONDS)
    session = {
      hash,
      realFile,
      dirPath,
      mode,
      durationSec,
      segCount,
      m3u8,
      proc: null,
      procStartSeg: 0,
      procFailed: false,
      preferVideotoolbox: false,
      lastError: '',
      idleTimer: null,
      lastAccessAt: Date.now(),
    }
    hlsSessions.set(hash, session)
    await writeFile(join(dirPath, 'vod.m3u8'), m3u8, 'utf8').catch(() => {})
    void pruneHlsCacheDir(dshHome).catch(() => {})
  } else {
    session.lastAccessAt = Date.now()
  }
  return session
}

export async function prepareWorkspaceHlsPlaylist(
  resolvedFile,
  {
    videoProbe = null,
    raw = false,
    dshHome = '',
    execImpl = execFileAsync,
    spawnImpl = spawn,
    platform = process.platform,
    prewarmFirstSegmentMs = 950,
  } = {},
) {
  const hasFfmpeg = await isFfmpegAvailable({ execImpl })
  if (!hasFfmpeg) {
    return { ok: false, status: 404, error: 'ffmpeg not available on host' }
  }
  const { realFile, info } = resolvedFile
  const session = await getOrCreateHlsSession(realFile, info, {
    videoProbe,
    raw,
    dshHome,
    execImpl,
  })

  // Pre-warm segment 0 (~150-350ms) so the player's very first .ts fetch hits warm disk in 0ms!
  if (prewarmFirstSegmentMs > 0) {
    await ensureSegmentFileOnDisk(session, 0, {
      timeoutMs: prewarmFirstSegmentMs,
      spawnImpl,
      platform,
    }).catch(() => {})
  }

  return {
    ok: true,
    status: 200,
    mime: 'application/vnd.apple.mpegurl; charset=utf-8',
    mode: session.mode,
    durationSec: session.durationSec,
    segCount: session.segCount,
    m3u8: session.m3u8,
  }
}

export async function prepareWorkspaceHlsSegment(
  resolvedFile,
  segmentName,
  {
    videoProbe = null,
    raw = false,
    dshHome = '',
    execImpl = execFileAsync,
    spawnImpl = spawn,
    platform = process.platform,
  } = {},
) {
  const m = /^seg_(\d{5})\.ts$/.exec(String(segmentName || '').trim())
  if (!m) {
    return { ok: false, status: 400, error: 'Invalid HLS segment name' }
  }
  const segIdx = Number.parseInt(m[1], 10)
  const hasFfmpeg = await isFfmpegAvailable({ execImpl })
  if (!hasFfmpeg) {
    return { ok: false, status: 404, error: 'ffmpeg not available on host' }
  }

  const { realFile, info } = resolvedFile
  const session = await getOrCreateHlsSession(realFile, info, {
    videoProbe,
    raw,
    dshHome,
    execImpl,
  })
  if (segIdx < 0 || segIdx >= session.segCount) {
    return { ok: false, status: 404, error: 'HLS segment out of range' }
  }

  const ready = await ensureSegmentFileOnDisk(session, segIdx, {
    timeoutMs: 18_000,
    spawnImpl,
    platform,
  })
  if (!ready.ok) return ready

  return {
    ok: true,
    status: 200,
    mime: 'video/mp2t',
    variant: `hls-${session.mode}`,
    byteLength: ready.size,
    createBodyStream: () => createReadStream(ready.filePath),
  }
}

export function stopAllHlsEncoders() {
  for (const s of hlsSessions.values()) {
    stopSessionEncoder(s)
  }
  hlsSessions.clear()
}
