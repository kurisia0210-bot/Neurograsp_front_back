import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const CUBE_SIZE = 0.25
const HALF_WIDTH = CUBE_SIZE / 2
const CUT_FACE_THICKNESS = 0.001
const NO_RAYCAST = () => null

export function WholeCube({
  position,
  onDrag,
  slicingZonePos,
  slicingZoneSize,
  dragHeight = 0,
  isHeldByAgent = false,
  allowClickThroughWhileDragging = false,
  onPickUp = () => {},
  onPlace = () => {}
}) {
  const meshRef = useRef()
  const pendingPickupRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const floorPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragHeight)
  }, [dragHeight])

  useEffect(() => {
    if (meshRef.current && !isDragging && position && Array.isArray(position)) {
      meshRef.current.position.set(...position)
    }
  }, [position, isDragging])

  useEffect(() => {
    if (pendingPickupRef.current && isHeldByAgent) {
      pendingPickupRef.current = false
      return
    }
    if (isDragging && !isHeldByAgent && !pendingPickupRef.current) {
      setIsDragging(false)
    }
  }, [isDragging, isHeldByAgent])

  useFrame((state) => {
    if (!isDragging || !meshRef.current) return

    state.raycaster.setFromCamera(state.pointer, state.camera)
    const targetPoint = new THREE.Vector3()
    state.raycaster.ray.intersectPlane(floorPlane, targetPoint)

    if (!targetPoint) return

    meshRef.current.position.set(targetPoint.x, dragHeight, targetPoint.z)

    const newPos = [targetPoint.x, dragHeight, targetPoint.z]
    const halfSizeX = slicingZoneSize[0] / 2
    const halfSizeZ = slicingZoneSize[1] / 2

    const inZoneX = Math.abs(targetPoint.x - slicingZonePos[0]) < halfSizeX
    const inZoneZ = Math.abs(targetPoint.z - slicingZonePos[2]) < halfSizeZ

    if (inZoneX && inZoneZ) {
      onDrag({ position: newPos, shouldSlice: true })
    } else {
      onDrag(newPos)
    }
  })

  const handleClick = (e) => {
    if (!isDragging) {
      e.stopPropagation()
      pendingPickupRef.current = true
      setIsDragging(true)
      onPickUp()
      return
    }

    if (allowClickThroughWhileDragging) {
      return
    }

    setIsDragging(false)
    onPlace()
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
      raycast={allowClickThroughWhileDragging && isDragging ? NO_RAYCAST : undefined}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      <meshStandardMaterial color={isDragging ? '#ff9f43' : '#ff6b6b'} />
    </mesh>
  )
}

export function HalfCube({ initialPos, targetPos, onPlaced, rotation, type, dragHeight = 0 }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const floorPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragHeight)
  }, [dragHeight])

  useFrame((state) => {
    if (isLocked || !isDragging || !meshRef.current) return

    state.raycaster.setFromCamera(state.pointer, state.camera)
    const targetPoint = new THREE.Vector3()
    state.raycaster.ray.intersectPlane(floorPlane, targetPoint)

    if (!targetPoint) return

    meshRef.current.position.set(targetPoint.x, dragHeight, targetPoint.z)

    const dist = Math.sqrt(
      Math.pow(targetPoint.x - targetPos[0], 2) + Math.pow(targetPoint.z - targetPos[2], 2)
    )

    if (dist < 0.3) {
      setIsLocked(true)
      meshRef.current.position.set(targetPos[0], targetPos[1], targetPos[2])
      meshRef.current.rotation.set(0, 0, 0)
      onPlaced()
    }
  })

  const halfArgs = [HALF_WIDTH, CUBE_SIZE, CUBE_SIZE]
  const cutFaceOffset = HALF_WIDTH / 2 + 0.0005

  return (
    <group
      ref={meshRef}
      position={initialPos}
      rotation={!isLocked ? rotation : [0, 0, 0]}
      onClick={(e) => {
        if (isLocked) return
        e.stopPropagation()
        setIsDragging(!isDragging)
      }}
      onPointerOver={() => !isLocked && (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <mesh>
        <boxGeometry args={halfArgs} />
        <meshStandardMaterial color={isLocked ? '#2ecc71' : '#ff6b6b'} />
        <mesh position={[type === 'left' ? cutFaceOffset : -cutFaceOffset, 0, 0]}>
          <boxGeometry args={[CUT_FACE_THICKNESS, CUBE_SIZE, CUBE_SIZE]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      </mesh>
    </group>
  )
}
