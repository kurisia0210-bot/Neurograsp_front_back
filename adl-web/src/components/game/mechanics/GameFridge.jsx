import React from 'react'

export function GameFridge({
  position = [-3, 0, -0.5],
  doorAngle = 0,
  isOpen = false,
  onToggleDoor = () => {},
  dropCenter = [-2.35, -0.5],
  dropHalfSize = [1.05, 0.85]
}) {
  return (
    <>
      <group position={position}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#74b9ff" wireframe={true} transparent={true} opacity={0.8} />
        </mesh>
        <mesh
          position={[0.5, 1, 0.51]}
          rotation={[0, doorAngle, 0]}
          onClick={onToggleDoor}
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

      <mesh position={[dropCenter[0], 1.15, dropCenter[1]]}>
        <boxGeometry args={[dropHalfSize[0] * 2, 1.1, dropHalfSize[1] * 2]} />
        <meshStandardMaterial
          color={isOpen ? '#22c55e' : '#64748b'}
          transparent
          opacity={isOpen ? 0.18 : 0.08}
          wireframe
        />
      </mesh>
    </>
  )
}
