# Game 2 资源目录

## 目录结构

```
src/
├── assets/
│   └── avatars/           # Avatar SVG 资源
│       └── DoctorParts.jsx  # SVG 路径定义
│
├── components/
│   └── DoctorAvatar.jsx   # Avatar 组件
│
└── App.jsx                # 示例页面
```

## 使用方式

### 1. 导入 Avatar 组件

```jsx
import { DoctorAvatar } from './components/DoctorAvatar'

function MyPage() {
  return (
    <div className="w-32 h-32">
      <DoctorAvatar status="waiting" />
    </div>
  )
}
```

### 2. 可用状态

- `waiting` - 等待中(默认)
- `processing` - 处理中(嘴巴动画)
- `completed` - 完成(显示手机)
- `supporting` - 支持中
- `speaking` - 说话中

### 3. 组件属性

```jsx
<DoctorAvatar 
  status="waiting"           // 状态
  className="w-full h-full"  // 自定义样式
  disableEyeTracking={false} // 是否禁用眼神追踪
/>
```

## 特性

- ✅ SVG 矢量图,可无限缩放
- ✅ 纯代码实现,无需外部图片
- ✅ 眼神追踪(跟随鼠标)
- ✅ 自动眨眼动画
- ✅ 头发飘动效果
- ✅ 状态切换嘴型变化
- ✅ 完成状态显示手机动画

## 添加新的 SVG 资源

在 `src/assets/` 下创建对应的子目录,例如:

```
src/assets/
├── avatars/     # 角色头像
├── icons/       # UI 图标
├── backgrounds/ # 背景图
└── objects/     # 游戏对象
```

每个 SVG 可以导出为 React 组件或纯 SVG 路径数据。
