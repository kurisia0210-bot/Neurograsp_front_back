import React, { useState } from 'react'
import { NotificationBubble } from '../components/game/items/NotificationBubble'

/**
 * 🧪 NotificationBubble 测试仪表盘
 * 用于实时调整气泡和头像的尺寸、位置等参数
 */
export function BubbleTestDashboard() {
  // === 可调参数 ===
  const [bubbleWidth, setBubbleWidth] = useState(340)
  const [bubblePadding, setBubblePadding] = useState(12)
  const [bubbleGap, setBubbleGap] = useState(14)
  const [bubbleBorderRadius, setBubbleBorderRadius] = useState(16)
  
  const [avatarSize, setAvatarSize] = useState(48)
  const [avatarBorderRadius, setAvatarBorderRadius] = useState(10)
  const [avatarBorderWidth, setAvatarBorderWidth] = useState(2)
  
  const [textFontSize, setTextFontSize] = useState(14)
  const [textFontWeight, setTextFontWeight] = useState(600)
  const [subTextFontSize, setSubTextFontSize] = useState(12)
  
  const [status, setStatus] = useState('idle')
  const [text, setText] = useState('👆 点击拖动方块到红色区域')
  const [subText, setSubText] = useState('这是次级提示文字')
  const [showSubText, setShowSubText] = useState(false)

  // 生成内联样式覆盖
  const customStyle = {
    maxWidth: `${bubbleWidth}px`,
    padding: `${bubblePadding}px ${bubblePadding + 4}px`,
    gap: `${bubbleGap}px`,
    borderRadius: `${bubbleBorderRadius}px`
  }

  const avatarStyle = {
    width: `${avatarSize}px`,
    height: `${avatarSize}px`,
    borderRadius: `${avatarBorderRadius}px`,
    borderWidth: `${avatarBorderWidth}px`
  }

  const textStyle = {
    fontSize: `${textFontSize}px`,
    fontWeight: textFontWeight
  }

  const subTextStyle = {
    fontSize: `${subTextFontSize}px`
  }

  // 导出配置代码
  const exportConfig = () => {
    const config = {
      bubble: {
        maxWidth: bubbleWidth,
        padding: `${bubblePadding}px ${bubblePadding + 4}px`,
        gap: bubbleGap,
        borderRadius: bubbleBorderRadius
      },
      avatar: {
        size: avatarSize,
        borderRadius: avatarBorderRadius,
        borderWidth: avatarBorderWidth
      },
      text: {
        fontSize: textFontSize,
        fontWeight: textFontWeight,
        subTextFontSize: subTextFontSize
      }
    }
    console.log('📋 配置已复制到控制台：', config)
    alert('配置已输出到控制台！')
  }

  // 控制面板显示状态
  const [showPanel, setShowPanel] = useState(true)

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#2d3436',
      position: 'relative',
      fontFamily: 'monospace',
      overflow: 'hidden'
    }}>
      
      {/* 全屏预览区 */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px'
      }}>
        
        {/* 气泡预览 */}
        <NotificationBubble 
          text={text}
          subText={showSubText ? subText : null}
          status={status}
          style={{
            ...customStyle,
            // 内部样式覆盖
            '--avatar-size': `${avatarSize}px`,
            '--avatar-border-radius': `${avatarBorderRadius}px`,
            '--avatar-border-width': `${avatarBorderWidth}px`,
            '--text-font-size': `${textFontSize}px`,
            '--text-font-weight': textFontWeight,
            '--subtext-font-size': `${subTextFontSize}px`
          }}
        />

        {/* 快速状态切换 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {['idle', 'success', 'fail', 'inputting'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                padding: '12px 24px',
                background: status === s ? '#00cec9' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: status === s ? '2px solid #00cec9' : '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 浮动控制面板切换按钮 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          position: 'fixed',
          top: '20px',
          right: showPanel ? '420px' : '20px',
          padding: '12px 20px',
          background: '#00cec9',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
          zIndex: 1001,
          boxShadow: '0 4px 12px rgba(0,206,201,0.4)',
          transition: 'right 0.3s ease'
        }}
      >
        {showPanel ? '◀ 隐藏面板' : '▶ 显示面板'}
      </button>

      {/* 右侧：浮动控制面板 */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: showPanel ? 0 : '-420px',
        width: '400px',
        height: '100vh',
        background: 'white',
        padding: '30px',
        overflowY: 'auto',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        transition: 'right 0.3s ease',
        zIndex: 1000
      }}>
        <h2 style={{ marginTop: 0, fontSize: '20px', color: '#2d3436' }}>
          🎛️ 参数控制台
        </h2>

        {/* 文字内容 */}
        <Section title="📝 文字内容">
          <Input 
            label="主文字" 
            value={text} 
            onChange={setText}
            type="text"
          />
          <Checkbox 
            label="显示次级文字" 
            checked={showSubText} 
            onChange={setShowSubText}
          />
          {showSubText && (
            <Input 
              label="次级文字" 
              value={subText} 
              onChange={setSubText}
              type="text"
            />
          )}
        </Section>

        {/* 气泡尺寸 */}
        <Section title="💬 气泡尺寸">
          <Slider 
            label={`宽度: ${bubbleWidth}px`} 
            value={bubbleWidth} 
            onChange={setBubbleWidth}
            min={200}
            max={500}
          />
          <Slider 
            label={`内边距: ${bubblePadding}px`} 
            value={bubblePadding} 
            onChange={setBubblePadding}
            min={4}
            max={32}
          />
          <Slider 
            label={`间距: ${bubbleGap}px`} 
            value={bubbleGap} 
            onChange={setBubbleGap}
            min={4}
            max={32}
          />
          <Slider 
            label={`圆角: ${bubbleBorderRadius}px`} 
            value={bubbleBorderRadius} 
            onChange={setBubbleBorderRadius}
            min={0}
            max={32}
          />
        </Section>

        {/* 头像尺寸 */}
        <Section title="👤 头像尺寸">
          <Slider 
            label={`大小: ${avatarSize}px`} 
            value={avatarSize} 
            onChange={setAvatarSize}
            min={32}
            max={80}
          />
          <Slider 
            label={`圆角: ${avatarBorderRadius}px`} 
            value={avatarBorderRadius} 
            onChange={setAvatarBorderRadius}
            min={0}
            max={40}
          />
          <Slider 
            label={`边框: ${avatarBorderWidth}px`} 
            value={avatarBorderWidth} 
            onChange={setAvatarBorderWidth}
            min={0}
            max={6}
          />
        </Section>

        {/* 文字样式 */}
        <Section title="✍️ 文字样式">
          <Slider 
            label={`主文字大小: ${textFontSize}px`} 
            value={textFontSize} 
            onChange={setTextFontSize}
            min={10}
            max={24}
          />
          <Slider 
            label={`主文字粗细: ${textFontWeight}`} 
            value={textFontWeight} 
            onChange={setTextFontWeight}
            min={400}
            max={800}
            step={100}
          />
          <Slider 
            label={`次级文字大小: ${subTextFontSize}px`} 
            value={subTextFontSize} 
            onChange={setSubTextFontSize}
            min={8}
            max={18}
          />
        </Section>

        {/* 导出按钮 */}
        <button
          onClick={exportConfig}
          style={{
            width: '100%',
            padding: '12px',
            background: '#00cec9',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            marginTop: '20px'
          }}
        >
          📋 导出配置到控制台
        </button>
      </div>
    </div>
  )
}

// === 辅助组件 ===

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ 
        fontSize: '14px', 
        color: '#636e72', 
        marginBottom: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

function Slider({ label, value, onChange, min, max, step = 1 }) {
  return (
    <div>
      <label style={{ fontSize: '12px', color: '#2d3436', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <input 
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        style={{ width: '100%' }}
      />
    </div>
  )
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={{ fontSize: '12px', color: '#2d3436', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          border: '1px solid #dfe6e9',
          borderRadius: '6px',
          fontSize: '13px'
        }}
      />
    </div>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      color: '#2d3436'
    }}>
      <input 
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: 'pointer' }}
      />
      {label}
    </label>
  )
}
