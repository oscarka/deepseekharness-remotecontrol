import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export async function resolveOrCreateLocalHubToken({ dshHome = '', explicitToken = '' } = {}) {
  const cleanExplicit = String(explicitToken || '').trim()
  if (cleanExplicit) {
    return { token: cleanExplicit, tokenFile: '' }
  }
  const baseDir = dshHome || join(homedir(), '.dsh')
  const tokenFile = join(baseDir, 'local-hub.token')
  try {
    const existing = (await readFile(tokenFile, 'utf8')).trim()
    if (existing.length >= 16) {
      return { token: existing, tokenFile }
    }
  } catch {
    // generate fresh local token below
  }
  const token = randomBytes(16).toString('hex')
  await mkdir(dirname(tokenFile), { recursive: true })
  await writeFile(tokenFile, `${token}\n`, { mode: 0o600 })
  return { token, tokenFile }
}

async function probeExistingLocalHub(port, token) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/state`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1200),
    })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    if (data?.ok === true) {
      return {
        ok: true,
        lanOrigins: Array.isArray(data.lanOrigins) ? data.lanOrigins : [],
      }
    }
  } catch {
    // port is owned by another service or unreachable
  }
  return { ok: false }
}

function listenOnce(server, port, host) {
  return new Promise(resolve => {
    const onListening = () => {
      server.removeListener('error', onError)
      const addr = server.address()
      const actualPort = typeof addr === 'object' && addr ? addr.port : port
      resolve({ ok: true, port: actualPort })
    }
    const onError = error => {
      server.removeListener('listening', onListening)
      resolve({ ok: false, error })
    }
    server.once('listening', onListening)
    server.once('error', onError)
    server.listen(port, host)
  })
}

export async function startEmbeddedLocalHub({
  dshHome = '',
  preferredPort = 8788,
  bindHost = '0.0.0.0',
  explicitToken = '',
  hostId = '',
  logger = console,
} = {}) {
  const [{ HubCore }, { createHubServer, detectLanOrigins }] = await Promise.all([
    import('../../hub/hub-core.js'),
    import('../../hub/server.js'),
  ])

  const homeDir = dshHome || join(homedir(), '.dsh')
  await mkdir(homeDir, { recursive: true })
  const { token, tokenFile } = await resolveOrCreateLocalHubToken({
    dshHome: homeDir,
    explicitToken,
  })
  const stateFile = join(homeDir, 'hub-state.json')
  const hub = new HubCore({ stateFile })
  await hub.init()

  const targetPort = Number.isInteger(preferredPort) && preferredPort > 0 ? preferredPort : 8788
  let { server: activeServer } = createHubServer({
    hub,
    token,
    requireToken: true,
    logger,
  })

  let attempt = await listenOnce(activeServer, targetPort, bindHost)
  if (!attempt.ok) {
    if (attempt.error?.code === 'EADDRINUSE' && targetPort > 0) {
      const existing = await probeExistingLocalHub(targetPort, token)
      if (existing.ok) {
        logger?.info?.(
          `dsh-remotecontrol: 复用本机已启动的本地总控台 http://localhost:${targetPort}`,
        )
        return {
          reused: true,
          hubUrl: `http://127.0.0.1:${targetPort}`,
          hubToken: token,
          port: targetPort,
          localUrl: `http://localhost:${targetPort}`,
          lanOrigins: existing.lanOrigins,
          pairCode: '',
          pairUrl: `http://localhost:${targetPort}`,
          localPairUrl: `http://localhost:${targetPort}`,
          tokenFile,
          stateFile,
          close: async () => {},
        }
      }
      activeServer = createHubServer({
        hub,
        token,
        requireToken: true,
        logger,
      }).server
      attempt = await listenOnce(activeServer, 0, bindHost)
    }
    if (!attempt.ok) {
      throw attempt.error || new Error('Failed to bind embedded local Hub server')
    }
  }

  activeServer.unref?.()
  const actualPort = attempt.port
  const lanOrigins = detectLanOrigins(actualPort)
  const pairing = hub.createPairingCode({
    hostId,
    ttlMs: 24 * 60 * 60 * 1000,
  })
  const localUrl = `http://localhost:${actualPort}`
  const primaryLan = lanOrigins[0] || localUrl
  const localPairUrl = `${localUrl}/?pair=${pairing.code}`
  const pairUrl = `${primaryLan}/?pair=${pairing.code}`

  try {
    await writeFile(
      join(homeDir, 'local-hub-info.json'),
      JSON.stringify(
        {
          port: actualPort,
          localUrl,
          lanOrigins,
          localPairUrl,
          pairUrl,
          tokenFile,
          stateFile,
          startedAt: Date.now(),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    )
  } catch {
    // ignore non-critical info file write failures
  }

  logger?.info?.(
    [
      `🚀 [DSH Remote Control] 零配置局域网总控台已就绪 (端口 ${actualPort})`,
      `   💻 电脑浏览器免密打开: ${localPairUrl}`,
      `   📱 手机连同一 Wi-Fi 扫码/直连: ${pairUrl}`,
      tokenFile ? `   🔑 本机管理密码文件: ${tokenFile}` : '   🔑 已使用自定义管理密码',
    ].join('\n'),
  )

  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    try {
      activeServer.closeAllConnections?.()
    } catch {}
    await new Promise(resolve => {
      try {
        activeServer.close(() => resolve())
      } catch {
        resolve()
      }
    })
  }

  return {
    reused: false,
    hub,
    server: activeServer,
    hubUrl: `http://127.0.0.1:${actualPort}`,
    hubToken: token,
    port: actualPort,
    localUrl,
    lanOrigins,
    pairCode: pairing.code,
    pairUrl,
    localPairUrl,
    tokenFile,
    stateFile,
    close,
  }
}

