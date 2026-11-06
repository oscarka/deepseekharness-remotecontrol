// ---- 语音输入状态机 Hook / Controller：支持强制 abort() 释放麦克风、超时看门狗与生命周期自动清理 ----
export interface VoiceControllerDeps {
  showToast: (msg: string) => void;
  onComposerInput: () => void;
}

let activeVoiceRecognition: any = null;
let activeVoiceInputId = '';
let activeVoiceBtnId = '';
let voiceWatchdogTimer: any = null;

export function setVoiceBtnRecording(btnId: string, recording: boolean): void {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('recording', Boolean(recording));
  btn.setAttribute('aria-pressed', recording ? 'true' : 'false');
  if (btn.classList.contains('voice-pill-btn')) {
    btn.textContent = recording ? '⏹ 停止听写' : '🎤 语音输入';
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

  // 先恢复所有语音按钮 UI 状态，确保即使底层 WebKit onend 卡死，界面也立即解除锁定
  if (btnId) setVoiceBtnRecording(btnId, false);
  setVoiceBtnRecording('chatVoiceBtn', false);
  setVoiceBtnRecording('newTaskVoiceBtn', false);

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
  const showToast = deps?.showToast || ((window as any).showToast ?? (() => {}));
  const onComposerInput = deps?.onComposerInput || ((window as any).onComposerInput ?? (() => {}));
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

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    input.focus();
    showToast('🎙️ 已唤起输入法，请点手机键盘右下角「🎤 麦克风」直接语音输入');
    return;
  }

  try {
    const recognition = new SpeechRecognitionCtor();
    recognition.lang =
      navigator.language && navigator.language.startsWith('zh') ? navigator.language : 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    const baseText = input.value || '';
    let finalTranscript = '';

    activeVoiceRecognition = recognition;
    activeVoiceInputId = targetInputId;
    activeVoiceBtnId = btnId;
    setVoiceBtnRecording(btnId, true);
    showToast('🎙️ 正在听写，再点一次「⏹」立即关闭');

    // 60 秒看门狗自动释放麦克风，防止系统挂起
    voiceWatchdogTimer = setTimeout(() => {
      if (activeVoiceRecognition === recognition) {
        stopVoiceInput();
      }
    }, 60000);

    recognition.onresult = (event: any) => {
      if (activeVoiceRecognition !== recognition) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const seg = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += seg;
        } else {
          interim += seg;
        }
      }
      input.value = baseText + finalTranscript + interim;
      if (targetInputId === 'globalPromptInput') {
        onComposerInput();
      }
    };

    recognition.onerror = (event: any) => {
      const errCode = event?.error || '';
      stopVoiceInput();
      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        input.focus();
        showToast('🎙️ 未授予浏览器麦克风权限，可直接点手机键盘右下角「🎤」语音输入');
      } else if (errCode && errCode !== 'aborted' && errCode !== 'no-speech') {
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
    input.focus();
    showToast('🎙️ 已聚焦输入框，请使用键盘右下角「🎤 麦克风」语音输入');
  }
}
