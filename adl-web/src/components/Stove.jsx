import React from 'react' // ❌ 删掉 useState
import { useGLTF } from '@react-three/drei'
import { Rotator } from './game/Rotator'

// 接收 isOpen 参数，由外部控制开关
export function Stove({ isOpen, ...props }) {
  const { nodes, materials } = useGLTF('/stove.glb')
  
  // const [isOpen, setOpen] = useState(false) // ❌ 删除内部状态

  const hingeOffset = 20
  
  // 🔄 默认配置（背面靠墙，朝向房间内部）
  // 🔧 GLB 模型轴心问题：内部有 rotation={[Math.PI/2, 0, Math.PI]}
  // 需要在 Y 轴旋转来补偿，让烤箱正面朝向房间内
  const defaultRotation = [0, -Math.PI/2, 0]  // 逆时针旋转 90度
  const defaultScale = 1.2                    // 1.2 倍缩放

  return (
    <group 
      {...props} 
      rotation={props.rotation || defaultRotation}
      scale={props.scale || defaultScale}
      dispose={null}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Stove_01.geometry}
        material={materials['Material.002']}
        rotation={[Math.PI / 2, 0, Math.PI]}
        scale={0.01}
      >
        {/* ... 静态部件保持不变 ... */}
        <mesh geometry={nodes.Broiler_Door.geometry} material={materials['Material.003']} position={[-47.93, 0, -4.319]} />
        <mesh geometry={nodes.Knob_005.geometry} material={materials['Brushed_Metal_Chrome.001']} position={[-50.011, 0, -123.268]} />
        <mesh geometry={nodes.Oven_Grate_01.geometry} material={materials['Brushed_Metal_Chrome.001']} position={[-1.239, 0, -82.142]} />
        <mesh geometry={nodes.Oven_Grate_02.geometry} material={materials['Brushed_Metal_Chrome.001']} position={[-1.239, 0, -60.466]} />
        <mesh geometry={nodes.Stove_Top.geometry} material={materials.BA_Color_Black_01} position={[-1.74, 0, -130.273]}>
          <mesh geometry={nodes.Burner_01.geometry} material={materials.Cabinets_01} position={[-25.608, -35.915, -4.708]} />
          <mesh geometry={nodes.Burner_03.geometry} material={materials.Cabinets_01} position={[-25.629, 35.738, -4.708]} />
          <mesh geometry={nodes.Stove_Grate_01.geometry} material={materials.CastIron_01} position={[-7.094, -35.838, -3.675]} />
          <mesh geometry={nodes.Stove_Grate_02.geometry} material={materials.CastIron_01} position={[-7.094, 35.839, -3.675]} />
          <mesh geometry={nodes.Stove_Plate.geometry} material={materials.CastIron_01} position={[-7.08, 0, -5.063]} rotation={[0.01, 0, 0]} />
        </mesh>

        {/* 交互部分：现在完全听命于 props.isOpen */}
        <Rotator 
          active={isOpen} // 👈 使用外部传入的状态
          axis="y"      
          angle={90}    
          speed={3}
          position={[-47.93, 0, -37.45 + hingeOffset]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Oven_Door.geometry}
            material={materials.BA_Color_Black_01}
            position={[0, 0, -hingeOffset]}
            // ❌ 删掉点击事件，因为现在是自动感应开门
            // onClick={(e) => { e.stopPropagation(); setOpen(!isOpen) }}
          >
            <mesh geometry={nodes.Stove_Glass_Door.geometry} material={nodes.Stove_Glass_Door.material} position={[1.229, 0, -38.154]} />
            <mesh geometry={nodes.Stove_Handle_001.geometry} material={materials['Shiny_Metal_01.001']} position={[-2.77, 0, -74.291]} />
          </mesh>
        </Rotator>

      </mesh>
    </group>
  )
}
useGLTF.preload('/stove.glb')