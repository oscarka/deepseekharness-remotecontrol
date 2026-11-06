import { esc } from './format';

// ---- 轻量 Markdown 渲染：标题 / 列表 / 引用 / 代码 / 链接 / 加粗 ----
// 只做「AI 回复更好读」所需的子集，全部先转义，链接只允许 http(s)。
export function renderInlineMarkdown(rawLine: string): string {
  let safe = esc(rawLine);
  const htmlBits: string[] = [];
  const stash = (html: string) => {
    htmlBits.push(html);
    return `\u0000PH${htmlBits.length - 1}\u0000`;
  };
  // 行内代码和链接先「藏起来」，避免里面的 * 被当成加粗/斜体
  safe = safe.replace(/`([^`\n]+)`/g, (_m, code) => stash(`<code>${code}</code>`));
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) =>
    stash(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
  );
  safe = safe
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^\s*](?:[^*\n]*[^\s*])?)\*/g, '<em>$1</em>');
  return safe.replace(/\u0000PH(\d+)\u0000/g, (_m, idx) => htmlBits[Number(idx)] || '');
}

export function renderMarkdownBlocks(rawBlock: string): string {
  const lines = String(rawBlock || '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const itemsHtml = list.items
      .map(item => `<li>${item.split('\n').map(renderInlineMarkdown).join('<br>')}</li>`)
      .join('');
    out.push(`<${list.type}>${itemsHtml}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    out.push(`<blockquote>${quote.map(renderInlineMarkdown).join('<br>')}</blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };
  const splitTableRow = (line: string) => {
    let text = line.trim();
    if (text.startsWith('|')) text = text.slice(1);
    if (text.endsWith('|')) text = text.slice(0, -1);
    return text.split('|').map(cell => cell.trim());
  };
  const isTableRow = (line: string) => Boolean(line) && line.includes('|') && line.trim() !== '';
  const isTableSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // 表格：表头 + |---|---| 分隔行
    if (isTableRow(line) && lineIndex + 1 < lines.length && isTableSep(lines[lineIndex + 1])) {
      flushAll();
      const headerCells = splitTableRow(line);
      const aligns = splitTableRow(lines[lineIndex + 1]).map(cell => {
        const left = cell.startsWith(':');
        const right = cell.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return '';
      });
      lineIndex += 1;
      const bodyRows: string[][] = [];
      while (
        lineIndex + 1 < lines.length &&
        isTableRow(lines[lineIndex + 1]) &&
        !isTableSep(lines[lineIndex + 1])
      ) {
        lineIndex += 1;
        bodyRows.push(splitTableRow(lines[lineIndex]));
      }
      const cellHtml = (tag: 'th' | 'td', text: string, index: number) => {
        const align = aligns[index] ? ` style="text-align:${aligns[index]};"` : '';
        return `<${tag}${align}>${renderInlineMarkdown(text || '')}</${tag}>`;
      };
      out.push(
        `<div class="md-table-wrap"><table><thead><tr>${headerCells
          .map((cell, index) => cellHtml('th', cell, index))
          .join('')}</tr></thead><tbody>${bodyRows
          .map(row => `<tr>${headerCells.map((_h, index) => cellHtml('td', row[index] || '', index)).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      );
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      out.push(`<div class="md-h${level}">${renderInlineMarkdown(heading[2])}</div>`);
      continue;
    }
    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushAll();
      out.push('<hr>');
      continue;
    }

    const quoted = /^\s{0,3}>\s?(.*)$/.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const ulItem = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
    const olItem = /^\s{0,3}\d+[.)]\s+(.*)$/.exec(line);
    if (ulItem || olItem) {
      flushParagraph();
      flushQuote();
      const type = ulItem ? 'ul' : 'ol';
      let item = (ulItem || olItem)![1];
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(item);
      if (task) item = `${task[1].toLowerCase() === 'x' ? '☑' : '☐'} ${task[2]}`;
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(item);
      continue;
    }

    // 列表项的续行（缩进 2 格以上）接到上一项里
    if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += '\n' + line.trim();
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }
  flushAll();
  return out.join('');
}

export function renderMarkdown(rawText: string): string {
  let text = String(rawText || '');
  // 流式输出时代码块可能还没收尾，先补一个结尾，避免整段变成纯文本
  if ((text.match(/```/g) || []).length % 2 === 1) text += '\n```';

  const chunks: string[] = [];
  const fence = /```([a-zA-Z0-9_+\-]*)\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text))) {
    if (match.index > cursor) chunks.push(renderMarkdownBlocks(text.slice(cursor, match.index)));
    const lang = match[1] || 'code';
    const code = match[2].replace(/\n$/, '');
    // encodeURIComponent 不转义单引号，手动替换，避免代码里的 ' 截断 onclick
    const encoded = encodeURIComponent(code).replace(/'/g, '%27');
    chunks.push(
      `<div class="code-card"><div class="code-card-header"><span>${esc(
        lang
      )}</span><button class="code-copy-btn" onclick="copyCodeText('${encoded}')">📋 复制</button></div><pre>${esc(
        code
      )}</pre></div>`
    );
    cursor = fence.lastIndex;
  }
  if (cursor < text.length) chunks.push(renderMarkdownBlocks(text.slice(cursor)));
  return chunks.join('');
}

export function formatAssistantText(rawText: string): string {
  return renderMarkdown(rawText);
}
