// Pure-algorithmic, zero-LLM push notification & card formatter shared by
// HubCore (iPhone / PWA Web Push) and FeishuBridge (Feishu interactive cards).

export function stripRedundantProjectPrefixForPush(rawTitle = '', rawProject = '') {
  let title = String(rawTitle || '').trim()
  const project = String(rawProject || '').trim()
  if (!title) return ''
  if (project) {
    const prefix = `${project} / `
    if (title.startsWith(prefix)) {
      title = title.slice(prefix.length).trim() || title
    }
  }
  // Strip raw timestamp workspace prefix such as "2026-11-17-08-40-19 / "
  title = title.replace(
    /^\d{4}[-_]\d{1,2}[-_]\d{1,2}(?:[-_T]\d{1,2}[-_:]\d{2}(?:[-_:]\d{2})?)?\s*\/\s*/,
    '',
  )
  // Strip markdown heading / quote / bullet markers
  title = title.replace(/^[#>*\-\s]+/, '').replace(/\s+/g, ' ').trim()
  return title
}

export function formatCompactProjectForPush(rawProject = '', nowDate = new Date()) {
  const raw = String(rawProject || '').trim()
  if (!raw) return '默认工作区'
  const m = /^(\d{4})[-_](\d{1,2})[-_](\d{1,2})(?:[-_T](\d{1,2})[-_:](\d{2})(?:[-_:](\d{2}))?)?$/.exec(raw)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    if (y >= 2020 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const isSameYear = nowDate.getFullYear() === y
      const isSameDay = isSameYear && nowDate.getMonth() + 1 === mo && nowDate.getDate() === d
      const hasTime = m[4] != null && m[5] != null
      const mmdd = `${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}`
      if (isSameDay && hasTime) return `${Number(m[4])}:${String(m[5]).padStart(2, '0')}`
      const hhmm = hasTime ? `${String(Number(m[4])).padStart(2, '0')}:${String(m[5]).padStart(2, '0')}` : ''
      if (isSameYear) return hasTime ? `${mmdd} ${hhmm}` : mmdd
      return hasTime ? `${y}/${mmdd} ${hhmm}` : `${y}/${mmdd}`
    }
  }
  return raw
}

function normalizeDeviceModelShort(rawModel = '', { compact = false } = {}) {
  const clean = String(rawModel || '').trim()
  if (!clean) return ''
  if (/^macbook[\s-]*air\b/i.test(clean)) return 'Air'
  if (/^macbook[\s-]*pro\b/i.test(clean)) return 'MBP'
  if (/^mac[\s-]*mini\b/i.test(clean)) return compact ? 'Mini' : 'Mac mini'
  if (/^mac[\s-]*studio\b/i.test(clean)) return 'Studio'
  if (/^mac[\s-]*pro\b/i.test(clean)) return compact ? 'Pro' : 'Mac Pro'
  if (/^imac\b/i.test(clean)) return 'iMac'
  return clean
}

export function resolveShortHostLabelForPush(hosts = [], targetHostId = '', fallbackHostName = '') {
  const list = Array.isArray(hosts) ? hosts : []
  // Single computer: omit machine tag completely so the lock-screen title shows 100% session info
  if (list.length <= 1) return ''

  const parsed = list.map(h => {
    const raw = String(h?.hostName || h?.hostId || '')
      .trim()
      .replace(/\.(local|lan)$/i, '')
    let owner = ''
    let device = raw
    const zhSplit = /^(.+?)的\s*(.+)$/.exec(raw)
    const enSplit = !zhSplit ? /^(.+?)(?:'s|’s)\s+(.+)$/i.exec(raw) : null
    if (zhSplit) {
      owner = zhSplit[1].trim()
      device = zhSplit[2].trim()
    } else if (enSplit) {
      owner = enSplit[1].trim()
      device = enSplit[2].trim()
    } else {
      const slugMac =
        /^(.+?)(?:-|de)?(MacBook[- ]?Air|MacBook[- ]?Pro|Mac[- ]?mini|Mac[- ]?Studio|iMac|Mac[- ]?Pro)$/i.exec(
          raw,
        )
      if (slugMac && slugMac[1].trim()) {
        owner = slugMac[1].trim()
        device = slugMac[2].replace(/-/g, ' ').trim()
      }
    }
    let shortBase = ''
    let compactBase = ''
    if (/^(电脑|pc|computer|laptop|host)$/i.test(device) && owner) {
      shortBase = owner
      compactBase = owner
    } else {
      shortBase = normalizeDeviceModelShort(device, { compact: false }) || raw
      compactBase = normalizeDeviceModelShort(device, { compact: true }) || shortBase
    }
    return {
      hostId: h?.hostId || raw,
      raw,
      owner,
      shortBase,
      compactBase,
    }
  })

  const baseCounts = {}
  for (const item of parsed) {
    baseCounts[item.compactBase] = (baseCounts[item.compactBase] || 0) + 1
  }

  const target = parsed.find(p => p.hostId === targetHostId)
  if (!target) {
    const cleanFallback = String(fallbackHostName || targetHostId || '')
      .trim()
      .replace(/\.(local|lan)$/i, '')
    return cleanFallback.length > 8 ? `${cleanFallback.slice(0, 7)}…` : cleanFallback
  }

  let label = target.shortBase
  if ((baseCounts[target.compactBase] > 1 || target.shortBase === target.compactBase) && target.owner) {
    // Keep owner disambiguator when multiple Macs share a model or owner is explicit (e.g. 办公·Pro)
    if (baseCounts[target.compactBase] > 1 || /[\u4e00-\u9fa5]/.test(target.owner)) {
      const cleanOwner = target.owner.length > 5 ? target.owner.slice(0, 5) : target.owner
      label = `${cleanOwner}·${target.compactBase}`
    }
  }
  return label.length > 10 ? `${label.slice(0, 9)}…` : label
}

export function shouldSuppressTaskPush(task) {
  if (!task || !task.id) return true
  if (task.isSubagent || task.origin === 'subagent' || Boolean(task.parentConversationId)) {
    return true
  }
  if (
    String(task.harness || '') === 'antigravity-ide' &&
    Array.isArray(task.transcript) &&
    task.transcript.length > 0 &&
    !task.transcript.some(m => m?.role === 'user')
  ) {
    return true
  }
  if (
    /^workbuddy:\d+$/.test(String(task.id).trim()) &&
    (!Array.isArray(task.transcript) || task.transcript.length === 0) &&
    !(Number(task.messageCount) > 0) &&
    task.status !== 'running' &&
    task.status !== 'approval' &&
    !task.pendingApproval
  ) {
    return true
  }
  return false
}

export function cleanPushSessionTitle(rawTitle = '', rawProject = '', maxChars = 16) {
  let clean = stripRedundantProjectPrefixForPush(rawTitle, rawProject)
  clean = clean.replace(/^Antigravity\s*会话\s*/i, '')
  if (!clean) {
    clean = formatCompactProjectForPush(rawProject)
  }
  if (clean.length > maxChars) {
    return `${clean.slice(0, Math.max(4, maxChars - 1)).trim()}…`
  }
  return clean
}

function shortenPathInText(text = '', cwd = '') {
  let out = String(text || '')
  const cleanCwd = String(cwd || '').trim().replace(/\/+$/, '')
  if (cleanCwd && cleanCwd.length > 4) {
    out = out.split(`${cleanCwd}/`).join('')
  }
  // Convert markdown file:/// links or generic markdown links -> readable label / basename
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  out = out.replace(/\[([^\]]+)\]\(([^)]*)\)/g, (_, label) => {
    const cleanLabel = String(label || '').trim()
    if (cleanLabel.startsWith('/') || cleanLabel.startsWith('file://')) {
      return cleanLabel.split('/').filter(Boolean).pop() || cleanLabel
    }
    return cleanLabel
  })
  // Shorten bare file:///Users/... or /Users/<user>/... long paths to their basename (or parent/basename)
  out = out.replace(/(?:file:\/\/)?\/(?:Users|home|private|var|tmp)\/[^\s`"'，。！？；：()（）[\]]+/g, match => {
    const parts = match.replace(/^file:\/\//, '').split('/').filter(Boolean)
    if (parts.length === 0) return match
    if (parts.length >= 2 && parts[parts.length - 1].includes('.')) {
      return parts[parts.length - 1]
    }
    return parts.slice(-2).join('/')
  })
  return out
}

export function cleanFeishuMarkdownLinks(text = '', cwd = '') {
  let out = String(text || '')
  const cleanCwd = String(cwd || '').trim().replace(/\/+$/, '')
  // Turn [foo.ts](file:///Users/...) into `foo.ts` because Feishu mobile cannot open local Mac file:// URLs
  out = out.replace(/\[([^\]]+)\]\(file:\/\/[^)]+\)/g, (_, label) => {
    const cleanLabel = String(label || '').trim()
    const base =
      cleanCwd && cleanLabel.startsWith(`${cleanCwd}/`)
        ? cleanLabel.slice(cleanCwd.length + 1)
        : cleanLabel.startsWith('/')
          ? cleanLabel.split('/').filter(Boolean).pop() || cleanLabel
          : cleanLabel
    return `\`${base}\``
  })
  return out
}

const POLITE_FILLER_LINE_RE =
  /^(好的|好嘞|没问题|收到|明白|了解)[，,！!。.\s]*(我已经?|我刚|我来|下面|接下来|现在)?[^。！？\n]{0,28}(帮你|为您)?(检查|排查|查看|分析|处理|整理|看了一遍|过了一遍|修改|汇总)[^。！？\n]{0,12}[：:。！!]?$/

const GENERIC_SECTION_HEADING_RE =
  /^(?:[一二三四五六七八九十]+[、.．]\s*|\d+[.、．]\s*)?(?:现状诊断|修改总结|改动说明|自测结果|自测验证结果|核心问题|排查结果|总结如下|具体如下|主要改动|原因分析|方案如下)[：:\s]*$/

export function extractCleanConclusionPushBody(rawText = '', { cwd = '', maxChars = 86 } = {}) {
  const raw = String(rawText || '').trim()
  if (!raw) return '已执行完毕，点开查看详情'

  // 1. Strip fenced code blocks (keep brief marker only if nothing else exists)
  let stripped = raw.replace(/```[\s\S]*?```/g, ' ')
  stripped = shortenPathInText(stripped, cwd)

  // 2. Clean line-by-line structural noise (tables, rules, headings, bullets, markdown emphasis)
  const rawLines = stripped.split(/\r?\n/)
  const contentLines = []
  for (const line of rawLines) {
    let l = line.trim()
    if (!l) continue
    // Skip markdown table divider rows like |---|---| or horizontal rules
    if (/^[-=*_]{3,}$/.test(l) || /^\|[\s\-:|]+\|$/.test(l)) continue
    l = l
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s*/, '')
      .replace(/^(?:[-*•+]|\d+[.)、])\s+/, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\|\s*|\s*\|$/g, '')
      .replace(/\s*\|\s*/g, ' · ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!l) continue
    if (POLITE_FILLER_LINE_RE.test(l)) continue
    if (GENERIC_SECTION_HEADING_RE.test(l)) continue
    contentLines.push(l)
  }

  if (contentLines.length === 0) {
    const fallback = shortenPathInText(raw.replace(/```/g, '').replace(/\s+/g, ' '), cwd).trim()
    if (!fallback) return '已执行完毕，点开查看详情'
    return fallback.length > maxChars ? `${fallback.slice(0, maxChars - 1).trim()}…` : fallback
  }

  // Strip leading polite salutation on the first substantive line (e.g. "好的，已经部署上线啦！")
  contentLines[0] = contentLines[0]
    .replace(/^(好的|好嘞|没问题|收到|明白)[，,！!]\s*/, '')
    .trim()

  // Check if the final line is a concise actionable question to preserve at the end
  const lastLine = contentLines[contentLines.length - 1]
  const hasTrailingQuestion =
    contentLines.length > 1 &&
    /[？?]$/.test(lastLine) &&
    lastLine.length >= 4 &&
    lastLine.length <= 30

  const mainLines = hasTrailingQuestion ? contentLines.slice(0, -1) : contentLines
  let mainJoined = mainLines.join('；').replace(/([。！？；;])\s*；/g, '$1 ')
  mainJoined = mainJoined.replace(/\s+/g, ' ').trim()

  if (!hasTrailingQuestion) {
    if (mainJoined.length <= maxChars) return mainJoined
    return `${mainJoined.slice(0, maxChars - 1).trim()}…`
  }

  const fullWithQ = `${mainJoined}${/[。！？]$/.test(mainJoined) ? ' ' : '。'}${lastLine}`
  if (fullWithQ.length <= maxChars) return fullWithQ

  const budgetForMain = Math.max(20, maxChars - lastLine.length - 3)
  const clippedMain =
    mainJoined.length > budgetForMain
      ? `${mainJoined.slice(0, budgetForMain).replace(/[，、；：,\s]+$/, '')}…`
      : mainJoined
  return `${clippedMain} ${lastLine}`
}

export function cleanCommandForPush(rawCmd = '', cwd = '') {
  let cmd = String(rawCmd || '').trim()
  if (!cmd) return ''
  // Take first line if multi-line script
  const lines = cmd.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  cmd = lines.length > 1 ? `${lines[0]} …` : (lines[0] || '')

  // Strip leading environment variable assignments: FOO=bar BAR="baz qux" ...
  while (/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+/.test(cmd)) {
    cmd = cmd.replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+/, '').trim()
  }

  // Strip standard system binary prefixes (/usr/bin/curl -> curl, /opt/homebrew/bin/node -> node)
  cmd = cmd.replace(/^\/(?:usr\/local\/bin|opt\/homebrew\/bin|usr\/bin|bin|sbin)\/([A-Za-z0-9_.-]+)\b/, '$1')

  cmd = shortenPathInText(cmd, cwd)
  return cmd.replace(/\s+/g, ' ').trim()
}

export function formatHumanToolLabel(toolName = '') {
  const raw = String(toolName || '').trim()
  if (!raw || raw === 'unknown') return '操作'
  if (/run_command|bash|sh|zsh|terminal|permission\s*\(/i.test(raw)) return '终端命令'
  if (/write_file|write/i.test(raw)) return '写入文件'
  if (/edit_file|edit|replace/i.test(raw)) return '修改文件'
  if (/delete|rm/i.test(raw)) return '删除文件'
  if (/exit_plan_mode/i.test(raw)) return '方案确认'
  if (/ask_user_question|ask_question/i.test(raw)) return '选项确认'
  return raw
}

export function extractCleanApprovalPushContent(app = {}, { cwd = '', maxChars = 84 } = {}) {
  const isQuestion =
    app?.kind === 'question' ||
    Array.isArray(app?.questions) ||
    /ask_user_question|ask_question|exit_plan_mode/i.test(String(app?.toolName || ''))

  if (isQuestion) {
    const isPlan =
      app?.toolName === 'exit_plan_mode' ||
      app?.questions?.[0]?.id === 'plan-review'
    let qText = String(app?.questions?.[0]?.question || app?.promptTitle || app?.reason || '').trim()
    if (/^Allow agent question\??$/i.test(qText) || !qText) {
      qText = String(app?.reason || '需要你确认选项以继续').trim()
    }
    qText = shortenPathInText(qText, cwd).replace(/\s+/g, ' ').trim()
    const opts = Array.isArray(app?.questions?.[0]?.options)
      ? app.questions[0].options
          .map(o => String(o?.label || '').replace(/^\(Recommended\)\s*/i, '').trim())
          .filter(Boolean)
      : []
    const optSuffix =
      opts.length > 0 && !qText.includes(opts[0])
        ? `（${opts.slice(0, 3).join(' / ')}${opts.length > 3 ? '…' : ''}）`
        : ''
    const combined = `${qText}${optSuffix}`
    return {
      isQuestion: true,
      isPlan,
      badge: isPlan ? '📋 待确认方案' : '💬 待你选择',
      body: combined.length > maxChars ? `${combined.slice(0, maxChars - 1).trim()}…` : combined,
    }
  }

  const rawCmd = String(app?.commandLine || app?.permissionTarget || '').trim()
  const rawReason = String(app?.reason || '').trim()
  let desc = ''
  let cmdPart = rawCmd

  if (rawCmd && rawReason.endsWith(rawCmd)) {
    desc = rawReason.slice(0, rawReason.length - rawCmd.length).replace(/[:：\s]+$/, '').trim()
  } else if (!rawCmd && rawReason) {
    // Check if reason is "Summary: command" or "执行 ./foo.sh"
    const colonMatch = /^([^:：\n]{2,36}):\s+(.+)$/.exec(rawReason)
    if (colonMatch && /^[A-Za-z0-9_./~$-]/.test(colonMatch[2])) {
      desc = colonMatch[1].trim()
      cmdPart = colonMatch[2].trim()
    } else {
      desc = rawReason
    }
  }

  if (/^(command execution|请求宿主机终端执行权限|未提供原因)$/i.test(desc)) {
    desc = ''
  }

  const cleanCmd = cleanCommandForPush(cmdPart, cwd || app?.cwd || '')
  const cleanDesc = shortenPathInText(desc, cwd || app?.cwd || '').replace(/\s+/g, ' ').trim()

  let body = ''
  if (cleanDesc && cleanCmd) {
    body = cleanDesc.includes(cleanCmd) ? cleanDesc : `${cleanDesc}：${cleanCmd}`
  } else if (cleanCmd) {
    body = `运行：${cleanCmd}`
  } else if (cleanDesc) {
    const toolLabel = formatHumanToolLabel(app?.toolName)
    body = toolLabel !== '终端命令' && toolLabel !== '操作' && !cleanDesc.includes(toolLabel)
      ? `${toolLabel}：${cleanDesc}`
      : cleanDesc
  } else {
    body = `${formatHumanToolLabel(app?.toolName)}请求执行权限`
  }

  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars - 1).trim()}…`
  }

  return {
    isQuestion: false,
    isPlan: false,
    badge: '⏳ 需批准',
    body,
  }
}

export function formatWebPushNotification({
  kind = 'completed', // 'approval' | 'completed' | 'failed'
  hosts = [],
  hostId = '',
  hostName = '',
  task = null,
  approval = null,
} = {}) {
  const hostPrefix = resolveShortHostLabelForPush(hosts, hostId, hostName)
  const hostPart = hostPrefix ? `${hostPrefix} · ` : ''
  const rawTitle = approval ? (approval.title || task?.title || '') : (task?.title || '')
  const rawProject = approval ? (approval.project || task?.project || '') : (task?.project || '')
  const cwd = approval?.cwd || task?.cwd || ''
  const sessionTitle = cleanPushSessionTitle(rawTitle, rawProject, hostPrefix ? 13 : 17)
  const agentId = String(approval?.agentId || task?.id || '').trim()
  const tag = agentId ? `session-${agentId}` : `dsh-${kind}-${approval?.code || Date.now()}`

  if (kind === 'approval' && approval) {
    const parsed = extractCleanApprovalPushContent(approval, { cwd, maxChars: 84 })
    return {
      title: `${parsed.badge} · ${hostPart}${sessionTitle}`,
      body: parsed.body,
      tag,
    }
  }

  if (kind === 'failed') {
    const rawErr = String(task?.lastOutput || '').trim()
    const errBody = rawErr && rawErr.startsWith('⚠️')
      ? shortenPathInText(rawErr, cwd).slice(0, 84)
      : extractCleanConclusionPushBody(rawErr, { cwd, maxChars: 84 })
    const cleanStatus = String(task?.statusLabel || task?.status || '异常中断').replace(/^[⚠️🔴🟢🔵⏳]+\s*/, '').trim()
    const body = rawErr ? errBody : `状态：${cleanStatus}，点开查看原因或重试`
    return {
      title: `⚠️ ${hostPart}${sessionTitle}`,
      body,
      tag,
    }
  }

  // completed
  const body = extractCleanConclusionPushBody(task?.lastOutput || '', { cwd, maxChars: 86 })
  return {
    title: `✅ ${hostPart}${sessionTitle}`,
    body,
    tag,
  }
}
