import React from 'react'

export function Wall({
  width = 10,
  height = 5,
  depth = 0.3,
  color = '#edf3f7',
  hasWindow = false,
  ...props
}) {
  const materialProps = {
    color,
    emissive: '#000000',
    emissiveIntensity: 0,
    roughness: 0.5
  }

  if (hasWindow) {
    const windowWidth = 2
    const windowHeight = 2

    const leftWidth = 4
    const rightWidth = 2
    const topBottomHeight = (height - windowHeight) / 2

    const leftCenterX = -2
    const rightCenterX = 3
    const windowCenterX = 1
    const topCenterY = windowHeight / 2 + topBottomHeight / 2
    const bottomCenterY = -topCenterY

    return (
      <group {...props}>
        <mesh position={[leftCenterX, 0, 0]} receiveShadow>
          <boxGeometry args={[leftWidth, height, depth]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>

        <mesh position={[rightCenterX, 0, 0]} receiveShadow>
          <boxGeometry args={[rightWidth, height, depth]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>

        <mesh position={[windowCenterX, bottomCenterY, 0]} receiveShadow>
          <boxGeometry args={[windowWidth, topBottomHeight, depth]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>

        <mesh position={[windowCenterX, topCenterY, 0]} receiveShadow>
          <boxGeometry args={[windowWidth, topBottomHeight, depth]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh receiveShadow {...props}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}