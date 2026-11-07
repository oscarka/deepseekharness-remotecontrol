import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { gzip } from 'node:zlib'
import { HubCore } from './hub-core.js'

const gzipAsync = promisify(gzip)

const __dirname = dirname(fileURLToPath(import.meta.url))
const INDEX_HTML_PATH = join(__dirname, 'public', 'index.html')
const PACKAGE_JSON_PATH = join(__dirname, '..', 'package.json')
const CONNECT_SCRIPT_PATH = join(__dirname, '..', 'connect-host.sh')
const MAX_BODY_BYTES = 50 * 1024 * 1024 // 50 MiB for snapshot uploads

export function resolveClientIp(
  headers = {},
  remoteAddress = '',
  {
    trustProxy = process.env.TRUST_PROXY === '1' ||
      process.env.TRUST_PROXY === 'true' ||
      Boolean(process.env.K_SERVICE) ||
      Boolean(process.env.RAILWAY_ENVIRONMENT),
  } = {},
) {
  const cleanSocket = String(remoteAddress || '')
    .trim()
    .replace(/^::ffff:/i, '')
  if (!trustProxy) {
    return cleanSocket || 'socket-local'
  }
  const xffRaw = String(headers['x-forwarded-for'] ?? headers['X-Forwarded-For'] ?? '').trim()
  if (xffRaw) {
    const hops = xffRaw
      .split(',')
      .map(s => s.trim().replace(/^::ffff:/i, ''))
      .filter(Boolean)
    // Behind a trusted reverse proxy (Cloud Run / Railway / Nginx), the proxy appends the real client IP at the rightmost hop.
    if (hops.length > 0) {
      return hops[hops.length - 1]
    }
  }
  const realIp = String(headers['x-real-ip'] ?? headers['X-Real-IP'] ?? '')
    .trim()
    .replace(/^::ffff:/i, '')
  return realIp || cleanSocket || 'socket-local'
}

export function validateHubStartupToken(token, { allowInsecureNoToken = false } = {}) {
  const clean = String(token ?? '').trim()
  if (!clean && !allowInsecureNoToken) {
    return {
      ok: false,
      error:
        '❌ 拒绝无密码启动：未设置 HUB_TOKEN 环境变量。\n' +
        '   为了防止控制台在公网裸奔，启动时必须指定管理员密码，例如：\n' +
        '   HUB_TOKEN="$(openssl rand -hex 16)" node hub/server.js\n' +
        '   docker run -d -p 8080:8080 -v dsh-data:/data -e HUB_TOKEN="你的密码" ghcr.io/oscarka/deepseekharness-remotecontrol:latest',
    }
  }
  return { ok: true, token: clean }
}

export function formatStartupBanner({
  host = '0.0.0.0',
  port = 8080,
  publicUrl = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '',
  token = '',
  stateFile = '/data/dsh-hub-state.json',
} = {}) {
  const displayHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host
  const normalizedPublic = publicUrl
    ? publicUrl.startsWith('http')
      ? publicUrl
      : `https://${publicUrl}`
    : `http://${displayHost}:${port}`
  return [
    '============================================================',
    '🚀 DSH Remote Control 控制台已启动',
    `🌐 访问网址: ${normalizedPublic}`,
    `🔑 管理密码: ${token || '(未设置)'}`,
    `💾 数据存储: ${stateFile}`,
    '------------------------------------------------------------',
    '👉 下一步：在电脑浏览器打开上方网址，输入密码登录，',
    '   复制页面上的「添加电脑」一行命令到终端执行即可接入。',
    '============================================================',
  ].join('\n')
}

function resolveBuildInfo(startedAt = Date.now()) {
  let version = '0.2.0'
  let uiBuild = 'dev'
  try {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'))
    if (pkg?.version) version = String(pkg.version)
  } catch {
    // ignore missing package.json
  }
  try {
    const html = readFileSync(INDEX_HTML_PATH, 'utf8')
    const m = /assets\/index-([A-Za-z0-9_-]+)\.js/.exec(html)
    if (m?.[1]) uiBuild = m[1]
  } catch {
    // ignore missing index.html
  }
  return { version, uiBuild, startedAt }
}

export function createHubServer({
  hub = new HubCore({ stateFile: process.env.HUB_STATE_FILE || '' }),
  token = process.env.HUB_TOKEN || process.env.FEISHU_HUB_TOKEN || '',
  requireToken = false,
  trustProxy,
  logger = console,
} = {}) {
  let expectedToken = String(token ?? '').trim()
  if (requireToken) {
    const check = validateHubStartupToken(expectedToken)
    if (!check.ok) {
      throw new Error(check.error)
    }
  }
  const buildInfo = resolveBuildInfo(hub.now ? hub.now() : Date.now())
  hub.buildInfo = buildInfo

  function extractCandidateToken(headers = {}, urlObj) {
    const authHeader = String(headers.authorization ?? headers.Authorization ?? '').trim()
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
    const headerToken = String(headers['x-hub-token'] ?? headers['X-Hub-Token'] ?? '').trim()
    const queryToken = urlObj ? String(urlObj.searchParams.get('token') ?? '').trim() : ''
    return bearer || headerToken || queryToken
  }

  function checkAuth(headers = {}, urlObj) {
    if (!expectedToken) return !requireToken
    const candidate = extractCandidateToken(headers, urlObj)
    if (!candidate) return false
    const a = Buffer.from(candidate)
    const b = Buffer.from(expectedToken)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }

  function checkHostOrAdminAuth(headers = {}, urlObj, hostId = '') {
    if (checkAuth(headers, urlObj)) return true
    const candidate = extractCandidateToken(headers, urlObj)
    if (!candidate) return false
    if (hostId) {
      return hub.verifyHostCredential(hostId, candidate)
    }
    for (const h of hub.hosts.values()) {
      if (hub.verifyHostCredential(h.hostId, candidate)) {
        return true
      }
    }
    return false
  }

  async function dispatchRequest({
    method = 'GET',
    url = '/',
    headers = {},
    body = {},
    remoteAddress = '',
  }) {
    const protoHeader = String(headers['x-forwarded-proto'] ?? headers['X-Forwarded-Proto'] ?? '')
      .split(',')[0]
      .trim()
    const scheme = protoHeader === 'https' ? 'https' : 'http'
    const urlObj = new URL(url || '/', `${scheme}://${headers.host || 'localhost'}`)
    const pathname = urlObj.pathname

    if (method === 'OPTIONS') {
      return { status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' }
    }

    if (method === 'GET' && (pathname === '/healthz' || pathname === '/ready' || pathname === '/api/health')) {
      return {
        status: 200,
        json: {
          ok: true,
          status: 'ok',
          build: buildInfo,
          activeHostId: hub.activeHostId,
          hostsCount: hub.hosts.size,
          snapshotsCount: hub.snapshots.size,
          sharesCount: hub.shares.size,
        },
      }
    }

    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const html = await readFile(INDEX_HTML_PATH, 'utf8')
      const m = /assets\/index-([A-Za-z0-9_-]+)\.js/.exec(html)
      if (m?.[1]) buildInfo.uiBuild = m[1]
      return {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        body: html,
      }
    }

    if (method === 'GET' && pathname.startsWith('/assets/')) {
      const rel = pathname.slice('/assets/'.length)
      if (!rel || rel.includes('..') || rel.includes('/')) {
        return { status: 404, body: 'Not found' }
      }
      try {
        const assetPath = join(__dirname, 'public', 'assets', rel)
        const body = await readFile(assetPath, 'utf8')
        const contentType = rel.endsWith('.css')
          ? 'text/css; charset=utf-8'
          : rel.endsWith('.js')
            ? 'application/javascript; charset=utf-8'
            : 'text/plain; charset=utf-8'
        return {
          status: 200,
          headers: {
            'content-type': contentType,
            'cache-control': 'public, max-age=31536000, immutable',
          },
          body,
        }
      } catch {
        return { status: 404, body: 'Asset not found' }
      }
    }

    // PWA Web App Manifest for iPhone / Android Home Screen installation
    if (method === 'GET' && pathname === '/manifest.json') {
      return {
        status: 200,
        headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-store' },
        body: JSON.stringify({
          name: 'DSH 远控 · 全功能总控中心',
          short_name: 'DSH 远控',
          description: 'DeepSeek Harness 飞书多机切换、远程对话、文件浏览与 iPhone 锁屏推送总控 App',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f8fafc',
          theme_color: '#ffffff',
          icons: [
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        }, null, 2),
      }
    }

    // Crisp SVG App Icon for Home Screen & Push Notifications (Bright iOS App Style)
    if (method === 'GET' && (pathname === '/icon.svg' || pathname === '/apple-touch-icon.png')) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#eff6ff"/>
            <stop offset="100%" stop-color="#dbeafe"/>
          </linearGradient>
          <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#4f46e5"/>
          </linearGradient>
        </defs>
        <rect width="256" height="256" rx="56" fill="url(#g)"/>
        <rect x="28" y="40" width="200" height="142" rx="26" fill="#ffffff" stroke="#bfdbfe" stroke-width="4"/>
        <path d="M66 94 L98 116 L66 138" stroke="url(#brand)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="114" y1="138" x2="166" y2="138" stroke="#059669" stroke-width="14" stroke-linecap="round"/>
        <circle cx="192" cy="76" r="10" fill="#10b981"/>
        <text x="128" y="224" text-anchor="middle" fill="#1e3a8a" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="800" font-size="27" letter-spacing="0.5">DSH REMOTE</text>
      </svg>`
      return {
        status: 200,
        headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
        body: svg,
      }
    }

    // Service Worker for iOS 16.4+ / Android Web Push lock-screen notifications & deep-link click routing
    if (method === 'GET' && pathname === '/sw.js') {
      return {
        status: 200,
        headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' },
        body: renderServiceWorkerJs(),
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

    // One-line Host Install Script served directly from the Hub (pre-fills this Hub's origin URL)
    if (method === 'GET' && (pathname === '/install.sh' || pathname === '/connect-host.sh')) {
      const originUrl = `${urlObj.protocol}//${urlObj.host}`
      try {
        const rawScript = await readFile(CONNECT_SCRIPT_PATH, 'utf8')
        const injected = rawScript.replace(
          'DEFAULT_HUB_URL=""',
          `DEFAULT_HUB_URL="${originUrl}"`,
        )
        return {
          status: 200,
          headers: { 'content-type': 'text/x-shellscript; charset=utf-8', 'cache-control': 'no-store' },
          body: injected,
        }
      } catch {
        return { status: 404, body: '#!/usr/bin/env bash\necho "install script not found"\nexit 1\n' }
      }
    }

    // One-Time Pairing Code Exchange (allows mobile QR scan / 6-digit code login without typing HUB_TOKEN)
    if (method === 'POST' && pathname === '/api/pairing/exchange') {
      const clientKey = resolveClientIp(headers, remoteAddress, {
        ...(trustProxy !== undefined ? { trustProxy } : {}),
      })
      const outcome = hub.exchangePairingCode(body.code, { clientKey })
      if (!outcome.ok) return { status: outcome.rateLimited ? 429 : 401, json: outcome }
      return {
        status: 200,
        json: {
          ...outcome,
          token: expectedToken,
        },
      }
    }

    // Host Join by Multi-Use Time-Limited Enrollment Code (issues independent per-host token, never master HUB_TOKEN)
    if (method === 'POST' && (pathname === '/api/hosts/join' || pathname === '/api/pairing/join-host')) {
      const clientKey = resolveClientIp(headers, remoteAddress, {
        ...(trustProxy !== undefined ? { trustProxy } : {}),
      })
      const outcome = hub.joinHostWithCode({
        ...body,
        clientKey,
      })
      if (!outcome.ok) {
        return { status: outcome.statusCode || (outcome.rateLimited ? 429 : 401), json: outcome }
      }
      return {
        status: 200,
        json: outcome,
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
      // Host-level reporting endpoints accept either the Admin HUB_TOKEN or that specific host's dedicated hostToken
      if (method === 'POST' && pathname === '/api/heartbeat') {
        const targetHostId = String(body?.hostId ?? '').trim()
        if (!checkHostOrAdminAuth(headers, urlObj, targetHostId)) {
          return {
            status: 401,
            json: {
              ok: false,
              error: 'Unauthorized: valid HUB_TOKEN or active Host Token required',
              authRequired: true,
            },
          }
        }
        const outcome = hub.handleHeartbeat(body)
        const status = outcome.ok ? 200 : outcome.code === 'DEVICE_REVOKED' || outcome.code === 'PEER_IDENTITY_MISMATCH' ? 403 : 400
        return { status, json: outcome }
      }

      const isSharedHostEndpoint =
        (method === 'POST' && pathname === '/api/shares') ||
        (method === 'POST' && pathname === '/api/snapshots') ||
        (method === 'GET' && /^\/api\/snapshots\/([^/]+)\/download$/.test(pathname)) ||
        pathname === '/api/v1/signaling' ||
        /^\/api\/v1\/signaling\/([^/]+)$/.test(pathname) ||
        pathname === '/api/v1/turn/credentials'

      if (isSharedHostEndpoint) {
        const claimedHostId = String(body?.hostId || body?.meta?.hostId || '').trim()
        if (!checkHostOrAdminAuth(headers, urlObj, claimedHostId)) {
          return {
            status: 401,
            json: {
              ok: false,
              error: 'Unauthorized: valid HUB_TOKEN or active Host Token required',
              authRequired: true,
            },
          }
        }
      } else if (!checkAuth(headers, urlObj)) {
        return {
          status: 401,
          json: {
            ok: false,
            error: 'Unauthorized: valid HUB_TOKEN required',
            authRequired: true,
          },
        }
      }

      if ((method === 'GET' || method === 'POST') && pathname === '/api/hosts/enrollment') {
        const forceNew = method === 'POST' && Boolean(body?.forceNew ?? true)
        const enrollment = hub.getOrCreateEnrollmentCode({
          forceNew,
          ...(Number(body?.ttlMs) > 0 ? { ttlMs: Number(body.ttlMs) } : {}),
        })
        return { status: 200, json: { ok: true, enrollment } }
      }

      if (method === 'POST' && pathname === '/api/auth/change-token') {
        const nextToken = String(body.newToken ?? '').trim()
        if (!nextToken || nextToken.length < 6) {
          return { status: 400, json: { ok: false, error: '新密码长度不能少于 6 位' } }
        }
        expectedToken = nextToken
        return { status: 200, json: { ok: true } }
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
        const status = outcome.ok ? 200 : outcome.statusCode || 404
        return { status, json: outcome }
      }

      const hostPreviewMatch = /^\/api\/hosts\/([^/]+)\/file-preview$/.exec(pathname)
      if (hostPreviewMatch) {
        const hostId = decodeURIComponent(hostPreviewMatch[1])
        if (method === 'DELETE') {
          return { status: 200, json: hub.clearFilePreview(hostId) }
        }
        if (method === 'GET') {
          const expectedAt = urlObj.searchParams.get('at')
          const format = urlObj.searchParams.get('format')
          const blob = hub.getFilePreviewBlob(hostId, expectedAt)
          if (!blob) {
            return { status: 404, json: { ok: false, error: '文件预览已过期或不存在，请重新点击文件加载' } }
          }
          if (format === 'json') {
            return { status: 200, json: { ok: true, preview: blob } }
          }
          if (blob.dataBase64) {
            const buf = Buffer.from(blob.dataBase64, 'base64')
            return {
              status: 200,
              headers: {
                'content-type': blob.mime || 'application/octet-stream',
                'content-length': String(buf.length),
                'cache-control': 'private, max-age=300',
              },
              buffer: buf,
            }
          }
          return {
            status: 200,
            headers: {
              'content-type': 'text/plain; charset=utf-8',
              'cache-control': 'private, max-age=300',
            },
            body: String(blob.content ?? ''),
          }
        }
      }

      const sessTranscriptMatch = /^\/api\/hosts\/([^/]+)\/sessions\/([^/]+)\/transcript$/.exec(pathname)
      if (method === 'GET' && sessTranscriptMatch) {
        const hostId = decodeURIComponent(sessTranscriptMatch[1])
        const agentId = decodeURIComponent(sessTranscriptMatch[2])
        const full = hub.getSessionFullTranscript(hostId, agentId)
        if (!full) {
          return { status: 404, json: { ok: false, error: 'Session transcript not found' } }
        }
        return { status: 200, json: full }
      }

      const cmdCancelMatch = /^\/api\/commands\/([^/]+)\/cancel$/.exec(pathname)
      if (method === 'POST' && cmdCancelMatch) {
        const cmdId = decodeURIComponent(cmdCancelMatch[1])
        const outcome = hub.cancelCommand(cmdId)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }

      const cmdResultMatch = /^\/api\/commands\/([^/]+)$/.exec(pathname)
      if (method === 'DELETE' && cmdResultMatch) {
        const cmdId = decodeURIComponent(cmdResultMatch[1])
        const outcome = hub.cancelCommand(cmdId)
        return { status: outcome.ok ? 200 : 404, json: outcome }
      }
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
        return { status: 200, json: { ok: true, pairing, code: pairing.code, expiresAt: pairing.expiresAt } }
      }

      // W3C Web Push + VAPID Endpoints for iPhone (iOS 16.4+) / Android Home Screen App
      if (method === 'GET' && pathname === '/api/push/vapid-public-key') {
        return {
          status: 200,
          json: {
            ok: true,
            publicKey: hub.getVapidPublicKey(),
          },
        }
      }

      if (method === 'POST' && pathname === '/api/push/subscribe') {
        const outcome = hub.addPushSubscription({
          subscription: body.subscription || body,
          deviceName: body.deviceName || 'iPhone 主屏幕 App',
          userAgent: headers['user-agent'] || '',
        })
        return { status: outcome.ok ? 200 : 400, json: outcome }
      }

      if (method === 'POST' && pathname === '/api/push/unsubscribe') {
        const outcome = hub.removePushSubscription(body.id || body.endpoint)
        return { status: 200, json: outcome }
      }

      if (method === 'POST' && pathname === '/api/push/test') {
        const outcome = await hub.broadcastWebPush({
          title: body.title || '🔔 DSH iPhone 锁屏推送已激活！',
          body: body.body || '当任意电脑有工具待审批、任务完成或异常时，你会立即收到这样的系统级锁屏通知。',
          tag: 'dsh-push-test',
          badgeCount: 1,
          data: {
            type: 'test',
            hostId: hub.activeHostId || '',
            url: '/',
          },
        })
        return { status: 200, json: outcome }
      }

      // SSE fallback for in-memory fetchAdapter testing
      if (method === 'GET' && pathname === '/api/events') {
        return {
          status: 200,
          headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' },
          body: `event: state\ndata: ${JSON.stringify({ ok: true, ...hub.getFullState() })}\n\n`,
        }
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
      const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      if (req.method === 'GET' && urlObj.pathname === '/api/events') {
        if (!checkAuth(req.headers, urlObj)) {
          await sendJson(res, 401, { ok: false, error: 'Unauthorized', authRequired: true }, req.headers)
          return
        }
        res.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'access-control-allow-origin': '*',
        })
        const sendEvent = stateData => {
          res.write(`event: state\ndata: ${JSON.stringify({ ok: true, ...stateData })}\n\n`)
        }
        if (urlObj.searchParams.get('initial') === '0') {
          res.write(`event: ping\ndata: {"ts":${Date.now()}}\n\n`)
        } else {
          sendEvent(hub.getFullState())
        }
        const unsubscribe = hub.onStateChange((_evt, stateData) => {
          sendEvent(stateData)
        })
        const keepAlive = setInterval(() => {
          res.write(`event: ping\ndata: {"ts":${Date.now()}}\n\n`)
        }, 10_000)
        keepAlive.unref?.()
        req.on('close', () => {
          clearInterval(keepAlive)
          unsubscribe()
        })
        return
      }

      const body = req.method === 'POST' ? await readJsonBody(req) : {}
      const result = await dispatchRequest({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
        remoteAddress: req.socket?.remoteAddress || '',
      })
      if (result.json !== undefined) {
        await sendJson(res, result.status, result.json, req.headers)
      } else if (result.buffer !== undefined) {
        res.writeHead(result.status, result.headers || {})
        res.end(result.buffer)
      } else {
        res.writeHead(result.status, result.headers || {})
        res.end(result.body ?? '')
      }
    } catch (error) {
      logger?.warn?.(`dsh-hub error: ${error?.message ?? error}`)
      sendJson(res, 500, { ok: false, error: error?.message ?? 'Internal server error' }, req.headers)
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
      const out = await dispatchRequest({
        method,
        url: urlStr,
        headers,
        body: parsedBody,
        remoteAddress: init.remoteAddress || '',
      })
      return {
        status: out.status,
        ok: out.status >= 200 && out.status < 300,
        headers: new Headers(out.headers || {}),
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

function renderServiceWorkerJs() {
  return `// DSH Self-Hosted PWA & iOS 16.4+ Web Push Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {
    title: 'DSH 远控通知',
    body: '您的电脑任务有新动态，点击查看',
    tag: 'dsh-notify',
    badgeCount: 1,
    data: { url: '/' },
  };
  if (event.data) {
    try {
      payload = Object.assign(payload, event.data.json());
    } catch {
      payload.body = event.data.text();
    }
  }

  const tasks = [
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag || 'dsh-notify',
      renotify: true,
      data: payload.data || { url: '/' },
    }),
  ];

  if (self.navigator && typeof self.navigator.setAppBadge === 'function') {
    tasks.push(self.navigator.setAppBadge(Number(payload.badgeCount) || 1).catch(() => {}));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (self.navigator && typeof self.navigator.clearAppBadge === 'function') {
    self.navigator.clearAppBadge().catch(() => {});
  }
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
`
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
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --subtle: #f1f5f9;
      --border: #e2e8f0;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #2563eb;
      --green: #059669;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      background-image: radial-gradient(960px 340px at 50% -100px, rgba(37, 99, 235, 0.08), transparent);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", Roboto, sans-serif;
      padding: 28px 18px 60px;
      line-height: 1.6;
    }
    .wrap { max-width: 880px; margin: 0 auto; }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      box-shadow: 0 4px 20px -4px rgba(15, 23, 42, 0.06);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 999px;
      background: #ecfdf5;
      color: var(--green);
      border: 1px solid #a7f3d0;
    }
    .btn {
      background: var(--primary);
      color: #fff;
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 9px 16px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.15s;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
    }
    .btn:hover { background: #1d4ed8; }
    .btn.secondary {
      background: #ffffff;
      color: var(--text);
      border-color: var(--border);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .btn.secondary:hover { background: var(--subtle); }
    .msg {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 14px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }
    .msg.user {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .msg.assistant {
      border-left: 4px solid var(--green);
    }
    .role {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif;
      font-size: 14px;
      line-height: 1.65;
      color: var(--text);
    }
    .thinking {
      margin-top: 10px;
      padding: 10px 14px;
      background: var(--subtle);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: #475569;
      font-size: 12.5px;
    }
    .tools { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .tool-pill {
      font-size: 11.5px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: var(--primary);
      border: 1px solid #bfdbfe;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="badge">🔒 AES-256-GCM 端到端加密回放（自托管，零第三方服务器）</div>
        <h2 id="title" style="margin:10px 0 4px 0; font-size:20px; letter-spacing:-0.01em;">正在浏览器本地解密...</h2>
        <div id="meta" style="font-size:13px; color:var(--muted);"></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn" onclick="startReplay()">▶ 动画回放</button>
        <button class="btn secondary" onclick="renderAll()">展开全部</button>
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

async function sendJson(res, status, data, reqHeaders = {}) {
  const payload = JSON.stringify(data)
  const acceptEncoding = String(reqHeaders?.['accept-encoding'] ?? reqHeaders?.['Accept-Encoding'] ?? '')
  if (payload.length > 1024 && /\bgzip\b/i.test(acceptEncoding)) {
    try {
      const gz = await gzipAsync(Buffer.from(payload, 'utf8'))
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'gzip',
        'content-length': String(gz.length),
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      })
      res.end(gz)
      return
    } catch {
      // fall back to uncompressed
    }
  }
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

// Allow running directly (`node hub/server.js`) for Google Cloud Run / Docker / Railway / local usage
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const port = Number(process.env.PORT || process.env.HUB_PORT || 8080)
  const host = process.env.HOST || '0.0.0.0'
  const stateFile = process.env.HUB_STATE_FILE || '/data/dsh-hub-state.json'
  const rawToken = process.env.HUB_TOKEN || process.env.FEISHU_HUB_TOKEN || ''
  const allowInsecure = process.env.ALLOW_INSECURE_NO_TOKEN === '1'
  const tokenCheck = validateHubStartupToken(rawToken, { allowInsecureNoToken: allowInsecure })
  if (!tokenCheck.ok) {
    console.error(tokenCheck.error)
    process.exit(1)
  }
  const hub = new HubCore({ stateFile })
  await hub.init()
  const { server } = createHubServer({ hub, token: tokenCheck.token, requireToken: !allowInsecure })
  server.listen(port, host, () => {
    console.log(
      formatStartupBanner({
        host,
        port,
        token: tokenCheck.token,
        stateFile,
      }),
    )
  })
}
