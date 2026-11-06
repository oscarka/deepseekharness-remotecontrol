export function esc(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 清洗列表第二行摘要中的原始 Markdown 符号（**、##、`、[链接]），让摘要像原生 App 一样干净
export function cleanPreviewText(raw: unknown): string {
  return String(raw || '')
    .replace(/```[\s\S]*?```/g, '[代码片段] ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTime(ts: unknown): string {
  if (!ts) return '';
  const num = typeof ts === 'number' ? ts : Date.parse(String(ts));
  if (!Number.isFinite(num) || num <= 0) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - num) / 1000));
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + ' 分钟前';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + ' 小时前';
  if (diffSec < 86400 * 30) return Math.floor(diffSec / 86400) + ' 天前';
  const d = new Date(num);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatBytes(bytes: unknown): string {
  const b = Number(bytes) || 0;
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function isIosDevice(): boolean {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ 的 Safari 会把自己伪装成 Mac
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
}

export function isStandaloneApp(): boolean {
  if ((navigator as any).standalone === true) return true;
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function isIosDeviceForHint(): boolean {
  return isIosDevice();
}

export function isStandaloneForHint(): boolean {
  return isStandaloneApp();
}

export function shouldShowInstallHint({
  isIos,
  isStandalone,
  dismissed,
}: {
  isIos?: boolean;
  isStandalone?: boolean;
  dismissed?: boolean;
} = {}): boolean {
  return Boolean(isIos) && !isStandalone && !dismissed;
}
