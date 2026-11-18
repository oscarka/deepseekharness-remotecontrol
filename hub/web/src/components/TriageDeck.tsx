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
          <span>滑卡批阅</span>
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
        <div class="dsh-triage-modal-sheet" id="triageDetailModalContent"></div>
      </div>
    </section>
  );
}
