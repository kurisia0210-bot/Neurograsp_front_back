import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Text } from '@react-three/drei'
import * as THREE from 'three'

import { Holdable } from '../components/game/interaction/Holdable'
import { HoldableTrigger } from '../components/game/interaction/HoldableTrigger'

// 🚪 测试门组件 - 使用原始Holdable（监听器方式）
function TestDoorOriginal({ position, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [canOpen, setCanOpen] = useState(false)

  React.useEffect(() => {
    if (canOpen) {
      console.log(`🎯 ${label} - 监听器检测到canOpen变化`)
      const timer = setTimeout(() => {
        console.log(`🚪 ${label} - 监听器自动开门`)
        setIsOpen(!isOpen)
        setCanOpen(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [canOpen, isOpen, label])

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 0.1]} />
        <meshStandardMaterial color={isOpen ? "#81ecec" : "#74b9ff"} />
      </mesh>

      <Holdable 
        duration={1.0}
        radius={0.25}
        onComplete={() => {
          console.log(`✅ ${label} - Hold完成，设置canOpen`)
          setCanOpen(true)
        }}
      >
        <mesh position={[0, 1, 0.06]}>
          <boxGeometry args={[0.3, 0.5, 0.05]} />
          <meshStandardMaterial color="#2ecc71" transparent opacity={0.7} />
        </mesh>
      </Holdable>

      <Text position={[0, 2.2, 0]} fontSize={0.15} color={canOpen ? "#2ecc71" : "#e74c3c"} anchorX="center">
        {label}: {canOpen ? "自动开门中..." : "Hold 1秒"}
      </Text>
    </group>
  )
}

// 🚪 测试门组件 - 使用HoldableTrigger（触发器方式）
function TestDoorTrigger({ position, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [triggered, setTriggered] = useState(false)

  const handleTrigger = () => {
    console.log(`🎯 ${label} - Trigger被调用`)
    setTriggered(true)
    
    // 延迟执行开门，模拟监听器的行为
    setTimeout(() => {
      console.log(`🚪 ${label} - Trigger执行开门`)
      setIsOpen(!isOpen)
      setTriggered(false)
    }, 100)
  }

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 0.1]} />
        <meshStandardMaterial color={isOpen ? "#ff9f43" : "#ff6b6b"} />
      </mesh>

      <HoldableTrigger 
        duration={1.0}
        radius={0.25}
        onTrigger={handleTrigger}
      >
        <mesh position={[0, 1, 0.06]}>
          <boxGeometry args={[0.3, 0.5, 0.05]} />
          <meshStandardMaterial color="#9b59b6" transparent opacity={0.7} />
        </mesh>
      </HoldableTrigger>

      <Text position={[0, 2.2, 0]} fontSize={0.15} color={triggered ? "#9b59b6" : "#e74c3c"} anchorX="center">
        {label}: {triggered ? "Trigger执行中..." : "Hold 1秒"}
      </Text>
    </group>
  )
}

// 🪑 测试桌子
const TestTable = ({ position, size = 3 }) => (
  <group position={position}>
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[size, 1, size]} />
      <meshStandardMaterial color="#b2bec3" />
    </mesh>
  </group>
)

export function HoldableComparison() {
  return (
    <div className="w-full h-full relative bg-[#2d3436]">
      <div className="absolute top-4 left-4 z-10 text-white">
        <h1 className="text-2xl font-bold mb-2">Holdable组件对比测试</h1>
        <p className="mb-1">🔵 蓝色门：原始Holdable（监听器方式）</p>
        <p className="mb-1">🔴 红色门：HoldableTrigger（触发器方式）</p>
        <p className="mb-4">测试步骤：1. Hold 1秒 2. 观察是否闪退 3. 查看控制台日志</p>
      </div>

      <Canvas>
        <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={40} onUpdate={c => c.lookAt(0, 0, 0)} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[-5, 10, 5]} intensity={1.5} />
        
        <TestTable position={[0, 0, 0]} />

        {/* 左侧：原始Holdable（监听器） */}
        <TestDoorOriginal position={[-2, 0, 0]} label="监听器版本" />

        {/* 右侧：HoldableTrigger（触发器） */}
        <TestDoorTrigger position={[2, 0, 0]} label="触发器版本" />

        {/* 说明文字 */}
        <Text position={[-2, 3, 0]} fontSize={0.2} color="#74b9ff" anchorX="center">
          监听器方式
        </Text>
        <Text position={[2, 3, 0]} fontSize={0.2} color="#ff6b6b" anchorX="center">
          触发器方式
        </Text>

        <Text position={[0, -1.5, 0]} fontSize={0.15} color="white" anchorX="center">
          测试闪退问题：Hold成功后保持悬停，观察视觉反馈
        </Text>
      </Canvas>
    </div>
  )
}