import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrthographicCamera } from '@react-three/drei'

import { DoctorAvatar } from '../components/game/avatar/DoctorAvatar'
import { NotificationBubble } from '../components/game/items/NotificationBubble'
import { WholeCube } from '../components/game/mechanics/GameCube'
import { ActionTriggerBubble } from '../components/game/mechanics/ActionTriggerBubble'
import { Refridge } from '../components/game/mechanics/Refridge'
import { AgentStatusDisplay } from '../components/game/mechanics/AgentBrainDashboard'
import { HoldBox } from '../components/game/mechanics/HoldBox'
import { BackButton } from '../components/game/mechanics/AgentControls'
import { buildWorldFacts } from '../components/game/core/worldFacts'
import { DEFAULT_PLAYGROUND_CUBES, FRIDGE_MAIN_SNAP_POSITION } from './worldRuntimeConstants'

const TABLE_HEIGHT = 0.85
const DEFAULT_AGENT_POSITION = [1.5, 0, 2]

// Pure Guards removed - MVP only focuses on rendering

// ==================== Helper Functions ====================

function getVisualTargetPosition(location) {
  if (location === 'fridge_zone') return [-2, 0, 1]
  if (location === 'stove_zone') return [2, 0, 1]
  return DEFAULT_AGENT_POSITION
}

function getHeldCubeAnchor(agentPosition) {
  if (!Array.isArray(agentPosition) || agentPosition.length < 3) return [0, 1.2, 0]
  return [agentPosition[0] + 0.34, 1.26, agentPosition[2] + 0.02]
}

export function AgentPlayground({ onBack }) {
  const initialStateRef = useRef({
    cubes: DEFAULT_PLAYGROUND_CUBES.map(c => ({ ...c, position: [...c.position] })),
    agentState: { location: 'table_center', holding: null },
    fridgeOpen: false
  })

  // ==================== Core State ====================
  const [cubes, setCubes] = useState(initialStateRef.current.cubes)
  const [agentState, setAgentState] = useState(initialStateRef.current.agentState)
  const [fridgeOpen, setFridgeOpen] = useState(initialStateRef.current.fridgeOpen)

  // ==================== UI State ====================
  const [behaviorLine, setBehaviorLine] = useState('Click cube to pick up')
  const [showArrowAnimation, setShowArrowAnimation] = useState(false)
  const [worldFactsReadSnapshot, setWorldFactsReadSnapshot] = useState(null)
  const [actionBubble, setActionBubble] = useState({
    visible: false,
    status: 'NO_INTENT',
    message: ''
  })
  const [agentVisualPosition, setAgentVisualPosition] = useState(DEFAULT_AGENT_POSITION)

  // ==================== Direct State Updates (No Guards) ====================
  const pickUpCube = useCallback((cubeId) => {
    console.log(`Mouse PICK: ${cubeId}`)
    setCubes(cubes.map(c =>
      c.id === cubeId ? { ...c, state: 'in_hand' } : c
    ))
    setAgentState({ ...agentState, holding: cubeId })
  }, [cubes, agentState])

  const placeCube = useCallback((cubeId, position, newState = 'on_table') => {
    console.log(`Mouse PLACE: ${cubeId} -> ${newState}`)
    setCubes(cubes.map(c =>
      c.id === cubeId ? { ...c, state: newState, position: [...position] } : c
    ))
    setAgentState({ ...agentState, holding: null })
  }, [cubes, agentState])

  const updateCubePosition = useCallback((cubeId, position) => {
    setCubes(cubes.map(c =>
      c.id === cubeId ? { ...c, position: [...position] } : c
    ))
  }, [cubes])

  const toggleFridgeDoor = useCallback(() => {
    setFridgeOpen(!fridgeOpen)
    console.log(`${!fridgeOpen ? 'OPEN' : 'CLOSE'} fridge_door (mouse)`)
  }, [fridgeOpen])

  // ==================== World Facts Interface ====================
  const getWorldFacts = useCallback(() => {
    return buildWorldFacts({
      agentState,
      cubes,
      fridgeOpen,
      timestamp: Date.now() / 1000
    })
  }, [agentState, cubes, fridgeOpen])

  const getInitialWorldFacts = useCallback(() => {
    return buildWorldFacts({
      agentState: initialStateRef.current.agentState,
      cubes: initialStateRef.current.cubes,
      fridgeOpen: initialStateRef.current.fridgeOpen,
      timestamp: Date.now() / 1000
    })
  }, [])

  const resetWorldState = useCallback(() => {
    setCubes(initialStateRef.current.cubes.map(c => ({ ...c, position: [...c.position] })))
    setAgentState(initialStateRef.current.agentState)
    setFridgeOpen(initialStateRef.current.fridgeOpen)
  }, [])

  // ==================== UI Helpers ====================
  const flashActionArrow = () => {
    setShowArrowAnimation(true)
    setTimeout(() => setShowArrowAnimation(false), 1500)
  }

  const handleTestReadWorldFacts = () => {
    try {
      const currentSnapshot = getWorldFacts()
      setWorldFactsReadSnapshot(currentSnapshot)
      setBehaviorLine('World facts read successfully')
      setActionBubble({
        visible: true,
        status: 'SUCCESS',
        message: `Read world facts ok (${currentSnapshot?.nearby_objects?.length || 0} objects)`
      })
      console.log('[AgentPlayground] World facts:', currentSnapshot)
    } catch (error) {
      setActionBubble({
        visible: true,
        status: 'READ_FAILED',
        message: `Failed: ${error?.message || String(error)}`
      })
    }
  }

  const taskLine = 'Task: MVP - Click to pick up cube'

  useEffect(() => {
    if (!actionBubble.visible) return
    const timer = setTimeout(() => {
      setActionBubble((prev) => ({ ...prev, visible: false }))
    }, 1400)
    return () => clearTimeout(timer)
  }, [actionBubble.visible])

  useEffect(() => {
    const target = getVisualTargetPosition(agentState.location)
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
  }, [agentState.location])

  const resetActionBubble = () => {
    setActionBubble({
      visible: false,
      status: 'NO_INTENT',
      message: ''
    })
  }

  const handleResetWorld = () => {
    resetWorldState()
    setWorldFactsReadSnapshot(null)
    setBehaviorLine('Click cube to pick up')
    setAgentVisualPosition(getVisualTargetPosition('table_center'))
    resetActionBubble()
  }

  const getDoctorAvatarStatus = () => {
    if (agentState.holding) return 'active'
    return 'idle'
  }

  const handleDoorClick = () => {
    toggleFridgeDoor()
  }

  const holdingCube = cubes.find(c => c.state === 'in_hand')

  return (
    <div className="w-full h-full relative bg-[#1e1e1e]">
      {onBack && <BackButton onBack={onBack} />}

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
        <NotificationBubble
          text={taskLine}
          subText={behaviorLine}
          style={{ transform: 'translateY(-20px)' }}
          showArrowAnimation={showArrowAnimation}
        />
      </div>

      <ActionTriggerBubble bubble={actionBubble} />

      {/* Simple Reset Button */}
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={handleResetWorld}
          className="px-4 py-2 bg-red-600/90 hover:bg-red-500 text-white text-sm font-semibold rounded shadow-lg transition-colors"
        >
          Reset World
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

        <Refridge isOpen={fridgeOpen} onToggle={handleDoorClick} />

        <mesh position={[-2.35, 1.15, -0.5]}>
          <boxGeometry
            args={[2.1, 1.1, 1.7]}
          />
          <meshStandardMaterial
            color={fridgeOpen ? '#22c55e' : '#64748b'}
            transparent
            opacity={fridgeOpen ? 0.18 : 0.08}
            wireframe
          />
        </mesh>

        {cubes.map((cube) => (
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
              updateCubePosition(cube.id, nextPosition)
            }}
            onPickUp={() => {
              pickUpCube(cube.id)
              setBehaviorLine(`Picked up ${cube.name}`)
            }}
            onPlace={() => {
              placeCube(cube.id, cube.position, 'on_table')
              setBehaviorLine(`Placed ${cube.name}`)
            }}
            slicingZonePos={[-3, 0, -0.5]}
            slicingZoneSize={[1, 1]}
          />
        ))}

        <Grid position={[0, 0.01, 0]} args={[12, 12]} cellColor="#636e72" sectionSize={3} />
      </Canvas>

      <div className="absolute top-32 left-4 z-50 w-48">
        <HoldBox holdingItem={holdingCube?.id} cubes={cubes} />
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
        agentState={agentState}
        userInstruction="MVP: Click cube to pick up"
        isThinking={false}
        autoLoop={false}
        lastAction={null}
      />

      <div className="absolute top-32 right-4 z-50 w-[30rem] max-h-64 bg-black/85 text-gray-200 p-3 rounded-lg border border-gray-600 font-mono text-[11px]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-cyan-300">World Facts</div>
          <button
            onClick={handleTestReadWorldFacts}
            className="px-2 py-0.5 text-[10px] bg-cyan-700 rounded hover:bg-cyan-600 transition-colors"
          >
            Read
          </button>
        </div>
        <div className="overflow-y-auto max-h-52">
          {!worldFactsReadSnapshot ? (
            <div className="text-gray-500">Click "Read" to see current world facts.</div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-[10px] leading-4">
{JSON.stringify(worldFactsReadSnapshot, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
