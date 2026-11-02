import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HubCore } from './hub-core.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_HTML_PATH = join(__dirname, 'public', 'index.html')
const MAX_BODY_BYTES = 50 * 1024 * 1024 // 50 MiB for snapshot uploads

export function createHubServer({
  hub = new HubCore({ stateFile: process.env.HUB_STATE_FILE || '' }),
  token = process.env.HUB_TOKEN || process.env.FEISHU_HUB_TOKEN || '',
  logger = console,
} = {}) {
  const expectedToken = String(token ?? '').trim()

  function checkAuth(headers = {}, urlObj) {
    if (!expectedToken) return true
    const authHeader = String(headers.authorization ?? headers.Authorization ?? '').trim()
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    const headerToken = String(headers['x-hub-token'] ?? headers['X-Hub-Token'] ?? '').trim()
    const queryToken = String(urlObj.searchParams.get('token') ?? '').trim()
    const candidate = bearer || headerToken || queryToken
    if (!candidate) return false
    const a = Buffer.from(candidate)
    const b = Buffer.from(expectedToken)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }

  async function dispatchRequest({ method = 'GET', url = '/', headers = {}, body = {} }) {
    const urlObj = new URL(url || '/', `http://${headers.host || 'localhost'}`)
    const pathname = urlObj.pathname

    if (method === 'OPTIONS') {
      return { status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }
    }

    if (method === 'GET' && (pathname === '/healthz' || pathname === '/ready')) {
      return {
        status: 200,
        json: {
          status: 'ok',
          activeHostId: hub.activeHostId,
          hostsCount: hub.hosts.size,
          snapshotsCount: hub.snapshots.size,
          sharesCount: hub.shares.size,
        },
      }
    }

    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = await readFile(INDEX_HTML_PATH, 'utf8')
      return {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        body: html,
      }
    }

    // Standalone E2EE Encrypted Conversation Share & Replay Page (replaces go.dshtui.com/c/:id)
    const sharePageMatch = /^\/(?:share|c)\/([^/]+)$/.exec(pathname)
    if (method === 'GET' && sharePageMatch) {
      const shareId = decodeURIComponent(sharePageMatch[1])
      const share = hub.getShare(shareId)
      if (!share) {
        return {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: '<h1>404 - 加密分享不存在或已删除</h1>',
        }
      }
      return {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        body: renderShareReplayHtml(share),
      }
    }

    // Public encrypted blob endpoint for the browser E2EE replay page (contains only ciphertext + IV, never the key)
    const publicShareBlobMatch = /^\/api\/shares\/([^/]+)\/public$/.exec(pathname)
    if (method === 'GET' && publicShareBlobMatch) {
      const shareId = decodeURIComponent(publicShareBlobMatch[1])
      const share = hub.getShare(shareId)
      if (!share) return { status: 404, json: { ok: false, error: 'Share not found' } }
      return {
        status: 200,
        json: {
          ok: true,
          share: {
            id: share.id,
            title: share.title,
            hostName: share.hostName,
            messageCount: share.messageCount,
            createdAt: share.createdAt,
            ivBase64: share.ivBase64,
            ciphertextBase64: share.ciphertextBase64,
          },
        },
      }
    }

    // Self-hosted Plugin Market Catalog & Telemetry (replaces go.dshtui.com/market/index.json & /api/usage/v1)
    if (method === 'GET' && pathname === '/market/index.json') {
      return { status: 200, json: hub.getMarketCatalog() }
    }
    if (method === 'POST' && pathname === '/api/usage/v1') {
      return { status: 200, json: { ok: true, selfHosted: true } }
    }

    // One-Time Pairing Code Exchange (allows mobile QR scan / 6-digit code login without typing HUB_TOKEN)
    if (method === 'POST' && pathname === '/api/pairing/exchange') {
      const outcome = hub.exchangePairingCode(body.code)
      if (!outcome.ok) return { status: 401, json: outcome }
      return {
        status: 200,
        json: {
          ...outcome,
          token: expectedToken,
        },
      }
    }

    if (pathname === '/api/auth/verify' && method === 'POST') {
      const ok = checkAuth(headers, urlObj)
      return {
        status: ok ? 200 : 401,
        json: { ok, authRequired: Boolean(expectedToken) },
      }
    }

    if (pathname.startsWith('/api/')) {
      if (!checkAuth(headers, urlObj)) {
        return {
          status: 401,
          json: {
            ok: false,
            error: 'Unauthorized: valid HUB_TOKEN required',
            authRequired: true,
          },
        }
      }

      if (method === 'GET' && pathname === '/api/state') {
        return {
          status: 200,
          json: {
            ok: true,
            authRequired: Boolean(expectedToken),
            ...hub.getFullState(),
          },
        }
      }

      if (method === 'GET' && pathname === '/api/stats') {
        return {
          status: 200,
          json: {
            ok: true,
            stats: hub.getUsageStats(),
          },
        }
      }

      if (method === 'POST' && pathname === '/api/heartbeat') {
        const outcome = hub.handleHeartbeat(body)
        const status = outcome.ok ? 200 : outcome.code === 'DEVICE_REVOKED' || outcome.code === 'PEER_IDENTITY_MISMATCH' ? 403 : 400
        return { status, json: outcome }
      }

      const activateMatch = /^\/api\/hosts\/([^/]+)\/activate$/.exec(pathname)
      if (method === 'POST' && activateMatch) {
        const hostId = decodeURIComponent(activateMatch[1])
        const outcome = hub.activateHost(hostId)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const hostTrustMatch = /^\/api\/hosts\/([^/]+)\/trust$/.exec(pathname)
      if (method === 'POST' && hostTrustMatch) {
        const hostId = decodeURIComponent(hostTrustMatch[1])
        const outcome = hub.manageHostTrust(hostId, body)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const hostCommandMatch = /^\/api\/hosts\/([^/]+)\/command$/.exec(pathname)
      if (method === 'POST' && hostCommandMatch) {
        const hostId = decodeURIComponent(hostCommandMatch[1])
        const outcome = hub.queueCommand(hostId, body)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const cmdResultMatch = /^\/api\/commands\/([^/]+)$/.exec(pathname)
      if (method === 'GET' && cmdResultMatch) {
        const cmdId = decodeURIComponent(cmdResultMatch[1])
        const result = hub.getCommandResult(cmdId)
        return { status: 200, json: { ok: true, ready: Boolean(result), result } }
      }

      const hostDeleteMatch = /^\/api\/hosts\/([^/]+)$/.exec(pathname)
      if (method === 'DELETE' && hostDeleteMatch) {
        const hostId = decodeURIComponent(hostDeleteMatch[1])
        const outcome = hub.removeHost(hostId)
        return { status: 200, json: outcome }
      }

      if (method === 'POST' && pathname === '/api/pairing/create') {
        const pairing = hub.createPairingCode(body)
        return { status: 200, json: { ok: true, pairing } }
      }

      // Self-hosted WebRTC Signaling & TURN Credentials (replaces dsh.r2049.cn signaling & /api/v1/turn/credentials)
      if (method === 'POST' && pathname === '/api/v1/signaling') {
        const outcome = hub.postSignalingMessage(body)
        return { status: outcome.ok ? 200 : 400, json: outcome }
      }

      const sigPullMatch = /^\/api\/v1\/signaling\/([^/]+)$/.exec(pathname)
      if (method === 'GET' && sigPullMatch) {
        const targetId = decodeURIComponent(sigPullMatch[1])
        return { status: 200, json: hub.pullSignalingMessages(targetId) }
      }

      if ((method === 'GET' || method === 'POST') && pathname === '/api/v1/turn/credentials') {
        return { status: 200, json: hub.getTurnCredentials(body) }
      }

      // Self-hosted E2EE Conversation Share API (replaces go.dshtui.com/api/shares)
      if (method === 'POST' && pathname === '/api/shares') {
        const share = hub.createShare(body)
        return { status: 200, json: { ok: true, share } }
      }

      if (method === 'GET' && pathname === '/api/shares') {
        return { status: 200, json: { ok: true, shares: hub.listShares() } }
      }

      const shareItemMatch = /^\/api\/shares\/([^/]+)$/.exec(pathname)
      if (method === 'GET' && shareItemMatch) {
        const shareId = decodeURIComponent(shareItemMatch[1])
        const share = hub.getShare(shareId)
        if (!share) return { status: 404, json: { ok: false, error: 'Share not found' } }
        return { status: 200, json: { ok: true, share } }
      }
      if (method === 'DELETE' && shareItemMatch) {
        const shareId = decodeURIComponent(shareItemMatch[1])
        return { status: 200, json: hub.deleteShare(shareId) }
      }

      if (method === 'POST' && pathname === '/api/migrate') {
        const outcome = hub.startMigration(body)
        return { status: outcome.ok ? 200 : 400, json: outcome }
      }

      if (method === 'POST' && pathname === '/api/snapshots') {
        const snapshot = hub.addSnapshot(body)
        return { status: 200, json: { ok: true, snapshot } }
      }

      const snapDownloadMatch = /^\/api\/snapshots\/([^/]+)\/download$/.exec(pathname)
      if (method === 'GET' && snapDownloadMatch) {
        const snapshotId = decodeURIComponent(snapDownloadMatch[1])
        const snap = hub.getSnapshot(snapshotId)
        if (!snap) return { status: 404, json: { ok: false, error: 'Snapshot not found' } }
        const buf = Buffer.from(snap.dataBase64, 'base64')
        return {
          status: 200,
          headers: {
            'content-type': 'application/gzip',
            'content-length': String(buf.length),
            'content-disposition': `attachment; filename="${snapshotId}.dshsnap.gz"`,
          },
          buffer: buf,
        }
      }

      const snapDeleteMatch = /^\/api\/snapshots\/([^/]+)$/.exec(pathname)
      if (method === 'DELETE' && snapDeleteMatch) {
        const snapshotId = decodeURIComponent(snapDeleteMatch[1])
        return { status: 200, json: hub.deleteSnapshot(snapshotId) }
      }

      return { status: 404, json: { ok: false, error: 'Not found' } }
    }

    return { status: 404, json: { ok: false, error: 'Not found' } }
  }

  const server = createServer(async (req, res) => {
    try {
      const body = req.method === 'POST' ? await readJsonBody(req) : {}
      const result = await dispatchRequest({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      })
      if (result.json !== undefined) {
        sendJson(res, result.status, result.json)
      } else if (result.buffer !== undefined) {
        res.writeHead(result.status, result.headers || {})
        res.end(result.buffer)
      } else {
        res.writeHead(result.status, result.headers || {})
        res.end(result.body ?? '')
      }
    } catch (error) {
      logger?.warn?.(`dsh-hub error: ${error?.message ?? error}`)
      sendJson(res, 500, { ok: false, error: error?.message ?? 'Internal server error' })
    }
  })

  function fetchAdapter(input, init = {}) {
    return (async () => {
      const urlStr = typeof input === 'string' ? input : input.url
      const method = (init.method || 'GET').toUpperCase()
      const headers = init.headers || {}
      let parsedBody = {}
      if (typeof init.body === 'string' && init.body.length > 0) {
        parsedBody = JSON.parse(init.body)
      } else if (init.body && typeof init.body === 'object') {
        parsedBody = init.body
      }
      const out = await dispatchRequest({ method, url: urlStr, headers, body: parsedBody })
      return {
        status: out.status,
        ok: out.status >= 200 && out.status < 300,
        async json() {
          if (out.json !== undefined) return out.json
          return JSON.parse(out.body || '{}')
        },
        async text() {
          if (out.body !== undefined) return String(out.body)
          if (out.json !== undefined) return JSON.stringify(out.json)
          return ''
        },
        async arrayBuffer() {
          const buf = out.buffer ?? Buffer.from(out.body ?? '')
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        },
      }
    })()
  }

  return { server, hub, dispatchRequest, fetchAdapter }
}

function renderShareReplayHtml(share) {
  const safeMeta = JSON.stringify({
    id: share.id,
    title: share.title,
    hostName: share.hostName,
    messageCount: share.messageCount,
    createdAt: share.createdAt,
    ivBase64: share.ivBase64,
    ciphertextBase64: share.ciphertextBase64,
  }).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🔒 E2EE 加密会话回放 · ${String(share.title || '').replace(/[<>&"]/g, '')}</title>
  <style>
    :root { --bg:#0b0f19; --card:#131b2e; --border:#23304f; --text:#f1f5f9; --muted:#94a3b8; --primary:#3b82f6; --green:#10b981; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px; }
    .wrap { max-width:900px; margin:0 auto; }
    .header { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px 22px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .badge { display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:4px 10px; border-radius:999px; background:rgba(16,185,129,.15); color:#34d399; border:1px solid rgba(16,185,129,.3); }
    .btn { background:var(--primary); color:#fff; border:none; border-radius:8px; padding:8px 14px; cursor:pointer; font-weight:600; font-size:13px; }
    .msg { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-bottom:12px; }
    .msg.user { border-left:4px solid var(--primary); }
    .msg.assistant { border-left:4px solid var(--green); }
    .role { font-size:12px; font-weight:700; color:var(--muted); margin-bottom:6px; display:flex; justify-content:space-between; }
    pre { white-space:pre-wrap; word-break:break-word; margin:0; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; line-height:1.55; }
    .thinking { margin-top:8px; padding:8px 10px; background:#090d16; border-radius:8px; color:#94a3b8; font-size:12px; }
    .tools { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
    .tool-pill { font-size:11px; padding:2px 8px; border-radius:6px; background:rgba(59,130,246,.15); color:#93c5fd; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="badge">🔒 AES-256-GCM 端到端加密回放（自托管，零第三方服务器）</div>
        <h2 id="title" style="margin:8px 0 4px 0; font-size:18px;">正在浏览器本地解密...</h2>
        <div id="meta" style="font-size:12px; color:var(--muted);"></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn" onclick="startReplay()">▶ 动画回放</button>
        <button class="btn" style="background:#1e293b;" onclick="renderAll()">展开全部</button>
      </div>
    </div>
    <div id="stream"></div>
  </div>
  <script>
    const SHARE = ${safeMeta};
    let decryptedTranscript = [];
    let replayTimer = null;

    function b64ToBytes(b64) {
      const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
      const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
      const bin = atob(normalized + pad);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }

    function esc(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    async function decryptShare() {
      const hash = location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const keyStr = params.get('k');
      if (!keyStr) {
        document.getElementById('title').textContent = '缺少解密密钥 (#k=...)';
        document.getElementById('stream').innerHTML = '<div class="msg">URL 锚点中未包含 #k= 密钥，服务端不保存密钥，无法解密。</div>';
        return;
      }
      try {
        const keyBytes = b64ToBytes(keyStr);
        const ivBytes = b64ToBytes(SHARE.ivBase64);
        const cipherBytes = b64ToBytes(SHARE.ciphertextBase64);
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
        const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, cipherBytes);
        const data = JSON.parse(new TextDecoder().decode(plainBuf));
        document.getElementById('title').textContent = data.title || SHARE.title;
        document.getElementById('meta').textContent = '来源主机: ' + (data.hostName || SHARE.hostName) + ' · 工作区: ' + (data.cwd || '-') + ' · 消息数: ' + (data.transcript?.length || 0);
        decryptedTranscript = data.transcript || [];
        renderAll();
      } catch (err) {
        document.getElementById('title').textContent = '解密失败：密钥不匹配或数据已损坏';
        document.getElementById('stream').innerHTML = '<div class="msg">' + esc(err.message) + '</div>';
      }
    }

    function renderStep(m, idx) {
      const roleLabel = m.role === 'user' ? '🧑 用户指令' : '🤖 DeepSeek Harness';
      const tools = (m.tools || []).map(t => '<span class="tool-pill">🔧 ' + esc(t.name) + '</span>').join('');
      const thinking = m.thinking ? '<div class="thinking">💭 思考过程：' + esc(m.thinking) + '</div>' : '';
      return '<div class="msg ' + esc(m.role) + '">' +
        '<div class="role"><span>' + roleLabel + '</span><span>#' + (idx + 1) + '</span></div>' +
        '<pre>' + esc(m.text || '') + '</pre>' +
        thinking +
        (tools ? '<div class="tools">' + tools + '</div>' : '') +
      '</div>';
    }

    function renderAll() {
      if (replayTimer) { clearInterval(replayTimer); replayTimer = null; }
      document.getElementById('stream').innerHTML = decryptedTranscript.map((m, i) => renderStep(m, i)).join('');
    }

    function startReplay() {
      if (replayTimer) { clearInterval(replayTimer); replayTimer = null; }
      const box = document.getElementById('stream');
      box.innerHTML = '';
      let idx = 0;
      replayTimer = setInterval(() => {
        if (idx >= decryptedTranscript.length) {
          clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        box.insertAdjacentHTML('beforeend', renderStep(decryptedTranscript[idx], idx));
        idx++;
      }, 450);
    }

    decryptShare();
  </script>
</body>
</html>`
}

function sendJson(res, status, data) {
  const payload = JSON.stringify(data)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  })
  res.end(payload)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let bytes = 0
    req.on('data', chunk => {
      bytes += chunk.length
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('Request body exceeds limit'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) return resolve({})
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(text))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

// Allow running directly (`node hub/server.js`) for Google Cloud Run / Docker / local usage
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const port = Number(process.env.PORT || process.env.HUB_PORT || 8080)
  const host = process.env.HOST || '0.0.0.0'
  const hub = new HubCore({ stateFile: process.env.HUB_STATE_FILE || '/tmp/dsh-hub-state.json' })
  await hub.init()
  const { server } = createHubServer({ hub })
  server.listen(port, host, () => {
    console.log(`DSH Remote Control Hub listening on http://${host}:${port}`)
  })
}
