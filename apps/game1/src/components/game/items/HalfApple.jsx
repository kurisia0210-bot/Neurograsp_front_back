import React, { useLayoutEffect } from 'react'
import { useGLTF } from '@react-three/drei'

export function HalfApple(props) {
  // 1. 加载模型
  const { nodes } = useGLTF('/models/items/apple_half.glb')

  // 2. 强制 Flat Shading (保持多边形风�?
  useLayoutEffect(() => {
    if (nodes['apple-half']) {
      nodes['apple-half'].geometry.computeVertexNormals()
    }
  }, [nodes])

  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes['apple-half'].geometry}
        // 保持原来的旋�?
        rotation={[Math.PI / 2, 0, 0]} 
      >
        {/* 🍎 果肉颜色：淡黄色，稍微粗糙一�?*/}
        <meshStandardMaterial 
          color="#F9E79F" 
          roughness={0.8} 
          flatShading={true}
        />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/items/apple_half.glb')
