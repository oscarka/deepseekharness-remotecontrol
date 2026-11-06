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
  liveStepCount = null,
  liveLastUserInputStepIndex = null,
  liveStatus = '',
} = {}) {
  const rawLines = String(jsonlText ?? '')
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

  if (rawLines.length === 0) return null

  // Antigravity's transcript.jsonl is append-only. When a user reverts ("撤回") to an earlier
  // step and continues, a new line with a smaller/equal `step_index` is appended at the end.
  // Roll back any superseded steps whose `step_index >= step.step_index`.
  const lines = []
  for (const step of rawLines) {
    if (typeof step.step_index === 'number') {
      while (
        lines.length > 0
        && typeof lines[lines.length - 1].step_index === 'number'
        && lines[lines.length - 1].step_index >= step.step_index
      ) {
        lines.pop()
      }
    }
    lines.push(step)
  }

  // When the user clicks "撤回" in Antigravity IDE and hasn't sent a replacement prompt yet,
  // `transcript.jsonl` on disk is not truncated yet, but LanguageServer's in-memory summary
  // immediately reflects the reverted `stepCount` and `lastUserInputStepIndex`.
  if (liveStatus !== 'CASCADE_RUN_STATUS_RUNNING') {
    if (typeof liveStepCount === 'number' && Number.isFinite(liveStepCount) && liveStepCount > 0) {
      while (
        lines.length > 0
        && typeof lines[lines.length - 1].step_index === 'number'
        && lines[lines.length - 1].step_index >= liveStepCount
      ) {
        lines.pop()
      }
    }
    if (typeof liveLastUserInputStepIndex === 'number' && Number.isFinite(liveLastUserInputStepIndex) && liveLastUserInputStepIndex >= 0) {
      const revertedUserIdx = lines.findIndex(
        s => s.type === 'USER_INPUT' && typeof s.step_index === 'number' && s.step_index > liveLastUserInputStepIndex,
      )
      if (revertedUserIdx > 0) {
        lines.length = revertedUserIdx
      }
    }
  }

  if (lines.length === 0) return null

  const transcript = []
  let boundWs = nativeWorkspace || null
  let cwd = boundWs?.cwd || ''
  let project = boundWs?.project || 'Antigravity IDE'
  let checkpointTitle = ''
  let lastOutput = ''
  let lastConclusionText = ''
  let runningSummary = ''
  let lastActivity = mtimeMs
  let lastUserInputAt = 0
  let lastConclusionAt = 0
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
      lastUserInputAt = stepTime || lastActivity
      runningSummary = '💭 正在思考与分析...'
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

      // Filter silent read-only steps or pure thinking-only steps that have no user-facing content, unless it's the very last step
      const allSilent = tools.length > 0 && tools.every(t => SILENT_TOOLS.has(t.name))
      if ((allSilent || tools.length === 0) && !rawContent && i < lines.length - 1) {
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

      if (tools.length > 0) {
        runningSummary = `🔧 正在执行: ${tools.map(t => t.summary || t.name).join(' · ')}`.slice(0, 240)
      } else if (asstText && step.status !== 'RUNNING') {
        lastConclusionAt = stepTime || lastActivity
        lastConclusionText = asstText.slice(0, 1200)
      } else if (thinkingText) {
        runningSummary = `💭 正在思考: ${thinkingText.replace(/\s+/g, ' ').slice(0, 120)}`
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
        if (!settledApprovals.has(code) && now - lastActivity < 10 * 60 * 1000) {
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
            expiresAt: (stepTime || lastActivity) + 10 * 60 * 1000,
          }
        }
      }
    } else if (stepType === 'RUN_COMMAND' || stepType === 'CODE_ACTION' || stepType === 'GENERIC') {
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
  const lastStepType = String(lastStep.type || '')
  const lastStepTools = Array.isArray(lastStep.tool_calls) ? lastStep.tool_calls : []
  const isConcludedStep = lastStepType === 'PLANNER_RESPONSE'
    && lastStep.status !== 'RUNNING'
    && lastStepTools.length === 0
    && Boolean(String(lastStep.content || '').trim())
  const isErrorStep = lastStepType === 'ERROR_MESSAGE' || lastStep.status === 'ERROR'
  const isMidTurn = !isConcludedStep && !isErrorStep

  const isRecentlyActive = (isMidTurn && (now - lastActivity < 90_000))
    || (isErrorStep && (now - lastActivity < 15_000))

  const status = pendingApproval
    ? 'approval'
    : isRecentlyActive
      ? 'running'
      : 'idle'

  const hasConcludedCurrentTurn = isConcludedStep || (lastConclusionAt > 0 && lastConclusionAt >= lastUserInputAt)
  const turnState = pendingApproval
    ? 'approval'
    : status === 'running'
      ? 'running'
      : isErrorStep
        ? 'interrupted'
        : hasConcludedCurrentTurn
          ? 'conclusion'
          : 'idle'

  const statusLabel = pendingApproval
    ? '⏳ 待审批'
    : status === 'running'
      ? '🟢 运行中'
      : turnState === 'interrupted'
        ? '⚠️ 中断待继续'
        : turnState === 'conclusion'
          ? '🔵 已出结论'
          : '已完成'

  return {
    id: sessionId,
    rawId: conversationId,
    shortId: String(conversationId).slice(0, 8),
    harness: 'antigravity-ide',
    harnessLabel: 'Antigravity IDE',
    title,
    status,
    turnState,
    isMidTurn,
    statusLabel,
    project,
    cwd: cwd || process.cwd(),
    lastActivity,
    updatedAt: lastActivity,
    lastConclusionAt,
    lastInterruptedAt: isErrorStep ? lastActivity : 0,
    lastOutput: lastConclusionText || lastOutput,
    runningSummary: runningSummary || lastOutput,
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
      const fileUriNeedle = Buffer.from('file:///')
      for (const item of candidates) {
        const bufIdx = pbBuf.indexOf(item.convId)
        if (bufIdx === -1) continue
        const subBuf = pbBuf.subarray(bufIdx, Math.min(pbBuf.length, bufIdx + 650))
        const slice = pbStr.slice(pbStr.indexOf(item.convId), pbStr.indexOf(item.convId) + 600)
        const existing = metaMap.get(item.convId) || { title: '', workspace: null }
        const uriRel = subBuf.indexOf(fileUriNeedle)
        if (uriRel > 0 && !existing.workspace) {
          const uriLen = subBuf[uriRel - 1]
          let extractedPath = ''
          if (uriLen >= 9 && uriLen < 180 && uriRel + uriLen <= subBuf.length) {
            extractedPath = subBuf.subarray(uriRel + 7, uriRel + uriLen).toString('utf8')
          } else {
            const wsMatch = slice.match(/file:\/\/(\/Users\/[^"\r\n\x00-\x1f]+|\/home\/[^"\r\n\x00-\x1f]+)/)
            if (wsMatch) extractedPath = wsMatch[1].replace(/B[\x20-\x7e].*$/, '')
          }
          if (extractedPath) {
            const ws = inferWorkspaceFromPath(extractedPath)
            if (ws) existing.workspace = ws
          }
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
  const [nativeMetaMap, liveSummariesMap] = await Promise.all([
    loadAntigravityMetadataForCandidates(brainDirs, topCandidates),
    loadLiveTrajectorySummaries(),
  ])

  const settledKey = settledApprovals ? [...settledApprovals].join(',') : ''
  const sessions = []
  for (const item of topCandidates) {
    try {
      const nativeMeta = nativeMetaMap.get(item.convId)
      const liveSummary = liveSummariesMap.get(item.convId)
      const liveStepCount = liveSummary?.stepCount !== undefined ? Number(liveSummary.stepCount) : null
      const liveLastUserInputStepIndex = liveSummary?.lastUserInputStepIndex !== undefined
        ? Number(liveSummary.lastUserInputStepIndex)
        : null
      const liveStatus = String(liveSummary?.status || '')
      const liveTitle = String(liveSummary?.summary || '').trim()
      const effectiveNativeTitle = nativeMeta?.title || liveTitle || ''
      const sessionId = `${AGY_IDE_PREFIX}${item.convId}`
      const customTitle = customTitles[sessionId] || customTitles[item.convId] || ''
      const cacheKey = `${item.convId}:${item.mtimeMs}:${item.size || 0}:${customTitle}:${effectiveNativeTitle}:${settledKey}:${liveStepCount ?? ''}:${liveLastUserInputStepIndex ?? ''}:${liveStatus}`
      const cached = sessionParseCache.get(item.convId)
      if (cached && cached.cacheKey === cacheKey && cached.session) {
        // Recompute dynamic running/idle status against current `now` while skipping disk read & JSONL parse
        const isRecentlyActive = liveStatus === 'CASCADE_RUN_STATUS_RUNNING'
          || (Boolean(cached.session.isMidTurn) && (now - cached.session.lastActivity <= 90_000) && liveStatus !== 'CASCADE_RUN_STATUS_IDLE')
        const status = cached.session.pendingApproval
          ? 'approval'
          : isRecentlyActive
            ? 'running'
            : 'idle'
        const turnState = cached.session.pendingApproval
          ? 'approval'
          : status === 'running'
            ? 'running'
            : cached.session.turnState === 'running'
              ? 'idle'
              : (cached.session.turnState || 'idle')
        const statusLabel = cached.session.pendingApproval
          ? '⏳ 待审批'
          : status === 'running'
            ? '🟢 运行中'
            : turnState === 'interrupted'
              ? '⚠️ 中断待继续'
              : turnState === 'conclusion'
                ? '🔵 已出结论'
                : '已完成'
        sessions.push({
          ...cached.session,
          status,
          turnState,
          statusLabel,
        })
        continue
      }

      const rawText = await readFile(item.path, 'utf8')
      const parsed = parseAntigravityTranscript(rawText, {
        conversationId: item.convId,
        mtimeMs: item.mtimeMs,
        customTitles,
        nativeTitle: effectiveNativeTitle,
        nativeWorkspace: nativeMeta?.workspace || null,
        settledApprovals,
        maxMessages,
        now,
        liveStepCount,
        liveLastUserInputStepIndex,
        liveStatus,
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

  // If any session has a pendingApproval, check if the command is ALREADY approved and running on the computer
  const pendingSessions = sessions.filter(s => s.pendingApproval?.commandLine)
  if (pendingSessions.length > 0) {
    const psNorm = await getCachedRunningCommandsSnapshot()

    if (psNorm) {
      for (const s of pendingSessions) {
        const cmdNorm = String(s.pendingApproval.commandLine || '').replace(/\s+/g, ' ').trim()
        const subNorm = String(s.pendingApproval.firstSubcommand || '').replace(/\s+/g, ' ').trim()
        const needle = cmdNorm.slice(0, 42)
        const subNeedle = subNorm.slice(0, 42)
        const alreadyRunning = (needle.length >= 6 && psNorm.includes(needle))
          || (subNeedle.length >= 10 && psNorm.includes(subNeedle))

        if (alreadyRunning) {
          if (settledApprovals && typeof settledApprovals.add === 'function') {
            settledApprovals.add(s.pendingApproval.code)
          }
          s.pendingApproval = null
          s.status = 'running'
          s.turnState = 'running'
          s.statusLabel = '🟢 运行中'
          if (Array.isArray(s.transcript) && s.transcript.length > 0) {
            s.transcript[s.transcript.length - 1] = {
              ...s.transcript[s.transcript.length - 1],
              waitingForInput: false,
            }
          }
          sessionParseCache.delete(s.rawId)
        }
      }
    }
  }

  sessions.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  return sessions.slice(0, maxSessions)
}

let cachedPsNorm = ''
let cachedPsNormAt = 0

async function getCachedRunningCommandsSnapshot() {
  const now = Date.now()
  if (cachedPsNorm && now - cachedPsNormAt < 2500) {
    return cachedPsNorm
  }
  try {
    const { stdout } = await execFileAsync('ps', ['-ax', '-o', 'command='], { timeout: 1200 })
    cachedPsNorm = String(stdout || '')
      .split('\n')
      .filter(line => !line.includes('ps -ax -o command='))
      .map(line => line.replace(/\s+/g, ' ').trim())
      .join('\n')
    cachedPsNormAt = now
  } catch {
    cachedPsNorm = ''
  }
  return cachedPsNorm
}

let cachedLiveSummaries = new Map()
let cachedLiveSummariesAt = 0

async function loadLiveTrajectorySummaries() {
  const now = Date.now()
  if (now - cachedLiveSummariesAt < 700) {
    return cachedLiveSummaries
  }
  cachedLiveSummariesAt = now
  const map = new Map()
  if (typeof globalThis.fetch !== 'function') return map
  try {
    const hubs = await discoverAntigravityHubInstances()
    await Promise.all(
      hubs.map(async hub => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 450)
        timer.unref?.()
        try {
          const resp = await globalThis.fetch(
            `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetAllCascadeTrajectories`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-codeium-csrf-token': hub.csrfToken,
              },
              body: JSON.stringify({}),
              signal: controller.signal,
            },
          )
          if (!resp.ok) return
          const data = await resp.json().catch(() => null)
          const summaries = data?.trajectorySummaries
          if (!summaries || typeof summaries !== 'object') return
          for (const [cid, sum] of Object.entries(summaries)) {
            if (cid && sum && typeof sum === 'object') {
              map.set(cid, sum)
            }
          }
        } catch {
          // ignore unreachable hub port
        } finally {
          clearTimeout(timer)
        }
      }),
    )
  } catch {
    // ignore discovery error
  }
  cachedLiveSummaries = map
  return map
}

let cachedRawHubInstances = null
let cachedRawHubInstancesAt = 0

/**
 * Discover running Antigravity IDE LanguageServer (`agy --hub --hub-port=<PORT> --csrf_token=<TOKEN>`
 * as well as standalone `Antigravity.app` `language_server --csrf_token <TOKEN>`) instances.
 * Prioritizes the instance whose `--add-dir` matches `preferredCwd`.
 */
export async function discoverAntigravityHubInstances({
  execImpl = execFileAsync,
  preferredCwd = '',
} = {}) {
  const instances = []
  const seenAddresses = new Set()

  const addInstance = ({ address, port, csrfToken, addDir = '', addDirs = [], binPath = '', kind = 'agy-hub' }) => {
    const rawAddr = String(address || (port ? `127.0.0.1:${port}` : '')).trim()
    const normAddr = rawAddr.replace(/^localhost:/i, '127.0.0.1:')
    const token = String(csrfToken || '').trim()
    if (!normAddr || !token || seenAddresses.has(normAddr)) return
    seenAddresses.add(normAddr)
    const cleanDirs = [...new Set([...(Array.isArray(addDirs) ? addDirs : []), addDir].map(d => String(d || '').trim()).filter(Boolean))]
    instances.push({
      address: normAddr,
      port: Number(port) || Number(normAddr.split(':')[1]) || 0,
      csrfToken: token,
      addDir: cleanDirs[0] || '',
      addDirs: cleanDirs,
      binPath: String(binPath || '').trim(),
      kind,
    })
  }

  if (execImpl === execFileAsync) {
    const now = Date.now()
    if (cachedRawHubInstances && now - cachedRawHubInstancesAt < 10_000) {
      for (const inst of cachedRawHubInstances) addInstance(inst)
    } else {
      try {
        const { stdout } = await execFileAsync('ps', ['-ax', '-o', 'pid=,command='], { timeout: 2000 })
        const standalonePids = []
        for (const rawLine of String(stdout || '').split('\n')) {
          const line = rawLine.trim()
          if (!line) continue
          const pidMatch = line.match(/^(\d+)\s+(.*)$/)
          const pid = pidMatch ? pidMatch[1] : ''
          const cmdLine = pidMatch ? pidMatch[2] : line

          if (cmdLine.includes('--hub') && cmdLine.includes('--hub-port=') && cmdLine.includes('--csrf_token=')) {
            const portMatch = cmdLine.match(/--hub-port=(\d+)/)
            const csrfMatch = cmdLine.match(/--csrf_token=([^\s]+)/)
            const dirs = [...cmdLine.matchAll(/--add-dir=([^\s]+)/g)].map(m => m[1])
            const binMatch = cmdLine.match(/^(\S+\/agy)\b/)
            if (portMatch && csrfMatch) {
              addInstance({
                address: `127.0.0.1:${portMatch[1]}`,
                port: Number(portMatch[1]),
                csrfToken: csrfMatch[1],
                addDir: dirs[0] || '',
                addDirs: dirs,
                binPath: binMatch ? binMatch[1] : '',
                kind: 'agy-hub',
              })
            }
            continue
          }

          if (cmdLine.includes('language_server') && cmdLine.includes('--csrf_token') && pid) {
            const csrfMatch = cmdLine.match(/--csrf_token[= ]([^\s]+)/)
            const binMatch = cmdLine.match(/^(\S+\/language_server)\b/)
            if (csrfMatch) {
              standalonePids.push({
                pid,
                csrfToken: csrfMatch[1],
                binPath: binMatch ? binMatch[1] : '',
              })
            }
          }
        }

        for (const lsProc of standalonePids) {
          try {
            const { stdout: lsofOut } = await execFileAsync(
              'lsof',
              ['-Pan', '-p', lsProc.pid, '-iTCP', '-sTCP:LISTEN'],
              { timeout: 1500 },
            )
            // LanguageServer HTTP port is typically the second listening port after the gRPC port; collect first 3 loopback ports
            const ports = [...String(lsofOut || '').matchAll(/127\.0\.0\.1:(\d+)/g)].map(m => Number(m[1]))
            for (const p of ports.slice(0, 3)) {
              addInstance({
                address: `127.0.0.1:${p}`,
                port: p,
                csrfToken: lsProc.csrfToken,
                binPath: lsProc.binPath,
                kind: 'ls-standalone',
              })
            }
          } catch {
            // ignore lsof failure
          }
        }
        cachedRawHubInstances = instances.map(inst => ({ ...inst }))
        cachedRawHubInstancesAt = now
      } catch {
        // ignore ps failure
      }
    }
  }

  if (process.env.ANTIGRAVITY_LS_ADDRESS && process.env.ANTIGRAVITY_CSRF_TOKEN) {
    addInstance({
      address: process.env.ANTIGRAVITY_LS_ADDRESS,
      csrfToken: process.env.ANTIGRAVITY_CSRF_TOKEN,
    })
  }

  const targetCwd = String(preferredCwd || '').trim()
  if (targetCwd && instances.length > 1) {
    const matchesDir = inst => {
      const dirs = Array.isArray(inst.addDirs) && inst.addDirs.length > 0 ? inst.addDirs : (inst.addDir ? [inst.addDir] : [])
      return dirs.some(d => d === targetCwd || targetCwd.startsWith(d + '/') || d.startsWith(targetCwd + '/')) ? 1 : 0
    }
    instances.sort((a, b) => matchesDir(b) - matchesDir(a))
  }

  return instances
}

function buildCleanAgentApiEnv(hub) {
  const env = { ...process.env }
  for (const k of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'http_proxy',
    'https_proxy',
    'ALL_PROXY',
    'all_proxy',
    'RPC_PROXY_DEST_OVERRIDE',
    'RPC_PROXY_HEADER_AS_EXTENSION',
  ]) {
    delete env[k]
  }
  if (hub?.address) env.ANTIGRAVITY_LS_ADDRESS = hub.address
  if (hub?.csrfToken) env.ANTIGRAVITY_CSRF_TOKEN = hub.csrfToken
  return env
}

async function resolveCascadeConfigForHub(hub, rawConvId, fetchImpl, peerTrajectoryIds = []) {
  const headers = {
    'Content-Type': 'application/json',
    'x-codeium-csrf-token': hub.csrfToken,
  }
  const candidateIds = [...new Set([rawConvId, ...peerTrajectoryIds].filter(Boolean))]
  for (const cid of candidateIds) {
    try {
      const resp = await fetchImpl(
        `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetCascadeTrajectorySteps`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ cascadeId: cid, stepOffset: 0 }),
        },
      )
      if (!resp.ok) continue
      const data = await resp.json().catch(() => ({}))
      const steps = Array.isArray(data?.steps) ? data.steps : []
      for (let i = steps.length - 1; i >= 0; i -= 1) {
        const ui = steps[i]?.userInput
        if (ui?.userConfig?.plannerConfig?.planModel) {
          return {
            cascadeConfig: ui.userConfig,
            customAgentSpec: ui.userAgentSpec || undefined,
          }
        }
      }
    } catch {
      // try next trajectory
    }
  }

  let planModel = 'MODEL_PLACEHOLDER_M417'
  try {
    const resp = await fetchImpl(
      `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetCascadeModelConfigData`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      },
    )
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}))
      const firstModel = data?.clientModelConfigs?.[0]?.modelOrAlias?.model
      if (firstModel) planModel = firstModel
    }
  } catch {
    // use default placeholder model
  }

  return {
    cascadeConfig: {
      plannerConfig: {
        planModel,
        useAiCredits: true,
        supportsLatexRendering: true,
        toolConfig: {
          runCommand: {
            autoCommandConfig: {
              autoExecutionPolicy: 'CASCADE_COMMANDS_AUTO_EXECUTION_AUTO',
            },
          },
          antigravityBrowser: {
            enableBrowserSubagentWebview: false,
          },
          notifyUser: {},
        },
      },
      executorConfig: {
        useCoreDirect: true,
      },
      conversationHistoryConfig: {},
    },
    customAgentSpec: {
      builtinAgent: {
        defaultAgent: {
          isGoogle: false,
          isInteractive: true,
          surface: 'AGENT_SURFACE_HUB',
        },
      },
    },
  }
}

async function probeHubsForTrajectory(hubs, rawConvId, fetchImpl) {
  const probed = []
  for (const hub of hubs) {
    try {
      const resp = await fetchImpl(
        `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetAllCascadeTrajectories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-codeium-csrf-token': hub.csrfToken,
          },
          body: JSON.stringify({}),
        },
      )
      if (!resp.ok) continue
      const data = await resp.json().catch(() => null)
      if (!data || typeof data !== 'object') continue
      const summaries = data.trajectorySummaries && typeof data.trajectorySummaries === 'object'
        ? data.trajectorySummaries
        : {}
      const trajectoryIds = Object.keys(summaries)
      probed.push({
        ...hub,
        hasTargetTrajectory: Boolean(rawConvId && summaries[rawConvId]),
        trajectoryIds,
      })
    } catch {
      // If mock fetchImpl doesn't handle GetAllCascadeTrajectories, still keep hub as fallback candidate
    }
  }
  if (probed.length === 0) {
    return hubs.map(h => ({ ...h, hasTargetTrajectory: true, trajectoryIds: [] }))
  }
  probed.sort((a, b) => Number(b.hasTargetTrajectory) - Number(a.hasTargetTrajectory))
  return probed
}

/**
 * Execute remote control actions targeting Antigravity IDE:
 * - `approve`: Trigger Antigravity IDE's acceptAgentStep (`Option + Enter` / `Enter` or numbered option `1`/`2`/`3` + `Enter`)
 * - `deny`: Trigger Antigravity IDE's rejectAgentStep (`Option + Shift + Enter` / `Escape` or option `4`)
 * - `stop`: Trigger Antigravity IDE's CancelCascadeInvocation RPC or interruptAgent (`Escape`)
 * - `prompt` / `steer`: Send message via Connect-RPC `SendUserCascadeMessage` or official `agentapi send-message <id> <text>` with discovered LS port + CSRF token, falling back to UI focus
 * - `new_session`: Create a new Antigravity IDE conversation via `agentapi new-conversation` or `Cmd + Shift + L`
 */
export async function executeAntigravityIdeAction(action, {
  home = homedir(),
  execImpl = execFileAsync,
  fetchImpl = globalThis.fetch,
} = {}) {
  const type = String(action?.type ?? '').trim()
  const rawConvId = toRawConversationId(action?.agentId || action?.conversationId || '')
  const optionIndex = Number(action?.optionIndex) || 1
  const preferredCwd = String(action?.cwd ?? '').trim()

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
    if (rawConvId && typeof fetchImpl === 'function') {
      const hubs = await discoverAntigravityHubInstances({ execImpl, preferredCwd })
      for (const hub of hubs) {
        try {
          const resp = await fetchImpl(
            `http://${hub.address}/exa.language_server_pb.LanguageServerService/CancelCascadeInvocation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-codeium-csrf-token': hub.csrfToken,
              },
              body: JSON.stringify({ cascadeId: rawConvId }),
            },
          )
          if (resp.ok) {
            return {
              ok: true,
              engine: 'connect-rpc',
              message: '⏹️ 已通过 Antigravity RPC 停止当前任务',
            }
          }
        } catch {
          // try next hub or fallback
        }
      }
    }
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

    const hubs = await discoverAntigravityHubInstances({ execImpl, preferredCwd })

    // Strategy 1A: Direct Connect-RPC `SendUserCascadeMessage` (with LoadTrajectory + inherited cascadeConfig)
    if (rawConvId && typeof fetchImpl === 'function' && hubs.length > 0) {
      const orderedHubs = await probeHubsForTrajectory(hubs, rawConvId, fetchImpl)
      for (const hub of orderedHubs) {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'x-codeium-csrf-token': hub.csrfToken,
          }
          if (!hub.hasTargetTrajectory) {
            await fetchImpl(
              `http://${hub.address}/exa.language_server_pb.LanguageServerService/LoadTrajectory`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({ cascadeId: rawConvId }),
              },
            ).catch(() => {})
          }
          const { cascadeConfig, customAgentSpec } = await resolveCascadeConfigForHub(
            hub,
            rawConvId,
            fetchImpl,
            hub.trajectoryIds || [],
          )
          const resp = await fetchImpl(
            `http://${hub.address}/exa.language_server_pb.LanguageServerService/SendUserCascadeMessage`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                cascadeId: rawConvId,
                items: [{ text }],
                cascadeConfig,
                customAgentSpec,
                ...(type === 'steer'
                  ? { deliveryStrategy: 'MESSAGE_DELIVERY_STRATEGY_NEXT_INVOCATION' }
                  : {}),
              }),
            },
          )
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}))
            if (!data?.error && !data?.code) {
              return {
                ok: true,
                agentId: `${AGY_IDE_PREFIX}${rawConvId}`,
                method: 'connect-rpc',
                message: '📨 已通过 Antigravity RPC 通道投递指令',
              }
            }
          }
        } catch {
          // Try next hub or Strategy 1B
        }
      }
    }

    // Strategy 1B: Official `agentapi send-message <convId> <text>` with discovered LS address + CSRF token
    const agentApiCandidates = [
      ...hubs.map(h => h.binPath).filter(Boolean),
      join(home, '.gemini', 'antigravity', 'bin', 'agentapi'),
      join(home, '.gemini', 'bin', 'agy'),
    ]
    const uniqueBins = [...new Set(agentApiCandidates)]
    const envTargets = hubs.length > 0
      ? hubs.map(h => buildCleanAgentApiEnv(h))
      : [buildCleanAgentApiEnv(null)]

    for (const binPath of uniqueBins) {
      try {
        await access(binPath)
      } catch {
        continue
      }
      const args = binPath.endsWith('/agy')
        ? ['agentapi', 'send-message', rawConvId, text]
        : ['send-message', rawConvId, text]
      for (const envOpt of envTargets) {
        try {
          const execOpts = envOpt ? { timeout: 8000, env: envOpt } : { timeout: 8000 }
          const { stdout } = await execImpl(binPath, args, execOpts)
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
          // Try next hub env or fallback to Strategy 2
        }
      }
    }

    // Strategy 2: Focus Antigravity IDE chat panel and paste prompt
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
    const hubs = await discoverAntigravityHubInstances({ execImpl, preferredCwd })

    // Strategy 1A: Direct Connect-RPC `StartCascade` + `SendUserCascadeMessage`
    if (typeof fetchImpl === 'function' && hubs.length > 0) {
      const orderedHubs = await probeHubsForTrajectory(hubs, '', fetchImpl)
      for (const hub of orderedHubs) {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'x-codeium-csrf-token': hub.csrfToken,
          }
          const wsUri = preferredCwd
            ? `file://${preferredCwd}`
            : (hub.addDir ? `file://${hub.addDir}` : '')
          const startResp = await fetchImpl(
            `http://${hub.address}/exa.language_server_pb.LanguageServerService/StartCascade`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                source: 'CORTEX_TRAJECTORY_SOURCE_CASCADE_CLIENT',
                trajectoryType: 'CORTEX_TRAJECTORY_TYPE_CASCADE',
                workspaceUris: wsUri ? [wsUri] : [],
              }),
            },
          )
          if (startResp.ok) {
            const startData = await startResp.json().catch(() => ({}))
            const newCascadeId = startData?.cascadeId
            if (newCascadeId) {
              if (promptText) {
                const { cascadeConfig, customAgentSpec } = await resolveCascadeConfigForHub(
                  hub,
                  newCascadeId,
                  fetchImpl,
                  hub.trajectoryIds || [],
                )
                await fetchImpl(
                  `http://${hub.address}/exa.language_server_pb.LanguageServerService/SendUserCascadeMessage`,
                  {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                      cascadeId: newCascadeId,
                      items: [{ text: promptText }],
                      cascadeConfig,
                      customAgentSpec,
                    }),
                  },
                )
              }
              return {
                ok: true,
                agentId: `${AGY_IDE_PREFIX}${newCascadeId}`,
                title,
                method: 'connect-rpc',
                message: `⚡ 已在 Antigravity IDE 创建新对话「${title}」`,
              }
            }
          }
        } catch {
          // Try next hub or Strategy 1B
        }
      }
    }

    const agentApiCandidates = [
      ...hubs.map(h => h.binPath).filter(Boolean),
      join(home, '.gemini', 'antigravity', 'bin', 'agentapi'),
      join(home, '.gemini', 'bin', 'agy'),
    ]
    const uniqueBins = [...new Set(agentApiCandidates)]
    const envTargets = hubs.length > 0
      ? hubs.map(h => buildCleanAgentApiEnv(h))
      : [buildCleanAgentApiEnv(null)]

    for (const binPath of uniqueBins) {
      try {
        await access(binPath)
      } catch {
        continue
      }
      const args = binPath.endsWith('/agy')
        ? ['agentapi', 'new-conversation', `--title=${title}`, '--', promptText || '你好']
        : ['new-conversation', `--title=${title}`, promptText || '你好']
      for (const envOpt of envTargets) {
        try {
          const execOpts = envOpt ? { timeout: 8000, env: envOpt } : { timeout: 8000 }
          const { stdout } = await execImpl(binPath, args, execOpts)
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
          // Try next hub or fallback
        }
      }
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
