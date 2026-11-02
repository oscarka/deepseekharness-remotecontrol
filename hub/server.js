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

      if (method === 'POST' && pathname === '/api/heartbeat') {
        const outcome = hub.handleHeartbeat(body)
        return { status: 200, json: outcome }
      }

      const activateMatch = /^\/api\/hosts\/([^/]+)\/activate$/.exec(pathname)
      if (method === 'POST' && activateMatch) {
        const hostId = decodeURIComponent(activateMatch[1])
        const outcome = hub.activateHost(hostId)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const hostCommandMatch = /^\/api\/hosts\/([^/]+)\/command$/.exec(pathname)
      if (method === 'POST' && hostCommandMatch) {
        const hostId = decodeURIComponent(hostCommandMatch[1])
        const outcome = hub.queueCommand(hostId, body)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const hostDeleteMatch = /^\/api\/hosts\/([^/]+)$/.exec(pathname)
      if (method === 'DELETE' && hostDeleteMatch) {
        const hostId = decodeURIComponent(hostDeleteMatch[1])
        const outcome = hub.removeHost(hostId)
        return { status: 200, json: outcome }
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
