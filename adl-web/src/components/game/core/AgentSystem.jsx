import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { resolveGoalSpec as defaultResolveGoalSpec } from './GoalParser'
import { normalizeBackendIntent } from './ActionContract'

function buildFallbackWorldSnapshot() {
  return {
    entities: {},
    relations: [],
    timestamp: Date.now() / 1000,
    agent: {
      location: 'table_center',
      holding: null
    }
  }
}

function normalizeWorldSnapshot(rawWorldState) {
  const worldState = rawWorldState || buildFallbackWorldSnapshot()
  const worldAgent = worldState.agent || {}

  return {
    ...worldState,
    entities: worldState.entities || {},
    relations: Array.isArray(worldState.relations) ? worldState.relations : [],
    agent: {
      location: worldAgent.location || 'table_center',
      holding: Object.prototype.hasOwnProperty.call(worldAgent, 'holding') ? worldAgent.holding : null
    }
  }
}

const AgentSystemContext = createContext(null)

export function useAgentSystem({
  onActionExecuted = () => {},
  onTickComplete = () => {},
  getWorldFacts,
  getWorldState,
  executeWorldAction,
  resolveGoalSpec: resolveGoalSpecOverride,
  initialTask = 'pick apple_1',
  backendUrl = 'http://127.0.0.1:8001/api/tick',
  autoExecuteBackendIntent = true
}) {
  const sessionIdRef = useRef(crypto.randomUUID())
  const episodeIdRef = useRef(null)
  const stepCounterRef = useRef(0)

  const [isThinking, setIsThinking] = useState(false)
  const [autoLoop, setAutoLoop] = useState(false)

  const [lastAction, setLastAction] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [lastEffects, setLastEffects] = useState([])
  const [lastError, setLastError] = useState(null)
  const [lastObservation, setLastObservation] = useState(null)
  const [lastResponse, setLastResponse] = useState(null)

  const [userInstruction, setUserInstruction] = useState(initialTask)

  const readWorldSnapshot = useCallback(() => {
    const rawWorldState =
      (typeof getWorldFacts === 'function' && getWorldFacts()) ||
      (typeof getWorldState === 'function' && getWorldState()) ||
      buildFallbackWorldSnapshot()

    return normalizeWorldSnapshot(rawWorldState)
  }, [getWorldFacts, getWorldState])

  const buildCommittedAction = useCallback((action) => {
    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      ...action
    }
  }, [])

  const perceiveWorld = useCallback(() => {
    const worldSnapshot = readWorldSnapshot()
    const worldAgent = worldSnapshot.agent

    stepCounterRef.current += 1

    const goalResolver = resolveGoalSpecOverride || defaultResolveGoalSpec
    const parsedGoalSpec = typeof goalResolver === 'function'
      ? goalResolver(userInstruction, worldAgent, worldSnapshot)
      : null

    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      timestamp: Date.now() / 1000,
      agent: {
        location: worldAgent.location,
        holding: worldAgent.holding
      },
      world_facts: {
        entities: worldSnapshot.entities || {},
        relations: Array.isArray(worldSnapshot.relations) ? worldSnapshot.relations : []
      },
      global_task: userInstruction,
      goal_spec: worldSnapshot.goal_spec || parsedGoalSpec || null,
      last_action: lastAction,
      last_result: lastResult,
      last_effects: lastEffects
    }
  }, [readWorldSnapshot, resolveGoalSpecOverride, userInstruction, lastAction, lastResult, lastEffects])

  const executeAction = useCallback((actionPayload) => {
    const normalizedAction = normalizeBackendIntent(actionPayload)
    const rawType = String(actionPayload?.type || '').toUpperCase()

    if (normalizedAction.type === 'THINK' && rawType !== 'THINK') {
      const executionResult = {
        success: false,
        failure_type: 'INVALID_INTENT',
        failure_reason: normalizedAction.content || 'Invalid intent payload'
      }

      setLastEffects([
        {
          key: 'intent.validate',
          before: 'pending',
          after: 'failed',
          ok: false,
          detail: executionResult.failure_reason
        }
      ])

      return {
        action: normalizedAction,
        agentState: readWorldSnapshot().agent,
        executionResult
      }
    }

    const beforeSnapshot = readWorldSnapshot()
    const beforeAgent = beforeSnapshot.agent
    const effects = []

    const runWorldExecutor = () => {
      if (typeof executeWorldAction !== 'function') {
        return {
          success: false,
          failure_type: 'EXECUTOR_MISSING',
          failure_reason: 'executeWorldAction is not configured'
        }
      }

      const worldResult = executeWorldAction(normalizedAction) || {}
      return {
        success: Boolean(worldResult.success),
        failure_type: worldResult.failure_type || null,
        failure_reason: worldResult.failure_reason || ''
      }
    }

    let executionResult = {
      success: true,
      failure_type: null,
      failure_reason: ''
    }

    if (normalizedAction.type === 'MOVE_TO') {
      executionResult = normalizedAction.target_poi
        ? runWorldExecutor()
        : {
            success: false,
            failure_type: 'INVALID_INTENT',
            failure_reason: 'MOVE_TO missing target_poi'
          }
    } else if (normalizedAction.type === 'INTERACT') {
      executionResult = runWorldExecutor()
      effects.push({
        key: `interact.${String(normalizedAction.interaction_type || 'none').toLowerCase()}`,
        before: normalizedAction.target_item || normalizedAction.target_poi || '',
        after: executionResult.success ? 'success' : 'failed',
        ok: executionResult.success,
        detail: executionResult.failure_reason || ''
      })
    } else if (
      normalizedAction.type !== 'THINK' &&
      normalizedAction.type !== 'SPEAK' &&
      normalizedAction.type !== 'IDLE' &&
      normalizedAction.type !== 'FINISH'
    ) {
      executionResult = {
        success: false,
        failure_type: 'UNKNOWN_ACTION',
        failure_reason: `Unknown action type: ${normalizedAction.type}`
      }
    }

    const afterSnapshot = readWorldSnapshot()
    const afterAgent = afterSnapshot.agent

    if ((beforeAgent.location || '') !== (afterAgent.location || '')) {
      effects.push({
        key: 'agent.location',
        before: beforeAgent.location || '',
        after: afterAgent.location || '',
        ok: true,
        detail: ''
      })
    }

    if ((beforeAgent.holding || null) !== (afterAgent.holding || null)) {
      effects.push({
        key: 'agent.holding',
        before: beforeAgent.holding || null,
        after: afterAgent.holding || null,
        ok: true,
        detail: ''
      })
    }

    setLastEffects(effects)
    onActionExecuted(normalizedAction, afterAgent)

    return {
      action: normalizedAction,
      agentState: afterAgent,
      executionResult
    }
  }, [executeWorldAction, onActionExecuted, readWorldSnapshot])

  const dispatchIntent = useCallback((actionPayload, options = {}) => {
    const applied = executeAction(actionPayload)
    const committedAction = buildCommittedAction(applied.action)
    const committedResult = options.resultOverride || applied.executionResult

    setLastAction(committedAction)
    setLastResult(committedResult)

    return {
      action: committedAction,
      executionResult: committedResult,
      agentState: applied.agentState
    }
  }, [buildCommittedAction, executeAction])

  const commitManualAction = useCallback((actionPayload, resultOverride = null) => {
    return dispatchIntent(actionPayload, { resultOverride })
  }, [dispatchIntent])

  const tick = useCallback(async () => {
    if (isThinking) return
    setIsThinking(true)

    try {
      const observation = perceiveWorld()
      setLastObservation(observation)

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(observation)
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`)
      }

      const data = await response.json()
      setLastError(data.error || null)

      if (typeof data.episode_id === 'number') {
        episodeIdRef.current = data.episode_id
      } else if (typeof data.intent?.episode_id === 'number') {
        episodeIdRef.current = data.intent.episode_id
      }

      const normalizedIntent = normalizeBackendIntent(data.intent)
      const committedIntent = buildCommittedAction(normalizedIntent)

      const isBlocked = data?.reflex_verdict?.verdict === 'BLOCK'
      const adjudicationResult = data.execution_result || {
        success: !isBlocked,
        failure_type: isBlocked ? 'REFLEX_BLOCK' : null,
        failure_reason: data?.reflex_verdict?.message || ''
      }

      const canExecute = !isBlocked && adjudicationResult.success !== false

      if (canExecute) {
        if (autoExecuteBackendIntent) {
          const applied = dispatchIntent(normalizedIntent)
          const responseWithExecution = {
            ...data,
            intent: applied.action,
            adjudication_result: adjudicationResult,
            execution_result: applied.executionResult
          }

          setLastResponse(responseWithExecution)
          onTickComplete(responseWithExecution, observation)
          return
        }

        setLastAction(committedIntent)
        setLastResult(adjudicationResult)
        setLastEffects([])

        const responseWithExecution = {
          ...data,
          intent: committedIntent,
          adjudication_result: adjudicationResult,
          execution_result: adjudicationResult,
          manual_required: true
        }

        setLastResponse(responseWithExecution)
        onTickComplete(responseWithExecution, observation)
        return
      }

      const blockedResult = isBlocked
        ? {
            success: false,
            failure_type: 'REFLEX_BLOCK',
            failure_reason: adjudicationResult.failure_reason || data?.reflex_verdict?.message || ''
          }
        : {
            success: false,
            failure_type: adjudicationResult.failure_type || 'REASONING_ERROR',
            failure_reason: adjudicationResult.failure_reason || 'Adjudication failed before execution.'
          }

      setLastAction(committedIntent)
      setLastResult(blockedResult)
      setLastEffects([
        {
          key: isBlocked ? 'reflex.block' : 'adjudication.fail',
          before: 'pending',
          after: 'failed',
          ok: false,
          detail: blockedResult.failure_reason || ''
        }
      ])

      const responseWithExecution = {
        ...data,
        intent: committedIntent,
        adjudication_result: adjudicationResult,
        execution_result: blockedResult
      }

      setLastResponse(responseWithExecution)
      onTickComplete(responseWithExecution, observation)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      setLastAction({
        session_id: sessionIdRef.current,
        episode_id: episodeIdRef.current,
        step_id: stepCounterRef.current,
        type: 'THINK',
        content: `Error: ${message}`
      })

      setLastResult({
        success: false,
        failure_type: 'REASONING_ERROR',
        failure_reason: message
      })

      setLastEffects([
        {
          key: 'tick.error',
          before: 'request',
          after: 'failed',
          ok: false,
          detail: message
        }
      ])

      setLastError({
        error_code: 'E_REASONING_RUNTIME',
        module: 'frontend_bridge',
        severity: 'ERROR',
        description: 'Tick request failed before receiving backend response.',
        detail: message,
        extra: {}
      })
    } finally {
      setIsThinking(false)
    }
  }, [
    isThinking,
    perceiveWorld,
    backendUrl,
    buildCommittedAction,
    dispatchIntent,
    onTickComplete,
    autoExecuteBackendIntent
  ])

  useEffect(() => {
    if (!autoLoop) return

    const timer = setInterval(() => {
      tick()
    }, 3000)

    return () => clearInterval(timer)
  }, [autoLoop, tick])

  const startAutoLoop = useCallback(() => setAutoLoop(true), [])
  const stopAutoLoop = useCallback(() => setAutoLoop(false), [])
  const toggleAutoLoop = useCallback(() => setAutoLoop((prev) => !prev), [])

  const updateTask = useCallback((newTask) => {
    setUserInstruction(newTask)
  }, [])

  const resetAgent = useCallback(() => {
    setLastAction(null)
    setLastResult(null)
    setLastEffects([])
    setLastError(null)
    setLastObservation(null)
    setLastResponse(null)

    episodeIdRef.current = null
    stepCounterRef.current = 0
  }, [])

  const currentAgentState = readWorldSnapshot().agent

  return {
    agentState: currentAgentState,
    isThinking,
    autoLoop,

    lastAction,
    lastResult,
    lastEffects,
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
    commitManualAction,
    dispatchIntent
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

export function useAgentSystemContext() {
  const context = useContext(AgentSystemContext)
  if (!context) {
    throw new Error('useAgentSystemContext must be used within AgentSystemProvider')
  }
  return context
}


