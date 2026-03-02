import React, { useCallback, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { GameCamera } from '../game/GameCamera'
import { PlaygroundLightingRig, usePlaygroundLightingSettings } from '../ui/PlaygroundLightingModule'
import { Floor } from '../Floor'
import { Wall } from '../Wall'
import { Table } from '../Table'

import { NotificationBubble } from '../game/items/NotificationBubble'
import { useAgentSystem } from '../game/core/AgentSystem'

const TABLE_HEIGHT = 0.85
const EFFECTIVE_HEIGHT = TABLE_HEIGHT * 2

const CUBE_POS_TABLE = [-0.4, EFFECTIVE_HEIGHT + 0.125, -0.5]
const CUBE_POS_HAND = [1.3, 1.2, 0.4]
const CUBE_POS_FRIDGE = [-1.8, 1.2, -0.5]

function formatIntentLine(intent) {
  if (!intent?.type) return 'Action: waiting for next step'

  const type = String(intent.type).toUpperCase()
  if (type === 'INTERACT') {
    const interaction = String(intent.interaction_type || 'NONE').toLowerCase()
    const target = intent.target_item || intent.target_poi || 'target'
    return `Action: ${interaction} ${target}`
  }
  if (type === 'MOVE_TO') {
    return `Action: move to ${intent.target_poi || 'target'}`
  }
  if (type === 'FINISH') {
    return `Action: finish (${intent.content || 'task completed'})`
  }
  return `Action: ${type.toLowerCase()}`
}

function InteractiveFridge({ position, isOpen, onToggle }) {
  const doorGroupRef = useRef(null)

  useFrame((_, delta) => {
    if (!doorGroupRef.current) return
    const targetRot = isOpen ? 2.0 : 0
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      doorGroupRef.current.rotation.y,
      targetRot,
      delta * 4
    )
  })

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="#dfe6e9" />
      </mesh>

      <group
        ref={doorGroupRef}
        position={[0.5, 1, 0.51]}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[1, 2, 0.05]} />
          <meshStandardMaterial color={isOpen ? '#b2bec3' : '#dfe6e9'} />
        </mesh>
        <mesh position={[-0.9, 0, 0.05]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      </group>
    </group>
  )
}

export function Level1({ onBack }) {
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false)
  const [cubeState, setCubeState] = useState('on_table')
  const [showDebug, setShowDebug] = useState(false)
  const [actionLine, setActionLine] = useState('Action: waiting for next step')
  const lighting = usePlaygroundLightingSettings()

  const getWorldState = useCallback(
    (agentState = { location: 'table_center', holding: null }) => {
      const nearby_objects = [
        {
          id: 'fridge_main',
          state: 'installed',
          relation: 'storage appliance'
        },
        {
          id: 'fridge_door',
          state: fridgeDoorOpen ? 'open' : 'closed',
          relation: 'fridge door'
        },
        {
          id: 'table_surface',
          state: 'installed',
          relation: 'work surface'
        }
      ]

      if (cubeState === 'on_table') {
        nearby_objects.push({
          id: 'red_cube',
          state: 'on_table',
          relation: 'on table_surface'
        })
      } else if (cubeState === 'in_hand') {
        nearby_objects.push({
          id: 'red_cube',
          state: 'in_hand',
          relation: 'held by agent'
        })
      } else if (cubeState === 'in_fridge') {
        nearby_objects.push({
          id: 'red_cube',
          state: 'in_fridge',
          relation: 'inside fridge_main'
        })
      }

      return {
        agent: {
          location: agentState.location,
          holding: cubeState === 'in_hand' ? 'red_cube' : null
        },
        nearby_objects
      }
    },
    [cubeState, fridgeDoorOpen]
  )

  const executeWorldAction = useCallback(
    (actionPayload) => {
      const interactionType = String(actionPayload.interaction_type || 'NONE').toUpperCase()
      const targetItem = actionPayload.target_item

      if (interactionType === 'PICK') {
        if (targetItem !== 'red_cube' || cubeState !== 'on_table') {
          return { success: false, failure_reason: 'PICK precondition failed' }
        }
        setCubeState('in_hand')
        return { success: true }
      }

      if (interactionType === 'OPEN') {
        if (targetItem !== 'fridge_door') {
          return { success: false, failure_reason: 'OPEN unsupported target' }
        }
        if (fridgeDoorOpen) {
          return { success: false, failure_reason: 'OPEN precondition failed: already open' }
        }
        setFridgeDoorOpen(true)
        return { success: true }
      }

      if (interactionType === 'CLOSE') {
        if (targetItem !== 'fridge_door') {
          return { success: false, failure_reason: 'CLOSE unsupported target' }
        }
        if (!fridgeDoorOpen) {
          return { success: false, failure_reason: 'CLOSE precondition failed: already closed' }
        }
        setFridgeDoorOpen(false)
        return { success: true }
      }

      if (interactionType === 'PLACE') {
        if (cubeState !== 'in_hand') {
          return { success: false, failure_reason: 'PLACE precondition failed: no item in hand' }
        }

        if (targetItem === 'fridge_main') {
          if (!fridgeDoorOpen) {
            return { success: false, failure_reason: 'PLACE precondition failed: fridge door closed' }
          }
          setCubeState('in_fridge')
          return { success: true }
        }

        if (targetItem === 'table_surface') {
          setCubeState('on_table')
          return { success: true }
        }

        return { success: false, failure_reason: 'PLACE unsupported target' }
      }

      return { success: false, failure_reason: `Unsupported interaction ${interactionType}` }
    },
    [cubeState, fridgeDoorOpen]
  )

  const agentSystem = useAgentSystem({
    initialTask: 'Put red cube in fridge',
    getWorldState,
    executeWorldAction,
    onTickComplete: (response) => {
      setActionLine(formatIntentLine(response?.intent))
    }
  })

  const taskLine = 'Task: ' + (agentSystem.userInstruction?.trim() || 'No task set')
  const isVictory = cubeState === 'in_fridge'

  const handleTaskChange = (value) => {
    agentSystem.setUserInstruction(value)
  }

  const runManualInteraction = useCallback(
    (interactionType, targetItem) => {
      const payload = {
        type: 'INTERACT',
        interaction_type: interactionType,
        target_item: targetItem
      }

      const result = agentSystem.dispatchIntent(payload)?.executionResult
      if (result?.success) {
        setActionLine(`Action: ${String(interactionType).toLowerCase()} ${targetItem}`)
      } else {
        setActionLine(`Action blocked: ${result?.failure_reason || 'unknown reason'}`)
      }
      return result
    },
    [agentSystem.dispatchIntent]
  )

  const handleReset = () => {
    setFridgeDoorOpen(false)
    setCubeState('on_table')
    setActionLine('Action: waiting for next step')
    agentSystem.resetAgent()
    agentSystem.stopAutoLoop()
  }

  const manualToggleDoor = () => {
    if (fridgeDoorOpen) {
      runManualInteraction('CLOSE', 'fridge_door')
      return
    }
    runManualInteraction('OPEN', 'fridge_door')
  }

  const manualPick = () => {
    runManualInteraction('PICK', 'red_cube')
  }

  const manualPlaceTable = () => {
    runManualInteraction('PLACE', 'table_surface')
  }

  const manualPlaceFridge = () => {
    runManualInteraction('PLACE', 'fridge_main')
  }

  const cubePosition =
    cubeState === 'in_hand' ? CUBE_POS_HAND : cubeState === 'in_fridge' ? CUBE_POS_FRIDGE : CUBE_POS_TABLE

  return (
    <div className="w-full h-full relative bg-[#edf3f7]">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all"
      >
        <span>{"<-"}</span> Back
      </button>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <NotificationBubble text={taskLine} subText={actionLine} style={{ transform: 'translateY(-20px)' }} />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <span className="text-sm font-bold text-gray-600">Task:</span>
          <input
            type="text"
            value={agentSystem.userInstruction}
            onChange={(e) => handleTaskChange(e.target.value)}
            className="bg-transparent text-gray-800 outline-none w-80 text-sm"
            placeholder="e.g. Put red cube in fridge"
          />
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={agentSystem.tick}
            disabled={agentSystem.isThinking || agentSystem.autoLoop}
            className="px-5 py-2 rounded-full font-bold transition-all shadow-lg bg-indigo-500 text-white disabled:opacity-50"
          >
            STEP
          </button>
          <button
            onClick={agentSystem.toggleAutoLoop}
            className={`px-5 py-2 rounded-full font-bold transition-all shadow-lg ${
              agentSystem.autoLoop ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {agentSystem.autoLoop ? 'STOP AUTO' : 'AUTO'}
          </button>
          <button
            onClick={() => setShowDebug((prev) => !prev)}
            className="px-5 py-2 rounded-full font-bold transition-all shadow-lg bg-purple-500 text-white"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-full font-bold transition-all shadow-lg bg-gray-700 text-white"
          >
            RESET
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg text-xs text-gray-700 flex gap-2">
          <button onClick={manualToggleDoor} className="px-2 py-1 bg-slate-200 rounded">
            Toggle Door
          </button>
          <button onClick={manualPick} className="px-2 py-1 bg-slate-200 rounded">
            Pick Cube
          </button>
          <button onClick={manualPlaceTable} className="px-2 py-1 bg-slate-200 rounded">
            Place on Table
          </button>
          <button onClick={manualPlaceFridge} className="px-2 py-1 bg-slate-200 rounded">
            Place in Fridge
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-4 z-50 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs max-w-xs">
        <div className="font-bold mb-2">Agent Status</div>
        <div className="text-gray-300">{agentSystem.isThinking ? 'Thinking...' : 'Ready'}</div>
        <div className="text-gray-300 mt-1">Cube: {cubeState}</div>
        <div className="text-gray-300">Door: {fridgeDoorOpen ? 'open' : 'closed'}</div>
        {agentSystem.lastAction && (
          <div className="mt-2 text-yellow-300 text-[10px]">Last action: {agentSystem.lastAction.type}</div>
        )}
      </div>

      {showDebug && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border-2 border-purple-500 rounded-lg shadow-2xl w-[860px] max-h-[520px] overflow-hidden">
          <div className="bg-purple-500 text-white px-4 py-2 font-bold flex justify-between items-center">
            <span>Frontend/Backend Debug</span>
            <button onClick={() => setShowDebug(false)} className="hover:text-gray-200">
              X
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-300 h-[470px]">
            <div className="p-3 overflow-y-auto">
              <div className="font-bold text-blue-600 mb-2 text-sm">Request (Observation)</div>
              {agentSystem.lastObservation ? (
                <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(agentSystem.lastObservation, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-400 text-xs">Waiting for request...</div>
              )}
            </div>
            <div className="p-3 overflow-y-auto">
              <div className="font-bold text-green-600 mb-2 text-sm">Response (Intent)</div>
              {agentSystem.lastResponse ? (
                <pre className="text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(agentSystem.lastResponse, null, 2)}
                </pre>
              ) : (
                <div className="text-gray-400 text-xs">Waiting for response...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isVictory && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <button
            onClick={handleReset}
            className="bg-[#66CC00] text-white px-8 py-3 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition-transform"
          >
            Replay
          </button>
        </div>
      )}

      <Canvas orthographic>
        <GameCamera />
        <PlaygroundLightingRig lighting={lighting} rawColorMode={false} showHelperOverride={false} />

        <Floor width={12} depth={12} color="#8199aa" />
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={10} height={5} color="#ffc697" />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} color="#f8dec2" />

        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} />
        <InteractiveFridge
          position={[-2, 0, -0.5]}
          isOpen={fridgeDoorOpen}
          onToggle={manualToggleDoor}
        />

        <mesh position={cubePosition}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </Canvas>
    </div>
  )
}
