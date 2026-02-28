import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrthographicCamera } from '@react-three/drei'

import { useAgentSystem } from '../components/game/agent/AgentSystem'
import { DoctorAvatar } from '../components/game/avatar/DoctorAvatar'
import { NotificationBubble } from '../components/game/items/NotificationBubble'
import { WholeCube } from '../components/game/mechanics/GameCube'
import {
  ActionTriggerBubble,
  executeRegisteredAction
} from '../components/game/mechanics/ActionRegistry'
import {
  AgentBrainDashboard,
  AgentStatusDisplay
} from '../components/game/mechanics/AgentBrainDashboard'
import { HoldBox } from '../components/game/mechanics/HoldBox'
import { AgentControls, BackButton } from '../components/game/mechanics/AgentControls'
import { useWorldStateManager } from '../components/game/mechanics/WorldStateManager'

const TABLE_HEIGHT = 0.85
const DEFAULT_AGENT_POSITION = [1.5, 0, 2]
const FRIDGE_MAIN_DROP_CENTER = [-2.35, -0.5] // [x, z]
const FRIDGE_MAIN_DROP_HALF_SIZE = [0.55, 0.45] // smaller snap zone [halfX, halfZ]

function isInFridgeMainDropZone(position) {
  if (!Array.isArray(position)) return false
  const [x, , z] = position
  return (
    Math.abs(x - FRIDGE_MAIN_DROP_CENTER[0]) <= FRIDGE_MAIN_DROP_HALF_SIZE[0] &&
    Math.abs(z - FRIDGE_MAIN_DROP_CENTER[1]) <= FRIDGE_MAIN_DROP_HALF_SIZE[1]
  )
}

function getVisualTargetPosition(location) {
  if (location === 'fridge_zone') return [-2, 0, 1]
  if (location === 'stove_zone') return [2, 0, 1]
  return DEFAULT_AGENT_POSITION
}

function toHistoryEntry(response) {
  const intent = response?.intent || {}
  return {
    key: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    step_id: response?.step_id ?? intent?.step_id ?? null,
    type: intent.type ?? null,
    target_poi: intent.target_poi ?? null,
    target_item: intent.target_item ?? null,
    interaction_type: intent.interaction_type ?? 'NONE',
    target_length: intent.target_length ?? null,
    content: intent.content ?? '',
    error: response?.error || null
  }
}

function getBehaviorText(intent) {
  if (!intent?.type) return 'Action: waiting for next step'

  const type = String(intent.type).toUpperCase()
  if (type === 'MOVE_TO') {
    return `Action: move to ${intent.target_poi || 'target'}`
  }
  if (type === 'INTERACT') {
    const interaction = String(intent.interaction_type || 'NONE').toLowerCase()
    const target = intent.target_item || intent.target_poi || 'target'
    return `Action: ${interaction} ${target}`
  }
  if (type === 'FINISH') {
    return `Action: finish (${intent.content || 'task completed'})`
  }
  if (type === 'SPEAK') {
    return `Action: speak${intent.content ? ` - ${intent.content}` : ''}`
  }
  if (type === 'THINK') {
    return 'Action: think'
  }
  return `Action: ${type.toLowerCase()}`
}

export function AgentPlayground({ onBack }) {
  const autoSnapLockRef = useRef(false)
  const worldStateManager = useWorldStateManager({
    initialFridgeOpen: false,
    initialCubes: [
      {
        id: 'red_cube',
        name: 'Red Cube',
        color: '#ff6b6b',
        position: [-0.4, 1.7 + 0.125, -0.5],
        state: 'on_table',
        dragHeight: 1.7 + 0.125
      }
    ]
  })

  const [behaviorLine, setBehaviorLine] = useState('Action: waiting for next step')
  const [showArrowAnimation, setShowArrowAnimation] = useState(false)
  const [intentHistory, setIntentHistory] = useState([])
  const [actionBubble, setActionBubble] = useState({
    visible: false,
    status: 'NO_INTENT',
    message: ''
  })
  const [agentVisualPosition, setAgentVisualPosition] = useState(DEFAULT_AGENT_POSITION)
  const [dragPreviewByCube, setDragPreviewByCube] = useState({})
  const getWorldFacts = worldStateManager.getWorldFacts

  const triggerArrowAnimation = () => {
    setShowArrowAnimation(true)
    setTimeout(() => setShowArrowAnimation(false), 1500)
  }

  const validateIntentWithRegistry = useCallback((intent) => {
    const worldFacts = getWorldFacts()
    const fridgeDoor = worldFacts?.nearby_objects?.find((obj) => obj.id === 'fridge_door')
    return executeRegisteredAction(intent, {
      holdingItem: worldFacts?.agent?.holding || null,
      fridgeOpen: fridgeDoor?.state === 'open'
    })
  }, [getWorldFacts])

  const agentSystem = useAgentSystem({
    initialTask: 'Put red cube in fridge',
    validateAction: validateIntentWithRegistry,
    onTickComplete: (response) => {
      if (!response?.intent) return

      setIntentHistory((prev) => [...prev, toHistoryEntry(response)].slice(-30))

      const intent = response.intent
      setBehaviorLine(getBehaviorText(intent))
      if (response?.reflex_verdict?.verdict === 'BLOCK') {
        setActionBubble({
          visible: true,
          status: 'REFLEX_BLOCK',
          message: response?.reflex_verdict?.message || 'Blocked by backend reflex'
        })
      }
    },
    onActionExecuted: (action, newState, executionResult, registryResult) => {
      console.log('[AgentPlayground] Action executed:', action?.type, newState, executionResult, registryResult)

      setBehaviorLine(getBehaviorText(action))

      const registryAllowed = !!(registryResult?.handled && registryResult?.status === 'SUCCESS')
      const didExecute = executionResult?.success !== false
      if ((action?.type === 'MOVE_TO' || action?.type === 'INTERACT') && registryAllowed && didExecute) {
        triggerArrowAnimation()
      }

      let bubbleStatus = 'SUCCESS'
      let bubbleMessage = registryResult?.message || 'Action applied'
      if (!registryAllowed) {
        bubbleStatus = registryResult?.status || 'BLOCKED_BY_REGISTRY'
        bubbleMessage = registryResult?.message || 'Action blocked by registry'
      } else if (executionResult?.success === false) {
        bubbleStatus = 'EXECUTION_FAILED'
        bubbleMessage = executionResult?.failure_reason || 'Action execution failed'
      }
      setActionBubble({
        visible: true,
        status: bubbleStatus,
        message: bubbleMessage
      })
    },
    getWorldState: worldStateManager.getWorldState,
    executeWorldAction: worldStateManager.executeWorldAction
  })
  const taskLine = `Task: ${agentSystem.userInstruction?.trim() || 'No task set'}`

  const runManualIntent = useCallback((intent) => {
    const summary = agentSystem.executeAction(intent)
    const executionResult = summary?.executionResult || {
      success: false,
      failure_type: 'REASONING_ERROR',
      failure_reason: 'Intent pipeline did not return execution result'
    }
    agentSystem.recordManualExecution(intent, executionResult)
    return summary
  }, [agentSystem.executeAction, agentSystem.recordManualExecution])

  useEffect(() => {
    if (!actionBubble.visible) return
    const timer = setTimeout(() => {
      setActionBubble((prev) => ({ ...prev, visible: false }))
    }, 1400)
    return () => clearTimeout(timer)
  }, [actionBubble.visible])

  useEffect(() => {
    const target = getVisualTargetPosition(agentSystem.agentState.location)
    const timer = setInterval(() => {
      setAgentVisualPosition((prev) => {
        const next = prev.map((v, idx) => v + (target[idx] - v) * 0.18)
        const dist = Math.hypot(
          target[0] - next[0],
          target[1] - next[1],
          target[2] - next[2]
        )

        if (dist < 0.02) {
          clearInterval(timer)
          return target
        }
        return next
      })
    }, 16)

    return () => clearInterval(timer)
  }, [agentSystem.agentState.location])

  const resetActionBubble = () => {
    setActionBubble({
      visible: false,
      status: 'NO_INTENT',
      message: ''
    })
  }

  const handleResetAgent = () => {
    autoSnapLockRef.current = false
    agentSystem.resetAgent()
    worldStateManager.resetWorldState()
    setDragPreviewByCube({})
    setIntentHistory([])
    setBehaviorLine('Action: waiting for next step')
    setAgentVisualPosition(getVisualTargetPosition('table_center'))
    resetActionBubble()
  }

  const moveAgentTo = (targetPoi, label) => {
    const intent = {
      type: 'MOVE_TO',
      target_poi: targetPoi,
      content: `Manual move to ${targetPoi}`
    }

    runManualIntent(intent)
    setBehaviorLine(`Action: move to ${targetPoi} (${label})`)
  }

  const getDoctorAvatarStatus = () => {
    if (agentSystem.isThinking) return 'thinking'
    if (agentSystem.agentState.holding) return 'active'
    return 'idle'
  }

  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      {onBack && <BackButton onBack={onBack} />}

      <AgentBrainDashboard
        observation={agentSystem.lastObservation}
        action={agentSystem.lastAction}
        isThinking={agentSystem.isThinking}
      />

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <NotificationBubble
          text={taskLine}
          subText={behaviorLine}
          style={{ transform: 'translateY(-20px)' }}
          showArrowAnimation={showArrowAnimation}
        />
      </div>

      <ActionTriggerBubble bubble={actionBubble} />

      <AgentControls
        onTick={agentSystem.tick}
        onToggleAutoLoop={agentSystem.toggleAutoLoop}
        onReset={handleResetAgent}
        onTestArrow={triggerArrowAnimation}
        isThinking={agentSystem.isThinking}
        autoLoop={agentSystem.autoLoop}
        userInstruction={agentSystem.userInstruction}
        setUserInstruction={agentSystem.setUserInstruction}
      />

      <div className="absolute top-[52%] left-[18%] z-50">
        <button
          onClick={() => moveAgentTo('fridge_zone', 'fridge')}
          disabled={agentSystem.isThinking}
          className="px-3 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Go to Fridge
        </button>
      </div>

      <div className="absolute top-[63%] left-[52%] z-50">
        <button
          onClick={() => moveAgentTo('table_center', 'table')}
          disabled={agentSystem.isThinking}
          className="px-3 py-1.5 bg-slate-700/90 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Go to Table
        </button>
      </div>

      <Canvas>
        <OrthographicCamera
          makeDefault
          position={[20, 20, 20]}
          zoom={45}
          onUpdate={(c) => c.lookAt(0, 0.5, 0)}
        />
        <ambientLight intensity={0.7} />
        <directionalLight position={[-5, 10, 5]} intensity={1.2} />

        <mesh position={[0, TABLE_HEIGHT / 2, 0]}>
          <boxGeometry args={[4, TABLE_HEIGHT, 2]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>

        <group position={agentVisualPosition}>
          <mesh position={[0, 1, 0]}>
            <capsuleGeometry args={[0.3, 1, 4]} />
            <meshStandardMaterial color="yellow" wireframe />
          </mesh>
        </group>

        <group position={[-3, 0, -0.5]}>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="#74b9ff" wireframe={true} transparent={true} opacity={0.8} />
          </mesh>
          <mesh
            position={[0.5, 1, 0.51]}
            rotation={[0, worldStateManager.fridgeDoorAngle || 0, 0]}
            onClick={() => {
              const interactionType = worldStateManager.fridgeOpen ? 'CLOSE' : 'OPEN'
              runManualIntent({
                type: 'INTERACT',
                target_item: 'fridge_door',
                interaction_type: interactionType,
                content: `Manual ${String(interactionType).toLowerCase()} fridge_door`
              })
            }}
          >
            <mesh position={[-0.5, 0, 0]}>
              <boxGeometry args={[1, 2, 0.05]} />
              <meshStandardMaterial
                color={worldStateManager.fridgeOpen ? '#74b9ff' : '#b2bec3'}
                transparent={true}
                opacity={0.7}
              />
            </mesh>
          </mesh>
        </group>

        {worldStateManager.cubes.map((cube) => (
          <WholeCube
            key={cube.id}
            position={dragPreviewByCube[cube.id] || cube.position}
            dragHeight={cube.dragHeight}
            isHeldByAgent={cube.state === 'in_hand'}
            allowClickThroughWhileDragging={false}
            onDrag={(newPos) => {
              const nextPosition = Array.isArray(newPos) ? newPos : newPos?.position
              if (!Array.isArray(nextPosition)) return
              setDragPreviewByCube((prev) => ({ ...prev, [cube.id]: nextPosition }))

              if (autoSnapLockRef.current) return
              if (cube.state !== 'in_hand') return
              if (!worldStateManager.fridgeOpen) return
              if (!isInFridgeMainDropZone(nextPosition)) return

              autoSnapLockRef.current = true
              setDragPreviewByCube((prev) => {
                const next = { ...prev }
                delete next[cube.id]
                return next
              })
              runManualIntent({
                type: 'INTERACT',
                target_item: 'fridge_main',
                interaction_type: 'PLACE',
                content: `Manual place ${cube.id} into fridge_main (auto snap)`
              })
              setBehaviorLine(`Action: place ${cube.id} -> fridge_main (auto snap)`)
            }}
            onPickUp={() => {
              autoSnapLockRef.current = false
              setDragPreviewByCube((prev) => {
                const next = { ...prev }
                delete next[cube.id]
                return next
              })
              runManualIntent({
                type: 'INTERACT',
                target_item: cube.id,
                interaction_type: 'PICK',
                content: `Manual pick ${cube.id}`
              })
            }}
            onPlace={() => {
              if (autoSnapLockRef.current) {
                autoSnapLockRef.current = false
                return
              }

              const currentPos = dragPreviewByCube[cube.id] || cube.position
              const inFridgeZone = isInFridgeMainDropZone(currentPos)
              setDragPreviewByCube((prev) => {
                const next = { ...prev }
                delete next[cube.id]
                return next
              })

              if (inFridgeZone) {
                runManualIntent({
                  type: 'INTERACT',
                  target_item: 'fridge_main',
                  interaction_type: 'PLACE',
                  content: `Manual place ${cube.id} into fridge_main`
                })
              } else {
                runManualIntent({
                  type: 'INTERACT',
                  target_item: 'table_surface',
                  interaction_type: 'PLACE',
                  target_position: currentPos,
                  content: `Manual place ${cube.id} on table_surface`
                })
              }
            }}
            slicingZonePos={[-3, 0, -0.5]}
            slicingZoneSize={[1, 1]}
          />
        ))}

        <mesh position={[FRIDGE_MAIN_DROP_CENTER[0], 1.15, FRIDGE_MAIN_DROP_CENTER[1]]}>
          <boxGeometry
            args={[FRIDGE_MAIN_DROP_HALF_SIZE[0] * 2, 1.1, FRIDGE_MAIN_DROP_HALF_SIZE[1] * 2]}
          />
          <meshStandardMaterial
            color={worldStateManager.fridgeOpen ? '#22c55e' : '#64748b'}
            transparent
            opacity={worldStateManager.fridgeOpen ? 0.18 : 0.08}
            wireframe
          />
        </mesh>

        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>

      <div className="absolute top-32 left-4 z-50 w-48">
        <HoldBox holdingItem={worldStateManager.holdingCube?.id} cubes={worldStateManager.cubes} />
      </div>

      <div
        className="absolute z-50"
        style={{
          right: '20px',
          bottom: '20px',
          width: '120px',
          height: '120px'
        }}
      >
        <DoctorAvatar status={getDoctorAvatarStatus()} disableEyeTracking={false} />
      </div>

      <AgentStatusDisplay
        agentState={agentSystem.agentState}
        userInstruction={agentSystem.userInstruction}
        isThinking={agentSystem.isThinking}
        autoLoop={agentSystem.autoLoop}
        lastAction={agentSystem.lastAction}
      />

      <div className="absolute bottom-4 left-4 z-50 w-[28rem] max-h-64 bg-black/85 text-gray-200 p-3 rounded-lg border border-gray-600 font-mono text-[11px]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-green-300">History ({intentHistory.length})</div>
          <button
            onClick={() => setIntentHistory([])}
            className="px-2 py-0.5 text-[10px] bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="overflow-y-auto max-h-52 space-y-2">
          {intentHistory.length === 0 ? (
            <div className="text-gray-500">No history yet.</div>
          ) : (
            intentHistory.map((entry, idx) => (
              <div key={entry.key} className="bg-gray-900/80 border border-gray-700 rounded p-2">
                <div className="text-[10px] text-gray-400 mb-1">#{idx + 1} step={entry.step_id ?? '-'}</div>
                {entry.error && entry.error.error_code !== 'OK' && (
                  <div className="text-[10px] mb-1 text-red-300">
                    error={entry.error.error_code} ({entry.error.module}/{entry.error.severity})
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-words text-[10px] leading-4">
{JSON.stringify(
  {
    type: entry.type,
    target_poi: entry.target_poi,
    target_item: entry.target_item,
    interaction_type: entry.interaction_type,
    target_length: entry.target_length,
    content: entry.content,
    error: entry.error
      ? {
          error_code: entry.error.error_code,
          module: entry.error.module,
          severity: entry.error.severity,
          detail: entry.error.detail
        }
      : null
  },
  null,
  2
)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


