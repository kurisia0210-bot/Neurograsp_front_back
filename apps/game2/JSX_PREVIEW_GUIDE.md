# JSX 预览器使用指南

## ✅ 新增功能

已在 Game2 中添加 **JSX 预览器**页面,位于顶部导航第三个标签。

## 🎯 功能特性

### 1. **实时 JSX 代码预览**
- 左侧编辑 JSX 代码
- 右侧实时渲染预览
- 支持 React Hooks (useState, useEffect)
- 支持 Tailwind CSS 类名

### 2. **快速加载模板**
内置了多个预设模板,可以快速加载:

- ✅ **Doctor Avatar (SVG)** - 显示 Doctor Avatar
- ✅ **Bird Icon (SVG)** - 显示小鸟图标
- ✅ **Bear Icon (SVG)** - 显示小熊图标
- ✅ **组合示例** - 展示如何组合多个资源

### 3. **引用 Assets 资源**
可以直接引用 `src/assets/` 下的所有资源:

```jsx
function MyComponent() {
  return (
    <img 
      src="/src/assets/icons/bird.svg" 
      alt="Bird"
      className="w-32 h-32"
    />
  )
}
```

## 📝 使用方法

### 基本使用

1. 打开 Game2 应用
2. 点击顶部导航的 "JSX 预览器"
3. 在左侧编辑器中编写代码
4. 右侧自动实时预览

### 组件命名规则

组件名必须是以下之一:
- `MyComponent` (默认)
- `DoctorPreview`
- `BirdPreview`
- `BearPreview`
- `CombinedPreview`

### 示例代码

#### 示例 1: 简单的卡片

```jsx
function MyComponent() {
  return (
    <div className="p-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg">
      <h1 className="text-4xl font-bold text-white mb-4">Hello Game 2!</h1>
      <p className="text-white text-lg">这是一个简单的示例</p>
    </div>
  )
}
```

#### 示例 2: 引用 SVG 资源

```jsx
function MyComponent() {
  return (
    <div className="flex items-center justify-center p-8">
      <img 
        src="/src/assets/avatars/doctor-avatar.svg" 
        alt="Doctor"
        className="w-64 h-64"
      />
    </div>
  )
}
```

#### 示例 3: 使用 React Hooks

```jsx
function MyComponent() {
  const [count, setCount] = React.useState(0)
  
  return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">计数器: {count}</h2>
      <button 
        onClick={() => setCount(count + 1)}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        点击 +1
      </button>
    </div>
  )
}
```

#### 示例 4: 遍历 Assets

```jsx
function MyComponent() {
  const animals = [
    { name: 'Bird', src: '/src/assets/icons/bird.svg', color: 'bg-blue-100' },
    { name: 'Bear', src: '/src/assets/icons/bear.svg', color: 'bg-amber-100' },
  ]
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">动物图标</h1>
      <div className="grid grid-cols-2 gap-6">
        {animals.map((animal) => (
          <div key={animal.name} className={`${animal.color} p-6 rounded-xl text-center`}>
            <img src={animal.src} alt={animal.name} className="w-24 h-24 mx-auto mb-3" />
            <p className="font-bold text-lg">{animal.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 🎨 可用的 Assets 资源

当前可用的资源文件:

### Avatars
- `/src/assets/avatars/doctor-avatar.svg` - Doctor 头像

### Icons
- `/src/assets/icons/bird.svg` - 小鸟图标
- `/src/assets/icons/bear.svg` - 小熊图标

## ⚠️ 注意事项

1. **组件命名**: 必须使用规定的组件名之一
2. **React 引用**: 使用 `React.useState` 而不是直接 `useState`
3. **错误提示**: 如果代码有错误,会在预览区显示错误信息
4. **资源路径**: 使用 `/src/assets/...` 作为资源路径前缀

## 🚀 下一步

你可以:
1. 添加更多 SVG 资源到 `src/assets/` 目录
2. 在 JSX 预览器中测试这些资源
3. 创建新的模板添加到下拉列表中
4. 开发游戏组件并实时预览效果

## 💡 提示

- 使用"快速加载模板"下拉菜单快速开始
- 点击"复制代码"可以将代码复制到剪贴板
- 支持完整的 Tailwind CSS 功能
- 可以创建复杂的交互组件进行测试
