import { esc } from './format';

export interface FilePreviewData {
  at?: number;
  name?: string;
  ext?: string;
  relPath?: string;
  size?: number;
  kind?: string;
  mime?: string;
  dataBase64?: string;
  content?: string;
  hasBlob?: boolean;
  previewUrl?: string;
  streamUrl?: string;
  _origImage?: boolean;
  _transcodeVideo?: boolean;
  _showInDrawer?: boolean;
  _showInMain?: boolean;
}

export function appendMediaAuth(rawUrl: string, mediaTicket = ''): string {
  if (!rawUrl) return '';
  const mt =
    mediaTicket ||
    (typeof window !== 'undefined' && (window as any).getHubState?.()?.mediaTicket) ||
    '';
  if (mt) {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}mt=${encodeURIComponent(mt)}`;
  }
  let tk = '';
  try {
    tk = localStorage.getItem('dsh_hub_token') || '';
  } catch {}
  if (!tk) return rawUrl;
  const sep = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${sep}token=${encodeURIComponent(tk)}`;
}

export function buildFastStreamUrl(
  hostId: string,
  relPath: string,
  opts: {
    cwd?: string;
    agentId?: string;
    thumb?: boolean;
    transcode?: boolean;
    download?: boolean;
    mediaTicket?: string;
  } = {}
): string {
  const qp = new URLSearchParams({ path: String(relPath || '') });
  if (opts.cwd) qp.set('cwd', opts.cwd);
  if (opts.agentId) qp.set('agentId', opts.agentId);
  if (opts.thumb) qp.set('thumb', '1');
  if (opts.transcode) qp.set('transcode', '1');
  if (opts.download) qp.set('download', '1');
  const raw = `/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${qp.toString()}`;
  return appendMediaAuth(raw, opts.mediaTicket || '');
}

// 文件预览统一按 kind 分流：图片走 <img>，视频走 <video>，文本才逐行编号，二进制给提示
export function previewKind(
  preview: FilePreviewData | null | undefined
): 'none' | 'image' | 'video' | 'binary' | 'text' {
  if (!preview) return 'none';
  if (
    preview.kind === 'video' ||
    /\.(mp4|m4v|mov|webm|ogv)$/i.test(preview.name || preview.relPath || '')
  ) {
    return 'video';
  }
  if (
    preview.kind === 'image' &&
    (preview.dataBase64 || preview.streamUrl || preview.previewUrl || preview.hasBlob)
  ) {
    return 'image';
  }
  if (preview.kind === 'binary') return 'binary';
  return 'text';
}

export function imagePreviewSrc(preview: FilePreviewData, mediaTicket = ''): string {
  if (preview.dataBase64) {
    return `data:${preview.mime || 'image/png'};base64,${preview.dataBase64}`;
  }
  if (preview.streamUrl) {
    const extLower = String(preview.ext || preview.name || preview.relPath || '').toLowerCase();
    const isHeic = /\.(heic|heif)$/i.test(extLower);
    const canThumb =
      !preview._origImage &&
      !/\.(svg|gif)$/i.test(extLower) &&
      (isHeic || !preview.size || preview.size > 300 * 1024);
    const sep = preview.streamUrl.includes('?') ? '&' : '?';
    const base = canThumb ? `${preview.streamUrl}${sep}thumb=1` : preview.streamUrl;
    return appendMediaAuth(base, mediaTicket);
  }
  if (preview.previewUrl) {
    return appendMediaAuth(preview.previewUrl, mediaTicket);
  }
  return '';
}

export function videoPreviewSrc(preview: FilePreviewData, mediaTicket = ''): string {
  const raw = preview.streamUrl || preview.previewUrl || '';
  if (!raw) return '';
  const sep = raw.includes('?') ? '&' : '?';
  const withMode = preview._transcodeVideo ? `${raw}${sep}transcode=1` : raw;
  return appendMediaAuth(withMode, mediaTicket);
}

// 把 "src/lib/a.ts" 拆成 [{name:'src',path:'src'},{name:'lib',path:'src/lib'},...]
export function buildBreadcrumbSegments(subDir: string): Array<{ name: string; path: string }> {
  const clean = String(subDir || '').replace(/^\/+|\/+$/g, '');
  if (!clean) return [];
  const parts = clean.split('/').filter(Boolean);
  return parts.map((name, index) => ({
    name,
    path: parts.slice(0, index + 1).join('/'),
  }));
}

export function fileLoadingSpinnerHtml(text: string): string {
  return `<div style="padding:40px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#94a3b8;font-size:13.5px;">
    <div class="file-loading-dot"></div>
    <div>${esc(text)}</div>
  </div>`;
}

export {
  isHtmlFileName,
  escapeSrcdocAttr,
  resolveRelativeAssetPath,
  buildSandboxedHtmlSrcdoc,
} from './html-sandbox.js';

