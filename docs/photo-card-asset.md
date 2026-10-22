# 拍照营养卡片素材

用户提供参考卡片后，首页拍照入口改为浅紫渐变圆角卡片、左侧文案、右侧营养碗与相机、底部原生按钮。文字不烘焙在图片中。点击卡片或按钮均进入原有拍照记餐页面；按钮阻止冒泡，避免重复导航。

最终插画：miniprogram-1/miniprogram/images/home/photo-nutrition.webp（640 × 800，透明背景，128812 字节）。使用内置 imagegen 生成，再进行等比例缩小和 WebP 编码以控制小程序包体积。原图保留在 Codex generated_images 目录。

配套白色相机图标：miniprogram-1/miniprogram/images/home/camera-white.svg，复用项目原有 SVG 图标。

预览：docs/previews/home-photo-card.png，为实际 WXML 编译结构在浏览器中的排版预览，不是原生模拟器截图。320/390 宽度均无横向溢出、无图片错误；7 项页面测试及 58 页编译结构/资源检查通过。

## 内置 imagegen 最终提示词

Create a production-ready transparent PNG illustration asset for the RIGHT SIDE of a Chinese nutrition photo-recognition mobile app banner. No text, no letters, no UI, no border, no background rectangle. Match this visual description precisely: polished friendly 3D clay / soft glossy product illustration, a pale mint ceramic bowl overflowing with fresh vivid green lettuce, broccoli florets, fan of avocado slices, cucumber slices, cherry tomato halves, halved boiled egg with orange yolk, a little quinoa. Bowl sits high in composition. In foreground at bottom-right is a small cute lavender-purple compact camera with a dark glass round lens, rounded body and pale lilac shutter button. A few soft lavender cloud cushions/ribbon-like mounds under the bowl and camera. Two small golden four-point sparkles to upper-left and lower-right. Composition close and compact, bowl and camera overlap, subjects fill canvas, maintain entire bowl and camera visible with small margins. Main palette fresh green / pale mint / soft lavender, gentle studio lighting from upper-left, soft ambient shadows, inviting high quality app illustration. Asset silhouette approximately portrait 4:5, transparent outside the objects. This is not a finished banner: illustration only, text will be added with native code.
