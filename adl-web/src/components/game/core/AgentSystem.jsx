import { useState, useRef, useEffect, useCallback } from 'react'

import { resolveGoalSpec as defaultResolveGoalSpec } from './GoalParser'
import { normalizeBackendIntent } from './ActionContract'
import { isObjectActionAllowed } from './registry'

function buildFallbackWorldSnapshot() {
  return {
    nearby_objects: [],
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
    nearby_objects: worldState.nearby_objects || [],
    agent: {
      location: worldAgent.location || 'table_center',
      holding: Object.prototype.hasOwnProperty.call(worldAgent, 'holding') ? worldAgent.holding : null
    }
  }
}

function normalizeExecutionResult(worldResult) {
  return {
    success: Boolean(worldResult?.success),
    failure_type: worldResult?.failure_type || null,
    failure_reason: worldResult?.failure_reason || ''
  }
}

function resolveInteractionActionKey(normalizedAction) {
  if (normalizedAction?.type !== 'INTERACT') return null
  return String(normalizedAction.interaction_type || 'NONE').toUpperCase()
}

/**
 * AgentSystem - orchestration loop only.
 * World business state is owned by caller-provided runtime.
 */
export function useAgentSystem({
  onActionExecuted = () => {},
  onTickComplete = () => {},
  getWorldFacts,
  getWorldState,
  executeWorldAction,
  resolveGoalSpec: resolveGoalSpecOverride,
  initialTask = 'Put red cube in fridge',
  backendUrl = 'http://127.0.0.1:8001/api/tick'
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
    const rawWorldState = getWorldFacts
      ? getWorldFacts()
      : getWorldState
        ? getWorldState()
        : buildFallbackWorldSnapshot()
    return normalizeWorldSnapshot(rawWorldState)
  }, [getWorldFacts, getWorldState])

  const buildCommittedAction = useCallback((action, stepId = stepCounterRef.current) => {
    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepId,
      ...action
    }
  }, [])

  const perceiveWorld = useCallback(() => {
    const worldState = readWorldSnapshot()
    const worldAgent = worldState.agent

    stepCounterRef.current += 1

    const goalResolver = resolveGoalSpecOverride || defaultResolveGoalSpec
    const parsedGoalSpec = typeof goalResolver === 'function'
      ? goalResolver(userInstruction, worldAgent, worldState)
      : null
    const goalSpec = worldState.goal_spec || parsedGoalSpec || null

    return {
      session_id: sessionIdRef.current,
      episode_id: episodeIdRef.current,
      step_id: stepCounterRef.current,
      timestamp: Date.now() / 1000,
      agent: {
        location: worldAgent.location,
        holding: worldAgent.holding
      },
      nearby_objects: worldState.nearby_objects || [],
      global_task: userInstruction,
      goal_spec: goalSpec,
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
          key: 'registry.validate',
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

    const resolvedActionKey = resolveInteractionActionKey(normalizedAction)
    const beforeSnapshot = readWorldSnapshot()
    const beforeAgent = beforeSnapshot.agent
    const effects = []
    let executionResult = {
      success: true,
      failure_type: null,
      failure_reason: ''
    }
    let afterAgent = beforeAgent

    const runWorldExecution = () => {
      if (typeof executeWorldAction !== 'function') {
        return {
          result: {
            success: false,
            failure_type: 'EXECUTOR_MISSING',
            failure_reason: 'executeWorldAction is not configured'
          },
          nextAgent: beforeAgent
        }
      }

      const worldResult = executeWorldAction(normalizedAction) || {}
      const normalizedResult = normalizeExecutionResult(worldResult)
      const nextAgent = worldResult?.next_agent_state
        ? normalizeWorldSnapshot({ agent: worldResult.next_agent_state }).agent
        : readWorldSnapshot().agent

      return {
        result: normalizedResult,
        nextAgent
      }
    }

    switch (normalizedAction.type) {
      case 'MOVE_TO': {
        if (!normalizedAction.target_poi) {
          executionResult = {
            success: false,
            failure_type: null,
            failure_reason: 'MOVE_TO missing target_poi'
          }
          break
        }
        if (!isObjectActionAllowed(normalizedAction.target_poi, 'MOVE_TO')) {
          executionResult = {
            success: false,
            failure_type: 'ACTION_NOT_ALLOWED',
            failure_reason: `MOVE_TO is not allowed for target: ${normalizedAction.target_poi}`
          }
          break
        }
        const worldExecution = runWorldExecution()
        executionResult = worldExecution.result
        afterAgent = worldExecution.nextAgent
        break
      }

      case 'INTERACT': {
        if (resolvedActionKey !== 'NONE') {
          if (!normalizedAction.target_item) {
            executionResult = {
              success: false,
              failure_type: 'INVALID_INTENT',
              failure_reason: `INTERACT(${resolvedActionKey}) missing target_item`
            }
            break
          }
          if (!isObjectActionAllowed(normalizedAction.target_item, resolvedActionKey)) {
            executionResult = {
              success: false,
              failure_type: 'ACTION_NOT_ALLOWED',
              failure_reason: `${resolvedActionKey} is not allowed for target: ${normalizedAction.target_item}`
            }
            break
          }
        }

        const worldExecution = runWorldExecution()
        executionResult = worldExecution.result
        afterAgent = worldExecution.nextAgent
        effects.push({
          key: `interact.${String(resolvedActionKey || normalizedAction.interaction_type || 'none').toLowerCase()}`,
          before: normalizedAction.target_item || normalizedAction.target_poi || '',
          after: executionResult.success ? 'success' : 'failed',
          ok: executionResult.success,
          detail: executionResult.failure_reason || ''
        })
        break
      }

      case 'THINK':
      case 'SPEAK':
      case 'IDLE':
      case 'FINISH':
        break

      default:
        executionResult = {
          success: false,
          failure_type: null,
          failure_reason: `Unknown action type: ${normalizedAction.type}`
        }
    }

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
    const {
      resultOverride = null,
      allocateStepId = true
    } = options

    if (allocateStepId) {
      stepCounterRef.current += 1
    }

    const applied = executeAction(actionPayload)
    const committedAction = buildCommittedAction(applied.action)
    const committedResult = resultOverride || applied.executionResult
    setLastAction(committedAction)
    setLastResult(committedResult)
    return {
      action: committedAction,
      executionResult: committedResult,
      agentState: applied.agentState
    }
  }, [executeAction, buildCommittedAction])

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
      setLastError(data.error || null)

      if (typeof data.episode_id === 'number') {
        episodeIdRef.current = data.episode_id
      } else if (typeof data.intent?.episode_id === 'number') {
        episodeIdRef.current = data.intent.episode_id
      }

      const normalizedIntent = normalizeBackendIntent(data.intent)
      const committedIntent = buildCommittedAction(normalizedIntent)

      const reflex = data.reflex_verdict
      const isBlocked = reflex && reflex.verdict === 'BLOCK'
      const adjudicationResult =
        data.execution_result || {
          success: !isBlocked,
          failure_type: isBlocked ? 'REFLEX_BLOCK' : null,
          failure_reason: reflex?.message || ''
        }
      const canExecute = !isBlocked && Boolean(adjudicationResult.success)

      if (canExecute) {
        const applied = dispatchIntent(normalizedIntent, { allocateStepId: false })
        const responseWithExecution = {
          ...data,
          intent: applied.action,
          adjudication_result: adjudicationResult,
          execution_result: applied.executionResult
        }
        setLastResponse(responseWithExecution)
        onTickComplete(responseWithExecution, obs)
      } else if (isBlocked) {
        const blockedExecutionResult = {
          success: false,
          failure_type: 'REFLEX_BLOCK',
          failure_reason: adjudicationResult.failure_reason || reflex?.message || ''
        }
        setLastAction(committedIntent)
        setLastResult(blockedExecutionResult)
        setLastEffects([
          {
            key: 'reflex.block',
            before: 'pending',
            after: 'blocked',
            ok: false,
            detail: blockedExecutionResult.failure_reason || ''
          }
        ])
        const responseWithExecution = {
          ...data,
          intent: committedIntent,
          adjudication_result: adjudicationResult,
          execution_result: blockedExecutionResult
        }
        setLastResponse(responseWithExecution)
        onTickComplete(responseWithExecution, obs)
      } else {
        const adjudicationFailedExecutionResult = {
          success: false,
          failure_type: adjudicationResult.failure_type || 'REASONING_ERROR',
          failure_reason: adjudicationResult.failure_reason || 'Adjudication failed before execution.'
        }
        setLastAction(committedIntent)
        setLastResult(adjudicationFailedExecutionResult)
        setLastEffects([
          {
            key: 'adjudication.fail',
            before: 'allowed',
            after: 'not_executed',
            ok: false,
            detail: adjudicationFailedExecutionResult.failure_reason
          }
        ])
        const responseWithExecution = {
          ...data,
          intent: committedIntent,
          adjudication_result: adjudicationResult,
          execution_result: adjudicationFailedExecutionResult
        }
        setLastResponse(responseWithExecution)
        onTickComplete(responseWithExecution, obs)
      }
    } catch (e) {
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
      setLastEffects([
        {
          key: 'tick.error',
          before: 'request',
          after: 'failed',
          ok: false,
          detail: e.message
        }
      ])
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
  }, [isThinking, perceiveWorld, backendUrl, dispatchIntent, buildCommittedAction, onTickComplete])

  useEffect(() => {
    if (!autoLoop) return

    const interval = setInterval(() => {
      tick()
    }, 3000)

    return () => clearInterval(interval)
  }, [autoLoop, tick])

  const toggleAutoLoop = () => setAutoLoop((prev) => !prev)

  const resetAgent = () => {
    setLastAction(null)
    setLastResult(null)
    setLastEffects([])
    setLastError(null)
    setLastObservation(null)
    setLastResponse(null)
    setAutoLoop(false)

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
    lastEffects,
    lastError,
    lastObservation,
    lastResponse,
    userInstruction,
    sessionId: sessionIdRef.current,
    episodeId: episodeIdRef.current,
    stepId: stepCounterRef.current,

    tick,
    toggleAutoLoop,
    resetAgent,
    setUserInstruction,
    dispatchIntent
  }
}
