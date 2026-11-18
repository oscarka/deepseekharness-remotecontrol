import { h } from 'preact';

export function TriageDeck() {
  return (
    <section class="dsh-triage-overlay" id="triageDeckOverlay" aria-label="滑卡批阅模式">
      <div class="dsh-triage-drag-pill" id="triageDragPill"></div>

      <header class="dsh-triage-topbar">
        <button
          type="button"
          class="dsh-triage-top-pill"
          id="triageUndoBtn"
          disabled
          onClick={() => (window as any).triageUndoLast?.()}
        >
          ↩ 撤回
        </button>

        <div class="dsh-triage-center-title">
          <span id="triageCenterTitleText">滑卡批阅</span>
          <span class="dsh-triage-count-chip" id="triageCountChip">
            0
          </span>
        </div>

        <button
          type="button"
          class="dsh-triage-top-pill"
          id="triageBackToListBtn"
          onClick={() => (window as any).closeTriageDeckMode?.()}
        >
          ☰ 列表模式
        </button>
      </header>

      <div class="dsh-triage-stack" id="triageCardStack">
        <div class="dsh-triage-back-card layer-deep" id="triageLayerDeep">
          <div class="dsh-triage-back-inner"></div>
        </div>
        <div class="dsh-triage-back-card layer-left" id="triageLayerLeft">
          <div class="dsh-triage-back-inner"></div>
        </div>
        <div class="dsh-triage-back-card layer-right" id="triageLayerRight">
          <div class="dsh-triage-back-inner" id="triageLayerRightInner"></div>
        </div>
        <div class="dsh-triage-fg-card" id="triageFgCard"></div>
      </div>

      <div
        class="dsh-triage-modal"
        id="triageDetailModal"
        onClick={e => {
          if (e.target === e.currentTarget) {
            (window as any).closeTriageDetailModal?.();
          }
        }}
      >
        <div class="dsh-triage-modal-sheet" id="triageDetailModalContent">
          <div class="dsh-triage-modal-hdr" id="triageModalHeader">
            <div class="dsh-triage-sheet-grabber" aria-hidden="true"></div>
            <div class="dsh-triage-modal-hdr-row">
              <strong id="triageModalTitle" style="font-size:15px;color:#0f172a;">
                详情
              </strong>
              <div class="dsh-triage-modal-actions">
                <button
                  type="button"
                  class="dsh-triage-open-chat"
                  id="triageModalExpandBtn"
                  onClick={() => (window as any).toggleTriageModalExpand?.()}
                >
                  ⤢ 全屏
                </button>
                <button
                  type="button"
                  class="dsh-triage-open-chat"
                  id="triageModalCloseBtn"
                  onClick={() => (window as any).closeTriageDetailModal?.()}
                >
                  收起 ✕
                </button>
              </div>
            </div>
          </div>
          <div class="dsh-triage-modal-body" id="triageModalScrollBody"></div>
        </div>
      </div>
    </section>
  );
}
