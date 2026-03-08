import React, { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const DEFAULT_SIZE = 0.35
const DEFAULT_DRAG_HEIGHT = 1.701
const RAW_COLOR = '#22c55e'
const HEATED_COLOR = '#f97316'

export function GamePlane({
  position = [0.4, DEFAULT_DRAG_HEIGHT, -0.4],
  size = DEFAULT_SIZE,
  dragHeight = DEFAULT_DRAG_HEIGHT,
  isHeated = false,
  onPositionChange
}) {
  const [isDragging, setIsDragging] = useState(false)

  const floorPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragHeight)
  }, [dragHeight])

  useFrame((state) => {
    if (!isDragging) return

    state.raycaster.setFromCamera(state.pointer, state.camera)
    const targetPoint = new THREE.Vector3()
    const intersects = state.raycaster.ray.intersectPlane(floorPlane, targetPoint)
    if (!intersects) return

    const nextPos = [targetPoint.x, dragHeight, targetPoint.z]
    if (typeof onPositionChange === 'function') {
      onPositionChange(nextPos)
    }
  })

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        event.stopPropagation()
        setIsDragging((prev) => !prev)
      }}
      onPointerOver={() => {
        document.body.style.cursor = isDragging ? 'grabbing' : 'grab'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={isHeated ? HEATED_COLOR : RAW_COLOR} />
    </mesh>
  )
}
