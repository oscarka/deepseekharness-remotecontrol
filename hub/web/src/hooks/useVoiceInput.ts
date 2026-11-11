// ---- 语音输入状态机 Hook / Controller：支持强制 abort() 释放麦克风、超时看门狗与生命周期自动清理 ----
export interface VoiceControllerDeps {
  showToast: (msg: string) => void;
  onComposerInput: () => void;
}

let activeVoiceRecognition: any = null;
let activeVoiceInputId = '';
let activeVoiceBtnId = '';
let voiceSessionActive = false;
let voiceWatchdogTimer: any = null;
let voiceRestartTimer: any = null;
let voiceHintTimer: any = null;
let webSpeechServiceBlocked = false;

export function mergeSpeechResults(results: any): string {
  const total = results ? results.length : 0;
  let acc = '';
  for (let i = 0; i < total; i += 1) {
    const seg = String(results[i]?.[0]?.transcript || '');
    if (!seg) continue;
    if (!acc) {
      acc = seg;
    } else if (seg.startsWith(acc)) {
      // 兼容移动端 WebKit / Android 在 continuous=true 下返回累积前缀片段，避免重复叠字
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
      acc += overlap > 0 ? seg.slice(overlap) : seg;
    }
  }
  return acc;
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
  } catch {}
  try {
    const card = input.closest ? input.closest('.composer-unified-card') || input : input;
    if (card && card.classList) {
      card.classList.remove('composer-voice-flash');
      card.classList.add('composer-voice-flash');
      setTimeout(() => {
        try {
          card.classList.remove('composer-voice-flash');
        } catch {}
      }, 900);
    }
  } catch {}
  showVoiceHintBar(targetInputId, hintMsg, 'fallback', 6500);
  showToast(hintMsg);
}

export function setVoiceBtnRecording(btnId: string, recording: boolean): void {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('recording', Boolean(recording));
  btn.setAttribute('aria-pressed', recording ? 'true' : 'false');
  if (btn.classList.contains('voice-pill-btn')) {
    btn.textContent = recording ? '⏹ 停止听写' : '🎤 语音输入';
  } else if (btn.id === 'newTaskVoiceBtn' || btn.classList.contains('new-task-tool-btn')) {
    btn.textContent = recording ? '⏹ 停止' : '🎤 语音';
  } else {
    btn.textContent = recording ? '⏹' : '🎤';
  }
}

export function isVoiceRecording(): boolean {
  return Boolean(voiceSessionActive || activeVoiceRecognition || activeVoiceBtnId);
}

export function stopVoiceInput(): void {
  voiceSessionActive = false;
  if (voiceRestartTimer) {
    clearTimeout(voiceRestartTimer);
    voiceRestartTimer = null;
  }
  if (voiceWatchdogTimer) {
    clearTimeout(voiceWatchdogTimer);
    voiceWatchdogTimer = null;
  }
  const rec = activeVoiceRecognition;
  const btnId = activeVoiceBtnId;
  activeVoiceRecognition = null;
  activeVoiceInputId = '';
  activeVoiceBtnId = '';

  // 先恢复所有语音按钮 UI 状态与录音提示条，确保即使底层 WebKit onend 卡死，界面也立即解除锁定
  if (btnId) setVoiceBtnRecording(btnId, false);
  setVoiceBtnRecording('chatVoiceBtn', false);
  setVoiceBtnRecording('newTaskVoiceBtn', false);
  hideVoiceHintBar();

  if (rec) {
    // 必须先解绑回调，防止 abort/stop 期间残留的音频帧再次触发 onresult 把已清空的文字塞回输入框
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
    } catch {}
    // iOS Safari WebKit 下单纯 stop() 会等待远端转写缓冲结束而卡死麦克风，必须同时调用 abort() 强制断流
    try {
      rec.abort();
    } catch {}
    try {
      rec.stop();
    } catch {}
  }
}

export function toggleVoiceInput(
  targetInputId = 'globalPromptInput',
  btnId = 'chatVoiceBtn',
  deps?: VoiceControllerDeps
): void {
  const win: any = window;
  const nav: any = navigator;
  const showToast = deps?.showToast || (win.showToast ?? (() => {}));
  const onComposerInput = deps?.onComposerInput || (win.onComposerInput ?? (() => {}));
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
  if (voiceSessionActive || activeVoiceRecognition) {
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

  const rawLang = String(nav?.language || '').toLowerCase();
  let preferEn = false;
  try {
    preferEn =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('dsh_lang_pref') === 'en' &&
      rawLang.startsWith('en');
  } catch {}
  const resolvedLang = preferEn
    ? String(nav.language)
    : rawLang.startsWith('zh-tw') || rawLang.startsWith('zh-hant')
      ? 'zh-TW'
      : rawLang.startsWith('zh-hk')
        ? 'zh-HK'
        : 'zh-CN';

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
      } catch {}
    }
  };

  const startRecognitionChunk = (isAutoRestart: boolean): void => {
    if (!voiceSessionActive) return;
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = resolvedLang;
      recognition.interimResults = true;
      // 持续听写模式：说话中途停顿换气不会自动挂断，直到用户主动点击「⏹」或「发送」
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      const chunkStartAt = Date.now();
      let chunkProducedText = false;
      let chunkFatalError = false;

      activeVoiceRecognition = recognition;

      recognition.onresult = (event: any) => {
        if (!voiceSessionActive || activeVoiceRecognition !== recognition) return;
        const utterance = mergeSpeechResults(event?.results);
        if (!utterance) return;
        chunkProducedText = true;
        rapidEmptyEnds = 0;
        resetIdleWatchdog();
        let prefix = committedBaseText;
        if (
          isAutoRestart &&
          prefix &&
          !/[，。！？、；：,.!?;:\s]$/.test(prefix) &&
          !/^[，。！？、；：,.!?;:\s]/.test(utterance)
        ) {
          prefix += /[\u4e00-\u9fa5]$/.test(prefix) ? '，' : ' ';
        }
        input.value = prefix + utterance;
        notifyInputChanged();
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
        voiceRestartTimer = setTimeout(() => {
          voiceRestartTimer = null;
          if (voiceSessionActive) {
            startRecognitionChunk(true);
          }
        }, 180);
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
