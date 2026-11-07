# 仓库设置清单（只能在 GitHub 网页/CLI 做，不在 git 里）

Week 1 的文档已经进仓库了，但下面这些是**仓库级设置**，无法通过 commit 生效。总共大约 5 分钟。

## 1. About 面板

点仓库首页右上角 **⚙️ About**：

| 字段 | 建议值 |
| --- | --- |
| Description | 见下方 |
| Website | **先留空**（等 demo 上线再填，不要填打不开的地址） |
| Topics | 见下方 |

**Description**（约 200 字符，中英混排，兼顾两边搜索）：

```text
Control AI coding agents (DSH / Codex / Claude) from your phone — Feishu long-connection + self-hosted web console. 手机遥控 AI 编码任务：审批、插话、多机切换、E2EE 分享。No inbound ports.
```

**Topics**（逗号分隔，GitHub 上限 20 个）：

```text
ai-agents, ai-coding, coding-agent, remote-control, self-hosted, feishu, lark,
pwa, web-push, e2ee, claude-code, codex, deepseek, mobile, developer-tools, nodejs
```

或者用 CLI 一次搞定：

```bash
gh repo edit oscarka/deepseekharness-remotecontrol \
  --description "Control AI coding agents (DSH / Codex / Claude) from your phone — Feishu long-connection + self-hosted web console. 手机遥控 AI 编码任务：审批、插话、多机切换、E2EE 分享。No inbound ports." \
  --add-topic ai-agents,ai-coding,coding-agent,remote-control,self-hosted,feishu,lark,pwa,web-push,e2ee,claude-code,codex,deepseek,mobile,developer-tools,nodejs
```

## 2. Social Preview

**Settings → General → Social preview → Edit → Upload an image**

用 `docs/assets/social-preview.svg` 导出 1280×640 的 PNG（导出方法见 [docs/assets/README.md](assets/README.md)）。没上传的话，分享到 Twitter / 飞书 / 微信时是一张灰底卡片，点击率差很多。

## 3. 开启私密漏洞报告（必须）

**Settings → Code security → Private vulnerability reporting → Enable**

`SECURITY.md` 里的报告链接指向这个功能，不开就是死链。

## 4. 功能开关

**Settings → General → Features**：

| 功能 | 建议 | 理由 |
| --- | --- | --- |
| Issues | ✅ 开 | |
| Discussions | ⚠️ 可选 | 有人气了再开，否则空着更难看 |
| Wiki | ❌ 关 | 文档已经在 `docs/`，两个地方维护会分裂 |
| Projects | ❌ 关 | 同上 |
| Sponsorships | ⚠️ 可选 | |

## 5. 分支保护（现在就可以设，成本很低）

**Settings → Branches → Add branch ruleset**，目标 `main`：

- ✅ Require a pull request before merging
- ✅ Require status checks（等 CI 加好后再勾）
- ❌ 先不要开 Require approvals（单人项目会把自己锁死）

## 6. 打第一个 release

README 里已经写了路线图，`CHANGELOG.md` 也有 `0.2.0` 的内容。建议直接发：

```bash
git tag -a v0.2.0 -m "v0.2.0: multi-harness, mobile PWA, deterministic VAPID"
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --notes-from-tag
```

有 tag 之后：`shields.io` 的 release badge 可用，awesome list 维护者也更愿意收录「有版本」的项目。

## 7. 完成后的自检

对着 README 从零走一遍，假装你是第一次看到的陌生人：

```text
[ ] 首屏能在 5 秒内说清「这是什么、给谁用」
[ ] 30 秒本地启动命令能复制粘贴就跑通
[ ] 有一个能看的界面截图或 GIF（当前缺口，见 docs/assets/README.md）
[ ] 许可证、安全策略、贡献指南都能从 README 一跳直达
[ ] About 面板的 description / topics / social preview 都填了
[ ] 最新的 commit 在 7 天内
```

前五项都打勾之后，再去提 awesome list。
