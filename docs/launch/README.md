# 发布物料

Week 3 的产出都在这里。**这些是草稿，发布前逐条核对。**

| 文件 | 用途 | 状态 |
|---|---|---|
| [release-notes-0.3.0.md](release-notes-0.3.0.md) | GitHub Release 正文 | 草稿，等 P0/P1/P2 完成 |
| [post-zh.md](post-zh.md) | 中文发布文章（V2EX / 少数派 / 即刻） | 草稿 |
| [post-en.md](post-en.md) | 英文发布文章（Hacker News / Reddit） | 草稿 |
| [demo-script.md](demo-script.md) | 90 秒演示的分镜与录制步骤 | 待录 |

---

## 发布前红线

逐条打勾，一条不过就不发。

```
[ ] 仓库里没有任何指向作者自己服务器的地址
[ ] 不带 HUB_TOKEN 无法启动（现在还能启动，P0 待做）
[ ] 仓库里没有密钥、token、内网地址、真实邮箱
[ ] 镜像版本号 == release tag
[ ] README 首屏的 GIF 能正常加载（< 5 MB）
[ ] 从零到能用，别人照着 README 能走通（干净机器实测）
[ ] 社交预览图已上传（1280×640 PNG）
[ ] 仓库简介与 16 个 topics 已设置
[ ] 私密漏洞报告已开启
```

---

## 发布当天做什么

**只做仓库内的事，不发任何社区。**

1. 打 tag：`v0.3.0`
2. GitHub Release：正文用 `release-notes-0.3.0.md`
3. 镜像同步打 `0.3.0` 和 `latest`
4. 观察 24 小时：链接、镜像、README 渲染、issue 模板

**为什么不当场推广**：发布当天出问题还能悄悄修；推广开了再发现，第一波人已经走了。

---

## 发布后第 1 周

- 中文：V2EX（分享创造节点）、少数派、即刻
- 英文：Hacker News（Show HN）、Reddit r/LocalLLaMA
- 每个渠道只发一次，同一天发完，集中回评论

**回评论的原则**：不辩解，先复现；承认的限制直接承认，不找理由。
