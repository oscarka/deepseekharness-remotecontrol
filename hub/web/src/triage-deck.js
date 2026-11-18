import {
  renderHarnessBadgeHtml,
  stripRedundantProjectPrefix,
  formatCompactProjectLabel,
} from './utils/session-labels.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const REST_X = 5;
const REST_Y = 2;
const REST_SCALE = 0.984;
const REST_ROT = 1.25;
const GRACE_UNDO_MS = 2000;

const HIGH_RISK_RE =
  /(?:--drop-[a-z0-9_-]*|--accept-data-loss\b|\b(?:rm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b|rm\s+--recursive\b|git\s+push\b[^\n]*(?:\s-f\b|--force\b|--tags\b)|git\s+reset\s+--hard\b|git\s+clean\s+-[a-zA-Z]*f|DROP\s+(?:TABLE|DATABASE|SCHEMA)\b|TRUNCATE\s+TABLE\b|kubectl\s+delete\b|terraform\s+destroy\b|gcloud\s+[^\n]*\bdelete\b|npm\s+publish\b|docker\s+push\b|mkfs\b|dd\s+if=|sudo\s+))/i;

const DANGER_TOKEN_RE =
  /(\brm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\b|--force-with-lease\b|--force\b|\s-f\b|--hard\b|--drop-[a-z0-9_-]*|--accept-data-loss\b|\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\s+TABLE\b|\bnpm\s+publish\b|\bdocker\s+push\b|\bkubectl\s+delete\b|\bterraform\s+destroy\b|\bsudo\b)/gi;

export function isTriageEligibleSession(s) {
  if (!s) return false;
  if (s.status === 'running') return false;
  if (s.status === 'approval') {
    if (s.approvalObj?.settling) return false;
    return true;
  }
  return Boolean(s.hasUnreadConclusion || s.isUnreadInterrupted);
}

export function isHighRiskCommand(commandLine = '', reason = '') {
  const combined = `${String(commandLine || '')}\n${String(reason || '')}`;
  return HIGH_RISK_RE.test(combined);
}

export function highlightDangerousCommandHtml(rawCmd = '') {
  const safe = esc(String(rawCmd || ''));
  return safe.replace(DANGER_TOKEN_RE, '<span class="dsh-triage-hl-danger">$1</span>');
}

export function extractLastUserPromptAndMedia(transcript = []) {
  const list = Array.isArray(transcript) ? transcript : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (!m || m.role !== 'user') continue;
    let raw = String(m.text || '').trim();
    if (!raw) continue;

    // Strip XML wrapper tags if present
    const reqMatch = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
    if (reqMatch) {
      raw = reqMatch[1].trim();
    } else {
      raw = raw.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '').trim();
    }

    const mediaPaths = [];
    const addPath = p => {
      const clean = String(p || '').replace(/^file:\/\//i, '').trim();
      if (clean && !mediaPaths.includes(clean)) mediaPaths.push(clean);
    };

    // 1. Parse DSH mobile uploaded image block
    raw = raw.replace(
      /\[手机端上传图片附件\s*\(\d+\s*张\)[^\]]*\]:?([\s\S]*)$/i,
      (_full, tail) => {
        const lines = String(tail || '').split('\n');
        for (const ln of lines) {
          const pathMatch = /:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
          if (pathMatch?.[1]) addPath(pathMatch[1]);
        }
        return '';
      }
    );

    // 2. Parse inline [🖼️ 已附带 N 张截图] optimistic suffix
    let optimisticImgCount = 0;
    raw = raw.replace(/\[🖼️\s*已附带\s*(\d+)\s*张截图\]/g, (_m, n) => {
      optimisticImgCount += Number(n) || 1;
      return '';
    });

    // 3. Also check m.media / m.images array if present
    for (const med of [...(Array.isArray(m.media) ? m.media : []), ...(Array.isArray(m.images) ? m.images : [])]) {
      if (typeof med === 'string') addPath(med);
      else if (med?.uri || med?.path) addPath(med.uri || med.path);
    }

    const cleanText = raw.replace(/\n{3,}/g, '\n\n').trim();
    const imageCount = Math.max(mediaPaths.length, optimisticImgCount);
    if (cleanText || imageCount > 0) {
      return {
        text: cleanText || '（发送了图片附件）',
        mediaPaths,
        imageCount,
      };
    }
  }
  return { text: '', mediaPaths: [], imageCount: 0 };
}

export function extractSessionChangedFiles(s) {
  if (!s) return { files: [], hasLineCounts: false, totalAdd: 0, totalDel: 0 };
  if (Array.isArray(s.changedFiles) && s.changedFiles.length > 0) {
    const files = s.changedFiles.map(fc => ({
      name: fc.displayPath || fc.name || fc.path || 'file',
      path: fc.path || fc.name || '',
      added: Number(fc.added) || 0,
      removed: Number(fc.removed) || 0,
    }));
    const totalAdd = files.reduce((acc, f) => acc + f.added, 0);
    const totalDel = files.reduce((acc, f) => acc + f.removed, 0);
    return { files, hasLineCounts: true, totalAdd, totalDel };
  }

  // Fallback: scan transcript tool calls for file-writing tools (Claude / WorkBuddy / DSH)
  const seen = new Map();
  const tr = Array.isArray(s.transcript) ? s.transcript : [];
  for (const m of tr) {
    if (!m || m.role !== 'assistant') continue;
    const tools = Array.isArray(m.toolCalls) && m.toolCalls.length > 0 ? m.toolCalls : (m.tools || []);
    for (const t of tools) {
      if (!t || typeof t !== 'object') continue;
      const tName = String(t.name || '');
      if (!/^(?:write_file|edit_file|Write|Edit|MultiEdit|NotebookEdit|replace_in_file|create_file)$/i.test(tName)) {
        continue;
      }
      const rawPath = String(t.filePath || t.path || t.targetFile || '').trim();
      if (!rawPath && t.summary) {
        const mPath = /([a-zA-Z0-9_.\-/]+\.[a-zA-Z0-9]{1,8})/.exec(String(t.summary));
        if (mPath?.[1]) {
          seen.set(mPath[1], { name: mPath[1], path: mPath[1], added: 0, removed: 0 });
        }
      } else if (rawPath) {
        const shortName = rawPath.split('/').slice(-2).join('/');
        seen.set(rawPath, { name: shortName || rawPath, path: rawPath, added: 0, removed: 0 });
      }
    }
  }
  const fallbackFiles = [...seen.values()];
  return { files: fallbackFiles, hasLineCounts: false, totalAdd: 0, totalDel: 0 };
}

function localizeApprovalOptionLabel(rawLabel = '', idx = 1) {
  const s = String(rawLabel || '').trim();
  if (!s) return `${idx}. 允许执行`;
  let m = /^Yes,\s*allow\s+this\s+time$/i.exec(s);
  if (m) return `${idx}. 本次允许执行`;
  m = /^Yes,\s*and\s+always\s+allow\s+'([^']+)'\s+in\s+this\s+conversation$/i.exec(s);
  if (m) return `${idx}. 本对话内始终允许 '${m[1]}'`;
  m = /^Yes,\s*and\s+always\s+allow\s+in\s+this\s+conversation$/i.exec(s);
  if (m) return `${idx}. 本对话内始终允许`;
  m = /^Yes,\s*and\s+always\s+allow\s+'([^']+)'$/i.exec(s);
  if (m) return `${idx}. 始终允许 '${m[1]}'`;
  m = /^Yes,\s*and\s+always\s+allow$/i.exec(s);
  if (m) return `${idx}. 始终允许该操作`;
  return /^\d+\./.test(s) ? s : `${idx}. ${s}`;
}

function shortenButtonOptionText(label = '') {
  const clean = String(label || '')
    .replace(/^[0-9A-Za-z]+\.\s*/, '')
    .replace(/（推荐）|\(Recommended\)/gi, '')
    .trim();
  return clean.length > 13 ? `${clean.slice(0, 12)}…` : (clean || '确认');
}

function extractPlainSummaryFromMarkdown(md = '') {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' [代码块] ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function buildTriageCardViewModel(s, shortHostMap = {}) {
  const hostShort = shortHostMap[s.hostId] || s.hostName || s.hostId || '电脑';
  const projShort = formatCompactProjectLabel(s.project || '');
  const cleanTitle = stripRedundantProjectPrefix(s.title || '未命名会话', s.project || '') || '未命名会话';
  const promptInfo = extractLastUserPromptAndMedia(s.transcript);
  const diffInfo = extractSessionChangedFiles(s);
  const canSendPrompt = s.controlMode !== 'observe-only' && s.capabilities?.canSendPrompt !== false;

  const tr = Array.isArray(s.transcript) ? s.transcript : [];
  let latestAssistantMsg = null;
  for (let i = tr.length - 1; i >= 0; i -= 1) {
    if (tr[i]?.role === 'assistant' && String(tr[i]?.text || '').trim()) {
      latestAssistantMsg = tr[i];
      break;
    }
  }

  // 1. Structured Question Approval (`ask_question`)
  const app = s.approvalObj;
  const isQuestion = Boolean(
    s.status === 'approval' && app && (app.kind === 'question' || Array.isArray(app.questions))
  );

  if (isQuestion) {
    const questions = Array.isArray(app.questions) && app.questions.length > 0
      ? app.questions
      : [{ id: 'q_1', question: app.promptTitle || '请做出选择以继续', options: [] }];
    const primaryQ = questions[0];
    const qId = String(primaryQ.id || 'q_1');
    const rawOpts = Array.isArray(primaryQ.options) ? primaryQ.options : [];
    const alpha = 'ABCDEFGH';
    const options = rawOpts.map((o, idx) => {
      const rawLbl = String(o?.label || o || `选项 ${idx + 1}`);
      const prefixed = /^[0-9A-Z]+\.\s/.test(rawLbl) ? rawLbl : `${alpha[idx] || idx + 1}. ${rawLbl}`;
      return {
        value: rawLbl,
        label: prefixed,
        shortBtn: shortenButtonOptionText(rawLbl),
        desc: o?.description ? String(o.description) : '',
      };
    });
    const extraCount = questions.length > 1 ? `（共 ${questions.length} 个问题）` : '';
    return {
      cardKey: `q:${s.id}:${app.code || ''}`,
      sessionId: s.id,
      hostId: s.hostId,
      harness: s.harness,
      title: cleanTitle,
      sub: `${hostShort} · ${projShort} · 待你选择`,
      promptInfo,
      diffInfo,
      kind: 'question',
      risk: 'normal',
      code: app.code || '',
      qId,
      questions,
      multi: Boolean(primaryQ.multiSelect),
      headline: `${primaryQ.question || app.promptTitle || '请做出选择以继续'}${extraCount}`,
      cmdLine: '',
      cmdReason: '',
      replyPreview: '',
      fullReplyMarkdown: latestAssistantMsg?.text || '',
      options,
      canCustom: true,
      customLabel: '其他方案 / 补充说明…',
    };
  }

  // 2. Tool / Command Approval (`status === 'approval'`)
  if (s.status === 'approval' && app) {
    const cmdLine = String(app.commandLine || app.reason || '').trim();
    const cmdReason = String(app.subtitle || app.promptTitle || `请求调用 ${app.toolName || '工具'}`).trim();
    const risk = isHighRiskCommand(cmdLine, cmdReason) ? 'high' : 'normal';
    const rawOpts = Array.isArray(app.options) && app.options.length > 0
      ? app.options
      : [
          { index: 1, label: '1. 本次允许执行' },
          { index: 4, label: '不执行，告诉 AI 改怎么做…' },
        ];

    const positiveOpts = [];
    let denyOptIndex = 4;
    rawOpts.forEach((rawOpt, idx) => {
      const optObj = typeof rawOpt === 'string' ? { index: idx + 1, label: rawOpt } : rawOpt;
      const optIdx = Number(optObj.index) || idx + 1;
      const lbl = String(optObj.label || '');
      if (optIdx === 4 || /^(?:no\b|skip\b|deny\b|reject\b|拒绝|不执行|取消)/i.test(lbl)) {
        denyOptIndex = optIdx;
      } else {
        const localized = localizeApprovalOptionLabel(lbl, positiveOpts.length + 1);
        positiveOpts.push({
          optionIndex: optIdx,
          label: localized,
          shortBtn: shortenButtonOptionText(localized),
          desc: '',
        });
      }
    });

    if (positiveOpts.length === 0) {
      positiveOpts.push({
        optionIndex: 1,
        label: '1. 本次允许执行',
        shortBtn: '本次允许执行',
        desc: '',
      });
    }

    const assistantLead = latestAssistantMsg?.text
      ? extractPlainSummaryFromMarkdown(latestAssistantMsg.text).split('\n')[0]?.slice(0, 68)
      : '';
    const headline = assistantLead || app.promptTitle || `等待确认工具调用：${app.toolName || '命令'}`;

    return {
      cardKey: `app:${s.id}:${app.code || ''}`,
      sessionId: s.id,
      hostId: s.hostId,
      harness: s.harness,
      title: cleanTitle,
      sub: `${hostShort} · ${projShort} · ${risk === 'high' ? '高危授权' : '命令授权'}`,
      promptInfo,
      diffInfo,
      kind: 'approval',
      risk,
      code: app.code || '',
      multi: false,
      headline,
      cmdLine,
      cmdReason: risk === 'high' ? `⚠️ 高危操作拦截 · ${cmdReason}` : `🔧 ${cmdReason}`,
      replyPreview: '',
      fullReplyMarkdown: latestAssistantMsg?.text || '',
      options: positiveOpts,
      denyOptionIndex: denyOptIndex,
      canCustom: canSendPrompt,
      customLabel: `${positiveOpts.length + 1}. 不执行，告诉 AI 改怎么做…`,
    };
  }

  // 3. Unread Conclusion or Unread Interrupted (`hasUnreadConclusion || isUnreadInterrupted`)
  const isInterrupted = Boolean(s.isUnreadInterrupted);
  const fullMd = latestAssistantMsg?.text || s.rawLastPreview || s.lastPreview || '';
  const plainBody = extractPlainSummaryFromMarkdown(fullMd);
  const lines = plainBody.split('\n').map(l => l.trim()).filter(Boolean);
  const headline = isInterrupted
    ? `⚠️ 任务异常中断：${(lines[0] || s.lastPreview || '请查看详情').slice(0, 56)}`
    : `✅ 已完工待阅：${(lines[0] || cleanTitle).slice(0, 56)}`;
  const replyPreview = lines.slice(1, 4).join(' ') || plainBody.slice(0, 140);

  return {
    cardKey: `conc:${s.id}:${s.conclusionSig || s.updatedAt || ''}`,
    sessionId: s.id,
    hostId: s.hostId,
    harness: s.harness,
    title: cleanTitle,
    sub: `${hostShort} · ${projShort} · ${isInterrupted ? '异常中断' : '已出结论'}`,
    promptInfo,
    diffInfo,
    kind: isInterrupted ? 'interrupted' : 'conclusion',
    risk: 'normal',
    code: '',
    multi: false,
    headline,
    cmdLine: '',
    cmdReason: '',
    replyPreview,
    fullReplyMarkdown: fullMd,
    artifacts: Array.isArray(s.artifacts) ? s.artifacts : [],
    options: [
      {
        optionIndex: 1,
        label: '1. 已阅归档（消除未读蓝点）',
        shortBtn: '标为已阅归档',
        desc: '',
      },
    ],
    canCustom: canSendPrompt,
    customLabel: '2. 继续追问 / 交代修改意见…',
  };
}

export function createTriageDeckController(deps) {
  let isOpen = false;
  // Draft state per cardKey: { sel, multiSel, useCustom, customOpen, customText, snoozedCount }
  const cardDrafts = new Map();
  // Snoozed keys pushed to the back: Map<cardKey, snoozeOrderSeq>
  let snoozeSeq = 1;
  const snoozeOrder = new Map();
  // Locally dismissed cardKeys (optimistic hide while settling or during 2s undo grace)
  const dismissedKeys = new Map();
  // Undo stack: [{ cardKey, sessionId, type: 'snooze' | 'read' | 'grace', prevSnooze, graceTimer, commitFn, prevSeenAt, prevSeenSig }]
  const undoStack = [];
  let graceCountdownTimer = null;

  // Gesture & Voice state
  let dragging = false;
  let btnPressMoved = false;
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let dy = 0;
  let axisLocked = '';
  let holdTimer = null;
  let holdPct = 0;
  let rightDragHoldTimer = null;
  let rightDragUnlocked = false;

  let lpTimer = null;
  let isLongPress = false;
  let isRecording = false;
  let speechRec = null;
  let listenersBound = false;
  let lastRenderedSig = '';

  function appendMediaAuthUrl(url) {
    const mt = deps.getMediaTicket?.() || '';
    if (!mt || !url) return url;
    return `${url}${url.includes('?') ? '&' : '?'}mt=${encodeURIComponent(mt)}`;
  }

  function buildLocalThumbSrc(hostId, filePath) {
    if (!hostId || !filePath) return '';
    const qp = new URLSearchParams({ path: filePath, thumb: '1' });
    return appendMediaAuthUrl(`/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${qp.toString()}`);
  }

  function flushAllGraceCommits() {
    for (const item of undoStack) {
      if (item.type === 'grace' && item.graceTimer) {
        clearTimeout(item.graceTimer);
        item.graceTimer = null;
        item.flushed = true;
        void item.commitFn?.();
      }
    }
    clearInterval(graceCountdownTimer);
    graceCountdownTimer = null;
  }

  function getOrderedActiveCards() {
    const now = Date.now();
    for (const [k, expAt] of dismissedKeys.entries()) {
      if (now > expAt) dismissedKeys.delete(k);
    }
    const allSessions = deps.getSessions?.() || [];
    const shortHostMap = deps.getShortHostMap?.() || {};
    const eligible = allSessions.filter(isTriageEligibleSession);
    const models = [];
    for (const s of eligible) {
      const vm = buildTriageCardViewModel(s, shortHostMap);
      if (dismissedKeys.has(vm.cardKey)) continue;
      models.push({ session: s, vm });
    }
    models.sort((a, b) => {
      const sa = snoozeOrder.get(a.vm.cardKey) || 0;
      const sb = snoozeOrder.get(b.vm.cardKey) || 0;
      if (sa !== sb) return sa - sb;
      return 0;
    });
    return models;
  }

  function ensureDraft(vm) {
    if (!cardDrafts.has(vm.cardKey)) {
      const defaultMulti = vm.multi && vm.options.length > 0 ? [0] : [];
      cardDrafts.set(vm.cardKey, {
        sel: 0,
        multiSel: defaultMulti,
        useCustom: false,
        customOpen: false,
        customText: '',
        snoozedCount: 0,
      });
    }
    return cardDrafts.get(vm.cardKey);
  }

  function isEmptyCustomSelected(vm, draft) {
    if (!vm || !draft || !vm.canCustom) return false;
    const customActive = vm.multi ? draft.useCustom : draft.sel === vm.options.length;
    return customActive && !String(draft.customText || '').trim();
  }

  function showDragPill(text, bg, color) {
    const el = document.getElementById('triageDragPill');
    if (!el) return;
    el.textContent = text;
    el.style.background = bg;
    el.style.color = color;
    el.classList.add('show');
  }

  function hideDragPill(delay = 0) {
    const el = document.getElementById('triageDragPill');
    if (!el) return;
    if (!delay) el.classList.remove('show');
    else setTimeout(() => el.classList.remove('show'), delay);
  }

  function computeConfirmBtnModel(vm, draft) {
    const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
    if (customActive) {
      if (String(draft.customText || '').trim()) {
        return { cls: 'orange', t1: '发送新方案 👉', t2: '可点此 或 右滑卡片' };
      }
      return {
        cls: 'locked',
        t1: '✍️ 请先输入或长按说话',
        t2: '填写方案后即可点此或右滑发送',
      };
    }
    if (vm.multi) {
      return {
        cls: 'blue',
        t1: `确认 (${draft.multiSel.length}项) 👉`,
        t2: '可点此 或 右滑卡片',
      };
    }
    const opt = vm.options[draft.sel] || vm.options[0] || {};
    const shortTxt = opt.shortBtn || '确认';
    const needHold = vm.risk === 'high' && draft.sel === 0;
    if (needHold) {
      return {
        cls: 'crimson',
        t1: `🛡️ 按住0.8s：${shortTxt} 👉`,
        t2: '长按此钮 或 右拉稳住0.8s',
      };
    }
    return {
      cls: vm.kind === 'question' ? 'blue' : '',
      t1: `${shortTxt} 👉`,
      t2: '可点此 或 右滑卡片',
    };
  }

  function updateUndoBtnDom() {
    const undoBtn = document.getElementById('triageUndoBtn');
    if (!undoBtn) return;
    // Drop expired non-reversible grace items that already flushed
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === 'grace' && undoStack[undoStack.length - 1].flushed) {
      undoStack.pop();
    }
    if (undoStack.length === 0) {
      undoBtn.disabled = true;
      undoBtn.classList.remove('grace-active');
      undoBtn.textContent = '↩ 撤回';
      return;
    }
    const top = undoStack[undoStack.length - 1];
    undoBtn.disabled = false;
    if (top.type === 'grace' && !top.flushed) {
      const remSec = Math.max(1, Math.ceil((top.expiresAt - Date.now()) / 1000));
      undoBtn.classList.add('grace-active');
      undoBtn.textContent = `↩ 撤回 (${remSec}s)`;
    } else {
      undoBtn.classList.remove('grace-active');
      undoBtn.textContent = '↩ 撤回';
    }
  }

  function syncConfirmBtnOnly() {
    const cards = getOrderedActiveCards();
    if (!cards.length) return;
    const { vm } = cards[0];
    const draft = ensureDraft(vm);
    const m = computeConfirmBtnModel(vm, draft);
    const btn = document.getElementById('triageConfirmBtn');
    const t1 = document.getElementById('triageBtnT1');
    const t2 = document.getElementById('triageBtnT2');
    if (btn) btn.className = `dsh-triage-btn-confirm ${m.cls}`;
    if (t1) t1.textContent = m.t1;
    if (t2) t2.textContent = m.t2;
  }

  function preHydrateTopCards(cards) {
    for (const item of cards.slice(0, 2)) {
      const s = item.session;
      if (!item.vm.promptInfo.text && (s.omittedTranscriptCount > 0 || s.hasMoreTranscript)) {
        deps.hydrateColdSession?.(s.hostId, s.id, s.sessionRev);
      }
    }
  }

  function render({ force = false } = {}) {
    if (!isOpen) return;
    // Protect active user gestures, voice dictation, or IME keyboard typing from background SSE re-renders!
    if (!force && (dragging || isRecording || document.activeElement?.id === 'triageCustomTextarea')) {
      const countEl = document.getElementById('triageCountChip');
      if (countEl) countEl.textContent = String(getOrderedActiveCards().length);
      updateUndoBtnDom();
      return;
    }

    const cards = getOrderedActiveCards();
    preHydrateTopCards(cards);
    updateUndoBtnDom();

    const countChip = document.getElementById('triageCountChip');
    if (countChip) countChip.textContent = String(cards.length);

    const fgCard = document.getElementById('triageFgCard');
    const lRight = document.getElementById('triageLayerRight');
    const lRightInner = document.getElementById('triageLayerRightInner');
    const lLeft = document.getElementById('triageLayerLeft');
    const lDeep = document.getElementById('triageLayerDeep');
    if (!fgCard || !lRight || !lRightInner || !lLeft || !lDeep) return;

    const sig = cards.map(c => {
      const d = ensureDraft(c.vm);
      return `${c.vm.cardKey}:${c.vm.promptInfo.text.slice(0, 30)}:${c.vm.diffInfo.files.length}:${d.sel}:${d.multiSel.join(',')}:${d.useCustom ? 1 : 0}:${d.customOpen ? 1 : 0}:${d.snoozedCount}:${isRecording ? 1 : 0}`;
    }).join('|');
    if (!force && sig === lastRenderedSig && fgCard.children.length > 0) {
      return;
    }
    lastRenderedSig = sig;

    if (cards.length >= 2) {
      const nxt = cards[1].vm;
      lRight.style.display = 'block';
      lRight.style.transform = `translate3d(${REST_X}px, ${REST_Y}px, 0) scale(${REST_SCALE}) rotate(${REST_ROT}deg)`;
      lRightInner.innerHTML = `
        <div style="opacity:0.42;display:flex;flex-direction:column;gap:8px;">
          <div class="dsh-triage-hdr">
            ${renderHarnessBadgeHtml(nxt.harness, 'row', nxt.harness)}
            <div class="dsh-triage-hdr-info">
              <div class="dsh-triage-title">${esc(nxt.title)}</div>
              <div class="dsh-triage-sub">${esc(nxt.sub)}</div>
            </div>
          </div>
          <div class="dsh-triage-headline">${esc(nxt.headline)}</div>
        </div>`;
    } else {
      lRight.style.display = 'none';
    }
    lLeft.style.display = cards.length >= 3 ? 'block' : 'none';
    lDeep.style.display = cards.length >= 4 ? 'block' : 'none';

    if (cards.length === 0) {
      const runningCount = (deps.getSessions?.() || []).filter(s => s.status === 'running').length;
      fgCard.classList.remove('is-high');
      fgCard.innerHTML = `
        <div style="margin:auto;text-align:center;padding:28px 18px;display:flex;flex-direction:column;gap:14px;align-items:center;">
          <div style="font-size:44px;">🎉</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">待处理卡片已全部清零！</div>
          <div style="font-size:13px;color:#64748b;line-height:1.55;">
            ${runningCount > 0 ? `目前还有 <strong>${runningCount} 个任务正在后台运行</strong>，切回列表模式即可查看实时进度。` : '所有待授权与未读完结会话均已处理完毕。'}
          </div>
          ${runningCount > 0
            ? `<button type="button" onclick="triageSwitchToRunningList()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(37,99,235,0.25);">🟢 去列表查看运行中任务 (${runningCount}) ›</button>`
            : `<button type="button" onclick="closeTriageDeckMode()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:#0f172a;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;">☰ 返回会话列表</button>`}
        </div>`;
      return;
    }

    const { session: s, vm } = cards[0];
    const draft = ensureDraft(vm);
    fgCard.classList.toggle('is-high', vm.risk === 'high');

    const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
    const btnModel = computeConfirmBtnModel(vm, draft);

    const firstImgPath = vm.promptInfo.mediaPaths[0] || '';
    const thumbSrc = firstImgPath ? buildLocalThumbSrc(vm.hostId, firstImgPath) : '';
    const thumbHtml = vm.promptInfo.imageCount > 0
      ? `<div class="dsh-triage-thumb">
          ${thumbSrc ? `<img src="${esc(thumbSrc)}" alt="附件图" onerror="this.style.display='none'" />` : '<span>🖼️</span>'}
          <span class="dsh-triage-thumb-count">${vm.promptInfo.imageCount}图</span>
         </div>`
      : '';

    const myPromptText = vm.promptInfo.text || s.title || '点击查看对话详情';
    const diffBarHtml = vm.diffInfo.files.length > 0
      ? `<div class="dsh-triage-diff-bar" onclick="openTriageFilesModal()">
          <span>📄 代码改动 · ${vm.diffInfo.files.length} 个文件</span>
          <span style="font-family:var(--mono,monospace);font-weight:700;">
            ${vm.diffInfo.hasLineCounts
              ? `<span style="color:#16a34a">+${vm.diffInfo.totalAdd}</span><span style="color:#dc2626;margin-left:5px;">-${vm.diffInfo.totalDel}</span>`
              : `<span style="color:#64748b">点此查看</span>`}
            <span style="color:#2563eb;margin-left:6px;">▾</span>
          </span>
        </div>`
      : '';

    const coreEvidenceHtml = vm.cmdLine
      ? `<div class="dsh-triage-cmd-box ${vm.risk === 'high' ? 'high' : ''}" onclick="openTriageCommandModal()">
          <div class="dsh-triage-cmd-reason">${esc(vm.cmdReason)}</div>
          <div class="dsh-triage-cmd-mono">${highlightDangerousCommandHtml(vm.cmdLine)}</div>
        </div>`
      : vm.replyPreview
        ? `<div class="dsh-triage-reply-card ${vm.kind === 'interrupted' ? 'interrupted' : ''}" onclick="openTriageReplyModal()">
            <div class="dsh-triage-clamp3">${esc(vm.replyPreview)}</div>
            <div style="color:#2563eb;font-size:11px;font-weight:700;margin-top:4px;">点击展开完整回复全文 ›</div>
          </div>`
        : '';

    fgCard.innerHTML = `
      <div class="dsh-triage-body" id="triageCardBody">
        <div class="dsh-triage-hdr">
          ${renderHarnessBadgeHtml(vm.harness, 'row', vm.harness)}
          <div class="dsh-triage-hdr-info">
            <div class="dsh-triage-title-row">
              <div class="dsh-triage-title">${esc(vm.title)}</div>
              <button type="button" class="dsh-triage-open-chat" onclick="event.stopPropagation(); triageOpenFullSession('${esc(vm.sessionId)}')">对话 ›</button>
            </div>
            <div class="dsh-triage-sub">
              <span>${esc(vm.sub)}</span>
              ${draft.snoozedCount > 0 ? `<span class="dsh-triage-snooze-tag">↪ 稍后看</span>` : ''}
            </div>
          </div>
        </div>

        <div class="dsh-triage-my-ask" onclick="openTriagePromptModal()">
          <div class="dsh-triage-my-ask-body">
            <div class="dsh-triage-clamp2"><strong>我：</strong>${esc(myPromptText)}</div>
            <div style="color:#2563eb;font-size:11px;font-weight:700;margin-top:2px;">点击查看完整提问${vm.promptInfo.imageCount > 0 ? '与截图' : ''} ›</div>
          </div>
          ${thumbHtml}
        </div>

        <p class="dsh-triage-headline">${esc(vm.headline)}</p>

        ${coreEvidenceHtml}
        ${diffBarHtml}

        <div class="dsh-triage-opts">
          ${vm.options.map((o, oi) => {
            const isSel = vm.multi ? draft.multiSel.includes(oi) : (!customActive && draft.sel === oi);
            const selCls = isSel ? (vm.kind === 'question' ? 'sel-blue' : 'sel-green') : '';
            return `
              <div class="dsh-triage-opt ${selCls}" onclick="triagePickOption(${oi})">
                <div class="dsh-triage-dot ${vm.multi ? 'sq' : ''}">${isSel ? '✓' : ''}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;word-break:break-word;">${esc(o.label)}</div>
                  ${o.desc ? `<div style="font-size:11.5px;color:#64748b;margin-top:2px;line-height:1.35;">${esc(o.desc)}</div>` : ''}
                </div>
              </div>`;
          }).join('')}

          ${vm.canCustom ? `
            <div class="dsh-triage-custom ${customActive ? 'sel' : ''} ${isRecording ? 'rec' : ''}" id="triageCustomBox"
              onmousedown="triageCustomDown(event)" onmouseup="triageCustomUp(event)" onmouseleave="triageCustomCancel()"
              ontouchstart="triageCustomDown(event)" ontouchend="triageCustomUp(event)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                  <div class="dsh-triage-dot">${customActive ? '✓' : ''}</div>
                  <div style="min-width:0;">
                    <div style="font-size:13px;font-weight:700;color:#9a3412;">${esc(vm.customLabel)}</div>
                    <div style="font-size:11px;color:#ea580c;font-weight:600;">
                      ${isRecording ? '🎙️ 正在聆听语音… 松手落入输入框' : '短按弹键盘打字 · 长按直接说话'}
                    </div>
                  </div>
                </div>
                <span class="dsh-triage-mic-chip">${isRecording ? '🔴 听写中' : '🎙️ 长按说'}</span>
              </div>
              ${draft.customOpen ? `
                <textarea class="dsh-triage-ta" id="triageCustomTextarea" rows="2" placeholder="输入你的方案，或继续长按上方追加语音…"
                  onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()"
                  oninput="triageUpdateCustomText(this.value)">${esc(draft.customText)}</textarea>` : ''}
            </div>` : ''}
        </div>
      </div>

      <div class="dsh-triage-dock">
        <button type="button" class="dsh-triage-btn-snooze" onclick="triageTapSnooze()">
          <span>👈</span>
          <span>搁置</span>
        </button>
        <button type="button" class="dsh-triage-btn-confirm ${btnModel.cls}" id="triageConfirmBtn"
          onmousedown="triageConfirmBtnDown(event)" onmouseup="triageConfirmBtnUp(event)" onmouseleave="triageConfirmBtnCancel()"
          ontouchstart="triageConfirmBtnDown(event)" ontouchend="triageConfirmBtnUp(event)">
          <div class="dsh-triage-btn-prog" id="triageBtnProg"></div>
          <span class="dsh-triage-btn-t1" id="triageBtnT1">${esc(btnModel.t1)}</span>
          <span class="dsh-triage-btn-t2" id="triageBtnT2">${esc(btnModel.t2)}</span>
        </button>
      </div>
    `;
  }

  function nudgeEmptyCustom() {
    const box = document.getElementById('triageCustomBox');
    if (box) {
      box.classList.remove('dsh-triage-shake');
      void box.offsetWidth;
      box.classList.add('dsh-triage-shake');
    }
    showDragPill('✍️ 内容为空，请先打字或长按说话', '#ea580c', '#ffffff');
    hideDragPill(1000);
    setTimeout(() => document.getElementById('triageCustomTextarea')?.focus(), 50);
  }

  // ---- Voice Dictation via Web Speech API (Isolated from ChatStage) ----
  function startLiveSpeechDictation(vm, draft) {
    const SpeechCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechCtor) {
      isRecording = false;
      deps.showToast?.('当前浏览器环境不支持语音听写，请直接键盘输入');
      render({ force: true });
      setTimeout(() => document.getElementById('triageCustomTextarea')?.focus(), 40);
      return;
    }
    try {
      if (speechRec) {
        try { speechRec.abort(); } catch { }
      }
      const rec = new SpeechCtor();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;
      const baseText = String(draft.customText || '').trim();
      let latestRaw = '';
      rec.onresult = ev => {
        let chunk = '';
        for (let i = 0; i < ev.results.length; i += 1) {
          chunk += ev.results[i][0]?.transcript || '';
        }
        latestRaw = deps.punctuateSpeechText
          ? deps.punctuateSpeechText(chunk, null, { finalizeSentence: false })
          : chunk;
        draft.customText = baseText ? `${baseText} ${latestRaw}` : latestRaw;
        const ta = document.getElementById('triageCustomTextarea');
        if (ta) ta.value = draft.customText;
        syncConfirmBtnOnly();
      };
      rec.onerror = () => {
        isRecording = false;
        speechRec = null;
        render({ force: true });
      };
      rec.onend = () => {
        if (latestRaw) {
          const finalClean = deps.punctuateSpeechText
            ? deps.punctuateSpeechText(latestRaw, null, { finalizeSentence: true })
            : latestRaw;
          draft.customText = baseText ? `${baseText} ${finalClean}` : finalClean;
        }
        isRecording = false;
        speechRec = null;
        render({ force: true });
      };
      speechRec = rec;
      rec.start();
    } catch {
      isRecording = false;
      speechRec = null;
      render({ force: true });
    }
  }

  function stopLiveSpeechDictation() {
    if (speechRec) {
      const r = speechRec;
      speechRec = null;
      setTimeout(() => {
        try { r.stop(); } catch { }
      }, 240); // 240ms tail grace so Safari doesn't clip the final syllable
    } else {
      isRecording = false;
    }
  }

  // ---- Commit & 2s Undo Grace Buffer ----
  function scheduleGraceCommit(vm, session, commitFn) {
    // Flush any previous pending grace action immediately so nothing queues out-of-order
    flushAllGraceCommits();
    dismissedKeys.set(vm.cardKey, Date.now() + 45000);

    const entry = {
      type: 'grace',
      cardKey: vm.cardKey,
      sessionId: session.id,
      expiresAt: Date.now() + GRACE_UNDO_MS,
      flushed: false,
      commitFn,
      graceTimer: null,
    };
    entry.graceTimer = setTimeout(() => {
      entry.graceTimer = null;
      entry.flushed = true;
      clearInterval(graceCountdownTimer);
      graceCountdownTimer = null;
      updateUndoBtnDom();
      void commitFn();
    }, GRACE_UNDO_MS);

    undoStack.push(entry);
    clearInterval(graceCountdownTimer);
    graceCountdownTimer = setInterval(() => {
      updateUndoBtnDom();
    }, 300);
    updateUndoBtnDom();
  }

  function buildCommitAction(session, vm, draft) {
    const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
    const customText = String(draft.customText || '').trim();

    if (vm.kind === 'question') {
      const answers = {};
      if (customActive) {
        answers[vm.qId] = vm.multi ? [customText] : customText;
      } else if (vm.multi) {
        const picked = draft.multiSel.map(i => vm.options[i]?.value).filter(Boolean);
        answers[vm.qId] = picked;
      } else {
        answers[vm.qId] = vm.options[draft.sel]?.value || vm.options[0]?.value || '';
      }
      return async () => {
        await deps.submitQuestionDecision?.(session, vm.code, answers);
      };
    }

    if (vm.kind === 'approval') {
      if (customActive) {
        // Two-step protocol: 1) Deny pending tool call (option 4), 2) Send user's new plan prompt!
        return async () => {
          await deps.sendApprovalDecision?.(session.hostId, vm.code, false, vm.denyOptionIndex || 4, session.id);
          if (customText) {
            await deps.sendPromptToSession?.(session, customText);
          }
        };
      }
      const chosen = vm.options[draft.sel] || vm.options[0];
      const optIdx = Number(chosen?.optionIndex) || 1;
      return async () => {
        await deps.sendApprovalDecision?.(session.hostId, vm.code, true, optIdx, session.id);
      };
    }

    // Conclusion / Interrupted
    if (customActive && customText) {
      return async () => {
        deps.markSessionRead?.(session);
        await deps.sendPromptToSession?.(session, customText);
      };
    }
    return null; // Pure mark-as-read is handled synchronously & reversibly
  }

  function confirmTopCard() {
    const cards = getOrderedActiveCards();
    if (!cards.length) return;
    const { session, vm } = cards[0];
    const draft = ensureDraft(vm);
    if (isEmptyCustomSelected(vm, draft)) {
      nudgeEmptyCustom();
      return;
    }

    const fgCard = document.getElementById('triageFgCard');
    const lRight = document.getElementById('triageLayerRight');
    const commitFn = buildCommitAction(session, vm, draft);

    if (!commitFn) {
      // Pure mark-as-read (100% reversible anytime)
      const prevSnapshot = deps.markSessionRead?.(session);
      dismissedKeys.set(vm.cardKey, Date.now() + 5000);
      undoStack.push({
        type: 'read',
        cardKey: vm.cardKey,
        sessionId: session.id,
        prevSnapshot,
      });
      showDragPill('✓ 已标为已读', '#059669', '#ffffff');
      hideDragPill(650);
    } else {
      scheduleGraceCommit(vm, session, commitFn);
      showDragPill('✓ 已确认（2秒内可点左上角撤回）', '#059669', '#ffffff');
      hideDragPill(1100);
    }

    if (fgCard && lRight) {
      fgCard.style.transform = 'translate3d(340px, 0, 0) rotate(13deg)';
      fgCard.style.opacity = '0';
      lRight.classList.remove('following');
      lRight.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        fgCard.classList.add('dragging');
        fgCard.style.transform = 'translate3d(0,0,0)';
        fgCard.style.opacity = '1';
        render({ force: true });
        deps.onDeckChanged?.();
        requestAnimationFrame(() => fgCard.classList.remove('dragging'));
      }, 210);
    } else {
      render({ force: true });
      deps.onDeckChanged?.();
    }
  }

  function snoozeTopCard() {
    const cards = getOrderedActiveCards();
    if (!cards.length) return;
    if (cards.length === 1) {
      showDragPill('只剩最后 1 张待处理啦', '#475569', '#ffffff');
      hideDragPill(700);
      return;
    }
    const { session, vm } = cards[0];
    const draft = ensureDraft(vm);
    const prevSnooze = snoozeOrder.get(vm.cardKey) || 0;
    snoozeSeq += 1;
    snoozeOrder.set(vm.cardKey, snoozeSeq);
    draft.snoozedCount = (draft.snoozedCount || 0) + 1;
    undoStack.push({
      type: 'snooze',
      cardKey: vm.cardKey,
      sessionId: session.id,
      prevSnooze,
    });

    showDragPill('↪ 已搁置到牌堆后面', '#475569', '#ffffff');
    hideDragPill(700);

    const fgCard = document.getElementById('triageFgCard');
    const lRight = document.getElementById('triageLayerRight');
    if (fgCard && lRight) {
      fgCard.classList.add('tucking');
      lRight.classList.remove('following');
      lRight.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
      setTimeout(() => {
        fgCard.classList.remove('tucking');
        fgCard.classList.add('dragging');
        fgCard.style.transform = 'translate3d(0,0,0)';
        fgCard.style.opacity = '1';
        render({ force: true });
        requestAnimationFrame(() => fgCard.classList.remove('dragging'));
      }, 320);
    } else {
      render({ force: true });
    }
  }

  function undoLast() {
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === 'grace' && undoStack[undoStack.length - 1].flushed) {
      undoStack.pop();
    }
    if (!undoStack.length) return;
    const last = undoStack.pop();
    if (last.type === 'grace') {
      if (last.graceTimer) clearTimeout(last.graceTimer);
      last.graceTimer = null;
      dismissedKeys.delete(last.cardKey);
      showDragPill('↩ 已成功拦截撤回！尚未发往电脑', '#ea580c', '#ffffff');
      hideDragPill(1000);
    } else if (last.type === 'snooze') {
      if (last.prevSnooze) snoozeOrder.set(last.cardKey, last.prevSnooze);
      else snoozeOrder.delete(last.cardKey);
      showDragPill('↩ 已撤回上一张卡片', '#334155', '#ffffff');
      hideDragPill(700);
    } else if (last.type === 'read') {
      dismissedKeys.delete(last.cardKey);
      deps.restoreSessionUnread?.(last.sessionId, last.prevSnapshot);
      showDragPill('↩ 已恢复为未读待阅', '#334155', '#ffffff');
      hideDragPill(700);
    }
    render({ force: true });
    deps.onDeckChanged?.();
  }

  // ---- Modals (Full Prompt + Image / Changed Files / Full Reply / Full Command) ----
  function openModalHtml(html) {
    const modal = document.getElementById('triageDetailModal');
    const box = document.getElementById('triageDetailModalContent');
    if (!modal || !box) return;
    box.innerHTML = html;
    modal.classList.add('open');
  }

  function closeDetailModal() {
    document.getElementById('triageDetailModal')?.classList.remove('open');
  }

  function bindCardGestureListeners() {
    if (listenersBound || typeof window === 'undefined') return;
    const fgCard = document.getElementById('triageFgCard');
    if (!fgCard) return;
    listenersBound = true;

    function resetCardPos() {
      const lRight = document.getElementById('triageLayerRight');
      fgCard.style.transform = 'translate3d(0,0,0)';
      if (lRight) {
        lRight.style.transform = `translate3d(${REST_X}px, ${REST_Y}px, 0) scale(${REST_SCALE}) rotate(${REST_ROT}deg)`;
      }
    }

    function onPointerStart(clientX, clientY, target) {
      if (!isOpen) return;
      if (target.closest('.dsh-triage-custom, textarea')) return;
      if (!getOrderedActiveCards().length) return;
      dragging = true;
      axisLocked = '';
      sx = clientX;
      sy = clientY;
      dx = 0;
      dy = 0;
      rightDragUnlocked = false;
      clearInterval(rightDragHoldTimer);
      rightDragHoldTimer = null;
    }

    function onPointerMove(clientX, clientY, ev) {
      if (!dragging || !isOpen) return;
      dx = clientX - sx;
      dy = clientY - sy;

      if (!axisLocked) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axisLocked = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      if (axisLocked !== 'x') {
        // Card Y-axis is strictly locked (never translates vertically); internal body only scrolls if overflowing
        return;
      }
      if (ev && ev.cancelable) ev.preventDefault();

      btnPressMoved = true;
      clearInterval(holdTimer);
      holdTimer = null;
      const progBar = document.getElementById('triageBtnProg');
      const stackDom = document.getElementById('triageCardStack');
      const lRight = document.getElementById('triageLayerRight');

      fgCard.classList.add('dragging');
      lRight?.classList.add('following');
      stackDom?.classList.toggle('dragging-right', dx > 20);
      stackDom?.classList.toggle('dragging-left', dx < -20);

      const cards = getOrderedActiveCards();
      if (!cards.length) return;
      const { vm } = cards[0];
      const draft = ensureDraft(vm);

      if (dx > 0 && isEmptyCustomSelected(vm, draft)) {
        const lockedX = Math.min(24, Math.pow(dx, 0.52) * 1.6);
        fgCard.style.transform = `translate3d(${lockedX}px, 0, 0)`;
        showDragPill('✍️ 手工填写为空，请先打字或长按说话', '#ea580c', '#ffffff');
        return;
      }

      const ratio = Math.min(1, Math.abs(dx) / 110);
      if (lRight) {
        lRight.style.transform = `translate3d(${REST_X * (1 - ratio)}px, ${REST_Y * (1 - ratio)}px, 0) scale(${REST_SCALE + (1 - REST_SCALE) * ratio}) rotate(${REST_ROT * (1 - ratio)}deg)`;
      }

      const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
      const isHighRiskConfirm = dx > 0 && !customActive && !vm.multi && vm.risk === 'high' && draft.sel === 0;

      if (isHighRiskConfirm) {
        const dampedX = Math.min(104, Math.pow(dx, 0.72) * 2.05);
        fgCard.style.transform = `translate3d(${dampedX}px, 0, 0) rotate(${dampedX * 0.045}deg)`;
        if (dx > 100 && !rightDragHoldTimer && !rightDragUnlocked) {
          let pct = 15;
          if (progBar) progBar.style.width = `${pct}%`;
          showDragPill('🛡️ 高危防手滑 · 稳住 0.8s 蓄力中…', '#e11d48', '#ffffff');
          rightDragHoldTimer = setInterval(() => {
            pct += 14;
            const b = document.getElementById('triageBtnProg');
            if (b) b.style.width = `${Math.min(100, pct)}%`;
            if (pct >= 100) {
              clearInterval(rightDragHoldTimer);
              rightDragHoldTimer = null;
              rightDragUnlocked = true;
              navigator.vibrate?.(25);
              showDragPill('🔓 蓄力完成！松手确认放行', '#059669', '#ffffff');
            }
          }, 85);
        } else if (dx <= 100 && !rightDragUnlocked) {
          clearInterval(rightDragHoldTimer);
          rightDragHoldTimer = null;
          if (progBar) progBar.style.width = `${Math.min(30, dx * 0.25)}%`;
          showDragPill('🛡️ 继续右拉稳住 0.8s 确认', '#e11d48', '#ffffff');
        }
      } else {
        const moveX = dx * 0.84;
        fgCard.style.transform = `translate3d(${moveX}px, 0, 0) rotate(${moveX * 0.045}deg)`;
        if (dx > 40) showDragPill('👉 松手确认提交', '#059669', '#ffffff');
        else if (dx < -40) showDragPill('👈 松手搁置到后面', '#475569', '#ffffff');
        else hideDragPill();
      }
    }

    function onPointerEnd() {
      if (!dragging) return;
      dragging = false;
      clearInterval(rightDragHoldTimer);
      rightDragHoldTimer = null;
      document.getElementById('triageCardStack')?.classList.remove('dragging-right', 'dragging-left');
      const progBar = document.getElementById('triageBtnProg');
      if (progBar) progBar.style.width = '0%';
      fgCard.classList.remove('dragging');
      document.getElementById('triageLayerRight')?.classList.remove('following');

      if (axisLocked === 'x') {
        const cards = getOrderedActiveCards();
        const top = cards[0];
        if (top) {
          const { vm } = top;
          const draft = ensureDraft(vm);
          if (dx > 35 && isEmptyCustomSelected(vm, draft)) {
            resetCardPos();
            nudgeEmptyCustom();
            return;
          }
          if (dx > 80) {
            const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
            const isHighRiskConfirm = !customActive && !vm.multi && vm.risk === 'high' && draft.sel === 0;
            if (isHighRiskConfirm && !rightDragUnlocked) {
              resetCardPos();
              hideDragPill(400);
              return;
            }
            confirmTopCard();
            return;
          }
          if (dx < -80) {
            snoozeTopCard();
            return;
          }
        }
      }
      resetCardPos();
      hideDragPill();
    }

    fgCard.addEventListener('touchstart', e => {
      if (e.touches?.[0]) onPointerStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (isOpen && dragging && e.touches?.[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });
    window.addEventListener('touchend', onPointerEnd);

    fgCard.addEventListener('mousedown', e => {
      if (e.button === 0) onPointerStart(e.clientX, e.clientY, e.target);
    });
    window.addEventListener('mousemove', e => {
      if (isOpen && dragging) onPointerMove(e.clientX, e.clientY, null);
    });
    window.addEventListener('mouseup', onPointerEnd);
    window.addEventListener('beforeunload', flushAllGraceCommits);
  }

  // Expose DOM action handlers on window
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      openTriageDeckMode() {
        isOpen = true;
        lastRenderedSig = '';
        document.getElementById('triageDeckOverlay')?.classList.add('open');
        bindCardGestureListeners();
        render({ force: true });
      },
      closeTriageDeckMode() {
        flushAllGraceCommits();
        stopLiveSpeechDictation();
        closeDetailModal();
        isOpen = false;
        document.getElementById('triageDeckOverlay')?.classList.remove('open');
        deps.onDeckChanged?.();
      },
      triageSwitchToRunningList() {
        window.closeTriageDeckMode?.();
        deps.switchToRunningList?.();
      },
      triageUndoLast: undoLast,
      triageTapSnooze() {
        if (!btnPressMoved) snoozeTopCard();
      },
      triageOpenFullSession(sessionId) {
        if (!sessionId) return;
        deps.openSession?.(sessionId);
      },
      triagePickOption(oi) {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const draft = ensureDraft(top.vm);
        if (top.vm.multi) {
          draft.useCustom = false;
          const pos = draft.multiSel.indexOf(oi);
          if (pos >= 0 && draft.multiSel.length > 1) draft.multiSel.splice(pos, 1);
          else if (pos < 0) draft.multiSel.push(oi);
        } else {
          draft.sel = oi;
        }
        render({ force: true });
      },
      triageUpdateCustomText(val) {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const draft = ensureDraft(top.vm);
        draft.customText = String(val ?? '');
        syncConfirmBtnOnly();
      },
      triageCustomDown(e) {
        if (e.target?.tagName === 'TEXTAREA') return;
        e.stopPropagation();
        isLongPress = false;
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => {
          const top = getOrderedActiveCards()[0];
          if (!top) return;
          const draft = ensureDraft(top.vm);
          isLongPress = true;
          isRecording = true;
          navigator.vibrate?.(18);
          if (top.vm.multi) draft.useCustom = true;
          else draft.sel = top.vm.options.length;
          draft.customOpen = true;
          render({ force: true });
          startLiveSpeechDictation(top.vm, draft);
        }, 240);
      },
      triageCustomUp(e) {
        if (e.target?.tagName === 'TEXTAREA') return;
        e.stopPropagation();
        clearTimeout(lpTimer);
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const draft = ensureDraft(top.vm);
        if (isLongPress) {
          stopLiveSpeechDictation();
        } else {
          if (top.vm.multi) draft.useCustom = true;
          else draft.sel = top.vm.options.length;
          draft.customOpen = true;
          render({ force: true });
          setTimeout(() => document.getElementById('triageCustomTextarea')?.focus(), 45);
        }
      },
      triageCustomCancel() {
        clearTimeout(lpTimer);
        if (isRecording) stopLiveSpeechDictation();
      },
      triageConfirmBtnDown() {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        btnPressMoved = false;
        const draft = ensureDraft(top.vm);
        if (isEmptyCustomSelected(top.vm, draft)) return;
        const customActive = top.vm.canCustom && (top.vm.multi ? draft.useCustom : draft.sel === top.vm.options.length);
        const needHold = !customActive && !top.vm.multi && top.vm.risk === 'high' && draft.sel === 0;
        if (!needHold) return;

        holdPct = 0;
        clearInterval(holdTimer);
        holdTimer = setInterval(() => {
          if (btnPressMoved) {
            clearInterval(holdTimer);
            holdTimer = null;
            return;
          }
          holdPct += 12.5;
          const bar = document.getElementById('triageBtnProg');
          if (bar) bar.style.width = `${Math.min(100, holdPct)}%`;
          if (holdPct >= 100) {
            clearInterval(holdTimer);
            holdTimer = null;
            if (bar) bar.style.width = '0%';
            navigator.vibrate?.(25);
            confirmTopCard();
          }
        }, 80);
      },
      triageConfirmBtnUp() {
        const wasHolding = Boolean(holdTimer);
        clearInterval(holdTimer);
        holdTimer = null;
        const bar = document.getElementById('triageBtnProg');
        if (bar) bar.style.width = '0%';
        if (btnPressMoved) return;
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const draft = ensureDraft(top.vm);
        if (isEmptyCustomSelected(top.vm, draft)) {
          nudgeEmptyCustom();
          return;
        }
        const customActive = top.vm.canCustom && (top.vm.multi ? draft.useCustom : draft.sel === top.vm.options.length);
        const needHold = !customActive && !top.vm.multi && top.vm.risk === 'high' && draft.sel === 0;
        if (needHold) {
          if (wasHolding && holdPct < 100) {
            showDragPill('🛡️ 高危操作请按住 0.8 秒确认', '#e11d48', '#ffffff');
            hideDragPill(800);
          }
          return;
        }
        confirmTopCard();
      },
      triageConfirmBtnCancel() {
        clearInterval(holdTimer);
        holdTimer = null;
        const bar = document.getElementById('triageBtnProg');
        if (bar) bar.style.width = '0%';
      },
      closeTriageDetailModal: closeDetailModal,
      openTriagePromptModal() {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const { vm } = top;
        const imgsHtml = vm.promptInfo.mediaPaths.map(p => {
          const enc = encodeURIComponent(p).replace(/'/g, '%27');
          const fullSrc = buildLocalThumbSrc(vm.hostId, p);
          return `<div style="margin-top:8px;" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
            <img src="${esc(fullSrc)}" alt="提问原图" style="max-width:100%;max-height:46vh;border-radius:12px;border:1px solid #cbd5e1;cursor:pointer;" />
            <div style="font-size:11.5px;color:#2563eb;font-weight:700;margin-top:4px;">🔍 点击打开高清原图预览器</div>
          </div>`;
        }).join('');
        openModalHtml(`
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">我发送的完整提问</strong>
            <button type="button" class="dsh-triage-open-chat" onclick="closeTriageDetailModal()">收起 ✕</button>
          </div>
          <div style="font-size:14px;line-height:1.62;color:#1e293b;background:#f8fafc;padding:12px;border-radius:14px;white-space:pre-wrap;word-break:break-word;">${esc(vm.promptInfo.text || top.session.title)}</div>
          ${imgsHtml}
        `);
      },
      openTriageFilesModal() {
        const top = getOrderedActiveCards()[0];
        if (!top || !top.vm.diffInfo.files.length) return;
        const { vm } = top;
        openModalHtml(`
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">📄 代码改动 (${vm.diffInfo.files.length} 个文件)</strong>
            <button type="button" class="dsh-triage-open-chat" onclick="closeTriageDetailModal()">收起 ✕</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${vm.diffInfo.files.map(f => {
              const enc = encodeURIComponent(f.path || f.name).replace(/'/g, '%27');
              return `<div class="dsh-triage-file-row" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${esc(f.name)}</span>
                <span style="flex-shrink:0;">
                  ${vm.diffInfo.hasLineCounts ? `<b style="color:#16a34a">+${f.added}</b> <b style="color:#dc2626">-${f.removed}</b>` : ''}
                  <span style="color:#2563eb;margin-left:4px;">查看 ›</span>
                </span>
              </div>`;
            }).join('')}
          </div>
        `);
      },
      triageInspectSessionFile(sessionId, encodedPath) {
        deps.openFileForSession?.(sessionId, decodeURIComponent(encodedPath));
      },
      openTriageCommandModal() {
        const top = getOrderedActiveCards()[0];
        if (!top || !top.vm.cmdLine) return;
        openModalHtml(`
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">💻 待执行完整命令</strong>
            <button type="button" class="dsh-triage-open-chat" onclick="closeTriageDetailModal()">收起 ✕</button>
          </div>
          <div style="font-size:12px;color:#64748b;">执行目录：<code>${esc(top.session.cwd || '-')}</code></div>
          <pre style="margin:0;padding:12px;border-radius:14px;background:#0f172a;color:#f8fafc;font-family:var(--mono,monospace);font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-all;">${esc(top.vm.cmdLine)}</pre>
        `);
      },
      openTriageReplyModal() {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const rawMd = top.vm.fullReplyMarkdown || top.vm.headline;
        const renderedMd = deps.formatAssistantText
          ? deps.formatAssistantText(rawMd, top.vm.artifacts)
          : `<div style="white-space:pre-wrap;">${esc(rawMd)}</div>`;
        openModalHtml(`
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">📖 AI 最新完整回复</strong>
            <button type="button" class="dsh-triage-open-chat" onclick="closeTriageDetailModal()">收起 ✕</button>
          </div>
          <div class="md-body" style="font-size:13.5px;line-height:1.62;padding:4px 2px;color:#0f172a;">${renderedMd}</div>
        `);
      },
    });
  }

  return {
    isOpen: () => isOpen,
    getTopSessionId: () => getOrderedActiveCards()[0]?.vm?.sessionId || '',
    getPendingCount: () => getOrderedActiveCards().length,
    onStateUpdated: () => {
      if (isOpen) render({ force: false });
    },
  };
}
