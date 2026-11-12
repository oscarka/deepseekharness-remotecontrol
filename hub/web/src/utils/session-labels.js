function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHarnessBadgeHtml(harness = 'dsh', variant = 'row', titleText = '') {
  const symId =
    harness === 'antigravity-ide'
      ? 'dsh-icon-ide'
      : harness === 'workbuddy'
        ? 'dsh-icon-workbuddy'
        : harness === 'codex'
          ? 'dsh-icon-codex'
          : harness === 'claude'
            ? 'dsh-icon-claude'
            : harness === 'doubao'
              ? 'dsh-icon-doubao'
              : 'dsh-icon-dsh';
  const titleAttr = titleText ? ` title="${escapeAttr(titleText)}"` : '';
  return `<span class="harness-icon-badge ${escapeAttr(variant)}"${titleAttr}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><use href="#${symId}"/></svg></span>`;
}

export function stripRedundantProjectPrefix(rawTitle, rawProject) {
  const title = String(rawTitle || '').trim();
  const project = String(rawProject || '').trim();
  if (!title || !project) return title;
  const prefix = `${project} / `;
  if (title.startsWith(prefix)) {
    return title.slice(prefix.length).trim() || title;
  }
  return title;
}

export function formatCompactProjectLabel(rawProject, nowDate = new Date()) {
  const raw = String(rawProject || '').trim();
  if (!raw) return '默认工作区';
  const m = /^(\d{4})[-_](\d{1,2})[-_](\d{1,2})(?:[-_T](\d{1,2})[-_:](\d{2})(?:[-_:](\d{2}))?)?$/.exec(raw);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y >= 2020 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const isSameYear = nowDate.getFullYear() === y;
      const isSameDay = isSameYear && nowDate.getMonth() + 1 === mo && nowDate.getDate() === d;
      const hasTime = m[4] != null && m[5] != null;
      const mmdd = `${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
      if (isSameDay && hasTime) {
        return `${Number(m[4])}:${String(m[5]).padStart(2, '0')}`;
      }
      const hhmmPadded = hasTime
        ? `${String(Number(m[4])).padStart(2, '0')}:${String(m[5]).padStart(2, '0')}`
        : '';
      if (isSameYear) {
        return hasTime ? `${mmdd} ${hhmmPadded}` : mmdd;
      }
      return hasTime ? `${y}/${mmdd} ${hhmmPadded}` : `${y}/${mmdd}`;
    }
  }
  return raw;
}

export function normalizeDeviceModelShort(rawModel, { compact = false } = {}) {
  const clean = String(rawModel || '').trim();
  if (!clean) return '';
  if (/^macbook[\s-]*air\b/i.test(clean)) return 'Air';
  if (/^macbook[\s-]*pro\b/i.test(clean)) return 'MBP';
  if (/^mac[\s-]*mini\b/i.test(clean)) return compact ? 'Mini' : 'Mac mini';
  if (/^mac[\s-]*studio\b/i.test(clean)) return 'Studio';
  if (/^mac[\s-]*pro\b/i.test(clean)) return compact ? 'Pro' : 'Mac Pro';
  if (/^imac\b/i.test(clean)) return 'iMac';
  return clean;
}

export function buildShortHostNameMap(hosts = []) {
  const parsed = (hosts || []).map(h => {
    const raw = String(h?.hostName || h?.hostId || '')
      .trim()
      .replace(/\.(local|lan)$/i, '');
    let owner = '';
    let device = raw;
    const zhSplit = /^(.+?)的\s*(.+)$/.exec(raw);
    const enSplit = !zhSplit ? /^(.+?)(?:'s|’s)\s+(.+)$/i.exec(raw) : null;
    if (zhSplit) {
      owner = zhSplit[1].trim();
      device = zhSplit[2].trim();
    } else if (enSplit) {
      owner = enSplit[1].trim();
      device = enSplit[2].trim();
    } else {
      const slugMac =
        /^([a-z0-9_-]+?)(?:-|de)(MacBook[- ]?Air|MacBook[- ]?Pro|Mac[- ]?mini|Mac[- ]?Studio|iMac|Mac[- ]?Pro)$/i.exec(
          raw,
        );
      if (slugMac) {
        owner = slugMac[1].trim();
        device = slugMac[2].replace(/-/g, ' ').trim();
      }
    }
    let shortBase = '';
    let compactBase = '';
    if (/^(电脑|pc|computer|laptop|host)$/i.test(device) && owner) {
      shortBase = owner;
      compactBase = owner;
    } else {
      shortBase = normalizeDeviceModelShort(device, { compact: false }) || raw;
      compactBase = normalizeDeviceModelShort(device, { compact: true }) || shortBase;
    }
    return {
      hostId: h?.hostId || raw,
      raw,
      owner,
      shortBase,
      compactBase,
    };
  });

  const baseCounts = {};
  for (const item of parsed) {
    baseCounts[item.compactBase] = (baseCounts[item.compactBase] || 0) + 1;
  }

  const provisional = parsed.map(item => {
    if (baseCounts[item.compactBase] > 1 && item.owner) {
      const cleanOwner = item.owner.length > 6 ? item.owner.slice(0, 6) : item.owner;
      return { ...item, label: `${cleanOwner}·${item.compactBase}` };
    }
    return { ...item, label: item.shortBase };
  });

  const labelCounts = {};
  for (const item of provisional) {
    labelCounts[item.label] = (labelCounts[item.label] || 0) + 1;
  }

  const map = {};
  for (const item of provisional) {
    if (labelCounts[item.label] > 1 && item.owner.length > 6) {
      const tailOwner = `${item.owner.slice(0, 4)}…${item.owner.slice(-1)}`;
      map[item.hostId] = `${tailOwner}·${item.compactBase}`;
    } else {
      map[item.hostId] = item.label;
    }
  }
  return map;
}

/**
 * Compute session list sort priority:
 * 1. Pinned (`pinned: true`) always stays fixed at the very top of the list (10 + base state priority)
 * 2. Needs Approval / Choice (`status === 'approval'`) -> 4
 * 3. Unread Conclusion / Unread Interrupted (`hasUnreadConclusion || isUnreadInterrupted`) -> 3
 * 4. Actively Running / Queued (`status === 'running' || queuedCount > 0`) -> 2
 * 5. Read / Idle historical conversations -> 0 (sorted by `updatedAt` desc)
 */
export function computeSessionSortPriority(s) {
  if (!s) return 0;
  let base = 0;
  if (s.status === 'approval') base = 4;
  else if (s.hasUnreadConclusion || s.isUnreadInterrupted) base = 3;
  else if (s.status === 'running' || (Number(s.queuedCount) || 0) > 0) base = 2;
  return s.pinned ? 10 + base : base;
}

export function sortNormalizedSessions(list = []) {
  return [...list].sort((a, b) => {
    const pa = computeSessionSortPriority(a);
    const pb = computeSessionSortPriority(b);
    if (pa !== pb) return pb - pa;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

export const HARNESS_CAPABILITY_MATRIX = [
  {
    id: 'dsh',
    label: 'DSH',
    canView: true,
    canPrompt: true,
    canStop: true,
    approveState: 'supported',
    canSteer: true,
  },
  {
    id: 'antigravity-ide',
    label: 'Antigravity IDE',
    canView: true,
    canPrompt: true,
    canStop: true,
    approveState: 'supported',
    canSteer: true,
  },
  {
    id: 'codex',
    label: 'Codex',
    canView: true,
    canPrompt: true,
    canStop: true,
    approveState: 'supported',
    canSteer: true,
  },
  {
    id: 'workbuddy',
    label: 'WorkBuddy',
    canView: true,
    canPrompt: true,
    canStop: true,
    approveState: 'supported',
    canSteer: true,
  },
  {
    id: 'claude',
    label: 'Claude Code',
    canView: true,
    canPrompt: true,
    canStop: true,
    approveState: 'planned',
    canSteer: false,
  },
  {
    id: 'doubao',
    label: '豆包电脑版',
    canView: true,
    canPrompt: false,
    canStop: false,
    approveState: 'unsupported',
    canSteer: false,
  },
];

export function renderCapabilityMatrixRowsHtml(rows = HARNESS_CAPABILITY_MATRIX) {
  return rows
    .map((row, idx) => {
      const borderStyle = idx < rows.length - 1 ? ' style="border-bottom:1px solid var(--hairline);"' : '';
      const viewCell = row.canView ? '<td>✅</td>' : '<td style="color:var(--muted);">—</td>';
      const promptCell = row.canPrompt ? '<td>✅</td>' : '<td style="color:var(--muted);">—</td>';
      const stopCell = row.canStop ? '<td>✅</td>' : '<td style="color:var(--muted);">—</td>';
      const approveCell =
        row.approveState === 'supported'
          ? '<td>✅</td>'
          : row.approveState === 'planned'
            ? '<td style="color:var(--muted);">计划中</td>'
            : '<td style="color:var(--muted);">—</td>';
      const steerCell = row.canSteer ? '<td>✅</td>' : '<td style="color:var(--muted);">—</td>';
      return `<tr${borderStyle}>
                    <td style="text-align:left;padding:7px 4px;font-weight:700;"><span style="display:inline-flex;align-items:center;gap:6px;">${renderHarnessBadgeHtml(row.id, 'inline')}<span>${escapeAttr(row.label)}</span></span></td>
                    ${viewCell}${promptCell}${stopCell}${approveCell}${steerCell}
                  </tr>`;
    })
    .join('\n');
}
