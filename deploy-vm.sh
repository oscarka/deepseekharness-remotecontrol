#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

if [[ -f "${SCRIPT_DIR}/.deploy.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.deploy.env"
  set +a
fi

VM_INSTANCE="${VM_INSTANCE:-}"
VM_ZONE="${VM_ZONE:-us-east1-b}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-}}"
SSH_TARGET="${SSH_TARGET:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/dsh-hub}"
SERVICE_NAME="${SERVICE_NAME:-dsh-hub}"
PUBLIC_URL="${PUBLIC_URL:-}"
SKIP_TESTS="${SKIP_TESTS:-0}"
DRY_RUN=0

for arg in "$@"; do
  case "${arg}" in
    --fast|--skip-tests) SKIP_TESTS=1 ;;
    --dry-run) DRY_RUN=1 ;;
  esac
done

if [[ -z "${VM_INSTANCE}" && -z "${SSH_TARGET}" ]]; then
  echo "请配置目标服务器：在 .deploy.env 或环境变量中设置 VM_INSTANCE (GCE) 或 SSH_TARGET=user@ip (通用 VPS)"
  exit 1
fi

echo "=== 1. 构建前端静态包 ==="
npm run build

if [[ "${SKIP_TESTS}" != "1" ]]; then
  echo "=== 2. 执行回归单测 (可加 --fast 跳过) ==="
  npm test
fi

TMP_TAR="$(mktemp /tmp/dsh-hub-deploy-XXXXXX.tar.gz)"
trap 'rm -f "${TMP_TAR}"' EXIT

COPYFILE_DISABLE=1 tar --exclude='.DS_Store' -czf "${TMP_TAR}" \
  package.json icon.svg connect-host.sh \
  hub/server.js hub/hub-core.js hub/delta-state.js hub/push-formatter.js hub/web-push.js hub/public

REMOTE_CMD="sudo mkdir -p '${REMOTE_DIR}' && \
sudo find '${REMOTE_DIR}/hub/public/assets' -type f -mtime +7 -delete 2>/dev/null || true && \
sudo tar -xzf /tmp/dsh-hub-deploy.tar.gz -C '${REMOTE_DIR}' && \
sudo chown -R ${SERVICE_NAME}:${SERVICE_NAME} '${REMOTE_DIR}' 2>/dev/null || true && \
sudo rm -f /tmp/dsh-hub-deploy.tar.gz && \
sudo systemctl restart '${SERVICE_NAME}' && \
sleep 3 && \
curl -fsS http://127.0.0.1:8080/api/health"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "[DRY RUN] Tarball ready: ${TMP_TAR} ($(du -h "${TMP_TAR}" | cut -f1))"
  echo "[DRY RUN] Target: ${VM_INSTANCE:-${SSH_TARGET}} (${VM_ZONE}) -> ${REMOTE_DIR} (${PUBLIC_URL})"
  exit 0
fi

if [[ -n "${VM_INSTANCE}" ]]; then
  GCLOUD_PROJ_ARGS=()
  if [[ -n "${GCP_PROJECT_ID}" ]]; then
    GCLOUD_PROJ_ARGS=(--project "${GCP_PROJECT_ID}")
  fi
  echo "=== 3. 上传并热更新 GCE 虚拟机 ${VM_INSTANCE} (${VM_ZONE}) ==="
  gcloud compute scp "${GCLOUD_PROJ_ARGS[@]}" --zone "${VM_ZONE}" "${TMP_TAR}" "${VM_INSTANCE}:/tmp/dsh-hub-deploy.tar.gz"
  gcloud compute ssh "${GCLOUD_PROJ_ARGS[@]}" --zone "${VM_ZONE}" "${VM_INSTANCE}" --command "${REMOTE_CMD}"
else
  echo "=== 3. 上传并热更新 VPS ${SSH_TARGET} ==="
  scp "${TMP_TAR}" "${SSH_TARGET}:/tmp/dsh-hub-deploy.tar.gz"
  ssh "${SSH_TARGET}" "${REMOTE_CMD}"
fi

echo ""
if [[ -n "${PUBLIC_URL}" ]]; then
  echo "=== 4. 校验公网域名 ${PUBLIC_URL}/api/health ==="
  curl -fsS "${PUBLIC_URL%/}/api/health"
  echo ""
fi
echo "✅ 服务器部署完成！访问地址: ${PUBLIC_URL:-${VM_INSTANCE:-${SSH_TARGET}}}"
