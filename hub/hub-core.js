import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const ONLINE_TTL_MS = 15_000
const MAX_SNAPSHOTS = 15

export class HubCore {
  constructor({ stateFile = '', now = () => Date.now() } = {}) {
    this.stateFile = stateFile
    this.now = now
    this.activeHostId = ''
    this.hosts = new Map()
    this.snapshots = new Map()
    this.migrations = new Map()
  }

  async init() {
    if (!this.stateFile) return
    try {
      const text = await readFile(this.stateFile, 'utf8')
      const data = JSON.parse(text)
      if (typeof data.activeHostId === 'string') this.activeHostId = data.activeHostId
      if (Array.isArray(data.hosts)) {
        for (const h of data.hosts) {
          if (h?.hostId) this.hosts.set(h.hostId, { ...h, commands: h.commands ?? [], recentResults: h.recentResults ?? [] })
        }
      }
      if (Array.isArray(data.snapshots)) {
        for (const s of data.snapshots) {
          if (s?.id) this.snapshots.set(s.id, s)
        }
      }
    } catch {
      // ignore missing or corrupt state file on startup
    }
  }

  async persist() {
    if (!this.stateFile) return
    try {
      await mkdir(dirname(this.stateFile), { recursive: true })
      const payload = {
        activeHostId: this.activeHostId,
        hosts: [...this.hosts.values()].map(h => ({
          ...h,
          commands: h.commands ?? [],
          recentResults: (h.recentResults ?? []).slice(-15),
        })),
        snapshots: [...this.snapshots.values()],
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
      })
    }
    return list
  }

  getFullState() {
    const summaryById = new Map(this.getHostsSummary().map(item => [item.hostId, item]))
    const hosts = [...this.hosts.values()].map(host => {
      const summary = summaryById.get(host.hostId) ?? {}
      return {
        ...summary,
        dshStats: host.dshStats ?? {},
        bridgeState: host.bridgeState ?? { tasks: [], approvals: [] },
        pendingCommandsCount: (host.commands ?? []).length,
        recentResults: (host.recentResults ?? []).slice(-10).reverse(),
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
    return {
      now: this.now(),
      activeHostId: this.activeHostId,
      hosts,
      snapshots,
      migrations,
    }
  }

  handleHeartbeat(payload = {}) {
    const hostId = String(payload.hostId ?? '').trim()
    if (!hostId) throw new Error('hostId is required')
    const hostName = String(payload.hostName || hostId).trim()
    const now = this.now()

    let record = this.hosts.get(hostId)
    if (!record) {
      record = {
        hostId,
        hostName,
        platform: payload.platform || '',
        arch: payload.arch || '',
        lastSeen: now,
        dshStats: payload.dshStats ?? {},
        bridgeState: payload.bridgeState ?? { tasks: [], approvals: [] },
        commands: [],
        recentResults: [],
      }
      this.hosts.set(hostId, record)
    } else {
      record.hostName = hostName
      record.platform = payload.platform || record.platform
      record.arch = payload.arch || record.arch
      record.lastSeen = now
      if (payload.dshStats) record.dshStats = payload.dshStats
      if (payload.bridgeState) record.bridgeState = payload.bridgeState
    }

    if (!this.activeHostId) {
      this.activeHostId = hostId
    } else {
      const currentActive = this.hosts.get(this.activeHostId)
      if (!currentActive) {
        this.activeHostId = hostId
      }
    }

    if (Array.isArray(payload.commandResults) && payload.commandResults.length > 0) {
      for (const res of payload.commandResults) {
        record.recentResults.push(res)
        this.onCommandResult(hostId, res)
      }
      if (record.recentResults.length > 25) {
        record.recentResults.splice(0, record.recentResults.length - 25)
      }
    }

    const commands = record.commands.splice(0)
    void this.persist()

    return {
      ok: true,
      activeHostId: this.activeHostId,
      shouldConnectFeishu: this.activeHostId === hostId,
      commands,
      hostsSummary: this.getHostsSummary(),
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
    const host = this.hosts.get(hostId)
    if (!host) return { ok: false, error: `Host not found: ${hostId}` }
    const cmd = {
      id: commandPayload.id || `cmd-${randomBytes(4).toString('hex')}`,
      createdAt: this.now(),
      ...commandPayload,
    }
    host.commands.push(cmd)
    void this.persist()
    return { ok: true, command: cmd }
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
