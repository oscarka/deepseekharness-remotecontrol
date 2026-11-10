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
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <span>✨ 新建远程对话任务</span>
            <button
              type="button"
              style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('newTaskSheet')}
            >
              ✕
            </button>
          </div>

          <div class="form-label">1. 选择执行电脑</div>
          <div class="chip-selector" id="newTaskHostChips"></div>

          <div class="form-label">2. 选择执行引擎 (Harness / IDE)</div>
          <div class="chip-selector" id="newTaskHarnessChips"></div>

          <div class="form-label">3. 选择项目文件夹（免手敲路径）</div>
          <div class="chip-selector" id="newTaskProjectChips"></div>

          <div
            class="form-label"
            style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;"
          >
            <span>4. 任务指令（支持截图或语音）</span>
            <div style="display:inline-flex;align-items:center;gap:6px;">
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
                class="voice-pill-btn"
                id="newTaskModelBtn"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).openModelPickerSheet?.('newTask');
                }}
              >
                <span id="newTaskModelBtnLabel">🤖 默认模型</span>
                <span style="opacity:0.7;font-size:10px;">▾</span>
              </button>
              <button
                type="button"
                class="voice-pill-btn"
                id="newTaskImageBtn"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).triggerImagePicker?.('newTask');
                }}
              >
                🖼️ 传截图
              </button>
              <button
                type="button"
                class="voice-pill-btn"
                id="newTaskVoiceBtn"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  (window as any).toggleVoiceInput?.('newTaskInput', 'newTaskVoiceBtn');
                }}
              >
                🎤 语音输入
              </button>
            </div>
          </div>
          <div class="chip-selector" style="margin-bottom:6px;">
            <button
              type="button"
              class="choice-chip"
              onClick={() =>
                (window as any).fillQuickPrompt?.('帮我检查当前项目的定时任务和运行日志是否正常')
              }
            >
              🔍 检查运行状态
            </button>
            <button
              type="button"
              class="choice-chip"
              onClick={() => (window as any).fillQuickPrompt?.('运行单元测试并修复所有报错')}
            >
              🧪 跑测试修 Bug
            </button>
            <button
              type="button"
              class="choice-chip"
              onClick={() =>
                (window as any).fillQuickPrompt?.('查看 git status 并总结最近的代码改动')
              }
            >
              📦 总结代码改动
            </button>
          </div>
          <div
            class="composer-attachments-strip"
            id="newTaskAttachmentsStrip"
            style="display:none;margin-bottom:8px;border:1px solid var(--border);border-radius:12px;"
          ></div>
          <textarea
            class="new-task-textarea"
            id="newTaskInput"
            placeholder="输入你想让电脑执行的任务，或点击右上角🖼️传截图..."
            autocorrect="on"
            autocapitalize="sentences"
            spellcheck={true}
            onPaste={e => (window as any).onComposerPaste?.(e, 'newTask')}
          ></textarea>

          <button
            type="button"
            class="primary-block-btn"
            onClick={() => (window as any).submitNewTask?.()}
          >
            🚀 立即在电脑上启动任务
          </button>
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
    </Fragment>
  );
}

