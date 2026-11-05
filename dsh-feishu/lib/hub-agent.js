import { createCipheriv, randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  executeAntigravityIdeAction,
  isAntigravityIdeSessionId,
  loadAntigravityIdeSessions,
  toRawConversationId,
} from './antigravity-ide.js'
import { createSnapshotBuffer, inspectDshHome, restoreSnapshotBuffer, wipeDshHome } from './migration.js'
import { safeError } from './redact.js'
import { extractSessionTranscript, loadDiskSessionsFromDshHome, loadOrCreateHostIdentity, renameDiskSession } from './workspace-ops.js'

/**
 * Outbound agent that synchronizes a local DSH host with the Cloud Run Control Hub
 * (or embedded local Hub). Handles:
 * - Heartbeat state reporting (live tasks, approvals, ~/.dsh storage metrics, Ed25519 identity, Antigravity IDE sessions)
 * - Active / Standby Feishu WebSocket coordination across multiple computers
 * - Executing Web UI commands (prompt, steer, new_session, rename/delete_session, list/read_file, share_session, stop, approve/deny, snapshot export/import, safe wipe)
 */
export class HubAgent {
  constructor({ config, bridge, transport, audit, logger, fetchImpl = globalThis.fetch, execImpl = undefined }) {
    this.config = config
    this.bridge = bridge
    this.transport = transport
    this.audit = audit
    this.logger = logger
    this.fetch = fetchImpl
    this.execImpl = execImpl
    this.timer = null
    this.polling = false
    this.disposed = false
    this.fleetSummary = []
    this.pendingResults = []
    this.cachedStats = null
    this.cachedDiskSessions = []
    this.cachedAgySessions = []
    this.settledAgyApprovals = new Set()
    this.deletedAgyIds = new Set()
    this.lastStatsAt = 0
    this.executedIds = new Set()
    this.identity = null
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
    this.timer = setInterval(() => {
      void this.tick()
    }, this.config.hubPollMs || 2000)
    this.timer.unref?.()
    void this.tick()
  }

  stop() {
    this.disposed = true
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  shouldLoadAntigravityIde() {
    if (this.config.enableAntigravityIde === false) return false
    if (this.config.enableAntigravityIde === true) return true
    if (Array.isArray(this.config.antigravityBrainDirs) && this.config.antigravityBrainDirs.length > 0) return true
    const defaultDshHome = join(homedir(), '.dsh')
    return Boolean(this.config.dshHome && resolve(this.config.dshHome) === resolve(defaultDshHome))
  }

  async refreshDshStats(force = false) {
    const now = Date.now()
    if (!force && this.cachedStats && now - this.lastStatsAt < 10_000) {
      return this.cachedStats
    }
    try {
      this.cachedStats = await inspectDshHome(this.config.dshHome)
      this.cachedDiskSessions = await loadDiskSessionsFromDshHome(this.config.dshHome)
      if (this.shouldLoadAntigravityIde()) {
        this.cachedAgySessions = await loadAntigravityIdeSessions({
          brainDirs: this.config.antigravityBrainDirs || undefined,
          dshHome: this.config.dshHome,
          maxSessions: this.config.maxAntigravitySessions || 100,
          settledApprovals: this.settledAgyApprovals,
          excludeConversationIds: this.deletedAgyIds,
          now,
        })
      } else {
        this.cachedAgySessions = []
      }
      this.lastStatsAt = now
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
    if (this.disposed || this.polling || !this.config.hubUrl) return
    this.polling = true
    try {
      const identity = await this.ensureIdentity()
      const dshStats = await this.refreshDshStats(false)
      const bridgeState = this.bridge.getSnapshotState()
      for (const t of bridgeState.tasks || []) {
        if (!t.harness) {
          t.harness = 'dsh'
          t.harnessLabel = 'DeepSeek Harness'
        }
      }
      const existingIds = new Set((bridgeState.tasks || []).map(t => t.id))
      const wsSet = new Set(Array.isArray(bridgeState.workspaces) ? bridgeState.workspaces : [])
      if (Array.isArray(this.cachedDiskSessions) && this.cachedDiskSessions.length > 0) {
        for (const ds of this.cachedDiskSessions) {
          if (!existingIds.has(ds.id)) {
            bridgeState.tasks.push(ds)
            existingIds.add(ds.id)
          }
          if (ds.cwd) wsSet.add(ds.cwd)
        }
      }
      if (Array.isArray(this.cachedAgySessions) && this.cachedAgySessions.length > 0) {
        if (!Array.isArray(bridgeState.approvals)) bridgeState.approvals = []
        const existingCodes = new Set(bridgeState.approvals.map(a => a.code))
        for (const agySess of this.cachedAgySessions) {
          if (!existingIds.has(agySess.id)) {
            bridgeState.tasks.push(agySess)
            existingIds.add(agySess.id)
          }
          if (agySess.cwd) wsSet.add(agySess.cwd)
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
      bridgeState.taskCount = (bridgeState.tasks || []).length
      bridgeState.runningCount = (bridgeState.tasks || []).filter(t => t.status === 'running').length
      bridgeState.workspaces = [...wsSet]
      const resultsToSend = this.pendingResults.splice(0)
      const response = await this.fetch(`${this.config.hubUrl}/api/heartbeat`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          hostId: this.config.hostId,
          hostName: this.config.hostName,
          platform: process.platform,
          arch: process.arch,
          identity,
          dshStats,
          bridgeState,
          commandResults: resultsToSend,
        }),
      })
      if (!response.ok) {
        if (resultsToSend.length > 0) this.pendingResults.unshift(...resultsToSend)
        return
      }
      const data = await response.json()
      if (Array.isArray(data.hostsSummary)) {
        this.fleetSummary = data.hostsSummary
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
          const enrichedCmd = (!cmd.cwd && diskSession?.cwd)
            ? { ...cmd, cwd: diskSession.cwd }
            : cmd
          return await this.bridge.executeHubCommand(enrichedCmd)
        }
        case 'approve':
        case 'deny': {
          const code = String(cmd.code ?? '').trim().toUpperCase()
          if (code.startsWith('AGY-')) {
            this.settledAgyApprovals.add(code)
            for (const s of this.cachedAgySessions || []) {
              if (s.pendingApproval?.code === code) {
                s.pendingApproval = null
                s.status = 'idle'
                s.statusLabel = '已完成'
              }
            }
            const res = await executeAntigravityIdeAction({ type, code }, { execImpl: this.execImpl })
            return {
              ...res,
              code,
              decision: type === 'approve' ? 'allowed-once' : 'rejected',
            }
          }
          return await this.bridge.executeHubCommand(cmd)
        }
        case 'prompt':
        case 'steer':
        case 'stop': {
          const targetId = String(cmd.agentId ?? '')
          if (isAntigravityIdeSessionId(targetId)) {
            const res = await executeAntigravityIdeAction(
              { type, agentId: targetId, text: cmd.text },
              { execImpl: this.execImpl },
            )
            if (res.ok && (type === 'prompt' || type === 'steer')) {
              const sess = (this.cachedAgySessions || []).find(s => s.id === targetId)
              if (sess && Array.isArray(sess.transcript) && cmd.text) {
                sess.transcript.push({
                  index: sess.transcript.length,
                  role: 'user',
                  text: String(cmd.text).trim(),
                  thinking: '',
                  tools: [],
                  toolCalls: [],
                  time: Date.now(),
                })
                sess.lastActivity = Date.now()
                sess.updatedAt = Date.now()
              }
            }
            return res
          }
          return await this.bridge.executeHubCommand(cmd)
        }
        case 'new_session': {
          if (cmd.harness === 'antigravity-ide') {
            return await executeAntigravityIdeAction(
              {
                type: 'new_session',
                title: cmd.title,
                prompt: cmd.prompt || cmd.text,
                cwd: cmd.cwd,
              },
              { execImpl: this.execImpl },
            )
          }
          return await this.bridge.executeHubCommand(cmd)
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

