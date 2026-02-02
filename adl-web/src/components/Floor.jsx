import React from 'react'

export function Floor({ width = 12, depth = 12, color = '#dcd7cf', ...props }) {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.01, 0]} 
      receiveShadow 
      {...props}
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial 
        color={color} 
        emissive="#000000"     
        emissiveIntensity={0}  
        roughness={0.5} 
      />
    </mesh>
  )
}