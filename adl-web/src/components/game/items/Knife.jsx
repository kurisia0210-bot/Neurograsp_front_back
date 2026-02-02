import React, { useLayoutEffect } from 'react'
import { useGLTF } from '@react-three/drei'

export function Knife(props) {
  const { nodes, materials } = useGLTF('/knife.glb')

  useLayoutEffect(() => {
    Object.values(materials).forEach((material) => {
      material.flatShading = true;
      material.needsUpdate = true;
    });
  }, [materials]);

  return (
    // 1. 把 props 传给最外层 group，这样 Controller 可以从外部控制整体缩放
    <group {...props} dispose={null}>
      
      {/* 2. 内部 Mesh：只保留"轴向修正"，删掉 scale */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.slicer.geometry}
        material={materials.Mat_blade}
        // 👇 这是为了修正 Blender 导出的轴向问题 (让刀尖朝前)
        // 保持这个不变，但不要在这里做"竖起来"的操作
        rotation={[-Math.PI/2, 0, Math.PI]} 
      />

      <mesh
        castShadow
        receiveShadow
        geometry={nodes.handle.geometry}
        material={materials.Mat_Handle}
        rotation={[-Math.PI/2, 0, Math.PI]}
      />
    </group>
  )
}

useGLTF.preload('/knife.glb')