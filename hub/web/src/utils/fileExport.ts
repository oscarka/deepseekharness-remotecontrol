import { esc } from './format.ts';

export const MARKDOWN_FILE_EXT_RE = /\.(md|markdown|mdx)$/i;

export function isMarkdownFileName(nameOrPath: string): boolean {
  return MARKDOWN_FILE_EXT_RE.test(String(nameOrPath || '').trim());
}

const EXPORT_MIME_MAP: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  // Videos
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  // Documents & structured text
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.mdx': 'text/markdown',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xhtml': 'application/xhtml+xml',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.json': 'application/json',
  '.jsonl': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.ts': 'text/plain',
  '.tsx': 'text/plain',
  '.jsx': 'text/plain',
  '.py': 'text/plain',
  '.go': 'text/plain',
  '.rs': 'text/plain',
  '.java': 'text/plain',
  '.kt': 'text/plain',
  '.swift': 'text/plain',
  '.c': 'text/plain',
  '.h': 'text/plain',
  '.cpp': 'text/plain',
  '.hpp': 'text/plain',
  '.sh': 'text/plain',
  '.bash': 'text/plain',
  '.zsh': 'text/plain',
  '.sql': 'text/plain',
  '.toml': 'text/plain',
  '.ini': 'text/plain',
  '.env': 'text/plain',
  '.conf': 'text/plain',
  // Office / archives / PDF
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function guessExportMimeByName(nameOrPath: string): string {
  const clean = String(nameOrPath || '').trim().split('?')[0].split('#')[0];
  const base = clean.split('/').filter(Boolean).pop() || clean;
  const dotIdx = base.lastIndexOf('.');
  if (dotIdx <= 0) return 'application/octet-stream';
  const ext = base.slice(dotIdx).toLowerCase();
  return EXPORT_MIME_MAP[ext] || 'application/octet-stream';
}

export function isTextLikeMime(mimeType: string): boolean {
  const clean = String(mimeType || '').split(';')[0].trim().toLowerCase();
  return (
    clean.startsWith('text/') ||
    clean === 'application/json' ||
    clean === 'application/xml' ||
    clean === 'application/xhtml+xml' ||
    clean === 'application/javascript'
  );
}

export function buildExportHtmlFileName(fileName: string): string {
  const safeBase = String(fileName || 'document.md').split('/').filter(Boolean).pop() || 'document.md';
  if (MARKDOWN_FILE_EXT_RE.test(safeBase)) {
    return safeBase.replace(MARKDOWN_FILE_EXT_RE, '.html');
  }
  return `${safeBase}.html`;
}

export function describeFileKindLabel(fileName: string, kind: string): string {
  const base = String(fileName || '').trim().toLowerCase();
  if (isMarkdownFileName(base)) return 'Markdown 文档';
  if (/\.(html?|xhtml)$/.test(base)) return 'HTML 网页';
  if (/\.(json|jsonl)$/.test(base)) return 'JSON 数据';
  if (/\.(csv|tsv)$/.test(base)) return '表格数据';
  if (/\.(ya?ml|toml|ini|env|conf)$/.test(base)) return '配置文件';
  if (/\.(txt|log)$/.test(base)) return '纯文本文档';
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|c|h|cpp|hpp|sh|bash|zsh|sql|css)$/.test(base)) {
    return '源码文件';
  }
  if (kind === 'image') return '图片文件';
  if (kind === 'video') return '视频文件';
  if (kind === 'binary') return '二进制文件';
  return '文本文件';
}

function stripInlineMarkdown(line: string): string {
  let out = String(line || '');
  // Remove plugin-card tags
  out = out.replace(/<plugin-card\b[^>]*>[\s\S]*?<\/plugin-card>/gi, '');
  // Images: ![alt](url) -> alt
  out = out.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_, alt) => (alt ? String(alt).trim() : ''));
  // Links: [label](url) -> keep URL only for real http(s) links, strip internal schemes/paths
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, rawLabel, rawHref) => {
    const label = String(rawLabel || '').trim();
    const href = String(rawHref || '').trim();
    if (/^https?:\/\//i.test(href)) {
      return !label || label === href ? href : `${label} (${href})`;
    }
    return label;
  });
  // Inline code: `code` -> code
  out = out.replace(/`([^`\n]+)`/g, '$1');
  // Bold / italic / strikethrough
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  out = out.replace(/__([^_\n]+)__/g, '$1');
  out = out.replace(/~~([^~\n]+)~~/g, '$1');
  out = out.replace(/(^|[\s(（【「『])\*([^*\n]+)\*(?=$|[\s.,!?;:）)】」』，。！？；：])/g, '$1$2');
  out = out.replace(/(^|[\s(（【「『])_([^_\n]+)_(?=$|[\s.,!?;:）)】」』，。！？；：])/g, '$1$2');
  // Unescape common markdown backslash escapes
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1');
  return out;
}

/**
 * Convert Markdown to clean, paste-ready plain text for WeChat / Notes / social posts.
 */
export function stripMarkdownToPlainText(markdown: string): string {
  const normalized = String(markdown || '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '';

  const lines = normalized.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Fenced code blocks: strip ``` markers, preserve code lines verbatim
    if (/^```/.test(trimmed) || /^~~~/.test(trimmed)) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock && out.length > 0 && out[out.length - 1] !== '') {
        out.push('');
      }
      continue;
    }
    if (inCodeBlock) {
      out.push(rawLine);
      continue;
    }

    // Horizontal rules
    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }

    // Markdown table separator rows (e.g. | :--- | :---: |)
    if (/^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed)) {
      continue;
    }

    // Markdown table data/header rows
    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => stripInlineMarkdown(c.trim()));
      out.push(cells.join(' | '));
      continue;
    }

    // Headings
    const headingMatch = /^#{1,6}\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const headingText = stripInlineMarkdown(headingMatch[1].replace(/\s+#+$/, '').trim());
      if (headingText) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        out.push(headingText);
      }
      continue;
    }

    // Blockquotes
    const quoteMatch = /^>\s?(.*)$/.exec(trimmed);
    if (quoteMatch) {
      const inner = quoteMatch[1].replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, '');
      out.push(stripInlineMarkdown(inner));
      continue;
    }

    // Task list items
    const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(rawLine);
    if (taskMatch) {
      const prefix = taskMatch[2].toLowerCase() === 'x' ? '☑ ' : '☐ ';
      out.push(`${taskMatch[1]}${prefix}${stripInlineMarkdown(taskMatch[3])}`);
      continue;
    }

    // Unordered list items
    const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(rawLine);
    if (bulletMatch) {
      out.push(`${bulletMatch[1]}• ${stripInlineMarkdown(bulletMatch[2])}`);
      continue;
    }

    // Ordered list items
    const orderedMatch = /^(\s*)(\d+[.)])\s+(.*)$/.exec(rawLine);
    if (orderedMatch) {
      out.push(`${orderedMatch[1]}${orderedMatch[2]} ${stripInlineMarkdown(orderedMatch[3])}`);
      continue;
    }

    out.push(stripInlineMarkdown(rawLine));
  }

  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Strip PocketAgents-specific interactive inline handlers so exported standalone HTML
 * opens cleanly offline in Safari, Chrome, and WeChat without missing global function errors.
 */
export function sanitizeExportedBodyHtml(renderedHtml: string): string {
  let html = String(renderedHtml || '');
  // Remove any script tags defensively
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  // Strip inline event handlers (onclick="...", onerror="...", onload="...")
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Replace javascript: hrefs
  html = html.replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"');
  // Remove PocketAgents inline copy buttons inside code blocks so exported doc stays clean
  html = html.replace(/<button\b[^>]*class="[^"]*\bmd-code-copy\b[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');
  return html;
}

export function buildStandaloneMarkdownHtml({
  title = 'Document',
  renderedBodyHtml = '',
  sourcePath = '',
  exportedAt = '',
}: {
  title?: string;
  renderedBodyHtml?: string;
  sourcePath?: string;
  exportedAt?: string;
}): string {
  const safeTitle = esc(String(title || 'Document'));
  const safePath = esc(String(sourcePath || ''));
  const safeDate = esc(
    String(
      exportedAt ||
        new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
    )
  );
  const cleanBody = sanitizeExportedBodyHtml(renderedBodyHtml);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --page-bg: #f8fafc;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --accent: #2563eb;
      --accent-soft: #eff6ff;
      --code-bg: #f1f5f9;
      --pre-bg: #0f172a;
      --pre-text: #f8fafc;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--page-bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
    }
    .doc-shell {
      max-width: 780px;
      margin: 20px auto;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 28px 32px 36px;
      box-shadow: 0 6px 24px rgba(15, 23, 42, 0.05);
    }
    .doc-meta-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px 12px;
      padding-bottom: 14px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .doc-meta-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      word-break: break-all;
    }
    .doc-meta-sub {
      font-size: 12px;
      color: var(--muted);
    }
    .md-article h1, .md-article h2, .md-article h3, .md-article h4 {
      color: var(--text);
      line-height: 1.38;
      margin: 1.35em 0 0.6em;
      font-weight: 700;
    }
    .md-article h1:first-child, .md-article h2:first-child { margin-top: 0; }
    .md-article h1 { font-size: 1.55em; }
    .md-article h2 { font-size: 1.28em; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
    .md-article h3 { font-size: 1.12em; }
    .md-article p { margin: 0.7em 0; word-break: break-word; }
    .md-article ul, .md-article ol { margin: 0.65em 0; padding-left: 1.5em; }
    .md-article li { margin: 0.3em 0; }
    .md-article blockquote, .md-article .md-quote {
      margin: 0.9em 0;
      padding: 12px 15px;
      border-left: 3.5px solid var(--accent);
      background: #f1f5f9;
      border-radius: 0 10px 10px 0;
      color: #1e293b;
    }
    .md-article code, .md-article .md-inline-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.88em;
      background: var(--code-bg);
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
    }
    .md-article pre, .md-article .md-code-block {
      background: var(--pre-bg);
      color: var(--pre-text);
      border-radius: 10px;
      overflow-x: auto;
      margin: 1em 0;
    }
    .md-article .md-code-head {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      font-size: 11.5px;
      color: #94a3b8;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .md-article pre {
      padding: 12px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
    }
    .md-article .md-code-block pre { margin: 0; border-radius: 0; }
    .md-article pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }
    .md-article table, .md-article .md-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 13.5px;
    }
    .md-article .md-table-wrap { overflow-x: auto; margin: 1em 0; }
    .md-article .md-table-wrap table { margin: 0; }
    .md-article th, .md-article td {
      border: 1px solid var(--border);
      padding: 8px 11px;
      text-align: left;
      vertical-align: top;
    }
    .md-article th {
      background: #f8fafc;
      font-weight: 700;
    }
    .md-article a {
      color: var(--accent);
      text-decoration: none;
    }
    .md-article a:hover { text-decoration: underline; }
    .md-article .md-file-chip,
    .md-article .md-plugin-chip,
    .md-article .md-sidecar-chip,
    .md-article .md-conv-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #1d4ed8;
      font-size: 0.9em;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      vertical-align: baseline;
    }
    .md-article hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 1.5em 0;
    }
    .md-article img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    @media (max-width: 640px) {
      body { background: var(--bg); }
      .doc-shell {
        margin: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        padding: 18px 16px 28px;
      }
    }
    @media print {
      @page { margin: 15mm; }
      body { background: #ffffff; font-size: 11pt; }
      .doc-shell {
        margin: 0;
        max-width: none;
        border: none;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }
      .md-article h1, .md-article h2, .md-article h3 { break-after: avoid; }
      .md-article blockquote, .md-article .md-quote, .md-article pre, .md-article .md-code-block, .md-article tr {
        break-inside: avoid;
      }
      .md-article pre, .md-article .md-code-block {
        background: #f8fafc;
        color: #0f172a;
        border: 1px solid #cbd5e1;
      }
    }
  </style>
</head>
<body>
  <main class="doc-shell">
    <header class="doc-meta-header">
      <span class="doc-meta-title">📄 ${safeTitle}</span>
      <span class="doc-meta-sub">${safePath && safePath !== title ? `${safePath} · ` : ''}导出时间 ${safeDate}</span>
    </header>
    <article class="md-article">
      ${cleanBody}
    </article>
  </main>
</body>
</html>`;
}
