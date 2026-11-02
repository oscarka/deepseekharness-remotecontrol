const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi
const SK_KEY = /\bsk-[A-Za-z0-9_-]{8,}\b/g
const ASSIGNMENT = /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|client[_-]?secret|password|secret)\b(\s*[:=]\s*)(["']?)[^\s"',;]{6,}\3/gi

/** Best-effort redaction for chat output and audit fields. Never a substitute for not sending secrets. */
export function redactText(value) {
  let text = String(value ?? '')
  text = text.replace(PRIVATE_KEY, '[REDACTED PRIVATE KEY]')
  text = text.replace(BEARER, 'Bearer [REDACTED]')
  text = text.replace(SK_KEY, 'sk-[REDACTED]')
  text = text.replace(ASSIGNMENT, (_match, key, separator, quote) => `${key}${separator}${quote}[REDACTED]${quote}`)
  return text
}

export function truncateText(value, maxChars) {
  const text = String(value ?? '')
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(0, maxChars - 20))}\n…（已截断）`
}

export function cleanForChat(value, maxChars) {
  return truncateText(redactText(value), maxChars)
}

/** Keep the first line of an error and avoid leaking headers/stacks into Feishu. */
export function safeError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return redactText(message.split('\n')[0]).slice(0, 500)
}
