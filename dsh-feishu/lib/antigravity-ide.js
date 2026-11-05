import { execFile } from 'node:child_process'
import { access, readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fastScanBrainDirs, sendNativeKeystroke } from '../../dsh-turbo/index.js'
import { cleanForChat, redactText } from './redact.js'

const execFileAsync = promisify(execFile)
const sessionParseCache = new Map()

export const AGY_IDE_PREFIX = 'agy-ide:'

const SILENT_TOOLS = new Set([
  'task_boundary',
  'view_file',
  'read_file',
  'list_dir',
  'grep_search',
  'find_by_name',
  'manage_task',
  'read_resource',
  'read_url_content',
  'list_resources',
  'schedule',
])

const SYSTEM_DIRS = new Set(['.gemini', 'Applications', 'Library', 'Desktop', 'Downloads', 'scratch', 'tmp'])

/**
 * Check if a session ID belongs to an Antigravity IDE conversation.
 */
export function isAntigravityIdeSessionId(id) {
  return String(id ?? '').startsWith(AGY_IDE_PREFIX)
}

/**
 * Strip `agy-ide:` prefix to get raw UUID conversation ID.
 */
export function toRawConversationId(id) {
  const s = String(id ?? '').trim()
  return s.startsWith(AGY_IDE_PREFIX) ? s.slice(AGY_IDE_PREFIX.length) : s
}

/**
 * Infer a human-readable workspace/project name and directory path from a file/folder path.
 */
export function inferWorkspaceFromPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null
  const cleaned = rawPath.replace(/^file:\/\//, '').trim()
  if (!cleaned.startsWith('/')) return null
  if (cleaned.includes('/.gemini/') || cleaned.includes('/Antigravity IDE.app/')) return null

  const parts = cleaned.split('/').filter(Boolean)
  // Match /Users/<user>/<project> or /home/<user>/<project>
  if ((parts[0] === 'Users' || parts[0] === 'home') && parts.length >= 3) {
    const userDir = parts[1]
    const topFolder = parts[2]
    if (!SYSTEM_DIRS.has(topFolder)) {
      const cwd = `/${parts[0]}/${userDir}/${topFolder}`
      return { cwd, project: topFolder }
    }
    if (topFolder === 'temp' && parts.length >= 3) {
      return { cwd: `/${parts[0]}/${userDir}/temp`, project: 'temp' }
    }
  }
  const dir = cleaned.endsWith('.docx') || cleaned.endsWith('.py') || cleaned.endsWith('.js') || cleaned.endsWith('.md') || cleaned.endsWith('.json') || cleaned.endsWith('.html')
    ? dirname(cleaned)
    : cleaned
  const proj = basename(dir)
  if (!proj || SYSTEM_DIRS.has(proj)) return null
  return { cwd: dir, project: proj }
}

/**
 * Extract clean user prompt and workspace metadata from an Antigravity USER_INPUT step.
 */
export function parseAntigravityUserInput(content) {
  const raw = String(content ?? '')
  const reqMatch = raw.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/i)
  let userText = reqMatch ? reqMatch[1].trim() : raw.trim()

  // Strip system tags if raw fallback was used
  userText = userText
    .replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/gi, '')
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/gi, '')
    .replace(/<SYSTEM_MESSAGE>[\s\S]*?<\/SYSTEM_MESSAGE>/gi, '')
    .trim()

  // Simplify @[path] mentions for cleaner mobile display while extracting workspace path
  let inferredWs = null
  const mentionMatch = userText.match(/@\[([^\]]+)\]/)
  if (mentionMatch) {
    inferredWs = inferWorkspaceFromPath(mentionMatch[1])
    userText = userText.replace(/@\[([^\]]+)\]/g, (_, p) => `@${basename(p)}`)
  }

  // Check Active Workspaces / Command Working Directory / Active Document in metadata
  let boundWs = null
  const boundMatch = raw.match(/Command Working Directory:\s*([^\r\n]+)/i)
    || raw.match(/Active Workspaces:\s*\n-\s*([^\r\n]+)/i)
  if (boundMatch) {
    const candidate = inferWorkspaceFromPath(boundMatch[1].trim())
    if (candidate) {
      boundWs = candidate
      inferredWs = candidate
    }
  } else {
    const docMatch = raw.match(/Active Document:\s*([^\r\n(]+)/i)
    if (docMatch) {
      const candidate = inferWorkspaceFromPath(docMatch[1].trim())
      if (candidate) inferredWs = candidate
    }
  }

  return {
    userText: cleanForChat(redactText(userText), 4000),
    inferredWs,
    boundWs,
  }
}

/**
 * Parse tool_calls array from an Antigravity PLANNER_RESPONSE step.
 */
export function parseAntigravityToolCalls(rawToolCalls) {
  if (!Array.isArray(rawToolCalls)) return { tools: [], inferredWs: null, approvalRequest: null, fileChanges: [] }
  const tools = []
  const fileChanges = []
  let inferredWs = null
  let approvalRequest = null

  for (const tc of rawToolCalls) {
    if (!tc || typeof tc !== 'object') continue
    const name = String(tc.name || 'tool').trim()
    if (name === 'task_boundary') continue
    let args = tc.args ?? tc.arguments ?? {}
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args)
      } catch {
        args = { raw: args }
      }
    }
    const unquote = val => {
      if (typeof val !== 'string') return val
      return val.replace(/^"(.*)"$/s, '$1').replace(/\\"/g, '"').replace(/\\n/g, '\n')
    }

    const pathArg = unquote(args.Path || args.TargetFile || args.Cwd || args.SearchPath || args.AbsolutePath || '')
    if (pathArg && !inferredWs) {
      inferredWs = inferWorkspaceFromPath(pathArg)
    }

    if ((name === 'edit_file' || name === 'write_file' || name === 'replace_file_content' || name === 'multi_replace_file_content') && pathArg && !pathArg.includes('/.gemini/antigravity')) {
      const targetStr = String(unquote(args.Target || args.TargetContent || '') || '')
      const replacementStr = String(unquote(args.Replacement || args.ReplacementContent || args.Content || '') || '')
      const removed = targetStr ? targetStr.split('\n').length : 0
      const added = replacementStr ? replacementStr.split('\n').length : 0
      fileChanges.push({
        path: pathArg,
        name: basename(pathArg),
        displayPath: pathArg.replace(/^\/Users\/[^/]+/, '~'),
        added: Math.max(1, added),
        removed,
      })
    }

    const cmdLine = unquote(args.CommandLine || '')
    const toolSummary = unquote(args.toolSummary || args.toolAction || '')
    const bypassRaw = args.BypassSandbox
    const bypassSandbox = bypassRaw === true || bypassRaw === 'true' || bypassRaw === '"true"'

    tools.push({
      name,
      id: String(tc.id || ''),
      summary: toolSummary || (cmdLine ? `执行: ${cmdLine.slice(0, 80)}` : name),
      commandLine: cmdLine ? cmdLine.slice(0, 2000) : '',
      bypassSandbox,
    })

    if (name === 'run_command' && bypassSandbox) {
      const cleanSummary = toolSummary || 'command execution'
      const lowerSummary = cleanSummary.charAt(0).toLowerCase() + cleanSummary.slice(1)
      const firstSubcmd = (cmdLine.split(/\s*(?:&&|\|\||;|\n)\s*/)[0] || cmdLine).trim()
      approvalRequest = {
        toolName: 'run_command (BypassSandbox)',
        promptTitle: `Allow ${lowerSummary}?`,
        subtitle: 'the auto-run safety check did not reach a decision',
        commandLine: cmdLine || '请求宿主机终端执行权限',
        firstSubcommand: firstSubcmd,
        options: [
          { index: 1, label: 'Yes, allow this time' },
          { index: 2, label: `Yes, and always allow '${firstSubcmd}' in this conversation` },
          { index: 3, label: `Yes, and always allow '${firstSubcmd}'` },
          { index: 4, label: 'No (tell the agent what to do instead)' },
        ],
        reason: `${toolSummary ? `${toolSummary}: ` : ''}${cmdLine || '请求宿主机终端执行权限'}`.slice(0, 2000),
      }
    } else if (name === 'ask_question') {
      approvalRequest = {
        toolName: 'ask_question',
        promptTitle: 'Allow agent question?',
        subtitle: 'Waiting for user input.',
        commandLine: '',
        options: [],
        reason: '等待你在对话框中确认选项或回答澄清问题',
      }
    }
  }

  return { tools, inferredWs, approvalRequest, fileChanges }
}

/**
 * Parse a single Antigravity `transcript.jsonl` content string into a normalized session object.
 */
export function parseAntigravityTranscript(jsonlText, {
  conversationId,
  mtimeMs = Date.now(),
  customTitles = {},
  nativeTitle = '',
  nativeWorkspace = null,
  settledApprovals = new Set(),
  maxMessages = 40,
  now = Date.now(),
} = {}) {
  const lines = String(jsonlText ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      try {
        return JSON.parse(l)
      } catch {
        return null
      }
    })
    .filter(Boolean)

  if (lines.length === 0) return null

  const transcript = []
  let boundWs = nativeWorkspace || null
  let cwd = boundWs?.cwd || ''
  let project = boundWs?.project || 'Antigravity IDE'
  let checkpointTitle = ''
  let lastOutput = ''
  let lastActivity = mtimeMs
  let pendingApproval = null
  const changedFilesMap = new Map()

  for (let i = 0; i < lines.length; i += 1) {
    const step = lines[i]
    const stepType = String(step.type || '')
    const stepTime = step.created_at ? Date.parse(step.created_at) : 0
    if (Number.isFinite(stepTime) && stepTime > lastActivity) {
      lastActivity = stepTime
    }

    if (stepType === 'CHECKPOINT') {
      if (typeof step.user_objective === 'string' && step.user_objective.trim()) {
        checkpointTitle = step.user_objective.trim()
      } else if (typeof step.content === 'string') {
        const objMatch = step.content.match(/#\s*USER Objective:\s*\n+([^\r\n#]+)/i)
        if (objMatch && objMatch[1].trim()) {
          checkpointTitle = objMatch[1].trim()
        }
        if (!boundWs) {
          const wsCkptMatch = step.content.match(/\*\*Workspace\*\*:\s*`([^`]+)`/i)
            || step.content.match(/Workspace:\s*`?(\/Users\/[^\s`)\r\n]+)/i)
          if (wsCkptMatch) {
            const candidate = inferWorkspaceFromPath(wsCkptMatch[1].trim())
            if (candidate) {
              boundWs = candidate
              cwd = candidate.cwd
              project = candidate.project
            }
          }
        }
      }
      continue
    }

    if (stepType === 'USER_INPUT') {
      const { userText, inferredWs, boundWs: stepBoundWs } = parseAntigravityUserInput(step.content)
      if (stepBoundWs && !boundWs) {
        boundWs = stepBoundWs
        cwd = stepBoundWs.cwd
        project = stepBoundWs.project
      } else if (inferredWs && !boundWs) {
        cwd = inferredWs.cwd
        project = inferredWs.project
      }
      if (!userText) continue
      pendingApproval = null // Previous approval is resolved once user inputs
      transcript.push({
        index: transcript.length,
        role: 'user',
        text: userText,
        thinking: '',
        tools: [],
        toolCalls: [],
        time: stepTime || lastActivity,
      })
      continue
    }

    if (stepType === 'PLANNER_RESPONSE') {
      const rawContent = String(step.content ?? '').trim()
      const rawThinking = String(step.thinking ?? '').trim()
      const { tools, inferredWs, approvalRequest, fileChanges } = parseAntigravityToolCalls(step.tool_calls)
      if (inferredWs && !boundWs && (!cwd || project === 'Antigravity IDE')) {
        cwd = inferredWs.cwd
        project = inferredWs.project
      }

      if (Array.isArray(fileChanges) && fileChanges.length > 0) {
        for (const fc of fileChanges) {
          const prev = changedFilesMap.get(fc.path)
          if (prev) {
            prev.added += fc.added
            prev.removed += fc.removed
          } else {
            changedFilesMap.set(fc.path, { ...fc })
          }
        }
      }

      // Filter silent read-only steps that have no user-facing content, unless it's the very last step
      const allSilent = tools.length > 0 && tools.every(t => SILENT_TOOLS.has(t.name))
      if (allSilent && !rawContent && i < lines.length - 1) {
        continue
      }
      if (!rawContent && !rawThinking && tools.length === 0) {
        continue
      }

      const asstText = cleanForChat(redactText(rawContent), 1800)
      const thinkingText = cleanForChat(redactText(rawThinking), 600)
      if (asstText) {
        lastOutput = asstText.slice(0, 1200)
      } else if (tools.length > 0 && !lastOutput) {
        lastOutput = tools.map(t => t.summary || t.name).join(' · ').slice(0, 400)
      }

      const isWaitingApproval = Boolean(approvalRequest && i === lines.length - 1)
      const toolDisplayLine = tools.length > 0
        ? tools
            .map(t => {
              const s = t.summary || t.name
              if (t.name === 'run_command' && !isWaitingApproval) {
                return `Ran ${s.charAt(0).toLowerCase() + s.slice(1)}`
              }
              return s
            })
            .join(' · ')
        : ''

      transcript.push({
        index: transcript.length,
        role: 'assistant',
        text: asstText || toolDisplayLine,
        isToolStepOnly: !asstText && tools.length > 0,
        waitingForInput: isWaitingApproval,
        thinking: thinkingText,
        tools,
        toolCalls: tools,
        time: stepTime || lastActivity,
      })

      // Check if this step is currently waiting for user approval (no subsequent completion step yet)
      if (isWaitingApproval) {
        const code = `AGY-${String(conversationId).slice(0, 6).toUpperCase()}-${step.step_index ?? i}`
        if (!settledApprovals.has(code) && now - lastActivity < 2 * 3600 * 1000) {
          pendingApproval = {
            code,
            stepIndex: step.step_index ?? i,
            harness: 'antigravity-ide',
            toolName: approvalRequest.toolName,
            promptTitle: approvalRequest.promptTitle || '',
            subtitle: approvalRequest.subtitle || '',
            commandLine: approvalRequest.commandLine || '',
            firstSubcommand: approvalRequest.firstSubcommand || '',
            options: approvalRequest.options || [],
            reason: approvalRequest.reason,
            createdAt: stepTime || lastActivity,
            expiresAt: (stepTime || lastActivity) + 2 * 3600 * 1000,
          }
        }
      }
    } else if (stepType === 'RUN_COMMAND' || stepType === 'CODE_ACTION') {
      pendingApproval = null
    }
  }

  if (transcript.length === 0) return null

  const sessionId = `${AGY_IDE_PREFIX}${conversationId}`
  const firstUserMsg = transcript.find(m => m.role === 'user')?.text || ''
  const cleanFirstLine = firstUserMsg
    .split('\n')[0]
    .replace(/^[#>*\-\s]+/, '')
    .slice(0, 42)
    .trim()

  const title = customTitles[sessionId]
    || customTitles[conversationId]
    || nativeTitle
    || checkpointTitle
    || cleanFirstLine
    || `Antigravity 会话 ${String(conversationId).slice(0, 8)}`

  const changedFiles = [...changedFilesMap.values()].slice(-8)

  const lastStep = lines.at(-1) || {}
  const isRecentlyActive = (now - lastActivity < 45_000) && (
    lastStep.status === 'RUNNING'
    || (lastStep.type === 'PLANNER_RESPONSE' && Array.isArray(lastStep.tool_calls) && lastStep.tool_calls.length > 0 && !lastStep.content)
  )

  const status = pendingApproval
    ? 'approval'
    : isRecentlyActive
      ? 'running'
      : 'idle'

  const statusLabel = pendingApproval
    ? '⏳ 待审批'
    : status === 'running'
      ? '🟢 运行中'
      : '已完成'

  return {
    id: sessionId,
    rawId: conversationId,
    shortId: String(conversationId).slice(0, 8),
    harness: 'antigravity-ide',
    harnessLabel: 'Antigravity IDE',
    title,
    status,
    statusLabel,
    project,
    cwd: cwd || process.cwd(),
    lastActivity,
    updatedAt: lastActivity,
    lastOutput,
    queuedSteers: [],
    changedFiles,
    transcript: transcript.slice(-maxMessages),
    pendingApproval: pendingApproval
      ? {
          ...pendingApproval,
          agentId: sessionId,
          title,
          project,
          changedFiles,
        }
      : null,
  }
}

/**
 * Default brain directories used by Antigravity IDE:
 * 1. `~/.gemini/antigravity/brain` (Antigravity IDE v2.6.0+ post-Oct 28 migration)
 * 2. `~/.gemini/antigravity-ide/brain` (Antigravity IDE pre-Oct 28 historical sessions)
 */
export function getDefaultAntigravityBrainDirs(home = homedir()) {
  return [
    join(home, '.gemini', 'antigravity', 'brain'),
    join(home, '.gemini', 'antigravity-ide', 'brain'),
  ]
}

/**
 * Extract native Antigravity IDE conversation titles and bound workspaces from:
 * 1. `<agyRoot>/annotations/<convId>.pbtxt` (`title:"..."`)
 * 2. `<agyRoot>/agyhub_summaries_proto.pb` (contains convId, summary title, and `file:///Users/...` workspace URI)
 */
let cachedNativeMetaMap = null
let cachedNativeMetaAt = 0
let cachedNativeMetaKey = ''

async function loadAntigravityMetadataForCandidates(brainDirs, candidates) {
  const now = Date.now()
  const key = `${brainDirs.join('|')}:${candidates.map(c => c.convId).join(',')}`
  if (cachedNativeMetaMap && cachedNativeMetaKey === key && now - cachedNativeMetaAt < 3000) {
    return cachedNativeMetaMap
  }
  const metaMap = new Map()
  const agyRoots = [...new Set(brainDirs.filter(Boolean).map(d => dirname(resolve(d))))]

  for (const agyRoot of agyRoots) {
    try {
      const pbBuf = await readFile(join(agyRoot, 'agyhub_summaries_proto.pb'))
      const pbStr = pbBuf.toString('utf8')
      for (const item of candidates) {
        const idx = pbStr.indexOf(item.convId)
        if (idx === -1) continue
        const slice = pbStr.slice(idx, idx + 600)
        const existing = metaMap.get(item.convId) || { title: '', workspace: null }
        const wsMatch = slice.match(/file:\/\/(\/Users\/[^"\r\n\x00-\x1f]+|\/home\/[^"\r\n\x00-\x1f]+)/)
        if (wsMatch && !existing.workspace) {
          const ws = inferWorkspaceFromPath(wsMatch[1])
          if (ws) existing.workspace = ws
        }
        const titleMatch = slice.match(/\n\$([^\x00-\x1f\r\n]{2,90})/)
        if (titleMatch && !existing.title) {
          existing.title = titleMatch[1].trim()
        }
        metaMap.set(item.convId, existing)
      }
    } catch {
      // summary proto optional
    }

    for (const item of candidates) {
      try {
        const pbtxt = await readFile(join(agyRoot, 'annotations', `${item.convId}.pbtxt`), 'utf8')
        const m = pbtxt.match(/title:\s*"((?:[^"\\]|\\.)*)"/)
        if (m && m[1].trim()) {
          const existing = metaMap.get(item.convId) || { title: '', workspace: null }
          existing.title = m[1].replace(/\\"/g, '"').trim()
          metaMap.set(item.convId, existing)
        }
      } catch {
        // annotation file optional
      }
    }
  }

  cachedNativeMetaMap = metaMap
  cachedNativeMetaAt = now
  cachedNativeMetaKey = key
  return metaMap
}

/**
 * Load Antigravity IDE sessions across configured brain directories.
 */
export async function loadAntigravityIdeSessions({
  brainDirs = getDefaultAntigravityBrainDirs(),
  dshHome = '',
  maxSessions = 20,
  maxMessages = 25,
  settledApprovals = new Set(),
  excludeConversationIds = new Set(),
  now = Date.now(),
} = {}) {
  let customTitles = {}
  if (dshHome) {
    try {
      customTitles = JSON.parse(await readFile(join(resolve(dshHome), 'session-titles.json'), 'utf8'))
    } catch {
      customTitles = {}
    }
  }

  const candidateFiles = []
  const seenConvIds = new Set()

  // Fast path: try Rust native sub-ms scanner first
  const rustScan = await fastScanBrainDirs(brainDirs)
  if (rustScan && Array.isArray(rustScan.items) && rustScan.items.length > 0) {
    for (const item of rustScan.items) {
      if (!item.convId || seenConvIds.has(item.convId) || excludeConversationIds.has(item.convId)) continue
      seenConvIds.add(item.convId)
      candidateFiles.push({
        convId: item.convId,
        path: item.path,
        mtimeMs: Number(item.mtimeMs) || 0,
        size: Number(item.size) || 0,
      })
    }
  } else {
    for (const brainDir of brainDirs) {
      if (!brainDir) continue
      let entries = []
      try {
        entries = await readdir(brainDir, { withFileTypes: true })
      } catch {
        continue
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const convId = entry.name
        if (convId.startsWith('.') || convId === 'tempmediaStorage') continue
        if (seenConvIds.has(convId) || excludeConversationIds.has(convId)) continue

        const logsDir = join(brainDir, convId, '.system_generated', 'logs')
        const compactPath = join(logsDir, 'transcript.jsonl')
        const fullPath = join(logsDir, 'transcript_full.jsonl')

        let chosenPath = ''
        let fileStat = null
        for (const candidate of [compactPath, fullPath]) {
          try {
            const st = await stat(candidate)
            if (st.isFile() && st.size > 20) {
              chosenPath = candidate
              fileStat = st
              break
            }
          } catch {
            // try next
          }
        }
        if (!chosenPath || !fileStat) continue

        seenConvIds.add(convId)
        candidateFiles.push({
          convId,
          path: chosenPath,
          mtimeMs: Math.round(fileStat.mtimeMs),
          size: fileStat.size,
        })
      }
    }
  }

  // Sort by mtime descending and only parse top (maxSessions * 2) candidates for fast I/O
  candidateFiles.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const topCandidates = candidateFiles.slice(0, Math.max(maxSessions * 2, 30))
  const nativeMetaMap = await loadAntigravityMetadataForCandidates(brainDirs, topCandidates)

  const settledKey = settledApprovals ? [...settledApprovals].join(',') : ''
  const sessions = []
  for (const item of topCandidates) {
    try {
      const nativeMeta = nativeMetaMap.get(item.convId)
      const sessionId = `${AGY_IDE_PREFIX}${item.convId}`
      const customTitle = customTitles[sessionId] || customTitles[item.convId] || ''
      const cacheKey = `${item.convId}:${item.mtimeMs}:${item.size || 0}:${customTitle}:${nativeMeta?.title || ''}:${settledKey}`
      const cached = sessionParseCache.get(item.convId)
      if (cached && cached.cacheKey === cacheKey && cached.session) {
        // Recompute dynamic running/idle status against current `now` while skipping disk read & JSONL parse
        const isRecentlyActive = now - cached.session.lastActivity <= 25_000
        const status = cached.session.pendingApproval
          ? 'approval'
          : isRecentlyActive
            ? 'running'
            : 'idle'
        sessions.push({
          ...cached.session,
          status,
          statusLabel: cached.session.pendingApproval ? '⏳ 待审批' : status === 'running' ? '🟢 运行中' : '已完成',
        })
        continue
      }

      const rawText = await readFile(item.path, 'utf8')
      const parsed = parseAntigravityTranscript(rawText, {
        conversationId: item.convId,
        mtimeMs: item.mtimeMs,
        customTitles,
        nativeTitle: nativeMeta?.title || '',
        nativeWorkspace: nativeMeta?.workspace || null,
        settledApprovals,
        maxMessages,
        now,
      })
      if (parsed) {
        sessionParseCache.set(item.convId, { cacheKey, session: parsed })
        if (sessionParseCache.size > 120) {
          const oldestKey = sessionParseCache.keys().next().value
          sessionParseCache.delete(oldestKey)
        }
        sessions.push(parsed)
      }
    } catch {
      // ignore unreadable transcript
    }
  }

  sessions.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  return sessions.slice(0, maxSessions)
}

/**
 * Execute remote control actions targeting Antigravity IDE:
 * - `approve`: Trigger Antigravity IDE's acceptAgentStep (`Option + Enter` / `Enter` or numbered option `1`/`2`/`3` + `Enter`)
 * - `deny`: Trigger Antigravity IDE's rejectAgentStep (`Option + Shift + Enter` / `Escape` or option `4`)
 * - `stop`: Trigger Antigravity IDE's interruptAgent (`Escape`)
 * - `prompt` / `steer`: Send message via official `agentapi send-message <id> <text>` with UI focus fallback (`Cmd + L` + paste)
 * - `new_session`: Create a new Antigravity IDE conversation via `agentapi new-conversation` or `Cmd + Shift + L`
 */
export async function executeAntigravityIdeAction(action, {
  home = homedir(),
  execImpl = execFileAsync,
} = {}) {
  const type = String(action?.type ?? '').trim()
  const rawConvId = toRawConversationId(action?.agentId || action?.conversationId || '')
  const optionIndex = Number(action?.optionIndex) || 1

  const runAppleScript = async script => {
    try {
      await execImpl('osascript', ['-e', script], { timeout: 5000 })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error?.message || String(error) }
    }
  }

  if (type === 'approve') {
    if (execImpl === execFileAsync) {
      const nativeAction = optionIndex === 2 ? 'approve-2' : optionIndex === 3 ? 'approve-3' : 'approve-1'
      const nativeRes = await sendNativeKeystroke(nativeAction)
      if (nativeRes.ok) {
        return {
          ok: true,
          engine: 'rust-native',
          message: `✅ [Rust 极速引擎] 已在 Antigravity IDE 提交选项 ${optionIndex}【允许执行】`,
        }
      }
    }
    const keyChar = optionIndex === 2 ? '2' : optionIndex === 3 ? '3' : ''
    const selectOptionLine = keyChar ? `keystroke "${keyChar}"\n          delay 0.1` : `key code 36 using {option down}\n          delay 0.1`
    const script = `
      tell application "System Events"
        set procList to every process whose name contains "Antigravity IDE" or name contains "Electron" or name contains "Antigravity"
        if (count of procList) > 0 then
          set frontmost of item 1 of procList to true
          delay 0.15
          ${selectOptionLine}
          key code 36
          return true
        end if
      end tell
    `
    const res = await runAppleScript(script)
    return {
      ok: res.ok,
      message: res.ok ? `✅ 已在 Antigravity IDE 提交选项 ${optionIndex}【允许执行】` : `批准执行失败: ${res.error}`,
    }
  }

  if (type === 'deny') {
    if (execImpl === execFileAsync) {
      const nativeRes = await sendNativeKeystroke('deny-4')
      if (nativeRes.ok) {
        return {
          ok: true,
          engine: 'rust-native',
          message: '🔴 [Rust 极速引擎] 已在 Antigravity IDE 执行远程【拒绝】',
        }
      }
    }
    // Antigravity IDE extension defines `alt+shift+enter` for `antigravity.dynamic.rejectAgentStep` and `escape`
    const script = `
      tell application "System Events"
        set procList to every process whose name contains "Antigravity IDE" or name contains "Electron" or name contains "Antigravity"
        if (count of procList) > 0 then
          set frontmost of item 1 of procList to true
          delay 0.15
          key code 36 using {option down, shift down}
          delay 0.1
          key code 53
          return true
        end if
      end tell
    `
    const res = await runAppleScript(script)
    return {
      ok: res.ok,
      message: res.ok ? '🔴 已在 Antigravity IDE 执行远程【拒绝】' : `拒绝执行失败: ${res.error}`,
    }
  }

  if (type === 'stop') {
    if (execImpl === execFileAsync) {
      const nativeRes = await sendNativeKeystroke('escape')
      if (nativeRes.ok) {
        return {
          ok: true,
          engine: 'rust-native',
          message: '⏹️ [Rust 极速引擎] 已向 Antigravity IDE 发送停止指令',
        }
      }
    }
    const script = `
      tell application "System Events"
        set procList to every process whose name contains "Antigravity IDE" or name contains "Electron" or name contains "Antigravity"
        if (count of procList) > 0 then
          set frontmost of item 1 of procList to true
          delay 0.15
          key code 53
          return true
        end if
      end tell
    `
    const res = await runAppleScript(script)
    return {
      ok: res.ok,
      message: res.ok ? '⏹️ 已向 Antigravity IDE 发送停止指令' : `停止失败: ${res.error}`,
    }
  }

  if (type === 'prompt' || type === 'steer') {
    const text = String(action?.text ?? '').trim()
    if (!text) return { ok: false, error: '发送内容不能为空' }

    // Strategy 1: Try official `agentapi send-message <convId> <text>`
    const agentApiCandidates = [
      join(home, '.gemini', 'antigravity', 'bin', 'agentapi'),
      join(home, '.gemini', 'bin', 'agy'),
    ]
    for (const binPath of agentApiCandidates) {
      try {
        await access(binPath)
        const args = binPath.endsWith('/agy')
          ? ['agentapi', 'send-message', rawConvId, text]
          : ['send-message', rawConvId, text]
        const { stdout } = await execImpl(binPath, args, { timeout: 8000 })
        const parsed = JSON.parse(stdout || '{}')
        if (!parsed.error) {
          return {
            ok: true,
            agentId: `${AGY_IDE_PREFIX}${rawConvId}`,
            method: 'agentapi',
            message: '📨 已通过 Antigravity 官方 RPC 通道投递指令',
          }
        }
      } catch {
        // Fallback to Strategy 2 below
      }
    }

    // Strategy 2: Focus Antigravity IDE chat panel (`Cmd+L`) and paste prompt
    try {
      await execImpl('sh', ['-c', `printf %s ${JSON.stringify(text)} | pbcopy`], { timeout: 3000 })
    } catch {
      // ignore pbcopy failure in non-macOS test environments
    }
    const script = `
      tell application "System Events"
        set procList to every process whose name contains "Antigravity IDE" or name contains "Electron" or name contains "Antigravity"
        if (count of procList) > 0 then
          set frontmost of item 1 of procList to true
          delay 0.2
          keystroke "l" using {command down}
          delay 0.2
          keystroke "v" using {command down}
          delay 0.15
          key code 36
          return true
        end if
      end tell
    `
    const res = await runAppleScript(script)
    return {
      ok: res.ok,
      agentId: `${AGY_IDE_PREFIX}${rawConvId}`,
      method: 'applescript',
      message: res.ok ? '📨 已将指令同步输入至 Antigravity IDE 对话框' : `发送失败: ${res.error}`,
    }
  }

  if (type === 'new_session') {
    const promptText = String(action?.prompt ?? action?.text ?? '').trim()
    const title = String(action?.title ?? '').trim() || (promptText ? promptText.slice(0, 36) : 'Antigravity 新对话')
    const agentApiPath = join(home, '.gemini', 'antigravity', 'bin', 'agentapi')
    try {
      await access(agentApiPath)
      const args = ['new-conversation', `--title=${title}`, promptText || '你好']
      const { stdout } = await execImpl(agentApiPath, args, { timeout: 8000 })
      const parsed = JSON.parse(stdout || '{}')
      const newId = parsed?.response?.conversationId || parsed?.conversationId
      if (newId) {
        return {
          ok: true,
          agentId: `${AGY_IDE_PREFIX}${newId}`,
          title,
          message: `⚡ 已在 Antigravity IDE 创建新对话「${title}」`,
        }
      }
    } catch {
      // Fallback to UI shortcut Cmd+Shift+L
    }

    if (promptText) {
      try {
        await execImpl('sh', ['-c', `printf %s ${JSON.stringify(promptText)} | pbcopy`], { timeout: 3000 })
      } catch {}
    }
    const script = `
      tell application "System Events"
        set procList to every process whose name contains "Antigravity IDE" or name contains "Electron" or name contains "Antigravity"
        if (count of procList) > 0 then
          set frontmost of item 1 of procList to true
          delay 0.2
          keystroke "l" using {command down, shift down}
          delay 0.25
          ${promptText ? 'keystroke "v" using {command down}\ndelay 0.15\nkey code 36' : ''}
          return true
        end if
      end tell
    `
    const res = await runAppleScript(script)
    return {
      ok: res.ok,
      title,
      message: res.ok ? `⚡ 已在 Antigravity IDE 开启新对话「${title}」` : `开启新对话失败: ${res.error}`,
    }
  }

  return { ok: false, error: `不支持的 Antigravity IDE 操作: ${type}` }
}
