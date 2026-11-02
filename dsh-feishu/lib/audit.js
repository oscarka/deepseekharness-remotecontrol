import { chmod, mkdir, appendFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { redactText } from './redact.js'

/** Append-only JSONL audit log; a write failure is logged, never fatal to control flow. */
export class AuditLog {
  constructor(path, logger) {
    this.path = path
    this.logger = logger
    this.queue = Promise.resolve()
  }

  write(action, fields = {}) {
    const record = {
      ts: new Date().toISOString(),
      action,
      ...sanitize(fields),
    }
    this.queue = this.queue
      .then(() => this.append(record))
      .catch(error => this.logger?.warn?.(`dsh-feishu: audit write failed: ${error?.message ?? error}`))
    return this.queue
  }

  async append(record) {
    if (!this.path) return
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 })
    await appendFile(this.path, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 })
    await chmod(this.path, 0o600)
  }
}

function sanitize(fields) {
  const result = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    if (typeof value === 'string') {
      result[key] = redactText(value).slice(0, 1000)
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value
    } else {
      result[key] = redactText(JSON.stringify(value)).slice(0, 1000)
    }
  }
  return result
}
