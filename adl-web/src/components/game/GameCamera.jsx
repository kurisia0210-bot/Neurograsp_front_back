import React, { useRef, useEffect } from 'react'
import { OrthographicCamera, CameraControls } from '@react-three/drei'

export function GameCamera() {
  const controlsRef = useRef()
  const cameraRef = useRef()
  
  // 📷 固定的相机配置（所有调整都在这里完成）
  const FIX_POS = [4, 5, 8]
  const FIX_FOCUS = [1, 1.8, 0.5]  // 🎯 在这里修改焦点（改完会实时生效）
  const FIX_ZOOM = 150          // 🔍 在这里修改缩放

  // 🎬 初始化相机 zoom
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.zoom = FIX_ZOOM
      cameraRef.current.updateProjectionMatrix()
    }
  }, [FIX_ZOOM])

  // 🎬 初始化相机位置和视角（响应式更新）
  useEffect(() => {
    if (!controlsRef.current) return
    
    // 立即设置，不等待下一帧
    controlsRef.current.setLookAt(
      FIX_POS[0], FIX_POS[1], FIX_POS[2],
      FIX_FOCUS[0], FIX_FOCUS[1], FIX_FOCUS[2], 
      false
    )
    
    // 强制更新一次，确保生效
    controlsRef.current.update(0)
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [FIX_FOCUS[0], FIX_FOCUS[1], FIX_FOCUS[2]]) // 🔄 依赖焦点坐标，改变时会重新执行

  return (
    <>
      <OrthographicCamera 
        ref={cameraRef}
        makeDefault 
        position={FIX_POS}
        near={-50} 
        far={200}
      />

      <CameraControls 
        ref={(ref) => {
          controlsRef.current = ref
          // 🚀 在 ref 设置时立即初始化位置
          if (ref) {
            ref.setLookAt(
              FIX_POS[0], FIX_POS[1], FIX_POS[2],
              FIX_FOCUS[0], FIX_FOCUS[1], FIX_FOCUS[2],
              false
            )
          }
        }}
        minZoom={80}       
        maxZoom={200} 
        dollySpeed={0}    // 禁用双指缩放/滚轮
        
        // 🔒 核心锁：禁用旋转和平移
        azimuthRotateSpeed={0} // 禁止水平旋转
        polarRotateSpeed={0}   // 禁止垂直旋转
        truckSpeed={0}         // 禁止平移
        
        // 🔒 完全禁用交互，相机死锁
        enabled={false}
      />
    </>
  )
}