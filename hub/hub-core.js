import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { generateOrLoadVapidKeys, sendWebPushNotification } from './web-push.js'

const ONLINE_TTL_MS = 30 * 60_000
const ACTIVE_HEARTBEAT_WINDOW_MS = 90_000
const DEFAULT_COMMAND_TTL_MS = 10 * 60_000
const INLINE_TEXT_PREVIEW_MAX_CHARS = 16_384
const FILE_PREVIEW_BLOB_TTL_MS = 6 * 60 * 60_000
const PAIRING_RATE_WINDOW_MS = 60_000
const PAIRING_MAX_FAILS_PER_WINDOW = 10
const MAX_SNAPSHOTS = 15
const MAX_SHARES = 50
const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const APPROVAL_SETTLING_TTL_MS = 45_000
const APPROVAL_SETTLED_COOL_MS = 15_000

export class HubCore {
  constructor({ stateFile = '', now = () => Date.now(), pushFetch = globalThis.fetch, buildInfo = null } = {}) {
    this.stateFile = stateFile
    this.now = now
    this.pushFetch = pushFetch
    this.buildInfo = buildInfo
    this.activeHostId = ''
    this.hosts = new Map()
    this.snapshots = new Map()
    this.migrations = new Map()
    this.shares = new Map()
    this.pairingCodes = new Map()
    this.pairingFailBuckets = new Map()
    this.enrollment = null
    this.filePreviewBlobs = new Map()
    this.filePreviewHistory = new Map()
    this.signalingMailboxes = new Map()
    this.commandResultsById = new Map()
    this.approvalLedger = new Map()
    this.totalCommandsExecuted = 0
    this.vapidKeys = generateOrLoadVapidKeys()
    this.pushSubscriptions = new Map()
    this.unsubscribedEndpoints = new Set()
    this.pushedApprovalCodes = new Set()
    this.pushedCompletionSigs = new Map()
    this.sessionReadState = new Map()
    this.hostTaskStates = new Map()
    this.pushHistory = []
    this.sseListeners = new Set()
    this.hostCommandListeners = new Set()
    this.hostFsListeners = new Set()
    this.fullTranscriptCache = new Map()
    this.mediaTicketSecret = randomBytes(32)
    this.pendingFsRequests = new Map()
    this.fsHotCache = new Map()
  }

  onStateChange(listener) {
    this.sseListeners.add(listener)
    return () => this.sseListeners.delete(listener)
  }

  onHostCommand(listener) {
    this.hostCommandListeners.add(listener)
    return () => this.hostCommandListeners.delete(listener)
  }

  onHostFsRequest(listener) {
    this.hostFsListeners.add(listener)
    return () => this.hostFsListeners.delete(listener)
  }

  emitHostFsRequest(hostId, fsReq) {
    if (this.hostFsListeners.size === 0) return
    for (const listener of this.hostFsListeners) {
      try {
        listener(hostId, fsReq)
      } catch {
        // ignore listener error
      }
    }
  }

  emitHostCommand(hostId, pendingCommandsCount) {
    if (this.hostCommandListeners.size === 0) return
    for (const listener of this.hostCommandListeners) {
      try {
        listener(hostId, pendingCommandsCount)
      } catch {
        // ignore listener error
      }
    }
  }

  emitStateChange(event = 'state') {
    if (this.sseListeners.size === 0) return
    const fullState = this.getFullState()
    for (const listener of this.sseListeners) {
      try {
        listener(event, fullState)
      } catch {
        // ignore listener error
      }
    }
  }

  async init() {
    if (!this.stateFile) return
    try {
      const text = await readFile(this.stateFile, 'utf8')
      const data = JSON.parse(text)
      if (typeof data.activeHostId === 'string') this.activeHostId = data.activeHostId
      if (data.vapidKeys?.publicKey && data.vapidKeys?.privateJwk) {
        this.vapidKeys = generateOrLoadVapidKeys(data.vapidKeys)
      }
      if (Array.isArray(data.pushSubscriptions)) {
        for (const sub of data.pushSubscriptions) {
          if (sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth) {
            this.pushSubscriptions.set(sub.endpoint, sub)
          }
        }
      }
      if (Array.isArray(data.hosts)) {
        for (const h of data.hosts) {
          if (h?.hostId) {
            this.hosts.set(h.hostId, {
              ...h,
              trust: h.trust ?? { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' },
              commands: h.commands ?? [],
              recentResults: h.recentResults ?? [],
            })
          }
        }
      }
      const now = this.now()
      if (Array.isArray(data.approvalLedger)) {
        for (const item of data.approvalLedger) {
          const [key, entry] = Array.isArray(item)
            ? item
            : [item?.hostId && item?.code ? `${item.hostId}:${item.code}` : '', item]
          if (key && entry && typeof entry === 'object' && (!entry.expiresAt || now <= entry.expiresAt)) {
            this.approvalLedger.set(String(key), entry)
          }
        }
      }
      // Reconstruct any missing settling approval ledger entries from persisted pending commands
      for (const h of this.hosts.values()) {
        for (const cmd of h.commands ?? []) {
          const cmdType = String(cmd?.type || '').trim()
          if (cmdType === 'approve' || cmdType === 'deny' || cmdType === 'approval') {
            const code = String(cmd.code || '').trim().toUpperCase()
            if (!code) continue
            const key = `${h.hostId}:${code}`
            if (!this.approvalLedger.has(key)) {
              const decision = cmdType === 'approval' ? (cmd.allow !== false ? 'approve' : 'deny') : cmdType
              this.approvalLedger.set(key, {
                actionId: cmd.id,
                hostId: h.hostId,
                agentId: String(cmd.agentId || ''),
                code,
                decision,
                optionIndex: Number(cmd.optionIndex) || 1,
                status: 'settling',
                pulledByHost: false,
                requestedAt: cmd.createdAt || now,
                expiresAt: cmd.expiresAt || (cmd.createdAt || now) + APPROVAL_SETTLING_TTL_MS,
                error: '',
              })
            }
          }
        }
      }
      if (Array.isArray(data.snapshots)) {
        for (const s of data.snapshots) {
          if (s?.id) this.snapshots.set(s.id, s)
        }
      }
      if (Array.isArray(data.shares)) {
        for (const sh of data.shares) {
          if (sh?.id) this.shares.set(sh.id, sh)
        }
      }
      if (data.sessionReadState && typeof data.sessionReadState === 'object') {
        for (const [k, v] of Object.entries(data.sessionReadState)) {
          if (k && v && typeof v === 'object') {
            this.sessionReadState.set(String(k), {
              unread: Boolean(v.unread),
              sig: String(v.sig || ''),
              at: Number(v.at) || 0,
            })
          }
        }
      }
      if (data.enrollment && typeof data.enrollment === 'object' && data.enrollment.code) {
        if (!data.enrollment.expiresAt || now <= data.enrollment.expiresAt) {
          this.enrollment = {
            code: String(data.enrollment.code),
            createdAt: Number(data.enrollment.createdAt) || now,
            expiresAt: Number(data.enrollment.expiresAt) || now + 15 * 60_000,
            joinedCount: Number(data.enrollment.joinedCount) || 0,
            joinedHostIds: Array.isArray(data.enrollment.joinedHostIds) ? data.enrollment.joinedHostIds : [],
            failedAttempts: Number(data.enrollment.failedAttempts) || 0,
            revoked: Boolean(data.enrollment.revoked),
          }
        }
      }
    } catch {
      // ignore missing or corrupt state file on startup
    }
  }

  sanitizeFilePreviewForState(hostId, preview, { silentPreview = false } = {}) {
    if (!preview || typeof preview !== 'object') return null
    const at = Number(preview.at) || this.now()
    const hasBinaryOrLarge =
      Boolean(preview.dataBase64) ||
      (typeof preview.content === 'string' && preview.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS)

    if (hasBinaryOrLarge) {
      const existing = this.filePreviewBlobs.get(hostId)
      if (
        !existing ||
        existing.at !== at ||
        existing.relPath !== (preview.relPath || '') ||
        (preview.dataBase64 && !existing.dataBase64)
      ) {
        const blobObj = {
          at,
          agentId: preview.agentId || '',
          relPath: preview.relPath || '',
          name: preview.name || '',
          ext: preview.ext || '',
          size: Number(preview.size) || 0,
          kind: preview.kind || 'binary',
          mime: preview.mime || preview.mimeType || 'application/octet-stream',
          content: preview.content,
          dataBase64: preview.dataBase64,
          expiresAt: this.now() + FILE_PREVIEW_BLOB_TTL_MS,
        }
        if (!silentPreview) {
          this.filePreviewBlobs.set(hostId, blobObj)
        }
        this.filePreviewHistory.set(`${hostId}:${at}`, blobObj)
        if (preview.relPath) {
          this.filePreviewHistory.set(`${hostId}:path:${preview.relPath}`, blobObj)
        }
        if (preview.name) {
          this.filePreviewHistory.set(`${hostId}:name:${preview.name}`, blobObj)
        }
        while (this.filePreviewHistory.size > 120) {
          const oldestKey = this.filePreviewHistory.keys().next().value
          this.filePreviewHistory.delete(oldestKey)
        }
      }
    }

    const sanitized = {
      at,
      agentId: preview.agentId || '',
      relPath: preview.relPath || '',
      name: preview.name || '',
      ext: preview.ext || '',
      size: Number(preview.size) || 0,
      kind: preview.kind || 'text',
      mime: preview.mime || preview.mimeType || 'text/plain',
      hasBlob: Boolean(hasBinaryOrLarge || preview.hasBlob || this.filePreviewBlobs.get(hostId)?.at === at),
      previewUrl: `/api/hosts/${encodeURIComponent(hostId)}/file-preview?at=${at}`,
    }

    if (!hasBinaryOrLarge && typeof preview.content === 'string') {
      sanitized.content = preview.content
    }
    return sanitized
  }

  getFilePreviewBlob(hostId, expectedAt = null, expectedPath = null) {
    const cleanHostId = String(hostId ?? '').trim()
    if (!cleanHostId) return null
    if (expectedPath) {
      const byPath = this.filePreviewHistory.get(`${cleanHostId}:path:${expectedPath}`)
      if (byPath && (!byPath.expiresAt || this.now() <= byPath.expiresAt)) {
        return byPath
      }
      const baseName = String(expectedPath).split('/').filter(Boolean).pop() || ''
      if (baseName) {
        const byName = this.filePreviewHistory.get(`${cleanHostId}:name:${baseName}`)
        if (byName && (!byName.expiresAt || this.now() <= byName.expiresAt)) {
          return byName
        }
      }
      return null
    }
    if (expectedAt !== null && expectedAt !== undefined && expectedAt !== '') {
      const byAt = this.filePreviewHistory.get(`${cleanHostId}:${Number(expectedAt)}`)
      if (byAt && (!byAt.expiresAt || this.now() <= byAt.expiresAt)) {
        return byAt
      }
    }
    const blob = this.filePreviewBlobs.get(cleanHostId)
    if (blob) {
      if (blob.expiresAt && this.now() > blob.expiresAt) {
        this.filePreviewBlobs.delete(cleanHostId)
        return null
      }
      if (expectedAt !== null && expectedAt !== undefined && expectedAt !== '' && Number(expectedAt) !== blob.at) {
        return null
      }
      return blob
    }
    const host = this.hosts.get(cleanHostId)
    const preview = host?.lastFilePreview
    if (!preview) return null
    if (preview.hasBlob && !preview.dataBase64 && typeof preview.content !== 'string') {
      return null
    }
    if (expectedAt !== null && expectedAt !== undefined && expectedAt !== '' && Number(expectedAt) !== Number(preview.at)) {
      return null
    }
    return preview
  }

  pruneExpiredCommands(record, now = this.now()) {
    if (!record || !Array.isArray(record.commands) || record.commands.length === 0) return false
    const kept = []
    let prunedAny = false
    for (const cmd of record.commands) {
      if (cmd?.expiresAt && now > cmd.expiresAt) {
        prunedAny = true
        const cmdType = String(cmd.type || '').trim()
        const isApproval = cmdType === 'approve' || cmdType === 'deny' || cmdType === 'approval'
        if (isApproval) {
          const code = String(cmd.code || '').trim().toUpperCase()
          const ledgerKey = code ? `${record.hostId}:${code}` : ''
          const entry = ledgerKey ? this.approvalLedger.get(ledgerKey) : null
          if (entry && (!entry.actionId || entry.actionId === cmd.id) && entry.status === 'settling') {
            entry.status = 'failed'
            entry.failedAt = now
            entry.error = '等待电脑端执行审批超时（45s），请重试'
            entry.expiresAt = now + 60_000
          }
        }
        const expiredRes = {
          id: cmd.id,
          commandId: cmd.id,
          type: cmd.type,
          agentId: cmd.agentId || '',
          text: cmd.text || cmd.prompt || '',
          createdAt: cmd.createdAt || now,
          ok: false,
          expired: true,
          error: isApproval
            ? '等待电脑端执行审批超时（45s），该审批指令已自动作废'
            : '指令排队已超时（超过 10 分钟未上线），已自动丢弃未执行',
          at: now,
        }
        record.recentResults = record.recentResults ?? []
        record.recentResults.push(expiredRes)
        if (record.recentResults.length > 25) {
          record.recentResults.splice(0, record.recentResults.length - 25)
        }
        if (cmd.id) {
          this.commandResultsById.set(cmd.id, { hostId: record.hostId, ...expiredRes })
        }
        continue
      }
      kept.push(cmd)
    }
    if (prunedAny) {
      record.commands = kept
    }
    return prunedAny
  }

  pruneInflightCommands(record, now = this.now()) {
    if (!record || !Array.isArray(record.inflightCommands) || record.inflightCommands.length === 0) {
      return []
    }
    const tasks = Array.isArray(record.bridgeState?.tasks) ? record.bridgeState.tasks : []
    const kept = []
    for (const ic of record.inflightCommands) {
      if (!ic || now - (ic.pulledAt || ic.createdAt || 0) > 25_000) continue
      const task = tasks.find(t => t && t.id === ic.agentId)
      const tr = Array.isArray(task?.transcript) ? task.transcript : []
      const icText = String(ic.text || '').trim()
      let sameCount = 0
      let lastMatchIdx = -1
      for (let i = 0; i < tr.length; i += 1) {
        const m = tr[i]
        const mText = String(m?.text || '').trim()
        if (m && m.role === 'user' && icText && (mText === icText || mText.startsWith(`${icText}\n`))) {
          sameCount += 1
          lastMatchIdx = i
        }
      }
      const curTotal = Math.max(Number(task?.messageCount) || 0, tr.length)
      const synced =
        lastMatchIdx >= 0 &&
        ((ic.baselineSameCount || 0) === 0 ||
          sameCount > (ic.baselineSameCount || 0) ||
          (curTotal > (ic.baselineTotalCount || 0) && lastMatchIdx >= Math.max(0, tr.length - 3)))
      if (synced) continue
      kept.push(ic)
    }
    record.inflightCommands = kept
    return kept
  }

  clearFilePreview(hostId) {
    const cleanHostId = String(hostId ?? '').trim()
    this.filePreviewBlobs.delete(cleanHostId)
    const host = this.hosts.get(cleanHostId)
    if (host) {
      host.lastFilePreview = null
      void this.persist()
      this.emitStateChange('preview_cleared')
    }
    return { ok: true }
  }

  async persist() {
    if (!this.stateFile) return
    try {
      await mkdir(dirname(this.stateFile), { recursive: true })
      const now = this.now()
      const payload = {
        activeHostId: this.activeHostId,
        vapidKeys: this.vapidKeys,
        pushSubscriptions: [...this.pushSubscriptions.values()],
        hosts: [...this.hosts.values()].map(h => ({
          ...h,
          lastFilePreview: h.lastFilePreview ? this.sanitizeFilePreviewForState(h.hostId, h.lastFilePreview) : null,
          commands: (h.commands ?? []).filter(c => c && (!c.expiresAt || now <= c.expiresAt)),
          recentResults: (h.recentResults ?? []).slice(-15).map(r => {
            if (
              r &&
              (r.dataBase64 ||
                Array.isArray(r.transcript) ||
                (typeof r.content === 'string' && r.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))
            ) {
              const { dataBase64, content, transcript, ...rest } = r
              return { ...rest, hasBlob: true }
            }
            return r
          }),
        })),
        snapshots: [...this.snapshots.values()],
        shares: [...this.shares.values()],
        approvalLedger: [...this.approvalLedger.entries()],
        sessionReadState: Object.fromEntries(this.sessionReadState),
        enrollment: this.enrollment,
      }
      await writeFile(this.stateFile, JSON.stringify(payload), 'utf8')
    } catch {
      // best effort persistence
    }
  }

  isOnline(host) {
    if (!host?.lastSeen) return false
    return this.now() - host.lastSeen <= ONLINE_TTL_MS
  }

  getHostsSummary() {
    const list = []
    for (const host of this.hosts.values()) {
      const online = this.isOnline(host)
      const bridge = host.bridgeState ?? {}
      const dsh = host.dshStats ?? {}
      const trust = host.trust ?? { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' }
      list.push({
        hostId: host.hostId,
        hostName: host.hostName || host.hostId,
        platform: host.platform || '',
        arch: host.arch || '',
        online,
        lastSeen: host.lastSeen,
        isFeishuActive: this.activeHostId === host.hostId,
        feishuConnected: Boolean(bridge.feishuConnected),
        feishuStandby: Boolean(bridge.feishuStandby),
        remoteActive: Boolean(bridge.remoteActive),
        runningCount: Number(bridge.runningCount) || 0,
        taskCount: Number(bridge.taskCount) || 0,
        sessionCount: Number(dsh.sessionCount) || 0,
        totalBytes: Number(dsh.totalBytes) || 0,
        fileCount: Number(dsh.fileCount) || 0,
        trustStatus: trust.status || 'unpinned',
        fingerprint: trust.pinnedFingerprint || host.identity?.fingerprint || '',
        hasDedicatedToken: Boolean(host.hostToken),
        hostTokenPreview: host.hostTokenPreview || '',
        hostTokenCreatedAt: host.hostTokenCreatedAt || 0,
        systemTelemetry: bridge.systemTelemetry || null,
      })
    }
    return list
  }

  getUsageStats() {
    const summaries = this.getHostsSummary()
    return {
      totalHosts: summaries.length,
      onlineHosts: summaries.filter(h => h.online).length,
      totalRunningTasks: summaries.reduce((acc, h) => acc + h.runningCount, 0),
      totalTasks: summaries.reduce((acc, h) => acc + h.taskCount, 0),
      totalSessionsOnDisk: summaries.reduce((acc, h) => acc + h.sessionCount, 0),
      totalStorageBytes: summaries.reduce((acc, h) => acc + h.totalBytes, 0),
      snapshotsCount: this.snapshots.size,
      sharesCount: this.shares.size,
      pushSubscriptionsCount: this.pushSubscriptions.size,
      totalCommandsExecuted: this.totalCommandsExecuted,
    }
  }

  reconcileBridgeStateApprovals(hostId, bridgeState, now = this.now()) {
    if (!bridgeState || typeof bridgeState !== 'object') {
      return { tasks: [], approvals: [], workspaces: [] }
    }
    const prefix = `${hostId}:`
    for (const [k, entry] of this.approvalLedger.entries()) {
      if (!k.startsWith(prefix)) continue
      if (entry.status === 'settling' && now > entry.expiresAt) {
        entry.status = 'failed'
        entry.failedAt = now
        entry.error = '等待电脑端执行审批超时（45s），请重试'
        entry.expiresAt = now + 60_000
      } else if ((entry.status === 'settled' || entry.status === 'failed') && now > entry.expiresAt) {
        this.approvalLedger.delete(k)
      }
    }

    const decorateApproval = app => {
      if (!app || !app.code) return app
      const code = String(app.code).trim().toUpperCase()
      const entry = this.approvalLedger.get(`${hostId}:${code}`)
      if (!entry) return app
      if (entry.status === 'settled') return null
      if (entry.status === 'settling') {
        return {
          ...app,
          settling: true,
          settlingDecision: entry.decision,
          settlingOptionIndex: entry.optionIndex,
          settlingAt: entry.requestedAt,
          actionId: entry.actionId,
          lastError: '',
        }
      }
      if (entry.status === 'failed') {
        return {
          ...app,
          settling: false,
          lastError: entry.error || '电脑端执行审批失败',
          failedAt: entry.failedAt,
          actionId: entry.actionId,
        }
      }
      return app
    }

    const approvals = Array.isArray(bridgeState.approvals)
      ? bridgeState.approvals.map(decorateApproval).filter(Boolean)
      : []

    const tasks = Array.isArray(bridgeState.tasks)
      ? bridgeState.tasks.map((t, taskIdx) => {
          let nextTask = t
          const isDshTask =
            nextTask?.harness === 'dsh' ||
            (!nextTask?.harness && String(nextTask?.id || '').startsWith('session-'))
          if (isDshTask && nextTask?.controlMode === 'observe-only') {
            nextTask = {
              ...nextTask,
              controlMode: 'idle-resumable',
              capabilities: {
                ...(nextTask.capabilities || {}),
                canCreateSession: true,
                canPrompt: true,
              },
            }
          }
          if (nextTask?.pendingApproval?.code) {
            const decorated = decorateApproval(nextTask.pendingApproval)
            if (!decorated) {
              nextTask = {
                ...nextTask,
                pendingApproval: null,
                status: nextTask.status === 'approval' ? 'running' : nextTask.status,
                turnState: nextTask.turnState === 'approval' ? 'running' : nextTask.turnState,
              }
            } else if (decorated !== nextTask.pendingApproval) {
              nextTask = { ...nextTask, pendingApproval: decorated }
            }
          }
          return nextTask
        })
      : []

    return {
      ...bridgeState,
      tasks,
      approvals,
    }
  }

  compactBridgeStateForWire(bridgeState) {
    if (!bridgeState || typeof bridgeState !== 'object') {
      return { tasks: [], approvals: [], workspaces: [] }
    }
    const tasks = Array.isArray(bridgeState.tasks)
      ? bridgeState.tasks.map((nextTask, taskIdx) => {
          // Server-side transcript & preview budget guard so /api/state and SSE never exceed ~1MB across all hosts
          const isTopSession = taskIdx < 8 || nextTask?.status === 'running' || nextTask?.status === 'approval'
          const maxMsgs = isTopSession ? 14 : 6
          const rawTr = Array.isArray(nextTask?.transcript) ? nextTask.transcript : []
          const totalTranscriptCount = Math.max(Number(nextTask?.messageCount) || 0, rawTr.length)
          const slicedTr = rawTr.length > maxMsgs ? rawTr.slice(-maxMsgs) : rawTr
          const omittedTranscriptCount = Math.max(0, totalTranscriptCount - slicedTr.length)
          const recentCutoff = Math.max(0, slicedTr.length - 4)
          const compactedTr = slicedTr.map((m, mIdx) => {
            if (!m || typeof m !== 'object') return m
            const { toolCalls: _omitTc, ...mRest } = m
            if (m.role !== 'assistant') return mRest
            const isRecent = mIdx >= recentCutoff
            const maxText = isRecent ? 48000 : 10000
            const maxThink = isRecent ? 10000 : 600
            const maxTools = isRecent ? 24 : 6
            const maxCmd = isRecent ? 1200 : 200
            const rawTools = Array.isArray(m.tools) ? m.tools : Array.isArray(m.toolCalls) ? m.toolCalls : []
            return {
              ...mRest,
              text: typeof m.text === 'string' && m.text.length > maxText ? m.text.slice(0, maxText) : m.text,
              thinking:
                typeof m.thinking === 'string' && m.thinking.length > maxThink
                  ? `${m.thinking.slice(0, maxThink)}\n...(历史思考已折叠)...`
                  : m.thinking,
              tools: rawTools.slice(0, maxTools).map(tl =>
                typeof tl === 'string'
                  ? { name: tl, id: '', summary: '', commandLine: '执行完毕' }
                  : {
                      name: tl?.name || 'tool',
                      id: tl?.id || '',
                      summary: tl?.summary ? String(tl.summary).slice(0, 160) : '',
                      commandLine: tl?.commandLine ? String(tl.commandLine).slice(0, maxCmd) : '执行完毕',
                    },
              ),
            }
          })
          const walkthroughArt = Array.isArray(nextTask?.artifacts)
            ? nextTask.artifacts.find(a => a?.kind === 'walkthrough')
            : null
          if (walkthroughArt && compactedTr.length > 0) {
            const alreadyInCompacted = compactedTr.some(
              m =>
                (Array.isArray(m?.artifacts) && m.artifacts.some(a => a?.path === walkthroughArt.path))
                || String(m?.text || '').includes(walkthroughArt.path),
            )
            if (!alreadyInCompacted) {
              for (let idx = compactedTr.length - 1; idx >= 0; idx -= 1) {
                const msg = compactedTr[idx]
                if (msg && msg.role === 'assistant' && !msg.waitingForInput) {
                  msg.artifacts = [...(Array.isArray(msg.artifacts) ? msg.artifacts : []), walkthroughArt]
                  break
                }
              }
            }
          }
          return {
            ...nextTask,
            lastOutput:
              typeof nextTask?.lastOutput === 'string' && nextTask.lastOutput.length > 600
                ? nextTask.lastOutput.slice(0, 600)
                : nextTask?.lastOutput,
            totalTranscriptCount,
            omittedTranscriptCount,
            hasMoreTranscript: omittedTranscriptCount > 0,
            transcript: compactedTr,
          }
        })
      : []

    return {
      ...bridgeState,
      tasks,
    }
  }

  getSessionFullTranscript(hostId, agentId) {
    const cleanHostId = String(hostId ?? '').trim()
    const cleanAgentId = String(agentId ?? '').trim()
    if (!cleanHostId || !cleanAgentId) return null
    const cached = this.fullTranscriptCache.get(`${cleanHostId}:${cleanAgentId}`)
    const host = this.hosts.get(cleanHostId)
    const liveTask = (host?.bridgeState?.tasks || []).find(t => t?.id === cleanAgentId)
    const liveTr = Array.isArray(liveTask?.transcript) ? liveTask.transcript : []
    if (!liveTask && !cached) return null

    let bestTr = liveTr
    let fromCache = false
    let staleCache = false
    if (cached && Array.isArray(cached.transcript) && cached.transcript.length > liveTr.length) {
      fromCache = true
      const revChanged = Boolean(
        cached.sessionRev && liveTask?.sessionRev && cached.sessionRev !== liveTask.sessionRev,
      )
      if (liveTr.length === 0) {
        bestTr = [...cached.transcript]
      } else {
        const firstLive = liveTr[0]
        const matchIdx = cached.transcript.findIndex(
          m =>
            m &&
            m.role === firstLive?.role &&
            String(m.text || '').slice(0, 80) === String(firstLive?.text || '').slice(0, 80),
        )
        if (matchIdx > 0) {
          bestTr = [...cached.transcript.slice(0, matchIdx), ...liveTr]
        } else {
          // Append any newer messages from liveTr that aren't at the end of cached.transcript
          const lastCached = cached.transcript.at(-1)
          const lastCachedMatchInLive = lastCached
            ? liveTr.findIndex(
                m =>
                  m &&
                  m.role === lastCached.role &&
                  String(m.text || '').slice(0, 80) === String(lastCached.text || '').slice(0, 80),
              )
            : -1
          if (lastCachedMatchInLive >= 0 && lastCachedMatchInLive < liveTr.length - 1) {
            bestTr = [...cached.transcript, ...liveTr.slice(lastCachedMatchInLive + 1)]
          } else {
            bestTr = [...cached.transcript]
            if (revChanged) staleCache = true
          }
        }
      }
    }

    const totalCount = Math.max(
      Number(liveTask?.totalTranscriptCount) || 0,
      Number(liveTask?.messageCount) || 0,
      Number(cached?.totalCount) || 0,
      bestTr.length,
    )
    const hasMore = bestTr.length < totalCount || staleCache
    return {
      ok: true,
      hostId: cleanHostId,
      agentId: cleanAgentId,
      totalCount,
      hasMore,
      fromCache,
      sessionRev: liveTask?.sessionRev || cached?.sessionRev || '',
      transcript: bestTr,
    }
  }

  getFullState() {
    const now = this.now()
    let prunedAnyHost = false
    const summaryById = new Map(this.getHostsSummary().map(item => [item.hostId, item]))
    const hosts = [...this.hosts.values()].map(host => {
      if (this.pruneExpiredCommands(host, now)) {
        prunedAnyHost = true
      }
      const summary = summaryById.get(host.hostId) ?? {}
      const sanitizedPreview = host.lastFilePreview
        ? this.sanitizeFilePreviewForState(host.hostId, host.lastFilePreview)
        : null
      if (sanitizedPreview && host.lastFilePreview?.dataBase64) {
        host.lastFilePreview = sanitizedPreview
      }
      const activeCommands = host.commands ?? []
      const reconciledBridgeState = this.compactBridgeStateForWire(
        this.reconcileBridgeStateApprovals(
          host.hostId,
          host.bridgeState ?? { tasks: [], approvals: [], workspaces: [] },
          now,
        ),
      )
      return {
        ...summary,
        activelyConnected: Boolean(host.lastSeen && now - host.lastSeen <= ACTIVE_HEARTBEAT_WINDOW_MS),
        syncMeta: host.syncMeta ?? null,
        identity: host.identity ?? null,
        trust: host.trust ?? { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' },
        dshStats: host.dshStats ?? {},
        bridgeState: reconciledBridgeState,
        lastFsListing: host.lastFsListing ?? null,
        lastFilePreview: sanitizedPreview,
        lastShareResult: host.lastShareResult ?? null,
        pendingCommandsCount: activeCommands.length,
        pendingCommands: activeCommands.map(c => ({
          id: c.id,
          type: c.type,
          agentId: c.agentId || '',
          text: c.text || '',
          createdAt: c.createdAt || now,
          expiresAt: c.expiresAt || 0,
          queued: Boolean(c.queued),
        })),
        inflightCommands: this.pruneInflightCommands(host, now).map(ic => ({
          id: ic.id,
          type: ic.type,
          agentId: ic.agentId || '',
          text: ic.text || '',
          createdAt: ic.createdAt || now,
          pulledAt: ic.pulledAt || now,
          baselineSameCount: ic.baselineSameCount || 0,
          baselineTotalCount: ic.baselineTotalCount || 0,
        })),
        recentResults: (host.recentResults ?? [])
          .slice(-10)
          .reverse()
          .map(r => {
            if (
              r &&
              (r.dataBase64 ||
                Array.isArray(r.transcript) ||
                (typeof r.content === 'string' && r.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))
            ) {
              const { dataBase64, content, transcript, ...rest } = r
              return { ...rest, hasBlob: true }
            }
            return r
          }),
      }
    })
    const snapshots = [...this.snapshots.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        meta: s.meta,
      }))
    const migrations = [...this.migrations.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
    const shares = this.listShares()
    if (prunedAnyHost) {
      void this.persist()
    }
    return {
      now,
      ...(this.buildInfo ? { build: this.buildInfo } : {}),
      activeHostId: this.activeHostId,
      mediaTicket: this.issueMediaTicket(now),
      vapidPublicKey: this.vapidKeys.publicKey,
      pushSubscriptions: this.listPushSubscriptions(),
      pushHistory: this.pushHistory.slice(-10).reverse(),
      stats: this.getUsageStats(),
      enrollment: this.getOrCreateEnrollmentCode(),
      sessionReadState: Object.fromEntries(this.sessionReadState),
      hosts,
      snapshots,
      migrations,
      shares,
    }
  }

  markSessionRead({ sessionId = '', sig = '', at = 0 } = {}) {
    const cleanId = String(sessionId ?? '').trim()
    if (!cleanId) return { ok: false, error: 'sessionId is required' }
    const now = this.now()
    const prev = this.sessionReadState.get(cleanId)
    const nextAt = Math.max(Number(at) || 0, Number(prev?.at) || 0, now)
    const nextSig = String(sig || prev?.sig || '')
    this.sessionReadState.set(cleanId, { unread: false, sig: nextSig, at: nextAt })
    while (this.sessionReadState.size > 500) {
      const oldestKey = this.sessionReadState.keys().next().value
      this.sessionReadState.delete(oldestKey)
    }
    void this.persist()
    return { ok: true, sessionId: cleanId, readState: { unread: false, sig: nextSig, at: nextAt } }
  }

  getVapidPublicKey() {
    return this.vapidKeys.publicKey
  }

  addPushSubscription({ subscription, deviceName = 'iPhone / Web App', userAgent = '' } = {}) {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return { ok: false, error: '无效的 Web Push 订阅数据（缺少 endpoint 或 p256dh/auth 密钥）' }
    }
    const endpoint = String(subscription.endpoint).trim()
    let endpointHost = 'push-service'
    try {
      endpointHost = new URL(endpoint).host
    } catch {
      // ignore invalid URL parse
    }
    const existing = this.pushSubscriptions.get(endpoint)
    const record = {
      id: existing?.id || `sub-${randomBytes(4).toString('hex')}`,
      endpoint,
      endpointHost,
      keys: {
        p256dh: String(subscription.keys.p256dh),
        auth: String(subscription.keys.auth),
      },
      deviceName: String(deviceName || 'iPhone / Web App').slice(0, 64),
      userAgent: String(userAgent || '').slice(0, 160),
      createdAt: existing?.createdAt || this.now(),
      updatedAt: this.now(),
      lastSentAt: existing?.lastSentAt || 0,
    }
    this.unsubscribedEndpoints.delete(endpoint)
    this.pushSubscriptions.set(endpoint, record)
    void this.persist()
    this.emitStateChange('push_subscribed')
    return {
      ok: true,
      subscription: {
        id: record.id,
        deviceName: record.deviceName,
        endpointHost: record.endpointHost,
        createdAt: record.createdAt,
      },
    }
  }

  removePushSubscription(idOrEndpoint) {
    const target = String(idOrEndpoint ?? '').trim()
    if (!target) return { ok: false }
    if (this.pushSubscriptions.has(target)) {
      this.unsubscribedEndpoints.add(target)
      this.pushSubscriptions.delete(target)
      void this.persist()
      this.emitStateChange('push_unsubscribed')
      return { ok: true }
    }
    for (const [ep, sub] of this.pushSubscriptions) {
      if (sub.id === target) {
        this.unsubscribedEndpoints.add(ep)
        this.pushSubscriptions.delete(ep)
        void this.persist()
        this.emitStateChange('push_unsubscribed')
        return { ok: true }
      }
    }
    return { ok: false }
  }

  listPushSubscriptions() {
    return [...this.pushSubscriptions.values()].map(sub => ({
      id: sub.id,
      deviceName: sub.deviceName,
      endpointHost: sub.endpointHost,
      createdAt: sub.createdAt,
      lastSentAt: sub.lastSentAt || 0,
    }))
  }

  async broadcastWebPush(payloadObj = {}) {
    const subs = [...this.pushSubscriptions.values()]
    const record = {
      id: `push-${randomBytes(4).toString('hex')}`,
      at: this.now(),
      title: payloadObj.title || 'DSH 通知',
      body: payloadObj.body || '',
      tag: payloadObj.tag || 'dsh-notify',
      data: payloadObj.data || {},
      sentCount: 0,
      totalSubscriptions: subs.length,
    }
    this.pushHistory.push(record)
    if (this.pushHistory.length > 30) this.pushHistory.shift()

    if (subs.length === 0) {
      return { ok: true, sentCount: 0, totalSubscriptions: 0, results: [] }
    }

    const results = []
    for (const sub of subs) {
      try {
        const res = await sendWebPushNotification(sub, payloadObj, this.vapidKeys, {
          fetchImpl: this.pushFetch,
        })
        if (res.ok) {
          sub.lastSentAt = this.now()
          record.sentCount += 1
        } else if (res.expired) {
          this.pushSubscriptions.delete(sub.endpoint)
        }
        results.push({ id: sub.id, deviceName: sub.deviceName, ...res })
      } catch (error) {
        results.push({ id: sub.id, deviceName: sub.deviceName, ok: false, error: error?.message || 'push failed' })
      }
    }
    void this.persist()
    return {
      ok: true,
      sentCount: record.sentCount,
      totalSubscriptions: subs.length,
      results,
    }
  }

  detectAndTriggerWebPush(hostId, hostName, bridgeState) {
    if (!bridgeState || typeof bridgeState !== 'object') return
    const approvals = Array.isArray(bridgeState.approvals) ? bridgeState.approvals : []
    const tasks = Array.isArray(bridgeState.tasks) ? bridgeState.tasks : []

    // 1. Check for new pending approvals or selection questions
    for (const app of approvals) {
      if (!app?.code || this.pushedApprovalCodes.has(app.code)) continue
      this.pushedApprovalCodes.add(app.code)
      while (this.pushedApprovalCodes.size > 300) {
        this.pushedApprovalCodes.delete(this.pushedApprovalCodes.values().next().value)
      }
      const isQuestion = app.kind === 'question' || Array.isArray(app.questions)
      void this.broadcastWebPush({
        title: isQuestion
          ? `💬 [${hostName}] 待你选择：${app.title || app.toolName}`
          : `⏳ [${hostName}] 待审批：${app.title || app.toolName}`,
        body: isQuestion
          ? `${app.promptTitle || app.reason || '等待你做出选择'}（点击立即选择）`
          : `工具 ${app.toolName}：${app.reason || '请求执行权限'}（点击立即处理）`,
        tag: `approval-${app.code}`,
        badgeCount: approvals.length,
        data: {
          type: 'approval',
          hostId,
          hostName,
          agentId: app.agentId,
          code: app.code,
          url: `/?host=${encodeURIComponent(hostId)}&task=${encodeURIComponent(app.agentId || '')}`,
        },
      })
    }

    // 2. Check for task completion or failure transitions
    for (const task of tasks) {
      if (!task?.id) continue
      const key = `${hostId}:${task.id}`
      const prevStatus = this.hostTaskStates.get(key)
      const curStatus = String(task.status || 'unknown')
      const isStillMidTurn =
        Boolean(task.isMidTurn) ||
        Boolean(task.hasActiveBackgroundTask) ||
        task.turnState === 'running' ||
        task.turnState === 'approval'
      const effectiveStatus = curStatus === 'idle' && isStillMidTurn ? 'running' : curStatus
      this.hostTaskStates.set(key, effectiveStatus)
      if (!prevStatus || prevStatus === effectiveStatus) continue

      if (prevStatus === 'running' && effectiveStatus === 'idle') {
        if (task.turnState === 'interrupted') continue
        const completionSig = `${task.lastStepIndex ?? ''}:${task.lastConclusionAt || ''}:${String(task.lastOutput || '').slice(0, 80)}`
        if (completionSig && this.pushedCompletionSigs.get(key) === completionSig) continue
        if (completionSig) {
          this.pushedCompletionSigs.set(key, completionSig)
          while (this.pushedCompletionSigs.size > 400) {
            this.pushedCompletionSigs.delete(this.pushedCompletionSigs.keys().next().value)
          }
        }
        this.sessionReadState.set(task.id, {
          unread: true,
          sig: '',
          at: Number(task.lastConclusionAt) || Number(task.updatedAt) || this.now(),
        })
        void this.broadcastWebPush({
          title: `✅ [${hostName}] 任务完成：${task.title}`,
          body: task.lastOutput ? String(task.lastOutput).slice(0, 120) : '任务已执行完毕，点击查看结果或继续指令',
          tag: `done-${task.id}`,
          badgeCount: approvals.length + 1,
          data: {
            type: 'completed',
            hostId,
            hostName,
            agentId: task.id,
            url: `/?host=${encodeURIComponent(hostId)}&task=${encodeURIComponent(task.id)}`,
          },
        })
      } else if ((curStatus === 'error' || curStatus === 'failed') && prevStatus !== curStatus) {
        void this.broadcastWebPush({
          title: `⚠️ [${hostName}] 任务异常：${task.title}`,
          body: `状态：${task.statusLabel || curStatus}，点击打开控制台排查`,
          tag: `fail-${task.id}`,
          badgeCount: approvals.length + 1,
          data: {
            type: 'failed',
            hostId,
            hostName,
            agentId: task.id,
            url: `/?host=${encodeURIComponent(hostId)}&task=${encodeURIComponent(task.id)}`,
          },
        })
      }
    }
  }

  handleHeartbeat(payload = {}) {
    const hostId = String(payload.hostId ?? '').trim()
    if (!hostId) throw new Error('hostId is required')
    const hostName = String(payload.hostName || hostId).trim()
    const now = this.now()

    let record = this.hosts.get(hostId)
    if (record?.trust?.status === 'revoked') {
      return {
        ok: false,
        code: 'DEVICE_REVOKED',
        error: `设备 ${hostId} 已被吊销访问权限`,
      }
    }

    const incomingIdentity = payload.identity && typeof payload.identity === 'object' ? payload.identity : null
    if (record?.trust?.status === 'pinned' && record.trust.pinnedPublicKey && incomingIdentity?.publicKey) {
      if (record.trust.pinnedPublicKey !== incomingIdentity.publicKey) {
        return {
          ok: false,
          code: 'PEER_IDENTITY_MISMATCH',
          error: `设备 ${hostId} 公钥指纹异常变更，已拒绝同步（防伪造保护）`,
        }
      }
    }

    const incomingSync = payload.syncMeta && typeof payload.syncMeta === 'object' ? payload.syncMeta : null
    let isStaleSnapshot = false
    if (incomingSync && record?.syncMeta) {
      const prevSync = record.syncMeta
      if (incomingSync.bootId && prevSync.bootId && incomingSync.bootId === prevSync.bootId) {
        if (Number(incomingSync.seq) > 0 && Number(prevSync.seq) > 0 && Number(incomingSync.seq) < Number(prevSync.seq)) {
          isStaleSnapshot = true
        }
      } else if (incomingSync.bootId && prevSync.bootId && incomingSync.bootId !== prevSync.bootId) {
        if (
          Number(incomingSync.bootEpochMs) > 0 &&
          Number(prevSync.bootEpochMs) > 0 &&
          Number(incomingSync.bootEpochMs) < Number(prevSync.bootEpochMs)
        ) {
          isStaleSnapshot = true
        }
      }
    }

    if (!record) {
      const trust = incomingIdentity?.publicKey
        ? {
            status: 'pinned',
            pinnedPublicKey: incomingIdentity.publicKey,
            pinnedFingerprint: incomingIdentity.fingerprint || '',
            pinnedAt: now,
          }
        : { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' }
      record = {
        hostId,
        hostName,
        platform: payload.platform || '',
        arch: payload.arch || '',
        identity: incomingIdentity,
        syncMeta: incomingSync
          ? {
              bootId: String(incomingSync.bootId || ''),
              bootEpochMs: Number(incomingSync.bootEpochMs) || now,
              seq: Number(incomingSync.seq) || 0,
              capturedAt: Number(incomingSync.capturedAt) || now,
            }
          : null,
        trust,
        lastSeen: now,
        ...(payload.presentedHostToken && /^hst_[0-9a-f]{48}$/.test(payload.presentedHostToken)
          ? {
              hostToken: payload.presentedHostToken,
              hostTokenCreatedAt: now,
              hostTokenPreview: `${payload.presentedHostToken.slice(0, 8)}...${payload.presentedHostToken.slice(-4)}`,
            }
          : {}),
        dshStats: payload.dshStats ?? {},
        bridgeState: payload.bridgeState ?? { tasks: [], approvals: [], workspaces: [] },
        commands: [],
        recentResults: [],
      }
      this.hosts.set(hostId, record)
    } else {
      record.hostName = hostName
      record.platform = payload.platform || record.platform
      record.arch = payload.arch || record.arch
      record.lastSeen = now
      if (incomingIdentity) {
        record.identity = incomingIdentity
        if (!record.trust || record.trust.status === 'unpinned') {
          record.trust = {
            status: 'pinned',
            pinnedPublicKey: incomingIdentity.publicKey || '',
            pinnedFingerprint: incomingIdentity.fingerprint || '',
            pinnedAt: now,
          }
        }
      }
      if (!isStaleSnapshot) {
        if (incomingSync) {
          record.syncMeta = {
            bootId: String(incomingSync.bootId || ''),
            bootEpochMs: Number(incomingSync.bootEpochMs) || now,
            seq: Number(incomingSync.seq) || 0,
            capturedAt: Number(incomingSync.capturedAt) || now,
          }
        }
        if (payload.dshStats) record.dshStats = payload.dshStats
        if (payload.bridgeState) {
          record.bridgeState = payload.bridgeState
          if (payload.bridgeStateSig) {
            record._lastBridgeStateSig = String(payload.bridgeStateSig)
          }
        } else if (payload.liteHeartbeat && record.bridgeState && payload.systemTelemetry) {
          record.bridgeState.systemTelemetry = payload.systemTelemetry
        }
      }
    }

    const existingTasksCount = Array.isArray(record?.bridgeState?.tasks) ? record.bridgeState.tasks.length : 0
    const expectedTasksCount = Number(payload.expectedTaskCount) || 0
    const needFullSync = Boolean(
      payload.liteHeartbeat
      && (
        !record?._lastBridgeStateSig
        || (payload.bridgeStateSig && record._lastBridgeStateSig !== String(payload.bridgeStateSig))
        || (expectedTasksCount > 0 && existingTasksCount === 0)
      ),
    )

    if (!this.activeHostId) {
      this.activeHostId = hostId
    } else {
      const currentActive = this.hosts.get(this.activeHostId)
      if (!currentActive || currentActive.trust?.status === 'revoked') {
        this.activeHostId = hostId
      }
    }

    if (Array.isArray(payload.commandResults) && payload.commandResults.length > 0) {
      for (const res of payload.commandResults) {
        this.totalCommandsExecuted += 1
        this.onCommandResult(hostId, res)
        const lightResForById =
          res && (res.dataBase64 || (typeof res.content === 'string' && res.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))
            ? (({ dataBase64, content, ...rest }) => ({ ...rest, hasBlob: true }))(res)
            : res
        const lightResForState =
          lightResForById && Array.isArray(lightResForById.transcript)
            ? (({ transcript, ...rest }) => ({ ...rest, transcriptCount: transcript.length }))(lightResForById)
            : lightResForById
        record.recentResults.push(lightResForState)
        if (res?.id) {
          this.commandResultsById.set(res.id, { hostId, ...lightResForById })
          if (this.commandResultsById.size > 300) {
            const oldest = this.commandResultsById.keys().next().value
            this.commandResultsById.delete(oldest)
          }
        }
      }
      if (record.recentResults.length > 25) {
        record.recentResults.splice(0, record.recentResults.length - 25)
      }
    }

    if (Array.isArray(payload.pushSubscriptionsBackup) && payload.pushSubscriptionsBackup.length > 0) {
      for (const sub of payload.pushSubscriptionsBackup) {
        if (
          sub?.endpoint &&
          sub?.keys?.p256dh &&
          sub?.keys?.auth &&
          !this.pushSubscriptions.has(sub.endpoint) &&
          !this.unsubscribedEndpoints.has(sub.endpoint)
        ) {
          this.pushSubscriptions.set(sub.endpoint, sub)
        }
      }
    }

    if ((payload.bridgeState || Array.isArray(payload.liveApprovalCodes)) && !isStaleSnapshot) {
      const rawCodes = payload.bridgeState
        ? (Array.isArray(payload.bridgeState.approvals) ? payload.bridgeState.approvals.map(a => a?.code) : [])
        : payload.liveApprovalCodes
      const liveCodes = new Set(
        (rawCodes || []).map(c => String(c || '').trim().toUpperCase()).filter(Boolean),
      )
      const prefix = `${hostId}:`
      for (const [k, entry] of this.approvalLedger.entries()) {
        if (!k.startsWith(prefix)) continue
        if (entry.status === 'settling' && entry.pulledByHost && !liveCodes.has(entry.code)) {
          entry.status = 'settled'
          entry.settledAt = now
          entry.expiresAt = now + APPROVAL_SETTLED_COOL_MS
        }
      }
      if (payload.bridgeState) {
        this.detectAndTriggerWebPush(hostId, hostName, payload.bridgeState)
      }
    }

    if (Array.isArray(payload.prewarmedFiles) && payload.prewarmedFiles.length > 0 && !isStaleSnapshot) {
      for (const item of payload.prewarmedFiles) {
        if (!item?.relPath || typeof item.content !== 'string') continue
        if (Buffer.byteLength(item.content, 'utf8') > 256 * 1024) continue
        this.storeFsHotCache(hostId, item.relPath, {
          ok: true,
          kind: item.kind || 'text',
          mime: item.mime || 'text/markdown; charset=utf-8',
          name: item.name || String(item.relPath).split('/').filter(Boolean).pop() || 'file.md',
          ext: item.ext || '.md',
          relPath: item.relPath,
          size: Number(item.size) || Buffer.byteLength(item.content, 'utf8'),
          mtimeMs: Number(item.mtimeMs) || now,
          etag: item.etag || '',
          content: item.content,
        })
      }
    }

    const hasCommandActivity = (Array.isArray(payload.commandResults) && payload.commandResults.length > 0)
      || record.commands.length > 0
    this.pruneExpiredCommands(record, now)
    if (Array.isArray(payload.commandResults) && payload.commandResults.length > 0 && Array.isArray(record.inflightCommands)) {
      const failedIds = new Set(
        payload.commandResults.filter(r => r && r.id && r.ok === false).map(r => r.id),
      )
      if (failedIds.size > 0) {
        record.inflightCommands = record.inflightCommands.filter(ic => !failedIds.has(ic.id))
      }
    }
    this.pruneInflightCommands(record, now)
    const commands = isStaleSnapshot ? [] : record.commands.splice(0)
    const fsRequests = isStaleSnapshot ? [] : this.drainPendingFsRequests(hostId)
    for (const cmd of commands) {
      if ((cmd?.type === 'prompt' || cmd?.type === 'steer') && cmd.agentId) {
        const curTask = (record.bridgeState?.tasks || []).find(t => t && t.id === cmd.agentId)
        const curTr = Array.isArray(curTask?.transcript) ? curTask.transcript : []
        const cmdText = String(cmd.text || cmd.prompt || '').trim()
        const baselineSameCount = curTr.filter(m => {
          const mText = String(m?.text || '').trim()
          return m && m.role === 'user' && cmdText && (mText === cmdText || mText.startsWith(`${cmdText}\n`))
        }).length
        const baselineTotalCount = Math.max(Number(curTask?.messageCount) || 0, curTr.length)
        record.inflightCommands = record.inflightCommands ?? []
        record.inflightCommands.push({
          id: cmd.id,
          type: cmd.type,
          agentId: cmd.agentId,
          text: cmdText,
          createdAt: cmd.createdAt || now,
          pulledAt: now,
          baselineSameCount,
          baselineTotalCount,
        })
        if (record.inflightCommands.length > 15) {
          record.inflightCommands.splice(0, record.inflightCommands.length - 15)
        }
      }
      if (cmd?.type === 'approve' || cmd?.type === 'deny' || cmd?.type === 'approval') {
        const code = String(cmd.code || '').trim().toUpperCase()
        const entry = code ? this.approvalLedger.get(`${hostId}:${code}`) : null
        if (entry) {
          entry.pulledByHost = true
          entry.pulledAt = now
        }
      }
    }
    const nextFingerprint = this.computeHostFingerprint(record)
    const stateChanged = hasCommandActivity || nextFingerprint !== record._lastFingerprint
    if (stateChanged || now - (record._lastBroadcastAt || 0) >= 60_000) {
      record._lastFingerprint = nextFingerprint
      record._lastBroadcastAt = now
      void this.persist()
      this.emitStateChange('heartbeat')
    }

    return {
      ok: true,
      staleSnapshotIgnored: isStaleSnapshot,
      ...(needFullSync ? { needFullSync: true } : {}),
      activeHostId: this.activeHostId,
      shouldConnectFeishu: this.activeHostId === hostId,
      commands,
      ...(fsRequests.length > 0 ? { fsRequests } : {}),
      hostsSummary: this.getHostsSummary(),
      ...(!payload.liteHeartbeat || needFullSync
        ? { pushSubscriptionsBackup: [...this.pushSubscriptions.values()] }
        : {}),
    }
  }

  computeHostFingerprint(record) {
    const b = this.reconcileBridgeStateApprovals(record?.hostId || '', record?.bridgeState ?? {})
    const tasksSig = Array.isArray(b.tasks)
      ? b.tasks
          .map(t => {
            const tr = Array.isArray(t.transcript) ? t.transcript : []
            const last = tr.at(-1)
            return `${t.id}:${t.title || ''}:${t.status || ''}:${t.turnState || ''}:${t.sessionRev || ''}:${(t.lastOutput || '').slice(0, 120)}:${t.runningSummary || ''}:${tr.length}:${last?.role || ''}:${(last?.text || '').length}:${(last?.text || '').slice(-40)}:${(last?.thinking || '').length}:${(last?.tools || []).length}:${(t.changedFiles || []).length}:${(t.artifacts || []).length}`
          })
          .join('|')
      : ''
    const appSig = Array.isArray(b.approvals)
      ? b.approvals.map(a => `${a.code}:${a.promptTitle || ''}:${Boolean(a.settling)}:${a.lastError || ''}`).join('|')
      : ''
    const fsSig = `${record?.lastFsListing?.at || 0}:${record?.lastFilePreview?.at || 0}:${record?.lastShareResult?.at || 0}`
    return `${record?.hostName || ''}:${record?.trust?.status || ''}:${b.agentVersion || ''}:${Boolean(b.remoteActive)}:${Boolean(b.feishuConnected)}:${tasksSig}#${appSig}#${fsSig}`
  }

  manageHostTrust(hostId, { action = 'pin' } = {}) {
    const record = this.hosts.get(hostId)
    if (!record) return { ok: false, error: `Host not found: ${hostId}` }
    const now = this.now()
    if (action === 'revoke' || action === 'revoke_token') {
      record.hostToken = ''
      record.hostTokenPreview = ''
      record.hostTokenRevokedAt = now
      record.trust = {
        ...(record.trust ?? {}),
        status: 'revoked',
        revokedAt: now,
      }
      if (this.activeHostId === hostId) {
        const nextHost = [...this.hosts.values()].find(h => h.hostId !== hostId && h.trust?.status !== 'revoked')
        this.activeHostId = nextHost?.hostId || ''
      }
      void this.persist()
      return { ok: true, hostId, trust: record.trust, tokenRevoked: true }
    }
    if (action === 'rotate_token') {
      const hostToken = `hst_${randomBytes(24).toString('hex')}`
      record.hostToken = hostToken
      record.hostTokenCreatedAt = now
      record.hostTokenPreview = `${hostToken.slice(0, 8)}...${hostToken.slice(-4)}`
      void this.persist()
      return {
        ok: true,
        hostId,
        hostToken,
        hostTokenPreview: record.hostTokenPreview,
      }
    }
    if (action === 'reset_pin' || action === 'unrevoke') {
      record.trust = {
        status: 'unpinned',
        pinnedPublicKey: '',
        pinnedFingerprint: '',
        resetAt: now,
      }
      void this.persist()
      return { ok: true, hostId, trust: record.trust }
    }
    if (action === 'pin') {
      record.trust = {
        status: 'pinned',
        pinnedPublicKey: record.identity?.publicKey || record.trust?.pinnedPublicKey || '',
        pinnedFingerprint: record.identity?.fingerprint || record.trust?.pinnedFingerprint || '',
        pinnedAt: now,
      }
      void this.persist()
      return { ok: true, hostId, trust: record.trust }
    }
    return { ok: false, error: `Unknown trust action: ${action}` }
  }

  getOrCreateEnrollmentCode({ ttlMs = 15 * 60_000, forceNew = false } = {}) {
    const now = this.now()
    if (
      !forceNew &&
      this.enrollment &&
      !this.enrollment.revoked &&
      this.enrollment.expiresAt > now
    ) {
      return {
        code: this.enrollment.code,
        createdAt: this.enrollment.createdAt,
        expiresAt: this.enrollment.expiresAt,
        joinedCount: this.enrollment.joinedCount || 0,
        joinedHostIds: [...(this.enrollment.joinedHostIds || [])],
      }
    }
    let raw = ''
    for (let i = 0; i < 8; i += 1) {
      raw += PAIRING_ALPHABET[randomInt(0, PAIRING_ALPHABET.length)]
    }
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`
    this.enrollment = {
      code: formatted,
      createdAt: now,
      expiresAt: now + ttlMs,
      joinedCount: 0,
      joinedHostIds: [],
      failedAttempts: 0,
      revoked: false,
    }
    void this.persist()
    return {
      code: this.enrollment.code,
      createdAt: this.enrollment.createdAt,
      expiresAt: this.enrollment.expiresAt,
      joinedCount: 0,
      joinedHostIds: [],
    }
  }

  joinHostWithCode({
    code = '',
    hostId = '',
    hostName = '',
    platform = '',
    arch = '',
    clientKey = 'global',
  } = {}) {
    const now = this.now()
    const bucketKey = `join:${String(clientKey || 'global').trim() || 'global'}`
    const bucket = (this.pairingFailBuckets.get(bucketKey) || []).filter(ts => now - ts < PAIRING_RATE_WINDOW_MS)
    if (bucket.length >= PAIRING_MAX_FAILS_PER_WINDOW) {
      this.pairingFailBuckets.set(bucketKey, bucket)
      return { ok: false, rateLimited: true, statusCode: 429, error: '尝试次数过多，请 1 分钟后再试' }
    }

    const recordFail = () => {
      bucket.push(now)
      this.pairingFailBuckets.set(bucketKey, bucket)
      if (this.enrollment && !this.enrollment.revoked) {
        this.enrollment.failedAttempts = (this.enrollment.failedAttempts || 0) + 1
        if (this.enrollment.failedAttempts >= 8) {
          this.enrollment.revoked = true
        }
        void this.persist()
      }
    }

    const normalizedInput = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!normalizedInput) {
      recordFail()
      return { ok: false, statusCode: 401, error: '配对码不能为空' }
    }
    if (!this.enrollment || this.enrollment.revoked) {
      recordFail()
      return { ok: false, statusCode: 401, error: '配对码无效或已失效，请在控制台刷新配对码' }
    }
    if (now > this.enrollment.expiresAt) {
      recordFail()
      return { ok: false, statusCode: 401, error: '配对码已过期，请在控制台刷新配对码' }
    }
    const normalizedExpected = String(this.enrollment.code).toUpperCase().replace(/[^A-Z0-9]/g, '')
    const a = Buffer.from(normalizedInput)
    const b = Buffer.from(normalizedExpected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      recordFail()
      return { ok: false, statusCode: 401, error: '配对码不正确' }
    }

    const rawId = String(hostId || hostName || `mac-${randomBytes(3).toString('hex')}`)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
    const cleanHostId = rawId || `mac-${randomBytes(3).toString('hex')}`
    const cleanHostName = String(hostName || cleanHostId).trim() || cleanHostId
    const hostToken = `hst_${randomBytes(24).toString('hex')}`
    const hostTokenPreview = `${hostToken.slice(0, 8)}...${hostToken.slice(-4)}`

    const existing = this.hosts.get(cleanHostId)
    const record = existing ?? {
      hostId: cleanHostId,
      hostName: cleanHostName,
      platform: String(platform || ''),
      arch: String(arch || ''),
      identity: null,
      trust: { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' },
      lastSeen: now,
      dshStats: {},
      bridgeState: { tasks: [], approvals: [], workspaces: [] },
      commands: [],
      recentResults: [],
    }
    record.hostName = cleanHostName
    if (platform) record.platform = String(platform)
    if (arch) record.arch = String(arch)
    record.lastSeen = now
    record.hostToken = hostToken
    record.hostTokenCreatedAt = now
    record.hostTokenPreview = hostTokenPreview
    if (record.trust?.status === 'revoked') {
      record.trust = { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' }
    }
    this.hosts.set(cleanHostId, record)
    if (!this.activeHostId) {
      this.activeHostId = cleanHostId
    }

    if (!Array.isArray(this.enrollment.joinedHostIds)) {
      this.enrollment.joinedHostIds = []
    }
    if (!this.enrollment.joinedHostIds.includes(cleanHostId)) {
      this.enrollment.joinedHostIds.push(cleanHostId)
    }
    this.enrollment.joinedCount = this.enrollment.joinedHostIds.length
    this.pairingFailBuckets.delete(bucketKey)
    void this.persist()
    this.emitStateChange('host_joined')

    return {
      ok: true,
      hostId: cleanHostId,
      hostName: cleanHostName,
      hostToken,
      hostTokenPreview,
      joinedCount: this.enrollment.joinedCount,
      expiresAt: this.enrollment.expiresAt,
    }
  }

  verifyHostCredential(hostId, candidateToken) {
    const cleanHostId = String(hostId ?? '').trim()
    const candidate = String(candidateToken ?? '').trim()
    if (!candidate) return false
    if (!cleanHostId) {
      for (const h of this.hosts.values()) {
        if (h.hostToken && h.trust?.status !== 'revoked') {
          const a = Buffer.from(candidate)
          const b = Buffer.from(String(h.hostToken))
          if (a.length === b.length && timingSafeEqual(a, b)) return true
        }
      }
      return /^hst_[0-9a-f]{48}$/.test(candidate)
    }
    const record = this.hosts.get(cleanHostId)
    if (record) {
      if (record.trust?.status === 'revoked') return false
      if (!record.hostToken) return false
      const a = Buffer.from(candidate)
      const b = Buffer.from(String(record.hostToken))
      if (a.length !== b.length) return false
      return timingSafeEqual(a, b)
    }
    // Stateless container cold-start recovery (e.g. Cloud Run redeploy):
    // If this hostId is not in memory yet, allow an unrevoked enrollment token format
    // provided it is not already bound to a different hostId in memory.
    if (/^hst_[0-9a-f]{48}$/.test(candidate)) {
      for (const h of this.hosts.values()) {
        if (h.hostToken === candidate && h.hostId !== cleanHostId) {
          return false
        }
      }
      return true
    }
    return false
  }

  createPairingCode({ hostId = '', ttlMs = 5 * 60_000 } = {}) {
    const now = this.now()
    for (const [k, v] of this.pairingCodes) {
      if (now > v.expiresAt) this.pairingCodes.delete(k)
    }
    let code = ''
    for (let i = 0; i < 6; i += 1) {
      code += PAIRING_ALPHABET[randomInt(0, PAIRING_ALPHABET.length)]
    }
    const entry = {
      code,
      hostId: hostId || this.activeHostId || '',
      createdAt: now,
      expiresAt: now + ttlMs,
      failedAttempts: 0,
    }
    this.pairingCodes.set(code, entry)
    return entry
  }

  exchangePairingCode(code, { clientKey = 'global' } = {}) {
    const now = this.now()
    const bucketKey = String(clientKey || 'global').trim() || 'global'
    const bucket = (this.pairingFailBuckets.get(bucketKey) || []).filter(ts => now - ts < PAIRING_RATE_WINDOW_MS)
    if (bucket.length >= PAIRING_MAX_FAILS_PER_WINDOW) {
      this.pairingFailBuckets.set(bucketKey, bucket)
      return { ok: false, rateLimited: true, error: '尝试次数过多，请 1 分钟后再试' }
    }

    const recordFail = () => {
      bucket.push(now)
      this.pairingFailBuckets.set(bucketKey, bucket)
      for (const [k, v] of this.pairingCodes) {
        v.failedAttempts = (v.failedAttempts || 0) + 1
        if (v.failedAttempts >= PAIRING_MAX_FAILS_PER_WINDOW) {
          this.pairingCodes.delete(k)
        }
      }
    }

    const clean = String(code ?? '').trim().toUpperCase()
    if (!clean) {
      recordFail()
      return { ok: false, error: '配对码不能为空' }
    }
    const entry = this.pairingCodes.get(clean)
    if (!entry) {
      recordFail()
      return { ok: false, error: '配对码无效或已使用' }
    }
    this.pairingCodes.delete(clean)
    if (now > entry.expiresAt) {
      recordFail()
      return { ok: false, error: '配对码已过期' }
    }
    this.pairingFailBuckets.delete(bucketKey)
    return {
      ok: true,
      hostId: entry.hostId || this.activeHostId,
      pairedAt: now,
    }
  }

  postSignalingMessage({ targetId, fromId = 'client', type = 'signal.offer', payload = {} } = {}) {
    const target = String(targetId ?? '').trim()
    if (!target) return { ok: false, error: 'targetId is required' }
    const list = this.signalingMailboxes.get(target) ?? []
    const envelope = {
      id: `sig-${randomBytes(4).toString('hex')}`,
      targetId: target,
      fromId,
      type,
      payload,
      at: this.now(),
    }
    list.push(envelope)
    if (list.length > 50) list.shift()
    this.signalingMailboxes.set(target, list)
    return { ok: true, envelope }
  }

  pullSignalingMessages(targetId) {
    const target = String(targetId ?? '').trim()
    const messages = this.signalingMailboxes.get(target) ?? []
    this.signalingMailboxes.delete(target)
    return { ok: true, targetId: target, messages }
  }

  getTurnCredentials({
    turnUrls = process.env.TURN_URLS ? process.env.TURN_URLS.split(',').map(s => s.trim()).filter(Boolean) : [],
    turnSecret = process.env.TURN_SECRET || 'dsh-selfhosted-turn-secret',
    ttlSeconds = 3600,
  } = {}) {
    const expiry = Math.floor(this.now() / 1000) + ttlSeconds
    const username = `${expiry}:dsh-peer`
    const credential = createHmac('sha1', turnSecret).update(username).digest('base64')
    const iceServers = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
    ]
    if (turnUrls.length > 0) {
      iceServers.push({
        urls: turnUrls,
        username,
        credential,
      })
    }
    return {
      ok: true,
      ttlSeconds,
      username,
      credential,
      iceServers,
    }
  }

  createShare({
    title = '加密会话分享',
    hostId = '',
    hostName = '',
    agentId = '',
    messageCount = 0,
    ivBase64 = '',
    ciphertextBase64 = '',
  } = {}) {
    if (!ivBase64 || !ciphertextBase64) {
      throw new Error('ivBase64 and ciphertextBase64 are required for E2EE share')
    }
    const id = `shr-${this.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const sizeBytes = Buffer.from(ciphertextBase64, 'base64').length
    const entry = {
      id,
      title: String(title || '加密会话分享').slice(0, 120),
      hostId: String(hostId || ''),
      hostName: String(hostName || hostId || ''),
      agentId: String(agentId || ''),
      messageCount: Number(messageCount) || 0,
      sizeBytes,
      ivBase64,
      ciphertextBase64,
      createdAt: this.now(),
    }
    this.shares.set(id, entry)
    while (this.shares.size > MAX_SHARES) {
      const oldest = this.shares.keys().next().value
      this.shares.delete(oldest)
    }
    void this.persist()
    return {
      id: entry.id,
      title: entry.title,
      hostId: entry.hostId,
      hostName: entry.hostName,
      agentId: entry.agentId,
      messageCount: entry.messageCount,
      sizeBytes: entry.sizeBytes,
      createdAt: entry.createdAt,
    }
  }

  listShares() {
    return [...this.shares.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(s => ({
        id: s.id,
        shareId: s.id,
        title: s.title,
        hostId: s.hostId,
        hostName: s.hostName,
        agentId: s.agentId,
        messageCount: s.messageCount,
        sizeBytes: s.sizeBytes,
        createdAt: s.createdAt,
      }))
  }

  getShare(shareId) {
    return this.shares.get(shareId) || null
  }

  deleteShare(shareId) {
    const ok = this.shares.delete(shareId)
    for (const host of this.hosts.values()) {
      if (
        host.lastShareResult &&
        (host.lastShareResult.shareId === shareId ||
          host.lastShareResult.id === shareId ||
          String(host.lastShareResult.shareUrl || '').includes(shareId))
      ) {
        host.lastShareResult = null
      }
    }
    void this.persist()
    this.emitStateChange('share_deleted')
    return { ok }
  }

  getMarketCatalog() {
    return {
      version: 1,
      selfHosted: true,
      plugins: [
        {
          name: 'dsh-feishu',
          title: 'DeepSeek Harness 飞书 + 多机自托管总控中心',
          version: '2.0.0',
          description: '完全脱离第三方服务器的飞书遥控、多电脑切换、数据迁移、工作区文件浏览与端到端加密回放套件。',
          installed: true,
        },
      ],
    }
  }

  activateHost(hostId) {
    const targetId = String(hostId ?? '').trim()
    if (!targetId) return { ok: false, error: 'hostId is empty' }
    let match = this.hosts.get(targetId)
    if (!match) {
      for (const h of this.hosts.values()) {
        if (h.hostId.toLowerCase() === targetId.toLowerCase() || String(h.hostName).toLowerCase() === targetId.toLowerCase()) {
          match = h
          break
        }
      }
    }
    if (!match) return { ok: false, error: `Host not found: ${targetId}` }
    if (match.trust?.status === 'revoked') {
      return { ok: false, error: `Host ${match.hostId} is revoked` }
    }
    const previousHostId = this.activeHostId
    this.activeHostId = match.hostId
    void this.persist()
    return {
      ok: true,
      previousHostId,
      activeHostId: this.activeHostId,
      hostName: match.hostName,
    }
  }

  removeHost(hostId) {
    const existed = this.hosts.delete(hostId)
    if (this.activeHostId === hostId) {
      const next = this.hosts.keys().next().value || ''
      this.activeHostId = next
    }
    void this.persist()
    return { ok: existed }
  }

  queueCommand(hostId, commandPayload = {}) {
    const cleanHostId = String(hostId ?? '').trim()
    if (!cleanHostId) return { ok: false, error: 'hostId is required' }
    const now = this.now()
    let host = this.hosts.get(cleanHostId)
    if (!host) {
      host = {
        hostId: cleanHostId,
        hostName: cleanHostId,
        platform: '',
        arch: '',
        identity: null,
        trust: { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' },
        lastSeen: 0,
        dshStats: {},
        bridgeState: { tasks: [], approvals: [], workspaces: [] },
        commands: [],
        recentResults: [],
      }
      this.hosts.set(cleanHostId, host)
    }
    if (host.trust?.status === 'revoked') {
      return { ok: false, error: `Host ${cleanHostId} is revoked` }
    }
    const ageMs = host.lastSeen ? now - host.lastSeen : Infinity
    const isActivelyOnline = Boolean(host.lastSeen && ageMs <= ACTIVE_HEARTBEAT_WINDOW_MS)
    const cmdType = String(commandPayload.type ?? '').trim()
    const isInteractivePrompt = cmdType === 'prompt' || cmdType === 'steer'
    const isApprovalCmd = cmdType === 'approve' || cmdType === 'deny' || cmdType === 'approval'

    let resolvedApprovalCode = ''
    if (isApprovalCmd) {
      const requestedDecision =
        cmdType === 'approval' ? (commandPayload.allow !== false ? 'approve' : 'deny') : cmdType
      const requestedOptionIndex =
        commandPayload.optionIndex !== undefined
          ? Number(commandPayload.optionIndex) || (requestedDecision === 'approve' ? 1 : 4)
          : null
      resolvedApprovalCode = String(commandPayload.code ?? '').trim().toUpperCase()
      if (!resolvedApprovalCode && commandPayload.agentId && Array.isArray(host.bridgeState?.approvals)) {
        const matched = host.bridgeState.approvals.find(a => a?.agentId === commandPayload.agentId)
        if (matched?.code) resolvedApprovalCode = String(matched.code).trim().toUpperCase()
      }
      if (resolvedApprovalCode) {
        const existingEntry = this.approvalLedger.get(`${cleanHostId}:${resolvedApprovalCode}`)
        if (existingEntry && existingEntry.status === 'settling' && now <= existingEntry.expiresAt) {
          const decisionConflict = existingEntry.decision !== requestedDecision
          const optionConflict =
            requestedOptionIndex !== null &&
            existingEntry.optionIndex !== undefined &&
            Number(existingEntry.optionIndex) !== requestedOptionIndex
          if (decisionConflict || optionConflict) {
            return {
              ok: false,
              statusCode: 409,
              code: 'APPROVAL_CONFLICT',
              conflict: true,
              existingDecision: existingEntry.decision,
              existingOptionIndex: existingEntry.optionIndex,
              actionId: existingEntry.actionId,
              error: `该审批正在同步「${existingEntry.decision === 'approve' ? '允许' : '拒绝'}」指令，无法同时改为相反决定`,
            }
          }
          const existingCmd =
            (host.commands ?? []).find(c => c?.id === existingEntry.actionId) || {
              id: existingEntry.actionId,
              type: cmdType,
              code: resolvedApprovalCode,
              allow: existingEntry.decision === 'approve',
              optionIndex: existingEntry.optionIndex,
              agentId: existingEntry.agentId,
              createdAt: existingEntry.requestedAt,
              expiresAt: existingEntry.expiresAt,
            }
          return {
            ok: true,
            deduplicated: true,
            queued: !isActivelyOnline,
            hostOnline: isActivelyOnline,
            hostLastSeenAgeMs: Number.isFinite(ageMs) ? ageMs : null,
            command: existingCmd,
          }
        }
      }
    }

    if (Array.isArray(commandPayload.attachments) && commandPayload.attachments.length > 0) {
      if (commandPayload.attachments.length > 4) {
        return { ok: false, statusCode: 413, error: '单次最多上传 4 张图片附件' }
      }
      for (const att of commandPayload.attachments) {
        const b64 = String(att?.dataBase64 || att?.base64 || '').trim()
        if (!b64 || b64.length > 11_500_000) {
          return { ok: false, statusCode: 413, error: '图片附件为空或单张超过 8MB 上限' }
        }
      }
    }

    // Approval commands ALWAYS enforce server-authoritative 45s TTL; client ttlMs/expiresAt cannot bypass it
    const ttlMs = isApprovalCmd
      ? APPROVAL_SETTLING_TTL_MS
      : Number(commandPayload.ttlMs) > 0
        ? Number(commandPayload.ttlMs)
        : DEFAULT_COMMAND_TTL_MS
    const expiresAt = isApprovalCmd
      ? now + APPROVAL_SETTLING_TTL_MS
      : commandPayload.expiresAt !== undefined
        ? Number(commandPayload.expiresAt)
        : isInteractivePrompt
          ? now + ttlMs
          : 0

    const { expiresAt: _clientExpiresAt, ttlMs: _clientTtlMs, ...cleanPayload } = commandPayload
    const cmd = {
      id: commandPayload.id || `cmd-${randomBytes(4).toString('hex')}`,
      createdAt: now,
      queued: !isActivelyOnline,
      ...cleanPayload,
      ...(expiresAt > 0 ? { expiresAt } : {}),
      ...(resolvedApprovalCode ? { code: resolvedApprovalCode } : {}),
    }
    if (isApprovalCmd && resolvedApprovalCode) {
      const decision = cmdType === 'approval' ? (commandPayload.allow !== false ? 'approve' : 'deny') : cmdType
      this.approvalLedger.set(`${cleanHostId}:${resolvedApprovalCode}`, {
        actionId: cmd.id,
        hostId: cleanHostId,
        agentId: String(commandPayload.agentId || ''),
        code: resolvedApprovalCode,
        decision,
        optionIndex: Number(commandPayload.optionIndex) || 1,
        status: 'settling',
        pulledByHost: false,
        requestedAt: now,
        expiresAt,
        error: '',
      })
    }
    host.commands.push(cmd)
    if (cmd.silentPreview) {
      this.silentPreviewCommandIds = this.silentPreviewCommandIds || new Set()
      this.silentPreviewCommandIds.add(cmd.id)
      if (this.silentPreviewCommandIds.size > 500) {
        const oldest = this.silentPreviewCommandIds.values().next().value
        this.silentPreviewCommandIds.delete(oldest)
      }
    }
    void this.persist()
    this.emitHostCommand(cleanHostId, host.commands.length)
    this.emitStateChange('command_queued')
    const { attachments: rawAttachments, ...echoCmd } = cmd
    return {
      ok: true,
      queued: !isActivelyOnline,
      hostOnline: isActivelyOnline,
      hostLastSeenAgeMs: Number.isFinite(ageMs) ? ageMs : null,
      command:
        Array.isArray(rawAttachments) && rawAttachments.length > 0
          ? { ...echoCmd, attachmentCount: rawAttachments.length }
          : cmd,
    }
  }

  cancelCommand(cmdId) {
    const targetId = String(cmdId ?? '').trim()
    if (!targetId) return { ok: false, error: 'cmdId is required' }
    const now = this.now()
    for (const host of this.hosts.values()) {
      const idx = (host.commands ?? []).findIndex(c => c?.id === targetId)
      if (idx !== -1) {
        const [removed] = host.commands.splice(idx, 1)
        for (const [k, entry] of this.approvalLedger.entries()) {
          if (
            entry?.actionId === targetId ||
            (removed?.code && k === `${host.hostId}:${String(removed.code).trim().toUpperCase()}`)
          ) {
            this.approvalLedger.delete(k)
          }
        }
        const cancelledRes = {
          id: targetId,
          type: removed?.type || '',
          agentId: removed?.agentId || '',
          ok: false,
          cancelled: true,
          error: '已取消排队中的指令',
          at: now,
        }
        host.recentResults = host.recentResults ?? []
        host.recentResults.push(cancelledRes)
        this.commandResultsById.set(targetId, { hostId: host.hostId, ...cancelledRes })
        void this.persist()
        this.emitStateChange('command_cancelled')
        return { ok: true, cancelled: true, commandId: targetId, hostId: host.hostId }
      }
    }
    return { ok: false, error: '该指令已执行或不存在' }
  }

  getCommandResult(cmdId) {
    return this.commandResultsById.get(cmdId) || null
  }

  addSnapshot({ meta = {}, dataBase64 = '', migrationId = '' } = {}) {
    if (!dataBase64) throw new Error('Snapshot dataBase64 is empty')
    const id = `snap-${this.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const entry = {
      id,
      createdAt: this.now(),
      meta: {
        ...meta,
        compressedBytes: Number(meta.compressedBytes) || Buffer.from(dataBase64, 'base64').length,
      },
      dataBase64,
    }
    this.snapshots.set(id, entry)
    while (this.snapshots.size > MAX_SNAPSHOTS) {
      const oldestKey = this.snapshots.keys().next().value
      this.snapshots.delete(oldestKey)
    }

    if (migrationId && this.migrations.has(migrationId)) {
      const job = this.migrations.get(migrationId)
      job.snapshotId = id
      job.status = 'importing'
      job.updatedAt = this.now()
      const importQueued = this.queueCommand(job.targetHostId, {
        type: 'import_snapshot',
        snapshotId: id,
        migrationId,
        skipCredentials: job.includeCredentials !== true,
      })
      job.importCommandId = importQueued.command?.id || ''

      if (job.wipeSource) {
        const wipeQueued = this.queueCommand(job.sourceHostId, {
          type: 'wipe_host',
          backupFirst: false,
          keepCredentials: job.keepCredentials !== false,
          migrationId,
        })
        job.wipeCommandId = wipeQueued.command?.id || ''
      }
      if (job.switchFeishu !== false) {
        this.activateHost(job.targetHostId)
      }
    }

    void this.persist()
    return {
      id,
      createdAt: entry.createdAt,
      meta: entry.meta,
    }
  }

  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId) || null
  }

  deleteSnapshot(snapshotId) {
    const ok = this.snapshots.delete(snapshotId)
    void this.persist()
    return { ok }
  }

  startMigration({
    sourceHostId,
    targetHostId,
    wipeSource = false,
    keepCredentials = true,
    includeCredentials = false,
    switchFeishu = true,
  } = {}) {
    if (!sourceHostId || !targetHostId) {
      return { ok: false, error: '必须选择源电脑和目标电脑' }
    }
    if (sourceHostId === targetHostId) {
      return { ok: false, error: '源电脑与目标电脑不能相同' }
    }
    const source = this.hosts.get(sourceHostId)
    const target = this.hosts.get(targetHostId)
    if (!source) return { ok: false, error: `找不到源电脑: ${sourceHostId}` }
    if (!target) return { ok: false, error: `找不到目标电脑: ${targetHostId}` }

    const migrationId = `mig-${this.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const job = {
      id: migrationId,
      sourceHostId,
      sourceHostName: source.hostName || sourceHostId,
      targetHostId,
      targetHostName: target.hostName || targetHostId,
      wipeSource: Boolean(wipeSource),
      keepCredentials: keepCredentials !== false,
      includeCredentials: Boolean(includeCredentials),
      switchFeishu: switchFeishu !== false,
      status: 'exporting',
      snapshotId: '',
      exportCommandId: '',
      importCommandId: '',
      wipeCommandId: '',
      error: '',
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.migrations.set(migrationId, job)

    const queued = this.queueCommand(sourceHostId, {
      type: 'export_snapshot',
      migrationId,
      includeCredentials: job.includeCredentials,
      note: `迁移 ${job.sourceHostName} -> ${job.targetHostName}`,
    })
    job.exportCommandId = queued.command?.id || ''

    void this.persist()
    return { ok: true, migration: job }
  }

  onCommandResult(hostId, res = {}) {
    const now = this.now()
    const host = this.hosts.get(hostId)
    if (res.type === 'load_full_transcript' && res.ok && res.agentId && Array.isArray(res.transcript)) {
      const liveTask = (host?.bridgeState?.tasks || []).find(t => t?.id === res.agentId)
      this.fullTranscriptCache.set(`${hostId}:${res.agentId}`, {
        at: now,
        sessionRev: liveTask?.sessionRev || '',
        totalCount: Number(res.totalCount) || res.transcript.length,
        transcript: res.transcript,
      })
    }
    if (res.type === 'approve' || res.type === 'deny' || res.type === 'approval' || res.code) {
      const code = String(res.code || '').trim().toUpperCase()
      let ledgerEntry = null
      if (res.id) {
        for (const entry of this.approvalLedger.values()) {
          if (entry.hostId === hostId && entry.actionId === res.id) {
            ledgerEntry = entry
            break
          }
        }
      }
      if (!ledgerEntry && code) {
        const byCode = this.approvalLedger.get(`${hostId}:${code}`)
        // Only settle by code when res.id is absent or matches the active actionId (never let a stale result settle a newer actionId)
        if (byCode && (!res.id || !byCode.actionId || byCode.actionId === res.id)) {
          ledgerEntry = byCode
        }
      }
      if (ledgerEntry) {
        if (res.ok !== false) {
          ledgerEntry.status = 'settled'
          ledgerEntry.settledAt = now
          ledgerEntry.expiresAt = now + APPROVAL_SETTLED_COOL_MS
          ledgerEntry.error = ''
        } else {
          ledgerEntry.status = 'failed'
          ledgerEntry.failedAt = now
          ledgerEntry.expiresAt = now + 60_000
          ledgerEntry.error = String(res.error || res.message || '电脑端执行审批失败')
        }
      }
    }
    if (host) {
      if (res.type === 'list_files' && res.ok) {
        host.lastFsListing = {
          at: this.now(),
          agentId: res.agentId || '',
          rootCwd: res.rootCwd,
          subDir: res.subDir,
          entries: res.entries,
        }
      } else if (res.type === 'read_file' && res.ok) {
        const at = this.now()
        const isSilent = Boolean(
          res.silentPreview || (res.id && this.silentPreviewCommandIds && this.silentPreviewCommandIds.has(res.id)),
        )
        if (res.id && this.silentPreviewCommandIds) {
          this.silentPreviewCommandIds.delete(res.id)
        }
        const sanitized = this.sanitizeFilePreviewForState(
          hostId,
          {
            at,
            agentId: res.agentId || '',
            relPath: res.relPath,
            name: res.name,
            ext: res.ext,
            size: res.size,
            kind: res.kind,
            mime: res.mime || res.mimeType,
            content: res.content,
            dataBase64: res.dataBase64,
          },
          { silentPreview: isSilent },
        )
        if (!isSilent) {
          host.lastFilePreview = sanitized
        }
      } else if (res.type === 'share_session' && res.ok) {
        host.lastShareResult = {
          at: this.now(),
          shareId: res.shareId,
          shareUrl: res.shareUrl,
          title: res.title,
        }
      }
    }

    for (const job of this.migrations.values()) {
      if (job.status === 'completed' || job.status === 'failed') continue
      if (res.id === job.exportCommandId && !res.ok) {
        job.status = 'failed'
        job.error = res.error || '源电脑导出快照失败'
        job.updatedAt = this.now()
      } else if (res.id === job.importCommandId) {
        if (res.ok) {
          job.status = 'completed'
          job.updatedAt = this.now()
        } else {
          job.status = 'failed'
          job.error = res.error || '目标电脑恢复快照失败'
          job.updatedAt = this.now()
        }
      }
    }
  }

  issueMediaTicket(now = this.now()) {
    const bucketMs = 30 * 60_000
    const exp = Math.ceil((now + 60 * 60_000) / bucketMs) * bucketMs
    const sig = createHmac('sha256', this.mediaTicketSecret)
      .update(`mt1.${exp}`)
      .digest('base64url')
    return `mt1.${exp}.${sig}`
  }

  verifyMediaTicket(ticket, now = this.now()) {
    const raw = String(ticket ?? '').trim()
    if (!raw.startsWith('mt1.')) return false
    const parts = raw.split('.')
    if (parts.length !== 3) return false
    const exp = Number(parts[1])
    const sig = parts[2]
    if (!Number.isFinite(exp) || exp <= now || !sig) return false
    const expected = createHmac('sha256', this.mediaTicketSecret)
      .update(`mt1.${exp}`)
      .digest('base64url')
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }

  storeFsHotCache(hostId, relPath, value, ttlMs = 10 * 60_000) {
    const cleanHost = String(hostId ?? '').trim()
    const cleanPath = String(relPath ?? '').trim()
    if (!cleanHost || !cleanPath || !value) return
    const key = `${cleanHost}::${cleanPath}`
    this.fsHotCache.delete(key)
    this.fsHotCache.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    })
    while (this.fsHotCache.size > 80) {
      const oldestKey = this.fsHotCache.keys().next().value
      this.fsHotCache.delete(oldestKey)
    }
  }

  getFsHotCache(hostId, relPath) {
    const cleanHost = String(hostId ?? '').trim()
    const cleanPath = String(relPath ?? '').trim()
    if (!cleanHost || !cleanPath) return null
    const key = `${cleanHost}::${cleanPath}`
    const hit = this.fsHotCache.get(key)
    if (!hit) return null
    if (this.now() > hit.expiresAt) {
      this.fsHotCache.delete(key)
      return null
    }
    this.fsHotCache.delete(key)
    this.fsHotCache.set(key, hit)
    return hit.value
  }

  drainPendingFsRequests(hostId) {
    const cleanHost = String(hostId ?? '').trim()
    if (!cleanHost || this.pendingFsRequests.size === 0) return []
    const now = this.now()
    const out = []
    for (const [reqId, entry] of this.pendingFsRequests.entries()) {
      if (now > entry.expiresAt) {
        clearTimeout(entry.timer)
        this.pendingFsRequests.delete(reqId)
        entry.resolve({ ok: false, status: 504, meta: { ok: false, status: 504, error: 'FS request expired' }, buffer: null })
        continue
      }
      if (entry.hostId === cleanHost && !entry.dispatchedViaHb) {
        entry.dispatchedViaHb = true
        out.push(entry.fsReq)
      }
    }
    return out
  }

  dispatchFastFsRequest(hostId, reqSpec = {}, { timeoutMs = 12_000 } = {}) {
    const cleanHost = String(hostId ?? '').trim()
    const host = this.hosts.get(cleanHost)
    if (!cleanHost || !host) {
      return Promise.resolve({
        ok: false,
        status: 404,
        meta: { ok: false, status: 404, error: `Unknown host: ${cleanHost}` },
        buffer: null,
      })
    }
    if (!this.isOnline(host)) {
      return Promise.resolve({
        ok: false,
        status: 503,
        meta: { ok: false, status: 503, error: `Host offline: ${cleanHost}` },
        buffer: null,
      })
    }
    const now = this.now()
    const reqId = `fsr-${randomBytes(8).toString('hex')}`
    const fsReq = {
      reqId,
      hostId: cleanHost,
      op: String(reqSpec.op || 'read'),
      path: String(reqSpec.path || ''),
      cwd: String(reqSpec.cwd || ''),
      agentId: String(reqSpec.agentId || ''),
      rangeHeader: String(reqSpec.rangeHeader || ''),
      ifNoneMatch: String(reqSpec.ifNoneMatch || ''),
      thumb: Boolean(reqSpec.thumb),
      transcode: Boolean(reqSpec.transcode),
      createdAt: now,
    }
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.pendingFsRequests.delete(reqId)
        resolve({
          ok: false,
          status: 504,
          meta: { ok: false, status: 504, error: '等待电脑端响应文件流超时（12s）' },
          buffer: null,
        })
      }, timeoutMs)
      timer.unref?.()
      this.pendingFsRequests.set(reqId, {
        reqId,
        hostId: cleanHost,
        fsReq,
        createdAt: now,
        expiresAt: now + timeoutMs,
        dispatchedViaHb: false,
        timer,
        resolve,
      })
      this.emitHostFsRequest(cleanHost, fsReq)
    })
  }

  fulfillFastFsRequest(reqId, meta = {}, buffer = null) {
    const cleanId = String(reqId ?? '').trim()
    const entry = this.pendingFsRequests.get(cleanId)
    if (!entry) {
      return { ok: false, status: 404, error: 'Unknown or expired fs request' }
    }
    clearTimeout(entry.timer)
    this.pendingFsRequests.delete(cleanId)
    entry.resolve({
      ok: meta?.ok !== false,
      status: Number(meta?.status) || (meta?.ok === false ? 400 : 200),
      meta: meta || {},
      buffer: Buffer.isBuffer(buffer) ? buffer : null,
    })
    return { ok: true, reqId: cleanId, hostId: entry.hostId }
  }
}
