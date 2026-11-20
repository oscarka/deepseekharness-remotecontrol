import {
  esc,
  cleanPreviewText,
  formatTime,
  formatBytes,
  urlBase64ToUint8Array,
  isIosDevice,
  isStandaloneApp,
  isIosDeviceForHint,
  isStandaloneForHint,
  shouldShowInstallHint,
} from './utils/format';
import {
  renderInlineMarkdown,
  renderMarkdownBlocks,
  renderMarkdown,
  formatAssistantText,
} from './utils/markdown';
import {
  previewKind,
  isImageFileName,
  imagePreviewSrc,
  backupImagePreviewSrc,
  videoPreviewSrc,
  videoHlsSrc,
  buildFastStreamUrl,
  appendMediaAuth,
  buildBreadcrumbSegments,
  fileLoadingSpinnerHtml,
  isHtmlFileName,
  escapeSrcdocAttr,
  buildSandboxedHtmlSrcdoc,
} from './utils/filePreview';
import {
  attachSmartHlsPlayer,
  destroyHlsPlayer,
} from './utils/hlsPlayer.js';
import {
  fetchMediaViaWebRtc,
  parseStreamUrlDescriptor,
} from './utils/webrtcMedia.js';
import {
  composerUsesCoarsePointer,
  shouldSendOnEnter,
  getLeftEdgeSwipeZoneWidth,
  isWithinLeftSwipeBackZone,
  shouldDismissHorizontalSwipe,
  shouldDismissVerticalSwipe,
} from './utils/gestures';
import {
  hideVoiceHintBar,
  setVoiceBtnRecording,
  isVoiceRecording,
  isDictationActiveFor,
  flushVoiceInputBeforeSend,
  stopVoiceInput,
  toggleVoiceInput,
  initWechatVoiceMode,
  isWechatVoiceMode,
  setWechatVoiceMode,
  toggleWechatVoiceMode,
  syncWechatHoldBtnState,
  startHoldVoice,
  moveHoldVoice,
  endHoldVoice,
  cancelHoldVoice,
  consumeReturnToVoiceAfterSend,
  punctuateSpeechText,
} from './hooks/useVoiceInput';
import { renderQrCodeSvg } from './utils/qrcode';
import {
  getLangPref,
  setLangPreference as persistLangPref,
  applyLangToDom,
  translateZhStringToEn,
} from './utils/i18n';
import { applyStateDelta } from './state/delta-merge';
import { compressImageFile } from './utils/image-compress';
import { compareSemver } from './utils/semver';
import {
  prepareSpeechScript,
  pickBestBrowserVoice,
  splitIntoContinuousBrowserChunks,
  computeSpeechResumeOffset,
  snapToCleanSpeechOffset,
} from './utils/speech';
import {
  renderHarnessBadgeHtml,
  formatCompactProjectLabel,
  normalizeDeviceModelShort,
  buildShortHostNameMap,
  stripRedundantProjectPrefix,
  sortNormalizedSessions,
  renderCapabilityMatrixRowsHtml,
  isHostLiveOnline,
} from './utils/session-labels';
import {
  isTriageEligibleSession,
  createTriageDeckController,
} from './triage-deck.js';
import {
  createDemoHubState,
  createDemoSandbox,
} from './demo-sandbox.js';

export function initHubController() {
  // ==================== 1. 认证与安全 Token 管理（自动清除 URL 尾巴防止截图泄露） ====================
  const urlParams = new URLSearchParams(location.search);
  const isDemoMode = urlParams.get('demo') === '1' || urlParams.get('demo') === 'true';
  let demoSandbox = null;
  const queryToken = isDemoMode ? '' : (urlParams.get('token') || '').trim();
  const queryPairCode = isDemoMode ? '' : (urlParams.get('pair') || '').trim();
  let pendingDeepLinkHostId = (urlParams.get('host') || '').trim();
  let pendingDeepLinkTaskId = (urlParams.get('task') || urlParams.get('session') || '').trim();
  const hasRecoveryParam = urlParams.has('_r');
  if (queryToken || queryPairCode || pendingDeepLinkHostId || pendingDeepLinkTaskId || hasRecoveryParam) {
    if (queryToken) localStorage.setItem('dsh_hub_token', queryToken);
    urlParams.delete('token');
    urlParams.delete('pair');
    urlParams.delete('host');
    urlParams.delete('task');
    urlParams.delete('session');
    urlParams.delete('_r');
    const cleanSearch = urlParams.toString();
    const cleanUrl = location.pathname + (cleanSearch ? '?' + cleanSearch : '') + location.hash;
    try { history.replaceState(null, '', cleanUrl); } catch { }
  }

  function getToken() {
    if (isDemoMode) return '';
    return localStorage.getItem('dsh_hub_token') || '';
  }

  function authHeaders(extra = {}) {
    const tk = getToken();
    const h = { 'content-type': 'application/json', ...extra };
    if (tk) {
      h['authorization'] = 'Bearer ' + tk;
      h['x-hub-token'] = tk;
    }
    return h;
  }

  let authLockConfirmed = false;

  async function verifyCandidateToken(candidateToken, timeoutMs = 25000) {
    const canAbort = typeof AbortController === 'function';
    const ctrl = canAbort ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch { } }, timeoutMs) : null;
    try {
      const headers = { 'content-type': 'application/json' };
      const tk = String(candidateToken ?? '').trim();
      if (tk) {
        headers['authorization'] = 'Bearer ' + tk;
        headers['x-hub-token'] = tk;
      }
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers,
        body: '{}',
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
      if (res.status === 401) {
        return { ok: false, unauthorized: true };
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        return { ok: true, authRequired: Boolean(data.authRequired) };
      }
      return { ok: false, unauthorized: false, error: data?.error || `HTTP ${res.status}` };
    } catch (err) {
      const msg = err && err.name === 'AbortError' ? '连接超时，请检查网络后重试' : (err?.message || '网络异常');
      return { ok: false, unauthorized: false, error: msg };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function apiFetch(path, options = {}) {
    if (isDemoMode && demoSandbox) {
      authLockConfirmed = false;
      document.getElementById('authOverlay')?.classList.remove('show');
      return demoSandbox.handleApiFetch(path, options);
    }
    const sentToken = getToken();
    const res = await fetch(path, {
      ...options,
      headers: authHeaders(options.headers || {}),
    });
    if (res.status === 401) {
      // If user already logged in with a newer token while an unauthenticated call was in flight, ignore stale 401.
      if (getToken() !== sentToken) {
        throw new Error('Superseded');
      }
      authLockConfirmed = true;
      closeSSE();
      document.getElementById('authOverlay').classList.add('show');
      throw new Error('Unauthorized');
    }
    authLockConfirmed = false;
    document.getElementById('authOverlay').classList.remove('show');
    return res;
  }

  async function submitAuthLogin() {
    const inputEl = document.getElementById('authTokenInput');
    const raw = inputEl.value.trim();
    if (!raw) return;
    const btnEl = document.querySelector('#authOverlay button.primary-block-btn');
    const origBtnText = btnEl ? btnEl.textContent : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ 正在验证解锁...';
    }
    try {
      // 如果输入的是 6 位配对码，先尝试配对交换
      if (/^[A-Z0-9]{6}$/i.test(raw)) {
        try {
          const exRes = await fetch('/api/pairing/exchange', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: raw.toUpperCase() }),
          });
          const exData = await exRes.json().catch(() => ({}));
          if (exRes.ok && exData.token) {
            authLockConfirmed = false;
            localStorage.setItem('dsh_hub_token', exData.token);
            document.getElementById('authOverlay').classList.remove('show');
            showToast('🔓 配对解锁成功，正在加载数据...');
            const paired = await fetchState({ forceFresh: true });
            if (!paired.ok && !paired.superseded) {
              setConnectionBanner(true);
              showToast('⚠️ 已解锁，正在同步数据，请稍候…');
            }
            connectSSE();
            return;
          }
          if (exRes.status === 429) {
            showToast('❌ ' + (exData.error || '尝试次数过多，请稍后再试'));
            return;
          }
        } catch { }
      }

      // 先走轻量 /api/auth/verify（几十字节）快速验密，绝不因大包状态同步慢误报“密码错误”
      const check = await verifyCandidateToken(raw, 25000);
      if (!check.ok) {
        if (check.unauthorized) {
          localStorage.removeItem('dsh_hub_token');
          authLockConfirmed = true;
          showToast('❌ 访问密码或配对码不正确，请重试');
          document.getElementById('authOverlay').classList.add('show');
          try { inputEl.select(); } catch { }
        } else {
          showToast('❌ 无法连接总控台：' + (check.error || '网络异常'));
        }
        return;
      }

      authLockConfirmed = false;
      localStorage.setItem('dsh_hub_token', raw);
      document.getElementById('authOverlay').classList.remove('show');
      showToast('🔓 解锁成功');
      const state = await fetchState({ forceFresh: true });
      connectSSE();
      if (!state.ok && !state.superseded) {
        if (state.unauthorized) {
          localStorage.removeItem('dsh_hub_token');
          authLockConfirmed = true;
          showToast('❌ 访问密码校验已失效，请重新输入');
          document.getElementById('authOverlay').classList.add('show');
        } else {
          setConnectionBanner(true);
        }
      }
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = origBtnText;
      }
    }
  }

  function lockAndLogout() {
    localStorage.removeItem('dsh_hub_token');
    authLockConfirmed = true;
    closeSSE();
    document.getElementById('authOverlay').classList.add('show');
    showToast('🔒 已锁定当前浏览器');
  }

  // ==================== 2. 全局状态与持久化偏好 ====================
  let hubState = { hosts: [], activeHostId: '', migrations: [], shares: [], pushSubscriptions: [] };
  let currentHostId = 'ALL_HOSTS';
  let currentProject = 'ALL';
  let currentTab = 'chats';
  let searchQuery = '';
  let activeSessionId = '';
  let activeSessionHostId = '';
  let desktopStageMode = 'chat';

  // 浮层历史栈：打开二级页面/抽屉时压入一条 history，返回键与手势都能逐层退出
  const overlayStack = [];
  let suppressPopstateCount = 0;

  // DOM 增量比对 Key（防止轮询/SSE重绘打断手势、清空输入框或合上展开的 <details>）
  let lastRenderedChatKey = '';
  let lastRenderedComposerKey = '';
  let lastRenderedChatSessionId = '';
  let lastRenderedStripKey = '';
  let lastRenderedListKey = '';
  let lastRenderedSettingsKey = '';
  let lastRenderedFilesKey = '';
  let cachedPushStatusText = '';
  let cachedPushStatusColor = '';
  let cachedPushDeviceListText = '';
  let lastAutoPushSyncAt = 0;
  const upgradingHostMap = {};
  const selectedSessionModels = (() => {
    try {
      const raw = localStorage.getItem('dsh_selected_session_models_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch { }
    return {};
  })();
  let newTaskModel = '';

  function persistSelectedSessionModels() {
    try {
      localStorage.setItem('dsh_selected_session_models_v1', JSON.stringify(selectedSessionModels));
    } catch { }
  }

  const FALLBACK_MODEL_CATALOG = {
    'antigravity-ide': {
      defaultLabel: 'Gemini 4 Argon (High)',
      models: [
        { value: 'MODEL_PLACEHOLDER_M417', label: 'Gemini 4 Argon (High)' },
        { value: 'MODEL_PLACEHOLDER_M418', label: 'Gemini 4 Argon (Medium)' },
        { value: 'MODEL_PLACEHOLDER_M419', label: 'Gemini 4 Argon (Low)' },
        { value: 'MODEL_PLACEHOLDER_M318', label: 'Gemini 3.8 Flash (High)' },
        { value: 'MODEL_PLACEHOLDER_M319', label: 'Gemini 3.8 Flash (Medium)' },
        { value: 'MODEL_PLACEHOLDER_M320', label: 'Gemini 3.8 Flash (Low)' },
        { value: 'MODEL_PLACEHOLDER_M402', label: 'Claude Opus 5.5 (High)' },
        { value: 'MODEL_PLACEHOLDER_M401', label: 'Claude Opus 5.5 (Medium)' },
        { value: 'MODEL_PLACEHOLDER_M400', label: 'Claude Opus 5.5 (Low)' },
        { value: 'MODEL_PLACEHOLDER_M405', label: 'Claude Sonnet 5.5 (High)' },
        { value: 'MODEL_PLACEHOLDER_M404', label: 'Claude Sonnet 5.5 (Medium)' },
        { value: 'MODEL_PLACEHOLDER_M403', label: 'Claude Sonnet 5.5 (Low)' },
        { value: 'MODEL_OPENAI_GPT_OSS_120B_MEDIUM', label: 'GPT-OSS 120B (Medium)' },
      ],
    },
    dsh: {
      defaultLabel: 'DeepSeek 默认模型',
      models: [
        { value: 'deepseek-account::deepseek-flash::high', label: 'DeepSeek Flash (High 深度思考)' },
        { value: 'deepseek-account::deepseek-flash::medium', label: 'DeepSeek Flash (Medium 均衡)' },
        { value: 'deepseek-account::deepseek-flash::low', label: 'DeepSeek Flash (Low 极速)' },
        { value: 'deepseek-account::deepseek-reasoner', label: 'DeepSeek R1 (Reasoner)' },
        { value: 'deepseek-account::deepseek-chat', label: 'DeepSeek V3 (Chat)' },
      ],
    },
    claude: {
      defaultLabel: 'Claude Sonnet (默认)',
      models: [
        { value: 'sonnet', label: 'Claude Sonnet (均衡推荐)' },
        { value: 'opus', label: 'Claude Opus (深度推理)' },
        { value: 'haiku', label: 'Claude Haiku (极速轻量)' },
      ],
    },
    codex: {
      defaultLabel: 'GPT-5.5 (默认)',
      models: [
        { value: 'gpt-5.5', label: 'GPT-5.5' },
        { value: 'gpt-5.4', label: 'GPT-5.4' },
        { value: 'gpt-5.4-mini', label: 'GPT-5.4-Mini' },
        { value: 'gpt-5.3-codex', label: 'GPT-5.3-Codex' },
        { value: 'o3', label: 'o3 (深度推理)' },
        { value: 'o4-mini', label: 'o4-mini (快速)' },
      ],
    },
    workbuddy: {
      defaultLabel: 'DeepSeek V3.1 (WorkBuddy 默认)',
      models: [
        { value: 'deepseek-v3.1', label: 'DeepSeek V3.1 (WorkBuddy)' },
        { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
        { value: 'gpt-5.4', label: 'GPT-5.4' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'hunyuan-turbos', label: 'Hunyuan TurboS' },
      ],
    },
  };

  function getHarnessModelCatalog(host, harness = 'dsh') {
    const hKey = harness || 'dsh';
    const remoteCat = host?.bridgeState?.modelCatalog?.[hKey];
    const fallback = FALLBACK_MODEL_CATALOG[hKey] || FALLBACK_MODEL_CATALOG.dsh;
    if (remoteCat && Array.isArray(remoteCat.models) && remoteCat.models.length > 0) {
      return {
        defaultModel: remoteCat.defaultModel || '',
        defaultLabel: remoteCat.defaultLabel || fallback.defaultLabel,
        models: remoteCat.models,
      };
    }
    return fallback;
  }

  function resolveModelShortLabel(catalog, modelVal, sessionModel = '') {
    const raw = String(modelVal || sessionModel || '').trim();
    if (raw) {
      const hit =
        (catalog?.models || []).find(
          m => m.value === raw || m.label === raw || m.value.endsWith(`::${raw}`)
        ) ||
        (FALLBACK_MODEL_CATALOG['antigravity-ide']?.models || []).find(
          m => m.value === raw || m.label === raw
        );
      if (hit) return hit.label;
      const cleanParts = raw.split('::');
      if (cleanParts.length >= 2) {
        return cleanParts[1] + (cleanParts[2] ? ` (${cleanParts[2]})` : '');
      }
      if (!raw.startsWith('MODEL_PLACEHOLDER_')) return raw;
    }
    return catalog?.defaultLabel || '默认模型';
  }

  function updateChatModelPill(session, host) {
    const btn = document.getElementById('chatModelBtn');
    const labelEl = document.getElementById('chatModelBtnLabel');
    if (!btn || !labelEl || !session) return;
    const isObserveOnly = session.controlMode === 'observe-only' && session.harness !== 'dsh';
    btn.style.display = isObserveOnly ? 'none' : '';
    if (isObserveOnly) return;
    const catalog = getHarnessModelCatalog(host, session.harness);
    const overrideVal = selectedSessionModels[session.id] || '';
    const displayLabel = resolveModelShortLabel(catalog, overrideVal, session.model);
    labelEl.textContent = `🤖 ${displayLabel}`;
    btn.classList.toggle('active-override', Boolean(overrideVal));
  }

  function cleanModelHumanLabel(rawLabel) {
    let s = String(rawLabel || '').trim();
    if (!s) return '默认模型';
    // Strip noisy internal build/date IDs in parens, e.g. (claude-sonnet-4-20250514)
    s = s.replace(/\([^)]*-[0-9]{4,}[^)]*\)/g, '').trim();
    s = s.replace(/\(\s*\)/g, '').trim();

    // Extract concise tier qualifier if present, e.g. (High), (Low), (High 深度思考) -> (High)
    let tierSuffix = '';
    const parenMatch = s.match(/\(([^)]+)\)\s*$/);
    if (parenMatch) {
      const inner = parenMatch[1].trim();
      const tierHit = inner.match(/^(High|Medium|Low|Thinking|Fast|Mini|Pro)\b/i);
      if (tierHit) {
        const rawTier = tierHit[1];
        tierSuffix = ` (${rawTier.charAt(0).toUpperCase()}${rawTier.slice(1).toLowerCase()})`;
      }
      s = s.slice(0, parenMatch.index).trim();
    }

    if (/^deepseek\s*默认模型$/i.test(s)) return 'DeepSeek';
    const combined = `${s}${tierSuffix}`.trim();
    return combined.length > 26 ? `${combined.slice(0, 24)}…` : combined;
  }

  function updateNewTaskModelPill() {
    const labelEl = document.getElementById('newTaskModelBtnLabel');
    if (!labelEl) return;
    const host = (hubState.hosts || []).find(h => h.hostId === newTaskHostId);
    const catalog = getHarnessModelCatalog(host, newTaskHarness);
    const displayLabel = resolveModelShortLabel(catalog, newTaskModel, '');
    const cleanLabel = cleanModelHumanLabel(displayLabel);
    labelEl.textContent = newTaskModel ? `🤖 ${cleanLabel}` : `🤖 默认 · ${cleanLabel}`;
  }

  function openModelPickerSheet(target = 'chat') {
    let host = null;
    let harness = 'dsh';
    let currentSelected = '';
    let sessionDefault = '';
    if (target === 'newTask') {
      host = (hubState.hosts || []).find(h => h.hostId === newTaskHostId) || (hubState.hosts || [])[0];
      harness = newTaskHarness || 'antigravity-ide';
      currentSelected = newTaskModel || '';
    } else {
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      host = found.host;
      harness = found.session.harness || 'dsh';
      currentSelected = selectedSessionModels[found.session.id] || '';
      sessionDefault = found.session.model || '';
    }
    const catalog = getHarnessModelCatalog(host, harness);
    const inheritedLabel = resolveModelShortLabel(catalog, '', sessionDefault);
    const titleEl = document.getElementById('modelPickerTitle');
    if (titleEl) {
      const hName = harness === 'antigravity-ide'
        ? '⚡ Antigravity IDE'
        : harness === 'claude'
          ? '✴️ Claude Code'
          : harness === 'codex'
            ? '🧠 OpenAI Codex'
            : harness === 'workbuddy'
              ? '🐼 WorkBuddy'
              : '🟣 DeepSeek Harness';
      titleEl.textContent = `🤖 选择模型 · ${hName}`;
    }
    const bodyEl = document.getElementById('modelPickerBody');
    if (!bodyEl) return;
    const allOptions = [
      {
        value: '',
        label: `✨ 跟随电脑端当前默认 (${inheritedLabel})`,
        sub: '不强制覆盖，沿用该会话在电脑端已选的模型配置',
      },
      ...(catalog.models || []).map(m => ({
        value: m.value,
        label: m.label,
        sub: m.value.includes('::') ? m.value.replace(/::/g, ' · ') : m.value,
      })),
    ];
    bodyEl.innerHTML = allOptions
      .map(opt => {
        const isSel = opt.value === currentSelected;
        return `
            <div class="host-option ${isSel ? 'selected' : ''}" onclick="selectModelFromPicker('${esc(target)}', '${esc(opt.value)}')">
              <div style="min-width:0;flex:1;">
                <div style="font-size:14px;font-weight:700;color:var(--text);">${esc(opt.label)}</div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(opt.sub)}</div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${isSel ? 'var(--primary)' : 'var(--muted)'};margin-left:8px;flex-shrink:0;">
                ${isSel ? '当前已选 ✓' : '选择 ›'}
              </span>
            </div>
          `;
      })
      .join('');
    openSheet('modelPickerSheet');
  }

  function selectModelFromPicker(target, modelValue) {
    const val = String(modelValue || '').trim();
    if (target === 'newTask') {
      newTaskModel = val;
      updateNewTaskModelPill();
    } else if (activeSessionId) {
      if (val) selectedSessionModels[activeSessionId] = val;
      else delete selectedSessionModels[activeSessionId];
      persistSelectedSessionModels();
      const found = findSessionGlobal(activeSessionId);
      if (found) updateChatModelPill(found.session, found.host);
    }
    closeSheet('modelPickerSheet');
    showToast(val ? '🤖 已切换模型，下条指令将立即生效' : '✨ 已恢复跟随电脑端默认模型');
  }

  function clearHomeScreenAppBadge() {
    try {
      if (navigator && typeof navigator.clearAppBadge === 'function') {
        navigator.clearAppBadge().catch(() => { });
      }
      if (navigator && typeof navigator.setAppBadge === 'function') {
        navigator.setAppBadge(0).catch(() => { });
      }
      if (navigator && navigator.serviceWorker && typeof navigator.serviceWorker.getRegistration === 'function') {
        navigator.serviceWorker
          .getRegistration()
          .then(reg => (reg && typeof reg.getNotifications === 'function' ? reg.getNotifications() : []))
          .then(list => {
            for (const n of list || []) {
              try { n.close(); } catch { }
            }
          })
          .catch(() => { });
      }
    } catch { }
  }

  // 外观主题偏好 (#14)：system | light | dark
  let themePref = localStorage.getItem('dsh_theme_pref') || 'system';
  function applyTheme(pref = themePref) {
    themePref = pref || 'system';
    const root = document.documentElement;
    if (themePref === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (themePref === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    const isDarkEffective =
      themePref === 'dark' ||
      (themePref === 'system' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDarkEffective ? '#0f172a' : '#ffffff');
    }
  }
  function setThemePreference(nextPref) {
    try { localStorage.setItem('dsh_theme_pref', nextPref); } catch { }
    applyTheme(nextPref);
    lastRenderedSettingsKey = '';
    renderAll();
  }
  applyTheme(themePref);

  // 界面语言偏好 (zh | en)：支持 ?lang=en|zh、localStorage 与浏览器自动识别
  let langPref = getLangPref();
  function updateDemoBannerCopy() {
    if (!isDemoMode) return;
    const bannerEl = document.getElementById('demoModeBanner');
    const textEl = document.getElementById('demoModeBannerText');
    if (bannerEl) bannerEl.style.display = 'flex';
    if (textEl) {
      textEl.textContent =
        langPref === 'zh'
          ? '✨ 交互演示 · 可滑卡批阅 / 审批 / 发指令'
          : '✨ Interactive Demo · Swipe cards or tap Approve';
    }
  }
  function setLangPreference(nextLang) {
    langPref = persistLangPref(nextLang);
    if (isDemoMode) {
      hubState = createDemoHubState(langPref);
      updateDemoBannerCopy();
    }
    lastRenderedChatKey = '';
    lastRenderedComposerKey = '';
    lastRenderedStripKey = '';
    lastRenderedListKey = '';
    lastRenderedSettingsKey = '';
    lastRenderedFilesKey = '';
    triageCtrl?.onLangChanged?.();
    renderAll();
    applyLangToDom(document.body, langPref);
  }
  function toggleLangPreference() {
    setLangPreference(langPref === 'en' ? 'zh' : 'en');
  }
  setTimeout(() => applyLangToDom(document.body, langPref), 0);

  // 置顶与已读记录（含内容签名防刷新重复弹出未读 + 服务端跨设备已读同步）
  let pinnedMap = {};
  let seenMap = {};
  let seenSigMap = {};
  let triageCtrl = null;
  let addHostPanelExpanded = false;
  let expandedHostCardIds = {};
  let liveBannerDismissed = false;
  try { if (!isDemoMode) pinnedMap = JSON.parse(localStorage.getItem('dsh_pinned_v4') || '{}'); } catch { }
  try { if (!isDemoMode) seenMap = JSON.parse(localStorage.getItem('dsh_seen_v4') || '{}'); } catch { }
  try { if (!isDemoMode) seenSigMap = JSON.parse(localStorage.getItem('dsh_seen_sig_v1') || '{}'); } catch { }

  function syncSessionReadToServer(sessionId, sig, at) {
    if (!sessionId) return;
    hubState.sessionReadState = hubState.sessionReadState || {};
    hubState.sessionReadState[sessionId] = { unread: false, sig: String(sig || ''), at: Number(at) || Date.now() };
    void apiFetch('/api/sessions/read', {
      method: 'POST',
      body: JSON.stringify({ sessionId, sig: String(sig || ''), at: Number(at) || Date.now() }),
    }).catch(() => { });
  }

  let legacyPinsMigratedThisSession = false;
  function syncSessionPinToServer(sessionId, hostId, pinned) {
    if (!sessionId) return;
    const isPinned = Boolean(pinned);
    const now = Date.now();
    hubState.sessionPinState = hubState.sessionPinState || {};
    hubState.sessionPinState[sessionId] = { pinned: isPinned, at: now, source: 'client' };
    pinnedMap[sessionId] = isPinned;
    try { if (!isDemoMode) localStorage.setItem('dsh_pinned_v4', JSON.stringify(pinnedMap)); } catch { }
    void apiFetch('/api/sessions/pin', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        hostId: String(hostId || ''),
        pinned: isPinned,
        at: now,
      }),
    }).catch(() => { });
  }

  function maybeMigrateLegacyLocalPinsToServer() {
    if (legacyPinsMigratedThisSession) return;
    if (!hubState || !Array.isArray(hubState.hosts) || hubState.hosts.length === 0) return;
    legacyPinsMigratedThisSession = true;
    try {
      if (localStorage.getItem('dsh_pinned_migrated_v1') === '1') return;
      const srvPins = hubState.sessionPinState || {};
      for (const [sid, val] of Object.entries(pinnedMap || {})) {
        if (!val || Object.prototype.hasOwnProperty.call(srvPins, sid)) continue;
        const ownerHost = (hubState.hosts || []).find(h =>
          Array.isArray(h?.bridgeState?.tasks) && h.bridgeState.tasks.some(t => t && t.id === sid)
        );
        syncSessionPinToServer(sid, ownerHost?.hostId || '', true);
      }
      localStorage.setItem('dsh_pinned_migrated_v1', '1');
    } catch { }
  }

  function dismissLiveBanner() {
    liveBannerDismissed = true;
    renderSessionList();
  }

  // 恢复桌面端视图模式偏好（默认 PhoneFrameMode，与原型图 100% 一致）
  const savedPreviewMode = localStorage.getItem('dsh_preview_mode') || 'phone';
  if (savedPreviewMode === 'desktop') {
    document.body.classList.remove('PhoneFrameMode');
    document.body.classList.add('DesktopSplitMode');
    document.getElementById('btnPhoneMode')?.classList.remove('active');
    document.getElementById('btnDesktopMode')?.classList.add('active');
  }

  function setPreviewMode(mode) {
    const isPhone = mode === 'phone';
    localStorage.setItem('dsh_preview_mode', mode);
    document.body.classList.toggle('PhoneFrameMode', isPhone);
    document.body.classList.toggle('DesktopSplitMode', !isPhone);
    document.getElementById('btnPhoneMode')?.classList.toggle('active', isPhone);
    document.getElementById('btnDesktopMode')?.classList.toggle('active', !isPhone);
    if (isPhone && desktopStageMode === 'code') {
      switchDesktopStage('chat');
    }
    if (!isPhone && !activeSessionId) {
      const first = getNormalizedSessions()[0];
      if (first) {
        activeSessionId = first.id;
        activeSessionHostId = first.hostId;
      }
    }
    renderAll();
  }

  // 文件浏览状态
  let fileProjectCwd = '';
  let fileSubDir = '';
  // 加载态：目录/文件读取是「命令下发 + 等电脑心跳回传」，不显示状态会像卡死
  let fileLoading = null;        // { hostId, cwd, subDir, at, drawer }
  let filePreviewLoading = null; // { hostId, at, drawer, seq }
  let filePreviewLoadSeq = 0;
  const pinnedDrawerPreviewByHost = {};
  const pinnedMainPreviewByHost = {};
  let actionTargetSession = null;
  let actionTargetHostId = '';
  let confirmSheetDelete = false;

  // 新建任务状态
  let newTaskHostId = '';
  let newTaskCwd = '';
  let newTaskHarness = 'dsh';

  // 迁移向导状态
  let migSource = '';
  let migTarget = '';
  let migSwitchFeishu = true;
  let migWipeSource = false;

  function showToast(msg) {
    const el = document.getElementById('toastPill');
    if (!el) return;
    el.textContent = langPref === 'en' ? translateZhStringToEn(String(msg || '')) : msg;
    const vvOffsetTop = Number(window.visualViewport?.offsetTop || 0);
    if (vvOffsetTop > 4) {
      el.style.top = `${Math.round(vvOffsetTop + 14)}px`;
    } else {
      el.style.top = '';
    }
    el.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ==================== 3. 数据聚合与扁平化 ====================
  const expandedTranscriptBySession = new Map();
  const hydratedWireTranscriptBySession = new Map();
  const hydratingWireSessionIds = new Set();
  const OPT_MSGS_STORAGE_KEY = 'dsh_optimistic_msgs_v1';

  function ensureOptimisticMsgsMap() {
    if (!window.__dshOptimisticMsgs) {
      try {
        const raw = sessionStorage.getItem(OPT_MSGS_STORAGE_KEY);
        window.__dshOptimisticMsgs = raw ? JSON.parse(raw) || {} : {};
      } catch {
        window.__dshOptimisticMsgs = {};
      }
    }
    return window.__dshOptimisticMsgs;
  }

  function persistOptimisticMsgsMap() {
    try {
      sessionStorage.setItem(OPT_MSGS_STORAGE_KEY, JSON.stringify(window.__dshOptimisticMsgs || {}));
    } catch { }
  }

  function matchesOptimisticUserText(msgText, opt) {
    const m = String(msgText || '').trim();
    if (!m) return false;
    const full = String((typeof opt === 'object' ? opt?.text : opt) || '').trim();
    const raw = String((typeof opt === 'object' ? (opt?.rawText || opt?.text) : opt) || '').trim();
    return Boolean((full && m === full) || (raw && (m === raw || m.startsWith(`${raw}\n`))));
  }

  function hasOptimisticSyncedToWire(wireTranscript, serverTotalCount, opt) {
    if (!Array.isArray(wireTranscript) || wireTranscript.length === 0) return false;
    let sameCount = 0;
    let lastMatchIdx = -1;
    for (let i = 0; i < wireTranscript.length; i += 1) {
      const m = wireTranscript[i];
      if (m && m.role === 'user' && matchesOptimisticUserText(m.text, opt)) {
        sameCount += 1;
        lastMatchIdx = i;
      }
    }
    if (lastMatchIdx < 0) return false;
    const baseSame = typeof opt?.baselineSameUserCount === 'number' ? opt.baselineSameUserCount : 0;
    const baseTotal = typeof opt?.baselineTotalCount === 'number' ? opt.baselineTotalCount : 0;
    if (baseSame === 0) return true;
    if (sameCount > baseSame) return true;
    if (serverTotalCount > baseTotal && lastMatchIdx >= Math.max(0, wireTranscript.length - 3)) return true;
    return false;
  }

  function getNormalizedSessions() {
    const list = [];
    const optMap = ensureOptimisticMsgsMap();
    let optMapDirty = false;
    const isPageVisibleNow = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    const isChatOpenNow = isPageVisibleNow && (
      document.getElementById('chatFullscreen')?.classList.contains('open')
      || document.body.classList.contains('DesktopSplitMode')
    );

    for (const h of hubState.hosts || []) {
      if (currentHostId && currentHostId !== 'ALL_HOSTS' && h.hostId !== currentHostId) continue;
      const tasks = h.bridgeState?.tasks || [];
      const localSettling = window.__dshSettlingApprovals || {};
      const approvals = (h.bridgeState?.approvals || []).map(a => {
        if (a?.code && localSettling[a.code] && Date.now() - localSettling[a.code].at < 45000 && !a.lastError) {
          return { ...a, settling: true, settlingDecision: localSettling[a.code].decision };
        }
        return a;
      });
      for (const t of tasks) {
        if (t?.isSubagent || t?.origin === 'subagent' || t?.parentConversationId) {
          continue;
        }
        if (
          String(t?.harness || '') === 'antigravity-ide' &&
          Array.isArray(t?.transcript) &&
          t.transcript.length > 0 &&
          !t.transcript.some(m => m?.role === 'user')
        ) {
          continue;
        }
        if (
          /^workbuddy:\d+$/.test(String(t?.id || '').trim()) &&
          (!Array.isArray(t?.transcript) || t.transcript.length === 0) &&
          !(Number(t?.messageCount) > 0) &&
          t?.status !== 'running' &&
          t?.status !== 'approval' &&
          !t?.pendingApproval
        ) {
          continue;
        }
        const ts = t.updatedAt || t.lastActivity || 0;
        const pendingApp = approvals.find(a => a.agentId === t.id);
        const rawWireTranscript = Array.isArray(t.transcript) ? [...t.transcript] : [];
        const hydratedWire = hydratedWireTranscriptBySession.get(t.id);
        let wireTranscript = rawWireTranscript;
        if (
          hydratedWire &&
          Array.isArray(hydratedWire.transcript) &&
          hydratedWire.transcript.length >= rawWireTranscript.length &&
          (!t.sessionRev || !hydratedWire.sessionRev || hydratedWire.sessionRev === t.sessionRev)
        ) {
          if (t.status !== 'running' && t.status !== 'approval') {
            wireTranscript = [...hydratedWire.transcript];
          } else if (hydratedWire.transcript.length > rawWireTranscript.length) {
            if (rawWireTranscript.length === 0) {
              wireTranscript = [...hydratedWire.transcript];
            } else {
              const firstLive = rawWireTranscript[0];
              const matchIdx = hydratedWire.transcript.findIndex(
                m => m && m.role === firstLive?.role && String(m.text || '').slice(0, 80) === String(firstLive?.text || '').slice(0, 80)
              );
              if (matchIdx > 0) {
                wireTranscript = [...hydratedWire.transcript.slice(0, matchIdx), ...rawWireTranscript];
              } else {
                const extraCount = Math.max(0, hydratedWire.transcript.length - rawWireTranscript.length);
                wireTranscript = [...hydratedWire.transcript.slice(0, extraCount), ...rawWireTranscript];
              }
            }
          }
        }
        const serverWireTotalCount = Math.max(
          Number(t.totalTranscriptCount) || 0,
          Number(t.messageCount) || 0,
          wireTranscript.length
        );
        const expandedEntry = expandedTranscriptBySession.get(t.id);
        let baseTranscript = [...wireTranscript];
        if (expandedEntry && Array.isArray(expandedEntry.transcript) && expandedEntry.transcript.length > wireTranscript.length) {
          if (wireTranscript.length === 0) {
            baseTranscript = [...expandedEntry.transcript];
          } else {
            const firstWire = wireTranscript[0];
            const matchIdx = expandedEntry.transcript.findIndex(
              m => m && m.role === firstWire?.role && String(m.text || '').slice(0, 80) === String(firstWire?.text || '').slice(0, 80)
            );
            if (matchIdx > 0) {
              baseTranscript = [...expandedEntry.transcript.slice(0, matchIdx), ...wireTranscript];
            } else {
              const lastExp = expandedEntry.transcript[expandedEntry.transcript.length - 1];
              const tailIdxInWire = lastExp
                ? wireTranscript.findIndex(
                  m => m && m.role === lastExp.role && String(m.text || '').slice(0, 80) === String(lastExp.text || '').slice(0, 80)
                )
                : -1;
              if (tailIdxInWire >= 0 && tailIdxInWire < wireTranscript.length - 1) {
                baseTranscript = [...expandedEntry.transcript, ...wireTranscript.slice(tailIdxInWire + 1)];
              } else {
                const extraCount = Math.max(0, expandedEntry.transcript.length - wireTranscript.length);
                baseTranscript = [...expandedEntry.transcript.slice(0, extraCount), ...wireTranscript];
              }
            }
          }
        }
        const pendingPromptCmds = (h.pendingCommands || []).filter(
          c => c && c.agentId === t.id && (c.type === 'prompt' || c.type === 'steer')
        );
        const inflightPromptCmds = (h.inflightCommands || []).filter(
          c => c && c.agentId === t.id && (c.type === 'prompt' || c.type === 'steer')
        );
        const isHostOnlineNow = isHostLiveOnline(h);
        const queuedCmds = pendingPromptCmds.filter(c => c.queued || !isHostOnlineNow);
        const dispatchingCmds = pendingPromptCmds.filter(c => !c.queued && isHostOnlineNow);
        const expiredCmds = (h.recentResults || []).filter(
          r => r && r.expired && (r.type === 'prompt' || r.type === 'steer') && r.agentId === t.id && r.text
        );
        const cancelledOrFailedIds = new Set(
          (h.recentResults || [])
            .filter(r => r && r.id && (r.cancelled || r.ok === false))
            .map(r => r.id)
        );
        const optimisticList = optMap[t.id] || [];
        const nowMs = Date.now();
        const serverConcludedAt = t.status === 'idle' && !t.isMidTurn
          ? Math.max(Number(t.lastConclusionAt) || 0, t.turnState === 'conclusion' ? (Number(t.updatedAt) || 0) : 0)
          : 0;
        const remainingOpt = [];
        const renderedOptItems = [];
        for (const opt of optimisticList) {
          if (!opt || nowMs - opt.time >= 60000) {
            optMapDirty = true;
            continue;
          }
          const concludedSinceOpt = Boolean(
            t.status === 'idle' &&
            !t.isMidTurn &&
            ((serverConcludedAt > 0 && serverConcludedAt > (opt.time || 0)) ||
              (typeof opt.baselineTotalCount === 'number' && serverWireTotalCount >= opt.baselineTotalCount + 2))
          );
          if (
            concludedSinceOpt ||
            (opt.cmdId && cancelledOrFailedIds.has(opt.cmdId)) ||
            hasOptimisticSyncedToWire(wireTranscript, serverWireTotalCount, opt) ||
            expiredCmds.some(ec => (opt.cmdId && ec.id === opt.cmdId) || matchesOptimisticUserText(ec.text, opt))
          ) {
            // 仅当服务端真实对话流已落盘同步，或指令被取消/超时失败时，才从乐观缓存移除；
            // 绝不在进入 pendingCommands 时提前清除，彻底消除「Host 拉走指令 ~ 落盘心跳返回」空窗期消息消失再重现！
            optMapDirty = true;
            continue;
          }
          remainingOpt.push(opt);
          if (queuedCmds.some(qc => (opt.cmdId && qc.id === opt.cmdId) || matchesOptimisticUserText(qc.text, opt))) {
            continue;
          }
          renderedOptItems.push(opt);
          baseTranscript.push({ role: 'user', text: opt.text, time: opt.time, optId: opt.id });
        }
        for (const dc of [...dispatchingCmds, ...inflightPromptCmds]) {
          const alreadyRendered = renderedOptItems.some(
            opt => (opt.cmdId && dc.id && opt.cmdId === dc.id) || matchesOptimisticUserText(dc.text, opt)
          );
          const alreadySynced = hasOptimisticSyncedToWire(wireTranscript, serverWireTotalCount, {
            text: dc.text,
            rawText: dc.text,
            baselineSameUserCount: typeof dc.baselineSameCount === 'number' ? dc.baselineSameCount : 0,
            baselineTotalCount: typeof dc.baselineTotalCount === 'number' ? dc.baselineTotalCount : 0,
          });
          if (!alreadyRendered && !alreadySynced) {
            renderedOptItems.push({ cmdId: dc.id || '', text: dc.text, rawText: dc.text });
            baseTranscript.push({
              role: 'user',
              text: dc.text,
              time: dc.createdAt || nowMs,
            });
          }
        }
        for (const ec of expiredCmds) {
          if (nowMs - (ec.at || 0) <= 30 * 60 * 1000) {
            baseTranscript.push({
              role: 'user',
              text: ec.text,
              time: ec.createdAt || ec.at || nowMs,
              expiredCmdId: ec.id,
              expiredError: ec.error || '电脑超过 10 分钟未上线，该指令已超时未执行',
            });
          }
        }
        for (const qc of queuedCmds) {
          baseTranscript.push({
            role: 'user',
            text: qc.text,
            time: qc.createdAt || nowMs,
            queuedCmdId: qc.id,
            expiresAt: qc.expiresAt || 0,
          });
        }
        if (optMap[t.id]) {
          if (remainingOpt.length > 0) {
            optMap[t.id] = remainingOpt;
          } else {
            delete optMap[t.id];
            optMapDirty = true;
          }
        }
        const transcript = baseTranscript;
        const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;
        const project = t.project || (t.cwd ? t.cwd.split('/').filter(Boolean).pop() : '默认工作区') || '默认工作区';
        const activeInflightCmds = inflightPromptCmds.filter(ic => {
          if (t.status === 'idle' && !t.isMidTurn) {
            if (serverConcludedAt > 0 && serverConcludedAt > (ic.createdAt || 0)) return false;
            if (typeof ic.baselineTotalCount === 'number' && serverWireTotalCount >= ic.baselineTotalCount + 2) return false;
          }
          return true;
        });
        const hasActiveInflight = isHostOnlineNow && (dispatchingCmds.length > 0 || activeInflightCmds.length > 0 || renderedOptItems.length > 0);
        const status = pendingApp
          ? 'approval'
          : (t.status === 'running' || hasActiveInflight ? 'running' : (t.status || 'idle'));
        const queuedCount = queuedCmds.length;
        const rawIdStr = String(t.id || '');
        const harness = t.harness || (
          rawIdStr.startsWith('agy-ide:') ? 'antigravity-ide' :
            rawIdStr.startsWith('codex:') ? 'codex' :
              rawIdStr.startsWith('workbuddy:') ? 'workbuddy' :
                rawIdStr.startsWith('doubao:') ? 'doubao' :
                  rawIdStr.startsWith('claude:') ? 'claude' : 'dsh'
        );
        const harnessLabel = t.harnessLabel || (
          harness === 'antigravity-ide' ? 'Antigravity IDE' :
            harness === 'codex' ? 'Codex' :
              harness === 'workbuddy' ? 'WorkBuddy' :
                harness === 'doubao' ? '豆包电脑版' :
                  harness === 'claude' ? 'Claude Code' : 'DeepSeek Harness'
        );

        const isStalledMidTurn = Boolean(status === 'idle' && (t.isMidTurn || lastMsg?.isToolStepOnly));
        let lastConclusionAt = Number(t.lastConclusionAt) || 0;
        if (!lastConclusionAt && status === 'idle' && !isStalledMidTurn && lastMsg?.role === 'assistant' && Boolean(lastMsg?.text)) {
          lastConclusionAt = ts;
        }
        const lastInterruptedAt = Number(t.lastInterruptedAt) || 0;
        const turnState = status === 'approval'
          ? 'approval'
          : status === 'running'
            ? 'running'
            : t.turnState === 'interrupted'
              ? 'interrupted'
              : (t.turnState === 'conclusion' || lastConclusionAt > 0)
                ? 'conclusion'
                : 'idle';

        const latestMsgText = String(lastMsg?.text || '').trim();
        const rawPreview = status === 'running'
          ? (t.runningSummary || latestMsgText || t.lastOutput || '正在思考与执行任务...')
          : status === 'approval'
            ? (pendingApp?.promptTitle || pendingApp?.reason || latestMsgText || t.lastOutput || '等待你批准工具执行')
            : (latestMsgText || t.lastOutput || t.cwd || '点击查看对话详情');

        const changedFiles = Array.isArray(t.changedFiles)
          ? t.changedFiles
          : (Array.isArray(pendingApp?.changedFiles) ? pendingApp.changedFiles : []);
        const artifacts = Array.isArray(t.artifacts)
          ? t.artifacts
          : (Array.isArray(pendingApp?.artifacts) ? pendingApp.artifacts : []);

        const totalTranscriptCount = Math.max(
          Number(t.totalTranscriptCount) || 0,
          Number(t.messageCount) || 0,
          transcript.length
        );
        const omittedTranscriptCount = expandedEntry
          ? 0
          : Math.max(0, Number(t.omittedTranscriptCount) || (totalTranscriptCount - wireTranscript.length));

        const cleanPrev = cleanPreviewText(String(rawPreview || '').slice(0, 360)) || '点击查看对话详情';
        const msgCountVal = totalTranscriptCount || transcript.length || 0;
        const conclusionSig = `${turnState}:${msgCountVal}:${cleanPrev.slice(0, 80)}`;

        list.push({
          id: t.id,
          hostId: h.hostId,
          hostName: h.hostName || h.hostId,
          hostOnline: isHostOnlineNow,
          hostLastSeen: Number(h.lastSeen) || 0,
          harness,
          harnessLabel,
          controlMode: t.controlMode || 'managed',
          capabilities: t.capabilities || null,
          stateMeta: t.stateMeta || null,
          sessionRev: t.sessionRev || '',
          title: t.title || '未命名会话',
          project,
          cwd: t.cwd || '',
          status,
          turnState,
          lastConclusionAt,
          lastInterruptedAt,
          conclusionSig,
          approvalObj: pendingApp || null,
          changedFiles,
          artifacts,
          queuedCount,
          msgCount: msgCountVal,
          totalTranscriptCount,
          omittedTranscriptCount,
          hasMoreTranscript: Boolean(omittedTranscriptCount > 0 || (t.hasMoreTranscript && !expandedEntry)),
          updatedAt: ts,
          timeLabel: formatTime(ts),
          pinned: (hubState.sessionPinState && Object.prototype.hasOwnProperty.call(hubState.sessionPinState, t.id))
            ? Boolean(hubState.sessionPinState[t.id]?.pinned)
            : (typeof t.pinned === 'boolean' ? t.pinned : Boolean(pinnedMap[t.id])),
          unread: false,
          hasUnreadConclusion: false,
          isUnreadInterrupted: false,
          isRecentActive: false,
          lastRole: lastMsg?.role || 'assistant',
          lastIsToolStepOnly: Boolean(lastMsg?.isToolStepOnly),
          isStalledMidTurn,
          lastPreview: cleanPrev,
          rawLastPreview: rawPreview,
          transcript,
          _wireTranscript: wireTranscript,
          _wireTotalCount: serverWireTotalCount,
          _wireTruncated: Boolean(t.wireTruncated && wireTranscript === rawWireTranscript),
        });
      }
    }
    if (optMapDirty) {
      persistOptimisticMsgsMap();
    }

    maybeMigrateLegacyLocalPinsToServer();
    const sortedByTime = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // 仅针对「真正完结给出最终结论」或「异常断流中断」计算统一的未读态（🔵 已出结论）
    // 同时结合本地 localStorage 与服务端 sessionReadState + 结论内容签名，确保点击已读后刷新绝不重复变回未读
    let seenDirty = false;
    const serverReadMap = hubState.sessionReadState || {};
    sortedByTime.forEach((s) => {
      const srvRead = serverReadMap[s.id];
      const srvSigStr = String(srvRead?.sig || '');
      const isLegacyNonConclusionSrvRead = /^(?:running|approval):/.test(srvSigStr);
      if (srvRead && !srvRead.unread && !isLegacyNonConclusionSrvRead) {
        if (srvRead.at && (!seenMap[s.id] || srvRead.at > seenMap[s.id])) {
          seenMap[s.id] = srvRead.at;
          seenDirty = true;
        }
        if (srvSigStr && seenSigMap[s.id] !== srvSigStr && (!seenMap[s.id] || srvRead.at >= seenMap[s.id])) {
          seenSigMap[s.id] = srvSigStr;
          seenDirty = true;
        }
      }

      if (s.status === 'running' || s.status === 'approval') {
        if (!seenMap[s.id]) {
          seenMap[s.id] = s.lastConclusionAt || 1;
          seenDirty = true;
        }
        s.hasUnreadConclusion = false;
        s.isUnreadInterrupted = false;
        s.unread = false;
        return;
      }

      const effectiveConclusionAt = Math.max(
        Number(s.lastConclusionAt) || 0,
        s.turnState === 'conclusion' ? (Number(s.updatedAt) || 0) : 0
      );

      if (s.id === activeSessionId && isChatOpenNow) {
        const maxTs = Math.max(seenMap[s.id] || 0, s.updatedAt || 0, effectiveConclusionAt);
        if (seenMap[s.id] !== maxTs || (s.turnState === 'conclusion' && seenSigMap[s.id] !== s.conclusionSig)) {
          seenMap[s.id] = maxTs;
          if (s.turnState === 'conclusion') {
            seenSigMap[s.id] = s.conclusionSig;
            if (!srvRead || srvRead.unread || srvRead.sig !== s.conclusionSig) {
              syncSessionReadToServer(s.id, s.conclusionSig, maxTs);
            }
          }
          seenDirty = true;
        }
      }

      // 首次加载时：除服务端明确标记为新完结未读 (srvRead.unread === true) 的会话外，旧历史完结会话自动归入已读基线
      if (!seenMap[s.id]) {
        if (srvRead?.unread && s.turnState === 'conclusion' && s.id !== activeSessionId) {
          seenMap[s.id] = Math.max(1, (effectiveConclusionAt || s.updatedAt || 2) - 1000);
        } else {
          seenMap[s.id] = Math.max(s.updatedAt || 0, effectiveConclusionAt, Date.now());
          if (s.turnState === 'conclusion') {
            seenSigMap[s.id] = s.conclusionSig;
          }
        }
        seenDirty = true;
      }

      const seenAt = Number(seenMap[s.id]) || 0;
      const seenSig = String(seenSigMap[s.id] || '');
      const isCurrentOpen = s.id === activeSessionId && isChatOpenNow;
      const serverSaysUnread = Boolean(srvRead?.unread && s.conclusionSig !== seenSig);
      s.hasUnreadConclusion = !isCurrentOpen
        && s.turnState === 'conclusion'
        && s.conclusionSig !== seenSig
        && (serverSaysUnread || (effectiveConclusionAt > 0 && effectiveConclusionAt > seenAt));
      s.isUnreadInterrupted = !isCurrentOpen
        && s.turnState === 'interrupted'
        && (s.lastInterruptedAt || s.updatedAt) > seenAt;
      s.unread = s.hasUnreadConclusion || s.isUnreadInterrupted;
    });

    if (seenDirty && !isDemoMode) {
      try {
        localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap));
        localStorage.setItem('dsh_seen_sig_v1', JSON.stringify(seenSigMap));
      } catch { }
    }

    // 优先级排序：1. 置顶(📌 固定最顶部，组内仍按紧急度排) → 2. 待授权(黄) → 3. 已出结论/中断未读(蓝/橙) → 4. 运行中(绿) → 5. 最新时间
    return sortNormalizedSessions(list);
  }

  function findSessionGlobal(sessionId) {
    const prevHost = currentHostId;
    currentHostId = 'ALL_HOSTS';
    const all = getNormalizedSessions();
    currentHostId = prevHost;
    const found = all.find(s => s.id === sessionId);
    if (!found) return null;
    const host = (hubState.hosts || []).find(h => h.hostId === found.hostId);
    return { session: found, host };
  }

  function formatHostTelemetry(host) {
    const sys = host?.bridgeState?.systemTelemetry || host?.systemTelemetry || null;
    const power = sys?.power || null;
    const net = sys?.network || null;
    const isOnline = Boolean(host && host.online !== false && host.activelyConnected !== false);
    const powerIcon = power?.icon || (power?.hasBattery ? '🔋' : '🔌');
    const powerShort = power?.shortLabel || (power?.hasBattery && power?.percent != null ? `${power.percent}%` : (power ? '电源直供' : '供电正常'));
    const powerDetail = power?.label || (power ? powerShort : '供电正常');
    const netIcon = net?.icon || '📶';
    const rttStr = net?.rttMs ? `${net.rttMs}ms` : '';
    const netShort = net?.shortLabel || `${net?.kindLabel || '网络'}${rttStr ? ` ${rttStr}` : ''}`;
    const netDetail = net?.label || `${net?.kindLabel || '在线'}${net?.localIp ? ` (${net.localIp})` : ''}${rttStr ? ` · ${rttStr}` : ''}`;
    const lowBattery = Boolean(power?.lowBattery);
    const slowNet = Boolean(net?.rttMs && net.rttMs > 600);
    return {
      hasTelemetry: Boolean(sys),
      isOnline,
      lowBattery,
      slowNet,
      powerIcon,
      powerShort,
      powerDetail,
      netIcon,
      netShort,
      netDetail,
      compactBadge: `${powerIcon} ${powerShort} · ${netIcon} ${netShort}`,
      fullLine: `${powerIcon} ${powerDetail} · ${netIcon} ${netDetail}`,
    };
  }

  function getHostProjects(host) {
    if (!host) return [];
    const map = new Map();
    for (const w of host.bridgeState?.workspaces || []) {
      if (w.cwd) {
        const name = w.name || w.cwd.split('/').filter(Boolean).pop() || w.cwd;
        map.set(name, w.cwd);
      }
    }
    for (const t of host.bridgeState?.tasks || []) {
      if (t.cwd) {
        const name = t.project || t.cwd.split('/').filter(Boolean).pop() || t.cwd;
        if (!map.has(name)) map.set(name, t.cwd);
      }
    }
    if (map.size === 0) {
      map.set('默认工作区', '');
    }
    return [...map.entries()].map(([name, cwd]) => ({ name, cwd }));
  }

  // ==================== 4. 界面主渲染流程 ====================
  function renderAll() {
    const hosts = hubState.hosts || [];
    if (!currentHostId || (currentHostId !== 'ALL_HOSTS' && !hosts.some(h => h.hostId === currentHostId))) {
      currentHostId = hubState.activeHostId && hosts.some(h => h.hostId === hubState.activeHostId)
        ? hubState.activeHostId
        : (hosts[0]?.hostId || 'ALL_HOSTS');
    }

    const totalSessions = hosts.reduce((acc, h) => acc + ((h.bridgeState?.tasks || []).length), 0);
    const currentHostObj = hosts.find(h => h.hostId === currentHostId);

    const dotEl = document.getElementById('topHostDot');
    const isInitialSyncPending = Boolean(getToken()) && !authLockConfirmed && !hasLoadedInitialState && hosts.length === 0;
    if (isInitialSyncPending) {
      dotEl.className = 'status-dot';
      document.getElementById('topHostName').textContent = '正在同步设备…';
    } else if (hosts.length === 0) {
      dotEl.className = 'status-dot offline';
      document.getElementById('topHostName').textContent = '未接入电脑 (0)';
    } else if (currentHostId === 'ALL_HOSTS') {
      const anyOnline = hosts.some(h => isHostLiveOnline(h));
      dotEl.className = 'status-dot' + (anyOnline ? '' : ' offline');
      document.getElementById('topHostName').textContent = hosts.length <= 1 && hosts[0]
        ? `${hosts[0].hostName} (${totalSessions})`
        : `全部电脑 (${totalSessions})`;
    } else if (currentHostObj) {
      dotEl.className = 'status-dot' + (isHostLiveOnline(currentHostObj) ? '' : ' offline');
      document.getElementById('topHostName').textContent = `${currentHostObj.hostName} (${(currentHostObj.bridgeState?.tasks || []).length})`;
    }

    const turboBtn = document.getElementById('turboBadgeBtn');
    if (turboBtn) {
      const refHost = currentHostObj || hosts.find(h => isHostLiveOnline(h)) || hosts[0];
      const refOnline = Boolean(refHost && isHostLiveOnline(refHost));
      const turbo = refHost?.bridgeState?.turbo;
      if (refHost && !refOnline) {
        turboBtn.textContent = '⚪ 电脑离线';
        turboBtn.style.background = '#f1f5f9';
        turboBtn.style.color = '#64748b';
        turboBtn.style.borderColor = '#cbd5e1';
      } else if (turbo?.enabled && turbo?.accessibilityGranted !== false) {
        turboBtn.textContent = turbo.engine === 'rust-native' ? '🦀 极速实时' : '⚡ 极速实时';
        turboBtn.style.background = '#ecfdf5';
        turboBtn.style.color = '#059669';
        turboBtn.style.borderColor = '#a7f3d0';
      } else if (turbo?.enabled && turbo?.accessibilityGranted === false) {
        turboBtn.textContent = '⚠️ 需开权限';
        turboBtn.style.background = '#fffbeb';
        turboBtn.style.color = '#d97706';
        turboBtn.style.borderColor = '#fde68a';
      } else {
        turboBtn.textContent = '🚀 点此提速';
        turboBtn.style.background = '#eff6ff';
        turboBtn.style.color = '#2563eb';
        turboBtn.style.borderColor = '#bfdbfe';
      }
    }

    const searchBox = document.getElementById('searchAndFilterBox');
    const normalizedSessions = getNormalizedSessions();
    if (currentTab === 'chats') {
      searchBox.style.display = hosts.length === 0 ? 'none' : 'block';
      renderProjectStrip(normalizedSessions);
      renderSessionList(normalizedSessions);
    } else if (currentTab === 'files') {
      searchBox.style.display = 'none';
      renderFilesTab(document.getElementById('mainViewport'));
    } else {
      searchBox.style.display = 'none';
      renderSettingsTab();
    }
    // 桌面双栏的「代码」页是独立容器，也要跟着刷新
    if (desktopStageMode === 'code') renderFilePanes();

    // 如果有打开的会话，增量更新聊天窗口（不打断输入与已展开的思考过程）
    if (activeSessionId) {
      renderActiveChatStage();
    } else if (window.innerWidth >= 769 && document.body.classList.contains('DesktopSplitMode')) {
      const first = normalizedSessions[0];
      if (first) {
        activeSessionId = first.id;
        activeSessionHostId = first.hostId;
        renderActiveChatStage();
      }
    }

    // 如果聊天内文件速览抽屉处于打开状态，自动刷新其内容
    if (document.getElementById('inChatFileSheet').classList.contains('open')) {
      renderInChatFileDrawerBody();
    }
    if (document.getElementById('hostSheet')?.classList.contains('open')) {
      renderHostSheetList();
    }
    triageCtrl?.onStateUpdated();
    applyLangToDom(document.body, langPref);
  }

  function renderProjectStrip(sessionsArg) {
    const sessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
    const triageCount = sessions.filter(isTriageEligibleSession).length;
    const activeCount = sessions.filter(s => s.hostOnline !== false && (s.status === 'running' || s.status === 'approval')).length;
    const unreadCount = sessions.filter(s => s.hasUnreadConclusion || s.isUnreadInterrupted).length;
    const agyCount = sessions.filter(s => s.harness === 'antigravity-ide').length;
    const codexCount = sessions.filter(s => s.harness === 'codex').length;
    const workbuddyCount = sessions.filter(s => s.harness === 'workbuddy').length;
    const doubaoCount = sessions.filter(s => s.harness === 'doubao').length;
    const claudeCount = sessions.filter(s => s.harness === 'claude').length;
    const dshCount = sessions.filter(s => s.harness === 'dsh').length;

    const counts = {};
    for (const s of sessions) {
      counts[s.project] = (counts[s.project] || 0) + 1;
    }
    const projects = Object.keys(counts);
    const strip = document.getElementById('projectStrip');
    const nowDate = new Date();
    const todayKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`;
    const stripKey = `${todayKey}:${currentProject}:${sessions.length}:${triageCount}:${activeCount}:${unreadCount}:${agyCount}:${codexCount}:${workbuddyCount}:${doubaoCount}:${claudeCount}:${dshCount}:${projects.map(p => `${p}:${counts[p]}`).join(',')}`;
    if (stripKey === lastRenderedStripKey && strip.children.length > 0) return;
    lastRenderedStripKey = stripKey;
    const prevScrollLeft = strip.scrollLeft;

    const smartPills = [
      `<button class="filter-pill smart-pill ${currentProject === 'SMART_ACTIVE' ? 'active' : ''}" onclick="selectProject('SMART_ACTIVE')">🟢 运行中 <span class="count">${activeCount}</span></button>`,
      `<button class="filter-pill smart-pill ${currentProject === 'SMART_UNREAD' ? 'active' : ''}" onclick="selectProject('SMART_UNREAD')">🔵 已出结论 <span class="count">${unreadCount}</span></button>`
    ];
    if (agyCount > 0) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_AGY_IDE' ? 'active' : ''}" onclick="selectProject('HARNESS_AGY_IDE')">${renderHarnessBadgeHtml('antigravity-ide', 'pill')} IDE <span class="count">${agyCount}</span></button>`);
    }
    if (codexCount > 0) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_CODEX' ? 'active' : ''}" onclick="selectProject('HARNESS_CODEX')">${renderHarnessBadgeHtml('codex', 'pill')} Codex <span class="count">${codexCount}</span></button>`);
    }
    if (workbuddyCount > 0) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_WORKBUDDY' ? 'active' : ''}" onclick="selectProject('HARNESS_WORKBUDDY')">${renderHarnessBadgeHtml('workbuddy', 'pill')} WorkBuddy <span class="count">${workbuddyCount}</span></button>`);
    }
    if (doubaoCount > 0) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_DOUBAO' ? 'active' : ''}" onclick="selectProject('HARNESS_DOUBAO')">${renderHarnessBadgeHtml('doubao', 'pill')} 豆包 <span class="count">${doubaoCount}</span></button>`);
    }
    if (claudeCount > 0) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_CLAUDE' ? 'active' : ''}" onclick="selectProject('HARNESS_CLAUDE')">${renderHarnessBadgeHtml('claude', 'pill')} Claude <span class="count">${claudeCount}</span></button>`);
    }
    if (dshCount > 0 && (agyCount > 0 || codexCount > 0 || workbuddyCount > 0 || doubaoCount > 0 || claudeCount > 0)) {
      smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_DSH' ? 'active' : ''}" onclick="selectProject('HARNESS_DSH')">${renderHarnessBadgeHtml('dsh', 'pill')} DSH <span class="count">${dshCount}</span></button>`);
    }

    const triageGridBtnHtml = `<button type="button" class="triage-grid-entry-btn" id="triageGridEntryBtn" title="滑卡批阅模式" aria-label="滑卡批阅模式" onclick="openTriageDeckMode()"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1.5" y="1.5" width="5.2" height="5.2" rx="1.4"/><rect x="9.3" y="1.5" width="5.2" height="5.2" rx="1.4"/><rect x="1.5" y="9.3" width="5.2" height="5.2" rx="1.4"/><rect x="9.3" y="9.3" width="5.2" height="5.2" rx="1.4"/></svg>${triageCount > 0 ? '<span class="triage-grid-dot"></span>' : ''}</button>`;

    strip.innerHTML = [
      triageGridBtnHtml,
      `<button class="filter-pill ${currentProject === 'ALL' ? 'active' : ''}" onclick="selectProject('ALL')">全部 <span class="count">${sessions.length}</span></button>`,
      ...smartPills,
      ...projects.map(p => `<button class="filter-pill ${currentProject === p ? 'active' : ''}" title="${esc(p)}" onclick="selectProject('${esc(p)}')">${esc(formatCompactProjectLabel(p, nowDate))} <span class="count">${counts[p]}</span></button>`)
    ].join('');
    strip.scrollLeft = prevScrollLeft;
  }

  function renderSessionList(sessionsArg) {
    const viewport = document.getElementById('mainViewport');
    const allSessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
    const nowDate = new Date();
    const todayKey = `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate()}`;

    // 仅当在线电脑存在真实待确认授权时显示顶部黄色授权横幅，无授权时顶部保持干净
    let pendingAppInfo = null;
    const localSettling = window.__dshSettlingApprovals || {};
    for (const h of hubState.hosts || []) {
      if (!isHostLiveOnline(h)) continue;
      if (currentHostId && currentHostId !== 'ALL_HOSTS' && h.hostId !== currentHostId) continue;
      const appRaw = (h.bridgeState?.approvals || [])[0];
      if (appRaw) {
        const isLocalSettling = appRaw.code && localSettling[appRaw.code] && Date.now() - localSettling[appRaw.code].at < 45000 && !appRaw.lastError;
        const app = isLocalSettling
          ? { ...appRaw, settling: true, settlingDecision: localSettling[appRaw.code].decision }
          : appRaw;
        pendingAppInfo = { app, host: h };
        break;
      }
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = allSessions.filter(s => {
      if (currentProject === 'SMART_ACTIVE' && (s.hostOnline === false || (s.status !== 'running' && s.status !== 'approval'))) return false;
      if (currentProject === 'SMART_UNREAD' && !s.hasUnreadConclusion && !s.isUnreadInterrupted) return false;
      if (currentProject === 'HARNESS_DSH' && s.harness !== 'dsh') return false;
      if (currentProject === 'HARNESS_AGY_IDE' && s.harness !== 'antigravity-ide') return false;
      if (currentProject === 'HARNESS_CODEX' && s.harness !== 'codex') return false;
      if (currentProject === 'HARNESS_WORKBUDDY' && s.harness !== 'workbuddy') return false;
      if (currentProject === 'HARNESS_DOUBAO' && s.harness !== 'doubao') return false;
      if (currentProject === 'HARNESS_CLAUDE' && s.harness !== 'claude') return false;
      if (!['ALL', 'SMART_ACTIVE', 'SMART_UNREAD', 'HARNESS_DSH', 'HARNESS_AGY_IDE', 'HARNESS_CODEX', 'HARNESS_WORKBUDDY', 'HARNESS_DOUBAO', 'HARNESS_CLAUDE'].includes(currentProject) && s.project !== currentProject) return false;
      if (!q) return true;
      const compactProj = formatCompactProjectLabel(s.project, nowDate).toLowerCase();
      return s.title.toLowerCase().includes(q) || s.project.toLowerCase().includes(q) || compactProj.includes(q) || s.lastPreview.toLowerCase().includes(q);
    });

    const showHostTag = currentHostId === 'ALL_HOSTS' && (hubState.hosts || []).length > 1;
    const shortHostMap = showHostTag ? buildShortHostNameMap(hubState.hosts || []) : {};
    const isPendingQuestion = Boolean(
      pendingAppInfo &&
      (pendingAppInfo.app.kind === 'question' || Array.isArray(pendingAppInfo.app.questions))
    );
    let step6Dismissed = false;
    try {
      step6Dismissed = localStorage.getItem('dsh_step6_qr_dismissed') === '1';
    } catch { }
    const showStep6Banner = !isDemoMode && (hubState.hosts || []).length > 0 && !step6Dismissed;
    const bannerKey = pendingAppInfo
      ? `${pendingAppInfo.host.hostId}:${pendingAppInfo.app.code}:${pendingAppInfo.app.kind || ''}:${pendingAppInfo.app.promptTitle || ''}:${pendingAppInfo.app.settling ? 1 : 0}:${pendingAppInfo.app.lastError || ''}`
      : '';
    const hostsSig = (hubState.hosts || []).map(h => `${h.hostId}:${h.hostName || ''}:${isHostLiveOnline(h) ? 1 : 0}:${formatTime(h.lastSeen)}`).join(',');
    const rowsSig = filtered
      .map(s => `${s.id}:${s.harness}:${s.hostOnline !== false ? 1 : 0}:${s.status}:${s.approvalObj?.kind || ''}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ''}:${s.queuedCount || 0}:${s.hasUnreadConclusion ? 1 : 0}:${s.isUnreadInterrupted ? 1 : 0}:${s.isStalledMidTurn ? 1 : 0}:${s.pinned ? 1 : 0}:${s.id === activeSessionId ? 1 : 0}:${s.title}:${s.project}:${s.lastRole}:${s.lastPreview}:${s.timeLabel}`)
      .join('|');
    const isInitialSyncPending = Boolean(getToken()) && !authLockConfirmed && !hasLoadedInitialState && (hubState.hosts || []).length === 0;
    const enrollSig = `${hubState.enrollment?.code || ''}:${hubState.enrollment?.joinedCount || 0}:${isInitialSyncPending ? 'sync' : 'ready'}`;
    const listKey = `${todayKey}:${hostsSig}:${allSessions.length}:${currentProject}:${q}:${showHostTag ? 1 : 0}:${showStep6Banner ? 1 : 0}:${enrollSig}:${bannerKey}#${rowsSig}`;
    if (listKey === lastRenderedListKey && viewport.querySelector('.session-list')) return;
    lastRenderedListKey = listKey;
    const prevScrollTop = viewport.scrollTop;

    const allHostsList = hubState.hosts || [];
    const selectedSingleHost = currentHostId && currentHostId !== 'ALL_HOSTS'
      ? allHostsList.find(h => h.hostId === currentHostId)
      : (allHostsList.length === 1 ? allHostsList[0] : null);
    const allHostsOffline = allHostsList.length > 0 && allHostsList.every(h => !isHostLiveOnline(h));
    let hostOfflineBannerHtml = '';
    if (selectedSingleHost && !isHostLiveOnline(selectedSingleHost)) {
      hostOfflineBannerHtml = `
        <div class="host-offline-list-banner">
          <span>⚪ <strong>${esc(selectedSingleHost.hostName)}</strong> 已离线${selectedSingleHost.lastSeen ? `（${esc(formatTime(selectedSingleHost.lastSeen))}）` : ''} · 可查看历史对话，发消息将排队 10 分钟等待上线</span>
        </div>
      `;
    } else if (allHostsOffline && allHostsList.length > 1) {
      hostOfflineBannerHtml = `
        <div class="host-offline-list-banner">
          <span>⚪ 当前 ${allHostsList.length} 台电脑均已离线 · 可查看历史对话，发消息将在上线后自动排队执行</span>
        </div>
      `;
    }

    const step6BannerHtml = showStep6Banner ? `
        <div class="step6-onboarding-banner" style="margin:10px 12px 4px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <div style="min-width:0;flex:1;font-size:12.5px;color:var(--text);line-height:1.45;">
            🎉 <strong>电脑已接入！第 ⑥ 步</strong>：点右侧生成二维码，用<strong>手机相机扫一扫</strong>即可免输密码直接遥控
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button class="pill-action-btn primary" style="padding:5px 10px;font-size:12px;" onclick="openPairingCodeSheet()">📱 手机扫码登录</button>
            <button class="pill-action-btn" style="padding:4px 8px;font-size:12px;color:var(--muted);" title="关闭提示" onclick="dismissStep6QrBanner()">✕</button>
          </div>
        </div>
      ` : '';

    const liveBannerHtml = pendingAppInfo ? `
        <div class="live-activity-bar">
          <div class="live-activity-left" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">
            <div class="live-activity-title">${isPendingQuestion ? '💬' : '⏳'} [${esc(pendingAppInfo.host.hostName)}] ${esc(pendingAppInfo.app.project ? `${formatCompactProjectLabel(pendingAppInfo.app.project, nowDate)} / ` : '')}${esc(pendingAppInfo.app.settling ? (isPendingQuestion ? '正在同步你的选择到电脑端...' : '正在同步审批到电脑端...') : (pendingAppInfo.app.title || (isPendingQuestion ? '等待你做出选择' : '等待你批准工具执行')))}</div>
            <div class="live-activity-desc" ${pendingAppInfo.app.lastError ? 'style="color:#ef4444;font-weight:600;"' : ''}>${esc(pendingAppInfo.app.lastError ? `⚠️ ${pendingAppInfo.app.lastError}` : (pendingAppInfo.app.promptTitle || pendingAppInfo.app.reason || ''))}</div>
          </div>
          <div class="live-activity-actions">
            ${pendingAppInfo.app.settling ? `
              <button class="mini-approve-btn" disabled style="opacity:0.65;cursor:not-allowed;">⏳ 处理中...</button>
            ` : isPendingQuestion ? `
              <button class="mini-approve-btn" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">去选择 ›</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4, '${esc(pendingAppInfo.app.agentId || '')}')">跳过</button>
            ` : `
              <button class="mini-approve-btn" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', true, 1, '${esc(pendingAppInfo.app.agentId || '')}')">✓ 允许</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4, '${esc(pendingAppInfo.app.agentId || '')}')">拒绝</button>
            `}
          </div>
        </div>
      ` : '';

    const pinnedCount = filtered.reduce((acc, item) => acc + (item.pinned ? 1 : 0), 0);
    const rowsHtml = filtered.map((s, idx) => {
      let groupHeaderHtml = '';
      if (pinnedCount > 0) {
        if (idx === 0 && s.pinned) {
          groupHeaderHtml = `
            <div class="session-group-header pinned-group-header">
              <span>📌 置顶对话</span>
              <span class="session-group-count">${pinnedCount}</span>
            </div>
          `;
        } else if (!s.pinned && idx > 0 && filtered[idx - 1]?.pinned) {
          groupHeaderHtml = `
            <div class="session-group-header">
              <span>全部对话</span>
            </div>
          `;
        }
      }
      const isRowOffline = s.hostOnline === false;
      let rowStateClass = isRowOffline ? 'row-host-offline' : '';
      let statusHtml = `<span class="session-time">${esc(s.timeLabel)}</span>`;
      if (isRowOffline) {
        if (s.queuedCount > 0) {
          statusHtml = `<span class="badge-approval" style="background:var(--amber-soft);color:#b45309;">⏳ ${s.queuedCount} 条排队</span>`;
        } else if (s.status === 'running') {
          statusHtml = `<span class="badge-offline">⚪ 离线 · 上次运行中</span>`;
        } else if (s.status === 'approval') {
          statusHtml = `<span class="badge-offline">⚪ 离线 · 待上线审批</span>`;
        } else if (s.hasUnreadConclusion) {
          statusHtml = `<span class="badge-conclusion" style="opacity:0.75;">🔵 已出结论</span>`;
        } else if (s.isUnreadInterrupted) {
          statusHtml = `<span class="badge-offline">⚪ 离线 · 中断</span>`;
        }
      } else if (s.status === 'approval') {
        rowStateClass = 'row-state-approval';
        const isRowQuestion = Boolean(
          s.approvalObj && (s.approvalObj.kind === 'question' || Array.isArray(s.approvalObj.questions))
        );
        statusHtml = s.approvalObj?.settling
          ? `<span class="badge-approval">⏳ 同步电脑中...</span>`
          : s.approvalObj?.lastError
            ? `<span class="badge-interrupted">⚠️ ${isRowQuestion ? '选择待重试' : '审批待重试'}</span>`
            : `<span class="badge-approval">⏳ ${isRowQuestion ? '待你选择' : '待你授权'}</span>`;
      } else if (s.queuedCount > 0) {
        statusHtml = `<span class="badge-approval" style="background:var(--amber-soft);color:#b45309;">⏳ ${s.queuedCount} 条排队</span>`;
      } else if (s.status === 'running') {
        rowStateClass = 'row-state-running';
        statusHtml = `<span class="badge-running">● 运行中</span>`;
      } else if (s.hasUnreadConclusion) {
        rowStateClass = 'row-state-conclusion';
        statusHtml = `<span class="badge-conclusion">🔵 已出结论</span>`;
      } else if (s.isUnreadInterrupted) {
        rowStateClass = 'row-state-interrupted';
        statusHtml = `<span class="badge-interrupted">⚠️ 中断待继续</span>`;
      }

      const pinHtml = s.pinned ? `<span class="pin-tag" title="已置顶">📌 置顶</span>` : '';
      const shortHostLabel = shortHostMap[s.hostId] || s.hostName;
      const hostBadgeHtml = showHostTag
        ? `<span class="host-mini-tag${isRowOffline ? ' offline' : ''}" title="${esc(s.hostName)}${isRowOffline ? ' (已离线)' : ''}">${isRowOffline ? '⚪ ' : ''}${esc(shortHostLabel)}</span>`
        : '';
      const harnessBadgeHtml = renderHarnessBadgeHtml(s.harness, 'row', s.harnessLabel);
      const compactProject = formatCompactProjectLabel(s.project, nowDate);
      const rolePrefix = s.status === 'running'
        ? ''
        : s.isStalledMidTurn
          ? '🔧 停在步骤: '
          : s.lastIsToolStepOnly
            ? '🔧 '
            : (s.lastRole === 'user' ? '🧑 我: ' : '🤖 ');
      const displayTitle = stripRedundantProjectPrefix(s.title, s.project);

      return `${groupHeaderHtml}
          <div class="session-row ${rowStateClass} ${s.pinned ? 'pinned-row' : ''} ${s.id === activeSessionId ? 'selected-desktop' : ''}" onclick="openChat('${esc(s.id)}')">
            <div class="session-main">
              <div class="session-top-line">
                <div class="session-title-wrap">
                  ${pinHtml}
                  <div class="session-title">${esc(displayTitle)}</div>
                </div>
                <div class="session-right-meta">${statusHtml}</div>
              </div>
              <div class="session-sub-line">
                ${harnessBadgeHtml}
                ${hostBadgeHtml}
                <span class="project-mini-tag" title="${esc(s.project)}">📁 ${esc(compactProject)}</span>
                <span class="session-preview-text">${rolePrefix}${esc(s.lastPreview)}</span>
              </div>
            </div>
            <button class="row-more-btn" title="更多操作" onclick="event.stopPropagation(); openSessionActions('${esc(s.id)}')">⋯</button>
          </div>
        `;
    }).join('');

    let emptyStateHtml = '';
    if (!rowsHtml) {
      const hostsCount = (hubState.hosts || []).length;
      if (isInitialSyncPending) {
        emptyStateHtml = `
            <div style="padding:48px 20px;text-align:center;">
              <div style="font-size:28px;margin-bottom:10px;">⚡</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">正在同步在线电脑与会话列表…</div>
              <div style="font-size:12.5px;color:var(--muted);">已通过安全校验，正在拉取实时任务快照</div>
            </div>
          `;
      } else if (hostsCount === 0) {
        emptyStateHtml = renderAddHostPanelHtml({ isEmptyState: true });
      } else if (allSessions.length === 0) {
        emptyStateHtml = `
            <div style="padding:40px 20px;text-align:center;">
              <div style="font-size:30px;margin-bottom:8px;">✨</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">电脑已接入，还没有对话记录</div>
              <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">你可以直接在远程电脑上启动第一个任务，或点击「手机扫码登录」在手机上打开</div>
              <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
                <button class="pill-action-btn primary" onclick="openNewTaskSheet()">＋ 新建远程对话</button>
                <button class="pill-action-btn" onclick="openPairingCodeSheet()">📱 手机扫码登录</button>
              </div>
            </div>
          `;
      } else {
        emptyStateHtml = `
            <div style="padding:44px 20px;text-align:center;">
              <div style="font-size:14px;color:var(--muted);margin-bottom:12px;">🔍 暂无匹配的对话记录</div>
              <button class="pill-action-btn" onclick="resetSessionFilters()">↺ 清除筛选条件</button>
            </div>
          `;
      }
    }

    viewport.innerHTML = `
        ${liveBannerHtml}
        ${hostOfflineBannerHtml}
        ${step6BannerHtml}
        <div class="session-list">
          ${rowsHtml || emptyStateHtml}
        </div>
      `;
    viewport.scrollTop = prevScrollTop;
  }

  function dismissStep6QrBanner() {
    try {
      localStorage.setItem('dsh_step6_qr_dismissed', '1');
    } catch { }
    lastRenderedListKey = '';
    renderSessionList();
  }

  function resetSessionFilters() {
    currentProject = 'ALL';
    clearSearch();
    renderProjectStrip();
    renderSessionList();
  }

  let chatPaintSyncTimer = null;
  let chatPinnedToBottom = true;
  let programmaticChatScrollUntil = 0;
  let lastUserUpwardGestureAt = 0;
  let lastChatScrollTop = 0;
  const lastFirstMsgSigBySession = new Map();
  const optimisticPreviewImagesByOptId = new Map();

  function parseUserMessageAndMedia(m) {
    let raw = String(m?.text || '').trim();
    const reqMatch = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i.exec(raw);
    if (reqMatch) {
      raw = reqMatch[1].trim();
    } else {
      raw = raw.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '').trim();
    }

    const mediaItems = [];
    const seenPaths = new Set();
    const pushDiskMedia = (primaryPath, backupPath = '', rawLabel = '') => {
      const cleanPrimary = String(primaryPath || '').replace(/^file:\/\//i, '').trim();
      const cleanBackup = String(backupPath || '').replace(/^file:\/\//i, '').trim();
      const mainPath = cleanPrimary || cleanBackup;
      if (!mainPath || seenPaths.has(mainPath)) return;
      seenPaths.add(mainPath);
      const fallbackName = mainPath.split('/').filter(Boolean).pop() || 'image.jpg';
      mediaItems.push({
        label: String(rawLabel || fallbackName).trim() || fallbackName,
        primaryPath: mainPath,
        backupPath: cleanPrimary && cleanBackup && cleanBackup !== cleanPrimary ? cleanBackup : '',
      });
    };

    raw = raw.replace(
      /\[手机端上传图片附件\s*\(\d+\s*张\)[^\]]*\]:?([\s\S]*)$/i,
      (_full, tail) => {
        const lines = String(tail || '').split('\n');
        for (const ln of lines) {
          const labelMatch = /\(([^()]+\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))\)\s*:/i.exec(ln);
          const primaryMatch = /:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
          const backupMatch = /备用路径:\s*(\/[^\s()]+?\.(?:jpe?g|png|webp|gif|heic|heif|svg|bmp|avif))/i.exec(ln);
          if (primaryMatch?.[1] || backupMatch?.[1]) {
            pushDiskMedia(primaryMatch?.[1] || '', backupMatch?.[1] || '', labelMatch?.[1] || '');
          }
        }
        return '';
      }
    );

    const optImgs = m?.optId ? optimisticPreviewImagesByOptId.get(m.optId) : null;
    let pendingRemoteImgCount = 0;
    raw = raw.replace(/\[🖼️\s*已附带\s*(\d+)\s*张截图\]/g, (_m, n) => {
      pendingRemoteImgCount += Number(n) || 1;
      return '';
    });

    for (const med of [...(Array.isArray(m?.media) ? m.media : []), ...(Array.isArray(m?.images) ? m.images : [])]) {
      if (typeof med === 'string') pushDiskMedia(med);
      else if (med?.uri || med?.path) pushDiskMedia(med.uri || med.path, '', med.name || '');
    }

    const cleanText = raw.replace(/\n{3,}/g, '\n\n').trim();
    return {
      text: cleanText,
      mediaItems,
      optImgs: Array.isArray(optImgs) && optImgs.length > 0 ? optImgs : null,
      pendingRemoteImgCount: (!optImgs || optImgs.length === 0) && mediaItems.length === 0 ? pendingRemoteImgCount : 0,
    };
  }
  function pinChatToBottomImmediate(boxEl = null) {
    const box = boxEl || document.getElementById('chatMessages');
    if (!box) return;
    programmaticChatScrollUntil = Date.now() + 150;
    const maxTop = Math.max(0, box.scrollHeight - box.clientHeight);
    box.scrollTop = maxTop;
    if (maxTop > 1) {
      box.scrollTop = maxTop - 1;
      box.scrollTop = maxTop;
    } else {
      box.style.transform = 'translateZ(0.01px)';
      void box.offsetHeight;
      box.style.transform = 'translateZ(0)';
    }
    lastChatScrollTop = box.scrollTop;
    setScrollBottomVisible(false);
  }

  function scheduleChatPaintAndScrollSync(targetSessionId) {
    const flushOnce = () => {
      if (activeSessionId !== targetSessionId || !chatPinnedToBottom) return;
      const box = document.getElementById('chatMessages');
      if (!box) return;
      pinChatToBottomImmediate(box);
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        flushOnce();
        requestAnimationFrame(flushOnce);
      });
    }
    if (chatPaintSyncTimer) clearTimeout(chatPaintSyncTimer);
    chatPaintSyncTimer = setTimeout(() => {
      chatPaintSyncTimer = null;
      flushOnce();
    }, 265);
  }

  let chatTouchDownAt = 0;
  let pendingChatRenderAfterTouch = false;
  function isDesktopSplitLayout() {
    return (
      typeof window !== 'undefined' &&
      window.innerWidth >= 769 &&
      document.body.classList.contains('DesktopSplitMode')
    );
  }

  function openChat(sessionId) {
    const found = findSessionGlobal(sessionId);
    if (!found) return;
    activeSessionId = found.session.id;
    activeSessionHostId = found.session.hostId;
    const isRunningOrApprovalOpen = found.session.status === 'running' || found.session.status === 'approval';
    const srvReadForOpen = hubState.sessionReadState?.[activeSessionId];
    const shouldMarkSessionReadOnOpen = !isRunningOrApprovalOpen
      || Boolean(found.session.hasUnreadConclusion || found.session.isUnreadInterrupted || srvReadForOpen?.unread);
    if (shouldMarkSessionReadOnOpen) {
      const readTs = Math.max(
        found.session.updatedAt || 0,
        found.session.lastConclusionAt || 0,
        Date.now()
      );
      seenMap[activeSessionId] = readTs;
      if (found.session.turnState === 'conclusion' && found.session.conclusionSig) {
        seenSigMap[activeSessionId] = found.session.conclusionSig;
      }
      if (!isDemoMode) {
        try {
          localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap));
          localStorage.setItem('dsh_seen_sig_v1', JSON.stringify(seenSigMap));
        } catch { }
      }
      syncSessionReadToServer(
        activeSessionId,
        found.session.turnState === 'conclusion' ? (found.session.conclusionSig || '') : '',
        readTs
      );
    }
    clearHomeScreenAppBadge();
    const chatEl = document.getElementById('chatFullscreen');
    if (chatEl) {
      chatEl.style.transition = '';
      chatEl.style.transform = '';
      chatEl.style.willChange = '';
      chatEl.style.boxShadow = '';
      chatEl.classList.add('open');
    }
    document.body.classList.add('mobile-chat-open');
    artifactsExpandedSessionIds.delete(found.session.id);
    filesExpandedSessionIds.delete(found.session.id);
    chatPinnedToBottom = true;
    lastRenderedChatKey = ''; // 切换会话时强制渲染
    renderActiveChatStage(found);
    scheduleChatPaintAndScrollSync(found.session.id);
    if (found.session._wireTruncated && !expandedTranscriptBySession.has(found.session.id)) {
      void hydrateColdSessionTranscript(found.session.hostId, found.session.id, found.session.sessionRev || '');
    }
    // 重新进入上次读到一半的会话时，如果不在底部，直接浮出「最新消息」
    const box = document.getElementById('chatMessages');
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight >= 120) {
      setScrollBottomVisible(true);
    }
    if (!isDesktopSplitLayout()) {
      trackOverlay('chat', rawCloseChat);
      maybeShowSwipeHint();
    }
    const nextSessions = getNormalizedSessions();
    renderProjectStrip(nextSessions);
    renderSessionList(nextSessions);
  }

  function rawCloseChat() {
    stopVoiceInput();
    stopAssistantSpeech();
    artifactsExpandedSessionIds.clear();
    filesExpandedSessionIds.clear();
    document.getElementById('chatFullscreen').classList.remove('open');
    document.body.classList.remove('mobile-chat-open');
    setScrollBottomVisible(false);
    const nextSessions = getNormalizedSessions();
    renderProjectStrip(nextSessions);
    renderSessionList(nextSessions);
    triageCtrl?.onStateUpdated();
  }

  function closeMobileChat() {
    dismissOverlay('chat', rawCloseChat);
  }

  function closeMobileFile() {
    closeSheet('inChatFileSheet');
    document.body.classList.remove('mobile-file-open');
  }

  let selectedAgyOptionIndex = 1;
  let lastRenderedAssistantTexts = {};

  async function copyAssistantReply(msgIdx, btnEl) {
    const text = String(lastRenderedAssistantTexts?.[msgIdx] || '').trim();
    if (!text) {
      showToast('⚠️ 暂无可复制的回复内容');
      return;
    }
    const ok = await copyText(text, {
      successMessage: `📋 已复制完整回复（${text.length} 字）`,
      title: '📋 复制 AI 回复全文',
    });
    if (ok && btnEl) {
      const origHtml = btnEl.dataset.origLabel || btnEl.innerHTML;
      btnEl.dataset.origLabel = origHtml;
      btnEl.classList.add('copied');
      btnEl.innerHTML = '✅ 已复制全文';
      setTimeout(() => {
        btnEl.classList.remove('copied');
        btnEl.innerHTML = origHtml;
      }, 1800);
    }
  }

  async function copyLatestAssistantReply(btnEl) {
    const keys = Object.keys(lastRenderedAssistantTexts || {})
      .map(k => Number(k))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => b - a);
    if (!keys.length) {
      showToast('⚠️ 当前对话暂无 AI 回复可复制');
      return;
    }
    await copyAssistantReply(keys[0], btnEl);
  }

  // ---- AI 回复纯算法语音播报（全局防 GC 保活 + 按句接力防超时断流 + 全文默认 / 重点切换 + 原地无损倍速） ----
  const SPEECH_RATES = [1, 1.25, 1.5];
  const TRIAGE_SPEECH_MSG_IDX = -101;
  const activeSpeechState = {
    playing: false,
    sessionId: '',
    msgIdx: -1,
    rawSourceText: '',
    mode: (typeof localStorage !== 'undefined' && localStorage.getItem('dsh_tts_mode_v2') === 'concise') ? 'concise' : 'full',
    rate: (() => {
      const saved = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('dsh_tts_rate')) : 1;
      return SPEECH_RATES.includes(saved) ? saved : 1;
    })(),
    hasDistinctSummary: false,
    fullSpokenText: '',
    docLang: 'zh',
    segmentBaseOffset: 0,
    segmentStartedAt: 0,
    segmentRate: 1,
    boundaryCharOffset: -1,
    boundaryUpdatedAt: 0,
    runId: 0,
    pinnedUtterances: [],
    watchdogTimer: null,
    handoffTimer: null,
    wakeLock: null,
  };

  if (typeof window !== 'undefined') {
    window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener?.('voiceschanged', () => {
          try { window.speechSynthesis.getVoices(); } catch { }
        });
      } catch { }
    }
  }

  function releaseSpeechRuntimeHandles() {
    if (activeSpeechState.handoffTimer) {
      clearTimeout(activeSpeechState.handoffTimer);
      activeSpeechState.handoffTimer = null;
    }
    if (activeSpeechState.watchdogTimer) {
      clearInterval(activeSpeechState.watchdogTimer);
      activeSpeechState.watchdogTimer = null;
    }
    activeSpeechState.pinnedUtterances.length = 0;
    if (typeof window !== 'undefined') {
      window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;
    }
    if (activeSpeechState.wakeLock) {
      const wl = activeSpeechState.wakeLock;
      activeSpeechState.wakeLock = null;
      try {
        void wl.release?.()?.catch?.(() => { });
      } catch { }
    }
  }

  async function acquireSpeechWakeLock(expectedRunId) {
    if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) return;
    try {
      const wl = await navigator.wakeLock.request('screen');
      if (!activeSpeechState.playing || activeSpeechState.runId !== expectedRunId) {
        try { await wl.release?.(); } catch { }
        return;
      }
      activeSpeechState.wakeLock = wl;
    } catch { }
  }

  function renderAssistantFooterHtml(sessionId, msgIdx, cleanReplyText, { isTruncatedPreview = false } = {}) {
    const isSpeakingThis =
      activeSpeechState.playing &&
      activeSpeechState.sessionId === sessionId &&
      activeSpeechState.msgIdx === msgIdx;
    const speakControlsHtml = isSpeakingThis
      ? `<button type="button" class="assistant-copy-btn assistant-speak-btn speaking" onclick="stopAssistantSpeech()">⏹ 停止</button>` +
      (activeSpeechState.hasDistinctSummary
        ? `<button type="button" class="assistant-copy-btn assistant-speak-sub-btn" onclick="switchAssistantSpeechMode(${msgIdx})" title="切换重点摘要 / 完整去噪">${activeSpeechState.mode === 'concise' ? '⚡ 重点' : '📖 全文'}</button>`
        : '') +
      `<button type="button" class="assistant-copy-btn assistant-speak-sub-btn" onclick="cycleAssistantSpeechRate(${msgIdx})" title="切换播报倍速">${activeSpeechState.rate}x</button>`
      : `<button type="button" class="assistant-copy-btn assistant-speak-btn" onclick="toggleSpeakAssistantReply(${msgIdx})">🔊 播报</button>`;
    const charMetaText = isTruncatedPreview ? '全文同步中…' : `共 ${cleanReplyText.length} 字`;
    return `<div class="assistant-copy-footer" data-footer-session-id="${esc(sessionId)}" data-footer-msg-idx="${msgIdx}"><button type="button" class="assistant-copy-btn" onclick="copyAssistantReply(${msgIdx}, this)">📋 复制全文</button>${speakControlsHtml}<span class="assistant-char-meta">${charMetaText}</span></div>`;
  }

  function syncSpeechFooterDom() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.assistant-copy-footer[data-footer-msg-idx]').forEach(el => {
      const mIdx = Number(el.getAttribute('data-footer-msg-idx'));
      const sessId = el.getAttribute('data-footer-session-id') || activeSessionId || '';
      const rawText = String(lastRenderedAssistantTexts?.[mIdx] || '').trim();
      if (!rawText) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = renderAssistantFooterHtml(sessId, mIdx, rawText);
      const nextEl = tmp.firstElementChild;
      if (!nextEl) return;
      if (getLangPref() === 'en') {
        applyLangToDom(nextEl, 'en');
      }
      el.replaceWith(nextEl);
    });
    triageCtrl?.onSpeechStateChanged?.();
  }

  function stopAssistantSpeech() {
    activeSpeechState.runId += 1;
    const wasPlaying = activeSpeechState.playing;
    activeSpeechState.playing = false;
    activeSpeechState.sessionId = '';
    activeSpeechState.msgIdx = -1;
    activeSpeechState.rawSourceText = '';
    activeSpeechState.fullSpokenText = '';
    activeSpeechState.segmentBaseOffset = 0;
    activeSpeechState.segmentStartedAt = 0;
    activeSpeechState.boundaryCharOffset = -1;
    activeSpeechState.boundaryUpdatedAt = 0;
    releaseSpeechRuntimeHandles();
    try {
      if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused)) {
        window.speechSynthesis.cancel();
      }
    } catch { }
    if (wasPlaying) {
      syncSpeechFooterDom();
    }
  }

  function startAssistantSpeech(
    msgIdx,
    { startOffset = 0, _recoveryDepth = 0, rawTextOverride = '', sessionIdOverride = '' } = {},
  ) {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      showToast('⚠️ 当前浏览器暂不支持系统语音播报');
      return;
    }
    const effectiveSessionId =
      sessionIdOverride ||
      (msgIdx === TRIAGE_SPEECH_MSG_IDX ? activeSpeechState.sessionId : (activeSessionId || ''));
    const rawText = String(
      rawTextOverride ||
      (msgIdx === TRIAGE_SPEECH_MSG_IDX ? activeSpeechState.rawSourceText : lastRenderedAssistantTexts?.[msgIdx]) ||
      '',
    ).trim();
    if (!rawText) {
      showToast('⚠️ 暂无可播报的回复内容');
      return;
    }

    // Stop active voice recording first so microphone and speaker never collide
    if (isVoiceRecording()) {
      stopVoiceInput();
    }

    const prepared = prepareSpeechScript(rawText);
    const fullSpokenText = (activeSpeechState.mode === 'concise' && prepared.hasDistinctSummary)
      ? prepared.conciseText
      : prepared.fullText;
    if (!fullSpokenText) {
      showToast('⚠️ 暂无可播报的回复内容');
      return;
    }

    const effectiveOffset = startOffset > 0
      ? snapToCleanSpeechOffset(fullSpokenText, startOffset)
      : 0;
    const remainingText = effectiveOffset > 0 && effectiveOffset < fullSpokenText.length
      ? fullSpokenText.slice(effectiveOffset)
      : fullSpokenText;
    const actualBaseOffset = (effectiveOffset > 0 && effectiveOffset < fullSpokenText.length) ? effectiveOffset : 0;

    const myRunId = ++activeSpeechState.runId;
    releaseSpeechRuntimeHandles();

    const synth = window.speechSynthesis;
    const wasSynthBusy = Boolean(synth.speaking || synth.pending || synth.paused);
    if (wasSynthBusy) {
      try {
        synth.cancel();
      } catch { }
    }

    const nowMs = Date.now();
    activeSpeechState.playing = true;
    activeSpeechState.sessionId = effectiveSessionId;
    activeSpeechState.msgIdx = msgIdx;
    activeSpeechState.rawSourceText = rawText;
    activeSpeechState.hasDistinctSummary = prepared.hasDistinctSummary;
    activeSpeechState.fullSpokenText = fullSpokenText;
    activeSpeechState.docLang = prepared.docLang;
    activeSpeechState.segmentBaseOffset = actualBaseOffset;
    activeSpeechState.segmentStartedAt = nowMs;
    activeSpeechState.segmentRate = activeSpeechState.rate;
    activeSpeechState.boundaryCharOffset = -1;
    activeSpeechState.boundaryUpdatedAt = 0;
    syncSpeechFooterDom();
    void acquireSpeechWakeLock(myRunId);

    const voices = synth.getVoices() || [];
    const chosenVoice = pickBestBrowserVoice(voices, prepared.docLang);
    const isAppleWebKit = isIosDevice() || (/AppleWebKit/i.test(navigator.userAgent || '') && !/Chrome|Chromium|Edg/i.test(navigator.userAgent || ''));
    const chunks = splitIntoContinuousBrowserChunks(remainingText, isAppleWebKit);

    let runningChunkOffset = actualBaseOffset;
    const chunkDescriptors = chunks.map(chunkText => {
      const posInFull = fullSpokenText.indexOf(chunkText, runningChunkOffset);
      const resolvedChunkBase = posInFull >= 0 ? posInFull : runningChunkOffset;
      runningChunkOffset = resolvedChunkBase + chunkText.length;
      return { text: chunkText, baseOffset: resolvedChunkBase };
    });

    let currentChunkIdx = -1;
    let currentAdvanceFn = null;
    let lastChunkStartAt = Date.now();
    let lastSynthBusyAt = Date.now();
    let errorSkipCount = 0;

    const finishSpeechPlayback = () => {
      if (activeSpeechState.runId !== myRunId) return;
      activeSpeechState.playing = false;
      activeSpeechState.sessionId = '';
      activeSpeechState.msgIdx = -1;
      activeSpeechState.rawSourceText = '';
      releaseSpeechRuntimeHandles();
      syncSpeechFooterDom();
    };

    const findNextSentenceOffset = fromCharOffset => {
      const tail = fullSpokenText.slice(Math.max(0, fromCharOffset));
      const m = /[。！？.!?\n]+\s*/.exec(tail);
      if (!m) return -1;
      const candidate = Math.max(0, fromCharOffset) + m.index + m[0].length;
      return candidate < fullSpokenText.length - 2 ? candidate : -1;
    };

    const speakChunkAt = idx => {
      if (activeSpeechState.runId !== myRunId || !activeSpeechState.playing) return;
      if (idx >= chunkDescriptors.length) {
        finishSpeechPlayback();
        return;
      }

      currentChunkIdx = idx;
      const desc = chunkDescriptors[idx];
      const chunkNow = Date.now();
      lastChunkStartAt = chunkNow;
      lastSynthBusyAt = chunkNow;
      activeSpeechState.segmentBaseOffset = desc.baseOffset;
      activeSpeechState.segmentStartedAt = chunkNow;
      activeSpeechState.segmentRate = activeSpeechState.rate;
      activeSpeechState.boundaryCharOffset = desc.baseOffset;
      activeSpeechState.boundaryUpdatedAt = chunkNow;

      const u = new SpeechSynthesisUtterance(desc.text);
      // Pin strong reference on window/state so JSC (iOS Safari) & V8 (Chromium) GC never collect active utterances mid-sentence!
      activeSpeechState.pinnedUtterances.push(u);
      window.__dshPinnedUtterances = activeSpeechState.pinnedUtterances;

      u.lang = chosenVoice?.lang || (prepared.docLang === 'en' ? 'en-US' : 'zh-CN');
      if (chosenVoice) {
        u.voice = chosenVoice;
      }
      u.rate = activeSpeechState.rate;

      let settled = false;
      const unpinUtterance = () => {
        const pos = activeSpeechState.pinnedUtterances.indexOf(u);
        if (pos >= 0) activeSpeechState.pinnedUtterances.splice(pos, 1);
      };
      const advanceToNext = () => {
        if (settled || activeSpeechState.runId !== myRunId) return;
        settled = true;
        currentAdvanceFn = null;
        unpinUtterance();
        if (idx + 1 < chunkDescriptors.length) {
          speakChunkAt(idx + 1);
        } else {
          finishSpeechPlayback();
        }
      };
      currentAdvanceFn = advanceToNext;

      u.onstart = () => {
        if (activeSpeechState.runId !== myRunId) return;
        const t = Date.now();
        lastChunkStartAt = t;
        lastSynthBusyAt = t;
        activeSpeechState.segmentStartedAt = t;
      };
      u.onboundary = ev => {
        if (activeSpeechState.runId !== myRunId) return;
        const t = Date.now();
        lastSynthBusyAt = t;
        if (ev && typeof ev.charIndex === 'number' && ev.charIndex >= 0) {
          activeSpeechState.boundaryCharOffset = desc.baseOffset + ev.charIndex;
          activeSpeechState.boundaryUpdatedAt = t;
        }
      };
      u.onend = () => {
        advanceToNext();
      };
      u.onerror = ev => {
        if (settled || activeSpeechState.runId !== myRunId) return;
        settled = true;
        currentAdvanceFn = null;
        unpinUtterance();
        const errCode = String(ev?.error || '').toLowerCase();
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          finishSpeechPlayback();
          return;
        }
        // Auto-skip past a choked phrase/chunk instead of abruptly dying halfway through a code explanation
        if (errorSkipCount < 3 && idx + 1 < chunkDescriptors.length) {
          errorSkipCount += 1;
          speakChunkAt(idx + 1);
          return;
        }
        if (_recoveryDepth < 2 && chunkDescriptors.length === 1) {
          const approxOffset = computeSpeechResumeOffset({
            fullText: fullSpokenText,
            docLang: prepared.docLang,
            segmentBaseOffset: activeSpeechState.segmentBaseOffset,
            segmentStartedAt: activeSpeechState.segmentStartedAt,
            segmentRate: activeSpeechState.segmentRate,
            boundaryCharOffset: activeSpeechState.boundaryCharOffset,
            boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
            nowMs: Date.now(),
          });
          const nextSentenceOffset = findNextSentenceOffset(Math.max(approxOffset, desc.baseOffset + 6));
          if (nextSentenceOffset > desc.baseOffset) {
            startAssistantSpeech(msgIdx, {
              startOffset: nextSentenceOffset,
              _recoveryDepth: _recoveryDepth + 1,
              rawTextOverride: rawText,
              sessionIdOverride: effectiveSessionId,
            });
            return;
          }
        }
        finishSpeechPlayback();
      };

      try {
        if (synth.paused) synth.resume();
      } catch { }
      synth.speak(u);
    };

    // Keepalive & silent-onend watchdog: un-pause wedged audio ducking and advance if WebKit/Blink drops `onend`
    activeSpeechState.watchdogTimer = setInterval(() => {
      if (activeSpeechState.runId !== myRunId || !activeSpeechState.playing) {
        clearInterval(activeSpeechState.watchdogTimer);
        activeSpeechState.watchdogTimer = null;
        return;
      }
      try {
        if (synth.paused) {
          synth.resume();
        }
        if (synth.speaking || synth.pending) {
          lastSynthBusyAt = Date.now();
          return;
        }
        if (currentChunkIdx >= 0 && Date.now() - Math.max(lastChunkStartAt, lastSynthBusyAt) > 1600) {
          if (typeof currentAdvanceFn === 'function') {
            currentAdvanceFn();
          } else {
            finishSpeechPlayback();
          }
        }
      } catch { }
    }, 900);

    // Fresh user tap (`!wasSynthBusy`) MUST call `synth.speak` synchronously to unlock iOS Safari audio;
    // when cancelling an already-speaking utterance, give WebKit 30ms to settle its async `stopSpeaking` IPC.
    if (wasSynthBusy && isAppleWebKit) {
      activeSpeechState.handoffTimer = setTimeout(() => {
        activeSpeechState.handoffTimer = null;
        speakChunkAt(0);
      }, 30);
    } else {
      speakChunkAt(0);
    }
  }

  function toggleSpeakAssistantReply(msgIdx) {
    if (
      activeSpeechState.playing &&
      activeSpeechState.sessionId === (activeSessionId || '') &&
      activeSpeechState.msgIdx === msgIdx
    ) {
      stopAssistantSpeech();
      return;
    }
    startAssistantSpeech(msgIdx, { startOffset: 0 });
  }

  function switchAssistantSpeechMode(msgIdx) {
    activeSpeechState.mode = activeSpeechState.mode === 'concise' ? 'full' : 'concise';
    try {
      localStorage.setItem('dsh_tts_mode_v2', activeSpeechState.mode);
    } catch { }
    if (activeSpeechState.playing && activeSpeechState.msgIdx === msgIdx) {
      startAssistantSpeech(msgIdx, { startOffset: 0 });
    } else {
      syncSpeechFooterDom();
    }
  }

  function cycleAssistantSpeechRate(msgIdx) {
    const prevRate = activeSpeechState.rate;
    const isCurrentlySpeakingThis =
      activeSpeechState.playing &&
      activeSpeechState.sessionId === (activeSessionId || '') &&
      activeSpeechState.msgIdx === msgIdx;
    const resumeOffset = isCurrentlySpeakingThis
      ? computeSpeechResumeOffset({
        fullText: activeSpeechState.fullSpokenText,
        docLang: activeSpeechState.docLang,
        segmentBaseOffset: activeSpeechState.segmentBaseOffset,
        segmentStartedAt: activeSpeechState.segmentStartedAt,
        segmentRate: prevRate,
        boundaryCharOffset: activeSpeechState.boundaryCharOffset,
        boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
        nowMs: Date.now(),
      })
      : 0;

    const curIdx = SPEECH_RATES.indexOf(prevRate);
    activeSpeechState.rate = SPEECH_RATES[(curIdx + 1) % SPEECH_RATES.length];
    try {
      localStorage.setItem('dsh_tts_rate', String(activeSpeechState.rate));
    } catch { }
    if (isCurrentlySpeakingThis) {
      startAssistantSpeech(msgIdx, { startOffset: resumeOffset });
    } else {
      syncSpeechFooterDom();
    }
  }

  function selectAgyApprovalOption(idx) {
    selectedAgyOptionIndex = Number(idx) || 1;
    document.querySelectorAll('.agy-approval-opt').forEach(el => {
      el.classList.toggle('selected', Number(el.dataset.optIdx) === selectedAgyOptionIndex);
    });
  }

  function submitAgyApproval(hostId, code) {
    const idx = selectedAgyOptionIndex || 1;
    const allow = idx !== 4;
    sendApprovalDecision(hostId, code, allow, idx);
  }

  function renderActiveChatStage(foundArg) {
    const found = foundArg && foundArg.session ? foundArg : findSessionGlobal(activeSessionId);
    if (!found) return;
    const { session: s } = found;
    if (s._wireTruncated && !expandedTranscriptBySession.has(s.id)) {
      void hydrateColdSessionTranscript(s.hostId, s.id, s.sessionRev || '');
    }

    const chatHeaderTitle = stripRedundantProjectPrefix(s.title, s.project);
    const chatTitleEl = document.getElementById('chatTitle');
    if (chatTitleEl && chatTitleEl.dataset.titleKey !== `${langPref}:${chatHeaderTitle}`) {
      chatTitleEl.dataset.titleKey = `${langPref}:${chatHeaderTitle}`;
      chatTitleEl.textContent = chatHeaderTitle;
    }
    const harnessNameText = s.harness === 'antigravity-ide'
      ? 'Antigravity IDE'
      : s.harness === 'codex'
        ? 'Codex'
        : s.harness === 'workbuddy'
          ? 'WorkBuddy'
          : s.harness === 'doubao'
            ? '豆包电脑版'
            : s.harness === 'claude'
              ? 'Claude Code'
              : 'DSH';
    const isObserveOnly = s.controlMode === 'observe-only' && s.harness !== 'dsh';
    const modeTag = isObserveOnly
      ? ' · 👀 仅观测'
      : s.controlMode === 'idle-resumable' || (s.controlMode === 'observe-only' && s.harness === 'dsh')
        ? ' · 🔵 可续聊'
        : '';
    const compactChatProj = formatCompactProjectLabel(s.project);
    const hostOnline = isHostLiveOnline(found.host);
    const offlineSubTag = hostOnline ? '' : ' · ⚪ 已离线';
    const nextSubHtml = `${renderHarnessBadgeHtml(s.harness, 'inline')} ${esc(harnessNameText)} · 📁 ${esc(compactChatProj)} · 💻 ${esc(s.hostName)} (${s.msgCount} 条对话)${esc(modeTag)}${esc(offlineSubTag)}`;
    const chatSubEl = document.getElementById('chatSub');
    const nextSubSig = `${langPref}:${nextSubHtml}`;
    if (chatSubEl && chatSubEl.dataset.subSig !== nextSubSig) {
      chatSubEl.dataset.subSig = nextSubSig;
      chatSubEl.innerHTML = nextSubHtml;
    }

    // 电脑离线提示条（紧贴顶栏下方，明确当前为历史快照、发消息将排队 10 分钟等待上线）
    const offlineBannerEl = document.getElementById('chatOfflineBanner');
    if (offlineBannerEl) {
      if (!hostOnline) {
        const lastSeenStr = found.host?.lastSeen ? `（${formatTime(found.host.lastSeen)}）` : '';
        const runningHint = s.status === 'running' ? '；离线前运行中的任务将在恢复连网后同步进度' : '';
        const nextOfflineHtml = `<span>⚪ <strong>${esc(s.hostName)}</strong> 已离线${esc(lastSeenStr)} · 可查看历史记录，发消息将排队（10 分钟内上线自动执行）${esc(runningHint)}</span>`;
        offlineBannerEl.style.display = 'flex';
        const nextOfflineSig = `${langPref}:${nextOfflineHtml}`;
        if (offlineBannerEl.dataset.offlineSig !== nextOfflineSig) {
          offlineBannerEl.dataset.offlineSig = nextOfflineSig;
          offlineBannerEl.innerHTML = nextOfflineHtml;
        }
      } else {
        offlineBannerEl.style.display = 'none';
        offlineBannerEl.dataset.offlineSig = '';
      }
    }

    // 检查其他在线电脑的会话是否有待确认审批
    let otherApproval = null;
    for (const h of hubState.hosts || []) {
      if (!isHostLiveOnline(h)) continue;
      const app = (h.bridgeState?.approvals || []).find(a => a.agentId !== s.id);
      if (app) { otherApproval = { app, host: h }; break; }
    }
    const alertBar = document.getElementById('chatSwitchAlert');
    if (otherApproval) {
      const isOtherQuestion = Boolean(
        otherApproval.app.kind === 'question' || Array.isArray(otherApproval.app.questions)
      );
      const otherProj = otherApproval.app.project ? `${formatCompactProjectLabel(otherApproval.app.project)} / ` : '';
      const nextAlertHtml = `
          <span>${isOtherQuestion ? '💬' : '⏳'} [${esc(otherApproval.host.hostName)}]「${esc(otherProj)}${esc(otherApproval.app.title || otherApproval.app.toolName)}」${isOtherQuestion ? '待你选择' : '待你审批'}</span>
          <button style="border:none;background:#d97706;color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;" onclick="openChat('${esc(otherApproval.app.agentId)}')">立即切换 ›</button>
        `;
      alertBar.style.display = 'flex';
      const nextAlertSig = `${langPref}:${nextAlertHtml}`;
      if (alertBar.dataset.alertSig !== nextAlertSig) {
        alertBar.dataset.alertSig = nextAlertSig;
        alertBar.innerHTML = nextAlertHtml;
      }
    } else {
      alertBar.style.display = 'none';
      alertBar.dataset.alertSig = '';
    }

    // 先对齐清理已送达的陈旧草稿（如 5G 切后台假失败回填、跨端已发或历史残留），再切换草稿
    reconcileDeliveredComposerDraft(s, found.host);

    // 切换会话时换回该会话的草稿（同一会话内绝不覆盖用户正在输入的内容）
    switchComposerSession(s.id);
    updateChatModelPill(s, found.host);

    // 更新底部输入状态（仅当状态变化时调整 placeholder，绝不清空用户正在输入的内容！）
    const composerKey = `${s.id}:${s.status}:${s.controlMode || ''}:${hostOnline ? 1 : 0}`;
    if (composerKey !== lastRenderedComposerKey) {
      lastRenderedComposerKey = composerKey;
      const runningBar = document.getElementById('runningControlBar');
      const chatInput = document.getElementById('globalPromptInput');
      const sendBtn = document.getElementById('chatSendBtn');
      const voiceBtn = document.getElementById('chatVoiceBtn');
      const imageBtn = document.getElementById('chatImageBtn');
      const composerCard = document.getElementById('composerUnifiedCard');
      const toolbarRow =
        typeof document.querySelector === 'function'
          ? document.querySelector('#composerUnifiedCard .composer-toolbar-row')
          : null;
      const attachStrip = document.getElementById('composerAttachmentsStrip');
      if (isObserveOnly) {
        runningBar.classList.remove('show');
        sendBtn.classList.remove('offline-queue');
        chatInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.display = 'none';
        chatInput.placeholder = '👀 当前会话为观察模式（仅支持查看对话记录）';
        sendBtn.textContent = '👀 仅观察';
        if (composerCard?.classList) composerCard.classList.remove('wechat-voice-mode');
        if (voiceBtn) {
          voiceBtn.disabled = true;
          voiceBtn.style.display = 'none';
        }
        if (imageBtn) {
          imageBtn.disabled = true;
          imageBtn.style.display = 'none';
        }
        if (toolbarRow) toolbarRow.style.display = 'none';
        if (attachStrip) attachStrip.style.display = 'none';
      } else {
        if (composerCard?.classList) {
          composerCard.classList.toggle('wechat-voice-mode', Boolean(isWechatVoiceMode()));
        }
        if (voiceBtn) {
          voiceBtn.disabled = false;
          voiceBtn.style.display = '';
        }
        if (imageBtn) {
          imageBtn.disabled = false;
          imageBtn.style.display = '';
        }
        if (toolbarRow) toolbarRow.style.display = '';
        renderAttachmentStrip('chat');
        if (!hostOnline) {
          runningBar.classList.remove('show');
          chatInput.disabled = false;
          sendBtn.disabled = false;
          sendBtn.style.display = '';
          sendBtn.classList.add('offline-queue');
          chatInput.placeholder = '⚪ 电脑已离线，发送将排队（10 分钟内上线自动执行）...';
          sendBtn.textContent = '⏳ 排队发送';
        } else if (s.status === 'running') {
          sendBtn.classList.remove('offline-queue');
          runningBar.classList.add('show');
          const canSteer = s.capabilities?.canSteer !== false && s.harness !== 'claude';
          if (!canSteer) {
            chatInput.disabled = true;
            sendBtn.disabled = true;
            sendBtn.style.display = 'none';
            chatInput.placeholder = '⏳ 当前后端正在执行中（不支持实时插话，可点击上方停止）';
            sendBtn.textContent = '🟢 执行中';
          } else {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.display = '';
            chatInput.placeholder = '⚡ 实时插话 (Steer)：补充指令将立即注入...';
            sendBtn.textContent = '⚡ 插话';
          }
        } else {
          sendBtn.classList.remove('offline-queue');
          runningBar.classList.remove('show');
          chatInput.disabled = false;
          sendBtn.disabled = false;
          sendBtn.style.display = '';
          chatInput.placeholder = s.controlMode === 'idle-resumable'
            ? `发指令通过 ${s.harnessLabel || s.harness} CLI 继续对话...`
            : '发指令继续对话...';
          sendBtn.textContent = '发送';
        }
      }
      if (chatInput) {
        chatInput.dataset.origPlaceholder = chatInput.placeholder;
      }
      if (voiceBtn) {
        voiceBtn.style.opacity = chatInput.disabled ? '0.52' : '';
      }
      syncWechatHoldBtnState();
    }

    // DOM Diffing：如果会话内容和状态没变，不重绘 #chatMessages，保留用户展开的思考过程与滚动位置！
    const trSig = s.transcript
      .slice(-6)
      .map(m => `${m.role}:${m.queuedCmdId || ''}:${m.expiredCmdId || ''}:${(m.text || '').length}:${(m.text || '').slice(-32)}:${(m.thinking || '').length}:${(m.tools || []).length}:${(m.artifacts || []).length}:${m.waitingForInput ? 1 : 0}`)
      .join('|');
    const fcMeta = computeChangedFilesMeta(s.changedFiles);
    const fcReviewed = Boolean(fcMeta.sig && filesCardReviewedSigBySession.get(s.id) === fcMeta.sig);
    const fcCollapsed = !filesExpandedSessionIds.has(s.id);
    const artCollapsed = !artifactsExpandedSessionIds.has(s.id);
    const chatKey = `${s.id}:${s.status}:${s.isStalledMidTurn ? 1 : 0}:${s.sessionRev || ''}:${s.transcript.length}:${hydratingWireSessionIds.has(s.id) ? 1 : 0}:${trSig}:${s.approvalObj?.code || ''}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ''}:${(s.changedFiles || []).length}:${fcMeta.sig}:${fcCollapsed ? 1 : 0}:${fcReviewed ? 1 : 0}:${artCollapsed ? 1 : 0}:${(s.artifacts || []).length}`;
    if (chatKey === lastRenderedChatKey) return;
    const box = document.getElementById('chatMessages');
    if (
      lastRenderedChatKey &&
      box &&
      box.dataset.dshSession === String(activeSessionId) &&
      chatTouchDownAt > 0 &&
      Date.now() - chatTouchDownAt < 3500
    ) {
      pendingChatRenderAfterTouch = true;
      return;
    }
    pendingChatRenderAfterTouch = false;
    lastRenderedChatKey = chatKey;
    selectedAgyOptionIndex = 1;
    // 保留用户手动点开的 <details>（思考过程 / 工具输出）状态，增量刷新时不会自动合上
    const openDetailIds = new Set(
      Array.from(box.querySelectorAll('details[open][data-detail-id]')).map(el => el.dataset.detailId)
    );
    // 仅当用户主动上滑浏览旧消息（chatPinnedToBottom === false）时保留原阅读位置；
    // 图片异步加载、全文补齐或 SSE 追加导致的 scrollHeight 增长绝不会把用户误判为离开底部！
    const sessionSwitched = box.dataset.dshSession !== String(activeSessionId) || lastRenderedChatSessionId !== s.id;
    if (sessionSwitched) {
      chatPinnedToBottom = true;
    }
    const prevScrollTop = box.scrollTop;
    const prevScrollHeight = box.scrollHeight;
    box.dataset.dshSession = String(activeSessionId);
    const rawMsgs = s.transcript.length > 0
      ? s.transcript
      : [{ role: 'assistant', text: s.rawLastPreview || s.lastPreview }];

    // 将同一轮回答中连续的中间思考/工具步骤自动归并到同一个 AI 回复气泡中，避免满屏散乱的 thinking 气泡
    const msgs = [];
    for (const item of rawMsgs) {
      if (!item) continue;
      const prev = msgs[msgs.length - 1];
      if (
        item.role === 'assistant' &&
        prev &&
        prev.role === 'assistant' &&
        !prev.waitingForInput &&
        !item.waitingForInput &&
        !prev.isErrorNotice &&
        !item.isErrorNotice
      ) {
        if (!prev._thoughtList) {
          prev._thoughtList = prev.thinking ? [String(prev.thinking).trim()] : [];
          prev._textList = prev.text && !prev.isToolStepOnly ? [String(prev.text).trim()] : [];
          prev._toolList = [
            ...(Array.isArray(prev.toolCalls) && prev.toolCalls.length > 0 ? prev.toolCalls : (prev.tools || [])),
          ];
          prev._artifactMap = new Map(
            (Array.isArray(prev.artifacts) ? prev.artifacts : []).filter(a => a && a.path).map(a => [a.path, a])
          );
          prev._stepCount = prev.thinkingStepCount || (prev.thinking ? 1 : 0);
        }
        if (item.thinking && String(item.thinking).trim()) {
          prev._thoughtList.push(String(item.thinking).trim());
          prev._stepCount += item.thinkingStepCount || 1;
        }
        if (item.text && !item.isToolStepOnly && String(item.text).trim()) {
          prev._textList.push(String(item.text).trim());
        }
        const nextTools =
          Array.isArray(item.toolCalls) && item.toolCalls.length > 0 ? item.toolCalls : (item.tools || []);
        for (const t of nextTools) {
          if (t) prev._toolList.push(t);
        }
        for (const a of (Array.isArray(item.artifacts) ? item.artifacts : [])) {
          if (a && a.path) prev._artifactMap.set(a.path, a);
        }
        prev.thinkingStepCount = prev._stepCount;
        prev.thinking =
          prev._thoughtList.length <= 1
            ? prev._thoughtList[0] || ''
            : prev._thoughtList
              .map((th, idx) => (th.startsWith('【思考') ? th : `【思考 ${idx + 1}】\n${th}`))
              .join('\n\n');
        prev.text = prev._textList.join('\n\n');
        prev.tools = prev._toolList;
        prev.toolCalls = prev._toolList;
        prev.artifacts = prev._artifactMap.size > 0 ? [...prev._artifactMap.values()] : undefined;
        prev.isToolStepOnly = false;
      } else {
        msgs.push({ ...item });
      }
    }

    lastRenderedAssistantTexts = {};
    const bubblesHtml = msgs.map((m, msgIdx) => {
      if (m.role === 'user') {
        const queuedBadge = m.queuedCmdId
          ? `<div class="queued-cmd-pill"><span>⏳ 排队中（电脑上线后执行）</span><button class="cancel-queued-btn" onclick="event.stopPropagation(); cancelQueuedCommand('${esc(m.queuedCmdId)}')">✕ 取消</button></div>`
          : m.expiredCmdId
            ? `<div class="queued-cmd-pill" style="background:rgba(239,68,68,0.18);color:#fecaca;"><span>⚠️ 电脑超过 10 分钟未上线，该指令已超时未执行</span></div>`
            : '';
        const parsedUser = parseUserMessageAndMedia(m);
        const textHtml = parsedUser.text ? `<div class="user-bubble-text">${esc(parsedUser.text)}</div>` : '';
        let mediaGridHtml = '';
        if (parsedUser.optImgs && parsedUser.optImgs.length > 0) {
          mediaGridHtml = `<div class="user-msg-media-grid">${parsedUser.optImgs.map((it, idx) => `
            <div class="user-msg-img-card" onclick="openOptimisticImagePreview('${esc(m.optId)}', ${idx})">
              <img class="user-msg-thumb saveable-preview-img" src="${it.dataUrl}" alt="${esc(it.name)}" />
              <span class="user-msg-img-badge">🔍 ${esc(it.name)}</span>
            </div>
          `).join('')}</div>`;
        } else if (parsedUser.mediaItems.length > 0) {
          mediaGridHtml = `<div class="user-msg-media-grid">${parsedUser.mediaItems.map(it => {
            const encPrimary = encodeURIComponent(it.primaryPath).replace(/'/g, '%27');
            const encBackup = encodeURIComponent(it.backupPath || '').replace(/'/g, '%27');
            return `<div class="user-msg-img-card md-user-img-pending" data-local-img-path="${esc(it.primaryPath)}" data-backup-img-path="${esc(it.backupPath || '')}" data-img-label="${esc(it.label)}" onclick="openUserBubbleImage(this, '${encPrimary}', '${encBackup}')"><span class="user-msg-img-placeholder">🖼️ ${esc(it.label)}</span></div>`;
          }).join('')}</div>`;
        } else if (parsedUser.pendingRemoteImgCount > 0) {
          mediaGridHtml = `<div class="queued-cmd-pill"><span>🖼️ 已附带 ${parsedUser.pendingRemoteImgCount} 张截图</span></div>`;
        }
        return `<div class="bubble user">${textHtml}${mediaGridHtml}${queuedBadge}</div>`;
      }
      const thinkId = `think-${msgIdx}`;
      const stepCountLabel = m.thinkingStepCount > 1 ? ` · 共 ${m.thinkingStepCount} 步` : '';
      const thought = m.thinking
        ? `<details class="thought-box thinking-details" data-detail-id="${thinkId}" ${openDetailIds.has(thinkId) ? 'open' : ''}><summary>💭 思考过程${stepCountLabel} (点击展开)</summary><div style="margin-top:6px;white-space:pre-wrap;">${esc(m.thinking)}</div></details>`
        : '';
      if (m.isToolStepOnly) {
        const toolOut = (m.tools || []).map(t => t.commandLine || t.summary || '').filter(Boolean).join('\n');
        const waitText = m.waitingForInput
          ? `<div style="margin-top:6px;font-size:12.5px;color:var(--muted);">Waiting for user input.</div>`
          : '';
        const stepToolId = `tool-step-${msgIdx}`;
        return `
            <div class="bubble assistant" style="padding:2px 0;">
              ${thought}
              <details class="tool-chip-details" data-detail-id="${stepToolId}" ${openDetailIds.has(stepToolId) ? 'open' : ''} style="border:none;background:transparent;">
                <summary style="padding:2px 0;font-size:13px;color:var(--text-secondary);">
                  <span>${esc(m.text)}</span>
                  <span style="color:var(--muted);font-size:11px;">›</span>
                </summary>
                ${toolOut ? `<div class="tool-chip-output" style="margin-top:6px;border-radius:6px;">${esc(toolOut)}</div>` : ''}
              </details>
              ${waitText}
            </div>
          `;
      }
      const rawTools = Array.isArray(m.toolCalls) && m.toolCalls.length > 0 ? m.toolCalls : (m.tools || []);
      let tools = '';
      if (rawTools.length > 0) {
        const isOlderCollapsedMsg = msgIdx < msgs.length - 6;
        const toolItemsHtml = rawTools.map((t, tIdx) => {
          const tName = typeof t === 'string' ? t : (t.name || 'tool');
          const tSummary = typeof t === 'string' ? '' : (t.summary || t.argsSummary || '');
          const rawDetail = typeof t === 'string' ? '执行完毕' : (t.commandLine || t.output || tSummary || '执行完毕');
          const tDetail = isOlderCollapsedMsg && rawDetail.length > 600
            ? rawDetail.slice(0, 600) + '...'
            : rawDetail;
          const chipId = `tool-${msgIdx}-${tIdx}`;
          return `
              <details class="tool-chip-details" data-detail-id="${chipId}" ${openDetailIds.has(chipId) ? 'open' : ''}>
                <summary><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔧 ${esc(tName)}${tSummary ? ` · ${esc(tSummary.slice(0, 64))}` : ''}</span><span style="color:#94a3b8;font-size:10.5px;white-space:nowrap;flex-shrink:0;">点击查看详情 ▾</span></summary>
                <div class="tool-chip-output">${esc(tDetail)}</div>
              </details>
            `;
        }).join('');
        if (rawTools.length > 1) {
          const groupId = `tool-group-${msgIdx}`;
          const uniqueToolNames = [...new Set(rawTools.map(t => (typeof t === 'string' ? t : (t.name || 'tool'))))].slice(0, 4).join(', ');
          tools = `<details class="thought-box thinking-details" data-detail-id="${groupId}" ${openDetailIds.has(groupId) ? 'open' : ''} style="margin-bottom:8px;"><summary>🔧 执行过程 · 共 ${rawTools.length} 次工具调用 (${esc(uniqueToolNames)}) (点击展开)</summary><div class="tool-chips" style="margin-top:6px;">${toolItemsHtml}</div></details>`;
        } else {
          tools = `<div class="tool-chips" style="margin-bottom:8px;">${toolItemsHtml}</div>`;
        }
      }
      const msgArtifacts = Array.isArray(m.artifacts) ? m.artifacts.filter(a => a && a.path) : [];
      const resolveArtifactBadgeTitle = (art, isHtmlArt) => {
        const rawT = String(art?.title || '').trim();
        const nameStem = String(art?.name || '')
          .replace(/\.[a-z0-9]+$/i, '')
          .trim();
        if (!rawT || rawT.toLowerCase() === nameStem.toLowerCase() || /^artifact$/i.test(rawT)) {
          return art?.kind === 'walkthrough' ? 'Walkthrough' : isHtmlArt ? 'HTML 网页' : '交付文档';
        }
        return rawT;
      };
      const artifactsCardHtml = msgArtifacts.length > 0 ? `
        <div class="agy-artifact-card-list">
          ${msgArtifacts.map(art => {
        const encArtPath = encodeURIComponent(art.path || '').replace(/'/g, '%27');
        const isHtmlArt = isHtmlFileName(art.name || art.path || '');
        const badgeIcon = art.kind === 'walkthrough' ? '📋' : art.kind === 'plan' ? '🗺️' : art.kind === 'task' ? '☑️' : isHtmlArt ? '🌐' : '📄';
        const badgeTitle = resolveArtifactBadgeTitle(art, isHtmlArt);
        return `
              <div class="agy-artifact-card" onclick="openChatFileLink('${encArtPath}')">
                <div class="agy-artifact-card-head">
                  <span class="agy-artifact-icon">${badgeIcon}</span>
                  <div class="agy-artifact-titles">
                    <div class="agy-artifact-title-row">
                      <span class="agy-artifact-kind-pill">${esc(badgeTitle)}</span>
                      <span class="agy-artifact-name">${esc(art.name || 'walkthrough.md')}</span>
                    </div>
                    ${art.summary ? `<div class="agy-artifact-summary">${esc(String(art.summary).replace(/\s+/g, ' ').slice(0, 140))}</div>` : ''}
                  </div>
                  <button type="button" class="agy-artifact-open-btn" onclick="event.stopPropagation(); openChatFileLink('${encArtPath}')">${isHtmlArt ? '体验网页 ›' : '打开 ›'}</button>
                </div>
              </div>
            `;
      }).join('')}
        </div>
      ` : '';
      const isColdTruncatedTail = Boolean(
        s._wireTruncated &&
        !hydratedWireTranscriptBySession.has(s.id) &&
        msgIdx === msgs.length - 1
      );
      const rawReplyText = m.text ? String(m.text).trim() : '';
      const cleanReplyText = isColdTruncatedTail && rawReplyText.length >= 250
        ? rawReplyText
          .replace(/\[[^\]]*\]\([^)]*$/, '')
          .replace(/\[[^\]]*$/, '')
          .trimEnd() + '…'
        : rawReplyText;
      if (cleanReplyText) {
        lastRenderedAssistantTexts[msgIdx] = cleanReplyText;
      }
      const copyFooterHtml = cleanReplyText
        ? renderAssistantFooterHtml(s.id, msgIdx, cleanReplyText, {
          isTruncatedPreview: isColdTruncatedTail && rawReplyText.length >= 250,
        })
        : '';
      const renderedMdHtml = cleanReplyText ? formatAssistantText(cleanReplyText, msgArtifacts) : '';
      const bodyHtml = renderedMdHtml
        ? `<div class="md-body">${renderedMdHtml}</div>${copyFooterHtml}`
        : cleanReplyText && msgArtifacts.length > 0
          ? `${copyFooterHtml}`
          : `<div style="font-size:12.5px;color:var(--muted);margin-top:4px;">⚙️ 正在思考与执行工具调用...</div>`;
      return `<div class="bubble assistant">${thought}${tools}${bodyHtml}${artifactsCardHtml}</div>`;
    }).join('');

    const sessionArtifacts = Array.isArray(s.artifacts) ? s.artifacts.filter(a => a && a.path) : [];
    const sessionArtifactsHtml = sessionArtifacts.length > 0 ? `
        <div class="agy-files-changed-card agy-session-artifacts-card${artCollapsed ? ' is-collapsed' : ''}" data-artifacts-session="${esc(s.id)}">
          <button type="button" class="agy-session-artifacts-header" aria-expanded="${!artCollapsed}" onclick="toggleSessionArtifactsCard('${esc(s.id)}')">
            <span class="agy-session-artifacts-title">📋 AI 交付文档 / Walkthrough (${sessionArtifacts.length})</span>
            <span class="agy-artifacts-toggle-pill">${artCollapsed ? '展开 ⌄' : '收起 ⌃'}</span>
          </button>
          <div class="agy-artifact-rows">
            ${sessionArtifacts.map(art => {
      const encArtPath = encodeURIComponent(art.path || '').replace(/'/g, '%27');
      const isHtmlArt = isHtmlFileName(art.name || art.path || '');
      const badgeIcon = art.kind === 'walkthrough' ? '📋' : art.kind === 'plan' ? '🗺️' : art.kind === 'task' ? '☑️' : isHtmlArt ? '🌐' : '📄';
      const rawT = String(art?.title || '').trim();
      const nameStem = String(art?.name || '').replace(/\.[a-z0-9]+$/i, '').trim();
      const badgeTitle = (!rawT || rawT.toLowerCase() === nameStem.toLowerCase() || /^artifact$/i.test(rawT))
        ? (art.kind === 'walkthrough' ? 'Walkthrough' : isHtmlArt ? 'HTML 网页' : '交付文档')
        : rawT;
      const summaryText = art.summary ? String(art.summary).replace(/\s+/g, ' ').trim().slice(0, 80) : '';
      const hasDistinctSummary = Boolean(summaryText && summaryText.toLowerCase() !== String(art.name || '').trim().toLowerCase());
      return `
            <div class="agy-file-row agy-artifact-row${hasDistinctSummary ? ' has-summary' : ''}" style="cursor:pointer;" onclick="openChatFileLink('${encArtPath}')">
              <span class="agy-artifact-row-icon">${badgeIcon}</span>
              <span class="agy-artifact-kind-badge">${esc(badgeTitle)}</span>
              <span class="agy-file-name">${esc(art.name || '')}</span>
              ${hasDistinctSummary ? `<span class="agy-file-path">${esc(summaryText)}</span>` : ''}
              <span class="agy-artifact-open-tag">${isHtmlArt ? '体验网页 ›' : '打开 ›'}</span>
            </div>
          `;
    }).join('')}
          </div>
        </div>
      ` : '';

    const filesChangedHtml = ((s.harness === 'antigravity-ide' || s.harness === 'codex') && Array.isArray(s.changedFiles) && s.changedFiles.length > 0) ? `
        <div class="agy-files-changed-card${fcCollapsed ? ' is-collapsed' : ''}" data-files-session="${esc(s.id)}">
          <div class="agy-files-rows">
            ${s.changedFiles.slice(-8).map(fc => {
      const encFcPath = encodeURIComponent(fc.path || fc.name || '').replace(/'/g, '%27');
      return `
            <div class="agy-file-row" style="cursor:pointer;" onclick="openChatFileLink('${encFcPath}')">
              <span class="agy-file-dot">◉</span>
              <span class="agy-file-diff"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
              <span class="agy-file-name">${esc(fc.name || '')}</span>
              <span class="agy-file-path">${esc(fc.displayPath || fc.path || '')}</span>
            </div>
          `;
    }).join('')}
          </div>
          <div class="agy-files-footer">
            <button type="button" class="agy-files-toggle" aria-expanded="${!fcCollapsed}" onclick="toggleFilesChangedCard('${esc(s.id)}')">
              <span>📄 ${s.changedFiles.length} Files With Changes</span>
              <span class="agy-files-chevron">${fcCollapsed ? '⌄' : '⌃'}</span>
            </button>
            <div class="agy-files-footer-btns">
              <button type="button" class="agy-files-reject" onclick="openChangedFilesDrawer('${esc(s.id)}')">查看改动</button>
              ${fcReviewed ? '' : `<button type="button" class="agy-files-accept" onclick="reviewFilesChangedCard('${esc(s.id)}', '${esc(fcMeta.sig)}')">确认已阅</button>`}
            </div>
          </div>
        </div>
      ` : '';

    const isQuestionApproval = Boolean(
      s.approvalObj && (s.approvalObj.kind === 'question' || Array.isArray(s.approvalObj.questions))
    );
    const isAgyApproval =
      s.approvalObj &&
      !isQuestionApproval &&
      (s.approvalObj.harness === 'antigravity-ide' || Array.isArray(s.approvalObj.options));
    const approvalStatusNoticeHtml = s.approvalObj?.lastError
      ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.35);color:#ef4444;font-size:12px;font-weight:600;">⚠️ ${esc(s.approvalObj.lastError)}</div>`
      : s.approvalObj?.settling
        ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--amber-soft);color:#d97706;font-size:12px;font-weight:600;">⏳ 正在同步到电脑端执行（最长等待 45 秒）...</div>`
        : '';
    const qDraft = isQuestionApproval
      ? getDshQuestionDraft(s.approvalObj.code, s.approvalObj.questions)
      : null;
    const approvalCardHtml = s.approvalObj ? (isQuestionApproval ? `
        <div class="dsh-question-card" data-question-code="${esc(s.approvalObj.code)}">
          <div class="dsh-question-card-header">
            <span class="dsh-question-badge-icon">💬</span>
            <div class="dsh-question-card-title">${esc(s.approvalObj.promptTitle || '请做出选择以继续')}</div>
          </div>
          ${approvalStatusNoticeHtml}
          <div class="dsh-question-list">
            ${(Array.isArray(s.approvalObj.questions) ? s.approvalObj.questions : []).map((q, qIdx) => {
      const qId = String(q.id || `q_${qIdx + 1}`);
      const draftItem = qDraft?.[qId] || { selected: [], customText: '' };
      const selectedSet = new Set(Array.isArray(draftItem.selected) ? draftItem.selected : []);
      const opts = Array.isArray(q.options) ? q.options : [];
      const detailId = `q-detail-${esc(s.approvalObj.code)}-${qIdx}`;
      return `
                <div class="dsh-question-block" data-question-id="${esc(qId)}">
                  <div class="dsh-question-prompt-line">
                    ${q.header ? `<span class="dsh-question-header-pill">${esc(q.header)}</span>` : ''}
                    <span class="dsh-question-prompt-text">${esc(q.question || q.header || '请选择一项')}</span>
                    ${q.multiSelect ? `<span class="dsh-question-multi-tag">可多选</span>` : ''}
                  </div>
                  ${q.detail ? `
                    <details class="thought-box thinking-details" data-detail-id="${detailId}" ${openDetailIds.has(detailId) ? 'open' : ''} style="margin:6px 0 8px;">
                      <summary>📄 查看完整方案内容 (点击展开)</summary>
                      <div class="md-body" style="margin-top:8px;max-height:260px;overflow-y:auto;">${formatAssistantText(String(q.detail))}</div>
                    </details>
                  ` : ''}
                  <div class="dsh-question-options">
                    ${opts.map((opt, oIdx) => {
        const label = String(opt.label || `选项 ${oIdx + 1}`);
        const isSel = selectedSet.has(label);
        return `
                        <button
                          type="button"
                          class="dsh-question-opt ${isSel ? 'selected' : ''}"
                          data-q-id="${esc(qId)}"
                          data-opt-label="${esc(label)}"
                          ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="toggleDshQuestionOption('${esc(s.approvalObj.code)}', '${esc(qId)}', '${esc(label)}', ${Boolean(q.multiSelect)})"`}
                        >
                          <div class="dsh-question-opt-top">
                            <span class="dsh-question-opt-check">${q.multiSelect ? (isSel ? '☑' : '☐') : (isSel ? '◉' : '○')}</span>
                            <span class="dsh-question-opt-label">${esc(label)}</span>
                          </div>
                          ${opt.description ? `<div class="dsh-question-opt-desc">${esc(opt.description)}</div>` : ''}
                        </button>
                      `;
      }).join('')}
                  </div>
                  <div class="dsh-question-custom-wrap">
                    <input
                      type="text"
                      class="dsh-question-custom-input"
                      data-q-id="${esc(qId)}"
                      placeholder="或者直接输入自定义回答 / 补充说明..."
                      value="${esc(draftItem.customText || '')}"
                      ${s.approvalObj.settling ? 'disabled' : `oninput="onDshQuestionCustomInput('${esc(s.approvalObj.code)}', '${esc(qId)}', this.value)"`}
                    />
                  </div>
                </div>
              `;
    }).join('')}
          </div>
          <div class="dsh-question-footer">
            <button
              type="button"
              class="dsh-question-btn-skip"
              ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4, '${esc(s.id)}')"`}
            >跳过 / 取消</button>
            <button
              type="button"
              class="dsh-question-btn-submit"
              ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="submitDshQuestionAnswers('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', '${esc(s.id)}')"`}
            >${s.approvalObj.settling ? '⏳ 正在提交...' : '提交选择 ↵'}</button>
          </div>
        </div>
      ` : isAgyApproval ? `
        <div class="agy-approval-card">
          <div class="agy-approval-header">
            <span class="agy-approval-term-icon">&gt;_</span>
            <span>${esc(s.approvalObj.promptTitle || `Allow ${s.approvalObj.toolName}?`)}</span>
          </div>
          <div class="agy-approval-subtitle">${esc(s.approvalObj.subtitle || 'the auto-run safety check did not reach a decision')}</div>
          ${s.approvalObj.commandLine ? `<div class="agy-approval-cmd">${esc(s.approvalObj.commandLine)}</div>` : `<div class="agy-approval-cmd">${esc(s.approvalObj.reason || '')}</div>`}
          ${approvalStatusNoticeHtml}
          <div class="agy-approval-options">
            ${(s.approvalObj.options && s.approvalObj.options.length > 0 ? s.approvalObj.options : [
        { index: 1, label: 'Yes, allow this time' },
        { index: 2, label: 'Yes, and always allow in this conversation' },
        { index: 3, label: 'Yes, and always allow' },
        { index: 4, label: 'No (tell the agent what to do instead)' }
      ]).map(opt => `
              <button type="button" class="agy-approval-opt ${opt.index === 1 ? 'selected' : ''}" data-opt-idx="${opt.index}" ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="selectAgyApprovalOption(${opt.index})" ondblclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', ${opt.index !== 4}, ${opt.index})"`}>
                <span class="agy-opt-num">${opt.index}</span>
                <span>${esc(opt.label)}</span>
              </button>
            `).join('')}
          </div>
          <div class="agy-approval-footer">
            <button type="button" class="agy-btn-skip" ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)"`}>Skip</button>
            <button type="button" class="agy-btn-submit" ${s.approvalObj.settling ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : `onclick="submitAgyApproval('${esc(s.hostId)}', '${esc(s.approvalObj.code)}')"`}>${s.approvalObj.settling ? '⏳ 处理中...' : 'Submit <span>↵</span>'}</button>
          </div>
        </div>
      ` : `
        <div class="inline-approval-card">
          <div class="inline-approval-title">⏳ 等待你确认工具调用：${esc(s.approvalObj.toolName)}</div>
          <div class="inline-approval-cmd">${esc(s.approvalObj.reason || '请求执行权限')}</div>
          ${approvalStatusNoticeHtml}
          <div class="inline-approval-btns">
            <button style="background:#10b981;color:#fff;${s.approvalObj.settling ? 'opacity:0.6;cursor:not-allowed;' : ''}" ${s.approvalObj.settling ? 'disabled' : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', true, 1)"`}>${s.approvalObj.settling ? '⏳ 正在同步...' : '✅ 允许执行'}</button>
            <button style="background:#fee2e2;color:#dc2626;${s.approvalObj.settling ? 'opacity:0.6;cursor:not-allowed;' : ''}" ${s.approvalObj.settling ? 'disabled' : `onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)"`}>✕ 拒绝</button>
          </div>
        </div>
      `) : '';

    const hasAnyAssistantReply = Object.keys(lastRenderedAssistantTexts).length > 0;
    const followups = ['▶ 继续执行下一步', '🔍 查看 git status 与改动', '🧪 运行测试验证'];
    const followupsHtml = `
        <div class="quick-followups">
          ${hasAnyAssistantReply ? `<button class="followup-pill" onclick="copyLatestAssistantReply(this)">📋 复制最新回复全文</button>` : ''}
          ${followups.map(f => `<button class="followup-pill" onclick="sendQuickFollowup('${esc(f)}')">${esc(f)}</button>`).join('')}
        </div>
      `;

    const isHydratingColdNow = Boolean(s._wireTruncated && hydratingWireSessionIds.has(s.id));
    const loadEarlierHtml = isHydratingColdNow
      ? `<div style="text-align:center;font-size:12px;color:var(--muted);margin:4px 0 10px;">⏳ 正在同步完整对话内容…</div>`
      : s.omittedTranscriptCount > 0
        ? `
          <div style="display:flex;justify-content:center;margin:4px 0 10px;">
            <button
              type="button"
              class="followup-pill"
              style="font-size:12px;padding:6px 14px;"
              onclick="loadEarlierTranscript('${esc(s.hostId)}', '${esc(s.id)}', this)"
            >⬆️ 为保证秒开已省略前 ${s.omittedTranscriptCount} 条早先记录 · 点击加载完整历史</button>
          </div>
        `
        : expandedTranscriptBySession.has(s.id)
          ? `<div style="text-align:center;font-size:11.5px;color:var(--muted);margin:4px 0 10px;">✅ 已加载全部历史对话（共 ${s.transcript.length} 条）</div>`
          : '';

    // 正在往上翻历史时，新内容到达不要把用户拽回底部；否则始终稳稳锚定在最新消息底部
    const firstMsg = msgs[0];
    const nextFirstMsgSig = firstMsg ? `${firstMsg.role}:${String(firstMsg.text || '').slice(0, 36)}` : '';
    const prevFirstMsgSig = lastFirstMsgSigBySession.get(s.id) || '';
    lastFirstMsgSigBySession.set(s.id, nextFirstMsgSig);
    const stalledNoticeHtml = s.isStalledMidTurn && !s.approvalObj
      ? `<div class="chat-stalled-notice">⚠️ 本轮执行停在工具步骤后未输出最终回复（可能是电脑端网络断流或任务中断）。可点击下方「▶ 继续执行下一步」让 AI 接着完成。</div>`
      : '';
    box.innerHTML = loadEarlierHtml + bubblesHtml + stalledNoticeHtml + sessionArtifactsHtml + filesChangedHtml + approvalCardHtml + followupsHtml;
    void hydrateInlineChatImages(s, box);
    if (sessionSwitched || chatPinnedToBottom) {
      pinChatToBottomImmediate(box);
    } else {
      programmaticChatScrollUntil = Date.now() + 150;
      // 若顶部新加载了早先历史记录（loadEarlierTranscript），按底部相对距离补偿，保持当前阅读段落纹丝不动
      if (prevFirstMsgSig && nextFirstMsgSig !== prevFirstMsgSig && box.scrollHeight > prevScrollHeight) {
        box.scrollTop = Math.max(0, prevScrollTop + (box.scrollHeight - prevScrollHeight));
      } else {
        box.scrollTop = prevScrollTop;
      }
      lastChatScrollTop = box.scrollTop;
      setScrollBottomVisible(true);
    }
    lastRenderedChatSessionId = s.id;
    if (langPref === 'en') {
      applyLangToDom(document.getElementById('chatFullscreen') || document.body, langPref);
    }
  }

  async function hydrateColdSessionTranscript(hostId, sessionId, sessionRev = '') {
    if (!hostId || !sessionId || hydratingWireSessionIds.has(sessionId)) return;
    const existing = hydratedWireTranscriptBySession.get(sessionId);
    if (existing && (!sessionRev || existing.sessionRev === sessionRev || (Date.now() - (existing.fetchedAt || 0) < 8000))) return;
    hydratingWireSessionIds.add(sessionId);
    try {
      const res = await apiFetch(
        `/api/hosts/${encodeURIComponent(hostId)}/sessions/${encodeURIComponent(sessionId)}/transcript`
      );
      const data = await res.json();
      if (data?.ok && Array.isArray(data.transcript) && data.transcript.length > 0) {
        hydratedWireTranscriptBySession.set(sessionId, {
          transcript: data.transcript,
          sessionRev: data.sessionRev || sessionRev || '',
          fetchedAt: Date.now(),
        });
      }
    } catch {
      // 静默按需回填云端完整会话缓存，失败时保留预览不打扰用户
    } finally {
      hydratingWireSessionIds.delete(sessionId);
      if (activeSessionId === sessionId || triageCtrl?.isOpen()) {
        lastRenderedChatKey = '';
        renderAll();
        if (activeSessionId === sessionId && chatPinnedToBottom) {
          scheduleChatPaintAndScrollSync(sessionId);
        }
      }
    }
  }

  async function loadEarlierTranscript(hostId, sessionId, btnEl) {
    if (!hostId || !sessionId) return;
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ 正在拉取完整历史对话...';
    }
    try {
      const currentSess = findSessionGlobal(sessionId)?.session;
      const currentLen = currentSess?.transcript?.length || 0;
      const res = await apiFetch(
        `/api/hosts/${encodeURIComponent(hostId)}/sessions/${encodeURIComponent(sessionId)}/transcript`
      );
      const data = await res.json();
      const totalExpected = Math.max(
        Number(data?.totalCount) || 0,
        Number(currentSess?.totalTranscriptCount) || 0
      );
      const hasCompleteInCloud =
        data?.ok &&
        Array.isArray(data.transcript) &&
        data.transcript.length > currentLen &&
        data.hasMore !== true &&
        (totalExpected === 0 || data.transcript.length >= totalExpected);

      if (hasCompleteInCloud) {
        expandedTranscriptBySession.set(sessionId, {
          transcript: data.transcript,
          totalCount: totalExpected || data.transcript.length,
          fetchedAt: Date.now(),
        });
        lastRenderedChatKey = '';
        renderAll();
        showToast(`✅ 已加载完整历史（共 ${data.transcript.length} 条）`);
        return;
      }
      // 云端仅缓存了裁剪后的近期消息（如磁盘 DSH 会话仅上报 14 条），向本机 Daemon 请求磁盘全量历史
      const cmdRes = await dispatchHostCommand(hostId, {
        type: 'load_full_transcript',
        agentId: sessionId,
        maxMessages: 300,
      });
      const cmdId = cmdRes?.command?.id;
      if (cmdId) {
        for (let i = 0; i < 14; i++) {
          await new Promise(r => setTimeout(r, 350));
          const pollRes = await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`);
          const pollData = await pollRes.json();
          if (pollData?.ready && Array.isArray(pollData?.result?.transcript)) {
            expandedTranscriptBySession.set(sessionId, {
              transcript: pollData.result.transcript,
              totalCount: Number(pollData.result.totalCount) || pollData.result.transcript.length,
              fetchedAt: Date.now(),
            });
            lastRenderedChatKey = '';
            renderAll();
            showToast(`✅ 已从电脑加载完整历史（共 ${pollData.result.transcript.length} 条）`);
            return;
          }
        }
      }
      if (data?.ok && Array.isArray(data.transcript) && data.transcript.length > currentLen) {
        expandedTranscriptBySession.set(sessionId, {
          transcript: data.transcript,
          totalCount: totalExpected || data.transcript.length,
          fetchedAt: Date.now(),
        });
        lastRenderedChatKey = '';
        renderAll();
        showToast(`✅ 已加载云端可用历史（共 ${data.transcript.length} 条）`);
        return;
      }
      showToast('ℹ️ 当前已是最新可用历史记录');
    } catch (err) {
      showToast('❌ 加载历史失败：' + (err?.message || err));
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
      }
    }
  }

  function scrollToChatBottom() {
    chatPinnedToBottom = true;
    const box = document.getElementById('chatMessages');
    if (box) {
      programmaticChatScrollUntil = Date.now() + 450;
      if (typeof box.scrollTo === 'function') {
        box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
      } else {
        box.scrollTop = box.scrollHeight;
      }
      lastChatScrollTop = box.scrollTop;
    }
    setScrollBottomVisible(false);
  }

  function setScrollBottomVisible(visible) {
    const btn = document.getElementById('scrollBottomBtn');
    if (!btn) return;
    // 只在会话页打开时浮出，避免轮询刷新时按钮飘到列表页上
    const chatOpen = document.getElementById('chatFullscreen')?.classList.contains('open');
    btn.style.display = visible && chatOpen ? 'flex' : 'none';
  }

  function setupChatScrollWatcher() {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    let gestureStartY = 0;
    box.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        gestureStartY = e.touches[0].clientY;
      }
    }, { passive: true });
    box.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length === 1) {
        const dy = e.touches[0].clientY - gestureStartY;
        // dy > 10 表示手指向下拖（页面向上滚去看早先历史消息）
        if (dy > 10) {
          lastUserUpwardGestureAt = Date.now();
        }
      }
    }, { passive: true });
    box.addEventListener('wheel', (e) => {
      if (e.deltaY < -4) {
        lastUserUpwardGestureAt = Date.now();
      }
    }, { passive: true });

    box.addEventListener('scroll', () => {
      const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
      if (dist < 48) {
        chatPinnedToBottom = true;
        setScrollBottomVisible(false);
      } else if (
        Date.now() >= programmaticChatScrollUntil &&
        Date.now() - lastUserUpwardGestureAt < 1600 &&
        box.scrollTop < lastChatScrollTop - 4 &&
        dist >= 96
      ) {
        chatPinnedToBottom = false;
        setScrollBottomVisible(true);
      }
      lastChatScrollTop = box.scrollTop;
    }, { passive: true });

    // 捕获阶段监听消息流内所有 <img> / <iframe> 异步解码完成：
    // 只要用户当前处于底部阅读状态（未手动上滑翻历史），前序图片撑高布局时立即同步贴底，彻底根治跳回早期消息！
    box.addEventListener('load', () => {
      if (!chatPinnedToBottom || chatTouchDownAt > 0) return;
      pinChatToBottomImmediate(box);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (chatPinnedToBottom && chatTouchDownAt === 0) {
            pinChatToBottomImmediate(box);
          }
        });
      }
    }, true);

    if (typeof ResizeObserver === 'function') {
      try {
        const ro = new ResizeObserver(() => {
          if (chatPinnedToBottom && chatTouchDownAt === 0) {
            pinChatToBottomImmediate(box);
          }
        });
        ro.observe(box);
      } catch { }
    }
  }

  // ==================== 6. 发送指令 / 实时插话 / 停止 / 审批 ====================
  async function apiFetchWithTimeout(path, options = {}, timeoutMs = 10000) {
    const canAbort = typeof AbortController === 'function';
    const ctrl = canAbort ? new AbortController() : null;
    const timer = ctrl
      ? setTimeout(() => {
        try {
          ctrl.abort();
        } catch { }
      }, timeoutMs)
      : null;
    try {
      return await apiFetch(path, {
        cache: 'no-store',
        ...options,
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  let inFlightCommandCount = 0;
  let imagePickerActiveUntil = 0;
  const INFLIGHT_OUTBOX_KEY = 'dsh_inflight_outbox_v1';

  function saveInflightOutboxEntry(entry) {
    if (!entry?.cmdId) return;
    try {
      const raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
      const map = raw ? JSON.parse(raw) || {} : {};
      map[entry.cmdId] = entry;
      sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
    } catch { }
  }

  function removeInflightOutboxEntry(cmdId) {
    if (!cmdId) return;
    try {
      const raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
      if (!raw) return;
      const map = JSON.parse(raw) || {};
      if (Object.prototype.hasOwnProperty.call(map, cmdId)) {
        delete map[cmdId];
        sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
      }
    } catch { }
  }

  async function dispatchHostCommand(hostId, payload) {
    const cmdPayload =
      payload && typeof payload === 'object' && !payload.id
        ? { ...payload, id: `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }
        : payload;
    const hasAttachments =
      Array.isArray(cmdPayload?.attachments) && cmdPayload.attachments.length > 0;
    const timeoutMs = hasAttachments ? 45000 : 12000;
    const reqInit = {
      method: 'POST',
      body: JSON.stringify(cmdPayload),
    };
    const url = `/api/hosts/${encodeURIComponent(hostId)}/command`;
    inFlightCommandCount += 1;
    try {
      try {
        const res = await apiFetchWithTimeout(url, reqInit, timeoutMs);
        return await res.json();
      } catch (err) {
        if (err && err.message === 'Unauthorized') throw err;
        // iOS Safari / PWA 从后台唤醒、长连接轮转或代理偶发卡包时，带超时中断后使用相同幂等 id 自动重试一次，
        // 防止无超时大 POST 卡死 WebKit 复用的单条 HTTP/2 连接。
        await new Promise(r => setTimeout(r, 250));
        const retryRes = await apiFetchWithTimeout(url, reqInit, timeoutMs);
        return await retryRes.json();
      }
    } finally {
      inFlightCommandCount = Math.max(0, inFlightCommandCount - 1);
    }
  }

  // ---- 输入框：多行、自动增高、按会话存草稿（含已送达消息自愈去重与 iOS 键盘语音残影拦截） ----
  let composerSessionId = '';
  let composerDraftTimer = null;
  let lastSentComposerGuard = { sessionId: '', text: '', at: 0 };

  function composerDraftKey(sessionId) {
    return 'dsh_draft_v1_' + sessionId;
  }

  function composerDraftMetaKey(sessionId) {
    return 'dsh_draft_meta_v1_' + sessionId;
  }

  function readComposerDraft(sessionId) {
    if (!sessionId) return '';
    try { return localStorage.getItem(composerDraftKey(sessionId)) || ''; } catch { return ''; }
  }

  function readComposerDraftMeta(sessionId) {
    if (!sessionId) return null;
    try {
      const raw = localStorage.getItem(composerDraftMetaKey(sessionId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearComposerDraft(sessionId) {
    clearTimeout(composerDraftTimer);
    composerDraftTimer = null;
    if (!sessionId) return;
    try {
      localStorage.removeItem(composerDraftKey(sessionId));
      localStorage.removeItem(composerDraftMetaKey(sessionId));
    } catch { }
  }

  function computeSessionWireBaseline(sessionId, rawDraftText) {
    const cleanText = String(rawDraftText || '').trim();
    const found = sessionId ? findSessionGlobal(sessionId) : null;
    const wireTr = Array.isArray(found?.session?._wireTranscript) ? found.session._wireTranscript : [];
    const wireSameCount = cleanText
      ? wireTr.filter(m => m && m.role === 'user' && matchesOptimisticUserText(m.text, cleanText)).length
      : 0;
    const wireTotalCount = Number(found?.session?._wireTotalCount) || wireTr.length;
    return { wireSameCount, wireTotalCount };
  }

  function writeComposerDraftValue(sessionId, rawValue, metaOverrides = null) {
    if (!sessionId) return;
    const strVal = String(rawValue ?? '');
    const trimmed = strVal.trim();
    try {
      if (!trimmed) {
        localStorage.removeItem(composerDraftKey(sessionId));
        localStorage.removeItem(composerDraftMetaKey(sessionId));
        return;
      }
      localStorage.setItem(composerDraftKey(sessionId), strVal);
      const prevMeta = readComposerDraftMeta(sessionId);
      let meta;
      if (metaOverrides && typeof metaOverrides === 'object') {
        meta = {
          text: trimmed,
          wireSameCount: Number(metaOverrides.wireSameCount ?? 0),
          wireTotalCount: Number(metaOverrides.wireTotalCount ?? 0),
          savedAt: Number(metaOverrides.savedAt || Date.now()),
          fromErrorRestore: Boolean(metaOverrides.fromErrorRestore),
          cmdId: String(metaOverrides.cmdId || ''),
        };
      } else if (prevMeta && prevMeta.text === trimmed && !prevMeta.fromErrorRestore) {
        meta = prevMeta;
      } else {
        const base = computeSessionWireBaseline(sessionId, trimmed);
        meta = {
          text: trimmed,
          wireSameCount: base.wireSameCount,
          wireTotalCount: base.wireTotalCount,
          savedAt: Date.now(),
          fromErrorRestore: false,
          cmdId: '',
        };
      }
      localStorage.setItem(composerDraftMetaKey(sessionId), JSON.stringify(meta));
    } catch { }
  }

  function persistComposerDraft(sessionId = composerSessionId) {
    if (!sessionId) return;
    const input = document.getElementById('globalPromptInput');
    if (!input) return;
    const val = String(input.value || '');
    // 防止刚点完发送（如切换后台/触发 pagehide）把 iOS 输入法延迟回写的已发送旧句重新落盘
    if (
      val.trim() &&
      lastSentComposerGuard.sessionId === sessionId &&
      Date.now() - lastSentComposerGuard.at < 2000 &&
      val.trim() === lastSentComposerGuard.text
    ) {
      input.value = '';
      clearComposerDraft(sessionId);
      return;
    }
    writeComposerDraftValue(sessionId, val);
  }

  function hasCommandOrPromptDelivered(session, host, cmdId, rawPromptText, baselineSameCount, baselineTotalCount) {
    if (!session) return false;
    if (cmdId && host) {
      const inPending = (host.pendingCommands || []).some(c => c && c.id === cmdId);
      const inFlight = (host.inflightCommands || []).some(c => c && c.id === cmdId);
      const okRecent = (host.recentResults || []).some(
        r => r && r.id === cmdId && r.ok !== false && !r.cancelled && !r.expired
      );
      if (inPending || inFlight || okRecent) return true;
    }
    const cleanText = String(rawPromptText || '').trim();
    if (!cleanText) return false;
    const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
    const wireTotal = Number(session._wireTotalCount) || wireTr.length;
    return hasOptimisticSyncedToWire(wireTr, wireTotal, {
      text: cleanText,
      rawText: cleanText,
      baselineSameUserCount: typeof baselineSameCount === 'number' ? baselineSameCount : 0,
      baselineTotalCount: typeof baselineTotalCount === 'number' ? baselineTotalCount : 0,
    });
  }

  function reconcileDeliveredComposerDraft(session, host) {
    if (!session || !session.id) return;
    const sid = session.id;
    const draftVal = readComposerDraft(sid);
    const trimmed = String(draftVal || '').trim();
    if (!trimmed) return;

    const meta = readComposerDraftMeta(sid);
    let delivered = false;
    if (meta && meta.text === trimmed) {
      delivered = hasCommandOrPromptDelivered(
        session,
        host,
        meta.cmdId || '',
        trimmed,
        meta.wireSameCount,
        meta.wireTotalCount
      );
    } else {
      // 兼容清理 v0.7.6 及更早版本遗留在手机 localStorage 中（无 meta 记录）且已出现在会话历史里的旧消息
      const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
      const fullTr =
        expandedTranscriptBySession.get(sid)?.transcript?.length > wireTr.length
          ? expandedTranscriptBySession.get(sid).transcript
          : wireTr;
      const userMsgs = fullTr.filter(m => m && m.role === 'user');
      const tailUserMsgs = userMsgs.slice(-2);
      if (
        (trimmed.length >= 2 && tailUserMsgs.some(m => matchesOptimisticUserText(m.text, trimmed))) ||
        (trimmed.length >= 8 && userMsgs.some(m => matchesOptimisticUserText(m.text, trimmed)))
      ) {
        delivered = true;
      } else {
        writeComposerDraftValue(sid, draftVal);
      }
    }

    if (!delivered) return;

    clearComposerDraft(sid);
    if (meta?.fromErrorRestore) {
      clearChatAttachmentList(sid);
      if ((composerSessionId || activeSessionId) === sid) {
        renderAttachmentStrip('chat');
      }
    }
    const input = document.getElementById('globalPromptInput');
    if (
      input &&
      (composerSessionId === sid || activeSessionId === sid) &&
      String(input.value || '').trim() === trimmed &&
      (meta?.fromErrorRestore || (typeof document !== 'undefined' && document.activeElement !== input))
    ) {
      input.value = '';
      input.style.height = '';
      autoGrowComposer();
    }
  }

  function autoGrowComposer(event) {
    const input = document.getElementById('globalPromptInput');
    if (!input || input.tagName !== 'TEXTAREA') return;
    if (
      event &&
      event.isComposing &&
      !String(input.value || '').includes('\n') &&
      input.scrollHeight <= (input.clientHeight || 28) + 2
    ) {
      return;
    }
    input.style.height = 'auto';
    const fullHeight = input.scrollHeight || 24;
    input.style.height = Math.min(fullHeight, 132) + 'px';
    input.style.overflowY = fullHeight > 132 ? 'auto' : 'hidden';
  }

  function onComposerInput(event) {
    const input = document.getElementById('globalPromptInput');
    const activeSid = composerSessionId || activeSessionId;
    if (
      input &&
      lastSentComposerGuard.sessionId &&
      lastSentComposerGuard.sessionId === activeSid &&
      Date.now() - lastSentComposerGuard.at < 2000 &&
      event?.inputType !== 'insertFromPaste'
    ) {
      const curVal = String(input.value || '').trim();
      const unfocusedGhostCommit =
        typeof document !== 'undefined' &&
        document.activeElement &&
        document.activeElement !== input &&
        Boolean(curVal);
      const exactEchoCommit =
        lastSentComposerGuard.text.length >= 2 && curVal === lastSentComposerGuard.text;
      if (unfocusedGhostCommit || exactEchoCommit) {
        input.value = '';
        clearComposerDraft(activeSid);
        autoGrowComposer();
        return;
      }
    }
    autoGrowComposer(event);
    clearTimeout(composerDraftTimer);
    composerDraftTimer = setTimeout(() => persistComposerDraft(), 250);
  }

  function onComposerKeydown(event) {
    if (event.key !== 'Enter') return;
    if (!shouldSendOnEnter({
      shiftKey: event.shiftKey,
      // Safari 输入法确认候选词时 keyCode 也是 229，不能误发
      isComposing: event.isComposing || event.keyCode === 229,
      coarsePointer: composerUsesCoarsePointer(),
    })) return;
    event.preventDefault();
    sendPromptToActiveSession();
  }

  function switchComposerSession(nextSessionId) {
    const input = document.getElementById('globalPromptInput');
    if (!input) return;
    if (composerSessionId === nextSessionId) return;
    stopVoiceInput();
    stopAssistantSpeech();
    if (composerSessionId) {
      persistComposerDraft(composerSessionId);
      persistChatAttachmentsDraft(composerSessionId);
    }
    composerSessionId = nextSessionId || '';
    input.value = readComposerDraft(composerSessionId);
    input.style.height = '';
    autoGrowComposer();
    renderAttachmentStrip('chat');
    if (
      (String(input.value || '').trim().length > 0 || getAttachmentList('chat').length > 0) &&
      isWechatVoiceMode()
    ) {
      setWechatVoiceMode(false, false, false);
    }
  }

  // ---- 截图 / 照片上传（客户端 Canvas 自动缩放压缩 + 按会话独立隔离未发草稿） ----
  const MAX_COMPOSER_ATTACHMENTS = 4;
  const chatAttachmentsBySession = new Map();
  const composerAttachments = {
    newTask: [],
  };

  function composerAttachmentDraftKey(sessionId) {
    return 'dsh_attach_draft_v1_' + sessionId;
  }

  function resolveChatAttachmentSessionKey(explicitSessionId = '') {
    return String(explicitSessionId || composerSessionId || activeSessionId || '_default');
  }

  function persistChatAttachmentsDraft(sessionId = '') {
    const sid = resolveChatAttachmentSessionKey(sessionId);
    if (!sid || sid === '_default') return;
    const list = chatAttachmentsBySession.get(sid) || [];
    try {
      if (list.length > 0) {
        const serializable = list.map(item => ({
          name: item.name || 'screenshot.jpg',
          mimeType: item.mimeType || 'image/jpeg',
          dataBase64: item.dataBase64 || '',
          sizeBytes: Number(item.sizeBytes || 0),
        }));
        sessionStorage.setItem(composerAttachmentDraftKey(sid), JSON.stringify(serializable));
      } else {
        sessionStorage.removeItem(composerAttachmentDraftKey(sid));
      }
    } catch {
      // sessionStorage quota exceeded — in-memory chatAttachmentsBySession Map still isolates sessions cleanly
    }
  }

  function getAttachmentList(target = 'chat', explicitSessionId = '') {
    if (target === 'newTask') return composerAttachments.newTask;
    const sid = resolveChatAttachmentSessionKey(explicitSessionId);
    if (!chatAttachmentsBySession.has(sid)) {
      let restored = [];
      if (sid !== '_default') {
        try {
          const raw = sessionStorage.getItem(composerAttachmentDraftKey(sid));
          const parsed = raw ? JSON.parse(raw) : null;
          if (Array.isArray(parsed)) {
            restored = parsed
              .filter(item => item && item.dataBase64)
              .map(item => {
                const b64 = String(item.dataBase64 || '');
                const mime = String(item.mimeType || 'image/jpeg');
                return {
                  name: item.name || 'screenshot.jpg',
                  mimeType: mime,
                  dataBase64: b64,
                  sizeBytes: Number(item.sizeBytes || 0),
                  previewUrl: b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`,
                };
              });
          }
        } catch {
          restored = [];
        }
      }
      chatAttachmentsBySession.set(sid, restored);
    }
    return chatAttachmentsBySession.get(sid);
  }

  function clearChatAttachmentList(sessionId = '') {
    const sid = resolveChatAttachmentSessionKey(sessionId);
    chatAttachmentsBySession.set(sid, []);
    try {
      if (sid && sid !== '_default') {
        sessionStorage.removeItem(composerAttachmentDraftKey(sid));
      }
    } catch { }
  }

  function triggerImagePicker(target = 'chat') {
    if (target === 'chat') {
      const curSess = findSessionGlobal(activeSessionId)?.session;
      if (curSess && curSess.controlMode === 'observe-only' && curSess.harness !== 'dsh') {
        showToast('👀 当前会话为观察模式（仅支持查看对话记录）');
        return;
      }
    }
    imagePickerActiveUntil = Date.now() + 90000;
    const inputId = target === 'newTask' ? 'newTaskImageInput' : 'chatImageInput';
    const el = document.getElementById(inputId);
    if (el) {
      el.value = '';
      el.click();
    }
  }

  function renderAttachmentStrip(target = 'chat') {
    const stripId = target === 'newTask' ? 'newTaskAttachmentsStrip' : 'composerAttachmentsStrip';
    const strip = document.getElementById(stripId);
    if (!strip) return;
    const list = getAttachmentList(target);
    if (target === 'chat') {
      const card = document.getElementById('composerUnifiedCard');
      if (card && card.classList) {
        card.classList.toggle('has-attachments', list.length > 0);
      }
    }
    if (!list.length || (target === 'chat' && desktopStageMode === 'code')) {
      strip.style.display = 'none';
      strip.innerHTML = '';
      return;
    }
    strip.style.display = 'flex';
    strip.innerHTML = list.map((item, idx) => `
        <div class="attachment-thumb-item">
          <img class="attachment-thumb-img" src="${esc(item.previewUrl)}" alt="${esc(item.name)}" />
          <span class="attachment-thumb-meta">${esc(formatBytes(item.sizeBytes || 0))}</span>
          <button
            type="button"
            class="attachment-thumb-remove"
            title="移除截图"
            onclick="removeComposerAttachment('${target === 'newTask' ? 'newTask' : 'chat'}', ${idx})"
          >✕</button>
        </div>
      `).join('');
  }

  function removeComposerAttachment(target = 'chat', index = 0) {
    const list = getAttachmentList(target);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
    }
    if (target === 'chat') persistChatAttachmentsDraft();
    renderAttachmentStrip(target);
  }

  async function addFilesToComposer(files, target = 'chat') {
    const list = getAttachmentList(target);
    const candidates = Array.from(files || []).filter(f =>
      f && ((f.type && f.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|heic)$/i.test(f.name || ''))
    );
    if (!candidates.length) {
      showToast('⚠️ 请选择 PNG / JPG / WebP 截图或照片');
      return;
    }
    const remaining = MAX_COMPOSER_ATTACHMENTS - list.length;
    if (remaining <= 0) {
      showToast(`⚠️ 单次最多附带 ${MAX_COMPOSER_ATTACHMENTS} 张截图`);
      return;
    }
    const selected = candidates.slice(0, remaining);
    let addedCount = 0;
    let totalSize = 0;
    for (const file of selected) {
      try {
        const compressed = await compressImageFile(file);
        if (compressed && compressed.dataBase64) {
          list.push(compressed);
          addedCount += 1;
          totalSize += compressed.sizeBytes || 0;
        }
      } catch (err) {
        showToast('❌ 处理图片失败：' + (err?.message || err));
      }
    }
    if (target === 'chat') persistChatAttachmentsDraft();
    renderAttachmentStrip(target);
    if (addedCount > 0) {
      showToast(`🖼️ 已添加 ${addedCount} 张截图（已自动优化至 ${formatBytes(totalSize)}）`);
    }
  }

  async function onChatImageSelected(event, target = 'chat') {
    imagePickerActiveUntil = 0;
    const files = event?.target?.files;
    if (files && files.length > 0) {
      await addFilesToComposer(files, target);
    }
    if (event?.target) {
      event.target.value = '';
    }
  }

  async function onComposerPaste(event, target = 'chat') {
    const items = event?.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      event.preventDefault();
      await addFilesToComposer(imageFiles, target);
    }
  }

  window.addEventListener('pagehide', () => {
    persistComposerDraft();
    stopVoiceInput();
    closeSSE();
  });
  window.addEventListener('beforeunload', () => {
    closeSSE();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      persistComposerDraft();
      stopVoiceInput();
    } else if (document.visibilityState === 'visible') {
      fetchState();
      if (!sseConnected || Date.now() - lastSseEventAt > 15000) {
        connectSSE();
      }
    }
  });

  async function cancelQueuedCommand(cmdId) {
    if (!cmdId) return;
    try {
      const res = await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        const optMap = ensureOptimisticMsgsMap();
        for (const sid of Object.keys(optMap)) {
          optMap[sid] = (optMap[sid] || []).filter(item => item.cmdId !== cmdId);
          if (optMap[sid].length === 0) delete optMap[sid];
        }
        persistOptimisticMsgsMap();
        showToast('🗑️ 已取消排队中的指令');
      } else {
        showToast('⚠️ ' + (data?.error || '该指令已执行或不存在'));
      }
    } catch (err) {
      showToast('❌ 取消失败：' + (err?.message || err));
    }
    fetchState();
  }

  async function sendPromptToActiveSession() {
    const initialTargetSessionId = activeSessionId;
    if (isDictationActiveFor('globalPromptInput')) {
      await flushVoiceInputBeforeSend('globalPromptInput');
    } else {
      stopVoiceInput();
    }
    clearTimeout(composerDraftTimer);
    composerDraftTimer = null;
    const input = document.getElementById('globalPromptInput');
    const targetSessionId = initialTargetSessionId || activeSessionId;
    if (!targetSessionId) return;
    if (
      input &&
      composerUsesCoarsePointer() &&
      typeof document !== 'undefined' &&
      document.activeElement === input &&
      typeof input.blur === 'function'
    ) {
      try {
        input.blur();
      } catch { }
    }
    const rawText = input ? input.value.trim() : '';
    const activeAttachments = getAttachmentList('chat', targetSessionId);
    const pendingAttachments = activeAttachments.slice();
    if (!rawText && pendingAttachments.length === 0) return;
    const found = findSessionGlobal(targetSessionId);
    if (!found) return;
    const { session: s, host } = found;
    const canSteer = s.capabilities?.canSteer !== false && s.harness !== 'claude';
    if (s.status === 'running' && !canSteer) {
      showToast('⏳ 当前会话正在运行且不支持中途插话，请等待完成或先点击停止');
      return;
    }
    const text = rawText || '请查看我上传的截图并帮我分析处理。';
    const optimisticText = pendingAttachments.length > 0
      ? `${text}\n[🖼️ 已附带 ${pendingAttachments.length} 张截图]`
      : text;
    lastSentComposerGuard = {
      sessionId: s.id,
      text: rawText || text,
      at: Date.now(),
    };
    if (input && (!composerSessionId || composerSessionId === s.id)) {
      input.value = '';
    }
    clearChatAttachmentList(s.id);
    clearComposerDraft(s.id);
    if (composerSessionId && composerSessionId !== s.id) {
      clearChatAttachmentList(composerSessionId);
      clearComposerDraft(composerSessionId);
    }
    renderAttachmentStrip('chat');
    autoGrowComposer();
    if (consumeReturnToVoiceAfterSend()) {
      setWechatVoiceMode(true, false, false);
    }

    const clientCmdId = `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const optMap = ensureOptimisticMsgsMap();
    const wireTr = Array.isArray(s._wireTranscript) ? s._wireTranscript : [];
    const probeOpt = { text: optimisticText, rawText: text };
    const baselineSameUserCount = wireTr.filter(
      m => m && m.role === 'user' && matchesOptimisticUserText(m.text, probeOpt)
    ).length;
    const baselineTotalCount = Number(s._wireTotalCount) || wireTr.length;
    const optEntry = {
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      cmdId: clientCmdId,
      text: optimisticText,
      rawText: text,
      time: Date.now(),
      baselineSameUserCount,
      baselineTotalCount,
    };
    if (pendingAttachments.length > 0) {
      const localThumbs = pendingAttachments
        .map((a, idx) => ({
          name: a.name || `screenshot-${idx + 1}.jpg`,
          mime: a.mimeType || 'image/jpeg',
          size: Number(a.sizeBytes || 0),
          dataBase64: String(a.dataBase64 || '').replace(/^data:[^;]+;base64,/, ''),
          dataUrl: a.previewUrl || (a.dataBase64 ? (String(a.dataBase64).startsWith('data:') ? a.dataBase64 : `data:${a.mimeType || 'image/jpeg'};base64,${a.dataBase64}`) : ''),
        }))
        .filter(x => x.dataUrl);
      if (localThumbs.length > 0) {
        optimisticPreviewImagesByOptId.set(optEntry.id, localThumbs);
        if (optimisticPreviewImagesByOptId.size > 24) {
          const oldestKey = optimisticPreviewImagesByOptId.keys().next().value;
          if (oldestKey) optimisticPreviewImagesByOptId.delete(oldestKey);
        }
      }
    }
    const optList = optMap[s.id] || [];
    optList.push(optEntry);
    optMap[s.id] = optList.slice(-8);
    persistOptimisticMsgsMap();
    chatPinnedToBottom = true;
    lastRenderedChatKey = '';
    renderActiveChatStage();

    const cmdType = s.status === 'running' ? 'steer' : 'prompt';
    const isHostActivelyOnline = Boolean(host && host.online !== false && host.activelyConnected !== false);
    // 发送前写入断电/刷新保护发件箱：若上传图片中途页面被系统回收或重载，重启后自动无损恢复草稿与截图！
    saveInflightOutboxEntry({
      cmdId: clientCmdId,
      hostId: s.hostId,
      sessionId: s.id,
      rawText,
      text,
      baselineSameUserCount,
      baselineTotalCount,
      savedAt: Date.now(),
      attachments: pendingAttachments.map(a => ({
        name: a.name,
        mimeType: a.mimeType,
        dataBase64: a.dataBase64,
        sizeBytes: Number(a.sizeBytes || 0),
      })),
    });
    if (isHostActivelyOnline) {
      showToast(
        pendingAttachments.length > 0
          ? `⏳ 正在上传截图并发送 (${pendingAttachments.length} 张)…`
          : cmdType === 'steer'
            ? '⚡ 已发送实时插话'
            : '📨 已发送指令'
      );
    }
    let dispatchRes = null;
    let transportException = false;
    const chosenChatModel = selectedSessionModels[s.id] || '';
    try {
      dispatchRes = await dispatchHostCommand(s.hostId, {
        id: clientCmdId,
        type: cmdType,
        agentId: s.id,
        cwd: s.cwd || '',
        text,
        prompt: text,
        ...(chosenChatModel ? { model: chosenChatModel } : {}),
        ...(pendingAttachments.length > 0
          ? {
            attachments: pendingAttachments.map(a => ({
              name: a.name,
              mimeType: a.mimeType,
              dataBase64: a.dataBase64,
            })),
          }
          : {}),
      });
    } catch (err) {
      transportException = true;
      dispatchRes = { ok: false, error: err?.message || '网络请求失败' };
    }

    if (!dispatchRes || dispatchRes.ok === false) {
      // 手机 5G 切换/切后台锁屏时，请求体往往已抵达服务端执行，但回包被系统中断（Load failed）：
      // 先刷新核对一次服务端状态，若指令已在队列/已完成或已写入对话记录，则视为发送成功，绝不误回填输入框！
      if (transportException) {
        await fetchState({ silent: true, forceFresh: true }).catch(() => null);
      }
      const latestFound = findSessionGlobal(s.id);
      if (
        latestFound &&
        hasCommandOrPromptDelivered(
          latestFound.session,
          latestFound.host,
          clientCmdId,
          text,
          baselineSameUserCount,
          baselineTotalCount
        )
      ) {
        removeInflightOutboxEntry(clientCmdId);
        clearComposerDraft(s.id);
        scheduleFallbackStateSync();
        return;
      }

      removeInflightOutboxEntry(clientCmdId);
      optMap[s.id] = (optMap[s.id] || []).filter(item => item.id !== optEntry.id);
      persistOptimisticMsgsMap();
      lastRenderedChatKey = '';
      renderActiveChatStage();
      showToast('❌ ' + (dispatchRes?.error || '发送指令失败'));
      if (rawText) {
        writeComposerDraftValue(s.id, rawText, {
          wireSameCount: baselineSameUserCount,
          wireTotalCount: baselineTotalCount,
          savedAt: Date.now(),
          fromErrorRestore: true,
          cmdId: clientCmdId,
        });
        if (input && (composerSessionId === s.id || activeSessionId === s.id) && !input.value.trim()) {
          input.value = rawText;
          autoGrowComposer();
        }
      }
      const curSessionList = getAttachmentList('chat', s.id);
      if (pendingAttachments.length > 0 && curSessionList.length === 0) {
        curSessionList.push(...pendingAttachments);
        persistChatAttachmentsDraft(s.id);
        if (activeSessionId === s.id) renderAttachmentStrip('chat');
      }
      return;
    }

    removeInflightOutboxEntry(clientCmdId);
    if (dispatchRes.queued) {
      showToast('⏳ 电脑当前休眠/离线，指令已排队（10分钟内上线自动执行，可随时取消）');
    } else if (pendingAttachments.length > 0) {
      showToast(`🖼️ 已发送截图与指令 (${pendingAttachments.length} 张)`);
    }

    const cmdId = dispatchRes?.command?.id || clientCmdId;
    if (cmdId) {
      optEntry.cmdId = cmdId;
      persistOptimisticMsgsMap();
    }

    scheduleFallbackStateSync();

    if (cmdId) {
      (async () => {
        for (let i = 0; i < 16; i++) {
          await new Promise(r => setTimeout(r, 350));
          try {
            const res = await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`);
            const data = await res.json();
            if (data?.ready || data?.command?.status === 'completed') {
              if (data.result && data.result.ok === false) {
                optMap[s.id] = (optMap[s.id] || []).filter(item => item.id !== optEntry.id);
                persistOptimisticMsgsMap();
                lastRenderedChatKey = '';
                renderActiveChatStage();
                showToast('❌ ' + (data.result.error || data.result.message || '发送失败'));
                if (rawText) {
                  writeComposerDraftValue(s.id, rawText, {
                    wireSameCount: baselineSameUserCount,
                    wireTotalCount: baselineTotalCount,
                    savedAt: Date.now(),
                    fromErrorRestore: false,
                    cmdId: '',
                  });
                  if (input && (composerSessionId === s.id || activeSessionId === s.id) && !input.value.trim()) {
                    input.value = rawText;
                    autoGrowComposer();
                  }
                }
                const curSessionList = getAttachmentList('chat', s.id);
                if (pendingAttachments.length > 0 && curSessionList.length === 0) {
                  curSessionList.push(...pendingAttachments);
                  persistChatAttachmentsDraft(s.id);
                  if (activeSessionId === s.id) renderAttachmentStrip('chat');
                }
              }
              scheduleFallbackStateSync();
              return;
            }
          } catch { }
        }
      })();
    }
  }

  function sendQuickFollowup(text) {
    document.getElementById('globalPromptInput').value = text;
    sendPromptToActiveSession();
  }

  async function stopActiveSession() {
    const found = findSessionGlobal(activeSessionId);
    if (!found) return;
    showToast('⏹ 正在停止任务...');
    await dispatchHostCommand(found.session.hostId, {
      type: 'stop',
      agentId: found.session.id,
    });
    scheduleFallbackStateSync();
  }

  async function sendApprovalDecision(hostId, code, allow, optionIndex = 1, explicitAgentId = '') {
    window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
    if (code) {
      window.__dshSettlingApprovals[code] = {
        at: Date.now(),
        decision: allow ? 'approve' : 'deny',
      };
    }
    renderAll();
    const optLabel = optionIndex === 2
      ? '⏳ 正在同步：批准并在当前会话始终允许'
      : optionIndex === 3
        ? '⏳ 正在同步：批准并始终允许该命令'
        : allow
          ? '⏳ 正在同步批准指令到电脑端...'
          : '⏳ 正在同步拒绝指令到电脑端...';
    showToast(optLabel);
    try {
      const res = await dispatchHostCommand(hostId, {
        type: 'approval',
        code,
        agentId: explicitAgentId || activeSessionId || undefined,
        allow: Boolean(allow),
        optionIndex: Number(optionIndex) || (allow ? 1 : 4),
      });
      if (!res || res.ok === false) {
        if (res?.conflict && code && window.__dshSettlingApprovals) {
          window.__dshSettlingApprovals[code] = {
            at: Date.now(),
            decision: res.existingDecision || (allow ? 'approve' : 'deny'),
          };
          lastRenderedChatKey = '';
          renderAll();
          showToast('⚠️ ' + (res.error || '当前审批正在同步另一项决定'));
          return;
        }
        if (code && window.__dshSettlingApprovals) {
          delete window.__dshSettlingApprovals[code];
        }
        lastRenderedChatKey = '';
        renderAll();
        showToast('❌ 审批发送失败：' + (res?.error || '请重试'));
        return;
      }
    } catch (err) {
      if (code && window.__dshSettlingApprovals) {
        delete window.__dshSettlingApprovals[code];
      }
      lastRenderedChatKey = '';
      renderAll();
      showToast('❌ 审批发送异常：' + (err?.message || err));
      return;
    }
    scheduleFallbackStateSync();
  }

  function getDshQuestionDraft(code, questions = []) {
    window.__dshQuestionDrafts = window.__dshQuestionDrafts || {};
    const key = String(code || 'default');
    if (!window.__dshQuestionDrafts[key]) {
      const init = {};
      const qList = Array.isArray(questions) ? questions : [];
      qList.forEach((q, idx) => {
        const qId = String(q.id || `q_${idx + 1}`);
        const firstOpt = Array.isArray(q.options) && q.options[0]?.label ? [String(q.options[0].label)] : [];
        init[qId] = {
          selected: q.multiSelect ? [] : firstOpt,
          customText: '',
        };
      });
      window.__dshQuestionDrafts[key] = init;
    }
    return window.__dshQuestionDrafts[key];
  }

  function toggleDshQuestionOption(code, qId, label, multiSelect = false) {
    const found = findSessionGlobal(activeSessionId);
    const questions = found?.session?.approvalObj?.questions || [];
    const draft = getDshQuestionDraft(code, questions);
    const key = String(qId || 'q_1');
    if (!draft[key]) {
      draft[key] = { selected: [], customText: '' };
    }
    const cur = Array.isArray(draft[key].selected) ? [...draft[key].selected] : [];
    if (multiSelect) {
      const idx = cur.indexOf(label);
      if (idx >= 0) {
        cur.splice(idx, 1);
      } else {
        cur.push(label);
      }
      draft[key].selected = cur;
    } else {
      draft[key].selected = [label];
    }
    const card = document.querySelector(`.dsh-question-card[data-question-code="${CSS.escape(String(code))}"]`);
    if (card) {
      const btns = card.querySelectorAll(`.dsh-question-opt[data-q-id="${CSS.escape(key)}"]`);
      btns.forEach(btn => {
        const optLabel = btn.getAttribute('data-opt-label') || '';
        const isSel = draft[key].selected.includes(optLabel);
        btn.classList.toggle('selected', isSel);
        const checkEl = btn.querySelector('.dsh-question-opt-check');
        if (checkEl) {
          checkEl.textContent = multiSelect ? (isSel ? '☑' : '☐') : (isSel ? '◉' : '○');
        }
      });
    } else {
      lastRenderedChatKey = '';
      renderActiveChatStage();
    }
  }

  function onDshQuestionCustomInput(code, qId, val) {
    const found = findSessionGlobal(activeSessionId);
    const questions = found?.session?.approvalObj?.questions || [];
    const draft = getDshQuestionDraft(code, questions);
    const key = String(qId || 'q_1');
    if (!draft[key]) {
      draft[key] = { selected: [], customText: '' };
    }
    draft[key].customText = String(val ?? '');
  }

  async function submitDshQuestionAnswers(hostId, code, explicitAgentId = '') {
    const targetSessionId = explicitAgentId || activeSessionId || '';
    const found = findSessionGlobal(targetSessionId);
    const appObj = found?.session?.approvalObj;
    const questions = Array.isArray(appObj?.questions) ? appObj.questions : [];
    const draft = getDshQuestionDraft(code, questions);
    const answers = {};
    questions.forEach((q, idx) => {
      const qId = String(q.id || `q_${idx + 1}`);
      const item = draft[qId] || { selected: [], customText: '' };
      const picked = Array.isArray(item.selected) ? item.selected.filter(Boolean) : [];
      const custom = String(item.customText || '').trim();
      const combined = [...picked];
      if (custom) combined.push(custom);
      if (combined.length === 0 && Array.isArray(q.options) && q.options[0]?.label) {
        combined.push(String(q.options[0].label));
      }
      answers[qId] = q.multiSelect ? combined : (combined[0] || '');
    });

    window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
    if (code) {
      window.__dshSettlingApprovals[code] = {
        at: Date.now(),
        decision: 'approve',
      };
    }
    lastRenderedChatKey = '';
    renderAll();
    showToast('⏳ 正在将你的选择同步到电脑端...');
    try {
      const res = await dispatchHostCommand(hostId, {
        type: 'approval',
        code,
        agentId: targetSessionId || undefined,
        allow: true,
        optionIndex: 1,
        answers,
        questions,
      });
      if (!res || res.ok === false) {
        if (code && window.__dshSettlingApprovals) {
          delete window.__dshSettlingApprovals[code];
        }
        lastRenderedChatKey = '';
        renderAll();
        showToast('❌ 提交选择失败：' + (res?.error || '请重试'));
        return;
      }
    } catch (err) {
      if (code && window.__dshSettlingApprovals) {
        delete window.__dshSettlingApprovals[code];
      }
      lastRenderedChatKey = '';
      renderAll();
      showToast('❌ 提交选择异常：' + (err?.message || err));
      return;
    }
    scheduleFallbackStateSync();
  }

  // ==================== 7. 聊天内「📂 文件速览浮层抽屉」 ====================
  const FILES_CARD_STATE_KEY = 'dsh_files_card_state_v1';
  const artifactsExpandedSessionIds = new Set();
  const filesExpandedSessionIds = new Set();
  const filesCardReviewedSigBySession = new Map();
  let drawerChangedFilesSessionId = null;

  (function restoreFilesCardState() {
    try {
      const raw = JSON.parse(localStorage.getItem(FILES_CARD_STATE_KEY) || '{}');
      if (raw && typeof raw === 'object' && raw.reviewed && typeof raw.reviewed === 'object') {
        for (const [k, v] of Object.entries(raw.reviewed)) {
          if (typeof v === 'string' && v) filesCardReviewedSigBySession.set(k, v);
        }
      }
    } catch { }
  })();

  function persistFilesCardState() {
    try {
      const reviewed = {};
      Array.from(filesCardReviewedSigBySession.entries()).slice(-60).forEach(([k, v]) => { reviewed[k] = v; });
      localStorage.setItem(FILES_CARD_STATE_KEY, JSON.stringify({ reviewed }));
    } catch { }
  }

  function computeChangedFilesMeta(changedFiles) {
    if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
      return { totalAdd: 0, totalDel: 0, sig: '' };
    }
    let totalAdd = 0;
    let totalDel = 0;
    const names = [];
    for (const fc of changedFiles) {
      totalAdd += Number(fc?.added || 0);
      totalDel += Number(fc?.removed || 0);
      if (fc?.name) names.push(fc.name);
    }
    return {
      totalAdd,
      totalDel,
      sig: `${changedFiles.length}:${totalAdd}:${totalDel}:${names.slice(-3).join(',')}`,
    };
  }

  function toggleSessionArtifactsCard(sessionId) {
    const sid = String(sessionId || activeSessionId || '');
    if (!sid) return;
    if (artifactsExpandedSessionIds.has(sid)) {
      artifactsExpandedSessionIds.delete(sid);
    } else {
      artifactsExpandedSessionIds.add(sid);
    }
    lastRenderedChatKey = '';
    renderActiveChatStage();
  }

  function toggleFilesChangedCard(sessionId) {
    const sid = String(sessionId || activeSessionId || '');
    if (!sid) return;
    if (filesExpandedSessionIds.has(sid)) {
      filesExpandedSessionIds.delete(sid);
    } else {
      filesExpandedSessionIds.add(sid);
    }
    lastRenderedChatKey = '';
    renderActiveChatStage();
  }

  function reviewFilesChangedCard(sessionId, sig) {
    const sid = String(sessionId || activeSessionId || '');
    if (!sid) return;
    const found = findSessionGlobal(sid);
    const files = Array.isArray(found?.session?.changedFiles) ? found.session.changedFiles : [];
    const effectiveSig = String(sig || computeChangedFilesMeta(files).sig || '');
    if (!effectiveSig) return;
    filesCardReviewedSigBySession.set(sid, effectiveSig);
    filesExpandedSessionIds.delete(sid);
    persistFilesCardState();
    lastRenderedChatKey = '';
    renderActiveChatStage();
    showToast(`✅ 已确认 ${files.length} 个文件改动`);
  }

  function openChangedFilesDrawer(sessionId) {
    const sid = String(sessionId || activeSessionId || '');
    const found = findSessionGlobal(sid);
    if (!found) return;
    if (found.host) {
      delete pinnedDrawerPreviewByHost[found.host.hostId];
      if (found.host.lastFilePreview) {
        found.host.lastFilePreview._showInDrawer = false;
      }
    }
    filePreviewLoading = null;
    fileProjectCwd = found.session.cwd || '';
    drawerChangedFilesSessionId = found.session.id;
    openSheet('inChatFileSheet');
    document.body.classList.add('mobile-file-open');
    const titleEl = document.getElementById('inChatFileTitle');
    if (titleEl) {
      titleEl.textContent = `📝 ${found.session.project} · 改动文件 (${(found.session.changedFiles || []).length})`;
    }
    renderInChatFileDrawerBody();
  }

  async function openInChatFileDrawer() {
    const found = findSessionGlobal(activeSessionId);
    if (!found) return;
    drawerChangedFilesSessionId = null;
    if (found.host) {
      delete pinnedDrawerPreviewByHost[found.host.hostId];
      if (found.host.lastFilePreview) {
        found.host.lastFilePreview._showInDrawer = false;
      }
    }
    filePreviewLoading = null;
    fileProjectCwd = found.session.cwd || '';
    fileSubDir = '';
    openSheet('inChatFileSheet');
    document.body.classList.add('mobile-file-open');
    document.getElementById('inChatFileTitle').textContent = `📂 ${found.session.project} (${found.session.hostName})`;
    await requestDirList(found.session.hostId, found.session.id, fileProjectCwd, '', true);
  }

  function toWorkspaceRelPath(cwd, rawPath) {
    let clean = String(rawPath || '').replace(/^file:\/\//i, '').replace(/#L\d+(?:-L?\d+)?$/i, '').trim();
    const cleanCwd = String(cwd || '').replace(/\/+$/, '').trim();
    if (cleanCwd && clean.startsWith(cleanCwd + '/')) {
      return clean.slice(cleanCwd.length + 1);
    }
    return clean;
  }

  async function openChatFileLink(encodedPath, opts = {}) {
    let rawPath = String(encodedPath || '').trim();
    try {
      rawPath = decodeURIComponent(rawPath);
    } catch { }
    if (!rawPath) return;
    const effectiveSid =
      (!document.getElementById('chatFullscreen')?.classList.contains('open') &&
        triageCtrl?.isOpen() &&
        triageCtrl?.getTopSessionId?.()) ||
      activeSessionId;
    const found = findSessionGlobal(effectiveSid);
    if (!found) return;
    drawerChangedFilesSessionId = null;
    const sessionArts = Array.isArray(found.session.artifacts) ? found.session.artifacts : [];
    const cleanLookup = rawPath.replace(/^file:\/\//i, '').replace(/#L\d+(?:-L?\d+)?$/i, '').trim();
    if (!cleanLookup.startsWith('/') && sessionArts.length > 0) {
      const matchedArt = sessionArts.find(
        a => a?.path && (a.name?.toLowerCase() === cleanLookup.toLowerCase() || a.path.endsWith('/' + cleanLookup))
      );
      if (matchedArt?.path) {
        rawPath = matchedArt.path;
      }
    }
    fileProjectCwd = found.session.cwd || '';
    const relPath = toWorkspaceRelPath(fileProjectCwd, rawPath);
    const backupRelPath = opts?.backupRelPath
      ? toWorkspaceRelPath(fileProjectCwd, String(opts.backupRelPath))
      : '';
    const baseName = relPath.split('/').filter(Boolean).pop() || relPath || 'file';
    openSheet('inChatFileSheet');
    document.body.classList.add('mobile-file-open');
    const titleEl = document.getElementById('inChatFileTitle');
    if (titleEl) {
      titleEl.textContent = `📂 ${found.session.project} (${found.session.hostName})`;
    }
    if (/\.(blend|blend1|fbx|obj|glb|gltf|dae|abc|usd|usdz|zip|tar|gz|dmg|pkg)$/i.test(baseName)) {
      const ext = '.' + (baseName.split('.').pop() || '').toLowerCase();
      found.host.lastFilePreview = {
        at: Date.now(),
        agentId: found.session.id,
        relPath,
        name: baseName,
        ext,
        size: 0,
        kind: 'binary',
        mime: 'application/octet-stream',
        _showInDrawer: true,
        _showInMain: false,
      };
      pinnedDrawerPreviewByHost[found.session.hostId] = found.host.lastFilePreview;
      filePreviewLoading = null;
      renderInChatFileDrawerBody();
      return;
    }
    await clickRealFileEntry(found.session.hostId, found.session.id, fileProjectCwd, relPath, false, true, {
      ...(backupRelPath ? { backupRelPath } : {}),
    });
  }

  async function hydrateInlineChatImages(session, containerEl) {
    if (!session || !containerEl) return;
    const mt = hubState.mediaTicket || '';
    const sessionArts = Array.isArray(session.artifacts) ? session.artifacts : [];
    const resolveLocalRelPath = rawLocalPath => {
      let target = String(rawLocalPath || '').trim();
      if (!target.startsWith('/') && sessionArts.length > 0) {
        const matched = sessionArts.find(
          a => a?.path && (a.name?.toLowerCase() === target.toLowerCase() || a.path.endsWith('/' + target))
        );
        if (matched?.path) target = matched.path;
      }
      return toWorkspaceRelPath(session.cwd || '', target);
    };

    const pendingVideos = Array.from(containerEl.querySelectorAll('.md-local-video-pending[data-local-video-path]'));
    if (pendingVideos.length > 0) {
      window.__dshInlineVideoCache = window.__dshInlineVideoCache || {};
      for (const vNode of pendingVideos) {
        const vPath = vNode.getAttribute('data-local-video-path') || '';
        if (!vPath) continue;
        const relPath = resolveLocalRelPath(vPath);
        const baseName = relPath.split('/').filter(Boolean).pop() || 'video.mp4';
        const encodedPath = encodeURIComponent(vPath).replace(/'/g, '%27');
        const vFallbackSrc = buildFastStreamUrl(session.hostId, relPath, {
          cwd: session.cwd || '',
          agentId: session.id || '',
          mediaTicket: mt,
        });
        const vHlsSrc = vFallbackSrc.replace('/fs/stream?', '/fs/hls/index.m3u8?');
        window.__dshInlineVideoCache[vPath] = vFallbackSrc;
        vNode.classList.remove('md-local-video-pending');
        vNode.removeAttribute('onclick');
        vNode.innerHTML = `<video class="md-inline-video" data-hls-src="${vHlsSrc}" data-fallback-src="${vFallbackSrc}" controls playsinline webkit-playsinline preload="none" onplay="mountSmartVideoElement(this)" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video><span class="md-inline-img-cap" onclick="event.stopPropagation(); openChatFileLink('${encodedPath}')">🎬 ${esc(baseName)} · 点此打开大屏预览</span>`;
      }
    }

    const pendingUserNodes = Array.from(containerEl.querySelectorAll('.md-user-img-pending[data-local-img-path]'));
    for (const uNode of pendingUserNodes) {
      const primaryPath = uNode.getAttribute('data-local-img-path') || '';
      const backupPath = uNode.getAttribute('data-backup-img-path') || '';
      const label = uNode.getAttribute('data-img-label') || 'image';
      if (!primaryPath) continue;
      const relPrimary = resolveLocalRelPath(primaryPath);
      const isLosslessAnim = /\.(svg|gif)$/i.test(label);
      const primarySrc = buildFastStreamUrl(session.hostId, relPrimary, {
        cwd: session.cwd || '',
        agentId: session.id || '',
        thumb: !isLosslessAnim,
        mediaTicket: mt,
      });
      const backupSrc = backupPath
        ? buildFastStreamUrl(session.hostId, resolveLocalRelPath(backupPath), {
          cwd: session.cwd || '',
          agentId: session.id || '',
          thumb: !isLosslessAnim,
          mediaTicket: mt,
        })
        : '';
      uNode.classList.remove('md-user-img-pending');
      uNode.dataset.activeImgPath = primaryPath;
      uNode.innerHTML = `<img class="user-msg-thumb saveable-preview-img" src="${primarySrc}" data-fallback-src="${backupSrc}" data-backup-path="${esc(backupPath)}" alt="${esc(label)}" loading="lazy" decoding="async" onerror="if(this.dataset.fallbackSrc && this.src !== this.dataset.fallbackSrc){const card=this.closest('.user-msg-img-card');if(card&&this.dataset.backupPath)card.dataset.activeImgPath=this.dataset.backupPath;this.src=this.dataset.fallbackSrc;}else if(!this.dataset.rtTried){this.dataset.rtTried='1';const sep=this.src.includes('?')?'&':'?';setTimeout(()=>{if(this.isConnected)this.src=this.src+sep+'_rt=1';},800);}else{this.style.display='none';}" /><span class="user-msg-img-badge">🔍 ${esc(label)}</span>`;
    }

    const pendingNodes = Array.from(containerEl.querySelectorAll('.md-local-img-pending[data-local-img-path]'));
    if (pendingNodes.length === 0) return;
    window.__dshInlineImgCache = window.__dshInlineImgCache || {};

    for (const node of pendingNodes) {
      const imgPath = node.getAttribute('data-local-img-path') || '';
      if (!imgPath) continue;
      const relPath = resolveLocalRelPath(imgPath);
      const baseName = relPath.split('/').filter(Boolean).pop() || 'image';
      const isLosslessAnim = /\.(svg|gif)$/i.test(baseName);
      const srcUrl = buildFastStreamUrl(session.hostId, relPath, {
        cwd: session.cwd || '',
        agentId: session.id || '',
        thumb: !isLosslessAnim,
        mediaTicket: mt,
      });
      window.__dshInlineImgCache[imgPath] = srcUrl;
      node.classList.remove('md-local-img-pending');
      node.innerHTML = `<img class="md-inline-img" src="${srcUrl}" alt="${esc(baseName)}" loading="lazy" decoding="async" onerror="if(!this.dataset.rtTried){this.dataset.rtTried='1';const sep=this.src.includes('?')?'&':'?';setTimeout(()=>{if(this.isConnected)this.src=this.src+sep+'_rt=1';},850);}" />`;
    }
  }

  function openOptimisticImagePreview(optId, idx = 0) {
    const list = optimisticPreviewImagesByOptId.get(String(optId || ''));
    const item = Array.isArray(list) ? list[Number(idx) || 0] : null;
    const found = findSessionGlobal(activeSessionId);
    if (!item || !found?.host) return;
    drawerChangedFilesSessionId = null;
    filePreviewLoading = null;
    found.host.lastFilePreview = {
      at: Date.now(),
      agentId: found.session.id,
      relPath: item.name,
      name: item.name,
      kind: 'image',
      mime: item.mime || 'image/jpeg',
      size: item.size || 0,
      dataBase64: item.dataBase64,
      _showInDrawer: true,
      _showInMain: false,
    };
    pinnedDrawerPreviewByHost[found.host.hostId] = found.host.lastFilePreview;
    openSheet('inChatFileSheet');
    document.body.classList.add('mobile-file-open');
    const titleEl = document.getElementById('inChatFileTitle');
    if (titleEl) titleEl.textContent = `🖼️ ${item.name}`;
    renderInChatFileDrawerBody();
  }

  async function openUserBubbleImage(cardEl, encodedPrimary, encodedBackup = '') {
    const activeRaw = cardEl?.dataset?.activeImgPath || '';
    let primary = '';
    let backup = '';
    try { primary = decodeURIComponent(String(encodedPrimary || '')); } catch { primary = String(encodedPrimary || ''); }
    try { backup = decodeURIComponent(String(encodedBackup || '')); } catch { backup = String(encodedBackup || ''); }
    const firstChoice = activeRaw || primary || backup;
    const secondChoice = firstChoice === primary && backup ? backup : (firstChoice === backup && primary ? primary : '');
    if (!firstChoice) return;
    await openChatFileLink(encodeURIComponent(firstChoice), {
      ...(secondChoice ? { backupRelPath: secondChoice } : {}),
    });
  }

  const previewTextCache = new Map();
  async function ensureTextPreviewLoaded(hostId, preview) {
    if (!preview || preview.content !== undefined || !preview.hasBlob || previewKind(preview) !== 'text') return;
    const cacheKey = `${hostId}:${preview.at}`;
    if (previewTextCache.has(cacheKey)) {
      preview.content = previewTextCache.get(cacheKey);
      return;
    }
    previewTextCache.set(cacheKey, '正在按需加载大文本预览…');
    try {
      const res = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/file-preview?at=${encodeURIComponent(preview.at || 0)}&format=json`);
      const data = await res.json().catch(() => ({}));
      const content = data?.preview?.content ?? '（预览已过期，请重新点击文件加载）';
      previewTextCache.set(cacheKey, content);
      preview.content = content;
      renderAll();
      renderFilePanes();
    } catch {
      previewTextCache.delete(cacheKey);
    }
  }

  async function ensureHtmlPreviewFullLoaded(hostId, preview) {
    if (!preview || !isHtmlFileName(preview.name || preview.relPath || '')) return;
    await ensureTextPreviewLoaded(hostId, preview);
    if (preview._fullHtmlFetched) return;
    const rawContent = String(preview.content || '');
    const utf8ByteLen =
      rawContent && typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(rawContent).length
        : rawContent.length;
    const needsFullStream =
      Boolean(preview.streamUrl) &&
      (!preview.size || preview.size <= 5 * 1024 * 1024) &&
      (Boolean(preview.truncated) ||
        !rawContent ||
        rawContent.includes('文件过大已截断') ||
        (typeof preview.size === 'number' && preview.size > utf8ByteLen + 64));
    if (!needsFullStream) return;
    preview._fullHtmlFetched = true;
    try {
      const res = await apiFetch(preview.streamUrl);
      if (res.ok) {
        const fullText = await res.text();
        if (fullText) {
          preview.content = fullText;
          preview.kind = 'text';
          preview.truncated = false;
          renderAll();
          renderFilePanes();
        }
      }
    } catch {
      preview._fullHtmlFetched = false;
    }
  }

  function getPinnedPreviewTarget(hostId, inDrawer = false) {
    const pinned = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
    if (pinned) return pinned;
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    return host?.lastFilePreview || null;
  }

  function buildPreviewImageBodyHtml(preview, hostId, inDrawer, mt, dlUrl, canToggleOrigImg) {
    const imgSrc = imagePreviewSrc(preview, mt);
    const backupSrc = backupImagePreviewSrc(preview, mt);
    const initialState = preview.dataBase64
      ? 'is-loaded'
      : preview._imgStatus === 'loaded'
        ? 'is-loaded'
        : preview._imgStatus === 'error'
          ? 'is-error'
          : 'is-loading';
    const sizeText = preview.size > 0
      ? formatBytes(preview.size)
      : (preview._imgDims || (preview._origImage ? '无损原图' : '智能高清图'));
    const bodyMinHeight = inDrawer ? 'min-height:300px;' : 'min-height:calc(100% - 44px);';
    const imgInlineStyle = inDrawer
      ? ''
      : ' style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:8px;transition:opacity 0.18s ease;"';
    return `<div class="file-preview-body" style="padding:16px;background:#0f172a;${bodyMinHeight}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
        <div class="img-preview-stage ${initialState}">
          <div class="img-preview-loader">
            <div class="file-loading-dot"></div>
            <div class="img-preview-loader-text">正在加载图片…</div>
          </div>
          <img class="saveable-preview-img${inDrawer ? ' drawer-preview-img' : ''}" src="${esc(imgSrc)}" data-backup-src="${esc(backupSrc)}" data-host-id="${esc(hostId)}" data-in-drawer="${inDrawer ? '1' : '0'}" data-download-url="${esc(dlUrl || imgSrc)}" data-file-name="${esc(preview.name || 'image.png')}" alt="${esc(preview.name || 'image')}" decoding="async"${imgInlineStyle} onload="onPreviewImageLoad(this)" onerror="onPreviewImageError(this)" />
          <div class="img-preview-error-box">
            <div style="font-size:28px;">🖼️</div>
            <div class="img-preview-error-text" style="font-size:13px;line-height:1.5;">图片加载超时或连接中断</div>
            <div class="img-preview-error-actions">
              <button type="button" class="media-toolbar-pill" onclick="retryFilePreview('${esc(hostId)}', ${inDrawer ? 'true' : 'false'})">🔄 重新加载</button>
              ${canToggleOrigImg && !preview._origImage ? `<button type="button" class="media-toolbar-pill" onclick="toggleOriginalPreviewImage('${esc(hostId)}', ${inDrawer ? 'true' : 'false'})">🔍 尝试加载原图</button>` : ''}
            </div>
          </div>
        </div>
        <div class="file-preview-meta-bar" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#94a3b8;">
          <span class="img-preview-size-label">${esc(sizeText)} · 长按或点按钮保存图片</span>
          <button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc(dlUrl || imgSrc)}', '${esc(preview.name || 'image.png')}', this)">⬇️ 保存图片</button>
          ${canToggleOrigImg ? `<button type="button" class="media-toolbar-pill" onclick="toggleOriginalPreviewImage('${esc(hostId)}', ${inDrawer ? 'true' : 'false'})">${preview._origImage ? '⚡ 切回智能省流图' : '🔍 查看无损原图'}</button>` : ''}
        </div>
      </div>`;
  }

  function buildPreviewErrorBodyHtml(preview, hostId, inDrawer) {
    const bodyMinHeight = inDrawer ? 'min-height:300px;' : 'min-height:calc(100% - 44px);';
    const reason = String(preview._loadError || '文件加载超时或电脑暂未响应');
    return `<div class="file-preview-body" style="padding:32px 16px;background:#0f172a;color:#cbd5e1;${bodyMinHeight}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;">
        <div style="font-size:32px;">⚠️</div>
        <div style="font-size:14px;font-weight:600;color:#f1f5f9;">${esc(preview.name || '文件加载失败')}</div>
        <div style="font-size:12.5px;color:#94a3b8;max-width:320px;line-height:1.5;">${esc(reason)}</div>
        <button type="button" class="media-toolbar-pill" onclick="retryFilePreview('${esc(hostId)}', ${inDrawer ? 'true' : 'false'})">🔄 重新加载</button>
      </div>`;
  }

  function syncMountedPreviewImage(containerEl) {
    if (!containerEl) return;
    const imgEl = containerEl.querySelector('.img-preview-stage img.saveable-preview-img');
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      onPreviewImageLoad(imgEl);
    }
  }

  function onPreviewImageLoad(imgEl) {
    if (!imgEl) return;
    const stage = imgEl.closest('.img-preview-stage');
    if (stage) {
      stage.classList.remove('is-loading', 'is-error');
      stage.classList.add('is-loaded');
    }
    const hostId = imgEl.dataset?.hostId || '';
    const inDrawer = imgEl.dataset?.inDrawer === '1';
    const preview = hostId ? getPinnedPreviewTarget(hostId, inDrawer) : null;
    if (preview) {
      preview._imgStatus = 'loaded';
      if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
        preview._imgDims = `${imgEl.naturalWidth}×${imgEl.naturalHeight}`;
      }
      if (!preview.size && preview._imgDims) {
        const sizeLabel = imgEl.closest('.file-preview-body')?.querySelector('.img-preview-size-label');
        if (sizeLabel) {
          sizeLabel.textContent = `${preview._imgDims} · 长按或点按钮保存图片`;
        }
      }
    }
  }

  function onPreviewImageError(imgEl) {
    if (!imgEl) return;
    const stage = imgEl.closest('.img-preview-stage');
    const loaderText = stage?.querySelector('.img-preview-loader-text');
    const backupSrc = imgEl.dataset?.backupSrc || '';
    if (backupSrc && imgEl.dataset.usedBackup !== '1') {
      imgEl.dataset.usedBackup = '1';
      if (loaderText) loaderText.textContent = '正在切换备用路径加载…';
      imgEl.src = backupSrc;
      return;
    }
    const retryCount = Number(imgEl.dataset?.autoRetry || '0');
    if (retryCount < 1 && imgEl.src && !imgEl.src.startsWith('data:')) {
      imgEl.dataset.autoRetry = String(retryCount + 1);
      if (loaderText) loaderText.textContent = '网络稍慢，正在自动重试加载…';
      const curSrc = imgEl.src;
      setTimeout(() => {
        if (!imgEl.isConnected) return;
        try {
          const u = new URL(curSrc, typeof location !== 'undefined' ? location.origin : 'http://localhost');
          if (hubState.mediaTicket) u.searchParams.set('mt', hubState.mediaTicket);
          u.searchParams.set('_rt', String(retryCount + 1));
          imgEl.src = `${u.pathname}?${u.searchParams.toString()}`;
        } catch {
          const sep = curSrc.includes('?') ? '&' : '?';
          imgEl.src = `${curSrc}${sep}_rt=${retryCount + 1}`;
        }
      }, 650);
      return;
    }
    if (stage) {
      stage.classList.remove('is-loading', 'is-loaded');
      stage.classList.add('is-error');
    }
    const hostId = imgEl.dataset?.hostId || '';
    const inDrawer = imgEl.dataset?.inDrawer === '1';
    const preview = hostId ? getPinnedPreviewTarget(hostId, inDrawer) : null;
    if (preview) {
      preview._imgStatus = 'error';
    }
  }

  function retryFilePreview(hostId, inDrawer = false) {
    const preview = getPinnedPreviewTarget(hostId, inDrawer);
    if (!preview) return;
    if (preview.streamUrl && (preview.kind === 'image' || isImageFileName(preview.name || preview.relPath || ''))) {
      preview.kind = 'image';
      preview._loadError = '';
      preview._imgStatus = 'loading';
      preview._reloadNonce = (Number(preview._reloadNonce) || 0) + 1;
      renderAll();
      renderFilePanes();
      return;
    }
    const ctx = preview._retryContext;
    if (ctx && ctx.relPath) {
      void clickRealFileEntry(ctx.hostId || hostId, ctx.agentId || '', ctx.cwd || '', ctx.relPath, false, Boolean(inDrawer), {
        size: ctx.size,
        backupRelPath: ctx.backupRelPath,
      });
    }
  }

  function renderInChatFileDrawerBody() {
    const found = findSessionGlobal(activeSessionId);
    if (!found) return;
    const host = found.host;
    if (!host) return;
    const body = document.getElementById('inChatFileBody');
    reconcileFileLoading(host);
    const preview = pinnedDrawerPreviewByHost[host.hostId] || (host.lastFilePreview?._showInDrawer ? host.lastFilePreview : null);
    const listing = host.lastFsListing;
    const previewLoading = filePreviewLoading
      && filePreviewLoading.hostId === host.hostId
      && filePreviewLoading.drawer;

    if (previewLoading) {
      body.dataset.dshDrawerListKey = '';
      const loadingName = String(filePreviewLoading.relPath || '').split('/').filter(Boolean).pop() || '文件';
      body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="cancelFilePreviewLoading()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);">${esc(loadingName)}</span>
            <span style="width:56px;"></span>
          </div>
          <div style="padding:16px 12px;background:#0f172a;min-height:300px;">
            ${fileLoadingSpinnerHtml('正在读取文件内容…')}
          </div>
        `;
      return;
    }

    if (preview && preview._showInDrawer) {
      body.dataset.dshDrawerListKey = '';
      void ensureTextPreviewLoaded(host.hostId, preview);
      if (isHtmlFileName(preview.name || preview.relPath || '')) {
        void ensureHtmlPreviewFullLoaded(host.hostId, preview);
      }
      const kind = previewKind(preview);
      const mt = hubState.mediaTicket || '';
      const isMarkdown = kind === 'text' && /\.(md|markdown|mdx)$/i.test(preview.name || preview.relPath || '');
      const isHtml = kind === 'text' && isHtmlFileName(preview.name || preview.relPath || '');
      const rawMdMode = Boolean(window.__dshRawMdPreview);
      const rawHtmlMode = Boolean(window.__dshRawHtmlPreview);
      const stableStamp = kind === 'image' && preview.streamUrl
        ? `r${preview._reloadNonce || 0}`
        : `${preview.at || 0}:r${preview._reloadNonce || 0}`;
      const previewKey = `${stableStamp}:${preview.relPath || ''}:${kind}:${preview._origImage ? 1 : 0}:${preview._transcodeVideo ? 1 : 0}:${preview._rawVideo ? 1 : 0}:${isMarkdown ? (rawMdMode ? 'raw' : 'md') : ''}:${isHtml ? (rawHtmlMode ? 'raw-html' : 'html') : ''}:${(preview.content || '').length}:${preview._loadError || ''}`;
      if (body.dataset.dshPreviewKey === previewKey && body.querySelector('.file-preview-body')) return;
      body.dataset.dshPreviewKey = previewKey;
      const lines = String(preview.content || '').split('\n');
      const numberedHtml = lines.map((line, i) =>
        `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
      ).join('');
      const canToggleOrigImg =
        kind === 'image' &&
        Boolean(preview.streamUrl) &&
        !/\.(svg|gif)$/i.test(preview.name || '') &&
        (!preview.size || preview.size > 120 * 1024);
      const dlUrl = preview.streamUrl
        ? appendMediaAuth(`${preview.streamUrl}${preview.streamUrl.includes('?') ? '&' : '?'}download=1`, mt)
        : '';
      const videoMetaUi = kind === 'video' ? describeVideoPreviewStatus(preview) : null;
      const htmlSrcdocAttr = isHtml && !rawHtmlMode
        ? escapeSrcdocAttr(
          buildSandboxedHtmlSrcdoc(preview.content || '', {
            hostId: host.hostId,
            relPath: preview.relPath || preview.name || '',
            cwd: fileProjectCwd || found.session?.cwd || '',
            agentId: preview.agentId || found.session?.id || '',
            mediaTicket: mt,
            origin: typeof location !== 'undefined' ? location.origin : '',
          })
        )
        : '';
      const previewBodyHtml = kind === 'error'
        ? buildPreviewErrorBodyHtml(preview, host.hostId, true)
        : kind === 'video'
        ? `<div class="file-preview-body" style="padding:16px 12px;background:#0f172a;min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
               <video class="file-preview-video" data-hls-src="${esc(videoHlsSrc(preview, mt))}" data-fallback-src="${esc(videoPreviewSrc(preview, mt))}" data-video-bytes="${Number(preview.size || 0)}" data-dsh-universal-direct="${preview.videoProbe?.universalDirectPlay ? '1' : '0'}" controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video>
               <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">
                 <span data-dsh-video-status="1" style="font-size:12px;color:#94a3b8;">🎬 ${esc(formatBytes(preview.size))} · ${esc(videoMetaUi.badge)}</span>
                 <button type="button" class="media-toolbar-pill" onclick="switchVideoTranscodeMode('${esc(host.hostId)}', true)">${esc(videoMetaUi.toggleLabel)}</button>
                 ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc(dlUrl)}', '${esc(preview.name || 'video.mp4')}', this)">⬇️ 保存/分享视频</button>` : ''}
               </div>
             </div>`
        : kind === 'image'
          ? buildPreviewImageBodyHtml(preview, host.hostId, true, mt, dlUrl, canToggleOrigImg)
          : kind === 'binary'
            ? `<div class="file-preview-body" style="padding:32px 16px;background:#0f172a;color:#94a3b8;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                   <div style="font-size:32px;">📦</div>
                   <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                   <div style="font-size:12.5px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
                   ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc(dlUrl)}', '${esc(preview.name || 'file')}', this)">⬇️ 保存/分享文件</button>` : ''}
                 </div>`
            : (isHtml && !rawHtmlMode)
              ? `<div class="file-preview-body html-sandbox-preview" style="padding:0;background:#ffffff;min-height:420px;">
                   <iframe class="drawer-preview-iframe" title="${esc(preview.name || 'HTML Preview')}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${htmlSrcdocAttr}"></iframe>
                 </div>`
              : (isMarkdown && !rawMdMode)
                ? `<div class="file-preview-body walkthrough-md-preview md-body" style="padding:16px 14px;background:var(--card-bg, #ffffff);color:var(--text, #0f172a);min-height:340px;overflow-x:auto;">
                     ${formatAssistantText(preview.content || '')}
                   </div>`
                : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:340px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">
                     ${numberedHtml}
                   </div>`;
      body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;gap:6px;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="backFromDrawerPreview()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(preview.name)}</span>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              ${isHtml ? `<button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="openFullscreenHtmlFromPreview('${esc(host.hostId)}', true)">⛶ 全屏体验</button><button class="icon-pill-btn" onclick="toggleHtmlPreviewMode()">${rawHtmlMode ? '🌐 预览' : '</> 源码'}</button>` : ''}
              ${isMarkdown ? `<button class="icon-pill-btn" onclick="toggleMdPreviewMode()">${rawMdMode ? '📖 渲染' : '</> 源码'}</button>` : ''}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="quoteFileIntoChat('${esc(preview.relPath || preview.name)}')">📎 引用</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
      if (isMarkdown && !rawMdMode) {
        void hydrateInlineChatImages(found.session, body);
      } else if (kind === 'video') {
        const vidEl = body.querySelector('video.file-preview-video');
        if (vidEl) void mountSmartVideoElement(vidEl);
      } else if (kind === 'image') {
        syncMountedPreviewImage(body);
      }
      return;
    }

    body.dataset.dshPreviewKey = '';
    if (drawerChangedFilesSessionId && drawerChangedFilesSessionId === found.session.id) {
      const files = Array.isArray(found.session.changedFiles) ? found.session.changedFiles : [];
      const changedKey = `changed:${found.session.id}:${files.length}:${computeChangedFilesMeta(files).sig}`;
      if (body.dataset.dshDrawerListKey === changedKey && body.querySelector('.breadcrumbs-bar')) return;
      body.dataset.dshDrawerListKey = changedKey;
      const meta = computeChangedFilesMeta(files);
      body.innerHTML = `
        <div class="breadcrumbs-bar" style="justify-content:space-between;gap:8px;">
          <span style="font-weight:700;color:var(--text);">📝 本会话改动文件 (${files.length}) <span class="agy-file-diff" style="margin-left:6px;"><span class="add">+${meta.totalAdd}</span><span class="del">-${meta.totalDel}</span></span></span>
          <button type="button" class="icon-pill-btn" onclick="openInChatFileDrawer()">📂 浏览全部目录</button>
        </div>
        <div>
          ${files.map(fc => {
        const encFcPath = encodeURIComponent(fc.path || fc.name || '').replace(/'/g, '%27');
        return `
              <div class="file-row" onclick="openChatFileLink('${encFcPath}')">
                <div class="file-row-left" style="min-width:0;flex:1;">
                  <span class="agy-file-diff" style="min-width:56px;"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
                  <div style="min-width:0;overflow:hidden;">
                    <div style="font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(fc.name || '')}</div>
                    <div style="font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(fc.displayPath || fc.path || '')}</div>
                  </div>
                </div>
                <span style="font-size:12px;color:var(--primary);font-weight:600;flex-shrink:0;">打开 ›</span>
              </div>
            `;
      }).join('') || `<div style="padding:36px;text-align:center;color:var(--muted);">暂无文件改动记录</div>`}
        </div>
      `;
      applyLangToDom(body, langPref);
      return;
    }

    const entries = listing?.entries || [];
    const loadingDir = fileLoading && fileLoading.hostId === host.hostId && fileLoading.drawer;
    const rootCwd = listing?.rootCwd || fileProjectCwd;
    const activeSubDir = loadingDir ? (fileLoading.subDir || '') : (listing?.subDir || '');
    const drawerListKey = `${host.hostId}:${rootCwd}:${activeSubDir}:${loadingDir ? 1 : 0}:${listing?.at || 0}:${entries.length}`;
    if (body.dataset.dshDrawerListKey === drawerListKey && body.querySelector('.breadcrumbs-bar')) return;
    body.dataset.dshDrawerListKey = drawerListKey;
    const prevScrollTop = body.scrollTop;
    const crumbs = buildBreadcrumbSegments(activeSubDir);
    const hostId = esc(host.hostId);
    const sessionId = esc(found.session.id);

    body.innerHTML = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc(rootCwd)}', '', true)">🏠 ${esc(found.session.project)}</span>
          ${crumbs.map((c, index) => {
      const isLast = index === crumbs.length - 1;
      const sep = '<span style="color:#94a3b8;">/</span>';
      return sep + (isLast
        ? `<span style="font-weight:600;color:var(--text);">${esc(c.name)}</span>`
        : `<span class="crumb-link" onclick="requestDirList('${hostId}', '${sessionId}', '${esc(rootCwd)}', '${esc(c.path)}', true)">${esc(c.name)}</span>`);
    }).join('')}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc(rootCwd)}</span>` : ''}
        </div>
        <div>
          ${loadingDir ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : '正在读取目录…') : (entries.map(e => `
            <div class="file-row" onclick="clickRealFileEntry('${hostId}', '${sessionId}', '${esc(rootCwd)}', '${esc(e.relPath)}', ${Boolean(e.isDirectory)}, true)">
              <div class="file-row-left">
                <span style="font-size:18px;">${fileEntryIcon(e)}</span>
                <span style="font-weight:500;">${esc(e.name)}</span>
              </div>
              <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? '目录' : formatBytes(e.size)} ›</span>
            </div>
          `).join('') || `<div style="padding:36px;text-align:center;color:#94a3b8;">正在同步目录文件列表...</div>`)}
        </div>
      `;
    body.scrollTop = prevScrollTop;
  }

  function backFromDrawerPreview() {
    const found = findSessionGlobal(activeSessionId);
    if (found?.host) {
      delete pinnedDrawerPreviewByHost[found.host.hostId];
      if (found.host.lastFilePreview) {
        found.host.lastFilePreview._showInDrawer = false;
      }
    }
    renderInChatFileDrawerBody();
  }

  function quoteFileIntoChat(relPath) {
    closeMobileFile();
    const input = document.getElementById('globalPromptInput');
    input.value = `请查看文件 @${relPath} 并帮我分析：${input.value}`;
    input.focus();
    onComposerInput();
    showToast(`📎 已插入 @${relPath}`);
  }

  // ==================== 8. 文件浏览 Tab & 桌面右侧代码视图 ====================
  function sleepMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 目录/文件结果靠电脑心跳回传，这里判断「新结果到了没有」并清掉加载态。
  // 注意不要用手机时钟和服务器时间比大小，只比较结果本身有没有变化。
  function reconcileFileLoading(host) {
    if (!host) return;
    if (fileLoading && fileLoading.hostId === host.hostId) {
      const listing = host.lastFsListing;
      const sameDir = listing
        && (listing.rootCwd || '') === fileLoading.cwd
        && (listing.subDir || '') === (fileLoading.subDir || '');
      if (sameDir && listing.at !== fileLoading.prevAt) {
        fileLoading = null;
      } else if (Date.now() - fileLoading.at > 15000) {
        fileLoading = null;
      }
    }
    if (filePreviewLoading && filePreviewLoading.hostId === host.hostId) {
      const box = host.lastFilePreview;
      const expectedBase = String(filePreviewLoading.relPath || '').split('/').filter(Boolean).pop() || '';
      if (
        box &&
        box.at !== filePreviewLoading.prevAt &&
        (box.relPath === filePreviewLoading.relPath || (expectedBase && box.name === expectedBase))
      ) {
        box._showInDrawer = Boolean(filePreviewLoading.drawer);
        box._showInMain = !filePreviewLoading.drawer;
        if (filePreviewLoading.drawer) {
          pinnedDrawerPreviewByHost[host.hostId] = box;
        } else {
          pinnedMainPreviewByHost[host.hostId] = box;
        }
        filePreviewLoading = null;
      } else if (Date.now() - filePreviewLoading.at > 35000) {
        filePreviewLoading = null;
      }
    }
  }

  function fileEntryIcon(entry) {
    if (entry?.isDirectory) return '📁';
    const name = String(entry?.name || entry?.relPath || '').toLowerCase();
    if (/\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/.test(name)) return '🎬';
    if (/\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|heic|heif)$/.test(name)) return '🖼️';
    if (/\.(html?|xhtml)$/.test(name)) return '🌐';
    if (/\.(md|markdown|mdx)$/.test(name)) return '📋';
    return '📄';
  }

  function describeVideoPreviewStatus(preview) {
    const strategy = preview?.videoProbe?.strategy || '';
    const canHls = preview?.hlsAvailable !== false && !preview?._transcodeVideo;
    if (preview?._rawVideo) {
      return {
        badge: canHls ? '无损原画 HLS 切片流' : '原始视频字节直出流',
        toggleLabel: '✨ 切回自适应秒播流',
      };
    }
    if (preview?._transcodeVideo) {
      return {
        badge: '智能 H.264 兼容流 · 拖动秒播',
        toggleLabel: '🎞️ 切换无损原画流',
      };
    }
    if (canHls) {
      return {
        badge: '⚡ HLS 切片秒播 · 抗弱网零卡死',
        toggleLabel: '🎞️ 切换无损原画流',
      };
    }
    if (strategy === 'remux') {
      return {
        badge: '无损快启重封装 · 拖动秒播',
        toggleLabel: '🔄 强制重编码兼容流',
      };
    }
    return {
      badge: '支持拖动进度条分片秒播',
      toggleLabel: '🔄 播不出？转码兼容播放',
    };
  }

  function buildTranscodeFallbackSrc(rawSrc) {
    if (!rawSrc || !rawSrc.includes('/fs/stream')) return '';
    try {
      const u = new URL(rawSrc, typeof location !== 'undefined' ? location.origin : 'http://localhost');
      u.searchParams.delete('raw');
      u.searchParams.delete('preview');
      u.searchParams.set('transcode', '1');
      const freshMt = hubState.mediaTicket || '';
      if (freshMt) {
        u.searchParams.set('mt', freshMt);
      }
      return `${u.pathname}?${u.searchParams.toString()}`;
    } catch {
      return '';
    }
  }

  function buildRetryFreshVideoSrc(rawSrc) {
    if (!rawSrc || !rawSrc.includes('/fs/stream')) return '';
    try {
      const u = new URL(rawSrc, typeof location !== 'undefined' ? location.origin : 'http://localhost');
      const freshMt = hubState.mediaTicket || '';
      if (freshMt) {
        u.searchParams.set('mt', freshMt);
      }
      u.searchParams.set('_r', String(Date.now()));
      return `${u.pathname}?${u.searchParams.toString()}`;
    } catch {
      return '';
    }
  }

  const p2pVideoBlobCache = new Map();

  function clearSmartVideoErrorBanner(videoEl) {
    if (!videoEl) return;
    if (videoEl.dataset) {
      delete videoEl.dataset.dshErrorBannerShown;
    }
    const parent = videoEl.parentElement;
    if (!parent) return;
    parent.querySelectorAll('[data-dsh-error-tip], [data-dsh-fallback-dl]').forEach(el => {
      try {
        el.remove();
      } catch { }
    });
  }

  async function mountSmartVideoElement(videoEl) {
    if (!videoEl || videoEl.dataset?.dshMounted === '1') return;
    videoEl.dataset.dshMounted = '1';
    const hlsSrc = videoEl.dataset?.hlsSrc || '';
    const fallbackSrc = videoEl.dataset?.fallbackSrc || videoEl.getAttribute('src') || '';
    const videoBytes = Number(videoEl.dataset?.videoBytes || 0);

    await attachSmartHlsPlayer(videoEl, {
      hlsUrl: hlsSrc,
      fallbackSrc,
    });

    // For compact clips (<= 24 MiB), optionally race same-LAN WebRTC P2P zero-buffer upgrade in background;
    // large videos (> 24 MiB) stay 100% on 2-second HLS streaming chunks without loading giant Blobs into RAM.
    if (videoBytes > 0 && videoBytes <= 24 * 1024 * 1024 && fallbackSrc) {
      void maybeAccelerateVideoViaP2p(videoEl);
    }
  }

  async function maybeAccelerateVideoViaP2p(videoEl, { fromErrorFallback = false } = {}) {
    if (!videoEl) return false;
    if (videoEl.dataset?.dshP2pUpgraded === '1') return true;
    if (videoEl.__dshP2pPromise) {
      return videoEl.__dshP2pPromise;
    }
    const rawSrc =
      videoEl.dataset?.fallbackSrc ||
      videoEl.getAttribute('src') ||
      videoEl.currentSrc ||
      '';
    if (!rawSrc || rawSrc.startsWith('blob:') || !rawSrc.includes('/fs/stream')) {
      return false;
    }

    const cacheKey = rawSrc.replace(/([?&])_r=[^&]+/g, '').replace(/[?&]$/, '');
    const cachedBlobUrl = p2pVideoBlobCache.get(cacheKey);
    if (cachedBlobUrl) {
      swapVideoElementToBlobUrl(videoEl, cachedBlobUrl);
      return true;
    }

    videoEl.dataset.dshP2pInflight = '1';
    const runPromise = (async () => {
      try {
        const p2pRes = await fetchMediaViaWebRtc(rawSrc, {
          token: getToken(),
          mediaTicket: hubState.mediaTicket || '',
          maxBytes: 24 * 1024 * 1024,
          connectTimeoutMs: fromErrorFallback ? 1800 : 1200,
        });
        if (!p2pRes?.ok || !p2pRes.blob || !videoEl.isConnected) {
          return false;
        }
        const blobUrl = URL.createObjectURL(p2pRes.blob);
        p2pVideoBlobCache.set(cacheKey, blobUrl);
        while (p2pVideoBlobCache.size > 12) {
          const oldestKey = p2pVideoBlobCache.keys().next().value;
          const oldUrl = p2pVideoBlobCache.get(oldestKey);
          p2pVideoBlobCache.delete(oldestKey);
          if (oldUrl) {
            try { URL.revokeObjectURL(oldUrl); } catch { }
          }
        }
        swapVideoElementToBlobUrl(videoEl, blobUrl);
        return true;
      } catch {
        return false;
      } finally {
        delete videoEl.__dshP2pPromise;
        if (videoEl.dataset) {
          delete videoEl.dataset.dshP2pInflight;
        }
      }
    })();
    videoEl.__dshP2pPromise = runPromise;
    return runPromise;
  }

  function swapVideoElementToBlobUrl(videoEl, blobUrl) {
    if (!videoEl || !blobUrl) return;
    const wasPaused = videoEl.paused;
    const savedTime = Number(videoEl.currentTime) || 0;
    const savedRate = Number(videoEl.playbackRate) || 1;
    destroyHlsPlayer(videoEl);
    delete videoEl.dataset.dshHlsActive;
    clearSmartVideoErrorBanner(videoEl);
    videoEl.dataset.dshP2pUpgraded = '1';
    videoEl.src = blobUrl;
    const restoreState = () => {
      try {
        if (savedTime > 0.1 && Number.isFinite(videoEl.duration) && savedTime < videoEl.duration) {
          videoEl.currentTime = savedTime;
        }
        if (savedRate !== 1) {
          videoEl.playbackRate = savedRate;
        }
        if (!wasPaused) {
          void videoEl.play()?.catch?.(() => { });
        }
      } catch { }
    };
    videoEl.addEventListener('loadedmetadata', restoreState, { once: true });
    const statusEl = videoEl.parentElement?.querySelector?.('[data-dsh-video-status="1"]');
    if (statusEl && statusEl.textContent) {
      const prefix = statusEl.textContent.split('·')[0].trim();
      statusEl.textContent = `${prefix} · ⚡ P2P 极速直连 · 零缓冲秒播`;
      if (langPref === 'en') applyLangToDom(videoEl.parentElement, langPref);
    }
  }

  function onSmartVideoLoadedMeta(videoEl) {
    if (!videoEl) return;
    if (videoEl.videoWidth > 0) {
      clearSmartVideoErrorBanner(videoEl);
    }
    if (videoEl.dataset?.dshFallbackTried === '1') return;
    if (videoEl.videoWidth === 0 && Number(videoEl.duration) > 0) {
      const nextSrc = buildTranscodeFallbackSrc(videoEl.getAttribute('src') || videoEl.currentSrc || '');
      if (!nextSrc) return;
      videoEl.dataset.dshFallbackTried = '1';
      showToast('🔄 检测到特殊视频编码，已自动切换电脑端 H.264 兼容流…');
      videoEl.src = nextSrc;
      try {
        videoEl.load();
      } catch { }
    }
  }

  async function onSmartVideoError(videoEl) {
    if (!videoEl) return;
    if (videoEl.error?.code === 1) return;
    // When hls.js MSE is attached, hls.js handles its own retry & fallback before setting dshHlsFailed='1'
    if (videoEl.__dshHlsInstance) return;
    const currentSrc = videoEl.getAttribute('src') || videoEl.currentSrc || '';
    if (!currentSrc || currentSrc.startsWith('blob:') || videoEl.dataset?.dshP2pUpgraded === '1') return;

    // 0. If native Safari HLS failed (e.g. remote host daemon is still v0.7.4 without /fs/hls/ endpoint), fall back to /fs/stream
    if (currentSrc.includes('/fs/hls/') && videoEl.dataset?.fallbackSrc && videoEl.dataset?.dshHlsFailed !== '1') {
      destroyHlsPlayer(videoEl);
      delete videoEl.dataset.dshHlsActive;
      videoEl.dataset.dshHlsFailed = '1';
      videoEl.src = videoEl.dataset.fallbackSrc;
      try {
        videoEl.load();
      } catch { }
      return;
    }

    // 1. 优先尝试或等待进行中的 WebRTC P2P 直连恢复（绕开跨洋网关超时）
    if (videoEl.dataset?.dshP2pFallbackTried !== '1' || videoEl.__dshP2pPromise) {
      videoEl.dataset.dshP2pFallbackTried = '1';
      const recoveredViaP2p = await maybeAccelerateVideoViaP2p(videoEl, { fromErrorFallback: true });
      if (recoveredViaP2p || videoEl.dataset?.dshP2pUpgraded === '1') return;
    }

    const alreadyCompatOrDirect =
      videoEl.dataset?.dshUniversalDirect === '1' ||
      currentSrc.includes('preview=1') ||
      currentSrc.includes('transcode=1');

    // 2. 若原视频本来就是标准 H.264（报错来自网络抖动而非编码不兼容），原地刷新票据重试一次，绝不盲目重压转码！
    if (alreadyCompatOrDirect && videoEl.dataset?.dshNetRetryTried !== '1') {
      const retrySrc = buildRetryFreshVideoSrc(currentSrc);
      if (retrySrc) {
        videoEl.dataset.dshNetRetryTried = '1';
        videoEl.src = retrySrc;
        try {
          videoEl.load();
        } catch { }
        return;
      }
    }

    // 3. 仅对尚未确认兼容编码的视频回退到电脑端 H.264 转码流
    if (!alreadyCompatOrDirect && videoEl.dataset?.dshFallbackTried !== '1') {
      const nextSrc = buildTranscodeFallbackSrc(currentSrc);
      if (nextSrc && nextSrc !== currentSrc) {
        videoEl.dataset.dshFallbackTried = '1';
        showToast('🔄 正在自动切换兼容转码流重试播放…');
        videoEl.src = nextSrc;
        try {
          videoEl.load();
        } catch { }
        return;
      }
    }

    if (videoEl.dataset?.dshP2pUpgraded === '1' || videoEl.dataset?.dshErrorBannerShown === '1') return;
    videoEl.dataset.dshErrorBannerShown = '1';
    const parent = videoEl.parentElement;
    if (!parent) return;
    let dlHref = '';
    let dlName = 'video.mp4';
    try {
      const u = new URL(currentSrc, typeof location !== 'undefined' ? location.origin : 'http://localhost');
      if (u.pathname.includes('/fs/stream')) {
        const rawPath = u.searchParams.get('path') || '';
        const base = rawPath.split('/').filter(Boolean).pop();
        if (base) dlName = base;
        u.searchParams.delete('transcode');
        u.searchParams.delete('preview');
        u.searchParams.delete('raw');
        u.searchParams.delete('_r');
        u.searchParams.set('download', '1');
        const freshMt = hubState.mediaTicket || '';
        if (freshMt) u.searchParams.set('mt', freshMt);
        dlHref = `${u.pathname}?${u.searchParams.toString()}`;
      }
    } catch { }
    const tip = document.createElement('div');
    tip.dataset.dshErrorTip = '1';
    tip.style.cssText = 'font-size:12px;color:#fca5a5;text-align:center;padding:6px 10px;line-height:1.5;';
    tip.textContent = '⚠️ 当前网络波动未能完成在线加载，可点下方高速分片下载到本地观看';
    parent.appendChild(tip);
    if (dlHref && !parent.querySelector('[data-dsh-fallback-dl]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'media-toolbar-pill';
      btn.dataset.dshFallbackDl = '1';
      btn.textContent = '⬇️ 保存原视频到本地播放';
      btn.onclick = ev => {
        ev.stopPropagation();
        void downloadPreviewMedia(dlHref, dlName, btn);
      };
      parent.appendChild(btn);
    }
  }

  function toggleOriginalPreviewImage(hostId, inDrawer = false) {
    const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    const preview = target || host?.lastFilePreview;
    if (!preview) return;
    preview._origImage = !preview._origImage;
    preview._imgStatus = 'loading';
    showToast(preview._origImage ? '🔍 已切换为无损原图模式' : '⚡ 已切换为智能省流高清模式');
    renderAll();
    renderFilePanes();
  }

  function switchVideoTranscodeMode(hostId, inDrawer = false) {
    const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    const preview = target || host?.lastFilePreview;
    if (!preview) return;
    const canHls = preview?.hlsAvailable !== false;
    if (canHls) {
      preview._rawVideo = !preview._rawVideo;
      preview._transcodeVideo = false;
      showToast(
        preview._rawVideo
          ? '🎞️ 已切换为无损原画 HLS 切片流'
          : '⚡ 已切回自适应抗弱网 HLS 秒播流'
      );
    } else {
      preview._rawVideo = false;
      preview._transcodeVideo = !preview._transcodeVideo;
      showToast(
        preview._transcodeVideo
          ? '🔄 正在用电脑端 H.264 兼容转码流加载…'
          : '✨ 已切回智能秒播模式'
      );
    }
    renderAll();
    renderFilePanes();
  }

  async function requestDirList(hostId, agentId, cwd, subDir, inDrawer = false) {
    fileProjectCwd = cwd;
    fileSubDir = subDir;
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    if (inDrawer) {
      delete pinnedDrawerPreviewByHost[hostId];
    } else {
      delete pinnedMainPreviewByHost[hostId];
    }
    if (host?.lastFilePreview) {
      if (inDrawer) host.lastFilePreview._showInDrawer = false;
      else host.lastFilePreview._showInMain = false;
    }
    fileLoading = {
      hostId,
      cwd,
      subDir: subDir || '',
      prevAt: host?.lastFsListing?.at || 0,
      at: Date.now(),
      drawer: inDrawer,
    };
    renderAll();

    // 优先走独立高速 FS 隧道（绕过心跳队列阻塞与 /api/state 轮询风暴）
    try {
      const qp = new URLSearchParams({
        cwd: String(cwd || ''),
        path: String(subDir || ''),
        agentId: String(agentId || ''),
      });
      const fastRes = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/fs/list?${qp.toString()}`);
      const fastData = await fastRes.json().catch(() => null);
      if (fastRes.ok && fastData?.ok) {
        if (host) {
          host.lastFsListing = {
            at: Date.now(),
            agentId: agentId || '',
            rootCwd: fastData.rootCwd || cwd || '',
            subDir: fastData.subDir ?? (subDir || ''),
            entries: fastData.entries || [],
          };
        }
        fileLoading = null;
        renderAll();
        renderFilePanes();
        return;
      }
      if (fastRes.status !== 404 && fastData?.error) {
        fileLoading = null;
        showToast('❌ 读取目录失败：' + fastData.error);
        renderAll();
        return;
      }
    } catch {
      // 网络波动或旧版服务端时回退到指令队列兜底
    }

    let failure = '';
    try {
      const out = await dispatchHostCommand(hostId, { type: 'list_files', agentId, cwd, subDir });
      if (out && out.ok === false) failure = out.error || '电脑未接受该指令';
    } catch (err) {
      failure = (err && err.message) || String(err);
    }
    if (failure) {
      fileLoading = null;
      showToast('❌ 读取目录失败：' + failure);
      renderAll();
      return;
    }
    for (let i = 0; i < 22 && fileLoading; i++) {
      await sleepMs(180);
      if (!fileLoading) break;
      const state = await fetchState();
      if (!state.ok) break;
    }
    if (fileLoading) {
      fileLoading = null;
      showToast('⚠️ 读取目录超时：电脑可能离线，请重新点一下目录');
    }
    renderAll();
    renderFilePanes();
  }

  async function clickRealFileEntry(hostId, agentId, cwd, relPath, isDir, inDrawer = false, opts = {}) {
    if (isDir) {
      await requestDirList(hostId, agentId, cwd, relPath, inDrawer);
      return;
    }
    const loadSeq = ++filePreviewLoadSeq;
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    const cleanRelPath = String(relPath || '');
    const baseName = cleanRelPath.split('/').filter(Boolean).pop() || cleanRelPath || 'file';
    const listedEntry = (host?.lastFsListing?.entries || []).find(
      e => !e?.isDirectory && (e.relPath === cleanRelPath || e.name === baseName)
    );
    const knownSize = Number(opts?.size ?? listedEntry?.size) || 0;
    const backupRelPath = String(opts?.backupRelPath || '').trim();
    const retryContext = {
      hostId,
      agentId: agentId || '',
      cwd: cwd || '',
      relPath: cleanRelPath,
      inDrawer: Boolean(inDrawer),
      size: knownSize,
      ...(backupRelPath ? { backupRelPath } : {}),
    };
    const pinPreviewBox = box => {
      if (host) {
        host.lastFilePreview = box;
      }
      if (inDrawer) {
        pinnedDrawerPreviewByHost[hostId] = box;
      } else {
        pinnedMainPreviewByHost[hostId] = box;
      }
      filePreviewLoading = null;
      renderAll();
      renderFilePanes();
    };
    const pinErrorPreview = errorMessage => {
      const ext = baseName.includes('.') ? '.' + (baseName.split('.').pop() || '').toLowerCase() : '';
      pinPreviewBox({
        at: Date.now(),
        agentId: agentId || '',
        relPath: cleanRelPath,
        name: baseName,
        ext,
        size: knownSize,
        kind: 'error',
        _loadError: String(errorMessage || '读取文件超时，请点击重新加载'),
        _retryContext: retryContext,
        _showInDrawer: Boolean(inDrawer),
        _showInMain: !inDrawer,
      });
    };

    // 图片文件直接 0-RTT 挂出直出流预览（省去 1 次跨海 /fs/read 往返，且绝不会因 /fs/read 超时被弹回项目目录）
    if (!isDemoMode && isImageFileName(cleanRelPath)) {
      const buildRawStream = targetPath => {
        const sq = new URLSearchParams({
          path: String(targetPath || ''),
          ...(cwd ? { cwd: String(cwd) } : {}),
          ...(agentId ? { agentId: String(agentId) } : {}),
        }).toString();
        return `/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${sq}`;
      };
      const ext = baseName.includes('.') ? '.' + (baseName.split('.').pop() || '').toLowerCase() : '';
      pinPreviewBox({
        at: Date.now(),
        agentId: agentId || '',
        relPath: cleanRelPath,
        name: baseName,
        ext,
        kind: 'image',
        size: knownSize,
        streamUrl: buildRawStream(cleanRelPath),
        ...(backupRelPath ? { backupStreamUrl: buildRawStream(backupRelPath) } : {}),
        _imgStatus: 'loading',
        _retryContext: retryContext,
        _showInDrawer: Boolean(inDrawer),
        _showInMain: !inDrawer,
      });
      return;
    }

    filePreviewLoading = {
      hostId,
      relPath: cleanRelPath,
      prevAt: host?.lastFilePreview?.at || 0,
      at: Date.now(),
      drawer: inDrawer,
      seq: loadSeq,
    };
    renderAll();

    // 优先走独立高速 FS 隧道（0 轮询秒开文本/图片/视频）
    try {
      const qp = new URLSearchParams({
        cwd: String(cwd || ''),
        path: cleanRelPath,
        agentId: String(agentId || ''),
      });
      const fastRes = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/fs/read?${qp.toString()}`);
      if (loadSeq !== filePreviewLoadSeq) return;
      const fastData = await fastRes.json().catch(() => null);
      if (fastRes.ok && fastData?.ok) {
        const streamQuery = new URLSearchParams({
          path: String(fastData.relPath || cleanRelPath),
          ...(cwd ? { cwd: String(cwd) } : {}),
          ...(agentId ? { agentId: String(agentId) } : {}),
        }).toString();
        pinPreviewBox({
          ...fastData,
          at: Date.now(),
          agentId: agentId || '',
          relPath: fastData.relPath || cleanRelPath,
          streamUrl: fastData.streamUrl || `/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${streamQuery}`,
          _retryContext: retryContext,
          _showInDrawer: Boolean(inDrawer),
          _showInMain: !inDrawer,
        });
        return;
      }
      if (fastRes.status !== 404 && fastData?.error) {
        showToast('❌ 读取文件失败：' + fastData.error);
        pinErrorPreview(fastData.error);
        return;
      }
    } catch {
      if (loadSeq !== filePreviewLoadSeq) return;
      // 网络波动或旧版服务端时回退到指令队列兜底
    }

    let failure = '';
    try {
      const out = await dispatchHostCommand(hostId, { type: 'read_file', agentId, cwd, relPath: cleanRelPath });
      if (loadSeq !== filePreviewLoadSeq) return;
      if (out && out.ok === false) failure = out.error || '电脑未接受该指令';
    } catch (err) {
      if (loadSeq !== filePreviewLoadSeq) return;
      failure = (err && err.message) || String(err);
    }
    if (failure) {
      showToast('❌ 读取文件失败：' + failure);
      pinErrorPreview(failure);
      return;
    }
    for (let i = 0; i < 45 && filePreviewLoading && loadSeq === filePreviewLoadSeq; i++) {
      await sleepMs(250);
      if (!filePreviewLoading || loadSeq !== filePreviewLoadSeq) break;
      const state = await fetchState({ silent: true });
      if (loadSeq !== filePreviewLoadSeq) return;
      if (!state.ok) continue;
    }
    if (loadSeq !== filePreviewLoadSeq) return;
    if (filePreviewLoading) {
      showToast('⚠️ 读取文件超时，可在当前页点重新加载');
      pinErrorPreview('等待电脑响应超时（可能网络较慢或电脑暂时忙碌），请点击下方按钮重试');
      return;
    }
    renderAll();
    renderFilePanes();
  }

  function renderFilePanes() {
    if (desktopStageMode !== 'code') return;
    const pane = document.getElementById('desktopStageCodePane');
    if (!pane || pane.style.display === 'none') return;
    renderFilesTab(pane);
  }

  function toggleMdPreviewMode() {
    window.__dshRawMdPreview = !window.__dshRawMdPreview;
    renderAll();
    renderFilePanes();
  }

  function toggleHtmlPreviewMode() {
    window.__dshRawHtmlPreview = !window.__dshRawHtmlPreview;
    renderAll();
    renderFilePanes();
  }

  let activeHtmlOverlay = null;

  function rawCloseFullscreenHtmlPreview() {
    activeHtmlOverlay = null;
    const overlay = document.getElementById('htmlPreviewOverlay');
    const body = document.getElementById('htmlPreviewOverlayBody');
    if (body) body.innerHTML = '';
    if (overlay) overlay.style.display = 'none';
  }

  function renderFullscreenHtmlOverlay() {
    const overlay = document.getElementById('htmlPreviewOverlay');
    const body = document.getElementById('htmlPreviewOverlayBody');
    const titleEl = document.getElementById('htmlPreviewOverlayTitle');
    const modeBtn = document.getElementById('htmlPreviewModeBtn');
    if (!overlay || !body || !activeHtmlOverlay) return;
    if (titleEl) {
      titleEl.textContent = `🌐 ${activeHtmlOverlay.title || 'HTML 交互预览'}`;
    }
    if (modeBtn) {
      modeBtn.textContent = activeHtmlOverlay.showSource ? '🌐 预览' : '</> 源码';
    }
    if (activeHtmlOverlay.showSource) {
      const lines = String(activeHtmlOverlay.rawHtml || '').split('\n');
      const numbered = lines
        .map(
          (line, idx) =>
            `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:32px;text-align:right;flex-shrink:0;">${idx + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
        )
        .join('');
      body.style.background = '#0f172a';
      body.innerHTML = `<div style="padding:14px 12px;color:#f8fafc;min-height:100%;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">${numbered}</div>`;
    } else {
      const srcdocAttr = escapeSrcdocAttr(
        buildSandboxedHtmlSrcdoc(activeHtmlOverlay.rawHtml || '', {
          hostId: activeHtmlOverlay.hostId || '',
          relPath: activeHtmlOverlay.relPath || '',
          cwd: activeHtmlOverlay.cwd || '',
          agentId: activeHtmlOverlay.agentId || '',
          mediaTicket: hubState.mediaTicket || '',
          origin: typeof location !== 'undefined' ? location.origin : '',
        })
      );
      body.style.background = '#ffffff';
      body.innerHTML = `<iframe title="${esc(activeHtmlOverlay.title || 'HTML Preview')}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${srcdocAttr}" style="width:100%;height:100%;min-height:100%;border:none;background:#ffffff;display:block;"></iframe>`;
    }
    overlay.style.display = 'flex';
    applyLangToDom(overlay, langPref);
  }

  function openFullscreenHtmlOverlay(opts) {
    activeHtmlOverlay = {
      title: opts?.title || 'HTML 交互预览',
      rawHtml: String(opts?.rawHtml || ''),
      hostId: opts?.hostId || '',
      relPath: opts?.relPath || '',
      cwd: opts?.cwd || '',
      agentId: opts?.agentId || '',
      showSource: false,
    };
    renderFullscreenHtmlOverlay();
    trackOverlay('htmlPreviewOverlay', rawCloseFullscreenHtmlPreview);
  }

  function openInlineHtmlPreview(btnEl) {
    const preEl = btnEl?.closest?.('.code-card')?.querySelector?.('pre');
    const rawHtml = preEl ? (preEl.textContent || '') : '';
    if (!rawHtml.trim()) {
      showToast('⚠️ 未提取到 HTML 代码内容');
      return;
    }
    const found = findSessionGlobal(activeSessionId);
    openFullscreenHtmlOverlay({
      title: '对话内 HTML 交互预览',
      rawHtml,
      hostId: found?.host?.hostId || '',
      relPath: 'inline.html',
      cwd: found?.session?.cwd || fileProjectCwd || '',
      agentId: found?.session?.id || '',
    });
  }

  async function openFullscreenHtmlFromPreview(hostId, inDrawer = false) {
    const target = inDrawer ? pinnedDrawerPreviewByHost[hostId] : pinnedMainPreviewByHost[hostId];
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    const preview = target || host?.lastFilePreview;
    if (!preview) return;
    await ensureHtmlPreviewFullLoaded(hostId, preview);
    const found = findSessionGlobal(activeSessionId);
    openFullscreenHtmlOverlay({
      title: preview.name || preview.relPath || 'HTML 交互预览',
      rawHtml: preview.content || '',
      hostId,
      relPath: preview.relPath || preview.name || '',
      cwd: fileProjectCwd || found?.session?.cwd || '',
      agentId: preview.agentId || found?.session?.id || '',
    });
  }

  function closeFullscreenHtmlPreview() {
    dismissOverlay('htmlPreviewOverlay', rawCloseFullscreenHtmlPreview);
  }

  function toggleFullscreenHtmlSource() {
    if (!activeHtmlOverlay) return;
    activeHtmlOverlay.showSource = !activeHtmlOverlay.showSource;
    renderFullscreenHtmlOverlay();
  }

  function reloadFullscreenHtmlPreview() {
    if (!activeHtmlOverlay) return;
    activeHtmlOverlay.showSource = false;
    renderFullscreenHtmlOverlay();
    showToast('🔄 已重新加载 HTML 页面');
  }

  // 原地异步拉取并弹出系统原生分享/保存面板，彻底避免 <a download> 在 iOS 主屏幕 PWA 跳进无返回键的死胡同页
  async function downloadPreviewMedia(dlUrl, fileName = 'download', btnEl = null) {
    if (!dlUrl) return;
    const safeName = String(fileName || 'download').split('/').filter(Boolean).pop() || 'download';

    // 若上次在蜂窝网络拉取超过 4s 导致 iOS WebKit 用户激活手势过期，第二次轻触直接 0ms 唤起原生面板
    if (btnEl?.__readyShareFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const cachedFile = btnEl.__readyShareFile;
      try {
        await navigator.share({ files: [cachedFile], title: safeName });
        delete btnEl.__readyShareFile;
        if (btnEl.__origLabel) btnEl.textContent = btnEl.__origLabel;
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    if (btnEl?.dataset?.downloading === '1') return;
    const origLabel = btnEl ? (btnEl.__origLabel || btnEl.textContent || '') : '';
    if (btnEl) {
      btnEl.__origLabel = origLabel;
      btnEl.dataset.downloading = '1';
      btnEl.disabled = true;
      btnEl.textContent = '⏳ 准备中…';
    }

    let wakeLockSentinel = null;
    try {
      if (typeof navigator !== 'undefined' && navigator.wakeLock?.request) {
        wakeLockSentinel = await navigator.wakeLock.request('screen').catch(() => null);
      }
    } catch { }

    try {
      const token = getToken();
      const freshMt = hubState.mediaTicket || '';
      let effectiveDlUrl = String(dlUrl || '');
      const isDataUrl = effectiveDlUrl.startsWith('data:');
      if (!isDataUrl && freshMt && effectiveDlUrl.includes('/fs/stream')) {
        try {
          const u = new URL(effectiveDlUrl, typeof location !== 'undefined' ? location.origin : 'http://localhost');
          u.searchParams.set('mt', freshMt);
          effectiveDlUrl = `${u.pathname}?${u.searchParams.toString()}`;
        } catch { }
      }

      const guessMimeByName = nameStr =>
        /\.png$/i.test(nameStr)
          ? 'image/png'
          : /\.(jpe?g)$/i.test(nameStr)
            ? 'image/jpeg'
            : /\.webp$/i.test(nameStr)
              ? 'image/webp'
              : /\.gif$/i.test(nameStr)
                ? 'image/gif'
                : /\.svg$/i.test(nameStr)
                  ? 'image/svg+xml'
                  : /\.mp4$/i.test(nameStr)
                    ? 'video/mp4'
                    : /\.mov$/i.test(nameStr)
                      ? 'video/quicktime'
                      : /\.webm$/i.test(nameStr)
                        ? 'video/webm'
                        : 'application/octet-stream';

      let blob = null;
      let mimeType = guessMimeByName(safeName);

      // 优先尝试方案 2：WebRTC P2P DataChannel 点对点极速直传（同 Wi-Fi / Tailscale / 国内直连跑满带宽）
      const streamDesc = !isDataUrl ? parseStreamUrlDescriptor(effectiveDlUrl) : null;
      if (streamDesc) {
        const p2pOut = await fetchMediaViaWebRtc(effectiveDlUrl, {
          token,
          mediaTicket: freshMt || streamDesc.mt,
          download: true,
          fastPreview: false,
          raw: true,
          transcode: false,
          connectTimeoutMs: 1500,
          onProgress: ({ received, totalBytes }) => {
            if (!btnEl) return;
            if (totalBytes > 0) {
              const pct = Math.min(99, Math.round((received / totalBytes) * 100));
              btnEl.textContent = `⚡ 直连拉取 ${pct}%…`;
            } else if (received > 0) {
              btnEl.textContent = `⚡ 已直连拉取 ${formatBytes(received)}…`;
            }
          },
        });
        if (p2pOut?.ok && p2pOut.blob) {
          blob = p2pOut.blob;
          mimeType = (p2pOut.mime || '').split(';')[0].trim() || mimeType;
        }
      }

      // 方案 1 保底：2 MiB 小分片 × 3 路并发流水线 + 单片 3 次指数退避自动重试（彻底杜绝 16 MiB 单包撞 Cloud Run 60s 504 超时）
      if (!blob) {
        const baseAuthHeaders = token ? { authorization: `Bearer ${token}` } : {};
        const DOWNLOAD_SLICE_BYTES = 2 * 1024 * 1024;
        const parseContentRangeInfo = headerVal => {
          const m = /bytes\s+(\d+)-(\d+)\/(\d+)/i.exec(String(headerVal || '').trim());
          if (!m) return null;
          return { start: Number(m[1]), end: Number(m[2]), total: Number(m[3]) };
        };
        const updateBtnProgress = (received, totalBytes) => {
          if (!btnEl) return;
          if (totalBytes > 0) {
            const pct = Math.min(99, Math.round((received / totalBytes) * 100));
            btnEl.textContent = `⏳ 拉取中 ${pct}%…`;
          } else {
            btnEl.textContent = `⏳ 已拉取 ${formatBytes(received)}…`;
          }
        };
        const fetchSliceBytesWithRetry = async (extraHeaders = {}, onDelta = null) => {
          let lastErr = null;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            let attemptAdded = 0;
            try {
              const resp = isDataUrl
                ? await fetch(effectiveDlUrl)
                : await fetch(effectiveDlUrl, { headers: { ...baseAuthHeaders, ...extraHeaders } });
              if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
              }
              const chunks = [];
              if (resp.body && typeof resp.body.getReader === 'function') {
                const reader = resp.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  if (value) {
                    chunks.push(value);
                    attemptAdded += value.byteLength;
                    onDelta?.(value.byteLength);
                  }
                }
              } else {
                const u8 = new Uint8Array(await resp.arrayBuffer());
                chunks.push(u8);
                attemptAdded += u8.byteLength;
                onDelta?.(u8.byteLength);
              }
              return { resp, chunks };
            } catch (err) {
              if (attemptAdded > 0) onDelta?.(-attemptAdded);
              lastErr = err;
              if (attempt < 2) {
                await new Promise(r => setTimeout(r, 450 * (attempt + 1)));
              }
            }
          }
          throw lastErr || new Error('分片拉取失败');
        };

        let receivedBytes = 0;
        let knownTotalBytes = 0;
        const firstExtraHeaders = !isDataUrl && streamDesc ? { Range: `bytes=0-${DOWNLOAD_SLICE_BYTES - 1}` } : {};
        const firstSlice = await fetchSliceBytesWithRetry(firstExtraHeaders, delta => {
          receivedBytes = Math.max(0, receivedBytes + delta);
          updateBtnProgress(receivedBytes, knownTotalBytes);
        });
        const firstResp = firstSlice.resp;
        const firstCr = firstResp.status === 206 ? parseContentRangeInfo(firstResp.headers.get('content-range')) : null;
        knownTotalBytes = firstCr?.total || Number(firstResp.headers.get('content-length') || 0);
        mimeType = (firstResp.headers.get('content-type') || '').split(';')[0].trim() || mimeType;
        updateBtnProgress(receivedBytes, knownTotalBytes);

        if (firstCr && firstCr.end + 1 < firstCr.total) {
          const ranges = [];
          for (let s = firstCr.end + 1; s < firstCr.total; s += DOWNLOAD_SLICE_BYTES) {
            const e = Math.min(firstCr.total - 1, s + DOWNLOAD_SLICE_BYTES - 1);
            ranges.push({ start: s, end: e });
          }
          const orderedPartChunks = new Array(ranges.length + 1);
          orderedPartChunks[0] = firstSlice.chunks;
          let nextIdx = 0;
          const workerCount = Math.min(3, ranges.length);
          const workers = Array.from({ length: workerCount }, async () => {
            while (nextIdx < ranges.length) {
              const myIdx = nextIdx++;
              const { start, end } = ranges[myIdx];
              const partOut = await fetchSliceBytesWithRetry(
                { Range: `bytes=${start}-${end}` },
                delta => {
                  receivedBytes = Math.max(0, receivedBytes + delta);
                  updateBtnProgress(receivedBytes, knownTotalBytes);
                }
              );
              orderedPartChunks[myIdx + 1] = partOut.chunks;
            }
          });
          await Promise.all(workers);
          const flatChunks = [];
          for (const group of orderedPartChunks) {
            if (Array.isArray(group)) flatChunks.push(...group);
          }
          blob = new Blob(flatChunks, { type: mimeType });
        } else {
          blob = new Blob(firstSlice.chunks, { type: mimeType });
        }
      }

      const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
      const preferNativeShare =
        isIosDevice() || isStandaloneApp() || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
      if (
        preferNativeShare &&
        typeof File === 'function' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        typeof navigator.share === 'function'
      ) {
        const shareFile = new File([blob], safeName, { type: mimeType });
        if (navigator.canShare({ files: [shareFile] })) {
          try {
            await navigator.share({ files: [shareFile], title: safeName });
            if (btnEl) {
              btnEl.dataset.downloading = '0';
              btnEl.disabled = false;
              btnEl.textContent = origLabel;
            }
            return;
          } catch (shareErr) {
            if (shareErr?.name === 'AbortError') {
              if (btnEl) {
                btnEl.dataset.downloading = '0';
                btnEl.disabled = false;
                btnEl.textContent = origLabel;
              }
              return;
            }
            if (shareErr?.name === 'NotAllowedError' && btnEl) {
              btnEl.__readyShareFile = shareFile;
              btnEl.dataset.downloading = '0';
              btnEl.disabled = false;
              btnEl.textContent = '📲 已缓存 · 再点存入相册/文件';
              showToast('📲 文件已拉取完成，再点一次按钮即可存入相册或文件');
              return;
            }
          }
        }
      }

      if (/MicroMessenger/i.test(ua)) {
        showToast('💡 微信内置浏览器限制直接存盘，可点右上角 ⋯ 在系统浏览器打开保存');
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = safeName;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        showToast(`✅ 已开始保存 ${safeName}`);
      }
    } catch (err) {
      showToast('❌ 保存失败：' + ((err && err.message) || String(err)));
    } finally {
      if (wakeLockSentinel) {
        try { await wakeLockSentinel.release(); } catch { }
      }
      if (btnEl && !btnEl.__readyShareFile) {
        btnEl.dataset.downloading = '0';
        btnEl.disabled = false;
        btnEl.textContent = origLabel;
      }
    }
  }

  function cancelFilePreviewLoading() {
    filePreviewLoadSeq += 1;
    filePreviewLoading = null;
    renderAll();
  }

  function renderFilesTab(container = document.getElementById('mainViewport')) {
    const hosts = hubState.hosts || [];
    const host = currentHostId === 'ALL_HOSTS'
      ? (
        (filePreviewLoading && !filePreviewLoading.drawer && hosts.find(h => h.hostId === filePreviewLoading.hostId)) ||
        hosts.find(h => pinnedMainPreviewByHost[h.hostId]?._showInMain) ||
        hosts[0]
      )
      : hosts.find(h => h.hostId === currentHostId);
    if (!host) {
      container.innerHTML = `
          <div style="padding:48px 20px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">💻</div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">还没有接入电脑</div>
            <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">请先在电脑终端执行一行安装命令接入本机，即可远程浏览项目代码与文件</div>
            <button class="pill-action-btn primary" onclick="switchTab('chats')">👉 去查看一行接入命令</button>
          </div>
        `;
      return;
    }
    reconcileFileLoading(host);
    const projects = getHostProjects(host);
    if (!fileProjectCwd && projects[0]) {
      fileProjectCwd = projects[0].cwd;
    }
    const firstSession = (host.bridgeState?.tasks || []).find(t => t.cwd === fileProjectCwd) || (host.bridgeState?.tasks || [])[0];
    const agentId = firstSession?.id || '';

    const preview = pinnedMainPreviewByHost[host.hostId] || (host.lastFilePreview?._showInMain ? host.lastFilePreview : null);
    const previewLoading = filePreviewLoading
      && filePreviewLoading.hostId === host.hostId
      && !filePreviewLoading.drawer;
    if (previewLoading) {
      const loadingName = String(filePreviewLoading.relPath || '').split('/').filter(Boolean).pop() || '文件';
      container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="cancelFilePreviewLoading()">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);">${esc(loadingName)}</span>
            <span style="width:72px;"></span>
          </div>
          <div style="padding:16px 12px;background:#0f172a;min-height:calc(100% - 44px);">
            ${fileLoadingSpinnerHtml('正在读取文件内容…')}
          </div>
        `;
      return;
    }

    if (preview && preview._showInMain) {
      container.dataset.dshFilesListKey = '';
      void ensureTextPreviewLoaded(host.hostId, preview);
      if (isHtmlFileName(preview.name || preview.relPath || '')) {
        void ensureHtmlPreviewFullLoaded(host.hostId, preview);
      }
      const kind = previewKind(preview);
      const mt = hubState.mediaTicket || '';
      const isMarkdown = kind === 'text' && /\.(md|markdown|mdx)$/i.test(preview.name || preview.relPath || '');
      const isHtml = kind === 'text' && isHtmlFileName(preview.name || preview.relPath || '');
      const rawMdMode = Boolean(window.__dshRawMdPreview);
      const rawHtmlMode = Boolean(window.__dshRawHtmlPreview);
      // 图片/视频/长文件在每次轮询里都重建 DOM 会卡顿，内容与播放模式没变就复用
      const stableStamp = kind === 'image' && preview.streamUrl
        ? `r${preview._reloadNonce || 0}`
        : `${preview.at || 0}:r${preview._reloadNonce || 0}`;
      const previewKey = `${stableStamp}:${preview.relPath || ''}:${kind}:${preview._origImage ? 1 : 0}:${preview._transcodeVideo ? 1 : 0}:${preview._rawVideo ? 1 : 0}:${isMarkdown ? (rawMdMode ? 'raw' : 'md') : ''}:${isHtml ? (rawHtmlMode ? 'raw-html' : 'html') : ''}:${(preview.content || '').length}:${preview._loadError || ''}`;
      if (container.dataset.dshPreviewKey === previewKey && container.querySelector('.file-preview-body')) return;
      container.dataset.dshPreviewKey = previewKey;
      const lines = String(preview.content || '').split('\n');
      const numberedHtml = lines.map((line, i) =>
        `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
      ).join('');
      const canToggleOrigImg =
        kind === 'image' &&
        Boolean(preview.streamUrl) &&
        !/\.(svg|gif)$/i.test(preview.name || '') &&
        (!preview.size || preview.size > 120 * 1024);
      const dlUrl = preview.streamUrl
        ? appendMediaAuth(`${preview.streamUrl}${preview.streamUrl.includes('?') ? '&' : '?'}download=1`, mt)
        : '';
      const videoMetaUi = kind === 'video' ? describeVideoPreviewStatus(preview) : null;
      const htmlSrcdocAttr = isHtml && !rawHtmlMode
        ? escapeSrcdocAttr(
          buildSandboxedHtmlSrcdoc(preview.content || '', {
            hostId: host.hostId,
            relPath: preview.relPath || preview.name || '',
            cwd: fileProjectCwd || firstSession?.cwd || '',
            agentId: preview.agentId || agentId || '',
            mediaTicket: mt,
            origin: typeof location !== 'undefined' ? location.origin : '',
          })
        )
        : '';
      const previewBodyHtml = kind === 'error'
        ? buildPreviewErrorBodyHtml(preview, host.hostId, false)
        : kind === 'video'
        ? `<div class="file-preview-body" style="padding:18px 14px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;">
               <video class="file-preview-video" data-hls-src="${esc(videoHlsSrc(preview, mt))}" data-fallback-src="${esc(videoPreviewSrc(preview, mt))}" data-video-bytes="${Number(preview.size || 0)}" data-dsh-universal-direct="${preview.videoProbe?.universalDirectPlay ? '1' : '0'}" controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="onSmartVideoLoadedMeta(this)" onerror="onSmartVideoError(this)"></video>
               <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;">
                 <span data-dsh-video-status="1" style="font-size:12px;color:#94a3b8;">🎬 ${esc(formatBytes(preview.size))} · ${esc(videoMetaUi.badge)}</span>
                 <button type="button" class="media-toolbar-pill" onclick="switchVideoTranscodeMode('${esc(host.hostId)}', false)">${esc(videoMetaUi.toggleLabel)}</button>
                 ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc(dlUrl)}', '${esc(preview.name || 'video.mp4')}', this)">⬇️ 保存/分享视频</button>` : ''}
               </div>
             </div>`
        : kind === 'image'
          ? buildPreviewImageBodyHtml(preview, host.hostId, false, mt, dlUrl, canToggleOrigImg)
          : kind === 'binary'
            ? `<div class="file-preview-body" style="padding:36px 16px;background:#0f172a;color:#94a3b8;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                   <div style="font-size:36px;">📦</div>
                   <div style="font-size:14.5px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                   <div style="font-size:13px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
                   ${dlUrl ? `<button type="button" class="media-toolbar-pill" onclick="downloadPreviewMedia('${esc(dlUrl)}', '${esc(preview.name || 'file')}', this)">⬇️ 保存/分享文件</button>` : ''}
                 </div>`
            : (isHtml && !rawHtmlMode)
              ? `<div class="file-preview-body html-sandbox-preview" style="padding:0;background:#ffffff;min-height:calc(100% - 44px);">
                   <iframe title="${esc(preview.name || 'HTML Preview')}" sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerpolicy="no-referrer" srcdoc="${htmlSrcdocAttr}" style="width:100%;height:calc(100vh - 150px);min-height:460px;border:none;background:#ffffff;display:block;"></iframe>
                 </div>`
              : (isMarkdown && !rawMdMode)
                ? `<div class="file-preview-body walkthrough-md-preview md-body" style="padding:16px 14px;background:var(--card-bg, #ffffff);color:var(--text, #0f172a);min-height:calc(100% - 44px);overflow-x:auto;">
                     ${formatAssistantText(preview.content || '')}
                   </div>`
                : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:calc(100% - 44px);overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.65;">
                     ${numberedHtml}
                   </div>`;
      container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;gap:6px;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="closeMainFilePreview('${esc(host.hostId)}')">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(preview.name)}</span>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${isHtml ? `<button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="openFullscreenHtmlFromPreview('${esc(host.hostId)}', false)">⛶ 全屏体验</button><button class="icon-pill-btn" onclick="toggleHtmlPreviewMode()">${rawHtmlMode ? '🌐 预览' : '</> 源码'}</button>` : ''}
              ${isMarkdown ? `<button class="icon-pill-btn" onclick="toggleMdPreviewMode()">${rawMdMode ? '📖 渲染' : '</> 源码'}</button>` : ''}
              ${kind !== 'text' ? '' : `<button class="icon-pill-btn" onclick="copyCodeText('${encodeURIComponent(preview.content || '')}')">📋 复制</button>`}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="askAiAboutFile('${esc(host.hostId)}', '${esc(fileProjectCwd)}', '${esc(preview.relPath || preview.name)}')">💬 让 AI 分析</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
      if (isMarkdown && !rawMdMode && firstSession) {
        void hydrateInlineChatImages({ ...firstSession, hostId: host.hostId }, container);
      } else if (kind === 'video') {
        const vidEl = container.querySelector('video.file-preview-video');
        if (vidEl) void mountSmartVideoElement(vidEl);
      } else if (kind === 'image') {
        syncMountedPreviewImage(container);
      }
      return;
    }

    container.dataset.dshPreviewKey = '';
    const listing = host.lastFsListing;
    const entries = listing?.entries || [];
    const loadingDir = fileLoading && fileLoading.hostId === host.hostId && !fileLoading.drawer;
    const rootCwd = listing?.rootCwd || fileProjectCwd;
    const activeSubDir = loadingDir ? (fileLoading.subDir || '') : (listing?.subDir || '');
    const filesListKey = `${host.hostId}:${fileProjectCwd}:${rootCwd}:${activeSubDir}:${loadingDir ? 1 : 0}:${listing?.at || 0}:${entries.length}:${projects.map(p => p.cwd).join(',')}`;
    if (container.dataset.dshFilesListKey === filesListKey && container.querySelector('.breadcrumbs-bar')) return;
    container.dataset.dshFilesListKey = filesListKey;
    const dirNavKey = `${host.hostId}:${rootCwd}:${activeSubDir}`;
    const sameDirAsBefore = container.dataset.dshDirNavKey === dirNavKey;
    container.dataset.dshDirNavKey = dirNavKey;
    const prevScrollTop = sameDirAsBefore ? container.scrollTop : 0;
    const crumbs = buildBreadcrumbSegments(activeSubDir);

    const projectPillsHtml = `
        <div class="filter-strip" style="border-bottom:1px solid var(--hairline);">
          ${projects.map(p => `
            <button class="filter-pill ${p.cwd === fileProjectCwd ? 'active' : ''}" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(p.cwd)}', '')">📁 ${esc(p.name)}</button>
          `).join('')}
        </div>
      `;

    // 逐级面包屑：src / lib / utils 都能点，不用先退回根目录
    const breadcrumbHtml = `
        <div class="breadcrumbs-bar">
          <span class="crumb-link" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(rootCwd)}', '')">🏠 根目录</span>
          ${crumbs.map((c, index) => {
      const isLast = index === crumbs.length - 1;
      const sep = '<span style="color:#94a3b8;">/</span>';
      return sep + (isLast
        ? `<span style="font-weight:600;color:var(--text);">${esc(c.name)}</span>`
        : `<span class="crumb-link" onclick="requestDirList('${esc(host.hostId)}', '${esc(agentId)}', '${esc(rootCwd)}', '${esc(c.path)}')">${esc(c.name)}</span>`);
    }).join('')}
          ${crumbs.length === 0 ? `<span style="color:#94a3b8;margin-left:auto;font-family:monospace;">${esc(rootCwd)}</span>` : ''}
        </div>
      `;

    const listHtml = loadingDir
      ? fileLoadingSpinnerHtml(activeSubDir ? `正在读取 ${activeSubDir} …` : '正在读取目录…')
      : (entries.map(e => `
        <div class="file-row" onclick="clickRealFileEntry('${esc(host.hostId)}', '${esc(agentId)}', '${esc(listing?.rootCwd || fileProjectCwd)}', '${esc(e.relPath)}', ${Boolean(e.isDirectory)}, false)">
          <div class="file-row-left">
            <span style="font-size:18px;">${fileEntryIcon(e)}</span>
            <span style="font-weight:500;">${esc(e.name)}</span>
          </div>
          <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? '目录' : formatBytes(e.size)} ›</span>
        </div>
      `).join('') || `<div style="padding:36px;text-align:center;color:#94a3b8;">点击上方项目胶囊加载远程目录...</div>`);

    container.innerHTML = projectPillsHtml + breadcrumbHtml + `<div>${listHtml}</div>`;
    container.scrollTop = prevScrollTop;
  }

  function closeMainFilePreview(hostId) {
    delete pinnedMainPreviewByHost[hostId];
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    if (host?.lastFilePreview) host.lastFilePreview._showInMain = false;
    renderAll();
  }

  function askAiAboutFile(hostId, cwd, fileName) {
    if (desktopStageMode === 'code') switchDesktopStage('chat');
    switchTab('chats');
    newTaskHostId = hostId;
    newTaskCwd = cwd;
    openNewTaskSheet();
    document.getElementById('newTaskInput').value = `请帮我阅读并分析 @${fileName} 文件，看看有没有可以优化的地方：`;
  }

  function switchDesktopStage(mode) {
    desktopStageMode = mode;
    document.getElementById('stageBtnChat').classList.toggle('active', mode === 'chat');
    document.getElementById('stageBtnCode').classList.toggle('active', mode === 'code');

    const chatBox = document.getElementById('chatMessages');
    const composer = document.getElementById('chatComposerBar');
    const codePane = document.getElementById('desktopStageCodePane');

    if (mode === 'code') {
      chatBox.style.display = 'none';
      composer.style.display = 'none';
      renderAttachmentStrip('chat');
      codePane.style.display = 'block';
      const found = findSessionGlobal(activeSessionId);
      if (found) {
        fileProjectCwd = found.session.cwd;
        requestDirList(found.session.hostId, found.session.id, found.session.cwd, '');
      }
      renderFilesTab(codePane);
    } else {
      chatBox.style.display = 'flex';
      composer.style.display = 'flex';
      codePane.style.display = 'none';
      renderAttachmentStrip('chat');
    }
  }

  // ==================== 9. 新建任务半屏面板 ====================
  function openNewTaskSheet() {
    const hosts = hubState.hosts || [];
    if (!newTaskHostId || !hosts.some(h => h.hostId === newTaskHostId)) {
      newTaskHostId = currentHostId !== 'ALL_HOSTS' ? currentHostId : (hosts[0]?.hostId || '');
    }
    const host = hosts.find(h => h.hostId === newTaskHostId);
    const projects = getHostProjects(host);
    if (!newTaskCwd && projects[0]) newTaskCwd = projects[0].cwd;
    renderNewTaskForm();
    renderAttachmentStrip('newTask');
    openSheet('newTaskSheet');
    if (!window.matchMedia?.('(max-width: 768px)')?.matches) {
      setTimeout(() => document.getElementById('newTaskInput')?.focus(), 100);
    }
  }

  function renderNewTaskForm() {
    const hosts = hubState.hosts || [];
    const hostChips = document.getElementById('newTaskHostChips');
    if (hosts.length === 0) {
      if (hostChips) {
        hostChips.innerHTML = `
            <div style="font-size:12px;color:#b45309;background:var(--amber-soft);padding:4px 8px;border-radius:6px;width:100%;">
              ⚠️ 暂无在线电脑
            </div>
          `;
      }
    } else if (hostChips) {
      const shortHostMap = buildShortHostNameMap(hosts);
      hostChips.innerHTML = hosts.map(h => {
        const shortName = shortHostMap[h.hostId] || h.hostName;
        const isSel = h.hostId === newTaskHostId;
        return `
            <button type="button" class="context-chip ${isSel ? 'selected' : ''}" title="${esc(h.hostName)}" onclick="selectNewTaskHost('${esc(h.hostId)}')">
              🟢 ${esc(shortName)}
            </button>
          `;
      }).join('');
    }

    const harnessChips = document.getElementById('newTaskHarnessChips');
    if (harnessChips) {
      const harnessOpts = [
        { id: 'antigravity-ide', label: 'IDE' },
        { id: 'codex', label: 'Codex' },
        { id: 'workbuddy', label: 'WorkBuddy' },
        { id: 'claude', label: 'Claude' },
        { id: 'dsh', label: 'DSH' },
      ];
      harnessChips.innerHTML = harnessOpts.map(opt => `
          <button type="button" class="context-chip ${opt.id === newTaskHarness ? 'selected' : ''}" onclick="selectNewTaskHarness('${opt.id}')">
            ${renderHarnessBadgeHtml(opt.id, 'chip')} ${esc(opt.label)}
          </button>
        `).join('');
    }

    const host = hosts.find(h => h.hostId === newTaskHostId);
    const projects = getHostProjects(host);
    if (!newTaskCwd && projects[0]) {
      newTaskCwd = projects[0].cwd;
      newTaskCustomIsNew = false;
    }

    const moreBtn = document.getElementById('newTaskProjMoreBtn');
    if (moreBtn) {
      moreBtn.textContent = `全部 (${projects.length}) ▾`;
    }

    const projChips = document.getElementById('newTaskProjectChips');
    if (projChips) {
      const isKnownProj = projects.some(p => p.cwd === newTaskCwd);
      const customChipHtml =
        newTaskCwd && !isKnownProj
          ? (() => {
            const folderLabel = newTaskCwd.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || newTaskCwd;
            const prefix = newTaskCustomIsNew ? `✨ 新建：${folderLabel}` : `📂 ${folderLabel}`;
            return `<button type="button" class="new-task-proj-pill selected" title="${esc(newTaskCwd)}" onclick="selectNewTaskProject('${esc(newTaskCwd)}', ${newTaskCustomIsNew ? 'true' : 'false'})">${esc(prefix)}</button>`;
          })()
          : '';
      projChips.innerHTML =
        customChipHtml +
        projects
          .map(
            p => `
          <button type="button" class="new-task-proj-pill ${p.cwd === newTaskCwd ? 'selected' : ''}" title="${esc(p.name)} (${esc(p.cwd)})" onclick="selectNewTaskProject('${esc(p.cwd)}', false)">
            📁 ${esc(formatCompactProjectLabel(p.name))}
          </button>
        `
          )
          .join('');
      const selBtn = projChips.querySelector('.new-task-proj-pill.selected');
      if (selBtn) {
        setTimeout(() => selBtn.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }), 50);
      }
    }
    const pathBar = document.getElementById('newTaskSelectedPathBar');
    if (pathBar) {
      pathBar.textContent = newTaskCwd
        ? newTaskCustomIsNew
          ? `📍 将创建新工作区：${newTaskCwd}`
          : `📍 当前工作区：${newTaskCwd}`
        : '';
    }
    updateNewTaskModelPill();
    if (langPref === 'en') {
      applyLangToDom(document.getElementById('newTaskSheet'), langPref);
    }
  }

  let newTaskProjectSearchQuery = '';
  let newTaskPickerMode = 'recent'; // 'recent' | 'browse' | 'create'
  let newTaskBrowseDir = '';
  let newTaskBrowseLoading = false;
  let newTaskBrowseError = '';
  let newTaskBrowseEntries = [];
  let newTaskBrowseReqSeq = 0;
  let newTaskCreateParentDir = '';
  let newTaskCreateFolderName = '';
  let newTaskCustomIsNew = false;

  function inferHostHomeDir(host, projects = []) {
    const candidates = [
      ...(projects || []).map(p => p.cwd).filter(Boolean),
      ...(host?.bridgeState?.workspaces || []).map(w => w?.cwd).filter(Boolean),
    ];
    for (const c of candidates) {
      const unixHome = /^(\/(?:Users|home)\/[^/]+)/.exec(c);
      if (unixHome) return unixHome[1];
      const winHome = /^([A-Za-z]:\\Users\\[^\\]+)/i.exec(c);
      if (winHome) return winHome[1];
    }
    if (candidates[0]) {
      const clean = candidates[0].replace(/[/\\]+$/, '');
      const idx = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
      if (idx > 0) return clean.slice(0, idx);
      return clean;
    }
    return '~';
  }

  function computeParentDirPath(dirPath = '') {
    const clean = String(dirPath || '').replace(/[/\\]+$/, '');
    if (!clean || clean === '/' || clean === '~' || /^[A-Za-z]:$/i.test(clean)) return '';
    const sepChar = clean.includes('\\') ? '\\' : '/';
    const idx = clean.lastIndexOf(sepChar);
    if (idx < 0) return '';
    if (idx === 0) return '/';
    const parent = clean.slice(0, idx);
    if (/^[A-Za-z]:$/i.test(parent)) return parent + '\\';
    return parent;
  }

  function joinRemotePath(baseDir = '', childName = '', homeFallback = '~') {
    const rawChild = String(childName || '').trim();
    if (!rawChild) return String(baseDir || '').trim();
    if (rawChild.startsWith('/') || /^[A-Za-z]:[/\\]/.test(rawChild)) {
      return rawChild.replace(/[/\\]+$/, '') || '/';
    }
    if (rawChild === '~' || rawChild.startsWith('~/') || rawChild.startsWith('~\\')) {
      if (homeFallback && homeFallback !== '~') {
        const sepChar = homeFallback.includes('\\') ? '\\' : '/';
        const rest = rawChild.slice(2).replace(/^[/\\]+/, '');
        return rest ? `${homeFallback.replace(/[/\\]+$/, '')}${sepChar}${rest}` : homeFallback;
      }
      return rawChild;
    }
    const base = String(baseDir || homeFallback || '~').replace(/[/\\]+$/, '');
    const sepChar = base.includes('\\') ? '\\' : '/';
    return base === '/' ? `/${rawChild}` : `${base}${sepChar}${rawChild}`;
  }

  async function browseNewTaskDir(targetDir) {
    const hosts = hubState.hosts || [];
    const host = hosts.find(h => h.hostId === newTaskHostId);
    if (!host) return;
    const projects = getHostProjects(host);
    const dirToLoad = String(targetDir || '').trim() || newTaskBrowseDir || inferHostHomeDir(host, projects);
    newTaskBrowseDir = dirToLoad;
    newTaskBrowseLoading = true;
    newTaskBrowseError = '';
    const seq = ++newTaskBrowseReqSeq;
    renderNewTaskProjectPickerList();
    try {
      const qp = new URLSearchParams({ cwd: dirToLoad, path: '' });
      const res = await apiFetch(`/api/hosts/${encodeURIComponent(host.hostId)}/fs/list?${qp.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (seq !== newTaskBrowseReqSeq) return;
      if (!res.ok || data?.ok === false) {
        newTaskBrowseError = data?.error || `读取目录失败 (HTTP ${res.status})`;
        newTaskBrowseEntries = [];
      } else {
        if (data.rootCwd) newTaskBrowseDir = data.rootCwd;
        newTaskCreateParentDir = newTaskBrowseDir;
        newTaskBrowseEntries = Array.isArray(data.entries) ? data.entries.filter(e => e && e.isDirectory) : [];
      }
    } catch (err) {
      if (seq !== newTaskBrowseReqSeq) return;
      newTaskBrowseError = err?.message || '读取目录失败';
      newTaskBrowseEntries = [];
    } finally {
      if (seq === newTaskBrowseReqSeq) {
        newTaskBrowseLoading = false;
        renderNewTaskProjectPickerList();
      }
    }
  }

  function switchNewTaskPickerMode(mode = 'recent') {
    newTaskPickerMode = mode === 'browse' || mode === 'create' ? mode : 'recent';
    const hosts = hubState.hosts || [];
    const host = hosts.find(h => h.hostId === newTaskHostId);
    const projects = getHostProjects(host);
    const homeGuess = inferHostHomeDir(host, projects);
    if (!newTaskBrowseDir) newTaskBrowseDir = homeGuess;
    if (!newTaskCreateParentDir) newTaskCreateParentDir = newTaskBrowseDir || homeGuess;

    document.getElementById('newTaskTabRecent')?.classList.toggle('active', newTaskPickerMode === 'recent');
    document.getElementById('newTaskTabBrowse')?.classList.toggle('active', newTaskPickerMode === 'browse');
    document.getElementById('newTaskTabCreate')?.classList.toggle('active', newTaskPickerMode === 'create');
    const searchWrap = document.getElementById('newTaskPickerSearchWrap');
    if (searchWrap) searchWrap.style.display = newTaskPickerMode === 'recent' ? 'block' : 'none';

    if (newTaskPickerMode === 'browse') {
      void browseNewTaskDir(newTaskBrowseDir);
      return;
    }
    renderNewTaskProjectPickerList();
    if (newTaskPickerMode === 'create') {
      setTimeout(() => document.getElementById('newTaskNewWsNameInput')?.focus(), 100);
    }
  }

  function openNewTaskProjectPickerSheet(initialMode = 'recent') {
    newTaskProjectSearchQuery = '';
    const input = document.getElementById('newTaskProjectSearchInput');
    if (input) input.value = '';
    openSheet('newTaskProjectPickerSheet');
    switchNewTaskPickerMode(initialMode);
    if (initialMode === 'recent' && input && !window.matchMedia?.('(max-width: 768px)')?.matches) {
      setTimeout(() => input.focus(), 150);
    }
  }

  function filterNewTaskProjects(query) {
    newTaskProjectSearchQuery = String(query || '').trim().toLowerCase();
    renderNewTaskProjectPickerList();
  }

  function selectBrowsedNewTaskDir(dirPath) {
    const clean = String(dirPath || newTaskBrowseDir || '').trim();
    if (!clean) return;
    newTaskCwd = clean;
    newTaskCustomIsNew = false;
    renderNewTaskForm();
    closeSheet('newTaskProjectPickerSheet');
  }

  function openCreateUnderCurrentBrowseDir() {
    if (newTaskBrowseDir) newTaskCreateParentDir = newTaskBrowseDir;
    switchNewTaskPickerMode('create');
  }

  function onNewWorkspaceInput(val) {
    newTaskCreateFolderName = String(val || '');
    const hosts = hubState.hosts || [];
    const host = hosts.find(h => h.hostId === newTaskHostId);
    const homeGuess = inferHostHomeDir(host, getHostProjects(host));
    const targetPath = joinRemotePath(newTaskCreateParentDir || homeGuess, newTaskCreateFolderName, homeGuess);
    const previewEl = document.getElementById('newTaskCreateResolvedPreview');
    if (previewEl) {
      previewEl.textContent = newTaskCreateFolderName.trim()
        ? (langPref === 'en' ? `📍 Will create workspace: ${targetPath}` : `📍 将创建新工作区：${targetPath}`)
        : (langPref === 'en' ? `📍 Parent: ${newTaskCreateParentDir || homeGuess}` : `📍 父目录：${newTaskCreateParentDir || homeGuess}`);
    }
  }

  function confirmCreateNewWorkspace() {
    const raw = String(newTaskCreateFolderName || document.getElementById('newTaskNewWsNameInput')?.value || '').trim();
    if (!raw) {
      showToast(langPref === 'en' ? '⚠️ Please enter a new folder name or path' : '⚠️ 请输入新工作区文件夹名称或路径');
      document.getElementById('newTaskNewWsNameInput')?.focus();
      return;
    }
    const hosts = hubState.hosts || [];
    const host = hosts.find(h => h.hostId === newTaskHostId);
    const homeGuess = inferHostHomeDir(host, getHostProjects(host));
    const resolved = joinRemotePath(newTaskCreateParentDir || homeGuess, raw, homeGuess);
    newTaskCwd = resolved;
    newTaskCustomIsNew = true;
    newTaskCreateFolderName = '';
    renderNewTaskForm();
    closeSheet('newTaskProjectPickerSheet');
  }

  function renderNewTaskProjectPickerList() {
    const body = document.getElementById('newTaskProjectPickerBody');
    if (!body) return;
    const hosts = hubState.hosts || [];
    const host = hosts.find(h => h.hostId === newTaskHostId);
    const projects = getHostProjects(host);
    const homeGuess = inferHostHomeDir(host, projects);

    if (newTaskPickerMode === 'browse') {
      const curDir = newTaskBrowseDir || homeGuess;
      const parentDir = computeParentDirPath(curDir);
      body.innerHTML = `
        <div style="padding:10px 12px;background:var(--subtle);border:1px solid var(--border);border-radius:12px;margin-bottom:10px;">
          <div style="font-size:11.5px;color:var(--muted);word-break:break-all;margin-bottom:8px;">📂 ${esc(curDir)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="pill-action-btn primary" style="flex:1;justify-content:center;padding:7px 12px;font-size:12.5px;" onclick="selectBrowsedNewTaskDir('${esc(curDir)}')">✓ 选定此目录作为工作区</button>
            <button type="button" class="pill-action-btn" style="padding:7px 10px;font-size:12.5px;" onclick="openCreateUnderCurrentBrowseDir()">＋ 新工作区</button>
          </div>
        </div>
        ${parentDir ? `
          <div class="host-option" onclick="browseNewTaskDir('${esc(parentDir)}')">
            <div style="font-size:13px;font-weight:600;color:var(--primary);">⬆️ 返回上一级目录</div>
            <span style="font-size:11px;color:var(--muted);margin-left:auto;max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(parentDir)}</span>
          </div>
        ` : ''}
        ${newTaskBrowseLoading ? fileLoadingSpinnerHtml('正在读取电脑目录…') : newTaskBrowseError ? `
          <div style="padding:18px 12px;text-align:center;color:#dc2626;font-size:12.5px;">⚠️ ${esc(newTaskBrowseError)}</div>
        ` : newTaskBrowseEntries.length === 0 ? `
          <div style="padding:20px 12px;text-align:center;color:var(--muted);font-size:12.5px;">此目录下暂无子文件夹</div>
        ` : newTaskBrowseEntries.map(dir => {
        const childFull = joinRemotePath(curDir, dir.name, homeGuess);
        return `
            <div class="host-option" onclick="browseNewTaskDir('${esc(childFull)}')">
              <div style="min-width:0;flex:1;display:flex;align-items:center;gap:8px;">
                <span>📁</span>
                <span style="font-size:13.5px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(dir.name)}</span>
              </div>
              <span style="font-size:12px;color:var(--muted);">›</span>
            </div>
          `;
      }).join('')}
      `;
      if (langPref === 'en') applyLangToDom(body, langPref);
      return;
    }

    if (newTaskPickerMode === 'create') {
      const parentDir = newTaskCreateParentDir || homeGuess;
      const previewTarget = newTaskCreateFolderName.trim()
        ? `📍 将创建新工作区：${joinRemotePath(parentDir, newTaskCreateFolderName, homeGuess)}`
        : `📍 父目录：${parentDir}`;
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;padding:4px 2px 8px;">
          <div style="padding:10px 12px;background:var(--subtle);border:1px solid var(--border);border-radius:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">📂 父级目录（新文件夹将建在此目录下）</span>
              <button type="button" class="proj-header-more-btn" onclick="switchNewTaskPickerMode('browse')">更改父目录…</button>
            </div>
            <div style="font-size:12px;color:var(--text);word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${esc(parentDir)}</div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">📝 新项目文件夹名称（或直接填完整路径）</div>
            <input
              type="text"
              class="auth-input"
              id="newTaskNewWsNameInput"
              value="${esc(newTaskCreateFolderName)}"
              placeholder="例如：my-new-app 或 ~/projects/demo"
              style="margin:0;"
              oninput="onNewWorkspaceInput(this.value)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();confirmCreateNewWorkspace();}"
            />
            <div id="newTaskCreateResolvedPreview" style="margin-top:8px;font-size:11.5px;color:var(--primary);word-break:break-all;">${esc(previewTarget)}</div>
          </div>
          <button type="button" class="primary-block-btn" onclick="confirmCreateNewWorkspace()">✨ 创建并选定新工作区</button>
        </div>
      `;
      if (langPref === 'en') applyLangToDom(body, langPref);
      return;
    }

    const q = newTaskProjectSearchQuery;
    const filtered = projects.filter(p => !q || p.name.toLowerCase().includes(q) || p.cwd.toLowerCase().includes(q));

    if (filtered.length === 0) {
      body.innerHTML = `
        <div style="padding:20px 12px;text-align:center;color:var(--muted);font-size:13px;">
          <div style="margin-bottom:12px;">未找到匹配的项目文件夹</div>
          <div style="display:flex;gap:8px;justify-content:center;">
            <button type="button" class="pill-action-btn" onclick="switchNewTaskPickerMode('browse')">📂 选择目录</button>
            <button type="button" class="pill-action-btn primary" onclick="switchNewTaskPickerMode('create')">＋ 新工作区</button>
          </div>
        </div>
      `;
      if (langPref === 'en') applyLangToDom(body, langPref);
      return;
    }

    body.innerHTML = filtered.map(p => {
      const isSel = p.cwd === newTaskCwd;
      return `
        <div class="host-option ${isSel ? 'selected' : ''}" onclick="selectNewTaskProject('${esc(p.cwd)}', false); closeSheet('newTaskProjectPickerSheet');">
          <div style="min-width:0;flex:1;">
            <div style="font-size:13.5px;font-weight:700;color:var(--text);">📁 ${esc(p.name)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.cwd)}</div>
          </div>
          ${isSel ? '<span style="color:var(--primary);font-weight:700;margin-left:8px;">✓</span>' : ''}
        </div>
      `;
    }).join('');
    if (langPref === 'en') applyLangToDom(body, langPref);
  }

  function selectNewTaskHost(id) {
    newTaskHostId = id;
    newTaskCwd = '';
    newTaskCustomIsNew = false;
    newTaskBrowseDir = '';
    newTaskCreateParentDir = '';
    renderNewTaskForm();
  }

  function selectNewTaskHarness(h) {
    newTaskHarness = h;
    newTaskModel = '';
    renderNewTaskForm();
  }

  function selectNewTaskProject(cwd, isNew = false) {
    newTaskCwd = cwd;
    newTaskCustomIsNew = Boolean(isNew);
    renderNewTaskForm();
  }

  function fillQuickPrompt(text) {
    const box = document.getElementById('newTaskInput');
    box.value = text;
    box.focus();
  }

  async function submitNewTask() {
    if (isDictationActiveFor('newTaskInput')) {
      await flushVoiceInputBeforeSend('newTaskInput');
    } else {
      stopVoiceInput();
    }
    const inputEl = document.getElementById('newTaskInput');
    const rawText = inputEl ? inputEl.value.trim() : '';
    const pendingAttachments = composerAttachments.newTask.slice();
    if (!newTaskHostId || (hubState.hosts || []).length === 0) {
      showToast('⚠️ 请先接入一台电脑后再创建远程任务');
      return;
    }
    if (!rawText && pendingAttachments.length === 0) {
      showToast('请输入任务指令或上传截图');
      return;
    }
    const text = rawText || '请查看我上传的截图并帮我分析处理。';
    if (inputEl) inputEl.value = '';
    composerAttachments.newTask = [];
    renderAttachmentStrip('newTask');
    closeSheet('newTaskSheet');
    const engineName = newTaskHarness === 'antigravity-ide'
      ? 'Antigravity IDE'
      : newTaskHarness === 'codex'
        ? 'OpenAI Codex'
        : newTaskHarness === 'workbuddy'
          ? 'WorkBuddy'
          : newTaskHarness === 'claude'
            ? 'Claude Code'
            : 'DeepSeek Harness';
    showToast(`🚀 正在远程电脑 (${engineName}) 创建新任务...`);
    let dispatchRes = null;
    try {
      dispatchRes = await dispatchHostCommand(newTaskHostId, {
        type: 'new_session',
        harness: newTaskHarness,
        cwd: newTaskCwd,
        ...(newTaskCustomIsNew ? { createDir: true } : {}),
        title: text.slice(0, 28),
        prompt: text,
        ...(newTaskModel ? { model: newTaskModel } : {}),
        ...(pendingAttachments.length > 0
          ? {
            attachments: pendingAttachments.map(a => ({
              name: a.name,
              mimeType: a.mimeType,
              dataBase64: a.dataBase64,
            })),
          }
          : {}),
      });
    } catch (err) {
      dispatchRes = { ok: false, error: err?.message || '网络请求失败' };
    }
    if (!dispatchRes || dispatchRes.ok === false) {
      if (inputEl && !inputEl.value.trim() && rawText) {
        inputEl.value = rawText;
      }
      if (pendingAttachments.length > 0 && composerAttachments.newTask.length === 0) {
        composerAttachments.newTask = pendingAttachments;
        renderAttachmentStrip('newTask');
      }
      openSheet('newTaskSheet');
      showToast('❌ 创建任务失败：' + (dispatchRes?.error || '请重试'));
      return;
    }
    setTimeout(fetchState, 800);
  }

  // ==================== 10. 会话操作菜单 (重命名 / 置顶 / 加密分享 / 看文件 / 删除) ====================
  function openCurrentSessionActions() {
    if (activeSessionId) openSessionActions(activeSessionId);
  }

  function openSessionActions(sessionId) {
    const found = findSessionGlobal(sessionId);
    if (!found) return;
    actionTargetSession = found.session;
    actionTargetHostId = found.session.hostId;
    confirmSheetDelete = false;
    renderActionSheet();
    openSheet('taskActionSheet');
  }

  function renderActionSheet() {
    const s = actionTargetSession;
    if (!s) return;
    document.getElementById('actionSheetTitle').innerHTML = `
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.title)}</span>
        <button style="border:none;background:transparent;color:var(--muted);font-size:18px;cursor:pointer;" onclick="closeSheet('taskActionSheet')">✕</button>
      `;
    document.getElementById('actionSheetBody').innerHTML = `
        <div style="margin-bottom:10px;display:flex;gap:6px;">
          <input id="renameInlineInput" value="${esc(s.title)}" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-size:15px;outline:none;" />
          <button style="background:var(--primary);color:#fff;border:none;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer;" onclick="saveInlineRename()">保存标题</button>
        </div>
        <button class="action-item" onclick="togglePinTargetSession()">
          ${s.pinned ? '📌 取消置顶此对话' : '📌 置顶此对话（固定在列表最顶部）'}
        </button>
        <button class="action-item" onclick="shareTargetSession()">🔗 生成 AES-256 端到端加密回放链接</button>
        <button class="action-item" onclick="jumpToSessionFiles('${esc(s.hostId)}', '${esc(s.id)}', '${esc(s.cwd)}')">📂 查看【${esc(s.project)}】项目文件夹</button>
        <button class="action-item danger" onclick="deleteTargetSession()">
          ${confirmSheetDelete ? '⚠️ 再次点击确认彻底删除' : '🗑️ 删除此条会话记录'}
        </button>
      `;
  }

  function togglePinTargetSession() {
    if (!actionTargetSession) return;
    const id = actionTargetSession.id;
    const nextPinned = !Boolean(actionTargetSession.pinned);
    actionTargetSession.pinned = nextPinned;
    syncSessionPinToServer(id, actionTargetHostId || actionTargetSession.hostId || '', nextPinned);
    closeSheet('taskActionSheet');
    showToast(nextPinned ? '📌 已置顶并同步至多端与电脑工具' : '已取消置顶并同步');
    renderAll();
  }

  async function saveInlineRename() {
    const val = document.getElementById('renameInlineInput').value.trim();
    if (!val || !actionTargetSession) return;
    const targetId = actionTargetSession.id;
    const targetHostId = actionTargetHostId;
    actionTargetSession.title = val;
    const hostObj = (hubState.hosts || []).find(h => h.hostId === targetHostId);
    const matchedTask = (hostObj?.tasks || []).find(t => t.id === targetId);
    if (matchedTask) matchedTask.title = val;
    closeSheet('taskActionSheet');
    renderAll();
    showToast('✏️ 正在同步新标题至电脑端...');
    await dispatchHostCommand(targetHostId, {
      type: 'rename_session',
      agentId: targetId,
      title: val,
    });
    setTimeout(fetchState, 600);
  }

  async function shareTargetSession() {
    if (!actionTargetSession) return;
    const targetHost = (hubState.hosts || []).find(h => h.hostId === actionTargetHostId);
    if (!targetHost || !targetHost.online || targetHost.activelyConnected === false) {
      showToast('⚠️ 该电脑当前离线或休眠，无法生成端到端加密分享');
      return;
    }
    const targetTitle = actionTargetSession.title || '会话回放';
    closeSheet('taskActionSheet');
    showToast('🔒 正在请求电脑加密并上传回放（约 1~5 秒）...');
    const out = await dispatchHostCommand(actionTargetHostId, {
      type: 'share_session',
      agentId: actionTargetSession.id,
    });
    const cmdId = out?.command?.id;
    if (!cmdId) return;
    for (let i = 0; i < 16; i++) {
      await new Promise(r => setTimeout(r, 600));
      const res = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json().catch(() => ({}));
      if (res.ready && res.result) {
        if (res.result.ok === false || !res.result.shareUrl) {
          showToast('❌ 分享生成失败：' + (res.result.error || '无法读取加密载荷'));
          return;
        }
        const fullUrl = res.result.shareUrl.startsWith('http')
          ? res.result.shareUrl
          : location.origin + res.result.shareUrl;
        void fetchState();
        // 异步等待后 iOS Safari 的用户激活手势已失效，直接弹出结果卡片让用户以新鲜点击手势一键复制
        openShareResultSheet({
          url: fullUrl,
          title: targetTitle,
          shareId: res.result.shareId || '',
        });
        return;
      }
    }
    void fetchState();
    showToast('⏳ 电脑仍在处理加密分享，稍后可在「设置 → 加密分享记录」查看');
  }

  function openShareResultSheet({ url, title = '端到端加密回放', shareId = '' } = {}) {
    const body = document.getElementById('shareResultBody');
    if (!body || !url) return;
    body.innerHTML = `
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.55;margin-bottom:10px;">
          会话 <strong>${esc(title)}</strong> 已完成 AES-256-GCM 端到端加密。<br/>
          <span style="font-size:11.5px;color:var(--muted);">🔐 解密密钥仅保存在链接 <code>#key=</code> 锚点中，云端服务器无法解密原始内容。</span>
        </div>
        <input
          type="text"
          readonly
          value="${esc(url)}"
          onclick="this.select()"
          style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-family:var(--mono);font-size:12px;margin-bottom:12px;outline:none;"
        />
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button
            class="primary-block-btn"
            style="margin-top:0;flex:1;"
            onclick="copyCodeText('${encodeURIComponent(url)}', '🔗 加密分享链接已复制到剪贴板！')"
          >
            📋 复制加密链接
          </button>
          <a
            href="${esc(url)}"
            target="_blank"
            rel="noopener"
            class="choice-chip"
            style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:0 16px;font-weight:700;"
          >
            🌐 打开预览
          </a>
        </div>
      `;
    openSheet('shareResultSheet');
  }

  async function deleteShareRecord(shareId) {
    if (!shareId) return;
    try {
      await apiFetch(`/api/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' });
      showToast('🗑️ 已销毁该加密分享记录');
      lastRenderedSettingsKey = '';
      void fetchState();
    } catch (err) {
      showToast('❌ 删除失败: ' + ((err && err.message) || err));
    }
  }

  let pairingCountdownTimer = null;
  let activePairingCodeStr = '';
  let activePairingLink = '';
  async function openPairingCodeSheet() {
    openSheet('pairingCodeSheet');
    await generateNewPairingCode();
  }

  function closePairingCodeSheet() {
    if (pairingCountdownTimer) {
      clearInterval(pairingCountdownTimer);
      pairingCountdownTimer = null;
    }
    closeSheet('pairingCodeSheet');
  }

  function updatePairingQrBaseOrigin(rawOrigin) {
    if (!activePairingCodeStr) return;
    const cleanOrigin = String(rawOrigin || '').trim().replace(/\/+$/, '') || location.origin;
    activePairingLink = `${cleanOrigin}/?pair=${encodeURIComponent(activePairingCodeStr)}`;
    const qrBox = document.getElementById('pairingQrSvgWrap');
    if (qrBox) {
      qrBox.innerHTML = renderQrCodeSvg(activePairingLink, { sizePx: 184, margin: 3 });
    }
    const previewEl = document.getElementById('pairingFullLinkPreview');
    if (previewEl) {
      previewEl.textContent = activePairingLink;
    }
  }

  function copyCurrentPairingLink() {
    if (!activePairingLink) return;
    void copyText(activePairingLink, {
      successMessage: '📋 手机免密登录链接已复制',
      title: '📋 复制手机免密登录链接',
    });
  }

  async function generateNewPairingCode() {
    if (pairingCountdownTimer) {
      clearInterval(pairingCountdownTimer);
      pairingCountdownTimer = null;
    }
    const body = document.getElementById('pairingCodeBody');
    if (!body) return;
    body.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);">正在生成 6 位免密配对码…</div>`;
    try {
      const res = await apiFetch('/api/pairing/create', {
        method: 'POST',
        body: JSON.stringify({ ttlMs: 180000 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.code) {
        body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc(data.error || '请稍后重试')}</div>`;
        return;
      }
      const codeStr = String(data.code);
      activePairingCodeStr = codeStr;
      const expiresAt = Number(data.expiresAt || (Date.now() + 180000));
      const isLocalhost =
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.hostname === '[::1]';
      const lanCandidates = Array.isArray(data.lanOrigins) && data.lanOrigins.length > 0
        ? data.lanOrigins
        : (Array.isArray(hubState.lanOrigins) ? hubState.lanOrigins : []);
      const defaultBaseOrigin = isLocalhost && lanCandidates[0] ? lanCandidates[0] : location.origin;
      activePairingLink = `${defaultBaseOrigin}/?pair=${encodeURIComponent(codeStr)}`;
      const qrSvgHtml = renderQrCodeSvg(activePairingLink, { sizePx: 184, margin: 3 });
      const localhostNoticeHtml = isLocalhost
        ? lanCandidates[0]
          ? `<div id="pairingLocalhostNotice" style="text-align:left;font-size:11.5px;line-height:1.5;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:8px 10px;border-radius:10px;margin-bottom:10px;">
                 📡 <strong>局域网自动修正</strong>：你当前在电脑上用 <code>${esc(location.hostname)}</code> 打开（手机扫 localhost 会连不上），已自动将二维码切换为本机局域网地址 <code>${esc(lanCandidates[0])}</code>。请确保手机与电脑连同一 Wi-Fi，或在下方改为公网/隧道地址：
               </div>`
          : `<div id="pairingLocalhostNotice" style="text-align:left;font-size:11.5px;line-height:1.5;color:#b45309;background:var(--amber-soft);border:1px solid #fde68a;padding:8px 10px;border-radius:10px;margin-bottom:10px;">
                 ⚠️ <strong>注意</strong>：你当前使用 <code>${esc(location.hostname)}</code> 打开，手机无法直接访问 localhost！请在下方把地址改为电脑的局域网 IP（如 <code>http://192.168.1.x:8080</code>）或公网域名后再扫码：
               </div>`
        : '';
      const renderCountdown = () => {
        const remainSec = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        const timerEl = document.getElementById('pairingCodeTimerText');
        if (timerEl) {
          timerEl.textContent = remainSec > 0
            ? `⏳ 有效期剩余 ${remainSec} 秒（扫码或输入一次后即刻生效）`
            : '⚠️ 该二维码/配对码已过期，请点击下方重新生成';
          timerEl.style.color = remainSec > 0 ? 'var(--primary)' : 'var(--red)';
        }
        if (remainSec <= 0 && pairingCountdownTimer) {
          clearInterval(pairingCountdownTimer);
          pairingCountdownTimer = null;
        }
      };
      body.innerHTML = `
          <div style="text-align:center;padding:8px 4px 14px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">
              用手机相机直接<strong>扫下方二维码</strong>即可免输密码登录（也可在手机端输入 6 位码）：
            </div>
            ${localhostNoticeHtml}
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;text-align:left;">
              <span style="font-size:11.5px;font-weight:600;color:var(--muted);white-space:nowrap;">扫码网址:</span>
              <input
                id="pairingBaseOriginInput"
                type="text"
                value="${esc(defaultBaseOrigin)}"
                oninput="updatePairingQrBaseOrigin(this.value)"
                style="flex:1;min-width:0;padding:6px 9px;border-radius:8px;border:1px solid var(--border);background:var(--subtle);color:var(--text);font-family:var(--mono);font-size:11.5px;outline:none;"
              />
            </div>
            <div id="pairingQrSvgWrap" style="display:flex;justify-content:center;margin:8px 0 12px;">
              ${qrSvgHtml}
            </div>
            <div
              style="font-family:var(--mono);font-size:28px;font-weight:800;letter-spacing:6px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);color:var(--primary);border:1px solid var(--border);user-select:all;"
            >${esc(codeStr)}</div>
            <div id="pairingFullLinkPreview" style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all;">${esc(activePairingLink)}</div>
            <div id="pairingCodeTimerText" style="margin-top:8px;font-size:12.5px;font-weight:600;color:var(--primary);"></div>
            <div style="display:flex;gap:8px;margin-top:14px;">
              <button
                class="primary-block-btn"
                style="margin-top:0;flex:1;"
                onclick="copyCurrentPairingLink()"
              >
                📋 复制免密链接
              </button>
              <button
                class="choice-chip"
                style="padding:0 16px;font-weight:600;"
                onclick="generateNewPairingCode()"
              >
                🔄 重新生成
              </button>
            </div>
          </div>
        `;
      renderCountdown();
      applyLangToDom(body, langPref);
      pairingCountdownTimer = setInterval(() => {
        renderCountdown();
        if (langPref === 'en') applyLangToDom(body, langPref);
      }, 1000);
    } catch (err) {
      body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc((err && err.message) || String(err))}</div>`;
      applyLangToDom(body, langPref);
    }
  }

  async function jumpToSessionFiles(hostId, agentId, cwd) {
    closeSheet('taskActionSheet');
    closeMobileChat();
    currentHostId = hostId;
    fileProjectCwd = cwd;
    switchTab('files');
    await requestDirList(hostId, agentId, cwd, '');
  }

  async function deleteTargetSession() {
    if (!confirmSheetDelete) {
      confirmSheetDelete = true;
      renderActionSheet();
      return;
    }
    if (!actionTargetSession) return;
    closeSheet('taskActionSheet');
    showToast('🗑️ 正在删除会话...');
    await dispatchHostCommand(actionTargetHostId, {
      type: 'delete_session',
      agentId: actionTargetSession.id,
    });
    if (activeSessionId === actionTargetSession.id) {
      activeSessionId = '';
      closeMobileChat();
    }
    setTimeout(fetchState, 600);
  }

  // ==================== 11. 设备与设置 Tab (添加电脑面板 + 双机状态看板 + 诚实能力表 + 独立凭证吊销) ====================
  function toggleAddHostPanel() {
    addHostPanelExpanded = !addHostPanelExpanded;
    lastRenderedSettingsKey = '';
    renderSettingsTab();
  }

  function toggleHostSettingsCard(hostId) {
    if (!hostId) return;
    expandedHostCardIds[hostId] = !expandedHostCardIds[hostId];
    lastRenderedSettingsKey = '';
    renderSettingsTab();
  }

  function renderAddHostPanelHtml({ isEmptyState = false } = {}) {
    const enrollment = hubState.enrollment || {};
    const code = enrollment.code || '正在生成...';
    const expiresAt = Number(enrollment.expiresAt || 0);
    const remainMin = expiresAt > Date.now() ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000)) : 15;
    const joinedCount = Number(enrollment.joinedCount || 0);
    const originUrl = location.origin;
    const oneLineCmd = `curl -fsSL ${originUrl}/install.sh | bash -s -- --code ${code}`;
    const localRepoCmd = `./connect-host.sh --url ${originUrl} --code ${code}`;
    const hasHosts = (hubState.hosts || []).length > 0;
    const isExpanded = isEmptyState || !hasHosts || addHostPanelExpanded;

    if (!isExpanded) {
      return `
          <div class="settings-card" style="padding:11px 13px;cursor:pointer;" onclick="toggleAddHostPanel()">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="min-width:0;flex:1;">
                <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;">
                  <span style="font-size:13.5px;font-weight:700;color:var(--text);">➕ 添加电脑</span>
                  <span style="font-family:var(--mono);font-size:11.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:var(--primary-soft);color:var(--primary);">${esc(code)}</span>
                </div>
                <div style="font-size:11.5px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ⏳ ${remainMin}m有效 · 已连 ${joinedCount} 台 · 点此展开命令
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
                <button class="pill-action-btn primary" style="padding:5px 9px;font-size:11.5px;" onclick="event.stopPropagation(); copyCodeText('${encodeURIComponent(oneLineCmd)}', '📋 一行接入命令已复制！到电脑终端粘贴回车即可')">
                  📋 复制命令
                </button>
                <button class="pill-action-btn" style="padding:5px 8px;font-size:11.5px;" onclick="event.stopPropagation(); openPairingCodeSheet()">
                  📱 扫码
                </button>
                <span style="font-size:12px;color:var(--muted);padding-left:2px;">▾</span>
              </div>
            </div>
          </div>
        `;
    }

    const firstTimeStepsHtml = isEmptyState || !hasHosts ? `
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:12px;font-size:11.5px;line-height:1.4;">
          <div style="padding:7px 8px;border-radius:9px;background:var(--primary-soft);border:1px solid var(--border);color:var(--primary);font-weight:700;">
            ① 终端执行命令<br/><span style="font-weight:500;font-size:11px;color:var(--text-secondary);">复制下方一行命令</span>
          </div>
          <div style="padding:7px 8px;border-radius:9px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>② 自动连上刷新</strong><br/><span style="font-size:11px;color:var(--muted);">无需重启或手填</span>
          </div>
          <div style="padding:7px 8px;border-radius:9px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>③ 手机扫码遥控</strong><br/><span style="font-size:11px;color:var(--muted);">免输密码直接进</span>
          </div>
        </div>
      ` : '';

    return `
        <div class="settings-card" style="padding:15px;${isEmptyState ? 'max-width:440px;margin:20px auto;text-align:left;border:1.5px solid var(--primary);' : ''}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:14.5px;font-weight:800;color:var(--text);">
                ${isEmptyState ? '💻 本机未接入 · 3 步开启手机远控' : '➕ 添加电脑（凭配对码加入，无需主密码）'}
              </div>
              <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">
                每台电脑独立凭证可单机吊销；有效期内可连加多台电脑
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="pill-action-btn" style="font-size:11.5px;padding:4px 9px;" onclick="refreshEnrollmentCode()">
                🔄 换码
              </button>
              ${!isEmptyState && hasHosts ? `
                <button class="pill-action-btn" style="font-size:11.5px;padding:4px 9px;" onclick="toggleAddHostPanel()">
                  ▴ 收起
                </button>
              ` : ''}
            </div>
          </div>

          ${firstTimeStepsHtml}

          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:110px;padding:7px 10px;border-radius:10px;background:var(--primary-soft);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">当前电脑配对码</div>
              <div style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--primary);letter-spacing:1.2px;margin-top:2px;">${esc(code)}</div>
            </div>
            <div style="padding:7px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">剩余有效期</div>
              <div style="font-size:13px;font-weight:700;color:var(--text);margin-top:3px;">⏳ ${remainMin} 分钟</div>
            </div>
            <div style="padding:7px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">本码已加入</div>
              <div style="font-size:13px;font-weight:700;color:var(--green);margin-top:3px;">💻 ${joinedCount} 台</div>
            </div>
          </div>

          <div style="font-size:11.5px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
            在电脑终端执行这一行命令（自动安装、自动连上、开机自启）：
          </div>
          <div
            style="font-family:var(--mono);font-size:11.5px;line-height:1.45;padding:9px 11px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);word-break:break-all;margin-bottom:10px;user-select:all;"
          >${esc(oneLineCmd)}</div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="pill-action-btn primary" onclick="copyCodeText('${encodeURIComponent(oneLineCmd)}', '📋 一行接入命令已复制！到电脑终端粘贴回车即可')">
              📋 复制一行安装命令
            </button>
            <button class="pill-action-btn" onclick="copyCodeText('${encodeURIComponent(localRepoCmd)}', '📋 本地仓库接入命令已复制')">
              📋 已克隆仓库用此条
            </button>
            <button class="pill-action-btn" onclick="openPairingCodeSheet()">
              📱 手机扫码登录
            </button>
          </div>
        </div>
      `;
  }

  async function refreshEnrollmentCode() {
    try {
      const res = await apiFetch('/api/hosts/enrollment', {
        method: 'POST',
        body: JSON.stringify({ forceNew: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data.enrollment) {
        hubState.enrollment = data.enrollment;
        lastRenderedSettingsKey = '';
        renderAll();
        showToast('🔄 已生成新的电脑配对码（15 分钟有效）');
      }
    } catch (err) {
      showToast('❌ 刷新配对码失败：' + ((err && err.message) || err));
    }
  }

  async function revokeHostCredential(hostId, hostName) {
    if (!hostId) return;
    if (!confirm(`确定要吊销电脑「${hostName || hostId}」的独立访问凭证吗？\n吊销后该电脑将立即无法上报或拉取指令（其他电脑不受影响）。`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
        method: 'POST',
        body: JSON.stringify({ action: 'revoke' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        showToast(`🚫 已吊销「${hostName || hostId}」的独立凭证`);
        lastRenderedSettingsKey = '';
        void fetchState();
      } else {
        showToast('❌ 吊销失败：' + (data?.error || '请重试'));
      }
    } catch (err) {
      showToast('❌ 吊销失败：' + ((err && err.message) || err));
    }
  }

  async function unrevokeHostCredential(hostId, hostName) {
    if (!hostId) return;
    try {
      const res = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
        method: 'POST',
        body: JSON.stringify({ action: 'unrevoke' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok) {
        showToast(`✅ 已解除「${hostName || hostId}」的吊销状态`);
        lastRenderedSettingsKey = '';
        void fetchState();
      }
    } catch (err) {
      showToast('❌ 操作失败：' + ((err && err.message) || err));
    }
  }

  function renderSettingsTab() {
    const hosts = hubState.hosts || [];
    const shares = hubState.shares || [];
    const buildInfo = hubState.build || {};
    const currentTk = getToken();
    const enrollmentCode = hubState.enrollment?.code || '';
    const onboardingCmd = `curl -fsSL ${location.origin}/install.sh | bash -s -- --code ${enrollmentCode}`;

    // 内容签名去抖 (#4)：当设置页数据未发生变化时跳过整页 innerHTML 重建，并保留滚动位置
    const settingsSignature = JSON.stringify({
      themePref,
      langPref,
      addHostPanelExpanded,
      expandedHostCardIds,
      tokenTail: currentTk.slice(-4),
      enrollmentCode,
      joinedCount: hubState.enrollment?.joinedCount || 0,
      pushCount: (hubState.pushSubscriptions || []).length,
      build: buildInfo.uiBuild || buildInfo.version || '',
      hosts: hosts.map(h => ({
        id: h.hostId,
        name: h.hostName,
        online: isHostLiveOnline(h),
        trustStatus: h.trustStatus || h.trust?.status || '',
        hasDedicatedToken: Boolean(h.hasDedicatedToken),
        isFeishuActive: h.isFeishuActive,
        remoteActive: h.remoteActive,
        taskCount: (h.bridgeState?.tasks || []).length,
        runningCount: h.runningCount || 0,
        totalBytesBucket: expandedHostCardIds[h.hostId] ? Math.round((h.totalBytes || 0) / 10240) : 0,
        agentVersion: h.bridgeState?.agentVersion || '',
        upgrading: Boolean(upgradingHostMap[h.hostId] && Date.now() - upgradingHostMap[h.hostId] < 45000),
        turbo: h.bridgeState?.turbo?.engineLabel || '',
        power: h.bridgeState?.systemTelemetry?.power?.shortLabel || '',
        net: h.bridgeState?.systemTelemetry?.network?.kindLabel || '',
        shareUrl: h.lastShareResult?.shareUrl || '',
      })),
      shares: shares.map(s => ({ id: s.id || s.shareId, at: s.createdAt })),
    });
    const viewport = document.getElementById('mainViewport');
    if (!viewport) return;
    if (settingsSignature === lastRenderedSettingsKey && viewport.querySelector('.settings-wrap')) {
      void refreshPushStatus();
      return;
    }
    const prevScrollTop = viewport.scrollTop;
    lastRenderedSettingsKey = settingsSignature;

    // 收集各台电脑最近一次生成的含 #key= 的完整分享链接
    const latestShareResults = hosts
      .filter(h => h.lastShareResult && h.lastShareResult.shareUrl)
      .map(h => {
        const rawUrl = h.lastShareResult.shareUrl;
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : location.origin + rawUrl;
        return {
          hostName: h.hostName,
          shareId: h.lastShareResult.shareId || '',
          fullUrl,
          at: h.lastShareResult.at || 0,
        };
      });

    viewport.innerHTML = `
        <div class="settings-wrap">
          <div>
            <div class="settings-group-title">添加电脑与手机扫码登录</div>
            ${renderAddHostPanelHtml({ isEmptyState: false })}
          </div>

          <div>
            <div class="settings-group-title">已接入电脑 (${hosts.length} 台 · 点击卡片展开详情)</div>
            <div class="host-visual-grid">
              ${hosts.map(h => {
      const isRevoked = (h.trustStatus || h.trust?.status) === 'revoked';
      const isCardExpanded = Boolean(expandedHostCardIds[h.hostId]);
      const tm = formatHostTelemetry(h);
      const sessCount = (h.bridgeState?.tasks || []).length;
      const runCount = h.runningCount || 0;
      const turboShort = h.bridgeState?.turbo?.enabled ? '⚡ 极速' : '🐢 轮询';
      const shortFp = (h.fingerprint || '已锁定').slice(0, 14);
      const hubVer = String(buildInfo.version || '0.5.1');
      const hostVer = String(h.bridgeState?.agentVersion || '');
      const isHostLive = isHostLiveOnline(h);
      const isUpgradingHost = Boolean(upgradingHostMap[h.hostId] && Date.now() - upgradingHostMap[h.hostId] < 45000);
      const isHostOutdated = Boolean(isHostLive && !isRevoked && (!hostVer || compareSemver(hostVer, hubVer) < 0));
      const versionBadgeHtml = isUpgradingHost
        ? `<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--amber-soft);color:#d97706;">⏳ 正在升级重启...</span>`
        : isHostOutdated
          ? `<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--amber-soft);color:#d97706;">⬆️ 可升 v${esc(hubVer)} (${hostVer ? '当前 v' + esc(hostVer) : '旧版'})</span>`
          : hostVer
            ? `<span style="font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:999px;background:var(--green-soft);color:var(--green);">v${esc(hostVer)} 最新</span>`
            : '';

      return `
                <div class="host-visual-card ${h.isFeishuActive ? 'active-feishu' : ''}" style="padding:12px 14px;${isHostLive ? '' : 'opacity:0.78;'}">
                  <div
                    style="display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;user-select:none;"
                    onclick="toggleHostSettingsCard('${esc(h.hostId)}')"
                  >
                    <div style="min-width:0;flex:1;">
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="status-dot ${isHostLive && !isRevoked ? '' : 'offline'}"></span>
                        <span style="font-size:14.5px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;">${esc(h.hostName)}</span>
                        ${h.isFeishuActive ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--primary-soft);color:var(--primary);">🎯 主控</span>` : ''}
                        ${isRevoked ? `<span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:999px;background:var(--red-soft);color:var(--red);">🚫 已吊销</span>` : ''}
                        ${versionBadgeHtml}
                      </div>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span>${isHostLive ? `${tm.powerIcon} ${esc(tm.powerShort)}` : `⚪ 已离线 (${formatTime(h.lastSeen)})`}</span>
                        <span>·</span>
                        <span>${tm.netIcon} ${esc(tm.netShort)}</span>
                        <span>·</span>
                        <span>💬 ${sessCount} 会话${isHostLive && runCount > 0 ? ` (<strong style="color:var(--green);">${runCount} 运行中</strong>)` : ''}</span>
                        <span>·</span>
                        <span>${turboShort}</span>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                      ${isHostOutdated && !isUpgradingHost ? `
                        <button
                          class="pill-action-btn primary"
                          style="padding:4px 9px;font-size:11.5px;"
                          onclick="event.stopPropagation(); upgradeHostTurbo('${esc(h.hostId)}', '${esc(h.hostName)}')"
                        >🔄 一键升级</button>
                      ` : ''}
                      <span style="font-size:11.5px;font-weight:600;color:var(--text-secondary);padding:4px 8px;border-radius:999px;background:var(--subtle);">
                        ${isCardExpanded ? '▴ 收起' : '▾ 详情'}
                      </span>
                    </div>
                  </div>

                  ${isCardExpanded ? `
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--hairline);display:flex;flex-direction:column;gap:10px;">
                      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:12px;">
                        <div style="padding:8px 10px;border-radius:10px;background:${tm.lowBattery ? 'var(--amber-soft)' : 'var(--subtle)'};border:1px solid ${tm.lowBattery ? '#fde68a' : 'var(--border)'};">
                          <div style="font-size:11px;color:var(--muted);">供电与电量</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.powerIcon} ${esc(tm.powerDetail)}${tm.lowBattery ? ' ⚠️' : ''}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">网络与延迟</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${tm.netIcon} ${esc(tm.netDetail)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">会话与存储</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${sessCount} 条 · ${runCount} 运行 · ${formatBytes(h.totalBytes)}</div>
                        </div>
                        <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
                          <div style="font-size:11px;color:var(--muted);">同步与系统</div>
                          <div style="font-weight:700;color:var(--text);margin-top:2px;">${esc(h.platform || 'macOS')} ${esc(h.arch || '')} · ${turboShort}</div>
                        </div>
                      </div>

                      <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11.5px;">
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">${renderHarnessBadgeHtml('dsh', 'inline')} DSH · ✅ 远控+审批</span>
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">${renderHarnessBadgeHtml('antigravity-ide', 'inline')} Antigravity · ✅ 远控+审批</span>
                        ${(h.bridgeState?.harnesses || []).map(ad => {
        const canApproveNow = Boolean(ad.capabilities?.canApprove || ad.id === 'codex' || ad.id === 'workbuddy');
        const isObserveAdapter = ad.capabilities?.canPrompt === false || ad.id === 'doubao';
        const statusTag = !ad.installed && !ad.hasBinary
          ? '⚪ 未安装'
          : isObserveAdapter
            ? '👀 仅观测'
            : ad.hasBinary
              ? (canApproveNow ? '✅ 远控+审批' : '🔵 看会话/发指令')
              : '👀 观察模式';
        return `
                          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">
                            ${renderHarnessBadgeHtml(ad.id, 'inline')} ${esc(ad.label || ad.id)} · ${statusTag}
                          </span>
                        `;
      }).join('')}
                      </div>

                      <div style="font-size:11.5px;color:var(--muted);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                        <span>🔒 指纹 <code>${esc(shortFp)}</code> · ${h.hasDedicatedToken ? `🔑 独立凭证 (${esc(h.hostTokenPreview)})` : '🔑 管理员凭证'}</span>
                        <span>${h.syncMeta?.seq ? `同步序号 #${h.syncMeta.seq}` : ''}</span>
                      </div>

                      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;padding-top:4px;">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                          <button class="pill-action-btn ${h.isFeishuActive ? 'primary' : ''}" style="padding:5px 10px;font-size:11.5px;" onclick="activateFeishuHost('${esc(h.hostId)}')">
                            ${h.isFeishuActive ? '🎯 飞书当前主控' : '切飞书到这台'}
                          </button>
                          <button class="pill-action-btn ${h.remoteActive ? 'primary' : ''}" style="padding:5px 10px;font-size:11.5px;" onclick="toggleHostRemoteMode('${esc(h.hostId)}', ${!h.remoteActive})">
                            ${h.remoteActive ? '🔔 飞书通知: 开' : '🔕 飞书通知: 关'}
                          </button>
                          <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="openTurboGuideSheet()">
                            ${h.bridgeState?.turbo?.enabled ? '⚡ 极速详情' : '🚀 一键提速'}
                          </button>
                          <button class="pill-action-btn ${isHostOutdated ? 'primary' : ''}" style="padding:5px 10px;font-size:11.5px;" onclick="upgradeHostTurbo('${esc(h.hostId)}', '${esc(h.hostName)}')" ${isUpgradingHost ? 'disabled' : ''}>
                            ${isUpgradingHost ? '⏳ 正在升级重启...' : (isHostOutdated ? `🔄 一键升级 (v${esc(hubVer)})` : '🔄 检查/重装更新')}
                          </button>
                        </div>
                        <div>
                          ${isRevoked ? `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;" onclick="unrevokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">恢复接入</button>
                          ` : `
                            <button class="pill-action-btn" style="padding:5px 10px;font-size:11.5px;color:var(--red);" onclick="revokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">🚫 吊销凭证</button>
                          `}
                        </div>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `}).join('') || `<div style="padding:24px;text-align:center;color:var(--muted);">暂未检测到在线电脑，请复制上方「添加电脑」命令在终端执行</div>`}
            </div>
          </div>

          <div>
            <div class="settings-group-title">各后端功能边界（诚实矩阵）</div>
            <div class="settings-card" style="padding:12px 14px;overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border);color:var(--muted);">
                    <th style="text-align:left;padding:6px 4px;">后端</th>
                    <th style="padding:6px 3px;">看会话</th>
                    <th style="padding:6px 3px;">发指令</th>
                    <th style="padding:6px 3px;">停止</th>
                    <th style="padding:6px 3px;">手机审批</th>
                    <th style="padding:6px 3px;">实时插话</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderCapabilityMatrixRowsHtml()}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div class="settings-group-title">外观与显示模式</div>
            <div class="settings-card">
              <div class="settings-item" style="gap:8px;">
                <div style="min-width:0;flex:1;">
                  <div class="settings-item-title" style="white-space:nowrap;">界面语言 / Language</div>
                  <div class="settings-item-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">自动识别浏览器语言或手动切换</div>
                </div>
                <div class="theme-seg-group">
                  <button class="theme-seg-btn ${langPref === 'zh' ? 'active' : ''}" onclick="setLangPreference('zh')">🇨🇳 中文</button>
                  <button class="theme-seg-btn ${langPref === 'en' ? 'active' : ''}" onclick="setLangPreference('en')">🇺🇸 English</button>
                </div>
              </div>
              <div class="settings-item" style="gap:8px;">
                <div style="min-width:0;flex:1;">
                  <div class="settings-item-title" style="white-space:nowrap;">深色 / 浅色主题</div>
                  <div class="settings-item-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">自动或手动切换外观</div>
                </div>
                <div class="theme-seg-group">
                  <button class="theme-seg-btn ${themePref === 'system' ? 'active' : ''}" onclick="setThemePreference('system')">跟随系统</button>
                  <button class="theme-seg-btn ${themePref === 'light' ? 'active' : ''}" onclick="setThemePreference('light')">☀️ 浅色</button>
                  <button class="theme-seg-btn ${themePref === 'dark' ? 'active' : ''}" onclick="setThemePreference('dark')">🌙 深色</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">多电脑协同与一键迁移</div>
            <div class="settings-card">
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">跨电脑一键迁移会话</div>
                  <div class="settings-item-desc">将源电脑 ~/.dsh 会话打包同步至目标电脑并可选清理源机</div>
                </div>
                <button class="pill-action-btn primary" onclick="openMigrateWizard()">📦 打开迁移向导</button>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">端到端加密分享记录 (${shares.length})</div>
            <div class="settings-card">
              ${latestShareResults.map(item => `
                <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="settings-item-title">🔐 最近生成（来自 ${esc(item.hostName)}）</div>
                    <span style="font-size:11.5px;color:var(--muted);">${formatTime(item.at)}</span>
                  </div>
                  <div style="font-size:11.5px;color:var(--muted);font-family:var(--mono);word-break:break-all;background:var(--subtle);padding:6px 8px;border-radius:8px;">
                    ${esc(item.fullUrl)}
                  </div>
                  <div style="display:flex;gap:8px;">
                    <button class="pill-action-btn primary" onclick="copyCodeText('${encodeURIComponent(item.fullUrl)}', '🔗 加密分享链接已复制')">📋 复制完整解密链接</button>
                    <a href="${esc(item.fullUrl)}" target="_blank" rel="noopener" class="pill-action-btn" style="text-decoration:none;display:inline-flex;align-items:center;">🌐 打开</a>
                  </div>
                </div>
              `).join('')}
              ${shares.length ? shares.slice(0, 8).map(s => `
                <div class="settings-item">
                  <div>
                    <div class="settings-item-title">${esc(s.title || '加密会话回放')}</div>
                    <div class="settings-item-desc">来自 ${esc(s.hostName || s.hostId || '远端电脑')} · ${formatTime(s.createdAt)} · ${formatBytes(s.sizeBytes || 0)}</div>
                  </div>
                  <button class="pill-action-btn" style="color:var(--red);" onclick="deleteShareRecord('${esc(s.id || s.shareId)}')">🗑️ 销毁</button>
                </div>
              `).join('') : `
                <div class="settings-item">
                  <div class="settings-item-desc">暂无加密分享记录。可在任意会话右上角「⋯ → 生成 AES-256 端到端加密回放链接」创建。</div>
                </div>
              `}
            </div>
          </div>

          <div>
            <div class="settings-group-title">手机锁屏通知 (iOS 16.4+ Web Push)</div>
            <div class="settings-card">
              <div class="settings-item" style="display:block;">
                <div class="settings-item-title">启用 iPhone 锁屏实时推送</div>
                <div class="settings-item-desc">当任意电脑有待审批、任务完成或异常时直接弹窗</div>
                <div id="pushLocalStatus" style="margin-top:9px;font-size:12.5px;font-weight:600;color:${esc(cachedPushStatusColor || 'var(--primary)')};">
                  ${esc(cachedPushStatusText || '正在检测本机推送状态…')}
                </div>
                <div id="pushDeviceList" style="margin-top:4px;font-size:12px;color:var(--muted);line-height:1.55;">${esc(cachedPushDeviceListText || '')}</div>
                <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                  <button class="pill-action-btn primary" onclick="subscribeIphonePush()">📲 开启推送</button>
                  <button class="pill-action-btn" onclick="sendTestPush()">🔔 测试</button>
                  <button class="pill-action-btn" style="color:var(--red);" onclick="disableIphonePush()">关闭本机推送</button>
                </div>
                <div class="settings-item-desc" style="margin-top:8px;">
                  iPhone 需先在 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启，才能收到锁屏通知
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-group-title">隐私与访问密码保护</div>
            <div class="settings-card">
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">添加新手机（6 位免密配对码）</div>
                  <div class="settings-item-desc">生成 3 分钟有效的一次性 6 位字母/数字配对码，新手机免输长密码直接解锁</div>
                </div>
                <button class="pill-action-btn primary" onclick="openPairingCodeSheet()">📱 生成配对码</button>
              </div>
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">修改总控台访问密码</div>
                  <div class="settings-item-desc">随时更换访问密钥，防止未授权访问</div>
                </div>
                <button class="pill-action-btn" onclick="promptChangePassword()">🔑 修改密码</button>
              </div>
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">锁定当前浏览器</div>
                  <div class="settings-item-desc">清除本机浏览器缓存的登录凭证</div>
                </div>
                <button class="pill-action-btn" style="color:var(--red);" onclick="lockAndLogout()">🔒 立即锁定</button>
              </div>
            </div>
          </div>

          <div style="text-align:center;padding:8px 12px 20px;">
            <div style="margin-bottom:10px;">
              <button
                type="button"
                class="pill-action-btn"
                style="font-size:12px;padding:6px 14px;"
                onclick="forceHardUpgradeReload()"
              >
                🔄 强制刷新前端版本（清缓存重载）
              </button>
            </div>
            <div
              style="font-size:11.5px;color:var(--muted);cursor:pointer;user-select:none;"
              onclick="copyCodeText('${encodeURIComponent(`DSH Hub v${buildInfo.version || '0.2.0'} (${buildInfo.uiBuild || 'dev'}) · started ${buildInfo.startedAt ? new Date(buildInfo.startedAt).toISOString() : ''}`)}', '📋 版本信息已复制')"
            >
              DSH 远控总控台 v${esc(buildInfo.version || '0.2.0')} · 构建 <code>${esc(buildInfo.uiBuild || 'dev')}</code>${buildInfo.startedAt ? ' · 云端启动于 ' + formatTime(buildInfo.startedAt) : ''}
            </div>
          </div>
        </div>
      `;
    if (prevScrollTop > 0) {
      viewport.scrollTop = prevScrollTop;
    }
    void refreshPushStatus();
  }

  // 本机是否真的订阅成功，只有浏览器自己知道；服务端登记数则代表所有设备
  function getSubServerKeyBase64Url(sub) {
    try {
      const buf = sub?.options?.applicationServerKey;
      if (!buf) return '';
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return '';
    }
  }

  let pushAutoSyncInFlight = false;
  async function ensureLocalPushSubscriptionSynced({ forceResubscribe = false } = {}) {
    if (pushAutoSyncInFlight) return null;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
      return null;
    }
    if (Notification.permission !== 'granted') return null;
    pushAutoSyncInFlight = true;
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription().catch(() => null);
      let expectedKey = hubState.vapidPublicKey || '';
      if (!expectedKey) {
        const keyRes = await (await apiFetch('/api/push/vapid-public-key')).json().catch(() => ({}));
        expectedKey = keyRes?.publicKey || '';
      }
      const localKey = sub ? getSubServerKeyBase64Url(sub) : '';
      const keyMismatch = Boolean(sub && expectedKey && localKey && localKey !== expectedKey);
      const serverEmpty = (hubState.pushSubscriptions || []).length === 0;

      if (forceResubscribe || keyMismatch || (!sub && forceResubscribe)) {
        if (sub) await sub.unsubscribe().catch(() => { });
        if (expectedKey) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(expectedKey),
          });
        }
      }
      if (sub && (forceResubscribe || keyMismatch || serverEmpty)) {
        await apiFetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription: sub,
            deviceName: isIosDevice() ? 'iPhone 主屏幕 App' : '浏览器 Web Push',
          }),
        });
      }
      return sub;
    } catch {
      return null;
    } finally {
      pushAutoSyncInFlight = false;
    }
  }

  let lastPushStatusAt = 0;
  async function refreshPushStatus(manual = false) {
    const statusEl = document.getElementById('pushLocalStatus');
    const listEl = document.getElementById('pushDeviceList');
    if (!statusEl) return;
    const subs = hubState.pushSubscriptions || [];
    if (listEl) {
      if (!subs.length) {
        cachedPushDeviceListText = '还没有设备登记推送';
      } else {
        const devices = subs.slice(0, 5).map(sub => {
          const name = sub.deviceName || '未知设备';
          const host = sub.endpointHost ? ` · ${sub.endpointHost}` : '';
          return `${name}${host}`;
        });
        const more = subs.length > 5 ? ` 等 ${subs.length} 台` : '';
        cachedPushDeviceListText = `已在服务端登记 ${subs.length} 台设备：${devices.join('；')}${more}`;
      }
      listEl.textContent = cachedPushDeviceListText;
    }
    // 已经有缓存状态时，10 秒内不重复轮询 Service Worker，直接沿用缓存，彻底消除状态闪烁
    if (!manual && cachedPushStatusText && Date.now() - lastPushStatusAt < 10000) {
      statusEl.textContent = cachedPushStatusText;
      if (cachedPushStatusColor) statusEl.style.color = cachedPushStatusColor;
      if (langPref === 'en') applyLangToDom(document.body, langPref);
      return;
    }
    lastPushStatusAt = Date.now();
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
      cachedPushStatusText = '本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）';
      cachedPushStatusColor = '#d97706';
      statusEl.textContent = cachedPushStatusText;
      statusEl.style.color = cachedPushStatusColor;
      if (langPref === 'en') applyLangToDom(document.body, langPref);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      let sub = reg ? await reg.pushManager.getSubscription() : null;
      const permission = Notification.permission;
      if (sub && permission === 'granted') {
        const localKey = getSubServerKeyBase64Url(sub);
        const expectedKey = hubState.vapidPublicKey || '';
        if (
          ((expectedKey && localKey && localKey !== expectedKey) || !subs.length) &&
          Date.now() - lastAutoPushSyncAt > 60000
        ) {
          lastAutoPushSyncAt = Date.now();
          const synced = await ensureLocalPushSubscriptionSynced();
          if (synced) sub = synced;
        }
        cachedPushStatusText = '本机：✅ 已开启锁屏推送';
        cachedPushStatusColor = '#059669';
      } else if (sub && permission === 'denied') {
        cachedPushStatusText = '本机：已订阅但通知权限被拒绝，请到「设置 → 通知」中允许';
        cachedPushStatusColor = '#dc2626';
      } else if (permission === 'denied') {
        cachedPushStatusText = '本机：通知权限被拒绝，请到「设置 → 通知 → DSH 远控」中允许';
        cachedPushStatusColor = '#dc2626';
      } else {
        cachedPushStatusText = '本机：未开启（点下方「开启推送」）';
        cachedPushStatusColor = '#d97706';
      }
      statusEl.textContent = cachedPushStatusText;
      statusEl.style.color = cachedPushStatusColor;
      if (langPref === 'en') applyLangToDom(document.body, langPref);
      if (manual) showToast('已刷新推送状态');
    } catch (err) {
      cachedPushStatusText = '本机：状态读取失败（' + ((err && err.message) || err) + '）';
      cachedPushStatusColor = '#dc2626';
      statusEl.textContent = cachedPushStatusText;
      statusEl.style.color = cachedPushStatusColor;
      if (langPref === 'en') applyLangToDom(document.body, langPref);
    }
  }

  async function disableIphonePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) {
        showToast('本机当前没有开启推送');
        void refreshPushStatus();
        return;
      }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      // 同步删掉服务端记录，避免「设备列表里还在、但永远送不到」
      try {
        await apiFetch('/api/push/unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint }),
        });
      } catch { }
      showToast('🔕 已关闭本机推送');
      setTimeout(fetchState, 300);
      void refreshPushStatus(true);
    } catch (err) {
      showToast('❌ 关闭失败：' + ((err && err.message) || err));
    }
  }

  async function activateFeishuHost(hostId) {
    await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/activate`, { method: 'POST' });
    showToast('🎯 已切换飞书主控电脑');
    setTimeout(fetchState, 400);
  }

  async function toggleHostRemoteMode(hostId, enable) {
    const host = (hubState.hosts || []).find(h => h.hostId === hostId);
    if (host && host.online === false) {
      showToast('❌ 该电脑当前离线，无法切换通知');
      return;
    }
    try {
      const res = await dispatchHostCommand(hostId, { type: 'remote_mode', active: enable });
      if (res && res.ok === false) {
        showToast('❌ ' + (res.error || '切换失败'));
        return;
      }
      // 乐观更新，避免等待下一轮心跳（约 1.5s）导致按钮看起来「点了没反应」
      if (host) host.remoteActive = enable;
      renderSettingsTab();
      showToast(enable ? '🔔 已开启飞书通知（2 小时无操作会自动关闭）' : '🔕 已关闭飞书通知');
      setTimeout(fetchState, 2500);
    } catch (err) {
      showToast('❌ 切换失败: ' + (err.message || err));
    }
  }

  async function promptChangePassword() {
    const next = prompt('请输入新的总控台访问密码（至少 6 位）：');
    if (!next || next.trim().length < 6) return;
    const clean = next.trim();
    const res = await apiFetch('/api/auth/change-token', {
      method: 'POST',
      body: JSON.stringify({ newToken: clean }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('dsh_hub_token', clean);
      showToast('✅ 访问密码已更新！请同步更新各电脑 ~/.dsh/feishu.env');
      renderSettingsTab();
    } else {
      showToast('❌ ' + (data.error || '修改失败'));
    }
  }

  // ==================== 12. 跨电脑迁移向导 ====================
  function openMigrateWizard() {
    const hosts = hubState.hosts || [];
    if (hosts.length < 2) {
      showToast('需要至少 2 台已接入的电脑才能互相迁移');
      return;
    }
    migSource = hosts[0].hostId;
    migTarget = hosts[1].hostId;
    renderMigrateWizard();
    openSheet('mobileSettingsSheet');
  }

  function renderMigrateWizard() {
    const hosts = hubState.hosts || [];
    const srcObj = hosts.find(h => h.hostId === migSource) || hosts[0];
    const dstObj = hosts.find(h => h.hostId === migTarget) || hosts[1] || hosts[0];
    const body = document.getElementById('migrateWizardBody');

    body.innerHTML = `
        <div class="form-label">1. 选择迁移方向</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--subtle);border:1px solid var(--border);text-align:center;font-weight:700;font-size:14px;color:var(--text);">
            💻 ${esc(srcObj?.hostName || migSource)}
            <div style="font-size:11px;color:var(--muted);font-weight:400;margin-top:2px;">源电脑</div>
          </div>
          <button class="pill-action-btn" onclick="swapMigrateHosts()">⇄ 互换</button>
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--border);text-align:center;font-weight:700;font-size:14px;color:var(--primary);">
            💻 ${esc(dstObj?.hostName || migTarget)}
            <div style="font-size:11px;color:var(--primary);font-weight:400;margin-top:2px;">目标电脑</div>
          </div>
        </div>

        <div class="form-label">2. 迁移选项</div>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 0;font-size:14px;cursor:pointer;">
          <input type="checkbox" ${migSwitchFeishu ? 'checked' : ''} onchange="migSwitchFeishu=this.checked" />
          <span>迁移完成后自动把飞书机器人切到目标电脑</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 0;font-size:14px;cursor:pointer;">
          <input type="checkbox" ${migWipeSource ? 'checked' : ''} onchange="migWipeSource=this.checked" />
          <span>迁移后清空源电脑上的会话历史（保留飞书凭证）</span>
        </label>

        <button class="primary-block-btn" onclick="submitRealMigration()">🚀 开始一键加密迁移</button>
      `;
  }

  function swapMigrateHosts() {
    const tmp = migSource;
    migSource = migTarget;
    migTarget = tmp;
    renderMigrateWizard();
  }

  async function submitRealMigration() {
    closeSheet('mobileSettingsSheet');
    showToast('📦 已启动跨电脑加密迁移任务...');
    await apiFetch('/api/migrate', {
      method: 'POST',
      body: JSON.stringify({
        sourceHostId: migSource,
        targetHostId: migTarget,
        switchFeishu: migSwitchFeishu,
        wipeSource: migWipeSource,
      }),
    });
    setTimeout(fetchState, 1000);
  }

  // ==================== 13. iOS Web Push 锁屏推送 ====================
  async function subscribeIphonePush() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('当前浏览器不支持 Web Push：iPhone 请用 Safari「添加到主屏幕」后从桌面图标打开');
      return;
    }
    // iOS 只有「添加到主屏幕」的独立 App 才能使用 Web Push（iOS 16.4+）
    if (isIosDevice() && !isStandaloneApp()) {
      showToast('请先用 Safari「分享 → 添加到主屏幕」，再从桌面图标打开本页开启推送');
      return;
    }
    try {
      // 1) 权限请求必须紧跟点击手势，iOS 在 await 之后可能不再弹授权框
      let perm = Notification.permission;
      if (perm !== 'granted' && typeof Notification.requestPermission === 'function') {
        perm = await Notification.requestPermission();
      }
      if (perm !== 'granted') {
        showToast(perm === 'denied'
          ? '通知权限已被拒绝：请到 iPhone「设置 → 通知 → DSH 远控」中改为允许'
          : '未获得通知权限，请重试并在弹窗中点「允许」');
        return;
      }
      // 2) 注册并等待 Service Worker 就绪
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      // 3) 先丢弃旧订阅：服务器重启后 VAPID 密钥会轮换，沿用旧订阅会抛 InvalidStateError
      const oldSub = await reg.pushManager.getSubscription().catch(() => null);
      if (oldSub) await oldSub.unsubscribe().catch(() => { });
      // 4) 取公钥并创建新订阅
      const keyRes = await (await apiFetch('/api/push/vapid-public-key')).json();
      if (!keyRes || !keyRes.publicKey) throw new Error('服务器未返回 VAPID 公钥');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
      });
      // 5) 上报订阅，并把服务端拒绝的真实原因显示出来
      const res = await apiFetch('/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: sub,
          deviceName: isIosDevice() ? 'iPhone 主屏幕 App' : '浏览器 Web Push',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || ('订阅上报失败 (HTTP ' + res.status + ')'));
      }
      showToast('📲 已成功开启 iPhone 锁屏推送！');
      void refreshPushStatus(true);
      setTimeout(fetchState, 300);
    } catch (err) {
      const detail = (err && err.name ? err.name + ': ' : '') + ((err && err.message) || err);
      console.warn('[DSH push] 开启失败', err);
      let hint = '';
      if (/push service|Registration failed|AbortError|network|Failed to fetch/i.test(detail)) {
        hint = '（连不上推送服务：桌面 Chrome 需能访问 Google FCM，iPhone 请从主屏幕 App 打开）';
      }
      showToast('❌ 开启失败: ' + detail + hint);
    }
  }

  async function sendTestPush() {
    try {
      // 先确保本机订阅与当前服务端 VAPID 公钥保持同步
      await ensureLocalPushSubscriptionSynced();
      let res = await apiFetch('/api/push/test', { method: 'POST', body: JSON.stringify({}) });
      let data = await res.json().catch(() => ({}));
      let total = Number(data.totalSubscriptions || 0);
      let sent = Number(data.sentCount || 0);
      const firstFail = (data.results || []).find(r => r && r.ok === false);
      // 若因历史密钥轮换导致 VapidPkHashMismatch / 403 / 0 订阅，且本机已授权通知，自动重建订阅并重试一次
      if (
        (!total || (!sent && firstFail && /VapidPkHashMismatch|403|410|404/i.test(String(firstFail.error || firstFail.status || '')))) &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        const reSub = await ensureLocalPushSubscriptionSynced({ forceResubscribe: true });
        if (reSub) {
          res = await apiFetch('/api/push/test', { method: 'POST', body: JSON.stringify({}) });
          data = await res.json().catch(() => ({}));
          total = Number(data.totalSubscriptions || 0);
          sent = Number(data.sentCount || 0);
        }
      }
      if (!total) {
        showToast('⚠️ 还没有设备订阅推送，请先点「开启推送」');
        return;
      }
      if (!sent) {
        const failed = (data.results || []).find(r => r && r.ok === false);
        showToast('⚠️ 测试推送未送达：' + ((failed && (failed.error || ('HTTP ' + failed.status))) || '推送服务返回失败'));
        return;
      }
      showToast(`🔔 已发送测试锁屏通知（${sent}/${total} 台设备）`);
      setTimeout(fetchState, 300);
    } catch (err) {
      showToast('❌ 发送失败: ' + ((err && err.message) || err));
    }
  }

  // ==================== 14. 通用导航与抽屉控制 ====================
  function renderHostSheetList() {
    const hosts = hubState.hosts || [];
    const totalCount = hosts.reduce((acc, h) => acc + ((h.bridgeState?.tasks || []).length), 0);
    const onlineCount = hosts.filter(h => isHostLiveOnline(h)).length;
    const countEl = document.getElementById('hostSheetCountLabel');
    if (countEl) {
      countEl.textContent = `${onlineCount}/${hosts.length} 台设备在线`;
    }
    const list = document.getElementById('hostOptionList');
    if (!list) return;
    list.innerHTML = [
      `<div class="host-option ${currentHostId === 'ALL_HOSTS' ? 'selected' : ''}" onclick="selectHost('ALL_HOSTS')">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text);">🌐 全部电脑汇总</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">一屏混排查看 ${hosts.length} 台电脑共 ${totalCount} 条会话</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--primary);">${currentHostId === 'ALL_HOSTS' ? '当前视图 ✓' : '切换 ›'}</span>
        </div>`,
      ...hosts.map(h => {
        const live = isHostLiveOnline(h);
        const statusDesc = live
          ? '在线待命'
          : `已离线 (${formatTime(h.lastSeen)})`;
        const feishuTag = h.isFeishuActive ? ' · 🎯 飞书主控' : '';
        return `
          <div class="host-option ${h.hostId === currentHostId ? 'selected' : ''}" style="${live ? '' : 'opacity:0.78;'}" onclick="selectHost('${esc(h.hostId)}')">
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text);">${live ? '🟢' : '⚪'} ${esc(h.hostName)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${(h.bridgeState?.tasks || []).length} 条会话 · ${esc(statusDesc)}${feishuTag}</div>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--primary);">${h.hostId === currentHostId ? '当前设备 ✓' : '切换 ›'}</span>
          </div>
        `;
      })
    ].join('');
  }

  function openHostSheet() {
    renderHostSheetList();
    openSheet('hostSheet');
  }

  function selectHost(id) {
    currentHostId = id;
    currentProject = 'ALL';
    fileProjectCwd = '';
    closeSheet('hostSheet');
    renderAll();
  }

  function selectProject(proj) {
    currentProject = proj;
    renderAll();
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'files') {
      const hosts = hubState.hosts || [];
      const host = currentHostId === 'ALL_HOSTS' ? hosts[0] : hosts.find(h => h.hostId === currentHostId);
      if (host && !host.lastFsListing) {
        const projs = getHostProjects(host);
        const firstTask = (host.bridgeState?.tasks || [])[0];
        if (projs[0]) {
          requestDirList(host.hostId, firstTask?.id || '', projs[0].cwd, '');
        }
      }
    }
    renderAll();
  }

  function closeSheet(id) {
    dismissOverlay('sheet:' + id, () => rawCloseSheet(id));
  }

  function onSearchInput() {
    const input = document.getElementById('searchInput');
    searchQuery = input.value;
    document.getElementById('searchClearBtn').style.display = searchQuery ? 'inline-flex' : 'none';
    renderSessionList();
  }

  function clearSearch() {
    const input = document.getElementById('searchInput');
    input.value = '';
    searchQuery = '';
    document.getElementById('searchClearBtn').style.display = 'none';
    renderSessionList();
  }

  async function copyText(text, { successMessage = '📋 已复制到剪贴板', title = '📋 复制内容' } = {}) {
    const value = String(text ?? '');
    if (!value) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
        showToast(successMessage);
        return true;
      }
    } catch { }
    // 同步 execCommand('copy') 兜底
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        showToast(successMessage);
        return true;
      }
    } catch { }
    openCopyFallbackSheet(value, title);
    return false;
  }

  function openCopyFallbackSheet(text, title = '📋 复制内容') {
    const titleEl = document.getElementById('copyFallbackTitle');
    if (titleEl) titleEl.textContent = title;
    const ta = document.getElementById('copyFallbackTextarea');
    if (ta) {
      ta.value = String(text ?? '');
    }
    openSheet('copyFallbackSheet');
    setTimeout(() => {
      try {
        ta?.focus();
        ta?.select();
      } catch { }
    }, 80);
  }

  async function retryCopyFromFallbackSheet() {
    const ta = document.getElementById('copyFallbackTextarea');
    const val = ta ? ta.value : '';
    if (!val) return;
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, val.length);
    } catch { }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(val);
        closeSheet('copyFallbackSheet');
        showToast('📋 已复制到剪贴板');
        return;
      } catch { }
    }
    try {
      if (document.execCommand('copy')) {
        closeSheet('copyFallbackSheet');
        showToast('📋 已复制到剪贴板');
        return;
      }
    } catch { }
    showToast('请长按上方选中文本并点「拷贝」');
  }

  function copyCodeText(encoded, successMessage = '📋 已复制到剪贴板') {
    const text = decodeURIComponent(encoded);
    void copyText(text, { successMessage });
  }

  function openTurboGuideSheet() {
    const hosts = hubState.hosts || [];
    const enrollCode = hubState.enrollment?.code || '配对码';
    const body = document.getElementById('turboGuideBody');
    const oneStepCmd = `curl -fsSL ${location.origin}/install.sh | bash -s -- --code ${enrollCode}`;

    body.innerHTML = `
        <div style="background:var(--green-soft);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--text);line-height:1.5;">
          <strong>🦀 Rust 原生极速引擎 + 双向 SSE 实时流 (dsh-turbo)</strong><br/>
          对 DeepSeek Harness / Antigravity IDE / Codex 本体 <strong>100% 零改动</strong>，通过只读监听日志文件末尾字节与 macOS 原生 CGEvent 按键注入，将延迟从 3~10 秒压至 <strong>&lt;200ms</strong>。
        </div>

        <div class="form-label">1. 已连接电脑极速引擎与权限状态</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
          ${hosts.map(h => {
      const tb = h.bridgeState?.turbo;
      const isTurbo = Boolean(tb?.enabled);
      const axOk = tb ? tb.accessibilityGranted !== false : false;
      return `
              <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--subtle);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <strong style="font-size:14px;color:var(--text);">${h.online ? '🟢' : '⚪'} ${esc(h.hostName)}</strong>
                  <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:${isTurbo ? 'var(--green-soft)' : 'var(--amber-soft)'};color:${isTurbo ? 'var(--green)' : 'var(--amber)'};">
                    ${esc(tb?.engineLabel || '🐢 标准轮询模式')}
                  </span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
                  辅助功能遥控权限：${axOk ? '<span style="color:var(--green);font-weight:600;">✅ 已授权 (支持 1ms 审批点击)</span>' : '<span style="color:var(--amber);font-weight:600;">⚠️ 待开启或待升级</span>'}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="pill-action-btn primary" style="font-size:12px;padding:5px 11px;" onclick="upgradeHostTurbo('${esc(h.hostId)}')">
                    🚀 远程一键升级/刷新极速引擎
                  </button>
                  <button class="pill-action-btn" style="font-size:12px;padding:5px 11px;" onclick="requestHostAxPermission('${esc(h.hostId)}')">
                    🔓 在电脑弹出辅助功能授权框
                  </button>
                </div>
              </div>
            `;
    }).join('') || `<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px;">暂未检测到已接入的电脑</div>`}
        </div>

        <div class="form-label">2. 如何让手机遥控最流畅最快（3 步指南）</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:var(--text-secondary);line-height:1.55;margin-bottom:14px;">
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>① 一步命令接入（自动启用 Rust 加速 + 免二次安装）</strong><br/>
            新电脑只需运行一次 <code>./connect-host.sh</code>，脚本会自动寻找系统或 IDE 内置运行时、挂载 <code>dsh-turbo</code> 预编译 Rust 加速模块，并自动弹出 macOS 辅助功能授权框。<br/>
            <button class="pill-action-btn" style="margin-top:6px;font-size:11.5px;padding:4px 10px;" onclick="copyCodeText('${encodeURIComponent(oneStepCmd)}')">📋 复制一键满血接入命令</button>
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>② 勾选 macOS「辅助功能」权限</strong><br/>
            若手机点审批时电脑未自动按下回车，点上方「🔓 在电脑弹出辅助功能授权框」，在电脑弹出的「系统设置 → 隐私与安全性 → 辅助功能」中打开开关即可。
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);">
            <strong>③ iPhone Safari 添加到主屏幕 + 开启锁屏推送</strong><br/>
            在 Safari 点底部「分享 → 添加到主屏幕」，从桌面独立图标打开并开启锁屏推送，获得原生 App 级全屏帧率与锁屏秒级提醒。
          </div>
        </div>
      `;
    openSheet('turboGuideSheet');
  }

  async function requestHostAxPermission(hostId) {
    showToast('🔓 正在电脑端弹出 macOS 辅助功能授权窗口...');
    await dispatchHostCommand(hostId, { type: 'request_ax_permission' });
    setTimeout(fetchState, 400);
    setTimeout(() => {
      if (document.getElementById('turboGuideSheet').classList.contains('open')) openTurboGuideSheet();
    }, 900);
  }

  async function upgradeHostTurbo(hostId, hostName = '') {
    const label = hostName || hostId;
    upgradingHostMap[hostId] = Date.now();
    lastRenderedSettingsKey = '';
    if (currentTab === 'settings') renderSettingsTab();
    showToast(`🚀 正在为「${label}」拉取最新代码并自动热重启守护进程...`);
    try {
      await dispatchHostCommand(hostId, { type: 'upgrade_turbo' });
    } catch { }
    const startWait = Date.now();
    const pollUpgrade = async () => {
      await fetchState({ silent: true, forceFresh: true });
      const targetVer = String(hubState.build?.version || hubState.version || '0.5.1').trim();
      const updatedHost = (hubState.hosts || []).find(h => h.hostId === hostId);
      const curVer = String(updatedHost?.bridgeState?.agentVersion || '').trim();
      if (curVer && compareSemver(curVer, targetVer) >= 0) {
        delete upgradingHostMap[hostId];
        lastRenderedSettingsKey = '';
        if (currentTab === 'settings') renderSettingsTab();
        if (document.getElementById('turboGuideSheet')?.classList.contains('open')) openTurboGuideSheet();
        showToast(`✅ 电脑「${label}」已升级至最新版本 v${targetVer}！`);
        return;
      }
      if (Date.now() - startWait < 45000) {
        setTimeout(pollUpgrade, 1500);
      } else {
        delete upgradingHostMap[hostId];
        lastRenderedSettingsKey = '';
        if (currentTab === 'settings') renderSettingsTab();
        if (document.getElementById('turboGuideSheet')?.classList.contains('open')) openTurboGuideSheet();
      }
    };
    setTimeout(pollUpgrade, 2000);
  }

  // ==================== 15. 手势返回 / 浮层历史栈（体验增强） ====================
  // 打开二级页面或抽屉时写入一条 history，使系统返回键、Safari 侧滑、
  // 手势右滑都能「退回上一层」，而不是直接退出整个网页。
  let lastSheetDragEndAt = 0;

  function setFileSheetExpanded(expanded) {
    const panel = document.querySelector('#inChatFileSheet .sheet-panel');
    if (!panel) return;
    const isExp = Boolean(expanded);
    panel.classList.toggle('sheet-expanded', isExp);
    const btn = document.getElementById('inChatFileExpandBtn');
    if (btn) {
      btn.textContent = isExp ? '⤡' : '⤢';
      const rawLabel = isExp ? '收起高度' : '展开显示更多';
      const label = langPref === 'en' ? translateZhStringToEn(rawLabel) : rawLabel;
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }
  }

  function toggleFileSheetExpanded() {
    if (Date.now() - lastSheetDragEndAt < 260) return;
    const panel = document.querySelector('#inChatFileSheet .sheet-panel');
    if (!panel) return;
    setFileSheetExpanded(!panel.classList.contains('sheet-expanded'));
  }

  function rawCloseSheet(id) {
    if (id === 'newTaskSheet') stopVoiceInput();
    document.getElementById(id)?.classList.remove('open');
    if (id === 'inChatFileSheet') {
      document.body.classList.remove('mobile-file-open');
      drawerChangedFilesSessionId = null;
      setFileSheetExpanded(false);
    }
  }

  // 同一种浮层只登记一次：重复打开（例如刷新抽屉内容）不应多压一条历史
  function trackOverlay(kind, closeFn) {
    if (overlayStack.some(item => item.kind === kind)) return;
    overlayStack.push({ kind, closeFn });
    try {
      // 记录层级，返回时按层级逐层关闭（同时兼容浏览器前进/后退）
      history.pushState({ __dshOverlay: kind, __dshDepth: overlayStack.length }, '');
    } catch {
      // 某些 WebView 禁止 pushState，降级为纯手势关闭
    }
  }

  function openSheet(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    applyLangToDom(el, langPref);
    trackOverlay('sheet:' + id, () => rawCloseSheet(id));
  }

  function dismissOverlay(kind, fallbackClose) {
    const index = overlayStack.map(item => item.kind).lastIndexOf(kind);
    const entry = index >= 0 ? overlayStack.splice(index, 1)[0] : null;
    if (entry) entry.closeFn();
    else if (typeof fallbackClose === 'function') fallbackClose();
    // 关闭时同步回退历史，避免用户下次按返回键时出现「空按一次」
    if (entry && history.state && history.state.__dshOverlay) {
      suppressPopstateCount += 1;
      try { history.back(); } catch { suppressPopstateCount = Math.max(0, suppressPopstateCount - 1); }
    }
  }

  window.addEventListener('popstate', () => {
    if (suppressPopstateCount > 0) {
      suppressPopstateCount -= 1;
      return;
    }
    // 以历史状态里的层级为准：后退一层就关一层，前进（层级变深）时保持现状
    const state = history.state || null;
    const targetDepth = state && typeof state.__dshDepth === 'number' ? state.__dshDepth : 0;
    while (overlayStack.length > targetDepth) {
      const entry = overlayStack.pop();
      if (entry) entry.closeFn();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || overlayStack.length === 0) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    const top = overlayStack[overlayStack.length - 1];
    dismissOverlay(top.kind, top.closeFn);
  });

  function setupChatSwipeBack() {
    const chat = document.getElementById('chatFullscreen');
    if (!chat) return;
    let tracking = false;
    let decided = null;
    let startX = 0;
    let startY = 0;
    let startRelX = 0;
    let lastX = 0;
    let lastY = 0;
    let startedAt = 0;
    let width = 0;
    let originTarget = null;
    let lastHandledMoveEvt = null;
    let lastHandledEndEvt = null;

    const resetChatStyle = () => {
      chat.style.transition = '';
      chat.style.transform = '';
      chat.style.willChange = '';
      chat.style.boxShadow = '';
    };

    const flushDeferredChatRender = () => {
      chatTouchDownAt = 0;
      if (pendingChatRenderAfterTouch && activeSessionId) {
        pendingChatRenderAfterTouch = false;
        renderActiveChatStage();
      }
    };

    const isInteractiveSwipeExcluded = (target) => {
      if (!target || typeof target.closest !== 'function') return false;
      return Boolean(
        target.closest(
          'textarea, input, select, video, audio, #wechatHoldTalkBtn, #wechatHoldBtn, #wechatVoiceOverlay, [data-no-back-swipe]'
        )
      );
    };

    // 仅真正内部横向滚动容器（如宽 <pre> 代码块或宽表格）在仍有向左回滚余量时让出手势；
    // 贴近屏幕最左边缘（28px 内）起手始终优先响应返回手势，且绝不把 #chatMessages 本身误判为横向滚动区！
    const canScrollHorizontally = (target, dx) => {
      if (startRelX <= 28) return false;
      let node = target;
      while (node && node !== chat && node.id !== 'chatMessages' && node.nodeType === 1) {
        const overflowX = window.getComputedStyle(node).overflowX;
        if (/(auto|scroll)/.test(overflowX) && node.scrollWidth > node.clientWidth + 8) {
          if (dx > 0 && node.scrollLeft > 2) return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const detachOriginListeners = () => {
      if (!originTarget || originTarget === window || typeof originTarget.removeEventListener !== 'function') {
        originTarget = null;
        return;
      }
      try {
        originTarget.removeEventListener('touchmove', onMove);
        originTarget.removeEventListener('touchend', finishSwipe);
        originTarget.removeEventListener('touchcancel', finishSwipe);
      } catch { }
      originTarget = null;
    };

    const onMove = (event) => {
      if (!tracking) return;
      if (event === lastHandledMoveEvt) return;
      lastHandledMoveEvt = event;
      if (!event.touches || event.touches.length !== 1) {
        tracking = false;
        decided = null;
        detachOriginListeners();
        resetChatStyle();
        flushDeferredChatRender();
        return;
      }
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      lastX = touch.clientX;
      lastY = touch.clientY;
      if (decided === null) {
        if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
        // 长按超过 400ms 后才移动说明用户在触发系统文字选中或长按存图，不抢手势
        if (Date.now() - startedAt > 400) {
          tracking = false;
          detachOriginListeners();
          flushDeferredChatRender();
          return;
        }
        // 仅允许从页面左侧向右滑返回；向左滑或纵向滚动立即放行
        if (dx <= -8 || (Math.abs(dy) >= 12 && Math.abs(dy) > Math.abs(dx) * 1.12)) {
          tracking = false;
          detachOriginListeners();
          flushDeferredChatRender();
          return;
        }
        if (dx >= 10 && dx >= Math.abs(dy) * 1.1) {
          if (canScrollHorizontally(originTarget || event.target, dx)) {
            tracking = false;
            detachOriginListeners();
            flushDeferredChatRender();
            return;
          }
          decided = true;
          chat.style.transition = 'none';
          chat.style.willChange = 'transform';
        } else if (Math.hypot(dx, dy) > 26) {
          tracking = false;
          detachOriginListeners();
          flushDeferredChatRender();
          return;
        } else {
          return;
        }
      }
      const clampedX = Math.max(0, Math.min(dx, width));
      if (event.cancelable) event.preventDefault();
      chat.style.transform = `translate3d(${clampedX}px, 0, 0)`;
      chat.style.boxShadow = clampedX > 0 ? '-10px 0 30px rgba(15, 23, 42, 0.16)' : '';
    };

    const finishSwipe = (event) => {
      if (event && event === lastHandledEndEvt) return;
      lastHandledEndEvt = event || null;
      if (!tracking) {
        if (chatTouchDownAt > 0) flushDeferredChatRender();
        return;
      }
      tracking = false;
      detachOriginListeners();
      const wasDecided = decided === true;
      decided = null;
      if (!wasDecided) {
        flushDeferredChatRender();
        return;
      }
      const effDx = Math.max(0, lastX - startX);
      const absDy = Math.abs(lastY - startY);
      const durationMs = Math.max(1, Date.now() - startedAt);
      const velocity = effDx / durationMs;
      const distThreshold = Math.min(Math.max(60, width * 0.17), 115);
      const dismiss =
        absDy <= effDx * 1.15 &&
        (effDx >= distThreshold ||
          (effDx >= 30 && velocity >= 0.3) ||
          shouldDismissHorizontalSwipe({ dx: effDx, dy: absDy, width, durationMs }));
      if (dismiss) {
        chatTouchDownAt = 0;
        pendingChatRenderAfterTouch = false;
        resetChatStyle();
        closeMobileChat();
      } else {
        chat.style.transition = 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
        chat.style.transform = 'translate3d(0px, 0, 0)';
        setTimeout(() => {
          resetChatStyle();
          flushDeferredChatRender();
        }, 230);
      }
    };

    chat.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      if (!document.body.classList.contains('mobile-chat-open')) return;
      if (isDesktopSplitLayout()) return;
      if (document.querySelector('.sheet-backdrop.open, #triageDeckOverlay.open')) return;
      startedAt = Date.now();
      chatTouchDownAt = startedAt;
      if (isInteractiveSwipeExcluded(event.target)) return;
      detachOriginListeners();
      const touch = event.touches[0];
      const rect = chat.getBoundingClientRect();
      width = chat.offsetWidth || rect.width || window.innerWidth || 375;
      startRelX = touch.clientX - rect.left;
      // 仅限页面左侧边缘带起手才启用右滑返回会话列表，正文中间及右侧滑动绝不误触后退
      if (!isWithinLeftSwipeBackZone(startRelX, width)) return;
      tracking = true;
      decided = null;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = startX;
      lastY = startY;
      originTarget = event.target;
      if (
        originTarget &&
        originTarget !== window &&
        originTarget !== chat &&
        typeof originTarget.addEventListener === 'function'
      ) {
        try {
          originTarget.addEventListener('touchmove', onMove, { passive: false });
          originTarget.addEventListener('touchend', finishSwipe);
          originTarget.addEventListener('touchcancel', finishSwipe);
        } catch { }
      }
    }, { passive: true });

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', finishSwipe);
    window.addEventListener('touchcancel', finishSwipe);
  }

  function setupSheetSwipeDismiss() {
    document.querySelectorAll('.sheet-backdrop').forEach(backdrop => {
      const panel = backdrop.querySelector('.sheet-panel');
      if (!panel) return;
      const expandable = panel.dataset.expandable === '1' || backdrop.id === 'inChatFileSheet';
      let tracking = false;
      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;
      let startedAt = 0;
      let dragMode = null; // 'expand' | 'dismiss'
      let startExpanded = false;
      let startH = 0;
      let defaultH = 0;
      let expandedH = 0;

      const resetPanelStyle = () => {
        panel.style.transition = '';
        panel.style.transform = '';
        panel.style.height = '';
        panel.style.willChange = '';
      };

      // 抽屉内部若有自己滚动的列表（如文件速览），列表已滚过时不要误触发下拉关闭
      const hasScrolledInner = (target) => {
        let node = target;
        while (node && node !== panel && node.nodeType === 1) {
          const overflowY = window.getComputedStyle(node).overflowY;
          if (/(auto|scroll)/.test(overflowY) && node.scrollTop > 0) return true;
          node = node.parentElement;
        }
        return false;
      };

      let decided = false;

      panel.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        const onChromeHandle = Boolean(
          expandable &&
          event.target &&
          typeof event.target.closest === 'function' &&
          event.target.closest('.sheet-drag-zone, .sheet-handle, .sheet-title, .breadcrumbs-bar')
        );
        // 绝不拦截图片、视频、HTML 预览或代码区域上的手势，保证手机长按保存图片与双指缩放 100% 可用
        if (
          !onChromeHandle &&
          event.target &&
          typeof event.target.closest === 'function' &&
          event.target.closest('img, video, iframe, pre, code, .file-preview-body')
        ) {
          tracking = false;
          decided = false;
          dragMode = null;
          return;
        }
        if (!onChromeHandle && (panel.scrollTop > 0 || hasScrolledInner(event.target))) return;
        const touch = event.touches[0];
        tracking = true;
        decided = false;
        dragMode = null;
        startX = touch.clientX;
        startY = touch.clientY;
        lastX = startX;
        lastY = startY;
        startedAt = Date.now();
        if (expandable) {
          const vh = window.innerHeight || document.documentElement.clientHeight || 800;
          const safeTop = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0;
          defaultH = Math.round(vh * 0.80);
          expandedH = Math.max(defaultH + 40, Math.round(vh * 0.97 - safeTop));
          startExpanded = panel.classList.contains('sheet-expanded');
          startH = Math.round(panel.getBoundingClientRect().height) || (startExpanded ? expandedH : defaultH);
        }
      }, { passive: true });

      panel.addEventListener('touchmove', (event) => {
        if (!tracking) return;
        const touch = event.touches[0];
        const dy = touch.clientY - startY;
        const dx = touch.clientX - startX;
        lastX = touch.clientX;
        lastY = touch.clientY;
        if (!decided) {
          const threshold = expandable ? 10 : 14;
          if (Math.abs(dy) < threshold && Math.abs(dx) < threshold) return;
          if (Math.abs(dx) > Math.abs(dy) * 1.15) {
            tracking = false;
            return;
          }
          if (dy < 0) {
            if (!expandable) {
              tracking = false;
              return;
            }
            dragMode = 'expand';
            decided = true;
            panel.style.transition = 'none';
            panel.style.willChange = 'height';
          } else {
            dragMode = expandable && startExpanded ? 'expand' : 'dismiss';
            decided = true;
            panel.style.transition = 'none';
            panel.style.willChange = dragMode === 'expand' ? 'height, transform' : 'transform';
          }
        }
        if (dragMode === 'expand') {
          if (event.cancelable) event.preventDefault();
          const rawNextH = startH - dy;
          if (rawNextH >= defaultH) {
            const clampedH = Math.min(expandedH, rawNextH);
            panel.style.height = `${clampedH}px`;
            panel.style.transform = '';
          } else {
            const overflowDown = defaultH - rawNextH;
            panel.style.height = `${defaultH}px`;
            panel.style.transform = `translateY(${overflowDown}px)`;
          }
          return;
        }
        if (dy <= 0) return;
        if (event.cancelable) event.preventDefault();
        panel.style.transform = `translateY(${dy}px)`;
      }, { passive: false });

      const finishSwipe = () => {
        if (!tracking) return;
        const wasDecided = decided;
        const mode = dragMode;
        tracking = false;
        decided = false;
        dragMode = null;
        if (!wasDecided) return;
        const dy = lastY - startY;
        const dx = lastX - startX;
        const durationMs = Math.max(1, Date.now() - startedAt);
        const vy = dy / durationMs;

        if (mode === 'expand') {
          lastSheetDragEndAt = Date.now();
          if (!startExpanded) {
            const shouldExpand = dy <= -32 || vy <= -0.28;
            panel.style.transition = '';
            panel.style.height = '';
            panel.style.transform = '';
            panel.style.willChange = '';
            setFileSheetExpanded(shouldExpand);
            return;
          }
          const rawEndH = startH - dy;
          const overflowDown = Math.max(0, defaultH - rawEndH);
          const shouldDismiss = overflowDown >= 110 || (dy >= 230 && vy >= 0.72);
          if (shouldDismiss) {
            panel.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';
            panel.style.transform = `translateY(${panel.offsetHeight || 600}px)`;
            setTimeout(() => {
              closeSheet(backdrop.id);
              resetPanelStyle();
            }, 190);
            return;
          }
          const shouldCollapse = dy >= 36 || vy >= 0.30;
          panel.style.transition = '';
          panel.style.height = '';
          panel.style.transform = '';
          panel.style.willChange = '';
          setFileSheetExpanded(!shouldCollapse);
          return;
        }

        const downDy = Math.max(0, dy);
        const dismiss = shouldDismissVerticalSwipe({
          dy: downDy,
          dx,
          height: panel.offsetHeight,
          durationMs,
        });
        panel.style.transition = 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)';
        if (dismiss) {
          panel.style.transform = `translateY(${panel.offsetHeight || 600}px)`;
          setTimeout(() => {
            closeSheet(backdrop.id);
            resetPanelStyle();
          }, 190);
        } else {
          panel.style.transform = 'translateY(0)';
          setTimeout(resetPanelStyle, 220);
        }
      };

      panel.addEventListener('touchend', finishSwipe);
      panel.addEventListener('touchcancel', finishSwipe);
    });
  }

  // iOS「添加到主屏幕」独立全屏模式（Web.app）会屏蔽 Safari 原生 <img> 长按菜单：
  // 在按住期间（450ms）后台预热 File 对象，手指松开瞬间借 touchend 瞬态激活直接弹出系统「存储图像 / 隔空投送」面板！
  function setupStandaloneImageLongPressSave() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    let holdImg = null;
    let holdStartX = 0;
    let holdStartY = 0;
    let holdReady = false;
    let holdTimer = null;
    let readyFile = null;
    let holdFileName = 'image.png';

    const inferImgMime = (name) =>
      /\.jpe?g$/i.test(name)
        ? 'image/jpeg'
        : /\.webp$/i.test(name)
          ? 'image/webp'
          : /\.gif$/i.test(name)
            ? 'image/gif'
            : 'image/png';

    const buildCanvasFallbackFile = (imgEl, safeName) =>
      new Promise(resolve => {
        try {
          const w = imgEl.naturalWidth || imgEl.width || 0;
          const h = imgEl.naturalHeight || imgEl.height || 0;
          if (!w || !h) return resolve(null);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(imgEl, 0, 0, w, h);
          const mime = inferImgMime(safeName);
          canvas.toBlob(
            blob => {
              canvas.width = 0;
              canvas.height = 0;
              if (!blob) return resolve(null);
              resolve(new File([blob], safeName, { type: mime }));
            },
            mime,
            0.95
          );
        } catch {
          resolve(null);
        }
      });

    const prefetchShareableImageFile = async (imgEl, safeName) => {
      const rawUrl = imgEl.getAttribute('data-download-url') || imgEl.currentSrc || imgEl.src || '';
      if (!rawUrl) return null;
      try {
        const token = getToken();
        const isData = rawUrl.startsWith('data:');
        const resp = isData
          ? await fetch(rawUrl)
          : await fetch(rawUrl, { headers: token ? { authorization: `Bearer ${token}` } : {} });
        if (resp.ok) {
          const blob = await resp.blob();
          const mime = (blob.type && blob.type.startsWith('image/')) ? blob.type : inferImgMime(safeName);
          return new File([blob], safeName, { type: mime });
        }
      } catch { }
      return buildCanvasFallbackFile(imgEl, safeName);
    };

    const cleanupHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      if (holdImg) {
        holdImg.style.transform = '';
      }
      holdImg = null;
      holdReady = false;
      readyFile = null;
    };

    document.addEventListener('touchstart', (event) => {
      if (!isStandaloneApp() || event.touches.length !== 1) return;
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
      const target = event.target;
      const img =
        target && typeof target.closest === 'function'
          ? target.closest('img.saveable-preview-img, img.md-inline-img')
          : null;
      if (!img) return;
      cleanupHold();
      const t = event.touches[0];
      holdImg = img;
      holdStartX = t.clientX;
      holdStartY = t.clientY;
      const rawName =
        img.getAttribute('data-file-name') ||
        img.getAttribute('alt') ||
        (img.src && !img.src.startsWith('data:') ? img.src.split('?')[0].split('/').pop() : '') ||
        'image.png';
      holdFileName = /\.(png|jpe?g|webp|gif)$/i.test(rawName) ? rawName : `${rawName}.png`;

      void prefetchShareableImageFile(img, holdFileName).then(file => {
        if (holdImg === img && file) {
          readyFile = file;
        }
      });

      holdTimer = setTimeout(() => {
        holdTimer = null;
        if (!holdImg) return;
        holdReady = true;
        holdImg.style.transition = 'transform 0.14s ease';
        holdImg.style.transform = 'scale(0.975)';
        try { navigator.vibrate?.(12); } catch { }
        showToast('📥 松开手指即可保存或分享图片');
      }, 450);
    }, { passive: true });

    document.addEventListener('touchmove', (event) => {
      if (!holdImg) return;
      if (event.touches.length !== 1) {
        cleanupHold();
        return;
      }
      const t = event.touches[0];
      if (Math.hypot(t.clientX - holdStartX, t.clientY - holdStartY) > 12) {
        cleanupHold();
      }
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      if (!holdImg) return;
      const wasReady = holdReady;
      const fileToShare = readyFile;
      const nameToShare = holdFileName;
      const targetImg = holdImg;
      cleanupHold();
      if (!wasReady) return;
      if (event.cancelable) {
        try { event.preventDefault(); } catch { }
      }
      const openShare = async (f) => {
        if (!f) return;
        if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [f] })) return;
        try {
          await navigator.share({ files: [f], title: nameToShare });
        } catch { }
      };
      if (fileToShare) {
        void openShare(fileToShare);
      } else {
        void buildCanvasFallbackFile(targetImg, nameToShare).then(openShare);
      }
    }, { passive: false });

    document.addEventListener('touchcancel', cleanupHold, { passive: true });
  }

  function maybeShowSwipeHint() {
    if (!('ontouchstart' in window)) return;
    try {
      if (localStorage.getItem('dsh_swipe_hint_v1')) return;
      localStorage.setItem('dsh_swipe_hint_v1', '1');
    } catch {
      return;
    }
    setTimeout(() => showToast('💡 提示：从屏幕左侧向右滑动即可返回会话列表'), 600);
  }

  async function forceHardUpgradeReload() {
    showToast(langPref === 'en' ? '🚀 Clearing cache & loading latest version…' : '🚀 正在清理旧缓存并拉取最新版本…');
    try {
      sessionStorage.removeItem('dsh_reloaded_ui_build');
    } catch { }
    try {
      if (typeof caches !== 'undefined' && caches && typeof caches.keys === 'function') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { }
    try {
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update().catch(() => { })));
      }
    } catch { }
    reloadWithFreshAppShell('');
  }

  function setupMainViewportPullRefresh() {
    const vp = document.getElementById('mainViewport');
    const slot = document.getElementById('pullRefreshSlot');
    const pill = document.getElementById('pullRefreshPill');
    const label = document.getElementById('pullRefreshLabel');
    if (!vp || !slot || !pill || !label) return;

    const PULL_START_DY = 32; // 前 32px 防误触死区：轻触或微滑完全不弹出提示槽
    const STAGE1_DY = 155;    // 第一段（同步状态）：需明显下拉 155px（原 58px 的 2.7 倍）
    const STAGE2_DY = 285;    // 第二段（清缓存强制重刷整个前端）：需使劲拉到底 285px（原 128px 的 2.2 倍）
    let tracking = false;
    let pulling = false;
    let startX = 0;
    let startY = 0;
    let currentDy = 0;
    let lastStage = 0;

    const collapseSlot = () => {
      slot.style.transition = 'height 0.22s cubic-bezier(0.22, 1, 0.36, 1)';
      slot.style.height = '0px';
      slot.classList.remove('active');
      pill.classList.remove('stage-1', 'stage-2');
      lastStage = 0;
    };

    vp.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      if (vp.scrollTop > 0.5) return;
      if (document.body.classList.contains('mobile-chat-open')) return;
      if (document.querySelector('.sheet-backdrop.open, #triageDeckOverlay.open')) return;
      const t = event.touches[0];
      tracking = true;
      pulling = false;
      startX = t.clientX;
      startY = t.clientY;
      currentDy = 0;
      lastStage = 0;
    }, { passive: true });

    vp.addEventListener('touchmove', (event) => {
      if (!tracking) return;
      if (event.touches.length !== 1) {
        tracking = false;
        if (pulling) collapseSlot();
        return;
      }
      const t = event.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!pulling) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        if (dy <= 0 || vp.scrollTop > 0.5 || Math.abs(dy) < Math.abs(dx) * 1.35) {
          tracking = false;
          return;
        }
        if (dy < PULL_START_DY) {
          return;
        }
        pulling = true;
        slot.style.transition = 'none';
        slot.classList.add('active');
      }
      currentDy = Math.max(0, dy);
      if (currentDy > PULL_START_DY && event.cancelable) {
        event.preventDefault();
      }
      const effDy = Math.max(0, currentDy - PULL_START_DY);
      const visualH = Math.min(96, Math.round(Math.pow(effDy, 0.72) * 1.8));
      slot.style.height = `${visualH}px`;

      const en = langPref === 'en';
      const nextStage = currentDy >= STAGE2_DY ? 2 : currentDy >= STAGE1_DY ? 1 : 0;
      if (nextStage !== lastStage) {
        if (nextStage === 1 && lastStage === 0) {
          try { navigator.vibrate?.(10); } catch { }
        } else if (nextStage === 2) {
          try { navigator.vibrate?.([16, 28, 22]); } catch { }
        }
        lastStage = nextStage;
      }
      pill.classList.toggle('stage-1', nextStage === 1);
      pill.classList.toggle('stage-2', nextStage === 2);
      if (nextStage === 2) {
        label.textContent = en
          ? '⚡ Ready! Release to force-update app'
          : '⚡ 已拉满！松手强制更新前端（清缓存重载）';
      } else if (nextStage === 1) {
        const pct = Math.min(
          99,
          Math.max(1, Math.round(((currentDy - STAGE1_DY) / (STAGE2_DY - STAGE1_DY)) * 100))
        );
        label.textContent = en
          ? `↻ Release to sync · Pull harder to update (${pct}%)`
          : `↻ 松手同步状态 · 继续深拉重刷版本 (${pct}%)`;
      } else {
        label.textContent = en
          ? '↓ Keep pulling to refresh…'
          : '↓ 继续向下拉刷新状态…';
      }
    }, { passive: false });

    const finishPull = () => {
      if (!tracking) return;
      tracking = false;
      if (!pulling) return;
      pulling = false;
      const en = langPref === 'en';
      if (currentDy >= STAGE2_DY) {
        slot.style.transition = 'height 0.16s ease';
        slot.style.height = '48px';
        label.textContent = en ? '🚀 Updating to latest build…' : '🚀 正在清理缓存并加载最新版…';
        void forceHardUpgradeReload();
        return;
      }
      if (currentDy >= STAGE1_DY) {
        slot.style.transition = 'height 0.16s ease';
        slot.style.height = '42px';
        label.textContent = en ? '↻ Syncing latest sessions…' : '↻ 正在同步最新状态…';
        try {
          navigator.serviceWorker?.getRegistration?.().then(r => r?.update?.()).catch(() => { });
        } catch { }
        if (!sseConnected) connectSSE();
        void fetchState({ silent: true, forceFresh: true }).finally(() => {
          label.textContent = en ? '✅ Synced' : '✅ 已同步最新状态';
          setTimeout(collapseSlot, 360);
        });
        return;
      }
      collapseSlot();
    };

    vp.addEventListener('touchend', finishPull);
    vp.addEventListener('touchcancel', finishPull);
  }

  function setupOverlayGestures() {
    setupChatSwipeBack();
    setupSheetSwipeDismiss();
    setupStandaloneImageLongPressSave();
    setupMainViewportPullRefresh();
  }

  // ==================== 15b. 「添加到主屏幕」提示 ====================
  // iOS 只有从主屏幕图标打开时才允许 Web Push，普通 Safari 标签页收不到锁屏通知。
  function setupInstallHint() {
    const el = document.getElementById('installHint');
    if (!el) return;
    let dismissed = true;
    try { dismissed = localStorage.getItem('dsh_a2hs_dismissed_v1') === '1'; } catch { }
    const show = shouldShowInstallHint({
      isIos: isIosDeviceForHint(),
      isStandalone: isStandaloneForHint(),
      dismissed,
    });
    if (!show) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    // 别一进页面就盖住列表，缓一下再出现
    setTimeout(() => { el.classList.add('show'); }, 1200);
  }

  function dismissInstallHint() {
    try { localStorage.setItem('dsh_a2hs_dismissed_v1', '1'); } catch { }
    const el = document.getElementById('installHint');
    if (el) {
      el.classList.remove('show');
      el.style.display = 'none';
    }
  }

  // ==================== 16. SSE 实时流与轮询同步 ====================
  // 返回 { ok, unauthorized?, error? }：调用方（尤其是登录）需要知道失败原因，
  // 不能再把所有异常吞掉，否则「密码错了」会被误报成「解锁成功」。
  // 「在文件页打开了某个预览」是纯前端状态，每次轮询都会拿到新对象，
  // 不把它们搬过去的话，预览会在 2 秒后自己弹回目录列表。
  function preservePreviewUiState(nextState) {
    const prevHosts = hubState.hosts || [];
    for (const host of nextState.hosts || []) {
      const prevHostObj = prevHosts.find(h => h.hostId === host.hostId);
      const prevListing = prevHostObj?.lastFsListing;
      if (prevListing && (!host.lastFsListing || (prevListing.at || 0) >= (host.lastFsListing.at || 0))) {
        host.lastFsListing = prevListing;
      }
      const prev = prevHostObj?.lastFilePreview;
      const next = host.lastFilePreview;
      if (prev && (!next || (prev.at || 0) > (next.at || 0))) {
        host.lastFilePreview = prev;
      } else if (prev && next && prev.at === next.at && prev.relPath === next.relPath) {
        next._showInMain = Boolean(prev._showInMain);
        next._showInDrawer = Boolean(prev._showInDrawer);
        next._origImage = Boolean(prev._origImage);
        next._transcodeVideo = Boolean(prev._transcodeVideo);
        next._rawVideo = Boolean(prev._rawVideo);
        if (!next.videoProbe && prev.videoProbe) next.videoProbe = prev.videoProbe;
        if (!next.streamUrl && prev.streamUrl) next.streamUrl = prev.streamUrl;
        if ((next.content === undefined || prev._fullHtmlFetched) && prev.content !== undefined) {
          next.content = prev.content;
          if (prev._fullHtmlFetched) {
            next._fullHtmlFetched = true;
            next.kind = 'text';
            next.truncated = false;
          }
        }
      }
      const pinnedDrawer = pinnedDrawerPreviewByHost[host.hostId];
      if (
        pinnedDrawer &&
        !pinnedDrawer._loadError &&
        !(pinnedDrawer.kind === 'image' && pinnedDrawer.streamUrl) &&
        next &&
        next.relPath === pinnedDrawer.relPath &&
        next.at >= (pinnedDrawer.at || 0)
      ) {
        if ((next.content === undefined || pinnedDrawer._fullHtmlFetched) && pinnedDrawer.content !== undefined) {
          next.content = pinnedDrawer.content;
          if (pinnedDrawer._fullHtmlFetched) {
            next._fullHtmlFetched = true;
            next.kind = 'text';
            next.truncated = false;
          }
        }
        if (!next.streamUrl && pinnedDrawer.streamUrl) next.streamUrl = pinnedDrawer.streamUrl;
        if (!next.backupStreamUrl && pinnedDrawer.backupStreamUrl) next.backupStreamUrl = pinnedDrawer.backupStreamUrl;
        if (!next.videoProbe && pinnedDrawer.videoProbe) next.videoProbe = pinnedDrawer.videoProbe;
        if (pinnedDrawer._retryContext) next._retryContext = pinnedDrawer._retryContext;
        if (pinnedDrawer._reloadNonce) next._reloadNonce = pinnedDrawer._reloadNonce;
        if (pinnedDrawer._imgStatus) next._imgStatus = pinnedDrawer._imgStatus;
        if (pinnedDrawer._imgDims) next._imgDims = pinnedDrawer._imgDims;
        next._origImage = Boolean(pinnedDrawer._origImage);
        next._transcodeVideo = Boolean(pinnedDrawer._transcodeVideo);
        next._rawVideo = Boolean(pinnedDrawer._rawVideo);
        next._showInDrawer = true;
        pinnedDrawerPreviewByHost[host.hostId] = next;
      }
      const pinnedMain = pinnedMainPreviewByHost[host.hostId];
      if (
        pinnedMain &&
        !pinnedMain._loadError &&
        !(pinnedMain.kind === 'image' && pinnedMain.streamUrl) &&
        next &&
        next.relPath === pinnedMain.relPath &&
        next.at >= (pinnedMain.at || 0)
      ) {
        if ((next.content === undefined || pinnedMain._fullHtmlFetched) && pinnedMain.content !== undefined) {
          next.content = pinnedMain.content;
          if (pinnedMain._fullHtmlFetched) {
            next._fullHtmlFetched = true;
            next.kind = 'text';
            next.truncated = false;
          }
        }
        if (!next.streamUrl && pinnedMain.streamUrl) next.streamUrl = pinnedMain.streamUrl;
        if (!next.backupStreamUrl && pinnedMain.backupStreamUrl) next.backupStreamUrl = pinnedMain.backupStreamUrl;
        if (!next.videoProbe && pinnedMain.videoProbe) next.videoProbe = pinnedMain.videoProbe;
        if (pinnedMain._retryContext) next._retryContext = pinnedMain._retryContext;
        if (pinnedMain._reloadNonce) next._reloadNonce = pinnedMain._reloadNonce;
        if (pinnedMain._imgStatus) next._imgStatus = pinnedMain._imgStatus;
        if (pinnedMain._imgDims) next._imgDims = pinnedMain._imgDims;
        next._origImage = Boolean(pinnedMain._origImage);
        next._transcodeVideo = Boolean(pinnedMain._transcodeVideo);
        next._rawVideo = Boolean(pinnedMain._rawVideo);
        next._showInMain = true;
        pinnedMainPreviewByHost[host.hostId] = next;
      }
    }
  }

  function tryOpenDeepLinkTarget({ hostId, agentId } = {}) {
    const targetTaskId = String(agentId || '').trim();
    const targetHostId = String(hostId || '').trim();
    if (targetHostId && (hubState.hosts || []).some(h => h.hostId === targetHostId)) {
      if (currentHostId !== 'ALL_HOSTS' && currentHostId !== targetHostId) {
        currentHostId = targetHostId;
      }
    }
    if (targetTaskId) {
      const found = findSessionGlobal(targetTaskId);
      if (found) {
        if (currentTab !== 'chats') switchTab('chats');
        openChat(found.session.id);
        return true;
      }
      return false;
    }
    if (targetHostId && (hubState.hosts || []).some(h => h.hostId === targetHostId)) {
      currentHostId = targetHostId;
      renderAll();
      return true;
    }
    return false;
  }

  function flushPendingDeepLink() {
    if (!pendingDeepLinkHostId && !pendingDeepLinkTaskId) return;
    if (tryOpenDeepLinkTarget({ hostId: pendingDeepLinkHostId, agentId: pendingDeepLinkTaskId })) {
      pendingDeepLinkHostId = '';
      pendingDeepLinkTaskId = '';
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
    try {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const msg = event?.data;
        if (msg && msg.type === 'NOTIFICATION_CLICK' && msg.data) {
          const { hostId, agentId } = msg.data;
          if (!tryOpenDeepLinkTarget({ hostId, agentId })) {
            pendingDeepLinkHostId = String(hostId || '').trim();
            pendingDeepLinkTaskId = String(agentId || '').trim();
          }
          if (!sseConnected || Date.now() - lastSseEventAt > 4000) {
            connectSSE();
          }
          void fetchState({ silent: true, forceFresh: true });
        } else if (msg && msg.type === 'PUSH_RECEIVED') {
          if (!sseConnected || Date.now() - lastSseEventAt > 4000) {
            connectSSE();
          }
          if (!stateFetchInFlight) {
            void fetchState({ silent: true, forceFresh: true });
          } else {
            inFlightNeedsFollowup = true;
          }
        } else if (msg && msg.type === 'DSH_SW_UPDATED') {
          const nextBuild = String(msg.uiBuild || '').trim();
          if (nextBuild && nextBuild !== 'dev' && initialUiBuild && nextBuild !== initialUiBuild) {
            triggerAppShellUpgradeReload(nextBuild);
          }
        }
      });
      // Proactively register App-Shell Service Worker after boot so subsequent opens (even right
      // after server upgrades) render in ~0ms from local flash via Stale-While-Revalidate.
      if (
        typeof navigator.serviceWorker.register === 'function' &&
        typeof window !== 'undefined' &&
        window.location &&
        (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ) {
        setTimeout(() => {
          try {
            navigator.serviceWorker.register('/sw.js').catch(() => { });
          } catch { }
        }, 1200);
      }
    } catch { }
  }

  function setConnectionBanner(disconnected, message = '') {
    const banner = document.getElementById('connectionStatusBanner');
    if (!banner) return;
    if (disconnected) {
      banner.textContent = message || '⚠️ 网络连接中断，正在自动重连… 点此立即重试';
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  function detectLoadedBundleBuild() {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return '';
    try {
      const scripts = document.querySelectorAll('script[src]');
      for (const sc of scripts) {
        const src = sc.getAttribute('src') || '';
        const m = /\/assets\/index-([A-Za-z0-9_-]+)\.js/.exec(src);
        if (m && m[1]) return m[1];
      }
    } catch { }
    return '';
  }

  let initialUiBuild = detectLoadedBundleBuild();
  const bootedFromHashedBundle = Boolean(initialUiBuild);
  let lastSavedStateCacheAt = 0;

  function saveCachedHubStateSnapshot(state) {
    if (isDemoMode) return;
    const now = Date.now();
    if (now - lastSavedStateCacheAt < 5000) return;
    lastSavedStateCacheAt = now;
    try {
      const compactHosts = (state?.hosts || []).map(h => ({
        hostId: h.hostId,
        hostName: h.hostName,
        online: h.online,
        lastSeenAt: h.lastSeenAt,
        bridgeState: h.bridgeState
          ? {
            workspaces: h.bridgeState.workspaces || [],
            modelCatalog: h.bridgeState.modelCatalog || {},
            turbo: h.bridgeState.turbo || null,
            systemTelemetry: h.bridgeState.systemTelemetry || null,
            tasks: (h.bridgeState.tasks || []).map((t, tIdx) => {
              const isRecentSlot = tIdx < 8;
              const maxCachedLen = isRecentSlot ? 24000 : 600;
              const srcTr = Array.isArray(t.transcript) ? t.transcript : [];
              const slicedCacheTr = srcTr.slice(-(isRecentSlot ? 6 : 2));
              let cacheSliced = Boolean(t.wireTruncated || (!isRecentSlot && srcTr.length > slicedCacheTr.length));
              const cachedTranscript = slicedCacheTr.map(m => {
                const rawText = String(m?.text || '');
                if (rawText.length > maxCachedLen) cacheSliced = true;
                return {
                  index: m.index,
                  role: m.role,
                  text: rawText.slice(0, maxCachedLen),
                  time: m.time,
                  ...(isRecentSlot && m.thinking ? { thinking: String(m.thinking).slice(0, 2000) } : {}),
                  ...(isRecentSlot && Array.isArray(m.tools) && m.tools.length > 0 ? { tools: m.tools.slice(0, 8) } : {}),
                  artifacts: m.artifacts || [],
                };
              });
              return {
                id: t.id,
                rawId: t.rawId,
                shortId: t.shortId,
                harness: t.harness,
                harnessLabel: t.harnessLabel,
                model: t.model,
                title: t.title,
                status: t.status,
                turnState: t.turnState,
                statusLabel: t.statusLabel,
                project: t.project,
                cwd: t.cwd,
                lastActivity: t.lastActivity,
                updatedAt: t.updatedAt,
                lastConclusionAt: t.lastConclusionAt,
                lastOutput: String(t.lastOutput || '').slice(0, 260),
                runningSummary: String(t.runningSummary || '').slice(0, 200),
                pendingApproval: t.pendingApproval || null,
                changedFiles: Array.isArray(t.changedFiles) ? t.changedFiles.slice(-8) : [],
                artifacts: t.artifacts || [],
                messageCount: t.messageCount || 0,
                totalTranscriptCount: t.totalTranscriptCount || t.messageCount || srcTr.length,
                omittedTranscriptCount: Math.max(
                  0,
                  (t.totalTranscriptCount || t.messageCount || srcTr.length) - cachedTranscript.length
                ),
                wireTruncated: cacheSliced,
                transcript: cachedTranscript,
              };
            }),
          }
          : { tasks: [] },
      }));
      localStorage.setItem(
        'dsh_hub_state_cache_v1',
        JSON.stringify({
          cachedAt: now,
          activeHostId: state?.activeHostId || '',
          hosts: compactHosts,
        })
      );
    } catch { }
  }

  function loadCachedHubStateSnapshot() {
    if (isDemoMode) return null;
    try {
      const raw = localStorage.getItem('dsh_hub_state_cache_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.hosts) &&
        parsed.hosts.length > 0 &&
        Number(parsed.cachedAt || 0) > Date.now() - 60 * 60 * 1000
      ) {
        return {
          hosts: parsed.hosts,
          activeHostId: parsed.activeHostId || '',
          migrations: [],
          shares: [],
          pushSubscriptions: [],
        };
      }
    } catch { }
    return null;
  }

  let pendingBackgroundUiReload = false;
  let pendingTargetUiBuild = '';

  function hasActiveUserInputInProgress() {
    if (typeof document === 'undefined') return false;
    if (inFlightCommandCount > 0) return true;
    if (imagePickerActiveUntil > Date.now()) return true;
    if (isVoiceRecording()) return true;
    if (document.body.classList.contains('mobile-chat-open')) return true;
    if (document.querySelector('.sheet-backdrop.open, #triageDeckOverlay.open')) return true;
    const chatInput = document.getElementById('globalPromptInput');
    if (chatInput && String(chatInput.value || '').trim().length > 0) return true;
    const newInput = document.getElementById('newTaskInput') || document.getElementById('newTaskPromptInput');
    if (newInput && String(newInput.value || '').trim().length > 0) return true;
    if (composerAttachments.newTask.length > 0) return true;
    for (const list of chatAttachmentsBySession.values()) {
      if (Array.isArray(list) && list.length > 0) return true;
    }
    return false;
  }

  function recoverInterruptedOutboxEntries() {
    if (!hasLoadedInitialState) return;
    let raw = null;
    try {
      raw = sessionStorage.getItem(INFLIGHT_OUTBOX_KEY);
    } catch { }
    if (!raw) return;
    let map = null;
    try {
      map = JSON.parse(raw);
    } catch { }
    if (!map || typeof map !== 'object') return;
    const now = Date.now();
    let changed = false;
    let restoredAny = false;
    for (const [cmdId, entry] of Object.entries(map)) {
      if (!entry || now - Number(entry.savedAt || 0) > 15 * 60 * 1000) {
        delete map[cmdId];
        changed = true;
        continue;
      }
      if (now - Number(entry.savedAt || 0) < 2500 && inFlightCommandCount > 0) {
        continue;
      }
      const found = findSessionGlobal(entry.sessionId);
      const delivered = found
        ? hasCommandOrPromptDelivered(
          found.session,
          found.host,
          cmdId,
          entry.text || entry.rawText || '',
          entry.baselineSameUserCount || 0,
          entry.baselineTotalCount || 0
        )
        : false;
      delete map[cmdId];
      changed = true;
      if (delivered) continue;
      if (entry.rawText) {
        writeComposerDraftValue(entry.sessionId, entry.rawText, {
          wireSameCount: entry.baselineSameUserCount || 0,
          wireTotalCount: entry.baselineTotalCount || 0,
          savedAt: now,
          fromErrorRestore: true,
          cmdId,
        });
      }
      if (Array.isArray(entry.attachments) && entry.attachments.length > 0) {
        const curList = getAttachmentList('chat', entry.sessionId);
        if (curList.length === 0) {
          for (const a of entry.attachments) {
            if (!a?.dataBase64) continue;
            const mime = String(a.mimeType || 'image/jpeg');
            const b64 = String(a.dataBase64);
            curList.push({
              name: a.name || 'screenshot.jpg',
              mimeType: mime,
              dataBase64: b64,
              sizeBytes: Number(a.sizeBytes || 0),
              previewUrl: b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`,
            });
          }
          persistChatAttachmentsDraft(entry.sessionId);
        }
      }
      const optMap = ensureOptimisticMsgsMap();
      if (optMap[entry.sessionId]) {
        optMap[entry.sessionId] = optMap[entry.sessionId].filter(it => it.cmdId !== cmdId);
        persistOptimisticMsgsMap();
      }
      restoredAny = true;
    }
    if (changed) {
      try {
        sessionStorage.setItem(INFLIGHT_OUTBOX_KEY, JSON.stringify(map));
      } catch { }
    }
    if (restoredAny) {
      showToast('⚠️ 上次发送被页面刷新中断，已为你自动恢复文字与截图草稿');
      renderAll();
    }
  }

  function reloadWithFreshAppShell(targetBuild = '') {
    if (typeof window === 'undefined' || !window.location) return;
    if (targetBuild) {
      try {
        if (sessionStorage.getItem('dsh_reloaded_ui_build') === targetBuild) return;
        sessionStorage.setItem('dsh_reloaded_ui_build', targetBuild);
      } catch { }
    }
    closeSSE();
    try {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('_r', String(Date.now()));
      window.location.replace(nextUrl.toString());
      return;
    } catch { }
    if (typeof window.location.reload === 'function') {
      window.location.reload();
    }
  }

  function triggerAppShellUpgradeReload(nextBuild) {
    if (!nextBuild || nextBuild === 'dev') return;
    pendingTargetUiBuild = nextBuild;
    if (!hasActiveUserInputInProgress()) {
      reloadWithFreshAppShell(nextBuild);
      return;
    }
    pendingBackgroundUiReload = true;
  }

  function applyHubState(nextState, { skipCache = false } = {}) {
    const incomingBuild = String(nextState?.build?.uiBuild || '').trim();
    if (incomingBuild && incomingBuild !== 'dev') {
      if (!initialUiBuild) {
        initialUiBuild = incomingBuild;
      } else if (initialUiBuild !== incomingBuild) {
        const staleBootMismatch = bootedFromHashedBundle;
        initialUiBuild = incomingBuild;
        const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        if ((staleBootMismatch || isHidden) && !hasActiveUserInputInProgress()) {
          reloadWithFreshAppShell(incomingBuild);
          return;
        }
        pendingTargetUiBuild = incomingBuild;
        pendingBackgroundUiReload = true;
      }
    }
    preservePreviewUiState(nextState);
    hubState = nextState;
    if (!skipCache) {
      saveCachedHubStateSnapshot(nextState);
    }
  }
  let hasLoadedInitialState = false;
  let hasLoadedFullState = false;
  let fullStateUpgradeQueued = false;
  let stateFetchInFlight = false;
  let inFlightStatePromise = null;
  let inFlightStateToken = '';
  let inFlightNeedsFollowup = false;
  let lastStateFetchAt = 0;
  let stateFetchSeq = 0;
  let consecutiveStateFetchFailures = 0;
  let sseSource = null;
  let sseConnected = false;
  let sseUsingLite = false;
  let lastSseEventAt = 0;
  let lastSseStateAt = 0;
  let sseRotatingUntil = 0;

  async function fetchStateOnceWithTimeout(timeoutMs = 30000) {
    if (!hasLoadedInitialState) {
      const preloaded = typeof window !== 'undefined' ? window.__dshPreloadState : null;
      if (preloaded) {
        window.__dshPreloadState = null;
        if (preloaded.token === getToken() && Date.now() - (preloaded.startedAt || 0) < 25000) {
          const preRes = await preloaded.promise;
          if (preRes?.__status === 401) {
            authLockConfirmed = true;
            closeSSE();
            document.getElementById('authOverlay')?.classList.add('show');
            throw new Error('Unauthorized');
          }
          if (preRes?.__status === 200 && preRes.data) {
            authLockConfirmed = false;
            document.getElementById('authOverlay')?.classList.remove('show');
            return preRes.data;
          }
        }
      }
    }
    const useFullEndpoint = hasLoadedInitialState;
    const canAbort = typeof AbortController === 'function';
    const ctrl = canAbort ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch { } }, timeoutMs) : null;
    try {
      const res = await apiFetch(
        useFullEndpoint ? '/api/state' : '/api/state?lite=1',
        ctrl ? { signal: ctrl.signal } : {}
      );
      const json = await res.json();
      if (json && typeof json === 'object' && useFullEndpoint) {
        json.__isFullState = true;
      }
      return json;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function runSingleStateFetch({ silent = false } = {}) {
    const mySeq = ++stateFetchSeq;
    stateFetchInFlight = true;
    try {
      let data = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          data = await fetchStateOnceWithTimeout(30000);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const msg = err && err.message ? err.message : String(err);
          if (msg === 'Unauthorized' || msg === 'Superseded') throw err;
          if (mySeq < stateFetchSeq) {
            return { ok: true, superseded: true };
          }
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 350));
          }
        }
      }
      if (lastErr) throw lastErr;
      if (mySeq < stateFetchSeq) {
        return { ok: true, superseded: true };
      }
      if (data && data.ok) {
        const isFullPayload = Boolean(data.__isFullState);
        delete data.__isFullState;
        hasLoadedInitialState = true;
        if (isFullPayload) {
          hasLoadedFullState = true;
        }
        lastStateFetchAt = Date.now();
        consecutiveStateFetchFailures = 0;
        setConnectionBanner(false);
        applyHubState(data);
        if (isFullPayload) {
          recoverInterruptedOutboxEntries();
        }
        renderAll();
        flushPendingDeepLink();
        void ensureLocalPushSubscriptionSynced();
        if (isFullPayload && sseConnected && sseUsingLite) {
          connectSSE();
        } else if (!hasLoadedFullState && !fullStateUpgradeQueued) {
          // 首屏用 lite=1 实现 0.2s 秒开列表后，立即在后台静默拉取一次完整热会话状态（48,000 字无截断），
          // 使得用户点开任何近期会话时第 0 秒就是 100% 完整正文，彻底消灭点进会话 1 秒后内容突变与跳动！
          fullStateUpgradeQueued = true;
          setTimeout(() => {
            fullStateUpgradeQueued = false;
            if ((getToken() || !authLockConfirmed) && !hasLoadedFullState) {
              void fetchState({ silent: true, forceFresh: true });
            }
          }, 120);
        }
        return { ok: true };
      }
      return { ok: false, error: (data && data.error) || '服务端返回异常' };
    } catch (err) {
      if (mySeq < stateFetchSeq) {
        return { ok: true, superseded: true };
      }
      const message = err && err.message ? err.message : String(err);
      if (message === 'Superseded') {
        return { ok: true, superseded: true };
      }
      if (message !== 'Unauthorized') {
        consecutiveStateFetchFailures += 1;
        const sseHealthy = sseConnected && (Date.now() - lastSseEventAt < 30000);
        const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (browserOffline || (!sseHealthy && (!silent || consecutiveStateFetchFailures >= 2))) {
          setConnectionBanner(true);
        }
      }
      return { ok: false, unauthorized: message === 'Unauthorized', error: message };
    } finally {
      if (mySeq === stateFetchSeq) {
        stateFetchInFlight = false;
      }
    }
  }

  async function fetchState(opts = {}) {
    if (isDemoMode) {
      return { ok: true, demo: true };
    }
    const silent = Boolean(opts && typeof opts === 'object' && opts.silent);
    const forceFresh = Boolean(opts && typeof opts === 'object' && opts.forceFresh);
    const reqToken = getToken();
    if (inFlightStatePromise) {
      if (reqToken !== inFlightStateToken) {
        // Token changed since the previous fetch started (e.g., user unlocked after unauth poll):
        // invalidate the stale promise so login doesn't inherit a 401 result.
        stateFetchSeq += 1;
        inFlightStatePromise = null;
        inFlightNeedsFollowup = false;
      } else {
        if (forceFresh) {
          inFlightNeedsFollowup = true;
        }
        return inFlightStatePromise;
      }
    }
    inFlightStateToken = reqToken;
    const currentPromise = (async () => {
      let res = await runSingleStateFetch({ silent });
      if (inFlightNeedsFollowup && res?.ok && getToken() === reqToken) {
        inFlightNeedsFollowup = false;
        res = await runSingleStateFetch({ silent: true });
      }
      inFlightNeedsFollowup = false;
      return res;
    })();
    inFlightStatePromise = currentPromise;
    try {
      return await currentPromise;
    } finally {
      if (inFlightStatePromise === currentPromise) {
        inFlightStatePromise = null;
      }
    }
  }

  function scheduleFallbackStateSync() {
    const triggeredAt = Date.now();
    if (!sseConnected) {
      setTimeout(() => { void fetchState({ silent: true, forceFresh: true }); }, 250);
      setTimeout(() => { void fetchState({ silent: true, forceFresh: true }); }, 900);
      return;
    }
    setTimeout(() => {
      if (lastSseStateAt < triggeredAt) {
        void fetchState({ silent: true, forceFresh: true });
      }
    }, 900);
  }

  function closeSSE() {
    if (sseSource) {
      try {
        sseSource.close();
      } catch { }
      sseSource = null;
    }
    sseConnected = false;
  }

  function connectSSE() {
    if (isDemoMode) return;
    if (urlParams.get('nosse') === '1') return;
    if (!getToken() && authLockConfirmed) return;
    const prevSseEventAt = lastSseEventAt;
    closeSSE();
    const tk = getToken();
    const knownSeq = hasLoadedInitialState ? Number(hubState?.stateSeq || 0) : 0;
    sseUsingLite = !hasLoadedFullState;
    const url =
      '/api/events?initial=0&delta=1' +
      (sseUsingLite ? '&lite=1' : '') +
      (knownSeq > 0 ? '&seq=' + encodeURIComponent(String(knownSeq)) : '') +
      (tk ? '&token=' + encodeURIComponent(tk) : '');
    try {
      sseSource = new EventSource(url);
      sseSource.onopen = () => {
        sseConnected = true;
        sseRotatingUntil = 0;
        lastSseEventAt = Date.now();
        consecutiveStateFetchFailures = 0;
        setConnectionBanner(false);
        // 仅当尚未加载初始状态，或重连前曾断流超过 15s 时才补拉 /api/state；避免首次直连因 prevSseEventAt=0 重复拉取
        if (!stateFetchInFlight && (!hasLoadedInitialState || (prevSseEventAt > 0 && Date.now() - prevSseEventAt > 15000))) {
          void fetchState({ silent: hasLoadedInitialState });
        }
      };
      sseSource.onerror = () => {
        sseConnected = false;
      };
      sseSource.addEventListener('ping', evt => {
        sseConnected = true;
        sseRotatingUntil = 0;
        lastSseEventAt = Date.now();
        consecutiveStateFetchFailures = 0;
        setConnectionBanner(false);
        try {
          if (evt?.data && hasLoadedInitialState && !stateFetchInFlight && Date.now() - lastStateFetchAt > 10000) {
            const pingData = JSON.parse(evt.data);
            const serverSeq = Number(pingData?.stateSeq || 0);
            const localSeq = Number(hubState?.stateSeq || 0);
            if (serverSeq > 0 && localSeq > 0 && serverSeq !== localSeq) {
              void fetchState({ silent: true, forceFresh: true });
            }
          }
        } catch { }
      });
      sseSource.addEventListener('rotate', () => {
        // 服务端在 Cloud Run 300s 超时前（240s）主动优雅轮转 SSE，前端立即平滑换新流，零报错零断档
        sseRotatingUntil = Date.now() + 5000;
        connectSSE();
      });
      sseSource.addEventListener('state_delta', evt => {
        try {
          sseConnected = true;
          sseRotatingUntil = 0;
          const nowEvt = Date.now();
          lastSseEventAt = nowEvt;
          lastSseStateAt = nowEvt;
          consecutiveStateFetchFailures = 0;
          setConnectionBanner(false);
          if (!hasLoadedInitialState) {
            inFlightNeedsFollowup = true;
            if (!stateFetchInFlight) {
              void fetchState({ silent: true, forceFresh: true });
            }
            return;
          }
          const delta = JSON.parse(evt.data);
          const merged = applyStateDelta(hubState, delta);
          if (!merged.ok) {
            if (!stateFetchInFlight && nowEvt - lastStateFetchAt > 4000) {
              void fetchState({ silent: true, forceFresh: true });
            }
            return;
          }
          if (!merged.noop) {
            lastStateFetchAt = nowEvt;
            applyHubState(merged.state, { skipCache: Boolean(merged.metaOnly) });
            if (!merged.metaOnly) {
              renderAll();
              flushPendingDeepLink();
            }
          }
        } catch { }
      });
      sseSource.addEventListener('state', evt => {
        try {
          sseConnected = true;
          sseRotatingUntil = 0;
          const nowEvt = Date.now();
          lastSseEventAt = nowEvt;
          lastSseStateAt = nowEvt;
          consecutiveStateFetchFailures = 0;
          setConnectionBanner(false);
          const data = JSON.parse(evt.data);
          if (data.ok) {
            hasLoadedInitialState = true;
            lastStateFetchAt = nowEvt;
            applyHubState(data);
            renderAll();
            flushPendingDeepLink();
          }
        } catch { }
      });
    } catch { }
  }

  function manualReconnectNow() {
    setConnectionBanner(true, '🔄 正在重新连接总控台…');
    connectSSE();
    void fetchState();
  }

  // 网络恢复/断开时自动重连 SSE (#11)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setConnectionBanner(false);
      connectSSE();
      void fetchState();
    });
    window.addEventListener('offline', () => {
      sseConnected = false;
      setConnectionBanner(true, '⚠️ 当前手机网络已断开，恢复网络后将自动重连');
    });
  }

  Object.assign(window, {
    getToken,
    authHeaders,
    apiFetch,
    submitAuthLogin,
    lockAndLogout,
    dismissLiveBanner,
    setPreviewMode,
    applyTheme,
    setThemePreference,
    getLangPref: () => langPref,
    setLangPreference,
    toggleLangPreference,
    applyLangToDom,
    esc,
    cleanPreviewText,
    formatTime,
    formatBytes,
    showToast,
    getNormalizedSessions,
    findSessionGlobal,
    getHostProjects,
    renderAll,
    renderProjectStrip,
    renderSessionList,
    resetSessionFilters,
    openChat,
    rawCloseChat,
    closeMobileChat,
    closeMobileFile,
    setFileSheetExpanded,
    toggleFileSheetExpanded,
    selectAgyApprovalOption,
    submitAgyApproval,
    copyAssistantReply,
    copyLatestAssistantReply,
    toggleSpeakAssistantReply,
    stopAssistantSpeech,
    switchAssistantSpeechMode,
    cycleAssistantSpeechRate,
    loadEarlierTranscript,
    renderActiveChatStage,
    renderInlineMarkdown,
    renderMarkdownBlocks,
    renderMarkdown,
    formatAssistantText,
    scrollToChatBottom,
    setScrollBottomVisible,
    setupChatScrollWatcher,
    dispatchHostCommand,
    composerDraftKey,
    readComposerDraft,
    clearComposerDraft,
    persistComposerDraft,
    reconcileDeliveredComposerDraft,
    autoGrowComposer,
    onComposerInput,
    composerUsesCoarsePointer,
    shouldSendOnEnter,
    onComposerKeydown,
    switchComposerSession,
    getAttachmentList,
    clearChatAttachmentList,
    triggerImagePicker,
    onChatImageSelected,
    onComposerPaste,
    removeComposerAttachment,
    renderAttachmentStrip,
    compressImageFile,
    hideVoiceHintBar,
    setVoiceBtnRecording,
    isVoiceRecording,
    stopVoiceInput,
    toggleVoiceInput: (...args) => {
      stopAssistantSpeech();
      return toggleVoiceInput(...args);
    },
    initWechatVoiceMode,
    isWechatVoiceMode,
    setWechatVoiceMode,
    toggleWechatVoiceMode,
    syncWechatHoldBtnState,
    startHoldVoice: (...args) => {
      stopAssistantSpeech();
      return startHoldVoice(...args);
    },
    moveHoldVoice,
    endHoldVoice,
    cancelHoldVoice,
    sendPromptToActiveSession,
    cancelQueuedCommand,
    sendQuickFollowup,
    stopActiveSession,
    sendApprovalDecision,
    openInChatFileDrawer,
    openChangedFilesDrawer,
    openUserBubbleImage,
    openOptimisticImagePreview,
    toggleSessionArtifactsCard,
    toggleFilesChangedCard,
    reviewFilesChangedCard,
    previewKind,
    imagePreviewSrc,
    buildBreadcrumbSegments,
    renderInChatFileDrawerBody,
    backFromDrawerPreview,
    quoteFileIntoChat,
    sleepMs,
    fileLoadingSpinnerHtml,
    reconcileFileLoading,
    requestDirList,
    clickRealFileEntry,
    renderFilePanes,
    cancelFilePreviewLoading,
    renderFilesTab,
    closeMainFilePreview,
    askAiAboutFile,
    switchDesktopStage,
    openNewTaskSheet,
    renderNewTaskForm,
    selectNewTaskHost,
    selectNewTaskHarness,
    selectNewTaskProject,
    openNewTaskProjectPickerSheet,
    switchNewTaskPickerMode,
    browseNewTaskDir,
    selectBrowsedNewTaskDir,
    openCreateUnderCurrentBrowseDir,
    onNewWorkspaceInput,
    confirmCreateNewWorkspace,
    filterNewTaskProjects,
    fillQuickPrompt,
    submitNewTask,
    openCurrentSessionActions,
    openSessionActions,
    renderActionSheet,
    togglePinTargetSession,
    saveInlineRename,
    shareTargetSession,
    openShareResultSheet,
    deleteShareRecord,
    openPairingCodeSheet,
    closePairingCodeSheet,
    generateNewPairingCode,
    updatePairingQrBaseOrigin,
    copyCurrentPairingLink,
    dismissStep6QrBanner,
    toggleAddHostPanel,
    toggleHostSettingsCard,
    syncSessionReadToServer,
    renderAddHostPanelHtml,
    refreshEnrollmentCode,
    revokeHostCredential,
    unrevokeHostCredential,
    jumpToSessionFiles,
    deleteTargetSession,
    renderSettingsTab,
    refreshPushStatus,
    disableIphonePush,
    activateFeishuHost,
    toggleHostRemoteMode,
    promptChangePassword,
    openMigrateWizard,
    renderMigrateWizard,
    swapMigrateHosts,
    submitRealMigration,
    urlBase64ToUint8Array,
    isIosDevice,
    isStandaloneApp,
    subscribeIphonePush,
    sendTestPush,
    getDshQuestionDraft,
    toggleDshQuestionOption,
    onDshQuestionCustomInput,
    submitDshQuestionAnswers,
    openHostSheet,
    selectHost,
    selectProject,
    switchTab,
    closeSheet,
    onSearchInput,
    clearSearch,
    copyText,
    openCopyFallbackSheet,
    retryCopyFromFallbackSheet,
    copyCodeText,
    openTurboGuideSheet,
    requestHostAxPermission,
    compareSemver,
    upgradeHostTurbo,
    hydrateColdSessionTranscript,
    scheduleFallbackStateSync,
    openModelPickerSheet,
    selectModelFromPicker,
    rawCloseSheet,
    trackOverlay,
    openSheet,
    openChatFileLink,
    toggleMdPreviewMode,
    toggleHtmlPreviewMode,
    openInlineHtmlPreview,
    openFullscreenHtmlFromPreview,
    closeFullscreenHtmlPreview,
    toggleFullscreenHtmlSource,
    reloadFullscreenHtmlPreview,
    downloadPreviewMedia,
    toggleOriginalPreviewImage,
    onPreviewImageLoad,
    onPreviewImageError,
    retryFilePreview,
    switchVideoTranscodeMode,
    mountSmartVideoElement,
    maybeAccelerateVideoViaP2p,
    onSmartVideoLoadedMeta,
    onSmartVideoError,
    dismissOverlay,
    getLeftEdgeSwipeZoneWidth,
    isWithinLeftSwipeBackZone,
    shouldDismissHorizontalSwipe,
    shouldDismissVerticalSwipe,
    setupChatSwipeBack,
    setupSheetSwipeDismiss,
    maybeShowSwipeHint,
    setupOverlayGestures,
    isIosDeviceForHint,
    isStandaloneForHint,
    shouldShowInstallHint,
    setupInstallHint,
    dismissInstallHint,
    preservePreviewUiState,
    tryOpenDeepLinkTarget,
    flushPendingDeepLink,
    setConnectionBanner,
    manualReconnectNow,
    forceHardUpgradeReload,
    applyHubState,
    getHubState: () => hubState,
    fetchState,
    connectSSE,
    renderHarnessBadgeHtml,
    formatCompactProjectLabel,
    normalizeDeviceModelShort,
    buildShortHostNameMap,
    stripRedundantProjectPrefix,
    demoCopyNpx: () => demoSandbox?.copyNpxCommand?.(),
    demoResetSandbox: () => demoSandbox?.reset?.(),
  });

  triageCtrl = createTriageDeckController({
    getSessions: () => getNormalizedSessions(),
    getShortHostMap: () => buildShortHostNameMap(hubState.hosts || []),
    getMediaTicket: () => hubState.mediaTicket || '',
    getLang: () => langPref,
    showToast,
    formatAssistantText,
    punctuateSpeechText,
    getSpeechState: () => ({
      playing: activeSpeechState.playing,
      sessionId: activeSpeechState.sessionId,
      isTriage: activeSpeechState.msgIdx === TRIAGE_SPEECH_MSG_IDX,
      mode: activeSpeechState.mode,
      rate: activeSpeechState.rate,
      hasDistinctSummary: activeSpeechState.hasDistinctSummary,
    }),
    toggleTriageSpeech: (sessionId, rawText) => {
      if (
        activeSpeechState.playing &&
        activeSpeechState.msgIdx === TRIAGE_SPEECH_MSG_IDX &&
        activeSpeechState.sessionId === sessionId
      ) {
        stopAssistantSpeech();
        return;
      }
      startAssistantSpeech(TRIAGE_SPEECH_MSG_IDX, {
        startOffset: 0,
        rawTextOverride: rawText,
        sessionIdOverride: sessionId,
      });
    },
    switchTriageSpeechMode: (sessionId, rawText) => {
      activeSpeechState.mode = activeSpeechState.mode === 'concise' ? 'full' : 'concise';
      try {
        localStorage.setItem('dsh_tts_mode_v2', activeSpeechState.mode);
      } catch { }
      if (
        activeSpeechState.playing &&
        activeSpeechState.msgIdx === TRIAGE_SPEECH_MSG_IDX &&
        activeSpeechState.sessionId === sessionId
      ) {
        startAssistantSpeech(TRIAGE_SPEECH_MSG_IDX, {
          startOffset: 0,
          rawTextOverride: rawText || activeSpeechState.rawSourceText,
          sessionIdOverride: sessionId,
        });
      } else {
        syncSpeechFooterDom();
      }
    },
    cycleTriageSpeechRate: (sessionId, rawText) => {
      const prevRate = activeSpeechState.rate;
      const isSpeakingThis =
        activeSpeechState.playing &&
        activeSpeechState.msgIdx === TRIAGE_SPEECH_MSG_IDX &&
        activeSpeechState.sessionId === sessionId;
      const resumeOffset = isSpeakingThis
        ? computeSpeechResumeOffset({
          fullText: activeSpeechState.fullSpokenText,
          docLang: activeSpeechState.docLang,
          segmentBaseOffset: activeSpeechState.segmentBaseOffset,
          segmentStartedAt: activeSpeechState.segmentStartedAt,
          segmentRate: prevRate,
          boundaryCharOffset: activeSpeechState.boundaryCharOffset,
          boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
          nowMs: Date.now(),
        })
        : 0;
      const curIdx = SPEECH_RATES.indexOf(prevRate);
      activeSpeechState.rate = SPEECH_RATES[(curIdx + 1) % SPEECH_RATES.length];
      try {
        localStorage.setItem('dsh_tts_rate', String(activeSpeechState.rate));
      } catch { }
      if (isSpeakingThis) {
        startAssistantSpeech(TRIAGE_SPEECH_MSG_IDX, {
          startOffset: resumeOffset,
          rawTextOverride: rawText || activeSpeechState.rawSourceText,
          sessionIdOverride: sessionId,
        });
      } else {
        syncSpeechFooterDom();
      }
    },
    upgradeTriageSpeechIfHydrated: (sessionId, fullerRawText) => {
      if (
        !activeSpeechState.playing ||
        activeSpeechState.msgIdx !== TRIAGE_SPEECH_MSG_IDX ||
        activeSpeechState.sessionId !== sessionId
      ) {
        return;
      }
      const nextRaw = String(fullerRawText || '').trim();
      const prevRaw = String(activeSpeechState.rawSourceText || '').trim();
      if (!nextRaw || nextRaw.length <= prevRaw.length + 120) return;
      const resumeOffset = computeSpeechResumeOffset({
        fullText: activeSpeechState.fullSpokenText,
        docLang: activeSpeechState.docLang,
        segmentBaseOffset: activeSpeechState.segmentBaseOffset,
        segmentStartedAt: activeSpeechState.segmentStartedAt,
        segmentRate: activeSpeechState.segmentRate,
        boundaryCharOffset: activeSpeechState.boundaryCharOffset,
        boundaryUpdatedAt: activeSpeechState.boundaryUpdatedAt,
        nowMs: Date.now(),
      });
      startAssistantSpeech(TRIAGE_SPEECH_MSG_IDX, {
        startOffset: resumeOffset,
        rawTextOverride: nextRaw,
        sessionIdOverride: sessionId,
      });
    },
    stopSpeech: () => stopAssistantSpeech(),
    copyText: async text => {
      const clean = String(text || '').trim();
      if (!clean) return false;
      try {
        await navigator.clipboard.writeText(clean);
        showToast(langPref === 'en' ? '📋 Copied full reply' : '📋 已复制完整回复');
        return true;
      } catch {
        try {
          const ta = document.createElement('textarea');
          ta.value = clean;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showToast(langPref === 'en' ? '📋 Copied full reply' : '📋 已复制完整回复');
          return true;
        } catch {
          showToast(langPref === 'en' ? 'Copy failed' : '复制失败');
          return false;
        }
      }
    },
    hydrateColdSession: (hostId, sessionId, sessionRev) =>
      hydrateColdSessionTranscript(hostId, sessionId, sessionRev),
    openSession: sessionId => openChat(sessionId),
    openFileForSession: (sessionId, rawPath) => {
      const found = findSessionGlobal(sessionId);
      if (found) {
        activeSessionId = found.session.id;
        activeSessionHostId = found.session.hostId;
      }
      void openChatFileLink(encodeURIComponent(rawPath));
    },
    sendApprovalDecision: (hostId, code, allow, optionIndex, sessionId) =>
      sendApprovalDecision(hostId, code, allow, optionIndex, sessionId),
    submitQuestionDecision: async (session, code, partialAnswers = {}) => {
      const finalAnswers = { ...partialAnswers };
      const qList = Array.isArray(session?.approvalObj?.questions) ? session.approvalObj.questions : [];
      qList.forEach((q, idx) => {
        const qId = String(q.id || `q_${idx + 1}`);
        if (finalAnswers[qId] === undefined) {
          const firstLbl = Array.isArray(q.options) && q.options[0]?.label ? String(q.options[0].label) : '';
          finalAnswers[qId] = q.multiSelect ? (firstLbl ? [firstLbl] : []) : firstLbl;
        }
      });
      window.__dshSettlingApprovals = window.__dshSettlingApprovals || {};
      if (code) {
        window.__dshSettlingApprovals[code] = { at: Date.now(), decision: 'approve' };
      }
      lastRenderedChatKey = '';
      renderAll();
      showToast('⏳ 正在将你的选择同步到电脑端...');
      try {
        const res = await dispatchHostCommand(session.hostId, {
          type: 'approval',
          code,
          agentId: session.id,
          allow: true,
          optionIndex: 1,
          answers: finalAnswers,
          questions: qList,
        });
        if (!res || res.ok === false) {
          if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
          lastRenderedChatKey = '';
          renderAll();
          showToast('❌ 提交选择失败：' + (res?.error || '请重试'));
          return;
        }
      } catch (err) {
        if (code && window.__dshSettlingApprovals) delete window.__dshSettlingApprovals[code];
        lastRenderedChatKey = '';
        renderAll();
        showToast('❌ 提交选择异常：' + (err?.message || err));
        return;
      }
      scheduleFallbackStateSync();
    },
    sendPromptToSession: async (session, rawPromptText) => {
      const text = String(rawPromptText || '').trim();
      if (!session || !text) return;
      const clientCmdId = `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const optMap = ensureOptimisticMsgsMap();
      const wireTr = Array.isArray(session._wireTranscript) ? session._wireTranscript : [];
      const probeOpt = { text, rawText: text };
      const baselineSameUserCount = wireTr.filter(
        m => m && m.role === 'user' && matchesOptimisticUserText(m.text, probeOpt)
      ).length;
      const baselineTotalCount = Number(session._wireTotalCount) || wireTr.length;
      const optEntry = {
        id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        cmdId: clientCmdId,
        text,
        rawText: text,
        time: Date.now(),
        baselineSameUserCount,
        baselineTotalCount,
      };
      const optList = optMap[session.id] || [];
      optList.push(optEntry);
      optMap[session.id] = optList.slice(-8);
      persistOptimisticMsgsMap();
      lastRenderedChatKey = '';
      if (activeSessionId === session.id) renderActiveChatStage();

      const chosenChatModel = selectedSessionModels[session.id] || '';
      try {
        const res = await dispatchHostCommand(session.hostId, {
          id: clientCmdId,
          type: session.status === 'running' ? 'steer' : 'prompt',
          agentId: session.id,
          cwd: session.cwd || '',
          text,
          prompt: text,
          ...(chosenChatModel ? { model: chosenChatModel } : {}),
        });
        if (!res || res.ok === false) {
          optMap[session.id] = (optMap[session.id] || []).filter(item => item.id !== optEntry.id);
          persistOptimisticMsgsMap();
          showToast('❌ ' + (res?.error || '发送指令失败'));
          renderAll();
          return;
        }
        showToast('📨 已发送新方案指令');
      } catch (err) {
        optMap[session.id] = (optMap[session.id] || []).filter(item => item.id !== optEntry.id);
        persistOptimisticMsgsMap();
        showToast('❌ 发送失败：' + (err?.message || err));
        renderAll();
        return;
      }
      scheduleFallbackStateSync();
    },
    markSessionRead: session => {
      if (!session?.id) return null;
      const prevSnapshot = {
        hasSeenAt: Object.prototype.hasOwnProperty.call(seenMap, session.id),
        seenAt: seenMap[session.id],
        hasSeenSig: Object.prototype.hasOwnProperty.call(seenSigMap, session.id),
        seenSig: seenSigMap[session.id],
        srvRead: hubState.sessionReadState?.[session.id] ? { ...hubState.sessionReadState[session.id] } : null,
      };
      const readTs = Math.max(
        session.updatedAt || 0,
        session.lastConclusionAt || 0,
        session.lastInterruptedAt || 0,
        Date.now()
      );
      seenMap[session.id] = readTs;
      if (session.conclusionSig) {
        seenSigMap[session.id] = session.conclusionSig;
      }
      if (!isDemoMode) {
        try {
          localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap));
          localStorage.setItem('dsh_seen_sig_v1', JSON.stringify(seenSigMap));
        } catch { }
      }
      syncSessionReadToServer(session.id, session.conclusionSig || '', readTs);
      return prevSnapshot;
    },
    restoreSessionUnread: (sessionId, prevSnapshot) => {
      if (!sessionId || !prevSnapshot) return;
      if (prevSnapshot.hasSeenAt && prevSnapshot.seenAt) {
        seenMap[sessionId] = prevSnapshot.seenAt;
      } else {
        seenMap[sessionId] = 1;
      }
      if (prevSnapshot.hasSeenSig && prevSnapshot.seenSig !== undefined) {
        seenSigMap[sessionId] = prevSnapshot.seenSig;
      } else {
        delete seenSigMap[sessionId];
      }
      hubState.sessionReadState = hubState.sessionReadState || {};
      if (prevSnapshot.srvRead) {
        hubState.sessionReadState[sessionId] = { ...prevSnapshot.srvRead };
      } else {
        hubState.sessionReadState[sessionId] = { unread: true, sig: '', at: 1 };
      }
      if (!isDemoMode) {
        try {
          localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap));
          localStorage.setItem('dsh_seen_sig_v1', JSON.stringify(seenSigMap));
        } catch { }
      }
    },
    switchToRunningList: () => selectProject('SMART_ACTIVE'),
    onDeckChanged: () => {
      lastRenderedStripKey = '';
      lastRenderedListKey = '';
      renderAll();
    },
  });

  setupOverlayGestures();
  setupChatScrollWatcher();
  setupInstallHint();
  clearHomeScreenAppBadge();
  function resumeForegroundSync({ resetTransforms = false } = {}) {
    clearHomeScreenAppBadge();
    if (resetTransforms && typeof document !== 'undefined') {
      const chatEl = document.getElementById('chatFullscreen');
      if (chatEl && chatEl.style) {
        chatEl.style.transition = '';
        chatEl.style.transform = '';
      }
    }
    if (!getToken() || authLockConfirmed) return;
    const idleMs = Date.now() - lastSseEventAt;
    if (!stateFetchInFlight && (!sseConnected || idleMs > 1200)) {
      void fetchState({ silent: true, forceFresh: true });
    }
    if (!sseConnected || idleMs > 6000) {
      connectSSE();
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        resumeForegroundSync();
      } else if (
        document.visibilityState === 'hidden' &&
        pendingBackgroundUiReload &&
        !hasActiveUserInputInProgress()
      ) {
        pendingBackgroundUiReload = false;
        reloadWithFreshAppShell(pendingTargetUiBuild);
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      clearHomeScreenAppBadge();
    });
    window.addEventListener('pageshow', evt => {
      resumeForegroundSync({ resetTransforms: Boolean(evt && evt.persisted) });
    });
  }
  if (isDemoMode) {
    demoSandbox = createDemoSandbox({
      getHubState: () => hubState,
      setHubState: next => {
        hubState = next;
      },
      getLang: () => langPref,
      onStateMutated: () => {
        lastRenderedChatKey = '';
        lastRenderedComposerKey = '';
        lastRenderedStripKey = '';
        lastRenderedListKey = '';
        lastRenderedSettingsKey = '';
        lastRenderedFilesKey = '';
        renderAll();
        applyLangToDom(document.body, langPref);
      },
      showToast,
    });
    hubState = createDemoHubState(langPref);
    authLockConfirmed = false;
    document.getElementById('authOverlay')?.classList.remove('show');
    updateDemoBannerCopy();
    try {
      initWechatVoiceMode();
      renderAll();
      applyLangToDom(document.body, langPref);
    } catch { }
    return;
  }

  // 首屏 0ms 瞬时渲染：先从 localStorage 恢复上次快照并立即渲染，彻底消灭等待 /api/state 期间的白屏
  if (getToken()) {
    const cachedSnapshot = loadCachedHubStateSnapshot();
    if (cachedSnapshot) {
      hubState = cachedSnapshot;
    }
  }
  try {
    initWechatVoiceMode();
    renderAll();
  } catch { }

  if (queryPairCode) {
    (async () => {
      try {
        const exRes = await fetch('/api/pairing/exchange', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: queryPairCode.toUpperCase() }),
        });
        const exData = await exRes.json().catch(() => ({}));
        if (exRes.ok && exData.token) {
          authLockConfirmed = false;
          localStorage.setItem('dsh_hub_token', exData.token);
          showToast('🔓 扫码登录成功');
        } else {
          authLockConfirmed = !getToken();
          showToast('⚠️ 扫码配对码已过期或无效，请重新扫码');
        }
      } catch { }
      if (getToken() || !authLockConfirmed) {
        await fetchState();
        connectSSE();
      } else {
        document.getElementById('authOverlay')?.classList.add('show');
      }
    })();
  } else if (getToken()) {
    (async () => {
      await fetchState();
      if (getToken() && !authLockConfirmed) {
        connectSSE();
      }
    })();
  } else {
    // 首次未登录：立即展示锁屏输入框并用超轻 /api/auth/verify 探测是否开启无密模式，绝不发无意义 /api/state 与 SSE 401 轮询风暴
    document.getElementById('authOverlay')?.classList.add('show');
    authLockConfirmed = true;
    (async () => {
      const check = await verifyCandidateToken('', 15000);
      if (getToken()) return;
      if (check.ok && !check.authRequired) {
        authLockConfirmed = false;
        document.getElementById('authOverlay')?.classList.remove('show');
        await fetchState();
        connectSSE();
      }
    })();
  }
  // 服务端每 12s 发送 event: ping；跳过 240s 优雅轮转窗口，仅当已鉴权且 SSE 断开或超过 35s 无事件时静默兜底轮询
  setInterval(() => {
    if (Date.now() < sseRotatingUntil) return;
    if (!getToken() && authLockConfirmed) return;
    if (!stateFetchInFlight && (!sseConnected || (Date.now() - lastSseEventAt > 35000))) {
      void fetchState({ silent: true });
    }
  }, 5000);
}
