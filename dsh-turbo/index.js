import { execFile } from 'node:child_process'
import { accessSync, constants, watch } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_NATIVE_BIN = join(__dirname, 'bin', 'dsh-turbo-native')

/**
 * Check if the pre-compiled Rust native accelerator binary is available and executable.
 */
export function getTurboNativeBinaryPath(customBinPath = DEFAULT_NATIVE_BIN) {
  if (process.platform !== 'darwin') return ''
  try {
    accessSync(customBinPath, constants.X_OK)
    return customBinPath
  } catch {
    return ''
  }
}

/**
 * Check or prompt for macOS Accessibility permission (`AXIsProcessTrusted`) using the Rust native binary.
 */
export async function checkAccessibilityPermission({
  prompt = false,
  execImpl = execFileAsync,
  nativeBin = getTurboNativeBinaryPath(),
} = {}) {
  if (process.platform !== 'darwin') {
    return { ok: true, trusted: true, engine: 'non-macos' }
  }
  if (nativeBin) {
    try {
      const subcmd = prompt ? 'prompt-ax' : 'check-ax'
      const { stdout } = await execImpl(nativeBin, [subcmd], { timeout: 3000 })
      const parsed = JSON.parse(String(stdout || '{}').trim())
      if (typeof parsed.trusted === 'boolean') {
        return {
          ok: true,
          trusted: parsed.trusted,
          prompted: Boolean(parsed.prompted),
          engine: parsed.engine || 'rust-native',
        }
      }
    } catch {
      // fallback below
    }
  }

  // Fallback via osascript System Events check
  try {
    await execImpl(
      'osascript',
      ['-e', 'tell application "System Events" to get name of first process whose frontmost is true'],
      { timeout: 3000 },
    )
    return { ok: true, trusted: true, engine: 'osascript-fallback' }
  } catch {
    if (prompt) {
      try {
        await execImpl(
          'open',
          ['x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'],
          { timeout: 3000 },
        )
      } catch {}
    }
    return { ok: true, trusted: false, prompted: Boolean(prompt), engine: 'osascript-fallback' }
  }
}

/**
 * Inject keystrokes into Antigravity IDE using the Rust CoreGraphics (`CGEventPost`) accelerator (<1ms).
 */
export async function sendNativeKeystroke(
  action,
  { execImpl = execFileAsync, nativeBin = getTurboNativeBinaryPath() } = {},
) {
  if (!nativeBin || process.platform !== 'darwin') {
    return { ok: false, reason: 'NATIVE_BIN_UNAVAILABLE' }
  }
  try {
    const { stdout } = await execImpl(nativeBin, ['send-key', action], { timeout: 3000 })
    const parsed = JSON.parse(String(stdout || '{}').trim())
    return {
      ok: Boolean(parsed.ok),
      engine: 'rust-native',
      action,
    }
  } catch (err) {
    return {
      ok: false,
      engine: 'rust-native',
      error: err?.message || String(err),
    }
  }
}

/**
 * Sub-millisecond directory scan using the Rust native accelerator.
 */
export async function fastScanBrainDirs(
  brainDirs = [],
  { execImpl = execFileAsync, nativeBin = getTurboNativeBinaryPath() } = {},
) {
  const validDirs = (brainDirs || []).filter(Boolean).map(d => resolve(d))
  if (!nativeBin || validDirs.length === 0 || process.platform !== 'darwin') {
    return null
  }
  try {
    const { stdout } = await execImpl(nativeBin, ['fast-scan', ...validDirs], { timeout: 2500 })
    const parsed = JSON.parse(String(stdout || '{}').trim())
    if (parsed?.ok && Array.isArray(parsed.items)) {
      return parsed
    }
  } catch {
    // fallback to Node fs
  }
  return null
}

/**
 * Real-Time Event-Driven Controller (FSEvents File Watcher + Bidirectional Hub SSE Stream).
 * Eliminates the 2-10s polling lag by waking up HubAgent immediately (<150ms) when:
 * 1. Antigravity IDE or DSH writes to `transcript.jsonl` / session logs on disk (`fs-watch`)
 * 2. The mobile Web UI dispatches an approval or prompt command to Cloud Run Hub (`hub-sse`)
 */
export class TurboController {
  constructor({
    hostId = '',
    brainDirs = [],
    dshHome = '',
    hubUrl = '',
    hubToken = '',
    onTriggerSync = () => {},
    onFsRequest = null,
    fetchImpl = globalThis.fetch,
    execImpl = execFileAsync,
    debounceMs = 120,
  } = {}) {
    this.hostId = hostId
    this.brainDirs = brainDirs
    this.dshHome = dshHome
    this.hubUrl = String(hubUrl || '').replace(/\/+$/, '')
    this.hubToken = hubToken
    this.onTriggerSync = onTriggerSync
    this.onFsRequest = onFsRequest
    this.fetch = fetchImpl
    this.execImpl = execImpl
    this.debounceMs = debounceMs

    this.nativeBin = getTurboNativeBinaryPath()
    this.watchers = new Map()
    this.debounceTimer = null
    this.refreshWatchTimer = null
    this.sseAbort = null
    this.sseReconnectTimer = null
    this.sseConnected = false
    this.axTrusted = true
    this.lastAxCheckAt = 0
    this.lastTriggerReason = 'init'
    this.lastTriggerAt = Date.now()
    this.disposed = false
  }

  async start() {
    if (this.disposed) return
    await this.refreshAccessibilityState(false)
    await this.refreshFileWatchers()
    this.refreshWatchTimer = setInterval(() => {
      void this.refreshFileWatchers()
      void this.refreshAccessibilityState(false)
    }, 15_000)
    this.refreshWatchTimer.unref?.()
    this.connectHubSse()
  }

  stop() {
    this.disposed = true
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.refreshWatchTimer) {
      clearInterval(this.refreshWatchTimer)
      this.refreshWatchTimer = null
    }
    if (this.sseReconnectTimer) {
      clearTimeout(this.sseReconnectTimer)
      this.sseReconnectTimer = null
    }
    if (this.sseAbort) {
      try {
        this.sseAbort.abort()
      } catch {}
      this.sseAbort = null
    }
    this.sseConnected = false
    for (const w of this.watchers.values()) {
      try {
        w.close()
      } catch {}
    }
    this.watchers.clear()
  }

  async refreshAccessibilityState(prompt = false) {
    const now = Date.now()
    if (!prompt && now - this.lastAxCheckAt < 10_000) {
      return this.axTrusted
    }
    this.lastAxCheckAt = now
    const res = await checkAccessibilityPermission({
      prompt,
      execImpl: this.execImpl,
      nativeBin: this.nativeBin,
    })
    this.axTrusted = Boolean(res.trusted)
    return this.axTrusted
  }

  triggerSync(reason = 'event') {
    if (this.disposed) return
    this.lastTriggerReason = reason
    this.lastTriggerAt = Date.now()
    if (this.debounceTimer) return
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      if (!this.disposed) {
        this.onTriggerSync(reason)
      }
    }, this.debounceMs)
    this.debounceTimer.unref?.()
  }

  watchDirOnce(dirPath, label = 'dir') {
    if (!dirPath || this.watchers.has(dirPath) || this.disposed) return
    try {
      const watcher = watch(dirPath, { persistent: false }, (_eventType, filename) => {
        if (!filename || filename.endsWith('.lock') || filename.startsWith('.')) return
        this.triggerSync(`fs:${label}`)
      })
      watcher.on('error', () => {
        try {
          watcher.close()
        } catch {}
        this.watchers.delete(dirPath)
      })
      this.watchers.set(dirPath, watcher)
    } catch {
      // directory may not exist yet
    }
  }

  async refreshFileWatchers() {
    if (this.disposed) return
    if (this.dshHome) {
      this.watchDirOnce(join(resolve(this.dshHome), 'sessions'), 'dsh-sessions')
    }
    for (const brainDir of this.brainDirs || []) {
      if (!brainDir) continue
      const resolvedBrain = resolve(brainDir)
      this.watchDirOnce(resolvedBrain, 'agy-brain')
      try {
        const entries = await readdir(resolvedBrain, { withFileTypes: true })
        const subDirsWithMtime = []
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'tempmediaStorage') continue
          const logsDir = join(resolvedBrain, entry.name, '.system_generated', 'logs')
          try {
            const st = await stat(logsDir)
            if (st.isDirectory()) {
              subDirsWithMtime.push({ logsDir, mtimeMs: st.mtimeMs })
            }
          } catch {}
        }
        subDirsWithMtime.sort((a, b) => b.mtimeMs - a.mtimeMs)
        for (const item of subDirsWithMtime.slice(0, 6)) {
          this.watchDirOnce(item.logsDir, `agy-logs:${item.logsDir.slice(-12)}`)
        }
      } catch {}
    }
  }

  connectHubSse() {
    if (this.disposed || !this.hubUrl || typeof this.fetch !== 'function') return
    // Only connect SSE to real HTTP(S) servers (skip unit-test mock fetch adapters that return one-shot JSON)
    if (this.fetch !== globalThis.fetch) return

    if (this.sseAbort) {
      try {
        this.sseAbort.abort()
      } catch {}
    }
    const abortController = new AbortController()
    this.sseAbort = abortController
    const qp = new URLSearchParams({ mode: 'host', hostId: this.hostId || '' })
    if (this.hubToken) qp.set('token', this.hubToken)
    const url = `${this.hubUrl}/api/events?${qp.toString()}`

    ;(async () => {
      try {
        const res = await this.fetch(url, {
          method: 'GET',
          headers: this.hubToken
            ? {
                authorization: `Bearer ${this.hubToken}`,
                'x-hub-token': this.hubToken,
                accept: 'text/event-stream',
              }
            : { accept: 'text/event-stream' },
          signal: abortController.signal,
        })
        if (!res.ok || !res.body) {
          throw new Error(`SSE HTTP ${res.status}`)
        }
        this.sseConnected = true
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (!this.disposed) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop() || ''
          for (const chunk of parts) {
            if (!chunk.includes('data:')) continue
            const lines = chunk.split('\n')
            const eventLine = lines.find(l => l.startsWith('event:'))
            const eventName = eventLine ? eventLine.slice(6).trim() : 'message'
            const dataLine = lines.find(l => l.startsWith('data:'))
            if (!dataLine) continue
            try {
              const payload = JSON.parse(dataLine.slice(5).trim())
              if (eventName === 'fs_req') {
                if (!payload.hostId || payload.hostId === this.hostId) {
                  void this.onFsRequest?.(payload)
                }
                continue
              }
              const myHost = (payload.hosts || []).find(h => h.hostId === this.hostId)
              if (myHost && Number(myHost.pendingCommandsCount) > 0) {
                this.triggerSync('hub-sse-cmd')
              }
            } catch {}
          }
        }
      } catch {
        // Reconnect on disconnect
      } finally {
        this.sseConnected = false
        if (!this.disposed) {
          this.sseReconnectTimer = setTimeout(() => this.connectHubSse(), 3000)
          this.sseReconnectTimer.unref?.()
        }
      }
    })()
  }

  getTelemetry() {
    const hasRust = Boolean(this.nativeBin)
    return {
      enabled: true,
      version: '2.0.0',
      engine: hasRust ? 'rust-native' : 'node-fsevents',
      engineLabel: hasRust ? '🦀 Rust 原生极速引擎 + 实时流' : '⚡ FSEvents 实时事件流',
      accessibilityGranted: this.axTrusted,
      sseConnected: this.sseConnected,
      watcherActive: this.watchers.size > 0,
      watchedDirsCount: this.watchers.size,
      lastTriggerReason: this.lastTriggerReason,
      lastTriggerAt: this.lastTriggerAt,
    }
  }
}

