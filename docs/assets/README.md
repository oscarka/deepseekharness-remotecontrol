# 视觉素材

| 文件 | 用途 | 说明 |
| --- | --- | --- |
| `banner.svg` | README 首屏 | 1280×400，GitHub 直接渲染 SVG |
| `social-preview.svg` | Social Preview 源文件 | 1280×640 |
| `social-preview.png` | **上传到 GitHub 用的成品** | 1280×640，365 KB，已生成 |
| `demo.gif` | README 演示（**待录**） | ≤ 5 MB，宽 960，15 fps |

## Social Preview

PNG 已经生成好了，直接用：

```
docs/assets/social-preview.png
```

上传路径：仓库 **Settings → General → Social preview → Edit → Upload an image**。

改了 SVG 之后重新生成：

```bash
python3 -m pip install --target /tmp/pylib resvg-py
PYTHONPATH=/tmp/pylib python3 -c "
import resvg_py
data = resvg_py.svg_to_bytes(svg_path='docs/assets/social-preview.svg', width=1280, height=640)
open('docs/assets/social-preview.png','wb').write(bytes(data))
"
```

## Demo GIF

分镜、录制方法、压缩参数见 **[../launch/demo-script.md](../launch/demo-script.md)**。

一句话版本：

```bash
ffmpeg -i demo.mov -vf "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" demo.gif
```

**必须控制在 5 MB 以内**——超过之后 README 加载明显变慢，很多人直接关页面。

录完放到本目录，并在 README 首屏引用。
