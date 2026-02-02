import React from 'react'
import { useGLTF } from '@react-three/drei'

export function Apple(props) {
  // 1. 获取模型数据
  const { nodes } = useGLTF('/apple.glb')
  
  // (可选) 调试完成，可以把这行删掉了
  // console.log("🔍 当前节点:", nodes);

  return (
    <group {...props} dispose={null}>
      
      {/* 🍎 苹果主体 */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.apple.geometry} // 👈 对应截图里的 apple
        rotation={[Math.PI / 2, 0, 0]}   // 保持旋转
      >
         <meshStandardMaterial 
           color="#A83228" 
           roughness={0.7} 
           flatShading={true} 
         />
      </mesh>

      {/* 🍃 苹果叶子 */}
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.appleleaf.geometry} // 👈 对应截图里的 appleleaf
        position={[0, 0.45, 0]} // Y轴向上偏移0.5，让叶子在苹果顶部
        rotation={[Math.PI / 2, 0, 0]}
        scale={1.5}
      >
         <meshStandardMaterial 
           color="#5D8C35" 
           roughness={0.8} 
           flatShading={true} 
         />
      </mesh>

    </group>
  )
}

useGLTF.preload('/apple.glb')