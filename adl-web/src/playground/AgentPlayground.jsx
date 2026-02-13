// src/playground/AgentPlayground.jsx (重构版 - 使用AgentSystem)
import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Grid } from '@react-three/drei'

// 导入新的AgentSystem
import { useAgentSystem } from '../components/game/agent/AgentSystem'

// 导入DoctorAvatar和NotificationBubble
import { DoctorAvatar } from '../components/game/avatar/DoctorAvatar'
import { NotificationBubble } from '../components/game/items/NotificationBubble'

// ==========================================
// 🧠 Dashboard (保持不变)
// ==========================================
const AgentBrainDashboard = ({ observation, action, isThinking }) => {
  return (
    <div className="absolute top-4 right-4 w-96 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-2xl z-50 border border-green-500/30 overflow-hidden">
      <div className="flex justify-between items-center border-b border-green-500/50 pb-2 mb-2">
        <h2 className="font-bold text-sm">🧠 COALA Cortex (Kitchen)</h2>
        <span className={`w-3 h-3 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
      </div>
      <div className="mb-4">
        <h3 className="text-gray-400 mb-1">[PERCEPTION]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 h-32 overflow-y-auto text-[10px] whitespace-pre-wrap">
          {observation ? JSON.stringify(observation, null, 2) : "Initializing..."}
        </pre>
      </div>
      <div>
        <h3 className="text-gray-400 mb-1">[INTENT]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 text-yellow-300 text-[10px] whitespace-pre-wrap">
          {action ? JSON.stringify(action, null, 2) : "Waiting..."}
        </pre>
      </div>
    </div>
  )
}

export function AgentPlayground({ onBack }) {
  // === 🌍 World State ===
  const [fridgeOpen, setFridgeOpen] = useState(false)
  const [cubePos, setCubePos] = useState([-0.4, 1.7 + 0.125, -0.5])
  const [cubeState, setCubeState] = useState("on_table")
  
  // === 🗣️ Agent步骤说明 ===
  const [agentStep, setAgentStep] = useState("等待Agent指令...")
  const [showArrowAnimation, setShowArrowAnimation] = useState(false)
  const [currentTaskStep, setCurrentTaskStep] = useState(0)

  // === 🤖 使用AgentSystem ===
  const agentSystem = useAgentSystem({
    initialTask: "Put red cube in fridge",
    
    // 添加onTickComplete回调来获取Agent的推理
    onTickComplete: (response, observation) => {
      console.log("🔄 Tick completed")
      
      // 提取Agent的推理内容
      if (response?.intent?.content) {
        const agentReasoning = response.intent.content
        setAgentStep(agentReasoning)
        
        // 检测任务步骤变化
        detectTaskStepChange(agentReasoning)
      }
    },
    
    // 添加onActionExecuted回调来检测任务完成
    onActionExecuted: (action, newState) => {
      console.log("🎯 Action executed:", action.type, "New state:", newState)
      
      // 当动作执行成功时，触发箭头动画
      if (action.type === "EXECUTE_WORLD_ACTION") {
        triggerArrowAnimation()
      }
    },
    
    // 获取世界状态的函数
    getWorldState: (agentState) => {
      const nearby_objects = []

      // 1. Red Cube
      nearby_objects.push({
        id: "red_cube",
        state: cubeState,
        relation: cubeState === "in_hand" ? "held by agent" : "on the table"
      })

      // 2. Fridge Door
      nearby_objects.push({
        id: "fridge_door",
        state: fridgeOpen ? "open" : "closed",
        relation: "front of agent"
      })

      // 3. Fridge Main
      nearby_objects.push({
        id: "fridge_main",
        state: "installed",
        relation: "kitchen appliance"
      })
      
      // 4. Table Surface
      nearby_objects.push({
        id: "table_surface", 
        state: "installed",
        relation: "support surface"
      })

      return { nearby_objects }
    },
    
    // 执行世界动作的函数
    executeWorldAction: (actionPayload, agentState) => {
      console.log("💪 [World] Executing:", actionPayload)
      
      const interactionType = actionPayload.interaction_type || "NONE"
      const targetItem = actionPayload.target_item
      
      switch (interactionType) {
        case "PICK":
          if (targetItem === "red_cube" && cubeState === "on_table") {
            setCubeState("in_hand")
            setCubePos([0, -10, 0])
            console.log("✅ Picked up red cube")
          }
          break
          
        case "PLACE":
          if (targetItem === "fridge_main" && cubeState === "in_hand") {
            setCubeState("in_fridge")
            setCubePos([-1.8, 1.2, -0.5])
            console.log("✅ Placed cube in fridge")
          } else if (targetItem === "table_surface" && cubeState === "in_hand") {
            setCubeState("on_table")
            setCubePos([-0.4, 1.7 + 0.125, -0.5])
            console.log("✅ Placed cube on table")
          }
          break
          
        case "OPEN":
          if (targetItem === "fridge_door") {
            setFridgeOpen(true)
            console.log("✅ Opened fridge door")
          }
          break
          
        case "CLOSE":
          if (targetItem === "fridge_door") {
            setFridgeOpen(false)
            console.log("✅ Closed fridge door")
          }
          break
          
        case "NONE":
          // 向后兼容
          if (targetItem === "fridge_door") {
            setFridgeOpen(prev => !prev)
            console.log("✅ Toggled fridge door")
          }
          break
          
        default:
          console.log(`⚠️ Unknown interaction: ${interactionType}`)
      }
    }
  })

  // === 🔄 任务步骤检测和动画触发 ===
  
  // 检测任务步骤变化
  const detectTaskStepChange = (agentReasoning) => {
    // 简单的关键词检测逻辑
    const stepKeywords = [
      "拿起", "pick up", "拿起cube", "拿起红方块",
      "打开", "open", "打开冰箱", "打开冰箱门",
      "放入", "place", "放入冰箱", "放入红方块",
      "关闭", "close", "关闭冰箱", "关闭冰箱门"
    ]
    
    let newStep = currentTaskStep
    stepKeywords.forEach((keyword, index) => {
      if (agentReasoning.toLowerCase().includes(keyword.toLowerCase())) {
        newStep = Math.floor(index / 4) // 每4个关键词一个步骤
      }
    })
    
    if (newStep !== currentTaskStep) {
      setCurrentTaskStep(newStep)
    }
  }

  // 触发箭头动画
  const triggerArrowAnimation = () => {
    setShowArrowAnimation(true)
    
    // 1.5秒后自动关闭动画（与动画持续时间匹配）
    setTimeout(() => {
      setShowArrowAnimation(false)
    }, 1500)
  }

  // === 🎨 渲染部分 ===
  const TABLE_HEIGHT = 0.85
  
  // 计算Agent位置（用于可视化）
  const getAgentVisualPosition = () => {
    const location = agentSystem.agentState.location
    if (location === "fridge_zone") return [-2, 0, 1]
    if (location === "stove_zone") return [2, 0, 1]
    return [0, 0, 2] // table_center
  }

  // 获取DoctorAvatar状态
  const getDoctorAvatarStatus = () => {
    if (agentSystem.isThinking) return "thinking"
    if (agentSystem.agentState.holding) return "active"
    return "idle"
  }

  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      {/* 🔙 返回主页面按钮 - 移到右上角避免重叠 */}
      {onBack && (
        <button 
          onClick={onBack} 
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all"
        >
          <span>⬅️</span> 返回主页面
        </button>
      )}
      
      <AgentBrainDashboard 
        observation={agentSystem.lastObservation} 
        action={agentSystem.lastAction} 
        isThinking={agentSystem.isThinking} 
      />
      
      {/* 顶部通知气泡 - 显示Agent的具体步骤 */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <NotificationBubble 
          text={agentStep}
          subText="Agent正在执行任务..."
          style={{ transform: 'translateY(-20px)' }}
          showArrowAnimation={showArrowAnimation}
        />
      </div>
      
      {/* 底部控制栏 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-96">
        <div className="flex gap-2 bg-black/50 p-2 rounded backdrop-blur-md border border-gray-600">
          <input
            type="text"
            value={agentSystem.userInstruction}
            onChange={(e) => agentSystem.setUserInstruction(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none font-mono text-sm"
            placeholder="输入任务，例如: Put red cube in fridge"
          />
        </div>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={agentSystem.tick} 
            disabled={agentSystem.isThinking || agentSystem.autoLoop} 
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            STEP
          </button>
          <button 
            onClick={agentSystem.toggleAutoLoop} 
            className={`px-6 py-2 font-bold rounded text-white shadow-lg transition-colors ${agentSystem.autoLoop ? 'bg-red-600 animate-pulse hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {agentSystem.autoLoop ? "STOP" : "AUTO"}
          </button>
          <button 
            onClick={agentSystem.resetAgent}
            className="px-6 py-2 bg-gray-600 text-white font-bold rounded shadow-lg hover:bg-gray-700 transition-colors"
          >
            RESET
          </button>
          {/* 测试箭头动画按钮 */}
          <button 
            onClick={() => triggerArrowAnimation()}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded shadow-lg hover:bg-purple-700 transition-colors"
          >
            测试箭头
          </button>
        </div>
      </div>

      {/* 3D场景 */}
      <Canvas>
        <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={45} onUpdate={c => c.lookAt(0, 0.5, 0)} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-5, 10, 5]} intensity={1.2} />
        
        {/* 桌子 */}
        <mesh position={[0, TABLE_HEIGHT / 2, 0]}>
          <boxGeometry args={[4, TABLE_HEIGHT, 2]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
        
        {/* Agent角色 - 保持原来的胶囊体 */}
        <group position={getAgentVisualPosition()}>
          <mesh position={[0, 1, 0]}>
            <capsuleGeometry args={[0.3, 1, 4]} />
            <meshStandardMaterial color="yellow" wireframe />
          </mesh>
        </group>
        
        {/* 冰箱 */}
        <group position={[-3, 0, -0.5]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="#74b9ff" wireframe={true} transparent={true} opacity={0.8} />
          </mesh>
          <mesh position={[0.5, 1, 0.51]} rotation={[0, fridgeOpen ? 2.0 : 0, 0]}>
            <mesh position={[-0.5, 0, 0]}>
              <boxGeometry args={[1, 2, 0.05]} />
              <meshStandardMaterial color={fridgeOpen ? "#74b9ff" : "#b2bec3"} transparent={true} opacity={0.7} />
            </mesh>
          </mesh>
        </group>
        
        {/* 红方块 */}
        <mesh position={cubePos}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
        
        {/* 网格 */}
        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>
      
      {/* DoctorAvatar - 作为2D UI元素放在Canvas外部 */}
      <div 
        className="absolute z-50"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(${getAgentVisualPosition()[0] * 50 + 50}px, ${-getAgentVisualPosition()[2] * 50 + 50}px)`,
          width: '120px',
          height: '120px'
        }}
      >
        <DoctorAvatar 
          status={getDoctorAvatarStatus()}
          disableEyeTracking={false}
        />
      </div>
      
      {/* 状态显示 */}
      <div className="absolute top-4 left-4 z-50 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${agentSystem.isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
          <span className="font-bold">Agent 状态</span>
        </div>
        <div className="text-gray-300 text-[10px]">
          <div>位置: {agentSystem.agentState.location}</div>
          <div>手持: {agentSystem.agentState.holding || "空手"}</div>
          <div>任务: {agentSystem.userInstruction}</div>
          <div>模式: {agentSystem.autoLoop ? "自动" : "手动"}</div>
          <div>Avatar状态: {getDoctorAvatarStatus()}</div>
          {agentSystem.lastAction && (
            <div className="mt-2 text-yellow-300">
              最后动作: {agentSystem.lastAction.type}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}