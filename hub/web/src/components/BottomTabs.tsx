import { h } from 'preact';

export function BottomTabs() {
  return (
    <footer class="bottom-tabs">
      <button
        type="button"
        class="tab-btn active"
        id="tab-chats"
        onClick={() => (window as any).switchTab?.('chats')}
      >
        <span class="icon">💬</span>
        <span>对话</span>
      </button>
      <button
        type="button"
        class="tab-btn"
        id="tab-files"
        onClick={() => (window as any).switchTab?.('files')}
      >
        <span class="icon">📂</span>
        <span>项目文件</span>
      </button>
      <button
        type="button"
        class="tab-btn"
        id="tab-settings"
        onClick={() => (window as any).switchTab?.('settings')}
      >
        <span class="icon">⚙️</span>
        <span>设备与设置</span>
      </button>
    </footer>
  );
}

