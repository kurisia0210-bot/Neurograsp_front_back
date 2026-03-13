import React, { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ⏳ HoldableTrigger (Trigger版本)
 * 逻辑：悬停1秒 → 触发trigger → 保持视觉反馈 → 移开鼠标后重置
 */
export function HoldableTrigger({ 
  children, 
  duration = 1.0, 
  onTrigger, // 触发器回调
  radius = 0.6,
  disabled = false,
  ...props 
}) {
  const [hovered, setHovered] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isTriggered, setIsTriggered] = useState(false) // 使用state而不是ref
  
  // 内部状态
  const timerRef = useRef(0)
  const triggerCalledRef = useRef(false) // 防止重复触发

  useFrame((state, delta) => {
    if (disabled) return

    // 🟢 状态 1: 正在悬停
    if (hovered) {
      // 只有在没触发的情况下才计时
      if (!isTriggered) {
        timerRef.current += delta
        const curr = Math.min(timerRef.current / duration, 1.0)
        setProgress(curr)

        // ⚡️ 触发时刻
        if (timerRef.current >= duration) {
          setIsTriggered(true) // 设置触发状态
          setProgress(1.0) // 确保进度显示为100%
          
          // 🛡️ 防重复触发
          if (!triggerCalledRef.current && onTrigger) {
            triggerCalledRef.current = true
            console.log("🎯 Trigger版本：触发事件")
            
            // 延迟触发，确保用户看到反馈
            setTimeout(() => {
              onTrigger()
            }, 0)
          }
        }
      } else {
        // 已触发状态：保持进度为100%
        setProgress(1.0)
      }
    } 
    // 🔴 状态 2: 移开/未悬停
    else {
      if (timerRef.current > 0) {
        // 快速回退 (Decay)
        timerRef.current -= delta * 3 
        setProgress(Math.max(timerRef.current / duration, 0))
      } else {
        // 🏁 只有进度彻底归零，才重置所有状态
        setIsTriggered(false)
        triggerCalledRef.current = false
        timerRef.current = 0
      }
    }
  })

  return (
    <group {...props}>
      <group 
        onPointerOver={(e) => {
          if (disabled) return
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'progress'
        }} 
        onPointerOut={(e) => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          // 直接点击也触发
          if (disabled) return
          e.stopPropagation()
          if (!isTriggered && onTrigger) {
            setIsTriggered(true)
            setProgress(1.0)
            timerRef.current = duration
            
            setTimeout(() => {
              console.log("🖱️ Trigger版本：直接点击触发")
              onTrigger()
            }, 0)
          }
        }}
      >
        {children}
      </group>

      {/* 视觉反馈：绿色进度环 */}
      {(progress > 0) && (
        <group position={[0, 0.8, 0]}>
          <mesh>
            <ringGeometry args={[radius * 0.85, radius, 32]} />
            <meshBasicMaterial color="white" opacity={0.3} transparent side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <ringGeometry args={[radius * 0.85, radius, 32, 1, 0, progress * Math.PI * 2]} />
            <meshBasicMaterial color="#2ecc71" side={THREE.DoubleSide} />
          </mesh>
          
          {/* 成功后的 OK 提示 */}
          {isTriggered && (
             <Text 
               position={[0, 0, 0.01]} 
               fontSize={radius * 0.6} 
               color="#2ecc71" 
               anchorX="center" 
               anchorY="middle"
               fontWeight="bold"
             >
               OK
             </Text>
          )}
        </group>
      )}
    </group>
  )
}