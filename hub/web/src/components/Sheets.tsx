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
              style="font-size:12px;color:#64748b;font-weight:500;"
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
              style="border:none;background:transparent;color:#64748b;font-size:18px;cursor:pointer;"
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
            style="display:flex;align-items:center;justify-content:space-between;"
          >
            <span>4. 任务指令（或点选下方快捷指令）</span>
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
          <textarea
            class="new-task-textarea"
            id="newTaskInput"
            placeholder="输入你想让电脑执行的任务..."
            autocorrect="on"
            autocapitalize="sentences"
            spellcheck={true}
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
              style="border:none;background:transparent;color:#64748b;font-size:18px;cursor:pointer;"
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
              style="border:none;background:transparent;color:#64748b;font-size:18px;cursor:pointer;"
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
              style="border:none;background:transparent;color:#64748b;font-size:18px;cursor:pointer;"
              onClick={() => (window as any).closeSheet?.('turboGuideSheet')}
            >
              ✕
            </button>
          </div>
          <div id="turboGuideBody"></div>
        </div>
      </div>
    </Fragment>
  );
}
