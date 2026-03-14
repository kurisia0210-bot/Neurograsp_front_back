# Game 2 资源目录

## 目录结构

```
src/assets/
├── avatars/           # Avatar 资源
│   ├── DoctorParts.jsx       # SVG 路径定义 (用于 React 组件)
│   └── doctor-avatar.svg     # 纯 SVG 文件版本 (可直接编辑)
│
├── icons/             # UI 图标 (未来添加)
├── backgrounds/       # 背景元素 (未来添加)
└── objects/           # 游戏对象 (未来添加)
```

## Avatar 资源说明

### 1. **DoctorParts.jsx** - React 组件版本
用于在 React 组件中使用的 SVG 路径数据。

```jsx
import { COLORS, HAIR_BACK_1, MOUTH_PATHS } from './assets/avatars/DoctorParts'
```

### 2. **doctor-avatar.svg** - 纯 SVG 文件版本
完整的 SVG 文件,可以:
- 直接在浏览器中打开预览
- 在 SVG 编辑器中编辑 (Figma, Illustrator, Inkscape)
- 作为 `<img>` 标签使用
- 在 SVG 预览器中测试

**使用方式:**

```jsx
// 方式1: 作为图片引用
import doctorAvatar from './assets/avatars/doctor-avatar.svg'
<img src={doctorAvatar} alt="Doctor" />

// 方式2: 直接复制 SVG 代码到预览器中编辑
```

**SVG 文件特点:**
- ✅ 矢量图,无限缩放不失真
- ✅ 使用 CSS 类定义颜色,方便批量修改
- ✅ 所有路径都有清晰注释
- ✅ 使用 `transform` 统一调整位置
- ✅ 可以直接在文本编辑器中修改

## 如何编辑 SVG

### 在 SVG 预览器中:
1. 打开 Game2 应用
2. 点击顶部导航 "SVG 预览器"
3. 打开 `doctor-avatar.svg` 文件
4. 复制内容到左侧编辑器
5. 修改代码,右侧实时预览
6. 保存回文件

### 在代码编辑器中:
直接编辑 `doctor-avatar.svg` 文件中的:
- 颜色: 修改 `<style>` 中的 CSS 类
- 路径: 修改 `<path d="...">` 中的路径数据
- 位置: 修改 `<g transform="translate(...)">` 中的偏移值

### 快速修改颜色:
```svg
<style>
  .skin { fill: #FFFFFF; }    /* 皮肤颜色 */
  .hair { fill: #000000; }    /* 头发颜色 */
  .stroke { fill: #000000; }  /* 线条颜色 */
  .bg { fill: #F1EEE9; }      /* 背景颜色 */
</style>
```

## 添加新的 SVG 资源

推荐的目录结构:

```
src/assets/
├── avatars/
│   ├── doctor-avatar.svg
│   ├── kid-avatar.svg
│   └── ...
├── icons/
│   ├── ui-icons.svg         # UI 图标集合
│   ├── button-play.svg
│   └── ...
├── backgrounds/
│   ├── kitchen-2d.svg       # 2D 卡通厨房
│   ├── room.svg
│   └── ...
└── objects/
    ├── apple.svg
    ├── knife.svg
    └── ...
```

## 最佳实践

1. **文件命名**: 使用小写字母和连字符 (kebab-case)
   - ✅ `doctor-avatar.svg`
   - ❌ `DoctorAvatar.svg`

2. **使用 viewBox**: 设置合适的 viewBox 以便缩放
   ```svg
   <svg viewBox="0 0 100 100">
   ```

3. **组织路径**: 使用 `<g>` 标签分组相关元素
   ```svg
   <g id="face">
     <path class="skin" d="..." />
     <path class="eyes" d="..." />
   </g>
   ```

4. **颜色管理**: 使用 CSS 类而不是内联样式
   - ✅ `<path class="hair" />`
   - ❌ `<path fill="#000" />`

5. **添加注释**: 标注重要的路径
   ```svg
   <!-- 头发层 -->
   <path class="hair" d="..." />
   ```
