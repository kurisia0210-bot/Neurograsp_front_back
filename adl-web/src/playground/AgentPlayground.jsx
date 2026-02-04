import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Grid } from '@react-three/drei'
import * as THREE from 'three'

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

  // === 🗣️ Chat State (新增) ===
  const [userInstruction, setUserInstruction] = useState("Put red cube in fridge") // 默认指令
  const [chatHistory, setChatHistory] = useState([]) // 可选：显示对话历史

  // ==========================================
  // 👁️ Perception System (构造 JSON)
  // ==========================================
  const perceiveWorld = () => {
    const nearby_objects = []

    // 1. 原有的方块
    nearby_objects.push({
      id: "red_cube",
      state: cubeState,
      relation: cubeState === "in_hand" ? "held by agent" : "on the table"
    })

    // 2. 原有的冰箱
    nearby_objects.push({
      id: "fridge_door",
      state: fridgeOpen ? "open" : "closed",
      relation: "front of agent"
    })

    nearby_objects.push({
      id: "fridge_main",
      state: "installed",
      relation: "kitchen appliance"
    })

    // ✅ 3. 新增：必须把“桌子表面”作为一个物体发给后端
    // 只有这样，后端 Prompt 里的 "Nearby" 才会出现 "table_surface"
    // DeepSeek 才会知道："哦！原来我可以 INTERACT(table_surface)"
    nearby_objects.push({
      id: "table_surface",       // 👈 对应 ItemName.TABLE_SURFACE
      state: "installed",        // 使用后端ObjectState枚举中存在的值
      relation: "support surface"
    })

    // ... (其余代码保持不变)

    const agentSelf = {
      location: agentLoc,
      holding: cubeState === "in_hand" ? "red_cube" : null,
      last_action_status: "success"
    }

    return {
      timestamp: Date.now() / 1000, // 用秒更符合 Python 习惯
      agent: agentSelf,
      nearby_objects: nearby_objects,
      // ✅ 关键修改：不再是硬编码的字符串，而是用户的实时输入
      global_task: userInstruction
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
        // ✅ 新增：把东西放回桌子
        else if (actionPayload.target_item === "table_surface" && cubeState === "in_hand") {
          console.log("⬇️ Placing item on table")
          setCubeState("on_table")
          setCubePos([-0.4, 1.7 + 0.125, -0.5]) // 重置回桌面的位置
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

    try {
      const obs = perceiveWorld()
      setLastObs(obs)

      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error("Brain Network Error")
      const data = await response.json()
      
      // ... 处理数据 ...
      const verdict = data.reflex_verdict?.verdict || data.reflex_verdict
      
      if (verdict === "BLOCK") {
          console.warn(`🛡️ Blocked: ${data.reflex_verdict.message}`)
          setLastAction(data.intent)
          // ❌ 删掉这里的 return，或者不要在这里 return
          // 推荐改写成 if-else 结构：
      } else {
          // 只有 ALLOW 才执行物理动作
          const realAction = data.intent
          setLastAction(realAction)
          executeAction(realAction)
      }

    } catch (e) {
      console.error("🔌 Brain disconnected:", e)
      setLastAction({ type: "THINK", content: "Connection Lost..." })
    } finally {
      // ✅ 3. 救命稻草：无论如何都要把 Thinking 状态关掉
      setIsThinking(false) 
    }
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

      {/* ✅ 新增：底部中央的对话控制栏 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-96">

        {/* 输入框 */}
        <div className="flex gap-2 bg-black/50 p-2 rounded backdrop-blur-md border border-gray-600">
          <input
            type="text"
            value={userInstruction}
            onChange={(e) => setUserInstruction(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none font-mono text-sm"
            placeholder="Tell Agent what to do..."
          />
        </div>

        {/* 控制按钮组 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={tick}
            disabled={isThinking || autoLoop}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 disabled:opacity-50 shadow-lg"
          >
            STEP (单步)
          </button>
          <button
            onClick={() => setAutoLoop(!autoLoop)}
            className={`px-6 py-2 font-bold rounded text-white shadow-lg ${autoLoop ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}
          >
            {autoLoop ? "STOP AUTO" : "START AUTO"}
          </button>
        </div>
      </div>

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
        </group>

        {/* 冰箱：只有边框，里面透明 */}
        <group position={[-3, 0, -0.5]}>
          {/* 冰箱主体：线框模式，透明 */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial
              color="#74b9ff"
              wireframe={true}
              transparent={true}
              opacity={0.8}
            />
          </mesh>

          {/* 冰箱门 */}
          <mesh
            position={[0.5, 1, 0.51]}
            rotation={[0, fridgeOpen ? 2.0 : 0, 0]}
          >
            <mesh position={[-0.5, 0, 0]}>
              <boxGeometry args={[1, 2, 0.05]} />
              <meshStandardMaterial
                color={fridgeOpen ? "#74b9ff" : "#b2bec3"}
                transparent={true}
                opacity={0.7}
              />
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