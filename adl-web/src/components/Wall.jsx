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
    color: color,
    emissive: "#000000",
    emissiveIntensity: 0,
    roughness: 0.5
  }

  // 🪟 模式 A: 带窗户的墙 (结构硬编码)
  if (hasWindow) {
    return (
      <group {...props}>
        {/* 左半边 */}
        <mesh position={[-2, 0, 0]} receiveShadow>
            <boxGeometry args={[4, height, depth]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
        {/* 右半边 */}
        <mesh position={[3, 0, 0]} receiveShadow>
            <boxGeometry args={[2, height, depth]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
        {/* 窗户下沿 */}
        <mesh position={[1, -1.75, 0]} receiveShadow>
            <boxGeometry args={[2, 1.5, depth]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
        {/* 窗户上沿 */}
        <mesh position={[1, 1.75, 0]} receiveShadow>
            <boxGeometry args={[2, 1.5, depth]} />
            <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    )
  }

  // 🧱 模式 B: 普通实心墙
  return (
    <mesh receiveShadow {...props}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}