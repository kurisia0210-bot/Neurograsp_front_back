import React from 'react'
// 📦 引用数字人组件
import { DoctorAvatar } from '../avatar/DoctorAvatar' 

/**
 * 🗨️ 通知气泡 (NotificationBubble) - 最终自适应版
 * --------------------------------
 * * 🎨 配色方案 (回归专业医疗风):
 * - 气泡背景: #F6EFE6 (米色暖调)
 * - 文字颜色: #4A4A4A (深灰主色)
 * - 次级文字: #7A7A7A (浅灰辅色)
 * - 头像背景: #E6EFEA (淡雅医疗绿 - 修正回原案)
 * * 📏 尺寸策略 (自适应 & 可控):
 * - 宽度: 自动适应内容 (fit-content)，但有最小/最大限制
 * - 字体: 保持大号字体以确保老年人可视性
 */
export function NotificationBubble({ 
  text, 
  subText = null, 
  style = {},
  showArrowAnimation = false  // 新增：是否显示箭头动画
}) {
  
  return (
    <div style={{
      // 🎨 视觉风格
      background: '#F6EFE6', 
      borderRadius: '28px', // 圆润但不过分
      boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)', 
      padding: '24px 32px', 
      
      // 📐 布局策略：Flexbox
      display: 'flex',
      alignItems: 'center',
      gap: '24px', 
      
      // 🛡️ 核心修改：自适应宽度控制
      width: 'fit-content',      // 内容多少，我就多宽
      minWidth: '420px',         // 最小宽度：保证气场，不至于缩成一团
      maxWidth: '800px',         // 最大宽度：防止在宽屏上变成长条，遮挡中间操作区
      
      // 装饰
      borderLeft: '6px solid #E6EFEA', 
      
      // 相对定位，为箭头动画提供参考
      position: 'relative',
      overflow: 'visible',
      
      ...style 
    }}>
      
      {/* 🎯 箭头动画 - 移动整个bubble的指示器 */}
      {showArrowAnimation && (
        <div style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          animation: 'bubbleMoveRight 1.5s ease-in-out forwards',
          zIndex: 5
        }}>
          {/* 箭头图标放在右侧 */}
          <div style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '40px',
            height: '40px',
            opacity: 0.8
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M10 20H30M30 20L22 12M30 20L22 28" 
                stroke="#4A4A4A" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
      
      {/* 👤 1. 头像容器 */}
      <div style={{
        width: '72px', 
        height: '72px',
        borderRadius: '16px',
        
        // 🎨 回归你最初想要的淡雅绿，更耐看
        background: '#E6EFEA', 
        
        // 纯净无边框设计
        border: 'none',
        overflow: 'hidden',
        flexShrink: 0, 
        position: 'relative' 
      }}>
        {/* 🔒 强制静态，禁用眼动追踪，节省性能 */}
        <DoctorAvatar status="idle" className="w-full h-full" disableEyeTracking={true} />
      </div>

      {/* 📝 2. 文字区域 */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        flex: 1 // 让文字区域填满剩余空间
      }}>
        {/* 主文字 */}
        <div style={{
          color: '#4A4A4A', 
          fontSize: '20px', // 稍微调小一点点，兼顾精致感
          fontWeight: '800', 
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          lineHeight: '1.4',
          letterSpacing: '0.5px'
        }}>
          {text}
        </div>
        
        {/* 次级文字 */}
        {subText && (
          <div style={{
            color: '#7A7A7A', 
            fontSize: '16px', 
            fontWeight: '600',
            marginTop: '2px'
          }}>
            {subText}
          </div>
        )}
      </div>

      {/* CSS动画定义 */}
      <style>{`
        @keyframes bubbleMoveRight {
          0% {
            transform: translateX(0px);
            opacity: 0;
          }
          20% {
            transform: translateX(0px);
            opacity: 1;
          }
          80% {
            transform: translateX(60px);
            opacity: 1;
          }
          100% {
            transform: translateX(60px);
            opacity: 0;
          }
        }
        
        @keyframes arrowMoveRightInside {
          0% {
            opacity: 0;
            transform: translateY(-50%) translateX(0px);
          }
          20% {
            opacity: 1;
            transform: translateY(-50%) translateX(0px);
          }
          80% {
            opacity: 1;
            transform: translateY(-50%) translateX(40px);
          }
          100% {
            opacity: 0;
            transform: translateY(-50%) translateX(40px);
          }
        }
        
        @keyframes arrowMoveRight {
          0% {
            opacity: 0;
            transform: translateY(-50%) translateX(-20px);
          }
          20% {
            opacity: 1;
            transform: translateY(-50%) translateX(-20px);
          }
          80% {
            opacity: 1;
            transform: translateY(-50%) translateX(20px);
          }
          100% {
            opacity: 0;
            transform: translateY(-50%) translateX(20px);
          }
        }
      `}</style>

    </div>
  )
}
