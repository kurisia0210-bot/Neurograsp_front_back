import React, { useState } from 'react'
import { useGLTF } from '@react-three/drei'

export function Pot(props) {
  const { nodes, materials } = useGLTF('/models/props/pot.glb')
  
  // 🖱�?简单的悬停交互反馈
  const [hovered, setHover] = useState(false)

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Long_Pot.geometry}
        material={materials.Room_Assets_MAT}
        rotation={[Math.PI / 2, 0, 0]}
        scale={2}
        // 交互事件
        onPointerOver={() => {
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {/* 可选：高亮效果 (通过修改材质颜色实现简单的选中反馈) */}
        {hovered && <meshStandardMaterial color="#bdc3c7" transparent opacity={0.3} depthWrite={false} />}
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/props/pot.glb')
