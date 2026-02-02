import React, { useState, useMemo } from 'react'
import { Html, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

// 🎹 单个按键组件
function Key({ label, position, onClick }) {
  const [active, setActive] = useState(false)
  const [currentY, setCurrentY] = useState(0)
  const targetY = active ? -0.02 : 0

  // 使用 useFrame 实现平滑动画
  useFrame(() => {
    setCurrentY(y => y + (targetY - y) * 0.3)
  })

  const handlePointerDown = (e) => {
    e.stopPropagation()
    setActive(true)
    onClick(label)
    // 模拟回弹
    setTimeout(() => setActive(false), 150)
  }

  return (
    <group position={[position[0], currentY, position[2]]}>
      {/* 按钮实体 */}
      <mesh 
        position={[0, 0.05, 0]} 
        onPointerDown={handlePointerDown}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshStandardMaterial color={active ? "#3b82f6" : "#e2e8f0"} />
      </mesh>
      {/* 按钮上的文字 */}
      <Text position={[0, 0.11, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.08} color="#1e293b">
        {label}
      </Text>
    </group>
  )
}

// ☎️ 电话主体
export function Telephone({ onDial, ...props }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

  return (
    <group {...props}>
      {/* 1. 基座 (Base) */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.2, 1.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* 2. 听筒架 (Cradle) */}
      <mesh position={[0, 0.2, -0.4]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.1, 0.3]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* 3. 听筒 (Handset) - 简单的长条 */}
      <mesh position={[0, 0.35, -0.4]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.15, 0.25]} />
        <meshStandardMaterial color="#ef4444" /> {/* 红色听筒，醒目 */}
      </mesh>

      {/* 4. 显示屏 (Screen) */}
      <group position={[0, 0.15, -0.1]} rotation={[-0.2, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#94a3b8" emissive="#94a3b8" emissiveIntensity={0.2} />
        </mesh>
        {/* 这里未来可以显示输入的数字 */}
      </group>

      {/* 5. 键盘区域 (Keypad) */}
      <group position={[0, 0.1, 0.3]} rotation={[-0.1, 0, 0]}>
        {keys.map((key, i) => {
          const row = Math.floor(i / 3)
          const col = i % 3
          // 计算每个键的位置: 居中排列
          return (
            <Key 
              key={key} 
              label={key} 
              // x: -0.2, 0, 0.2 | z: 0, 0.2, 0.4, 0.6
              position={[(col - 1) * 0.22, 0, row * 0.22]} 
              onClick={onDial} 
            />
          )
        })}
      </group>
    </group>
  )
}