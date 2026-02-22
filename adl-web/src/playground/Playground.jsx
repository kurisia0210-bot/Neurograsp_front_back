import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { GameCamera } from '../components/game/GameCamera'
import { GameLighting } from '../components/ui/GameLighting'
import { Floor } from '../components/Floor'
import { Wall } from '../components/Wall'
import { Table } from '../components/Table'

const TABLE_HEIGHT = 0.85
const EFFECTIVE_HEIGHT = TABLE_HEIGHT * 2

const CUBE_POS_TABLE = [-0.4, EFFECTIVE_HEIGHT + 0.125, -0.5]
const CUBE_POS_HAND = [1.3, 1.2, 0.4]
const CUBE_POS_FRIDGE = [-1.8, 1.2, -0.5]

function InteractiveFridge({ position, isOpen, onToggle }) {
  const doorGroupRef = useRef(null)

  useFrame((_, delta) => {
    if (!doorGroupRef.current) return
    const targetRot = isOpen ? 2.0 : 0
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetRot, delta * 4)
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

export function Playground({ onBack }) {
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false)
  const [cubeState, setCubeState] = useState('on_table')

  const cubePosition =
    cubeState === 'in_hand' ? CUBE_POS_HAND : cubeState === 'in_fridge' ? CUBE_POS_FRIDGE : CUBE_POS_TABLE

  return (
    <div className="w-full h-screen relative bg-[#edf3f7] overflow-hidden">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/90 text-gray-700 rounded-full shadow font-semibold hover:bg-white"
        >
          {'<-'} Back
        </button>
      )}

      <div className="absolute top-4 right-4 z-50 bg-white/90 border border-gray-200 rounded-xl p-3 shadow text-xs text-gray-700 w-64">
        <div className="font-bold text-sm mb-2">Playground (Level1 Layout)</div>
        <div className="mb-2">Door: {fridgeDoorOpen ? 'open' : 'closed'}</div>
        <div className="mb-3">Cube: {cubeState}</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFridgeDoorOpen((prev) => !prev)}
            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
          >
            Toggle Door
          </button>
          <button onClick={() => setCubeState('on_table')} className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">
            Cube: Table
          </button>
          <button onClick={() => setCubeState('in_hand')} className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">
            Cube: Hand
          </button>
          <button
            onClick={() => setCubeState('in_fridge')}
            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
          >
            Cube: Fridge
          </button>
        </div>
      </div>

      <Canvas orthographic>
        <GameCamera />
        <GameLighting />

        <Floor width={12} depth={12} color="#dcd7cf" />
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={10} height={5} />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} />

        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} />
        <InteractiveFridge position={[-2, 0, -0.5]} isOpen={fridgeDoorOpen} onToggle={() => setFridgeDoorOpen((prev) => !prev)} />

        <mesh position={cubePosition}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </Canvas>
    </div>
  )
}
