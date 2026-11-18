// Pure-algorithmic bilingual (ZH + EN + Mixed) Markdown-to-Speech pipeline
// Zero LLM · Zero API Key · Zero hardcoded jargon replacement dictionary

const DIGIT_ZH = {
  '0': '零', '1': '一', '2': '二', '3': '三', '4': '四',
  '5': '五', '6': '六', '7': '七', '8': '八', '9': '九',
};

const EN_ORDINALS = { 1: 'First,', 2: 'Second,', 3: 'Third,', 4: 'Fourth,', 5: 'Fifth,' };

const EN_STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'your', 'you', 'have', 'has', 'had',
  'was', 'were', 'are', 'been', 'into', 'when', 'just', 'only', 'also', 'than', 'then',
  'they', 'them', 'their', 'there', 'what', 'which', 'while', 'where', 'will', 'would',
  'should', 'could', 'about', 'after', 'before', 'because', 'under', 'over',
]);

const CJK_RE = /[\u4e00-\u9fa5]/;
const CJK_GLOBAL_RE = /[\u4e00-\u9fa5]/g;
const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]/gu;

function hasCjk(s) {
  return CJK_RE.test(String(s || ''));
}

function digitsBitByBitZh(s) {
  return String(s).split('').map(ch => DIGIT_ZH[ch] ?? ch).join('');
}

export function detectSpeechLang(rawMarkdown) {
  const prose = String(rawMarkdown || '').replace(/```[\s\S]*?```/g, '');
  const cjkSec = (prose.match(CJK_GLOBAL_RE) || []).length / 4.2;
  const enSec = (prose.match(/[a-zA-Z]{2,}/g) || []).length / 2.8;
  return cjkSec >= enSec ? 'zh' : 'en';
}

function inferLocalLang(prevCtx, nextCtx, docLang = 'zh') {
  const tight = `${String(prevCtx || '').slice(-7)} ${String(nextCtx || '').slice(0, 7)}`;
  const tightCjk = (tight.match(CJK_GLOBAL_RE) || []).length;
  const tightEn = (tight.match(/[a-zA-Z]{2,}/g) || []).length;
  if (tightEn >= 1 && tightCjk === 0) return 'en';
  if (tightCjk >= 1 && tightEn === 0) return 'zh';

  const win = `${prevCtx || ''} ${nextCtx || ''}`;
  const cjkSec = (win.match(CJK_GLOBAL_RE) || []).length / 4.2;
  const enSec = (win.match(/[a-zA-Z]{2,}/g) || []).length / 2.8;
  if (Math.abs(cjkSec - enSec) < 0.2) return docLang;
  return cjkSec > enSec ? 'zh' : 'en';
}

function splitIdentifierSubwords(token) {
  return String(token)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .split(/[_\-./:\\\s]+/)
    .filter(Boolean);
}

function extOf(filename) {
  const m = /(\.[a-zA-Z0-9]{1,6})$/.exec(String(filename || ''));
  return m ? m[1].toLowerCase() : '';
}

function mimeCategory(filename, lang) {
  const ext = extOf(filename);
  const zh = lang === 'zh';
  if (['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi'].includes(ext)) return { kind: 'video', label: zh ? '视频文件' : 'the video file' };
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic'].includes(ext)) return { kind: 'image', label: zh ? '图片文件' : 'the image file' };
  if (['.mp3', '.m4a', '.wav', '.aac', '.ogg'].includes(ext)) return { kind: 'audio', label: zh ? '音频文件' : 'the audio file' };
  if (['.yml', '.yaml', '.json', '.toml', '.ini', '.env'].includes(ext)) return { kind: 'config', label: zh ? '配置文件' : 'the config file' };
  if (['.md', '.txt', '.rst', '.pdf'].includes(ext)) return { kind: 'doc', label: zh ? '文档' : 'the doc file' };
  if (['.sh', '.bash', '.zsh'].includes(ext)) return { kind: 'script', label: zh ? '脚本' : 'the script' };
  if (['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java'].includes(ext)) return { kind: 'code', label: zh ? '代码文件' : 'the source file' };
  return { kind: '', label: '' };
}

function contextHasMimeKind(ctx, kind) {
  if (!kind) return false;
  if (kind === 'video') return /视频|\bvideo\b/i.test(ctx);
  if (kind === 'image') return /图片|出图|\b(?:image|photo|screenshot)\b/i.test(ctx);
  if (kind === 'audio') return /音频|语音|\baudio\b/i.test(ctx);
  if (kind === 'config') return /配置|\b(?:config|workflow|yaml)\b/i.test(ctx);
  if (kind === 'script') return /脚本|\bscript\b/i.test(ctx);
  if (kind === 'doc') return /文档|\bdoc\b/i.test(ctx);
  if (kind === 'code') return /代码|源文件|测试文件|\b(?:file|module|source|test)\b/i.test(ctx);
  return false;
}

export function verbalizeTokenUnified(rawToken, prevCtx = '', nextCtx = '', docLang = 'zh') {
  const t = String(rawToken || '')
    .replace(EMOJI_RE, '')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .trim();
  if (!t) return '';
  if (hasCjk(t)) return t.replace(/^[[\]()]+|[[\]()]+$/g, '').trim();

  const lang = inferLocalLang(prevCtx, nextCtx, docLang);
  const ctx = `${prevCtx} ${nextCtx}`;

  // 1. Secret prefixes / HTML comments / ellipsis masks
  if (/^(?:sk-|hst_|ghp_|xoxb-|<!--)/i.test(t) || /\.\.\.$/.test(t)) return '';

  // 2. IPv4 address
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(t)) {
    if (/IP|地址|\baddress\b/i.test(ctx)) return '';
    return lang === 'zh' ? '对应地址' : 'that IP address';
  }

  // 3. Semver (`v0.7.3`, `0.7.2`)
  const semver = /^v?(\d+)\.(\d+)\.(\d+)$/i.exec(t);
  if (semver) {
    if (lang === 'zh') {
      const zv = `${digitsBitByBitZh(semver[1])}点${digitsBitByBitZh(semver[2])}点${digitsBitByBitZh(semver[3])}`;
      return /版本/.test(ctx) ? zv : `${zv}版本`;
    }
    const ev = `${semver[1]}.${semver[2]}.${semver[3]}`;
    return /\b(?:version|release)\b/i.test(ctx) ? ev : `version ${ev}`;
  }

  // 4. Pure metrics / timestamps / HTTP codes (`00:12:31`, `504`, `< 20ms`, `350ms`, `32K`)
  if (/^[\d.,:%+\-~～/<>\s]+$/.test(t) || /^<?\s*\d[\d,.]*\s*[A-Za-z/]{1,8}$/.test(t)) {
    return t;
  }

  // 5. Multi-word space-separated inline code
  if (/\s/.test(t)) {
    if (/(?:^|\s)-{1,2}[a-zA-Z]|\b[A-Z0-9_]+=\S+|\s(?:&&|\|\||[|>])\s|\.[a-zA-Z]{2,4}\b/.test(t)) {
      if (/命令|\b(?:command|run|execute)\b/i.test(ctx)) return '';
      return lang === 'zh' ? '一段终端命令' : 'a terminal command';
    }
    const refMatch = /^(.+?)\s+#(\d+)$/.exec(t);
    if (refMatch) {
      const prefix = refMatch[1].trim();
      const num = refMatch[2];
      if (prefix.length <= 6 && !prefix.includes('-')) {
        return lang === 'zh' ? `${prefix} 第${num}号` : `${prefix} run ${num}`;
      }
      return lang === 'zh' ? `第${num}号任务` : `run number ${num}`;
    }
    const words = t.split(/\s+/);
    if (words.every(w => /^[A-Za-z0-9,.:;!?'\-()]+$/.test(w) && w.length <= 18)) {
      return t;
    }
    return '';
  }

  // 6. Hexadecimal commit hash / UUID (`c7fa535`, `776be0a`)
  if (
    /^[0-9a-f]{6,40}(?:-[0-9a-f]{4,12})+$/i.test(t) ||
    (/^[0-9a-f]{7,40}$/i.test(t) && /\d/.test(t) && /[a-f]/i.test(t))
  ) {
    if (/提交|哈希|\b(?:commit|hash|revision)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '某次提交' : 'that commit';
  }

  // 7. Environment variable (`UV_THREADPOOL_SIZE=4`, `ACC_PRODUCT_CONFIG_PATH`)
  if (/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+(?:=\S+)?$/.test(t) || /^[A-Z][A-Z0-9_]*=\S+$/.test(t)) {
    const eqVal = /=(\d+)$/.exec(t);
    if (/线程|配置|参数|变量|\b(?:thread|pool|variable|env|setting|limit)\b/i.test(ctx)) return '';
    if (eqVal) return lang === 'zh' ? `参数设为${eqVal[1]}` : `a setting of ${eqVal[1]}`;
    return lang === 'zh' ? '系统参数' : 'an environment variable';
  }

  // 8. CLI flag (`--workbuddy-login`, `-r`)
  if (/^-{1,2}[a-zA-Z0-9][\w-]*$/.test(t)) {
    if (/参数|选项|\b(?:flag|option)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '命令参数' : 'a CLI flag';
  }

  // 9. Runtime proper noun (`Node.js`, `Next.js`, `Vue.js`)
  const jsRuntime = /^([A-Z][a-zA-Z0-9]{1,8})\.js$/.exec(t);
  if (jsRuntime) return `${jsRuntime[1]} JS`;

  // 9b. HTML / JSX tag (`<video>`, `<iframe sandbox="...">`, `</div>`) — strip raw `< >` so SSML/TTS parsers never choke!
  const htmlTag = /^<\/?([a-zA-Z][a-zA-Z0-9:-]*)(?:\s[\s\S]*)?\/?>$/.exec(t);
  if (htmlTag) {
    const tagName = htmlTag[1];
    if (/标签|元素|组件|\b(?:tag|element)\b/i.test(ctx)) return tagName;
    return lang === 'zh' ? `${tagName}标签` : `the ${tagName} tag`;
  }

  // 10. File path, API route, or filename (only match real file extensions when there is no `/` so `video.src` / `res.ok` is not misread as a file)
  const KNOWN_FILE_EXTS = new Set([
    '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
    '.cs', '.rb', '.php', '.swift', '.kt', '.sh', '.bash', '.zsh', '.yml', '.yaml', '.json', '.jsonl',
    '.toml', '.ini', '.env', '.md', '.mdx', '.txt', '.rst', '.pdf', '.html', '.htm', '.css', '.scss',
    '.sql', '.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi', '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.svg', '.heic', '.ico', '.mp3', '.m4a', '.wav', '.aac', '.ogg', '.zip', '.tar', '.gz', '.tgz',
    '.dmg', '.pkg', '.plist', '.db', '.sqlite', '.lock', '.wasm', '.vue', '.svelte',
  ]);
  const tokenExt = extOf(t);
  if (t.includes('/') || KNOWN_FILE_EXTS.has(tokenExt)) {
    if (/^[A-Za-z0-9_-]+\/$/.test(t)) return t.slice(0, -1);
    const homeMatch = /^~\/([A-Za-z0-9_-]+)$/.exec(t);
    if (homeMatch) {
      if (lang === 'zh') return /目录|文件夹/.test(ctx) ? '' : '主目录文件夹';
      return /\b(?:folder|directory)\b/i.test(ctx) ? homeMatch[1] : `the ${homeMatch[1]} folder`;
    }
    const segs = t.split('/').filter(Boolean);
    if (
      t.startsWith('/api/') ||
      (t.startsWith('/') && segs.length <= 2 && segs[0] && !/^(?:users|home|var|tmp|opt|etc)$/i.test(segs[0]))
    ) {
      if (/接口|路由|\b(?:endpoint|route|channel)\b/i.test(ctx)) return '';
      return lang === 'zh' ? '后端接口' : 'the API endpoint';
    }
    if (t.startsWith('/') && !/\.[a-zA-Z][a-zA-Z0-9]{0,5}$/.test(t)) {
      if (/\bDocuments\b/.test(t)) return lang === 'zh' ? '系统文稿目录' : 'your Documents folder';
      return lang === 'zh' ? '对应目录' : 'that folder';
    }
    const base = segs.pop() || '';
    if (!base || base === '...') return '';
    const stem = base.replace(/\.[a-zA-Z][a-zA-Z0-9]{0,5}$/, '');
    const subwords = splitIdentifierSubwords(stem);
    const mime = mimeCategory(base, lang);

    if (!t.includes('/') && stem.length <= 8 && subwords.length <= 2 && !/\d{2,}/.test(stem)) {
      if (mime.label && contextHasMimeKind(ctx, mime.kind)) return stem;
      return mime.label ? (lang === 'zh' ? `${stem}${mime.label}` : `the ${stem} file`) : stem;
    }
    if (contextHasMimeKind(ctx, mime.kind)) return '';
    return mime.label || (lang === 'zh' ? '对应文件' : 'that file');
  }

  // 11. Function / method call `open()`, `probeVideoCompatibility()`, `window.speechSynthesis.speak(u)`
  if (/^[a-zA-Z_$][\w$]*\([^)]*\)$/.test(t)) {
    const fnName = t.slice(0, t.indexOf('('));
    if (fnName.length <= 7 && splitIdentifierSubwords(fnName).length === 1) return fnName;
    if (/函数|方法|\b(?:function|helper|method|handler)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '内部函数' : 'an internal helper';
  }
  if (/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+\([^)]*\)$/.test(t)) {
    if (/函数|方法|调用|\b(?:function|helper|method|call)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '对应方法' : 'that method call';
  }
  if (/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(t)) {
    const [objName, propName] = t.split('.');
    if (objName.length <= 6 && propName.length <= 6 && splitIdentifierSubwords(propName).length === 1) {
      return `${objName} ${propName}`;
    }
    if (/属性|字段|状态|\b(?:property|field|state)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '对应属性' : 'that property';
  }

  // 12. General identifier morphology
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  const vowels = (t.match(/[aeiouyAEIOUY]/g) || []).length;
  const subwords = splitIdentifierSubwords(t);
  const vowelRatio = letters > 0 ? vowels / letters : 0;

  if (t.includes('-')) {
    const parts = t.split('-').filter(Boolean);
    const maxAlpha = Math.max(0, ...parts.map(p => (/^[a-z]+$/i.test(p) ? p.length : 0)));
    const allLowerSlug = /^[a-z0-9.-]+$/.test(t) && maxAlpha >= 6;
    if (maxAlpha >= 11 || (lang === 'zh' && allLowerSlug)) {
      if (/电脑|主机|机器|目录|\b(?:host|machine|mac\w*|mini|laptop|server)\b/i.test(ctx)) return '';
      return '';
    }
    return parts.filter(p => !/^(?:instruct|preview|latest)$/i.test(p)).join(' ');
  }

  if (subwords.length >= 3 || t.length > 15) {
    if (/调|调用|\b(?:call|called|calling|invok\w*)\b/i.test(prevCtx)) {
      return lang === 'zh' ? '内部函数' : 'an internal helper';
    }
    if (/函数|方法|模块|逻辑|\b(?:function|helper|method|handler|module)\b/i.test(ctx)) return '';
    return lang === 'zh' ? '内部模块' : 'an internal handler';
  }

  if (letters >= 5 && vowelRatio < 0.15) return '';
  const sanitized = t.replace(/[<>{}[\]\\|^=]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return sanitized;
}

export function normalizeNSWUnified(input) {
  let s = String(input || '');

  // 1. Strip thousands commas (`50,000` -> `50000`) & convert `50000 Token` -> `5万 Token` in Chinese context
  s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  s = s.replace(/\b(\d+)0000(?=\s*[A-Za-z])/g, (m, n, offset, full) => {
    const near = full.slice(Math.max(0, offset - 12), offset + m.length + 12);
    return hasCjk(near) ? `${n}万` : m;
  });

  // 2. Wall-clock timestamps `00:12:31` or `18:40`
  s = s.replace(/\b(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\b(?!\s*(?:AM|PM|am|pm))/g, (m, h, min, sec, offset, full) => {
    const near = full.slice(Math.max(0, offset - 12), offset + m.length + 12);
    if (!hasCjk(near)) return m;
    const hStr = Number(h) === 0 ? '零' : String(Number(h));
    return sec !== undefined ? `${hStr}点${Number(min)}分${Number(sec)}秒` : `${hStr}点${Number(min)}分`;
  });

  // 3. Semver in plain text
  s = s.replace(/\bv?(\d+)\.(\d+)\.(\d+)\b/g, (m, a, b, c, offset, full) => {
    const near = full.slice(Math.max(0, offset - 10), offset + m.length + 10);
    return hasCjk(near) ? `${digitsBitByBitZh(a)}点${digitsBitByBitZh(b)}点${digitsBitByBitZh(c)}` : m;
  });

  // 4. Currency `¥0.0003 元`
  s = s.replace(/[¥￥]\s*(\d+(?:\.\d+)?)\s*元?/g, '$1元');

  // 5. Rate slash `/` ("每" / "per") BEFORE alternation slash ("或" / "or")
  s = s.replace(
    /(\d+(?:\.\d+)?\s*(?:万|千|百)?\s*(?:元|块|次|个|条|字|请求|Token|TPM|RPM|KB|MB|GB)?)\s*\/\s*(分钟|秒|小时|天|月|年|(?:千|万|百万)\s*(?:Token|字|次|条)|Token|字|次|人|台)/gi,
    '$1每$2'
  );
  s = s.replace(/(\$\d+(?:\.\d+)?|\b\d+\s*[A-Za-z]+)\s*\/\s*(1K\s+\w+|minute|second|hour|day|month)/gi, '$1 per $2');

  // 6. Units `< 20ms`, `350ms`, `0.32s`, `1.25x`
  const isZhMetric = (full, offset, len) => {
    const before = full.slice(Math.max(0, offset - 8), offset);
    const after = full.slice(offset + len, offset + len + 8);
    if (/[a-zA-Z]{2,}\s*$/.test(before) || /^\s*[a-zA-Z]{2,}/.test(after)) return false;
    return hasCjk(before + after);
  };

  s = s.replace(/<\s*(\d+(?:\.\d+)?)\s*ms\b/gi, (m, n, off, full) => (isZhMetric(full, off, m.length) ? `不到${n}毫秒` : `under ${n} milliseconds`));
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, (m, n, off, full) => (isZhMetric(full, off, m.length) ? `${n}毫秒` : `${n} milliseconds`));
  s = s.replace(/\b(\d+(?:\.\d+)?)\s*s\b/g, (m, n, off, full) => (isZhMetric(full, off, m.length) ? `${n}秒` : `${n} seconds`));
  s = s.replace(/\b(\d+(?:\.\d+)?)x\b/gi, (m, n, off, full) => (isZhMetric(full, off, m.length) ? `${n}倍速` : m));

  // 7. Issue / Run `#57`
  s = s.replace(/#(\d+)/g, (m, n, off, full) => (hasCjk(full.slice(Math.max(0, off - 8), off + m.length + 8)) ? `第${n}号` : `number ${n}`));

  // 8. Numeric ranges in Chinese context
  s = s.replace(
    /(\d+(?:\.\d+)?|[零一二两三四五六七八九十百千万点分秒]+)\s*[～~—–]\s*(\d+(?:\.\d+)?|[零一二两三四五六七八九十百千万点分秒]+)/g,
    '$1到$2'
  );

  // 9. Decimals in Chinese context (`0.32` -> `零点三二`, `Qwen2.5` -> `Qwen二点五`)
  s = s.replace(/(\d+)\.(\d+)/g, (m, ip, dp, off, full) => {
    if (!hasCjk(full.slice(Math.max(0, off - 10), off + m.length + 10))) return m;
    const left = ip.length === 1 ? (DIGIT_ZH[ip] ?? ip) : ip;
    return `${left}点${digitsBitByBitZh(dp)}`;
  });

  // 10. Mandarin `2` + measure word -> `两`, `0` + CJK -> `零`
  s = s.replace(/(?<!\d)2\s*(?=[个条项次台秒分钟步套种层道倍千百])/g, '两');
  s = s.replace(/(?<!\d)0\s*(?=[\u4e00-\u9fa5])/g, '零');

  // 11. Operators, `&`, arrows, remaining `/`
  s = s.replace(/\s*(?:→|->)\s*/g, (m, off, full) => (hasCjk(full.slice(Math.max(0, off - 10), off + m.length + 10)) ? '，然后' : ', then '));
  s = s.replace(/\s*&\s*/g, (m, off, full) => (hasCjk(full.slice(Math.max(0, off - 8), off + m.length + 8)) ? '和' : ' and '));
  s = s.replace(/([\u4e00-\u9fa5])\s*\/\s*([\u4e00-\u9fa5])/g, '$1或$2');
  s = s.replace(/\b([a-zA-Z]{2,})\s*\/\s*([a-zA-Z]{2,})\b/g, '$1 or $2');
  s = s.replace(/\b(?:the|a|an)\s+(the|a|an)\b/gi, '$1');

  return s;
}

function cleanInlineUnified(rawLine, docLang) {
  let line = String(rawLine || '').replace(/\*\*|~~/g, '');
  const slots = [];
  const stash = (val, wasDropped = false) => {
    const id = `\uE000${slots.length}\uE001`;
    slots.push({ val, wasDropped });
    return id;
  };

  // 1. Markdown links `[label](url)` BEFORE parenthetical pruning
  line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, _url, offset, full) => {
    const cleanLabel = label.replace(/^`+|`+$/g, '').trim();
    const prev = full.slice(Math.max(0, offset - 16), offset);
    const next = full.slice(offset + m.length, offset + m.length + 16);
    if (!hasCjk(cleanLabel) && (/^`/.test(label.trim()) || /[/_.]|[a-z][A-Z]/.test(cleanLabel))) {
      const res = verbalizeTokenUnified(cleanLabel, prev, next, docLang);
      return stash(res, res === '');
    }
    return stash(cleanLabel, false);
  });

  // 2. Unified Parenthetical Pruning `(...)` / `（...）`
  line = line.replace(/[（(]([^（）()]*)[)）]/g, (fullMatch, inner, offset, full) => {
    const trimmed = inner.trim();
    if (!trimmed) return '';
    const isCodeNoise =
      /[`=/_{}[\];]/.test(trimmed) ||
      /--[a-z]/i.test(trimmed) ||
      /^(?:v?\d+\.\d+(?:\.\d+)?|(?:commit\s+)?[0-9a-f]{7,40}|#\d+|\d{3}(?:\s+[A-Z][A-Za-z ]+)?|HTTP\s+\d{3})$/i.test(trimmed);
    if (isCodeNoise) return '';

    const prevChar = full.slice(Math.max(0, offset - 2), offset).trim();
    const enWordCount = (trimmed.match(/[a-zA-Z]+/g) || []).length;
    if (!hasCjk(trimmed) && hasCjk(prevChar) && enWordCount <= 3) {
      return '';
    }
    const localZh = hasCjk(trimmed) || hasCjk(prevChar);
    const after = full.slice(offset + fullMatch.length, offset + fullMatch.length + 3).trim();
    if (/^[:：里中上下内外的]/.test(after)) return ` ${trimmed} `;
    return localZh ? `，${trimmed}，` : `, ${trimmed}, `;
  });

  // 3. Multi-backtick inline snippet ```` ```code``` ````
  line = line.replace(/`{3,}([^`]+)`{3,}/g, (m, inner, offset, full) => {
    const cleanInner = inner.replace(/`/g, '').trim();
    const prev = full.slice(Math.max(0, offset - 16), offset);
    const next = full.slice(offset + m.length, offset + m.length + 16);
    const res = verbalizeTokenUnified(cleanInner, prev, next, docLang);
    return stash(res, res === '');
  });

  // 4. Inline code `` `...` ``
  line = line.replace(/`([^`]+)`/g, (m, code, offset, full) => {
    const prev = full.slice(Math.max(0, offset - 16), offset);
    const next = full.slice(offset + m.length, offset + m.length + 16);
    const res = verbalizeTokenUnified(code, prev, next, docLang);
    return stash(res, res === '');
  });

  // 5. Bare URLs & bare Unix paths
  line = line.replace(/https?:\/\/[^\s)）]+/g, (m, offset, full) => {
    const near = full.slice(Math.max(0, offset - 10), offset + m.length + 10);
    return stash(hasCjk(near) ? '网页链接' : 'a web link', false);
  });
  line = line.replace(/(?:^|[\s（(])(\/[A-Za-z0-9_./-]{4,}|~\/[A-Za-z0-9_./-]+)/g, (m, p1, offset, full) => {
    const lead = m.slice(0, m.length - p1.length);
    const prev = full.slice(Math.max(0, offset - 14), offset);
    const next = full.slice(offset + m.length, offset + m.length + 14);
    const res = verbalizeTokenUnified(p1, prev, next, docLang);
    return lead + stash(res, res === '');
  });

  // 5b. Strip inline HTML tags (`<summary>`, `</summary>`, `<br/>`, `<kbd>`) before token screening
  line = line.replace(/<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s[^<>]*)?\/?>/g, ' ');

  // 6. In Chinese-dominant prose, also screen bare technical tokens (`Node.js`, hex hashes, `UV_THREADPOOL_SIZE=4`)
  if (docLang === 'zh') {
    line = line.replace(/[a-zA-Z_][a-zA-Z0-9_./:-]{2,}/g, (m, offset, full) => {
      // Skip placeholder tokens
      if (m.includes('\uE000') || m.includes('\uE001')) return m;
      const prev = full.slice(Math.max(0, offset - 12), offset);
      const next = full.slice(offset + m.length, offset + m.length + 12);
      const res = verbalizeTokenUnified(m, prev, next, docLang);
      return stash(res, res === '');
    });
  }

  // 7. Restore stashed spans; repair `点 <dropped-dir> 里的` -> `点里面的`
  line = line.replace(/\uE000(\d+)\uE001(\s*[里中]的)?/g, (_m, idxStr, locSuffix) => {
    const slot = slots[Number(idxStr)];
    if (!slot) return locSuffix || '';
    if (!slot.val && slot.wasDropped && locSuffix) return '里面的';
    return `${slot.val}${locSuffix || ''}`;
  });

  // 8. NSW + formatting cleanup (ensure zero raw `< > { } [ ] \ | ^ =` code symbols reach OS TTS)
  line = normalizeNSWUnified(line);
  const circledMap = { '①': '第一，', '②': '第二，', '③': '第三，', '④': '第四，' };
  line = line.replace(/[①②③④]/g, m => circledMap[m] || '');
  line = line
    .replace(EMOJI_RE, '')
    .replace(/\*|`/g, '')
    .replace(/[<>{}[\]\\|^=]+/g, ' ')
    .replace(/[「」『』“”"]/g, ' ')
    .replace(/——/g, '，')
    .replace(/\s*—\s*/g, ', ')
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s*([，。！？；：、])\s*/g, '$1')
    .replace(/[，、]{2,}/g, '，')
    .replace(/[，、；]+([：。！？；])/g, '$1')
    .replace(/([：。！？；])[，、]+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,;:\s，、；：]+/, '')
    .trim();

  return line;
}

function ensurePunctUnified(s, docLang) {
  let out = String(s || '')
    .replace(/[,;:，、；：\s]+$/, '')
    .replace(/([。！？.!?])\s*[。！？，、；：,;:]+/g, '$1')
    .trim();
  if (!out) return '';
  const localZh = hasCjk(out) || docLang === 'zh';
  if (!/[.!?。！？]$/.test(out)) {
    out += localZh ? '。' : '.';
  }
  return out;
}

function formatCodeFenceLangLabel(rawLang, docLang) {
  const k = String(rawLang || '').trim().toLowerCase();
  if (!k) return '';
  const mapZh = {
    py: 'Python', python: 'Python',
    js: 'JavaScript', javascript: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'React',
    ts: 'TypeScript', typescript: 'TypeScript', tsx: 'React',
    sh: '终端命令', bash: '终端命令', zsh: '终端命令', shell: '终端命令', console: '终端命令',
    html: 'HTML', css: '样式', scss: '样式', sql: 'SQL',
    json: '配置', yaml: '配置', yml: '配置', toml: '配置',
    go: 'Go', rs: 'Rust', rust: 'Rust', java: 'Java', swift: 'Swift',
  };
  const mapEn = {
    py: 'Python', python: 'Python',
    js: 'JavaScript', javascript: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'React',
    ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TypeScript',
    sh: 'shell', bash: 'shell', zsh: 'shell', shell: 'shell',
    html: 'HTML', css: 'CSS', scss: 'SCSS', sql: 'SQL',
    json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
    go: 'Go', rs: 'Rust', rust: 'Rust', java: 'Java', swift: 'Swift',
  };
  return docLang === 'zh' ? (mapZh[k] || '') : (mapEn[k] || '');
}

function formatCodeFenceSpeechSummary(fenceState, docLang) {
  const lineCount = Math.max(0, Number(fenceState?.lineCount || 0));
  const langLabel = formatCodeFenceLangLabel(fenceState?.lang || '', docLang);
  if (docLang === 'zh') {
    if (lineCount >= 4) {
      return langLabel ? `这里附了一段代码，共${lineCount}行${langLabel}。` : `这里附了一段代码，共${lineCount}行。`;
    }
    return '这里附了一段代码。';
  }
  if (lineCount >= 4) {
    return langLabel
      ? `I've included a ${lineCount}-line ${langLabel} snippet below.`
      : `I've included a ${lineCount}-line code snippet below.`;
  }
  return "I've included a short code snippet below.";
}

export function parseUnifiedMarkdownForSpeech(rawMarkdown) {
  const docLang = detectSpeechLang(rawMarkdown);
  const lines = String(rawMarkdown || '').split(/\r?\n/);
  const blocks = [];
  let fenceState = null;
  let lastCodeLangLabel = null;
  let tableRows = [];
  let seenFirstParagraph = false;
  let justSawHeading = false;

  const flushTable = () => {
    if (!tableRows.length) return;
    const dataRows = tableRows.filter(r => !/^\s*\|?\s*[-:| ]+\s*\|?\s*$/.test(r));
    const count = Math.max(1, dataRows.length - 1);
    blocks.push({
      type: 'table_summary',
      text: docLang === 'zh' ? `这里附了一张${count}行的对比表。` : `There is a ${count}-row comparison table here.`,
    });
    tableRows = [];
  };

  const flushCodeFence = () => {
    if (!fenceState) return;
    const finished = fenceState;
    fenceState = null;
    const curLangLabel = formatCodeFenceLangLabel(finished.lang || '', docLang);
    if (lastCodeLangLabel === null || (curLangLabel && curLangLabel !== lastCodeLangLabel)) {
      blocks.push({
        type: 'code_summary',
        text: formatCodeFenceSpeechSummary(finished, docLang),
      });
      lastCodeLangLabel = curLangLabel || '';
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (fenceState) {
      // CommonMark §4.5: closing code fence must use >= opening fence length of same char and NO info string!
      const closeRe = new RegExp(`^\\${fenceState.char}{${fenceState.len},}\\s*$`);
      if (closeRe.test(trimmed)) {
        flushCodeFence();
      } else {
        if (trimmed) fenceState.lineCount += 1;
      }
      continue;
    }

    const openFence = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);
    // CommonMark §4.5: backtick fence info string cannot contain backticks (single-line ```foo``` is inline code!)
    if (openFence && !(openFence[1][0] === '`' && openFence[2].includes('`'))) {
      flushTable();
      const infoToken = openFence[2].trim().split(/\s+/)[0] || '';
      fenceState = {
        char: openFence[1][0],
        len: openFence[1].length,
        lang: infoToken,
        lineCount: 0,
      };
      continue;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      tableRows.push(trimmed);
      continue;
    }
    flushTable();

    if (!trimmed || /^---+$/.test(trimmed) || /^<details|^<\/details|^!\[/.test(trimmed)) {
      continue;
    }
    lastCodeLangLabel = null;

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const cleaned = cleanInlineUnified(headingMatch[2], docLang)
        .replace(/^[一二三四五六七八九十\d]+[、.．)\s]+/, '')
        .trim();
      if (cleaned) {
        blocks.push({ type: 'heading', text: ensurePunctUnified(cleaned, docLang) });
        justSawHeading = true;
      }
      continue;
    }

    const listNumMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
    let body = listNumMatch
      ? listNumMatch[2]
      : trimmed.replace(/^(?:[-*>•+]\s+)+/, '').replace(/^\[[ xX]\]\s+/, '');
    if (listNumMatch) {
      const n = Number(listNumMatch[1]);
      const useZhOrd = docLang === 'zh' && hasCjk(body);
      const ord = useZhOrd
        ? (n <= 9 ? `第${DIGIT_ZH[String(n)]}，` : `第${n}，`)
        : `${EN_ORDINALS[n] || `Item ${n},`} `;
      body = `${ord}${body}`;
    }

    const cleaned = cleanInlineUnified(body, docLang);
    if (!cleaned || cleaned.length < 2) continue;

    const isLead = !seenFirstParagraph;
    seenFirstParagraph = true;
    blocks.push({
      type: 'paragraph',
      text: ensurePunctUnified(cleaned, docLang),
      isLead,
      afterHeading: justSawHeading,
      isTail: false,
    });
    justSawHeading = false;
  }
  flushCodeFence();
  flushTable();

  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === 'paragraph') {
      blocks[i].isTail = true;
      break;
    }
  }
  return { docLang, blocks };
}

function extractBilingualGrams(text) {
  const lower = String(text || '').toLowerCase();
  const grams = new Set();
  const cjk = lower.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let i = 0; i < cjk.length - 1; i++) grams.add(cjk.slice(i, i + 2));
  for (const w of lower.match(/[a-z0-9]{3,}/g) || []) {
    if (EN_STOPWORDS.has(w)) continue;
    const stem = w.replace(/(?:ing|ed|es|s)$/, '');
    if (stem.length >= 3) grams.add(stem);
  }
  return grams;
}

export function estimateSpokenSeconds(text) {
  const s = String(text || '');
  const cjk = (s.match(CJK_GLOBAL_RE) || []).length;
  const enWords = (s.match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk / 4.2 + enWords / 2.8;
}

export function summarizeSpeechBlocksWithTextRank(blocks, docLang, { targetSeconds = 32 } = {}) {
  const sentences = [];
  blocks.forEach((b, blockIdx) => {
    if (b.type !== 'paragraph') return;
    const rawParts = b.text
      .split(/(?<=[。！？])|(?<=[.!?])\s+(?=[A-Z\u4e00-\u9fa5])/)
      .map(p => p.trim())
      .filter(Boolean);

    const merged = [];
    for (let i = 0; i < rawParts.length; i++) {
      if (estimateSpokenSeconds(rawParts[i]) < 1.8 && i + 1 < rawParts.length) {
        rawParts[i + 1] = `${rawParts[i]}${hasCjk(rawParts[i]) ? '' : ' '}${rawParts[i + 1]}`;
      } else {
        merged.push(rawParts[i]);
      }
    }

    merged.forEach((s, partIdx) => {
      const estSec = estimateSpokenSeconds(s);
      if (estSec < 1.5) return;
      let prior = 1.0;
      const isHeadline = Boolean(b.isLead && partIdx === 0);
      if (isHeadline) prior *= 2.4;
      if (b.isTail) prior *= 1.55;
      if (b.afterHeading && partIdx === 0) prior *= 1.25;
      if (/原因|结论|真相|总结|核心|关键|建议|破案|放心|不限|免费|查清楚|已经全部|彻底|也就是说|一句话|\b(?:root cause|fixed|resolved|good news|in short|that means|automatically|recovered)\b/i.test(s)) {
        prior *= 1.5;
      }
      sentences.push({
        idx: sentences.length,
        blockIdx,
        isHeadline,
        estSec,
        text: ensurePunctUnified(s, docLang),
        grams: extractBilingualGrams(s),
        prior,
      });
    });
  });

  const stripOrd = s =>
    String(s || '')
      .replace(/^第[一二三四五六七八九十\d]+，\s*/, '')
      .replace(/^(?:First|Second|Third|Fourth|Fifth|Item \d+),\s*/i, '')
      .trim();

  const N = sentences.length;
  if (N <= 3) return sentences.map(s => ensurePunctUnified(stripOrd(s.text), docLang));

  const weights = Array.from({ length: N }, () => new Float64Array(N));
  const rowSums = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const gi = sentences[i].grams;
      const gj = sentences[j].grams;
      if (!gi.size || !gj.size) continue;
      let ov = 0;
      for (const g of gi) if (gj.has(g)) ov++;
      if (ov > 0) {
        const sim = ov / (Math.log(gi.size + 1) + Math.log(gj.size + 1));
        weights[i][j] = sim;
        weights[j][i] = sim;
        rowSums[i] += sim;
        rowSums[j] += sim;
      }
    }
  }

  const priorSum = sentences.reduce((acc, s) => acc + s.prior, 0) || 1;
  let scores = sentences.map(s => s.prior / priorSum);
  const damping = 0.70;
  for (let iter = 0; iter < 15; iter++) {
    const next = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let incoming = 0;
      for (let j = 0; j < N; j++) {
        if (i !== j && rowSums[j] > 0) incoming += (weights[j][i] / rowSums[j]) * scores[j];
      }
      next[i] = (1 - damping) * (sentences[i].prior / priorSum) + damping * incoming;
    }
    scores = next;
  }

  const ranked = sentences.map((s, i) => ({ ...s, score: scores[i] })).sort((a, b) => b.score - a.score);
  const chosen = [];
  let secTotal = 0;

  const headline = sentences.find(s => s.isHeadline);
  if (headline) {
    chosen.push(headline);
    secTotal += headline.estSec;
  }

  for (const cand of ranked) {
    if (chosen.some(c => c.idx === cand.idx)) continue;
    if (chosen.length >= 5) break;
    if (secTotal + cand.estSec > targetSeconds && chosen.length >= 3) continue;
    const tooSimilar = chosen.some(sel => {
      let ov = 0;
      for (const g of cand.grams) if (sel.grams.has(g)) ov++;
      return cand.grams.size > 0 && ov / cand.grams.size > 0.56;
    });
    if (tooSimilar) continue;
    chosen.push(cand);
    secTotal += cand.estSec;
  }

  chosen.sort((a, b) => a.idx - b.idx);
  return chosen.map(c => ensurePunctUnified(stripOrd(c.text), docLang));
}

export function prepareSpeechScript(rawMarkdown) {
  const { docLang, blocks } = parseUnifiedMarkdownForSpeech(rawMarkdown);
  const joiner = docLang === 'zh' ? '' : ' ';
  const fullText = blocks.map(b => b.text).join(joiner).trim();
  const fullSec = estimateSpokenSeconds(fullText);

  if (fullSec <= 36 || blocks.filter(b => b.type === 'paragraph').length <= 3) {
    return {
      docLang,
      fullText,
      conciseText: fullText,
      hasDistinctSummary: false,
    };
  }

  const summarySentences = summarizeSpeechBlocksWithTextRank(blocks, docLang, { targetSeconds: 32 });
  const conciseText = summarySentences.join(joiner).trim() || fullText;
  const conciseSec = estimateSpokenSeconds(conciseText);
  const hasDistinctSummary = conciseText.length > 0 && conciseSec < fullSec * 0.82;

  return {
    docLang,
    fullText,
    conciseText: hasDistinctSummary ? conciseText : fullText,
    hasDistinctSummary,
  };
}

export function pickBestBrowserVoice(voices, docLang = 'zh') {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  if (docLang === 'en') {
    const enVoices = voices.filter(v => /^en/i.test(v.lang || ''));
    if (!enVoices.length) return null;
    return enVoices.sort((a, b) => {
      const score = v => {
        const n = `${v.name || ''} ${v.voiceURI || ''}`.toLowerCase();
        let s = /^en[-_]?us/i.test(v.lang || '') ? 50 : 25;
        if (/natural|neural|online|premium|enhanced|siri|ava|allison|aria|jenny|samantha/i.test(n)) s += 45;
        if (v.localService) s += 5;
        return s;
      };
      return score(b) - score(a);
    })[0];
  }

  const zhVoices = voices.filter(v => /^zh|^cmn/i.test(v.lang || ''));
  if (!zhVoices.length) return null;
  return zhVoices.sort((a, b) => {
    const score = v => {
      const n = `${v.name || ''} ${v.voiceURI || ''}`.toLowerCase();
      let s = /zh[-_]?cn|cmn[-_]?hans/i.test(v.lang || '') ? 50 : 20;
      if (/natural|neural|online|premium|enhanced|siri|xiaoxiao|yunxi|li-mu|yu-shu/i.test(n)) s += 45;
      if (/shelley|flo|sandy|reed|eddy/i.test(n)) s += 18;
      if (v.localService) s += 5;
      return s;
    };
    return score(b) - score(a);
  })[0];
}

function subdivideLongSpeechSentence(part, maxSec, maxChars) {
  const s = String(part || '').trim();
  if (!s) return [];
  if (estimateSpokenSeconds(s) <= maxSec && s.length <= maxChars) return [s];

  const semiParts = s.split(/(?<=[；;：:])\s*/).filter(Boolean);
  const stage1 = semiParts.length > 1 ? semiParts : [s];
  const out = [];
  for (const item of stage1) {
    if (estimateSpokenSeconds(item) <= maxSec && item.length <= maxChars) {
      out.push(item);
      continue;
    }
    const commaParts = item.split(/(?<=[，,、])\s*/).filter(Boolean);
    let cur = '';
    for (const cp of commaParts) {
      const candidate = cur ? `${cur} ${cp}`.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2') : cp;
      if (cur && (estimateSpokenSeconds(candidate) > maxSec || candidate.length > maxChars)) {
        out.push(cur.trim());
        cur = cp;
      } else {
        cur = candidate;
      }
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out.length ? out : [s];
}

export function splitIntoContinuousBrowserChunks(text, isAppleWebKit = false) {
  const clean = String(text || '').trim();
  if (!clean) return [];

  const langSwitches = (clean.match(/[\u4e00-\u9fa5]\s*[A-Za-z]|[A-Za-z]\s*[\u4e00-\u9fa5]/g) || []).length;
  // On Apple WebKit, moderate single-language prose plays seamlessly in 1 utterance;
  // for very long replies or code-heavy bilingual replies (10+ ZH<->EN switches), split at sentence boundaries so AVSpeechSynthesizer never stalls midway.
  if (isAppleWebKit && clean.length <= 520 && langSwitches < 10) {
    return [clean];
  }
  if (!isAppleWebKit && estimateSpokenSeconds(clean) <= 11 && clean.length <= 160) {
    return [clean];
  }

  // Chromium online neural voices hard-cut utterances around ~14-15s (~55 Chinese chars!); keep Chromium <= 11s and WebKit long/bilingual <= 30s.
  const maxSec = isAppleWebKit ? 30 : 11;
  const maxChars = isAppleWebKit ? 200 : 160;

  const rawSentences = clean.split(/(?<=[。！？.!?\n])\s*/).filter(Boolean);
  const parts = [];
  for (const rs of rawSentences) {
    parts.push(...subdivideLongSpeechSentence(rs, maxSec, maxChars));
  }

  const chunks = [];
  let buf = '';
  for (const p of parts) {
    const candidate = buf ? `${buf} ${p}`.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2') : p;
    if (buf && (estimateSpokenSeconds(candidate) > maxSec || candidate.length > maxChars)) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [clean];
}

export function snapToCleanSpeechOffset(fullText, rawOffset) {
  const text = String(fullText || '');
  if (!text) return 0;
  let idx = Math.max(0, Math.min(Math.floor(Number(rawOffset) || 0), text.length));
  if (idx <= 0) return 0;
  if (idx >= text.length) return text.length;

  // Never slice in the middle of an ASCII word or number (`Safari` -> walk back to `S`)
  while (idx > 0 && /[A-Za-z0-9]/.test(text[idx - 1]) && /[A-Za-z0-9]/.test(text[idx])) {
    idx -= 1;
  }
  // Advance past any leading punctuation/whitespace so TTS doesn't start on a stray comma
  while (idx < text.length && /^[，。！？；：、,.!?;:\s]/.test(text[idx])) {
    idx += 1;
  }
  return idx;
}

export function computeSpeechResumeOffset({
  fullText = '',
  docLang = 'zh',
  segmentBaseOffset = 0,
  segmentStartedAt = 0,
  segmentRate = 1,
  boundaryCharOffset = -1,
  boundaryUpdatedAt = 0,
  nowMs = Date.now(),
} = {}) {
  const text = String(fullText || '');
  if (!text) return 0;
  const rate = Number(segmentRate) > 0 ? Number(segmentRate) : 1;
  const charsPerSec = (docLang === 'en' ? 14.2 : 4.2) * rate;

  let estimatedOffset = Number(segmentBaseOffset) || 0;
  if (boundaryCharOffset >= 0 && boundaryUpdatedAt > 0) {
    // Hardware word-boundary cursor available; add gentle interpolation only if >900ms elapsed since last boundary
    const driftSec = Math.max(0, (nowMs - boundaryUpdatedAt) / 1000);
    const extraChars = driftSec > 0.9 ? Math.floor((driftSec - 0.4) * charsPerSec) : 0;
    estimatedOffset = boundaryCharOffset + extraChars;
  } else if (segmentStartedAt > 0) {
    // Fallback for mobile voices that do not emit `onboundary`: estimate from elapsed wall-clock time & rate
    const elapsedSec = Math.max(0, (nowMs - segmentStartedAt - 120) / 1000);
    const lookbackCushion = docLang === 'en' ? 6 : 2;
    const rawDelta = Math.floor(elapsedSec * charsPerSec);
    estimatedOffset = (Number(segmentBaseOffset) || 0) + (rawDelta > lookbackCushion ? rawDelta - lookbackCushion : rawDelta);
  }

  // Clamp at least a couple words before the end if still speaking
  const maxSafe = Math.max(0, text.length - (docLang === 'en' ? 5 : 2));
  const clamped = Math.min(estimatedOffset, maxSafe);
  return snapToCleanSpeechOffset(text, clamped);
}
