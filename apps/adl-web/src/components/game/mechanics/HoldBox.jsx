/**
 * 手持物品显示组件
 */

import React from 'react'

/**
 * 手持物品显示框
 * @param {object} props - 组件属性
 * @param {string} props.holdingItem - 手持物品ID
 * @param {Array} props.cubes - 方块列表
 * @param {string} props.title - 标题
 * @param {string} props.className - 自定义类名
 */
export function HoldBox({ 
  holdingItem, 
  cubes = [], 
  title = "手持物品",
  className = ""
}) {
  if (!holdingItem) {
    return (
      <div className={`bg-gray-800/80 border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center ${className}`}>
        <div className="text-gray-400 text-sm mb-2">{title}</div>
        <div className="text-gray-500 text-xs">空手</div>
      </div>
    )
  }

  const cube = cubes.find(c => c.id === holdingItem)
  if (!cube) {
    return (
      <div className={`bg-gray-800/80 border-2 border-gray-500 rounded-lg p-4 flex flex-col items-center justify-center ${className}`}>
        <div className="text-gray-300 text-sm mb-2">{title}</div>
        <div className="text-gray-400 text-xs">{holdingItem}</div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800/80 border-2 border-gray-500 rounded-lg p-4 flex flex-col items-center justify-center ${className}`}>
      <div className="text-gray-300 text-sm mb-2">{title}</div>
      <div className="flex items-center gap-3">
        <div 
          className="w-6 h-6 rounded-sm"
          style={{ backgroundColor: cube.color }}
        />
        <div className="text-white font-mono text-sm">{cube.name}</div>
      </div>
      <div className="text-gray-400 text-xs mt-2">状态: {cube.state}</div>
    </div>
  )
}

/**
 * 手持物品管理器显示组件
 * @param {object} props - 组件属性
 * @param {object} props.holdingManager - 手持物品管理器
 * @param {Array} props.cubes - 方块列表
 * @param {string} props.title - 标题
 * @param {string} props.className - 自定义类名
 */
export function HoldBoxWithManager({ 
  holdingManager, 
  cubes = [], 
  title = "手持物品",
  className = ""
}) {
  const holdingCube = holdingManager?.holdingCube
  
  if (!holdingCube) {
    return (
      <div className={`bg-gray-800/80 border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center ${className}`}>
        <div className="text-gray-400 text-sm mb-2">{title}</div>
        <div className="text-gray-500 text-xs">空手</div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800/80 border-2 border-gray-500 rounded-lg p-4 flex flex-col items-center justify-center ${className}`}>
      <div className="text-gray-300 text-sm mb-2">{title}</div>
      <div className="flex items-center gap-3">
        <div 
          className="w-6 h-6 rounded-sm"
          style={{ backgroundColor: holdingCube.color }}
        />
        <div className="text-white font-mono text-sm">{holdingCube.name}</div>
      </div>
      <div className="text-gray-400 text-xs mt-2">状态: {holdingCube.state}</div>
    </div>
  )
}

export default {
  HoldBox,
  HoldBoxWithManager
}