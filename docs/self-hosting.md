# 自托管部署指南（七条路，同一个终点）

无论你选择哪种方式部署控制台，最终都会得到两样东西：**一个网址 + 一个密码（`HUB_TOKEN`）**。
拿到之后，统一回到主 README 的**[三步快速上手](../README.zh-CN.md#三步快速上手)**（电脑打开网址 ➔ 复制一行安装命令与配对码 ➔ 终端执行 ➔ 手机扫码登录）。

---

## 方案 0：Google Cloud Run 一键部署（出门 4G/5G 推荐 · 闲置缩容到 0）

自带 HTTPS 域名（支持 iPhone 添加到主屏幕开启锁屏通知），无人访问时自动缩容到 0 几乎不产生费用：

```bash
GCP_PROJECT_ID="你的-gcp-project-id" \
HUB_TOKEN="你的管理员强密码" \
./deploy-cloudrun.sh
```

脚本执行完毕会直接输出你的 `https://dsh-remotecontrol-hub-xxx.run.app` 网址。后续升级执行 `./deploy-cloudrun.sh` 会自动保留线上已有密码与配对状态。

---

## 方案 1：Railway 一键部署（免装命令行）

1. 点击主 README 的 **Deploy on Railway** 按钮。
2. 在自动弹出的环境变量框中，务必把 **`HUB_TOKEN`** 填写为**你自己设置的强密码**（至少 8 位，切勿使用简单默认密码）。
3. *(可选)* 在服务设置里挂载一个 Volume 到 `/data`（`Dockerfile` 已预设 `HUB_STATE_FILE=/data/dsh-hub-state.json`，挂载后容器重启不会丢分享链接）。
4. 部署完成后在服务 `Settings → Networking` 点击 **Generate Domain**，即可得到你的 `https://xxxx.up.railway.app` 网址。

---

## 方案 2：云服务器 / VPS（Docker Compose + 域名 HTTPS）

### 1. 启动容器（带持久化数据盘）

```bash
curl -fsSLO https://raw.githubusercontent.com/oscarka/deepseekharness-remotecontrol/main/docker-compose.yml
HUB_TOKEN="你的管理员强密码" TRUST_PROXY=1 docker compose up -d
```

### 2. 配置反向代理与自动 HTTPS

#### 使用 Caddy（推荐，两行自动申请证书）

编辑 `/etc/caddy/Caddyfile`：

```caddyfile
rc.example.com {
    reverse_proxy 127.0.0.1:8080 {
        flush_interval -1
    }
}
```

> `flush_interval -1` 能确保 `/api/events` 的 SSE 实时流不被缓冲。

#### 使用 Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name rc.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 关键：保持 SSE 实时流不缓冲
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

---

## 方案 3：有域名、无公网 IP（Cloudflare Tunnel 固定隧道）

在家里电脑、NAS 或树莓派上跑控制台，通过 Cloudflare Tunnel 暴露 HTTPS 域名（无需公网 IP，且自带 HTTPS 证书以支持 iPhone Web Push）：

```bash
# 1. 启动本地控制台
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="你的管理员强密码" \
  -e TRUST_PROXY=1 \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest

# 2. 将 Cloudflare Tunnel 指向 http://127.0.0.1:8080
cloudflared tunnel --url http://127.0.0.1:8080
```

---

## 方案 4：国内网络内网穿透（cpolar / frp / natapp）

如果没有海外服务器或域名，可以在本机启动 Docker 容器后，用国内内网穿透工具映射本地 `8080` 端口：

```bash
# 1. 启动本地控制台
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v dsh-hub-data:/data \
  -e HUB_TOKEN="你的管理员强密码" \
  -e TRUST_PROXY=1 \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest

# 2. 用 cpolar / natapp 暴露 HTTPS 隧道到 8080 端口
cpolar http 8080
```

---

## 方案 5：Tailscale Serve / Funnel

如果你日常使用 Tailscale 组网：

```bash
# 仅在自己的 Tailscale 虚拟局域网内访问（带自动 HTTPS 证书）
tailscale serve --bg 8080

# 或通过 Funnel 暴露给公网
tailscale funnel --bg 8080
```

---

## 方案 6：纯家庭局域网 / NAS / 树莓派

镜像原生支持多架构（`linux/amd64`、`linux/arm64`、`linux/arm/v7`），可在群晖（Synology）、威联通（QNAP）、绿联 NAS、Mac mini 或树莓派上直接运行：

```bash
docker run -d --name dsh-hub \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /volume1/docker/dsh-hub:/data \
  -e HUB_TOKEN="你的管理员强密码" \
  ghcr.io/oscarka/deepseekharness-remotecontrol:latest
```

启动后执行 `docker logs dsh-hub`，即可看到打印出的局域网访问地址与密码。
