// Client-side lossless state delta merger for `/api/events?delta=1`.
// Verifies monotonic `prevSeq -> stateSeq` continuity and reconstructs the
// exact `hubState` snapshot without full-payload network transfers.

export function applyStateDelta(prevState, delta) {
  if (!prevState || typeof prevState !== 'object' || !Array.isArray(prevState.hosts)) {
    return { ok: false, reason: 'missing_base_state' };
  }
  if (!delta || typeof delta !== 'object') {
    return { ok: false, reason: 'invalid_delta' };
  }

  const curSeq = Number(prevState.stateSeq) || 0;
  const prevSeq = Number(delta.prevSeq) || 0;
  const nextSeq = Number(delta.stateSeq) || 0;

  if (!curSeq || !nextSeq) {
    return { ok: false, reason: 'uninitialized_seq' };
  }
  if (curSeq === nextSeq) {
    return { ok: true, state: prevState, noop: true };
  }
  if (curSeq !== prevSeq) {
    return { ok: false, reason: 'seq_mismatch', curSeq, prevSeq, nextSeq };
  }

  const nextState = { ...prevState };
  if (delta.top && typeof delta.top === 'object') {
    Object.assign(nextState, delta.top);
  }
  if (Array.isArray(delta.topDeleted)) {
    for (const k of delta.topDeleted) {
      delete nextState[k];
    }
  }
  nextState.stateSeq = nextSeq;
  if (delta.now !== undefined) {
    nextState.now = delta.now;
  }

  const hasHostChanges =
    (Array.isArray(delta.removedHostIds) && delta.removedHostIds.length > 0) ||
    (Array.isArray(delta.hosts) && delta.hosts.length > 0) ||
    Array.isArray(delta.hostOrder);

  const metaOnly =
    !hasHostChanges &&
    !delta.top &&
    (!Array.isArray(delta.topDeleted) || delta.topDeleted.length === 0);

  if (!hasHostChanges) {
    return { ok: true, state: nextState, noop: false, metaOnly };
  }

  const removedHostSet = new Set(Array.isArray(delta.removedHostIds) ? delta.removedHostIds : []);
  const hostMap = new Map();
  const currentOrder = [];
  for (const h of prevState.hosts) {
    if (!h || !h.hostId || removedHostSet.has(h.hostId)) continue;
    hostMap.set(h.hostId, h);
    currentOrder.push(h.hostId);
  }

  if (Array.isArray(delta.hosts)) {
    for (const patch of delta.hosts) {
      if (!patch || !patch.hostId) continue;
      if (patch.fullHost) {
        if (!hostMap.has(patch.hostId)) {
          currentOrder.push(patch.hostId);
        }
        hostMap.set(patch.hostId, patch.fullHost);
        continue;
      }

      const prevHost = hostMap.get(patch.hostId);
      if (!prevHost) {
        return { ok: false, reason: 'missing_host_for_patch', hostId: patch.hostId };
      }

      const nextHost = { ...prevHost };
      if (patch.hostMeta && typeof patch.hostMeta === 'object') {
        Object.assign(nextHost, patch.hostMeta);
      }
      if (Array.isArray(patch.hostMetaDeleted)) {
        for (const k of patch.hostMetaDeleted) {
          delete nextHost[k];
        }
      }

      const hasBridgePatch =
        patch.bridgeMeta ||
        (Array.isArray(patch.bridgeMetaDeleted) && patch.bridgeMetaDeleted.length > 0) ||
        (Array.isArray(patch.removedTaskIds) && patch.removedTaskIds.length > 0) ||
        (Array.isArray(patch.upsertedTasks) && patch.upsertedTasks.length > 0) ||
        Array.isArray(patch.taskOrder);

      if (hasBridgePatch) {
        const prevBridge =
          prevHost.bridgeState && typeof prevHost.bridgeState === 'object'
            ? prevHost.bridgeState
            : { tasks: [], approvals: [], workspaces: [] };
        const nextBridge = { ...prevBridge };
        if (patch.bridgeMeta && typeof patch.bridgeMeta === 'object') {
          Object.assign(nextBridge, patch.bridgeMeta);
        }
        if (Array.isArray(patch.bridgeMetaDeleted)) {
          for (const k of patch.bridgeMetaDeleted) {
            delete nextBridge[k];
          }
        }

        const hasTaskPatch =
          (Array.isArray(patch.removedTaskIds) && patch.removedTaskIds.length > 0) ||
          (Array.isArray(patch.upsertedTasks) && patch.upsertedTasks.length > 0) ||
          Array.isArray(patch.taskOrder);

        if (hasTaskPatch) {
          const removedTaskSet = new Set(
            Array.isArray(patch.removedTaskIds) ? patch.removedTaskIds : []
          );
          const taskMap = new Map();
          const curTaskOrder = [];
          for (const t of Array.isArray(prevBridge.tasks) ? prevBridge.tasks : []) {
            if (!t || !t.id || removedTaskSet.has(t.id)) continue;
            taskMap.set(t.id, t);
            curTaskOrder.push(t.id);
          }
          if (Array.isArray(patch.upsertedTasks)) {
            for (const ut of patch.upsertedTasks) {
              if (!ut || !ut.id) continue;
              if (!taskMap.has(ut.id)) {
                curTaskOrder.push(ut.id);
              }
              taskMap.set(ut.id, ut);
            }
          }
          const finalTaskOrder = Array.isArray(patch.taskOrder) ? patch.taskOrder : curTaskOrder;
          const nextTasks = [];
          const includedIds = new Set();
          for (const tid of finalTaskOrder) {
            const taskObj = taskMap.get(tid);
            if (!taskObj) {
              return { ok: false, reason: 'missing_task_in_order', hostId: patch.hostId, taskId: tid };
            }
            nextTasks.push(taskObj);
            includedIds.add(tid);
          }
          for (const [tid, taskObj] of taskMap.entries()) {
            if (!includedIds.has(tid)) {
              nextTasks.push(taskObj);
            }
          }
          nextBridge.tasks = nextTasks;
        }
        nextHost.bridgeState = nextBridge;
      }

      hostMap.set(patch.hostId, nextHost);
    }
  }

  const finalHostOrder = Array.isArray(delta.hostOrder) ? delta.hostOrder : currentOrder;
  const nextHosts = [];
  const addedHosts = new Set();
  for (const hid of finalHostOrder) {
    const hObj = hostMap.get(hid);
    if (!hObj) {
      return { ok: false, reason: 'missing_host_in_order', hostId: hid };
    }
    nextHosts.push(hObj);
    addedHosts.add(hid);
  }
  for (const [hid, hObj] of hostMap.entries()) {
    if (!addedHosts.has(hid)) {
      nextHosts.push(hObj);
    }
  }
  nextState.hosts = nextHosts;

  return { ok: true, state: nextState, noop: false, metaOnly };
}
