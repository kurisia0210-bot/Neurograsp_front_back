import React, { useEffect, useMemo, useState } from 'react'
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
import { GameOven } from '../components/gameoven'
import { GamePlane } from '../components/gameplane'
import { DashboardBooklet } from './DashboardBooklet'

const FRIDGE_MAIN_DROP_CENTER = [-2.35, -0.5]
const FRIDGE_MAIN_DROP_HALF_SIZE = [0.68, 0.52]

const OVEN_MAIN_DROP_CENTER = [2.75, -0.2]
const OVEN_MAIN_DROP_HALF_SIZE = [0.34, 0.24]

const PLANE_INITIAL_POSITION = [0.4, 1.701, -0.4]
const INVENTORY_SLOT_COUNT = 6

const ITEM_ICON = Object.freeze({
  red_cube: '[R]',
  apple: '[A]',
  meat_raw: '[M]',
  meat_heated: '[H]',
  plate: '[P]'
})

function getItemIcon(itemId) {
  return ITEM_ICON[itemId] || '[?]'
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
      pickPlane: worldStateManager.pickPlane,
      placePlane: worldStateManager.placePlane,
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
    worldStateManager.pickPlane,
    worldStateManager.placePlane,
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
  const [selectedInventoryId, setSelectedInventoryId] = useState(null)

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
    getWorldFacts: worldFactsReader.readSnapshot,
    executeWorldAction: worldFactsWriter.executeIntent
  })

  const taskLine = `Task: ${agentSystem.userInstruction?.trim() || 'No task set'}`
  const currentMeatId = worldStateManager.planeState.isHeated ? 'meat_heated' : 'meat_raw'

  const inventoryItems = useMemo(() => {
    const cubeItems = worldStateManager.cubes
      .filter((cube) => cube.state === 'picked')
      .map((cube) => ({ id: cube.id, state: cube.state }))

    if (worldStateManager.planeState.state === 'picked') {
      cubeItems.push({ id: 'plate', state: 'picked' })
    }

    return cubeItems
  }, [worldStateManager.cubes, worldStateManager.planeState.state, currentMeatId])

  const inventorySlots = useMemo(() => {
    return Array.from({ length: INVENTORY_SLOT_COUNT }, (_, idx) => inventoryItems[idx] || null)
  }, [inventoryItems])

  useEffect(() => {
    if (!actionBubble.visible) return
    const timer = setTimeout(() => {
      setActionBubble((prev) => ({ ...prev, visible: false }))
    }, 1400)
    return () => clearTimeout(timer)
  }, [actionBubble.visible])

  useEffect(() => {
    if (inventoryItems.length === 0) {
      if (selectedInventoryId !== null) {
        setSelectedInventoryId(null)
      }
      return
    }

    const selectedStillExists = selectedInventoryId
      ? inventoryItems.some((item) => item.id === selectedInventoryId)
      : false

    if (selectedStillExists) return
    setSelectedInventoryId(inventoryItems[0].id)
  }, [inventoryItems, selectedInventoryId])

  const resetActionBubble = () => {
    setActionBubble({
      visible: false,
      status: 'NO_INTENT',
      message: ''
    })
  }

  const handleResetAgent = () => {
    agentSystem.resetAgent()
    worldStateManager.resetWorldState()
    setIntentHistory([])
    setSnapshotPreview(null)
    setBehaviorLine('Action: waiting for next step')
    setSelectedInventoryId(null)
    resetActionBubble()
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

  const handlePickToInventory = (cubeId) => {
    const intent = {
      type: ActionType.INTERACT,
      interaction_type: InteractionType.PICK,
      target_item: cubeId,
      content: `Manual pick ${cubeId}`
    }

    const committed = agentSystem.dispatchIntent(intent)
    const triggerResult = toBubbleFromExecution(intent, committed?.executionResult)

    setActionBubble({
      visible: true,
      status: triggerResult.status,
      message: triggerResult.message
    })

    if (committed?.executionResult?.success) {
      setSelectedInventoryId(cubeId)
      setBehaviorLine(`Action: pick ${cubeId} (inventory)`)
    }
  }

  const handlePlaceFromInventory = (targetItem) => {
    if (!selectedInventoryId) return

    const placeIntent = {
      type: ActionType.INTERACT,
      interaction_type: InteractionType.PLACE,
      target_item: targetItem,
      source_item: selectedInventoryId,
      content: `Manual place ${selectedInventoryId} -> ${targetItem}`
    }

    const committed = agentSystem.dispatchIntent(placeIntent)
    const triggerResult = toBubbleFromExecution(placeIntent, committed?.executionResult)

    setActionBubble({
      visible: true,
      status: triggerResult.status,
      message: triggerResult.message
    })

    if (committed?.executionResult?.success) {
      setBehaviorLine(`Action: place ${selectedInventoryId} -> ${targetItem}`)
    }
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

      <div className="absolute top-[62%] left-[66%] z-50">
        <button
          onClick={handleHeatPlane}
          disabled={agentSystem.isThinking}
          className="px-3 py-1.5 bg-orange-600/90 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Heat Meat
        </button>
      </div>

      <div className="absolute top-24 left-6 z-[9999] w-64 bg-slate-900/95 border-2 border-cyan-400 rounded-lg p-3 text-xs text-slate-100 shadow-2xl">
        <div className="font-semibold text-cyan-300">Inventory</div>
        <div className="mt-2 text-[10px] text-slate-400">Click item to pick. Click slot to select.</div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {inventorySlots.map((item, index) => {
            const selected = item && item.id === selectedInventoryId
            return (
              <button
                key={`slot_${index}`}
                onClick={() => item && setSelectedInventoryId(item.id)}
                disabled={!item}
                className={`rounded border px-2 py-1 text-left transition-colors ${
                  selected
                    ? 'border-cyan-300 bg-cyan-900/40'
                    : 'border-slate-700 bg-slate-950/60 hover:bg-slate-800 disabled:opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold leading-none">{item ? getItemIcon(item.id) : '[ ]'}</span>
                  <span className="truncate">{item ? item.id : 'empty'}</span>
                </div>

              </button>
            )
          })}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => handlePlaceFromInventory('table_surface')}
            disabled={!selectedInventoryId || agentSystem.isThinking}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
          >
            Place Table
          </button>
          <button
            onClick={() => handlePlaceFromInventory('fridge_main')}
            disabled={!selectedInventoryId || agentSystem.isThinking}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
          >
            Place Fridge
          </button>
        </div>
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
        <GameOven
          position={[2.75, 0, -0.4]}
          isOpen={worldStateManager.ovenOpen}
          onToggleDoor={worldStateManager.toggleOvenDoor}
        />
        {worldStateManager.planeState.state === 'on_table' && (
          <GamePlane
            position={worldStateManager.planeState.position}
            isHeated={worldStateManager.planeState.isHeated}
            onPositionChange={worldStateManager.setPlanePosition}
            draggable={false}
            onPress={() => handlePickToInventory('plate')}
          />
        )}
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

        {worldStateManager.cubes
          .filter((cube) => cube.state !== 'picked')
          .map((cube) => (
            <WholeCube
              key={cube.id}
              position={cube.position}
              dragHeight={cube.dragHeight}
              isHeldByAgent={false}
              color={cube.color}
              pickToInventory
              onPickUp={() => handlePickToInventory(cube.id)}
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

