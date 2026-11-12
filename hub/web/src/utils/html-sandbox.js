// Isolated HTML sandbox helpers shared by Vite frontend and Node unit tests

export function isHtmlFileName(nameOrPath = '') {
  const clean = String(nameOrPath || '').split('?')[0].split('#')[0].trim();
  return /\.(html?|xhtml)$/i.test(clean);
}

export function escapeSrcdocAttr(rawHtml) {
  return String(rawHtml ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function resolveRelativeAssetPath(baseFilePath, assetRef) {
  const cleanRef = String(assetRef || '').split('#')[0].split('?')[0].trim();
  if (!cleanRef) return '';
  const normBase = String(baseFilePath || '').replace(/\\/g, '/').trim();
  const isAbs = normBase.startsWith('/');
  const baseParts = normBase.split('/').filter(Boolean);
  if (baseParts.length > 0) baseParts.pop(); // drop filename
  for (const seg of cleanRef.replace(/\\/g, '/').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (baseParts.length > 0) baseParts.pop();
    } else {
      baseParts.push(seg);
    }
  }
  return (isAbs ? '/' : '') + baseParts.join('/');
}

export function buildSandboxedHtmlSrcdoc(rawHtml, opts = {}) {
  let html = String(rawHtml || '');
  if (!html.trim()) return '<!doctype html><html><body></body></html>';

  // Ensure mobile responsive viewport when AI snippet omits <meta name="viewport">
  const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${viewportMeta}`);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html([^>]*)>/i, `<html$1><head>${viewportMeta}</head>`);
    } else {
      html = `<!doctype html><html><head><meta charset="utf-8">${viewportMeta}</head><body>${html}</body></html>`;
    }
  }

  // Rewrite relative local assets (./style.css, ./app.js, images) ONLY via read-only mediaTicket (never HUB_TOKEN!)
  if (opts.hostId && opts.mediaTicket) {
    const originPrefix = String(opts.origin || '').replace(/\/+$/, '');
    html = html.replace(
      /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi,
      (fullMatch, attrName, quote, rawVal) => {
        const trimmed = String(rawVal || '').trim();
        if (
          !trimmed ||
          /^(?:https?:|\/\/|data:|blob:|mailto:|tel:|javascript:|#|\/)/i.test(trimmed)
        ) {
          return fullMatch;
        }
        const resolvedPath = resolveRelativeAssetPath(opts.relPath || '', trimmed);
        if (!resolvedPath) return fullMatch;
        const qp = new URLSearchParams({ path: resolvedPath });
        if (opts.cwd) qp.set('cwd', opts.cwd);
        if (opts.agentId) qp.set('agentId', opts.agentId);
        qp.set('mt', opts.mediaTicket);
        const streamHref = `${originPrefix}/api/hosts/${encodeURIComponent(opts.hostId)}/fs/stream?${qp.toString()}`;
        return `${attrName}=${quote}${streamHref}${quote}`;
      }
    );
  }

  return html;
}

