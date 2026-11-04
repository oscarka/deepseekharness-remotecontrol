#!/usr/bin/env bash
set -euo pipefail

# 默认使用你已部署好的 Google Cloud Run 总控中心地址
HUB_URL="${FEISHU_HUB_URL:-https://dsh-hub.example.run.app}"
HUB_TOKEN="${FEISHU_HUB_TOKEN:-your-hub-token-here}"

# 第一参数可传电脑显示名称，例如: ./connect-host.sh "家里的 MacBook"
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

# 如果安装了 dsh CLI，自动挂载 dsh-feishu 插件
if command -v dsh >/dev/null 2>&1; then
  echo "🔌 检测到 dsh CLI，正在注册 dsh-feishu 插件..."
  dsh plugin --profile desktop add "$SCRIPT_DIR/dsh-feishu" >/dev/null 2>&1 || true
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
node "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once

# 启动后台常驻心跳守护进程
nohup node "$SCRIPT_DIR/dsh-feishu/daemon.mjs" > "$DSH_DIR/hub-daemon.log" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo ""
echo "🎉 接入成功！后台守护进程已启动 (PID: $NEW_PID，日志: $DSH_DIR/hub-daemon.log)"
echo "👉 现在打开手机/电脑总控台即可看到【$HOST_NAME】并一键切换控制："
echo "   ${HUB_URL}/?token=${HUB_TOKEN}"
