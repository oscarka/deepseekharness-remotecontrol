import { esc } from './format.ts';

export const IMAGE_FILE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|bmp|ico|avif|heic|heif)$/i;

export function isImageFileName(nameOrPath: string): boolean {
  return IMAGE_FILE_EXT_RE.test(String(nameOrPath || '').trim());
}

export interface FilePreviewRetryContext {
  hostId: string;
  agentId?: string;
  cwd?: string;
  relPath: string;
  inDrawer?: boolean;
  size?: number;
  backupRelPath?: string;
}

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
  backupStreamUrl?: string;
  hlsAvailable?: boolean;
  videoProbe?: {
    strategy?: string;
    codec?: string;
    avcProfile?: number | null;
    durationSec?: number;
    faststart?: boolean;
    universalDirectPlay?: boolean;
    reason?: string;
  } | null;
  _origImage?: boolean;
  _transcodeVideo?: boolean;
  _rawVideo?: boolean;
  _showInDrawer?: boolean;
  _showInMain?: boolean;
  _reloadNonce?: number;
  _imgStatus?: 'loading' | 'loaded' | 'error';
  _imgDims?: string;
  _loadError?: string;
  _retryContext?: FilePreviewRetryContext | null;
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
  } catch { }
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
    preview?: boolean;
    download?: boolean;
    raw?: boolean;
    mediaTicket?: string;
  } = {}
): string {
  const qp = new URLSearchParams({ path: String(relPath || '') });
  if (opts.cwd) qp.set('cwd', opts.cwd);
  if (opts.agentId) qp.set('agentId', opts.agentId);
  if (opts.thumb) qp.set('thumb', '1');
  if (opts.transcode) qp.set('transcode', '1');
  if (opts.preview) qp.set('preview', '1');
  if (opts.download) qp.set('download', '1');
  if (opts.raw) qp.set('raw', '1');
  const raw = `/api/hosts/${encodeURIComponent(hostId)}/fs/stream?${qp.toString()}`;
  return appendMediaAuth(raw, opts.mediaTicket || '');
}

// 文件预览统一按 kind 分流：错误给原位重试，图片走 <img>，视频走 <video>，文本才逐行编号，二进制给提示
export function previewKind(
  preview: FilePreviewData | null | undefined
): 'none' | 'error' | 'image' | 'video' | 'binary' | 'text' {
  if (!preview) return 'none';
  if (preview._loadError || preview.kind === 'error') return 'error';
  if (
    preview.kind === 'video' ||
    /\.(mp4|m4v|mov|webm|ogv|mkv|avi)$/i.test(preview.name || preview.relPath || '')
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

function buildPreviewImageStreamHref(rawStreamUrl: string, preview: FilePreviewData, mediaTicket = ''): string {
  const extLower = String(preview.ext || preview.name || preview.relPath || '').toLowerCase();
  const canThumb = !preview._origImage && !/\.(svg|gif)$/i.test(extLower);
  let url = rawStreamUrl;
  if (canThumb) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}thumb=1`;
  }
  if (preview._reloadNonce) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}_r=${encodeURIComponent(String(preview._reloadNonce))}`;
  }
  return appendMediaAuth(url, mediaTicket);
}

export function imagePreviewSrc(preview: FilePreviewData, mediaTicket = ''): string {
  if (preview.dataBase64) {
    return `data:${preview.mime || 'image/png'};base64,${preview.dataBase64}`;
  }
  if (preview.streamUrl) {
    return buildPreviewImageStreamHref(preview.streamUrl, preview, mediaTicket);
  }
  if (preview.previewUrl) {
    return appendMediaAuth(preview.previewUrl, mediaTicket);
  }
  return '';
}

export function backupImagePreviewSrc(preview: FilePreviewData, mediaTicket = ''): string {
  if (!preview?.backupStreamUrl) return '';
  return buildPreviewImageStreamHref(preview.backupStreamUrl, preview, mediaTicket);
}

export function videoPreviewSrc(preview: FilePreviewData, mediaTicket = ''): string {
  const raw = preview.streamUrl || preview.previewUrl || '';
  if (!raw) return '';
  const sep = raw.includes('?') ? '&' : '?';
  const withMode = preview._rawVideo
    ? `${raw}${sep}raw=1`
    : preview._transcodeVideo
      ? `${raw}${sep}transcode=1`
      : raw;
  return appendMediaAuth(withMode, mediaTicket);
}

export function videoHlsSrc(preview: FilePreviewData, mediaTicket = ''): string {
  if (!preview || preview.hlsAvailable === false || preview._transcodeVideo) return '';
  const raw = preview.streamUrl || '';
  if (!raw || !raw.includes('/fs/stream')) return '';
  const hlsBase = raw.replace('/fs/stream', '/fs/hls/index.m3u8');
  const sep = hlsBase.includes('?') ? '&' : '?';
  const withMode = preview._rawVideo ? `${hlsBase}${sep}raw=1` : hlsBase;
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

