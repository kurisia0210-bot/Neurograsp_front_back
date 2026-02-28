import React, { useState, useRef, useEffect, useCallback } from 'react'

// 导入目标解析器
import { resolveGoalSpec as defaultResolveGoalSpec } from '../mechanics/GoalParser'

const DEFAULT_AGENT_STATE = {
  location: 'table_center',
  holding: null
}

/**
 * AgentSystem - reusable core loop
 */
export function useAgentSystem({
  onActionExecuted = () => {},
  onTickComplete = () => {},
  getWorldState,
  executeWorldAction,
  validateAction,
  resolveGoalSpec: resolveGoalSpecOverride,
  initialTask = 'Put red cube in fridge',
  backendUrl = 'http://127.0.0.1:8001/api/tick'
}) {
  // P0-1 session/step tracking
  const sessionIdRef = useRef(crypto.randomUUID())
  const episodeIdRef = useRef(null)
  const stepCounterRef = useRef(0)

  const [isThinking, setIsThinking] = useState(false)
  const [autoLoop, setAutoLoop] = useState(false)
  const [lastAction, setLastAction] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [lastObservation, setLastObservation] = useState(null)
  const [lastResponse, setLastResponse] = useState(null)
  const [userInstruction, setUserInstruction] = useState(initialTask)

  const normalizeAgentState = useCallback((rawState) => {
    const safe = rawState || {}
    return {
      location: safe.location || DEFAULT_AGENT_STATE.location,
      holding: Object.prototype.hasOwnProperty.call(safe, 'holding')
        ? safe.holding
        : DEFAULT_AGENT_STATE.holding
    }
  }, [])

  const readWorldSnapshot = useCallback((fallbackAgentState = null) => {
    const fallbackAgent = normalizeAgentState(fallbackAgentState || lastObservation?.agent || DEFAULT_AGENT_STATE)
    if (typeof getWorldState !== 'function') {
      return {
        worldState: {
          agent: fallbackAgent,
          nearby_objects: []
        },
        agent: fallbackAgent
      }
    }

    try {
      const worldState = getWorldState(fallbackAgent) || {}
      const worldAgent = normalizeAgentState(worldState?.agent || fallbackAgent)
      return {
        worldState,
        agent: worldAgent
      }
    } catch (error) {
      console.error('[AgentSystem] getWorldState failed:', error)
      return {
        worldState: {
          agent: fallbackAgent,
          nearby_objects: []
        },
        agent: fallbackAgent
      }
    }
  }, [getWorldState, lastObservation, normalizeAgentState])

  const runRegistryValidation = useCallback((actionPayload) => {
    if (typeof validateAction !== 'function') {
      return {
        verdict: 'ALLOW',
        reason: 'Registry validation skipped',
        effects: [],
        handled: true,
        status: 'SUCCESS',
        message: 'Registry validation skipped'
      }
    }
    try {
      const snapshot = readWorldSnapshot()
      const result = validateAction(actionPayload, {
        ...snapshot.worldState,
        last_action: lastAction,
        last_result: lastResult
      })
      if (result && typeof result === 'object') {
        return result
      }
      return {
        verdict: 'BLOCK',
        reason: 'Registry returned invalid validation result',
        effects: [],
        handled: false,
        status: 'INVALID_REGISTRY_RESULT',
        message: 'Registry returned invalid validation result'
      }
    } catch (e) {
      return {
        verdict: 'BLOCK',
        reason: e?.message || 'Registry validation crashed',
        effects: [],
        handled: false,
        status: 'REGISTRY_RUNTIME_ERROR',
        message: e?.message || 'Registry validation crashed'
      }
    }
  }, [validateAction, readWorldSnapshot, lastAction, lastResult])

  const buildTaskFacts = useCallback((worldState, effectiveLocation, effectiveHolding) => {
    const nearby = worldState?.nearby_objects || []
    const objects = {}
    const inside = {}
    const on = {}

    nearby.forEach((obj) => {
      if (!obj?.id) return
      const relationText = String(obj.relation || '')
      objects[obj.id] = {
        state: obj.state || null,
        relation: relationText || null
      }

      const insideMatch = relationText.match(/inside\s+([a-zA-Z0-9_]+)/i)
      if (insideMatch?.[1]) {
        inside[obj.id] = insideMatch[1]
      }
      const onMatch = relationText.match(/on\s+([a-zA-Z0-9_]+)/i)
      if (onMatch?.[1]) {
        on[obj.id] = onMatch[1]
      }
    })

    return {
      agent: {
        location: effectiveLocation || null,
        holding: effectiveHolding || null
      },
      objects,
      relations: {
        inside,
        on
      }
    }
  }, [])

  const perceiveWorld = useCallback((customState = null) => {
    // P0-1 increment step per request
    stepCounterRef.current += 1

    const fallbackAgentState = normalizeAgentState(customState || DEFAULT_AGENT_STATE)
    const { worldState, agent: effectiveAgentState } = readWorldSnapshot(fallbackAgentState)
    const effectiveLocation = effectiveAgentState.location
    const effectiveHolding = effectiveAgentState.holding

    // 使用传入的resolveGoalSpec函数，如果没有则使用默认的
    const goalResolver = resolveGoalSpecOverride || defaultResolveGoalSpec
    const parsedGoalSpec = typeof goalResolver === 'function'
      ? goalResolver(userInstruction, effectiveAgentState, worldState)
      : null

    const goalSpec = worldState?.goal_spec || parsedGoalSpec || null
    const taskFacts = worldState?.task_facts || buildTaskFacts(worldState, effectiveLocation, effectiveHolding)

    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      timestamp: Date.now() / 1000,
      agent: {
        location: effectiveAgentState.location,
        holding: effectiveAgentState.holding
      },
      nearby_objects: worldState.nearby_objects || [],
      global_task: userInstruction,
      goal_spec: goalSpec,
      task_facts: taskFacts,
      // P0-2 feed previous action/result back to backend
      last_action: lastAction,
      last_result: lastResult
    }
  }, [normalizeAgentState, readWorldSnapshot, resolveGoalSpecOverride, userInstruction, lastAction, lastResult, buildTaskFacts])

  const executeAction = useCallback((actionPayload, options = {}) => {
    console.log('[AgentSystem] Executing:', actionPayload)
    const skipRegistry = !!options.skipRegistry
    const registryResult = skipRegistry
      ? {
          verdict: 'ALLOW',
          reason: 'Registry validation skipped by option',
          effects: [],
          handled: true,
          status: 'SUCCESS',
          message: 'Registry validation skipped by option'
        }
      : runRegistryValidation(actionPayload)
    const isAllowedByRegistry = registryResult?.verdict
      ? registryResult.verdict === 'ALLOW'
      : !!(registryResult?.handled && registryResult?.status === 'SUCCESS')

    if (!isAllowedByRegistry) {
      const blockedResult = {
        success: false,
        failure_type: 'REFLEX_BLOCK',
        failure_reason: registryResult?.reason || registryResult?.message || 'Blocked by registry'
      }
      const blockedAgentState = readWorldSnapshot().agent
      onActionExecuted(actionPayload, blockedAgentState, blockedResult, registryResult)
      return {
        agentState: blockedAgentState,
        executionResult: blockedResult,
        registryResult
      }
    }

    let worldExecutionResult = { success: true }
    const shouldExecuteWorldAction = executeWorldAction && (
      actionPayload?.type === 'INTERACT' || actionPayload?.type === 'MOVE_TO'
    )

    if (shouldExecuteWorldAction) {
      worldExecutionResult = executeWorldAction(actionPayload) || { success: true }
    }

    const observedAgentState = worldExecutionResult?.next_agent_state
      ? normalizeAgentState(worldExecutionResult.next_agent_state)
      : readWorldSnapshot().agent
    onActionExecuted(actionPayload, observedAgentState, worldExecutionResult, registryResult)

    return {
      agentState: observedAgentState,
      executionResult: worldExecutionResult,
      registryResult
    }
  }, [executeWorldAction, onActionExecuted, runRegistryValidation, normalizeAgentState, readWorldSnapshot])

  const recordManualExecution = useCallback((actionPayload, executionResult = null) => {
    if (!actionPayload || typeof actionPayload !== 'object') return

    const normalizedAction = {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      interaction_type: 'NONE',
      ...actionPayload
    }

    const normalizedResult = executionResult || {
      success: true,
      failure_type: null,
      failure_reason: ''
    }

    setLastAction(normalizedAction)
    setLastResult(normalizedResult)
  }, [])

  const tick = useCallback(async () => {
    if (isThinking) return
    setIsThinking(true)

    try {
      const obs = perceiveWorld()
      setLastObservation(obs)

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      })

      if (!response.ok) throw new Error(`Backend error: ${response.status}`)

      const data = await response.json()
      setLastResponse(data)
      setLastError(data.error || null)
      if (typeof data.episode_id === 'number') {
        episodeIdRef.current = data.episode_id
      } else if (typeof data.intent?.episode_id === 'number') {
        episodeIdRef.current = data.intent.episode_id
      }
      setLastAction(data.intent)

      const reflex = data.reflex_verdict
      const isBlocked = reflex && reflex.verdict === 'BLOCK'
      setLastResult(
        data.execution_result || {
          success: !isBlocked,
          failure_type: isBlocked ? 'REFLEX_BLOCK' : null,
          failure_reason: reflex?.message || ''
        }
      )

      if (!isBlocked) {
        const executionSummary = executeAction(data.intent)
        if (executionSummary?.executionResult) {
          setLastResult(executionSummary.executionResult)
        }
      }

      onTickComplete(data, obs)
    } catch (e) {
      console.error('Tick error:', e)
      setLastAction({
        session_id: sessionIdRef.current,
        episode_id: episodeIdRef.current,
        step_id: stepCounterRef.current,
        type: 'THINK',
        content: `Error: ${e.message}`
      })
      setLastResult({
        success: false,
        failure_type: 'REASONING_ERROR',
        failure_reason: e.message
      })
      setLastError({
        error_code: 'E_REASONING_RUNTIME',
        module: 'frontend_bridge',
        severity: 'ERROR',
        description: 'Tick request failed before receiving backend response.',
        detail: e.message,
        extra: {}
      })
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, perceiveWorld, backendUrl, executeAction, onTickComplete])

  useEffect(() => {
    if (!autoLoop) return

    const interval = setInterval(() => {
      tick()
    }, 3000)

    return () => clearInterval(interval)
  }, [autoLoop, tick])

  const startAutoLoop = () => setAutoLoop(true)
  const stopAutoLoop = () => setAutoLoop(false)
  const toggleAutoLoop = () => setAutoLoop((prev) => !prev)

  const updateTask = (newTask) => {
    setUserInstruction(newTask)
  }

  const resetAgent = () => {
    setLastAction(null)
    setLastResult(null)
    setLastError(null)
    setLastObservation(null)
    setLastResponse(null)

    // P0-1/P0-3: same session, start a new episode locally.
    // NOTE(super-ahead, skipped): no explicit backend RESET action/event yet.
    episodeIdRef.current = null
    stepCounterRef.current = 0
  }

  const currentAgentState = readWorldSnapshot().agent

  return {
    agentState: currentAgentState,
    isThinking,
    autoLoop,
    lastAction,
    lastResult,
    lastError,
    lastObservation,
    lastResponse,
    userInstruction,
    sessionId: sessionIdRef.current,
    episodeId: episodeIdRef.current,
    stepId: stepCounterRef.current,

    tick,
    startAutoLoop,
    stopAutoLoop,
    toggleAutoLoop,
    updateTask,
    resetAgent,

    setUserInstruction,

    perceiveWorld,
    executeAction,
    recordManualExecution
  }
}

export function AgentSystemProvider({ children, config }) {
  const agentSystem = useAgentSystem(config)

  return (
    <AgentSystemContext.Provider value={agentSystem}>
      {children}
    </AgentSystemContext.Provider>
  )
}

import { createContext, useContext } from 'react'
const AgentSystemContext = createContext(null)

export function useAgentSystemContext() {
  const context = useContext(AgentSystemContext)
  if (!context) {
    throw new Error('useAgentSystemContext must be used within AgentSystemProvider')
  }
  return context
}
