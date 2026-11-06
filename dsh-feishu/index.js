import { readFile } from 'node:fs/promises'
import { AuditLog } from './lib/audit.js'
import { FeishuBridge } from './lib/bridge.js'
import { resolveConfig, loadSettings } from './lib/config.js'
import { acquireDaemonLock } from './lib/daemon-lock.js'
import { FeishuTransport } from './lib/feishu-transport.js'
import { HubAgent } from './lib/hub-agent.js'
import { safeError } from './lib/redact.js'

export const inject = ['agents']

async function readRemoteState(path) {
  if (!path) return null
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return null
  }
}

async function readControlChat(path) {
  if (!path) return ''
  try {
    return (await readFile(path, 'utf8')).trim()
  } catch {
    return ''
  }
}

/**
 * Host half of the Feishu bridge. The bundle is Host-only: it runs in the same
 * process as `dsh web` / Desktop, so it can see the live agents and answer approvals.
 * Optionally connects outbound to a Cloud Run Control Hub (`FEISHU_HUB_URL`) for
 * multi-computer switching, web-page control, and one-click snapshot migration.
 */
export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  if (!config.enabled) return

  const logger = ctx.logger
  const audit = new AuditLog(config.auditFile, logger)
  let bridge
  let transport
  let hubAgent
  let daemonLock = null
  let stopped = false

  const rawAgents = ctx.agents
  const agentsFacade = Object.create(rawAgents || {})
  agentsFacade.list = () => rawAgents?.list?.() ?? []
  agentsFacade.get = id => rawAgents?.get?.(id)
  agentsFacade.resolveOrResume = async id => {
    const existing = rawAgents?.get?.(id)
    if (existing) return existing
    try {
      const ctrl = ctx.get?.('sessionController')
      if (ctrl && typeof ctrl.resolveAgent === 'function') {
        const res = await ctrl.resolveAgent(id)
        if (res?.agent) return res.agent
      }
    } catch (err) {
      logger?.warn?.(`dsh-feishu: resolveOrResume(${id}) failed: ${safeError(err)}`)
    }
    return rawAgents?.get?.(id)
  }
  agentsFacade.createViaController = async ({ cwd, title }) => {
    try {
      const ctrl = ctx.get?.('sessionController')
      if (ctrl && typeof ctrl.create === 'function') {
        const res = await ctrl.create({ cwd })
        const sessionId = res?.sessionId || res?.id
        if (sessionId) {
          if (title && typeof ctrl.rename === 'function') {
            try {
              await ctrl.rename({ sessionId, title })
            } catch {}
          }
          const resolved = await agentsFacade.resolveOrResume(sessionId)
          if (resolved) return resolved
        }
      }
    } catch (err) {
      logger?.warn?.(`dsh-feishu: createViaController failed: ${safeError(err)}`)
    }
    return null
  }

  ctx.effect(() => {
    void (async () => {
      try {
        const settings = await loadSettings(config)
        const initialControlChat = await readControlChat(config.controlChatFile)
        const initialRemoteState = await readRemoteState(config.remoteStateFile)
        const effectiveConfig = {
          ...config,
          appId: settings.appId,
          allowedOpenIds: settings.allowedOpenIds,
          allowGroup: settings.allowGroup,
          tenantKey: settings.tenantKey,
          hostId: settings.hostId,
          hostName: settings.hostName,
          hubUrl: settings.hubUrl,
          hubToken: settings.hubToken,
          localWebPort: settings.localWebPort,
          dshHome: settings.dshHome,
        }
        if (settings.appId && settings.appSecret) {
          const candidate = new FeishuTransport({
            appId: settings.appId,
            appSecret: settings.appSecret,
            logger,
            onEvent: data => bridge?.handleEvent(data),
            onCardAction: data => bridge?.handleCardAction(data),
            onStatus: (status, detail) => {
              void audit.write('transport', { status, detail })
            },
          })
          if (stopped) {
            await candidate.stop()
            return
          }
          transport = candidate
        }
        bridge = new FeishuBridge({
          config: effectiveConfig,
          agents: agentsFacade,
          transport,
          audit,
          logger,
          initialControlChat,
          initialRemoteState,
        })
        if (transport) {
          await transport.start()
          bridge.startNotifier()
        }

        if (effectiveConfig.hubUrl) {
          try {
            daemonLock = await acquireDaemonLock({
              dshHome: effectiveConfig.dshHome,
              hostId: effectiveConfig.hostId,
              replace: true,
            })
          } catch {}
          hubAgent = new HubAgent({
            config: effectiveConfig,
            bridge,
            transport,
            audit,
            logger,
            bootId: daemonLock?.bootId,
            bootEpochMs: daemonLock?.startedAt || Date.now(),
          })
          hubAgent.start()
        }

        await audit.write('startup', {
          appId: settings.appId,
          hostId: effectiveConfig.hostId,
          hostName: effectiveConfig.hostName,
          hubUrl: effectiveConfig.hubUrl,
        })
        logger?.info?.(
          `dsh-feishu: bridge started for app ${settings.appId} on host ${effectiveConfig.hostName} (${effectiveConfig.hostId})`,
        )
      } catch (error) {
        await audit.write('startup_error', { error: safeError(error) })
        logger?.warn?.(`dsh-feishu: not started: ${safeError(error)}`)
      }
    })()

    return () => {
      stopped = true
      try {
        daemonLock?.release?.()
      } catch {}
      hubAgent?.stop()
      void bridge?.dispose()
      void transport?.stop()
    }
  }, 'dsh-feishu')

  // Prepend so remote mode can offer approval buttons in Feishu. When remote
  // mode is off, keep the normal Web answerer and only send a notice.
  ctx.on(
    'approval/request',
    (request, next) => {
      if (!bridge) return next()
      return bridge.onApproval(request, next)
    },
    { prepend: true },
  )
}
