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
