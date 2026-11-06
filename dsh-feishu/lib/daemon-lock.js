import { randomBytes } from 'node:crypto'
import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Check whether a process with the given PID is currently alive.
 * Uses signal 0 (`process.kill(pid, 0)`):
 * - Returns true if the process exists (including EPERM when owned by another uid).
 * - Returns false if ESRCH (no such process) or invalid PID.
 */
export function isPidAlive(pid) {
  const num = Number(pid)
  if (!Number.isInteger(num) || num <= 0) return false
  try {
    process.kill(num, 0)
    return true
  } catch (err) {
    if (err && err.code === 'EPERM') return true
    return false
  }
}

function sleepMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function readLockFile(lockPath) {
  try {
    const raw = readFileSync(lockPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // ignore missing or corrupt lock file
  }
  return null
}

function tryAtomicWriteLock(lockPath, payload) {
  mkdirSync(dirname(lockPath), { recursive: true })
  const fd = openSync(lockPath, 'wx', 0o600)
  try {
    writeFileSync(fd, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  } finally {
    closeSync(fd)
  }
}

/**
 * Acquire a single-instance daemon lockfile (`~/.dsh/daemon.lock`) using atomic `wx` file creation.
 * Avoids `flock` native addon dependencies while guaranteeing single-daemon execution across restarts.
 */
export async function acquireDaemonLock({
  dshHome,
  lockPath = dshHome ? join(dshHome, 'daemon.lock') : '',
  hostId = '',
  replace = false,
  bootId = `boot-${randomBytes(6).toString('hex')}`,
  startedAt = Date.now(),
  pid = process.pid,
  script = process.argv[1] || 'daemon.mjs',
  waitMs = 3000,
  killImpl = process.kill.bind(process),
  isAliveImpl = isPidAlive,
} = {}) {
  if (!lockPath) {
    throw new Error('lockPath or dshHome is required for acquireDaemonLock')
  }

  const payload = {
    pid,
    bootId,
    startedAt,
    hostId,
    script,
  }

  const makeRelease = () => {
    let released = false
    return () => {
      if (released) return false
      released = true
      try {
        const current = readLockFile(lockPath)
        if (!current || current.bootId === bootId || current.pid === pid) {
          unlinkSync(lockPath)
          return true
        }
      } catch {
        // ignore already deleted
      }
      return false
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      tryAtomicWriteLock(lockPath, payload)
      return {
        acquired: true,
        lockPath,
        bootId,
        startedAt,
        pid,
        replacedPid: null,
        release: makeRelease(),
      }
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err
    }

    const existing = readLockFile(lockPath)
    const existingPid = Number(existing?.pid)

    // Case 1: Corrupt lockfile, same PID, or stale dead process -> remove and retry
    if (!existing || !existingPid || existingPid === pid || !isAliveImpl(existingPid)) {
      try {
        unlinkSync(lockPath)
      } catch {
        // ignore race
      }
      continue
    }

    // Case 2: Another live daemon is holding the lock and `--replace` was not requested
    if (!replace) {
      return {
        acquired: false,
        reason: 'ALREADY_RUNNING',
        lockPath,
        existing,
        release: () => false,
      }
    }

    // Case 3: `--replace` requested -> send SIGTERM to old daemon and wait for it to exit
    try {
      killImpl(existingPid, 'SIGTERM')
    } catch {
      // ignore if exited right before kill
    }

    const deadline = Date.now() + Math.max(200, waitMs)
    while (Date.now() < deadline && isAliveImpl(existingPid)) {
      await sleepMs(60)
    }

    if (isAliveImpl(existingPid)) {
      try {
        killImpl(existingPid, 'SIGKILL')
      } catch {}
      await sleepMs(60)
    }

    try {
      const checkAgain = readLockFile(lockPath)
      if (!checkAgain || Number(checkAgain.pid) === existingPid) {
        unlinkSync(lockPath)
      }
    } catch {
      // ignore
    }

    try {
      tryAtomicWriteLock(lockPath, payload)
      return {
        acquired: true,
        lockPath,
        bootId,
        startedAt,
        pid,
        replacedPid: existingPid,
        release: makeRelease(),
      }
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err
    }
  }

  return {
    acquired: false,
    reason: 'LOCK_CONTENTION',
    lockPath,
    existing: readLockFile(lockPath),
    release: () => false,
  }
}

