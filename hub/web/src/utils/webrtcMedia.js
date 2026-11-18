const DEFAULT_ICE_SERVERS = [
  {
    urls: [
      'stun:stun.qq.com:3478',
      'stun:stun.miwifi.com:3478',
      'stun:stun.cloudflare.com:3478',
    ],
  },
];

const channelPool = new Map(); // hostId -> PoolEntry
const recentFailByHost = new Map(); // hostId -> timestamp

export function parseStreamUrlDescriptor(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const base =
      typeof location !== 'undefined' && location.origin
        ? location.origin
        : 'http://localhost';
    const u = new URL(rawUrl, base);
    const m = /^\/api\/hosts\/([^/]+)\/fs\/stream$/.exec(u.pathname);
    if (!m) return null;
    const hostId = decodeURIComponent(m[1]);
    return {
      hostId,
      path: u.searchParams.get('path') || '',
      cwd: u.searchParams.get('cwd') || '',
      agentId: u.searchParams.get('agentId') || '',
      thumb: u.searchParams.get('thumb') === '1',
      transcode: u.searchParams.get('transcode') === '1',
      fastPreview: u.searchParams.get('preview') === '1',
      download: u.searchParams.get('download') === '1',
      raw: u.searchParams.get('raw') === '1',
      mt: u.searchParams.get('mt') || '',
    };
  } catch {
    return null;
  }
}

export function isWebRtcDataChannelSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.RTCPeerConnection === 'function'
  );
}

function closePoolEntry(hostId, entry) {
  if (!entry || entry.closed) return;
  entry.closed = true;
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = null;
  }
  if (channelPool.get(hostId) === entry) {
    channelPool.delete(hostId);
  }
  for (const [, pending] of entry.pendingReqs.entries()) {
    pending.reject(new Error('WebRTC DataChannel closed'));
  }
  entry.pendingReqs.clear();
  try {
    entry.dc?.close?.();
  } catch {}
  try {
    entry.pc?.close?.();
  } catch {}
}

function touchPoolEntry(hostId, entry) {
  if (!entry || entry.closed) return;
  if (entry.idleTimer) clearTimeout(entry.idleTimer);
  entry.idleTimer = setTimeout(() => {
    if (entry.pendingReqs.size === 0) {
      closePoolEntry(hostId, entry);
    }
  }, 90_000);
}

async function getOrConnectWebRtcChannel(
  hostId,
  {
    cwd = '',
    agentId = '',
    mt = '',
    token = '',
    connectTimeoutMs = 1600,
  } = {}
) {
  if (!isWebRtcDataChannelSupported() || !hostId) return null;

  const existing = channelPool.get(hostId);
  if (existing && !existing.closed) {
    if (existing.dc && existing.dc.readyState === 'open') {
      touchPoolEntry(hostId, existing);
      return existing;
    }
    if (existing.connectPromise) {
      return existing.connectPromise;
    }
  }

  const lastFail = recentFailByHost.get(hostId) || 0;
  if (lastFail > 0 && Date.now() - lastFail < 15_000) {
    return null;
  }

  const entry = {
    hostId,
    pc: null,
    dc: null,
    closed: false,
    idleTimer: null,
    pendingReqs: new Map(),
    connectPromise: null,
  };
  channelPool.set(hostId, entry);

  entry.connectPromise = (async () => {
    const isLocalhost =
      typeof location !== 'undefined' &&
      (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
    const pc = new window.RTCPeerConnection({
      iceServers: isLocalhost ? [] : DEFAULT_ICE_SERVERS,
    });
    entry.pc = pc;

    const dc = pc.createDataChannel('dsh-media', { ordered: true });
    dc.binaryType = 'arraybuffer';
    entry.dc = dc;

    dc.onmessage = ev => {
      touchPoolEntry(hostId, entry);
      if (typeof ev.data === 'string') {
        let msg = null;
        try {
          msg = JSON.parse(ev.data);
        } catch {}
        if (!msg || !msg.reqId) return;
        const pending = entry.pendingReqs.get(msg.reqId);
        if (!pending) return;
        if (msg.type === 'meta') {
          pending.onMeta(msg);
        } else if (msg.type === 'eof') {
          pending.onEof(msg);
        } else if (msg.type === 'error') {
          pending.reject(new Error(msg.error || `P2P HTTP ${msg.status || 500}`));
        }
        return;
      }
      if (ev.data instanceof ArrayBuffer) {
        const u8 = new Uint8Array(ev.data);
        if (u8.byteLength < 3 || u8[0] !== 0x01) return;
        const idLen = u8[1];
        if (2 + idLen > u8.byteLength) return;
        let reqId = '';
        for (let i = 0; i < idLen; i += 1) {
          reqId += String.fromCharCode(u8[2 + i]);
        }
        const pending = entry.pendingReqs.get(reqId);
        if (pending) {
          pending.onChunk(u8.subarray(2 + idLen));
        }
      }
    };

    dc.onclose = () => closePoolEntry(hostId, entry);
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'closed' || st === 'disconnected') {
        closePoolEntry(hostId, entry);
      }
    };

    const dcOpenPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('P2P connect timeout'));
      }, connectTimeoutMs);
      dc.onopen = () => {
        clearTimeout(timer);
        resolve(true);
      };
      dc.onerror = () => {
        clearTimeout(timer);
        reject(new Error('P2P DataChannel error'));
      };
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const gatherWaitMs = isLocalhost ? 80 : 220;
      await new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve(true);
          return;
        }
        let sawCandidate = false;
        const timer = setTimeout(resolve, gatherWaitMs);
        pc.onicecandidate = ev => {
          if (!ev.candidate) {
            clearTimeout(timer);
            resolve(true);
            return;
          }
          if (!sawCandidate && String(ev.candidate.candidate || '').includes('typ srflx')) {
            sawCandidate = true;
            clearTimeout(timer);
            setTimeout(resolve, 40);
          }
        };
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timer);
            resolve(true);
          }
        };
      });

      const qp = new URLSearchParams();
      if (mt) qp.set('mt', mt);
      const offerUrl = `/api/hosts/${encodeURIComponent(hostId)}/fs/rtc-offer${qp.toString() ? `?${qp.toString()}` : ''}`;
      const headers = {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      };
      const sigCtrl = typeof AbortController === 'function' ? new AbortController() : null;
      const sigTimer = sigCtrl ? setTimeout(() => sigCtrl.abort(), Math.max(1200, connectTimeoutMs)) : null;
      let sigData = null;
      try {
        const sigRes = await fetch(offerUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sdp: pc.localDescription?.sdp || offer.sdp,
            cwd,
            agentId,
          }),
          ...(sigCtrl ? { signal: sigCtrl.signal } : {}),
        });
        sigData = await sigRes.json().catch(() => null);
      } finally {
        if (sigTimer) clearTimeout(sigTimer);
      }

      if (!sigData?.ok || !sigData?.sdp) {
        throw new Error(sigData?.error || 'Signaling rejected');
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: sigData.sdp });
      await dcOpenPromise;
      recentFailByHost.delete(hostId);
      touchPoolEntry(hostId, entry);
      return entry;
    } catch {
      recentFailByHost.set(hostId, Date.now());
      closePoolEntry(hostId, entry);
      return null;
    } finally {
      entry.connectPromise = null;
    }
  })();

  return entry.connectPromise;
}

export async function fetchMediaViaWebRtc(
  rawStreamUrl,
  {
    token = '',
    mediaTicket = '',
    download = undefined,
    fastPreview = undefined,
    raw = undefined,
    transcode = undefined,
    maxBytes = 0,
    connectTimeoutMs = 1600,
    stallTimeoutMs = 12_000,
    onProgress = null,
    signal = null,
  } = {}
) {
  const desc = parseStreamUrlDescriptor(rawStreamUrl);
  if (!desc || !desc.path) return null;

  const entry = await getOrConnectWebRtcChannel(desc.hostId, {
    cwd: desc.cwd,
    agentId: desc.agentId,
    mt: mediaTicket || desc.mt,
    token,
    connectTimeoutMs,
  });
  if (!entry || !entry.dc || entry.dc.readyState !== 'open') {
    return null;
  }
  if (signal?.aborted) return null;

  const reqId = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return new Promise(resolve => {
    const chunks = [];
    let received = 0;
    let totalBytes = 0;
    let metaInfo = null;
    let settled = false;
    let stallTimer = null;

    const resetStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        finish(null, true);
      }, stallTimeoutMs);
    };

    const onAbort = () => finish(null, true);

    const finish = (result, sendCancel = false) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearTimeout(stallTimer);
      entry.pendingReqs.delete(reqId);
      if (signal && typeof signal.removeEventListener === 'function') {
        try {
          signal.removeEventListener('abort', onAbort);
        } catch {}
      }
      if (sendCancel && entry.dc?.readyState === 'open') {
        try {
          entry.dc.send(JSON.stringify({ op: 'cancel', reqId }));
        } catch {}
      }
      resolve(result);
    };

    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    entry.pendingReqs.set(reqId, {
      onMeta(meta) {
        metaInfo = meta;
        totalBytes = Number(meta.byteLength || 0);
        if (maxBytes > 0 && totalBytes > maxBytes) {
          finish(null, true);
          return;
        }
        resetStall();
        onProgress?.({ received, totalBytes });
      },
      onChunk(slice) {
        resetStall();
        const copy = new Uint8Array(slice.byteLength);
        copy.set(slice);
        chunks.push(copy);
        received += copy.byteLength;
        onProgress?.({ received, totalBytes });
      },
      onEof(eofMsg) {
        const expected = Number(eofMsg?.byteLength ?? totalBytes);
        if (expected > 0 && received !== expected) {
          finish(null, false);
          return;
        }
        const mime = metaInfo?.mime || 'video/mp4';
        const blob = new Blob(chunks, { type: mime });
        finish({
          ok: true,
          blob,
          byteLength: received,
          mime,
          name: metaInfo?.name || '',
          variant: metaInfo?.variant || 'orig',
        });
      },
      reject() {
        finish(null, false);
      },
    });

    resetStall();
    try {
      entry.dc.send(
        JSON.stringify({
          op: 'stream',
          reqId,
          path: desc.path,
          cwd: desc.cwd,
          agentId: desc.agentId,
          thumb: desc.thumb,
          transcode: transcode !== undefined ? Boolean(transcode) : desc.transcode,
          fastPreview: fastPreview !== undefined ? Boolean(fastPreview) : desc.fastPreview,
          download: download !== undefined ? Boolean(download) : desc.download,
          raw: raw !== undefined ? Boolean(raw) : desc.raw,
        })
      );
    } catch {
      finish(null, false);
    }
  });
}
