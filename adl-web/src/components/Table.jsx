import React from 'react'
import { useGLTF } from '@react-three/drei'
// 🚫 移除物理依赖：RigidBody 已移除

export function Table(props) {
  const { nodes, materials } = useGLTF('/table.glb')
  
  // 🔄 默认缩放（1.2 倍）
  const defaultScale = 1.2
  
  return (
    // 纯视觉模型，不需要物理碰撞
    <group {...props} scale={props.scale || defaultScale} dispose={null}>
        {/* 1. 桌子主体 */}
        <mesh
          castShadow // ✅ 开启阴影
          receiveShadow // ✅ 接收阴影
          geometry={nodes.Prop_KitchenTable_01.geometry}
          material={materials['Material.001']}
          rotation={[Math.PI / 2, 0, 0]}
          scale={0.01}
        >
          {/* 2. 切菜板 (自带的子物体) */}
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Prop_CuttingPlate.geometry}
            material={materials['Material.002']}
            position={[0, 0, -103.6]}
            scale={[4.4, 1.97, 1]}
          />
        </mesh>
      </group>
  )
}

useGLTF.preload('/table.glb')