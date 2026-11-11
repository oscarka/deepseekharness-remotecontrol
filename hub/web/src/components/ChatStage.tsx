import { h } from 'preact';

export function ChatStage() {
  return (
    <section class="chat-fullscreen chat-stage" id="chatFullscreen">
      <div class="chat-navbar">
        <button
          type="button"
          class="back-btn"
          onClick={() => (window as any).closeMobileChat?.()}
        >
          ‹ 返回
        </button>
        <div class="chat-nav-center">
          <div class="chat-nav-title" id="chatTitle">
            选择一个会话
          </div>
          <div class="chat-nav-sub" id="chatSub">
            点击左侧任意对话开始遥控
          </div>
        </div>
        <div class="chat-nav-actions">
          <div class="desktop-stage-tabs">
            <button
              type="button"
              class="stage-seg-btn active"
              id="stageBtnChat"
              onClick={() => (window as any).switchDesktopStage?.('chat')}
            >
              💬 对话流
            </button>
            <button
              type="button"
              class="stage-seg-btn"
              id="stageBtnCode"
              onClick={() => (window as any).switchDesktopStage?.('code')}
            >
              📂 项目代码
            </button>
          </div>
          <button
            type="button"
            class="icon-pill-btn mobile-only-file-btn"
            onClick={() => (window as any).openInChatFileDrawer?.()}
          >
            📂 文件速览
          </button>
          <button
            type="button"
            class="icon-pill-btn"
            onClick={() => (window as any).openCurrentSessionActions?.()}
          >
            ⋯
          </button>
        </div>
      </div>

      <div class="chat-switch-alert" id="chatSwitchAlert" style="display:none;"></div>

      <div class="chat-messages" id="chatMessages">
        <div style="margin:auto;text-align:center;color:#94a3b8;font-size:14px;">
          👈 点击任意会话查看详细对话与思考过程
        </div>
      </div>
      <div
        class="main-viewport file-preview-pane"
        id="desktopStageCodePane"
        style="display:none;background:var(--surface);"
      ></div>

      <div class="running-control-bar" id="runningControlBar">
        <span>🟢 AI 正在电脑上执行任务...</span>
        <button
          type="button"
          class="stop-task-btn"
          onClick={() => (window as any).stopActiveSession?.()}
        >
          ⏹ 立即停止
        </button>
      </div>

      <div
        class="composer-attachments-strip"
        id="composerAttachmentsStrip"
        style="display:none;"
      ></div>

      <div class="chat-composer" id="chatComposerBar">
        <input
          type="file"
          id="chatImageInput"
          accept="image/*"
          multiple
          style="display:none;"
          onChange={e => (window as any).onChatImageSelected?.(e, 'chat')}
        />
        <div class="composer-unified-card" id="composerUnifiedCard">
          <div
            class="voice-hint-bar"
            id="chatVoiceHintBar"
            style="display:none;"
            onClick={() => (window as any).hideVoiceHintBar?.('globalPromptInput')}
          ></div>
          <textarea
            class="chat-input"
            id="globalPromptInput"
            rows={1}
            placeholder="发指令继续对话..."
            autocorrect="on"
            autocapitalize="sentences"
            spellcheck={true}
            onInput={e => {
              if (!(window as any).isVoiceRecording?.() && !(e as any)?.isComposing) {
                (window as any).hideVoiceHintBar?.('globalPromptInput');
              }
              (window as any).onComposerInput?.(e);
            }}
            onKeyDown={e => (window as any).onComposerKeydown?.(e)}
            onPaste={e => (window as any).onComposerPaste?.(e, 'chat')}
          ></textarea>
          <button
            type="button"
            class="wechat-hold-talk-btn"
            id="wechatHoldTalkBtn"
            onContextMenu={e => e.preventDefault()}
            onTouchStart={e => {
              (window as any).__dshLastHoldTouchAt = Date.now();
              e.preventDefault();
              e.stopPropagation();
              const t = (e as any).touches?.[0];
              (window as any).startHoldVoice?.(t ? t.clientX : 0, t ? t.clientY : 0);
            }}
            onMouseDown={e => {
              if ((e as any).button !== 0) return;
              if (Date.now() - ((window as any).__dshLastHoldTouchAt || 0) < 800) return;
              e.preventDefault();
              e.stopPropagation();
              (window as any).startHoldVoice?.((e as any).clientX, (e as any).clientY);
            }}
          >
            <span id="wechatHoldTalkLabel">🎙️ 按住 说话</span>
          </button>
          <div class="composer-toolbar-row">
            <div class="composer-tools-left">
              <button
                type="button"
                class="voice-btn composer-mini-btn mode-toggle-btn"
                id="chatVoiceBtn"
                title="切换为微信式按住说话"
                aria-label="切换为微信式按住说话"
                onMouseDown={e => {
                  e.preventDefault();
                }}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).toggleWechatVoiceMode?.();
                }}
              >
                🎙️ 语音
              </button>
              <button
                type="button"
                class="voice-btn composer-mini-btn image-upload-btn"
                id="chatImageBtn"
                title="从手机相册上传截图或照片"
                aria-label="上传截图或照片"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).triggerImagePicker?.('chat');
                }}
              >
                🖼️
              </button>
              <button
                type="button"
                class="composer-model-pill"
                id="chatModelBtn"
                title="切换当前对话使用的 AI 模型"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).openModelPickerSheet?.('chat');
                }}
              >
                <span id="chatModelBtnLabel">🤖 默认模型</span>
                <span style="opacity:0.65;font-size:10px;margin-left:2px;">▾</span>
              </button>
            </div>
            <button
              type="button"
              class="send-btn composer-send-btn"
              id="chatSendBtn"
              onClick={() => (window as any).sendPromptToActiveSession?.()}
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 微信同款全屏按住说话浮层：实时识别文字气泡 + 左滑取消 / 右滑改字 */}
      <div
        class="wechat-voice-overlay zone-send"
        id="wechatVoiceOverlay"
        style="display:none;"
        aria-live="polite"
      >
        <div class="wechat-voice-bubble-wrap">
          <div class="wechat-voice-bubble" id="wechatVoiceBubble">
            <div class="wechat-voice-transcript is-placeholder" id="wechatOverlayTranscript">
              正在听你说话…
            </div>
            <div class="wechat-voice-wave" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="wechat-voice-bubble-tail"></div>
        </div>

        <div class="wechat-voice-actions">
          <div class="wechat-voice-action-item cancel-zone" id="wechatZoneCancel">
            <div class="wechat-voice-action-circle">✕</div>
            <span class="wechat-voice-action-tip">左滑取消</span>
          </div>
          <div class="wechat-voice-action-item edit-zone" id="wechatZoneEdit">
            <div class="wechat-voice-action-circle">文</div>
            <span class="wechat-voice-action-tip">右滑改字</span>
          </div>
        </div>

        <div class="wechat-voice-bottom-dock">
          <div class="wechat-voice-status-text" id="wechatOverlayStatus">
            松开 立即发送
          </div>
          <div class="wechat-voice-bottom-arc">🎙️</div>
        </div>
      </div>
    </section>
  );
}

