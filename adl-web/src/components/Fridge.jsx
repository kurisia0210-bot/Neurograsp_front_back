45import React, { useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { Rotator } from './game/Rotator'

export function Fridge(props) {
  const { nodes, materials } = useGLTF('/fridge.glb')
  
  const [isOpenL, setOpenL] = useState(false)
  const [isOpenR, setOpenR] = useState(false)

  // 🔧 合页偏移量 (用于 Y 轴宽度方向)
  const hingeOffset = 42
  
  // 🔄 默认旋转（在 Level1 中朝向合适的角度）
  const defaultRotation = [0, -1.5, 0]

  return (
    <group {...props} rotation={props.rotation || defaultRotation} dispose={null}>
      <mesh
        geometry={nodes.Fridge_01.geometry}
        material={materials.Plastic_02}
        rotation={[Math.PI / 2, 0, 2.618]}
        scale={0.01}
      >
        
        {/* ======================= 左门 (Left Door) ======================= */}
        <Rotator 
          active={isOpenL} 
          axis="z" 
          angle={110} 
          // Y轴偏移找到左侧合页
          position={[-49.301, -52.059 - hingeOffset, -177.684]}
        >
          {/* Y轴反向复位 */}
          <mesh
            geometry={nodes.Door_Fridge_L.geometry}
            material={materials.Brushed_Metal_Chrome}
            position={[0, hingeOffset, 0]} 
            onClick={(e) => { e.stopPropagation(); setOpenL(!isOpenL) }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
          >
            {/* 子物体保持不变 */}
            <mesh geometry={nodes.Door_Fridge_Inside_L.geometry} material={materials.WhiteDull} position={[12.652, 25.158, -2.263]}>
              <mesh geometry={nodes.Fridge_Door_Shelf_01.geometry} material={materials.WhiteDull} position={[-0.003, -0.005, 43.737]}>
                 <mesh geometry={nodes.Fridge_Glass_Door_Shelf_01.geometry} material={materials.BA_Glass_02} />
              </mesh>
              <mesh geometry={nodes.Fridge_Door_Shelf_03.geometry} material={materials.WhiteDull} position={[-0.003, -0.005, 5.83]}>
                <mesh geometry={nodes.Fridge_Glass_Door_Shelf_03.geometry} material={materials.BA_Glass_02} />
              </mesh>
              <mesh geometry={nodes.Fridge_Door_Shelf_05.geometry} material={materials.WhiteDull} position={[-0.003, -0.005, -33.751]}>
                <mesh geometry={nodes.Fridge_Glass_Door_Shelf_05.geometry} material={materials.BA_Glass_02} />
              </mesh>
            </mesh>
            <mesh geometry={nodes.Handle_Fridge_001.geometry} material={materials.Shiny_Metal_01} position={[-12.367, 43.877, 1.564]} />
          </mesh>
        </Rotator>

        {/* ======================= 右门 (Right Door) ======================= */}
        <Rotator 
          active={isOpenR} 
          axis="z" 
          angle={-110} 
          // Y轴偏移找到右侧合页
          position={[-49.301, 52.058 + hingeOffset, -177.685]}
        >
          {/* Y轴反向复位 */}
          <mesh
            geometry={nodes.Door_Fridge_R.geometry}
            material={materials.Brushed_Metal_Chrome}
            position={[0, -hingeOffset, 0]}
            onClick={(e) => { e.stopPropagation(); setOpenR(!isOpenR) }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
          >
            <mesh geometry={nodes.Door_Fridge_Inside_R.geometry} material={materials.WhiteDull} position={[12.652, -25.158, -2.263]}>
              <mesh geometry={nodes.Fridge_Door_Shelf_02.geometry} material={materials.WhiteDull} position={[-0.003, 0.005, 43.737]}>
                <mesh geometry={nodes.Fridge_Glass_Door_Shelf_02.geometry} material={materials.BA_Glass_02} />
              </mesh>
              <mesh geometry={nodes.Fridge_Door_Shelf_04.geometry} material={materials.WhiteDull} position={[-0.003, 0.005, 5.83]}>
                <mesh geometry={nodes.Fridge_Glass_Door_Shelf_04.geometry} material={materials.BA_Glass_02} />
              </mesh>
              <mesh geometry={nodes.Fridge_Door_Shelf_06.geometry} material={materials.WhiteDull} position={[-0.003, 0.005, -33.751]}>
                <mesh geometry={nodes.Fridge_Glass_Door_Shelf_06.geometry} material={materials.BA_Glass_02} />
              </mesh>
            </mesh>
            <mesh geometry={nodes.Handle_Fridge_002.geometry} material={materials.Shiny_Metal_01} position={[-12.367, -43.877, 1.564]} />
          </mesh>
        </Rotator>

        {/* ======================= 静态部分 (Static Parts) ======================= */}
        <group position={[-20.8, 0, 0]}>
          <mesh geometry={nodes.Drawer_Fridge.geometry} material={materials.Brushed_Metal_Chrome} position={[-42.3, 0, -53.1]} rotation={[0, -0.047, 0]}>
             <mesh geometry={nodes.Handle_Fridge.geometry} material={materials.Shiny_Metal_01} position={[0.74, 0, -36.288]} />
          </mesh>
        </group>
        <mesh geometry={nodes.Fridge_Inside.geometry} material={materials.WhiteDull} position={[0.432, 0, -179.843]}>
           {/* 🎯 修复点：将所有隔板的 X 坐标修改为正数 5，这次是往里推 */}
           <mesh geometry={nodes.Fridge_Shelf_01.geometry} material={materials.WhiteDull} position={[13, -23.895, -13.58]} />
           <mesh geometry={nodes.Fridge_Shelf_02.geometry} material={materials.WhiteDull} position={[13, 23.895, -13.58]} />
           <mesh geometry={nodes.Fridge_Shelf_03.geometry} material={materials.WhiteDull} position={[13, -23.895, 16.13]} />
           <mesh geometry={nodes.Fridge_Shelf_04.geometry} material={materials.WhiteDull} position={[13, 23.895, 16.13]} />
        </mesh>
      </mesh>
    </group>
  )
}

useGLTF.preload('/fridge.glb')