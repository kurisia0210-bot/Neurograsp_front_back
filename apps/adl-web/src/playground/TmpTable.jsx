import React from 'react'

export function TmpTable({
  position = [0, 0, 0],
  size = [4, 0.85, 2],
  color = '#636e72'
}) {
  const [width, height, depth] = size
  const [x, y, z] = position

  return (
    <mesh position={[x, y + height / 2, z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
