import { createSnapshotBuffer, inspectDshHome, restoreSnapshotBuffer, wipeDshHome } from './migration.js'
import { safeError } from './redact.js'

/**
 * Outbound agent that synchronizes a local DSH host with the Cloud Run Control Hub
 * (or embedded local Hub). Handles:
 * - Heartbeat state reporting (live tasks, approvals, ~/.dsh storage metrics)
 * - Active / Standby Feishu WebSocket coordination across multiple computers
 * - Executing Web UI commands (prompt, stop, approve/deny, snapshot export/import, safe wipe)
 */
export class HubAgent {
  constructor({ config, bridge, transport, audit, logger, fetchImpl = globalThis.fetch }) {
    this.config = config
    this.bridge = bridge
    this.transport = transport
    this.audit = audit
    this.logger = logger
    this.fetch = fetchImpl
    this.timer = null
    this.polling = false
    this.disposed = false
    this.fleetSummary = []
    this.pendingResults = []
    this.cachedStats = null
    this.lastStatsAt = 0
    this.executedIds = new Set()
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

  async refreshDshStats(force = false) {
    const now = Date.now()
    if (!force && this.cachedStats && now - this.lastStatsAt < 10_000) {
      return this.cachedStats
    }
    try {
      this.cachedStats = await inspectDshHome(this.config.dshHome)
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

  async tick() {
    if (this.disposed || this.polling || !this.config.hubUrl) return
    this.polling = true
    try {
      const dshStats = await this.refreshDshStats(false)
      const bridgeState = this.bridge.getSnapshotState()
      const resultsToSend = this.pendingResults.splice(0)
      const response = await this.fetch(`${this.config.hubUrl}/api/heartbeat`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          hostId: this.config.hostId,
          hostName: this.config.hostName,
          platform: process.platform,
          arch: process.arch,
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
