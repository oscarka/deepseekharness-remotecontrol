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

export function initHubController() {
    // ==================== 1. 认证与安全 Token 管理（自动清除 URL 尾巴防止截图泄露） ====================
    const urlParams = new URLSearchParams(location.search);
    const queryToken = (urlParams.get('token') || '').trim();
    let pendingDeepLinkHostId = (urlParams.get('host') || '').trim();
    let pendingDeepLinkTaskId = (urlParams.get('task') || urlParams.get('session') || '').trim();
    if (queryToken || pendingDeepLinkHostId || pendingDeepLinkTaskId) {
      if (queryToken) localStorage.setItem('dsh_hub_token', queryToken);
      urlParams.delete('token');
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
    function getNormalizedSessions() {
      const list = [];
      const isChatOpenNow = document.getElementById('chatFullscreen')?.classList.contains('open')
        || document.body.classList.contains('DesktopSplitMode');

      for (const h of hubState.hosts || []) {
        if (currentHostId && currentHostId !== 'ALL_HOSTS' && h.hostId !== currentHostId) continue;
        const tasks = h.bridgeState?.tasks || [];
        const approvals = h.bridgeState?.approvals || [];
        for (const t of tasks) {
          const ts = t.updatedAt || t.lastActivity || 0;
          const pendingApp = approvals.find(a => a.agentId === t.id);
          const baseTranscript = Array.isArray(t.transcript) ? [...t.transcript] : [];
          const optimisticList = (window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id]) || [];
          const nowMs = Date.now();
          const remainingOpt = [];
          for (const opt of optimisticList) {
            if (nowMs - opt.time >= 15000) continue;
            if (baseTranscript.some(m => m.role === 'user' && m.text === opt.text)) {
              // 已落盘同步，从乐观缓存移除，确保后续在电脑端「撤回」时不会被前端重新塞回
              continue;
            }
            remainingOpt.push(opt);
            baseTranscript.push({ role: 'user', text: opt.text, time: opt.time });
          }
          if (window.__dshOptimisticMsgs && window.__dshOptimisticMsgs[t.id]) {
            window.__dshOptimisticMsgs[t.id] = remainingOpt;
          }
          const transcript = baseTranscript;
          const lastMsg = transcript.length > 0 ? transcript[transcript.length - 1] : null;
          const project = t.project || (t.cwd ? t.cwd.split('/').filter(Boolean).pop() : '默认工作区') || '默认工作区';
          const status = pendingApp ? 'approval' : (t.status || 'idle');
          const harness = t.harness || (String(t.id || '').startsWith('agy-ide:') ? 'antigravity-ide' : 'dsh');
          const harnessLabel = t.harnessLabel || (harness === 'antigravity-ide' ? 'Antigravity IDE' : 'DeepSeek Harness');

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

          list.push({
            id: t.id,
            hostId: h.hostId,
            hostName: h.hostName || h.hostId,
            harness,
            harnessLabel,
            title: t.title || '未命名会话',
            project,
            cwd: t.cwd || '',
            status,
            turnState,
            lastConclusionAt,
            lastInterruptedAt,
            approvalObj: pendingApp || null,
            changedFiles,
            msgCount: Number(t.messageCount) || transcript.length || 0,
            updatedAt: ts,
            timeLabel: formatTime(ts),
            pinned: Boolean(pinnedMap[t.id]),
            unread: false,
            hasUnreadConclusion: false,
            isUnreadInterrupted: false,
            isRecentActive: false,
            lastRole: lastMsg?.role || 'assistant',
            lastPreview: cleanPreviewText(rawPreview) || '点击查看对话详情',
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
      const dshCount = sessions.filter(s => s.harness !== 'antigravity-ide').length;

      const counts = {};
      for (const s of sessions) {
        counts[s.project] = (counts[s.project] || 0) + 1;
      }
      const projects = Object.keys(counts);
      const strip = document.getElementById('projectStrip');
      const stripKey = `${currentProject}:${sessions.length}:${activeCount}:${unreadCount}:${agyCount}:${dshCount}:${projects.map(p => `${p}:${counts[p]}`).join(',')}`;
      if (stripKey === lastRenderedStripKey && strip.children.length > 0) return;
      lastRenderedStripKey = stripKey;
      const prevScrollLeft = strip.scrollLeft;

      const smartPills = [
        `<button class="filter-pill smart-pill ${currentProject === 'SMART_ACTIVE' ? 'active' : ''}" onclick="selectProject('SMART_ACTIVE')">🟢 运行中 <span class="count">${activeCount}</span></button>`,
        `<button class="filter-pill smart-pill ${currentProject === 'SMART_UNREAD' ? 'active' : ''}" onclick="selectProject('SMART_UNREAD')">🔵 已出结论 <span class="count">${unreadCount}</span></button>`
      ];
      if (agyCount > 0) {
        smartPills.push(
          `<button class="filter-pill smart-pill ${currentProject === 'HARNESS_DSH' ? 'active' : ''}" onclick="selectProject('HARNESS_DSH')">🟣 DSH <span class="count">${dshCount}</span></button>`,
          `<button class="filter-pill smart-pill ${currentProject === 'HARNESS_AGY_IDE' ? 'active' : ''}" onclick="selectProject('HARNESS_AGY_IDE')">⚡ IDE <span class="count">${agyCount}</span></button>`
        );
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
      for (const h of hubState.hosts || []) {
        if (h.online === false) continue;
        if (currentHostId && currentHostId !== 'ALL_HOSTS' && h.hostId !== currentHostId) continue;
        const app = (h.bridgeState?.approvals || [])[0];
        if (app) { pendingAppInfo = { app, host: h }; break; }
      }

      const q = searchQuery.trim().toLowerCase();
      const filtered = allSessions.filter(s => {
        if (currentProject === 'SMART_ACTIVE' && s.status !== 'running' && s.status !== 'approval') return false;
        if (currentProject === 'SMART_UNREAD' && !s.hasUnreadConclusion && !s.isUnreadInterrupted) return false;
        if (currentProject === 'HARNESS_DSH' && s.harness === 'antigravity-ide') return false;
        if (currentProject === 'HARNESS_AGY_IDE' && s.harness !== 'antigravity-ide') return false;
        if (!['ALL', 'SMART_ACTIVE', 'SMART_UNREAD', 'HARNESS_DSH', 'HARNESS_AGY_IDE'].includes(currentProject) && s.project !== currentProject) return false;
        if (!q) return true;
        return s.title.toLowerCase().includes(q) || s.project.toLowerCase().includes(q) || s.lastPreview.toLowerCase().includes(q);
      });

      const showHostTag = currentHostId === 'ALL_HOSTS' && (hubState.hosts || []).length > 1;
      const bannerKey = pendingAppInfo
        ? `${pendingAppInfo.host.hostId}:${pendingAppInfo.app.code}:${pendingAppInfo.app.promptTitle || ''}`
        : '';
      const rowsSig = filtered
        .map(s => `${s.id}:${s.status}:${s.hasUnreadConclusion ? 1 : 0}:${s.isUnreadInterrupted ? 1 : 0}:${s.pinned ? 1 : 0}:${s.id === activeSessionId ? 1 : 0}:${s.title}:${s.project}:${s.lastRole}:${s.lastPreview}:${s.timeLabel}`)
        .join('|');
      const listKey = `${currentProject}:${q}:${showHostTag ? 1 : 0}:${bannerKey}#${rowsSig}`;
      if (listKey === lastRenderedListKey && viewport.querySelector('.session-list')) return;
      lastRenderedListKey = listKey;
      const prevScrollTop = viewport.scrollTop;

      const liveBannerHtml = pendingAppInfo ? `
        <div class="live-activity-bar">
          <div class="live-activity-left" onclick="openChat('${esc(pendingAppInfo.app.agentId)}')">
            <div class="live-activity-title">⏳ [${esc(pendingAppInfo.host.hostName)}] ${esc(pendingAppInfo.app.project ? `${pendingAppInfo.app.project} / ` : '')}${esc(pendingAppInfo.app.title || '等待你批准工具执行')}</div>
            <div class="live-activity-desc">${esc(pendingAppInfo.app.promptTitle || pendingAppInfo.app.reason || '')}</div>
          </div>
          <div class="live-activity-actions">
            <button class="mini-approve-btn" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', true, 1)">✓ 允许</button>
            <button class="mini-approve-btn ghost" onclick="sendApprovalDecision('${esc(pendingAppInfo.host.hostId)}', '${esc(pendingAppInfo.app.code)}', false, 4)">拒绝</button>
          </div>
        </div>
      ` : '';

      const rowsHtml = filtered.map(s => {
        let rowStateClass = '';
        let statusHtml = `<span class="session-time">${esc(s.timeLabel)}</span>`;
        if (s.status === 'approval') {
          rowStateClass = 'row-state-approval';
          statusHtml = `<span class="badge-approval">⏳ 待你授权</span>`;
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
        const harnessTagHtml = s.harness === 'antigravity-ide' ? `<span class="harness-mini-tag agy">⚡ IDE</span>` : '';
        const rolePrefix = s.status === 'running' ? '' : (s.lastRole === 'user' ? '🧑 我: ' : '🤖 ');
        const displayTitle = s.harness === 'antigravity-ide' && s.project && !s.title.startsWith(s.project)
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

      viewport.innerHTML = `
        ${liveBannerHtml}
        <div class="session-list">
          ${rowsHtml || `<div style="padding:48px 20px;text-align:center;color:#94a3b8;font-size:14px;">暂无匹配的对话记录</div>`}
        </div>
      `;
      viewport.scrollTop = prevScrollTop;
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
      lastRenderedChatKey = ''; // 切换会话时强制渲染
      renderActiveChatStage();
      renderProjectStrip();
      renderSessionList();
      document.getElementById('chatFullscreen').classList.add('open');
      document.body.classList.add('mobile-chat-open');
      // 重新进入上次读到一半的会话时，如果不在底部，直接浮出「最新消息」
      const box = document.getElementById('chatMessages');
      if (box && box.scrollHeight - box.scrollTop - box.clientHeight >= 120) {
        setScrollBottomVisible(true);
      }
      if (!document.body.classList.contains('DesktopSplitMode')) {
        trackOverlay('chat', rawCloseChat);
        maybeShowSwipeHint();
      }
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

    function renderActiveChatStage() {
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      const { session: s } = found;

      const chatHeaderTitle = s.harness === 'antigravity-ide' && s.project && !s.title.startsWith(s.project)
        ? `${s.project} / ${s.title}`
        : s.title;
      document.getElementById('chatTitle').textContent = chatHeaderTitle;
      const harnessPrefix = s.harness === 'antigravity-ide' ? '⚡ Antigravity IDE · ' : '';
      document.getElementById('chatSub').textContent = `${harnessPrefix}📁 ${s.project} · 💻 ${s.hostName} (${s.msgCount} 条对话)`;

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
      const composerKey = `${s.id}:${s.status}`;
      if (composerKey !== lastRenderedComposerKey) {
        lastRenderedComposerKey = composerKey;
        const runningBar = document.getElementById('runningControlBar');
        const chatInput = document.getElementById('globalPromptInput');
        const sendBtn = document.getElementById('chatSendBtn');
        if (s.status === 'running') {
          runningBar.classList.add('show');
          chatInput.placeholder = '⚡ 实时插话 (Steer)：补充指令将立即注入...';
          sendBtn.textContent = '⚡ 插话';
        } else {
          runningBar.classList.remove('show');
          chatInput.placeholder = '发指令继续对话...';
          sendBtn.textContent = '发送';
        }
      }

      // DOM Diffing：如果会话内容和状态没变，不重绘 #chatMessages，保留用户展开的思考过程与滚动位置！
      const trSig = s.transcript
        .slice(-6)
        .map(m => `${m.role}:${(m.text || '').length}:${(m.text || '').slice(-32)}:${(m.thinking || '').length}:${(m.tools || []).length}:${m.waitingForInput ? 1 : 0}`)
        .join('|');
      const chatKey = `${s.id}:${s.status}:${s.transcript.length}:${trSig}:${s.approvalObj?.code || ''}:${(s.changedFiles || []).length}`;
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
      const msgs = s.transcript.length > 0
        ? s.transcript
        : [{ role: 'assistant', text: s.rawLastPreview || s.lastPreview }];

      const bubblesHtml = msgs.map((m, msgIdx) => {
        if (m.role === 'user') {
          return `<div class="bubble user">${esc(m.text)}</div>`;
        }
        const thinkId = `think-${msgIdx}`;
        const thought = m.thinking
          ? `<details class="thought-box thinking-details" data-detail-id="${thinkId}" ${openDetailIds.has(thinkId) ? 'open' : ''}><summary>💭 思考过程 (点击展开)</summary><div style="margin-top:6px;white-space:pre-wrap;">${esc(m.thinking)}</div></details>`
          : '';
        if (m.isToolStepOnly) {
          const toolOut = (m.tools || []).map(t => t.commandLine || t.summary || '').filter(Boolean).join('\n');
          const waitText = m.waitingForInput
            ? `<div style="margin-top:6px;font-size:12.5px;color:#64748b;">Waiting for user input.</div>`
            : '';
          const stepToolId = `tool-step-${msgIdx}`;
          return `
            <div class="bubble assistant" style="padding:10px 14px;">
              ${thought}
              <details class="tool-chip-details" data-detail-id="${stepToolId}" ${openDetailIds.has(stepToolId) ? 'open' : ''} style="border:none;background:transparent;">
                <summary style="padding:2px 0;font-size:13px;color:#334155;">
                  <span>${esc(m.text)}</span>
                  <span style="color:#94a3b8;font-size:11px;">›</span>
                </summary>
                ${toolOut ? `<div class="tool-chip-output" style="margin-top:6px;border-radius:6px;">${esc(toolOut)}</div>` : ''}
              </details>
              ${waitText}
            </div>
          `;
        }
        const tools = (m.tools || []).length > 0
          ? `<div class="tool-chips">${m.tools.map((t, tIdx) => {
              const tName = t.name || 'tool';
              const tSummary = t.summary || '';
              const tDetail = t.commandLine || tSummary || '执行完毕';
              const chipId = `tool-${msgIdx}-${tIdx}`;
              return `
                <details class="tool-chip-details" data-detail-id="${chipId}" ${openDetailIds.has(chipId) ? 'open' : ''}>
                  <summary><span>🔧 ${esc(tName)} ${esc(tSummary.slice(0, 48))}</span><span style="color:#94a3b8;font-size:10.5px;">点击查看输出 ▾</span></summary>
                  <div class="tool-chip-output">${esc(tDetail)}</div>
                </details>
              `;
            }).join('')}</div>`
          : '';
        return `<div class="bubble assistant">${thought}<div class="md-body">${formatAssistantText(m.text)}</div>${tools}</div>`;
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
      const approvalCardHtml = s.approvalObj ? (isAgyApproval ? `
        <div class="agy-approval-card">
          <div class="agy-approval-header">
            <span class="agy-approval-term-icon">&gt;_</span>
            <span>${esc(s.approvalObj.promptTitle || `Allow ${s.approvalObj.toolName}?`)}</span>
          </div>
          <div class="agy-approval-subtitle">${esc(s.approvalObj.subtitle || 'the auto-run safety check did not reach a decision')}</div>
          ${s.approvalObj.commandLine ? `<div class="agy-approval-cmd">${esc(s.approvalObj.commandLine)}</div>` : `<div class="agy-approval-cmd">${esc(s.approvalObj.reason || '')}</div>`}
          <div class="agy-approval-options">
            ${(s.approvalObj.options && s.approvalObj.options.length > 0 ? s.approvalObj.options : [
              { index: 1, label: 'Yes, allow this time' },
              { index: 2, label: 'Yes, and always allow in this conversation' },
              { index: 3, label: 'Yes, and always allow' },
              { index: 4, label: 'No (tell the agent what to do instead)' }
            ]).map(opt => `
              <button type="button" class="agy-approval-opt ${opt.index === 1 ? 'selected' : ''}" data-opt-idx="${opt.index}" onclick="selectAgyApprovalOption(${opt.index})" ondblclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', ${opt.index !== 4}, ${opt.index})">
                <span class="agy-opt-num">${opt.index}</span>
                <span>${esc(opt.label)}</span>
              </button>
            `).join('')}
          </div>
          <div class="agy-approval-footer">
            <button type="button" class="agy-btn-skip" onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)">Skip</button>
            <button type="button" class="agy-btn-submit" onclick="submitAgyApproval('${esc(s.hostId)}', '${esc(s.approvalObj.code)}')">Submit <span>↵</span></button>
          </div>
        </div>
      ` : `
        <div class="inline-approval-card">
          <div class="inline-approval-title">⏳ 等待你确认工具调用：${esc(s.approvalObj.toolName)}</div>
          <div class="inline-approval-cmd">${esc(s.approvalObj.reason || '请求执行权限')}</div>
          <div class="inline-approval-btns">
            <button style="background:#10b981;color:#fff;" onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', true, 1)">✅ 允许执行</button>
            <button style="background:#fee2e2;color:#dc2626;" onclick="sendApprovalDecision('${esc(s.hostId)}', '${esc(s.approvalObj.code)}', false, 4)">✕ 拒绝</button>
          </div>
        </div>
      `) : '';

      const followups = ['▶ 继续执行下一步', '🔍 查看 git status 与改动', '🧪 运行测试验证'];
      const followupsHtml = `
        <div class="quick-followups">
          ${followups.map(f => `<button class="followup-pill" onclick="sendQuickFollowup('${esc(f)}')">${esc(f)}</button>`).join('')}
        </div>
      `;

      // 正在往上翻历史时，新内容到达不要把用户拽回底部
      const sessionChanged = lastRenderedChatSessionId !== s.id;
      box.innerHTML = bubblesHtml + filesChangedHtml + approvalCardHtml + followupsHtml;
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
    }

    window.addEventListener('pagehide', () => {
      persistComposerDraft();
      stopVoiceInput();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        persistComposerDraft();
        stopVoiceInput();
      }
    });

    async function sendPromptToActiveSession() {
      stopVoiceInput();
      const input = document.getElementById('globalPromptInput');
      const text = input.value.trim();
      if (!text || !activeSessionId) return;
      const found = findSessionGlobal(activeSessionId);
      if (!found) return;
      const { session: s } = found;
      input.value = '';
      try { localStorage.removeItem(composerDraftKey(composerSessionId || activeSessionId)); } catch {}
      autoGrowComposer();

      window.__dshOptimisticMsgs = window.__dshOptimisticMsgs || {};
      const optList = window.__dshOptimisticMsgs[s.id] || [];
      optList.push({ text, time: Date.now() });
      window.__dshOptimisticMsgs[s.id] = optList.slice(-5);
      lastRenderedChatKey = '';
      renderActiveChatStage();

      const cmdType = s.status === 'running' ? 'steer' : 'prompt';
      showToast(cmdType === 'steer' ? '⚡ 已发送实时插话' : '📨 已发送指令');
      let dispatchRes = null;
      try {
        dispatchRes = await dispatchHostCommand(s.hostId, {
          type: cmdType,
          agentId: s.id,
          cwd: s.cwd || '',
          text,
          prompt: text,
        });
      } catch (err) {
        dispatchRes = { ok: false, error: err?.message || '网络请求失败' };
      }

      if (!dispatchRes || dispatchRes.ok === false) {
        window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter(item => item.text !== text);
        lastRenderedChatKey = '';
        renderActiveChatStage();
        showToast('❌ ' + (dispatchRes?.error || '发送指令失败'));
        if (input && !input.value.trim()) {
          input.value = text;
          autoGrowComposer();
        }
        return;
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
                  window.__dshOptimisticMsgs[s.id] = (window.__dshOptimisticMsgs[s.id] || []).filter(item => item.text !== text);
                  lastRenderedChatKey = '';
                  renderActiveChatStage();
                  showToast('❌ ' + (data.result.error || data.result.message || '发送失败'));
                  if (input && !input.value.trim()) {
                    input.value = text;
                    autoGrowComposer();
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

    async function sendApprovalDecision(hostId, code, allow, optionIndex = 1) {
      const optLabel = optionIndex === 2
        ? '✅ 已批准并在当前会话始终允许'
        : optionIndex === 3
          ? '✅ 已批准并始终允许该命令'
          : allow
            ? '✅ 已发送批准指令 (Option 1)'
            : '已拒绝/跳过该工具执行';
      showToast(optLabel);
      await dispatchHostCommand(hostId, {
        type: 'approval',
        code,
        allow: Boolean(allow),
        optionIndex: Number(optionIndex) || (allow ? 1 : 4),
      });
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
        const kind = previewKind(preview);
        const previewKey = `${preview.at || 0}:${preview.relPath || ''}:${kind}`;
        if (body.dataset.dshPreviewKey === previewKey && body.querySelector('.file-preview-body')) return;
        body.dataset.dshPreviewKey = previewKey;
        const lines = String(preview.content || '').split('\n');
        const numberedHtml = lines.map((line, i) =>
          `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
        ).join('');
        const previewBodyHtml = kind === 'image'
          ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:46vh;object-fit:contain;border-radius:8px;" />
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

      const entries = listing?.entries || [];
      const loadingDir = fileLoading && fileLoading.hostId === host.hostId && fileLoading.drawer;
      const rootCwd = listing?.rootCwd || fileProjectCwd;
      const activeSubDir = loadingDir ? (fileLoading.subDir || '') : (listing?.subDir || '');
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
        const kind = previewKind(preview);
        // 图片/长文件在每次 2 秒轮询里都重建 DOM 会卡顿，内容没变就复用
        const previewKey = `${preview.at || 0}:${preview.relPath || ''}:${kind}`;
        if (container.dataset.dshPreviewKey === previewKey && container.querySelector('.file-preview-body')) return;
        container.dataset.dshPreviewKey = previewKey;
        const lines = String(preview.content || '').split('\n');
        const numberedHtml = lines.map((line, i) =>
          `<div style="display:flex;gap:14px;"><span style="color:#64748b;user-select:none;width:28px;text-align:right;flex-shrink:0;">${i + 1}</span><span style="white-space:pre;">${esc(line)}</span></div>`
        ).join('');
        const previewBodyHtml = kind === 'image'
          ? `<div class="file-preview-body" style="padding:16px;background:#0f172a;min-height:calc(100% - 44px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
               <img src="${imagePreviewSrc(preview)}" alt="${esc(preview.name)}" style="max-width:100%;max-height:62vh;object-fit:contain;border-radius:8px;" />
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

      const listing = host.lastFsListing;
      const entries = listing?.entries || [];
      const loadingDir = fileLoading && fileLoading.hostId === host.hostId && !fileLoading.drawer;
      const rootCwd = listing?.rootCwd || fileProjectCwd;
      const activeSubDir = loadingDir ? (fileLoading.subDir || '') : (listing?.subDir || '');
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
          { id: 'dsh', label: '🟣 DeepSeek Harness (DSH)' },
          { id: 'antigravity-ide', label: '⚡ Antigravity IDE' },
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
      const text = document.getElementById('newTaskInput').value.trim();
      if (!text || !newTaskHostId) {
        showToast('请输入任务指令');
        return;
      }
      document.getElementById('newTaskInput').value = '';
      closeSheet('newTaskSheet');
      const engineName = newTaskHarness === 'antigravity-ide' ? 'Antigravity IDE' : 'DeepSeek Harness';
      showToast(`🚀 正在远程电脑 (${engineName}) 创建新任务...`);
      await dispatchHostCommand(newTaskHostId, {
        type: 'new_session',
        harness: newTaskHarness,
        cwd: newTaskCwd,
        title: text.slice(0, 28),
        prompt: text,
      });
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
        <button style="border:none;background:transparent;color:#64748b;font-size:18px;cursor:pointer;" onclick="closeSheet('taskActionSheet')">✕</button>
      `;
      document.getElementById('actionSheetBody').innerHTML = `
        <div style="margin-bottom:10px;display:flex;gap:6px;">
          <input id="renameInlineInput" value="${esc(s.title)}" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1;font-size:15px;outline:none;" />
          <button style="background:#2563eb;color:#fff;border:none;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer;" onclick="saveInlineRename()">保存标题</button>
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
      closeSheet('taskActionSheet');
      showToast('🔒 正在生成端到端加密回放链接...');
      const out = await dispatchHostCommand(actionTargetHostId, {
        type: 'share_session',
        agentId: actionTargetSession.id,
      });
      const cmdId = out?.command?.id;
      if (!cmdId) return;
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 600));
        const res = await (await apiFetch(`/api/commands/${encodeURIComponent(cmdId)}`)).json();
        if (res.ready && res.result?.shareUrl) {
          const fullUrl = res.result.shareUrl.startsWith('http')
            ? res.result.shareUrl
            : location.origin + res.result.shareUrl;
          navigator.clipboard?.writeText(fullUrl);
          showToast('🔗 加密链接已复制到剪贴板！');
          return;
        }
      }
      showToast('✅ 分享已生成，可在设置页查看');
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

    // ==================== 11. 设备与设置 Tab (双机状态看板 + 跨机迁移向导 + 密码管理) ====================
    function renderSettingsTab() {
      const hosts = hubState.hosts || [];
      const currentTk = getToken();
      const onboardingCmd = `git clone https://github.com/oscarka/deepseekharness-remotecontrol.git ~/deepseekharness-remote && cd ~/deepseekharness-remote && ./connect-host.sh "新电脑名称" "${currentTk}"`;

      document.getElementById('mainViewport').innerHTML = `
        <div class="settings-wrap">
          <div>
            <div class="settings-group-title">已接入电脑实时看板 (${hosts.length} 台设备)</div>
            <div class="host-visual-grid">
              ${hosts.map(h => `
                <div class="host-visual-card ${h.isFeishuActive ? 'active-feishu' : ''}">
                  <div class="host-visual-top">
                    <div>
                      <div style="font-size:15.5px;font-weight:700;display:flex;align-items:center;gap:6px;">
                        <span class="status-dot ${h.online ? '' : 'offline'}"></span>
                        <span>${esc(h.hostName)}</span>
                        <span style="font-size:11.5px;color:#64748b;font-weight:500;">(${esc(h.platform || 'macOS')} ${esc(h.arch || '')})</span>
                      </div>
                      <div style="font-size:11.5px;color:#64748b;margin-top:3px;">
                        🔒 指纹 ${esc(h.fingerprint || '已锁定')} · ${h.online ? '实时在线' : '离线 (' + formatTime(h.lastSeen) + ')'}
                      </div>
                    </div>
                    <button class="pill-action-btn ${h.isFeishuActive ? 'primary' : ''}" onclick="activateFeishuHost('${esc(h.hostId)}')">
                      ${h.isFeishuActive ? '🎯 飞书当前主控' : '切飞书到这台'}
                    </button>
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
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#475569;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--hairline);">
                    <span>⚡ 同步引擎：<strong>${esc(h.bridgeState?.turbo?.engineLabel || '🐢 标准轮询 (可升级)')}</strong></span>
                    <button class="pill-action-btn primary" style="padding:4px 10px;font-size:11.5px;" onclick="openTurboGuideSheet()">
                      ${h.bridgeState?.turbo?.enabled ? '⚡ 极速详情' : '🚀 一键提速'}
                    </button>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#475569;">
                    <span>飞书远程完成/异常卡片通知</span>
                    <button class="pill-action-btn ${h.remoteActive ? 'primary' : ''}" style="padding:4px 10px;font-size:11.5px;" onclick="toggleHostRemoteMode('${esc(h.hostId)}', ${!h.remoteActive})">
                      ${h.remoteActive ? '🔔 已开启' : '🔕 已关闭'}
                    </button>
                  </div>
                </div>
              `).join('') || `<div style="padding:24px;text-align:center;color:#94a3b8;">暂未检测到在线电脑</div>`}
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
                <button class="pill-action-btn" onclick="copyCodeText('${encodeURIComponent(onboardingCmd)}')">📋 复制专属命令</button>
              </div>
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
                <div id="pushDeviceList" style="margin-top:4px;font-size:12px;color:#64748b;line-height:1.55;"></div>
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
        </div>
      `;
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
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--subtle);text-align:center;font-weight:700;font-size:14px;">
            💻 ${esc(srcObj?.hostName || migSource)}
            <div style="font-size:11px;color:#64748b;font-weight:400;margin-top:2px;">源电脑</div>
          </div>
          <button class="pill-action-btn" onclick="swapMigrateHosts()">⇄ 互换</button>
          <div style="flex:1;padding:10px 12px;border-radius:12px;background:var(--primary-soft);border:1px solid #bfdbfe;text-align:center;font-weight:700;font-size:14px;color:var(--primary);">
            💻 ${esc(dstObj?.hostName || migTarget)}
            <div style="font-size:11px;color:#3b82f6;font-weight:400;margin-top:2px;">目标电脑</div>
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
            <div style="font-weight:700;font-size:15px;">🌐 全部电脑汇总</div>
            <div style="font-size:12.5px;color:#64748b;margin-top:2px;">一屏混排查看 ${hosts.length} 台电脑共 ${totalCount} 条会话</div>
          </div>
          <span style="font-size:13px;font-weight:600;color:#2563eb;">${currentHostId === 'ALL_HOSTS' ? '当前视图 ✓' : '切换 ›'}</span>
        </div>`,
        ...hosts.map(h => `
          <div class="host-option ${h.hostId === currentHostId ? 'selected' : ''}" onclick="selectHost('${esc(h.hostId)}')">
            <div>
              <div style="font-weight:700;font-size:15px;">${h.online ? '🟢' : '⚪'} ${esc(h.hostName)}</div>
              <div style="font-size:12.5px;color:#64748b;margin-top:2px;">${(h.bridgeState?.tasks || []).length} 条会话 · ${h.isFeishuActive ? '🎯 飞书当前主控' : (h.online ? '在线待命' : '离线')}</div>
            </div>
            <span style="font-size:13px;font-weight:600;color:#2563eb;">${h.hostId === currentHostId ? '当前设备 ✓' : '切换 ›'}</span>
          </div>
        `)
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

    function copyCodeText(encoded) {
      const text = decodeURIComponent(encoded);
      navigator.clipboard?.writeText(text);
      showToast('📋 已复制到剪贴板');
    }

    function openTurboGuideSheet() {
      const hosts = hubState.hosts || [];
      const currentTk = getToken();
      const body = document.getElementById('turboGuideBody');
      const oneStepCmd = `git clone https://github.com/oscarka/deepseekharness-remotecontrol.git ~/deepseekharness-remote && cd ~/deepseekharness-remote && ./connect-host.sh "电脑名称" "${currentTk}"`;

      body.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:#166534;line-height:1.5;">
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
                  <strong style="font-size:14px;">${h.online ? '🟢' : '⚪'} ${esc(h.hostName)}</strong>
                  <span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:${isTurbo ? '#dcfce7' : '#fef3c7'};color:${isTurbo ? '#15803d' : '#b45309'};">
                    ${esc(tb?.engineLabel || '🐢 标准轮询模式')}
                  </span>
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:8px;">
                  辅助功能遥控权限：${axOk ? '<span style="color:#16a34a;font-weight:600;">✅ 已授权 (支持 1ms 审批点击)</span>' : '<span style="color:#d97706;font-weight:600;">⚠️ 待开启或待升级</span>'}
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
          }).join('') || `<div style="padding:14px;text-align:center;color:#94a3b8;font-size:13px;">暂未检测到已接入的电脑</div>`}
        </div>

        <div class="form-label">2. 如何让手机遥控最流畅最快（3 步指南）</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12.5px;color:#334155;line-height:1.55;margin-bottom:14px;">
          <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
            <strong>① 一步命令接入（自动启用 Rust 加速 + 免二次安装）</strong><br/>
            新电脑只需运行一次 <code>./connect-host.sh</code>，脚本会自动寻找系统或 IDE 内置运行时、挂载 <code>dsh-turbo</code> 预编译 Rust 加速模块，并自动弹出 macOS 辅助功能授权框。<br/>
            <button class="pill-action-btn" style="margin-top:6px;font-size:11.5px;padding:4px 10px;" onclick="copyCodeText('${encodeURIComponent(oneStepCmd)}')">📋 复制一键满血接入命令</button>
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
            <strong>② 勾选 macOS「辅助功能」权限</strong><br/>
            若手机点审批时电脑未自动按下回车，点上方「🔓 在电脑弹出辅助功能授权框」，在电脑弹出的「系统设置 → 隐私与安全性 → 辅助功能」中打开开关即可。
          </div>
          <div style="padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid var(--border);">
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

    function applyHubState(nextState) {
      preservePreviewUiState(nextState);
      hubState = nextState;
    }
    async function fetchState() {
      try {
        const res = await apiFetch('/api/state');
        const data = await res.json();
        if (data.ok) {
          applyHubState(data);
          renderAll();
          flushPendingDeepLink();
          void ensureLocalPushSubscriptionSynced();
          return { ok: true };
        }
        return { ok: false, error: data.error || '服务端返回异常' };
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
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
      const url = '/api/events' + (tk ? '?token=' + encodeURIComponent(tk) : '');
      try {
        sseSource = new EventSource(url);
        sseSource.onopen = () => {
          sseConnected = true;
          lastSseEventAt = Date.now();
        };
        sseSource.onerror = () => {
          sseConnected = false;
        };
        sseSource.addEventListener('state', evt => {
          try {
            sseConnected = true;
            lastSseEventAt = Date.now();
            const data = JSON.parse(evt.data);
            if (data.ok) {
              applyHubState(data);
              renderAll();
              flushPendingDeepLink();
            }
          } catch {}
        });
      } catch {}
    }

    Object.assign(window, {
      getToken,
      authHeaders,
      apiFetch,
      submitAuthLogin,
      lockAndLogout,
      dismissLiveBanner,
      setPreviewMode,
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
      openChat,
      rawCloseChat,
      closeMobileChat,
      closeMobileFile,
      selectAgyApprovalOption,
      submitAgyApproval,
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
      setVoiceBtnRecording,
      isVoiceRecording,
      stopVoiceInput,
      toggleVoiceInput,
      sendPromptToActiveSession,
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
      applyHubState,
      fetchState,
      connectSSE,
    });

    setupOverlayGestures();
    setupChatScrollWatcher();
    setupInstallHint();
    fetchState();
    connectSSE();
    // 仅当 SSE 断开或超过 8s 未收到实时流时，才降级使用轮询兜底，避免双重刷新引起屏幕抖动
    setInterval(() => {
      if (!sseConnected || (Date.now() - lastSseEventAt > 8000)) {
        fetchState();
      }
    }, 3000);
}
