import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Environment, ContactShadows } from '@react-three/drei'

const THEME = {
  playing: {
    bg: '#edf3f7',        
    
    // 💡 严苛的灯光配置
    ambient: '#1e3a8a',   // 深蓝环境光
    ambientIntensity: 0.3, // ⬇️ 极低，制造高反差

    sun: '#10b981',       // 翡翠绿主光
    sunIntensity: 1.5      
  },
  success: {
    bg: '#fff8f0',        
    ambient: '#ffaa55',   
    ambientIntensity: 0.5,
    sun: '#ff8800',       
    sunIntensity: 2.0     
  }
}

export function GameLighting({ isSuccess = false }) {
  const { scene } = useThree()
  const sunRef = useRef()
  const ambientRef = useRef()
  
  const targetBg = new THREE.Color()
  const targetAmbient = new THREE.Color()
  const targetSun = new THREE.Color()

  useFrame((state, delta) => {
    const target = isSuccess ? THEME.success : THEME.playing
    const speed = delta * 2

    // 1. 渐变背景 (不再处理 Fog)
    if (scene.background) {
      targetBg.set(target.bg)
      scene.background.lerp(targetBg, speed)
    }
    // ❌ 移除了 scene.fog 处理

    // 2. 渐变灯光
    if (ambientRef.current) {
      targetAmbient.set(target.ambient)
      ambientRef.current.color.lerp(targetAmbient, speed)
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, target.ambientIntensity, speed)
    }

    if (sunRef.current) {
      targetSun.set(target.sun)
      sunRef.current.color.lerp(targetSun, speed)
      sunRef.current.intensity = THREE.MathUtils.lerp(sunRef.current.intensity, target.sunIntensity, speed)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} />
      
      <directionalLight 
        ref={sunRef}
        position={[5, 10, 5]} 
        castShadow
        shadow-bias={-0.0001}
      />

      {/* 使用简单的环境光替代外部HDRI，避免网络加载问题 */}
      <ambientLight intensity={0.2} color="#ffffff" />
      <hemisphereLight 
        skyColor="#87CEEB" 
        groundColor="#8B7355" 
        intensity={0.5}
      />

      {/* 接触阴影：因为没有了雾气遮挡，阴影会看得很清楚，保留它增加落地感 */}
      <ContactShadows opacity={0.4} scale={20} blur={2.5} far={2} color="#0f172a" />

      {/* ❌ 彻底删除了 <fog /> */}
      <color attach="background" args={['#edf3f7']} />
    </>
  )
}