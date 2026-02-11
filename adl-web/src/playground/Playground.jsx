// Stagnation Detection Test Playground
// 最小停滞场景：2个位置 + 1个不可达目标 = 诱发循环
import React, { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'

export function Playground() {

  
  // === 🌍 最小世界状态 ===
  const [agentLocation, setAgentLocation] = useState("zone_A")
  const [stepCount, setStepCount] = useState(0)
  const [actionHistory, setActionHistory] = useState([])
  
  // === 🧠 Agent 状态 ===
  const [lastAction, setLastAction] = useState(null)
  const [isThinking, setIsThinking] = useState(false)
  const [watchdogAlert, setWatchdogAlert] = useState(null)
  
  // === 📡 调试状态 ===
  const [lastRequest, setLastRequest] = useState(null)
  const [lastResponse, setLastResponse] = useState(null)
  const [showDebug, setShowDebug] = useState(true)
  
  // === 🔥 西西弗斯测试模式 ===
  const [sisyphusMode, setSisyphusMode] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [stateHistory, setStateHistory] = useState([])

  // 生成世界状态的唯一指纹
// 包括：Agent位置 + 是否持有物品 + (扩展性)关键物品位
  // ==========================================
  // 🎯 最小停滞场景设计
  // ==========================================
  // 场景：target 在 zone_B，但 zone_B 永远"太远"无法到达
  // Agent 会尝试：zone_A -> zone_B (失败) -> zone_A -> zone_B (失败) ...
  
  const perceiveWorld = () => {
    // 映射自定义位置到后端枚举值
    const locationMap = {
      "zone_A": "table_center",   // 伪装成桌子中心
      "zone_B": "fridge_zone"     // 伪装成冰箱区域
    }
    
    return {
      timestamp: Date.now() / 1000,
      agent: {
        location: locationMap[agentLocation], // 使用合法的 PoiName 枚举
        holding: null
      },
      nearby_objects: [
        {
          id: "red_cube",          // 合法的 ItemName
          state: "on_table",       // 合法的 ObjectState (伪装：实际不可达)
          relation: agentLocation === "zone_A" ? "visible far away" : "still unreachable"
        }
      ],
      global_task: "Pick up the red cube" // 不可能完成的任务
    }
  }

  // ==========================================
  // 🔥 西西弗斯模式：生成世界状态哈希
  // ==========================================
  const generateWorldHash = (location, holding) => {
    return `${location}|${holding ? "holding" : "empty"}`
  }

  // ==========================================
  // 🕵️ 停滞检测（基于状态历史）
  // ==========================================
  const detectStagnation = (action, history) => {
    if (history.length < 5) return null
    
    const recent5 = history.slice(-5)
    const uniqueStates = new Set(recent5)
    
    // 如果最近5次状态只有1-2种，判定为停滞
    if (uniqueStates.size <= 2) {
      return `🚨 状态停滞检测！最近5步只有 ${uniqueStates.size} 种状态: ${Array.from(uniqueStates).join(", ")}`
    }
    
    return null
  }

  // ==========================================
  // 🔄 Tick 循环
  // ==========================================
  const tick = async () => {
    if (isThinking) return
    setIsThinking(true)
    setStepCount(prev => prev + 1)

    try {
      // === 🔥 西西弗斯模式：本地模拟循环 ===
      if (sisyphusMode) {
        let nextActionType = "WAIT"
        let nextHolding = isHolding
        
        // 简单状态机：没拿就拿，拿了就放
        if (!isHolding) {
          nextActionType = "PICK"
          nextHolding = true
          console.log("🔥 Agent: 拿起方块...")
        } else {
          nextActionType = "DROP"
          nextHolding = false
          console.log("🔥 Agent: 哎呀太烫了！放下方块...")
        }
        
        // 记录状态历史
        const currentHash = generateWorldHash(agentLocation, nextHolding)
        const newHistory = [...stateHistory, currentHash]
        setStateHistory(newHistory)
        
        // 检测停滞
        const alert = detectStagnation({ type: nextActionType }, newHistory)
        if (alert) {
          setWatchdogAlert(alert)
        }
        
        // 更新状态
        setIsHolding(nextHolding)
        setLastAction({
          type: nextActionType,
          content: nextHolding ? "拿起红方块" : "太烫了！放下方块"
        })
        
        // 记录动作历史
        setActionHistory(prev => [...prev, nextActionType].slice(-5))
        
        setIsThinking(false)
        return
      }
      
      // === 🌐 正常模式：调用后端 ===
      const obs = perceiveWorld()
      setLastRequest(obs) // 记录请求
      
      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error(`Backend error: ${response.status}`)
      const data = await response.json()
      setLastResponse(data) // 记录响应
      
      setLastAction(data.intent)
      
      // 记录动作历史
      const actionSig = `${data.intent.type}:${data.intent.target_poi || data.intent.target_item}`
      setActionHistory(prev => [...prev, actionSig].slice(-5))
      
      // 检测 Watchdog 报警（如果 content 包含 STAGNATION）
      if (data.intent.content?.includes("STAGNATION") || data.intent.content?.includes("Stagnation")) {
        setWatchdogAlert(data.intent.content)
      }
      
      // 执行动作（模拟移动，但永远失败）
      if (data.intent.type === "MOVE_TO") {
        const target = data.intent.target_poi
        // 后端返回的是 "fridge_zone" 或 "table_center"
        if (target === "fridge_zone") {
          // 假装移动到 zone_B，但立即"失败"回到 zone_A
          setAgentLocation("zone_B")
          setTimeout(() => setAgentLocation("zone_A"), 500)
        } else if (target === "table_center") {
          setAgentLocation("zone_A")
        }
      }

    } catch (e) {
      console.error("Tick error:", e)
    } finally {
      setIsThinking(false)
    }
  }

  // 自动运行
  const [autoRun, setAutoRun] = useState(false)
  useEffect(() => {
    let interval
    if (autoRun && !watchdogAlert) {
      interval = setInterval(tick, 2000)
    }
    return () => clearInterval(interval)
  }, [autoRun, watchdogAlert, agentLocation])

  const reset = () => {
    setAgentLocation("zone_A")
    setStepCount(0)
    setActionHistory([])
    setLastAction(null)
    setWatchdogAlert(null)
    setLastRequest(null)
    setLastResponse(null)
    setIsHolding(false)
    setStateHistory([])
  }

  // ==========================================
  // 🎨 UI
  // ==========================================
  return (
    <div className="w-full h-screen relative bg-white">
      {/* 顶部信息栏 */}
      <div className="absolute top-4 left-4 z-50 bg-white border-2 border-blue-500 p-4 rounded-lg shadow-lg text-gray-800 font-mono text-sm w-96">
        <div className="font-bold mb-2 text-blue-600 flex items-center justify-between">
          <span>🐕 停滞检测器 (Watchdog)</span>
          {sisyphusMode && <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">西西弗斯模式</span>}
        </div>
        <div className="space-y-1 text-xs">
          <div>步数: <span className="font-bold">{stepCount}</span></div>
          <div>位置: <span className="text-green-600 font-bold">{agentLocation}</span></div>
          {sisyphusMode && (
            <div>持有: <span className={`font-bold ${isHolding ? 'text-red-600' : 'text-gray-400'}`}>
              {isHolding ? "🔥 拿着方块" : "空手"}
            </span></div>
          )}
          <div>历史: <span className="text-gray-500">{actionHistory.join(" → ")}</span></div>
          {sisyphusMode && stateHistory.length > 0 && (
            <div className="text-[10px] text-gray-400">
              状态: {stateHistory.slice(-3).join(" → ")}
            </div>
          )}
        </div>
      </div>

      {/* Watchdog 报警 */}
      {watchdogAlert && (
        <div className="absolute top-4 right-4 z-50 bg-red-100 border-2 border-red-600 p-4 rounded-lg shadow-lg text-red-900 font-mono text-sm max-w-md animate-pulse">
          <div className="font-bold text-red-600 mb-2">🚨 看门狗报警！</div>
          <div className="text-xs">{watchdogAlert}</div>
        </div>
      )}

      {/* 动作显示 */}
      {lastAction && (
        <div className="absolute bottom-24 left-4 z-50 bg-green-50 border-2 border-green-500 p-3 rounded shadow-lg text-gray-800 font-mono text-xs w-80">
          <div className="font-bold mb-1 text-green-700">最后动作:</div>
          <div>类型: <span className="text-blue-600 font-bold">{lastAction.type}</span></div>
          {lastAction.target_poi && <div>目标: {lastAction.target_poi}</div>}
          <div className="text-gray-600 mt-1">{lastAction.content}</div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {/* 主控制按钮 */}
        <div className="flex gap-3">
          <button 
            onClick={tick} 
            disabled={isThinking || autoRun}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold rounded shadow-lg"
          >
            单步
          </button>
          <button 
            onClick={() => setAutoRun(!autoRun)}
            disabled={!!watchdogAlert}
            className={`px-6 py-3 font-bold rounded shadow-lg text-white ${
              autoRun ? 'bg-red-500 animate-pulse' : 'bg-green-500 hover:bg-green-600'
            } disabled:bg-gray-400`}
          >
            {autoRun ? "停止" : "自动"}
          </button>
          <button 
            onClick={reset}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded shadow-lg"
          >
            重置
          </button>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded shadow-lg"
          >
            {showDebug ? "隐藏调试" : "显示调试"}
          </button>
        </div>
        
        {/* 模式切换按钮 */}
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => {
              setSisyphusMode(false)
              reset()
            }}
            className={`px-4 py-2 text-sm font-bold rounded shadow ${
              !sisyphusMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            🌐 后端模式
          </button>
          <button 
            onClick={() => {
              setSisyphusMode(true)
              reset()
            }}
            className={`px-4 py-2 text-sm font-bold rounded shadow ${
              sisyphusMode ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            🔥 西西弗斯模式
          </button>
        </div>
      </div>

      {/* 📡 前后端交互 Dashboard */}
      {showDebug && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-purple-500 rounded-lg shadow-2xl w-[800px] max-h-[600px] overflow-hidden">
          <div className="bg-purple-500 text-white px-4 py-2 font-bold flex justify-between items-center">
            <span>📡 前后端通信调试面板</span>
            <button 
              onClick={() => setShowDebug(false)}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 divide-x divide-gray-300 h-[550px]">
            {/* 左侧：请求 (Request) */}
            <div className="p-4 overflow-y-auto">
              <div className="font-bold text-blue-600 mb-2 flex items-center gap-2">
                <span>📤</span>
                <span>请求 (Frontend → Backend)</span>
              </div>
              {lastRequest ? (
                <div className="space-y-2">
                  <div className="bg-blue-50 p-2 rounded text-xs">
                    <div className="font-bold text-blue-700 mb-1">Endpoint:</div>
                    <code className="text-blue-600">POST /api/tick</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-bold text-gray-700 mb-1 text-xs">Payload:</div>
                    <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(lastRequest, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic">等待第一次请求...</div>
              )}
            </div>

            {/* 右侧：响应 (Response) */}
            <div className="p-4 overflow-y-auto">
              <div className="font-bold text-green-600 mb-2 flex items-center gap-2">
                <span>📥</span>
                <span>响应 (Backend → Frontend)</span>
              </div>
              {lastResponse ? (
                <div className="space-y-2">
                  <div className="bg-green-50 p-2 rounded text-xs">
                    <div className="font-bold text-green-700 mb-1">Status:</div>
                    <code className="text-green-600">200 OK</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-bold text-gray-700 mb-1 text-xs">Response:</div>
                    <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(lastResponse, null, 2)}
                    </pre>
                  </div>
                  
                  {/* 高亮关键信息 */}
                  <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-xs">
                    <div className="font-bold text-yellow-700 mb-1">关键信息:</div>
                    <div className="space-y-1">
                      <div>动作类型: <span className="font-mono text-blue-600">{lastResponse.intent?.type}</span></div>
                      {lastResponse.intent?.target_poi && (
                        <div>目标位置: <span className="font-mono text-green-600">{lastResponse.intent.target_poi}</span></div>
                      )}
                      {lastResponse.intent?.content && (
                        <div className="text-gray-600">推理: {lastResponse.intent.content}</div>
                      )}
                      <div>判决: <span className={`font-bold ${lastResponse.reflex_verdict?.verdict === 'ALLOW' ? 'text-green-600' : 'text-red-600'}`}>
                        {lastResponse.reflex_verdict?.verdict}
                      </span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm italic">等待后端响应...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3D 场景 */}
      <Canvas>
        <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={60} onUpdate={c => c.lookAt(0, 0, 0)} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />

        {/* Zone A (起点) */}
        <group position={[-3, 0, 0]}>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[2, 0.1, 2]} />
            <meshStandardMaterial color={agentLocation === "zone_A" ? "#22c55e" : "#d1d5db"} />
          </mesh>
          {/* 标签 */}
          <Text 
            position={[0, 0.5, -1.2]} 
            fontSize={0.3} 
            color="#000000"
            anchorX="center"
            anchorY="middle"
          >
            区域A (起点)
          </Text>
        </group>
        
        {/* Zone B (终点，不可达) */}
        <group position={[3, 0, 0]}>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[2, 0.1, 2]} />
            <meshStandardMaterial color="#ef4444" wireframe />
          </mesh>
          {/* 标签 */}
          <Text 
            position={[0, 0.5, -1.2]} 
            fontSize={0.25} 
            color="#dc2626"
            anchorX="center"
            anchorY="middle"
          >
            区域B (不可达)
          </Text>
        </group>

        {/* Agent (方块) */}
        <group position={[agentLocation === "zone_A" ? -3 : 3, 0.6, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={sisyphusMode && isHolding ? "#ef4444" : "#fbbf24"} />
          </mesh>
          {/* 边框 */}
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.5, 0.5, 0.5)]} />
            <lineBasicMaterial attach="material" color="#000000" linewidth={2} />
          </lineSegments>
          {/* 标签 */}
          <Text 
            position={[0, 0.8, 0]} 
            fontSize={0.2} 
            color="#000000"
            anchorX="center"
            anchorY="middle"
          >
            {sisyphusMode && isHolding ? "Agent 🔥" : "Agent"}
          </Text>
        </group>

        {/* Target (目标方块) */}
        <group position={[3, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          {/* 边框 */}
          <lineSegments>
            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.3, 0.3, 0.3)]} />
            <lineBasicMaterial attach="material" color="#000000" linewidth={2} />
          </lineSegments>
          {/* 标签 */}
          <Text 
            position={[0, 0.5, 0]} 
            fontSize={0.15} 
            color="#dc2626"
            anchorX="center"
            anchorY="middle"
          >
            目标
          </Text>
        </group>

        <Grid args={[20, 20]} cellColor="#e5e7eb" sectionColor="#9ca3af" />
      </Canvas>

      {/* 检测机制说明 */}
      <div className="absolute bottom-4 right-4 z-50 bg-yellow-50 border-2 border-yellow-500 p-4 rounded shadow-lg text-gray-800 text-xs max-w-xs">
        <div className="font-bold text-yellow-700 mb-2">🔍 检测机制说明:</div>
        {!sisyphusMode ? (
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>后端模式:</strong> 调用真实后端 Watchdog</li>
            <li><strong>场景设计:</strong> 2个区域 (A可达, B不可达) + 1个目标</li>
            <li><strong>诱发循环:</strong> Agent会反复尝试 A → B → A → B...</li>
            <li><strong>检测方法:</strong> 滑动窗口记录最近5次动作签名</li>
            <li><strong>触发条件:</strong> 5次动作中只有≤2种不同签名</li>
            <li><strong>预期结果:</strong> 第5步左右触发看门狗报警</li>
          </ul>
        ) : (
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>西西弗斯模式:</strong> 本地模拟状态循环</li>
            <li><strong>场景:</strong> 红方块太烫，拿起就必须放下</li>
            <li><strong>循环:</strong> PICK (拿起) → DROP (放下) → PICK...</li>
            <li><strong>检测方法:</strong> 记录世界状态哈希 (位置|持有状态)</li>
            <li><strong>触发条件:</strong> 最近5次状态只有≤2种不同状态</li>
            <li><strong>预期:</strong> 状态在 "zone_A|holding" 和 "zone_A|empty" 之间循环</li>
          </ul>
        )}
      </div>
    </div>
  )
}