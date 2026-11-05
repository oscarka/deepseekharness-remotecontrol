#!/usr/bin/env bash
set -euo pipefail

# dsh-turbo/enable-turbo.sh
# 自动检测/编译 Rust 原生加速模块，并检测/引导开启 macOS 辅助功能权限 (Accessibility)

TURBO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$TURBO_DIR/.." && pwd)"
BIN_DIR="$TURBO_DIR/bin"
NATIVE_BIN="$BIN_DIR/dsh-turbo-native"
SRC_FILE="$TURBO_DIR/src/main.rs"

mkdir -p "$BIN_DIR"

# 1. 如果本机装了 rustc 且二进制不存在或源码更新过，自动编译最新原生加速模块；否则直接使用仓库预置二进制
if [ ! -x "$NATIVE_BIN" ] || [ "$SRC_FILE" -nt "$NATIVE_BIN" ]; then
  if command -v rustc >/dev/null 2>&1; then
    echo "🦀 正在编译 Rust 原生极速加速模块 (dsh-turbo-native)..."
    rustc -O -C strip=symbols "$SRC_FILE" -o "$NATIVE_BIN" 2>/dev/null || true
    chmod +x "$NATIVE_BIN" 2>/dev/null || true
  fi
fi

if [ -x "$NATIVE_BIN" ]; then
  chmod +x "$NATIVE_BIN" 2>/dev/null || true
  echo "⚡ 已启用 Rust 原生加速引擎: $NATIVE_BIN"
  # 2. 自动检测 macOS 辅助功能权限；若未开启则立即弹出系统授权引导窗口
  AX_OUT="$("$NATIVE_BIN" check-ax 2>/dev/null || echo '{"trusted":true}')"
  if echo "$AX_OUT" | grep -q '"trusted":false'; then
    echo "🔓 检测到当前电脑尚未开启「辅助功能 (Accessibility)」遥控权限，正在为您自动弹出系统授权窗口..."
    "$NATIVE_BIN" prompt-ax >/dev/null 2>&1 || true
    echo "👉 请在弹出的「系统设置 → 隐私与安全性 → 辅助功能」中打开终端/守护进程开关，手机端即可毫秒级点击审批！"
  else
    echo "✅ macOS 辅助功能遥控权限已就绪 (Accessibility Trusted)"
  fi
else
  echo "⚡ 已启用 Node FSEvents 实时加速流模式"
fi
