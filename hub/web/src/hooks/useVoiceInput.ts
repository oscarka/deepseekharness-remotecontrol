// ---- 语音输入状态机 Hook / Controller：支持强制 abort() 释放麦克风、超时看门狗与生命周期自动清理 ----
export interface VoiceControllerDeps {
  showToast: (msg: string) => void;
  onComposerInput: () => void;
}

let activeVoiceRecognition: any = null;
let activeVoiceInputId = '';
let activeVoiceBtnId = '';
let voiceWatchdogTimer: any = null;
let voiceHintTimer: any = null;
let webSpeechServiceBlocked = false;

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
  return Boolean(activeVoiceRecognition || activeVoiceBtnId);
}

export function stopVoiceInput(): void {
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

  // 如果当前正处于录音状态（无论是 activeVoiceRecognition 实例还在，还是按钮带有 .recording 类），点击立即强制关闭！
  if (
    (activeVoiceRecognition && activeVoiceInputId === targetInputId) ||
    btn?.classList.contains('recording')
  ) {
    stopVoiceInput();
    showToast('⏹ 已关闭语音输入');
    return;
  }
  if (activeVoiceRecognition) {
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

  try {
    const recognition = new SpeechRecognitionCtor();
    const rawLang = String(nav?.language || '').toLowerCase();
    let preferEn = false;
    try {
      preferEn =
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('dsh_lang_pref') === 'en' &&
        rawLang.startsWith('en');
    } catch {}
    recognition.lang = preferEn
      ? String(nav.language)
      : rawLang.startsWith('zh-tw') || rawLang.startsWith('zh-hant')
        ? 'zh-TW'
        : rawLang.startsWith('zh-hk')
          ? 'zh-HK'
          : 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    const baseText = input.value || '';

    activeVoiceRecognition = recognition;
    activeVoiceInputId = targetInputId;
    activeVoiceBtnId = btnId;
    setVoiceBtnRecording(btnId, true);
    showVoiceHintBar(targetInputId, '🔴 正在听写… 请直接说话（再点下方「⏹」结束）', 'recording', 0);
    if (!document.getElementById(resolveHintBarId(targetInputId))) {
      showToast('🎙️ 正在听写，请直接说话（再点「⏹」立即关闭）');
    }

    // 60 秒看门狗自动释放麦克风，防止系统挂起
    voiceWatchdogTimer = setTimeout(() => {
      if (activeVoiceRecognition === recognition) {
        stopVoiceInput();
      }
    }, 60000);

    recognition.onresult = (event: any) => {
      if (activeVoiceRecognition !== recognition) return;
      // continuous=false 下从 0 遍历全部片段，彻底避免 iOS Safari / Android Chrome 累积回调导致的重复叠字
      let utterance = '';
      const total = event?.results ? event.results.length : 0;
      for (let i = 0; i < total; i += 1) {
        utterance += event.results[i]?.[0]?.transcript || '';
      }
      input.value = baseText + utterance;
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

    recognition.onerror = (event: any) => {
      const errCode = event?.error || '';
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
        showVoiceHintBar(
          targetInputId,
          '🎙️ 未开启麦克风权限：请在浏览器地址栏允许麦克风后重试',
          'fallback',
          5500
        );
        showToast('🎙️ 未开启麦克风权限：请在地址栏允许麦克风');
      } else if (errCode === 'audio-capture') {
        showVoiceHintBar(
          targetInputId,
          '🎙️ 麦克风正被其他后台语音软件占用，请先关闭后台语音后再点「🎤」',
          'fallback',
          5500
        );
        showToast('🎙️ 麦克风被后台软件占用，请关闭后再试');
      } else if (errCode === 'no-speech') {
        showVoiceHintBar(targetInputId, 'ℹ️ 未检测到说话声，已自动结束听写（可再点「🎤」重试）', 'fallback', 3500);
        showToast('ℹ️ 未检测到说话声，可再点「🎤」重试');
      } else if (errCode && errCode !== 'aborted') {
        showVoiceHintBar(targetInputId, '⚠️ 语音识别异常（' + errCode + '），可再点「🎤」重试', 'fallback', 5000);
        showToast('⚠️ 语音识别已停止：' + errCode);
      }
    };

    recognition.onend = () => {
      if (activeVoiceRecognition === recognition) {
        stopVoiceInput();
      }
      if (targetInputId === 'globalPromptInput') {
        onComposerInput();
      }
    };

    recognition.start();
  } catch {
    stopVoiceInput();
    focusInputWithVisualPulse(
      inputEl,
      targetInputId,
      '🎙️ 当前无法直接启动语音识别，请点输入框用系统键盘「🎤」说话',
      showToast
    );
  }
}
