import { esc } from './format';

export interface FilePreviewData {
  at?: number;
  name?: string;
  relPath?: string;
  size?: number;
  kind?: string;
  mime?: string;
  dataBase64?: string;
  content?: string;
  hasBlob?: boolean;
  previewUrl?: string;
  _showInDrawer?: boolean;
  _showInMain?: boolean;
}

// 文件预览统一按 kind 分流：图片走 <img>，文本才逐行编号，二进制给提示
export function previewKind(preview: FilePreviewData | null | undefined): 'none' | 'image' | 'binary' | 'text' {
  if (!preview) return 'none';
  if (preview.kind === 'image' && (preview.dataBase64 || preview.previewUrl || preview.hasBlob)) return 'image';
  if (preview.kind === 'binary') return 'binary';
  return 'text';
}

export function imagePreviewSrc(preview: FilePreviewData): string {
  if (preview.dataBase64) {
    return `data:${preview.mime || 'image/png'};base64,${preview.dataBase64}`;
  }
  if (preview.previewUrl) {
    let tk = '';
    try {
      tk = localStorage.getItem('dsh_hub_token') || '';
    } catch {}
    const sep = preview.previewUrl.includes('?') ? '&' : '?';
    return tk ? `${preview.previewUrl}${sep}token=${encodeURIComponent(tk)}` : preview.previewUrl;
  }
  return '';
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

