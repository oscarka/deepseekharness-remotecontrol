#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-dsh-remotecontrol-hub}"
REGION="${REGION:-asia-east1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "请先设置 GCP 项目: export PROJECT_ID=your-gcp-project-id"
  exit 1
fi

if [[ -z "${HUB_TOKEN:-}" ]]; then
  echo "提示: 未指定 HUB_TOKEN 环境变量，将自动生成一个随机安全密钥..."
  HUB_TOKEN="$(openssl rand -hex 16)"
  echo "生成的 HUB_TOKEN: ${HUB_TOKEN}"
fi

echo "正在部署 ${SERVICE_NAME} 到 Google Cloud Run (${PROJECT_ID} / ${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source . \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 1 \
  --set-env-vars "HUB_TOKEN=${HUB_TOKEN}"

echo ""
echo "✅ 部署完成！请将上方输出的 Service URL 填入各台电脑 ~/.dsh/feishu.env 的 FEISHU_HUB_URL，并填入 FEISHU_HUB_TOKEN=${HUB_TOKEN}"
