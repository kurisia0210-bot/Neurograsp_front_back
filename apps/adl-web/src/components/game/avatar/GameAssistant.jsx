import React, { useMemo } from 'react'
import { DoctorAvatar } from './DoctorAvatar'
// 📦 引入新封装的气泡组件
import { NotificationBubble } from '../items/NotificationBubble'

/**
 * 👩‍⚕️ 游戏助手 HUD
 * 1. 右上角：NotificationBubble (静态头像 + 提示文案)
 * 2. 右下角：Mascot (动态头像，负责陪伴)
 */
export function GameAssistant({ isVictory, isSliced, isTriggered }) {
  
  // 🧠 状态映射 (逻辑不变)
  const { status, text, subText } = useMemo(() => {
    if (isVictory) {
      return { 
        status: 'success', 
        text: "任务圆满完成！",
        subText: "康复评估：优秀 (S级)" // ✨ 利用次级文字展示更多信息
      }
    }
    if (isSliced) {
      return { 
        status: 'idle', 
        text: "请进行样本分类",
        subText: "将方块拖入对应颜色的盒子"
      }
    }
    if (isTriggered) {
      return { 
        status: 'inputting', 
        text: "正在切片处理...",
        subText: "系统运算中，请勿操作"
      }
    }
    return { 
      status: 'idle', 
      text: "等待任务开始",
      subText: "拖动方块进入红色感应区"
    }
  }, [isVictory, isSliced, isTriggered])

  return (
    <>
      {/* ==============================================
          1. 右上角：消息通知气泡 (封装版)
          ============================================== */}
      <div style={{
        position: 'absolute',
        top: '24px',    
        right: '24px',  
        zIndex: 50,
        pointerEvents: 'none',
        // 简单的入场动画
        animation: 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s forwards',
        opacity: 0,
        transform: 'translateX(20px)'
      }}>
        <NotificationBubble 
          text={text} 
          subText={subText} // 传入次级文字
          status={status}   // 传入原始状态，组件内部会自动“静音”说话动作
          style={{ pointerEvents: 'auto' }}
        />
      </div>

      {/* ==============================================
          2. 右下角：常驻数字人 (保持原样)
          ============================================== */}
      <div style={{
        position: 'absolute',
        bottom: '24px', 
        right: '24px',  
        zIndex: 40,     
        pointerEvents: 'none' 
      }}>
        <div style={{
          width: '120px',   
          height: '120px',
          borderRadius: '50%', 
          background: '#a29bfe',
          border: '4px solid white',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          pointerEvents: 'auto', 
          transition: 'transform 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* 这里的头像依然是动态的，status 会原样透传 */}
          <DoctorAvatar status={status} className="w-full h-full" />
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}