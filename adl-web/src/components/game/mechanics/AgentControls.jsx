/**
 * Agent控制组件
 */

import React from 'react'

/**
 * Agent控制栏组件
 * @param {object} props - 组件属性
 * @param {function} props.onTick - 单步执行回调
 * @param {function} props.onToggleAutoLoop - 切换自动循环回调
 * @param {function} props.onReset - 重置回调
 * @param {boolean} props.isThinking - 是否正在思考
 * @param {boolean} props.autoLoop - 是否自动循环
 * @param {string} props.userInstruction - 用户指令
 * @param {function} props.setUserInstruction - 设置用户指令回调
 * @param {function} props.onReadInitialSnapshot - Read initial world snapshot callback (optional)
 * @param {string} props.className - 自定义类名
 */
export function AgentControls({ 
  onTick,
  onToggleAutoLoop,
  onReset,
  isThinking,
  autoLoop,
  userInstruction,
  setUserInstruction,
  onReadInitialSnapshot,
  className = ""
}) {
  return (
    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-96 ${className}`}>
      <div className="flex gap-2 bg-black/50 p-2 rounded backdrop-blur-md border border-gray-600">
        <input
          type="text"
          value={userInstruction}
          onChange={(e) => setUserInstruction(e.target.value)}
          className="flex-1 bg-transparent text-white outline-none font-mono text-sm"
          placeholder="输入任务，例如: Put red cube in fridge"
        />
      </div>
      <div className="flex gap-4 justify-center">
        <button 
          onClick={onTick} 
          disabled={isThinking || autoLoop} 
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          STEP
        </button>
        <button 
          onClick={onToggleAutoLoop} 
          className={`px-6 py-2 font-bold rounded text-white shadow-lg transition-colors ${autoLoop ? 'bg-red-600 animate-pulse hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {autoLoop ? "STOP" : "AUTO"}
        </button>
        <button 
          onClick={onReset}
          className="px-6 py-2 bg-gray-600 text-white font-bold rounded shadow-lg hover:bg-gray-700 transition-colors"
        >
          RESET
        </button>
        {onReadInitialSnapshot && (
          <button 
            onClick={onReadInitialSnapshot}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded shadow-lg hover:bg-purple-700 transition-colors"
          >
            READ SNAPSHOT
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 返回按钮组件
 * @param {object} props - 组件属性
 * @param {function} props.onBack - 返回回调
 * @param {string} props.label - 按钮标签
 * @param {string} props.className - 自定义类名
 */
export function BackButton({ 
  onBack, 
  label = "返回主页面",
  className = ""
}) {
  return (
    <button 
      onClick={onBack} 
      className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all ${className}`}
    >
      <span>⬅️</span> {label}
    </button>
  )
}

/**
 * 任务输入组件
 * @param {object} props - 组件属性
 * @param {string} props.value - 输入值
 * @param {function} props.onChange - 变化回调
 * @param {function} props.onSubmit - 提交回调
 * @param {Array} props.exampleTasks - 示例任务列表
 * @param {string} props.placeholder - 占位符
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.className - 自定义类名
 */
export function TaskInput({ 
  value,
  onChange,
  onSubmit,
  exampleTasks = [],
  placeholder = "Enter a task, e.g. Put red cube in fridge",
  disabled = false,
  className = ""
}) {
  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
          disabled={disabled}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-lg transition-colors"
        >
          {disabled ? 'Parsing...' : 'Parse'}
        </button>
      </div>

      {exampleTasks.length > 0 && (
        <div className="mt-3">
          <p className="text-gray-600 text-sm mb-2">Example tasks:</p>
          <div className="flex flex-wrap gap-2">
            {exampleTasks.map((task, index) => (
              <button
                key={index}
                onClick={() => {
                  onChange({ target: { value: task } })
                  setTimeout(() => onSubmit(), 100)
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                {task.length > 30 ? task.substring(0, 30) + '...' : task}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default {
  AgentControls,
  BackButton,
  TaskInput
}