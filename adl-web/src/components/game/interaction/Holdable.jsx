import React, { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ⏳ Holdable (触发器版本)
 * 轻量级实现，核心功能：
 * 1. 悬停累积时间，达到duration时触发onClick
 * 2. 触发后锁定，防止重复触发
 * 3. 移开鼠标后重置，允许下次触发
 * 4. 支持直接点击触发
 */
export function Holdable({ 
  children, 
  duration = 1.0, 
  onClick, // 触发器回调
  radius = 0.6,
  disabled = false,
  ...props 
}) {
  const [hovered, setHovered] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // 内部状态
  const timerRef = useRef(0)
  const isLockedRef = useRef(false)

  useFrame((state, delta) => {
    if (disabled) return

    // 正在悬停
    if (hovered) {
      if (!isLockedRef.current) {
        timerRef.current += delta
        const curr = Math.min(timerRef.current / duration, 1.0)
        setProgress(curr)

        // 触发时刻
        if (timerRef.current >= duration) {
          isLockedRef.current = true
          setProgress(1.0)
          
          // 触发回调
          setTimeout(() => {
            if (onClick) onClick()
          }, 0)
        }
      } else {
        // 已锁定状态：保持进度为100%
        setProgress(1.0)
      }
    } 
    // 移开鼠标
    else {
      if (timerRef.current > 0) {
        // 快速回退
        timerRef.current -= delta * 3 
        setProgress(Math.max(timerRef.current / duration, 0))
      } else {
        // 重置状态
        isLockedRef.current = false
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
          if (!isLockedRef.current && onClick) {
            isLockedRef.current = true
            setProgress(1.0)
            timerRef.current = duration
            
            setTimeout(() => {
              onClick()
            }, 0)
          }
        }}
      >
        {children}
      </group>

      {/* 视觉反馈 */}
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
          
          {/* 成功提示 */}
          {isLockedRef.current && (
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