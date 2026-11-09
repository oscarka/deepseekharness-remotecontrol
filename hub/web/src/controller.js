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
  imagePreviewSrc,
  buildBreadcrumbSegments,
  fileLoadingSpinnerHtml,
} from './utils/filePreview';
import {
  composerUsesCoarsePointer,
  shouldSendOnEnter,
  shouldDismissHorizontalSwipe,
  shouldDismissVerticalSwipe,
} from './utils/gestures';
import {
  setVoiceBtnRecording,
  isVoiceRecording,
  stopVoiceInput,
  toggleVoiceInput,
} from './hooks/useVoiceInput';
import { renderQrCodeSvg } from './utils/qrcode';

export function initHubController() {
    // ==================== 1. 认证与安全 Token 管理（自动清除 URL 尾巴防止截图泄露） ====================
    const urlParams = new URLSearchParams(location.search);
    const queryToken = (urlParams.get('token') || '').trim();
    const queryPairCode = (urlParams.get('pair') || '').trim();
    let pendingDeepLinkHostId = (urlParams.get('host') || '').trim();
    let pendingDeepLinkTaskId = (urlParams.get('task') || urlParams.get('session') || '').trim();
    if (queryToken || queryPairCode || pendingDeepLinkHostId || pendingDeepLinkTaskId) {
      if (queryToken) localStorage.setItem('dsh_hub_token', queryToken);
      urlParams.delete('token');
      urlParams.delete('pair');
      urlParams.delete('host');
      urlParams.delete('task');
      urlParams.delete('session');
      const cleanSearch = urlParams.toString();
      const cleanUrl = location.pathname + (cleanSearch ? '?' + cleanSearch : '') + location.hash;
      try { history.replaceState(null, '', cleanUrl); } catch {}
    }

    function getToken() {
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

    async function apiFetch(path, options = {}) {
      const res = await fetch(path, {
        ...options,
        headers: authHeaders(options.headers || {}),
      });
      if (res.status === 401) {
        document.getElementById('authOverlay').classList.add('show');
        throw new Error('Unauthorized');
      }
      document.getElementById('authOverlay').classList.remove('show');
      return res;
    }

    async function submitAuthLogin() {
      const inputEl = document.getElementById('authTokenInput');
      const raw = inputEl.value.trim();
      if (!raw) return;
      // 如果输入的是 6 位配对码，先尝试配对交换
      if (/^[A-Z0-9]{6}$/i.test(raw)) {
        try {
          const exRes = await fetch('/api/pairing/exchange', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: raw.toUpperCase() }),
          });
          const exData = await exRes.json();
          if (exRes.ok && exData.token) {
            localStorage.setItem('dsh_hub_token', exData.token);
            const paired = await fetchState();
            if (!paired.ok) {
              showToast('❌ 配对成功但读取数据失败：' + (paired.error || '请重试'));
              return;
            }
            document.getElementById('authOverlay').classList.remove('show');
            showToast('🔓 配对解锁成功');
            connectSSE();
            return;
          }
        } catch {}
      }
      localStorage.setItem('dsh_hub_token', raw);
      // 以前这里不检查 fetchState 的结果：密码错了也会显示「解锁成功」，
      // 两秒后轮询发现 401，锁屏又弹回来。现在必须确认真的拿到了数据。
      const state = await fetchState();
      if (!state.ok) {
        if (state.unauthorized) {
          localStorage.removeItem('dsh_hub_token');
          showToast('❌ 访问密码或配对码不正确，请重试');
          document.getElementById('authOverlay').classList.add('show');
          try { inputEl.select(); } catch {}
        } else {
          showToast('❌ 无法连接总控台：' + (state.error || '网络异常'));
        }
        return;
      }
      document.getElementById('authOverlay').classList.remove('show');
      showToast('🔓 解锁成功');
      connectSSE();
    }

    function lockAndLogout() {
      localStorage.removeItem('dsh_hub_token');
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
      try { localStorage.setItem('dsh_theme_pref', nextPref); } catch {}
      applyTheme(nextPref);
      lastRenderedSettingsKey = '';
      renderAll();
    }
    applyTheme(themePref);

    // 置顶与已读记录（使用 v4 基线，完美对齐原型图的视觉层次）
    let pinnedMap = {};
    let seenMap = {};
    let liveBannerDismissed = false;
    try { pinnedMap = JSON.parse(localStorage.getItem('dsh_pinned_v4') || '{}'); } catch {}
    try { seenMap = JSON.parse(localStorage.getItem('dsh_seen_v4') || '{}'); } catch {}

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
    let filePreviewLoading = null; // { hostId, at, drawer }
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
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
    }

    // ==================== 3. 数据聚合与扁平化 ====================
    const expandedTranscriptBySession = new Map();

    function getNormalizedSessions() {
      const list = [];
      const isChatOpenNow = document.getElementById('chatFullscreen')?.classList.contains('open')
        || document.body.classList.contains('DesktopSplitMode');

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
          const ts = t.updatedAt || t.lastActivity || 0;
          const pendingApp = approvals.find(a => a.agentId === t.id);
          const wireTranscript = Array.isArray(t.transcript) ? [...t.transcript] : [];
          const expandedEntry = expandedTranscriptBySession.get(t.id);
          let baseTranscript = wireTranscript;
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
          const isHostOnlineNow = h.online !== false && h.activelyConnected !== false;
          const queuedCmds = pendingPromptCmds.filter(c => c.queued || !isHostOnlineNow);
          const dispatchingCmds = pendingPromptCmds.filter(c => !c.queued && isHostOnlineNow);
          const expiredCmds = (h.recentResults || []).filter(
            r => r && r.expired && (r.type === 'prompt' || r.type === 'steer') && r.agentId === t.id && r.text
          );
          const optimisticList = (window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id]) || [];
          const nowMs = Date.now();
          const remainingOpt = [];
          for (const opt of optimisticList) {
            if (nowMs - opt.time >= 15000) continue;
            if (
              baseTranscript.some(m => m.role === 'user' && m.text === opt.text) ||
              pendingPromptCmds.some(c => c.text === opt.text) ||
              expiredCmds.some(ec => ec.text === opt.text)
            ) {
              // 已落盘同步或已进入服务端下发/排队/超时列表，从乐观缓存移除
              continue;
            }
            remainingOpt.push(opt);
            baseTranscript.push({ role: 'user', text: opt.text, time: opt.time });
          }
          for (const dc of dispatchingCmds) {
            if (!baseTranscript.some(m => m.role === 'user' && m.text === dc.text)) {
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
          if (window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id]) {
            window.__dshOptimisticMsgs[t.id] = remainingOpt;
          }
          const transcript = baseTranscript;
          const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;
          const project = t.project || (t.cwd ? t.cwd.split('/').filter(Boolean).pop() : '默认工作区') || '默认工作区';
          const status = pendingApp
            ? 'approval'
            : (t.status === 'running' || dispatchingCmds.length > 0 ? 'running' : (t.status || 'idle'));
          const queuedCount = queuedCmds.length;
          const rawIdStr = String(t.id || '');
          const harness = t.harness || (
            rawIdStr.startsWith('agy-ide:') ? 'antigravity-ide' :
            rawIdStr.startsWith('codex:') ? 'codex' :
            rawIdStr.startsWith('claude:') ? 'claude' : 'dsh'
          );
          const harnessLabel = t.harnessLabel || (
            harness === 'antigravity-ide' ? 'Antigravity IDE' :
            harness === 'codex' ? 'Codex' :
            harness === 'claude' ? 'Claude Code' : 'DeepSeek Harness'
          );

          let lastConclusionAt = Number(t.lastConclusionAt) || 0;
          if (!lastConclusionAt && status === 'idle' && lastMsg?.role === 'assistant' && Boolean(lastMsg?.text) && (!lastMsg.tools || lastMsg.tools.length === 0)) {
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

          const rawPreview = status === 'running'
            ? (t.runningSummary || t.lastOutput || lastMsg?.text || '正在思考与执行任务...')
            : status === 'approval'
              ? (pendingApp?.promptTitle || pendingApp?.reason || t.lastOutput || '等待你批准工具执行')
              : (t.lastOutput || lastMsg?.text || t.cwd || '点击查看对话详情');

          const changedFiles = Array.isArray(t.changedFiles)
            ? t.changedFiles
            : (Array.isArray(pendingApp?.changedFiles) ? pendingApp.changedFiles : []);

          const totalTranscriptCount = Math.max(
            Number(t.totalTranscriptCount) || 0,
            Number(t.messageCount) || 0,
            transcript.length
          );
          const omittedTranscriptCount = expandedEntry
            ? 0
            : Math.max(0, Number(t.omittedTranscriptCount) || (totalTranscriptCount - wireTranscript.length));

          list.push({
            id: t.id,
            hostId: h.hostId,
            hostName: h.hostName || h.hostId,
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
            approvalObj: pendingApp || null,
            changedFiles,
            queuedCount,
            msgCount: totalTranscriptCount || transcript.length || 0,
            totalTranscriptCount,
            omittedTranscriptCount,
            hasMoreTranscript: Boolean(omittedTranscriptCount > 0 || (t.hasMoreTranscript && !expandedEntry)),
            updatedAt: ts,
            timeLabel: formatTime(ts),
            pinned: Boolean(pinnedMap[t.id]),
            unread: false,
            hasUnreadConclusion: false,
            isUnreadInterrupted: false,
            isRecentActive: false,
            lastRole: lastMsg?.role || 'assistant',
            lastPreview: cleanPreviewText(String(rawPreview || '').slice(0, 360)) || '点击查看对话详情',
            rawLastPreview: rawPreview,
            transcript,
          });
        }
      }

      const sortedByTime = [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      // 仅针对「真正完结给出最终结论」或「异常断流中断」计算未读态，Thinking / 工具执行过程中不再刷假未读
      let seenDirty = false;
      sortedByTime.forEach((s, idx) => {
        if (s.id === activeSessionId && isChatOpenNow) {
          const maxTs = Math.max(seenMap[s.id] || 0, s.updatedAt || 0, s.lastConclusionAt || 0);
          if (seenMap[s.id] !== maxTs) {
            seenMap[s.id] = maxTs;
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

        // 首次加载时：保留最新 1 条已完结结论作为蓝色「已出结论」示例，其余旧历史对话自动归入已读基线
        if (!seenMap[s.id]) {
          if (idx === 0 && s.turnState === 'conclusion' && s.id !== activeSessionId) {
            seenMap[s.id] = Math.max(1, (s.lastConclusionAt || s.updatedAt || 2) - 1000);
          } else {
            seenMap[s.id] = Math.max(s.updatedAt || 0, s.lastConclusionAt || 0, Date.now());
          }
          seenDirty = true;
        }

        const seenAt = Number(seenMap[s.id]) || 0;
        const isCurrentOpen = s.id === activeSessionId && isChatOpenNow;
        s.hasUnreadConclusion = !isCurrentOpen
          && s.turnState === 'conclusion'
          && s.lastConclusionAt > 0
          && s.lastConclusionAt > seenAt;
        s.isUnreadInterrupted = !isCurrentOpen
          && s.turnState === 'interrupted'
          && (s.lastInterruptedAt || s.updatedAt) > seenAt;
        s.unread = s.hasUnreadConclusion || s.isUnreadInterrupted;
      });

      if (seenDirty) {
        try { localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap)); } catch {}
      }

      // 优先级排序：1. 待授权(黄) → 2. 运行中(绿) → 3. 已出结论未读(蓝)/中断 → 4. 置顶 → 5. 最新时间
      const statePriority = (s) => {
        if (s.status === 'approval') return 4;
        if (s.status === 'running') return 3;
        if (s.hasUnreadConclusion || s.isUnreadInterrupted) return 2;
        if (s.pinned) return 1;
        return 0;
      };

      return list.sort((a, b) => {
        const pa = statePriority(a);
        const pb = statePriority(b);
        if (pa !== pb) return pb - pa;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
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
      if (currentHostId === 'ALL_HOSTS') {
        const anyOnline = hosts.some(h => h.online);
        dotEl.className = 'status-dot' + (anyOnline ? '' : ' offline');
        document.getElementById('topHostName').textContent = hosts.length <= 1 && hosts[0]
          ? `${hosts[0].hostName} (${totalSessions})`
          : `全部电脑 (${totalSessions})`;
      } else if (currentHostObj) {
        dotEl.className = 'status-dot' + (currentHostObj.online ? '' : ' offline');
        document.getElementById('topHostName').textContent = `${currentHostObj.hostName} (${(currentHostObj.bridgeState?.tasks || []).length})`;
      }

      const turboBtn = document.getElementById('turboBadgeBtn');
      if (turboBtn) {
        const refHost = currentHostObj || hosts.find(h => h.online) || hosts[0];
        const turbo = refHost?.bridgeState?.turbo;
        if (turbo?.enabled && turbo?.accessibilityGranted !== false) {
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
        searchBox.style.display = 'block';
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
    }

    function renderProjectStrip(sessionsArg) {
      const sessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();
      const activeCount = sessions.filter(s => s.status === 'running' || s.status === 'approval').length;
      const unreadCount = sessions.filter(s => s.hasUnreadConclusion || s.isUnreadInterrupted).length;
      const agyCount = sessions.filter(s => s.harness === 'antigravity-ide').length;
      const codexCount = sessions.filter(s => s.harness === 'codex').length;
      const claudeCount = sessions.filter(s => s.harness === 'claude').length;
      const dshCount = sessions.filter(s => s.harness === 'dsh').length;

      const counts = {};
      for (const s of sessions) {
        counts[s.project] = (counts[s.project] || 0) + 1;
      }
      const projects = Object.keys(counts);
      const strip = document.getElementById('projectStrip');
      const stripKey = `${currentProject}:${sessions.length}:${activeCount}:${unreadCount}:${agyCount}:${codexCount}:${claudeCount}:${dshCount}:${projects.map(p => `${p}:${counts[p]}`).join(',')}`;
      if (stripKey === lastRenderedStripKey && strip.children.length > 0) return;
      lastRenderedStripKey = stripKey;
      const prevScrollLeft = strip.scrollLeft;

      const smartPills = [
        `<button class="filter-pill smart-pill ${currentProject === 'SMART_ACTIVE' ? 'active' : ''}" onclick="selectProject('SMART_ACTIVE')">🟢 运行中 <span class="count">${activeCount}</span></button>`,
        `<button class="filter-pill smart-pill ${currentProject === 'SMART_UNREAD' ? 'active' : ''}" onclick="selectProject('SMART_UNREAD')">🔵 已出结论 <span class="count">${unreadCount}</span></button>`
      ];
      if (agyCount > 0) {
        smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_AGY_IDE' ? 'active' : ''}" onclick="selectProject('HARNESS_AGY_IDE')">⚡ IDE <span class="count">${agyCount}</span></button>`);
      }
      if (codexCount > 0) {
        smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_CODEX' ? 'active' : ''}" onclick="selectProject('HARNESS_CODEX')">🧠 Codex <span class="count">${codexCount}</span></button>`);
      }
      if (claudeCount > 0) {
        smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_CLAUDE' ? 'active' : ''}" onclick="selectProject('HARNESS_CLAUDE')">✴️ Claude <span class="count">${claudeCount}</span></button>`);
      }
      if (dshCount > 0 && (agyCount > 0 || codexCount > 0 || claudeCount > 0)) {
        smartPills.push(`<button class="filter-pill smart-pill ${currentProject === 'HARNESS_DSH' ? 'active' : ''}" onclick="selectProject('HARNESS_DSH')">🟣 DSH <span class="count">${dshCount}</span></button>`);
      }

      strip.innerHTML = [
        `<button class="filter-pill ${currentProject === 'ALL' ? 'active' : ''}" onclick="selectProject('ALL')">全部 <span class="count">${sessions.length}</span></button>`,
        ...smartPills,
        ...projects.map(p => `<button class="filter-pill ${currentProject === p ? 'active' : ''}" onclick="selectProject('${esc(p)}')">${esc(p)} <span class="count">${counts[p]}</span></button>`)
      ].join('');
      strip.scrollLeft = prevScrollLeft;
    }

    function renderSessionList(sessionsArg) {
      const viewport = document.getElementById('mainViewport');
      const allSessions = Array.isArray(sessionsArg) ? sessionsArg : getNormalizedSessions();

      // 仅当在线电脑存在真实待确认授权时显示顶部黄色授权横幅，无授权时顶部保持干净
      let pendingAppInfo = null;
      const localSettling = window.__dshSettlingApprovals || {};
      for (const h of hubState.hosts || []) {
        if (h.online === false) continue;
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
        if (currentProject === 'SMART_ACTIVE' && s.status !== 'running' && s.status !== 'approval') return false;
        if (currentProject === 'SMART_UNREAD' && !s.hasUnreadConclusion && !s.isUnreadInterrupted) return false;
        if (currentProject === 'HARNESS_DSH' && s.harness !== 'dsh') return false;
        if (currentProject === 'HARNESS_AGY_IDE' && s.harness !== 'antigravity-ide') return false;
        if (currentProject === 'HARNESS_CODEX' && s.harness !== 'codex') return false;
        if (currentProject === 'HARNESS_CLAUDE' && s.harness !== 'claude') return false;
        if (!['ALL', 'SMART_ACTIVE', 'SMART_UNREAD', 'HARNESS_DSH', 'HARNESS_AGY_IDE', 'HARNESS_CODEX', 'HARNESS_CLAUDE'].includes(currentProject) && s.project !== currentProject) return false;
        if (!q) return true;
        return s.title.toLowerCase().includes(q) || s.project.toLowerCase().includes(q) || s.lastPreview.toLowerCase().includes(q);
      });

      const visibleHosts = (hubState.hosts || []).filter(
        h => !currentHostId || currentHostId === 'ALL_HOSTS' || h.hostId === currentHostId
      );
      const hostTelemetrySig = visibleHosts
        .map(h => {
          const tm = formatHostTelemetry(h);
          return `${h.hostId}:${h.online ? 1 : 0}:${tm.powerShort}:${tm.netShort}:${tm.lowBattery ? 1 : 0}`;
        })
        .join('|');

      const showHostTag = currentHostId === 'ALL_HOSTS' && (hubState.hosts || []).length > 1;
      const bannerKey = pendingAppInfo
        ? `${pendingAppInfo.host.hostId}:${pendingAppInfo.app.code}:${pendingAppInfo.app.promptTitle || ''}:${pendingAppInfo.app.settling ? 1 : 0}:${pendingAppInfo.app.lastError || ''}`
        : '';
      const rowsSig = filtered
        .map(s => `${s.id}:${s.status}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ''}:${s.queuedCount || 0}:${s.hasUnreadConclusion ? 1 : 0}:${s.isUnreadInterrupted ? 1 : 0}:${s.pinned ? 1 : 0}:${s.id === activeSessionId ? 1 : 0}:${s.title}:${s.project}:${s.lastRole}:${s.lastPreview}:${s.timeLabel}`)
        .join('|');
      const listKey = `${(hubState.hosts || []).length}:${allSessions.length}:${currentProject}:${q}:${showHostTag ? 1 : 0}:${hostTelemetrySig}:${bannerKey}#${rowsSig}`;
      if (listKey === lastRenderedListKey && viewport.querySelector('.session-list')) return;
      lastRenderedListKey = listKey;
      const prevScrollTop = viewport.scrollTop;

      const hostTelemetryStripHtml = visibleHosts.length > 0 ? `
        <div class="host-telemetry-strip" style="display:flex;gap:6px;overflow-x:auto;padding:7px 12px;border-bottom:1px solid var(--hairline);background:var(--subtle);font-size:11.5px;align-items:center;">
          ${visibleHosts.map(h => {
            const tm = formatHostTelemetry(h);
            const warnStyle = !tm.isOnline
              ? 'background:rgba(239,68,68,0.1);color:var(--red);border:1px solid rgba(239,68,68,0.28);'
              : tm.lowBattery
                ? 'background:var(--amber-soft);color:#b45309;border:1px solid #fde68a;'
                : 'background:var(--card);color:var(--text-secondary);border:1px solid var(--border);';
            const statusText = tm.isOnline
              ? `${tm.compactBadge}${tm.lowBattery ? ' (低电量预警)' : ''}`
              : `⚪ 离线 (${formatTime(h.lastSeen)}${tm.hasTelemetry ? ` · 断连前 ${tm.powerIcon}${tm.powerShort} ${tm.netShort}` : ''})`;
            return `
              <button
                type="button"
                onclick="openHostSheet()"
                style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:600;white-space:nowrap;cursor:pointer;${warnStyle}"
                title="${esc(tm.fullLine)}"
              >
                <span>${tm.isOnline ? '🟢' : '🔴'} ${esc(h.hostName)}:</span>
                <span>${esc(statusText)}</span>
              </button>
            `;
          }).join('')}
        </div>
      ` : '';

      const liveBannerHtml = pendingAppInfo ? `
        <div class="live-activity-bar">
          <div class="live-activity-left" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">
            <div class="live-activity-title">⏳ [${esc(pendingAppInfo.host.hostName)}] ${esc(pendingAppInfo.app.project ? `${pendingAppInfo.app.project} / ` : '')}${esc(pendingAppInfo.app.settling ? '正在同步审批到电脑端...' : (pendingAppInfo.app.title || '等待你批准工具执行'))}</div>
            <div class="live-activity-desc" ${pendingAppInfo.app.lastError ? 'style="color:#ef4444;font-weight:600;"' : ''}>${esc(pendingAppInfo.app.lastError ? `⚠️ ${pendingAppInfo.app.lastError}` : (pendingAppInfo.app.promptTitle || pendingAppInfo.app.reason || ''))}</div>
          </div>
          <div class="live-activity-actions">
            ${pendingAppInfo.app.settling ? `
              <button class="mini-approve-btn" disabled style="opacity:0.65;cursor:not-allowed;">⏳ 处理中...</button>
            ` : `
              <button class="mini-approve-btn" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', true, 1, '${esc(pendingAppInfo.app.agentId || '')}')">✓ 允许</button>
              <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4, '${esc(pendingAppInfo.app.agentId || '')}')">拒绝</button>
            `}
          </div>
        </div>
      ` : '';

      const rowsHtml = filtered.map(s => {
        let rowStateClass = '';
        let statusHtml = `<span class="session-time">${esc(s.timeLabel)}</span>`;
        if (s.status === 'approval') {
          rowStateClass = 'row-state-approval';
          statusHtml = s.approvalObj?.settling
            ? `<span class="badge-approval">⏳ 同步电脑中...</span>`
            : s.approvalObj?.lastError
              ? `<span class="badge-interrupted">⚠️ 审批待重试</span>`
              : `<span class="badge-approval">⏳ 待你授权</span>`;
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

        const pinHtml = s.pinned ? `<span class="pin-tag" title="已置顶">📌</span>` : '';
        const hostBadgeHtml = showHostTag ? `<span class="host-mini-tag">${esc(s.hostName)}</span>` : '';
        const harnessTagHtml = s.harness === 'antigravity-ide'
          ? `<span class="harness-mini-tag agy">⚡ IDE</span>`
          : s.harness === 'codex'
            ? `<span class="harness-mini-tag agy">🧠 Codex</span>`
            : s.harness === 'claude'
              ? `<span class="harness-mini-tag agy">✴️ Claude</span>`
              : '';
        const rolePrefix = s.status === 'running' ? '' : (s.lastRole === 'user' ? '🧑 我: ' : '🤖 ');
        const displayTitle = s.harness !== 'dsh' && s.project && !s.title.startsWith(s.project)
          ? `${s.project} / ${s.title}`
          : s.title;

        return `
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
                ${hostBadgeHtml}
                ${harnessTagHtml}
                <span class="project-mini-tag">📁 ${esc(s.project)}</span>
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
        if (hostsCount === 0) {
          emptyStateHtml = renderAddHostPanelHtml({ isEmptyState: true });
        } else if (allSessions.length === 0) {
          emptyStateHtml = `
            <div style="padding:40px 20px;text-align:center;">
              <div style="font-size:30px;margin-bottom:8px;">✨</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">电脑已接入，还没有对话记录</div>
              <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">点击下方按钮直接在远程电脑上启动第一个任务</div>
              <button class="pill-action-btn primary" onclick="openNewTaskSheet()">＋ 新建远程对话</button>
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
        ${hostTelemetryStripHtml}
        ${liveBannerHtml}
        <div class="session-list">
          ${rowsHtml || emptyStateHtml}
        </div>
      `;
      viewport.scrollTop = prevScrollTop;
    }

    function resetSessionFilters() {
      currentProject = 'ALL';
      clearSearch();
      renderProjectStrip();
      renderSessionList();
    }

    // ==================== 5. 二级全屏对话视图（含 DOM 增量比对防打断） ====================
    function openChat(sessionId) {
      const found = findSessionGlobal(sessionId);
      if (!found) return;
      activeSessionId = found.session.id;
      activeSessionHostId = found.session.hostId;
      seenMap[activeSessionId] = Math.max(
        found.session.updatedAt || 0,
        found.session.lastConclusionAt || 0,
        Date.now()
      );
      try { localStorage.setItem('dsh_seen_v4', JSON.stringify(seenMap)); } catch {}
      document.getElementById('chatFullscreen').classList.add('open');
      document.body.classList.add('mobile-chat-open');
      lastRenderedChatKey = ''; // 切换会话时强制渲染
      renderActiveChatStage(found);
      // 重新进入上次读到一半的会话时，如果不在底部，直接浮出「最新消息」
      const box = document.getElementById('chatMessages');
      if (box && box.scrollHeight - box.scrollTop - box.clientHeight >= 120) {
        setScrollBottomVisible(true);
      }
      if (!document.body.classList.contains('DesktopSplitMode')) {
        trackOverlay('chat', rawCloseChat);
        maybeShowSwipeHint();
      }
      const nextSessions = getNormalizedSessions();
      renderProjectStrip(nextSessions);
      renderSessionList(nextSessions);
    }

    function rawCloseChat() {
      stopVoiceInput();
      document.getElementById('chatFullscreen').classList.remove('open');
      document.body.classList.remove('mobile-chat-open');
      setScrollBottomVisible(false);
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

      const chatHeaderTitle = s.harness !== 'dsh' && s.project && !s.title.startsWith(s.project)
        ? `${s.project} / ${s.title}`
        : s.title;
      document.getElementById('chatTitle').textContent = chatHeaderTitle;
      const harnessPrefix = s.harness === 'antigravity-ide'
        ? '⚡ Antigravity IDE · '
        : s.harness === 'codex'
          ? '🧠 Codex · '
          : s.harness === 'claude'
            ? '✴️ Claude Code · '
            : '';
      const isObserveOnly = s.controlMode === 'observe-only' && s.harness !== 'dsh';
      const modeTag = isObserveOnly
        ? ' · 👀 仅观测'
        : s.controlMode === 'idle-resumable' || (s.controlMode === 'observe-only' && s.harness === 'dsh')
          ? ' · 🔵 可续聊'
          : '';
      document.getElementById('chatSub').textContent = `${harnessPrefix}📁 ${s.project} · 💻 ${s.hostName} (${s.msgCount} 条对话)${modeTag}`;

      // 检查其他会话是否有待确认审批
      let otherApproval = null;
      for (const h of hubState.hosts || []) {
        const app = (h.bridgeState?.approvals || []).find(a => a.agentId !== s.id);
        if (app) { otherApproval = { app, host: h }; break; }
      }
      const alertBar = document.getElementById('chatSwitchAlert');
      if (otherApproval) {
        alertBar.style.display = 'flex';
        alertBar.innerHTML = `
          <span>⏳ [${esc(otherApproval.host.hostName)}]「${esc(otherApproval.app.project ? `${otherApproval.app.project} / ` : '')}${esc(otherApproval.app.title || otherApproval.app.toolName)}」待你审批</span>
          <button style="border:none;background:#d97706;color:#fff;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer;" onclick="openChat('${esc(otherApproval.app.agentId)}')">立即切换 ›</button>
        `;
      } else {
        alertBar.style.display = 'none';
      }

      // 切换会话时换回该会话的草稿（同一会话内绝不覆盖用户正在输入的内容）
      switchComposerSession(s.id);

      // 更新底部输入状态（仅当状态变化时调整 placeholder，绝不清空用户正在输入的内容！）
      const composerKey = `${s.id}:${s.status}:${s.controlMode || ''}`;
      if (composerKey !== lastRenderedComposerKey) {
        lastRenderedComposerKey = composerKey;
        const runningBar = document.getElementById('runningControlBar');
        const chatInput = document.getElementById('globalPromptInput');
        const sendBtn = document.getElementById('chatSendBtn');
        if (isObserveOnly) {
          runningBar.classList.remove('show');
          chatInput.disabled = true;
          sendBtn.disabled = true;
          sendBtn.style.display = 'none';
          chatInput.placeholder = '👀 当前会话为观察模式（仅支持查看对话记录）';
          sendBtn.textContent = '👀 仅观察';
        } else if (s.status === 'running') {
          runningBar.classList.add('show');
          const canSteer = s.capabilities?.canSteer !== false && s.harness !== 'codex' && s.harness !== 'claude';
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

      // DOM Diffing：如果会话内容和状态没变，不重绘 #chatMessages，保留用户展开的思考过程与滚动位置！
      const trSig = s.transcript
        .slice(-6)
        .map(m => `${m.role}:${m.queuedCmdId || ''}:${m.expiredCmdId || ''}:${(m.text || '').length}:${(m.text || '').slice(-32)}:${(m.thinking || '').length}:${(m.tools || []).length}:${m.waitingForInput ? 1 : 0}`)
        .join('|');
      const chatKey = `${s.id}:${s.status}:${s.sessionRev || ''}:${s.transcript.length}:${trSig}:${s.approvalObj?.code || ''}:${s.approvalObj?.settling ? 1 : 0}:${s.approvalObj?.lastError || ''}:${(s.changedFiles || []).length}`;
      if (chatKey === lastRenderedChatKey) return;
      lastRenderedChatKey = chatKey;
      selectedAgyOptionIndex = 1;

      const box = document.getElementById('chatMessages');
      // 保留用户手动点开的 <details>（思考过程 / 工具输出）状态，增量刷新时不会自动合上
      const openDetailIds = new Set(
        Array.from(box.querySelectorAll('details[open][data-detail-id]')).map(el => el.dataset.detailId)
      );
      // 用户正往上翻旧消息时，新内容不要把他强行拉回底部，只浮出「最新消息」
      const nearBottom = box.dataset.dshSession !== String(activeSessionId)
        || (box.scrollHeight - box.scrollTop - box.clientHeight < 120);
      const prevScrollTop = box.scrollTop;
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
          !item.waitingForInput
        ) {
          if (!prev._thoughtList) {
            prev._thoughtList = prev.thinking ? [String(prev.thinking).trim()] : [];
            prev._textList = prev.text && !prev.isToolStepOnly ? [String(prev.text).trim()] : [];
            prev._toolList = [
              ...(Array.isArray(prev.toolCalls) && prev.toolCalls.length > 0 ? prev.toolCalls : (prev.tools || [])),
            ];
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
          return `<div class="bubble user"><div>${esc(m.text)}</div>${queuedBadge}</div>`;
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
            <div class="bubble assistant" style="padding:10px 14px;">
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
          const toolItemsHtml = rawTools.map((t, tIdx) => {
            const tName = typeof t === 'string' ? t : (t.name || 'tool');
            const tSummary = typeof t === 'string' ? '' : (t.summary || t.argsSummary || '');
            const tDetail = typeof t === 'string' ? '执行完毕' : (t.commandLine || t.output || tSummary || '执行完毕');
            const chipId = `tool-${msgIdx}-${tIdx}`;
            return `
              <details class="tool-chip-details" data-detail-id="${chipId}" ${openDetailIds.has(chipId) ? 'open' : ''}>
                <summary><span>🔧 ${esc(tName)}${tSummary ? ` · ${esc(tSummary.slice(0, 64))}` : ''}</span><span style="color:#94a3b8;font-size:10.5px;">点击查看详情 ▾</span></summary>
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
        const cleanReplyText = m.text ? String(m.text).trim() : '';
        if (cleanReplyText) {
          lastRenderedAssistantTexts[msgIdx] = cleanReplyText;
        }
        const copyFooterHtml = cleanReplyText
          ? `<div class="assistant-copy-footer"><span class="assistant-char-meta">共 ${cleanReplyText.length} 字</span><button type="button" class="assistant-copy-btn" onclick="copyAssistantReply(${msgIdx}, this)">📋 一键复制全文</button></div>`
          : '';
        const bodyHtml = cleanReplyText
          ? `<div class="md-body">${formatAssistantText(cleanReplyText)}</div>${copyFooterHtml}`
          : `<div style="font-size:12.5px;color:var(--muted);margin-top:4px;">⚙️ 正在思考与执行工具调用...</div>`;
        return `<div class="bubble assistant">${thought}${tools}${bodyHtml}</div>`;
      }).join('');

      const filesChangedHtml = (s.harness === 'antigravity-ide' && Array.isArray(s.changedFiles) && s.changedFiles.length > 0) ? `
        <div class="agy-files-changed-card">
          ${s.changedFiles.slice(-8).map(fc => `
            <div class="agy-file-row">
              <span class="agy-file-dot">◉</span>
              <span class="agy-file-diff"><span class="add">+${Number(fc.added || 0)}</span><span class="del">-${Number(fc.removed || 0)}</span></span>
              <span class="agy-file-name">${esc(fc.name || '')}</span>
              <span class="agy-file-path">${esc(fc.displayPath || fc.path || '')}</span>
            </div>
          `).join('')}
          <div class="agy-files-footer">
            <span>📄 ${s.changedFiles.length} Files With Changes ⌃</span>
            <div class="agy-files-footer-btns">
              <button class="agy-files-reject" onclick="openInChatFileDrawer()">查看改动</button>
              <button class="agy-files-accept" onclick="openInChatFileDrawer()">Accept all</button>
            </div>
          </div>
        </div>
      ` : '';

      const isAgyApproval = s.approvalObj && (s.approvalObj.harness === 'antigravity-ide' || Array.isArray(s.approvalObj.options));
      const approvalStatusNoticeHtml = s.approvalObj?.lastError
        ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.35);color:#ef4444;font-size:12px;font-weight:600;">⚠️ ${esc(s.approvalObj.lastError)}</div>`
        : s.approvalObj?.settling
          ? `<div style="margin:8px 0;padding:8px 10px;border-radius:8px;background:var(--amber-soft);color:#d97706;font-size:12px;font-weight:600;">⏳ 正在同步到电脑端执行审批（最长等待 45 秒）...</div>`
          : '';
      const approvalCardHtml = s.approvalObj ? (isAgyApproval ? `
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

      const loadEarlierHtml = s.omittedTranscriptCount > 0
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

      // 正在往上翻历史时，新内容到达不要把用户拽回底部
      const sessionChanged = lastRenderedChatSessionId !== s.id;
      box.innerHTML = loadEarlierHtml + bubblesHtml + filesChangedHtml + approvalCardHtml + followupsHtml;
      if (sessionChanged || nearBottom) {
        box.scrollTop = box.scrollHeight;
        setScrollBottomVisible(false);
      } else {
        // innerHTML 重绘会丢掉滚动位置，这里恢复回用户正在看的位置
        box.scrollTop = prevScrollTop;
        setScrollBottomVisible(true);
      }
      lastRenderedChatSessionId = s.id;
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
      const box = document.getElementById('chatMessages');
      if (box) {
        if (typeof box.scrollTo === 'function') {
          box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
        } else {
          box.scrollTop = box.scrollHeight;
        }
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
      // 手指滚回底部时自动收起提示
      box.addEventListener('scroll', () => {
        if (box.scrollHeight - box.scrollTop - box.clientHeight < 40) {
          setScrollBottomVisible(false);
        }
      }, { passive: true });
    }

    // ==================== 6. 发送指令 / 实时插话 / 停止 / 审批 ====================
    async function dispatchHostCommand(hostId, payload) {
      const res = await apiFetch(`/api/hosts/${encodeURIComponent(hostId)}/command`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.json();
    }

    // ---- 输入框：多行、自动增高、按会话存草稿 ----
    let composerSessionId = '';
    let composerDraftTimer = null;

    function composerDraftKey(sessionId) {
      return 'dsh_draft_v1_' + sessionId;
    }

    function readComposerDraft(sessionId) {
      if (!sessionId) return '';
      try { return localStorage.getItem(composerDraftKey(sessionId)) || ''; } catch { return ''; }
    }

    function persistComposerDraft(sessionId = composerSessionId) {
      if (!sessionId) return;
      const input = document.getElementById('globalPromptInput');
      if (!input) return;
      try {
        // 只存用户真正写过的内容，空白不占空间
        if (input.value.trim()) localStorage.setItem(composerDraftKey(sessionId), input.value);
        else localStorage.removeItem(composerDraftKey(sessionId));
      } catch {}
    }

    function autoGrowComposer() {
      const input = document.getElementById('globalPromptInput');
      if (!input || input.tagName !== 'TEXTAREA') return;
      input.style.height = 'auto';
      const fullHeight = input.scrollHeight || 24;
      input.style.height = Math.min(fullHeight, 132) + 'px';
      input.style.overflowY = fullHeight > 132 ? 'auto' : 'hidden';
    }

    function onComposerInput() {
      autoGrowComposer();
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
      if (composerSessionId) persistComposerDraft(composerSessionId);
      composerSessionId = nextSessionId || '';
      input.value = readComposerDraft(composerSessionId);
      input.style.height = '';
      autoGrowComposer();
      renderAttachmentStrip('chat');
    }

    // ---- 截图 / 照片上传（客户端 Canvas 自动缩放压缩，避免大载荷卡顿） ----
    const MAX_COMPOSER_ATTACHMENTS = 4;
    const composerAttachments = {
      chat: [],
      newTask: [],
    };

    function getAttachmentList(target = 'chat') {
      return target === 'newTask' ? composerAttachments.newTask : composerAttachments.chat;
    }

    function triggerImagePicker(target = 'chat') {
      const inputId = target === 'newTask' ? 'newTaskImageInput' : 'chatImageInput';
      const el = document.getElementById(inputId);
      if (el) {
        el.value = '';
        el.click();
      }
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
    }

    async function compressImageFile(file) {
      const rawDataUrl = await readFileAsDataUrl(file);
      const commaIdx = rawDataUrl.indexOf(',');
      const rawBase64 = commaIdx >= 0 ? rawDataUrl.slice(commaIdx + 1) : rawDataUrl;
      const origMime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
      const origName = file.name || `screenshot-${Date.now()}.jpg`;

      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('Image decode failed'));
          el.src = rawDataUrl;
        });
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        const maxSide = 1600;
        const needsResize = w > maxSide || h > maxSide;
        const needsCompress = file.size > 260 * 1024;
        if (!needsResize && !needsCompress && w > 0 && h > 0) {
          return {
            name: origName,
            mimeType: origMime,
            dataBase64: rawBase64,
            previewUrl: rawDataUrl,
            sizeBytes: file.size || Math.round((rawBase64.length * 3) / 4),
            width: w,
            height: h,
          };
        }
        if (w > 0 && h > 0) {
          const scale = needsResize ? Math.min(maxSide / w, maxSide / h) : 1;
          const targetW = Math.max(1, Math.round(w * scale));
          const targetH = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const outMime = 'image/jpeg';
            const outDataUrl = canvas.toDataURL(outMime, 0.82);
            const outComma = outDataUrl.indexOf(',');
            const outBase64 = outComma >= 0 ? outDataUrl.slice(outComma + 1) : outDataUrl;
            const baseName = origName.replace(/\.[a-zA-Z0-9]+$/, '') || 'screenshot';
            return {
              name: `${baseName}.jpg`,
              mimeType: outMime,
              dataBase64: outBase64,
              previewUrl: outDataUrl,
              sizeBytes: Math.round((outBase64.length * 3) / 4),
              width: targetW,
              height: targetH,
            };
          }
        }
      } catch {
        // Fallback to raw data URL when browser Image decode is unavailable
      }
      return {
        name: origName,
        mimeType: origMime,
        dataBase64: rawBase64,
        previewUrl: rawDataUrl,
        sizeBytes: file.size || Math.round((rawBase64.length * 3) / 4),
      };
    }

    function renderAttachmentStrip(target = 'chat') {
      const stripId = target === 'newTask' ? 'newTaskAttachmentsStrip' : 'composerAttachmentsStrip';
      const strip = document.getElementById(stripId);
      if (!strip) return;
      const list = getAttachmentList(target);
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
      renderAttachmentStrip(target);
      if (addedCount > 0) {
        showToast(`🖼️ 已添加 ${addedCount} 张截图（已自动优化至 ${formatBytes(totalSize)}）`);
      }
    }

    async function onChatImageSelected(event, target = 'chat') {
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
      stopVoiceInput();
      const input = document.getElementById('globalPromptInput');
      const rawText = input ? input.value.trim() : '';
      const pendingAttachments = composerAttachments.chat.slice();
      if ((!rawText && pendingAttachments.length === 0) || !activeSessionId) return;
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      const { session: s, host } = found;
      const canSteer = s.capabilities?.canSteer !== false && s.harness !== 'codex' && s.harness !== 'claude';
      if (s.status === 'running' && !canSteer) {
        showToast('⏳ 当前会话正在运行且不支持中途插话，请等待完成或先点击停止');
        return;
      }
      const text = rawText || '请查看我上传的截图并帮我分析处理。';
      const optimisticText = pendingAttachments.length > 0
        ? `${text}\n[🖼️ 已附带 ${pendingAttachments.length} 张截图]`
        : text;
      if (input) input.value = '';
      composerAttachments.chat = [];
      renderAttachmentStrip('chat');
      try { localStorage.removeItem(composerDraftKey(composerSessionId || activeSessionId)); } catch {}
      autoGrowComposer();

      window.__dshOptimisticMsgs = window.__dshOptimisticMsgs || {};
      const optList = window.__dshOptimisticMsgs[s.id] || [];
      optList.push({ text: optimisticText, time: Date.now() });
      window.__dshOptimisticMsgs[s.id] = optList.slice(-5);
      lastRenderedChatKey = '';
      renderActiveChatStage();

      const cmdType = s.status === 'running' ? 'steer' : 'prompt';
      const isHostActivelyOnline = Boolean(host && host.online !== false && host.activelyConnected !== false);
      if (isHostActivelyOnline) {
        showToast(
          pendingAttachments.length > 0
            ? `🖼️ 已发送截图与指令 (${pendingAttachments.length} 张)`
            : cmdType === 'steer'
              ? '⚡ 已发送实时插话'
              : '📨 已发送指令'
        );
      }
      let dispatchRes = null;
      try {
        dispatchRes = await dispatchHostCommand(s.hostId, {
          type: cmdType,
          agentId: s.id,
          cwd: s.cwd || '',
          text,
          prompt: text,
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
        window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter(item => item.text !== optimisticText);
        lastRenderedChatKey = '';
        renderActiveChatStage();
        showToast('❌ ' + (dispatchRes?.error || '发送指令失败'));
        if (input && !input.value.trim() && rawText) {
          input.value = rawText;
          autoGrowComposer();
        }
        if (pendingAttachments.length > 0 && composerAttachments.chat.length === 0) {
          composerAttachments.chat = pendingAttachments;
          renderAttachmentStrip('chat');
        }
        return;
      }

      if (dispatchRes.queued) {
        showToast('⏳ 电脑当前休眠/离线，指令已排队（10分钟内上线自动执行，可随时取消）');
      }

      setTimeout(fetchState, 250);
      setTimeout(fetchState, 800);

      const cmdId = dispatchRes?.command?.id;
      if (cmdId) {
        (async () => {
          for (let i = 0; i < 16; i++) {
            await new Promise(r => setTimeout(r, 350));
            try {
              const res = await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`);
              const data = await res.json();
              if (data?.ready || data?.command?.status === 'completed') {
                if (data.result && data.result.ok === false) {
                  window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter(item => item.text !== optimisticText);
                  lastRenderedChatKey = '';
                  renderActiveChatStage();
                  showToast('❌ ' + (data.result.error || data.result.message || '发送失败'));
                  if (input && !input.value.trim() && rawText) {
                    input.value = rawText;
                    autoGrowComposer();
                  }
                  if (pendingAttachments.length > 0 && composerAttachments.chat.length === 0) {
                    composerAttachments.chat = pendingAttachments;
                    renderAttachmentStrip('chat');
                  }
                }
                fetchState();
                return;
              }
            } catch {}
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
      setTimeout(fetchState, 250);
      setTimeout(fetchState, 800);
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
      setTimeout(fetchState, 200);
      setTimeout(fetchState, 750);
    }

    // ==================== 7. 聊天内「📂 文件速览浮层抽屉」 ====================
    async function openInChatFileDrawer() {
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      fileProjectCwd = found.session.cwd || '';
      fileSubDir = '';
      openSheet('inChatFileSheet');
      document.body.classList.add('mobile-file-open');
      document.getElementById('inChatFileTitle').textContent = `📂 ${found.session.project} (${found.session.hostName})`;
      await requestDirList(found.session.hostId, found.session.id, fileProjectCwd, '', true);
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

    function renderInChatFileDrawerBody() {
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      const host = found.host;
      if (!host) return;
      const body = document.getElementById('inChatFileBody');
      reconcileFileLoading(host);
      const preview = host.lastFilePreview;
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
        const kind = previewKind(preview);
        const previewKey = `${preview.at || 0}:${preview.relPath || ''}:${kind}:${(preview.content || '').length}`;
        if (body.dataset.dshPreviewKey === previewKey && body.querySelector('.file-preview-body')) return;
        body.dataset.dshPreviewKey = previewKey;
        const lines = String(preview.content || '').split('\n');
        const numberedHtml = lines.map((line, i) =>
          `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
        ).join('');
        const previewBodyHtml = kind === 'image'
          ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:46vh;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回目录重新点击文件加载';" />
               <div style="font-size:12px;color:#94a3b8;">${esc(formatBytes(preview.size))} · 长按图片可保存到相册</div>
             </div>`
          : kind === 'binary'
            ? `<div class="file-preview-body" style="padding:32px 16px;background:#0f172a;color:#94a3b8;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                 <div style="font-size:32px;">📦</div>
                 <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                 <div style="font-size:12.5px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
               </div>`
            : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:340px;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;">
                 ${numberedHtml}
               </div>`;
        body.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13px;" onclick="backFromDrawerPreview()">‹ 返回目录</button>
            <span style="font-weight:700;color:var(--text);">${esc(preview.name)}</span>
            <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="quoteFileIntoChat('${esc(preview.relPath || preview.name)}')">📎 插入到输入框</button>
          </div>
          ${previewBodyHtml}
        `;
        return;
      }

      body.dataset.dshPreviewKey = '';
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
                <span style="font-size:18px;">${e.isDirectory ? '📁' : '📄'}</span>
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
      if (found?.host?.lastFilePreview) {
        found.host.lastFilePreview._showInDrawer = false;
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
        if (box && box.at !== filePreviewLoading.prevAt && box.relPath === filePreviewLoading.relPath) {
          box._showInDrawer = Boolean(filePreviewLoading.drawer);
          box._showInMain = !filePreviewLoading.drawer;
          filePreviewLoading = null;
        } else if (Date.now() - filePreviewLoading.at > 15000) {
          filePreviewLoading = null;
        }
      }
    }

    async function requestDirList(hostId, agentId, cwd, subDir, inDrawer = false) {
      fileProjectCwd = cwd;
      fileSubDir = subDir;
      const host = (hubState.hosts || []).find(h => h.hostId === hostId);
      if (host?.lastFilePreview) {
        host.lastFilePreview._showInMain = false;
        host.lastFilePreview._showInDrawer = false;
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
      // 先快速轮询几次，拿到结果就停；超时交给 reconcileFileLoading
      for (let i = 0; i < 10 && fileLoading; i++) {
        await sleepMs(400);
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

    async function clickRealFileEntry(hostId, agentId, cwd, relPath, isDir, inDrawer = false) {
      if (isDir) {
        await requestDirList(hostId, agentId, cwd, relPath, inDrawer);
        return;
      }
      const host = (hubState.hosts || []).find(h => h.hostId === hostId);
      filePreviewLoading = {
        hostId,
        relPath,
        prevAt: host?.lastFilePreview?.at || 0,
        at: Date.now(),
        drawer: inDrawer,
      };
      renderAll();
      let failure = '';
      try {
        const out = await dispatchHostCommand(hostId, { type: 'read_file', agentId, cwd, relPath });
        if (out && out.ok === false) failure = out.error || '电脑未接受该指令';
      } catch (err) {
        failure = (err && err.message) || String(err);
      }
      if (failure) {
        filePreviewLoading = null;
        showToast('❌ 读取文件失败：' + failure);
        renderAll();
        return;
      }
      for (let i = 0; i < 10 && filePreviewLoading; i++) {
        await sleepMs(400);
        const state = await fetchState();
        if (!state.ok) break;
      }
      if (filePreviewLoading) {
        filePreviewLoading = null;
        showToast('⚠️ 读取文件超时：电脑可能离线，请重新点一下文件');
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

    function cancelFilePreviewLoading() {
      filePreviewLoading = null;
      renderAll();
    }

    function renderFilesTab(container = document.getElementById('mainViewport')) {
      const hosts = hubState.hosts || [];
      const host = currentHostId === 'ALL_HOSTS' ? hosts[0] : hosts.find(h => h.hostId === currentHostId);
      if (!host) {
        container.innerHTML = `<div style="padding:48px 20px;text-align:center;color:#94a3b8;">暂无在线电脑</div>`;
        return;
      }
      reconcileFileLoading(host);
      const projects = getHostProjects(host);
      if (!fileProjectCwd && projects[0]) {
        fileProjectCwd = projects[0].cwd;
      }
      const firstSession = (host.bridgeState?.tasks || []).find(t => t.cwd === fileProjectCwd) || (host.bridgeState?.tasks || [])[0];
      const agentId = firstSession?.id || '';

      const preview = host.lastFilePreview;
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
        const kind = previewKind(preview);
        // 图片/长文件在每次 2 秒轮询里都重建 DOM 会卡顿，内容没变就复用
        const previewKey = `${preview.at || 0}:${preview.relPath || ''}:${kind}:${(preview.content || '').length}`;
        if (container.dataset.dshPreviewKey === previewKey && container.querySelector('.file-preview-body')) return;
        container.dataset.dshPreviewKey = previewKey;
        const lines = String(preview.content || '').split('\n');
        const numberedHtml = lines.map((line, i) =>
          `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
        ).join('');
        const previewBodyHtml = kind === 'image'
          ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:8px;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.textContent='⚠️ 图片预览已过期，请返回文件列表重新点击加载';" />
               <div style="font-size:12px;color:#94a3b8;">${esc(formatBytes(preview.size))} · 长按图片可保存到相册</div>
             </div>`
          : kind === 'binary'
            ? `<div class="file-preview-body" style="padding:36px 16px;background:#0f172a;color:#94a3b8;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;">
                 <div style="font-size:36px;">📦</div>
                 <div style="font-size:14.5px;font-weight:600;color:#e2e8f0;">${esc(preview.name)}</div>
                 <div style="font-size:13px;">二进制文件（${esc(formatBytes(preview.size))}），不支持直接文本预览</div>
               </div>`
            : `<div class="file-preview-body" style="padding:14px 12px;background:#0f172a;color:#f8fafc;min-height:calc(100% - 44px);overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.65;">
                 ${numberedHtml}
               </div>`;
        container.innerHTML = `
          <div class="breadcrumbs-bar" style="justify-content:space-between;">
            <button class="back-btn" style="padding:0;font-size:13.5px;display:inline-flex !important;" onclick="closeMainFilePreview('${esc(host.hostId)}')">‹ 返回文件列表</button>
            <span style="font-weight:700;color:var(--text);">${esc(preview.name)}</span>
            <div style="display:flex;gap:6px;">
              ${kind !== 'text' ? '' : `<button class="icon-pill-btn" onclick="copyCodeText('${encodeURIComponent(preview.content || '')}')">📋 复制</button>`}
              <button class="icon-pill-btn" style="color:var(--primary);border-color:#bfdbfe;background:var(--primary-soft);" onclick="askAiAboutFile('${esc(host.hostId)}', '${esc(fileProjectCwd)}', '${esc(preview.relPath || preview.name)}')">💬 让 AI 分析</button>
            </div>
          </div>
          ${previewBodyHtml}
        `;
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
            <span style="font-size:18px;">${e.isDirectory ? '📁' : '📄'}</span>
            <span style="font-weight:500;">${esc(e.name)}</span>
          </div>
          <span style="font-size:12px;color:#94a3b8;">${e.isDirectory ? '目录' : formatBytes(e.size)} ›</span>
        </div>
      `).join('') || `<div style="padding:36px;text-align:center;color:#94a3b8;">点击上方项目胶囊加载远程目录...</div>`);

      container.innerHTML = projectPillsHtml + breadcrumbHtml + `<div>${listHtml}</div>`;
      container.scrollTop = prevScrollTop;
    }

    function closeMainFilePreview(hostId) {
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
      setTimeout(() => document.getElementById('newTaskInput').focus(), 100);
    }

    function renderNewTaskForm() {
      const hosts = hubState.hosts || [];
      const hostChips = document.getElementById('newTaskHostChips');
      hostChips.innerHTML = hosts.map(h => `
        <button class="choice-chip ${h.hostId === newTaskHostId ? 'selected' : ''}" onclick="selectNewTaskHost('${esc(h.hostId)}')">
          🟢 ${esc(h.hostName)}
        </button>
      `).join('');

      const harnessChips = document.getElementById('newTaskHarnessChips');
      if (harnessChips) {
        const harnessOpts = [
          { id: 'antigravity-ide', label: '⚡ Antigravity IDE' },
          { id: 'codex', label: '🧠 OpenAI Codex' },
          { id: 'claude', label: '✴️ Claude Code' },
          { id: 'dsh', label: '🟣 DeepSeek Harness' },
        ];
        harnessChips.innerHTML = harnessOpts.map(opt => `
          <button class="choice-chip ${opt.id === newTaskHarness ? 'selected' : ''}" onclick="selectNewTaskHarness('${opt.id}')">
            ${opt.label}
          </button>
        `).join('');
      }

      const host = hosts.find(h => h.hostId === newTaskHostId);
      const projects = getHostProjects(host);
      if (!projects.some(p => p.cwd === newTaskCwd) && projects[0]) {
        newTaskCwd = projects[0].cwd;
      }
      const projChips = document.getElementById('newTaskProjectChips');
      projChips.innerHTML = projects.map(p => `
        <button class="choice-chip ${p.cwd === newTaskCwd ? 'selected' : ''}" onclick="selectNewTaskProject('${esc(p.cwd)}')">
          📁 ${esc(p.name)}
        </button>
      `).join('');
    }

    function selectNewTaskHost(id) {
      newTaskHostId = id;
      newTaskCwd = '';
      renderNewTaskForm();
    }

    function selectNewTaskHarness(h) {
      newTaskHarness = h;
      renderNewTaskForm();
    }

    function selectNewTaskProject(cwd) {
      newTaskCwd = cwd;
      renderNewTaskForm();
    }

    function fillQuickPrompt(text) {
      const box = document.getElementById('newTaskInput');
      box.value = text;
      box.focus();
    }

    async function submitNewTask() {
      stopVoiceInput();
      const inputEl = document.getElementById('newTaskInput');
      const rawText = inputEl ? inputEl.value.trim() : '';
      const pendingAttachments = composerAttachments.newTask.slice();
      if ((!rawText && pendingAttachments.length === 0) || !newTaskHostId) {
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
          title: text.slice(0, 28),
          prompt: text,
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
      pinnedMap[id] = !pinnedMap[id];
      try { localStorage.setItem('dsh_pinned_v4', JSON.stringify(pinnedMap)); } catch {}
      closeSheet('taskActionSheet');
      showToast(pinnedMap[id] ? '📌 已置顶该对话' : '已取消置顶');
      renderAll();
    }

    async function saveInlineRename() {
      const val = document.getElementById('renameInlineInput').value.trim();
      if (!val || !actionTargetSession) return;
      closeSheet('taskActionSheet');
      showToast('✏️ 正在保存新标题...');
      await dispatchHostCommand(actionTargetHostId, {
        type: 'rename_session',
        agentId: actionTargetSession.id,
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
        const expiresAt = Number(data.expiresAt || (Date.now() + 180000));
        const pairLink = `${location.origin}/?pair=${encodeURIComponent(codeStr)}`;
        const qrSvgHtml = renderQrCodeSvg(pairLink, { sizePx: 184, margin: 3 });
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
            <div style="display:flex;justify-content:center;margin:8px 0 12px;">
              ${qrSvgHtml}
            </div>
            <div
              style="font-family:var(--mono);font-size:28px;font-weight:800;letter-spacing:6px;padding:10px 12px;border-radius:12px;background:var(--primary-soft);color:var(--primary);border:1px solid var(--border);user-select:all;"
            >${esc(codeStr)}</div>
            <div id="pairingCodeTimerText" style="margin-top:10px;font-size:12.5px;font-weight:600;color:var(--primary);"></div>
            <div style="display:flex;gap:8px;margin-top:14px;">
              <button
                class="primary-block-btn"
                style="margin-top:0;flex:1;"
                onclick="copyCodeText('${encodeURIComponent(pairLink)}', '📋 手机免密登录链接已复制')"
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
        pairingCountdownTimer = setInterval(renderCountdown, 1000);
      } catch (err) {
        body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--red);">❌ 生成失败：${esc((err && err.message) || String(err))}</div>`;
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
    function renderAddHostPanelHtml({ isEmptyState = false } = {}) {
      const enrollment = hubState.enrollment || {};
      const code = enrollment.code || '正在生成...';
      const expiresAt = Number(enrollment.expiresAt || 0);
      const remainMin = expiresAt > Date.now() ? Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000)) : 15;
      const joinedCount = Number(enrollment.joinedCount || 0);
      const originUrl = location.origin;
      const oneLineCmd = `curl -fsSL ${originUrl}/install.sh | bash -s -- --code ${code}`;
      const localRepoCmd = `./connect-host.sh --url ${originUrl} --code ${code}`;

      return `
        <div class="settings-card" style="padding:16px;${isEmptyState ? 'max-width:440px;margin:20px auto;text-align:left;border:1.5px solid var(--primary);' : 'margin-bottom:14px;'}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div>
              <div style="font-size:15px;font-weight:800;color:var(--text);">
                ${isEmptyState ? '💻 本机未接入 · 复制下方命令接入电脑' : '➕ 添加电脑（凭配对码加入，无需主密码）'}
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                每台电脑自动分配独立凭证，可单独吊销；有效期内同一配对码可连加多台电脑
              </div>
            </div>
            <button class="pill-action-btn" style="font-size:11.5px;padding:4px 10px;" onclick="refreshEnrollmentCode()">
              🔄 刷新配对码
            </button>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:120px;padding:8px 10px;border-radius:10px;background:var(--primary-soft);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">当前电脑配对码</div>
              <div style="font-family:var(--mono);font-size:17px;font-weight:800;color:var(--primary);letter-spacing:1.5px;margin-top:2px;">${esc(code)}</div>
            </div>
            <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">剩余有效期</div>
              <div style="font-size:13.5px;font-weight:700;color:var(--text);margin-top:3px;">⏳ ${remainMin} 分钟</div>
            </div>
            <div style="padding:8px 10px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);">
              <div style="font-size:11px;color:var(--muted);">本码已加入</div>
              <div style="font-size:13.5px;font-weight:700;color:var(--green);margin-top:3px;">💻 ${joinedCount} 台</div>
            </div>
          </div>

          <div style="font-size:11.5px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
            在电脑终端执行这一行命令（自动安装、自动连上、开机自启）：
          </div>
          <div
            style="font-family:var(--mono);font-size:11.5px;line-height:1.5;padding:10px 12px;border-radius:10px;background:var(--subtle);border:1px solid var(--border);color:var(--text);word-break:break-all;margin-bottom:10px;user-select:all;"
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
        tokenTail: currentTk.slice(-4),
        enrollmentCode,
        joinedCount: hubState.enrollment?.joinedCount || 0,
        pushCount: (hubState.pushSubscriptions || []).length,
        build: buildInfo.uiBuild || buildInfo.version || '',
        hosts: hosts.map(h => ({
          id: h.hostId,
          name: h.hostName,
          online: h.online,
          trustStatus: h.trustStatus || h.trust?.status || '',
          hasDedicatedToken: Boolean(h.hasDedicatedToken),
          isFeishuActive: h.isFeishuActive,
          remoteActive: h.remoteActive,
          taskCount: (h.bridgeState?.tasks || []).length,
          runningCount: h.runningCount || 0,
          totalBytes: h.totalBytes || 0,
          turbo: h.bridgeState?.turbo?.engineLabel || '',
          power: h.bridgeState?.systemTelemetry?.power?.label || '',
          net: h.bridgeState?.systemTelemetry?.network?.label || '',
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
            <div class="settings-group-title">已接入电脑实时看板 (${hosts.length} 台设备)</div>
            <div class="host-visual-grid">
              ${hosts.map(h => {
                const isRevoked = (h.trustStatus || h.trust?.status) === 'revoked';
                return `
                <div class="host-visual-card ${h.isFeishuActive ? 'active-feishu' : ''}">
                  <div class="host-visual-top">
                    <div>
                      <div style="font-size:15.5px;font-weight:700;display:flex;align-items:center;gap:6px;">
                        <span class="status-dot ${h.online && !isRevoked ? '' : 'offline'}"></span>
                        <span>${esc(h.hostName)}</span>
                        <span style="font-size:11.5px;color:var(--muted);font-weight:500;">(${esc(h.platform || 'macOS')} ${esc(h.arch || '')})</span>
                      </div>
                      <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">
                        🔒 指纹 ${esc(h.fingerprint || '已锁定')} · ${isRevoked ? '<span style="color:var(--red);font-weight:700;">🚫 已吊销</span>' : (h.online ? '实时在线' : '离线 (' + formatTime(h.lastSeen) + ')')} · ${h.hasDedicatedToken ? `🔑 独立凭证 (${esc(h.hostTokenPreview)})` : '🔑 管理员凭证'}
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                      <button class="pill-action-btn ${h.isFeishuActive ? 'primary' : ''}" onclick="activateFeishuHost('${esc(h.hostId)}')">
                        ${h.isFeishuActive ? '🎯 飞书当前主控' : '切飞书到这台'}
                      </button>
                      ${isRevoked ? `
                        <button class="pill-action-btn" onclick="unrevokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">恢复接入</button>
                      ` : `
                        <button class="pill-action-btn" style="color:var(--red);" onclick="revokeHostCredential('${esc(h.hostId)}', '${esc(h.hostName)}')">🚫 吊销</button>
                      `}
                    </div>
                  </div>
                  <div class="host-metrics-row">
                    <div class="metric-cell">
                      <span class="metric-label">总会话数</span>
                      <span class="metric-val">${(h.bridgeState?.tasks || []).length} 条</span>
                    </div>
                    <div class="metric-cell">
                      <span class="metric-label">运行中</span>
                      <span class="metric-val">${h.runningCount || 0} 个</span>
                    </div>
                    <div class="metric-cell">
                      <span class="metric-label">~/.dsh 存储</span>
                      <span class="metric-val">${formatBytes(h.totalBytes)}</span>
                    </div>
                  </div>
                  ${(() => {
                    const tm = formatHostTelemetry(h);
                    return `
                      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-secondary);padding:7px 10px;margin-bottom:8px;border-radius:10px;background:${tm.lowBattery ? 'var(--amber-soft)' : 'var(--subtle)'};border:1px solid ${tm.lowBattery ? '#fde68a' : 'var(--border)'};">
                        <span>${tm.powerIcon} 供电状态：<strong>${esc(tm.powerDetail)}</strong>${tm.lowBattery ? ' <span style="color:var(--red);font-weight:700;">⚠️ 低电量防休眠预警</span>' : ''}</span>
                        <span>${tm.netIcon} 网络状态：<strong>${esc(tm.netDetail)}</strong>${!h.online ? ' <span style="color:var(--red);">(离线前最后状态)</span>' : ''}</span>
                      </div>
                    `;
                  })()}
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--text-secondary);padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--hairline);">
                    <span>⚡ 同步引擎：<strong>${esc(h.bridgeState?.turbo?.engineLabel || '🐢 标准轮询 (可升级)')}</strong>${h.syncMeta?.seq ? ` · 序号 #${h.syncMeta.seq}` : ''}</span>
                    <button class="pill-action-btn primary" style="padding:4px 10px;font-size:11.5px;" onclick="openTurboGuideSheet()">
                      ${h.bridgeState?.turbo?.enabled ? '⚡ 极速详情' : '🚀 一键提速'}
                    </button>
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--hairline);font-size:11.5px;">
                    <span style="padding:2px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">🟣 DSH · ✅ 完整远控+审批</span>
                    <span style="padding:2px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">⚡ Antigravity IDE · ✅ 完整远控+审批</span>
                    ${(h.bridgeState?.harnesses || []).map(ad => `
                      <span style="padding:2px 8px;border-radius:999px;background:var(--subtle);color:var(--text);">
                        ${esc(ad.icon || '🔌')} ${esc(ad.label || ad.id)} · ${ad.hasBinary ? '🔵 看会话/发指令/停止（审批计划中）' : (ad.installed ? '👀 观察模式（审批需 DSH）' : '⚪ 未安装')}
                      </span>
                    `).join('')}
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--text-secondary);">
                    <span>飞书远程完成/异常卡片通知（可选）</span>
                    <button class="pill-action-btn ${h.remoteActive ? 'primary' : ''}" style="padding:4px 10px;font-size:11.5px;" onclick="toggleHostRemoteMode('${esc(h.hostId)}', ${!h.remoteActive})">
                      ${h.remoteActive ? '🔔 已开启' : '🔕 已关闭'}
                    </button>
                  </div>
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
                    <th style="padding:6px 4px;">看会话</th>
                    <th style="padding:6px 4px;">发指令</th>
                    <th style="padding:6px 4px;">停止</th>
                    <th style="padding:6px 4px;">手机审批</th>
                    <th style="padding:6px 4px;">实时插话</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">DSH</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Antigravity IDE</td>
                    <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
                  </tr>
                  <tr style="border-bottom:1px solid var(--hairline);">
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Claude Code</td>
                    <td>✅</td><td>✅</td><td>✅</td><td style="color:var(--muted);">计划中</td><td>❌</td>
                  </tr>
                  <tr>
                    <td style="text-align:left;padding:7px 4px;font-weight:700;">Codex</td>
                    <td>✅</td><td>✅</td><td>✅</td><td style="color:var(--muted);">计划中</td><td>❌</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div class="settings-group-title">外观与显示模式</div>
            <div class="settings-card">
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">深色 / 浅色主题</div>
                  <div class="settings-item-desc">夜间弱光下使用深色模式更护眼，默认跟随手机系统自动切换</div>
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
              <div class="settings-item">
                <div>
                  <div class="settings-item-title">接入新电脑（含你的私密认证密钥）</div>
                  <div class="settings-item-desc">公开 GitHub 仓库不含密码，点击复制带密钥的专属接入命令</div>
                </div>
                <button class="pill-action-btn" onclick="copyCodeText('${encodeURIComponent(onboardingCmd)}', '📋 专属接入命令已复制')">📋 复制专属命令</button>
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
                <div id="pushLocalStatus" style="margin-top:9px;font-size:12.5px;font-weight:600;color:var(--primary);">
                  正在检测本机推送状态…
                </div>
                <div id="pushDeviceList" style="margin-top:4px;font-size:12px;color:var(--muted);line-height:1.55;"></div>
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

          <div
            style="text-align:center;padding:8px 12px 18px;font-size:11.5px;color:var(--muted);cursor:pointer;user-select:none;"
            onclick="copyCodeText('${encodeURIComponent(`DSH Hub v${buildInfo.version || '0.2.0'} (${buildInfo.uiBuild || 'dev'}) · started ${buildInfo.startedAt ? new Date(buildInfo.startedAt).toISOString() : ''}`)}', '📋 版本信息已复制')"
          >
            DSH 远控总控台 v${esc(buildInfo.version || '0.2.0')} · 构建 <code>${esc(buildInfo.uiBuild || 'dev')}</code>${buildInfo.startedAt ? ' · 云端启动于 ' + formatTime(buildInfo.startedAt) : ''}
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
          if (sub) await sub.unsubscribe().catch(() => {});
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
      // 设置页每 2 秒会重绘一次，避免跟着重复查询 Service Worker
      if (!manual && Date.now() - lastPushStatusAt < 1500) return;
      lastPushStatusAt = Date.now();
      const statusEl = document.getElementById('pushLocalStatus');
      const listEl = document.getElementById('pushDeviceList');
      if (!statusEl) return;
      const subs = hubState.pushSubscriptions || [];
      if (listEl) {
        if (!subs.length) {
          listEl.textContent = '还没有设备登记推送';
        } else {
          const devices = subs.slice(0, 5).map(sub => {
            const name = sub.deviceName || '未知设备';
            const host = sub.endpointHost ? ` · ${sub.endpointHost}` : '';
            return `${name}${host}`;
          });
          const more = subs.length > 5 ? ` 等 ${subs.length} 台` : '';
          listEl.textContent = `已在服务端登记 ${subs.length} 台设备：${devices.join('；')}${more}`;
        }
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
        statusEl.textContent = '本机：当前浏览器不支持锁屏推送（iPhone 需从主屏幕 App 打开）';
        statusEl.style.color = '#d97706';
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        let sub = reg ? await reg.pushManager.getSubscription() : null;
        const permission = Notification.permission;
        if (sub && permission === 'granted') {
          const localKey = getSubServerKeyBase64Url(sub);
          const expectedKey = hubState.vapidPublicKey || '';
          if ((expectedKey && localKey && localKey !== expectedKey) || !subs.length) {
            const synced = await ensureLocalPushSubscriptionSynced();
            if (synced) sub = synced;
          }
          statusEl.textContent = '本机：✅ 已开启锁屏推送';
          statusEl.style.color = '#059669';
        } else if (sub && permission === 'denied') {
          statusEl.textContent = '本机：已订阅但通知权限被拒绝，请到「设置 → 通知」中允许';
          statusEl.style.color = '#dc2626';
        } else if (permission === 'denied') {
          statusEl.textContent = '本机：通知权限被拒绝，请到「设置 → 通知 → DSH 远控」中允许';
          statusEl.style.color = '#dc2626';
        } else {
          statusEl.textContent = '本机：未开启（点下方「开启推送」）';
          statusEl.style.color = '#d97706';
        }
        if (manual) showToast('已刷新推送状态');
      } catch (err) {
        statusEl.textContent = '本机：状态读取失败（' + ((err && err.message) || err) + '）';
        statusEl.style.color = '#dc2626';
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
        } catch {}
        showToast('🔕 已关闭本机推送');
        setTimeout(fetchState, 300);
        void refreshPushStatus();
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
        if (oldSub) await oldSub.unsubscribe().catch(() => {});
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
    function openHostSheet() {
      const hosts = hubState.hosts || [];
      const totalCount = hosts.reduce((acc, h) => acc + ((h.bridgeState?.tasks || []).length), 0);
      const onlineCount = hosts.filter(h => h.online).length;
      document.getElementById('hostSheetCountLabel').textContent = `${onlineCount}/${hosts.length} 台设备在线`;

      const list = document.getElementById('hostOptionList');
      list.innerHTML = [
        `<div class="host-option ${currentHostId === 'ALL_HOSTS' ? 'selected' : ''}" onclick="selectHost('ALL_HOSTS')">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text);">🌐 全部电脑汇总</div>
            <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">一屏混排查看 ${hosts.length} 台电脑共 ${totalCount} 条会话</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--primary);">${currentHostId === 'ALL_HOSTS' ? '当前视图 ✓' : '切换 ›'}</span>
        </div>`,
        ...hosts.map(h => {
          const tm = formatHostTelemetry(h);
          return `
          <div class="host-option ${h.hostId === currentHostId ? 'selected' : ''}" onclick="selectHost('${esc(h.hostId)}')">
            <div>
              <div style="font-weight:700;font-size:15px;color:var(--text);">${h.online ? '🟢' : '⚪'} ${esc(h.hostName)}</div>
              <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${(h.bridgeState?.tasks || []).length} 条会话 · ${h.isFeishuActive ? '🎯 飞书当前主控' : (h.online ? '在线待命' : '离线 (' + formatTime(h.lastSeen) + ')')}</div>
              <div style="font-size:11.5px;color:${tm.lowBattery ? '#b45309' : 'var(--text-secondary)'};margin-top:3px;font-weight:500;">
                ${esc(tm.fullLine)}
              </div>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--primary);">${h.hostId === currentHostId ? '当前设备 ✓' : '切换 ›'}</span>
          </div>
        `;
        })
      ].join('');
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
      } catch {}
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
      } catch {}
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
        } catch {}
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
      } catch {}
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(val);
          closeSheet('copyFallbackSheet');
          showToast('📋 已复制到剪贴板');
          return;
        } catch {}
      }
      try {
        if (document.execCommand('copy')) {
          closeSheet('copyFallbackSheet');
          showToast('📋 已复制到剪贴板');
          return;
        }
      } catch {}
      showToast('请长按上方选中文本并点「拷贝」');
    }

    function copyCodeText(encoded, successMessage = '📋 已复制到剪贴板') {
      const text = decodeURIComponent(encoded);
      void copyText(text, { successMessage });
    }

    function openTurboGuideSheet() {
      const hosts = hubState.hosts || [];
      const currentTk = getToken();
      const body = document.getElementById('turboGuideBody');
      const oneStepCmd = `git clone https://github.com/oscarka/deepseekharness-remotecontrol.git ~/deepseekharness-remote && cd ~/deepseekharness-remote && ./connect-host.sh "电脑名称" "${currentTk}"`;

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

    async function upgradeHostTurbo(hostId) {
      showToast('🚀 已发送远程升级并启用 Rust 极速引擎指令...');
      await dispatchHostCommand(hostId, { type: 'upgrade_turbo' });
      setTimeout(fetchState, 600);
      setTimeout(() => {
        if (document.getElementById('turboGuideSheet').classList.contains('open')) openTurboGuideSheet();
      }, 1200);
    }

    // ==================== 15. 手势返回 / 浮层历史栈（体验增强） ====================
    // 打开二级页面或抽屉时写入一条 history，使系统返回键、Safari 侧滑、
    // 手势右滑都能「退回上一层」，而不是直接退出整个网页。
    function rawCloseSheet(id) {
      if (id === 'newTaskSheet') stopVoiceInput();
      document.getElementById(id)?.classList.remove('open');
      if (id === 'inChatFileSheet') document.body.classList.remove('mobile-file-open');
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
      const EDGE = 30;
      let tracking = false;
      let decided = null;
      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;
      let startedAt = 0;
      let width = 0;

      const resetChatStyle = () => {
        chat.style.transition = '';
        chat.style.transform = '';
        chat.style.willChange = '';
        chat.style.boxShadow = '';
      };

      // 代码块等横向可滚动的元素上，不抢手势
      const isHorizontallyScrollable = (target) => {
        let node = target;
        while (node && node !== chat && node.nodeType === 1) {
          const overflowX = window.getComputedStyle(node).overflowX;
          if (/(auto|scroll)/.test(overflowX) && node.scrollWidth > node.clientWidth + 4) return true;
          node = node.parentElement;
        }
        return false;
      };

      chat.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) return;
        if (!document.body.classList.contains('mobile-chat-open')) return;
        if (document.body.classList.contains('DesktopSplitMode')) return;
        const touch = event.touches[0];
        const rect = chat.getBoundingClientRect();
        // 只响应左边缘起手，避免和消息区横向滚动/长按冲突
        if (touch.clientX - rect.left > EDGE) return;
        if (isHorizontallyScrollable(event.target)) return;
        tracking = true;
        decided = null;
        startX = touch.clientX;
        startY = touch.clientY;
        lastX = startX;
        lastY = startY;
        startedAt = Date.now();
        width = rect.width || window.innerWidth;
      }, { passive: true });

      chat.addEventListener('touchmove', (event) => {
        if (!tracking) return;
        const touch = event.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        lastX = touch.clientX;
        lastY = touch.clientY;
        if (decided === null) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          decided = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2;
          if (!decided) {
            tracking = false;
            return;
          }
          chat.style.transition = 'none';
          chat.style.willChange = 'transform';
        }
        if (dx <= 0) return;
        if (event.cancelable) event.preventDefault();
        chat.style.transform = `translateX(${Math.min(dx, width)}px)`;
        chat.style.boxShadow = '-10px 0 30px rgba(15, 23, 42, 0.16)';
      }, { passive: false });

      const finishSwipe = () => {
        if (!tracking) return;
        tracking = false;
        const dx = Math.max(0, lastX - startX);
        const dy = Math.abs(lastY - startY);
        const dismiss = shouldDismissHorizontalSwipe({
          dx,
          dy,
          width,
          durationMs: Date.now() - startedAt,
        });
        chat.style.transition = 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)';
        if (dismiss) {
          chat.style.transform = `translateX(${width}px)`;
          closeMobileChat();
          setTimeout(resetChatStyle, 260);
        } else {
          chat.style.transform = 'translateX(0px)';
          setTimeout(resetChatStyle, 280);
        }
      };

      chat.addEventListener('touchend', finishSwipe);
      chat.addEventListener('touchcancel', finishSwipe);
    }

    function setupSheetSwipeDismiss() {
      document.querySelectorAll('.sheet-backdrop').forEach(backdrop => {
        const panel = backdrop.querySelector('.sheet-panel');
        if (!panel) return;
        let tracking = false;
        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let lastY = 0;
        let startedAt = 0;

        const resetPanelStyle = () => {
          panel.style.transition = '';
          panel.style.transform = '';
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

        panel.addEventListener('touchstart', (event) => {
          if (event.touches.length !== 1) return;
          if (panel.scrollTop > 0 || hasScrolledInner(event.target)) return;
          const touch = event.touches[0];
          tracking = true;
          startX = touch.clientX;
          startY = touch.clientY;
          lastX = startX;
          lastY = startY;
          startedAt = Date.now();
        }, { passive: true });

        panel.addEventListener('touchmove', (event) => {
          if (!tracking) return;
          const touch = event.touches[0];
          const dy = touch.clientY - startY;
          const dx = touch.clientX - startX;
          lastX = touch.clientX;
          lastY = touch.clientY;
          if (dy <= 0) return;
          if (Math.abs(dx) > dy * 1.2) {
            tracking = false;
            return;
          }
          if (event.cancelable) event.preventDefault();
          panel.style.transition = 'none';
          panel.style.willChange = 'transform';
          panel.style.transform = `translateY(${dy}px)`;
        }, { passive: false });

        const finishSwipe = () => {
          if (!tracking) return;
          tracking = false;
          const dy = Math.max(0, lastY - startY);
          const dx = lastX - startX;
          const dismiss = shouldDismissVerticalSwipe({
            dy,
            dx,
            height: panel.offsetHeight,
            durationMs: Date.now() - startedAt,
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

    function maybeShowSwipeHint() {
      if (!('ontouchstart' in window)) return;
      try {
        if (localStorage.getItem('dsh_swipe_hint_v1')) return;
        localStorage.setItem('dsh_swipe_hint_v1', '1');
      } catch {
        return;
      }
      setTimeout(() => showToast('💡 提示：从左边缘向右滑，即可返回会话列表'), 600);
    }

    function setupOverlayGestures() {
      setupChatSwipeBack();
      setupSheetSwipeDismiss();
    }

    // ==================== 15b. 「添加到主屏幕」提示 ====================
    // iOS 只有从主屏幕图标打开时才允许 Web Push，普通 Safari 标签页收不到锁屏通知。
    function setupInstallHint() {
      const el = document.getElementById('installHint');
      if (!el) return;
      let dismissed = true;
      try { dismissed = localStorage.getItem('dsh_a2hs_dismissed_v1') === '1'; } catch {}
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
      try { localStorage.setItem('dsh_a2hs_dismissed_v1', '1'); } catch {}
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
        const prev = prevHosts.find(h => h.hostId === host.hostId)?.lastFilePreview;
        const next = host.lastFilePreview;
        if (!prev || !next) continue;
        if (prev.at === next.at && prev.relPath === next.relPath) {
          next._showInMain = Boolean(prev._showInMain);
          next._showInDrawer = Boolean(prev._showInDrawer);
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
              fetchState();
            }
          }
        });
      } catch {}
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

    function applyHubState(nextState) {
      preservePreviewUiState(nextState);
      hubState = nextState;
    }
    let hasLoadedInitialState = false;
    let lastStateFetchAt = 0;
    let stateFetchSeq = 0;
    async function fetchState() {
      const mySeq = ++stateFetchSeq;
      try {
        const res = await apiFetch('/api/state');
        const data = await res.json();
        if (mySeq < stateFetchSeq) {
          return { ok: true, superseded: true };
        }
        if (data.ok) {
          hasLoadedInitialState = true;
          lastStateFetchAt = Date.now();
          setConnectionBanner(false);
          applyHubState(data);
          renderAll();
          flushPendingDeepLink();
          void ensureLocalPushSubscriptionSynced();
          return { ok: true };
        }
        return { ok: false, error: data.error || '服务端返回异常' };
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        if (message !== 'Unauthorized') {
          setConnectionBanner(true);
        }
        return { ok: false, unauthorized: message === 'Unauthorized', error: message };
      }
    }

    let sseSource = null;
    let sseConnected = false;
    let lastSseEventAt = 0;
    function connectSSE() {
      if (urlParams.get('nosse') === '1') return;
      if (sseSource) {
        try { sseSource.close(); } catch {}
      }
      sseConnected = false;
      const tk = getToken();
      const url = '/api/events?initial=0' + (tk ? '&token=' + encodeURIComponent(tk) : '');
      try {
        sseSource = new EventSource(url);
        sseSource.onopen = () => {
          sseConnected = true;
          lastSseEventAt = Date.now();
          setConnectionBanner(false);
          // initial=0 下 SSE 建连/断线重连只发 ping，如果尚未成功拉取状态或距上次拉取已超过 2.5s，立即补拉一次最新全量状态
          if (!hasLoadedInitialState || Date.now() - lastStateFetchAt > 2500) {
            void fetchState();
          }
        };
        sseSource.onerror = () => {
          sseConnected = false;
        };
        sseSource.addEventListener('ping', () => {
          sseConnected = true;
          lastSseEventAt = Date.now();
          setConnectionBanner(false);
        });
        sseSource.addEventListener('state', evt => {
          try {
            sseConnected = true;
            lastSseEventAt = Date.now();
            setConnectionBanner(false);
            const data = JSON.parse(evt.data);
            if (data.ok) {
              hasLoadedInitialState = true;
              lastStateFetchAt = Date.now();
              applyHubState(data);
              renderAll();
              flushPendingDeepLink();
            }
          } catch {}
        });
      } catch {}
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
      selectAgyApprovalOption,
      submitAgyApproval,
      copyAssistantReply,
      copyLatestAssistantReply,
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
      persistComposerDraft,
      autoGrowComposer,
      onComposerInput,
      composerUsesCoarsePointer,
      shouldSendOnEnter,
      onComposerKeydown,
      switchComposerSession,
      triggerImagePicker,
      onChatImageSelected,
      onComposerPaste,
      removeComposerAttachment,
      renderAttachmentStrip,
      compressImageFile,
      setVoiceBtnRecording,
      isVoiceRecording,
      stopVoiceInput,
      toggleVoiceInput,
      sendPromptToActiveSession,
      cancelQueuedCommand,
      sendQuickFollowup,
      stopActiveSession,
      sendApprovalDecision,
      openInChatFileDrawer,
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
      upgradeHostTurbo,
      rawCloseSheet,
      trackOverlay,
      openSheet,
      dismissOverlay,
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
      applyHubState,
      fetchState,
      connectSSE,
    });

    setupOverlayGestures();
    setupChatScrollWatcher();
    setupInstallHint();
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
            localStorage.setItem('dsh_hub_token', exData.token);
            showToast('🔓 扫码登录成功');
          } else {
            showToast('⚠️ 扫码配对码已过期或无效，请重新扫码');
          }
        } catch {}
        await fetchState();
        connectSSE();
      })();
    } else {
      fetchState();
      connectSSE();
    }
    // 服务端每 10s 发送 event: ping，仅当 SSE 断开或超过 15s 未收到任何事件时才降级轮询兜底
    setInterval(() => {
      if (!sseConnected || (Date.now() - lastSseEventAt > 15000)) {
        fetchState();
      }
    }, 5000);
}
