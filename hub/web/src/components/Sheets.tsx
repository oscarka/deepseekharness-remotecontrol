import { h, Fragment } from 'preact';

export function Sheets() {
  const closeIfBackdrop = (sheetId: string) => (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      (window as any).closeSheet?.(sheetId);
    }
  };

  return (
    <Fragment>
      {/* 抽屉 1：切换电脑 */}
      <div class="sheet-backdrop" id="hostSheet" onClick={closeIfBackdrop('hostSheet')}>
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>切换遥控的电脑</span>
            <span
              style="font-size:12px;color:var(--muted);font-weight:500;"
              id="hostSheetCountLabel"
            ></span>
          </div>
          <div id="hostOptionList"></div>
        </div>
      </div>

      {/* 抽屉 2：新建对话半屏面板 */}
      <div class="sheet-backdrop" id="newTaskSheet" onClick={closeIfBackdrop('newTaskSheet')}>
        <div class="sheet-panel new-task-sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title" style="margin-bottom:12px;">
            <span>✨ 新建远程对话任务</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px;"
              onClick={() => (window as any).closeSheet?.('newTaskSheet')}
            >
              ✕
            </button>
          </div>

          {/* 1. 结构化执行目标卡片（紧凑合并电脑与引擎） */}
          <div class="new-task-context-card">
            <div class="new-task-context-row">
              <span class="context-row-label">💻 执行电脑</span>
              <div class="context-row-chips" id="newTaskHostChips"></div>
            </div>
            <div class="new-task-context-row">
              <span class="context-row-label">⚡ 执行引擎</span>
              <div class="context-row-chips" id="newTaskHarnessChips"></div>
            </div>
          </div>

          {/* 2. 项目文件夹单行横滑，绝不平铺18个 */}
          <div class="new-task-proj-section">
            <div class="new-task-proj-header">
              <span class="proj-header-title">📁 项目工作区</span>
              <button
                type="button"
                class="proj-header-more-btn"
                id="newTaskProjMoreBtn"
                onClick={() => (window as any).openNewTaskProjectPickerSheet?.()}
              >
                全部 ▾
              </button>
            </div>
            <div class="new-task-proj-scroll" id="newTaskProjectChips"></div>
          </div>

          {/* 3. 核心视觉主角：宽敞输入卡片 + 内置底栏工具栏 */}
          <div class="new-task-card-wrap">
            <div
              class="composer-attachments-strip"
              id="newTaskAttachmentsStrip"
              style="display:none;margin-bottom:8px;border:1px solid var(--border);border-radius:12px;"
            ></div>
            <div
              class="voice-hint-bar"
              id="newTaskVoiceHintBar"
              style="display:none;margin-bottom:8px;"
              onClick={() => (window as any).hideVoiceHintBar?.('newTaskInput')}
            ></div>

            <textarea
              class="new-task-textarea"
              id="newTaskInput"
              placeholder="输入你想让电脑执行的任务，或点击下方传截图/语音输入..."
              autocorrect="on"
              autocapitalize="sentences"
              spellcheck={true}
              onInput={e => {
                if (!(window as any).isVoiceRecording?.() && !(e as any)?.isComposing) {
                  (window as any).hideVoiceHintBar?.('newTaskInput');
                }
              }}
              onPaste={e => (window as any).onComposerPaste?.(e, 'newTask')}
            ></textarea>

            {/* 输入框内置底栏 */}
            <div class="new-task-toolbar">
              <input
                type="file"
                id="newTaskImageInput"
                accept="image/*"
                multiple
                style="display:none;"
                onChange={e => (window as any).onChatImageSelected?.(e, 'newTask')}
              />
              <button
                type="button"
                class="new-task-tool-btn model-btn"
                id="newTaskModelBtn"
                title="选择模型"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).openModelPickerSheet?.('newTask');
                }}
              >
                <span id="newTaskModelBtnLabel">🤖 默认模型</span>
                <span class="model-arrow" style="opacity:0.7;font-size:10px;margin-left:3px;">▾</span>
              </button>
              <div class="new-task-toolbar-actions">
                <button
                  type="button"
                  class="new-task-tool-btn"
                  id="newTaskImageBtn"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    (window as any).triggerImagePicker?.('newTask');
                  }}
                >
                  🖼️ 截图
                </button>
                <button
                  type="button"
                  class="new-task-tool-btn"
                  id="newTaskVoiceBtn"
                  onMouseDown={e => {
                    e.preventDefault();
                  }}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    (window as any).toggleVoiceInput?.('newTaskInput', 'newTaskVoiceBtn');
                  }}
                >
                  🎤 语音
                </button>
              </div>
            </div>
          </div>

          {/* 4. 快捷提示词微横条 */}
          <div class="new-task-quick-strip">
            <button
              type="button"
              class="quick-prompt-pill"
              onClick={() =>
                (window as any).fillQuickPrompt?.('帮我检查当前项目的定时任务和运行日志是否正常')
              }
            >
              🔍 检查运行状态
            </button>
            <button
              type="button"
              class="quick-prompt-pill"
              onClick={() => (window as any).fillQuickPrompt?.('运行单元测试并修复所有报错')}
            >
              🧪 跑测试修 Bug
            </button>
            <button
              type="button"
              class="quick-prompt-pill"
              onClick={() =>
                (window as any).fillQuickPrompt?.('查看 git status 并总结最近的代码改动')
              }
            >
              📦 总结代码改动
            </button>
          </div>

          <button
            type="button"
            class="primary-block-btn new-task-submit-btn"
            onClick={() => (window as any).submitNewTask?.()}
          >
            🚀 立即在电脑上启动任务
          </button>
        </div>
      </div>

      {/* 抽屉 2-b：项目文件夹完整选择抽屉（当项目很多时点全部唤起） */}
      <div
        class="sheet-backdrop"
        id="newTaskProjectPickerSheet"
        onClick={closeIfBackdrop('newTaskProjectPickerSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>📁 选择项目文件夹</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px;"
              onClick={() => (window as any).closeSheet?.('newTaskProjectPickerSheet')}
            >
              ✕
            </button>
          </div>
          <div style="padding:0 2px 10px;">
            <input
              type="text"
              class="auth-input"
              id="newTaskProjectSearchInput"
              placeholder="搜索项目名称或路径..."
              style="margin:0 0 10px;"
              onInput={e => (window as any).filterNewTaskProjects?.((e.target as any).value)}
            />
          </div>
          <div class="host-options-list" id="newTaskProjectPickerBody" style="max-height:50vh;overflow-y:auto;"></div>
        </div>
      </div>

      {/* 抽屉 3：会话更多操作菜单 */}
      <div
        class="sheet-backdrop"
        id="taskActionSheet"
        onClick={closeIfBackdrop('taskActionSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title" id="actionSheetTitle">
            会话操作
          </div>
          <div id="actionSheetBody"></div>
        </div>
      </div>

      {/* 抽屉 4：聊天页内「📂 项目文件速览抽屉」 */}
      <div
        class="sheet-backdrop"
        id="inChatFileSheet"
        onClick={closeIfBackdrop('inChatFileSheet')}
      >
        <div
          class="sheet-panel"
          style="padding-left:0;padding-right:0;padding-bottom:0;height:82dvh;display:flex;flex-direction:column;"
        >
          <div class="sheet-handle"></div>
          <div
            class="sheet-title"
            style="padding:0 16px 8px;margin:0;border-bottom:1px solid var(--border);"
          >
            <span id="inChatFileTitle">📂 当前项目文件速览</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeMobileFile?.()}
            >
              ✕
            </button>
          </div>
          <div id="inChatFileBody" style="flex:1;overflow-y:auto;"></div>
        </div>
      </div>

      {/* 抽屉 5：跨电脑迁移向导抽屉 */}
      <div
        class="sheet-backdrop"
        id="mobileSettingsSheet"
        onClick={closeIfBackdrop('mobileSettingsSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>📦 跨电脑一键迁移向导</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('mobileSettingsSheet')}
            >
              ✕
            </button>
          </div>
          <div id="migrateWizardBody"></div>
        </div>
      </div>

      {/* 抽屉 6：Rust 极速实时引擎与最流畅设置指南 */}
      <div
        class="sheet-backdrop"
        id="turboGuideSheet"
        onClick={closeIfBackdrop('turboGuideSheet')}
      >
        <div class="sheet-panel" style="max-height:86dvh;overflow-y:auto;">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>⚡ 极速实时同步 (Rust + SSE) 指南</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('turboGuideSheet')}
            >
              ✕
            </button>
          </div>
          <div id="turboGuideBody"></div>
        </div>
      </div>

      {/* 抽屉 7：端到端加密分享链接结果卡片 (#2) */}
      <div
        class="sheet-backdrop"
        id="shareResultSheet"
        onClick={closeIfBackdrop('shareResultSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>🔗 端到端加密分享已生成</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('shareResultSheet')}
            >
              ✕
            </button>
          </div>
          <div id="shareResultBody"></div>
        </div>
      </div>

      {/* 抽屉 8：6 位手机免密配对码弹窗 (#6) */}
      <div
        class="sheet-backdrop"
        id="pairingCodeSheet"
        onClick={closeIfBackdrop('pairingCodeSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>📱 添加新手机（6 位配对码）</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closePairingCodeSheet?.()}
            >
              ✕
            </button>
          </div>
          <div id="pairingCodeBody"></div>
        </div>
      </div>

      {/* 抽屉 9：剪贴板复制兜底面板 (#12) */}
      <div
        class="sheet-backdrop"
        id="copyFallbackSheet"
        onClick={closeIfBackdrop('copyFallbackSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span id="copyFallbackTitle">📋 复制内容</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('copyFallbackSheet')}
            >
              ✕
            </button>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
            当前浏览器限制自动写入剪贴板，请点下方按钮或长按文本框全选复制：
          </div>
          <textarea
            id="copyFallbackTextarea"
            readonly
            class="new-task-textarea"
            style="min-height:92px;font-family:var(--mono);font-size:12px;margin-bottom:10px;"
            onClick={e => (e.currentTarget as HTMLTextAreaElement).select()}
          ></textarea>
          <div style="display:flex;gap:8px;">
            <button
              type="button"
              class="primary-block-btn"
              style="margin-top:0;flex:1;"
              onClick={() => (window as any).retryCopyFromFallbackSheet?.()}
            >
              📋 点击复制
            </button>
            <button
              type="button"
              class="choice-chip"
              style="padding:0 16px;"
              onClick={() => (window as any).closeSheet?.('copyFallbackSheet')}
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {/* 抽屉 10：AI 模型选择器弹窗 */}
      <div
        class="sheet-backdrop"
        id="modelPickerSheet"
        onClick={closeIfBackdrop('modelPickerSheet')}
      >
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span id="modelPickerTitle">🤖 选择 AI 模型</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('modelPickerSheet')}
            >
              ✕
            </button>
          </div>
          <div id="modelPickerBody"></div>
        </div>
      </div>

      {/* 全屏 HTML 交互预览层（自带顶部安全区返回栏，解决移动端与 iOS 主屏幕模式体验网页无返回键问题） */}
      <div
        id="htmlPreviewOverlay"
        style="display:none;position:fixed;inset:0;z-index:9999;background:#0f172a;flex-direction:column;"
      >
        <div
          style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:max(10px, env(safe-area-inset-top)) 12px 10px;background:#0f172a;border-bottom:1px solid rgba(148,163,184,0.22);color:#f8fafc;flex-shrink:0;"
        >
          <button
            type="button"
            class="icon-pill-btn"
            style="background:rgba(255,255,255,0.12);color:#ffffff;border-color:rgba(255,255,255,0.22);font-weight:700;padding:6px 12px;"
            onClick={() => (window as any).closeFullscreenHtmlPreview?.()}
          >
            ‹ 返回对话
          </button>
          <span
            id="htmlPreviewOverlayTitle"
            style="font-size:13.5px;font-weight:700;color:#f8fafc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:center;"
          >
            🌐 HTML 交互预览
          </span>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button
              type="button"
              class="icon-pill-btn"
              id="htmlPreviewModeBtn"
              style="background:rgba(255,255,255,0.1);color:#e2e8f0;border-color:rgba(255,255,255,0.18);"
              onClick={() => (window as any).toggleFullscreenHtmlSource?.()}
            >
              &lt;/&gt; 源码
            </button>
            <button
              type="button"
              class="icon-pill-btn"
              title="重新加载网页"
              style="background:rgba(255,255,255,0.1);color:#e2e8f0;border-color:rgba(255,255,255,0.18);"
              onClick={() => (window as any).reloadFullscreenHtmlPreview?.()}
            >
              🔄
            </button>
          </div>
        </div>
        <div id="htmlPreviewOverlayBody" style="flex:1;position:relative;background:#ffffff;overflow:auto;"></div>
      </div>
    </Fragment>
  );
}

