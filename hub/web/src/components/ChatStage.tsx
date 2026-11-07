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
        <button
          type="button"
          class="voice-btn image-upload-btn"
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
          class="voice-btn"
          id="chatVoiceBtn"
          title="语音输入（点击说话，再点停止）"
          aria-label="语音输入"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            (window as any).toggleVoiceInput?.('globalPromptInput', 'chatVoiceBtn');
          }}
        >
          🎤
        </button>
        <textarea
          class="chat-input"
          id="globalPromptInput"
          rows={1}
          placeholder="发指令或点左侧🖼️传截图..."
          autocorrect="on"
          autocapitalize="sentences"
          spellcheck={true}
          onInput={() => (window as any).onComposerInput?.()}
          onKeyDown={e => (window as any).onComposerKeydown?.(e)}
          onPaste={e => (window as any).onComposerPaste?.(e, 'chat')}
        ></textarea>
        <button
          type="button"
          class="send-btn"
          id="chatSendBtn"
          onClick={() => (window as any).sendPromptToActiveSession?.()}
        >
          发送
        </button>
      </div>
    </section>
  );
}

