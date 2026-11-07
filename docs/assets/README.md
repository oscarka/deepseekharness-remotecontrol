# 视觉素材

| 文件 | 用途 | 说明 |
| --- | --- | --- |
| `banner.svg` | README 首屏 | 1280×400，GitHub 直接渲染 SVG |
| `social-preview.svg` | Social Preview 源文件 | 1280×640 |
| `social-preview.png` | 上传到 GitHub 的成品 | 1280×640 |
| `preview-phone-home.svg` / `.png` | 手机端首页 | 780×1688（2x） |
| `preview-phone-approval.svg` / `.png` | 手机端审批卡片 | 780×1688（2x） |
| `preview-desktop.svg` / `.png` | 桌面端总控台 | 1280×800 |
| `preview-feishu-card.svg` / `.png` | 飞书审批卡片 | 1440×840（2x） |
| `preview-flow.gif` | README 里的短动画 | 390×844，4.6 秒，370 KB |

## 关于预览图

**这些是按真实设计令牌渲染的示意图，不是运行截图。**

颜色、圆角、字号取自 `hub/web/src/styles/app.css`（浅色主题），布局按当前界面结构画。这样做的原因是：示意图可以随代码一起版本化、随时重画，而且不需要运行环境。

发布前如果条件允许，**建议用真机截图替换**——真实截图的说服力永远高过示意图。替换时保持文件名不变，README 不用改。

## 重新生成

用 `resvg-py`（纯 Python，无系统依赖）：

```bash
python3 -m pip install --target /tmp/pylib resvg-py
```

一个坑：`resvg-py` 的 `width` / `height` 参数**不改变输出画布尺寸**，只把内容放大后裁剪。要输出 2x，得直接改 SVG 根节点的尺寸：

```python
import resvg_py
p = 'docs/assets/preview-phone-home.svg'
s = open(p, encoding='utf-8').read()
s = s.replace('width="390" height="844"', 'width="780" height="1688"', 1)
open(p.replace('.svg', '.png'), 'wb').write(bytes(resvg_py.svg_to_bytes(svg_string=s)))
```

## GIF

用 Pillow 把两张 PNG 交叉淡入：

```python
from PIL import Image
home = Image.open('home.png').convert('RGB').resize((390, 844), Image.LANCZOS)
appr = Image.open('approval.png').convert('RGB').resize((390, 844), Image.LANCZOS)
frames = [home] * 16 + [Image.blend(home, appr, i / 7) for i in range(1, 7)] + [appr] * 24
pal = [f.convert('P', palette=Image.ADAPTIVE, colors=128) for f in frames]
pal[0].save('preview-flow.gif', save_all=True, append_images=pal[1:],
            duration=[100] * len(pal), loop=0, optimize=True, disposal=2)
```

**控制在 1 MB 以内**，超过之后 README 加载明显变慢。
