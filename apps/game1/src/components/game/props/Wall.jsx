import React from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

import bakeBlueTexture from '../../../assets/textures/bake_blue.png'

export function Wall({
  width = 10,
  height = 5,
  depth = 0.3,
  color = '#edf3f7',
  hasWindow = false,
  ...props
}) {
  const bakedWallTexture = useTexture(bakeBlueTexture)
  bakedWallTexture.colorSpace = THREE.SRGBColorSpace
  bakedWallTexture.wrapS = THREE.ClampToEdgeWrapping
  bakedWallTexture.wrapT = THREE.ClampToEdgeWrapping
  bakedWallTexture.repeat.set(0.6836, 1)
  bakedWallTexture.offset.set(0, 0)
  bakedWallTexture.needsUpdate = true

  const plainMaterialProps = {
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
          <meshStandardMaterial {...plainMaterialProps} />
        </mesh>

        <mesh position={[rightCenterX, 0, 0]} receiveShadow>
          <boxGeometry args={[rightWidth, height, depth]} />
          <meshStandardMaterial {...plainMaterialProps} />
        </mesh>

        <mesh position={[windowCenterX, bottomCenterY, 0]} receiveShadow>
          <boxGeometry args={[windowWidth, topBottomHeight, depth]} />
          <meshStandardMaterial {...plainMaterialProps} />
        </mesh>

        <mesh position={[windowCenterX, topCenterY, 0]} receiveShadow>
          <boxGeometry args={[windowWidth, topBottomHeight, depth]} />
          <meshStandardMaterial {...plainMaterialProps} />
        </mesh>
      </group>
    )
  }

  return (
    <mesh receiveShadow {...props}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        map={bakedWallTexture}
        color="#ffffff"
        emissive="#000000"
        emissiveIntensity={0}
        roughness={0.5}
      />
    </mesh>
  )
}

