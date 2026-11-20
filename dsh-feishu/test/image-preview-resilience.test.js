import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import { createHubServer } from '../../hub/server.js'
import { HubAgent } from '../lib/hub-agent.js'
import { prepareWorkspaceFileStream } from '../lib/workspace-ops.js'
import {
  isImageFileName,
  imagePreviewSrc,
  backupImagePreviewSrc,
  previewKind,
  buildFastStreamUrl,
} from '../../hub/web/src/utils/filePreview.ts'

test('Hub Media Stream RAM Cache: second image stream & ETag 304 hit Hub RAM with zero host round-trips, while _r=1 bypasses cache', async () => {
  const wsDir = await mkdtemp(join(tmpdir(), 'dsh-img-cache-ws-'))
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-img-cache-home-'))
  try {
    await mkdir(join(wsDir, 'shots'), { recursive: true })
    // Valid 1x1 PNG header + bytes (~70 bytes)
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex',
    )
    await writeFile(join(wsDir, 'shots', 'preview.png'), pngBytes)

    const { hub, fetchAdapter } = createHubServer({
      hubToken: 'img-cache-token',
      allowNoAuth: false,
      stateFile: join(dshHome, 'hub-state.json'),
    })

    const bridge = {
      getSnapshotState: () => ({
        tasks: [
          {
            id: 'sess-img-1',
            project: 'demo',
            cwd: wsDir,
            status: 'idle',
            messages: [],
          },
        ],
        approvals: [],
      }),
      executeHubCommand: async () => ({ ok: true }),
    }

    let hostFsStreamHits = 0
    const agent = new HubAgent({
      bridge,
      config: {
        hubUrl: 'http://hub.local',
        hubToken: 'img-cache-token',
        hostId: 'mac-img-cache',
        hostName: 'Mac Image Cache',
        dshHome,
        antigravityBrainDirs: [join(dshHome, 'brain')],
        enableAntigravityIde: false,
        enableExternalHarnesses: false,
      },
      fetchImpl: fetchAdapter,
    })
    const origHandleFastFs = agent.handleFastFsRequest.bind(agent)
    agent.handleFastFsRequest = async req => {
      if (req?.op === 'stream') hostFsStreamHits += 1
      return origHandleFastFs(req)
    }

    // Initial heartbeat registers host online
    await agent.tick()
    const mt = hub.issueMediaTicket()
    const streamUrl = `http://hub.local/api/hosts/mac-img-cache/fs/stream?path=${encodeURIComponent('shots/preview.png')}&cwd=${encodeURIComponent(wsDir)}&thumb=1&mt=${encodeURIComponent(mt)}`

    // 1. Cold request hits host via reverse tunnel and populates Hub RAM cache
    const firstPromise = fetchAdapter(streamUrl, { method: 'GET' })
    await agent.tick()
    const firstRes = await firstPromise
    assert.equal(firstRes.status, 200)
    assert.equal(firstRes.headers.get('content-type'), 'image/png')
    assert.equal(firstRes.headers.get('x-dsh-hub-cache'), null)
    assert.equal(firstRes.headers.get('x-dsh-orig-size'), String(pngBytes.length))
    const firstEtag = firstRes.headers.get('etag')
    assert.ok(firstEtag)
    assert.equal(Buffer.from(await firstRes.arrayBuffer()).equals(pngBytes), true)
    assert.equal(hostFsStreamHits, 1)

    // 2. Second request serves immediately from Hub RAM with ZERO host ticks/round-trips!
    const secondRes = await fetchAdapter(streamUrl, { method: 'GET' })
    assert.equal(secondRes.status, 200)
    assert.equal(secondRes.headers.get('x-dsh-hub-cache'), '1')
    assert.equal(secondRes.headers.get('etag'), firstEtag)
    assert.equal(Buffer.from(await secondRes.arrayBuffer()).equals(pngBytes), true)
    assert.equal(hostFsStreamHits, 1, 'Second image load must not hit remote host')

    // 3. Conditional ETag request returns 304 straight from Hub RAM
    const notModifiedRes = await fetchAdapter(streamUrl, {
      method: 'GET',
      headers: { 'if-none-match': firstEtag },
    })
    assert.equal(notModifiedRes.status, 304)
    assert.equal(notModifiedRes.headers.get('x-dsh-hub-cache'), '1')
    assert.equal(hostFsStreamHits, 1, '304 conditional check must serve directly from Hub RAM')

    // 4. Explicit reload (&_r=1) bypasses Hub cache and fetches fresh bytes from host
    const reloadPromise = fetchAdapter(`${streamUrl}&_r=1`, { method: 'GET' })
    await agent.tick()
    const reloadRes = await reloadPromise
    assert.equal(reloadRes.status, 200)
    assert.equal(reloadRes.headers.get('x-dsh-hub-cache'), null)
    assert.equal(hostFsStreamHits, 2, 'Explicit _r=1 reload must bypass Hub RAM cache')
  } finally {
    await rm(wsDir, { recursive: true, force: true })
    await rm(dshHome, { recursive: true, force: true })
  }
})

test('HubCore mediaStreamCache enforces LRU byte budget, TTL expiration, and 1.5 MiB item cap', () => {
  let nowMs = 1_780_000_000_000
  const hub = new HubCore({ now: () => nowMs })
  hub.mediaStreamCacheMaxBytes = 1024
  hub.mediaStreamCacheMaxEntries = 3

  const k1 = hub.buildMediaStreamCacheKey('h1', { cwd: '/repo/', path: 'a.png', thumb: true })
  const k2 = hub.buildMediaStreamCacheKey('h1', { cwd: '/repo', path: 'b.png', thumb: true })
  const k3 = hub.buildMediaStreamCacheKey('h1', { cwd: '/repo', path: 'c.png', thumb: true })
  assert.equal(k1, 'h1::/repo::a.png::th')

  hub.storeMediaStreamCache(k1, { buffer: Buffer.alloc(600, 1), mime: 'image/jpeg', etag: 'W/"1"' }, 90_000)
  hub.storeMediaStreamCache(k2, { buffer: Buffer.alloc(600, 2), mime: 'image/jpeg', etag: 'W/"2"' }, 90_000)
  // k1 must have been evicted to stay <= 1024 bytes
  assert.equal(hub.getMediaStreamCache(k1), null)
  assert.ok(hub.getMediaStreamCache(k2))
  assert.equal(hub.mediaStreamCacheBytes, 600)

  // Oversized > 1.5 MiB buffer must be rejected without touching existing cache
  hub.storeMediaStreamCache(k3, { buffer: Buffer.alloc(1.6 * 1024 * 1024, 3), mime: 'image/png' }, 90_000)
  assert.equal(hub.getMediaStreamCache(k3), null)
  assert.equal(hub.mediaStreamCacheBytes, 600)

  // Expired entry clears on read and reclaims byte accounting
  nowMs += 95_000
  assert.equal(hub.getMediaStreamCache(k2), null)
  assert.equal(hub.mediaStreamCacheBytes, 0)
})

test('Host smart thumbnailer deduplicates concurrent sips calls via single-flight and compresses >120 KiB images', async () => {
  if (process.platform !== 'darwin') return
  const wsDir = await mkdtemp(join(tmpdir(), 'dsh-thumb-sf-ws-'))
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-thumb-sf-home-'))
  try {
    // 160 KiB fake PNG with valid PNG dimensions header (2400x1600)
    const fakePng = Buffer.alloc(160 * 1024, 0x42)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(fakePng, 0)
    fakePng.writeUInt32BE(2400, 16)
    fakePng.writeUInt32BE(1600, 20)
    await writeFile(join(wsDir, 'wide-screen.png'), fakePng)

    let sipsCalls = 0
    const mockExec = async (_cmd, args) => {
      sipsCalls += 1
      await new Promise(r => setTimeout(r, 40))
      const outIdx = args.indexOf('--out')
      assert.ok(outIdx >= 0 && args[outIdx + 1], 'sips args must specify --out path')
      await writeFile(args[outIdx + 1], Buffer.alloc(28 * 1024, 0xff))
      return { stdout: '', stderr: '' }
    }

    const [r1, r2, r3] = await Promise.all([
      prepareWorkspaceFileStream(wsDir, 'wide-screen.png', { thumb: true, dshHome, execImpl: mockExec }),
      prepareWorkspaceFileStream(wsDir, 'wide-screen.png', { thumb: true, dshHome, execImpl: mockExec }),
      prepareWorkspaceFileStream(wsDir, 'wide-screen.png', { thumb: true, dshHome, execImpl: mockExec }),
    ])

    assert.equal(sipsCalls, 1, 'Concurrent thumbnail requests for the same image must run only 1 sips process')
    for (const r of [r1, r2, r3]) {
      assert.equal(r.ok, true)
      assert.equal(r.isThumb, true)
      assert.equal(r.mime, 'image/jpeg')
      assert.equal(r.origSize, fakePng.length)
      assert.equal(r.byteLength, 28 * 1024)
    }
  } finally {
    await rm(wsDir, { recursive: true, force: true })
    await rm(dshHome, { recursive: true, force: true })
  }
})

test('Frontend filePreview helpers: exact URL cache parity with inline chat images, reload nonce, backup URL & in-place error kind', () => {
  assert.equal(isImageFileName('docs/assets/social-preview.png'), true)
  assert.equal(isImageFileName('IMG_6079.HEIC'), true)
  assert.equal(isImageFileName('diagram.svg'), true)
  assert.equal(isImageFileName('src/index.ts'), false)

  // URL parity check: tapping an inline chat PNG (even 200 KiB) produces the exact same URL as inline chat thumbnail!
  const inlineUrl = buildFastStreamUrl('mac-1', 'shots/ui.png', {
    cwd: '/repo',
    agentId: 'sess-1',
    thumb: true,
    mediaTicket: 'mt1.123.sig',
  })
  const drawerPreview = {
    kind: 'image',
    name: 'ui.png',
    relPath: 'shots/ui.png',
    size: 200 * 1024,
    streamUrl: `/api/hosts/mac-1/fs/stream?${new URLSearchParams({ path: 'shots/ui.png', cwd: '/repo', agentId: 'sess-1' }).toString()}`,
    backupStreamUrl: `/api/hosts/mac-1/fs/stream?${new URLSearchParams({ path: '/backup/ui.png', cwd: '/repo', agentId: 'sess-1' }).toString()}`,
  }
  assert.equal(
    imagePreviewSrc(drawerPreview, 'mt1.123.sig'),
    inlineUrl,
    'Drawer preview URL must match inline chat thumbnail URL byte-for-byte for instant browser cache hits',
  )

  // Lossless original mode drops thumb=1; reload nonce appends _r=2
  assert.equal(
    imagePreviewSrc({ ...drawerPreview, _origImage: true, _reloadNonce: 2 }, 'mt1.123.sig').includes('thumb=1'),
    false,
  )
  assert.match(imagePreviewSrc({ ...drawerPreview, _reloadNonce: 2 }, 'mt1.123.sig'), /_r=2/)
  assert.match(backupImagePreviewSrc(drawerPreview, 'mt1.123.sig'), /thumb=1.*mt=mt1\.123\.sig/)

  // SVG & GIF never request thumb=1
  assert.equal(
    imagePreviewSrc({ ...drawerPreview, name: 'anim.gif', relPath: 'anim.gif' }, 'mt1.123.sig').includes('thumb=1'),
    false,
  )
  assert.equal(
    imagePreviewSrc({ ...drawerPreview, name: 'logo.svg', relPath: 'logo.svg' }, 'mt1.123.sig').includes('thumb=1'),
    false,
  )

  // Error preview stays in error state instead of falling back to project directory
  assert.equal(previewKind({ kind: 'error', _loadError: 'timeout' }), 'error')
  assert.equal(previewKind({ kind: 'image', streamUrl: '/x', _loadError: 'offline' }), 'error')
})

test('Controller image preview resilience contracts: 0-RTT image stream, request seq guard, and zero jump-back to project dir', async () => {
  const src = await readFile(join(process.cwd(), 'hub/web/src/controller.js'), 'utf8')
  assert.match(src, /if \(!isDemoMode && isImageFileName\(cleanRelPath\)\)/, 'Images must open directly via /fs/stream without blocking on /fs/read')
  assert.match(src, /const loadSeq = \+\+filePreviewLoadSeq;/, 'clickRealFileEntry must guard async transitions with a monotonic loadSeq')
  assert.match(src, /pinErrorPreview\(/, 'Failed or timed-out file reads must pin an in-place retry card instead of jumping back to directory')
  assert.match(src, /Date\.now\(\) - filePreviewLoading\.at > 35000/, 'reconcileFileLoading timeout must exceed Hub fast-FS timeout')
  assert.match(src, /onPreviewImageLoad/, 'Image preview must expose onload handler to clear loading skeleton')
  assert.match(src, /onPreviewImageError/, 'Image preview must expose onerror handler with backup fallback + auto-retry + manual reload')
  assert.match(src, /retryFilePreview/, 'Image & file previews must expose in-place reload handler')
})
