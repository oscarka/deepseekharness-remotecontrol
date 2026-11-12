<a id="en"></a>

<p align="right"><strong>🇺🇸 English</strong> · <a href="#zh">🇨🇳 简体中文</a></p>

# Contributing Guide

Thank you for taking the time to contribute! Because this is a self-hosted remote control bridge for AI coding agents, **security boundaries matter more than feature count** — please review the rules below before opening a PR.

## What Never to Do

- **Never commit real secrets**: `feishu.env`, `feishu-host.json`, `hub-state.json`, App Secrets, tokens, or private keys. `.gitignore` covers common filenames, but it is not a vault.
- **Never paste raw session transcripts into issues, PRs, or screenshots**: They often contain private code, local file paths, or internal URLs. Redact before sharing.
- **Never report security vulnerabilities in public issues**: Use the private channel documented in [SECURITY.md](SECURITY.md).

If you accidentally commit a secret: rotate/revoke it immediately on the respective platform (Feishu App Secret, Hub Token, or host credential) and mention it in the PR — do not rely on `git rebase` to erase it, as clones may already have it.

## Development Setup

- Node.js **20 or higher**
- No external database or third-party service required; the Control Hub has zero runtime dependencies

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol

npm install                      # Installs frontend build devDependencies (Preact + Vite)
npm --prefix dsh-feishu install  # Installs daemon/plugin dependencies (@larksuiteoapi/node-sdk, needed for tests)
npm test                         # Runs node --test on dsh-feishu/test/*.test.js
npm run dev                      # Starts Vite dev server for Web Console UI
npm run build                    # Builds static bundle into hub/public/
```

Run the Control Hub standalone:

```bash
HUB_TOKEN=dev-token PORT=8080 npm start
```

## Project Structure

| Path | Responsibility |
| --- | --- |
| `dsh-feishu/` | Local host daemon & DSH plugin: outbound Hub tunnel, Feishu long connection, approvals, migration |
| `dsh-feishu/lib/harnesses/` | Adapters for each AI coding tool (DSH / Antigravity / Codex / WorkBuddy / Claude) |
| `hub/` | Self-hosted Control Hub: HTTP/SSE, delta sync, E2EE share links, pairing, Web Push, FS tunnel |
| `hub/web/` | Preact + Vite Web Console frontend source |
| `hub/public/` | Built static assets (**do not edit by hand** — edit `hub/web/` and run `npm run build`) |

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(scope): add capability
fix(scope): fix bug
perf(scope): improve performance
docs: update documentation
test: add or update tests
chore: maintenance
```

Use module names for `scope`, e.g. `feat(hub): ...`, `fix(voice): ...`. Keep each PR focused on one logical change instead of mixing unrelated refactors with features.

## PR Checklist

- [ ] `npm test` passes
- [ ] New behavior includes unit/integration tests (**mandatory** when touching security boundaries)
- [ ] Zero new runtime dependencies added to `hub/` (keeping the Hub dependency-free is intentional)
- [ ] No secrets, real conversation transcripts, or personal file paths committed
- [ ] User-facing changes are reflected in `README.md`, `README.en.md`, and `README.zh-CN.md`
- [ ] Changes affecting security semantics clearly describe any threat-model impact in the PR description

## Adding a New Harness Adapter

Add the adapter under `dsh-feishu/lib/harnesses/` and declare its supported capabilities (control / observe / new session / steer / approvals) in `harness-router.js`. **Never advertise capabilities that are not actually implemented** — the capability matrix drives both UI rendering and server-side safety checks.

## Language

Issues and PRs are welcome in either **English** or **Chinese**.

---

<a id="zh"></a>

<p align="right"><a href="#en">🇺🇸 English</a> · <strong>🇨🇳 简体中文</strong></p>

# 贡献指南

感谢你愿意花时间。这个项目是自托管的远程控制工具，**安全边界比功能多少更重要**，所以下面几条请先看一眼。

## 绝对不要做的事

- **提交任何真实密钥**：`feishu.env`、`feishu-host.json`、`hub-state.json`、App Secret、Token、私钥。`.gitignore` 已经覆盖了常见的几个，但它不是保险箱。
- **在 issue / PR / 截图中贴出完整会话内容**：里面可能有你的代码、路径、内网地址。贴之前先脱敏。
- **在公开 issue 里报告安全漏洞**：请走 [SECURITY.md](SECURITY.md) 里的私下渠道。

如果已经误提交了密钥：立刻在对应平台重置（飞书 App Secret、Hub Token），并在 PR 里说明，不要试图用 `git rebase` 抹掉——它已经进了别人的 clone。

## 开发环境

- Node.js **20 或更高**
- 不需要数据库、不需要外部服务；Hub 零运行时依赖

```bash
git clone https://github.com/oscarka/deepseekharness-remotecontrol.git
cd deepseekharness-remotecontrol

npm install                      # 只装前端构建需要的 devDependencies
npm --prefix dsh-feishu install   # 插件依赖（@larksuiteoapi/node-sdk，跑测试需要）
npm test                          # node --test，跑 dsh-feishu/test/*.test.js
npm run dev                       # Vite 调试 Web 总控台
npm run build                     # 构建到 hub/public/
```

单独跑 Hub：

```bash
HUB_TOKEN=dev-token PORT=8080 npm start
```

## 代码结构

| 路径 | 职责 |
| --- | --- |
| `dsh-feishu/` | 本机后台守护进程与 DSH 插件：主动连 Hub、飞书长连接、审批、命令、迁移 |
| `dsh-feishu/lib/harnesses/` | 各后端（DSH / Antigravity / Codex / WorkBuddy / Claude）适配器 |
| `hub/` | 自托管总控台：HTTP/SSE、增量同步、E2EE 分享、配对、Web Push、反向文件隧道 |
| `hub/web/` | Preact + Vite 前端源码 |
| `hub/public/` | 构建产物（**不要手改**，改 `hub/web/` 后运行 `npm run build`） |

## 提交约定

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
feat(scope): 新增能力
fix(scope): 修复问题
perf(scope): 性能
docs: 文档
test: 测试
chore: 杂项
```

scope 用模块名，例如 `feat(hub): ...`、`fix(voice): ...`。一个 PR 聚焦一件事，别把重构和功能混在一起。

## PR 检查清单

- [ ] `npm test` 通过
- [ ] 新增行为有对应测试（涉及安全边界的**必须**有）
- [ ] 没有新增第三方运行时依赖（Hub 保持零依赖是有意为之）
- [ ] 没有提交密钥、真实会话、个人路径
- [ ] 改动涉及用户可见行为时，同步更新 `README.md`、`README.en.md` 与 `README.zh-CN.md`
- [ ] 涉及安全语义的改动，在 PR 描述里写清威胁模型的变化

## 关于新 Harness 适配

在 `dsh-feishu/lib/harnesses/` 下加适配器，并在 `harness-router.js` 的能力矩阵里声明它支持哪些操作（控制 / 观察 / 新建 / 插话 / 审批）。**不要宣称没有实现的能力**——能力矩阵是 UI 与安全判断的依据。

## 语言

Issue 和 PR 用中文或英文都可以。
