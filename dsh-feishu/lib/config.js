import { readFile, stat } from 'node:fs/promises'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'

const DEFAULTS = {
  enabled: true,
  appId: '',
  tenantKey: '',
  appSecretFile: '~/.dsh/feishu.env',
  allowGroup: false,
  allowedOpenIds: [],
  approvalTtlSeconds: 120,
  maxReplyChars: 4000,
  auditFile: '~/.dsh/feishu-audit.jsonl',
  controlChatFile: '~/.dsh/feishu-control-chat',
  remoteStateFile: '~/.dsh/feishu-remote.json',
  remoteIdleMs: 2 * 60 * 60 * 1000,
  dedupeLimit: 2000,
  debugEvents: false,
  notify: true,
  notifyApprovals: true,
  notifyIntervalMs: 1000,
  notifyDigestMs: 5000,
  hostId: '',
  hostName: '',
  hubUrl: '',
  hubToken: '',
  hubPollMs: 2000,
  localWebPort: 0,
  dshHome: '~/.dsh',
}

export function expandHome(value) {
  if (typeof value !== 'string' || value.length === 0) return value
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return join(homedir(), value.slice(2))
  return value
}

export function resolveConfig(raw = {}) {
  const config = { ...DEFAULTS, ...(raw ?? {}) }
  config.appId = typeof config.appId === 'string' ? config.appId.trim() : ''
  config.tenantKey = typeof config.tenantKey === 'string' ? config.tenantKey.trim() : ''
  config.allowedOpenIds = Array.isArray(config.allowedOpenIds)
    ? config.allowedOpenIds.map(value => String(value).trim()).filter(Boolean)
    : []
  config.allowGroup = config.allowGroup === true
  config.approvalTtlSeconds = clampInt(config.approvalTtlSeconds, 30, 900, 120)
  config.maxReplyChars = clampInt(config.maxReplyChars, 500, 12000, 4000)
  config.dedupeLimit = clampInt(config.dedupeLimit, 100, 10000, 2000)
  config.debugEvents = config.debugEvents === true || process.env.FEISHU_DEBUG_EVENTS === 'true'
  config.notify = config.notify !== false && process.env.FEISHU_NOTIFY !== 'false'
  config.notifyApprovals = config.notifyApprovals !== false && process.env.FEISHU_NOTIFY_APPROVALS !== 'false'
  config.notifyIntervalMs = clampInt(config.notifyIntervalMs, 500, 10000, 1000)
  config.notifyDigestMs = clampInt(config.notifyDigestMs, 1000, 60_000, 5000)
  config.appSecretFile = expandHome(process.env.FEISHU_APP_SECRET_FILE || config.appSecretFile)
  config.auditFile = expandHome(process.env.FEISHU_AUDIT_FILE || config.auditFile)
  config.controlChatFile = expandHome(process.env.FEISHU_CONTROL_CHAT_FILE || config.controlChatFile)
  config.remoteStateFile = expandHome(process.env.FEISHU_REMOTE_STATE_FILE || config.remoteStateFile)
  config.remoteIdleMs = clampInt(config.remoteIdleMs, 5 * 60_000, 24 * 60 * 60_000, 2 * 60 * 60_000)

  const defaultHost = sanitizeHostId(hostname() || 'local-host')
  config.hostName = String(process.env.FEISHU_HOST_NAME || config.hostName || hostname() || 'Local-Host').trim()
  config.hostId = String(process.env.FEISHU_HOST_ID || config.hostId || sanitizeHostId(config.hostName) || defaultHost).trim()
  config.hubUrl = String(process.env.FEISHU_HUB_URL || config.hubUrl || '').trim().replace(/\/+$/, '')
  config.hubToken = String(process.env.FEISHU_HUB_TOKEN || config.hubToken || '').trim()
  config.hubPollMs = clampInt(config.hubPollMs, 300, 30_000, 2000)
  config.localWebPort = clampInt(process.env.FEISHU_WEB_PORT || config.localWebPort, 0, 65535, 0)
  config.dshHome = expandHome(process.env.FEISHU_DSH_HOME || process.env.DSH_HOME || config.dshHome || '~/.dsh')
  return config
}

function sanitizeHostId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'host'
}

function clampInt(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/** Parse KEY=VALUE files; quotes, `export`, comments, and blank lines are accepted. */
export function parseEnvFile(text) {
  const result = {}
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    } else {
      const hash = value.indexOf(' #')
      if (hash >= 0) value = value.slice(0, hash).trim()
    }
    result[match[1]] = value
  }
  return result
}

/**
 * Resolve App ID/Secret without ever putting the secret in the composed profile.
 * Precedence: process env > private env file. The file must be 0600 on POSIX.
 */
export async function loadSettings(config, env = process.env) {
  const fileValues = await readSecretEnvFile(config.appSecretFile)
  const appId = String(env.FEISHU_APP_ID || config.appId || fileValues.FEISHU_APP_ID || '').trim()
  const appSecret = String(env.FEISHU_APP_SECRET || fileValues.FEISHU_APP_SECRET || '').trim()
  const fileAllowed = String(fileValues.FEISHU_ALLOWED_OPEN_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const envAllowed = String(env.FEISHU_ALLOWED_OPEN_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const allowedOpenIds = config.allowedOpenIds.length > 0
    ? config.allowedOpenIds
    : envAllowed.length > 0
      ? envAllowed
      : fileAllowed
  const tenantKey = String(env.FEISHU_TENANT_KEY || config.tenantKey || fileValues.FEISHU_TENANT_KEY || '').trim()
  const allowGroup = config.allowGroup || String(env.FEISHU_ALLOW_GROUP || fileValues.FEISHU_ALLOW_GROUP || '').toLowerCase() === 'true'
  const hostName = String(env.FEISHU_HOST_NAME || fileValues.FEISHU_HOST_NAME || config.hostName || hostname() || 'Local-Host').trim()
  const hostId = String(env.FEISHU_HOST_ID || fileValues.FEISHU_HOST_ID || config.hostId || sanitizeHostId(hostName)).trim()
  const hubUrl = String(env.FEISHU_HUB_URL || config.hubUrl || fileValues.FEISHU_HUB_URL || '').trim().replace(/\/+$/, '')
  const hubToken = String(env.FEISHU_HUB_TOKEN || config.hubToken || fileValues.FEISHU_HUB_TOKEN || '').trim()
  const localWebPort = clampInt(env.FEISHU_WEB_PORT || config.localWebPort || fileValues.FEISHU_WEB_PORT, 0, 65535, 0)
  const dshHome = expandHome(env.FEISHU_DSH_HOME || env.DSH_HOME || fileValues.FEISHU_DSH_HOME || config.dshHome || '~/.dsh')

  if (!appId && !hubUrl) throw new Error('Feishu App ID is missing: set it in the profile config, FEISHU_APP_ID, or the secret file')
  if (appId && !appSecret) throw new Error('Feishu App Secret is missing: set FEISHU_APP_SECRET or add it to the secret file')
  return {
    appId,
    appSecret,
    allowedOpenIds,
    allowGroup,
    tenantKey,
    hostId,
    hostName,
    hubUrl,
    hubToken,
    localWebPort,
    dshHome,
  }
}

async function readSecretEnvFile(path) {
  if (!path) return {}
  let info
  try {
    info = await stat(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw error
  }
  if (!info.isFile()) throw new Error(`Feishu secret path is not a file: ${path}`)
  if (process.platform !== 'win32' && (info.mode & 0o077) !== 0) {
    throw new Error(`Feishu secret file must not be readable by group/others (chmod 600): ${path}`)
  }
  return parseEnvFile(await readFile(path, 'utf8'))
}
