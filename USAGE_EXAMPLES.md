# 使用示例

## 如何在游戏中使用共享资源

### 1. 使用共享 UI 组件

首先在 `packages/shared-ui/src/components/` 中创建组件:

```jsx
// packages/shared-ui/src/components/Button.jsx
export function Button({ children, onClick, variant = 'primary' }) {
  const baseClasses = 'px-4 py-2 rounded font-bold transition-colors'
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
  }
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

然后在 `packages/shared-ui/src/index.js` 中导出:

```js
export { Button } from './components/Button'
```

在游戏中使用:

```jsx
// apps/game1/src/App.jsx 或 apps/game2/src/App.jsx
import { Button } from '@neuroweb/shared-ui'

function App() {
  return <Button onClick={() => alert('点击!')}>开始游戏</Button>
}
```

### 2. 使用共享资源素材

将图片放入 `packages/shared-assets/images/`:

```
packages/shared-assets/
└── images/
    ├── logo.png
    ├── background.jpg
    └── avatar-default.png
```

在游戏中使用:

```jsx
// apps/game1/src/components/Header.jsx
import logo from '@neuroweb/shared-assets/images/logo.png'

function Header() {
  return (
    <div>
      <img src={logo} alt="Logo" />
      <h1>Game 1</h1>
    </div>
  )
}
```

### 3. 扩展共享配置

如果某个游戏需要特殊配置,可以在自己的配置文件中扩展:

```js
// apps/game1/vite.config.js
import { createViteConfig } from '../../configs/vite/react-base.js'

export default createViteConfig({
  port: 5173,
  // 添加游戏特定配置
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // 其他自定义配置
})
```

### 4. 在两个游戏间共享主题

在 `configs/tailwind/base.js` 中定义共享主题:

```js
export const sharedTailwindConfig = {
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4F46E5',
        'brand-secondary': '#06B6D4',
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#EF4444',
      }
    }
  }
}
```

两个游戏都可以使用这些颜色:

```jsx
<div className="bg-brand-primary text-white">
  统一的品牌色
</div>
```

## 最佳实践

### 什么应该放在 shared-ui?
- 按钮、输入框等基础组件
- 卡片、对话框等布局组件
- 动画组件
- 只有当组件在至少 2 个游戏中使用时才放入 shared-ui

### 什么应该放在 shared-assets?
- Logo 和品牌图标
- 通用的 UI 图标
- 共享的背景图
- 通用音效(点击声、成功声等)
- 不要放游戏特定的资源

### 什么应该保留在各自游戏中?
- 游戏特定的业务逻辑
- 游戏特定的组件
- 游戏特定的资源素材
- 路由配置
- 状态管理
