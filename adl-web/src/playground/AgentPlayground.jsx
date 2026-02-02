import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Grid, Html } from '@react-three/drei'
import * as THREE from 'three'

// 资产
import { Floor } from '../components/Floor'
import { GameAssistant } from '../components/game/avatar/GameAssistant'

// ❌ 注意：我们不再引入 MockBrain，因为现在用真的后端了
// import { mockPythonBackend } from './MockBrain'

// ✅ 定义常量，防止手抖拼错
const VerdictType = {
  ALLOW: "ALLOW",
  BLOCK: "BLOCK"
};

// ==========================================
// 🧠 Dashboard (显示实时思维流)
// ==========================================
const AgentBrainDashboard = ({ observation, action, isThinking }) => {
  return (
    <div className="absolute top-4 right-4 w-96 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-2xl z-50 border border-green-500/30 overflow-hidden">
      <div className="flex justify-between items-center border-b border-green-500/50 pb-2 mb-2">
        <h2 className="font-bold text-sm">🧠 COALA Architecture Test</h2>
        <span className={`w-3 h-3 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
      </div>
      
      <div className="mb-4">
        <h3 className="text-gray-400 mb-1">[PERCEPTION (Body -> Brain)]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 h-32 overflow-y-auto text-[10px] whitespace-pre-wrap">
          {observation ? JSON.stringify(observation, null, 2) : "Initializing..."}
        </pre>
      </div>

      <div>
        <h3 className="text-gray-400 mb-1">[ACTION (Brain -> Body)]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 text-yellow-300 text-[10px] whitespace-pre-wrap">
          {action ? JSON.stringify(action, null, 2) : "Waiting..."}
        </pre>
      </div>
    </div>
  )
}

export function AgentPlayground() {
  // === 🌍 World State (真实物理状态) ===
  const [agentLoc, setAgentLoc] = useState("table_center") 
  const [fridgeOpen, setFridgeOpen] = useState(false)
  const [cubePos, setCubePos] = useState([-0.4, 1.7 + 0.125, -0.5])
  const [cubeState, setCubeState] = useState("on_table") 

  // === 🧠 Agent Mind State (这里定义了 autoLoop) ===
  const [lastObs, setLastObs] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [autoLoop, setAutoLoop] = useState(false) // ✅ 你的报错就是因为缺了这一行

  // ==========================================
  // 👁️ Perception System (构造 JSON)
  // ==========================================
  const perceiveWorld = () => {
    const nearby_objects = []
    
    // 只有在桌子附近才能看到桌上的方块
    // (为了测试方便，我们假设一直能看见，或者你可以加上距离判断)
    nearby_objects.push({
      id: "red_cube",
      state: cubeState, 
      relation: cubeState === "in_hand" ? "held by agent" : "on the table"
    })

    nearby_objects.push({
      id: "fridge_door",
      state: fridgeOpen ? "open" : "closed",
      relation: "front of agent"
    })

    nearby_objects.push({
      id: "fridge_main",
      state: "installed", // 状态可以是任意合法的字符串
      relation: "kitchen appliance" 
    })

    const agentSelf = {
      location: agentLoc,
      holding: cubeState === "in_hand" ? "red_cube" : null,
      last_action_status: "success"
    }

    return {
      timestamp: Date.now() / 1000, // 用秒更符合 Python 习惯
      agent: agentSelf,
      nearby_objects: nearby_objects,
      global_task: "Put red cube in fridge"
    }
  }

  // ==========================================
  // 💪 Motor System (执行 JSON)
  // ==========================================
  const executeAction = (actionPayload) => {
    console.log("💪 [Body] Executing:", actionPayload)
    switch (actionPayload.type) {
      case "MOVE_TO":
        if (actionPayload.target_poi) {
            setAgentLoc(actionPayload.target_poi)
        }
        break
      case "INTERACT":
        // 捡起方块
        if (actionPayload.target_item === "red_cube" && cubeState === "on_table") {
          setCubeState("in_hand")
          setCubePos([0, -10, 0]) 
        } 
        // 放入冰箱
        else if (actionPayload.target_item === "fridge_main" && cubeState === "in_hand") {
          setCubeState("in_fridge")
          setCubePos([-1.8, 1.2, -0.5]) 
        } 
        // 开关冰箱
        else if (actionPayload.target_item === "fridge_door") {
          setFridgeOpen(prev => !prev)
        }
        break
      case "IDLE":
      default:
        break
    }
  }

  // ==========================================
  // 🔄 The Game Loop (Main) - 已连接真实后端
  // ==========================================
  const tick = async () => {
    if (isThinking) return
    setIsThinking(true)

    // 1. Perceive
    const obs = perceiveWorld()
    setLastObs(obs)

    try {
      // 2. Transmit to Python Brain
      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error("Brain Network Error")

      // 3. Receive Response (拆快递)
      // 📦 data 包含了 { intent, reflex_verdict }
      const data = await response.json()
      
      console.log("📦 Backend Response:", data) // 强烈建议加上这行，方便调试

      // 4. Reflex Check (安检)
      // 获取判决结果 (兼容 verdict 是对象或字符串的情况)
      const verdict = data.reflex_verdict?.verdict || data.reflex_verdict
      
      // 如果被 BLOCK 了，就不执行动作，只更新 UI 显示
      if (verdict === "BLOCK") {
          console.warn("🛡️ Action BLOCKED by Reflex!")
          setLastAction(data.intent) // UI 依然显示它想干什么
          return // 🚫 终止执行
      }

      // 5. Extract Intent (取出真正的动作)
      const realAction = data.intent

      setLastAction(realAction)
      
      // 6. Act (执行)
      // ✅ 现在 realAction.type 是存在的 (例如 "INTERACT")
      executeAction(realAction)

    } catch (e) {
      console.error("🔌 Brain disconnected:", e)
      setLastAction({ type: "THINK", content: "Connection Lost..." })
    }

    setIsThinking(false)
  }

  // 自动循环
  useEffect(() => {
    let interval
    if (autoLoop) {
      interval = setInterval(() => tick(), 3000) // 给 LLM 多一点时间 (3秒)
    }
    return () => clearInterval(interval)
  }, [autoLoop, agentLoc, fridgeOpen, cubeState]) 

  // ==========================================
  // 🎨 渲染层
  // ==========================================
  const TABLE_HEIGHT = 0.85

  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      
      <AgentBrainDashboard 
        observation={lastObs} 
        action={lastAction} 
        isThinking={isThinking} 
      />

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
        <button 
          onClick={tick}
          disabled={isThinking || autoLoop}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50"
        >
          STEP (单步)
        </button>
        <button 
          onClick={() => setAutoLoop(!autoLoop)}
          className={`px-6 py-2 font-bold rounded ${autoLoop ? 'bg-red-600' : 'bg-green-600'} text-white`}
        >
          {autoLoop ? "STOP AUTO" : "START AUTO"}
        </button>
      </div>

      <Canvas>
        <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={45} onUpdate={c => c.lookAt(0, 0.5, 0)} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-5, 10, 5]} intensity={1.2} />

        <group position={[0, -0.01, 0]}>
          <Floor width={12} depth={12} color='#2d3436' />
        </group>

        {/* 桌子 */}
        <mesh position={[0, TABLE_HEIGHT / 2, 0]}>
           <boxGeometry args={[4, TABLE_HEIGHT, 2]} />
           <meshStandardMaterial color="#636e72" />
        </mesh>

        {/* 虚拟 Agent */}
        <group position={
          agentLoc === "fridge_zone" ? [-2, 0, 1] : 
          agentLoc === "stove_zone" ? [2, 0, 1] : 
          [0, 0, 2] 
        }>
           <mesh position={[0, 1, 0]}>
             <capsuleGeometry args={[0.3, 1, 4]} />
             <meshStandardMaterial color="yellow" wireframe />
           </mesh>
           
           {/* Avatar: 务必用 Html 包裹 */}
           <Html position={[0, 2.2, 0]} center transform sprite>
              <div className="transform scale-50 pointer-events-none">
                <GameAssistant isThinking={isThinking} />
              </div>
           </Html>
        </group>

        {/* 冰箱 */}
        <group position={[-2, 0, -0.5]}>
           <mesh position={[0, 1, 0]}>
             <boxGeometry args={[1, 2, 1]} />
             <meshStandardMaterial color="#b2bec3" />
           </mesh>
           <mesh 
             position={[0.5, 1, 0.51]} 
             rotation={[0, fridgeOpen ? 2.0 : 0, 0]} 
           >
             <mesh position={[-0.5, 0, 0]}>
                <boxGeometry args={[1, 2, 0.05]} />
                <meshStandardMaterial color={fridgeOpen ? "#74b9ff" : "#b2bec3"} />
             </mesh>
           </mesh>
        </group>

        {/* 方块 */}
        <mesh position={cubePos}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>

        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>
    </div>
  )
}