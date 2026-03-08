import React, { useState } from 'react'

const OVEN_WIDTH = 0.72
const OVEN_HEIGHT = 1.45
const OVEN_DEPTH = 0.72
const DOOR_WIDTH = 0.62
const DOOR_HEIGHT = 0.62

export function GameOven({ position = [2.75, 0, -0.4], isOpen, onToggleDoor }) {
  const [localDoorOpen, setLocalDoorOpen] = useState(false)
  const controlled = typeof isOpen === 'boolean'
  const doorOpen = controlled ? isOpen : localDoorOpen

  const handleToggle = () => {
    if (typeof onToggleDoor === 'function') {
      onToggleDoor()
      return
    }
    setLocalDoorOpen((prev) => !prev)
  }

  return (
    <group position={position}>
      <mesh position={[0, OVEN_HEIGHT / 2, 0]}>
        <boxGeometry args={[OVEN_WIDTH, OVEN_HEIGHT, OVEN_DEPTH]} />
        <meshStandardMaterial color="#60a5fa" wireframe transparent opacity={0.95} />
      </mesh>

      <mesh position={[0, 0.88, OVEN_DEPTH / 2 + 0.01]}>
        <boxGeometry args={[0.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#60a5fa" wireframe transparent opacity={0.95} />
      </mesh>

      <group
        position={[0, 0.72, OVEN_DEPTH / 2 + 0.015]}
        rotation={[doorOpen ? -1.1 : 0, 0, 0]}
        onClick={(event) => {
          event.stopPropagation()
          handleToggle()
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <mesh position={[0, -DOOR_HEIGHT / 2, 0]}>
          <boxGeometry args={[DOOR_WIDTH, DOOR_HEIGHT, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.45} />
        </mesh>
      </group>
    </group>
  )
}
