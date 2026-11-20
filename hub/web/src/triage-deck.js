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
    if (s.hostOnline === false) return false;
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

export function extractLastUserPromptAndMedia(transcript = [], lang = 'zh') {
  const en = lang === 'en';
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
        text: cleanText || (en ? '(Image attached)' : '（发送了图片附件）'),
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
    let anyExplicitCount = false;
    const files = s.changedFiles.map(fc => {
      if (typeof fc === 'string') {
        const shortStr = fc.split('/').slice(-2).join('/');
        return { name: shortStr || fc, path: fc, added: 0, removed: 0 };
      }
      const rawAdd = fc?.additions ?? fc?.added ?? fc?.linesAdded;
      const rawDel = fc?.deletions ?? fc?.removed ?? fc?.linesRemoved;
      const addNum = Number(rawAdd) || 0;
      const delNum = Number(rawDel) || 0;
      if (addNum > 0 || delNum > 0) anyExplicitCount = true;
      const rawPath = fc?.path || fc?.name || '';
      const fallbackName = rawPath ? rawPath.split('/').slice(-2).join('/') : 'file';
      return {
        name: fc?.displayPath || fc?.name || fallbackName || 'file',
        path: rawPath,
        added: addNum,
        removed: delNum,
      };
    });
    const totalAdd = files.reduce((acc, f) => acc + f.added, 0);
    const totalDel = files.reduce((acc, f) => acc + f.removed, 0);
    return { files, hasLineCounts: anyExplicitCount, totalAdd, totalDel };
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

function localizeApprovalOptionLabel(rawLabel = '', idx = 1, lang = 'zh') {
  const en = lang === 'en';
  const s = String(rawLabel || '').trim();
  if (!s) return en ? `${idx}. Allow this time` : `${idx}. 允许执行`;
  const clean = s.replace(/^\d+\.\s*/, '');

  let m = /^(?:Yes,\s*allow\s+this\s+time|本次允许执行|允许执行)$/i.exec(clean);
  if (m) return en ? `${idx}. Allow this time` : `${idx}. 本次允许执行`;

  m = /^(?:Yes,\s*and\s+always\s+allow\s+'([^']+)'\s+in\s+this\s+conversation|本对话内始终允许\s*'([^']+)')$/i.exec(clean);
  if (m) {
    const target = m[1] || m[2];
    return en ? `${idx}. Always allow '${target}' in this chat` : `${idx}. 本对话内始终允许 '${target}'`;
  }

  m = /^(?:Yes,\s*and\s+always\s+allow\s+in\s+this\s+conversation|本对话内始终允许)$/i.exec(clean);
  if (m) return en ? `${idx}. Always allow in this chat` : `${idx}. 本对话内始终允许`;

  m = /^(?:Yes,\s*and\s+always\s+allow\s+'([^']+)'|始终允许\s*'([^']+)')$/i.exec(clean);
  if (m) {
    const target = m[1] || m[2];
    return en ? `${idx}. Always allow '${target}'` : `${idx}. 始终允许 '${target}'`;
  }

  m = /^(?:Yes,\s*and\s+always\s+allow|始终允许该操作)$/i.exec(clean);
  if (m) return en ? `${idx}. Always allow` : `${idx}. 始终允许该操作`;

  return /^\d+\./.test(s) ? s : `${idx}. ${s}`;
}

function shortenButtonOptionText(label = '', lang = 'zh') {
  const en = lang === 'en';
  const clean = String(label || '')
    .replace(/^[0-9A-Za-z]+\.\s*/, '')
    .replace(/（推荐）|\(Recommended\)/gi, '')
    .trim();
  const maxLen = en ? 18 : 13;
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : (clean || (en ? 'Confirm' : '确认'));
}

function extractPlainSummaryFromMarkdown(md = '', lang = 'zh') {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, lang === 'en' ? ' [code] ' : ' [代码块] ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function buildTriageCardViewModel(s, shortHostMap = {}, lang = 'zh') {
  const en = lang === 'en';
  const fallbackHost = en ? 'Computer' : '电脑';
  const fallbackTitle = en ? 'Untitled Session' : '未命名会话';
  const hostShort = shortHostMap[s.hostId] || s.hostName || s.hostId || fallbackHost;
  const projShort = formatCompactProjectLabel(s.project || '');
  const cleanTitle = stripRedundantProjectPrefix(s.title || fallbackTitle, s.project || '') || fallbackTitle;
  const promptInfo = extractLastUserPromptAndMedia(s.transcript, lang);
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
    const defaultQText = en ? 'Please select an option to continue' : '请做出选择以继续';
    const questions = Array.isArray(app.questions) && app.questions.length > 0
      ? app.questions
      : [{ id: 'q_1', question: app.promptTitle || defaultQText, options: [] }];
    const primaryQ = questions[0];
    const qId = String(primaryQ.id || 'q_1');
    const rawOpts = Array.isArray(primaryQ.options) ? primaryQ.options : [];
    const alpha = 'ABCDEFGH';
    const options = rawOpts.map((o, idx) => {
      const rawLbl = String(o?.label || o || (en ? `Option ${idx + 1}` : `选项 ${idx + 1}`));
      const prefixed = /^[0-9A-Z]+\.\s/.test(rawLbl) ? rawLbl : `${alpha[idx] || idx + 1}. ${rawLbl}`;
      return {
        value: rawLbl,
        label: prefixed,
        shortBtn: shortenButtonOptionText(rawLbl, lang),
        desc: o?.description ? String(o.description) : '',
      };
    });
    const extraCount = questions.length > 1
      ? (en ? ` (${questions.length} questions)` : `（共 ${questions.length} 个问题）`)
      : '';
    return {
      cardKey: `q:${s.id}:${app.code || ''}`,
      sessionId: s.id,
      hostId: s.hostId,
      harness: s.harness,
      title: cleanTitle,
      sub: `${hostShort} · ${projShort} · ${en ? 'Needs Input' : '待你选择'}`,
      promptInfo,
      diffInfo,
      kind: 'question',
      risk: 'normal',
      code: app.code || '',
      qId,
      questions,
      multi: Boolean(primaryQ.multiSelect),
      headline: `${primaryQ.question || app.promptTitle || defaultQText}${extraCount}`,
      cmdLine: '',
      cmdReason: '',
      replyPreview: '',
      fullReplyMarkdown: latestAssistantMsg?.text || '',
      options,
      canCustom: true,
      customLabel: en ? 'Other plan / Add note…' : '其他方案 / 补充说明…',
    };
  }

  // 2. Tool / Command Approval (`status === 'approval'`)
  if (s.status === 'approval' && app) {
    const cmdLine = String(app.commandLine || app.reason || '').trim();
    const defaultReason = en
      ? `Requesting ${app.toolName || 'tool'}`
      : `请求调用 ${app.toolName || '工具'}`;
    const cmdReason = String(app.subtitle || app.promptTitle || defaultReason).trim();
    const risk = isHighRiskCommand(cmdLine, cmdReason) ? 'high' : 'normal';
    const rawOpts = Array.isArray(app.options) && app.options.length > 0
      ? app.options
      : [
        { index: 1, label: en ? 'Yes, allow this time' : '1. 本次允许执行' },
        { index: 4, label: en ? 'Skip & tell AI what to do instead…' : '不执行，告诉 AI 改怎么做…' },
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
        const localized = localizeApprovalOptionLabel(lbl, positiveOpts.length + 1, lang);
        positiveOpts.push({
          optionIndex: optIdx,
          label: localized,
          shortBtn: shortenButtonOptionText(localized, lang),
          desc: '',
        });
      }
    });

    if (positiveOpts.length === 0) {
      positiveOpts.push({
        optionIndex: 1,
        label: en ? '1. Allow this time' : '1. 本次允许执行',
        shortBtn: en ? 'Allow this time' : '本次允许执行',
        desc: '',
      });
    }

    const rawLead = latestAssistantMsg?.text
      ? (extractPlainSummaryFromMarkdown(latestAssistantMsg.text, lang).split('\n')[0] || '')
      : '';
    const leadLimit = en ? 108 : 68;
    const assistantLead = rawLead.length > leadLimit ? `${rawLead.slice(0, leadLimit - 1)}…` : rawLead;
    const headline =
      assistantLead ||
      app.promptTitle ||
      (en ? `Waiting for tool approval: ${app.toolName || 'command'}` : `等待确认工具调用：${app.toolName || '命令'}`);

    return {
      cardKey: `app:${s.id}:${app.code || ''}`,
      sessionId: s.id,
      hostId: s.hostId,
      harness: s.harness,
      title: cleanTitle,
      sub: `${hostShort} · ${projShort} · ${risk === 'high'
          ? (en ? 'High-Risk Approval' : '高危授权')
          : (en ? 'Tool Approval' : '命令授权')
        }`,
      promptInfo,
      diffInfo,
      kind: 'approval',
      risk,
      code: app.code || '',
      multi: false,
      headline,
      cmdLine,
      cmdReason: risk === 'high'
        ? (en ? `⚠️ High-Risk Guard · ${cmdReason}` : `⚠️ 高危操作拦截 · ${cmdReason}`)
        : `🔧 ${cmdReason}`,
      replyPreview: '',
      fullReplyMarkdown: latestAssistantMsg?.text || '',
      options: positiveOpts,
      denyOptionIndex: denyOptIndex,
      canCustom: canSendPrompt,
      customLabel: en
        ? `${positiveOpts.length + 1}. Skip & tell AI what to do instead…`
        : `${positiveOpts.length + 1}. 不执行，告诉 AI 改怎么做…`,
    };
  }

  // 3. Unread Conclusion or Unread Interrupted (`hasUnreadConclusion || isUnreadInterrupted`)
  const isInterrupted = Boolean(s.isUnreadInterrupted);
  const fullMd = latestAssistantMsg?.text || s.rawLastPreview || s.lastPreview || '';
  const plainBody = extractPlainSummaryFromMarkdown(fullMd, lang);
  const lines = plainBody.split('\n').map(l => l.trim()).filter(Boolean);
  const headLimit = en ? 88 : 56;
  const clipHead = txt => {
    const t = String(txt || '').trim();
    return t.length > headLimit ? `${t.slice(0, headLimit - 1)}…` : t;
  };
  const headline = isInterrupted
    ? (en
      ? `⚠️ Interrupted: ${clipHead(lines[0] || s.lastPreview || 'View details')}`
      : `⚠️ 任务异常中断：${clipHead(lines[0] || s.lastPreview || '请查看详情')}`)
    : (en
      ? `✅ Ready to review: ${clipHead(lines[0] || cleanTitle)}`
      : `✅ 已完工待阅：${clipHead(lines[0] || cleanTitle)}`);
  const replyPreview = lines.slice(1, 4).join(' ') || plainBody.slice(0, 140);

  return {
    cardKey: `conc:${s.id}:${s.conclusionSig || s.updatedAt || ''}`,
    sessionId: s.id,
    hostId: s.hostId,
    harness: s.harness,
    title: cleanTitle,
    sub: `${hostShort} · ${projShort} · ${isInterrupted
        ? (en ? 'Interrupted' : '异常中断')
        : (en ? 'Completed' : '已出结论')
      }${s.hostOnline === false ? (en ? ' · ⚪ Offline' : ' · ⚪ 电脑离线') : ''}`,
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
        label: en ? '1. Mark as Read & Archive' : '1. 已阅归档（消除未读蓝点）',
        shortBtn: en ? 'Mark as Read' : '标为已阅归档',
        desc: '',
      },
    ],
    canCustom: canSendPrompt,
    customLabel: en ? '2. Follow up / Request changes…' : '2. 继续追问 / 交代修改意见…',
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
  let maxDx = 0;
  let dragStartAt = 0;
  let startedInDock = false;
  let startedOnConfirmBtn = false;
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
  let modalSheetBound = false;
  let activeModalKind = '';
  let activeModalSessionId = '';
  let modalExpanded = false;
  let lastModalRenderedLen = -1;
  let lastRenderedSig = '';
  let lastPrehydratedCardKey = '';

  function stopTriageSpeechIfActive() {
    const st = deps.getSpeechState?.();
    if (st?.playing && st?.isTriage) {
      deps.stopSpeech?.();
    }
  }

  function renderTriageSpeechControlsHtml(vm, { compact = false, includeCopy = false } = {}) {
    if (!vm || !vm.sessionId) return '';
    const en = isEn();
    const st = deps.getSpeechState?.() || {};
    const isSpeakingThis = Boolean(st.playing && st.isTriage && st.sessionId === vm.sessionId);
    const sidEsc = esc(vm.sessionId);
    const stopLbl = en ? '⏹ Stop' : '⏹ 停止';
    const listenLbl = en ? '🔊 Listen' : '🔊 播报全文';
    const modeLbl = st.mode === 'concise'
      ? (en ? '⚡ Summary' : '⚡ 重点')
      : (en ? '📖 Full' : '📖 全文');
    const copyLbl = en ? '📋 Copy' : '📋 复制全文';
    const rateVal = st.rate || 1;
    const playBtns = isSpeakingThis
      ? `<button type="button" class="dsh-triage-speak-btn speaking" onclick="event.stopPropagation(); triageStopReplySpeech()">${stopLbl}</button>` +
      (st.hasDistinctSummary
        ? `<button type="button" class="dsh-triage-speak-sub-btn" onclick="event.stopPropagation(); triageSwitchReplySpeechMode('${sidEsc}')" title="${en ? 'Toggle Summary / Full' : '切换重点摘要 / 完整全文'}">${modeLbl}</button>`
        : '') +
      `<button type="button" class="dsh-triage-speak-sub-btn" onclick="event.stopPropagation(); triageCycleReplySpeechRate('${sidEsc}')" title="${en ? 'Change playback speed' : '切换播报倍速'}">${rateVal}x</button>`
      : `<button type="button" class="dsh-triage-speak-btn" onclick="event.stopPropagation(); triageToggleReplySpeech('${sidEsc}')">${listenLbl}</button>`;
    const copyBtn = includeCopy
      ? `<button type="button" class="dsh-triage-speak-sub-btn" onclick="event.stopPropagation(); triageCopyReplyText('${sidEsc}')">${copyLbl}</button>`
      : '';
    return `<div class="dsh-triage-speak-controls ${compact ? 'compact' : ''}" data-triage-speak-sid="${sidEsc}" data-compact="${compact ? '1' : '0'}" data-include-copy="${includeCopy ? '1' : '0'}" onclick="event.stopPropagation()">${playBtns}${copyBtn}</div>`;
  }

  function syncTriageSpeechDom() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.dsh-triage-speak-controls[data-triage-speak-sid]').forEach(el => {
      const sid = el.getAttribute('data-triage-speak-sid') || '';
      if (!sid) return;
      const compact = el.getAttribute('data-compact') === '1';
      const includeCopy = el.getAttribute('data-include-copy') === '1';
      const tmp = document.createElement('div');
      tmp.innerHTML = renderTriageSpeechControlsHtml({ sessionId: sid }, { compact, includeCopy });
      const nextEl = tmp.firstElementChild;
      if (nextEl) el.replaceWith(nextEl);
    });
  }

  function findTriageCardBySessionId(sessionId) {
    const cards = getOrderedActiveCards();
    return cards.find(c => c.vm.sessionId === sessionId) || cards[0] || null;
  }

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

  const curLang = () => (deps.getLang?.() === 'en' ? 'en' : 'zh');
  const isEn = () => curLang() === 'en';

  function syncStaticChromeLang() {
    const en = isEn();
    const overlay = document.getElementById('triageDeckOverlay');
    if (overlay) overlay.setAttribute('aria-label', en ? 'Swipe Triage Mode' : '滑卡批阅模式');
    const titleSpan = document.getElementById('triageCenterTitleText');
    if (titleSpan) titleSpan.textContent = en ? 'Swipe Triage' : '滑卡批阅';
    const backBtn = document.getElementById('triageBackToListBtn');
    if (backBtn) backBtn.textContent = en ? '☰ List View' : '☰ 列表模式';
    const closeBtn = document.getElementById('triageModalCloseBtn');
    if (closeBtn) closeBtn.textContent = en ? 'Close ✕' : '收起 ✕';
    const expBtn = document.getElementById('triageModalExpandBtn');
    if (expBtn) expBtn.textContent = modalExpanded ? (en ? '⤡ Half' : '⤡ 半屏') : (en ? '⤢ Full' : '⤢ 全屏');
  }

  function getOrderedActiveCards() {
    const now = Date.now();
    for (const [k, expAt] of dismissedKeys.entries()) {
      if (now > expAt) dismissedKeys.delete(k);
    }
    const lang = curLang();
    const allSessions = deps.getSessions?.() || [];
    const shortHostMap = deps.getShortHostMap?.() || {};
    const eligible = allSessions.filter(isTriageEligibleSession);
    const models = [];
    for (const s of eligible) {
      const vm = buildTriageCardViewModel(s, shortHostMap, lang);
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
    const en = isEn();
    const tapOrSwipeSub = en ? 'Tap here or swipe right' : '可点此 或 右滑卡片';
    const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
    if (customActive) {
      if (String(draft.customText || '').trim()) {
        return { cls: 'orange', t1: en ? 'Send New Plan 👉' : '发送新方案 👉', t2: tapOrSwipeSub };
      }
      return {
        cls: 'locked',
        t1: en ? '✍️ Type or hold to speak first' : '✍️ 请先输入或长按说话',
        t2: en ? 'Enter your instructions to unlock' : '填写方案后即可点此或右滑发送',
      };
    }
    if (vm.multi) {
      return {
        cls: 'blue',
        t1: en ? `Confirm (${draft.multiSel.length}) 👉` : `确认 (${draft.multiSel.length}项) 👉`,
        t2: tapOrSwipeSub,
      };
    }
    const opt = vm.options[draft.sel] || vm.options[0] || {};
    const shortTxt = opt.shortBtn || (en ? 'Confirm' : '确认');
    const needHold = vm.risk === 'high' && draft.sel === 0;
    if (needHold) {
      return {
        cls: 'crimson',
        t1: en ? `🛡️ Hold 0.8s: ${shortTxt} 👉` : `🛡️ 按住0.8s：${shortTxt} 👉`,
        t2: en ? 'Hold button or pull right 0.8s' : '长按此钮 或 右拉稳住0.8s',
      };
    }
    return {
      cls: vm.kind === 'question' ? 'blue' : '',
      t1: `${shortTxt} 👉`,
      t2: tapOrSwipeSub,
    };
  }

  function updateUndoBtnDom() {
    const undoBtn = document.getElementById('triageUndoBtn');
    if (!undoBtn) return;
    const en = isEn();
    // Drop expired non-reversible grace items that already flushed
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === 'grace' && undoStack[undoStack.length - 1].flushed) {
      undoStack.pop();
    }
    if (undoStack.length === 0) {
      undoBtn.disabled = true;
      undoBtn.classList.remove('grace-active');
      undoBtn.textContent = en ? '↩ Undo' : '↩ 撤回';
      return;
    }
    const top = undoStack[undoStack.length - 1];
    undoBtn.disabled = false;
    if (top.type === 'grace' && !top.flushed) {
      const remSec = Math.max(1, Math.ceil((top.expiresAt - Date.now()) / 1000));
      undoBtn.classList.add('grace-active');
      undoBtn.textContent = en ? `↩ Undo (${remSec}s)` : `↩ 撤回 (${remSec}s)`;
    } else {
      undoBtn.classList.remove('grace-active');
      undoBtn.textContent = en ? '↩ Undo' : '↩ 撤回';
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
    for (const item of cards.slice(0, 3)) {
      const s = item.session;
      if (s._wireTruncated || !item.vm.promptInfo.text || s.omittedTranscriptCount > 0 || s.hasMoreTranscript) {
        deps.hydrateColdSession?.(s.hostId, s.id, s.sessionRev);
      }
    }
  }

  function render({ force = false } = {}) {
    if (!isOpen) return;
    syncStaticChromeLang();
    const en = isEn();
    const lang = curLang();
    // Protect active user gestures, voice dictation, or IME keyboard typing from background SSE re-renders!
    if (!force && (dragging || isRecording || document.activeElement?.id === 'triageCustomTextarea')) {
      const countEl = document.getElementById('triageCountChip');
      if (countEl) countEl.textContent = String(getOrderedActiveCards().length);
      updateUndoBtnDom();
      return;
    }

    const cards = getOrderedActiveCards();
    preHydrateTopCards(cards);
    refreshOpenModalIfNeeded(cards);
    updateUndoBtnDom();

    const countChip = document.getElementById('triageCountChip');
    if (countChip) countChip.textContent = String(cards.length);

    const fgCard = document.getElementById('triageFgCard');
    const lRight = document.getElementById('triageLayerRight');
    const lRightInner = document.getElementById('triageLayerRightInner');
    const lLeft = document.getElementById('triageLayerLeft');
    const lDeep = document.getElementById('triageLayerDeep');
    if (!fgCard || !lRight || !lRightInner || !lLeft || !lDeep) return;

    const sig = `${lang}::` + cards.map(c => {
      const d = ensureDraft(c.vm);
      return `${c.vm.cardKey}:${c.vm.promptInfo.text.length}:${c.vm.fullReplyMarkdown.length}:${c.vm.diffInfo.files.length}:${d.sel}:${d.multiSel.join(',')}:${d.useCustom ? 1 : 0}:${d.customOpen ? 1 : 0}:${d.snoozedCount}:${isRecording ? 1 : 0}`;
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
      const emptyTitle = en ? 'All Pending Cards Cleared!' : '待处理卡片已全部清零！';
      const emptyDesc = runningCount > 0
        ? (en
          ? `<strong>${runningCount} task${runningCount === 1 ? ' is' : 's are'} running</strong> in the background. Switch to List View for live progress.`
          : `目前还有 <strong>${runningCount} 个任务正在后台运行</strong>，切回列表模式即可查看实时进度。`)
        : (en
          ? 'All pending approvals and unread conclusions are done.'
          : '所有待授权与未读完结会话均已处理完毕。');
      const runBtnLbl = en ? `🟢 View Running Tasks (${runningCount}) ›` : `🟢 去列表查看运行中任务 (${runningCount}) ›`;
      const backListLbl = en ? '☰ Back to Session List' : '☰ 返回会话列表';
      fgCard.innerHTML = `
        <div style="margin:auto;text-align:center;padding:28px 18px;display:flex;flex-direction:column;gap:14px;align-items:center;">
          <div style="font-size:44px;">🎉</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${emptyTitle}</div>
          <div style="font-size:13px;color:#64748b;line-height:1.55;">
            ${emptyDesc}
          </div>
          ${runningCount > 0
          ? `<button type="button" onclick="triageSwitchToRunningList()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(37,99,235,0.25);">${runBtnLbl}</button>`
          : `<button type="button" onclick="closeTriageDeckMode()" style="width:100%;margin-top:6px;height:50px;border:none;border-radius:25px;background:#0f172a;color:#fff;font-size:14.5px;font-weight:800;cursor:pointer;">${backListLbl}</button>`}
        </div>`;
      return;
    }

    const { session: s, vm } = cards[0];
    const prehydrateKey = `${s.id}:${s.sessionRev || ''}`;
    if (
      (s._wireTruncated || s.omittedTranscriptCount > 0 || s.hasMoreTranscript) &&
      lastPrehydratedCardKey !== prehydrateKey
    ) {
      lastPrehydratedCardKey = prehydrateKey;
      deps.hydrateColdSession?.(s.hostId, s.id, s.sessionRev);
    }
    const draft = ensureDraft(vm);
    fgCard.classList.toggle('is-high', vm.risk === 'high');

    const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
    const btnModel = computeConfirmBtnModel(vm, draft);

    const firstImgPath = vm.promptInfo.mediaPaths[0] || '';
    const thumbSrc = firstImgPath ? buildLocalThumbSrc(vm.hostId, firstImgPath) : '';
    const thumbCountLbl = en ? `${vm.promptInfo.imageCount} img` : `${vm.promptInfo.imageCount}图`;
    const thumbHtml = vm.promptInfo.imageCount > 0
      ? `<div class="dsh-triage-thumb">
          ${thumbSrc ? `<img src="${esc(thumbSrc)}" alt="${en ? 'Image' : '附件图'}" onerror="this.style.display='none'" />` : '<span>🖼️</span>'}
          <span class="dsh-triage-thumb-count">${thumbCountLbl}</span>
         </div>`
      : '';

    const myPromptText = vm.promptInfo.text || s.title || (en ? 'Tap to view conversation' : '点击查看对话详情');
    const fileCount = vm.diffInfo.files.length;
    const diffLabel = en
      ? `📄 Code Changes · ${fileCount} file${fileCount === 1 ? '' : 's'}`
      : `📄 代码改动 · ${fileCount} 个文件`;
    const diffBarHtml = fileCount > 0
      ? `<div class="dsh-triage-diff-bar" onclick="openTriageFilesModal()">
          <span>${diffLabel}</span>
          <span style="font-family:var(--mono,monospace);font-weight:700;">
            ${vm.diffInfo.hasLineCounts
        ? `<span style="color:#16a34a">+${vm.diffInfo.totalAdd}</span><span style="color:#dc2626;margin-left:5px;">-${vm.diffInfo.totalDel}</span>`
        : `<span style="color:#64748b">${en ? 'View' : '点此查看'}</span>`}
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
            <div class="dsh-triage-reply-footer">
              <span class="dsh-triage-reply-expand">${en ? 'Tap to read full reply ›' : '点击展开完整回复全文 ›'}</span>
              ${renderTriageSpeechControlsHtml(vm, { compact: true })}
            </div>
          </div>`
        : '';

    const expandAskLbl = en
      ? `Tap to view full prompt${vm.promptInfo.imageCount > 0 ? ' & image' : ''} ›`
      : `点击查看完整提问${vm.promptInfo.imageCount > 0 ? '与截图' : ''} ›`;

    fgCard.innerHTML = `
      <div class="dsh-triage-body" id="triageCardBody">
        <div class="dsh-triage-hdr">
          ${renderHarnessBadgeHtml(vm.harness, 'row', vm.harness)}
          <div class="dsh-triage-hdr-info">
            <div class="dsh-triage-title-row">
              <div class="dsh-triage-title">${esc(vm.title)}</div>
              <button type="button" class="dsh-triage-open-chat" onclick="event.stopPropagation(); triageOpenFullSession('${esc(vm.sessionId)}')">${en ? 'Chat ›' : '对话 ›'}</button>
            </div>
            <div class="dsh-triage-sub">
              <span>${esc(vm.sub)}</span>
              ${draft.snoozedCount > 0 ? `<span class="dsh-triage-snooze-tag">${en ? '↪ Snoozed' : '↪ 稍后看'}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="dsh-triage-my-ask" onclick="openTriagePromptModal()">
          <div class="dsh-triage-my-ask-body">
            <div class="dsh-triage-clamp2"><strong>${en ? 'Me: ' : '我：'}</strong>${esc(myPromptText)}</div>
            <div style="color:#2563eb;font-size:11px;font-weight:700;margin-top:2px;">${expandAskLbl}</div>
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
                      ${isRecording
          ? (en ? '🎙️ Listening… Release to insert text' : '🎙️ 正在聆听语音… 松手落入输入框')
          : (en ? 'Tap to type · Hold to speak' : '短按弹键盘打字 · 长按直接说话')}
                    </div>
                  </div>
                </div>
                <span class="dsh-triage-mic-chip">${isRecording ? (en ? '🔴 Live' : '🔴 听写中') : (en ? '🎙️ Hold' : '🎙️ 长按说')}</span>
              </div>
              ${draft.customOpen ? `
                <textarea class="dsh-triage-ta" id="triageCustomTextarea" rows="2" placeholder="${en ? 'Type your instructions, or hold above to append voice…' : '输入你的方案，或继续长按上方追加语音…'}"
                  onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()"
                  oninput="triageUpdateCustomText(this.value)">${esc(draft.customText)}</textarea>` : ''}
            </div>` : ''}
        </div>
      </div>

      <div class="dsh-triage-dock">
        <button type="button" class="dsh-triage-btn-snooze" onclick="triageTapSnooze()">
          <span>👈</span>
          <span>${en ? 'Snooze' : '搁置'}</span>
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
    showDragPill(
      isEn() ? '✍️ Empty input — type or hold to speak first' : '✍️ 内容为空，请先打字或长按说话',
      '#ea580c',
      '#ffffff'
    );
    hideDragPill(1000);
    setTimeout(() => document.getElementById('triageCustomTextarea')?.focus(), 50);
  }

  // ---- Voice Dictation via Web Speech API (Isolated from ChatStage) ----
  function startLiveSpeechDictation(vm, draft) {
    stopTriageSpeechIfActive();
    const SpeechCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechCtor) {
      isRecording = false;
      deps.showToast?.(
        isEn()
          ? 'Speech dictation is unavailable in this browser; please type instead'
          : '当前浏览器环境不支持语音听写，请直接键盘输入'
      );
      render({ force: true });
      setTimeout(() => document.getElementById('triageCustomTextarea')?.focus(), 40);
      return;
    }
    try {
      if (speechRec) {
        try { speechRec.abort(); } catch { }
      }
      const rec = new SpeechCtor();
      rec.lang = isEn() ? 'en-US' : 'zh-CN';
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
    stopTriageSpeechIfActive();

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
      showDragPill(isEn() ? '✓ Marked as read' : '✓ 已标为已读', '#059669', '#ffffff');
      hideDragPill(650);
    } else {
      scheduleGraceCommit(vm, session, commitFn);
      showDragPill(
        isEn() ? '✓ Confirmed (tap Undo within 2s to cancel)' : '✓ 已确认（2秒内可点左上角撤回）',
        '#059669',
        '#ffffff'
      );
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
      showDragPill(isEn() ? 'Only 1 pending card left' : '只剩最后 1 张待处理啦', '#475569', '#ffffff');
      hideDragPill(700);
      return;
    }
    const { session, vm } = cards[0];
    stopTriageSpeechIfActive();
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

    showDragPill(isEn() ? '↪ Snoozed to back of deck' : '↪ 已搁置到牌堆后面', '#475569', '#ffffff');
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
    const en = isEn();
    while (undoStack.length > 0 && undoStack[undoStack.length - 1].type === 'grace' && undoStack[undoStack.length - 1].flushed) {
      undoStack.pop();
    }
    if (!undoStack.length) return;
    const last = undoStack.pop();
    if (last.type === 'grace') {
      if (last.graceTimer) clearTimeout(last.graceTimer);
      last.graceTimer = null;
      dismissedKeys.delete(last.cardKey);
      showDragPill(
        en ? '↩ Cancelled in time! Not sent to computer' : '↩ 已成功拦截撤回！尚未发往电脑',
        '#ea580c',
        '#ffffff'
      );
      hideDragPill(1000);
    } else if (last.type === 'snooze') {
      if (last.prevSnooze) snoozeOrder.set(last.cardKey, last.prevSnooze);
      else snoozeOrder.delete(last.cardKey);
      showDragPill(en ? '↩ Restored previous card' : '↩ 已撤回上一张卡片', '#334155', '#ffffff');
      hideDragPill(700);
    } else if (last.type === 'read') {
      dismissedKeys.delete(last.cardKey);
      deps.restoreSessionUnread?.(last.sessionId, last.prevSnapshot);
      showDragPill(en ? '↩ Restored as unread' : '↩ 已恢复为未读待阅', '#334155', '#ffffff');
      hideDragPill(700);
    }
    render({ force: true });
    deps.onDeckChanged?.();
  }

  // ---- Modals (Full Prompt + Image / Changed Files / Full Reply / Full Command) ----
  function setModalExpanded(nextExpanded) {
    modalExpanded = Boolean(nextExpanded);
    const en = isEn();
    const sheet = document.getElementById('triageDetailModalContent');
    const expBtn = document.getElementById('triageModalExpandBtn');
    if (sheet) {
      sheet.classList.remove('sheet-dragging');
      sheet.style.height = '';
      sheet.style.transform = '';
      sheet.classList.toggle('expanded', modalExpanded);
    }
    if (expBtn) {
      expBtn.textContent = modalExpanded ? (en ? '⤡ Half' : '⤡ 半屏') : (en ? '⤢ Full' : '⤢ 全屏');
    }
  }

  function buildPromptModalBodyHtml(top) {
    const en = isEn();
    const { vm, session } = top;
    const imgsHtml = vm.promptInfo.mediaPaths.map(p => {
      const enc = encodeURIComponent(p).replace(/'/g, '%27');
      const fullSrc = buildLocalThumbSrc(vm.hostId, p);
      return `<div style="margin-top:10px;" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
        <img src="${esc(fullSrc)}" alt="${en ? 'Prompt Image' : '提问原图'}" style="max-width:100%;max-height:48vh;border-radius:12px;border:1px solid #cbd5e1;cursor:pointer;" />
        <div style="font-size:11.5px;color:#2563eb;font-weight:700;margin-top:4px;">${en ? '🔍 Tap to open full-res image viewer' : '🔍 点击打开高清原图预览器'}</div>
      </div>`;
    }).join('');
    const loadingHint = session._wireTruncated
      ? `<div style="margin-top:10px;padding:8px 12px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">${en ? '⏳ Syncing full prompt…' : '⏳ 正在同步完整提问内容…'}</div>`
      : '';
    return `<div style="font-size:14px;line-height:1.65;color:#1e293b;background:#f8fafc;padding:13px;border-radius:14px;white-space:pre-wrap;word-break:break-word;">${esc(vm.promptInfo.text || session.title)}</div>${imgsHtml}${loadingHint}`;
  }

  function buildReplyModalBodyHtml(top) {
    const en = isEn();
    const { vm, session } = top;
    const rawMd = vm.fullReplyMarkdown || vm.headline;
    const renderedMd = deps.formatAssistantText
      ? deps.formatAssistantText(rawMd, vm.artifacts)
      : `<div style="white-space:pre-wrap;">${esc(rawMd)}</div>`;
    const charMeta = session._wireTruncated
      ? (en ? 'Syncing full…' : '全文同步中…')
      : (en ? `${rawMd.length} chars` : `共 ${rawMd.length} 字`);
    const toolbarHtml = `<div class="dsh-triage-modal-toolbar">
      ${renderTriageSpeechControlsHtml(vm, { compact: false, includeCopy: true })}
      <span class="dsh-triage-modal-char-meta">${charMeta}</span>
    </div>`;
    const loadingHint = session._wireTruncated
      ? `<div style="margin-top:12px;padding:9px 12px;border-radius:10px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">${en ? '⏳ Fetching full untruncated reply…' : '⏳ 正在从云端拉取完整未截断全文…'}</div>`
      : '';
    const jumpChatBtn = `<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f1f5f9;display:flex;justify-content:center;">
      <button type="button" class="dsh-triage-open-chat" style="padding:7px 14px;font-size:12.5px;" onclick="closeTriageDetailModal(); triageOpenFullSession('${esc(vm.sessionId)}')">${en ? '💬 Open Full Conversation ›' : '💬 进入完整对话上下文 ›'}</button>
    </div>`;
    return `${toolbarHtml}<div class="md-body" style="font-size:14px;line-height:1.68;padding:2px 2px 6px;color:#0f172a;">${renderedMd}</div>${loadingHint}${jumpChatBtn}`;
  }

  function refreshOpenModalIfNeeded(cards) {
    if (!activeModalKind) return;
    const modal = document.getElementById('triageDetailModal');
    const titleEl = document.getElementById('triageModalTitle');
    const scrollBody = document.getElementById('triageModalScrollBody');
    if (!modal?.classList.contains('open') || !scrollBody) return;
    const target = cards.find(c => c.vm.sessionId === activeModalSessionId) || cards[0];
    if (!target) return;
    const en = isEn();
    const langFlag = en ? 4 : 0;

    if (activeModalKind === 'reply') {
      if (titleEl) titleEl.textContent = en ? '📖 Latest Full AI Reply' : '📖 AI 最新完整回复';
      const nextSigLen = (target.vm.fullReplyMarkdown || '').length * 8 + (target.session._wireTruncated ? 1 : 0) + langFlag;
      if (nextSigLen !== lastModalRenderedLen) {
        const prevTop = scrollBody.scrollTop;
        lastModalRenderedLen = nextSigLen;
        scrollBody.innerHTML = buildReplyModalBodyHtml(target);
        scrollBody.scrollTop = prevTop;
      }
    } else if (activeModalKind === 'prompt') {
      if (titleEl) titleEl.textContent = en ? '💬 My Full Prompt' : '💬 我发送的完整提问';
      const nextSigLen = (target.vm.promptInfo.text || '').length * 8 + (target.session._wireTruncated ? 1 : 0) + langFlag;
      if (nextSigLen !== lastModalRenderedLen) {
        const prevTop = scrollBody.scrollTop;
        lastModalRenderedLen = nextSigLen;
        scrollBody.innerHTML = buildPromptModalBodyHtml(target);
        scrollBody.scrollTop = prevTop;
      }
    }
  }

  function bindModalSheetGestures() {
    if (modalSheetBound || typeof window === 'undefined') return;
    const modal = document.getElementById('triageDetailModal');
    const sheet = document.getElementById('triageDetailModalContent');
    const hdr = document.getElementById('triageModalHeader');
    const scrollBody = document.getElementById('triageModalScrollBody');
    if (!modal || !sheet || !hdr || !scrollBody) return;
    modalSheetBound = true;

    // 1. Header / Grabber 1:1 vertical resize & pull-to-close
    let hDragging = false;
    let hStartY = 0;
    let hLastY = 0;
    let hStartAt = 0;
    let hStartHeight = 0;
    let hOverlayHeight = 0;

    function onHdrStart(clientY, target) {
      if (target?.closest?.('button')) return;
      hDragging = true;
      hStartY = clientY;
      hLastY = clientY;
      hStartAt = Date.now();
      hOverlayHeight = modal.getBoundingClientRect().height || window.innerHeight || 700;
      hStartHeight = sheet.getBoundingClientRect().height || hOverlayHeight * 0.68;
      sheet.classList.add('sheet-dragging');
    }

    function onHdrMove(clientY, ev) {
      if (!hDragging) return;
      if (ev && ev.cancelable) ev.preventDefault();
      hLastY = clientY;
      const deltaY = clientY - hStartY; // negative = pulling UP, positive = pulling DOWN
      const candidateH = hStartHeight - deltaY;
      const minResizeH = hOverlayHeight * 0.46;
      const maxResizeH = hOverlayHeight * 0.94;
      if (candidateH < minResizeH) {
        sheet.style.height = `${minResizeH}px`;
        sheet.style.transform = `translateY(${Math.max(0, minResizeH - candidateH)}px)`;
      } else {
        sheet.style.transform = '';
        sheet.style.height = `${Math.min(maxResizeH, candidateH)}px`;
      }
    }

    function onHdrEnd() {
      if (!hDragging) return;
      hDragging = false;
      const deltaY = hLastY - hStartY;
      const dt = Math.max(1, Date.now() - hStartAt);
      const vy = deltaY / dt;
      const curH = sheet.getBoundingClientRect().height || hStartHeight;
      sheet.classList.remove('sheet-dragging');
      sheet.style.height = '';
      sheet.style.transform = '';

      if (deltaY < -24 || vy < -0.28 || curH > hOverlayHeight * 0.8) {
        setModalExpanded(true);
        return;
      }
      if (deltaY > 28 || vy > 0.35) {
        if (modalExpanded && deltaY < 190 && vy < 0.7) {
          setModalExpanded(false);
        } else if (deltaY > 65 || vy > 0.42) {
          closeDetailModal();
        } else {
          setModalExpanded(modalExpanded);
        }
        return;
      }
      setModalExpanded(modalExpanded);
    }

    hdr.addEventListener('touchstart', e => {
      if (e.touches?.[0]) onHdrStart(e.touches[0].clientY, e.target);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (hDragging && e.touches?.[0]) onHdrMove(e.touches[0].clientY, e);
    }, { passive: false });
    window.addEventListener('touchend', onHdrEnd);
    window.addEventListener('touchcancel', onHdrEnd);

    hdr.addEventListener('mousedown', e => {
      if (e.button === 0) onHdrStart(e.clientY, e.target);
    });
    window.addEventListener('mousemove', e => {
      if (hDragging) onHdrMove(e.clientY, null);
    });
    window.addEventListener('mouseup', onHdrEnd);

    // 2. Scrollable Body: native iOS momentum scroll + auto-stretch to 94% on upward swipe + pull-down at scrollTop=0
    let bTracking = false;
    let bPullingDown = false;
    let bStartX = 0;
    let bStartY = 0;
    let bLastY = 0;
    let bStartTop = 0;
    let bStartAt = 0;

    scrollBody.addEventListener('touchstart', e => {
      if (!e.touches?.[0]) return;
      bTracking = true;
      bPullingDown = false;
      bStartX = e.touches[0].clientX;
      bStartY = e.touches[0].clientY;
      bLastY = bStartY;
      bStartTop = scrollBody.scrollTop;
      bStartAt = Date.now();
    }, { passive: true });

    scrollBody.addEventListener('touchmove', e => {
      if (!bTracking || !e.touches?.[0]) return;
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      const bDx = cx - bStartX;
      const bDy = cy - bStartY;
      bLastY = cy;

      // Upward swipe inside body: let iOS native scroll run untouched, AND smoothly expand sheet to 94%!
      if (!bPullingDown && bDy < -24 && Math.abs(bDy) > Math.abs(bDx)) {
        if (!modalExpanded && scrollBody.scrollHeight > scrollBody.clientHeight + 12) {
          setModalExpanded(true);
        }
        return;
      }

      // Downward pull when already at top of scroll container
      if (bStartTop <= 1 && scrollBody.scrollTop <= 1 && bDy > 14 && bDy > Math.abs(bDx) * 1.15) {
        bPullingDown = true;
        if (e.cancelable) e.preventDefault();
        sheet.classList.add('sheet-dragging');
        sheet.style.transform = `translateY(${Math.max(0, bDy * 0.78)}px)`;
      }
    }, { passive: false });

    const finishBodyTouch = () => {
      if (!bTracking) return;
      bTracking = false;
      if (!bPullingDown) return;
      bPullingDown = false;
      const bDy = bLastY - bStartY;
      const vy = bDy / Math.max(1, Date.now() - bStartAt);
      sheet.classList.remove('sheet-dragging');
      sheet.style.transform = '';
      if (bDy > 68 || vy > 0.5) {
        if (modalExpanded && bDy < 180 && vy < 0.75) {
          setModalExpanded(false);
        } else {
          closeDetailModal();
        }
      }
    };
    scrollBody.addEventListener('touchend', finishBodyTouch);
    scrollBody.addEventListener('touchcancel', finishBodyTouch);
  }

  function openModalView({ title, bodyHtml, kind = '', sessionId = '', sigLen = 0, defaultExpanded = false }) {
    const modal = document.getElementById('triageDetailModal');
    const titleEl = document.getElementById('triageModalTitle');
    const scrollBody = document.getElementById('triageModalScrollBody');
    if (!modal || !scrollBody) return;
    bindModalSheetGestures();
    activeModalKind = kind;
    activeModalSessionId = sessionId;
    lastModalRenderedLen = sigLen;
    if (titleEl) titleEl.textContent = title;
    scrollBody.innerHTML = bodyHtml;
    scrollBody.scrollTop = 0;
    setModalExpanded(defaultExpanded);
    modal.classList.add('open');
  }

  function closeDetailModal() {
    activeModalKind = '';
    activeModalSessionId = '';
    lastModalRenderedLen = -1;
    const modal = document.getElementById('triageDetailModal');
    const sheet = document.getElementById('triageDetailModalContent');
    if (sheet) {
      sheet.classList.remove('sheet-dragging', 'expanded');
      sheet.style.height = '';
      sheet.style.transform = '';
    }
    modal?.classList.remove('open');
  }

  function bindCardGestureListeners() {
    if (listenersBound || typeof window === 'undefined') return;
    const stackEl = document.getElementById('triageCardStack');
    const fgCard = document.getElementById('triageFgCard');
    if (!stackEl || !fgCard) return;
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
      if (document.getElementById('triageDetailModal')?.classList.contains('open')) return;
      if (target?.closest?.('.dsh-triage-custom, textarea, .dsh-triage-speak-controls')) return;
      if (!getOrderedActiveCards().length) return;
      dragging = true;
      axisLocked = '';
      sx = clientX;
      sy = clientY;
      dx = 0;
      dy = 0;
      maxDx = 0;
      dragStartAt = Date.now();
      startedInDock = Boolean(target?.closest?.('.dsh-triage-dock'));
      startedOnConfirmBtn = Boolean(target?.closest?.('#triageConfirmBtn'));
      rightDragUnlocked = false;
      clearInterval(rightDragHoldTimer);
      rightDragHoldTimer = null;
    }

    function onPointerMove(clientX, clientY, ev) {
      if (!dragging || !isOpen) return;
      dx = clientX - sx;
      dy = clientY - sy;
      if (dx > maxDx) maxDx = dx;

      if (!axisLocked) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        axisLocked = Math.abs(dx) >= Math.abs(dy) * 0.92 ? 'x' : 'y';
      }
      if (axisLocked !== 'x') {
        // Card Y-axis is strictly locked (never translates vertically); internal body only scrolls if overflowing
        return;
      }
      if (ev && ev.cancelable) ev.preventDefault();

      if (Math.abs(dx) >= 12) {
        btnPressMoved = true;
        clearInterval(holdTimer);
        holdTimer = null;
      }
      const progBar = document.getElementById('triageBtnProg');
      const stackDom = document.getElementById('triageCardStack');
      const lRight = document.getElementById('triageLayerRight');

      fgCard.classList.add('dragging');
      lRight?.classList.add('following');
      stackDom?.classList.toggle('dragging-right', dx > 16);
      stackDom?.classList.toggle('dragging-left', dx < -16);

      const cards = getOrderedActiveCards();
      if (!cards.length) return;
      const { vm } = cards[0];
      const draft = ensureDraft(vm);

      if (dx > 0 && isEmptyCustomSelected(vm, draft)) {
        const lockedX = Math.min(24, Math.pow(dx, 0.52) * 1.6);
        fgCard.style.transform = `translate3d(${lockedX}px, 0, 0)`;
        showDragPill(
          isEn() ? '✍️ Empty input — type or hold to speak first' : '✍️ 手工填写为空，请先打字或长按说话',
          '#ea580c',
          '#ffffff'
        );
        return;
      }

      const normSpan = startedInDock ? 64 : 105;
      const ratio = Math.min(1, Math.abs(dx) / normSpan);
      if (lRight) {
        lRight.style.transform = `translate3d(${REST_X * (1 - ratio)}px, ${REST_Y * (1 - ratio)}px, 0) scale(${REST_SCALE + (1 - REST_SCALE) * ratio}) rotate(${REST_ROT * (1 - ratio)}deg)`;
      }

      const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
      const isHighRiskConfirm = dx > 0 && !customActive && !vm.multi && vm.risk === 'high' && draft.sel === 0;
      const highRiskHoldZone = startedInDock ? 32 : 68;
      const en = isEn();

      if (isHighRiskConfirm) {
        const dampedX = Math.min(104, Math.pow(dx, 0.75) * 2.15);
        fgCard.style.transform = `translate3d(${dampedX}px, 0, 0) rotate(${dampedX * 0.045}deg)`;
        if (dx > highRiskHoldZone && !rightDragHoldTimer && !rightDragUnlocked) {
          let pct = 15;
          if (progBar) progBar.style.width = `${pct}%`;
          showDragPill(
            en ? '🛡️ High-risk guard · Hold steady 0.8s…' : '🛡️ 高危防手滑 · 稳住 0.8s 蓄力中…',
            '#e11d48',
            '#ffffff'
          );
          rightDragHoldTimer = setInterval(() => {
            pct += 14;
            const b = document.getElementById('triageBtnProg');
            if (b) b.style.width = `${Math.min(100, pct)}%`;
            if (pct >= 100) {
              clearInterval(rightDragHoldTimer);
              rightDragHoldTimer = null;
              rightDragUnlocked = true;
              navigator.vibrate?.(25);
              showDragPill(
                isEn() ? '🔓 Unlocked! Release to confirm' : '🔓 蓄力完成！松手确认放行',
                '#059669',
                '#ffffff'
              );
            }
          }, 85);
        } else if (dx <= highRiskHoldZone && !rightDragUnlocked) {
          clearInterval(rightDragHoldTimer);
          rightDragHoldTimer = null;
          if (progBar) progBar.style.width = `${Math.min(30, dx * 0.35)}%`;
          showDragPill(
            en ? '🛡️ Pull right & hold 0.8s to confirm' : '🛡️ 继续右拉稳住 0.8s 确认',
            '#e11d48',
            '#ffffff'
          );
        }
      } else {
        const moveX = startedInDock ? dx * 1.05 : dx * 0.86;
        fgCard.style.transform = `translate3d(${moveX}px, 0, 0) rotate(${moveX * 0.045}deg)`;
        const pillThreshold = startedInDock ? 20 : 34;
        if (dx > pillThreshold) showDragPill(en ? '👉 Release to confirm' : '👉 松手确认提交', '#059669', '#ffffff');
        else if (dx < -pillThreshold) showDragPill(en ? '👈 Release to snooze' : '👈 松手搁置到后面', '#475569', '#ffffff');
        else hideDragPill();
      }
    }

    function cleanupDragVisuals() {
      dragging = false;
      clearInterval(rightDragHoldTimer);
      rightDragHoldTimer = null;
      document.getElementById('triageCardStack')?.classList.remove('dragging-right', 'dragging-left');
      const progBar = document.getElementById('triageBtnProg');
      if (progBar) progBar.style.width = '0%';
      fgCard.classList.remove('dragging');
      document.getElementById('triageLayerRight')?.classList.remove('following');
    }

    function onPointerEnd() {
      if (!dragging) return;
      cleanupDragVisuals();

      if (axisLocked === 'x') {
        const cards = getOrderedActiveCards();
        const top = cards[0];
        if (top) {
          const { vm } = top;
          const draft = ensureDraft(vm);
          const dt = Math.max(1, Date.now() - dragStartAt);
          const vx = dx / dt;

          const emptyAttemptThreshold = startedInDock ? 18 : 30;
          if (dx > emptyAttemptThreshold && isEmptyCustomSelected(vm, draft)) {
            resetCardPos();
            nudgeEmptyCustom();
            return;
          }

          const shouldRightConfirm =
            (startedOnConfirmBtn && dx >= 12 && dx >= maxDx - 10) ||
            (startedInDock && (dx >= 28 || (dx >= 16 && vx > 0.24))) ||
            dx >= 56 ||
            (dx >= 30 && vx > 0.32);

          if (shouldRightConfirm) {
            const customActive = vm.canCustom && (vm.multi ? draft.useCustom : draft.sel === vm.options.length);
            const isHighRiskConfirm = !customActive && !vm.multi && vm.risk === 'high' && draft.sel === 0;
            if (isHighRiskConfirm && !rightDragUnlocked) {
              resetCardPos();
              showDragPill(
                isEn() ? '🛡️ High-risk: hold 0.8s or pull right & hold' : '🛡️ 高危操作请按住 0.8s 或右拉稳住 0.8s',
                '#e11d48',
                '#ffffff'
              );
              hideDragPill(800);
              return;
            }
            confirmTopCard();
            return;
          }

          const shouldLeftSnooze =
            (startedInDock && (dx <= -32 || (dx <= -18 && vx < -0.24))) ||
            dx <= -56 ||
            (dx <= -30 && vx < -0.32);

          if (shouldLeftSnooze) {
            snoozeTopCard();
            return;
          }
        }
      }
      resetCardPos();
      hideDragPill();
    }

    function onPointerCancel() {
      if (!dragging) return;
      cleanupDragVisuals();
      resetCardPos();
      hideDragPill();
    }

    stackEl.addEventListener('touchstart', e => {
      if (e.touches?.[0]) onPointerStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (isOpen && dragging && e.touches?.[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });
    window.addEventListener('touchend', onPointerEnd);
    window.addEventListener('touchcancel', onPointerCancel);

    stackEl.addEventListener('mousedown', e => {
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
        bindModalSheetGestures();
        render({ force: true });
      },
      closeTriageDeckMode() {
        flushAllGraceCommits();
        stopLiveSpeechDictation();
        stopTriageSpeechIfActive();
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
        stopTriageSpeechIfActive();
        deps.openSession?.(sessionId);
      },
      triageToggleReplySpeech(sessionId) {
        const target = findTriageCardBySessionId(sessionId);
        if (!target) return;
        const { session, vm } = target;
        if (session._wireTruncated || session.omittedTranscriptCount > 0 || session.hasMoreTranscript) {
          deps.hydrateColdSession?.(session.hostId, session.id, session.sessionRev);
        }
        const rawText = String(vm.fullReplyMarkdown || vm.replyPreview || vm.headline || '').trim();
        deps.toggleTriageSpeech?.(vm.sessionId, rawText);
      },
      triageStopReplySpeech() {
        deps.stopSpeech?.();
      },
      triageSwitchReplySpeechMode(sessionId) {
        const target = findTriageCardBySessionId(sessionId);
        const rawText = target ? String(target.vm.fullReplyMarkdown || target.vm.replyPreview || target.vm.headline || '').trim() : '';
        deps.switchTriageSpeechMode?.(target?.vm?.sessionId || sessionId, rawText);
      },
      triageCycleReplySpeechRate(sessionId) {
        const target = findTriageCardBySessionId(sessionId);
        const rawText = target ? String(target.vm.fullReplyMarkdown || target.vm.replyPreview || target.vm.headline || '').trim() : '';
        deps.cycleTriageSpeechRate?.(target?.vm?.sessionId || sessionId, rawText);
      },
      triageCopyReplyText(sessionId) {
        const target = findTriageCardBySessionId(sessionId);
        const rawText = target ? String(target.vm.fullReplyMarkdown || target.vm.replyPreview || target.vm.headline || '').trim() : '';
        void deps.copyText?.(rawText);
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
            showDragPill(
              isEn() ? '🛡️ High-risk: hold for 0.8s to confirm' : '🛡️ 高危操作请按住 0.8 秒确认',
              '#e11d48',
              '#ffffff'
            );
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
      toggleTriageModalExpand() {
        setModalExpanded(!modalExpanded);
      },
      closeTriageDetailModal: closeDetailModal,
      openTriagePromptModal() {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const en = isEn();
        const { vm, session } = top;
        if (session._wireTruncated || session.omittedTranscriptCount > 0 || session.hasMoreTranscript) {
          deps.hydrateColdSession?.(session.hostId, session.id, session.sessionRev);
        }
        const sigLen = (vm.promptInfo.text || '').length * 8 + (session._wireTruncated ? 1 : 0) + (en ? 4 : 0);
        openModalView({
          title: en ? '💬 My Full Prompt' : '💬 我发送的完整提问',
          bodyHtml: buildPromptModalBodyHtml(top),
          kind: 'prompt',
          sessionId: vm.sessionId,
          sigLen,
          defaultExpanded: false,
        });
      },
      openTriageFilesModal() {
        const top = getOrderedActiveCards()[0];
        if (!top || !top.vm.diffInfo.files.length) return;
        const en = isEn();
        const { vm } = top;
        const n = vm.diffInfo.files.length;
        const bodyHtml = `<div style="display:flex;flex-direction:column;gap:7px;">
          ${vm.diffInfo.files.map(f => {
          const enc = encodeURIComponent(f.path || f.name).replace(/'/g, '%27');
          return `<div class="dsh-triage-file-row" onclick="closeTriageDetailModal(); triageInspectSessionFile('${esc(vm.sessionId)}', '${enc}')">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;">${esc(f.name)}</span>
              <span style="flex-shrink:0;">
                ${vm.diffInfo.hasLineCounts ? `<b style="color:#16a34a">+${f.added}</b> <b style="color:#dc2626">-${f.removed}</b>` : ''}
                <span style="color:#2563eb;margin-left:4px;">${en ? 'View ›' : '查看 ›'}</span>
              </span>
            </div>`;
        }).join('')}
        </div>`;
        openModalView({
          title: en ? `📄 Code Changes (${n} file${n === 1 ? '' : 's'})` : `📄 代码改动 (${n} 个文件)`,
          bodyHtml,
          kind: 'files',
          sessionId: vm.sessionId,
          defaultExpanded: false,
        });
      },
      triageInspectSessionFile(sessionId, encodedPath) {
        deps.openFileForSession?.(sessionId, decodeURIComponent(encodedPath));
      },
      openTriageCommandModal() {
        const top = getOrderedActiveCards()[0];
        if (!top || !top.vm.cmdLine) return;
        const en = isEn();
        const bodyHtml = `
          <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${en ? 'Working Dir: ' : '执行目录：'}<code>${esc(top.session.cwd || '-')}</code></div>
          <pre style="margin:0;padding:13px;border-radius:14px;background:#0f172a;color:#f8fafc;font-family:var(--mono,monospace);font-size:12.5px;line-height:1.58;white-space:pre-wrap;word-break:break-all;">${esc(top.vm.cmdLine)}</pre>
        `;
        openModalView({
          title: en ? '💻 Full Command to Execute' : '💻 待执行完整命令',
          bodyHtml,
          kind: 'command',
          sessionId: top.vm.sessionId,
          defaultExpanded: false,
        });
      },
      openTriageReplyModal() {
        const top = getOrderedActiveCards()[0];
        if (!top) return;
        const en = isEn();
        const { vm, session } = top;
        if (session._wireTruncated || session.omittedTranscriptCount > 0 || session.hasMoreTranscript) {
          deps.hydrateColdSession?.(session.hostId, session.id, session.sessionRev);
        }
        const sigLen = (vm.fullReplyMarkdown || '').length * 8 + (session._wireTruncated ? 1 : 0) + (en ? 4 : 0);
        openModalView({
          title: en ? '📖 Latest Full AI Reply' : '📖 AI 最新完整回复',
          bodyHtml: buildReplyModalBodyHtml(top),
          kind: 'reply',
          sessionId: vm.sessionId,
          sigLen,
          defaultExpanded: false,
        });
      },
    });
  }

  return {
    isOpen: () => isOpen,
    getTopSessionId: () => getOrderedActiveCards()[0]?.vm?.sessionId || '',
    getPendingCount: () => getOrderedActiveCards().length,
    onStateUpdated: () => {
      if (isOpen) {
        render({ force: false });
        const top = getOrderedActiveCards()[0];
        if (top && !top.session._wireTruncated && top.vm.fullReplyMarkdown) {
          deps.upgradeTriageSpeechIfHydrated?.(top.vm.sessionId, top.vm.fullReplyMarkdown);
        }
      }
    },
    onSpeechStateChanged: () => {
      if (isOpen) syncTriageSpeechDom();
    },
    onLangChanged: () => {
      lastRenderedSig = '';
      syncStaticChromeLang();
      updateUndoBtnDom();
      if (isOpen) render({ force: true });
    },
  };
}
