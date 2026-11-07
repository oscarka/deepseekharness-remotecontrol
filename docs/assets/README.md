# 视觉素材

| 文件 | 用途 | 说明 |
| --- | --- | --- |
| `banner.svg` | README 首屏 | 1280×400，GitHub 直接渲染 SVG |
| `social-preview.svg` | GitHub 仓库 Social Preview | **源文件**，需导出为 1280×640 的 PNG 再上传 |
| `demo.gif` | README 演示（**待补**） | 建议 ≤ 8 MB，宽度 900–1200px |

## 1. 导出 Social Preview PNG

GitHub 的 Social Preview 只接受 PNG / JPG / GIF，不接受 SVG。任选一种方式：

```bash
# macOS：用 Safari/Chrome 打开 social-preview.svg，截图 1280×640
# 或安装 librsvg 后：
rsvg-convert -w 1280 -h 640 docs/assets/social-preview.svg -o /tmp/social-preview.png
```

上传路径：仓库 **Settings → General → Social preview → Edit → Upload an image**。

## 2. 录 Demo GIF（Week 1 唯一没做的视觉项）

推荐流程（macOS）：

```bash
# 1) 只录手机尺寸窗口，避免整屏
# 2) 用 ffmpeg 把录屏转成 GIF，控制在 8MB 以内
ffmpeg -i demo.mov -vf "fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" demo.gif
```

脚本建议（30–60 秒，一镜到底）：

1. 飞书里发 `!sessions`，任务列表卡片滑出
2. 点「查看详情」，看到思考过程与工具步骤
3. 弹出一条审批卡片，点「批准」
4. 任务完成，锁屏弹出推送
5. 结束在 Web 总控台首页

录完把 `demo.gif` 放到本目录，并把 README 里 `docs/assets/demo.gif` 那段注释打开即可。
