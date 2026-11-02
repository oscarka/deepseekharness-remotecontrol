const KNOWN = new Set([
  'help',
  'status',
  'sessions',
  'use',
  'stop',
  'approve',
  'deny',
  'whoami',
  'new',
  'ping',
  'hosts',
  'host',
  'web',
])

const BARE_EXACT = new Set([
  'help',
  'status',
  'sessions',
  'stop',
  'whoami',
  'new',
  'ping',
  'hosts',
  'host',
  'web',
])
const BARE_WITH_ARG = /^(use|approve|deny|host)(?:\s+([\s\S]*))?$/i

export function parseCommand(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed.startsWith('/') && !trimmed.startsWith('!')) {
    const bare = BARE_EXACT.has(trimmed.toLowerCase())
      ? { name: trimmed.toLowerCase(), args: '' }
      : BARE_WITH_ARG.exec(trimmed)
    if (bare) {
      const name = Array.isArray(bare) ? bare[1].toLowerCase() : bare.name
      const args = Array.isArray(bare) ? (bare[2] ?? '').trim() : ''
      return { kind: 'command', name, args }
    }
    return { kind: 'prompt', text: trimmed }
  }
  const match = /^[/!]\s*([A-Za-z][A-Za-z0-9_-]*)(?:\s+([\s\S]*))?$/.exec(trimmed)
  if (!match) return { kind: 'prompt', text: trimmed }
  const name = match[1].toLowerCase()
  if (!KNOWN.has(name)) return { kind: 'unknown', name, raw: trimmed }
  return { kind: 'command', name, args: (match[2] ?? '').trim() }
}

export function splitFirstArg(args) {
  const trimmed = String(args ?? '').trim()
  if (trimmed.length === 0) return ''
  return trimmed.split(/\s+/)[0]
}
