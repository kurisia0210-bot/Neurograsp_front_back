import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FRIDGE_DOOR_OPEN_ANGLE = 2.0
const FRIDGE_DOOR_CLOSED_ANGLE = 0
const FRIDGE_DOOR_LERP_SPEED = 8

export function Refridge({
  position = [-3, 0, -0.5],
  isOpen = false,
  onToggle = () => {}
}) {
  const doorGroupRef = useRef(null)

  useFrame((_, delta) => {
    if (!doorGroupRef.current) return
    const targetAngle = isOpen ? FRIDGE_DOOR_OPEN_ANGLE : FRIDGE_DOOR_CLOSED_ANGLE
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(
      doorGroupRef.current.rotation.y,
      targetAngle,
      Math.min(1, delta * FRIDGE_DOOR_LERP_SPEED)
    )
  })

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="#74b9ff" wireframe={true} transparent={true} opacity={0.8} />
      </mesh>
      <mesh
        ref={doorGroupRef}
        position={[0.5, 1, 0.51]}
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
      >
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[1, 2, 0.05]} />
          <meshStandardMaterial
            color={isOpen ? '#74b9ff' : '#b2bec3'}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      </mesh>
    </group>
  )
}
