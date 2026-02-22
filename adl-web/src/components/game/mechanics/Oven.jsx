/**
 * 烤箱组件 - 带有可旋转门的厨房电器
 */

import React from 'react'

/**
 * 烤箱组件
 * @param {object} props - 组件属性
 * @param {Array} props.position - 位置 [x, y, z]
 * @param {boolean} props.doorOpen - 门是否打开
 * @param {function} props.onDoorClick - 点击门时的回调
 * @param {string} props.color - 主体颜色
 * @param {string} props.doorColor - 门颜色
 */
export function Oven({ 
  position = [0, 0, 0],
  doorOpen = false,
  onDoorClick,
  color = "#dfe6e9",
  doorColor = "#b2bec3"
}) {
  const [x, y, z] = position
  
  return (
    <group position={[x, y, z]}>
      {/* 烤箱主体 */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.8]} />
        <meshStandardMaterial 
          color={color} 
          wireframe={true} 
          transparent={true} 
          opacity={0.8} 
        />
      </mesh>
      
      {/* 烤箱门 - 可旋转 */}
      <mesh 
        position={[0.4, 0.8, 0.41]} 
        rotation={[0, doorOpen ? -1.5 : 0, 0]}
        onClick={onDoorClick}
      >
        <mesh position={[-0.4, 0, 0]}>
          <boxGeometry args={[0.8, 1.6, 0.05]} />
          <meshStandardMaterial 
            color={doorOpen ? "#74b9ff" : doorColor} 
            transparent={true} 
            opacity={0.7} 
          />
        </mesh>
      </mesh>
      
      {/* 烤箱控制面板 */}
      <mesh position={[0, 1.6, 0.41]}>
        <boxGeometry args={[0.6, 0.1, 0.05]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>
      
      {/* 烤箱旋钮 */}
      <mesh position={[-0.2, 1.6, 0.46]}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
        <meshStandardMaterial color="#ff7675" />
      </mesh>
      
      <mesh position={[0.2, 1.6, 0.46]}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 8]} />
        <meshStandardMaterial color="#00b894" />
      </mesh>
      
      {/* 烤箱内部（当门打开时可见） */}
      {doorOpen && (
        <mesh position={[0, 0.8, 0.2]}>
          <boxGeometry args={[0.7, 1.5, 0.6]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      )}
    </group>
  )
}

/**
 * 烤箱控制面板组件
 * @param {object} props - 组件属性
 * @param {boolean} props.isOn - 是否开启
 * @param {function} props.onToggle - 切换开关回调
 * @param {number} props.temperature - 温度
 * @param {function} props.onTemperatureChange - 温度变化回调
 */
export function OvenControlPanel({ 
  isOn = false,
  onToggle,
  temperature = 180,
  onTemperatureChange
}) {
  return (
    <div className="bg-gray-800/90 border border-gray-600 rounded-lg p-4 w-64">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">烤箱控制</h3>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded text-sm font-bold ${isOn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isOn ? '关闭' : '开启'}
        </button>
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-300 text-sm mb-2">温度: {temperature}°C</label>
        <input
          type="range"
          min="50"
          max="250"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>50°C</span>
          <span>150°C</span>
          <span>250°C</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => onTemperatureChange(180)}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          180°C
        </button>
        <button
          onClick={() => onTemperatureChange(200)}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          200°C
        </button>
        <button
          onClick={() => onTemperatureChange(220)}
          className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
        >
          220°C
        </button>
      </div>
    </div>
  )
}

export default {
  Oven,
  OvenControlPanel
}