import React from 'react'
import { useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

import healingArchMural from '../../../assets/images/healing-arch-mural.svg'

export function HealingArchMural({ width = 1.55, height = 1.95, ...props }) {
  const { gl } = useThree()
  const muralTexture = useTexture(healingArchMural)

  muralTexture.colorSpace = THREE.SRGBColorSpace
  muralTexture.wrapS = THREE.ClampToEdgeWrapping
  muralTexture.wrapT = THREE.ClampToEdgeWrapping
  muralTexture.minFilter = THREE.LinearMipmapLinearFilter
  muralTexture.magFilter = THREE.LinearFilter
  muralTexture.anisotropy = gl.capabilities.getMaxAnisotropy()
  muralTexture.generateMipmaps = true
  muralTexture.needsUpdate = true

  return (
    <mesh {...props}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={muralTexture} color="#ffffff" toneMapped={false} />
    </mesh>
  )
}

