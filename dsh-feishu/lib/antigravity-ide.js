import { execFile } from 'node:child_process'
import { access, open, readdir, readFile, stat } from 'node:fs/promises'
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

function parseArtifactMetadata(rawMeta) {
  if (!rawMeta) return null
  if (typeof rawMeta === 'object') return rawMeta
  if (typeof rawMeta === 'string') {
    const trimmed = rawMeta.trim()
    try {
      const first = JSON.parse(trimmed)
      if (typeof first === 'string') {
        try {
          return JSON.parse(first)
        } catch {
          return { Summary: first }
        }
      }
      return first
    } catch {
      const unquoted = trimmed.replace(/^"(.*)"$/s, '$1').replace(/\\"/g, '"').replace(/\\n/g, '\n')
      try {
        return JSON.parse(unquoted)
      } catch {
        return { Summary: unquoted }
      }
    }
  }
  return null
}

function isBrainArtifactPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return false
  const cleaned = rawPath.replace(/^file:\/\//i, '').trim()
  if (!cleaned.includes('/.gemini/antigravity/brain/') && !cleaned.includes('/.gemini/antigravity-ide/brain/')) {
    return false
  }
  if (
    cleaned.includes('/scratch/')
    || cleaned.includes('/.system_generated/')
    || cleaned.includes('/.user_uploaded/')
    || cleaned.includes('/tempmediaStorage/')
  ) {
    return false
  }
  return /\.(md|markdown|html)$/i.test(cleaned) && !/\.metadata\.json$/i.test(cleaned)
}

export function buildArtifactDescriptor(filePath, rawMeta = null) {
  const cleanPath = String(filePath || '').replace(/^file:\/\//i, '').trim()
  if (!cleanPath) return null
  const name = basename(cleanPath)
  if (!name || name.startsWith('.') || /\.metadata\.json$/i.test(name)) return null
  const lower = name.toLowerCase()
  const meta = parseArtifactMetadata(rawMeta)
  const rawType = String(meta?.ArtifactType || meta?.artifactType || '').toLowerCase()
  const artifactType = rawType.includes('walkthrough') || lower === 'walkthrough.md' || lower.includes('walkthrough')
    ? 'walkthrough'
    : rawType.includes('plan') || lower === 'implementation_plan.md' || lower.includes('_plan.md') || lower.includes('plan')
      ? 'plan'
      : rawType.includes('task') || lower === 'task.md'
        ? 'task'
        : 'artifact'
  const title = artifactType === 'walkthrough'
    ? 'Walkthrough'
    : artifactType === 'plan'
      ? 'Implementation Plan'
      : artifactType === 'task'
        ? 'Task List'
        : name.replace(/\.(md|markdown)$/i, '')
  const summary = String(meta?.Summary || meta?.summary || '').replace(/\s+/g, ' ').trim().slice(0, 320)
  const requestFeedback = Boolean(meta?.RequestFeedback ?? meta?.requestFeedback)
  const userFacing = meta?.UserFacing !== undefined
    ? Boolean(meta.UserFacing)
    : meta?.userFacing !== undefined
      ? Boolean(meta.userFacing)
      : true
  return {
    path: cleanPath,
    name,
    title,
    kind: artifactType,
    artifactType,
    summary,
    requestFeedback,
    userFacing,
  }
}

/**
 * Parse tool_calls array from an Antigravity PLANNER_RESPONSE step.
 */
export function parseAntigravityToolCalls(rawToolCalls) {
  if (!Array.isArray(rawToolCalls)) {
    return { tools: [], inferredWs: null, approvalRequest: null, fileChanges: [], artifacts: [] }
  }
  const tools = []
  const fileChanges = []
  const artifacts = []
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

    const isWriteOrEdit =
      name === 'edit_file'
      || name === 'write_file'
      || name === 'write_to_file'
      || name === 'replace_file_content'
      || name === 'multi_replace_file_content'

    const rawArtifactMeta = args.ArtifactMetadata ?? args.artifactMetadata ?? null
    let detectedArtifact = null
    if (isWriteOrEdit && (rawArtifactMeta || isBrainArtifactPath(pathArg))) {
      detectedArtifact = buildArtifactDescriptor(pathArg, rawArtifactMeta)
      if (detectedArtifact && detectedArtifact.userFacing !== false) {
        artifacts.push(detectedArtifact)
      }
    }

    if (isWriteOrEdit && pathArg && !pathArg.includes('/.gemini/antigravity')) {
      const targetStr = String(unquote(args.Target || args.TargetContent || '') || '')
      const replacementStr = String(unquote(args.Replacement || args.ReplacementContent || args.Content || args.CodeContent || '') || '')
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
    const isDaemonRaw = args.IsDaemon
    const isDaemon = isDaemonRaw === true || isDaemonRaw === 'true' || isDaemonRaw === '"true"'

    const defaultToolSummary = detectedArtifact
      ? `${name === 'edit_file' || name.includes('replace') ? 'Updated' : 'Created'} ${detectedArtifact.title} (${detectedArtifact.name})`
      : isWriteOrEdit && pathArg
        ? `${name === 'edit_file' || name.includes('replace') ? 'Edited' : 'Wrote'} ${basename(pathArg)}`
        : (name === 'read_file' || name === 'view_file') && pathArg
          ? `Read ${basename(pathArg)}`
          : name

    const defaultCommandLine = cmdLine
      ? cmdLine.slice(0, 2000)
      : detectedArtifact
        ? `${detectedArtifact.path}${detectedArtifact.summary ? `\n${detectedArtifact.summary}` : ''}`
        : pathArg || ''

    tools.push({
      name,
      id: String(tc.id || ''),
      summary: toolSummary || (cmdLine ? `执行: ${cmdLine.slice(0, 80)}` : defaultToolSummary),
      commandLine: defaultCommandLine,
      ...(pathArg ? { filePath: pathArg } : {}),
      ...(rawArtifactMeta ? { artifactMeta: parseArtifactMetadata(rawArtifactMeta) } : {}),
      bypassSandbox,
      isDaemon,
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

  return { tools, inferredWs, approvalRequest, fileChanges, artifacts }
}

/**
 * When `transcript.jsonl` has `"truncated_fields": ["content"]` on `PLANNER_RESPONSE` steps,
 * hydrate the full untruncated `content` from `transcript_full.jsonl` in the same directory.
 */
async function loadTruncatedStepContents(compactPath, rawCompactText) {
  if (!compactPath || !compactPath.endsWith('transcript.jsonl')) return null
  if (!rawCompactText || !rawCompactText.includes('"truncated_fields"')) return null
  const fullPath = join(dirname(compactPath), 'transcript_full.jsonl')
  let fh = null
  try {
    const st = await stat(fullPath)
    if (!st.isFile() || st.size <= 0) return null
    const maxBytes = 8 * 1024 * 1024 // Read up to the last 8MB of transcript_full.jsonl
    const readLen = Math.min(st.size, maxBytes)
    const offset = Math.max(0, st.size - readLen)
    fh = await open(fullPath, 'r')
    const buf = Buffer.allocUnsafe(readLen)
    const { bytesRead } = await fh.read(buf, 0, readLen, offset)
    await fh.close()
    fh = null
    const text = buf.subarray(0, bytesRead).toString('utf8')
    const map = new Map()
    const rawLines = text.split('\n')
    // If we started mid-file, skip the first potentially partial line
    const startIdx = offset > 0 ? 1 : 0
    for (let i = startIdx; i < rawLines.length; i += 1) {
      const line = rawLines[i].trim()
      if (!line || !line.includes('"PLANNER_RESPONSE"')) continue
      try {
        const obj = JSON.parse(line)
        if (obj && obj.type === 'PLANNER_RESPONSE' && typeof obj.step_index === 'number' && typeof obj.content === 'string' && obj.content) {
          map.set(obj.step_index, obj.content)
        }
      } catch {
        // ignore partial/invalid line
      }
    }
    return map.size > 0 ? map : null
  } catch {
    if (fh) {
      try { await fh.close() } catch { }
    }
    return null
  }
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
  liveModel = '',
  hasLiveSummary = false,
  liveWaitingSteps = null,
  fullContentByStepIndex = null,
  diskArtifacts = [],
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
  const pendingBackgroundTaskIds = new Set()
  const changedFilesMap = new Map()
  const artifactsMap = new Map()
  if (Array.isArray(diskArtifacts)) {
    for (const da of diskArtifacts) {
      if (da && da.path) artifactsMap.set(da.path, { ...da })
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const step = lines[i]
    const stepType = String(step.type || '')
    const stepTime = step.created_at ? Date.parse(step.created_at) : 0
    if (Number.isFinite(stepTime) && stepTime > lastActivity) {
      lastActivity = stepTime
    }

    if (stepType === 'SYSTEM_MESSAGE' || (typeof step.content === 'string' && step.content.includes('<SYSTEM_MESSAGE>'))) {
      const sysContent = String(step.content || '')
      for (const m of sysContent.matchAll(/Task id "([^"]+)" finished/g)) {
        if (m[1]) pendingBackgroundTaskIds.delete(m[1].trim().replace(/[.,;]+$/, ''))
      }
      for (const m of sysContent.matchAll(/sender=([^\s\r\n>]+)/g)) {
        if (m[1]) pendingBackgroundTaskIds.delete(m[1].trim().replace(/[.,;]+$/, ''))
      }
      if (stepType === 'SYSTEM_MESSAGE') continue
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
      pendingBackgroundTaskIds.clear()
      lastConclusionAt = 0
      lastConclusionText = ''
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
      let fullStepContent = String(step.content ?? '')
      if (
        fullContentByStepIndex instanceof Map
        && typeof step.step_index === 'number'
        && fullContentByStepIndex.has(step.step_index)
      ) {
        const candidate = String(fullContentByStepIndex.get(step.step_index) || '')
        if (candidate.length > fullStepContent.length) {
          fullStepContent = candidate
        }
      }
      if (Array.isArray(step.media) && step.media.length > 0) {
        for (const m of step.media) {
          const uri = String(m?.uri || '').trim()
          const mime = String(m?.mime_type || '').trim().toLowerCase()
          if (!uri) continue
          const isImg = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(uri)
          if (isImg && !fullStepContent.includes(uri)) {
            const cleanUri = uri.replace(/^file:\/\//i, '')
            fullStepContent += `\n\n![${basename(cleanUri)}](${cleanUri})`
          }
        }
      }
      const rawContent = fullStepContent.trim()
      const rawThinking = String(step.thinking ?? '').trim()
      const { tools, inferredWs, approvalRequest, fileChanges, artifacts } = parseAntigravityToolCalls(step.tool_calls)
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

      if (Array.isArray(artifacts) && artifacts.length > 0) {
        for (let aIdx = 0; aIdx < artifacts.length; aIdx += 1) {
          const art = artifacts[aIdx]
          if (art && art.path) {
            const existing = artifactsMap.get(art.path)
            const merged = existing
              ? {
                ...existing,
                ...art,
                summary: art.summary || existing.summary || '',
              }
              : art
            artifacts[aIdx] = merged
            artifactsMap.set(art.path, { ...merged, updatedAt: stepTime || lastActivity })
          }
        }
      }

      // Filter silent read-only steps or pure thinking-only steps that have no user-facing content, unless it's the very last step
      const allSilent = tools.length > 0 && tools.every(t => SILENT_TOOLS.has(t.name))
      if ((allSilent || tools.length === 0) && !rawContent && (!artifacts || artifacts.length === 0) && i < lines.length - 1) {
        continue
      }
      if (!rawContent && !rawThinking && tools.length === 0) {
        continue
      }

      let asstText = cleanForChat(redactText(rawContent), 48000)
      if (Array.isArray(artifacts) && artifacts.length > 0) {
        const missingLinks = artifacts
          .filter(art => art?.path && !asstText.includes(art.path) && !asstText.includes(art.name))
          .map(art => {
            const summaryLine = art.summary ? `\n> ${art.summary.replace(/\r?\n/g, ' ').slice(0, 180)}` : ''
            return `📋 **[${art.title || 'Walkthrough'}: ${art.name}](file://${art.path})**${summaryLine}`
          })
        if (missingLinks.length > 0) {
          asstText = asstText
            ? `${asstText}\n\n${missingLinks.join('\n\n')}`
            : missingLinks.join('\n\n')
        }
      }
      const thinkingText = cleanForChat(redactText(rawThinking), 8000)
      if (asstText) {
        lastOutput = asstText.slice(0, 600)
      } else if (tools.length > 0 && !lastOutput) {
        lastOutput = tools.map(t => t.summary || t.name).join(' · ').slice(0, 400)
      }

      if (tools.length > 0) {
        lastConclusionAt = 0
        runningSummary = `🔧 正在执行: ${tools.map(t => t.summary || t.name).join(' · ')}`.slice(0, 240)
      } else if (asstText && step.status !== 'RUNNING') {
        if (pendingBackgroundTaskIds.size > 0) {
          lastConclusionAt = 0
          runningSummary = `⏳ 等待后台任务完成: ${asstText.replace(/\s+/g, ' ').slice(0, 120)}`
        } else {
          lastConclusionAt = stepTime || lastActivity
          lastConclusionText = asstText.slice(0, 600)
        }
      } else if (thinkingText) {
        lastConclusionAt = 0
        runningSummary = `💭 正在思考: ${thinkingText.replace(/\s+/g, ' ').slice(0, 120)}`
      }

      const activeLiveWaiting = hasLiveSummary
        ? (Array.isArray(liveWaitingSteps) && liveWaitingSteps.length > 0 ? liveWaitingSteps[0] : null)
        : null
      const livePermSpec = activeLiveWaiting?.step?.requestedInteraction?.permission
        || (activeLiveWaiting?.step?.requestedInteraction?.interaction?.case === 'permission'
          ? activeLiveWaiting.step.requestedInteraction.interaction.value
          : null)

      let effectiveApprovalRequest = approvalRequest
      if (!effectiveApprovalRequest && activeLiveWaiting && i === lines.length - 1) {
        const targetCmd = String(livePermSpec?.resource?.target || tools[0]?.commandLine || '').trim()
        const actDesc = String(livePermSpec?.actionDescription || tools[0]?.summary || 'command execution').trim()
        const lowerAct = actDesc ? actDesc.charAt(0).toLowerCase() + actDesc.slice(1) : 'command execution'
        const firstSub = (targetCmd.split(/\s*(?:&&|\|\||;|\n)\s*/)[0] || targetCmd).trim()
        const persistLabel = String(livePermSpec?.suggestedPersistPattern || firstSub || targetCmd).trim()
        effectiveApprovalRequest = {
          toolName: livePermSpec?.resource?.action ? `permission (${livePermSpec.resource.action})` : 'run_command (BypassSandbox)',
          promptTitle: `Allow ${lowerAct}?`,
          subtitle: String(livePermSpec?.reason || 'the auto-run safety check did not reach a decision'),
          commandLine: targetCmd || '请求宿主机终端执行权限',
          firstSubcommand: firstSub,
          options: [
            { index: 1, label: 'Yes, allow this time' },
            { index: 2, label: persistLabel ? `Yes, and always allow '${persistLabel}' in this conversation` : 'Yes, and always allow in this conversation' },
            { index: 3, label: persistLabel ? `Yes, and always allow '${persistLabel}'` : 'Yes, and always allow' },
            { index: 4, label: 'No (tell the agent what to do instead)' },
          ],
          reason: `${actDesc ? `${actDesc}: ` : ''}${targetCmd || '请求宿主机终端执行权限'}`.slice(0, 2000),
        }
      }

      // When LanguageServer live trajectory summary is available (`hasLiveSummary === true`),
      // ONLY mark as waiting for approval when LanguageServer reports a step in `waitingSteps` (`CORTEX_STEP_STATUS_WAITING`).
      // Commands that were auto-approved on the computer ("Always allow") have `waitingSteps = []` and must NOT pop up on mobile.
      const isWaitingApproval = i === lines.length - 1
        && (hasLiveSummary ? Boolean(activeLiveWaiting && effectiveApprovalRequest) : Boolean(effectiveApprovalRequest))

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
        isToolStepOnly: !asstText && tools.length > 0 && (!artifacts || artifacts.length === 0),
        waitingForInput: isWaitingApproval,
        thinking: thinkingText,
        tools,
        toolCalls: tools,
        artifacts: Array.isArray(artifacts) && artifacts.length > 0 ? artifacts : undefined,
        time: stepTime || lastActivity,
      })

      // Check if this step is currently waiting for user approval (no subsequent completion step yet)
      if (isWaitingApproval && effectiveApprovalRequest) {
        const code = `AGY-${String(conversationId).slice(0, 6).toUpperCase()}-${step.step_index ?? i}`
        const waitingStepIndex = activeLiveWaiting?.step?.metadata?.sourceTrajectoryStepInfo?.stepIndex
          ?? activeLiveWaiting?.stepIndex
          ?? ((typeof step.step_index === 'number' ? step.step_index : i) + 1)
        const waitingTrajectoryId = activeLiveWaiting?.step?.metadata?.sourceTrajectoryStepInfo?.trajectoryId
          || conversationId
        if (!settledApprovals.has(code) && now - lastActivity < 10 * 60 * 1000) {
          pendingApproval = {
            code,
            stepIndex: step.step_index ?? i,
            waitingStepIndex,
            trajectoryId: waitingTrajectoryId,
            permissionAction: livePermSpec?.resource?.action || 'unsandboxed',
            permissionTarget: livePermSpec?.resource?.target || effectiveApprovalRequest.commandLine || '',
            suggestedPersistPattern: livePermSpec?.suggestedPersistPattern || '',
            persistSuggestionType: livePermSpec?.persistSuggestionType || '',
            harness: 'antigravity-ide',
            toolName: effectiveApprovalRequest.toolName,
            promptTitle: effectiveApprovalRequest.promptTitle || '',
            subtitle: effectiveApprovalRequest.subtitle || '',
            commandLine: effectiveApprovalRequest.commandLine || '',
            firstSubcommand: effectiveApprovalRequest.firstSubcommand || '',
            options: effectiveApprovalRequest.options || [],
            reason: effectiveApprovalRequest.reason,
            createdAt: stepTime || lastActivity,
            expiresAt: (stepTime || lastActivity) + 10 * 60 * 1000,
          }
        }
      }
    } else if (stepType === 'RUN_COMMAND' || stepType === 'CODE_ACTION' || stepType === 'GENERIC') {
      pendingApproval = null
      lastConclusionAt = 0
      if (stepType === 'CODE_ACTION' && typeof step.content === 'string') {
        const createdMatch = step.content.match(/Created file file:\/\/(\/[^\s\r\n]+)/i)
          || step.content.match(/\bto:\s*(\/[^\s\r\n]+\.md)\b/i)
        if (createdMatch && createdMatch[1] && isBrainArtifactPath(createdMatch[1])) {
          const desc = buildArtifactDescriptor(createdMatch[1], null)
          if (desc) {
            const existing = artifactsMap.get(desc.path)
            const merged = existing ? { ...desc, ...existing } : desc
            artifactsMap.set(desc.path, { ...merged, updatedAt: stepTime || lastActivity })
            const prevAsst = transcript.at(-1)
            if (prevAsst && prevAsst.role === 'assistant') {
              const curArts = Array.isArray(prevAsst.artifacts) ? prevAsst.artifacts : []
              if (!curArts.some(a => a.path === merged.path)) {
                prevAsst.artifacts = [...curArts, merged]
              }
              if (!String(prevAsst.text || '').includes(merged.path) && !String(prevAsst.text || '').includes(merged.name)) {
                const summaryLine = merged.summary ? `\n> ${merged.summary.replace(/\r?\n/g, ' ').slice(0, 180)}` : ''
                const linkLine = `📋 **[${merged.title || 'Walkthrough'}: ${merged.name}](file://${merged.path})**${summaryLine}`
                prevAsst.text = prevAsst.isToolStepOnly ? linkLine : `${prevAsst.text}\n\n${linkLine}`
                prevAsst.isToolStepOnly = false
              }
            }
          }
        }
      }
      if (typeof step.content === 'string') {
        const bgMatch = step.content.match(/^(?:Created At:[^\r\n]+\r?\n)?Tool is running as a background task with task id:\s*([^\s\r\n"]+)/i)
        if (bgMatch && bgMatch[1]) {
          const prevAsst = transcript.at(-1)
          const isDaemonTask = Boolean(
            (prevAsst
              && prevAsst.role === 'assistant'
              && Array.isArray(prevAsst.tools)
              && prevAsst.tools.some(t => t.isDaemon))
            || step.content.includes('daemon.mjs'),
          )
          if (!isDaemonTask) {
            pendingBackgroundTaskIds.add(bgMatch[1].trim().replace(/[.,;]+$/, ''))
          }
        }
      }
      if (
        stepType === 'GENERIC' &&
        typeof step.content === 'string' &&
        (step.content.includes('There were sandbox errors') || step.content.includes('Operation not permitted'))
      ) {
        const prevMsg = transcript.at(-1)
        if (prevMsg && prevMsg.role === 'assistant' && Array.isArray(prevMsg.tools)) {
          for (const t of prevMsg.tools) {
            if (t.name === 'run_command' && !t.bypassSandbox && t.commandLine && !t.commandLine.includes('沙盒模式试探受限')) {
              t.commandLine = `${t.commandLine}\n# 🛡️ 沙盒模式试探受限 (Operation not permitted)，AI 随后会自动切换宿主机权限重试`
              t.command = t.commandLine
            }
          }
        }
      }
    }
  }

  // Fallback: if LanguageServer live summary explicitly reports a waiting step (`CORTEX_STEP_STATUS_WAITING`)
  // even after a GENERIC tool output line from a parallel tool call, surface the pending approval.
  if (hasLiveSummary && !pendingApproval && Array.isArray(liveWaitingSteps) && liveWaitingSteps.length > 0) {
    const activeLiveWaiting = liveWaitingSteps[liveWaitingSteps.length - 1]
    const livePermSpec = activeLiveWaiting?.step?.requestedInteraction?.permission
      || (activeLiveWaiting?.step?.requestedInteraction?.interaction?.case === 'permission'
        ? activeLiveWaiting.step.requestedInteraction.interaction.value
        : null)
    const waitingStepIndex = activeLiveWaiting?.step?.metadata?.sourceTrajectoryStepInfo?.stepIndex
      ?? activeLiveWaiting?.stepIndex
      ?? lines.length
    const waitingTrajectoryId = activeLiveWaiting?.step?.metadata?.sourceTrajectoryStepInfo?.trajectoryId
      || conversationId
    const code = `AGY-${String(conversationId).slice(0, 6).toUpperCase()}-${waitingStepIndex}`
    if (!settledApprovals.has(code)) {
      const targetCmd = String(livePermSpec?.resource?.target || '').trim()
      const actDesc = String(livePermSpec?.actionDescription || 'command execution').trim()
      const lowerAct = actDesc ? actDesc.charAt(0).toLowerCase() + actDesc.slice(1) : 'command execution'
      const firstSub = (targetCmd.split(/\s*(?:&&|\|\||;|\n)\s*/)[0] || targetCmd).trim()
      const persistLabel = String(livePermSpec?.suggestedPersistPattern || firstSub || targetCmd).trim()
      pendingApproval = {
        code,
        stepIndex: waitingStepIndex,
        waitingStepIndex,
        trajectoryId: waitingTrajectoryId,
        permissionAction: livePermSpec?.resource?.action || 'unsandboxed',
        permissionTarget: targetCmd,
        suggestedPersistPattern: livePermSpec?.suggestedPersistPattern || '',
        persistSuggestionType: livePermSpec?.persistSuggestionType || '',
        harness: 'antigravity-ide',
        toolName: livePermSpec?.resource?.action ? `permission (${livePermSpec.resource.action})` : 'run_command (BypassSandbox)',
        promptTitle: `Allow ${lowerAct}?`,
        subtitle: String(livePermSpec?.reason || 'the auto-run safety check did not reach a decision'),
        commandLine: targetCmd || '请求宿主机终端执行权限',
        firstSubcommand: firstSub,
        options: [
          { index: 1, label: 'Yes, allow this time' },
          { index: 2, label: persistLabel ? `Yes, and always allow '${persistLabel}' in this conversation` : 'Yes, and always allow in this conversation' },
          { index: 3, label: persistLabel ? `Yes, and always allow '${persistLabel}'` : 'Yes, and always allow' },
          { index: 4, label: 'No (tell the agent what to do instead)' },
        ],
        reason: `${actDesc ? `${actDesc}: ` : ''}${targetCmd || '请求宿主机终端执行权限'}`.slice(0, 2000),
        createdAt: lastActivity || now,
        expiresAt: (lastActivity || now) + 10 * 60 * 1000,
      }
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
  const artifacts = [...artifactsMap.values()].sort((a, b) => {
    const rank = k => (k === 'walkthrough' ? 0 : k === 'plan' ? 1 : k === 'task' ? 2 : 3)
    return rank(a.kind) - rank(b.kind)
  })

  // Merge consecutive non-waiting assistant steps within the same turn BEFORE slicing to `maxMessages`
  // so multi-step tool turns do not evict earlier user turns or artifact creation steps when sliced.
  const mergedTranscript = []
  for (const item of transcript) {
    const prev = mergedTranscript.at(-1)
    if (
      prev
      && prev.role === 'assistant'
      && item.role === 'assistant'
      && !prev.waitingForInput
      && !item.waitingForInput
    ) {
      if (!prev._thoughtList) {
        prev._thoughtList = prev.thinking ? [String(prev.thinking).trim()] : []
        prev._textList = prev.text && !prev.isToolStepOnly ? [String(prev.text).trim()] : []
        prev._toolList = [...(Array.isArray(prev.tools) ? prev.tools : [])]
        prev._artifactMap = new Map(
          (Array.isArray(prev.artifacts) ? prev.artifacts : []).filter(a => a?.path).map(a => [a.path, a]),
        )
        prev._stepCount = prev.thinkingStepCount || (prev.thinking ? 1 : 0)
      }
      if (item.thinking && String(item.thinking).trim()) {
        prev._thoughtList.push(String(item.thinking).trim())
        prev._stepCount += item.thinkingStepCount || 1
      }
      if (item.text && !item.isToolStepOnly && String(item.text).trim()) {
        prev._textList.push(String(item.text).trim())
      }
      for (const t of (Array.isArray(item.tools) ? item.tools : [])) {
        if (t) prev._toolList.push(t)
      }
      for (const a of (Array.isArray(item.artifacts) ? item.artifacts : [])) {
        if (a?.path) prev._artifactMap.set(a.path, a)
      }
      prev.thinkingStepCount = prev._stepCount
      prev.thinking = prev._thoughtList.length <= 1
        ? (prev._thoughtList[0] || '')
        : prev._thoughtList
          .map((th, idx) => (th.startsWith('【思考') ? th : `【思考 ${idx + 1}】\n${th}`))
          .join('\n\n')
          .slice(-8000)
      const joinedText = prev._textList.join('\n\n')
      prev.tools = prev._toolList.slice(-24)
      prev.toolCalls = prev.tools
      prev.artifacts = prev._artifactMap.size > 0 ? [...prev._artifactMap.values()] : undefined
      prev.isToolStepOnly = !joinedText && prev.tools.length > 0 && (!prev.artifacts || prev.artifacts.length === 0)
      prev.text = joinedText || (prev.tools.map(t => t.summary || t.name).join(' · '))
      prev.time = item.time || prev.time
    } else {
      mergedTranscript.push({ ...item })
    }
  }
  for (const m of mergedTranscript) {
    delete m._thoughtList
    delete m._textList
    delete m._toolList
    delete m._artifactMap
    delete m._stepCount
    m.index = mergedTranscript.indexOf(m)
  }

  const slicedTranscript = mergedTranscript.slice(-maxMessages)
  // Ensure that if the conversation has a Walkthrough artifact on disk, and none of the messages in
  // `slicedTranscript` currently carry it, we attach it to the latest assistant conclusion message so it's always clickable.
  const walkthroughArt = artifacts.find(a => a.kind === 'walkthrough')
  if (walkthroughArt && slicedTranscript.length > 0) {
    const alreadyInSlice = slicedTranscript.some(
      m =>
        (Array.isArray(m.artifacts) && m.artifacts.some(a => a.path === walkthroughArt.path))
        || String(m.text || '').includes(walkthroughArt.path),
    )
    if (!alreadyInSlice) {
      for (let idx = slicedTranscript.length - 1; idx >= 0; idx -= 1) {
        const msg = slicedTranscript[idx]
        if (msg.role === 'assistant' && !msg.waitingForInput) {
          msg.artifacts = [...(Array.isArray(msg.artifacts) ? msg.artifacts : []), walkthroughArt]
          break
        }
      }
    }
  }

  const lastStep = lines.at(-1) || {}
  const lastStepType = String(lastStep.type || '')
  const lastStepTools = Array.isArray(lastStep.tool_calls) ? lastStep.tool_calls : []
  const hasActiveBackgroundTask = pendingBackgroundTaskIds.size > 0 && (now - lastActivity < 15 * 60_000)
  const isLsRunning = liveStatus === 'CASCADE_RUN_STATUS_RUNNING'
  const isConcludedStep = !hasActiveBackgroundTask
    && !isLsRunning
    && lastStepType === 'PLANNER_RESPONSE'
    && lastStep.status !== 'RUNNING'
    && lastStepTools.length === 0
    && Boolean(String(lastStep.content || '').trim())
  const isErrorStep = lastStepType === 'ERROR_MESSAGE' || lastStep.status === 'ERROR'
  const isMidTurn = hasActiveBackgroundTask || isLsRunning || (!isConcludedStep && !isErrorStep)

  const isRecentlyActive = isLsRunning
    || hasActiveBackgroundTask
    || (isMidTurn && (now - lastActivity < 300_000) && liveStatus !== 'CASCADE_RUN_STATUS_IDLE')
    || (isErrorStep && (now - lastActivity < 15_000))

  const status = pendingApproval
    ? 'approval'
    : isRecentlyActive
      ? 'running'
      : 'idle'

  const hasConcludedCurrentTurn = !isRecentlyActive && (isConcludedStep || (lastConclusionAt > 0 && lastConclusionAt >= lastUserInputAt))
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

  const lastStepIndex = typeof lastStep.step_index === 'number' ? lastStep.step_index : lines.length - 1
  const stateSource = hasLiveSummary
    ? 'ls-rpc'
    : (isConcludedStep || isErrorStep || Boolean(pendingApproval))
      ? 'jsonl-tail'
      : 'mtime-decay'
  const stateConfidence = stateSource === 'ls-rpc'
    ? 'high'
    : stateSource === 'jsonl-tail'
      ? 'medium'
      : 'low'
  const stateMeta = {
    source: stateSource,
    observedAt: now,
    confidence: stateConfidence,
  }
  const sessionRev = `${transcript.length}:${lastStepIndex}:${status}:${turnState}:${pendingApproval?.code || ''}`
  const resolvedModel = resolveAntigravityModelLabel(liveModel)

  return {
    id: sessionId,
    rawId: conversationId,
    shortId: String(conversationId).slice(0, 8),
    harness: 'antigravity-ide',
    harnessLabel: 'Antigravity IDE',
    ...(resolvedModel ? { model: resolvedModel } : {}),
    controlMode: hasLiveSummary ? 'managed' : 'idle-resumable',
    capabilities: {
      canCreateSession: true,
      canPrompt: true,
      canSteer: true,
      canStop: true,
      canApprove: true,
    },
    title,
    status,
    turnState,
    isMidTurn,
    hasActiveBackgroundTask,
    statusLabel,
    lastStepIndex,
    sessionRev,
    stateMeta,
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
    artifacts,
    messageCount: mergedTranscript.length,
    hasLiveSummary: Boolean(hasLiveSummary),
    transcript: slicedTranscript,
    pendingApproval: pendingApproval
      ? {
        ...pendingApproval,
        agentId: sessionId,
        title,
        project,
        changedFiles,
        artifacts,
      }
      : null,
  }
}

const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 }
const highConfidenceSessionStates = new Map()

/**
 * 5-second hysteresis protection window:
 * Prevents a low-confidence heuristic (`ps-heuristic` / `mtime-decay`) from overriding a recent
 * high-confidence (`ls-rpc`) state observation within `windowMs` (default 5000ms).
 */
export function applyStateHysteresis(session, stateCache = highConfidenceSessionStates, now = Date.now(), windowMs = 5000) {
  if (!session || !session.id) return session
  const meta = session.stateMeta || { source: 'unknown', observedAt: now, confidence: 'low' }
  const curRank = CONFIDENCE_RANK[meta.confidence] || 1
  const prev = stateCache.get(session.id)

  if (curRank >= 3) {
    stateCache.set(session.id, {
      status: session.status,
      turnState: session.turnState,
      statusLabel: session.statusLabel,
      pendingApproval: session.pendingApproval,
      stateMeta: { ...meta, observedAt: now },
      recordedAt: now,
    })
    if (stateCache.size > 200) {
      const oldest = stateCache.keys().next().value
      stateCache.delete(oldest)
    }
    return session
  }

  if (prev && curRank === 1 && now - prev.recordedAt <= windowMs) {
    const restoredApproval = prev.pendingApproval || null
    const restoredStatus = prev.status
    const restoredTurnState = prev.turnState
    const restoredSessionRev = `${session.transcript?.length || 0}:${session.lastStepIndex ?? -1}:${restoredStatus}:${restoredTurnState}:${restoredApproval?.code || ''}`
    return {
      ...session,
      status: restoredStatus,
      turnState: restoredTurnState,
      statusLabel: prev.statusLabel,
      pendingApproval: restoredApproval,
      sessionRev: restoredSessionRev,
      stateMeta: {
        ...prev.stateMeta,
        hysteresisProtected: true,
        ignoredLowConfidenceSource: meta.source,
      },
    }
  }

  return session
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
 * Inspect `<brainDir>/<convId>` for top-level Markdown artifacts (`walkthrough.md`, `implementation_plan.md`, `task.md`,
 * or any `*.md` accompanied by `*.md.metadata.json`).
 */
async function loadDiskArtifactsForConversation(transcriptPath) {
  try {
    const convDir = dirname(dirname(dirname(resolve(String(transcriptPath || '')))))
    const entries = await readdir(convDir)
    const entrySet = new Set(entries)
    const mdFiles = entries.filter(name => {
      if (!name.toLowerCase().endsWith('.md')) return false
      const lower = name.toLowerCase()
      return (
        lower === 'walkthrough.md'
        || lower === 'implementation_plan.md'
        || lower === 'task.md'
        || entrySet.has(`${name}.metadata.json`)
      )
    })
    if (mdFiles.length === 0) return []
    const out = []
    for (const mdName of mdFiles) {
      const fullPath = join(convDir, mdName)
      let meta = null
      if (entrySet.has(`${mdName}.metadata.json`)) {
        try {
          meta = JSON.parse(await readFile(join(convDir, `${mdName}.metadata.json`), 'utf8'))
        } catch {
          meta = null
        }
      }
      const desc = buildArtifactDescriptor(fullPath, meta)
      if (desc) {
        if (meta?.updatedAt) {
          const t = Date.parse(meta.updatedAt)
          if (Number.isFinite(t)) desc.updatedAt = t
        }
        out.push(desc)
      }
    }
    return out
  } catch {
    return []
  }
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
  execImpl = execFileAsync,
  fetchImpl = globalThis.fetch,
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
  const latestCandidateMtimeMs = topCandidates[0]?.mtimeMs || 0
  const [nativeMetaMap, liveSummariesMap] = await Promise.all([
    loadAntigravityMetadataForCandidates(brainDirs, topCandidates),
    loadLiveTrajectorySummaries({ minFreshAt: latestCandidateMtimeMs, execImpl, fetchImpl }),
  ])

  const settledKey = settledApprovals ? [...settledApprovals].join(',') : ''
  const sessions = []
  for (const item of topCandidates) {
    try {
      const nativeMeta = nativeMetaMap.get(item.convId)
      const liveSummary = liveSummariesMap.get(item.convId)
      const hasLiveSummary = Boolean(liveSummary)
      const liveWaitingSteps = Array.isArray(liveSummary?.waitingSteps) ? liveSummary.waitingSteps : []
      const waitingKey = liveWaitingSteps.map(w => w?.stepIndex ?? '').join(',')
      const liveStepCount = liveSummary?.stepCount !== undefined ? Number(liveSummary.stepCount) : null
      const liveLastUserInputStepIndex = liveSummary?.lastUserInputStepIndex !== undefined
        ? Number(liveSummary.lastUserInputStepIndex)
        : null
      const liveStatus = String(liveSummary?.status || '')
      const liveModel = String(liveSummary?.planModel || '')
      const liveTitle = String(liveSummary?.summary || '').trim()
      const effectiveNativeTitle = nativeMeta?.title || liveTitle || ''
      const sessionId = `${AGY_IDE_PREFIX}${item.convId}`
      const customTitle = customTitles[sessionId] || customTitles[item.convId] || ''
      const cacheKey = `${item.convId}:${item.mtimeMs}:${item.size || 0}:${maxMessages}:${customTitle}:${effectiveNativeTitle}:${settledKey}:${liveStepCount ?? ''}:${liveLastUserInputStepIndex ?? ''}:${liveStatus}:${liveModel}:${hasLiveSummary ? 1 : 0}:${waitingKey}`
      const cached = sessionParseCache.get(item.convId)
      if (cached && cached.cacheKey === cacheKey && cached.session) {
        // Recompute dynamic running/idle status against current `now` while skipping disk read & JSONL parse
        const hasBgTask = Boolean(cached.session.hasActiveBackgroundTask) && (now - cached.session.lastActivity <= 15 * 60_000)
        const isRecentlyActive = liveStatus === 'CASCADE_RUN_STATUS_RUNNING'
          || hasBgTask
          || (Boolean(cached.session.isMidTurn) && (now - cached.session.lastActivity <= 300_000) && liveStatus !== 'CASCADE_RUN_STATUS_IDLE')
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

      const [rawText, diskArtifacts] = await Promise.all([
        readFile(item.path, 'utf8'),
        loadDiskArtifactsForConversation(item.path),
      ])
      const fullContentByStepIndex = await loadTruncatedStepContents(item.path, rawText)
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
        liveModel,
        hasLiveSummary,
        liveWaitingSteps,
        fullContentByStepIndex,
        diskArtifacts,
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

  // If any session has a pendingApproval without live LanguageServer summary, check if the command is ALREADY approved and running on the computer
  const pendingSessions = sessions.filter(s => s.pendingApproval?.commandLine && !s.hasLiveSummary)
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
          const prevHigh = highConfidenceSessionStates.get(s.id)
          if (prevHigh && now - prevHigh.recordedAt <= 5000 && prevHigh.pendingApproval) {
            // Protected by 5s high-confidence hysteresis window: do not let ps substring override recent ls-rpc waiting state
            continue
          }
          if (settledApprovals && typeof settledApprovals.add === 'function') {
            settledApprovals.add(s.pendingApproval.code)
          }
          s.pendingApproval = null
          s.status = 'running'
          s.turnState = 'running'
          s.statusLabel = '🟢 运行中'
          s.stateMeta = {
            source: 'ps-heuristic',
            observedAt: now,
            confidence: 'low',
          }
          s.sessionRev = `${s.transcript?.length || 0}:${s.lastStepIndex ?? -1}:${s.status}:${s.turnState}:`
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

  const stabilized = sessions.map(s => applyStateHysteresis(s, highConfidenceSessionStates, now))
  stabilized.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
  return stabilized.slice(0, maxSessions)
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
const liveTrajectoryModelCache = new Map()

async function loadLiveTrajectorySummaries({
  minFreshAt = 0,
  execImpl = execFileAsync,
  fetchImpl = globalThis.fetch,
} = {}) {
  const isDefaultRuntime = execImpl === execFileAsync && fetchImpl === globalThis.fetch
  const now = Date.now()
  const hasWaitingInCache = Boolean(
    cachedLiveSummaries &&
    [...cachedLiveSummaries.values()].some(
      s =>
        s?.status === 'CASCADE_RUN_STATUS_WAITING_FOR_USER' ||
        (Array.isArray(s?.waitingSteps) && s.waitingSteps.length > 0),
    ),
  )
  const ttlMs = hasWaitingInCache ? 350 : cachedLiveSummariesAt >= minFreshAt ? 2500 : 150
  if (isDefaultRuntime && now - cachedLiveSummariesAt < ttlMs) {
    return cachedLiveSummaries
  }
  if (isDefaultRuntime) {
    cachedLiveSummariesAt = now
  }
  const map = new Map()
  if (typeof fetchImpl !== 'function') return map
  try {
    const hubs = await discoverAntigravityHubInstances({ execImpl })
    await Promise.all(
      hubs.map(async hub => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 900)
        timer.unref?.()
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
              signal: controller.signal,
            },
          )
          if (!resp.ok) return
          const data = await resp.json().catch(() => null)
          const summaries = data?.trajectorySummaries
          if (!summaries || typeof summaries !== 'object') return
          for (const [cid, sum] of Object.entries(summaries)) {
            if (cid && sum && typeof sum === 'object') {
              const stepKey = String(sum.lastUserInputStepIndex ?? 0)
              const cachedModelEntry = liveTrajectoryModelCache.get(cid)
              if (cachedModelEntry && cachedModelEntry.stepKey === stepKey && cachedModelEntry.planModel) {
                sum.planModel = cachedModelEntry.planModel
              } else if (sum.lastUserInputStepIndex !== undefined) {
                try {
                  const stepResp = await fetchImpl(
                    `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetCascadeTrajectorySteps`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-codeium-csrf-token': hub.csrfToken,
                      },
                      body: JSON.stringify({
                        cascadeId: cid,
                        stepOffset: Math.max(0, Number(sum.lastUserInputStepIndex) || 0),
                      }),
                      signal: controller.signal,
                    },
                  )
                  if (stepResp?.ok) {
                    const stepData = await stepResp.json().catch(() => null)
                    const steps = Array.isArray(stepData?.steps) ? stepData.steps : []
                    let foundModel = ''
                    for (let i = steps.length - 1; i >= 0; i -= 1) {
                      const pm = steps[i]?.userInput?.userConfig?.plannerConfig?.planModel
                        || steps[i]?.metadata?.generatorModel
                      if (pm) {
                        foundModel = String(pm).trim()
                        break
                      }
                    }
                    if (foundModel) {
                      sum.planModel = foundModel
                      liveTrajectoryModelCache.set(cid, { stepKey, planModel: foundModel })
                    }
                  }
                } catch {
                  // ignore step model lookup failure
                }
              }
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
  if (isDefaultRuntime) {
    cachedLiveSummaries = map
  }
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

  const isDefaultExec = execImpl === execFileAsync
  const now = Date.now()
  if (isDefaultExec && cachedRawHubInstances && cachedRawHubInstances.length > 0 && now - cachedRawHubInstancesAt < 10_000) {
    for (const inst of cachedRawHubInstances) addInstance(inst)
  } else if (typeof execImpl === 'function') {
    try {
      const { stdout } = await execImpl('ps', ['-ax', '-o', 'pid=,command='], { timeout: 2500 })
      const standalonePids = []
      for (const rawLine of String(stdout || '').split('\n')) {
        const line = rawLine.trim()
        if (!line) continue
        const pidMatch = line.match(/^(\d+)\s+(.*)$/)
        const pid = pidMatch ? pidMatch[1] : '0'
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
          const binMatch = cmdLine.match(/^(\S+\/language_server[^\s]*)/)
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
          let lsofRes
          try {
            lsofRes = await execImpl(
              'lsof',
              ['-Pan', '-p', lsProc.pid, '-iTCP', '-sTCP:LISTEN'],
              { timeout: 3500 },
            )
          } catch (lsofErr) {
            if (isDefaultExec && lsofErr?.code === 'ENOENT') {
              lsofRes = await execImpl(
                '/usr/sbin/lsof',
                ['-Pan', '-p', lsProc.pid, '-iTCP', '-sTCP:LISTEN'],
                { timeout: 3500 },
              )
            } else {
              throw lsofErr
            }
          }
          const lsofOut = lsofRes?.stdout
          const ports = [
            ...new Set(
              [...String(lsofOut || '').matchAll(/(?:127\.0\.0\.1|localhost|\*|\[::1\]):(\d+)/g)]
                .map(m => Number(m[1]))
                .filter(Boolean),
            ),
          ]
          for (const p of ports.slice(0, 8)) {
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
      if (isDefaultExec && instances.length > 0) {
        cachedRawHubInstances = instances.map(inst => ({ ...inst }))
        cachedRawHubInstancesAt = now
      }
    } catch {
      // ignore ps failure
    }
  }

  if ((isDefaultExec || instances.length === 0) && process.env.ANTIGRAVITY_LS_ADDRESS && process.env.ANTIGRAVITY_CSRF_TOKEN) {
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
  else delete env.ANTIGRAVITY_LS_ADDRESS
  if (hub?.csrfToken) env.ANTIGRAVITY_CSRF_TOKEN = hub.csrfToken
  else delete env.ANTIGRAVITY_CSRF_TOKEN
  return env
}

const DEFAULT_AGY_MODELS = [
  { value: 'MODEL_PLACEHOLDER_M417', label: 'Gemini 4 Argon (High)' },
  { value: 'MODEL_PLACEHOLDER_M418', label: 'Gemini 4 Argon (Medium)' },
  { value: 'MODEL_PLACEHOLDER_M419', label: 'Gemini 4 Argon (Low)' },
  { value: 'MODEL_PLACEHOLDER_M318', label: 'Gemini 3.8 Flash (High)' },
  { value: 'MODEL_PLACEHOLDER_M319', label: 'Gemini 3.8 Flash (Medium)' },
  { value: 'MODEL_PLACEHOLDER_M320', label: 'Gemini 3.8 Flash (Low)' },
  { value: 'MODEL_PLACEHOLDER_M402', label: 'Claude Opus 5.5 (High)' },
  { value: 'MODEL_PLACEHOLDER_M401', label: 'Claude Opus 5.5 (Medium)' },
  { value: 'MODEL_PLACEHOLDER_M400', label: 'Claude Opus 5.5 (Low)' },
  { value: 'MODEL_PLACEHOLDER_M405', label: 'Claude Sonnet 5.5 (High)' },
  { value: 'MODEL_PLACEHOLDER_M404', label: 'Claude Sonnet 5.5 (Medium)' },
  { value: 'MODEL_PLACEHOLDER_M403', label: 'Claude Sonnet 5.5 (Low)' },
  { value: 'MODEL_OPENAI_GPT_OSS_120B_MEDIUM', label: 'GPT-OSS 120B (Medium)' },
]

let cachedAgyModelCatalog = null
let cachedAgyModelCatalogAt = 0

export function resolveAntigravityModelLabel(rawModel = '') {
  const clean = String(rawModel || '').trim()
  if (!clean) return ''
  const pool = cachedAgyModelCatalog?.models || DEFAULT_AGY_MODELS
  const hit = pool.find(m => m.value === clean || m.label === clean)
    || DEFAULT_AGY_MODELS.find(m => m.value === clean || m.label === clean)
  if (hit) return hit.label
  return clean.startsWith('MODEL_PLACEHOLDER_') ? '' : clean
}

export async function discoverAntigravityModelCatalog({
  execImpl = execFileAsync,
  fetchImpl = globalThis.fetch,
} = {}) {
  const now = Date.now()
  if (cachedAgyModelCatalog && now - cachedAgyModelCatalogAt < 60_000) {
    return cachedAgyModelCatalog
  }
  if (typeof fetchImpl === 'function') {
    try {
      const hubs = await discoverAntigravityHubInstances({ execImpl })
      for (const hub of hubs) {
        try {
          const resp = await fetchImpl(
            `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetCascadeModelConfigData`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-codeium-csrf-token': hub.csrfToken,
              },
              body: JSON.stringify({}),
            },
          )
          if (!resp?.ok) continue
          const data = await resp.json().catch(() => null)
          const rawConfigs = Array.isArray(data?.clientModelConfigs) ? data.clientModelConfigs : []
          if (rawConfigs.length > 0) {
            const models = []
            const seen = new Set()
            for (const c of rawConfigs) {
              const val = String(c?.modelOrAlias?.model || c?.modelOrAlias?.alias || '').trim()
              const lbl = String(c?.label || val).trim()
              if (!val || seen.has(val)) continue
              seen.add(val)
              models.push({ value: val, label: lbl })
            }
            if (models.length > 0) {
              const overrideDefaultVal = String(
                data?.defaultOverrideModelConfig?.modelOrAlias?.model
                || data?.defaultOverrideModelConfig?.modelOrAlias?.alias
                || '',
              ).trim()
              const defaultEntry =
                (overrideDefaultVal && models.find(m => m.value === overrideDefaultVal))
                || models[0]
              cachedAgyModelCatalog = {
                defaultModel: defaultEntry.value,
                defaultLabel: defaultEntry.label,
                models,
              }
              cachedAgyModelCatalogAt = now
              return cachedAgyModelCatalog
            }
          }
        } catch { }
      }
    } catch { }
  }
  return {
    defaultModel: DEFAULT_AGY_MODELS[0].value,
    defaultLabel: DEFAULT_AGY_MODELS[0].label,
    models: DEFAULT_AGY_MODELS,
  }
}

async function resolveCascadeConfigForHub(hub, rawConvId, fetchImpl, peerTrajectoryIds = [], requestedModel = '') {
  const cleanRequestedModel = String(requestedModel || '').trim()
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
          const clonedConfig = JSON.parse(JSON.stringify(ui.userConfig))
          if (cleanRequestedModel) {
            if (!clonedConfig.plannerConfig) clonedConfig.plannerConfig = {}
            clonedConfig.plannerConfig.planModel = cleanRequestedModel
          }
          return {
            cascadeConfig: clonedConfig,
            customAgentSpec: ui.userAgentSpec || undefined,
          }
        }
      }
    } catch {
      // try next trajectory
    }
  }

  let planModel = cleanRequestedModel || 'MODEL_PLACEHOLDER_M417'
  if (!cleanRequestedModel) {
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

  if (type === 'approve' || type === 'deny') {
    const allow = type === 'approve'
    let reachedAnyLsHub = false
    if (typeof fetchImpl === 'function') {
      try {
        const hubs = await discoverAntigravityHubInstances({ execImpl, preferredCwd })
        for (const hub of hubs) {
          try {
            const sumResp = await fetchImpl(
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
            if (sumResp?.ok) {
              reachedAnyLsHub = true
            }
            const sumData = sumResp?.ok ? await sumResp.json().catch(() => null) : null
            const summaries = sumData?.trajectorySummaries || {}

            let targetConvId = rawConvId
            if (!targetConvId) {
              for (const [cid, sum] of Object.entries(summaries)) {
                if (Array.isArray(sum?.waitingSteps) && sum.waitingSteps.length > 0) {
                  targetConvId = cid
                  break
                }
              }
            }

            const hasConversationOnHub = Boolean(
              targetConvId && summaries[targetConvId] && typeof summaries[targetConvId] === 'object',
            )
            if (!hasConversationOnHub && fetchImpl === globalThis.fetch) {
              continue
            }

            const liveSummary = targetConvId ? summaries[targetConvId] : null
            const waitingSteps = Array.isArray(liveSummary?.waitingSteps) ? liveSummary.waitingSteps : []
            let waitingEntry = waitingSteps[waitingSteps.length - 1] || null

            if (!waitingEntry && targetConvId && sumResp?.ok) {
              try {
                const stepsResp = await fetchImpl(
                  `http://${hub.address}/exa.language_server_pb.LanguageServerService/GetCascadeTrajectorySteps`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-codeium-csrf-token': hub.csrfToken,
                    },
                    body: JSON.stringify({ cascadeId: targetConvId, stepOffset: 0 }),
                  },
                )
                if (stepsResp?.ok) {
                  const stepsData = await stepsResp.json().catch(() => null)
                  const stepsList = Array.isArray(stepsData?.steps) ? stepsData.steps : []
                  for (let idx = stepsList.length - 1; idx >= 0; idx -= 1) {
                    const st = stepsList[idx]
                    // ONLY match steps genuinely still waiting for user interaction!
                    // Completed/running steps retain `requestedInteraction` in history and must NEVER be re-submitted.
                    if (st?.status === 'CORTEX_STEP_STATUS_WAITING') {
                      waitingEntry = {
                        stepIndex: st?.metadata?.sourceTrajectoryStepInfo?.stepIndex ?? idx,
                        step: st,
                      }
                      break
                    }
                  }
                }
              } catch {
                // ignore step probe failure
              }
            }

            if (hasConversationOnHub && !waitingEntry) {
              cachedLiveSummariesAt = 0
              return {
                ok: true,
                engine: 'connect-rpc-noop',
                alreadySettled: true,
                message: allow
                  ? '✅ 该审批已在电脑端处理完毕，无需重复提交'
                  : 'ℹ️ 该步骤已在电脑端执行完毕，无需拒绝',
              }
            }

            const stepIndex =
              waitingEntry?.step?.metadata?.sourceTrajectoryStepInfo?.stepIndex ??
              waitingEntry?.stepIndex ??
              (!hasConversationOnHub ? (action?.pendingApproval?.waitingStepIndex ?? action?.stepIndex) : undefined)
            const trajectoryId = String(
              waitingEntry?.step?.metadata?.sourceTrajectoryStepInfo?.trajectoryId ||
              liveSummary?.trajectoryId ||
              action?.pendingApproval?.trajectoryId ||
              targetConvId ||
              '',
            )

            if (Number.isInteger(stepIndex) && stepIndex >= 0 && targetConvId) {
              const reqInt = waitingEntry?.step?.requestedInteraction || null
              const permReq = reqInt?.permission
                || (reqInt?.interaction?.case === 'permission' ? reqInt.interaction.value : null)
              const runCmdReq = reqInt?.runCommand
                || (reqInt?.interaction?.case === 'runCommand' ? reqInt.interaction.value : null)
              const filePermReq = reqInt?.filePermission
                || (reqInt?.interaction?.case === 'filePermission' ? reqInt.interaction.value : null)

              const interaction = {
                trajectoryId: trajectoryId || targetConvId,
                stepIndex,
              }

              if (runCmdReq && !permReq) {
                const cmdLine = String(
                  action?.pendingApproval?.commandLine ||
                  action?.pendingApproval?.command ||
                  runCmdReq.proposedCommandLine ||
                  '',
                )
                interaction.runCommand = {
                  confirm: allow,
                  proposedCommandLine: cmdLine,
                  submittedCommandLine: cmdLine,
                }
              } else if (filePermReq && !permReq) {
                const scope = !allow
                  ? 'PERMISSION_SCOPE_ONCE'
                  : optionIndex === 2
                    ? 'PERMISSION_SCOPE_CONVERSATION'
                    : optionIndex === 3
                      ? 'PERMISSION_SCOPE_GLOBAL'
                      : 'PERMISSION_SCOPE_ONCE'
                interaction.filePermission = {
                  allow,
                  scope,
                  absolutePathUri: String(filePermReq.absolutePathUri || ''),
                }
              } else {
                const scope = !allow
                  ? 'PERMISSION_SCOPE_ONCE'
                  : optionIndex === 2
                    ? 'PERMISSION_SCOPE_CONVERSATION'
                    : optionIndex === 3
                      ? 'PERMISSION_SCOPE_GLOBAL'
                      : 'PERMISSION_SCOPE_ONCE'
                const allowPatterns = []
                if (allow && (optionIndex === 2 || optionIndex === 3)) {
                  const permAction = String(
                    permReq?.resource?.action ||
                    action?.pendingApproval?.permissionAction ||
                    'unsandboxed',
                  ).trim() || 'unsandboxed'
                  const rawTarget = String(
                    permReq?.resource?.target ||
                    action?.pendingApproval?.permissionTarget ||
                    action?.pendingApproval?.commandLine ||
                    action?.pendingApproval?.command ||
                    '',
                  ).trim()
                  const suggested = String(
                    permReq?.suggestedPersistPattern || action?.pendingApproval?.suggestedPersistPattern || '',
                  ).trim()
                  const wrapGrant = pat => (/^[a-z_]+\([\s\S]*\)$/i.test(pat) ? pat : `${permAction}(${pat})`)
                  if (suggested) {
                    allowPatterns.push(wrapGrant(suggested))
                  } else if (rawTarget) {
                    allowPatterns.push(wrapGrant(rawTarget))
                  }
                }
                interaction.permission = {
                  allow,
                  scope,
                  ...(allowPatterns.length > 0
                    ? {
                      persistGrants: {
                        allow: allowPatterns,
                        deny: [],
                      },
                    }
                    : {}),
                }
              }

              const rpcResp = await fetchImpl(
                `http://${hub.address}/exa.language_server_pb.LanguageServerService/HandleCascadeUserInteraction`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-codeium-csrf-token': hub.csrfToken,
                  },
                  body: JSON.stringify({
                    cascadeId: targetConvId,
                    interaction,
                  }),
                },
              )
              cachedLiveSummariesAt = 0
              if (rpcResp?.ok) {
                return {
                  ok: true,
                  engine: 'connect-rpc',
                  message: allow
                    ? `✅ [Antigravity RPC] 已远程批准执行 (选项 ${optionIndex})`
                    : '🔴 [Antigravity RPC] 已远程拒绝执行',
                }
              }
              // RPC reached LanguageServer for this conversation, so failure means the step was JUST settled on desktop;
              // NEVER fall back to blind keystroke injection (which would type "1" + Enter into the chat box!).
              if (hasConversationOnHub) {
                return {
                  ok: true,
                  engine: 'connect-rpc-noop',
                  alreadySettled: true,
                  message: '✅ 该审批已在电脑端处理完毕，无需重复提交',
                }
              }
            }
          } catch {
            // Try next hub instance
          }
        }
        if (reachedAnyLsHub) {
          cachedLiveSummariesAt = 0
          return {
            ok: true,
            engine: 'connect-rpc-noop',
            alreadySettled: true,
            message: '✅ 该审批已在电脑端处理完毕，无需重复提交',
          }
        }
      } catch {
        // Fall back to native keystroke / AppleScript only when no LanguageServer RPC is reachable
      }
    }
  }

  if (type === 'approve') {
    if (execImpl === execFileAsync) {
      const nativeAction = optionIndex === 2 ? 'approve-2' : optionIndex === 3 ? 'approve-3' : 'opt-enter'
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
            ).catch(() => { })
          }
          const { cascadeConfig, customAgentSpec } = await resolveCascadeConfigForHub(
            hub,
            rawConvId,
            fetchImpl,
            hub.trajectoryIds || [],
            action?.model,
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
                  action?.model,
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
      } catch { }
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
