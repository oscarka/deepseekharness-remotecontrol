import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import net from 'node:net'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'

test('fs-tunnel stream error, early GET client disconnect, and concurrent aborts never crash HubServer', async () => {
  const hub = new HubCore({ tokenSecret: 'tunnel-resilience-secret' })
  const { server } = createHubServer({
    hub,
    token: 'tunnel-resilience-secret',
    requireToken: true,
    logger: { info() {}, warn() {}, error() {} },
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    hub.handleHeartbeat({
      hostId: 'mac-resilience',
      hostName: 'Mac Resilience',
      bridgeState: { tasks: [], approvals: [], workspaces: [] },
    })

    // 1. Premature GET disconnect before tunnel responds cleans up pendingFsRequests cleanly
    const unsub1 = hub.onHostFsRequest(() => {
      // intentionally do not fulfill immediately; wait for client to drop socket
    })
    const rawSock = net.connect(port, '127.0.0.1')
    await new Promise(resolve => rawSock.once('connect', resolve))
    rawSock.write(
      `GET /api/hosts/mac-resilience/fs/stream?path=demo.mp4 HTTP/1.1\r\n` +
      `Host: 127.0.0.1:${port}\r\n` +
      `Authorization: Bearer tunnel-resilience-secret\r\n\r\n`,
    )
    await new Promise(r => setTimeout(r, 40))
    assert.equal(hub.pendingFsRequests.size, 1)
    const [pendingId] = [...hub.pendingFsRequests.keys()]
    rawSock.destroy()
    await new Promise(r => setTimeout(r, 50))
    assert.equal(hub.pendingFsRequests.size, 0, 'aborted GET must remove pendingFsRequest')
    unsub1()

    // Late POST /api/fs-tunnel for the already-aborted reqId returns 404 without crashing
    const latePost = await fetch(`${baseUrl}/api/fs-tunnel/${pendingId}`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer tunnel-resilience-secret',
        'content-type': 'application/octet-stream',
        'x-fs-meta': Buffer.from(JSON.stringify({ ok: true, status: 200, hostId: 'mac-resilience', byteLength: 5 }), 'utf8').toString('base64url'),
      },
      body: 'hello',
    })
    assert.equal(latePost.status, 404)

    // 2. Unit-level fulfillFastFsRequest stream error guard: emitting error on stream must NOT throw uncaught exception
    const ac = new AbortController()
    const pendingPromise = hub.dispatchFastFsRequest('mac-resilience', { op: 'stream', path: 'v.mp4' }, { timeoutMs: 5000, signal: ac.signal })
    const [errReqId] = [...hub.pendingFsRequests.keys()]
    const fakeStream = new PassThrough()
    const fulfilled = hub.fulfillFastFsRequest(errReqId, { ok: true, status: 200, byteLength: 10 }, null, fakeStream)
    assert.equal(fulfilled.ok, true)
    const resolved = await pendingPromise
    assert.ok(resolved.stream)
    // Emit error on fakeStream before any pipeline attaches -> must not crash!
    fakeStream.emit('error', new Error('simulated ECONNRESET'))
    await fulfilled.streamDone

    // 3. Real TCP socket abrupt reset mid-POST upload across multiple concurrent requests
    const unsub3 = hub.onHostFsRequest((_hid, fsReq) => {
      const sock = net.connect(port, '127.0.0.1')
      sock.on('error', () => {})
      sock.once('connect', () => {
        const metaB64 = Buffer.from(
          JSON.stringify({ ok: true, status: 206, hostId: 'mac-resilience', byteLength: 65536, mime: 'video/mp4' }),
          'utf8',
        ).toString('base64url')
        sock.write(
          `POST /api/fs-tunnel/${fsReq.reqId} HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${port}\r\n` +
          `Authorization: Bearer tunnel-resilience-secret\r\n` +
          `Content-Type: application/octet-stream\r\n` +
          `Content-Length: 65536\r\n` +
          `X-Fs-Meta: ${metaB64}\r\n\r\n` +
          'A'.repeat(1024),
        )
        // Abruptly reset upstream TCP socket mid-upload!
        setTimeout(() => sock.destroy(), 15)
      })
    })

    const concurrentGets = Array.from({ length: 6 }, () =>
      fetch(`${baseUrl}/api/hosts/mac-resilience/fs/stream?path=demo.mp4`, {
        headers: { authorization: 'Bearer tunnel-resilience-secret' },
      })
        .then(r => r.arrayBuffer())
        .catch(() => null),
    )
    await Promise.all(concurrentGets)
    unsub3()

    // Server must still be healthy and respond 200 to /healthz
    const healthRes = await fetch(`${baseUrl}/healthz`)
    assert.equal(healthRes.status, 200)

    // 4. Built inline video markup must use preload="none" to prevent concurrent video storms
    const html = await readFile(new URL('../../hub/public/index.html', import.meta.url), 'utf8')
    const jsMatch = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html)
    assert.ok(jsMatch, 'built index.html should reference JS bundle')
    const bundle = await readFile(new URL(`../../hub/public/assets/${jsMatch[1]}`, import.meta.url), 'utf8')
    assert.match(bundle, /class="md-inline-video"[^>]*preload="none"/)

    // Avoid unused warning for EventEmitter import
    assert.ok(EventEmitter)
  } finally {
    server.closeAllConnections?.()
    await new Promise(r => server.close(r))
  }
})
