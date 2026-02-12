// AgentSystem.jsx - 可复用的Agent系统封装
import React, { useState, useRef, useEffect, useCallback } from 'react'

/**
 * AgentSystem - 可复用的Agent核心系统
 * 
 * 这个组件封装了Agent的所有核心逻辑：
 * 1. 状态管理（位置、手持物品）
 * 2. 感知系统（perceiveWorld）
 * 3. 执行系统（executeAction）
 * 4. Tick循环（与后端通信）
 * 5. 自动循环控制
 * 
 * @param {Object} props
 * @param {Function} props.onActionExecuted - 动作执行后的回调
 * @param {Function} props.onTickComplete - Tick完成后的回调
 * @param {Function} props.getWorldState - 获取世界状态的函数
 * @param {Function} props.executeWorldAction - 执行世界动作的函数
 * @param {string} props.initialTask - 初始任务
 * @param {string} props.backendUrl - 后端API地址
 */
export function useAgentSystem({
  onActionExecuted = () => {},
  onTickComplete = () => {},
  getWorldState,
  executeWorldAction,
  initialTask = "Put red cube in fridge",
  backendUrl = 'http://127.0.0.1:8001/api/tick'
}) {
  // === 🧠 Agent 核心状态 ===
  const [agentState, setAgentState] = useState({
    location: "table_center",
    holding: null
  })
  
  const [isThinking, setIsThinking] = useState(false)
  const [autoLoop, setAutoLoop] = useState(false)
  const [lastAction, setLastAction] = useState(null)
  const [lastObservation, setLastObservation] = useState(null)
  const [lastResponse, setLastResponse] = useState(null)
  const [userInstruction, setUserInstruction] = useState(initialTask)

  // ✅ 使用 useRef 存储最新状态，避免闭包陷阱
  const agentStateRef = useRef(agentState)
  
  // 每次 agentState 更新时，同步更新 ref
  useEffect(() => {
    agentStateRef.current = agentState
  }, [agentState])

  // === 👁️ 感知系统 ===
  const perceiveWorld = useCallback((customState = null) => {
    // 使用传入的状态或当前状态
    const state = customState || agentStateRef.current
    
    // 调用外部函数获取世界状态
    const worldState = getWorldState ? getWorldState(state) : {
      nearby_objects: [],
      timestamp: Date.now() / 1000
    }

    return {
      timestamp: Date.now() / 1000,
      agent: {
        location: state.location,
        holding: state.holding,
      },
      nearby_objects: worldState.nearby_objects || [],
      global_task: userInstruction
    }
  }, [getWorldState, userInstruction])

  // === 💪 执行系统 ===
  const executeAction = useCallback((actionPayload) => {
    console.log("🤖 [AgentSystem] Executing:", actionPayload)
    
    // ✅ 从 ref 获取最新状态，避免闭包陷阱
    let newAgentState = { ...agentStateRef.current }

    // 处理不同类型的动作
    switch (actionPayload.type) {
      case "MOVE_TO":
        if (actionPayload.target_poi) {
          newAgentState.location = actionPayload.target_poi
          console.log(`✅ Agent moved to: ${actionPayload.target_poi}`)
        }
        break
        
      case "INTERACT":
        const interactionType = actionPayload.interaction_type || "NONE"
        const targetItem = actionPayload.target_item
        
        // 调用外部函数执行世界动作
        if (executeWorldAction) {
          executeWorldAction(actionPayload, newAgentState)
        }
        
        // 更新手持状态（基于交互类型）
        if (interactionType === 'PICK' && targetItem) {
          newAgentState.holding = targetItem
          console.log(`✅ Agent picked up: ${targetItem}`)
        } else if (interactionType === 'PLACE') {
          newAgentState.holding = null
          console.log(`✅ Agent placed item`)
        }
        break
        
      case "THINK":
        console.log("💭 Agent:", actionPayload.content)
        break
        
      case "SPEAK":
        console.log("💬 Agent:", actionPayload.content)
        break
        
      case "IDLE":
        console.log("⏸️ Agent: Idling...")
        break
        
      case "FINISH":
        console.log("✅ Agent:", actionPayload.content)
        break
        
      default:
        console.log("⚠️ Unknown action:", actionPayload.type)
    }
    
    // 更新状态
    agentStateRef.current = newAgentState
    setAgentState(newAgentState)
    
    // 回调通知
    onActionExecuted(actionPayload, newAgentState)
    
    return newAgentState
  }, [executeWorldAction, onActionExecuted])

  // === 🔄 Tick 循环 ===
  const tick = useCallback(async () => {
    if (isThinking) return
    setIsThinking(true)

    try {
      // 1. 感知世界
      const obs = perceiveWorld()
      setLastObservation(obs)

      // 2. 发送请求到后端
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error(`Backend error: ${response.status}`)
      
      // 3. 解析响应
      const data = await response.json()
      setLastResponse(data)
      setLastAction(data.intent)

      // 4. 处理反射判决
      const reflex = data.reflex_verdict
      if (reflex && reflex.verdict === "BLOCK") {
        console.warn(`🛡️ Reflex Blocked: ${reflex.message}`)
        // 可以在这里处理被阻止的动作
      } else {
        // 5. 执行动作
        executeAction(data.intent)
      }

      // 6. 回调通知
      onTickComplete(data, obs)

    } catch (e) {
      console.error("❌ Tick error:", e)
      setLastAction({ type: "THINK", content: `Error: ${e.message}` })
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, perceiveWorld, backendUrl, executeAction, onTickComplete])

  // === ⏱️ 自动循环控制 ===
  useEffect(() => {
    if (!autoLoop) return

    const interval = setInterval(() => {
      tick()
    }, 3000) // 每3秒执行一次

    return () => clearInterval(interval)
  }, [autoLoop, tick])

  // === 🎮 控制函数 ===
  const startAutoLoop = () => setAutoLoop(true)
  const stopAutoLoop = () => setAutoLoop(false)
  const toggleAutoLoop = () => setAutoLoop(prev => !prev)

  const updateTask = (newTask) => {
    setUserInstruction(newTask)
    console.log(`📝 Task updated: ${newTask}`)
  }

  const resetAgent = () => {
    const resetState = {
      location: "table_center",
      holding: null
    }
    agentStateRef.current = resetState
    setAgentState(resetState)
    setLastAction(null)
    setLastObservation(null)
    setLastResponse(null)
    console.log("🔄 Agent reset to initial state")
  }

  // === 📊 返回接口 ===
  return {
    // 状态
    agentState,
    isThinking,
    autoLoop,
    lastAction,
    lastObservation,
    lastResponse,
    userInstruction,
    
    // 控制函数
    tick,
    startAutoLoop,
    stopAutoLoop,
    toggleAutoLoop,
    updateTask,
    resetAgent,
    
    // 设置函数
    setUserInstruction,
    
    // 工具函数
    perceiveWorld,
    executeAction
  }
}

/**
 * AgentSystemProvider - 提供AgentSystem上下文
 */
export function AgentSystemProvider({ children, config }) {
  const agentSystem = useAgentSystem(config)
  
  return (
    <AgentSystemContext.Provider value={agentSystem}>
      {children}
    </AgentSystemContext.Provider>
  )
}

// 创建上下文（可选，用于深层组件共享）
import { createContext, useContext } from 'react'
const AgentSystemContext = createContext(null)

export function useAgentSystemContext() {
  const context = useContext(AgentSystemContext)
  if (!context) {
    throw new Error('useAgentSystemContext must be used within AgentSystemProvider')
  }
  return context
}