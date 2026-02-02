import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Mover({ 
  children, 
  targetPosition = null, 
  targetRotation = null, // ✨ 新增：支持旋转
  speed = 5,             
  physics = false,       // ✨ 新增：是否为物理模式
  rigidBodyApi = null,   // ✨ 新增：传入 RigidBody 的 API
  onComplete,            
  ...props               
}) {
  const groupRef = useRef()
  const [hasArrived, setHasArrived] = useState(false) 

  useFrame((state, delta) => {
    // 1. 目标检查
    if (!targetPosition) return
    if (hasArrived) return

    const targetPosVec = new THREE.Vector3(...targetPosition)
    
    // === 🏃‍♂️ 移动逻辑 ===
    // 计算下一步的位置 (Lerp)
    // 技巧：如果是物理模式，我们不能直接读 ref.position，需要记录当前位置
    // 这里简化处理：假设每一帧我们都计算新的位置
    
    let currentPos, nextPos
    
    if (physics && rigidBodyApi) {
        currentPos = rigidBodyApi.translation()
        // 物理插值：手动计算 Vector3 Lerp
        const currentVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)
        nextPos = currentVec.lerp(targetPosVec, delta * speed)
        
        // 应用物理位移
        rigidBodyApi.setNextKinematicTranslation(nextPos)
    } else {
        // 普通模式
        if (!groupRef.current) return
        groupRef.current.position.lerp(targetPosVec, delta * speed)
        nextPos = groupRef.current.position
    }

    // === 🔄 旋转逻辑 (新增) ===
    if (targetRotation) {
        const targetRotEuler = new THREE.Euler(...targetRotation)
        const targetQuat = new THREE.Quaternion().setFromEuler(targetRotEuler)
        
        if (physics && rigidBodyApi) {
             const currentRot = rigidBodyApi.rotation()
             const currentQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w)
             currentQuat.slerp(targetQuat, delta * speed) // 球面插值更平滑
             rigidBodyApi.setNextKinematicRotation(currentQuat)
        } else if (groupRef.current) {
             groupRef.current.quaternion.slerp(targetQuat, delta * speed)
        }
    }

    // === 🏁 到达检测 ===
    // 简单判断位置距离
    const dist = physics && rigidBodyApi 
        ? new THREE.Vector3(rigidBodyApi.translation().x, rigidBodyApi.translation().y, rigidBodyApi.translation().z).distanceTo(targetPosVec)
        : groupRef.current.position.distanceTo(targetPosVec)

    if (dist < 0.05) {
      setHasArrived(true)
      if (onComplete) onComplete()
    }
  })

  // 重置逻辑
  useEffect(() => {
    if (targetPosition) setHasArrived(false)
  }, [targetPosition, targetRotation]) // 监听旋转变化

  return <group ref={groupRef} {...props}>{children}</group>
}