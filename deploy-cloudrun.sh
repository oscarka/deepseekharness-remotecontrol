#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-dsh-remotecontrol-hub}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "请先设置 GCP 项目: export PROJECT_ID=your-gcp-project-id"
  exit 1
fi

if [[ -z "${HUB_TOKEN:-}" ]] && [[ -f "${HOME}/.dsh/feishu.env" ]]; then
  HUB_TOKEN="$(grep -E '^FEISHU_HUB_TOKEN=' "${HOME}/.dsh/feishu.env" | tail -n 1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
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
echo "✅ 部署完成！接下来按 3 步完成首次接入："
echo "   ① 在电脑浏览器打开上方输出的 Service URL，输入管理密码 (${HUB_TOKEN}) 登录"
echo "   ② 复制网页上「添加电脑」面板里的一行命令到终端执行（自动用配对码接入，无需手填配置文件）"
echo "   ③ 点击网页上的「📱 手机扫码登录」，用手机扫码即可开始远控！"

