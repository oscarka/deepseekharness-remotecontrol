import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'
import { resolveConfig } from '../lib/config.js'
import {
  buildVodM3u8Content,
  pruneHlsCacheDir,
  resolveHlsCacheDir,
  stopAllHlsEncoders,
} from '../lib/hls-streamer.js'
import { HubAgent } from '../lib/hub-agent.js'

test('HLS VOD playlist builder & end-to-end Hub /fs/hls/index.m3u8 + seg_00000.ts streaming with mediaTicket rewrite', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'dsh-hls-e2e-'))
  try {
    const wsDir = join(tmpDir, 'ws')
    const dshHome = join(tmpDir, 'dsh')
    await mkdir(wsDir, { recursive: true })
    await mkdir(dshHome, { recursive: true })

    // Build VOD playlist math check (7.4s -> 4 segments: 2s, 2s, 2s, 1.4s)
    const built = buildVodM3u8Content(7.4, 2)
    assert.equal(built.segCount, 4)
    assert.match(built.m3u8, /#EXT-X-PLAYLIST-TYPE:VOD/)
    assert.match(built.m3u8, /seg_00000\.ts/)
    assert.match(built.m3u8, /seg_00003\.ts/)
    assert.match(built.m3u8, /#EXT-X-ENDLIST/)

    // Create a 12 MiB video in workspace
    await writeFile(join(wsDir, 'render_demo.mp4'), Buffer.alloc(12 * 1024 * 1024, 0x33))

    const fakeTsPayload = Buffer.alloc(188 * 64, 0x47) // valid MPEG-TS sync byte 0x47
    const mockExec = async (cmd, args = []) => {
      if (cmd === 'ffmpeg' && args[0] === '-version') {
        return { stdout: 'ffmpeg version 8.0', stderr: '' }
      }
      if (cmd === 'ffprobe') {
        return { stdout: '12.500\n', stderr: '' }
      }
      return { stdout: '', stderr: '' }
    }

    // Also verify real Hub + HubAgent /fs/hls/index.m3u8 & /fs/hls/seg_00000.ts with pre-seeded segment
    const hub = new HubCore({ tokenSecret: 'hls-hub-token' })
    const { fetchAdapter } = createHubServer({
      hub,
      token: 'hls-hub-token',
      requireToken: true,
    })
    const cfg = resolveConfig({
      appId: 'cli_hls',
      allowedOpenIds: ['ou_hls'],
      hubUrl: 'http://hub.local',
      hubToken: 'hls-hub-token',
      hostId: 'linux-box',
      hostName: 'Ubuntu Workstation',
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
      hostId: 'linux-box',
      hostName: 'Ubuntu Workstation',
      bridgeState: { tasks: [], approvals: [], workspaces: [wsDir] },
    })
    const unsubFs = hub.onHostFsRequest((hid, fsReq) => {
      if (hid === 'linux-box') void agent.handleFastFsRequest(fsReq)
    })

    try {
      const mt = hub.getFullState().mediaTicket

      // 1) /fs/read reports hlsAvailable: true
      const readRes = await fetchAdapter(
        `http://hub.local/api/hosts/linux-box/fs/read?path=render_demo.mp4&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
      )
      assert.equal(readRes.status, 200)
      const readJson = await readRes.json()
      assert.equal(readJson.ok, true)
      assert.equal(readJson.hlsAvailable, true)

      // 2) Unauthorized /fs/hls/index.m3u8 rejected with 401
      const unauthHls = await fetchAdapter(
        `http://hub.local/api/hosts/linux-box/fs/hls/index.m3u8?path=render_demo.mp4&cwd=${encodeURIComponent(wsDir)}`,
      )
      assert.equal(unauthHls.status, 401)

      // 3) Authorized /fs/hls/index.m3u8 returns rewritten VOD m3u8 with mt= on every segment & X-Accel-Buffering: no
      const m3u8Res = await fetchAdapter(
        `http://hub.local/api/hosts/linux-box/fs/hls/index.m3u8?path=render_demo.mp4&cwd=${encodeURIComponent(wsDir)}&mt=${encodeURIComponent(mt)}`,
      )
      assert.equal(m3u8Res.status, 200)
      assert.equal(m3u8Res.headers.get('x-accel-buffering'), 'no')
      const m3u8Text = await m3u8Res.text()
      assert.match(m3u8Text, /#EXT-X-PLAYLIST-TYPE:VOD/)
      assert.match(m3u8Text, /\/api\/hosts\/linux-box\/fs\/hls\/seg_00000\.ts\?/)
      assert.ok(m3u8Text.includes(`mt=${encodeURIComponent(mt)}`))

      // Seed seg_00000.ts in the created HLS cache folder (in case test env has no real H.264 stream inside 0x33 dummy file)
      stopAllHlsEncoders()
      const hlsRoot = resolveHlsCacheDir(dshHome)
      const sessionDirs = await readdir(hlsRoot)
      assert.equal(sessionDirs.length, 1)
      await writeFile(join(hlsRoot, sessionDirs[0], 'seg_00000.ts'), fakeTsPayload)

      // 4) Fetch seg_00000.ts via rewritten URL
      const segLine = m3u8Text.split('\n').find(l => l.startsWith('/api/hosts/linux-box/fs/hls/seg_00000.ts'))
      assert.ok(segLine)
      const segRes = await fetchAdapter(`http://hub.local${segLine}`)
      assert.equal(segRes.status, 200)
      assert.equal(segRes.headers.get('content-type'), 'video/mp2t')
      assert.equal(segRes.headers.get('x-accel-buffering'), 'no')
      const segBuf = Buffer.from(await segRes.arrayBuffer())
      assert.equal(segBuf.length, fakeTsPayload.length)
      assert.equal(segBuf[0], 0x47)
    } finally {
      unsubFs()
      agent.stop()
    }
  } finally {
    stopAllHlsEncoders()
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('pruneHlsCacheDir automatically cleans expired HLS folders, enforces byte/entry caps, and sweeps stale .tmp-*.mp4 files', async () => {
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-hls-gc-'))
  try {
    const hlsRoot = resolveHlsCacheDir(dshHome)
    const thumbsRoot = join(dshHome, 'cache', 'thumbs')
    await mkdir(hlsRoot, { recursive: true })
    await mkdir(thumbsRoot, { recursive: true })

    const now = Date.now()
    // Create 3 HLS session directories: 1 expired (3h old), 1 older big, 1 newest
    const dirExpired = join(hlsRoot, 'aaa_expired')
    const dirOlder = join(hlsRoot, 'bbb_older')
    const dirNewest = join(hlsRoot, 'ccc_newest')
    await mkdir(dirExpired)
    await mkdir(dirOlder)
    await mkdir(dirNewest)

    await writeFile(join(dirExpired, 'seg_00000.ts'), Buffer.alloc(64 * 1024, 1))
    await writeFile(join(dirOlder, 'seg_00000.ts'), Buffer.alloc(400 * 1024, 2))
    await writeFile(join(dirNewest, 'seg_00000.ts'), Buffer.alloc(300 * 1024, 3))

    const threeHoursAgo = new Date(now - 3 * 3600 * 1000)
    const tenMinAgo = new Date(now - 10 * 60 * 1000)
    const oneMinAgo = new Date(now - 60 * 1000)
    await utimes(dirExpired, threeHoursAgo, threeHoursAgo)
    await utimes(dirOlder, tenMinAgo, tenMinAgo)
    await utimes(dirNewest, oneMinAgo, oneMinAgo)

    // Create a stale abandoned .tmp-abcdef.mp4 in cache/thumbs (>10 min old)
    const staleTmpMp4 = join(thumbsRoot, 'deadbeef.tmp-123456.mp4')
    await writeFile(staleTmpMp4, Buffer.alloc(1024, 9))
    const twentyMinAgo = new Date(now - 20 * 60 * 1000)
    await utimes(staleTmpMp4, twentyMinAgo, twentyMinAgo)

    // Prune with ttlMs = 2h and maxBytes = 500 KiB -> removes expired AND evicts dirOlder (300+400 > 500 KiB), keeping dirNewest!
    const res = await pruneHlsCacheDir(dshHome, {
      ttlMs: 2 * 3600 * 1000,
      maxBytes: 500 * 1024,
      maxEntries: 10,
      now,
    })
    assert.equal(res.removedDirs, 2)
    const remainingHls = await readdir(hlsRoot)
    assert.deepEqual(remainingHls, ['ccc_newest'])

    const remainingThumbs = await readdir(thumbsRoot)
    assert.equal(remainingThumbs.length, 0, 'Stale .tmp-*.mp4 must be swept automatically')
  } finally {
    await rm(dshHome, { recursive: true, force: true })
  }
})
