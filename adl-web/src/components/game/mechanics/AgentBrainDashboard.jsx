/**
 * Agent大脑仪表盘组件
 */

import React from 'react'

/**
 * Agent大脑仪表盘
 * @param {object} props - 组件属性
 * @param {object} props.observation - 观察数据
 * @param {object} props.action - 动作数据
 * @param {boolean} props.isThinking - 是否正在思考
 * @param {string} props.title - 标题
 * @param {string} props.className - 自定义类名
 */
export function AgentBrainDashboard({ 
  observation, 
  action, 
  isThinking, 
  title = "🧠 COALA Cortex (Kitchen)",
  className = ""
}) {
  return (
    <div className={`absolute top-4 right-4 w-96 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-2xl z-50 border border-green-500/30 overflow-hidden ${className}`}>
      <div className="flex justify-between items-center border-b border-green-500/50 pb-2 mb-2">
        <h2 className="font-bold text-sm">{title}</h2>
        <span className={`w-3 h-3 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
      </div>
      <div className="mb-4">
        <h3 className="text-gray-400 mb-1">[PERCEPTION]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 h-32 overflow-y-auto text-[10px] whitespace-pre-wrap">
          {observation ? JSON.stringify(observation, null, 2) : "Initializing..."}
        </pre>
      </div>
      <div>
        <h3 className="text-gray-400 mb-1">[INTENT]</h3>
        <pre className="bg-gray-900 p-2 rounded opacity-80 text-yellow-300 text-[10px] whitespace-pre-wrap">
          {action ? JSON.stringify(action, null, 2) : "Waiting..."}
        </pre>
      </div>
    </div>
  )
}

/**
 * 状态显示组件
 * @param {object} props - 组件属性
 * @param {object} props.agentState - Agent状态
 * @param {string} props.userInstruction - 用户指令
 * @param {boolean} props.isThinking - 是否正在思考
 * @param {boolean} props.autoLoop - 是否自动循环
 * @param {object} props.lastAction - 最后动作
 */
export function AgentStatusDisplay({ 
  agentState, 
  userInstruction, 
  isThinking, 
  autoLoop,
  lastAction,
  className = ""
}) {
  return (
    <div className={`absolute top-4 left-4 z-50 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs max-w-xs ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
        <span className="font-bold">Agent 状态</span>
      </div>
      <div className="text-gray-300 text-[10px]">
        <div>Location: {agentState?.location || "unknown"}</div>
        <div>Holding: {agentState?.holding || "empty"}</div>
        <div>Task: {userInstruction || "none"}</div>
        <div>Mode: {autoLoop ? "auto" : "manual"}</div>
        {lastAction && (
          <div className="mt-2 text-yellow-300">
            Last action: {lastAction.type}
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  AgentBrainDashboard,
  AgentStatusDisplay
}