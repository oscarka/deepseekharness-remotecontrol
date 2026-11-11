import { h, Fragment } from 'preact';
import { TopBar } from './components/TopBar';
import { BottomTabs } from './components/BottomTabs';
import { ChatStage } from './components/ChatStage';
import { Sheets } from './components/Sheets';

const HARNESS_SVG_SPRITE = `<svg id="dshHarnessSvgDefs" width="0" height="0" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dsh-grad-ocean" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="dsh-grad-codex" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8A9CFF"/>
      <stop offset="50%" stop-color="#5562FF"/>
      <stop offset="100%" stop-color="#3941FF"/>
    </linearGradient>

    <mask id="dsh-agy-mask" maskUnits="userSpaceOnUse" x="0" y="1" width="24" height="23">
      <path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z" fill="#fff"/>
    </mask>
    <filter id="dsh-agy-blur-sm" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
    <filter id="dsh-agy-blur-md" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="3.8"/>
    </filter>

    <mask id="dsh-wb-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24" style="mask-type:luminance">
      <path d="M18.821 0H5.179A5.18 5.18 0 0 0 0 5.179v13.642A5.18 5.18 0 0 0 5.179 24h13.642A5.18 5.18 0 0 0 24 18.821V5.179A5.18 5.18 0 0 0 18.821 0" fill="#fff"/>
    </mask>
    <linearGradient id="dsh-wb-bg" gradientUnits="userSpaceOnUse" x1="12" y1="0" x2="12" y2="24">
      <stop stop-color="#0ec8a9"/>
      <stop offset="1" stop-color="#01c886"/>
    </linearGradient>
    <linearGradient id="dsh-wb-body" gradientUnits="userSpaceOnUse" x1="10.098" y1="6.802" x2="21.325" y2="26.248">
      <stop stop-color="#fff" stop-opacity=".85"/>
      <stop offset=".438" stop-color="#fff"/>
    </linearGradient>
    <filter id="dsh-wb-glow" x="-50%" y="-50%" width="220%" height="220%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="4.5"/>
    </filter>

    <!-- 1. Antigravity IDE -->
    <symbol id="dsh-icon-ide" viewBox="0 0 24 24">
      <rect x="0.4" y="0.4" width="23.2" height="23.2" rx="5.2" fill="#14161B" stroke="#334155" stroke-width="0.8"/>
      <g stroke="#ffffff" stroke-opacity="0.07" stroke-width="0.6">
        <line x1="6" y1="0" x2="6" y2="24"/><line x1="12" y1="0" x2="12" y2="24"/><line x1="18" y1="0" x2="18" y2="24"/>
        <line x1="0" y1="6" x2="24" y2="6"/><line x1="0" y1="12" x2="24" y2="12"/><line x1="0" y1="18" x2="24" y2="18"/>
      </g>
      <g transform="translate(2.9, 2.7) scale(0.76)">
        <g mask="url(#dsh-agy-mask)">
          <rect x="-4" y="-4" width="32" height="32" fill="#3186FF"/>
          <g filter="url(#dsh-agy-blur-md)">
            <circle cx="3" cy="6" r="9" fill="#00B95C"/>
            <circle cx="21" cy="5" r="9" fill="#FC413D"/>
            <circle cx="11" cy="0" r="8" fill="#FBBC04"/>
            <ellipse cx="12" cy="21" rx="13" ry="9" fill="#3186FF"/>
          </g>
          <g filter="url(#dsh-agy-blur-sm)">
            <circle cx="4" cy="2" r="5" fill="#FFE432"/>
            <circle cx="21" cy="4" r="6" fill="#FC413D"/>
          </g>
        </g>
      </g>
    </symbol>

    <!-- 2. WorkBuddy -->
    <symbol id="dsh-icon-workbuddy" viewBox="0 0 24 24">
      <g mask="url(#dsh-wb-mask)">
        <path d="M18.821 0H5.179A5.18 5.18 0 0 0 0 5.179v13.642A5.18 5.18 0 0 0 5.179 24h13.642A5.18 5.18 0 0 0 24 18.821V5.179A5.18 5.18 0 0 0 18.821 0" fill="url(#dsh-wb-bg)"/>
        <circle cx="18.8" cy="25" r="7.7" fill="#ffe355" fill-opacity=".55" filter="url(#dsh-wb-glow)"/>
        <path d="M18.456 2.031c.235-.21.25-.219.422-.23.28-.02.535.115.971.512 1.019.925 2.437 2.827 3.318 4.452l.34.63.482.24c.464.235 1.226.715 1.544.973.144.12.165.122.315.064.675-.263 1.642.086 2.495.904.768.736 1.504 1.994 1.786 3.044.041.17.096.533.116.803.064.95-.24 1.708-.827 2.052-.12.069-.128.088-.125.386.027 1.423-.356 2.842-1.126 4.227-.87 1.555-2.418 3.163-4.513 4.679-1.126.819-3.788 2.37-4.991 2.915-2.884 1.298-5.196 1.795-7.204 1.55-1.197-.146-2.553-.613-3.355-1.156-.211-.146-.245-.155-.406-.109-.859.247-1.983-.26-2.938-1.32-.381-.424-.996-1.465-1.196-2.022-.461-1.303-.37-2.48.245-3.182.159-.181.164-.189.129-.493a12 12 0 0 1-.057-1.71l.02-.445-.666-1.18c-1.033-1.838-1.69-3.381-1.943-4.56-.133-.647-.125-.934.039-1.146.1-.128.428-.261.823-.335.994-.174 3.162-.016 5.575.41l.25.044.551-.488c.914-.81 1.522-1.263 2.642-1.962 1.166-.73 2.483-1.33 3.967-1.806l.475-.152.262-.687c.937-2.473 1.896-4.295 2.58-4.902m-7.845 12.67c-1.059.61-1.588.916-1.977 1.259a5.21 5.21 0 0 0-1.494 5.57c.165.491.47 1.02 1.082 2.08.61 1.058.917 1.587 1.26 1.976a5.21 5.21 0 0 0 5.571 1.493c.491-.165 1.02-.471 2.079-1.082l6.09-3.516c1.058-.611 1.587-.916 1.976-1.259a5.21 5.21 0 0 0 1.492-5.572c-.165-.491-.47-1.02-1.082-2.079-.611-1.058-.916-1.588-1.259-1.976a5.21 5.21 0 0 0-5.571-1.493c-.491.165-1.02.47-2.08 1.082z" fill="url(#dsh-wb-body)"/>
        <path d="M13.882 18.795a1.203 1.203 0 0 0-2.083 1.203l1.295 2.243a1.203 1.203 0 1 0 2.083-1.203zm6.49-3.747a1.203 1.203 0 1 0-2.083 1.203l1.295 2.243a1.203 1.203 0 0 0 2.083-1.203z" fill="#fff"/>
      </g>
    </symbol>

    <!-- 3. OpenAI Codex: 官方蓝紫圆角底座 + 官方六瓣花云与 >_ 终端镂空标志 -->
    <symbol id="dsh-icon-codex" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="url(#dsh-grad-codex)"/>
      <g transform="translate(2.7, 2.7) scale(0.775)">
        <path fill="#FFFFFF" fill-rule="evenodd" clip-rule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"/>
      </g>
    </symbol>

    <!-- 4. Claude Code -->
    <symbol id="dsh-icon-claude" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="#D97757"/>
      <g stroke="#FFF7ED" stroke-width="2.0" stroke-linecap="round">
        <line x1="12" y1="4.5" x2="12" y2="19.5"/>
        <line x1="4.5" y1="12" x2="19.5" y2="12"/>
        <line x1="6.7" y1="6.7" x2="17.3" y2="17.3"/>
        <line x1="17.3" y1="6.7" x2="6.7" y2="17.3"/>
        <line x1="9.1" y1="5.1" x2="14.9" y2="18.9" stroke-width="1.4"/>
        <line x1="5.1" y1="14.9" x2="18.9" y2="9.1" stroke-width="1.4"/>
      </g>
      <circle cx="12" cy="12" r="2.2" fill="#FFF7ED"/>
    </symbol>

    <!-- 5. DeepSeek Harness -->
    <symbol id="dsh-icon-dsh" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.4" fill="url(#dsh-grad-ocean)"/>
      <path d="M5.2 13.6c0-3.5 3.1-6 7.1-6 3.2 0 5.3 1.8 6.1 3.9.5-1.1 1.6-2 3-2.1-.3 1.8-1.3 3.1-2.7 3.6.2 2.9-2.5 5.2-6.6 5.2-4.1 0-6.9-1.9-6.9-4.6z" fill="#FFFFFF"/>
      <circle cx="9.2" cy="12.2" r="1.0" fill="#1D4ED8"/>
      <path d="M10.5 5.2c.4-.9 1.3-1.4 2.1-1.2M8.8 5.8c-.3-.8-.9-1.2-1.7-1.1" stroke="#93C5FD" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    </symbol>
  </defs>
</svg>`;

export function App() {
  return (
    <Fragment>
      <div
        style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: HARNESS_SVG_SPRITE }}
      />
      {/* 顶部轻提示 Toast */}
      <div class="install-hint" id="installHint">
        <div class="install-hint-text">
          📲 想收锁屏通知？点底部分享 <strong>→ 添加到主屏幕</strong>，再从桌面图标打开
        </div>
        <button
          type="button"
          class="install-hint-close"
          onClick={() => (window as any).dismissInstallHint?.()}
        >
          知道了
        </button>
      </div>

      <div class="toast-pill" id="toastPill">
        操作成功
      </div>

      {/* 电脑端视图模式切换器（真机手机端自动隐藏） */}
      <div class="preview-toolbar">
        <span>视图体验：</span>
        <button
          type="button"
          id="btnPhoneMode"
          class="active"
          onClick={() => (window as any).setPreviewMode?.('phone')}
        >
          📱 iPhone 手机视图
        </button>
        <button
          type="button"
          id="btnDesktopMode"
          onClick={() => (window as any).setPreviewMode?.('desktop')}
        >
          🖥️ 电脑双栏同屏视图
        </button>
        <button
          type="button"
          data-lang-toggle="1"
          onClick={() => (window as any).toggleLangPreference?.()}
        >
          🌐 EN
        </button>
      </div>

      {/* 密码保护锁屏遮罩（未登录或密码错误时自动拦截，保护你的任务隐私） */}
      <div class="auth-overlay" id="authOverlay">
        <div class="auth-card" style="position:relative;">
          <button
            type="button"
            data-lang-toggle="1"
            onClick={() => (window as any).toggleLangPreference?.()}
            style="position:absolute;top:14px;right:14px;border:1px solid var(--border);background:var(--subtle);color:var(--text-secondary);border-radius:999px;padding:4px 10px;font-size:11.5px;font-weight:700;cursor:pointer;"
          >
            🌐 EN
          </button>
          <div style="font-size:38px;margin-bottom:8px;">🔒</div>
          <div style="font-size:18px;font-weight:800;color:var(--text);">DSH 远控控制台登录</div>
          <div style="font-size:12.5px;color:var(--text-secondary);margin-top:8px;line-height:1.6;text-align:left;background:var(--subtle);padding:10px 12px;border-radius:10px;border:1px solid var(--border);">
            <div>💻 <strong>电脑首次接入</strong>：输入部署时设置的管理密码 (<code>HUB_TOKEN</code>)</div>
            <div style="margin-top:4px;">📱 <strong>手机免密登录</strong>：直接扫电脑网页上的二维码，或输入 6 位配对码</div>
          </div>
          <input
            type="password"
            class="auth-input"
            id="authTokenInput"
            placeholder="输入管理密码 (HUB_TOKEN) 或 6 位配对码..."
            onKeyDown={e => {
              if (e.key === 'Enter') (window as any).submitAuthLogin?.();
            }}
          />
          <button
            type="button"
            class="primary-block-btn"
            onClick={() => (window as any).submitAuthLogin?.()}
          >
            🔓 解锁进入总控台
          </button>
        </div>
      </div>

      <div class="app-shell">
        {/* 左栏主面板 */}
        <div class="primary-pane">
          <TopBar />
          <main class="main-viewport" id="mainViewport"></main>
          <BottomTabs />
        </div>

        {/* 右栏 / 二级全屏对话页 */}
        <ChatStage />

        {/* 6 大功能半屏抽屉 */}
        <Sheets />

        {/* 悬浮回到底部按钮 (兼容测试与长对话阅读) */}
        <button
          type="button"
          id="scrollBottomBtn"
          style="display:none;"
          onClick={() => (window as any).scrollToChatBottom?.()}
        >
          ⬇️ 最新消息
        </button>
      </div>
    </Fragment>
  );
}
