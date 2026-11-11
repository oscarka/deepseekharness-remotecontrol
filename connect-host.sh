#!/usr/bin/env bash
set -euo pipefail

# 清理 IDE 终端可能注入的临时沙箱代理或单次 RPC 覆盖变量，确保守护进程直连云端与本机 LanguageServer
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy \
  RPC_PROXY_DEST_OVERRIDE RPC_PROXY_HEADER_AS_EXTENSION \
  ANTIGRAVITY_LS_ADDRESS ANTIGRAVITY_CSRF_TOKEN 2>/dev/null || true

# 严禁在公开脚本中硬编码任何私人云实例地址；由 /install.sh 动态注入或通过 --url / FEISHU_HUB_URL 指定
DEFAULT_HUB_URL=""

DSH_DIR="${DSH_HOME:-$HOME/.dsh}"
mkdir -p "$DSH_DIR"

ENV_FILE="$DSH_DIR/feishu.env"

# 读取本机已有的配置（如果之前已配置过网址、密钥或电脑名则自动复用）
EXISTING_HUB_URL=""
EXISTING_TOKEN=""
EXISTING_HOST_ID=""
EXISTING_HOST_NAME=""
EXISTING_APP_ID=""
EXISTING_APP_SECRET=""
EXISTING_OPEN_IDS=""
EXISTING_HARNESSES=""
if [ -f "$ENV_FILE" ]; then
  EXISTING_HUB_URL="$(grep -E '^FEISHU_HUB_URL=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_TOKEN="$(grep -E '^FEISHU_HUB_TOKEN=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_HOST_ID="$(grep -E '^FEISHU_HOST_ID=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_HOST_NAME="$(grep -E '^FEISHU_HOST_NAME=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_APP_ID="$(grep -E '^FEISHU_APP_ID=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_APP_SECRET="$(grep -E '^FEISHU_APP_SECRET=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_OPEN_IDS="$(grep -E '^FEISHU_ALLOWED_OPEN_IDS=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  EXISTING_HARNESSES="$(grep -E '^FEISHU_ENABLED_HARNESSES=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
fi

# 支持 --url / --code / --name / --token / --id / --dry-run / --no-service 具名参数与位置参数
POS_ARGS=()
OPT_URL=""
OPT_CODE=""
OPT_NAME=""
OPT_TOKEN=""
OPT_ID=""
DRY_RUN=0
NO_SERVICE="${DSH_NO_SERVICE:-0}"
while [ $# -gt 0 ]; do
  case "$1" in
    --url)
      OPT_URL="${2:-}"
      shift 2 || shift
      ;;
    --code)
      OPT_CODE="${2:-}"
      shift 2 || shift
      ;;
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
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --no-service)
      NO_SERVICE=1
      shift
      ;;
    *)
      POS_ARGS+=("$1")
      shift
      ;;
  esac
done

DEFAULT_NAME="$(scutil --get ComputerName 2>/dev/null || hostname -s 2>/dev/null || hostname)"
if [ "$EXISTING_HOST_NAME" = "--name" ]; then EXISTING_HOST_NAME=""; fi
if [ "$EXISTING_HOST_ID" = "--id" ]; then EXISTING_HOST_ID=""; fi
HOST_NAME="${OPT_NAME:-${POS_ARGS[0]:-${FEISHU_HOST_NAME:-${EXISTING_HOST_NAME:-$DEFAULT_NAME}}}}"

ARG_TOKEN="${OPT_TOKEN:-${POS_ARGS[1]:-}}"

RAW_HOST_ID="${OPT_ID:-${POS_ARGS[2]:-${FEISHU_HOST_ID:-${EXISTING_HOST_ID:-$(hostname -s 2>/dev/null || hostname)}}}}"
HOST_ID="$(echo "$RAW_HOST_ID" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-_')"
if [ -z "$HOST_ID" ]; then
  HOST_ID="mac-$(date +%s)"
elif [ -z "${OPT_ID:-}" ] && [ -z "${POS_ARGS[2]:-}" ] && [ -z "${FEISHU_HOST_ID:-}" ] && [ -z "${EXISTING_HOST_ID:-}" ]; then
  case "$HOST_ID" in
    localhost|bogon|macbook|macbook-pro|macbook-air|mac|ubuntu|debian|archlinux|fedora)
      RAND_SUFFIX="$(openssl rand -hex 2 2>/dev/null || date +%S%M)"
      HOST_ID="${HOST_ID}-${RAND_SUFFIX}"
      ;;
  esac
fi

HUB_URL="${OPT_URL:-${FEISHU_HUB_URL:-${DEFAULT_HUB_URL:-$EXISTING_HUB_URL}}}"
HUB_URL="${HUB_URL%/}"

if [ -z "$HUB_URL" ]; then
  echo "❌ 未指定总控台地址 (FEISHU_HUB_URL)。"
  echo "   请先打开你的总控台网页，复制「添加电脑」面板里的一键安装命令执行，"
  echo "   或手动指定: ./connect-host.sh --url https://你的总控台网址 --code 配对码"
  exit 1
fi

JOIN_CODE="${OPT_CODE:-${FEISHU_JOIN_CODE:-}}"
HUB_TOKEN="${ARG_TOKEN:-${FEISHU_HUB_TOKEN:-$EXISTING_TOKEN}}"

# 凭配对码加入：自动向控制台换取本机独立凭证（不需要管理员主密码）
if [ -n "$JOIN_CODE" ]; then
  echo "🔗 正在使用配对码 (${JOIN_CODE}) 将【${HOST_NAME}】接入总控台 ${HUB_URL} ..."
  PLATFORM_STR="$(uname -s 2>/dev/null || echo unknown)"
  ARCH_STR="$(uname -m 2>/dev/null || echo unknown)"
  JOIN_RESP="$(curl -sS -X POST "${HUB_URL}/api/hosts/join" \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"${JOIN_CODE}\",\"hostId\":\"${HOST_ID}\",\"hostName\":\"${HOST_NAME}\",\"platform\":\"${PLATFORM_STR}\",\"arch\":\"${ARCH_STR}\"}" || true)"
  EXTRACTED_TOKEN="$(printf '%s' "$JOIN_RESP" | sed -n 's/.*"hostToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  if [ -z "$EXTRACTED_TOKEN" ]; then
    ERR_MSG="$(printf '%s' "$JOIN_RESP" | sed -n 's/.*"error"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
    echo "❌ 配对码接入失败: ${ERR_MSG:-$JOIN_RESP}"
    exit 1
  fi
  HUB_TOKEN="$EXTRACTED_TOKEN"
  echo "✅ 配对成功！已获取本机专属独立凭证 (${EXTRACTED_TOKEN:0:10}...)"
fi

if [ -z "$HUB_TOKEN" ]; then
  echo "❌ 未提供配对码 (--code) 或访问凭证 (--token)。"
  echo "   推荐用法: ./connect-host.sh --url ${HUB_URL} --code 网页上的配对码"
  exit 1
fi

# 自动检测本机安装了哪些 AI 编码工具，诚实提示能力边界
HAS_DSH=0
HAS_AGY=0
HAS_CODEX=0
HAS_WORKBUDDY=0
HAS_CLAUDE=0

if command -v dsh >/dev/null 2>&1 || [ -x "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" ] || [ -x "$HOME/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" ]; then
  HAS_DSH=1
fi
if [ -d "$HOME/.gemini/antigravity" ] || [ -d "/Applications/Antigravity IDE.app" ] || [ -d "$HOME/Applications/Antigravity IDE.app" ]; then
  HAS_AGY=1
fi
if command -v codex >/dev/null 2>&1 || [ -d "$HOME/.codex" ] || [ -d "/Applications/Codex.app" ] || [ -d "$HOME/Applications/Codex.app" ]; then
  HAS_CODEX=1
fi
if command -v codebuddy >/dev/null 2>&1 || command -v workbuddy >/dev/null 2>&1 || [ -d "$HOME/.workbuddy" ] || [ -d "$HOME/.codebuddy" ] || [ -d "/Applications/WorkBuddy.app" ] || [ -d "$HOME/Applications/WorkBuddy.app" ]; then
  HAS_WORKBUDDY=1
fi
if command -v claude >/dev/null 2>&1 || [ -d "$HOME/.claude" ]; then
  HAS_CLAUDE=1
fi

DETECTED_LIST=()
[ "$HAS_DSH" = "1" ] && DETECTED_LIST+=("DSH")
[ "$HAS_AGY" = "1" ] && DETECTED_LIST+=("Antigravity IDE")
[ "$HAS_CODEX" = "1" ] && DETECTED_LIST+=("Codex")
[ "$HAS_WORKBUDDY" = "1" ] && DETECTED_LIST+=("WorkBuddy")
[ "$HAS_CLAUDE" = "1" ] && DETECTED_LIST+=("Claude Code")

if [ "$EXISTING_HARNESSES" = "dsh,antigravity-ide,codex,claude" ]; then
  EXISTING_HARNESSES="dsh,antigravity-ide,codex,workbuddy,claude"
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
FEISHU_ENABLED_HARNESSES=${FEISHU_ENABLED_HARNESSES:-${EXISTING_HARNESSES:-dsh,antigravity-ide,codex,workbuddy,claude}}
EOF
chmod 600 "$ENV_FILE"

echo "✅ 已安全写入本机私密配置 (0600): $ENV_FILE"
echo "   - 电脑名称: $HOST_NAME ($HOST_ID)"
echo "   - 总控中心: $HUB_URL"
if [ "$HAS_DSH" = "1" ] || [ "$HAS_AGY" = "1" ] || [ "$HAS_CODEX" = "1" ] || [ "$HAS_WORKBUDDY" = "1" ]; then
  echo "   - 检测工具: ${DETECTED_LIST[*]} ➔ 已启用完整模式（看会话 / 发指令 / 停止 / 手机审批 / 实时插话）"
elif [ "$HAS_CLAUDE" = "1" ]; then
  echo "   - 检测工具: ${DETECTED_LIST[*]} ➔ 当前为观察模式，审批功能需要 DSH（支持看会话、发指令、停止）"
else
  echo "   - 检测工具: 未检测到 DSH ➔ 当前为观察模式，审批功能需要 DSH"
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "✅ [dry-run] 配置与检测已完成。"
  exit 0
fi

# 支持通过 curl -fsSL <HUB_URL>/install.sh | bash 一键安装：若当前已在仓库目录则直接复用，否则克隆到 ~/.dsh/remotecontrol
SCRIPT_DIR="${DSH_CLIENT_DIR:-}"
if [ -z "$SCRIPT_DIR" ] && [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  CANDIDATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [ -f "$CANDIDATE_DIR/dsh-feishu/daemon.mjs" ]; then
    SCRIPT_DIR="$CANDIDATE_DIR"
  fi
fi

if [ -z "$SCRIPT_DIR" ]; then
  for local_candidate in "$PWD" "$HOME/deepseekharness-remote" "$HOME/deepseekharness-remotecontrol"; do
    if [ -f "$local_candidate/dsh-feishu/daemon.mjs" ]; then
      SCRIPT_DIR="$(cd "$local_candidate" && pwd)"
      echo "📦 检测到本地客户端代码目录，直接复用: $SCRIPT_DIR"
      break
    fi
  done
fi

if [ -z "$SCRIPT_DIR" ]; then
  REPO_DIR="$DSH_DIR/remotecontrol"
  REPO_URL="${DSH_REPO_URL:-https://github.com/oscarka/deepseekharness-remotecontrol.git}"
  if [ -d "$REPO_DIR/.git" ]; then
    echo "📦 正在更新本地客户端仓库 ($REPO_DIR)..."
    git -C "$REPO_DIR" pull --ff-only origin main >/dev/null 2>&1 || true
  else
    echo "📦 正在下载客户端代码到 $REPO_DIR ..."
    rm -rf "$REPO_DIR"
    git clone --depth 1 "$REPO_URL" "$REPO_DIR"
  fi
  SCRIPT_DIR="$REPO_DIR"
fi

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
if [ "$NO_SERVICE" != "1" ] && [ -x "$SCRIPT_DIR/dsh-turbo/enable-turbo.sh" ]; then
  CONNECT_HOST_RUNNING=1 "$SCRIPT_DIR/dsh-turbo/enable-turbo.sh" || true
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

if [ -n "$DSH_CLI" ] && [ "$NO_SERVICE" != "1" ]; then
  echo "🔌 正在向 DeepSeek Harness 注册 dsh-feishu 插件..."
  "$DSH_CLI" plugin --profile desktop add "$SCRIPT_DIR/dsh-feishu" >/dev/null 2>&1 || true
fi

PID_FILE="$DSH_DIR/hub-daemon.pid"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.dsh.remotecontrol.plist"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SYSTEMD_UNIT_FILE="$SYSTEMD_USER_DIR/dsh-remotecontrol.service"

if [ "$NO_SERVICE" != "1" ]; then
  # 停止所有旧的后台同步进程（防止多实例并发消费队列指令）
  if [ -f "$PLIST_FILE" ]; then
    launchctl unload "$PLIST_FILE" >/dev/null 2>&1 || true
  fi
  if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      kill "$OLD_PID" 2>/dev/null || true
    fi
  fi
  pkill -f "dsh-feishu/daemon.mjs" 2>/dev/null || true
  sleep 0.5
fi

# 先执行一次同步验证
if [ "$USE_ELECTRON_NODE" = "1" ]; then
  ELECTRON_RUN_AS_NODE=1 "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once
else
  "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" --once
fi

if [ "$NO_SERVICE" = "1" ]; then
  echo ""
  echo "🎉 接入与首次状态同步完成！(no-service 模式)"
  echo "👉 第 ⑤ 步：你刚才打开的电脑总控台网页 (${HUB_URL}) 现已自动刷新并显示【${HOST_NAME}】"
  echo "👉 第 ⑥ 步：点击电脑网页上的「📱 手机扫码登录」按钮，用手机相机扫一扫即可免密遥控！"
  exit 0
fi

# 在 macOS 上优先注册 LaunchAgent 常驻守护，在 Linux 上优先注册 systemd --user 常驻服务（开机自启 + 异常自动拉起）
SERVICE_OK=0
NEW_PID=""
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
    <string>--replace</string>
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
    <key>ANTIGRAVITY_LS_ADDRESS</key>
    <string>${ANTIGRAVITY_LS_ADDRESS:-}</string>
    <key>ANTIGRAVITY_CSRF_TOKEN</key>
    <string>${ANTIGRAVITY_CSRF_TOKEN:-}</string>
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
    SERVICE_OK=1
    for _ in 1 2 3 4 5; do
      sleep 0.3
      NEW_PID="$(pgrep -f "dsh-feishu/daemon.mjs" | tail -n 1 || true)"
      if [ -n "$NEW_PID" ]; then
        echo "$NEW_PID" > "$PID_FILE"
        break
      fi
    done
  fi
elif [ "$(uname -s)" = "Linux" ] && command -v systemctl >/dev/null 2>&1 && mkdir -p "$SYSTEMD_USER_DIR" 2>/dev/null; then
  cat > "$SYSTEMD_UNIT_FILE" <<EOF
[Unit]
Description=DSH Remote Control Host Daemon
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${SCRIPT_DIR}
Environment=HOME=${HOME}
Environment=DSH_HOME=${DSH_DIR}
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=${NODE_BIN} ${SCRIPT_DIR}/dsh-feishu/daemon.mjs --replace
Restart=always
RestartSec=3
StandardOutput=append:${DSH_DIR}/hub-daemon.log
StandardError=append:${DSH_DIR}/hub-daemon.log

[Install]
WantedBy=default.target
EOF
  if systemctl --user daemon-reload >/dev/null 2>&1 && systemctl --user enable --now dsh-remotecontrol.service >/dev/null 2>&1; then
    SERVICE_OK=1
    NEW_PID="$(systemctl --user show --property MainPID --value dsh-remotecontrol.service 2>/dev/null || true)"
    [ -n "$NEW_PID" ] && [ "$NEW_PID" != "0" ] && echo "$NEW_PID" > "$PID_FILE"
  fi
fi

if [ "$SERVICE_OK" != "1" ]; then
  if [ "$USE_ELECTRON_NODE" = "1" ]; then
    nohup env ELECTRON_RUN_AS_NODE=1 "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" < /dev/null > "$DSH_DIR/hub-daemon.log" 2>&1 &
  else
    nohup "$NODE_BIN" "$SCRIPT_DIR/dsh-feishu/daemon.mjs" < /dev/null > "$DSH_DIR/hub-daemon.log" 2>&1 &
  fi
  NEW_PID=$!
  echo "$NEW_PID" > "$PID_FILE"
fi

echo ""
echo "🎉 接入成功！后台守护进程已启动 (PID: ${NEW_PID:-running}，日志: ${DSH_DIR}/hub-daemon.log)"
echo "👉 第 ⑤ 步：你刚才打开的电脑总控台网页 (${HUB_URL}) 现已自动刷新并显示【${HOST_NAME}】"
echo "👉 第 ⑥ 步：点击电脑网页上的「📱 手机扫码登录」按钮，用手机相机扫一扫即可免密遥控！"
