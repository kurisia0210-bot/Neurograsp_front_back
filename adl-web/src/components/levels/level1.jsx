import React, { useState, useRef, useMemo, useEffect } from 'react'
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

// 🎮 游戏方块组件
import { WholeCube, HalfCube } from '../game/mechanics/GameCube'

// 🤖 Agent系统
import { useAgentSystem } from '../game/agent/AgentSystem'

// ==========================================
// ❄️ 组件: 可交互冰箱 (暂时去掉Holdable)
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

      {/* 旋转门 - 暂时去掉Holdable，直接点击 */}
      <group 
        ref={doorGroupRef} 
        position={[0.5, 1, 0.51]}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[1, 2, 0.05]} />
          <meshStandardMaterial color={isOpen ? "#b2bec3" : "#dfe6e9"} />
        </mesh>
        <mesh position={[-0.9, 0, 0.05]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      </group>
    </group>
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
  const [wholeCubePlaced, setWholeCubePlaced] = useState(false) // 整个 cube 被放置（非切割场景）
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false) // 冰箱门是否打开

  // === 🤖 Agent 模式状态 ===
  const [agentMode, setAgentMode] = useState(false) // 手动/Agent 模式切换
  const [showDebug, setShowDebug] = useState(false)
  const [customTask, setCustomTask] = useState("Put red cube in fridge")

  // 胜利条件：要么两个半块都放好，要么整个 cube 被成功放置（取决于任务）
  const isVictory = (leftPlaced && rightPlaced) || wholeCubePlaced

  // === 🤖 使用AgentSystem ===
  const agentSystem = useAgentSystem({
    initialTask: customTask,
    
    // 获取世界状态的函数
    getWorldState: (agentState) => {
      const nearby_objects = []

      // 1. 红方块状态（根据后端 payload 枚举值）
      if (!isSliced && !wholeCubePlaced) {
        // 整个 cube 还在桌上
        nearby_objects.push({
          id: "red_cube",          // ✅ ItemName.RED_CUBE
          state: "on_table",       // ✅ ObjectState.ON_TABLE
          relation: "on cutting board"
        })
      } else if (isSliced) {
        // 切完后有两个半块
        if (!leftPlaced) {
          nearby_objects.push({
            id: "half_cube_left",  // ✅ ItemName.HALF_CUBE_LEFT
            state: "on_table",     // ✅ ObjectState.ON_TABLE
            relation: "left piece on board"
          })
        }
        if (!rightPlaced) {
          nearby_objects.push({
            id: "half_cube_right", // ✅ ItemName.HALF_CUBE_RIGHT
            state: "on_table",     // ✅ ObjectState.ON_TABLE
            relation: "right piece on board"
          })
        }
      }
      // 如果 wholeCubePlaced=true 且 !isSliced，说明整个 cube 已经被放走了，不显示

      // 2. 冰箱
      nearby_objects.push({
        id: "fridge_main",         // ✅ ItemName.FRIDGE_MAIN
        state: "installed",        // ✅ ObjectState.INSTALLED
        relation: "storage appliance"
      })
      
      // 2.1 冰箱门
      nearby_objects.push({
        id: "fridge_door",         // ✅ ItemName.FRIDGE_DOOR
        state: fridgeDoorOpen ? "open" : "closed", // ✅ ObjectState.OPEN / CLOSED
        relation: "fridge door"
      })

      // 3. 烤箱
      nearby_objects.push({
        id: "stove",               // ✅ ItemName.STOVE
        state: "installed",        // ✅ ObjectState.INSTALLED
        relation: "cooking appliance"
      })

      // 4. 桌面
      nearby_objects.push({
        id: "table_surface",       // ✅ ItemName.TABLE_SURFACE
        state: "installed",        // ✅ ObjectState.INSTALLED
        relation: "work surface"
      })

      return { nearby_objects }
    },
    
    // 执行世界动作的函数
    executeWorldAction: (actionPayload, agentState) => {
      console.log("💪 [Level1 World] Executing:", actionPayload)
      
      const interactionType = actionPayload.interaction_type || "NONE"
      const targetItem = actionPayload.target_item
      
      switch (interactionType) {
        case "PICK":
          console.log(`🦾 Agent: Picking up ${targetItem}...`)
          break;
          
        case "PLACE":
          console.log(`⬇️ Agent: Placing item onto ${targetItem}...`)
          
          // 根据目标位置执行放置
          if (targetItem === "fridge_main") {
            if (isSliced && !leftPlaced) {
              setLeftPlaced(true)
              console.log("❄️ Placed half cube in fridge!")
            } else if (!isSliced && !wholeCubePlaced) {
              setWholeCubePlaced(true)
              console.log("❄️ Placed whole cube in fridge!")
            }
          } else if (targetItem === "stove") {
            if (isSliced && !rightPlaced) {
              setRightPlaced(true)
              console.log("🔥 Placed half cube on stove!")
            } else if (!isSliced && !wholeCubePlaced) {
              setWholeCubePlaced(true)
              console.log("🔥 Placed whole cube on stove!")
            }
          } else if (targetItem === "table_surface") {
            console.log("📦 Placed on table")
          }
          break;
          
        case "SLICE":
          if (targetItem === "red_cube" && !isSliced) {
            console.log("🔪 Agent: Slicing cube...")
            setIsTriggered(true)
          } else {
            console.warn("⚠️ Cannot slice:", targetItem)
          }
          break
          
        case "OPEN":
          if (targetItem === "fridge_door") {
            console.log("🚪 Agent: Opening fridge door...")
            setFridgeDoorOpen(true)
          }
          break
          
        case "CLOSE":
          if (targetItem === "fridge_door") {
            console.log("🚪 Agent: Closing fridge door...")
            setFridgeDoorOpen(false)
          }
          break
          
        case "TOGGLE":
          if (targetItem === "stove") {
            console.log("🔥 Agent: Toggling stove...")
          }
          break
          
        case "NONE":
          // 向后兼容：旧版 payload 可能没有 interaction_type
          console.log(`👀 Agent: Generic interaction with ${targetItem}`)

          // 兼容旧逻辑（如果没有明确指定类型）
          if (targetItem === "half_cube_left" && isSliced && !leftPlaced) {
            console.log("❄️ (Compat) Placing left half in fridge...")
            setLeftPlaced(true)
          } else if (targetItem === "half_cube_right" && isSliced && !rightPlaced) {
            console.log("🔥 (Compat) Placing right half on stove...")
            setRightPlaced(true)
          }
          break
          
        default:
          console.warn(`⚠️ Unknown interaction_type: ${interactionType} on ${targetItem}`)
      }
    },
    
    // 回调函数
    onActionExecuted: (action, newState) => {
      console.log("🎯 Action executed:", action.type, "New state:", newState)
    },
    
    onTickComplete: (response, observation) => {
      console.log("🔄 Tick completed")
    }
  })

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
    setWholeCubePlaced(false);
    setFridgeDoorOpen(false);
    agentSystem.resetAgent();
  }

  // === ⏱️ Agent 自动循环 ===
  useEffect(() => {
    if (!agentMode) return

    const interval = setInterval(() => {
      agentSystem.tick()
    }, 3000) // 每3秒执行一次

    return () => clearInterval(interval)
  }, [agentMode, agentSystem.tick])

  return (
    <div className="w-full h-full relative bg-[#edf3f7]">
      {/* 🔙 返回按钮 */}
      <button onClick={onBack} className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all">
        <span>⬅️</span> 返回大厅
      </button>

      {/* 🤖 控制面板 - 底部中央 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {/* 任务输入框（仅 Agent 模式显示） */}
        {agentMode && (
          <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span className="text-sm font-bold text-gray-600">任务:</span>
            <input
              type="text"
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              className="bg-transparent text-gray-800 outline-none w-80 text-sm"
              placeholder="例如: Put red cube in fridge"
            />
          </div>
        )}

        {/* 模式切换按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => setAgentMode(false)}
            className={`px-6 py-3 rounded-full font-bold transition-all shadow-lg ${!agentMode
              ? 'bg-blue-500 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-gray-100'
              }`}
          >
            🎮 手动模式
          </button>
          <button
            onClick={() => setAgentMode(true)}
            className={`px-6 py-3 rounded-full font-bold transition-all shadow-lg ${agentMode
              ? 'bg-green-500 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-gray-100'
              }`}
          >
            🤖 Agent 模式
          </button>
          {agentMode && (
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-3 rounded-full font-bold transition-all shadow-lg bg-purple-500 text-white hover:bg-purple-600"
            >
              {showDebug ? '隐藏调试' : '显示调试'}
            </button>
          )}
        </div>
      </div>

      {/* 🧠 Agent 状态显示 - 移到左下角 */}
      {agentMode && (
        <div className="absolute bottom-8 left-4 z-50 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${agentSystem.isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
            <span className="font-bold">Agent 状态</span>
          </div>
          <div className="text-gray-300">
            {agentSystem.isThinking ? "正在思考..." : "就绪"}
          </div>
          {agentSystem.lastAction && (
            <div className="mt-2 text-yellow-300 text-[10px]">
              最后动作: {agentSystem.lastAction.type}
            </div>
          )}
        </div>
      )}

      {/* 📡 调试 Dashboard */}
      {showDebug && agentMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-purple-500 rounded-lg shadow-2xl w-[800px] max-h-[500px] overflow-hidden">
          <div className="bg-purple-500 text-white px-4 py-2 font-bold flex justify-between items-center">
            <span>📡 前后端通信调试</span>
            <button onClick={() => setShowDebug(false)} className="hover:text-gray-200">✕</button>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-300 h-[450px]">
            {/* 左侧：请求 */}
            <div className="p-3 overflow-y-auto">
              <div className="font-bold text-blue-600 mb-2 text-sm">📤 请求 (Frontend → Backend)</div>
              {agentSystem.lastRequest ? (
                <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(agentSystem.lastRequest, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-400 text-xs">等待请求...</div>
              )}
            </div>

            {/* 右侧：响应 */}
            <div className="p-3 overflow-y-auto">
              <div className="font-bold text-green-600 mb-2 text-sm">📥 响应 (Backend → Frontend)</div>
              {agentSystem.lastResponse ? (
                <>
                  <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-xs mb-2">
                    <div className="font-bold text-yellow-700 mb-1">关键信息:</div>
                    <div>动作: <span className="font-mono text-blue-600">{agentSystem.lastResponse.intent?.type}</span></div>
                    {agentSystem.lastResponse.intent?.target_item && (
                      <div>目标: <span className="font-mono text-green-600">{agentSystem.lastResponse.intent.target_item}</span></div>
                    )}
                    {agentSystem.lastResponse.intent?.content && (
                      <div className="text-gray-600 mt-1 text-[10px]">推理: {agentSystem.lastResponse.intent.content}</div>
                    )}
                  </div>
                  <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(agentSystem.lastResponse, null, 2)}
                  </pre>
                </>
              ) : (
                <div className="text-gray-400 text-xs">等待响应...</div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={10} height={5} />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} />

        {/* 家具 */}
        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} />
        <InteractiveFridge position={[-2, 0, -0.5]} />
        <Stove position={[2.0, 0, -1.8]} />
        <Pot position={[1.5, 0.85, 0.5]} scale={0.4} />

        {/* 🔍 调试标记：方块位置 */}
        {agentMode && (
          <>
            {/* 冰箱内标记 */}
            {leftPlaced && (
              <Text
                position={TARGET_FRIDGE_POS}
                fontSize={0.2}
                color="#00ff00"
                anchorX="center"
                anchorY="middle"
              >
                ✅ 左半块在冰箱
              </Text>
            )}

            {/* 烤箱上标记 */}
            {rightPlaced && (
              <Text
                position={[TARGET_STOVE_POS[0], TARGET_STOVE_POS[1] + 0.3, TARGET_STOVE_POS[2]]}
                fontSize={0.2}
                color="#ff6600"
                anchorX="center"
                anchorY="middle"
              >
                ✅ 右半块在烤箱
              </Text>
            )}
          </>
        )}

        {/* 1. 铡刀 */}
        <BladeMachine
          position={SLICING_ZONE_POS}
          isActive={isTriggered}
          onCutFinish={handleCutFinish}
        />

        {/* ❌ 移除了 TableTargetBox (桌面上的蓝紫框) */}

        {/* 2. 方块逻辑流 */}
        {!agentMode ? (
          // 🎮 手动模式：玩家拖拽
          <>
            {!isSliced ? (
              <WholeCube
                position={CUBE_START_POS}
                dragHeight={EFFECTIVE_HEIGHT}
                slicingZonePos={SLICING_ZONE_POS}
                slicingZoneSize={[0.3, 0.3]}
                onDrag={({ position, shouldSlice }) => {
                  if (shouldSlice) {
                    handleSliceTrigger()
                  }
                }}
              />
            ) : (
              <>
                {!leftPlaced && (
                  <HalfCube
                    initialPos={[SLICING_ZONE_POS[0] - 0.125, EFFECTIVE_HEIGHT, SLICING_ZONE_POS[2]]}
                    targetPos={TARGET_FRIDGE_POS}
                    dragHeight={EFFECTIVE_HEIGHT}
                    type="left"
                    rotation={[0, 0, 0]}
                    onPlaced={() => setLeftPlaced(true)}
                  />
                )}
                {!rightPlaced && (
                  <HalfCube
                    initialPos={[SLICING_ZONE_POS[0] + 0.125, EFFECTIVE_HEIGHT, SLICING_ZONE_POS[2]]}
                    targetPos={TARGET_STOVE_POS}
                    dragHeight={EFFECTIVE_HEIGHT}
                    type="right"
                    rotation={[0, 0, 0]}
                    onPlaced={() => setRightPlaced(true)}
                  />
                )}
              </>
            )}
          </>
        ) : (
          // 🤖 Agent 模式：显示方块但不可交互
          <>
            {!isSliced ? (
              // 完整方块（Agent 还没切）
              <mesh position={CUBE_START_POS}>
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial color="#ff6b6b" />
              </mesh>
            ) : (
              // 切完的两个半块
              <>
                {!leftPlaced && (
                  <mesh position={[SLICING_ZONE_POS[0] - 0.125, EFFECTIVE_HEIGHT, SLICING_ZONE_POS[2]]}>
                    <boxGeometry args={[0.125, 0.25, 0.25]} />
                    <meshStandardMaterial color="#ff6b6b" />
                  </mesh>
                )}
                {!rightPlaced && (
                  <mesh position={[SLICING_ZONE_POS[0] + 0.125, EFFECTIVE_HEIGHT, SLICING_ZONE_POS[2]]}>
                    <boxGeometry args={[0.125, 0.25, 0.25]} />
                    <meshStandardMaterial color="#ff6b6b" />
                  </mesh>
                )}
              </>
            )}
          </>
        )}
      </Canvas>
    </div>
  )
}