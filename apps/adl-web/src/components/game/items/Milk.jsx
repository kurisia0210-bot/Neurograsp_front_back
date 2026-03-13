import React from 'react'
import { ContactShadows } from '@react-three/drei'

export function Milk({ position }) {
  return (
    <group position={position}>
      {/* 🥛 牛奶盒主体 (Box) */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.12, 0.2, 0.12]} />
        <meshStandardMaterial color="#ecf0f1" />
      </mesh>
      
      {/* 🏷️ 标签 (蓝色条纹) */}
      <mesh position={[0, 0.12, 0.061]}>
        <planeGeometry args={[0.08, 0.05]} />
        <meshStandardMaterial color="#3498db" />
      </mesh>

      {/* 🔼 顶部封口 (Triangular Prism 模拟) */}
      <mesh position={[0, 0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
         <boxGeometry args={[0.08, 0.04, 0.08]} />
         <meshStandardMaterial color="#ecf0f1" />
      </mesh>

      <ContactShadows opacity={0.3} scale={0.5} blur={1} color="#999" />
    </group>
  )
}