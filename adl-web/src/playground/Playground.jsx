import React, { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, Text } from '@react-three/drei'
import * as THREE from 'three'

import { GameAssistant } from '../components/game/avatar/GameAssistant'
import { Holdable } from '../components/game/interaction/Holdable'
import { BladeMachine } from '../components/game/mechanics/BladeMachine'

// ==========================================
// 🚪 组件: 智能门 (SmartDoor) - Hold版
// ==========================================
function SmartDoor({ position }) {
  const [isOpen, setIsOpen] = useState(false)
  const groupRef = useRef()

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const targetRot = isOpen ? Math.PI / 2 : 0
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, delta * 4)
  })

  return (
    <group position={position}>
      {/* 门框 */}
      <mesh position={[0, 1, 0]}>
         <boxGeometry args={[1.2, 2, 0.1]} />
         <meshStandardMaterial color="#636e72" />
      </mesh>
      {/* 旋转门 */}
      <group ref={groupRef} position={[-0.5, 0, 0.06]}> 
        <Holdable duration={1.0} radius={0.3} onClick={() => setIsOpen(!isOpen)}>
          <mesh position={[0.5, 1, 0]}> 
            <boxGeometry args={[1, 2, 0.1]} />
            <meshStandardMaterial color={isOpen ? "#81ecec" : "#74b9ff"} />
          </mesh>
          <mesh position={[0.85, 1, 0.08]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </Holdable>
      </group>
    </group>
  )
}

// ==========================================
// 📦 组件: 可拾取物体系统 (PickableItem)
// 逻辑: Idle(Hold拾取) -> Carrying(跟随) -> Placed(Hold放置)
// ==========================================
function PickableItem({ 
  initialPos, 
  targetPos, 
  tableHeight, 
  color, 
  type, // 'left' | 'right' 用于渲染形状
  onPlaced 
}) {
  const [state, setState] = useState('idle') // 'idle' | 'carrying' | 'placed'
  const itemRef = useRef()
  
  // 拖拽平面
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -tableHeight), [tableHeight])

  useFrame((ctx) => {
    // ✋ 搬运状态：跟随鼠标
    if (state === 'carrying' && itemRef.current) {
      ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera)
      const target = new THREE.Vector3()
      ctx.raycaster.ray.intersectPlane(dragPlane, target)
      if (target) {
        // 稍微抬高一点，且限制在桌面上方
        itemRef.current.position.set(target.x, tableHeight + 0.15, target.z)
      }
    }
  })

  // 📦 渲染具体的方块形状 (模拟 GameCube 的 HalfCube)
  const renderMesh = () => (
    <group>
      {type === 'left' ? (
        <mesh>
           <boxGeometry args={[0.1, 0.25, 0.25]} />
           <meshStandardMaterial color={color} />
           <mesh position={[0.051, 0, 0]} scale={[0.01, 0.24, 0.24]}>
             <boxGeometry /><meshStandardMaterial color="#fff" />
           </mesh>
        </mesh>
      ) : (
        <mesh>
           <boxGeometry args={[0.1, 0.25, 0.25]} />
           <meshStandardMaterial color={color} />
           <mesh position={[-0.051, 0, 0]} scale={[0.01, 0.24, 0.24]}>
             <boxGeometry /><meshStandardMaterial color="#fff" />
           </mesh>
        </mesh>
      )}
    </group>
  )

  return (
    <>
      {/* 物体本体 */}
      <group ref={itemRef} position={initialPos}>
        {state === 'idle' ? (
          // Idle: 可以被拾取
          <Holdable duration={0.5} radius={0.2} onClick={() => setState('carrying')}>
            {renderMesh()}
          </Holdable>
        ) : (
          // Carrying/Placed: 失去交互(设为null让射线穿透), 或已放置
          <group raycast={state === 'carrying' ? null : undefined}>
            {renderMesh()}
          </group>
        )}
      </group>

      {/* 🎯 目标放置区 (仅在搬运时显示) */}
      {state === 'carrying' && (
        <group position={targetPos}>
          <Holdable 
            duration={0.8} 
            radius={0.3} 
            onClick={() => {
              setState('placed')
              // 吸附到目标位置
              if (itemRef.current) {
                itemRef.current.position.set(targetPos[0], targetPos[1] + 0.125, targetPos[2])
                itemRef.current.rotation.set(0, 0, 0)
              }
              if (onPlaced) onPlaced()
            }}
          >
            {/* 虚线框提示 */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.4, 0.02, 0.4]} />
              <meshStandardMaterial color={color} opacity={0.3} transparent />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
               <boxGeometry args={[0.3, 0.3, 0.3]} />
               <meshBasicMaterial wireframe color={color} />
            </mesh>
            <Text position={[0, 0.5, 0]} fontSize={0.15} color="black">Hold to Place</Text>
          </Holdable>
        </group>
      )}
    </>
  )
}

// ==========================================
// 📦 组件: 待切方块交互系统 (Pick -> Carry -> Slice)
// 逻辑: 
// 1. Idle: 在桌上，Hold 拾取
// 2. Carrying: 跟随鼠标
// 3. Target: 移动到切片机位置，Hold 触发切割
// ==========================================
function WholeCubeInteractable({ 
  initialPos, 
  machinePos, 
  tableHeight, 
  onSlice // 成功回调
}) {
  const [state, setState] = useState('idle') // 'idle' | 'carrying'
  const cubeRef = useRef()
  
  // 拖拽平面 (高度 * 2)
  const effectiveHeight = tableHeight * 2
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -effectiveHeight), [effectiveHeight])

  useFrame((ctx) => {
    // ✋ 搬运逻辑
    if (state === 'carrying' && cubeRef.current) {
      ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera)
      const target = new THREE.Vector3()
      ctx.raycaster.ray.intersectPlane(dragPlane, target)
      if (target) {
        // 悬浮跟随
        cubeRef.current.position.set(target.x, effectiveHeight + 0.15, target.z)
      }
    }
  })

  return (
    <>
      {/* 方块本体 */}
      <group ref={cubeRef} position={initialPos}>
        {state === 'idle' ? (
          // 状态 1: 待拾取
          <Holdable duration={0.8} radius={0.25} onClick={() => setState('carrying')}>
            <mesh>
              <boxGeometry args={[0.25, 0.25, 0.25]} />
              <meshStandardMaterial color="#ff6b6b" />
            </mesh>
            <Text position={[0, 0.3, 0]} fontSize={0.15} color="black">Hold to Pick</Text>
          </Holdable>
        ) : (
          // 状态 2: 搬运中 (无交互，射线穿透)
          <mesh raycast={null}>
             <boxGeometry args={[0.25, 0.25, 0.25]} />
             <meshStandardMaterial color="#ff6b6b" opacity={0.8} transparent />
          </mesh>
        )}
      </group>

      {/* 🎯 切割感应区 (仅在搬运时显示在机器位置) */}
      {state === 'carrying' && (
        <group position={machinePos}>
          <Holdable 
            duration={1.0} // 切割可能需要稳住久一点
            radius={0.3} 
            onClick={() => {
              // 吸附到机器中心
              if (cubeRef.current) {
                cubeRef.current.position.set(machinePos[0], machinePos[1] + 0.125, machinePos[2])
              }
              // 触发外部切割逻辑
              if (onSlice) onSlice()
            }}
          >
            {/* 红色虚线框提示 "放在这" */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.3, 0.02, 0.3]} />
              <meshStandardMaterial color="#ff7675" opacity={0.3} transparent />
            </mesh>
            <mesh position={[0, 0.125, 0]}>
               <boxGeometry args={[0.26, 0.26, 0.26]} />
               <meshBasicMaterial wireframe color="#d63031" />
            </mesh>
            <Text position={[0, 0.4, 0]} fontSize={0.15} color="#d63031">Hold to Slice</Text>
          </Holdable>
        </group>
      )}
    </>
  )
}

// ==========================================
// 🔪 核心流程控制器 (Updated)
// ==========================================
function KitchenTaskSystem({ tableHeight }) {
  const [step, setStep] = useState(0) // 0:Pick&Slice, 1:Sort
  const [leftDone, setLeftDone] = useState(false)
  const [rightDone, setRightDone] = useState(false)

  const EFFECTIVE_HEIGHT = tableHeight * 2

  const MACHINE_POS = [0, EFFECTIVE_HEIGHT, -0.5]
  const CUBE_START = [-0.6, EFFECTIVE_HEIGHT + 0.125, -0.5]
  
  const TARGET_L = [0.8, EFFECTIVE_HEIGHT, -0.3]
  const TARGET_R = [0.8, EFFECTIVE_HEIGHT, -0.7]

  return (
    <>
      {/* 1. 铡刀机器 */}
      <BladeMachine position={MACHINE_POS} isActive={step === 0.5} />

      {/* 2. 完整方块交互流 (Step 0) */}
      {/* ✨ 替换了原来的简单 Holdable，现在是 Pick -> Place 流程 */}
      {step === 0 && (
        <WholeCubeInteractable 
          initialPos={CUBE_START}
          machinePos={MACHINE_POS}
          tableHeight={tableHeight}
          onSlice={() => {
            setStep(0.5) // 播放动画
            setTimeout(() => setStep(1), 500) // 切开
          }}
        />
      )}

      {/* 3. 切开的两半 (Step 1) - 保持不变 */}
      {step === 1 && (
        <>
          <PickableItem 
            type="left"
            color="#ff6b6b"
            tableHeight={tableHeight} 
            initialPos={[MACHINE_POS[0] - 0.1, EFFECTIVE_HEIGHT + 0.125, MACHINE_POS[2]]}
            targetPos={TARGET_L}
            onPlaced={() => setLeftDone(true)}
          />
          
          <PickableItem 
            type="right"
            color="#ff6b6b"
            tableHeight={tableHeight} 
            initialPos={[MACHINE_POS[0] + 0.1, EFFECTIVE_HEIGHT + 0.125, MACHINE_POS[2]]}
            targetPos={TARGET_R}
            onPlaced={() => setRightDone(true)}
          />
        </>
      )}

      {/* 4. 任务完成反馈 */}
      {leftDone && rightDone && (
        <Text position={[0, EFFECTIVE_HEIGHT + 1, 0]} fontSize={0.5} color="#2ecc71" outlineWidth={0.02} outlineColor="white">
          🎉 Mission Complete!
        </Text>
      )}
    </>
  )
}
// 🪑 场景基建
const TestTable = ({ height }) => (
  <group position={[0, height / 2, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[4, height, 2]} />
      <meshStandardMaterial color="#b2bec3" />
    </mesh>
    <gridHelper args={[4, 4, 0x444444, 0x888888]} position={[0, height / 2 + 0.01, 0]} />
  </group>
)

export function Playground() {
  const TABLE_HEIGHT = 0.85 

  return (
    <div className="w-full h-full relative bg-[#2d3436]">
      <GameAssistant isVictory={false} isSliced={false} isTriggered={false} />
      
      {/* 操作指引 */}
      <div className="absolute top-4 left-4 text-white z-50 font-mono bg-black/50 p-4 rounded pointer-events-none">
        <h1 className="text-xl font-bold">ADL Task Flow Test</h1>
        <ul className="list-disc pl-5 text-sm mt-2 opacity-80">
          <li>Hold Door to Open</li>
          <li>Hold Cube to Slice</li>
          <li>Hold Halves to Pick -> Carry -> Hold to Place</li>
        </ul>
      </div>

      <Canvas>
        <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={45} onUpdate={c => c.lookAt(0, 0.5, 0)} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[-5, 10, 5]} intensity={1.5} />
        
        <TestTable height={TABLE_HEIGHT} />

        {/* 1. 门 (独立) */}
        <SmartDoor position={[-2, 0, -0.5]} />

        {/* 2. 厨房任务流 (切 -> 分拣) */}
        <KitchenTaskSystem tableHeight={TABLE_HEIGHT} />

      </Canvas>
    </div>
  )
}