import React, { useEffect, useRef, useState } from 'react'
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
const FRIDGE_MAIN_DROP_HALF_SIZE = [1.05, 0.85] // [halfX, halfZ]
const FRIDGE_MAIN_SNAP_POSITION = [-1.8, 1.2, -0.5]

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

  const triggerArrowAnimation = () => {
    setShowArrowAnimation(true)
    setTimeout(() => setShowArrowAnimation(false), 1500)
  }

  const agentSystem = useAgentSystem({
    initialTask: 'Put red cube in fridge',
    onTickComplete: (response, observation) => {
      if (!response?.intent) return

      setIntentHistory((prev) => [...prev, toHistoryEntry(response)].slice(-30))

      const intent = response.intent
      setBehaviorLine(getBehaviorText(intent))

      const preFridgeDoor = observation?.nearby_objects?.find((obj) => obj.id === 'fridge_door')
      const triggerResult = executeRegisteredAction(intent, {
        holdingItem: observation?.agent?.holding || null,
        fridgeOpen: preFridgeDoor?.state === 'open'
      })
      setActionBubble({
        visible: true,
        status: triggerResult.status,
        message: triggerResult.message
      })
    },
    onActionExecuted: (action, newState) => {
      console.log('[AgentPlayground] Action executed:', action?.type, newState)
      if (action?.type === 'MOVE_TO' || action?.type === 'INTERACT') {
        triggerArrowAnimation()
      }
    },
    getWorldState: worldStateManager.getWorldState,
    executeWorldAction: worldStateManager.executeWorldAction
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

    const triggerResult = executeRegisteredAction(intent, {
      onMove: () => {
        agentSystem.executeAction(intent)
      }
    })

    setActionBubble({
      visible: true,
      status: triggerResult.status,
      message: triggerResult.message
    })
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
            onClick={worldStateManager.toggleFridgeDoor}
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

        {worldStateManager.cubes.map((cube) => (
          <WholeCube
            key={cube.id}
            position={cube.position}
            dragHeight={cube.dragHeight}
            isHeldByAgent={cube.state === 'in_hand'}
            allowClickThroughWhileDragging={true}
            onDrag={(newPos) => {
              const nextPosition = Array.isArray(newPos) ? newPos : newPos?.position
              if (!Array.isArray(nextPosition)) return
              worldStateManager.setCubes((prev) =>
                prev.map((c) => (c.id === cube.id ? { ...c, position: nextPosition } : c))
              )

              if (autoSnapLockRef.current) return
              if (cube.state !== 'in_hand') return
              if (!worldStateManager.fridgeOpen) return
              if (!isInFridgeMainDropZone(nextPosition)) return

              autoSnapLockRef.current = true
              worldStateManager.placeCube(cube.id, FRIDGE_MAIN_SNAP_POSITION, 'in_fridge')
              setActionBubble({
                visible: true,
                status: 'SUCCESS',
                message: 'Auto snap: red_cube -> fridge_main'
              })
              setBehaviorLine('Action: place red_cube -> fridge_main (auto snap)')
            }}
            onPickUp={() => {
              autoSnapLockRef.current = false
              worldStateManager.pickUpCube(cube.id)
            }}
            onPlace={() => {
              const currentPos = cube.position
              const inFridgeZone =
                Math.abs(currentPos[0] - -3) < 0.5 && Math.abs(currentPos[2] - -0.5) < 0.5

              if (inFridgeZone) {
                worldStateManager.placeCube(cube.id, [-1.8, 1.2, -0.5], 'in_fridge')
              } else {
                worldStateManager.placeCube(cube.id, currentPos, 'on_table')
              }
            }}
            slicingZonePos={[-3, 0, -0.5]}
            slicingZoneSize={[1, 1]}
          />
        ))}

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
