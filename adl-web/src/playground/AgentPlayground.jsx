// src/components/AgentPlayground.jsx (兼容版)
import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Grid } from '@react-three/drei'

// ==========================================
// 🧠 Dashboard
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

export function AgentPlayground() {
  // === 🌍 World State ===
  const [agentLoc, setAgentLoc] = useState("table_center")
  const [fridgeOpen, setFridgeOpen] = useState(false)
  const [cubePos, setCubePos] = useState([-0.4, 1.7 + 0.125, -0.5])
  const [cubeState, setCubeState] = useState("on_table")

  // === 🧠 Agent Mind State ===
  const [lastObs, setLastObs] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [autoLoop, setAutoLoop] = useState(false)
  
  // 📝 默认任务：这里绝对不能包含 "Game: Memory Dialing"，否则会触发短路！
  const [userInstruction, setUserInstruction] = useState("Put red cube in fridge") 

  // ==========================================
  // 👁️ Perception System (适配新版 Payload)
  // ==========================================
  const perceiveWorld = () => {
    const nearby_objects = []

    // 1. Red Cube
    nearby_objects.push({
      id: "red_cube", // ItemName.RED_CUBE
      state: cubeState, // ObjectState 枚举
      relation: cubeState === "in_hand" ? "held by agent" : "on the table"
    })

    // 2. Fridge Door
    nearby_objects.push({
      id: "fridge_door", // ItemName.FRIDGE_DOOR
      state: fridgeOpen ? "open" : "closed",
      relation: "front of agent"
    })

    // 3. Fridge Main
    nearby_objects.push({
      id: "fridge_main", // ItemName.FRIDGE_MAIN
      state: "installed",
      relation: "kitchen appliance"
    })
    
    // 4. Table Surface (关键：让 LLM 知道桌子存在)
    nearby_objects.push({
        id: "table_surface", 
        state: "installed",
        relation: "support surface"
    })

    return {
      timestamp: Date.now() / 1000,
      agent: {
        location: agentLoc, // PoiName 枚举
        holding: cubeState === "in_hand" ? "red_cube" : null // ItemName 枚举 or null
      },
      nearby_objects: nearby_objects,
      // 关键：这个 global_task 会绕过 reasoning.py 的短路逻辑，直接进入 Deep Reasoning
      global_task: userInstruction 
    }
  }

  // ==========================================
  // 💪 Motor System (执行动作)
  // ==========================================
  const executeAction = (actionPayload) => {
    console.log("💪 [Body] Executing:", actionPayload)
    switch (actionPayload.type) {
      case "MOVE_TO":
        if (actionPayload.target_poi) setAgentLoc(actionPayload.target_poi)
        break
      case "INTERACT":
        if (actionPayload.target_item === "red_cube" && cubeState === "on_table") {
            setCubeState("in_hand"); setCubePos([0, -10, 0])
        } else if (actionPayload.target_item === "fridge_main" && cubeState === "in_hand") {
            setCubeState("in_fridge"); setCubePos([-1.8, 1.2, -0.5])
        } else if (actionPayload.target_item === "fridge_door") {
            setFridgeOpen(prev => !prev)
        } else if (actionPayload.target_item === "table_surface" && cubeState === "in_hand") {
            setCubeState("on_table"); setCubePos([-0.4, 1.7 + 0.125, -0.5])
        }
        break
      default: break
    }
  }

  // ==========================================
  // 🔄 Tick Loop
  // ==========================================
  const tick = async () => {
    if (isThinking) return
    setIsThinking(true)

    try {
      const obs = perceiveWorld()
      setLastObs(obs)

      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error(`Brain Error: ${response.status}`)
      const data = await response.json()
      
      // 处理 verdict 结构 (兼容新版 Payload)
      const reflex = data.reflex_verdict
      
      // 如果被物理引擎拦截 (L1 失败)
      if (reflex && reflex.verdict === "BLOCK") {
          console.warn(`🛡️ Reflex Blocked: ${reflex.message}`)
          setLastAction({ ...data.intent, _status: 'BLOCKED', _reason: reflex.message })
          // Game 1 暂时不做处理，只是打印
      } else {
          // 执行
          setLastAction(data.intent)
          executeAction(data.intent)
      }

    } catch (e) {
      console.error("🔌 Brain disconnected:", e)
      setLastAction({ type: "THINK", content: `Error: ${e.message}` })
    } finally {
      setIsThinking(false)
    }
  }

  // 自动循环
  useEffect(() => {
    let interval
    if (autoLoop) interval = setInterval(() => tick(), 3000)
    return () => clearInterval(interval)
  }, [autoLoop, agentLoc, fridgeOpen, cubeState])

  // ==========================================
  // 🎨 渲染部分 (保持不变)
  // ==========================================
  const TABLE_HEIGHT = 0.85
  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      <AgentBrainDashboard observation={lastObs} action={lastAction} isThinking={isThinking} />
      
      {/* 底部控制栏 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-96">
        <div className="flex gap-2 bg-black/50 p-2 rounded backdrop-blur-md border border-gray-600">
          <input
            type="text"
            value={userInstruction}
            onChange={(e) => setUserInstruction(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none font-mono text-sm"
          />
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={tick} disabled={isThinking || autoLoop} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow-lg disabled:opacity-50">STEP</button>
          <button onClick={() => setAutoLoop(!autoLoop)} className={`px-6 py-2 font-bold rounded text-white shadow-lg ${autoLoop ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}>{autoLoop ? "STOP" : "AUTO"}</button>
        </div>
      </div>

      <Canvas>
        <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={45} onUpdate={c => c.lookAt(0, 0.5, 0)} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-5, 10, 5]} intensity={1.2} />
        {/* 场景物体... (保持你原有的 mesh 代码) */}
        <mesh position={[0, TABLE_HEIGHT / 2, 0]}><boxGeometry args={[4, TABLE_HEIGHT, 2]} /><meshStandardMaterial color="#636e72" /></mesh>
        <group position={agentLoc === "fridge_zone" ? [-2, 0, 1] : agentLoc === "stove_zone" ? [2, 0, 1] : [0, 0, 2]}><mesh position={[0, 1, 0]}><capsuleGeometry args={[0.3, 1, 4]} /><meshStandardMaterial color="yellow" wireframe /></mesh></group>
        <group position={[-3, 0, -0.5]}>
          <mesh position={[0, 1, 0]}><boxGeometry args={[1, 2, 1]} /><meshStandardMaterial color="#74b9ff" wireframe={true} transparent={true} opacity={0.8} /></mesh>
          <mesh position={[0.5, 1, 0.51]} rotation={[0, fridgeOpen ? 2.0 : 0, 0]}><mesh position={[-0.5, 0, 0]}><boxGeometry args={[1, 2, 0.05]} /><meshStandardMaterial color={fridgeOpen ? "#74b9ff" : "#b2bec3"} transparent={true} opacity={0.7} /></mesh></mesh>
        </group>
        <mesh position={cubePos}><boxGeometry args={[0.25, 0.25, 0.25]} /><meshStandardMaterial color="#ff6b6b" /></mesh>
        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>
    </div>
  )
}