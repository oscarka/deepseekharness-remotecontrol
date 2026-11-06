import { h, Fragment } from 'preact';
import { TopBar } from './components/TopBar';
import { BottomTabs } from './components/BottomTabs';
import { ChatStage } from './components/ChatStage';
import { Sheets } from './components/Sheets';

export function App() {
  return (
    <Fragment>
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
      </div>

      {/* 密码保护锁屏遮罩（未登录或密码错误时自动拦截，保护你的任务隐私） */}
      <div class="auth-overlay" id="authOverlay">
        <div class="auth-card">
          <div style="font-size:38px;margin-bottom:8px;">🔒</div>
          <div style="font-size:18px;font-weight:800;color:var(--text);">DSH 远控隐私锁</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:6px;line-height:1.5;">
            请输入你的总控台访问密码（HUB_TOKEN）或 6 位配对码解锁对话列表
          </div>
          <input
            type="password"
            class="auth-input"
            id="authTokenInput"
            placeholder="输入访问密码或 6 位配对码..."
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
