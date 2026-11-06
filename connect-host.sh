#!/usr/bin/env bash
set -euo pipefail

# 清理 IDE 终端可能注入的临时沙箱代理或单次 RPC 覆盖变量，确保守护进程直连云端与本机 LanguageServer
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
  RPC_PROXY_DEST_OVERRIDE RPC_PROXY_HEADER_AS_EXTENSION \
  ANTIGRAVITY_LS_ADDRESS ANTIGRAVITY_CSRF_TOKEN 2>/dev/null || true

# 默认总控中心地址（可通过环境变量 FEISHU_HUB_URL 覆盖）
HUB_URL="${FEISHU_HUB_URL:-https://dsh-remotecontrol-hub-339795034470.us-central1.run.app}"

DSH_DIR="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$DSH_DIR"

ENV_FILE="$DSH_DIR/feishu.env"

# 读取本机已有的配置（如果之前已配置过密钥或电脑名则自动复用）
EXISTING_TOKEN=""
EXISTING_HOST_ID=""
EXISTING_HOST_NAME=""
EXISTING_APP_ID=""
EXISTING_APP_SECRET=""
EXISTING_OPEN_IDS=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_TOKEN="$(grep -E '^FEISHU_HUB_TOKEN=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_HOST_ID="$(grep -E '^FEISHU_HOST_ID=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_HOST_NAME="$(grep -E '^FEISHU_HOST_NAME=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_APP_ID="$(grep -E '^FEISHU_APP_ID=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_APP_SECRET="$(grep -E '^FEISHU_APP_SECRET=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_OPEN_IDS="$(grep -E '^FEISHU_ALLOWED_OPEN_IDS=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
fi

# 支持 --name / --token / --id 具名参数与位置参数两种调用方式
POS_ARGS=()
OPT_NAME=""
OPT_TOKEN=""
OPT_ID=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name)
      OPT_NAME="${2:-}"
      shift 2 || shift
      ;;
    --token)
      OPT_TOKEN="${2:-}"
      shift 2 || shift
      ;;
    --id)
      OPT_ID="${2:-}"
      shift 2 || shift
      ;;
    *)
      POS_ARGS+=("$1")
      shift
      ;;
  esac
done

# 第一参数：电脑显示名称，例如 ./connect-host.sh "no2mini" "你的访问密钥"
DEFAULT_NAME="$(scutil --get ComputerName 2>/dev/null || hostname -s 2>/dev/null || hostname)"
if [ "$EXISTING_HOST_NAME" = "--name" ]; then EXISTING_HOST_NAME=""; fi
if [ "$EXISTING_HOST_ID" = "--id" ]; then EXISTING_HOST_ID=""; fi
HOST_NAME="${OPT_NAME:-${POS_ARGS[0]:-${FEISHU_HOST_NAME:-${EXISTING_HOST_NAME:-$DEFAULT_NAME}}}}"

# 第二参数（可选）：总控台访问密钥 HUB_TOKEN（绝不硬编码在公开代码库中！）
ARG_TOKEN="${OPT_TOKEN:-${POS_ARGS[1]:-}}"

# 第三参数（可选）：自定义 Host ID
RAW_HOST_ID="${OPT_ID:-${POS_ARGS[2]:-${FEISHU_HOST_ID:-${EXISTING_HOST_ID:-$(hostname -s 2>/dev/null || hostname)}}}}"
HOST_ID="$(echo "$RAW_HOST_ID" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-_')"
if [ -z "$HOST_ID" ]; then
  HOST_ID="mac-$(date +%s)"
fi

HUB_TOKEN="${ARG_TOKEN:-${FEISHU_HUB_TOKEN:-$EXISTING_TOKEN}}"

if [ -z "$HUB_TOKEN" ]; then
  echo "🔒 为了保护你的任务隐私，公开仓库不包含总控台密钥。"
  read -rsp "🔑 请输入总控台访问密码 (HUB_TOKEN): " HUB_TOKEN
  echo ""
fi

if [ -z "$HUB_TOKEN" ]; then
  echo "❌ 未提供访问密码 (HUB_TOKEN)，无法连接总控中心。"
  echo "   用法: ./connect-host.sh \"电脑名称\" \"你的访问密码\""
  exit 1
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

echo "✅ 已安全写入本机私密配置 (0600): $ENV_FILE"
echo "   - 电脑名称: $HOST_NAME ($HOST_ID)"
echo "   - 总控中心: $HUB_URL"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 自动探测 Node.js 运行时（优先使用系统 node，若无则使用 DeepSeek Harness.app 内置 Node v24 运行时）
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
    "$HOME/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness" \
    "/Applications/Antigravity IDE.app/Contents/MacOS/Electron" \
    "$HOME/Applications/Antigravity IDE.app/Contents/MacOS/Electron"; do
    if [ -x "$dsh_app_bin" ]; then
      NODE_BIN="$dsh_app_bin"
      USE_ELECTRON_NODE=1
      echo "🚀 使用客户端内置 Node.js 运行时: $NODE_BIN"
      break
    fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo "❌ 未找到 Node.js、Antigravity IDE.app 或 DeepSeek Harness.app"
  exit 1
fi

# 自动启用 dsh-turbo (Rust 原生加速引擎 + 辅助功能权限自检与弹窗引导)
if [ -x "$SCRIPT_DIR/dsh-turbo/enable-turbo.sh" ]; then
  "$SCRIPT_DIR/dsh-turbo/enable-turbo.sh" || true
fi

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
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.dsh.remotecontrol.plist"
if [ -f "$PLIST_FILE" ]; then
  launchctl unload "$PLIST_FILE" >/dev/null 2>&1 || true
fi
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
else
  "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once
fi

# 在 macOS 上优先注册 LaunchAgent 常驻守护（开机自启 + 异常自动拉起 + 脱离终端生命周期）
LAUNCHD_OK=0
if [ "$(uname -s)" = "Darwin" ] && mkdir -p "$PLIST_DIR" 2>/dev/null; then
  cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.dsh.remotecontrol</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${SCRIPT_DIR}/dsh-feishu/daemon.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>${HOME}</string>
    <key>DSH_HOME</key>
    <string>${DSH_DIR}</string>
    <key>ELECTRON_RUN_AS_NODE</key>
    <string>${USE_ELECTRON_NODE}</string>
  </dict>
  <key>WorkingDirectory</key>
  <string>${SCRIPT_DIR}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${DSH_DIR}/hub-daemon.log</string>
  <key>StandardErrorPath</key>
  <string>${DSH_DIR}/hub-daemon.log</string>
</dict>
</plist>
EOF
  if launchctl load -w "$PLIST_FILE" >/dev/null 2>&1; then
    sleep 0.6
    NEW_PID="$(pgrep -f "dsh-feishu/daemon.mjs" | tail -n 1 || true)"
    if [ -n "$NEW_PID" ]; then
      echo "$NEW_PID" > "$PID_FILE"
      LAUNCHD_OK=1
    fi
  fi
fi

if [ "$LAUNCHD_OK" != "1" ]; then
  if [ "$USE_ELECTRON_NODE" = "1" ]; then
    nohup env ELECTRON_RUN_AS_NODE=1 "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" < /dev/null > "$DSH_DIR/hub-daemon.log" 2>&1 &
  else
    nohup "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" < /dev/null > "$DSH_DIR/hub-daemon.log" 2>&1 &
  fi
  NEW_PID=$!
  echo "$NEW_PID" > "$PID_FILE"
fi

echo ""
echo "🎉 接入成功！后台守护进程已启动 (PID: ${NEW_PID}，日志: ${DSH_DIR}/hub-daemon.log)"
echo "👉 打开总控台输入你的访问密码即可查看并遥控【${HOST_NAME}】：${HUB_URL}"
