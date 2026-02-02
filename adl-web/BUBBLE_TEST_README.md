# 🧪 NotificationBubble 测试仪表盘

## 使用方法

### 1. 启动测试页面

**方式 A：通过主菜单按钮**
- 启动应用后，在主菜单右下角会看到红色的 "🧪 Bubble Test" 按钮
- 点击进入测试仪表盘

**方式 B：直接启动（开发模式）**
```javascript
// 在 src/App.jsx 第 11 行修改：
const [currentScreen, setCurrentScreen] = useState('bubble-test')
```

### 2. 测试界面说明

#### 左侧：实时预览区
- 显示当前配置的 NotificationBubble
- 深色背景模拟游戏环境
- 底部有快速状态切换按钮（idle/success/fail/inputting）

#### 右侧：参数控制台

**📝 文字内容**
- 主文字：修改气泡的主要提示文字
- 显示次级文字：开关次级提示
- 次级文字：修改次级提示内容

**💬 气泡尺寸**
- 宽度：200-500px（默认 340px）
- 内边距：4-32px（默认 12px）
- 间距：头像与文字的间距，4-32px（默认 14px）
- 圆角：0-32px（默认 16px）

**👤 头像尺寸**
- 大小：32-80px（默认 48px）
- 圆角：0-40px（默认 10px，方圆形效果）
- 边框：0-6px（默认 2px）

**✍️ 文字样式**
- 主文字大小：10-24px（默认 14px）
- 主文字粗细：400-800（默认 600）
- 次级文字大小：8-18px（默认 12px）

### 3. 导出配置

点击底部的 "📋 导出配置到控制台" 按钮，会在浏览器控制台输出当前配置的 JSON 对象。

示例输出：
```javascript
{
  bubble: {
    maxWidth: 340,
    padding: "12px 16px",
    gap: 14,
    borderRadius: 16
  },
  avatar: {
    size: 48,
    borderRadius: 10,
    borderWidth: 2
  },
  text: {
    fontSize: 14,
    fontWeight: 600,
    subTextFontSize: 12
  }
}
```

### 4. 应用最佳配置

找到最佳参数后，在 `NotificationBubble.jsx` 中更新默认值：

```javascript
// 气泡容器
maxWidth: '340px',  // 从测试中获得
padding: '12px 16px',
gap: '14px',
borderRadius: '16px',

// 头像容器
width: '48px',
height: '48px',
borderRadius: '10px',
border: '2px solid #FFFFFF',

// 文字样式
fontSize: '14px',
fontWeight: '600',
```

## 测试建议

### 推荐测试场景

1. **短文本**："✅ 成功"
2. **中等长度**："👆 点击拖动方块到红色区域"
3. **长文本**："🎉 恭喜完成任务！你已经成功将所有物品放入正确的位置"
4. **带次级文字**：主文字 + 次级提示

### 不同屏幕尺寸测试

- 桌面端：1920x1080
- 平板端：768x1024
- 移动端：375x667

### 状态测试

- `idle`：默认状态
- `success`：成功表情（微笑）
- `fail`：失败表情（遗憾）
- `inputting`：会被强制降级为 idle（防止抢戏）

## 设计原则

### 当前配色方案
- 气泡背景：`#F6EFE6`（米色暖调）
- 主文字：`#4A4A4A`（深灰）
- 次级文字：`#7A7A7A`（浅灰）
- 头像背景：`#E6EFEA`（淡绿清新）
- 左侧装饰条：`#E6EFEA`

### 视觉层级
1. 头像（视觉锚点）
2. 主文字（核心信息）
3. 次级文字（补充说明）

### 可访问性
- 文字对比度符合 WCAG AA 标准
- 字体大小不小于 12px
- 行高保持 1.4 以上

## 技术实现

### CSS 变量覆盖
组件支持通过 `style` prop 传入 CSS 变量：

```javascript
<NotificationBubble 
  text="测试文字"
  style={{
    '--avatar-size': '56px',
    '--avatar-border-radius': '12px',
    '--text-font-size': '16px',
    // ... 其他变量
  }}
/>
```

### 支持的 CSS 变量
- `--avatar-size`
- `--avatar-border-radius`
- `--avatar-border-width`
- `--text-font-size`
- `--text-font-weight`
- `--subtext-font-size`

## 符合 Constitution

✅ **All behaviors come from explicit state**
- 所有样式参数都是显式的 state
- 没有隐藏的魔法数字

✅ **Rendering is a pure function of state**
- 预览区完全由控制台的 state 决定
- 修改参数立即反映在预览中

✅ **Prefer minimal abstractions**
- 直接操作样式值，没有过度封装
- 简单的 Slider/Input 组件

## 后续优化

- [ ] 添加预设配置（小/中/大）
- [ ] 支持导出为 CSS 文件
- [ ] 添加响应式测试模式
- [ ] 集成到 Storybook
