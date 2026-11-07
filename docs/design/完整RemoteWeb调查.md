# 完整 Remote Web / 独立 Server 仓库调查

> 调查时间：2026-10-29  
> 问题：作者说的“完整 Server、Remote Web、Admin 在独立仓库”，能不能拉下来用 Docker/Cloud Run 自部署？

## 结论

1. **公开仓库里没有完整 Server/Remote Web。**  
   `liguobao/ds-harness-remote` 只包含 Plugin、Android/VS Code/Browser 客户端、共享协议，以及 `apps/server` 的**最小单账号 Relay**。

2. **作者的公开 GitHub 仓库列表里也没有这个 Server 仓库。**  
   公开列表只有 `ds-harness-remote`、`dsh-desktop`、`dsh-file-viewer` 等；没有 `dsh-remote-server` / `remote-web` 一类仓库。按文档表述，它在“独立仓库”维护，但公开渠道拿不到，推测是私有或未发布。

3. **`apps/server` 的 Web 不是聊天界面。**  
   它只有 landing、登录、设备状态页；`/app/remote` 实际是 DevicesPage。没有 Remote Web 的会话/聊天 UI，也没有 WebRTC signaling/TURN，代码里 `signal.*` 直接忽略，是 **Relay-only**。

4. **完整 Server 是一个独立产品，不是“一个 Docker 就等价替换”。**  
   按 `docs/server.md`，它是 FastAPI + SQLAlchemy + Alembic + SQLite + React + WebSocket Hub + TURN credential + Admin，标准部署是 server + coturn + Caddy 的 Compose。代码不在公开仓库，无法直接 `docker compose up`。

5. **Cloud Run 不适合它。**  
   SQLite 单文件 + WAL、内存 WebSocket Hub、presence/连接状态、TURN 短期凭据，都是“单实例、有状态、长连接”的负载。Cloud Run 的临时磁盘、缩容、冷启动、WebSocket 时长上限都会踩坑；要跑也得 min=max=1 + 持久卷，已经不如一台小 VPS。

## 证据

### 1. 文档明确写了“独立仓库”

`docs/server.md` 开头：

> 实现状态：**完整站点位于独立 Server 仓库；本仓库 `apps/server` 提供最小自部署子集。**

`docs/design/PRODUCT.md`：

> 最小 Server 是单账号、文件持久化、Relay-only 实现，不提供 Remote Web 会话界面或 WebRTC/TURN。  
> 完整多账号 Server、Remote Web、Admin 与其基础设施在独立仓库维护。

`docs/TODO.md`：

> 完整 Server、Remote Web 和 Admin 在独立 Server 仓库实现。

### 2. 公开仓库的 `apps/server` 是最小版

- 单账号，账号/密码来自环境变量
- JSON 文件持久化（`state.json`）
- Relay-only：`gateway.ts` 里 `signal.*` 直接 `return`，不转发 WebRTC signaling
- 没有 TURN credential 服务
- Web 页面只有 landing / login / devices
- 没有 Admin、没有多账号、没有 OAuth、没有邀请码

### 3. 完整 Server 的设计（来自 `docs/server.md`）

- Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2
- SQLite WAL，单进程/少量 worker
- React + Vite 统一站点：`/`、`/guide`、`/app/access`、`/app/hosts`、`/app/admin`
- WebSocket `/ws/v1/connect`：账号/设备认证、membership、signaling、opaque Relay
- TURN credential（coturn + shared secret）
- 账号体系：邮箱密码（argon2id）、知乎 OAuth、GitHub OAuth、邀请码
- Admin：health/devices/connections/settings，白名单账号
- 标准 Compose：`remote-server` + `coturn` + `caddy/nginx`
- 数据模型、token 轮换、设备撤销、限流、日志脱敏都有明确设计

这不是“补一个 Dockerfile”的量级，而是一个完整后端 + 前端站点。

### 4. 线上实例能证明它是真的，但不给源码

`https://dsh.r2049.cn`：

- `server: uvicorn`，确认是 FastAPI
- `/app/access`、`/app/hosts` 返回 React 页面
- `/ready` 返回 `{"status":"ready","activeDevices":926,"activeConnections":69}`
- `/openapi.json` 关闭（404）
- 静态资源是打包后的 JS/CSS，没有源码

另外，`/ready` 对公网暴露了设备数和连接数，这是一个小信息泄露，作者可以顺手收紧；不影响自部署结论。

## 那么“Docker 自建”到底能做到什么？

| 目标 | 公开代码能做到吗 | 说明 |
| --- | --- | --- |
| 跑一个最小 Relay，让插件/Android 连上 | ✅ | `apps/server` + Compose，1 个容器 + 1 个 volume |
| 有登录/设备状态页 | ✅ | 只有 devices，不是聊天 |
| 有完整 Remote Web 聊天 UI | ❌ | 在私有/未公开 Server 仓库 |
| 有 WebRTC P2P/TURN | ❌ | 最小版 relay-only |
| 有多账号/OAuth/Admin/邀请码 | ❌ | 完整版才有 |
| 一条 `docker compose up` 全搞定 | ❌（公开代码） | 完整版是 server+coturn+caddy 多服务 |

## Cloud Run 评估

如果硬要把完整 Server 放 Cloud Run：

- SQLite 文件系统是临时的；挂 GCS/Filestore 能持久化，但 SQLite WAL 在对象存储/FUSE 上不可靠
- WebSocket Hub 和 presence 在内存；Cloud Run 多实例会各连各的，必须 min=max=1
- WebSocket 请求有时长上限，长连接会被周期性断开，需要重连
- TURN 需要 UDP 端口，Cloud Run 不适合
- 冷启动 + 缩容会打断 Host/Client 在线状态
- 单账号最小版反而更适合 Cloud Run，但它没有 Remote Web

结论：**要公网，VPS + Docker Compose 比 Cloud Run 合适；要自建完整版，先拿到私有仓库。**

## 这对“Web + 飞书”意味着什么

- 你想要的“Web”如果是**完整 Remote Web**：公开代码给不了；要么找作者要私有 Server 仓库，要么放弃。
- 你想要的“Web”如果是**官方 `dsh web`**：它本身就是完整聊天界面，和飞书插件同进程即可共享会话；不需要任何 relay。
- 因此：**不要为了 Remote Web 去等/找私有仓库；用官方 `dsh web` + 飞书桥是当下唯一能落地的“Web + 飞书”组合。**

## 三条路的成本

| 路线 | 工作量 | 风险 | 适合 |
| --- | --- | --- | --- |
| 官方 `dsh web` + 飞书桥 | 中（做插件） | 插件跟 DSH 版本耦合；飞书非 E2E | 你要 Web + 飞书，且接受 `dsh web` 作为主 Host |
| 最小 Relay + 飞书桥 | 中高（插件 + 一个常驻 server） | 两套控制面；最小 server 无 Remote Web | 你还要 Android/Remote 原生客户端 |
| 完整 Remote Web 自建 | 很高（拿私有仓库 + 多服务运维） | 仓库不可得；OAuth/TURN/SQLite/Admin 都要维护 | 你要复刻 `dsh.r2049.cn` 的完整体验 |

## 建议

**先按“官方 `dsh web` + 飞书桥”落地。**  
它满足“Web + 飞书”，不依赖作者服务器，不需要 Docker/Cloud Run；等以后确实需要 Android 原生客户端，再单独加一个 VPS 上的最小 Relay，不要现在把三套东西一起上。

如果作者愿意公开/授权完整 Server 仓库，再评估自建；在拿到代码之前，“一个 Docker 自建完整 Remote Web”不成立。
