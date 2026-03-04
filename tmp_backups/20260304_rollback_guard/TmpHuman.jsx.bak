import React from 'react'

export function TmpHuman({
  position = [1.5, 0, 2],
  capsuleRadius = 0.3,
  capsuleLength = 1,
  capsuleSegments = 4,
  color = 'yellow',
  wireframe = true
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[capsuleRadius, capsuleLength, capsuleSegments]} />
        <meshStandardMaterial color={color} wireframe={wireframe} />
      </mesh>
    </group>
  )
}
