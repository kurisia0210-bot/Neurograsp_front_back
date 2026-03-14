import React from 'react'
import * as THREE from 'three'
import { Rotator } from '../Rotator' // ⚠️ 确保 Rotator 路径正确

export function BladeMachine({ position, isActive, onCutFinish }) {
  return (
    <group position={position}>
      {/* ⚙️ 旋转轴与逻辑核心 */}
      <Rotator 
        active={isActive} 
        axis="x" 
        angle={90} 
        speed={12} 
        position={[0, 0, -0.4]} // 位置调整为1/3
        onComplete={onCutFinish} // 🔗 核心连接点
      >
        <group>
            {/* 把手 */}
            <mesh position={[0, 0.5, 0]}> {/* Y位置调整为1/3 */}
                <boxGeometry args={[0.2, 0.033, 0.167]} /> {/* 尺寸变为原来的1/3 */}
                <meshStandardMaterial color="#2d3436" />
            </mesh>
            {/* 刀身 (薄片) */}
            <mesh position={[0, 0.25, 0]}> {/* Y位置调整为1/3 */}
                <boxGeometry args={[0.017, 0.5, 0.167]} /> {/* 尺寸变为原来的1/3 */}
                <meshStandardMaterial color="#dfe6e9" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* 刀刃 (危险色) */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.02, 0.017, 0.167]} /> {/* 尺寸变为原来的1/3 */}
                <meshStandardMaterial color="#ff7675" emissive="#ff7675" emissiveIntensity={0.5} />
            </mesh>
        </group>
      </Rotator>

      {/* 底座 (感应区视觉) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.017, 0]}> {/* Y位置调整为1/3 */}
        <planeGeometry args={[0.267, 0.5]} /> {/* 尺寸变为原来的1/3 */}
        <meshStandardMaterial color="#ff4757" opacity={0.5} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}