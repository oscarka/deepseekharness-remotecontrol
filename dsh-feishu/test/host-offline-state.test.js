import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { HubCore } from '../../hub/hub-core.js'
import { isHostLiveOnline } from '../../hub/web/src/utils/session-labels.js'
import { isTriageEligibleSession, buildTriageCardViewModel } from '../../hub/web/src/triage-deck.js'

test('HubCore 1-minute offline detection: emits host_liveness transition at 60s, preserves 10-min offline queue, and broadcasts instant wake-up', () => {
  let nowMs = 1_795_200_000_000
  const hub = new HubCore({ now: () => nowMs })
  const events = []
  hub.onStateChange(evt => events.push(evt))

  // 1. Initial heartbeat marks host live online
  hub.handleHeartbeat({
    hostId: 'mac-air',
    hostName: 'cc的MacBook Air',
    platform: 'darwin',
    arch: 'arm64',
    bridgeState: {
      tasks: [{ id: 'sess-1', project: 'tibet-project', title: '西藏项目', status: 'running' }],
      approvals: [],
    },
  })
  assert.equal(hub.getFullState().hosts[0].online, true)
  assert.equal(hub.getFullState().hosts[0].activelyConnected, true)
  assert.equal(hub.getHostsSummary()[0].online, true)
  assert.equal(hub.getHostsSummary()[0].activelyConnected, true)

  // 2. At 55s still online — no transition
  nowMs += 55_000
  assert.equal(hub.checkHostLivenessTransitions(), false)
  assert.equal(hub.getFullState().hosts[0].online, true)

  // 3. Past 60s (1 minute) — flips offline & bumps stateSeq + fires host_liveness SSE event
  const seqBefore = hub.stateSeq
  nowMs += 6_000 // total 61s since last heartbeat
  assert.equal(hub.checkHostLivenessTransitions(), true)
  assert.equal(hub.stateSeq, seqBefore + 1)
  assert.equal(events[events.length - 1], 'host_liveness')
  const offlineState = hub.getFullState()
  assert.equal(offlineState.hosts[0].online, false)
  assert.equal(offlineState.hosts[0].activelyConnected, false)
  assert.equal(hub.getHostsSummary()[0].online, false)
  assert.equal(hub.getHostsSummary()[0].activelyConnected, false)

  // Second check while still offline must be a silent no-op (zero spam)
  assert.equal(hub.checkHostLivenessTransitions(), false)

  // 4. Sending a message while offline still queues for 10 minutes
  const queued = hub.queueCommand('mac-air', {
    type: 'prompt',
    agentId: 'sess-1',
    text: '上线后继续推进',
  })
  assert.equal(queued.ok, true)
  assert.equal(queued.command.queued, true)
  assert.equal(queued.command.expiresAt, nowMs + 10 * 60_000)

  // 5. Host wakes up with identical snapshot — livenessChanged triggers immediate broadcast back to online
  nowMs += 10_000
  const seqBeforeWake = hub.stateSeq
  hub.handleHeartbeat({
    hostId: 'mac-air',
    hostName: 'cc的MacBook Air',
    platform: 'darwin',
    arch: 'arm64',
    liteHeartbeat: true,
  })
  assert.ok(hub.stateSeq > seqBeforeWake, 'Wake-up heartbeat must emit state update immediately')
  assert.equal(hub.getFullState().hosts[0].online, true)
  assert.equal(hub.getFullState().hosts[0].activelyConnected, true)
})

test('isHostLiveOnline and Swipe Triage: offline approvals are excluded while unread conclusions remain readable with offline badge', () => {
  assert.equal(isHostLiveOnline({ online: true, activelyConnected: true }), true)
  assert.equal(isHostLiveOnline({ online: true, activelyConnected: false }), false)
  assert.equal(isHostLiveOnline({ online: false, activelyConnected: false }), false)
  assert.equal(isHostLiveOnline(null), false)

  // Offline approval must NOT surface in Swipe Triage deck
  assert.equal(
    isTriageEligibleSession({
      id: 'sess-app-off',
      status: 'approval',
      hostOnline: false,
      approvalObj: { code: 'AGY-1' },
    }),
    false,
  )
  // Online approval surfaces normally
  assert.equal(
    isTriageEligibleSession({
      id: 'sess-app-on',
      status: 'approval',
      hostOnline: true,
      approvalObj: { code: 'AGY-2' },
    }),
    true,
  )
  // Offline unread conclusion remains readable and displays offline subtitle badge (ZH & EN)
  const offlineConc = {
    id: 'sess-conc-off',
    hostId: 'mac-air',
    hostName: 'cc的MacBook Air',
    hostOnline: false,
    project: 'tibet-project',
    title: '西藏项目',
    status: 'idle',
    hasUnreadConclusion: true,
    transcript: [{ role: 'assistant', text: '任务已完成' }],
  }
  assert.equal(isTriageEligibleSession(offlineConc), true)
  const vmZh = buildTriageCardViewModel(offlineConc, { 'mac-air': 'Air' }, 'zh')
  const vmEn = buildTriageCardViewModel(offlineConc, { 'mac-air': 'Air' }, 'en')
  assert.match(vmZh.sub, /⚪ 电脑离线/)
  assert.match(vmEn.sub, /⚪ Offline/)
})

test('Web UI offline state contracts: in-place dimmed grey rows, chat offline banner, 10-min queue send button, and fixed host sheet subtitle', async () => {
  const ctrlSrc = await readFile(join(process.cwd(), 'hub/web/src/controller.js'), 'utf8')
  const stageSrc = await readFile(join(process.cwd(), 'hub/web/src/components/ChatStage.tsx'), 'utf8')
  const cssSrc = await readFile(join(process.cwd(), 'hub/web/src/styles/app.css'), 'utf8')

  assert.match(stageSrc, /id="chatOfflineBanner"/, 'ChatStage must provide dedicated #chatOfflineBanner slot')
  assert.match(ctrlSrc, /row-host-offline/, 'Session rows for offline hosts must apply in-place dimmed row-host-offline class')
  assert.match(ctrlSrc, /⚪ 离线 · 上次运行中/, 'Stale running rows on offline hosts must downgrade from green running badge to grey offline badge')
  assert.match(ctrlSrc, /⚪ 离线 · 待上线审批/, 'Stale approval rows on offline hosts must downgrade to grey offline badge')
  assert.match(ctrlSrc, /⏳ 排队发送/, 'Offline chat composer must label send button as 10-min queue send')
  assert.match(ctrlSrc, /sendBtn\.classList\.add\('offline-queue'\)/, 'Offline chat send button must use distinct offline-queue visual style')
  assert.match(ctrlSrc, /renderHostSheetList\(\)/, 'Host switcher sheet must refresh live and display both offline timestamp and Feishu primary badge')
  assert.match(cssSrc, /\.session-row\.row-host-offline/, 'CSS must define light & dark styling for .row-host-offline')
  assert.match(cssSrc, /\.chat-offline-banner/, 'CSS must define styling for .chat-offline-banner')
})
