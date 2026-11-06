import { h, Fragment } from 'preact';

export function TopBar() {
  return (
    <Fragment>
      {/* 1. 唯一极简顶栏 */}
      <header class="top-bar" id="mobileTopHostBtn">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;">
          <button
            type="button"
            class="host-switcher-btn"
            onClick={() => (window as any).openHostSheet?.()}
          >
            <span class="status-dot" id="topHostDot"></span>
            <span class="host-switcher-name" id="topHostName">
              连接中...
            </span>
            <span class="host-switcher-caret">▾</span>
          </button>
          <button
            type="button"
            id="turboBadgeBtn"
            onClick={() => (window as any).openTurboGuideSheet?.()}
            style="border:1px solid #a7f3d0;background:#ecfdf5;color:#059669;border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;"
          >
            ⚡ 极速
          </button>
        </div>
        <button
          type="button"
          class="new-chat-btn"
          onClick={() => (window as any).openNewTaskSheet?.()}
        >
          <span>＋</span>
          <span>新建对话</span>
        </button>
      </header>

      {/* 2. 搜索框 + 智能状态/项目筛选条 */}
      <div class="search-and-filter" id="searchAndFilterBox">
        <div class="search-box-wrap">
          <div class="search-box">
            <span style="font-size:13px;color:#94a3b8;">🔍</span>
            <input
              id="searchInput"
              placeholder="搜索对话标题、项目或内容..."
              onInput={() => (window as any).onSearchInput?.()}
            />
            <button
              type="button"
              class="search-clear"
              id="searchClearBtn"
              onClick={() => (window as any).clearSearch?.()}
            >
              ✕
            </button>
          </div>
        </div>
        <nav class="filter-strip" id="projectStrip"></nav>
      </div>
    </Fragment>
  );
}
