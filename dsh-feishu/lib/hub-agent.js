import { execFile } from 'node:child_process'
import { createCipheriv, randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { checkAccessibilityPermission, getTurboNativeBinaryPath, TurboController } from '../../dsh-turbo/index.js'
import {
  executeAntigravityIdeAction,
  getDefaultAntigravityBrainDirs,
  isAntigravityIdeSessionId,
  loadAntigravityIdeSessions,
  toRawConversationId,
} from './antigravity-ide.js'

const execFileAsync = promisify(execFile)
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
import { buildNormalizedQuestionAnswers } from './bridge.js'
import { createSnapshotBuffer, inspectDshHome, restoreSnapshotBuffer, wipeDshHome } from './migration.js'
import { decorateTaskMetadata, HarnessRouter } from './harness-router.js'
import { ClaudeAdapter } from './harnesses/claude-adapter.js'
import { CodexAdapter } from './harnesses/codex-adapter.js'
import { DshHeadlessRunner } from './harnesses/dsh-headless-adapter.js'
import { safeError } from './redact.js'
import {
  collectHostSystemTelemetry,
  extractSessionTranscript,
  formatUserQuestionReplyText,
  invalidateDshSessionParseCache,
  loadDiskSessionsFromDshHome,
  loadOrCreateHostIdentity,
  persistCommandAttachments,
  readPendingDshInteractions,
  removePendingDshInteraction,
  renameDiskSession,
  writePendingDshInteractionResponse,
} from './workspace-ops.js'

/**
 * Outbound agent that synchronizes a local DSH host with the Cloud Run Control Hub
 * (or embedded local Hub). Handles:
 * - Heartbeat state reporting (live tasks, approvals, ~/.dsh storage metrics, Ed25519 identity, Antigravity IDE sessions)
 * - Active / Standby Feishu WebSocket coordination across multiple computers
 * - Executing Web UI commands (prompt, steer, new_session, rename/delete_session, list/read_file, share_session, stop, approve/deny, snapshot export/import, safe wipe)
 */
export class HubAgent {
  constructor({
    config,
    bridge,
    transport,
    audit,
    logger,
    fetchImpl = globalThis.fetch,
    execImpl = undefined,
    bootId = `boot-${randomBytes(6).toString('hex')}`,
    bootEpochMs = Date.now(),
    harnessRouter = undefined,
  }) {
    this.config = config
    this.bridge = bridge
    this.transport = transport
    this.audit = audit
    this.logger = logger
    this.fetch = fetchImpl
    this.execImpl = execImpl
    this.bootId = bootId
    this.bootEpochMs = bootEpochMs
    this.heartbeatSeq = 0
    this.harnessRouter = harnessRouter || new HarnessRouter()
    if (!harnessRouter && this.shouldLoadExternalHarnesses()) {
      const enabledSet = Array.isArray(this.config?.enabledHarnesses)
        ? new Set(this.config.enabledHarnesses.map(s => String(s).toLowerCase()))
        : null
      if (!enabledSet || enabledSet.has('codex')) {
        this.harnessRouter.registerAdapter(
          new CodexAdapter({
            codexHome: this.config?.codexHome || undefined,
            maxSessions: this.config?.maxCodexSessions || 10,
            execImpl: this.execImpl,
          }),
        )
      }
      if (!enabledSet || enabledSet.has('claude') || enabledSet.has('claude-code')) {
        this.harnessRouter.registerAdapter(
          new ClaudeAdapter({
            claudeHome: this.config?.claudeHome || undefined,
            maxSessions: this.config?.maxClaudeSessions || 8,
            execImpl: this.execImpl,
          }),
        )
      }
    }
    this.timer = null
    this.polling = false
    this.disposed = false
    this.fleetSummary = []
    this.pendingResults = []
    this.cachedStats = null
    this.cachedDiskSessions = []
    this.cachedAgySessions = []
    this.cachedExternalSessions = []
    this.cachedPushSubscriptions = []
    this.settledAgyApprovals = new Set()
    this.recentAgyApprovals = new Map()
    this.settledDshApprovals = new Set()
    this.recentDshApprovals = new Map()
    this.deletedAgyIds = new Set()
    this.pendingUserPrompts = new Map()
    this.lastStatsAt = 0
    this.executedIds = new Set()
    this.identity = null
    this.turbo = null
    this.pendingRetick = false
    this.followUpTimer = null
    this.inflightTick = null
    this.dshHeadlessRunner = new DshHeadlessRunner({
      dshHome: this.config?.dshHome,
      onTurnSettled: (sessionId, code, stderrBuf) => {
        invalidateDshSessionParseCache()
        if (code !== 0 && sessionId) {
          const diskSess = (this.cachedDiskSessions || []).find(s => s.id === sessionId)
          if (diskSess) {
            diskSess.status = 'idle'
            diskSess.turnState = 'interrupted'
            diskSess.lastInterruptedAt = Date.now()
            if (stderrBuf) {
              diskSess.lastOutput = `⚠️ 执行异常 (exit ${code}): ${String(stderrBuf).trim().slice(-200)}`
            }
          }
        }
        void this.refreshDshStats(true).then(() => this.tick())
      },
    })
  }

  getFleetSummary() {
    return this.fleetSummary
  }

  getPublicWebUrl() {
    if (this.config.hubUrl) return this.config.hubUrl
    if (this.config.localWebPort) return `http://127.0.0.1:${this.config.localWebPort}`
    return ''
  }

  start() {
    if (this.timer || this.disposed || !this.config.hubUrl) return
    this.bridge?.setHubAgent?.(this)
    this.turbo = new TurboController({
      hostId: this.config.hostId,
      brainDirs: this.config.antigravityBrainDirs || getDefaultAntigravityBrainDirs(),
      dshHome: this.config.dshHome,
      hubUrl: this.config.hubUrl,
      hubToken: this.config.hubToken,
      fetchImpl: this.fetch,
      execImpl: this.execImpl,
      onTriggerSync: () => {
        void this.tick()
      },
    })
    void this.turbo.start()
    this.timer = setInterval(() => {
      void this.tick()
    }, this.config.hubPollMs || 1500)
    this.timer.unref?.()
    void this.tick()
  }

  stop() {
    this.disposed = true
    if (this.turbo) {
      this.turbo.stop()
      this.turbo = null
    }
    if (this.followUpTimer) {
      clearTimeout(this.followUpTimer)
      this.followUpTimer = null
    }
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  shouldLoadAntigravityIde() {
    if (this.config.enableAntigravityIde === false) return false
    if (Array.isArray(this.config?.enabledHarnesses)) {
      const set = new Set(this.config.enabledHarnesses.map(s => String(s).toLowerCase()))
      if (!set.has('antigravity-ide') && !set.has('agy') && !set.has('ide')) return false
    }
    if (this.config.enableAntigravityIde === true) return true
    if (Array.isArray(this.config.antigravityBrainDirs) && this.config.antigravityBrainDirs.length > 0) return true
    const defaultDshHome = join(homedir(), '.dsh')
    return Boolean(this.config.dshHome && resolve(this.config.dshHome) === resolve(defaultDshHome))
  }

  shouldLoadExternalHarnesses() {
    if (this.config?.enableExternalHarnesses === false) return false
    if (this.config?.enableExternalHarnesses === true) return true
    if (this.config?.codexHome || this.config?.claudeHome) return true
    const defaultDshHome = join(homedir(), '.dsh')
    return Boolean(this.config?.dshHome && resolve(this.config.dshHome) === resolve(defaultDshHome))
  }

  async refreshDshStats(force = false) {
    const now = Date.now()
    try {
      // Heavy directory byte-walk is cached for 25s, while incremental mtime-cached sessions refresh on every tick (<1ms)
      if (force || !this.cachedStats || now - this.lastStatsAt >= 25_000) {
        this.cachedStats = await inspectDshHome(this.config.dshHome)
        this.lastStatsAt = now
      }
      this.cachedDiskSessions = await loadDiskSessionsFromDshHome(this.config.dshHome)
      for (const ds of this.cachedDiskSessions) {
        if (this.dshHeadlessRunner?.isRunning(ds.id)) {
          ds.status = 'running'
          ds.turnState = 'thinking'
          ds.statusLabel = '🟢 运行中'
          ds.controlMode = 'managed'
          ds.runningSummary = '💭 正在后台思考与执行...'
        }
        const pending = this.pendingUserPrompts.get(ds.id)
        if (!pending || pending.length === 0) continue
        if (!Array.isArray(ds.transcript)) ds.transcript = []
        const remaining = []
        for (const item of pending) {
          if (now - item.time >= 45_000) continue
          const alreadyInTranscript = ds.transcript.some(
            m => m.role === 'user' && String(m.text || '').trim() === item.text,
          )
          if (alreadyInTranscript) continue
          remaining.push(item)
          ds.transcript = [
            ...ds.transcript,
            {
              index: ds.transcript.length,
              role: 'user',
              text: item.text,
              thinking: '',
              tools: [],
              toolCalls: [],
              time: item.time,
            },
          ]
          ds.lastActivity = Math.max(ds.lastActivity || 0, item.time)
          ds.updatedAt = Math.max(ds.updatedAt || 0, item.time)
        }
        if (remaining.length === 0) {
          this.pendingUserPrompts.delete(ds.id)
        } else {
          this.pendingUserPrompts.set(ds.id, remaining)
        }
      }
      if (this.shouldLoadAntigravityIde()) {
        this.cachedAgySessions = await loadAntigravityIdeSessions({
          brainDirs: this.config.antigravityBrainDirs || undefined,
          dshHome: this.config.dshHome,
          maxSessions: this.config.maxAntigravitySessions || 20,
          settledApprovals: this.settledAgyApprovals,
          excludeConversationIds: this.deletedAgyIds,
          now,
        })
        for (const sess of this.cachedAgySessions) {
          const pending = this.pendingUserPrompts.get(sess.id)
          if (!pending || pending.length === 0) continue
          if (!Array.isArray(sess.transcript)) sess.transcript = []
          const remaining = []
          for (const item of pending) {
            if (now - item.time >= 20_000) continue
            const alreadyInTranscript = sess.transcript.some(
              m => m.role === 'user' && String(m.text || '').trim() === item.text,
            )
            if (alreadyInTranscript) {
              // Once persisted into transcript.jsonl, retire from pendingUserPrompts so a subsequent revert won't re-inject it
              continue
            }
            remaining.push(item)
            sess.transcript = [
              ...sess.transcript,
              {
                index: sess.transcript.length,
                role: 'user',
                text: item.text,
                thinking: '',
                tools: [],
                toolCalls: [],
                time: item.time,
              },
            ]
            sess.lastActivity = Math.max(sess.lastActivity || 0, item.time)
            sess.updatedAt = Math.max(sess.updatedAt || 0, item.time)
          }
          if (remaining.length === 0) {
            this.pendingUserPrompts.delete(sess.id)
          } else {
            this.pendingUserPrompts.set(sess.id, remaining)
          }
        }
      } else {
        this.cachedAgySessions = []
      }
      if (this.harnessRouter && this.harnessRouter.adapters.size > 0) {
        this.cachedExternalSessions = await this.harnessRouter.listExternalSessions({
          dshHome: this.config.dshHome,
          now,
        })
      } else {
        this.cachedExternalSessions = []
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: inspectDshHome failed: ${safeError(error)}`)
      if (!this.cachedStats) {
        this.cachedStats = {
          exists: false,
          dshHome: this.config.dshHome,
          sessionCount: 0,
          fileCount: 0,
          totalBytes: 0,
          hasFeishuEnv: false,
          updatedAt: 0,
        }
      }
    }
    return this.cachedStats
  }

  headers(extra = {}) {
    const result = {
      'content-type': 'application/json',
      ...extra,
    }
    if (this.config.hubToken) {
      result.authorization = `Bearer ${this.config.hubToken}`
      result['x-hub-token'] = this.config.hubToken
    }
    return result
  }

  async ensureIdentity() {
    if (this.identity) return this.identity
    try {
      const loaded = await loadOrCreateHostIdentity(this.config.dshHome)
      this.identity = {
        publicKey: loaded.publicKey,
        fingerprint: loaded.fingerprint,
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: loadOrCreateHostIdentity failed: ${safeError(error)}`)
    }
    return this.identity
  }

  async tick() {
    if (this.disposed || !this.config.hubUrl) return
    if (this.polling) {
      if (this.timer) this.pendingRetick = true
      // 等待正在进行的这一轮结束，避免调用方被告知「已刷新」却拿到旧状态
      if (this.inflightTick) await this.inflightTick
      return
    }
    this.polling = true
    let resolveInflight = null
    this.inflightTick = new Promise(resolve => { resolveInflight = resolve })
    let executedAny = false
    try {
      // Stamp snapshot capture time & monotonic sequence BEFORE reading disk/RPC so out-of-order slow captures are detected
      const capturedAt = Date.now()
      const seq = ++this.heartbeatSeq
      const syncMeta = {
        bootId: this.bootId,
        bootEpochMs: this.bootEpochMs,
        seq,
        capturedAt,
      }
      const identity = await this.ensureIdentity()
      const dshStats = await this.refreshDshStats(false)
      const bridgeState = this.bridge.getSnapshotState()
      for (const t of bridgeState.tasks || []) {
        decorateTaskMetadata(t, { isLiveDsh: true, now: capturedAt })
      }
      const existingIds = new Set((bridgeState.tasks || []).map(t => t.id))
      const wsSet = new Set(Array.isArray(bridgeState.workspaces) ? bridgeState.workspaces : [])
      if (!Array.isArray(bridgeState.approvals)) bridgeState.approvals = []
      const existingDshCodes = new Set(bridgeState.approvals.map(a => String(a?.code || '').toUpperCase()))
      const existingDshCallIds = new Set(
        bridgeState.approvals.map(a => `${a?.agentId || ''}:${a?.callId || ''}`).filter(k => !k.endsWith(':')),
      )
      for (const liveApp of bridgeState.approvals) {
        if (liveApp?.code) {
          const matchedLiveTask = (bridgeState.tasks || []).find(t => t.id === liveApp.agentId) || null
          this.recentDshApprovals.set(String(liveApp.code).toUpperCase(), {
            session: matchedLiveTask,
            approval: liveApp,
          })
        }
      }
      if (Array.isArray(this.cachedDiskSessions) && this.cachedDiskSessions.length > 0) {
        for (const ds of this.cachedDiskSessions) {
          decorateTaskMetadata(ds, { isLiveDsh: false, now: capturedAt })
          const diskApp = ds.pendingApproval
          if (diskApp?.code) {
            const upperCode = String(diskApp.code).toUpperCase()
            if (this.settledDshApprovals.has(upperCode)) {
              ds.pendingApproval = null
              if (ds.status === 'approval') {
                ds.status = 'running'
                ds.turnState = 'running'
                ds.statusLabel = '🟢 运行中'
              }
            } else {
              this.recentDshApprovals.set(upperCode, {
                session: ds,
                approval: diskApp,
              })
              while (this.recentDshApprovals.size > 200) {
                const oldestKey = this.recentDshApprovals.keys().next().value
                this.recentDshApprovals.delete(oldestKey)
              }
              const callKey = `${diskApp.agentId || ds.id}:${diskApp.callId || ''}`
              if (!existingDshCodes.has(upperCode) && (!diskApp.callId || !existingDshCallIds.has(callKey))) {
                bridgeState.approvals.push(diskApp)
                existingDshCodes.add(upperCode)
                if (diskApp.callId) existingDshCallIds.add(callKey)
              }
            }
          }
          if (!existingIds.has(ds.id)) {
            bridgeState.tasks.push(ds)
            existingIds.add(ds.id)
          } else if (ds.pendingApproval && !this.settledDshApprovals.has(String(ds.pendingApproval.code || '').toUpperCase())) {
            const existingTask = (bridgeState.tasks || []).find(t => t.id === ds.id)
            if (existingTask && !existingTask.pendingApproval) {
              existingTask.pendingApproval = ds.pendingApproval
              existingTask.status = 'approval'
              existingTask.turnState = 'approval'
              existingTask.statusLabel =
                ds.pendingApproval.kind === 'question' ? '⏳ 待你选择' : '⏳ 待你授权'
            }
          }
          if (ds.cwd) wsSet.add(ds.cwd)
        }
      }
      if (this.config?.dshHome) {
        const ipcItems = await readPendingDshInteractions(this.config.dshHome)
        for (const ipcApp of ipcItems) {
          if (!ipcApp?.code) continue
          const upperCode = String(ipcApp.code).toUpperCase()
          if (this.settledDshApprovals.has(upperCode)) continue
          const callKey = `${ipcApp.agentId || ''}:${ipcApp.callId || ''}`
          const matchedTask = (bridgeState.tasks || []).find(t => t.id === ipcApp.agentId) || null
          this.recentDshApprovals.set(upperCode, {
            session: matchedTask,
            approval: ipcApp,
          })
          if (!existingDshCodes.has(upperCode) && (!ipcApp.callId || !existingDshCallIds.has(callKey))) {
            bridgeState.approvals.push(ipcApp)
            existingDshCodes.add(upperCode)
            if (ipcApp.callId) existingDshCallIds.add(callKey)
          }
          if (matchedTask && !matchedTask.pendingApproval) {
            matchedTask.pendingApproval = ipcApp
            matchedTask.status = 'approval'
            matchedTask.turnState = 'approval'
            matchedTask.statusLabel = ipcApp.kind === 'question' ? '⏳ 待你选择' : '⏳ 待你授权'
          }
        }
      }
      if (Array.isArray(this.cachedAgySessions) && this.cachedAgySessions.length > 0) {
        if (!Array.isArray(bridgeState.approvals)) bridgeState.approvals = []
        const existingCodes = new Set(bridgeState.approvals.map(a => a.code))
        for (const agySess of this.cachedAgySessions) {
          decorateTaskMetadata(agySess, { isLiveDsh: false, now: capturedAt })
          if (!existingIds.has(agySess.id)) {
            bridgeState.tasks.push(agySess)
            existingIds.add(agySess.id)
          }
          if (agySess.cwd) wsSet.add(agySess.cwd)
          if (agySess.pendingApproval?.code) {
            this.recentAgyApprovals.set(agySess.pendingApproval.code.toUpperCase(), {
              session: agySess,
              approval: agySess.pendingApproval,
            })
            if (this.recentAgyApprovals.size > 200) {
              const oldestKey = this.recentAgyApprovals.keys().next().value
              this.recentAgyApprovals.delete(oldestKey)
            }
          }
          if (
            agySess.pendingApproval
            && !existingCodes.has(agySess.pendingApproval.code)
            && !this.settledAgyApprovals.has(agySess.pendingApproval.code)
          ) {
            bridgeState.approvals.push(agySess.pendingApproval)
            existingCodes.add(agySess.pendingApproval.code)
          }
        }
      }
      if (Array.isArray(this.cachedExternalSessions) && this.cachedExternalSessions.length > 0) {
        for (const extSess of this.cachedExternalSessions) {
          decorateTaskMetadata(extSess, { isLiveDsh: false, now: capturedAt })
          if (!existingIds.has(extSess.id)) {
            bridgeState.tasks.push(extSess)
            existingIds.add(extSess.id)
          }
          if (extSess.cwd) wsSet.add(extSess.cwd)
        }
      }
      bridgeState.taskCount = (bridgeState.tasks || []).length
      bridgeState.runningCount = (bridgeState.tasks || []).filter(t => t.status === 'running').length
      bridgeState.workspaces = [...wsSet]
      bridgeState.harnesses = this.harnessRouter ? await this.harnessRouter.getAdaptersHealth() : []
      bridgeState.turbo = this.turbo
        ? this.turbo.getTelemetry()
        : {
            enabled: true,
            version: '2.0.0',
            engine: getTurboNativeBinaryPath() ? 'rust-native' : 'node-fsevents',
            engineLabel: getTurboNativeBinaryPath() ? '🦀 Rust 原生极速引擎 + 实时流' : '⚡ FSEvents 实时事件流',
            accessibilityGranted: true,
          }
      try {
        bridgeState.systemTelemetry = await collectHostSystemTelemetry({
          lastRttMs: this.lastHeartbeatRttMs,
          execImpl: this.execImpl,
        })
      } catch {}
      const resultsToSend = this.pendingResults.splice(0)
      const hbReqStart = Date.now()
      const response = await this.fetch(`${this.config.hubUrl}/api/heartbeat`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          hostId: this.config.hostId,
          hostName: this.config.hostName,
          platform: process.platform,
          arch: process.arch,
          identity,
          syncMeta,
          dshStats,
          bridgeState,
          commandResults: resultsToSend,
          pushSubscriptionsBackup: this.cachedPushSubscriptions,
        }),
      })
      if (!response.ok) {
        if (resultsToSend.length > 0) this.pendingResults.unshift(...resultsToSend)
        return
      }
      this.lastHeartbeatRttMs = Math.max(1, Date.now() - hbReqStart)
      const data = await response.json()
      if (Array.isArray(data.hostsSummary)) {
        this.fleetSummary = data.hostsSummary
      }
      if (Array.isArray(data.pushSubscriptionsBackup) && data.pushSubscriptionsBackup.length > 0) {
        this.cachedPushSubscriptions = data.pushSubscriptionsBackup
      }
      await this.reconcileFeishuActiveState(data.shouldConnectFeishu !== false, data.activeHostId)
      if (Array.isArray(data.commands) && data.commands.length > 0) {
        for (const cmd of data.commands) {
          if (cmd?.id && this.executedIds.has(cmd.id)) continue
          if (cmd?.id) {
            this.executedIds.add(cmd.id)
            if (this.executedIds.size > 500) {
              const oldest = this.executedIds.values().next().value
              this.executedIds.delete(oldest)
            }
          }
          executedAny = true
          const outcome = await this.handleHubCommand(cmd)
          this.pendingResults.push({
            id: cmd.id,
            type: cmd.type,
            at: Date.now(),
            ...outcome,
          })
        }
      }
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: hub heartbeat error: ${safeError(error)}`)
    } finally {
      this.polling = false
      if (resolveInflight) {
        resolveInflight()
        this.inflightTick = null
      }
      if (this.timer && (this.pendingRetick || executedAny)) {
        this.pendingRetick = false
        setImmediate(() => void this.tick())
        if (executedAny) {
          if (this.followUpTimer) clearTimeout(this.followUpTimer)
          this.followUpTimer = setTimeout(() => void this.tick(), 350)
          this.followUpTimer.unref?.()
        }
      }
    }
  }

  async createEncryptedShare(agent) {
    if (!agent) return { ok: false, error: '找不到任务会话' }
    if (!this.config.hubUrl) return { ok: false, error: '未配置 Hub 地址' }
    const transcript = Array.isArray(agent.transcript) && !agent.session
      ? agent.transcript
      : extractSessionTranscript(agent, 120)
    const title = agent.session ? this.bridge.taskTitle(agent) : (agent.title || agent.id)
    const cwd = agent?.session?.header?.cwd ?? agent?.session?.cwd ?? agent?.cwd ?? ''
    const plainPayload = {
      version: 1,
      agentId: agent.id,
      title,
      cwd,
      hostId: this.config.hostId,
      hostName: this.config.hostName,
      createdAt: Date.now(),
      transcript,
    }
    const key = randomBytes(32)
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(plainPayload), 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    // WebCrypto AES-GCM expects ciphertext + 16-byte tag concatenated
    const combinedCiphertext = Buffer.concat([encrypted, authTag])

    const res = await this.fetch(`${this.config.hubUrl}/api/shares`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        title,
        hostId: this.config.hostId,
        hostName: this.config.hostName,
        agentId: agent.id,
        messageCount: transcript.length,
        ivBase64: iv.toString('base64'),
        ciphertextBase64: combinedCiphertext.toString('base64'),
      }),
    })
    if (!res.ok) {
      return { ok: false, error: `上传加密分享失败 (${res.status})` }
    }
    const data = await res.json()
    const shareId = data.share?.id
    const keyBase64Url = key.toString('base64url')
    const baseUrl = this.getPublicWebUrl() || this.config.hubUrl
    const shareUrl = `${baseUrl.replace(/\/+$/, '')}/share/${shareId}#k=${keyBase64Url}`
    await this.audit?.write('session_shared_e2ee', {
      agentId: agent.id,
      shareId,
      messageCount: transcript.length,
    })
    return {
      ok: true,
      shareId,
      keyBase64Url,
      shareUrl,
      title,
      messageCount: transcript.length,
      message: `已生成端到端加密分享链接：${shareUrl}`,
    }
  }

  async reconcileFeishuActiveState(shouldConnect, activeHostId) {
    if (!this.transport) return
    if (!shouldConnect && !this.bridge.feishuStandby) {
      this.bridge.feishuStandby = true
      await this.transport.stop()
      await this.audit?.write('feishu_standby', {
        hostId: this.config.hostId,
        activeHostId,
      })
      this.logger?.info?.(`dsh-feishu: entered Feishu standby (active host is ${activeHostId})`)
    } else if (shouldConnect && this.bridge.feishuStandby) {
      this.bridge.feishuStandby = false
      await this.transport.start()
      await this.audit?.write('feishu_activated', {
        hostId: this.config.hostId,
      })
      this.logger?.info?.(`dsh-feishu: activated Feishu long connection on ${this.config.hostId}`)
      if (this.bridge.controlChatId) {
        await this.bridge.safeSend(
          this.bridge.controlChatId,
          `🖥 飞书控制已切换到电脑：${this.config.hostName} (${this.config.hostId})`,
        )
        await this.bridge.sendSessions(this.bridge.controlChatId)
      }
    }
  }

  async requestSwitchHost(targetHostId) {
    if (!this.config.hubUrl) return false
    try {
      const response = await this.fetch(
        `${this.config.hubUrl}/api/hosts/${encodeURIComponent(targetHostId)}/activate`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ fromHostId: this.config.hostId }),
        },
      )
      if (!response.ok) return false
      const result = await response.json()
      if (result.ok) {
        void this.tick()
      }
      return Boolean(result.ok)
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: requestSwitchHost failed: ${safeError(error)}`)
      return false
    }
  }

  async handleHubCommand(cmd) {
    const type = String(cmd?.type ?? '')
    try {
      switch (type) {
        case 'export_snapshot': {
          const { buffer, meta } = await createSnapshotBuffer(this.config.dshHome, {
            hostId: this.config.hostId,
            hostName: this.config.hostName,
            includeCredentials: cmd.includeCredentials === true,
            note: cmd.note || `Export from ${this.config.hostName}`,
          })
          const uploadRes = await this.fetch(`${this.config.hubUrl}/api/snapshots`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
              meta,
              migrationId: cmd.migrationId || '',
              dataBase64: buffer.toString('base64'),
            }),
          })
          if (!uploadRes.ok) {
            throw new Error(`Snapshot upload failed with status ${uploadRes.status}`)
          }
          const uploaded = await uploadRes.json()
          await this.refreshDshStats(true)
          await this.audit?.write('snapshot_exported', {
            snapshotId: uploaded.snapshot?.id,
            fileCount: meta.fileCount,
            compressedBytes: meta.compressedBytes,
          })
          return {
            ok: true,
            snapshotId: uploaded.snapshot?.id,
            meta,
            message: `已导出快照 (${meta.fileCount} 个文件, ${meta.sessionCount} 个会话)`,
          }
        }
        case 'import_snapshot': {
          const snapshotId = String(cmd.snapshotId ?? '').trim()
          if (!snapshotId) throw new Error('Missing snapshotId for import_snapshot')
          const downloadRes = await this.fetch(
            `${this.config.hubUrl}/api/snapshots/${encodeURIComponent(snapshotId)}/download`,
            {
              method: 'GET',
              headers: this.headers({ 'content-type': undefined }),
            },
          )
          if (!downloadRes.ok) {
            throw new Error(`Snapshot download failed with status ${downloadRes.status}`)
          }
          const arrayBuf = await downloadRes.arrayBuffer()
          const restored = await restoreSnapshotBuffer(this.config.dshHome, Buffer.from(arrayBuf), {
            skipCredentials: cmd.skipCredentials === true,
          })
          await this.refreshDshStats(true)
          await this.audit?.write('snapshot_imported', {
            snapshotId,
            restoredFiles: restored.restoredFiles,
            sessionCount: restored.sessionCount,
          })
          return {
            ok: true,
            snapshotId,
            ...restored,
            message: `已恢复快照 (${restored.restoredFiles} 个文件, ${restored.sessionCount} 个会话)`,
          }
        }
        case 'wipe_host': {
          let backupSnapshotId = ''
          if (cmd.backupFirst !== false) {
            const exported = await this.handleHubCommand({
              type: 'export_snapshot',
              includeCredentials: false,
              note: `清理前自动备份 (${this.config.hostName})`,
            })
            if (exported.ok) backupSnapshotId = exported.snapshotId || ''
          }
          // Cancel any running live agents before wiping
          for (const agent of this.bridge.agents.list()) {
            if (agent.status === 'running' && typeof agent.cancel === 'function') {
              try {
                await agent.cancel({ kind: 'user' })
              } catch {
                // ignore cancel failure
              }
            }
          }
          this.bridge.remote.active = false
          await this.bridge.saveRemoteState()
          const wiped = await wipeDshHome(this.config.dshHome, {
            keepCredentials: cmd.keepCredentials !== false,
          })
          await this.refreshDshStats(true)
          await this.audit?.write('host_wiped', {
            wipedEntries: wiped.wipedEntries,
            keptCredentials: wiped.keptCredentials,
            backupSnapshotId,
          })
          return {
            ok: true,
            ...wiped,
            backupSnapshotId,
            message: `已清理本机 DSH 数据 (移除 ${wiped.wipedEntries} 项${backupSnapshotId ? `，已备份快照 ${backupSnapshotId}` : ''})`,
          }
        }
        case 'share_session': {
          const targetId = String(cmd.agentId ?? '')
          const agent = this.bridge.agents.get(targetId)
            || (this.cachedDiskSessions || []).find(s => s.id === targetId)
            || (this.cachedAgySessions || []).find(s => s.id === targetId)
            || (this.cachedExternalSessions || []).find(s => s.id === targetId)
          if (!agent) return { ok: false, error: '找不到该任务会话' }
          return await this.createEncryptedShare(agent)
        }
        case 'rename_session': {
          const targetId = String(cmd.agentId ?? '')
          const liveAgent = this.bridge.agents.get(targetId)
          if (liveAgent) {
            return await this.bridge.executeHubCommand(cmd)
          }
          const diskSession = (this.cachedDiskSessions || []).find(s => s.id === targetId)
            || (this.cachedAgySessions || []).find(s => s.id === targetId)
            || (this.cachedExternalSessions || []).find(s => s.id === targetId)
          if (!diskSession) return { ok: false, error: '找不到该任务会话' }
          const renamed = await renameDiskSession(this.config.dshHome, targetId, cmd.title)
          if (renamed.ok) {
            diskSession.title = renamed.title
          }
          return {
            ...renamed,
            agentId: targetId,
            message: renamed.ok ? `已重命名会话为「${renamed.title}」` : renamed.error,
          }
        }
        case 'delete_session': {
          const targetId = String(cmd.agentId ?? '')
          if (isAntigravityIdeSessionId(targetId)) {
            this.deletedAgyIds.add(toRawConversationId(targetId))
            this.cachedAgySessions = (this.cachedAgySessions || []).filter(s => s.id !== targetId)
            return {
              ok: true,
              agentId: targetId,
              message: `已从总控台隐藏 Antigravity IDE 会话 (${toRawConversationId(targetId).slice(0, 8)})`,
            }
          }
          const extAdapter = this.harnessRouter?.getAdapter(targetId)
          if (extAdapter) {
            if (typeof extAdapter.deleteSession === 'function') {
              await extAdapter.deleteSession({ sessionId: targetId })
            }
            this.cachedExternalSessions = (this.cachedExternalSessions || []).filter(s => s.id !== targetId)
            return {
              ok: true,
              agentId: targetId,
              message: `已从总控台隐藏 ${extAdapter.label || extAdapter.id} 会话`,
            }
          }
          const res = await this.bridge.executeHubCommand(cmd)
          this.cachedDiskSessions = (this.cachedDiskSessions || []).filter(s => s.id !== targetId)
          await this.refreshDshStats(true)
          return res
        }
        case 'list_files':
        case 'read_file': {
          const targetId = String(cmd.agentId ?? '')
          const diskSession = (this.cachedDiskSessions || []).find(s => s.id === targetId)
            || (this.cachedAgySessions || []).find(s => s.id === targetId)
            || (this.cachedExternalSessions || []).find(s => s.id === targetId)
          const enrichedCmd = (!cmd.cwd && diskSession?.cwd)
            ? { ...cmd, cwd: diskSession.cwd }
            : cmd
          return await this.bridge.executeHubCommand(enrichedCmd)
        }
        case 'approve':
        case 'deny':
        case 'approval': {
          const code = String(cmd.code ?? '').trim().toUpperCase()
          const effectiveType = type === 'approval' ? (cmd.allow !== false ? 'approve' : 'deny') : type
          if (code.startsWith('AGY-') || isAntigravityIdeSessionId(cmd.agentId)) {
            const remembered = code ? this.recentAgyApprovals.get(code) : null
            let matchedSession = remembered?.session || null
            let matchedApproval = remembered?.approval || null
            for (const s of this.cachedAgySessions || []) {
              if (s.pendingApproval?.code?.toUpperCase() === code || (cmd.agentId && s.id === cmd.agentId)) {
                matchedSession = s
                if (s.pendingApproval) {
                  matchedApproval = s.pendingApproval
                  s.pendingApproval = null
                  s.status = effectiveType === 'approve' ? 'running' : 'idle'
                  s.statusLabel = effectiveType === 'approve' ? '🟢 运行中' : '已完成'
                }
              }
            }
            const res = await executeAntigravityIdeAction(
              {
                type: effectiveType,
                code,
                optionIndex: cmd.optionIndex,
                agentId: matchedSession?.id || matchedApproval?.agentId || cmd.agentId,
                cwd: matchedSession?.cwd || cmd.cwd,
                pendingApproval: matchedApproval,
              },
              { execImpl: this.execImpl, fetchImpl: this.fetch },
            )
            if (res?.ok && code) {
              this.settledAgyApprovals.add(code)
            }
            this.logger?.log?.(
              `[dsh-feishu] Antigravity ${effectiveType} (${code}, option=${cmd.optionIndex ?? 1}) -> ok=${res?.ok} engine=${res?.engine || 'fallback'} msg=${res?.message || res?.error || ''}`,
            )
            return {
              ...res,
              code,
              decision: effectiveType === 'approve' ? 'allowed-once' : 'rejected',
            }
          }
          const extAdapter = this.harnessRouter?.getAdapter(cmd.agentId)
          if (extAdapter && typeof extAdapter.resolveApproval === 'function') {
            return await extAdapter.resolveApproval({
              sessionId: cmd.agentId,
              code,
              allow: effectiveType === 'approve',
              optionIndex: cmd.optionIndex,
            })
          }
          const rememberedDsh = code ? this.recentDshApprovals.get(code) : null
          let matchedDshSession = rememberedDsh?.session || null
          let matchedDshApproval = rememberedDsh?.approval || null
          for (const ds of this.cachedDiskSessions || []) {
            if (
              ds.pendingApproval?.code?.toUpperCase() === code ||
              (cmd.agentId && ds.id === cmd.agentId)
            ) {
              matchedDshSession = ds
              if (ds.pendingApproval) {
                matchedDshApproval = ds.pendingApproval
                ds.pendingApproval = null
                ds.status = effectiveType === 'approve' ? 'running' : 'idle'
                ds.statusLabel = effectiveType === 'approve' ? '🟢 运行中' : '已完成'
              }
            }
          }
          const targetDshAgentId =
            cmd.agentId || matchedDshApproval?.agentId || matchedDshSession?.id || ''
          const targetCallId = cmd.callId || matchedDshApproval?.callId || ''
          const targetQuestions =
            Array.isArray(cmd.questions) && cmd.questions.length > 0
              ? cmd.questions
              : matchedDshApproval?.questions || []
          const isQuestionInteraction =
            matchedDshApproval?.kind === 'question' ||
            code.startsWith('DSHQ-') ||
            Array.isArray(cmd.answers)
          const normalizedAnswers = isQuestionInteraction
            ? effectiveType === 'approve'
              ? buildNormalizedQuestionAnswers(targetQuestions, cmd.answers, cmd.optionIndex)
              : []
            : undefined

          if (code) {
            this.settledDshApprovals.add(code)
          }

          if (this.config?.dshHome) {
            await writePendingDshInteractionResponse(this.config.dshHome, {
              code,
              callId: targetCallId,
              agentId: targetDshAgentId,
              allow: effectiveType === 'approve',
              decision:
                effectiveType === 'approve'
                  ? isQuestionInteraction
                    ? 'answered'
                    : 'allowed-once'
                  : 'rejected',
              optionIndex: cmd.optionIndex,
              ...(normalizedAnswers ? { answers: normalizedAnswers } : {}),
              ...(targetQuestions.length > 0 ? { questions: targetQuestions } : {}),
            })
            await removePendingDshInteraction(this.config.dshHome, {
              code,
              callId: targetCallId,
              agentId: targetDshAgentId,
            })
          }

          const bridgeRes = await this.bridge.executeHubCommand({
            ...cmd,
            type: effectiveType,
            agentId: targetDshAgentId,
            callId: targetCallId,
            questions: targetQuestions,
            ...(normalizedAnswers ? { answers: normalizedAnswers } : {}),
          })
          if (bridgeRes?.ok) {
            return bridgeRes
          }

          if (isQuestionInteraction) {
            if (effectiveType !== 'approve') {
              return {
                ok: true,
                code,
                decision: 'rejected',
                answers: [],
                message: '已跳过该选择弹窗',
              }
            }
            const questionReplyPayload = {
              kind: 'answer_to_pending_question',
              tool: matchedDshApproval?.toolName || 'ask_user_question',
              callId: targetCallId,
              questions: targetQuestions,
              answers: normalizedAnswers || [],
            }
            const replyPreview = formatUserQuestionReplyText(JSON.stringify(questionReplyPayload))
            if (targetDshAgentId && replyPreview) {
              const nowTs = Date.now()
              const list = this.pendingUserPrompts.get(targetDshAgentId) || []
              list.push({ text: replyPreview, time: nowTs })
              this.pendingUserPrompts.set(targetDshAgentId, list)
              if (matchedDshSession && Array.isArray(matchedDshSession.transcript)) {
                matchedDshSession.transcript = [
                  ...matchedDshSession.transcript,
                  {
                    index: matchedDshSession.transcript.length,
                    role: 'user',
                    text: replyPreview,
                    thinking: '',
                    tools: [],
                    toolCalls: [],
                    time: nowTs,
                  },
                ]
                matchedDshSession.lastActivity = nowTs
                matchedDshSession.updatedAt = nowTs
              }
            }
            if (targetDshAgentId && this.dshHeadlessRunner) {
              // Give any active DSH Desktop process 350ms to consume the IPC response first
              await new Promise(r => setTimeout(r, 350))
              const hlRes = await this.dshHeadlessRunner.runTurn({
                sessionId: targetDshAgentId,
                text: replyPreview,
                cwd: matchedDshSession?.cwd || matchedDshApproval?.cwd || cmd.cwd,
                questionReply: questionReplyPayload,
              })
              if (hlRes?.ok || hlRes?.busy) {
                return {
                  ok: true,
                  code,
                  decision: 'answered',
                  answers: normalizedAnswers || [],
                  message: hlRes?.ok ? '✅ 已提交选择并继续执行' : '✅ 已同步选择到电脑端 DSH',
                }
              }
            }
            return {
              ok: true,
              code,
              decision: 'answered',
              answers: normalizedAnswers || [],
              message: '✅ 已同步选择到电脑端 DSH',
            }
          }

          if (code.startsWith('DSHA-') || matchedDshApproval) {
            return {
              ok: true,
              code,
              decision: effectiveType === 'approve' ? 'allowed-once' : 'rejected',
              message:
                effectiveType === 'approve'
                  ? '✅ 已同步批准指令到电脑端 DSH'
                  : '已拒绝该工具调用',
            }
          }

          return bridgeRes
        }
        case 'prompt':
        case 'steer':
        case 'stop': {
          const targetId = String(cmd.agentId ?? '')
          const matchedAnySess =
            (this.cachedAgySessions || []).find(s => s.id === targetId) ||
            (this.cachedExternalSessions || []).find(s => s.id === targetId) ||
            (this.cachedDiskSessions || []).find(s => s.id === targetId)
          const effectiveCwd = matchedAnySess?.cwd || cmd.cwd || this.config?.defaultWorkspace || ''
          let effectiveText = String(cmd.text ?? cmd.prompt ?? '').trim()
          let imagePaths = []
          let savedFiles = []
          if ((type === 'prompt' || type === 'steer') && Array.isArray(cmd.attachments) && cmd.attachments.length > 0) {
            const persisted = await persistCommandAttachments(cmd.attachments, {
              cwd: effectiveCwd,
              dshHome: this.config.dshHome,
              agentId: targetId,
            })
            if (!persisted.ok || persisted.savedFiles.length === 0 || persisted.rejectedCount > 0) {
              return {
                ok: false,
                error:
                  persisted.error ||
                  `共上传 ${cmd.attachments.length} 张图片，其中 ${persisted.rejectedCount} 张保存失败，指令未执行`,
              }
            }
            savedFiles = persisted.savedFiles
            imagePaths = persisted.imagePaths
            effectiveText = persisted.enrichPrompt(effectiveText)
          }

          if (isAntigravityIdeSessionId(targetId)) {
            const sess = (this.cachedAgySessions || []).find(s => s.id === targetId)
            const res = await executeAntigravityIdeAction(
              { type, agentId: targetId, text: effectiveText, cwd: sess?.cwd || cmd.cwd, imagePaths },
              { execImpl: this.execImpl },
            )
            if (res.ok && (type === 'prompt' || type === 'steer')) {
              const trimmedText = effectiveText
              if (trimmedText) {
                const nowTs = Date.now()
                const list = this.pendingUserPrompts.get(targetId) || []
                list.push({ text: trimmedText, time: nowTs })
                this.pendingUserPrompts.set(targetId, list)
                if (sess && Array.isArray(sess.transcript)) {
                  sess.transcript = [
                    ...sess.transcript,
                    {
                      index: sess.transcript.length,
                      role: 'user',
                      text: trimmedText,
                      thinking: '',
                      tools: [],
                      time: nowTs,
                    },
                  ]
                  sess.lastActivity = nowTs
                  sess.updatedAt = nowTs
                }
              }
            }
            return {
              ...res,
              ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
            }
          }
          const extAdapter = this.harnessRouter?.getAdapter(targetId)
          if (extAdapter) {
            const extSess = (this.cachedExternalSessions || []).find(s => s.id === targetId)
            if (extSess?.controlMode === 'observe-only') {
              return {
                ok: false,
                error: `该 ${extAdapter.label || extAdapter.id} 会话当前正在电脑独立终端运行中（只读观测模式），请等待回合结束后再从手机续聊`,
              }
            }
            if (type === 'stop' && typeof extAdapter.stopSession === 'function') {
              return await extAdapter.stopSession({ sessionId: targetId, cwd: extSess?.cwd || cmd.cwd })
            }
            if ((type === 'prompt' || type === 'steer') && typeof extAdapter.sendPrompt === 'function') {
              const extRes = await extAdapter.sendPrompt({
                sessionId: targetId,
                text: effectiveText,
                cwd: extSess?.cwd || cmd.cwd,
                imagePaths,
                mode: type,
                execImpl: this.execImpl,
              })
              return {
                ...extRes,
                ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
              }
            }
          }
          const enrichedCmd =
            effectiveText && effectiveText !== cmd.text
              ? { ...cmd, text: effectiveText, prompt: effectiveText }
              : cmd
          const bridgeRes = await this.bridge.executeHubCommand(enrichedCmd)
          if (!bridgeRes?.ok && bridgeRes?.error === '找不到该任务会话') {
            if (type === 'stop' && this.dshHeadlessRunner?.isRunning(targetId)) {
              return this.dshHeadlessRunner.stop(targetId)
            }
            const diskSess = (this.cachedDiskSessions || []).find(s => s.id === targetId)
            if (diskSess && (type === 'prompt' || type === 'steer')) {
              const trimmedText = effectiveText
              const headlessRes = await this.dshHeadlessRunner.runTurn({
                sessionId: targetId,
                text: trimmedText,
                cwd: diskSess.cwd || cmd.cwd,
              })
              if (headlessRes.ok && trimmedText) {
                const nowTs = Date.now()
                const list = this.pendingUserPrompts.get(targetId) || []
                list.push({ text: trimmedText, time: nowTs })
                this.pendingUserPrompts.set(targetId, list)
                diskSess.status = 'running'
                diskSess.statusLabel = '🟢 运行中'
                diskSess.lastActivity = nowTs
                diskSess.updatedAt = nowTs
              }
              return {
                ...headlessRes,
                ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
              }
            }
          }
          return {
            ...bridgeRes,
            ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
          }
        }
        case 'new_session': {
          const newCwd = cmd.cwd || this.config?.defaultWorkspace || process.cwd()
          let effectivePrompt = String(cmd.prompt || cmd.text || '').trim()
          let imagePaths = []
          let savedFiles = []
          if (Array.isArray(cmd.attachments) && cmd.attachments.length > 0) {
            const persisted = await persistCommandAttachments(cmd.attachments, {
              cwd: newCwd,
              dshHome: this.config.dshHome,
            })
            if (!persisted.ok || persisted.savedFiles.length === 0 || persisted.rejectedCount > 0) {
              return {
                ok: false,
                error:
                  persisted.error ||
                  `共上传 ${cmd.attachments.length} 张图片，其中 ${persisted.rejectedCount} 张保存失败，任务未创建`,
              }
            }
            savedFiles = persisted.savedFiles
            imagePaths = persisted.imagePaths
            effectivePrompt = persisted.enrichPrompt(effectivePrompt)
          }
          if (cmd.harness === 'antigravity-ide') {
            const agyRes = await executeAntigravityIdeAction(
              {
                type: 'new_session',
                title: cmd.title,
                prompt: effectivePrompt,
                cwd: cmd.cwd,
                imagePaths,
              },
              { execImpl: this.execImpl },
            )
            return {
              ...agyRes,
              ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
            }
          }
          const extAdapter = this.harnessRouter?.getAdapter(cmd.harness)
          if (extAdapter && typeof extAdapter.createSession === 'function') {
            const extNewRes = await extAdapter.createSession({
              title: cmd.title,
              prompt: effectivePrompt,
              cwd: cmd.cwd,
              imagePaths,
              execImpl: this.execImpl,
            })
            return {
              ...extNewRes,
              ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
            }
          }
          const bridgeNewRes = await this.bridge.executeHubCommand({
            ...cmd,
            prompt: effectivePrompt,
            text: effectivePrompt,
          })
          if (!bridgeNewRes?.ok && bridgeNewRes?.error === '当前 DSH 实例不支持动态创建会话') {
            const hlNewRes = await this.dshHeadlessRunner.runTurn({
              isNew: true,
              title: cmd.title,
              text: effectivePrompt,
              cwd: newCwd,
            })
            return {
              ...hlNewRes,
              ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
            }
          }
          return {
            ...bridgeNewRes,
            ...(savedFiles.length > 0 ? { savedAttachments: savedFiles.map(f => ({ name: f.name, path: f.preferredPath })) } : {}),
          }
        }
        case 'load_full_transcript': {
          const targetId = String(cmd.agentId || '').trim()
          if (!targetId) return { ok: false, error: 'agentId is required' }
          if (isAntigravityIdeSessionId(targetId)) {
            const agySessions = await loadAntigravityIdeSessions(this.agyBrainDirs, { maxMessages: 120 })
            const found = agySessions.find(s => s.id === targetId)
            if (found) {
              return {
                ok: true,
                agentId: targetId,
                totalCount: found.messageCount || found.transcript?.length || 0,
                transcript: found.transcript || [],
              }
            }
          }
          const extAdapter = this.harnessRouter?.getAdapter(targetId)
          if (extAdapter && typeof extAdapter.listSessions === 'function') {
            const extList = await extAdapter.listSessions({ maxMessages: 120 })
            const found = (extList || []).find(s => s.id === targetId)
            if (found) {
              return {
                ok: true,
                agentId: targetId,
                totalCount: found.transcript?.length || 0,
                transcript: found.transcript || [],
              }
            }
          }
          const diskList = await loadDiskSessionsFromDshHome(this.config.dshHome, {
            maxSessions: 80,
            maxMessages: 120,
          })
          const foundDisk = diskList.find(s => s.id === targetId)
          if (foundDisk) {
            return {
              ok: true,
              agentId: targetId,
              totalCount: foundDisk.messageCount || foundDisk.transcript?.length || 0,
              transcript: foundDisk.transcript || [],
            }
          }
          return { ok: false, error: '未找到该会话的完整历史记录' }
        }
        case 'request_ax_permission': {
          const perm = await checkAccessibilityPermission({
            prompt: true,
            execImpl: this.execImpl || execFileAsync,
          })
          if (this.turbo) {
            this.turbo.axTrusted = Boolean(perm.trusted)
            this.turbo.lastAxCheckAt = Date.now()
          }
          return {
            ok: true,
            trusted: Boolean(perm.trusted),
            prompted: true,
            message: perm.trusted
              ? '✅ 当前电脑已具备 macOS 辅助功能权限'
              : '🔓 已在电脑端弹出 macOS「系统设置 → 辅助功能」授权窗口，请勾选开启',
          }
        }
        case 'upgrade_turbo': {
          const runExec = this.execImpl || execFileAsync
          try {
            await runExec('git', ['-C', REPO_ROOT, 'fetch', 'origin', 'main'], { timeout: 15_000 })
            await runExec('git', ['-C', REPO_ROOT, 'checkout', 'main'], { timeout: 10_000 })
            await runExec('git', ['-C', REPO_ROOT, 'pull', '--ff-only', 'origin', 'main'], { timeout: 15_000 })
          } catch {
            try {
              await runExec('git', ['-C', REPO_ROOT, 'pull', '--ff-only'], { timeout: 15_000 })
            } catch {}
          }
          try {
            await runExec(join(REPO_ROOT, 'dsh-turbo', 'enable-turbo.sh'), [], { timeout: 10_000 })
          } catch {}
          if (this.turbo) {
            await this.turbo.refreshAccessibilityState(true)
          }
          return {
            ok: true,
            engine: getTurboNativeBinaryPath() ? 'rust-native' : 'node-fsevents',
            message: '⚡ 已启用 Rust 原生加速引擎并同步最新代码',
          }
        }
        // 兼容两种叫法：Web UI 早期发 remote_toggle/enable，插件内部统一用 remote_mode/active
        case 'remote_mode':
        case 'remote_toggle': {
          const active = cmd.active !== undefined ? cmd.active !== false : cmd.enable !== false
          return await this.bridge.executeHubCommand({ ...cmd, type: 'remote_mode', active })
        }
        default:
          return await this.bridge.executeHubCommand(cmd)
      }
    } catch (error) {
      const msg = safeError(error)
      this.logger?.warn?.(`dsh-feishu: hub command ${type} failed: ${msg}`)
      return { ok: false, error: msg }
    }
  }
}

