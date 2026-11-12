import { readFile } from 'node:fs/promises'
import { AuditLog } from './lib/audit.js'
import { FeishuBridge } from './lib/bridge.js'
import { resolveConfig, loadSettings } from './lib/config.js'
import { acquireDaemonLock } from './lib/daemon-lock.js'
import { HubAgent } from './lib/hub-agent.js'
import { safeError } from './lib/redact.js'
import {
  consumePendingDshInteractionResponse,
  readPendingDshInteractionResponses,
} from './lib/workspace-ops.js'

export const name = 'dsh-remotecontrol'
export const inject = ['agents']

const ACTIVE_GUARD = Symbol.for('deepseekharness-remotecontrol.active')

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
  const rootCtx = ctx?.root && typeof ctx.root === 'object' ? ctx.root : null
  if (rootCtx && rootCtx[ACTIVE_GUARD]) {
    logger?.info?.(
      'dsh-remotecontrol: already active in this DSH process, skipping duplicate bundle entry',
    )
    return
  }
  if (rootCtx) {
    rootCtx[ACTIVE_GUARD] = true
  }

  const audit = new AuditLog(config.auditFile, logger)
  let bridge
  let transport
  let hubAgent
  let localHubHandle = null
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
      const wsRegistry = ctx.get?.('workspaceRegistry')
      let workspace = null
      if (wsRegistry && cwd) {
        try {
          workspace = (await wsRegistry.resolveByPath?.(cwd)) || (await wsRegistry.create?.(cwd))
        } catch {}
      }
      if (ctrl && typeof ctrl.create === 'function') {
        // sessionController.create accepts workspaceId OR cwd (not both),
        // and only attaches the session to the workspace sidebar when workspaceId is passed!
        const createReq = workspace?.id ? { workspaceId: workspace.id } : { cwd }
        const res = await ctrl.create(createReq)
        const sessionId = res?.sessionId || res?.id
        if (sessionId) {
          if (workspace && typeof workspace.attachSession === 'function') {
            try {
              await workspace.attachSession(sessionId)
            } catch {}
          }
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
  agentsFacade.answerUserQuestion = async (agentId, callId, answers, questions = []) => {
    try {
      const agent = (await agentsFacade.resolveOrResume(agentId)) || rawAgents?.get?.(agentId)
      if (!agent) return { ok: false, error: '找不到该 DSH 会话' }
      const uqService = ctx.get?.('userQuestions')
      if (uqService && typeof uqService.answer === 'function' && callId) {
        const answered = uqService.answer(agent, callId, { answers })
        if (answered) return { ok: true, mode: 'userQuestions-service' }
      }
      const payload = JSON.stringify({
        kind: 'answer_to_pending_question',
        tool: 'ask_user_question',
        callId: callId || '',
        questions: Array.isArray(questions) ? questions : [],
        answers: Array.isArray(answers) ? answers : [],
      })
      const msg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'user',
        source: { kind: 'user-question-reply', callId: callId || '', outcome: 'answered' },
        content: [{ type: 'text', text: payload }],
      }
      if (typeof agent.steer === 'function' && agent.status === 'running') {
        agent.steer(msg)
        return { ok: true, mode: 'steer-question-reply' }
      }
      if (typeof agent.followup === 'function') {
        agent.followup(msg)
        return { ok: true, mode: 'followup-question-reply' }
      }
    } catch (err) {
      logger?.warn?.(`dsh-feishu: answerUserQuestion failed: ${safeError(err)}`)
      return { ok: false, error: safeError(err) }
    }
    return { ok: false, error: '无法向该 DSH 会话发送选择回复' }
  }
  agentsFacade.reconcileLiveWorkspaceRegistry = async () => {
    try {
      const wsRegistry = ctx.get?.('workspaceRegistry')
      const persistence = ctx.get?.('sessionPersistence')
      if (!wsRegistry || !persistence || typeof persistence.list !== 'function') return
      const archivedSet = new Set(wsRegistry.archivedSessionIds || [])
      const snapshots = await persistence.list()
      for (const snap of snapshots || []) {
        const header = snap?.header
        if (!header?.id || !header?.cwd || header.origin === 'subagent') continue
        if (archivedSet.has(header.id)) continue
        const ws =
          (await wsRegistry.resolveByPath?.(header.cwd)) ||
          (await wsRegistry.create?.(header.cwd).catch(() => null))
        if (ws && Array.isArray(ws.sessionIds) && !ws.sessionIds.includes(header.id)) {
          try {
            await ws.attachSession(header.id)
          } catch {}
        }
      }
    } catch {}
  }

  let liveWsReconcileTimer = null
  ctx.effect(() => {
    void (async () => {
      try {
        void agentsFacade.reconcileLiveWorkspaceRegistry()
        liveWsReconcileTimer = setInterval(() => {
          void agentsFacade.reconcileLiveWorkspaceRegistry()
          void (async () => {
            if (!config?.dshHome) return
            const resps = await readPendingDshInteractionResponses(config.dshHome)
            for (const resp of resps) {
              if (!resp || !resp.agentId || !Array.isArray(resp.answers)) continue
              const inPendingWaterfall =
                bridge &&
                [...bridge.pending.values()].some(
                  e =>
                    !e.settled &&
                    (e.code === resp.code || (resp.callId && e.callId === resp.callId)),
                )
              if (inPendingWaterfall) continue
              const consumed = await consumePendingDshInteractionResponse(config.dshHome, {
                code: resp.code,
                callId: resp.callId,
                agentId: resp.agentId,
              })
              if (consumed && consumed.allow !== false) {
                await agentsFacade.answerUserQuestion(
                  consumed.agentId,
                  consumed.callId,
                  consumed.answers,
                  consumed.questions || [],
                )
              }
            }
          })()
        }, 1200)
        liveWsReconcileTimer.unref?.()
        const settings = await loadSettings(config, process.env, {
          allowZeroConfig: config.autoLocalHub !== false,
        })
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
          autoLocalHub: settings.autoLocalHub,
          localWebPort: settings.localWebPort,
          dshHome: settings.dshHome,
          enabledHarnesses: settings.enabledHarnesses,
        }
        if (!effectiveConfig.hubUrl && !settings.appId && effectiveConfig.autoLocalHub !== false) {
          const { startEmbeddedLocalHub } = await import('./lib/local-hub.js')
          const candidateHub = await startEmbeddedLocalHub({
            dshHome: effectiveConfig.dshHome,
            preferredPort: effectiveConfig.localWebPort || 8788,
            bindHost: rawConfig?.localBindHost || '0.0.0.0',
            explicitToken: effectiveConfig.hubToken,
            hostId: effectiveConfig.hostId,
            logger,
          })
          if (stopped) {
            await candidateHub.close()
            return
          }
          localHubHandle = candidateHub
          effectiveConfig.hubUrl = candidateHub.hubUrl
          effectiveConfig.hubToken = candidateHub.hubToken
        }
        if (settings.appId && settings.appSecret) {
          const { FeishuTransport } = await import('./lib/feishu-transport.js')
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
          localHubMode: Boolean(localHubHandle),
        })
        logger?.info?.(
          `dsh-feishu: bridge started for app ${settings.appId || '(local-hub)'} on host ${effectiveConfig.hostName} (${effectiveConfig.hostId})`,
        )
        if (typeof rawConfig?.onReady === 'function') {
          rawConfig.onReady({
            effectiveConfig,
            localHub: localHubHandle,
            hubAgent,
            bridge,
          })
        }
      } catch (error) {
        await audit.write('startup_error', { error: safeError(error) })
        logger?.warn?.(`dsh-feishu: not started: ${safeError(error)}`)
      }
    })()

    return () => {
      stopped = true
      if (rootCtx) {
        delete rootCtx[ACTIVE_GUARD]
      }
      if (liveWsReconcileTimer) {
        clearInterval(liveWsReconcileTimer)
        liveWsReconcileTimer = null
      }
      try {
        daemonLock?.release?.()
      } catch {}
      hubAgent?.stop()
      void bridge?.dispose()
      void transport?.stop()
      void localHubHandle?.close?.()
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

  ctx.on(
    'user-questions/request',
    (request, next) => {
      if (!bridge || typeof bridge.onUserQuestion !== 'function') return next()
      return bridge.onUserQuestion(request, next)
    },
    { prepend: true },
  )
}
