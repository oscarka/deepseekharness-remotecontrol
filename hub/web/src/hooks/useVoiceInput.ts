// ---- 语音输入与微信式「按住说话 / 左滑取消 / 右滑改字」状态机 Controller ----
export interface VoiceControllerDeps {
  showToast: (msg: string) => void;
  onComposerInput: () => void;
  sendPrompt?: () => void;
}

let activeVoiceRecognition: any = null;
let activeVoiceInputId = '';
let activeVoiceBtnId = '';
let voiceSessionActive = false;
let voiceWatchdogTimer: any = null;
let voiceRestartTimer: any = null;
let voiceHintTimer: any = null;
let webSpeechServiceBlocked = false;

// ---- 微信式按住说话模式与手势状态 ----
let wechatVoiceMode = false;
let returnToVoiceAfterSend = false;
let holdActive = false;
let holdStopping = false;
let holdFinalized = false;
let holdZone = 'send'; // 'send' | 'cancel' | 'edit'
let holdStartY: any = 0;
let holdStartAt: any = 0;
let holdBaseDraft = '';
let holdCommittedText = '';
let holdRawChunkText = '';
let holdPauseBreakpoints: any = [];
let holdSpokenText = '';
let holdHadFatalError = false;
let holdFinalizeTimer: any = null;
let holdSettleTimer: any = null;
let holdLastResultWasFinal = false;
let holdLastResultAt: any = 0;
let voicePauseTimer: any = null;
let holdListenersBound = false;
let activeHoldDeps: any = null;
let dictationStopping = false;
let activeDictationFlushHandler: any = null;
let dictationFinalizeFn: any = null;
let dictationFinalizeResolve: any = null;
let dictationFinalizeTimer: any = null;
let dictationSettleTimer: any = null;

const CJK_CHAR_RE = /[\u4e00-\u9fa5]/;
const PUNCT_OR_SPACE_RE = /[，。！？、；：,.!?;:\s…~～—\-()（）[\]【】"'“”‘’]/;
const LEADING_PARTICLE_RE = /^[的了着过吗呢吧啊呀呗嘛嘞啦]/;

export function isChineseQuestionClause(clause: string): boolean {
  const s = String(clause || '').trim();
  if (!s || !CJK_CHAR_RE.test(s[s.length - 1])) return false;
  if (/[吗么]$/.test(s)) return true;
  if (/^(不管|无论|不论)/.test(s)) return false;
  if (/^(请|麻烦|你先|先)?(帮我|看看|看下|查查|查一下|查下|检查|排查|确认|统计|分析|测试)/.test(s)) {
    return /(好不好|行不行|对不对|可不可以|能不能)$/.test(s);
  }
  return /(为什么|怎么|怎樣|怎样|是不是|能不能|可不可以|行不行|好不好|对不对|有没有|要不要|会不会|算不算|哪里|哪儿|哪个|哪些|多少|几[个条次天秒分点]|什么|谁|咋)/.test(
    s
  );
}

function smartSeparatorBetween(leftText: string, rightText: string): string {
  const prevChar = leftText ? leftText[leftText.length - 1] : '';
  const nextChar = rightText ? rightText[0] : '';
  if (!prevChar || !nextChar) return '';
  if (
    PUNCT_OR_SPACE_RE.test(prevChar) ||
    PUNCT_OR_SPACE_RE.test(nextChar) ||
    LEADING_PARTICLE_RE.test(rightText)
  ) {
    return '';
  }
  if (CJK_CHAR_RE.test(prevChar) && CJK_CHAR_RE.test(nextChar)) {
    const lastClause = leftText.split(/[，。！？；,.!?;]/).pop() || leftText;
    return isChineseQuestionClause(lastClause) ? '？' : '，';
  }
  if (/[A-Za-z0-9]/.test(prevChar) && /[A-Za-z0-9]/.test(nextChar)) {
    return ' ';
  }
  if (
    (CJK_CHAR_RE.test(prevChar) && /[A-Za-z0-9]/.test(nextChar)) ||
    (/[A-Za-z0-9]/.test(prevChar) && CJK_CHAR_RE.test(nextChar))
  ) {
    return ' ';
  }
  return '';
}

export function punctuateSpeechText(
  rawText: string,
  pauseBreakpoints: any = null,
  options: any = null
): string {
  const raw = String(rawText || '');
  if (!raw) return '';
  const showTrailingPause = Boolean(options?.showTrailingPause);
  const finalizeSentence = Boolean(options?.finalizeSentence);

  // 1. 根据用户说话时的真实停顿（>=650ms）补齐分句标点（兼容苹果语音对断点前 1~2 个同音字的修正）
  const validCuts: any = [];
  if (Array.isArray(pauseBreakpoints)) {
    for (let i = 0; i < pauseBreakpoints.length; i += 1) {
      const bp = pauseBreakpoints[i];
      const len = Number(bp?.len) || 0;
      const head = String(bp?.head || '');
      if (len < 2 || len > raw.length) continue;
      if (head && raw.slice(0, head.length) !== head) continue;
      if (len < raw.length) {
        validCuts.push(len);
      } else if (len === raw.length && showTrailingPause && !finalizeSentence) {
        validCuts.push(len);
      }
    }
  }
  validCuts.sort((a: any, b: any) => a - b);

  let stitched = '';
  let lastIdx = 0;
  for (let i = 0; i < validCuts.length; i += 1) {
    const cut = validCuts[i];
    if (cut <= lastIdx) continue;
    stitched += raw.slice(lastIdx, cut);
    const nextRest = raw.slice(cut);
    if (nextRest) {
      stitched += smartSeparatorBetween(stitched, nextRest);
    } else if (showTrailingPause && !finalizeSentence) {
      const prevChar = stitched[stitched.length - 1] || '';
      if (CJK_CHAR_RE.test(prevChar) && !PUNCT_OR_SPACE_RE.test(prevChar)) {
        const lastClause = stitched.split(/[，。！？；,.!?;]/).pop() || stitched;
        stitched += isChineseQuestionClause(lastClause) ? '？' : '，';
      }
    }
    lastIdx = cut;
  }
  if (lastIdx < raw.length) {
    stitched += raw.slice(lastIdx);
  }

  // 2. 连读未停顿的中文疑问分句自动断句（如「不会有标点符号吗帮我查一下呗」→「不会有标点符号吗？帮我查一下呗」）
  stitched = stitched.replace(
    /([\u4e00-\u9fa5]{3,}吗)(?![啡丁了呢啊呀吧呗嘛的，。！？、；：,.!?;:\s])(?=[\u4e00-\u9fa5]{2,})/g,
    '$1？'
  );

  // 3. 松手收尾时：去掉悬空尾逗号，并为疑问句或多分句/长句补齐句末问号/句号
  if (finalizeSentence) {
    stitched = stitched.replace(/[，、]+$/, '');
    const trimmed = stitched.trim();
    const tailChar = trimmed[trimmed.length - 1] || '';
    if (trimmed && CJK_CHAR_RE.test(tailChar) && !PUNCT_OR_SPACE_RE.test(tailChar)) {
      const lastClause = trimmed.split(/[，。！？；,.!?;]/).pop() || trimmed;
      if (isChineseQuestionClause(lastClause)) {
        stitched = trimmed + '？';
      } else if (/[，。！？；]/.test(trimmed) || trimmed.length >= 10) {
        stitched = trimmed + '。';
      }
    }
  }

  return stitched;
}

function pickBestAlternative(resultItem: any): string {
  if (!resultItem) return '';
  const alt0 = resultItem[0];
  let bestText = String(alt0?.transcript || '');
  let bestConf = Number(alt0?.confidence) || 0;
  const maxCheck = Math.min(4, Math.max(Number(resultItem?.length) || 0, 4));
  for (let k = 1; k < maxCheck; k += 1) {
    const cand = resultItem[k];
    if (!cand) continue;
    const candText = String(cand?.transcript || '');
    if (!candText.trim()) continue;
    if (!bestText.trim()) {
      bestText = candText;
      bestConf = Number(cand?.confidence) || 0;
      continue;
    }
    const candConf = Number(cand?.confidence) || 0;
    if (Boolean(resultItem?.isFinal) && bestConf > 0 && candConf > bestConf + 0.01) {
      bestText = candText;
      bestConf = candConf;
    }
  }
  return bestText;
}

export function areAllSpeechResultsFinal(results: any): boolean {
  const total = results ? results.length : 0;
  let hasAnyText = false;
  for (let i = 0; i < total; i += 1) {
    const seg = pickBestAlternative(results[i]);
    if (!seg.trim()) continue;
    hasAnyText = true;
    if (!results[i]?.isFinal) {
      return false;
    }
  }
  return hasAnyText;
}

function commonPrefixLength(a: string, b: string): any {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
}

function longestCommonSubstringLength(a: string, b: string): any {
  if (!a || !b) return 0;
  const s1 = a.slice(0, 160);
  const s2 = b.slice(0, 160);
  const prev: any = new Array(s2.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= s1.length; i += 1) {
    for (let j = s2.length; j >= 1; j -= 1) {
      if (s1[i - 1] === s2[j - 1]) {
        prev[j] = prev[j - 1] + 1;
        if (prev[j] > best) best = prev[j];
      } else {
        prev[j] = 0;
      }
    }
  }
  return best;
}

function longestCommonSubsequenceLength(a: string, b: string): any {
  if (!a || !b) return 0;
  const s1 = a.slice(0, 160);
  const s2 = b.slice(0, 160);
  const dp: any = new Array(s2.length + 1).fill(0);
  for (let i = 1; i <= s1.length; i += 1) {
    let prevDiag = 0;
    for (let j = 1; j <= s2.length; j += 1) {
      const temp = dp[j];
      if (s1[i - 1] === s2[j - 1]) {
        dp[j] = prevDiag + 1;
      } else if (dp[j - 1] > dp[j]) {
        dp[j] = dp[j - 1];
      }
      prevDiag = temp;
    }
  }
  return dp[s2.length];
}

function isCumulativeReplacement(acc: string, seg: string, prevWasInterim: boolean): boolean {
  const l1 = acc.length;
  const l2 = seg.length;
  if (l1 < 4 || l2 < 4 || l2 < l1 - 1) return false;
  if (!prevWasInterim && l2 < l1 + 2) return false;
  const segHead = seg.slice(0, Math.min(l2, l1 + 4));
  const prefLen = commonPrefixLength(acc, segHead);
  const subLen = longestCommonSubstringLength(acc, segHead);
  if (prefLen < 3 && !(prefLen >= 2 && subLen >= 3) && subLen < 4) return false;
  const lcsLen = longestCommonSubsequenceLength(acc, segHead);
  if (lcsLen / l1 < 0.72) return false;
  if (l2 <= l1 + 1) {
    const tailMatches = acc[l1 - 1] === segHead[segHead.length - 1];
    return (prefLen >= 2 && tailMatches) || subLen >= 5 || lcsLen / l1 >= 0.85;
  }
  return true;
}

export function mergeSpeechResults(results: any): string {
  const total = results ? results.length : 0;
  let acc = '';
  let lastNonEmptyWasInterim = false;
  for (let i = 0; i < total; i += 1) {
    const seg = pickBestAlternative(results[i]);
    if (!seg) continue;
    if (!acc) {
      acc = seg;
    } else if (seg.startsWith(acc)) {
      // 兼容移动端 WebKit / Android 在 continuous=true 下返回累积前缀片段，避免重复叠字
      acc = seg;
    } else if (isCumulativeReplacement(acc, seg, lastNonEmptyWasInterim)) {
      // 兼容系统语音引擎在累积流中回溯修正前文同音字（如「轨迹流动」→「硅基流动的接口」），防止错句与正句重复拼接
      acc = seg;
    } else if (acc.endsWith(seg) && seg.length >= 2) {
      // 忽略完全相同的尾段回放
    } else {
      let overlap = 0;
      const maxK = Math.min(acc.length, seg.length);
      for (let k = maxK; k >= 4; k -= 1) {
        if (acc.slice(acc.length - k) === seg.slice(0, k)) {
          overlap = k;
          break;
        }
      }
      if (overlap > 0) {
        acc += seg.slice(overlap);
      } else {
        acc += smartSeparatorBetween(acc, seg) + seg;
      }
    }
    lastNonEmptyWasInterim = results[i]?.isFinal === false;
  }
  return acc;
}

export function joinDraftAndSpeech(draft: string, speech: string): string {
  const d = String(draft || '').trim();
  const s = String(speech || '').trim();
  if (!d) return s;
  if (!s) return d;
  return d + smartSeparatorBetween(d, s) + s;
}

export function computeHoldZone(
  clientX: any,
  clientY: any,
  viewportWidth: any,
  viewportHeight: any,
  startY: any
): string {
  const vw = Number(viewportWidth) || 390;
  const vh = Number(viewportHeight) || 844;
  const sy = Number(startY) || vh - 52;
  const x = Number(clientX) || 0;
  const y = Number(clientY) || 0;
  const dy = sy - y;
  // 手指仍在底部按住条附近：始终为「松开立即发送」，横向微移不会误取消
  if (dy < 54 && y > vh - 116) {
    return 'send';
  }
  // 手指上滑进入操作区：左半屏「取消」，右半屏「转文字改字」
  return x < vw * 0.5 ? 'cancel' : 'edit';
}

function resolveSpeechLang(): string {
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  const rawLang = String(nav?.language || '').toLowerCase();
  let preferEn = false;
  try {
    preferEn =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('dsh_lang_pref') === 'en' &&
      rawLang.startsWith('en');
  } catch { }
  return preferEn
    ? String(nav.language)
    : rawLang.startsWith('zh-tw') || rawLang.startsWith('zh-hant')
      ? 'zh-TW'
      : rawLang.startsWith('zh-hk')
        ? 'zh-HK'
        : 'zh-CN';
}

function resolveHintBarId(targetInputId: string): string {
  return targetInputId === 'newTaskInput' ? 'newTaskVoiceHintBar' : 'chatVoiceHintBar';
}

export function hideVoiceHintBar(targetInputId = ''): void {
  if (voiceHintTimer) {
    clearTimeout(voiceHintTimer);
    voiceHintTimer = null;
  }
  const ids = targetInputId
    ? [resolveHintBarId(targetInputId)]
    : ['chatVoiceHintBar', 'newTaskVoiceHintBar'];
  for (let i = 0; i < ids.length; i += 1) {
    const bar = document.getElementById(ids[i]);
    if (bar) {
      bar.style.display = 'none';
      bar.classList.remove('recording', 'fallback');
      bar.textContent = '';
    }
  }
}

function showVoiceHintBar(targetInputId: string, msg: string, mode: string, autoHideMs: any): void {
  if (voiceHintTimer) {
    clearTimeout(voiceHintTimer);
    voiceHintTimer = null;
  }
  const bar = document.getElementById(resolveHintBarId(targetInputId));
  if (!bar) return;
  bar.textContent = msg;
  bar.classList.remove('recording', 'fallback');
  bar.classList.add(mode === 'recording' ? 'recording' : 'fallback');
  bar.style.display = 'flex';
  if (autoHideMs) {
    voiceHintTimer = setTimeout(() => {
      if (bar.classList.contains('fallback')) {
        bar.style.display = 'none';
      }
    }, autoHideMs);
  }
}

function focusInputWithVisualPulse(input: any, targetInputId: string, hintMsg: string, showToast: any): void {
  try {
    const alreadyFocused =
      typeof document !== 'undefined' && document && document.activeElement === input;
    if (!alreadyFocused) {
      if (typeof input.focus === 'function') {
        input.focus();
      }
      const len = String(input.value || '').length;
      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(len, len);
      }
    }
  } catch { }
  try {
    const card = input.closest ? input.closest('.composer-unified-card') || input : input;
    if (card && card.classList) {
      card.classList.remove('composer-voice-flash');
      card.classList.add('composer-voice-flash');
      setTimeout(() => {
        try {
          card.classList.remove('composer-voice-flash');
        } catch { }
      }, 900);
    }
  } catch { }
  showVoiceHintBar(targetInputId, hintMsg, 'fallback', 6500);
  showToast(hintMsg);
}

export function setVoiceBtnRecording(btnId: string, recording: boolean): void {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('recording', Boolean(recording));
  btn.setAttribute('aria-pressed', recording ? 'true' : 'false');
  if (btn.classList.contains('mode-toggle-btn')) {
    btn.textContent = wechatVoiceMode ? '⌨️ 打字' : '🎙️ 语音';
  } else if (btn.classList.contains('voice-pill-btn')) {
    btn.textContent = recording ? '⏹ 停止听写' : '🎤 语音输入';
  } else if (btn.id === 'newTaskVoiceBtn' || btn.classList.contains('new-task-tool-btn')) {
    btn.textContent = recording ? '⏹ 停止' : '🎤 语音';
  } else {
    btn.textContent = recording ? '⏹' : '🎤';
  }
}

export function isVoiceRecording(): boolean {
  return Boolean(
    holdActive ||
      holdStopping ||
      dictationStopping ||
      voiceSessionActive ||
      activeVoiceRecognition ||
      activeVoiceBtnId
  );
}

export function isWechatVoiceMode(): boolean {
  return wechatVoiceMode;
}

export function consumeReturnToVoiceAfterSend(): boolean {
  const shouldReturn = returnToVoiceAfterSend;
  returnToVoiceAfterSend = false;
  return shouldReturn;
}

export function syncWechatHoldBtnState(): void {
  if (typeof document === 'undefined' || !document) return;
  const input: any = document.getElementById('globalPromptInput');
  const holdBtn: any = document.getElementById('wechatHoldTalkBtn');
  const holdLabel: any = document.getElementById('wechatHoldTalkLabel');
  if (!holdBtn) return;

  const isLocked = Boolean(input && (input.disabled || input.readOnly));
  const ph = String(input?.placeholder || '');

  if (holdActive || holdStopping) {
    holdBtn.classList.add('holding');
    holdBtn.classList.remove('is-disabled');
    if (holdLabel) {
      if (holdZone === 'cancel') {
        holdLabel.textContent = '🔴 松开 取消发送';
      } else if (holdZone === 'edit') {
        holdLabel.textContent = '🔵 松开 填入输入框改字';
      } else {
        holdLabel.textContent = '🟢 松开 立即发送';
      }
    }
    return;
  }

  holdBtn.classList.remove('holding');
  if (isLocked) {
    holdBtn.classList.add('is-disabled');
    if (holdLabel) {
      holdLabel.textContent = ph.includes('观察')
        ? '👀 当前为观察模式（仅查看）'
        : '⏳ AI 执行中（暂不可说话）';
    }
  } else {
    holdBtn.classList.remove('is-disabled');
    if (holdLabel) {
      holdLabel.textContent = ph.includes('插话') ? '🎙️ 按住 说话（实时插话）' : '🎙️ 按住 说话';
    }
  }
}

function updateWechatOverlayUI(): void {
  if (typeof document === 'undefined' || !document) return;
  const overlay: any = document.getElementById('wechatVoiceOverlay');
  if (overlay) {
    const visible = Boolean(holdActive || holdStopping);
    overlay.style.display = visible ? 'flex' : 'none';
    if (visible) {
      overlay.classList.remove('zone-send', 'zone-cancel', 'zone-edit');
      overlay.classList.add(
        holdZone === 'cancel' ? 'zone-cancel' : holdZone === 'edit' ? 'zone-edit' : 'zone-send'
      );
      const cancelEl = document.getElementById('wechatZoneCancel');
      const editEl = document.getElementById('wechatZoneEdit');
      if (cancelEl) cancelEl.classList.toggle('active', holdZone === 'cancel');
      if (editEl) editEl.classList.toggle('active', holdZone === 'edit');

      const trEl = document.getElementById('wechatOverlayTranscript');
      if (trEl) {
        const liveText = joinDraftAndSpeech(holdBaseDraft, holdSpokenText);
        if (liveText) {
          trEl.textContent = liveText;
          trEl.classList.remove('is-placeholder');
        } else {
          trEl.textContent = '正在听你说话…';
          trEl.classList.add('is-placeholder');
        }
      }

      const statusEl = document.getElementById('wechatOverlayStatus');
      if (statusEl) {
        if (holdStopping) {
          statusEl.textContent = holdZone === 'edit' ? '正在转文字…' : '正在发送…';
        } else if (holdZone === 'cancel') {
          statusEl.textContent = '松开手指，取消发送';
        } else if (holdZone === 'edit') {
          statusEl.textContent = '松开手指，填入输入框修改';
        } else {
          statusEl.textContent = '松开 立即发送';
        }
      }
    }
  }
  syncWechatHoldBtnState();
}

export function setWechatVoiceMode(enabled: boolean, persist = true, focusText = false): void {
  wechatVoiceMode = Boolean(enabled);
  if (persist) {
    returnToVoiceAfterSend = false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dsh_voice_mode', wechatVoiceMode ? '1' : '0');
      }
    } catch { }
  }
  if (!wechatVoiceMode && (holdActive || holdStopping)) {
    cancelHoldVoice();
  }
  if (wechatVoiceMode && voiceSessionActive && !holdActive) {
    stopVoiceInput();
  }

  if (typeof document !== 'undefined' && document) {
    const card = document.getElementById('composerUnifiedCard');
    if (card && card.classList) {
      card.classList.toggle('wechat-voice-mode', wechatVoiceMode);
    }
    const modeBtn = document.getElementById('chatVoiceBtn');
    if (modeBtn && modeBtn.classList && modeBtn.classList.contains('mode-toggle-btn')) {
      modeBtn.textContent = wechatVoiceMode ? '⌨️ 打字' : '🎙️ 语音';
      modeBtn.setAttribute('aria-pressed', wechatVoiceMode ? 'true' : 'false');
      modeBtn.setAttribute(
        'title',
        wechatVoiceMode ? '切换为键盘打字输入' : '切换为微信式按住说话'
      );
      modeBtn.setAttribute(
        'aria-label',
        wechatVoiceMode ? '切换为键盘打字输入' : '切换为微信式按住说话'
      );
    }
    syncWechatHoldBtnState();

    if (!wechatVoiceMode && focusText) {
      const input: any = document.getElementById('globalPromptInput');
      if (input) {
        try {
          if (typeof input.focus === 'function') input.focus();
          const len = String(input.value || '').length;
          if (typeof input.setSelectionRange === 'function') {
            input.setSelectionRange(len, len);
          }
        } catch { }
        const win: any = typeof window !== 'undefined' ? window : null;
        if (win && typeof win.autoGrowComposer === 'function') {
          win.autoGrowComposer();
        }
      }
    }
  }
}

export function toggleWechatVoiceMode(): void {
  const switchingToText = wechatVoiceMode;
  setWechatVoiceMode(!wechatVoiceMode, true, switchingToText);
}

export function initWechatVoiceMode(): void {
  let saved: any = null;
  try {
    if (typeof localStorage !== 'undefined') {
      saved = localStorage.getItem('dsh_voice_mode');
    }
  } catch { }

  let preferVoice = false;
  if (saved === '1') {
    preferVoice = true;
  } else if (saved === '0') {
    preferVoice = false;
  } else {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    const win: any = typeof window !== 'undefined' ? window : null;
    const isTouchPhone =
      Boolean(nav && Number(nav.maxTouchPoints) > 0) &&
      Boolean(win && (Number(win.innerWidth) || 390) <= 820);
    preferVoice = isTouchPhone;
  }

  const input: any =
    typeof document !== 'undefined' && document
      ? document.getElementById('globalPromptInput')
      : null;
  const hasUnsentDraft = Boolean(input && String(input.value || '').trim().length > 0);
  if (hasUnsentDraft && preferVoice) {
    returnToVoiceAfterSend = true;
    setWechatVoiceMode(false, false, false);
  } else {
    setWechatVoiceMode(preferVoice, false, false);
  }
}

function handleWindowTouchMove(e: any): void {
  if (!holdActive) return;
  if (e && typeof e.preventDefault === 'function') {
    try {
      e.preventDefault();
    } catch { }
  }
  const t = e?.touches?.[0] || e?.changedTouches?.[0];
  if (t) {
    moveHoldVoice(t.clientX, t.clientY);
  }
}

function handleWindowTouchEnd(e: any): void {
  if (!holdActive) return;
  const t = e?.changedTouches?.[0];
  if (t) {
    moveHoldVoice(t.clientX, t.clientY);
  }
  endHoldVoice();
}

function handleWindowTouchCancel(): void {
  if (!holdActive) return;
  cancelHoldVoice();
}

function handleWindowMouseMove(e: any): void {
  if (!holdActive) return;
  if (e) {
    moveHoldVoice(e.clientX, e.clientY);
  }
}

function handleWindowMouseUp(e: any): void {
  if (!holdActive) return;
  if (e) {
    moveHoldVoice(e.clientX, e.clientY);
  }
  endHoldVoice();
}

function handleWindowBlur(): void {
  if (holdActive || holdStopping) {
    cancelHoldVoice();
  }
}

function attachHoldWindowListeners(): void {
  if (holdListenersBound || typeof window === 'undefined' || !window.addEventListener) return;
  holdListenersBound = true;
  try {
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleWindowTouchCancel);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('blur', handleWindowBlur);
  } catch { }
}

function detachHoldWindowListeners(): void {
  if (!holdListenersBound || typeof window === 'undefined' || !window.removeEventListener) return;
  holdListenersBound = false;
  try {
    window.removeEventListener('touchmove', handleWindowTouchMove);
    window.removeEventListener('touchend', handleWindowTouchEnd);
    window.removeEventListener('touchcancel', handleWindowTouchCancel);
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    window.removeEventListener('blur', handleWindowBlur);
  } catch { }
}

function forceAbortActiveRecognition(): void {
  const rec = activeVoiceRecognition;
  activeVoiceRecognition = null;
  if (rec) {
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
    } catch { }
    try {
      rec.abort();
    } catch { }
    try {
      rec.stop();
    } catch { }
  }
}

export function stopVoiceInput(): void {
  voiceSessionActive = false;
  holdActive = false;
  holdStopping = false;
  holdFinalized = true;
  dictationStopping = false;
  activeDictationFlushHandler = null;
  dictationFinalizeFn = null;
  const pendingResolve = dictationFinalizeResolve;
  dictationFinalizeResolve = null;
  detachHoldWindowListeners();
  if (voicePauseTimer) {
    clearTimeout(voicePauseTimer);
    voicePauseTimer = null;
  }
  if (holdSettleTimer) {
    clearTimeout(holdSettleTimer);
    holdSettleTimer = null;
  }
  if (holdFinalizeTimer) {
    clearTimeout(holdFinalizeTimer);
    holdFinalizeTimer = null;
  }
  if (dictationSettleTimer) {
    clearTimeout(dictationSettleTimer);
    dictationSettleTimer = null;
  }
  if (dictationFinalizeTimer) {
    clearTimeout(dictationFinalizeTimer);
    dictationFinalizeTimer = null;
  }
  if (voiceRestartTimer) {
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer = null;
  }
  if (voiceWatchdogTimer) {
    clearTimeout(voiceWatchdogTimer);
    voiceWatchdogTimer = null;
  }
  const btnId = activeVoiceBtnId;
  activeVoiceInputId = '';
  activeVoiceBtnId = '';

  // 先恢复所有语音按钮 UI 状态与录音提示条，确保即使底层 WebKit onend 卡死，界面也立即解除锁定
  if (btnId) setVoiceBtnRecording(btnId, false);
  setVoiceBtnRecording('chatVoiceBtn', false);
  setVoiceBtnRecording('newTaskVoiceBtn', false);
  hideVoiceHintBar();
  updateWechatOverlayUI();

  // 必须先解绑回调再调用 abort() + stop()，防止残留音频帧写回输入框或 iOS 麦克风红点常亮
  forceAbortActiveRecognition();
  if (pendingResolve) {
    pendingResolve();
  }
}

function finalizeHoldSession(): void {
  if (holdFinalized) return;
  holdFinalized = true;
  if (voicePauseTimer) {
    clearTimeout(voicePauseTimer);
    voicePauseTimer = null;
  }
  if (holdSettleTimer) {
    clearTimeout(holdSettleTimer);
    holdSettleTimer = null;
  }
  if (holdFinalizeTimer) {
    clearTimeout(holdFinalizeTimer);
    holdFinalizeTimer = null;
  }
  if (voiceRestartTimer) {
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer = null;
  }
  if (voiceWatchdogTimer) {
    clearTimeout(voiceWatchdogTimer);
    voiceWatchdogTimer = null;
  }

  const finalZone = holdZone;
  const finalizedChunk = holdRawChunkText
    ? punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, { finalizeSentence: false })
    : '';
  const combinedRaw = finalizedChunk
    ? holdCommittedText
      ? joinDraftAndSpeech(holdCommittedText, finalizedChunk)
      : finalizedChunk
    : holdSpokenText;
  const spoken = String(
    punctuateSpeechText(combinedRaw, null, { finalizeSentence: true })
  ).trim();
  const baseDraft = holdBaseDraft;
  const durationMs = Date.now() - holdStartAt;
  const hadFatal = holdHadFatalError;
  const deps = activeHoldDeps;

  voiceSessionActive = false;
  holdActive = false;
  holdStopping = false;
  activeHoldDeps = null;
  detachHoldWindowListeners();
  forceAbortActiveRecognition();
  updateWechatOverlayUI();

  const win: any = typeof window !== 'undefined' ? window : null;
  const showToast = deps?.showToast || (win && win.showToast ? win.showToast : () => { });
  const onComposerInput =
    deps?.onComposerInput || (win && win.onComposerInput ? win.onComposerInput : () => { });
  const sendPrompt =
    deps?.sendPrompt ||
    (win && win.sendPromptToActiveSession ? win.sendPromptToActiveSession : () => { });
  const input: any =
    typeof document !== 'undefined' && document
      ? document.getElementById('globalPromptInput')
      : null;

  if (!spoken) {
    if (input) input.value = baseDraft;
    if (!hadFatal && durationMs >= 450) {
      showToast('🎙️ 未听到说话内容，请按住重试');
    }
    return;
  }

  const mergedText = joinDraftAndSpeech(baseDraft, spoken);

  if (finalZone === 'edit') {
    if (input) {
      input.value = mergedText;
    }
    returnToVoiceAfterSend = true;
    setWechatVoiceMode(false, false, true);
    onComposerInput();
    showToast('✍️ 已转为文字，修改后点「发送」即可');
    return;
  }

  if (input) {
    input.value = mergedText;
  }
  onComposerInput();
  sendPrompt();
}

export function startHoldVoice(startX: any, startY: any, deps?: VoiceControllerDeps): boolean {
  const win: any = typeof window !== 'undefined' ? window : null;
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  const showToast = deps?.showToast || (win && win.showToast ? win.showToast : () => { });
  const input: any =
    typeof document !== 'undefined' && document
      ? document.getElementById('globalPromptInput')
      : null;
  if (!input) return false;

  if (input.disabled || input.readOnly) {
    const disabledMsg = '⏳ 当前会话正在执行或为观察模式，暂不可说话';
    showToast(disabledMsg);
    return false;
  }

  const SpeechRecognitionCtor = win && (win.SpeechRecognition || win.webkitSpeechRecognition);
  if (!SpeechRecognitionCtor || webSpeechServiceBlocked) {
    const fallbackMsg = webSpeechServiceBlocked
      ? '🎙️ 桌面图标模式受苹果限制无法按住说话：请用 Safari 打开，或点键盘右下角「🎤」说话'
      : '🎙️ 当前浏览器不支持直接语音识别，已切回键盘，请用键盘「🎤」说话';
    setWechatVoiceMode(false, false, true);
    focusInputWithVisualPulse(input, 'globalPromptInput', fallbackMsg, showToast);
    return false;
  }

  if (holdStopping && !holdFinalized) {
    finalizeHoldSession();
  }
  if (voiceSessionActive || activeVoiceRecognition || holdActive) {
    stopVoiceInput();
  }

  const vh = Number(win?.innerHeight) || 844;
  holdActive = true;
  holdStopping = false;
  holdFinalized = false;
  holdZone = 'send';
  holdStartY = Number(startY) || vh - 52;
  holdStartAt = Date.now();
  holdBaseDraft = String(input.value || '').trim();
  holdCommittedText = '';
  holdRawChunkText = '';
  holdPauseBreakpoints = [];
  holdSpokenText = '';
  holdHadFatalError = false;
  holdLastResultWasFinal = false;
  holdLastResultAt = 0;
  activeHoldDeps = deps || null;
  voiceSessionActive = true;
  activeVoiceInputId = 'globalPromptInput';

  try {
    if (nav && typeof nav.vibrate === 'function') {
      nav.vibrate(12);
    }
  } catch { }

  attachHoldWindowListeners();
  updateWechatOverlayUI();

  const resolvedLang = resolveSpeechLang();
  let rapidEmptyEnds = 0;

  const resetHoldWatchdog = (): void => {
    if (voiceWatchdogTimer) {
      clearTimeout(voiceWatchdogTimer);
    }
    voiceWatchdogTimer = setTimeout(() => {
      if (holdActive) {
        endHoldVoice(deps);
      }
    }, 60000);
  };

  const startHoldRecognitionChunk = (isAutoRestart: boolean): void => {
    if (!voiceSessionActive || !holdActive) return;
    try {
      const recognition: any = new SpeechRecognitionCtor();
      recognition.lang = resolvedLang;
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 3;
      try {
        recognition.unspokenPunctuation = true;
      } catch { }

      const chunkStartAt = Date.now();
      let chunkProducedText = false;
      let chunkFatalError = false;
      holdRawChunkText = '';
      holdPauseBreakpoints = [];
      activeVoiceRecognition = recognition;

      recognition.onresult = (event: any) => {
        if ((!holdActive && !holdStopping) || activeVoiceRecognition !== recognition) return;
        const utterance = mergeSpeechResults(event?.results);
        if (!utterance) return;
        const allFinal = areAllSpeechResultsFinal(event?.results);
        holdLastResultWasFinal = allFinal;
        holdLastResultAt = Date.now();
        chunkProducedText = true;
        rapidEmptyEnds = 0;
        resetHoldWatchdog();
        holdRawChunkText = utterance;
        const liveChunk = punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, {
          showTrailingPause: false,
          finalizeSentence: holdStopping,
        });
        holdSpokenText = isAutoRestart
          ? joinDraftAndSpeech(holdCommittedText, liveChunk)
          : liveChunk;
        updateWechatOverlayUI();

        if (holdStopping) {
          if (holdSettleTimer) {
            clearTimeout(holdSettleTimer);
            holdSettleTimer = null;
          }
          if (allFinal) {
            // 系统语音引擎已给出整句级 isFinal 同音字修正定稿，给 60ms 收敛后立即发送，无需傻等硬超时
            holdSettleTimer = setTimeout(() => {
              holdSettleTimer = null;
              finalizeHoldSession();
            }, 60);
          }
          return;
        }

        if (voicePauseTimer) {
          clearTimeout(voicePauseTimer);
          voicePauseTimer = null;
        }
        if (holdActive && !holdStopping && utterance.length >= 2) {
          const snapText = utterance;
          voicePauseTimer = setTimeout(() => {
            voicePauseTimer = null;
            if (!holdActive || holdStopping || holdRawChunkText !== snapText) return;
            const len = snapText.length;
            const exists = holdPauseBreakpoints.some((bp: any) => bp.len === len);
            if (!exists) {
              holdPauseBreakpoints.push({
                len,
                head: snapText.slice(0, Math.max(2, len - 2)),
              });
              const pausedChunk = punctuateSpeechText(holdRawChunkText, holdPauseBreakpoints, {
                showTrailingPause: true,
                finalizeSentence: false,
              });
              holdSpokenText = isAutoRestart
                ? joinDraftAndSpeech(holdCommittedText, pausedChunk)
                : pausedChunk;
              updateWechatOverlayUI();
            }
          }, 650);
        }
      };

      recognition.onerror = (event: any) => {
        if (activeVoiceRecognition !== recognition) return;
        const errCode = event?.error || '';
        if (errCode === 'no-speech') {
          return;
        }
        chunkFatalError = true;
        holdHadFatalError = true;
        stopVoiceInput();
        if (errCode === 'service-not-allowed') {
          webSpeechServiceBlocked = true;
          setWechatVoiceMode(false, false, true);
          focusInputWithVisualPulse(
            input,
            'globalPromptInput',
            '🎙️ 桌面图标模式受苹果限制无法按住说话：请用 Safari 打开，或点键盘右下角「🎤」说话',
            showToast
          );
        } else if (errCode === 'not-allowed') {
          if (!isAutoRestart) {
            showToast('🎙️ 请在浏览器地址栏允许麦克风权限后再按住说话');
          }
        } else if (errCode === 'audio-capture') {
          showToast('🎙️ 麦克风正被其他后台软件占用，请先关闭后再试');
        } else if (errCode && errCode !== 'aborted') {
          showToast('⚠️ 语音识别异常：' + errCode);
        }
      };

      recognition.onend = () => {
        if (activeVoiceRecognition !== recognition) return;

        if (holdStopping) {
          finalizeHoldSession();
          return;
        }
        activeVoiceRecognition = null;
        if (!voiceSessionActive || !holdActive || chunkFatalError) {
          return;
        }
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          cancelHoldVoice();
          return;
        }
        holdCommittedText = holdSpokenText;
        const elapsed = Date.now() - chunkStartAt;
        if (!chunkProducedText && elapsed < 600) {
          rapidEmptyEnds += 1;
          if (rapidEmptyEnds >= 3) {
            finalizeHoldSession();
            return;
          }
        } else {
          rapidEmptyEnds = 0;
        }
        const restartDelayMs = chunkProducedText ? 25 : 150;
        voiceRestartTimer = setTimeout(() => {
          voiceRestartTimer = null;
          if (voiceSessionActive && holdActive && !holdStopping) {
            startHoldRecognitionChunk(true);
          }
        }, restartDelayMs);
      };

      recognition.start();
    } catch {
      holdHadFatalError = true;
      stopVoiceInput();
      if (!isAutoRestart) {
        setWechatVoiceMode(false, false, true);
        focusInputWithVisualPulse(
          input,
          'globalPromptInput',
          '🎙️ 当前无法直接启动语音识别，已切回键盘，请用键盘「🎤」说话',
          showToast
        );
      }
    }
  };

  resetHoldWatchdog();
  startHoldRecognitionChunk(false);
  return true;
}

export function moveHoldVoice(clientX: any, clientY: any): string {
  if (!holdActive || holdStopping) return holdZone;
  const win: any = typeof window !== 'undefined' ? window : null;
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  const nextZone = computeHoldZone(
    clientX,
    clientY,
    win?.innerWidth || 390,
    win?.innerHeight || 844,
    holdStartY
  );
  if (nextZone !== holdZone) {
    holdZone = nextZone;
    try {
      if (nav && typeof nav.vibrate === 'function') {
        nav.vibrate(10);
      }
    } catch { }
    updateWechatOverlayUI();
  }
  return holdZone;
}

export function cancelHoldVoice(deps?: VoiceControllerDeps): void {
  if (!holdActive && !holdStopping) return;
  const win: any = typeof window !== 'undefined' ? window : null;
  const showToast =
    deps?.showToast || activeHoldDeps?.showToast || (win && win.showToast ? win.showToast : () => { });
  const input: any =
    typeof document !== 'undefined' && document
      ? document.getElementById('globalPromptInput')
      : null;
  const baseDraft = holdBaseDraft;
  activeHoldDeps = null;
  stopVoiceInput();
  if (input) {
    input.value = baseDraft;
  }
  showToast('已取消语音');
}

export function endHoldVoice(deps?: VoiceControllerDeps): void {
  if (!holdActive || holdStopping) return;
  if (deps) {
    activeHoldDeps = deps;
  }
  detachHoldWindowListeners();

  const win: any = typeof window !== 'undefined' ? window : null;
  const showToast =
    activeHoldDeps?.showToast || (win && win.showToast ? win.showToast : () => { });
  const durationMs = Date.now() - holdStartAt;

  if (holdZone === 'cancel') {
    cancelHoldVoice(activeHoldDeps);
    return;
  }

  if (durationMs < 260 && !String(holdSpokenText || '').trim()) {
    const baseDraft = holdBaseDraft;
    const input: any =
      typeof document !== 'undefined' && document
        ? document.getElementById('globalPromptInput')
        : null;
    activeHoldDeps = null;
    stopVoiceInput();
    if (input) input.value = baseDraft;
    showToast('👆 请按住按钮说话，松开立即发送');
    return;
  }

  // 松手后先调用 stop() 让手机系统把最后尾音及整句语言模型同音字修正（isFinal，通常需 450~900ms）走完，
  // 一旦收到 isFinal 或 onend 立即发送；仅当底层浏览器完全卡死时由 1200ms 兜底发送
  holdActive = false;
  holdStopping = true;
  voiceSessionActive = false;
  if (voiceRestartTimer) {
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer = null;
  }
  updateWechatOverlayUI();

  if (activeVoiceRecognition) {
    try {
      activeVoiceRecognition.stop();
    } catch {
      finalizeHoldSession();
      return;
    }
    const alreadySettledBeforeLift =
      holdLastResultWasFinal && holdLastResultAt > 0 && Date.now() - holdLastResultAt >= 450;
    const maxFlushWaitMs = alreadySettledBeforeLift ? 450 : 1200;
    holdFinalizeTimer = setTimeout(() => {
      holdFinalizeTimer = null;
      finalizeHoldSession();
    }, maxFlushWaitMs);
  } else {
    finalizeHoldSession();
  }
}

export function isDictationActiveFor(targetInputId = ''): boolean {
  return Boolean(
    voiceSessionActive &&
      !holdActive &&
      !holdStopping &&
      activeVoiceRecognition &&
      (!targetInputId || activeVoiceInputId === targetInputId)
  );
}

export function flushVoiceInputBeforeSend(targetInputId = ''): any {
  if (!isDictationActiveFor(targetInputId) || !activeDictationFlushHandler) {
    stopVoiceInput();
    return Promise.resolve();
  }
  return new Promise((resolve: any) => {
    dictationFinalizeResolve = resolve;
    const handler = activeDictationFlushHandler;
    activeDictationFlushHandler = null;
    handler(() => {
      if (dictationFinalizeResolve === resolve) {
        dictationFinalizeResolve = null;
      }
      resolve();
    });
  });
}

export function toggleVoiceInput(
  targetInputId = 'globalPromptInput',
  btnId = 'chatVoiceBtn',
  deps?: VoiceControllerDeps
): void {
  const win: any = window;
  const showToast = deps?.showToast || (win.showToast ?? (() => { }));
  const onComposerInput = deps?.onComposerInput || (win.onComposerInput ?? (() => { }));
  const btn = document.getElementById(btnId);

  // 如果当前正处于录音状态（无论是 voiceSessionActive、activeVoiceRecognition 还在，还是按钮带有 .recording 类），点击立即强制关闭！
  if (
    ((voiceSessionActive || activeVoiceRecognition) && activeVoiceInputId === targetInputId) ||
    btn?.classList.contains('recording')
  ) {
    stopVoiceInput();
    showToast('⏹ 已关闭语音输入');
    return;
  }
  if (voiceSessionActive || activeVoiceRecognition || holdActive) {
    stopVoiceInput();
  }

  const input = document.getElementById(targetInputId) as HTMLTextAreaElement | HTMLInputElement | null;
  if (!input) return;

  const inputEl: any = input;
  if (inputEl.disabled || inputEl.readOnly) {
    const disabledMsg = '⏳ 当前会话正在执行或为观察模式，暂不可语音输入';
    showVoiceHintBar(targetInputId, disabledMsg, 'fallback', 4500);
    showToast(disabledMsg);
    return;
  }

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  // 优先直接调用手机 / 电脑系统自带的原生语音识别（不弹软键盘，直接说话上屏）；
  // 仅当浏览器无此接口或被 iOS 主屏幕全屏沙盒拦截（webSpeechServiceBlocked）时，才回退聚焦输入框。
  if (!SpeechRecognitionCtor || webSpeechServiceBlocked) {
    const fallbackMsg = webSpeechServiceBlocked
      ? '🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话'
      : '🎙️ 当前浏览器不支持直接语音识别，请点输入框用系统键盘「🎤」说话';
    focusInputWithVisualPulse(inputEl, targetInputId, fallbackMsg, showToast);
    return;
  }

  const resolvedLang = resolveSpeechLang();
  let committedBaseText = input.value || '';
  let rapidEmptyEnds = 0;

  const resetIdleWatchdog = (): void => {
    if (voiceWatchdogTimer) {
      clearTimeout(voiceWatchdogTimer);
    }
    // 60 秒无新语音自动释放麦克风；只要持续说话每次识别都会自动顺延，绝不中途切断长句
    voiceWatchdogTimer = setTimeout(() => {
      if (voiceSessionActive) {
        stopVoiceInput();
        showToast('ℹ️ 长时间未检测到新语音，已自动关闭麦克风');
      }
    }, 60000);
  };

  const notifyInputChanged = (): void => {
    if (targetInputId === 'globalPromptInput') {
      onComposerInput();
    } else {
      try {
        if (typeof Event === 'function' && typeof inputEl.dispatchEvent === 'function') {
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch { }
    }
  };

  const startRecognitionChunk = (isAutoRestart: boolean): void => {
    if (!voiceSessionActive) return;
    try {
      const recognition: any = new SpeechRecognitionCtor();
      recognition.lang = resolvedLang;
      recognition.interimResults = true;
      // 持续听写模式：说话中途停顿换气不会自动挂断，直到用户主动点击「⏹」或「发送」
      recognition.continuous = true;
      recognition.maxAlternatives = 3;
      try {
        recognition.unspokenPunctuation = true;
      } catch { }

      const chunkStartAt = Date.now();
      let chunkProducedText = false;
      let chunkFatalError = false;
      let chunkRawText = '';
      let lastDictationWrittenValue = input.value || '';
      let gotResultWhileStopping = false;
      const chunkPauseBreakpoints: any = [];

      activeVoiceRecognition = recognition;
      activeDictationFlushHandler = (done: any): void => {
        if (!activeVoiceRecognition || activeVoiceRecognition !== recognition) {
          stopVoiceInput();
          done();
          return;
        }
        dictationStopping = true;
        voiceSessionActive = false;
        if (voicePauseTimer) {
          clearTimeout(voicePauseTimer);
          voicePauseTimer = null;
        }
        if (voiceRestartTimer) {
          clearTimeout(voiceRestartTimer);
          voiceRestartTimer = null;
        }
        if (voiceWatchdogTimer) {
          clearTimeout(voiceWatchdogTimer);
          voiceWatchdogTimer = null;
        }
        if (btnId) setVoiceBtnRecording(btnId, false);
        hideVoiceHintBar(targetInputId);

        let finished = false;
        const finishFlush = (): void => {
          if (finished) return;
          finished = true;
          dictationFinalizeFn = null;
          activeDictationFlushHandler = null;
          if (dictationSettleTimer) {
            clearTimeout(dictationSettleTimer);
            dictationSettleTimer = null;
          }
          if (dictationFinalizeTimer) {
            clearTimeout(dictationFinalizeTimer);
            dictationFinalizeTimer = null;
          }
          if (chunkRawText && (gotResultWhileStopping || input.value === lastDictationWrittenValue)) {
            const finalPunct = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
              showTrailingPause: false,
              finalizeSentence: true,
            });
            input.value = isAutoRestart
              ? joinDraftAndSpeech(committedBaseText, finalPunct)
              : committedBaseText + finalPunct;
            lastDictationWrittenValue = input.value;
            notifyInputChanged();
          }
          stopVoiceInput();
          done();
        };
        dictationFinalizeFn = finishFlush;
        try {
          recognition.stop();
        } catch {
          finishFlush();
          return;
        }
        dictationFinalizeTimer = setTimeout(() => {
          dictationFinalizeTimer = null;
          finishFlush();
        }, 950);
      };

      recognition.onresult = (event: any) => {
        if ((!voiceSessionActive && !dictationStopping) || activeVoiceRecognition !== recognition) return;
        const utterance = mergeSpeechResults(event?.results);
        if (!utterance) return;
        const allFinal = areAllSpeechResultsFinal(event?.results);
        chunkProducedText = true;
        rapidEmptyEnds = 0;
        if (voiceSessionActive) {
          resetIdleWatchdog();
        }
        chunkRawText = utterance;
        const punctuated = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
          showTrailingPause: false,
          finalizeSentence: dictationStopping,
        });
        input.value = isAutoRestart
          ? joinDraftAndSpeech(committedBaseText, punctuated)
          : committedBaseText + punctuated;
        lastDictationWrittenValue = input.value;
        notifyInputChanged();

        if (dictationStopping) {
          gotResultWhileStopping = true;
          if (dictationSettleTimer) {
            clearTimeout(dictationSettleTimer);
            dictationSettleTimer = null;
          }
          if (allFinal) {
            dictationSettleTimer = setTimeout(() => {
              dictationSettleTimer = null;
              if (dictationFinalizeFn) {
                dictationFinalizeFn();
              }
            }, 60);
          }
          return;
        }

        if (voicePauseTimer) {
          clearTimeout(voicePauseTimer);
          voicePauseTimer = null;
        }
        if (voiceSessionActive && utterance.length >= 2) {
          const snapText = utterance;
          voicePauseTimer = setTimeout(() => {
            voicePauseTimer = null;
            if (!voiceSessionActive || activeVoiceRecognition !== recognition || chunkRawText !== snapText) {
              return;
            }
            const len = snapText.length;
            if (!chunkPauseBreakpoints.some((bp: any) => bp.len === len)) {
              chunkPauseBreakpoints.push({
                len,
                head: snapText.slice(0, Math.max(2, len - 2)),
              });
              const pausedPunct = punctuateSpeechText(chunkRawText, chunkPauseBreakpoints, {
                showTrailingPause: true,
                finalizeSentence: false,
              });
              input.value = isAutoRestart
                ? joinDraftAndSpeech(committedBaseText, pausedPunct)
                : committedBaseText + pausedPunct;
              lastDictationWrittenValue = input.value;
              notifyInputChanged();
            }
          }, 650);
        }
      };

      recognition.onerror = (event: any) => {
        if (activeVoiceRecognition !== recognition) return;
        const errCode = event?.error || '';
        // iOS Safari 停顿思考几秒可能触发 no-speech，不应关闭麦克风，交给 onend 无缝续接下一句
        if (errCode === 'no-speech') {
          return;
        }
        chunkFatalError = true;
        stopVoiceInput();
        if (errCode === 'service-not-allowed') {
          webSpeechServiceBlocked = true;
          focusInputWithVisualPulse(
            inputEl,
            targetInputId,
            '🎙️ 桌面图标模式受苹果限制无法直接识别：请用 Safari 打开，或点输入框用键盘右下角「🎤」说话',
            showToast
          );
        } else if (errCode === 'not-allowed') {
          if (!isAutoRestart) {
            showVoiceHintBar(
              targetInputId,
              '🎙️ 未开启麦克风权限：请在浏览器地址栏允许麦克风后重试',
              'fallback',
              5500
            );
            showToast('🎙️ 未开启麦克风权限：请在地址栏允许麦克风');
          }
        } else if (errCode === 'audio-capture') {
          showVoiceHintBar(
            targetInputId,
            '🎙️ 麦克风正被其他后台语音软件占用，请先关闭后台语音后再点「🎤」',
            'fallback',
            5500
          );
          showToast('🎙️ 麦克风被后台软件占用，请关闭后再试');
        } else if (errCode && errCode !== 'aborted') {
          showVoiceHintBar(targetInputId, '⚠️ 语音识别异常（' + errCode + '），可再点「🎤」重试', 'fallback', 5000);
          showToast('⚠️ 语音识别已停止：' + errCode);
        }
      };

      recognition.onend = () => {
        if (activeVoiceRecognition !== recognition) return;
        if (dictationStopping) {
          if (dictationFinalizeFn) {
            dictationFinalizeFn();
          }
          return;
        }
        activeVoiceRecognition = null;
        notifyInputChanged();

        if (!voiceSessionActive || chunkFatalError) {
          return;
        }
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          stopVoiceInput();
          return;
        }
        // 锁定本段已上屏文字，若 iOS Safari 因短暂停顿自动断流（onend），自动新建实例无缝续听下一句
        committedBaseText = input.value || '';
        const elapsed = Date.now() - chunkStartAt;
        if (!chunkProducedText && elapsed < 600) {
          rapidEmptyEnds += 1;
          if (rapidEmptyEnds >= 3) {
            stopVoiceInput();
            return;
          }
        } else {
          rapidEmptyEnds = 0;
        }
        const restartDelayMs = chunkProducedText ? 25 : 180;
        voiceRestartTimer = setTimeout(() => {
          voiceRestartTimer = null;
          if (voiceSessionActive) {
            startRecognitionChunk(true);
          }
        }, restartDelayMs);
      };

      recognition.start();
    } catch {
      if (isAutoRestart) {
        stopVoiceInput();
      } else {
        stopVoiceInput();
        focusInputWithVisualPulse(
          inputEl,
          targetInputId,
          '🎙️ 当前无法直接启动语音识别，请点输入框用系统键盘「🎤」说话',
          showToast
        );
      }
    }
  };

  voiceSessionActive = true;
  activeVoiceInputId = targetInputId;
  activeVoiceBtnId = btnId;
  setVoiceBtnRecording(btnId, true);
  showVoiceHintBar(targetInputId, '🔴 正在持续听写… 停顿不会断，说完点「⏹」或直接「发送」', 'recording', 0);
  if (!document.getElementById(resolveHintBarId(targetInputId))) {
    showToast('🎙️ 正在持续听写，说完点「⏹」或直接发送');
  }
  resetIdleWatchdog();
  startRecognitionChunk(false);
}
