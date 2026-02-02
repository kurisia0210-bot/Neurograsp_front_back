import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 📏 定义标准尺寸常量，方便统一修改
const CUBE_SIZE = 0.25
const HALF_WIDTH = CUBE_SIZE / 2
const CUT_FACE_THICKNESS = 0.001 // 切面贴图的厚度

// 📦 组件 1: 完整的方块
export function WholeCube({ position, onDrag, slicingZonePos, slicingZoneSize, dragHeight = 0 }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  
  // 🔧 修复1：射线检测平面必须跟物体在同一高度！
  // 平面方程: normal=(0,1,0), constant = -dragHeight
  // 这样射线才能检测到"桌面"这一层，而不是"地板"
  const floorPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragHeight)
  }, [dragHeight])

  useEffect(() => {
    if (meshRef.current && !isDragging && position && Array.isArray(position)) {
      meshRef.current.position.set(...position)
    }
  }, [position, isDragging])

  useFrame((state) => {
    if (isDragging && meshRef.current) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const targetPoint = new THREE.Vector3()
      state.raycaster.ray.intersectPlane(floorPlane, targetPoint)
      
      if (targetPoint) {
        // 更新位置
        meshRef.current.position.x = targetPoint.x
        meshRef.current.position.y = dragHeight // 🔒 锁死高度
        meshRef.current.position.z = targetPoint.z
        
        // 逻辑判断
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
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); setIsDragging(!isDragging) }}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* 🔧 修复2：使用统一的 CUBE_SIZE (0.25) */}
      <boxGeometry args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]} />
      <meshStandardMaterial color={isDragging ? '#ff9f43' : '#ff6b6b'} />
    </mesh>
  )
}

// 📦 组件 2: 半个方块
export function HalfCube({ initialPos, targetPos, onPlaced, rotation, type, dragHeight = 0 }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [isLocked, setIsLocked] = useState(false) 
  
  // 🔧 修复1：同样修正射线平面
  const floorPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragHeight)
  }, [dragHeight])

  useFrame((state) => {
    if (isLocked) return 

    if (isDragging && meshRef.current) {
      state.raycaster.setFromCamera(state.pointer, state.camera)
      const targetPoint = new THREE.Vector3()
      state.raycaster.ray.intersectPlane(floorPlane, targetPoint)
      
      if (targetPoint) {
        meshRef.current.position.x = targetPoint.x
        meshRef.current.position.z = targetPoint.z
        meshRef.current.position.y = dragHeight

        const dist = Math.sqrt(
          Math.pow(targetPoint.x - targetPos[0], 2) + 
          Math.pow(targetPoint.z - targetPos[2], 2)
        )

        // 判定距离稍微放宽一点，因为物体变小了
        if (dist < 0.3) {
          setIsLocked(true) 
          meshRef.current.position.set(targetPos[0], targetPos[1], targetPos[2]) 
          meshRef.current.rotation.set(0, 0, 0) 
          onPlaced() 
        }
      }
    }
  })

  // 📐 计算半块的几何参数
  // 宽度 = 0.125, 高度 = 0.25, 深度 = 0.25
  const halfArgs = [HALF_WIDTH, CUBE_SIZE, CUBE_SIZE] 
  
  // 📐 计算白色切面的位置偏移
  // 切面需要刚好贴在中间切开的那一侧
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
      {/* 🔴 红色果肉部分 */}
      <mesh>
         <boxGeometry args={halfArgs} />
         <meshStandardMaterial color={isLocked ? '#2ecc71' : '#ff6b6b'} />
         
         {/* ⚪️ 白色切面部分 (作为子物体) */}
         {/* 修复：切面大小必须完全匹配果肉尺寸，避免薄片效果 */}
         {/* 位置根据 type (left/right) 决定是在左侧还是右侧 */}
         <mesh 
            position={[type === 'left' ? cutFaceOffset : -cutFaceOffset, 0, 0]} 
         >
           <boxGeometry args={[CUT_FACE_THICKNESS, CUBE_SIZE, CUBE_SIZE]} />
           <meshStandardMaterial color="#fff" />
         </mesh>
      </mesh>
    </group>
  )
}