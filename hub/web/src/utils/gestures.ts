export function composerUsesCoarsePointer(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

// 电脑上 Enter 发送、Shift+Enter 换行；手机上 Enter 换行，用「发送」按钮
export function shouldSendOnEnter({
  shiftKey,
  isComposing,
  coarsePointer,
}: {
  shiftKey?: boolean;
  isComposing?: boolean;
  coarsePointer?: boolean;
} = {}): boolean {
  if (isComposing) return false;
  if (shiftKey) return false;
  return !coarsePointer;
}

// 纯函数，便于单测：横向滑动是否足以触发返回
export function shouldDismissHorizontalSwipe({
  dx = 0,
  dy = 0,
  width = 375,
  durationMs = 1,
  minVelocity = 0.5,
}: {
  dx?: number;
  dy?: number;
  width?: number;
  durationMs?: number;
  minVelocity?: number;
} = {}): boolean {
  if (!(dx > 0)) return false;
  if (Math.abs(dy) > dx) return false;
  const threshold = Math.min(Math.max(90, (width || 375) * 0.28), 160);
  if (dx >= threshold) return true;
  return dx / Math.max(1, durationMs || 1) >= minVelocity;
}

// 纯函数，便于单测：纵向拖动是否足以关闭抽屉
export function shouldDismissVerticalSwipe({
  dy = 0,
  dx = 0,
  height = 480,
  durationMs = 1,
  minVelocity = 0.5,
}: {
  dy?: number;
  dx?: number;
  height?: number;
  durationMs?: number;
  minVelocity?: number;
} = {}): boolean {
  if (!(dy > 0)) return false;
  if (Math.abs(dx) > dy) return false;
  const threshold = Math.min(Math.max(80, (height || 480) * 0.2), 150);
  if (dy >= threshold) return true;
  return dy / Math.max(1, durationMs || 1) >= minVelocity;
}

