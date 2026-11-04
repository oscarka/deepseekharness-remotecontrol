#!/usr/bin/env bash
set -euo pipefail

# 默认使用你已部署好的 Google Cloud Run 总控中心地址
HUB_URL="${FEISHU_HUB_URL:-https://dsh-remotecontrol-hub-339795034470.us-central1.run.app}"
HUB_TOKEN="${FEISHU_HUB_TOKEN:-dsh-hub-prod-9f4e2a8c1b7d6e3f5a0c9b8e}"

# 第一参数可传电脑显示名称，例如: ./connect-host.sh "no2mini"
DEFAULT_NAME="$(scutil --get ComputerName 2>/dev/null || hostname -s 2>/dev/null || hostname)"
HOST_NAME="${1:-${FEISHU_HOST_NAME:-$DEFAULT_NAME}}"

# 生成唯一稳定的 Host ID（也可通过第二参数或环境变量指定）
RAW_HOST_ID="${2:-${FEISHU_HOST_ID:-$(hostname -s 2>/dev/null || hostname)}}"
HOST_ID="$(echo "$RAW_HOST_ID" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-_')"
if [ -z "$HOST_ID" ]; then
  HOST_ID="mac-$(date +%s)"
fi

DSH_DIR="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$DSH_DIR"

ENV_FILE="$DSH_DIR/feishu.env"

# 如果已有飞书 App 配置则保留
EXISTING_APP_ID=""
EXISTING_APP_SECRET=""
EXISTING_OPEN_IDS=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_APP_ID="$(grep -E '^FEISHU_APP_ID=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_APP_SECRET="$(grep -E '^FEISHU_APP_SECRET=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_OPEN_IDS="$(grep -E '^FEISHU_ALLOWED_OPEN_IDS=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
fi

install -m 600 /dev/null "$ENV_FILE"
cat > "$ENV_FILE" <<EOF
FEISHU_HOST_ID=${HOST_ID}
FEISHU_HOST_NAME=${HOST_NAME}
FEISHU_HUB_URL=${HUB_URL}
FEISHU_HUB_TOKEN=${HUB_TOKEN}
FEISHU_APP_ID=${FEISHU_APP_ID:-$EXISTING_APP_ID}
FEISHU_APP_SECRET=${FEISHU_APP_SECRET:-$EXISTING_APP_SECRET}
FEISHU_ALLOWED_OPEN_IDS=${FEISHU_ALLOWED_OPEN_IDS:-$EXISTING_OPEN_IDS}
EOF
chmod 600 "$ENV_FILE"

echo "✅ 已写入配置文件: $ENV_FILE"
echo "   - 电脑名称: $HOST_NAME ($HOST_ID)"
echo "   - 总控中心: $HUB_URL"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 自动探测 Node.js 运行时（优先使用系统 node，若无则直接使用 DeepSeek Harness.app 内置的 Node v24 运行时！）
NODE_BIN=""
USE_ELECTRON_NODE=0

for candidate in \
  "$(command -v node 2>/dev/null || true)" \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node" \
  "$HOME/.volta/bin/node" \
  "$HOME/.fnm/current/bin/node"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    NODE_BIN="$candidate"
    break
  fi
done

if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_NODE="$(ls -1d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | tail -n 1 || true)"
  if [ -n "$NVM_NODE" ] && [ -x "$NVM_NODE" ]; then
    NODE_BIN="$NVM_NODE"
  fi
fi

if [ -z "$NODE_BIN" ]; then
  for dsh_app_bin in \
    "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness" \
    "$HOME/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"; do
    if [ -x "$dsh_app_bin" ]; then
      NODE_BIN="$dsh_app_bin"
      USE_ELECTRON_NODE=1
      echo "🚀 使用 DeepSeek Harness.app 内置 Node.js 运行时: $NODE_BIN"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo "❌ 未找到 Node.js 或 DeepSeek Harness.app，请确认已安装 DeepSeek Harness 客户端"
  exit 1
fi

# 自动探测 dsh CLI（包括 DeepSeek Harness.app 内置的 dsh CLI）并注册插件
DSH_CLI="$(command -v dsh 2>/dev/null || true)"
if [ -z "$DSH_CLI" ]; then
  for dsh_cli_candidate in \
    "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
    "$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"; do
    if [ -x "$dsh_cli_candidate" ]; then
      DSH_CLI="$dsh_cli_candidate"
      break
    fi
  done
fi

if [ -n "$DSH_CLI" ]; then
  echo "🔌 正在向 DeepSeek Harness 注册 dsh-feishu 插件..."
  "$DSH_CLI" plugin --profile desktop add "$SCRIPT_DIR/dsh-feishu" >/dev/null 2>&1 || true
fi

# 停止旧的后台同步进程（如果有）
PID_FILE="$DSH_DIR/hub-daemon.pid"
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 0.5
  fi
fi

# 先执行一次同步验证
if [ "$USE_ELECTRON_NODE" = "1" ]; then
  ELECTRON_RUN_AS_NODE=1 "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once
  nohup env ELECTRON_RUN_AS_NODE=1 "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" > "$DSH_DIR/hub-daemon.log" 2>&1 &
else
  "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once
  nohup "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" > "$DSH_DIR/hub-daemon.log" 2>&1 &
fi
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo ""
echo "🎉 接入成功！后台守护进程已启动 (PID: ${NEW_PID}，日志: ${DSH_DIR}/hub-daemon.log)"
echo "👉 现在打开手机/电脑总控台即可看到【$HOST_NAME】并一键切换控制："
echo "   ${HUB_URL}/?token=${HUB_TOKEN}"
