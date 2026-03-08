import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrthographicCamera } from '@react-three/drei'

import { useAgentSystem } from '../components/game/core/AgentSystem'
import { NotificationBubble } from '../components/game/items/NotificationBubble'
import { WholeCube } from '../components/game/mechanics/GameCube'
import { GameFridge } from '../components/game/mechanics/GameFridge'
import { ActionTriggerBubble } from '../components/game/mechanics/ActionTriggerBubble'
import { ActionType, InteractionType } from '../components/game/core/ActionContract'
import { AgentControls, BackButton } from '../components/game/mechanics/AgentControls'
import { useWorldStateManager } from '../components/game/core/WorldStateManager'
import { createWorldFactsReader, createWorldFactsWriter } from '../components/game/core/worldFacts'
import { TmpTable } from '../components/TmpTable'
import { TmpHuman } from '../components/TmpHuman'
import { GameOven } from '../components/gameoven'
import { GamePlane } from '../components/gameplane'
import { DashboardBooklet } from './DashboardBooklet'

const DEFAULT_AGENT_POSITION = [1.5, 0, 2]
const FRIDGE_MAIN_DROP_CENTER = [-2.35, -0.5] // [x, z]
const FRIDGE_MAIN_DROP_HALF_SIZE = [0.68, 0.52] // [halfX, halfZ]
const FRIDGE_MAIN_SNAP_POSITION = [-1.8, 1.2, -0.5]
const OVEN_MAIN_DROP_CENTER = [2.75, -0.2] // [x, z]
const OVEN_MAIN_DROP_HALF_SIZE = [0.34, 0.24] // [halfX, halfZ]
const OVEN_MAIN_SNAP_POSITION = [2.75, 0.95, -0.28]
const OVEN_ZONE_POSITION = [2.35, 0, -0.1]
const PLANE_INITIAL_POSITION = [0.4, 1.701, -0.4]

function isInFridgeMainDropZone(position) {
  if (!Array.isArray(position)) return false
  const [x, , z] = position
  return (
    Math.abs(x - FRIDGE_MAIN_DROP_CENTER[0]) <= FRIDGE_MAIN_DROP_HALF_SIZE[0] &&
    Math.abs(z - FRIDGE_MAIN_DROP_CENTER[1]) <= FRIDGE_MAIN_DROP_HALF_SIZE[1]
  )
}

function isInOvenMainDropZone(position) {
  if (!Array.isArray(position)) return false
  const [x, , z] = position
  return (
    Math.abs(x - OVEN_MAIN_DROP_CENTER[0]) <= OVEN_MAIN_DROP_HALF_SIZE[0] &&
    Math.abs(z - OVEN_MAIN_DROP_CENTER[1]) <= OVEN_MAIN_DROP_HALF_SIZE[1]
  )
}

function getVisualTargetPosition(location) {
  if (location === 'fridge_zone') return [-2, 0, 1]
  if (location === 'stove_zone') return OVEN_ZONE_POSITION
  return DEFAULT_AGENT_POSITION
}

function getHeldCubeAnchor(agentPosition) {
  if (!Array.isArray(agentPosition) || agentPosition.length < 3) return [0, 1.2, 0]
  return [agentPosition[0] + 0.34, 1.26, agentPosition[2] + 0.02]
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

function getActionLabel(intent) {
  if (!intent?.type) return 'action'
  const type = String(intent.type).toUpperCase()
  if (type === 'MOVE_TO') {
    return `MOVE_TO ${intent.target_poi || 'target'}`
  }
  if (type === 'INTERACT') {
    const interaction = String(intent.interaction_type || 'NONE').toUpperCase()
    const target = intent.target_item || intent.target_poi || 'target'
    return `${interaction} ${target}`
  }
  return type
}

function toBubbleFromExecution(intent, executionResult, fallbackError = null) {
  const label = getActionLabel(intent)
  if (executionResult && executionResult.success === false) {
    return {
      status: executionResult.failure_type || 'EXECUTION_FAILED',
      message: executionResult.failure_reason || `${label} blocked`
    }
  }
  if (fallbackError) {
    return {
      status: 'EXECUTION_FAILED',
      message: String(fallbackError)
    }
  }
  return {
    status: 'SUCCESS',
    message: `${label} executed`
  }
}

export function AgentPlayground({ onBack }) {
  const autoSnapLockRef = useRef(false)

  const worldStateManager = useWorldStateManager({
    initialFridgeOpen: false,
    initialOvenOpen: false,
    initialPlaneState: {
      position: PLANE_INITIAL_POSITION,
      isHeated: false
    },
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

  const worldFactsReader = useMemo(() => {
    return createWorldFactsReader({
      getAgentState: () => worldStateManager.agentState,
      getCubes: () => worldStateManager.cubes,
      getFridgeOpen: () => worldStateManager.fridgeOpen,
      getOvenOpen: () => worldStateManager.ovenOpen,
      getPlaneState: () => worldStateManager.planeState
    })
  }, [
    worldStateManager.agentState,
    worldStateManager.cubes,
    worldStateManager.fridgeOpen,
    worldStateManager.ovenOpen,
    worldStateManager.planeState
  ])

  const worldFactsWriter = useMemo(() => {
    return createWorldFactsWriter({
      getAgentState: () => worldStateManager.agentState,
      getCubes: () => worldStateManager.cubes,
      getFridgeOpen: () => worldStateManager.fridgeOpen,
      getOvenOpen: () => worldStateManager.ovenOpen,
      getPlaneState: () => worldStateManager.planeState,
      setAgentLocation: worldStateManager.setAgentLocation,
      pickUpCube: worldStateManager.pickUpCube,
      placeCube: worldStateManager.placeCube,
      toggleFridgeDoor: worldStateManager.toggleFridgeDoor,
      toggleOvenDoor: worldStateManager.toggleOvenDoor,
      updateCubePosition: worldStateManager.updateCubePosition,
      setPlaneHeated: worldStateManager.setPlaneHeated
    })
  }, [
    worldStateManager.agentState,
    worldStateManager.cubes,
    worldStateManager.fridgeOpen,
    worldStateManager.ovenOpen,
    worldStateManager.planeState,
    worldStateManager.setAgentLocation,
    worldStateManager.pickUpCube,
    worldStateManager.placeCube,
    worldStateManager.toggleFridgeDoor,
    worldStateManager.toggleOvenDoor,
    worldStateManager.updateCubePosition,
    worldStateManager.setPlaneHeated
  ])

  const [behaviorLine, setBehaviorLine] = useState('Action: waiting for next step')
  const [intentHistory, setIntentHistory] = useState([])
  const [snapshotPreview, setSnapshotPreview] = useState(null)
  const [actionBubble, setActionBubble] = useState({
    visible: false,
    status: 'NO_INTENT',
    message: ''
  })
  const [agentVisualPosition, setAgentVisualPosition] = useState(DEFAULT_AGENT_POSITION)

  const handleReadInitialSnapshot = () => {
    const snapshot = worldFactsReader.readSnapshot()
    if (!snapshot) return

    setSnapshotPreview(snapshot)
    setActionBubble({
      visible: true,
      status: 'SUCCESS',
      message: 'Initial world snapshot loaded'
    })
    setBehaviorLine('Action: read initial world snapshot')
    console.log('[AgentPlayground] Initial world snapshot:', snapshot)
  }

  const agentSystem = useAgentSystem({
    initialTask: 'pick red_cube',
    autoExecuteBackendIntent: false,
    onTickComplete: (response) => {
      if (!response?.intent) return

      setIntentHistory((prev) => [...prev, toHistoryEntry(response)].slice(-30))

      const intent = response.intent
      setBehaviorLine(getBehaviorText(intent))

      if (response?.manual_required) {
        setActionBubble({
          visible: true,
          status: 'SUCCESS',
          message: `Expected: ${getActionLabel(intent)} (manual)`
        })
      } else {
        const triggerResult = toBubbleFromExecution(
          intent,
          response?.execution_result,
          response?.error?.detail || response?.error?.description || null
        )
        setActionBubble({
          visible: true,
          status: triggerResult.status,
          message: triggerResult.message
        })
      }
    },
    onActionExecuted: (action, newState) => {
      console.log('[AgentPlayground] Action executed:', action?.type, newState)
    },
    getWorldFacts: worldFactsReader.readSnapshot,
    executeWorldAction: worldFactsWriter.executeIntent
  })
  const taskLine = `Task: ${agentSystem.userInstruction?.trim() || 'No task set'}`

  useEffect(() => {
    if (!actionBubble.visible) return
    const timer = setTimeout(() => {
      setActionBubble((prev) => ({ ...prev, visible: false }))
    }, 1400)
    return () => clearTimeout(timer)
  }, [actionBubble.visible])

  useEffect(() => {
    const target = getVisualTargetPosition(worldStateManager.agentState.location)
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
  }, [worldStateManager.agentState.location])

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
    setIntentHistory([])
    setSnapshotPreview(null)
    setBehaviorLine('Action: waiting for next step')
    setAgentVisualPosition(getVisualTargetPosition('table_center'))
    resetActionBubble()
  }

  const moveAgentTo = (targetPoi, label) => {
    const intent = {
      type: ActionType.MOVE_TO,
      target_poi: targetPoi,
      content: `Manual move to ${targetPoi}`
    }

    const committed = agentSystem.dispatchIntent(intent)
    const triggerResult = toBubbleFromExecution(intent, committed?.executionResult)

    setActionBubble({
      visible: true,
      status: triggerResult.status,
      message: triggerResult.message
    })
    setBehaviorLine(`Action: move to ${targetPoi} (${label})`)
  }

  const handleHeatPlane = () => {
    const targetItem = worldStateManager.planeState.isHeated ? 'meat_heated' : 'meat_raw'
    const intent = {
      type: ActionType.INTERACT,
      interaction_type: InteractionType.COOK,
      target_item: targetItem,
      content: `Manual heat ${targetItem}`
    }

    const committed = agentSystem.dispatchIntent(intent)
    const triggerResult = toBubbleFromExecution(intent, committed?.executionResult)

    setActionBubble({
      visible: true,
      status: triggerResult.status,
      message: triggerResult.message
    })
    setBehaviorLine(`Action: heat ${targetItem}`)
  }

  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      {onBack && <BackButton onBack={onBack} />}

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <NotificationBubble
          text={taskLine}
          subText={behaviorLine}
          style={{ transform: 'translateY(-20px)' }}
        />
      </div>

      <ActionTriggerBubble bubble={actionBubble} />

      <AgentControls
        onTick={agentSystem.tick}
        onToggleAutoLoop={agentSystem.toggleAutoLoop}
        onReset={handleResetAgent}
        onReadInitialSnapshot={handleReadInitialSnapshot}
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

      <div className="absolute top-[56%] left-[66%] z-50">
        <button
          onClick={() => moveAgentTo('stove_zone', 'oven')}
          disabled={agentSystem.isThinking}
          className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Go to Oven
        </button>
      </div>

      <div className="absolute top-[62%] left-[66%] z-50">
        <button
          onClick={handleHeatPlane}
          disabled={agentSystem.isThinking}
          className="px-3 py-1.5 bg-orange-600/90 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Heat Meat
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

        <TmpTable />
        <TmpHuman position={agentVisualPosition} />
        <GameOven
          position={[2.75, 0, -0.4]}
          isOpen={worldStateManager.ovenOpen}
          onToggleDoor={worldStateManager.toggleOvenDoor}
        />
        <GamePlane
          position={worldStateManager.planeState.position}
          isHeated={worldStateManager.planeState.isHeated}
          onPositionChange={worldStateManager.setPlanePosition}
        />

        <mesh position={[OVEN_MAIN_DROP_CENTER[0], 0.95, OVEN_MAIN_DROP_CENTER[1]]}>
          <boxGeometry args={[OVEN_MAIN_DROP_HALF_SIZE[0] * 2, 0.55, OVEN_MAIN_DROP_HALF_SIZE[1] * 2]} />
          <meshStandardMaterial
            color={worldStateManager.ovenOpen ? '#22c55e' : '#64748b'}
            transparent
            opacity={worldStateManager.ovenOpen ? 0.18 : 0.08}
            wireframe
          />
        </mesh>

        <GameFridge
          isOpen={worldStateManager.fridgeOpen}
          onToggleDoor={worldStateManager.toggleFridgeDoor}
          dropCenter={FRIDGE_MAIN_DROP_CENTER}
          dropHalfSize={FRIDGE_MAIN_DROP_HALF_SIZE}
        />

        {worldStateManager.cubes.map((cube) => (
          <WholeCube
            key={cube.id}
            position={cube.position}
            heldAnchor={getHeldCubeAnchor(agentVisualPosition)}
            dragHeight={cube.dragHeight}
            isHeldByAgent={cube.state === 'in_hand'}
            allowClickThroughWhileDragging={false}
            onDrag={(newPos) => {
              const nextPosition = Array.isArray(newPos) ? newPos : newPos?.position
              if (!Array.isArray(nextPosition)) return
              worldFactsWriter.updateCubeDragPosition(cube.id, nextPosition)

              if (autoSnapLockRef.current) return
              if (cube.state !== 'in_hand') return

              if (worldStateManager.fridgeOpen && isInFridgeMainDropZone(nextPosition)) {
                autoSnapLockRef.current = true
                worldFactsWriter.placeHeldCube(cube.id, FRIDGE_MAIN_SNAP_POSITION, 'in_fridge')
                setActionBubble({
                  visible: true,
                  status: 'SUCCESS',
                  message: 'Auto snap: red_cube -> fridge_main'
                })
                setBehaviorLine('Action: place red_cube -> fridge_main (auto snap)')
                return
              }

              if (worldStateManager.ovenOpen && isInOvenMainDropZone(nextPosition)) {
                autoSnapLockRef.current = true
                worldFactsWriter.placeHeldCube(cube.id, OVEN_MAIN_SNAP_POSITION, 'on_table')
                setActionBubble({
                  visible: true,
                  status: 'SUCCESS',
                  message: 'Auto snap: red_cube -> oven_main'
                })
                setBehaviorLine('Action: place red_cube -> oven_main (auto snap)')
              }
            }}
            onPickUp={() => {
              autoSnapLockRef.current = false
              worldFactsWriter.pickCube(cube.id)
            }}
            onPlace={() => {
              const currentPos = cube.position
              const inFridgeZone = isInFridgeMainDropZone(currentPos)
              const inOvenZone = isInOvenMainDropZone(currentPos)

              if (worldStateManager.fridgeOpen && inFridgeZone) {
                worldFactsWriter.placeHeldCube(cube.id, FRIDGE_MAIN_SNAP_POSITION, 'in_fridge')
              } else if (worldStateManager.ovenOpen && inOvenZone) {
                worldFactsWriter.placeHeldCube(cube.id, OVEN_MAIN_SNAP_POSITION, 'on_table')
              } else {
                worldFactsWriter.placeHeldCube(cube.id, currentPos, 'on_table')
              }
            }}
            slicingZonePos={[-3, 0, -0.5]}
            slicingZoneSize={[1, 1]}
          />
        ))}

        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>

      <DashboardBooklet
        observation={agentSystem.lastObservation}
        action={agentSystem.lastAction}
        isThinking={agentSystem.isThinking}
        intentHistory={intentHistory}
        onClearHistory={() => setIntentHistory([])}
        snapshotPreview={snapshotPreview}
        onRefreshWorldFacts={handleReadInitialSnapshot}
        holdingItem={worldStateManager.holdingCube?.id}
        cubes={worldStateManager.cubes}
      />
    </div>
  )
}
