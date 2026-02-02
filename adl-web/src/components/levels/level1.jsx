import React, { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

// 基础设施
import { GameCamera } from '../game/GameCamera'
import { GameLighting } from '../ui/GameLighting'
import { Floor } from '../Floor'
import { Wall } from '../Wall'

// 家具
import { Table } from '../Table'
import { Stove } from '../Stove' // 烤箱
import { Pot } from '../Pot'

// ✨ 核心机制
import { BladeMachine } from '../game/mechanics/BladeMachine'
import { GameAssistant } from '../game/avatar/GameAssistant'
import { Holdable } from '../game/interaction/Holdable' 

// ==========================================
// ❄️ 组件: 可交互冰箱 (保持不变)
// ==========================================
export function InteractiveFridge({ position }) {
  const [isOpen, setIsOpen] = useState(false)
  const doorGroupRef = useRef()

  useFrame((state, delta) => {
    if (!doorGroupRef.current) return
    const targetRot = isOpen ? 2.0 : 0
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetRot, delta * 4)
  })

  return (
    <group position={position}>
      {/* 冰箱主体 */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>
      
      {/* 旋转门 */}
      <group ref={doorGroupRef} position={[0.5, 1, 0.51]}> 
        <Holdable duration={1.0} radius={0.3} onClick={() => setIsOpen(!isOpen)}>
          <mesh position={[-0.5, 0, 0]}> 
            <boxGeometry args={[1, 2, 0.05]} />
            <meshStandardMaterial color={isOpen ? "#b2bec3" : "#dfe6e9"} />
          </mesh>
          <mesh position={[-0.9, 0, 0.05]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#636e72" />
          </mesh>
        </Holdable>
      </group>
    </group>
  )
}

// ==========================================
// 📦 组件: 待切方块交互 (Pick -> Slice) (保持不变)
// ==========================================
export function WholeCubeInteractable({ initialPos, machinePos, tableHeight, onSlice }) {
  const [state, setState] = useState('idle') 
  const cubeRef = useRef()
  const effectiveHeight = tableHeight * 2
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -effectiveHeight), [effectiveHeight])

  useFrame((ctx) => {
    if (state === 'carrying' && cubeRef.current) {
      ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera)
      const target = new THREE.Vector3()
      ctx.raycaster.ray.intersectPlane(dragPlane, target)
      if (target) cubeRef.current.position.set(target.x, effectiveHeight + 0.15, target.z)
    }
  })

  return (
    <>
      <group ref={cubeRef} position={initialPos}>
        {state === 'idle' ? (
          <Holdable duration={1.0} radius={0.25} onClick={() => setState('carrying')}>
            <mesh>
              <boxGeometry args={[0.25, 0.25, 0.25]} />
              <meshStandardMaterial color="#ff6b6b" />
            </mesh>
            <Text position={[0, 0.3, 0]} fontSize={0.15} color="black">Hold to Pick</Text>
          </Holdable>
        ) : (
          <mesh raycast={null}>
             <boxGeometry args={[0.25, 0.25, 0.25]} />
             <meshStandardMaterial color="#ff6b6b" opacity={0.8} transparent />
          </mesh>
        )}
      </group>

      {state === 'carrying' && (
        <group position={machinePos}>
          <Holdable duration={1.0} radius={0.3} onClick={() => {
              if (cubeRef.current) cubeRef.current.position.set(machinePos[0], machinePos[1] + 0.125, machinePos[2])
              if (onSlice) onSlice()
            }}>
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
// 🍊 新组件: 切开的半块交互 (Pick -> Place to Fridge/Stove)
// ==========================================
function HalfCubeInteractable({ 
  initialPos, 
  targetPos, 
  tableHeight, 
  type, // 'left' | 'right'
  onPlaced 
}) {
  const [state, setState] = useState('idle') 
  const itemRef = useRef()
  const effectiveHeight = tableHeight * 2
  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -effectiveHeight), [effectiveHeight])

  useFrame((ctx) => {
    if (state === 'carrying' && itemRef.current) {
      ctx.raycaster.setFromCamera(ctx.pointer, ctx.camera)
      const target = new THREE.Vector3()
      ctx.raycaster.ray.intersectPlane(dragPlane, target)
      if (target) {
        // 稍微抬高一点
        itemRef.current.position.set(target.x, effectiveHeight + 0.15, target.z)
      }
    }
  })

  // 渲染半块形状 (红肉白皮)
  const renderMesh = () => (
    <group>
      {type === 'left' ? (
        <mesh>
           <boxGeometry args={[0.1, 0.25, 0.25]} />
           <meshStandardMaterial color="#ff6b6b" />
           <mesh position={[0.051, 0, 0]} scale={[0.01, 0.24, 0.24]}>
             <boxGeometry /><meshStandardMaterial color="#fff" />
           </mesh>
        </mesh>
      ) : (
        <mesh>
           <boxGeometry args={[0.1, 0.25, 0.25]} />
           <meshStandardMaterial color="#ff6b6b" />
           <mesh position={[-0.051, 0, 0]} scale={[0.01, 0.24, 0.24]}>
             <boxGeometry /><meshStandardMaterial color="#fff" />
           </mesh>
        </mesh>
      )}
    </group>
  )

  return (
    <>
      <group ref={itemRef} position={initialPos}>
        {state === 'idle' ? (
          <Holdable duration={0.8} radius={0.2} onClick={() => setState('carrying')}>
            {renderMesh()}
          </Holdable>
        ) : (
          <group raycast={state === 'carrying' ? null : undefined}>
            {renderMesh()}
          </group>
        )}
      </group>

      {/* 🎯 目标放置区 (仅在搬运时显示) */}
      {state === 'carrying' && (
        <group position={targetPos}>
          <Holdable 
            duration={1.0} 
            radius={0.35} 
            onClick={() => {
              setState('placed')
              if (itemRef.current) {
                // 吸附到目标位置
                itemRef.current.position.set(targetPos[0], targetPos[1], targetPos[2])
                itemRef.current.rotation.set(0, 0, 0)
              }
              if (onPlaced) onPlaced()
            }}
          >
            {/* 视觉提示：绿色虚线框 */}
            <mesh position={[0, 0, 0]}>
               <boxGeometry args={[0.3, 0.3, 0.3]} />
               <meshBasicMaterial wireframe color="#2ecc71" />
            </mesh>
            <Text position={[0, 0.4, 0]} fontSize={0.2} color="#2ecc71">Hold to Place</Text>
          </Holdable>
        </group>
      )}
    </>
  )
}

export function Level1({ onBack }) {
  // === 📏 坐标系统 ===
  const TABLE_HEIGHT = 0.85 
  const EFFECTIVE_HEIGHT = TABLE_HEIGHT * 2 
  
  // 📍 关键位置
  const SLICING_ZONE_POS = [0, EFFECTIVE_HEIGHT, -0.5] 
  const CUBE_START_POS = [-0.4, EFFECTIVE_HEIGHT + 0.125, -0.5] 

  // 🎯 新的目标位置
  // 冰箱内部 (假设有一层隔板在 y=1.2 左右)
  const TARGET_FRIDGE_POS = [-1.8, 1.2, -0.5] 
  // 烤箱顶部 (放在炉灶上)
  const TARGET_STOVE_POS = [2.0, EFFECTIVE_HEIGHT + 0.15, -1.8]

  // === 🧠 状态 ===
  const [isTriggered, setIsTriggered] = useState(false)
  const [isSliced, setIsSliced] = useState(false)
  const [leftPlaced, setLeftPlaced] = useState(false)
  const [rightPlaced, setRightPlaced] = useState(false)
  
  const isVictory = leftPlaced && rightPlaced

  // === 🕹️ 逻辑回调 ===
  const handleSliceTrigger = () => {
    setIsTriggered(true)
  }
  const handleCutFinish = () => {
    if (isTriggered) setIsSliced(true)
  }
  const handleReset = () => {
    setIsTriggered(false); setIsSliced(false);
    setLeftPlaced(false); setRightPlaced(false);
  }

  return (
    <div className="w-full h-full relative bg-[#edf3f7]">
      {/* 🔙 UI 层 */}
      <button onClick={onBack} className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all">
        <span>⬅️</span> 返回大厅
      </button>

      {/* 👩‍⚕️ UI 层 */}
      <GameAssistant 
        isVictory={isVictory} 
        isSliced={isSliced} 
        isTriggered={isTriggered} 
      />

      {/* 🎊 胜利 UI */}
      {isVictory && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
           <button onClick={handleReset} className="bg-[#66CC00] text-white px-8 py-3 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition-transform">
             🔄 再玩一次
           </button>
        </div>
      )}

      {/* 🧊 3D 场景 */}
      <Canvas orthographic>
        <GameCamera />
        <GameLighting />
        
        {/* 环境 */}
        <Floor width={12} depth={12} color='#dcd7cf' />
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI/2, 0]} width={10} height={5} />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} />
        
        {/* 家具 */}
        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} /> 
        <InteractiveFridge position={[-2, 0, -0.5]} />
        <Stove position={[2.0, 0, -1.8]} /> 
        <Pot position={[1.5, 0.85, 0.5]} scale={0.4} /> 

        {/* 1. 铡刀 */}
        <BladeMachine 
          position={SLICING_ZONE_POS} 
          isActive={isTriggered} 
          onCutFinish={handleCutFinish} 
        />

        {/* ❌ 移除了 TableTargetBox (桌面上的蓝紫框) */}

        {/* 2. 方块逻辑流 */}
        {!isSliced ? (
          // Step 1: 拿去切
          <WholeCubeInteractable 
             initialPos={CUBE_START_POS}
             machinePos={SLICING_ZONE_POS}
             tableHeight={TABLE_HEIGHT}
             onSlice={handleSliceTrigger}
          />
        ) : (
          // Step 2: 切完分拣 (冰箱 & 烤箱)
          <>
            {/* 左半块 -> 去冰箱 */}
            <HalfCubeInteractable 
               type="left"
               initialPos={[SLICING_ZONE_POS[0] - 0.1, EFFECTIVE_HEIGHT + 0.15, SLICING_ZONE_POS[2]]}
               targetPos={TARGET_FRIDGE_POS}
               tableHeight={TABLE_HEIGHT}
               onPlaced={() => setLeftPlaced(true)}
            />
            
            {/* 右半块 -> 去烤箱 */}
            <HalfCubeInteractable 
               type="right"
               initialPos={[SLICING_ZONE_POS[0] + 0.1, EFFECTIVE_HEIGHT + 0.15, SLICING_ZONE_POS[2]]}
               targetPos={TARGET_STOVE_POS}
               tableHeight={TABLE_HEIGHT}
               onPlaced={() => setRightPlaced(true)}
            />
          </>
        )}
      </Canvas>
    </div>
  )
}