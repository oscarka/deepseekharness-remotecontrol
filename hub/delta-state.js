// Incremental SSE state digest & diff engine for DSH Remote Control Hub.
// Computes compact JSON deltas (`event: state_delta`) so multi-host heartbeats
// only transmit changed host metadata and changed session tasks (~1-3 KB gzipped)
// instead of re-broadcasting the entire multi-host state (~360+ KB gzipped).

const OMITTED_TOP_KEYS = new Set(['hosts', 'now', 'stateSeq'])

function captureObjectKeyStrings(obj, omitKeys = null) {
  const map = new Map()
  if (!obj || typeof obj !== 'object') return map
  for (const [k, v] of Object.entries(obj)) {
    if (omitKeys && omitKeys.has(k)) continue
    if (v === undefined) continue
    map.set(k, JSON.stringify(v))
  }
  return map
}

function diffObjectAgainstDigest(prevMap, nextObj, omitKeys = null) {
  const changed = {}
  const deleted = []
  let hasChanged = false
  const seen = new Set()

  if (nextObj && typeof nextObj === 'object') {
    for (const [k, v] of Object.entries(nextObj)) {
      if (omitKeys && omitKeys.has(k)) continue
      seen.add(k)
      if (v === undefined) {
        if (prevMap.has(k)) {
          deleted.push(k)
          hasChanged = true
        }
        continue
      }
      const nextStr = JSON.stringify(v)
      if (prevMap.get(k) !== nextStr) {
        changed[k] = v
        hasChanged = true
      }
    }
  }

  for (const prevKey of prevMap.keys()) {
    if (!seen.has(prevKey)) {
      deleted.push(prevKey)
      hasChanged = true
    }
  }

  return { hasChanged, changed, deleted }
}

function captureHostDigest(host) {
  const { bridgeState, ...hostMeta } = host || {}
  const { tasks = [], ...bridgeMeta } =
    bridgeState && typeof bridgeState === 'object' ? bridgeState : {}
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const taskOrder = []
  const taskStrings = new Map()
  for (const t of safeTasks) {
    if (!t || !t.id) continue
    taskOrder.push(t.id)
    taskStrings.set(t.id, JSON.stringify(t))
  }
  return {
    hasBridgeState: Boolean(bridgeState && typeof bridgeState === 'object'),
    hostMetaStrings: captureObjectKeyStrings(hostMeta),
    bridgeMetaStrings: captureObjectKeyStrings(bridgeMeta),
    taskOrder,
    taskOrderJson: JSON.stringify(taskOrder),
    taskStrings,
  }
}

export function captureStateDigest(fullState) {
  const state = fullState && typeof fullState === 'object' ? fullState : {}
  const rawHosts = Array.isArray(state.hosts) ? state.hosts : []
  const hostOrder = []
  const hosts = new Map()
  for (const h of rawHosts) {
    if (!h || !h.hostId) continue
    hostOrder.push(h.hostId)
    hosts.set(h.hostId, captureHostDigest(h))
  }
  return {
    stateSeq: Number(state.stateSeq) || 0,
    topStrings: captureObjectKeyStrings(state, OMITTED_TOP_KEYS),
    hostOrder,
    hostOrderJson: JSON.stringify(hostOrder),
    hosts,
  }
}

export function buildStateDelta(prevDigest, nextState) {
  const nextDigest = captureStateDigest(nextState)
  if (!prevDigest) {
    return {
      hasChanges: true,
      fullResetRequired: true,
      delta: null,
      nextDigest,
    }
  }

  const prevSeq = Number(prevDigest.stateSeq) || 0
  const stateSeq = nextDigest.stateSeq
  const delta = {
    prevSeq,
    stateSeq,
    now: Number(nextState?.now) || Date.now(),
  }

  let hasStructuralChanges = false

  const topDiff = diffObjectAgainstDigest(prevDigest.topStrings, nextState, OMITTED_TOP_KEYS)
  if (topDiff.hasChanged) {
    if (Object.keys(topDiff.changed).length > 0) {
      delta.top = topDiff.changed
    }
    if (topDiff.deleted.length > 0) {
      delta.topDeleted = topDiff.deleted
    }
    hasStructuralChanges = true
  }

  const nextHosts = Array.isArray(nextState?.hosts) ? nextState.hosts : []
  const nextHostIds = new Set(nextDigest.hostOrder)
  const removedHostIds = prevDigest.hostOrder.filter(id => !nextHostIds.has(id))
  if (removedHostIds.length > 0) {
    delta.removedHostIds = removedHostIds
    hasStructuralChanges = true
  }
  if (prevDigest.hostOrderJson !== nextDigest.hostOrderJson) {
    delta.hostOrder = nextDigest.hostOrder
    hasStructuralChanges = true
  }

  const hostPatches = []
  for (const host of nextHosts) {
    if (!host || !host.hostId) continue
    const prevHost = prevDigest.hosts.get(host.hostId)
    if (!prevHost) {
      hostPatches.push({ hostId: host.hostId, fullHost: host })
      hasStructuralChanges = true
      continue
    }

    const { bridgeState, ...hostMeta } = host
    const hasBridge = Boolean(bridgeState && typeof bridgeState === 'object')
    if (!hasBridge || !prevHost.hasBridgeState) {
      if (hasBridge !== prevHost.hasBridgeState) {
        hostPatches.push({ hostId: host.hostId, fullHost: host })
        hasStructuralChanges = true
        continue
      }
    }

    const hostMetaDiff = diffObjectAgainstDigest(prevHost.hostMetaStrings, hostMeta)
    const { tasks = [], ...bridgeMeta } = hasBridge ? bridgeState : {}
    const bridgeMetaDiff = diffObjectAgainstDigest(prevHost.bridgeMetaStrings, bridgeMeta)

    const safeTasks = Array.isArray(tasks) ? tasks : []
    const nextHostDigest = nextDigest.hosts.get(host.hostId)
    const nextTaskIds = new Set(nextHostDigest.taskOrder)
    const removedTaskIds = prevHost.taskOrder.filter(id => !nextTaskIds.has(id))
    const taskOrderChanged = prevHost.taskOrderJson !== nextHostDigest.taskOrderJson

    const upsertedTasks = []
    for (const t of safeTasks) {
      if (!t || !t.id) continue
      const nextTaskStr = nextHostDigest.taskStrings.get(t.id)
      if (prevHost.taskStrings.get(t.id) !== nextTaskStr) {
        upsertedTasks.push(t)
      }
    }

    if (
      hostMetaDiff.hasChanged ||
      bridgeMetaDiff.hasChanged ||
      removedTaskIds.length > 0 ||
      taskOrderChanged ||
      upsertedTasks.length > 0
    ) {
      const patch = { hostId: host.hostId }
      if (Object.keys(hostMetaDiff.changed).length > 0) {
        patch.hostMeta = hostMetaDiff.changed
      }
      if (hostMetaDiff.deleted.length > 0) {
        patch.hostMetaDeleted = hostMetaDiff.deleted
      }
      if (Object.keys(bridgeMetaDiff.changed).length > 0) {
        patch.bridgeMeta = bridgeMetaDiff.changed
      }
      if (bridgeMetaDiff.deleted.length > 0) {
        patch.bridgeMetaDeleted = bridgeMetaDiff.deleted
      }
      if (removedTaskIds.length > 0) {
        patch.removedTaskIds = removedTaskIds
      }
      if (upsertedTasks.length > 0) {
        patch.upsertedTasks = upsertedTasks
      }
      if (taskOrderChanged) {
        patch.taskOrder = nextHostDigest.taskOrder
      }
      hostPatches.push(patch)
      hasStructuralChanges = true
    }
  }

  if (hostPatches.length > 0) {
    delta.hosts = hostPatches
  }

  const seqAdvanced = stateSeq !== prevSeq
  return {
    hasChanges: hasStructuralChanges || seqAdvanced,
    hasStructuralChanges,
    delta,
    nextDigest,
  }
}
