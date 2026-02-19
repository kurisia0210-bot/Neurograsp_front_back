import React, { useState, useRef, useEffect, useCallback } from 'react'

/**
 * AgentSystem - reusable core loop
 */
export function useAgentSystem({
  onActionExecuted = () => {},
  onTickComplete = () => {},
  getWorldState,
  executeWorldAction,
  initialTask = 'Put red cube in fridge',
  backendUrl = 'http://127.0.0.1:8001/api/tick'
}) {
  const [agentState, setAgentState] = useState({
    location: 'table_center',
    holding: null
  })

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

  const agentStateRef = useRef(agentState)

  useEffect(() => {
    agentStateRef.current = agentState
  }, [agentState])

  const perceiveWorld = useCallback((customState = null) => {
    const state = customState || agentStateRef.current

    // P0-1 increment step per request
    stepCounterRef.current += 1

    const worldState = getWorldState
      ? getWorldState(state)
      : {
          nearby_objects: [],
          timestamp: Date.now() / 1000
        }

    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      timestamp: Date.now() / 1000,
      agent: {
        location: state.location,
        holding: state.holding
      },
      nearby_objects: worldState.nearby_objects || [],
      global_task: userInstruction,
      // P0-2 feed previous action/result back to backend
      last_action: lastAction,
      last_result: lastResult
    }
  }, [getWorldState, userInstruction, lastAction, lastResult])

  const executeAction = useCallback((actionPayload) => {
    console.log('[AgentSystem] Executing:', actionPayload)

    const newAgentState = { ...agentStateRef.current }

    switch (actionPayload.type) {
      case 'MOVE_TO':
        if (actionPayload.target_poi) {
          newAgentState.location = actionPayload.target_poi
        }
        break

      case 'INTERACT': {
        const interactionType = actionPayload.interaction_type || 'NONE'
        const targetItem = actionPayload.target_item

        if (executeWorldAction) {
          executeWorldAction(actionPayload, newAgentState)
        }

        if (interactionType === 'PICK' && targetItem) {
          newAgentState.holding = targetItem
        } else if (interactionType === 'PLACE') {
          newAgentState.holding = null
        }
        break
      }

      case 'THINK':
      case 'SPEAK':
      case 'IDLE':
      case 'FINISH':
        break

      default:
        console.warn('Unknown action type:', actionPayload.type)
    }

    agentStateRef.current = newAgentState
    setAgentState(newAgentState)
    onActionExecuted(actionPayload, newAgentState)

    return newAgentState
  }, [executeWorldAction, onActionExecuted])

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
        executeAction(data.intent)
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
    const resetState = {
      location: 'table_center',
      holding: null
    }

    agentStateRef.current = resetState
    setAgentState(resetState)
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

  return {
    agentState,
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
    executeAction
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
