import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function loadVoiceController(fakeWin, fakeDoc, fakeNav) {
  const hookSource = await readFile(
    new URL('../../hub/web/src/hooks/useVoiceInput.ts', import.meta.url),
    'utf8',
  )
  const cleanJs = hookSource
    .replace(/export interface[\s\S]*?\n\}\n/, '')
    .replace(/export function /g, 'function ')
    .replace(/: any/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: void/g, '')
    .replace(/\?\s*:\s*VoiceControllerDeps/g, '')
    .replace(/ as [A-Za-z0-9_| <>]+/g, '')
    .replace(/\(window\)/g, 'window')

  const factory = new Function(
    'window',
    'document',
    'navigator',
    `${cleanJs}\nreturn {
      areAllSpeechResultsFinal,
      punctuateSpeechText,
      mergeSpeechResults,
      startHoldVoice,
      moveHoldVoice,
      endHoldVoice,
      cancelHoldVoice,
      toggleVoiceInput,
      stopVoiceInput,
      isVoiceRecording,
      isDictationActiveFor,
      flushVoiceInputBeforeSend,
    };`,
  )
  return factory(fakeWin, fakeDoc, fakeNav)
}

function createFakeDom() {
  const makeEl = (initialClasses = []) => {
    const classes = new Set(initialClasses)
    return {
      textContent: '',
      value: '',
      disabled: false,
      readOnly: false,
      focused: false,
      attrs: {},
      style: { display: 'none' },
      classes,
      classList: {
        add(...items) {
          for (const c of items) classes.add(c)
        },
        remove(...items) {
          for (const c of items) classes.delete(c)
        },
        toggle(c, force) {
          const next = force === undefined ? !classes.has(c) : Boolean(force)
          if (next) classes.add(c)
          else classes.delete(c)
        },
        contains(c) {
          return classes.has(c)
        },
      },
      setAttribute(k, v) {
        this.attrs[k] = v
      },
      focus() {
        this.focused = true
      },
      setSelectionRange() {},
    }
  }

  const els = {
    globalPromptInput: makeEl(['chat-input']),
    composerUnifiedCard: makeEl(['composer-unified-card']),
    chatVoiceBtn: makeEl(['voice-btn']),
    wechatHoldTalkBtn: makeEl(['wechat-hold-talk-btn']),
    wechatHoldTalkLabel: makeEl(),
    wechatVoiceOverlay: makeEl(['wechat-voice-overlay']),
    wechatOverlayTranscript: makeEl(['wechat-voice-transcript']),
    wechatOverlayStatus: makeEl(['wechat-voice-status-text']),
    wechatZoneCancel: makeEl(['wechat-voice-action-item']),
    wechatZoneEdit: makeEl(['wechat-voice-action-item']),
    chatVoiceHintBar: makeEl(['voice-hint-bar']),
    newTaskVoiceHintBar: makeEl(['voice-hint-bar']),
  }
  return els
}

test('voice-accuracy 1: mergeSpeechResults resolves cumulative homophone rescoring & N-best alternatives without duplicating clauses', async () => {
  const els = createFakeDom()
  const voice = await loadVoiceController(
    { innerWidth: 390, innerHeight: 844, addEventListener() {}, removeEventListener() {} },
    { visibilityState: 'visible', getElementById: id => els[id] || null },
    { language: 'zh-CN', maxTouchPoints: 5 },
  )

  // 1) Cumulative stream where earlier homophone is retroactively corrected as sentence grows
  assert.equal(
    voice.mergeSpeechResults([
      { isFinal: false, 0: { transcript: '先试试第一种让听' } },
      { isFinal: true, 0: { transcript: '先试试第一种让我听听行吧' } },
    ]),
    '先试试第一种让我听听行吧',
  )

  assert.equal(
    voice.mergeSpeechResults([
      { isFinal: true, 0: { transcript: '帮我查一下轨迹流动' } },
      { isFinal: true, 0: { transcript: '帮我查一下硅基流动的接口' } },
    ]),
    '帮我查一下硅基流动的接口',
  )

  // Leading 2-char homophone corrected in cumulative revision
  assert.equal(
    voice.mergeSpeechResults([
      { isFinal: false, 0: { transcript: '轨迹流动怎么配置' } },
      { isFinal: true, 0: { transcript: '硅基流动怎么配置呢' } },
    ]),
    '硅基流动怎么配置呢',
  )

  // Same-length interim -> final homophone correction
  assert.equal(
    voice.mergeSpeechResults([
      { isFinal: false, 0: { transcript: '帮我查一下轨迹流动' } },
      { isFinal: true, 0: { transcript: '帮我查一下硅基流动' } },
    ]),
    '帮我查一下硅基流动',
  )

  // 2) Anti-regression: two genuinely separate finalized parallel clauses MUST NOT be collapsed!
  assert.equal(
    voice.mergeSpeechResults([
      { isFinal: true, 0: { transcript: '帮我看看前端日志' } },
      { isFinal: true, 0: { transcript: '帮我看看后端日志' } },
    ]),
    '帮我看看前端日志，帮我看看后端日志',
  )

  // 3) N-best alternative confidence selection vs WebKit zero-confidence rank preservation
  assert.equal(
    voice.mergeSpeechResults([
      {
        isFinal: true,
        length: 2,
        0: { transcript: '帮我看下轨迹流动', confidence: 0.68 },
        1: { transcript: '帮我看下硅基流动', confidence: 0.92 },
      },
    ]),
    '帮我看下硅基流动',
  )

  assert.equal(
    voice.mergeSpeechResults([
      {
        isFinal: true,
        length: 2,
        0: { transcript: '来一小段就行', confidence: 0 },
        1: { transcript: '微段小碗', confidence: 0 },
      },
    ]),
    '来一小段就行',
  )
})

test('voice-accuracy 2: Hold-to-Talk waits past old 380ms cutoff for iOS/Android 620ms isFinal homophone correction, then sends immediately', async () => {
  const els = createFakeDom()
  let lastRec = null
  let stopCount = 0
  const sentPrompts = []

  const fakeWin = {
    innerWidth: 390,
    innerHeight: 844,
    webkitSpeechRecognition: class {
      constructor() {
        lastRec = this
      }
      start() {}
      stop() {
        stopCount += 1
      }
      abort() {}
    },
    addEventListener() {},
    removeEventListener() {},
  }
  const voice = await loadVoiceController(
    fakeWin,
    { visibilityState: 'visible', getElementById: id => els[id] || null },
    { language: 'zh-CN', maxTouchPoints: 5 },
  )
  const deps = {
    showToast() {},
    onComposerInput() {},
    sendPrompt() {
      sentPrompts.push(els.globalPromptInput.value)
    },
  }

  // User presses & speaks; before finger lift, mobile OS only emitted un-rescored phonetic interim draft
  assert.equal(voice.startHoldVoice(195, 800, deps), true)
  assert.equal(lastRec.maxAlternatives, 3)
  lastRec.onresult({
    results: [{ isFinal: false, 0: { transcript: '先试试第一种让听行吧不用太长微段小碗' } }],
  })

  // Finger lifts!
  const releasedAt = Date.now()
  voice.endHoldVoice(deps)
  assert.equal(stopCount, 1)
  assert.equal(els.wechatOverlayStatus.textContent, '正在发送…')

  // At +250ms: still interim tail syllable arriving
  await new Promise(r => setTimeout(r, 250))
  lastRec.onresult({
    results: [{ isFinal: false, 0: { transcript: '先试试第一种让我听听行吧不用太长来一小段' } }],
  })
  assert.equal(sentPrompts.length, 0)

  // At +430ms (past the old 380ms guillotine!): MUST NOT have prematurely sent the interim draft!
  await new Promise(r => setTimeout(r, 180))
  assert.equal(
    sentPrompts.length,
    0,
    'Must not cut off OS speech recognizer at 380ms while interim rescoring is still in flight',
  )

  // At +610ms: OS speech recognizer emits full-sentence neural LM rescored isFinal=true!
  // Even if Safari delays firing onend, the 60ms isFinal settle timer dispatches immediately (~670ms, well before 1200ms)
  await new Promise(r => setTimeout(r, 180))
  lastRec.onresult({
    results: [
      { isFinal: true, 0: { transcript: '先试试第一种让我听听行吧，不用太长，来一小段就行' } },
    ],
  })

  await new Promise(r => setTimeout(r, 95))
  const totalWaitMs = Date.now() - releasedAt
  assert.equal(sentPrompts.length, 1)
  assert.equal(sentPrompts[0], '先试试第一种让我听听行吧，不用太长，来一小段就行。')
  assert.ok(totalWaitMs < 950, `Expected immediate settle after isFinal, took ${totalWaitMs}ms`)
  assert.equal(els.wechatVoiceOverlay.style.display, 'none')
})

test('voice-accuracy 3: 25ms fast pause restart eliminates 150ms deaf gap, rapid back-to-back hold flushes msg #1, and direct Send flushes active dictation', async () => {
  const els = createFakeDom()
  let lastRec = null
  let startCount = 0
  const sentPrompts = []

  const fakeWin = {
    innerWidth: 390,
    innerHeight: 844,
    webkitSpeechRecognition: class {
      constructor() {
        lastRec = this
      }
      start() {
        startCount += 1
      }
      stop() {}
      abort() {}
    },
    addEventListener() {},
    removeEventListener() {},
  }
  const voice = await loadVoiceController(
    fakeWin,
    { visibilityState: 'visible', getElementById: id => els[id] || null },
    { language: 'zh-CN', maxTouchPoints: 5 },
  )
  const deps = {
    showToast() {},
    onComposerInput() {},
    sendPrompt() {
      sentPrompts.push(els.globalPromptInput.value)
      els.globalPromptInput.value = ''
    },
  }

  // A) Fast 25ms restart on breathing pause during Hold-to-Talk (no 150ms leading-syllable loss)
  voice.startHoldVoice(195, 800, deps)
  assert.equal(startCount, 1)
  lastRec.onresult({ results: [{ isFinal: true, 0: { transcript: '第一句说完了' } }] })
  lastRec.onend()
  await new Promise(r => setTimeout(r, 55))
  assert.equal(startCount, 2, 'Should restart within ~25ms after valid speech pause (<55ms)')
  lastRec.onresult({ results: [{ isFinal: true, 0: { transcript: '紧接着说第二句' } }] })

  // B) Rapid back-to-back hold: user lifts finger on msg #1 and immediately presses again 100ms later for msg #2
  voice.endHoldVoice(deps)
  await new Promise(r => setTimeout(r, 80))
  // Suppose Safari hasn't fired onend yet when user presses button again for msg #2:
  voice.startHoldVoice(195, 800, deps)
  assert.deepStrictEqual(
    sentPrompts,
    ['第一句说完了，紧接着说第二句。'],
    'Starting msg #2 while msg #1 is flushing must finalize & send msg #1 instead of dropping it',
  )
  lastRec.onresult({ results: [{ isFinal: true, 0: { transcript: '这是紧跟着的第二条语音' } }] })
  voice.endHoldVoice(deps)
  lastRec.onend()
  assert.deepStrictEqual(sentPrompts, [
    '第一句说完了，紧接着说第二句。',
    '这是紧跟着的第二条语音。',
  ])

  // C) Continuous dictation (toggleVoiceInput) + user taps Send directly while mic is still recording!
  els.globalPromptInput.value = ''
  voice.toggleVoiceInput('globalPromptInput', 'chatVoiceBtn', deps)
  assert.equal(voice.isDictationActiveFor('globalPromptInput'), true)
  const dictRec = lastRec
  dictRec.onresult({
    results: [{ isFinal: false, 0: { transcript: '为什么语音输入老把硅基写成轨迹' } }],
  })
  assert.equal(els.globalPromptInput.value, '为什么语音输入老把硅基写成轨迹')

  // User taps Send button -> flushVoiceInputBeforeSend calls stop() and awaits final LM correction
  const flushPromise = voice.flushVoiceInputBeforeSend('globalPromptInput')
  setTimeout(() => {
    dictRec.onresult({
      results: [{ isFinal: true, 0: { transcript: '为什么语音输入老把硅基流动写成轨迹流动' } }],
    })
    dictRec.onend()
  }, 480)

  await flushPromise
  assert.equal(voice.isVoiceRecording(), false)
  assert.equal(els.globalPromptInput.value, '为什么语音输入老把硅基流动写成轨迹流动？')
})
