import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 🏭 对外暴露的主组件
export function Spawner({ 
  items = [], 
  renderItem, 
  stagger = 150 
}) {
  return (
    <group>
      {items.map((item, index) => (
        <SpawnAnimation key={item.id} delay={index * stagger}>
          {renderItem(item)}
        </SpawnAnimation>
      ))}
    </group>
  )
}

// 🔧 内部组件：负责 Pop-in 动画 (不对外暴露)
function SpawnAnimation({ children, delay }) {
  const groupRef = useRef()
  const [show, setShow] = useState(false)

  // 延迟显示
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  // 弹性缩放动画
  useFrame((state, delta) => {
    if (!groupRef.current) return
    const targetScale = show ? 1 : 0
    // 使用 lerp 插值实现平滑缩放
    const current = groupRef.current.scale.x
    const next = THREE.MathUtils.lerp(current, targetScale, delta * 8)
    groupRef.current.scale.setScalar(next)
  })

  return <group ref={groupRef} scale={[0, 0, 0]}>{children}</group>
}