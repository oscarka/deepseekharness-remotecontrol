import { createHmac, randomBytes, randomInt } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { generateOrLoadVapidKeys, sendWebPushNotification } from './web-push.js'

const ONLINE_TTL_MS = 30 * 60_000
const ACTIVE_HEARTBEAT_WINDOW_MS = 90_000
const DEFAULT_COMMAND_TTL_MS = 10 * 60_000
const INLINE_TEXT_PREVIEW_MAX_CHARS = 16_384
const FILE_PREVIEW_BLOB_TTL_MS = 10 * 60_000
const PAIRING_RATE_WINDOW_MS = 60_000
const PAIRING_MAX_FAILS_PER_WINDOW = 10
const MAX_SNAPSHOTS = 15
const MAX_SHARES = 50
const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

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
    this.filePreviewBlobs = new Map()
    this.signalingMailboxes = new Map()
    this.commandResultsById = new Map()
    this.totalCommandsExecuted = 0
    this.vapidKeys = generateOrLoadVapidKeys()
    this.pushSubscriptions = new Map()
    this.unsubscribedEndpoints = new Set()
    this.pushedApprovalCodes = new Set()
    this.hostTaskStates = new Map()
    this.pushHistory = []
    this.sseListeners = new Set()
  }

  onStateChange(listener) {
    this.sseListeners.add(listener)
    return () => this.sseListeners.delete(listener)
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
    } catch {
      // ignore missing or corrupt state file on startup
    }
  }

  sanitizeFilePreviewForState(hostId, preview) {
    if (!preview || typeof preview !== 'object') return null
    const at = Number(preview.at) || this.now()
    const hasBinaryOrLarge =
      Boolean(preview.dataBase64) ||
      (typeof preview.content === 'string' && preview.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS)

    if (hasBinaryOrLarge) {
      const existing = this.filePreviewBlobs.get(hostId)
      if (!existing || existing.at !== at || (preview.dataBase64 && !existing.dataBase64)) {
        this.filePreviewBlobs.set(hostId, {
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
        })
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

  getFilePreviewBlob(hostId, expectedAt = null) {
    const cleanHostId = String(hostId ?? '').trim()
    if (!cleanHostId) return null
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
    if (expectedAt !== null && expectedAt !== undefined && expectedAt !== '' && Number(expectedAt) !== Number(preview.at)) {
      return null
    }
    return preview
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
      const payload = {
        activeHostId: this.activeHostId,
        vapidKeys: this.vapidKeys,
        pushSubscriptions: [...this.pushSubscriptions.values()],
        hosts: [...this.hosts.values()].map(h => ({
          ...h,
          lastFilePreview: h.lastFilePreview ? this.sanitizeFilePreviewForState(h.hostId, h.lastFilePreview) : null,
          commands: h.commands ?? [],
          recentResults: (h.recentResults ?? []).slice(-15).map(r => {
            if (r && (r.dataBase64 || (typeof r.content === 'string' && r.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))) {
              const { dataBase64, content, ...rest } = r
              return { ...rest, hasBlob: true }
            }
            return r
          }),
        })),
        snapshots: [...this.snapshots.values()],
        shares: [...this.shares.values()],
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

  getFullState() {
    const now = this.now()
    const summaryById = new Map(this.getHostsSummary().map(item => [item.hostId, item]))
    const hosts = [...this.hosts.values()].map(host => {
      const summary = summaryById.get(host.hostId) ?? {}
      const sanitizedPreview = host.lastFilePreview
        ? this.sanitizeFilePreviewForState(host.hostId, host.lastFilePreview)
        : null
      if (sanitizedPreview && host.lastFilePreview?.dataBase64) {
        host.lastFilePreview = sanitizedPreview
      }
      const activeCommands = (host.commands ?? []).filter(c => !c.expiresAt || now <= c.expiresAt)
      return {
        ...summary,
        activelyConnected: Boolean(host.lastSeen && now - host.lastSeen <= ACTIVE_HEARTBEAT_WINDOW_MS),
        identity: host.identity ?? null,
        trust: host.trust ?? { status: 'unpinned', pinnedPublicKey: '', pinnedFingerprint: '' },
        dshStats: host.dshStats ?? {},
        bridgeState: host.bridgeState ?? { tasks: [], approvals: [], workspaces: [] },
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
        recentResults: (host.recentResults ?? [])
          .slice(-10)
          .reverse()
          .map(r => {
            if (r && (r.dataBase64 || (typeof r.content === 'string' && r.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))) {
              const { dataBase64, content, ...rest } = r
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
    return {
      now,
      ...(this.buildInfo ? { build: this.buildInfo } : {}),
      activeHostId: this.activeHostId,
      vapidPublicKey: this.vapidKeys.publicKey,
      pushSubscriptions: this.listPushSubscriptions(),
      pushHistory: this.pushHistory.slice(-10).reverse(),
      stats: this.getUsageStats(),
      hosts,
      snapshots,
      migrations,
      shares,
    }
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

    // 1. Check for new pending approvals
    for (const app of approvals) {
      if (!app?.code || this.pushedApprovalCodes.has(app.code)) continue
      this.pushedApprovalCodes.add(app.code)
      while (this.pushedApprovalCodes.size > 300) {
        this.pushedApprovalCodes.delete(this.pushedApprovalCodes.values().next().value)
      }
      void this.broadcastWebPush({
        title: `⏳ [${hostName}] 待审批：${app.title || app.toolName}`,
        body: `工具 ${app.toolName}：${app.reason || '请求执行权限'}（点击立即处理）`,
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
      this.hostTaskStates.set(key, curStatus)
      if (!prevStatus || prevStatus === curStatus) continue

      if (prevStatus === 'running' && curStatus === 'idle') {
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
        trust,
        lastSeen: now,
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
      if (payload.dshStats) record.dshStats = payload.dshStats
      if (payload.bridgeState) record.bridgeState = payload.bridgeState
    }

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
        const lightRes =
          res && (res.dataBase64 || (typeof res.content === 'string' && res.content.length > INLINE_TEXT_PREVIEW_MAX_CHARS))
            ? (({ dataBase64, content, ...rest }) => ({ ...rest, hasBlob: true }))(res)
            : res
        record.recentResults.push(lightRes)
        if (res?.id) {
          this.commandResultsById.set(res.id, { hostId, ...lightRes })
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

    if (payload.bridgeState) {
      this.detectAndTriggerWebPush(hostId, hostName, payload.bridgeState)
    }

    const hasCommandActivity = (Array.isArray(payload.commandResults) && payload.commandResults.length > 0)
      || record.commands.length > 0
    const rawCommands = record.commands.splice(0)
    const commands = []
    for (const cmd of rawCommands) {
      if (cmd?.expiresAt && now > cmd.expiresAt) {
        const expiredRes = {
          id: cmd.id,
          type: cmd.type,
          agentId: cmd.agentId || '',
          ok: false,
          expired: true,
          error: '指令排队已超时（超过 10 分钟未上线），已自动丢弃未执行',
          at: now,
        }
        record.recentResults.push(expiredRes)
        if (cmd.id) {
          this.commandResultsById.set(cmd.id, { hostId, ...expiredRes })
        }
        continue
      }
      commands.push(cmd)
    }
    const nextFingerprint = this.computeHostFingerprint(record)
    const stateChanged = hasCommandActivity || nextFingerprint !== record._lastFingerprint
    if (stateChanged || now - (record._lastBroadcastAt || 0) >= 12_000) {
      record._lastFingerprint = nextFingerprint
      record._lastBroadcastAt = now
      void this.persist()
      this.emitStateChange('heartbeat')
    }

    return {
      ok: true,
      activeHostId: this.activeHostId,
      shouldConnectFeishu: this.activeHostId === hostId,
      commands,
      hostsSummary: this.getHostsSummary(),
      pushSubscriptionsBackup: [...this.pushSubscriptions.values()],
    }
  }

  computeHostFingerprint(record) {
    const b = record?.bridgeState ?? {}
    const tasksSig = Array.isArray(b.tasks)
      ? b.tasks
          .map(t => {
            const tr = Array.isArray(t.transcript) ? t.transcript : []
            const last = tr.at(-1)
            return `${t.id}:${t.title || ''}:${t.status || ''}:${t.turnState || ''}:${t.lastOutput || ''}:${t.runningSummary || ''}:${tr.length}:${last?.role || ''}:${(last?.text || '').length}:${(last?.text || '').slice(-40)}:${(last?.thinking || '').length}:${(last?.tools || []).length}:${(t.changedFiles || []).length}`
          })
          .join('|')
      : ''
    const appSig = Array.isArray(b.approvals) ? b.approvals.map(a => `${a.code}:${a.promptTitle || ''}`).join('|') : ''
    const fsSig = `${record?.lastFsListing?.at || 0}:${record?.lastFilePreview?.at || 0}:${record?.lastShareResult?.at || 0}`
    return `${record?.hostName || ''}:${record?.trust?.status || ''}:${Boolean(b.remoteActive)}:${Boolean(b.feishuConnected)}:${tasksSig}#${appSig}#${fsSig}`
  }

  manageHostTrust(hostId, { action = 'pin' } = {}) {
    const record = this.hosts.get(hostId)
    if (!record) return { ok: false, error: `Host not found: ${hostId}` }
    const now = this.now()
    if (action === 'revoke') {
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
      return { ok: true, hostId, trust: record.trust }
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
    void this.persist()
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
    const ttlMs = Number(commandPayload.ttlMs) > 0 ? Number(commandPayload.ttlMs) : DEFAULT_COMMAND_TTL_MS
    const expiresAt =
      commandPayload.expiresAt !== undefined
        ? Number(commandPayload.expiresAt)
        : isInteractivePrompt
          ? now + ttlMs
          : 0

    const cmd = {
      id: commandPayload.id || `cmd-${randomBytes(4).toString('hex')}`,
      createdAt: now,
      queued: !isActivelyOnline,
      ...(expiresAt > 0 ? { expiresAt } : {}),
      ...commandPayload,
    }
    host.commands.push(cmd)
    void this.persist()
    this.emitStateChange('command_queued')
    return {
      ok: true,
      queued: !isActivelyOnline,
      hostOnline: isActivelyOnline,
      hostLastSeenAgeMs: Number.isFinite(ageMs) ? ageMs : null,
      command: cmd,
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
    const host = this.hosts.get(hostId)
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
        host.lastFilePreview = this.sanitizeFilePreviewForState(hostId, {
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
        })
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
}
