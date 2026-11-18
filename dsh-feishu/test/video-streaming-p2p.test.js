import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'
import { resolveConfig } from '../lib/config.js'
import { HubAgent } from '../lib/hub-agent.js'
import { prepareWorkspaceFileStream, readWorkspaceFileFastMeta } from '../lib/workspace-ops.js'

test('Plan 1: Safari video Range requests cap at 1MiB initial + 2MiB subsequent slices (preventing 16MiB Cloud Run 504s)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-plan1-range-'))
  try {
    const videoSize = 24 * 1024 * 1024 // 24 MiB
    const buf = Buffer.alloc(videoSize, 0x42)
    await writeFile(join(dir, 'bili_16x9.mp4'), buf)

    // 1) Safari initial probe Range: bytes=0-1 -> 2 bytes untouched
    const rProbe = await prepareWorkspaceFileStream(dir, 'bili_16x9.mp4', {
      rangeHeader: 'bytes=0-1',
    })
    assert.equal(rProbe.ok, true)
    assert.equal(rProbe.status, 206)
    assert.equal(rProbe.byteLength, 2)
    assert.equal(rProbe.contentRange, `bytes 0-1/${videoSize}`)

    // 2) Safari full-file closed Range: bytes=0-25165823 -> capped at 1 MiB for instant first frame!
    const rFirst = await prepareWorkspaceFileStream(dir, 'bili_16x9.mp4', {
      rangeHeader: `bytes=0-${videoSize - 1}`,
    })
    assert.equal(rFirst.ok, true)
    assert.equal(rFirst.status, 206)
    assert.equal(rFirst.byteLength, 1024 * 1024)
    assert.equal(rFirst.contentRange, `bytes 0-${1024 * 1024 - 1}/${videoSize}`)

    // 3) Subsequent Safari Range: bytes=1048576-25165823 -> capped at 2 MiB (not 16 MiB!)
    const rNext = await prepareWorkspaceFileStream(dir, 'bili_16x9.mp4', {
      rangeHeader: `bytes=1048576-${videoSize - 1}`,
    })
    assert.equal(rNext.ok, true)
    assert.equal(rNext.status, 206)
    assert.equal(rNext.byteLength, 2 * 1024 * 1024)
    assert.equal(rNext.contentRange, `bytes 1048576-${1048576 + 2 * 1024 * 1024 - 1}/${videoSize}`)

    // 4) P2P skipChunkCap=true streams full 24 MiB without gateway chunk cap
    const rP2p = await prepareWorkspaceFileStream(dir, 'bili_16x9.mp4', {
      skipChunkCap: true,
    })
    assert.equal(rP2p.ok, true)
    assert.equal(rP2p.status, 200)
    assert.equal(rP2p.byteLength, videoSize)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('Plan 1: Safe /tmp media artifacts (.mp4/.png/.html) are readable while non-media /tmp files remain blocked', async () => {
  const wsDir = await mkdtemp(join(tmpdir(), 'dsh-ws-main-'))
  const extTmpDir = await mkdtemp(join(tmpdir(), 'bili_record_'))
  try {
    const tmpVideo = join(extTmpDir, 'demo_vo.mp4')
    const tmpSecret = join(extTmpDir, 'credentials.env')
    await writeFile(tmpVideo, Buffer.from('00000018667479706d703432', 'hex'))
    await writeFile(tmpSecret, 'SECRET_TOKEN=top_secret_value\n')

    const metaVid = await readWorkspaceFileFastMeta(wsDir, tmpVideo)
    assert.equal(metaVid.ok, true)
    assert.equal(metaVid.kind, 'video')
    assert.equal(metaVid.name, 'demo_vo.mp4')

    const metaSec = await readWorkspaceFileFastMeta(wsDir, tmpSecret)
    assert.equal(metaSec.ok, false, 'Non-media files in /tmp outside workspace must remain blocked')
  } finally {
    await rm(wsDir, { recursive: true, force: true })
    await rm(extTmpDir, { recursive: true, force: true })
  }
})

test('Plan 1 + Plan 2: 720p preview=1 stream, fs_abort upload cancellation, and /fs/rtc-offer WebRTC signaling', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-p2p-sig-'))
  try {
    const wsDir = join(tmpDir, 'ws')
    const dshHome = join(tmpDir, 'dsh')
    await mkdir(wsDir, { recursive: true })
    await mkdir(dshHome, { recursive: true })

    // 6 MiB video triggers 720p fast-preview when ?preview=1 is requested
    const origVideo = Buffer.alloc(6 * 1024 * 1024, 0x11)
    const fastPvBytes = Buffer.alloc(512 * 1024, 0x22)
    await writeFile(join(wsDir, 'promo_1080p60.mp4'), origVideo)

    let pvEncodeCalls = 0
    const mockExec = async (cmd, args = []) => {
      if (cmd === 'ffmpeg' && args.includes('1500k')) {
        pvEncodeCalls += 1
        const outPath = args[args.length - 1]
        await writeFile(outPath, fastPvBytes)
      }
      return { stdout: '', stderr: '' }
    }

    const hub = new HubCore({ tokenSecret: 'p2p-hub-token' })
    const { fetchAdapter } = createHubServer({
      hub,
      token: 'p2p-hub-token',
      requireToken: true,
    })
    const cfg = resolveConfig({
      appId: 'cli_test',
      allowedOpenIds: ['ou_test'],
      hubUrl: 'http://hub.local',
      hubToken: 'p2p-hub-token',
      hostId: 'mac-air-p2p',
      hostName: 'MacBook Air',
      dshHome,
      defaultCwd: wsDir,
      enableAntigravityIde: false,
      enableExternalHarnesses: false,
    })
    const agent = new HubAgent({
      config: cfg,
      bridge: {
        setHubAgent() {},
        collectState: () => ({ tasks: [], approvals: [], workspaces: [wsDir] }),
        agents: { list: () => [], get: () => undefined },
      },
      fetchImpl: fetchAdapter,
      execImpl: mockExec,
      logger: { info() {}, warn() {}, error() {} },
    })
    hub.handleHeartbeat({
      hostId: 'mac-air-p2p',
      hostName: 'MacBook Air',
      bridgeState: { tasks: [], approvals: [], workspaces: [wsDir] },
    })

    const unsubFs = hub.onHostFsRequest((hid, fsReq) => {
      if (hid === 'mac-air-p2p') void agent.handleFastFsRequest(fsReq)
    })
    const abortedIds = []
    const unsubAbort = hub.onHostFsAbort((hid, info) => {
      if (hid === 'mac-air-p2p') {
        abortedIds.push(info.reqId)
        agent.abortFastFsRequest(info.reqId)
      }
    })

    try {
      const mt = hub.getFullState().mediaTicket

      // 1) ?preview=1 returns 720p fast-preview ('pv')
      const pvRes = await fetchAdapter(
        `http://hub.local/api/hosts/mac-air-p2p/fs/stream?path=promo_1080p60.mp4&preview=1&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
      )
      assert.equal(pvRes.status, 200)
      assert.equal(pvRes.headers.get('x-dsh-media-variant'), 'pv')
      assert.equal(pvEncodeCalls, 1)
      assert.equal((await pvRes.arrayBuffer()).byteLength, fastPvBytes.length)

      // 2) ?download=1 bypasses preview and returns untouched original ('orig')
      const dlRes = await fetchAdapter(
        `http://hub.local/api/hosts/mac-air-p2p/fs/stream?path=promo_1080p60.mp4&download=1&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
        { headers: { Range: 'bytes=0-2097151' } },
      )
      assert.equal(dlRes.status, 206)
      assert.equal(dlRes.headers.get('x-dsh-media-variant'), 'orig')
      assert.equal((await dlRes.arrayBuffer()).byteLength, 2 * 1024 * 1024)

      // 3) POST /fs/rtc-offer negotiates WebRTC SDP Answer with mediaTicket auth
      const unauthOffer = await fetchAdapter('http://hub.local/api/hosts/mac-air-p2p/fs/rtc-offer', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sdp: 'v=0\r\na=ice-ufrag:u1\r\na=ice-pwd:p1234567890123456\r\n' }),
      })
      assert.equal(unauthOffer.status, 401)

      const validOffer = await fetchAdapter(
        `http://hub.local/api/hosts/mac-air-p2p/fs/rtc-offer?mt=${encodeURIComponent(mt)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sdp: [
              'v=0',
              'a=mid:0',
              'a=ice-ufrag:clientufrag',
              'a=ice-pwd:clientpassword1234567890',
              'a=sctp-port:5000',
              'a=candidate:1 1 udp 2130706431 127.0.0.1 54321 typ host',
            ].join('\r\n'),
            cwd: wsDir,
          }),
        },
      )
      assert.equal(validOffer.status, 200)
      const ansJson = await validOffer.json()
      assert.equal(ansJson.ok, true)
      assert.match(ansJson.sdp, /m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel/)
      assert.match(ansJson.sdp, /a=fingerprint:sha-256 /)
      assert.match(ansJson.sdp, /a=setup:passive/)

      // 4) Client abort emits fs_abort immediately to cancel dead host uploads
      const ac = new AbortController()
      const pendingPromise = hub.dispatchFastFsRequest(
        'no-response-host-check',
        { op: 'stream', path: 'promo_1080p60.mp4' },
        { signal: ac.signal },
      )
      assert.equal((await pendingPromise).status, 404)

      // Test abort on registered online host before fulfill
      unsubFs() // pause auto-fulfill so request stays pending
      const ac2 = new AbortController()
      const p2 = hub.dispatchFastFsRequest(
        'mac-air-p2p',
        { op: 'stream', path: 'promo_1080p60.mp4' },
        { signal: ac2.signal },
      )
      ac2.abort()
      const r2 = await p2
      assert.equal(r2.status, 499)
      assert.equal(abortedIds.length, 1, 'Aborting client stream must emit onHostFsAbort with reqId')
    } finally {
      unsubFs()
      unsubAbort()
      agent.stop()
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
