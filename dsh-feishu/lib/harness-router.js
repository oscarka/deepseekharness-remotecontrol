import { isAntigravityIdeSessionId } from './antigravity-ide.js'

export const DEFAULT_HARNESS_CAPABILITIES = {
  dsh: {
    canCreateSession: true,
    canPrompt: true,
    canSteer: true,
    canStop: true,
    canApprove: true,
  },
  'antigravity-ide': {
    canCreateSession: true,
    canPrompt: true,
    canSteer: true,
    canStop: true,
    canApprove: true,
  },
  codex: {
    canCreateSession: true,
    canPrompt: true,
    canSteer: false,
    canStop: true,
    canApprove: false,
  },
  claude: {
    canCreateSession: true,
    canPrompt: true,
    canSteer: false,
    canStop: true,
    canApprove: false,
  },
}

/**
 * Decorate a task/session object with standardized `harness`, `controlMode`,
 * `capabilities`, `stateMeta`, and deterministic `sessionRev`.
 */
export function decorateTaskMetadata(task, { isLiveDsh = false, now = Date.now() } = {}) {
  if (!task || typeof task !== 'object') return task
  const isAgy = task.harness === 'antigravity-ide' || isAntigravityIdeSessionId(task.id)
  const harness = task.harness || (isAgy ? 'antigravity-ide' : 'dsh')
  const harnessLabel =
    task.harnessLabel
    || (harness === 'antigravity-ide'
      ? 'Antigravity IDE'
      : harness === 'codex'
        ? 'Codex'
        : harness === 'claude'
          ? 'Claude Code'
          : 'DeepSeek Harness')

  let controlMode = task.controlMode
  if (!controlMode || (harness === 'dsh' && controlMode === 'observe-only')) {
    if (harness === 'antigravity-ide') {
      controlMode = task.hasLiveSummary ? 'managed' : 'idle-resumable'
    } else if (harness === 'dsh') {
      controlMode = isLiveDsh ? 'managed' : 'idle-resumable'
    } else {
      controlMode = 'observe-only'
    }
  }

  const baseCaps = DEFAULT_HARNESS_CAPABILITIES[harness] || {
    canCreateSession: false,
    canPrompt: controlMode !== 'observe-only',
    canSteer: controlMode === 'managed',
    canStop: controlMode === 'managed',
    canApprove: controlMode === 'managed',
  }
  const capabilities = {
    ...baseCaps,
    ...(task.capabilities || {}),
    canPrompt: controlMode !== 'observe-only' && Boolean(baseCaps.canPrompt),
    canSteer: controlMode === 'managed' && Boolean(baseCaps.canSteer),
    canStop: (controlMode === 'managed' || task.status === 'running') && Boolean(baseCaps.canStop),
    canApprove: controlMode === 'managed' && Boolean(baseCaps.canApprove),
  }

  const stateMeta = task.stateMeta || {
    source: isLiveDsh ? 'dsh-bridge' : isAgy ? 'jsonl-tail' : 'disk-snapshot',
    observedAt: task.updatedAt || task.lastActivity || now,
    confidence: isLiveDsh ? 'high' : 'medium',
  }

  const transcriptLen = Array.isArray(task.transcript) ? task.transcript.length : 0
  const lastStepIndex = typeof task.lastStepIndex === 'number' ? task.lastStepIndex : transcriptLen - 1
  const approvalCode = task.pendingApproval?.code || ''
  const sessionRev =
    task.sessionRev ||
    `${transcriptLen}:${lastStepIndex}:${task.status || 'idle'}:${task.turnState || ''}:${approvalCode}`

  task.harness = harness
  task.harnessLabel = harnessLabel
  task.controlMode = controlMode
  task.capabilities = capabilities
  task.stateMeta = stateMeta
  task.sessionRev = sessionRev
  return task
}

/**
 * Thin delegation router for multi-harness sessions and commands.
 * Preserves 100% of existing DSH and Antigravity IDE behavior while allowing
 * verified external adapters (e.g., Codex CLI) to be registered cleanly.
 */
export class HarnessRouter {
  constructor() {
    this.adapters = new Map()
    this.lastKnownGoodByAdapter = new Map()
    this.lastAdapterErrors = new Map()
  }

  registerAdapter(adapter) {
    if (!adapter || !adapter.id) return
    this.adapters.set(String(adapter.id), adapter)
  }

  getAdapter(harnessOrSessionId = '') {
    const raw = String(harnessOrSessionId || '')
    if (this.adapters.has(raw)) return this.adapters.get(raw)
    const prefixIdx = raw.indexOf(':')
    if (prefixIdx > 0) {
      const prefix = raw.slice(0, prefixIdx)
      if (this.adapters.has(prefix)) return this.adapters.get(prefix)
    }
    return null
  }

  async listExternalSessions(options = {}) {
    const all = []
    for (const adapter of this.adapters.values()) {
      if (typeof adapter.listSessions !== 'function') continue
      try {
        const list = await adapter.listSessions(options)
        const decorated = []
        if (Array.isArray(list)) {
          for (const item of list) {
            decorated.push(decorateTaskMetadata(item, { now: options.now }))
          }
        }
        this.lastKnownGoodByAdapter.set(adapter.id, decorated)
        this.lastAdapterErrors.delete(adapter.id)
        all.push(...decorated)
      } catch (err) {
        // Isolate adapter errors and preserve last-known-good sessions so UI never flickers on transient read errors
        const errMsg = err?.message || String(err)
        this.lastAdapterErrors.set(adapter.id, errMsg)
        const fallback = this.lastKnownGoodByAdapter.get(adapter.id) || []
        for (const item of fallback) {
          all.push({
            ...item,
            stateMeta: {
              ...(item.stateMeta || {}),
              lastScanError: errMsg,
            },
          })
        }
      }
    }
    return all
  }

  async getAdaptersHealth() {
    const list = []
    for (const adapter of this.adapters.values()) {
      try {
        const h = typeof adapter.detectHealth === 'function' ? await adapter.detectHealth() : { installed: true }
        list.push({
          id: adapter.id,
          label: adapter.label || adapter.id,
          icon: adapter.icon || '🔌',
          capabilities: typeof adapter.getCapabilities === 'function' ? adapter.getCapabilities() : {},
          ...h,
        })
      } catch (err) {
        list.push({
          id: adapter.id,
          label: adapter.label || adapter.id,
          installed: false,
          error: err?.message || String(err),
        })
      }
    }
    return list
  }
}
