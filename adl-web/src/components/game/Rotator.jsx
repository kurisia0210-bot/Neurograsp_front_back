import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 🧱 核心基建：Rotator (v2.0 Event Driven)
// 增加了动作完成的回调能力，消灭魔法数字
export function Rotator({ 
  children, 
  active, 
  axis = 'y', 
  angle = 90, 
  speed = 4, 
  onComplete, // ✨ 新增：回调函数
  ...props 
}) {
  const groupRef = useRef()
  // 🔒 信号锁：防止一帧内多次触发，或在到达后持续触发
  const notifiedRef = useRef(false)

  // 当目标状态改变时（比如重置），重置信号锁
  useEffect(() => {
    notifiedRef.current = false
  }, [active])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    
    // 1. 计算目标
    const targetRad = THREE.MathUtils.degToRad(active ? angle : 0)
    
    // 2. 物理插值
    const currentVal = groupRef.current.rotation[axis]
    const nextVal = THREE.MathUtils.lerp(currentVal, targetRad, delta * speed)
    groupRef.current.rotation[axis] = nextVal

    // 3. ✨ 判定：是否到达目标？(阈值 0.01 弧度，约 0.5 度)
    // 只有在 active=true (下劈) 且 尚未通知过 的情况下才触发
    if (active && !notifiedRef.current && Math.abs(nextVal - targetRad) < 0.01) {
      notifiedRef.current = true // 锁定信号
      if (onComplete) onComplete() // 🎉 触发回调
    }
  })

  return <group ref={groupRef} {...props}>{children}</group>
}