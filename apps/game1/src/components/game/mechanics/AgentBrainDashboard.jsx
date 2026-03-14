import React from 'react'

export function AgentBrainDashboard({
  observation,
  action,
  isThinking,
  title = 'COALA Cortex (Kitchen)',
  className = '',
  embedded = false
}) {
  const layoutClass = embedded
    ? 'relative w-full bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-2xl border border-green-500/30 overflow-hidden'
    : 'absolute top-4 right-4 w-96 bg-black/90 text-green-400 p-4 rounded-lg font-mono text-xs shadow-2xl z-50 border border-green-500/30 overflow-hidden'

  const perceptionClass = embedded
    ? 'bg-gray-900 p-2 rounded opacity-80 min-h-44 max-h-64 overflow-y-auto text-[10px] whitespace-pre-wrap'
    : 'bg-gray-900 p-2 rounded opacity-80 h-32 overflow-y-auto text-[10px] whitespace-pre-wrap'

  const intentClass = embedded
    ? 'bg-gray-900 p-2 rounded opacity-80 text-yellow-300 text-[10px] whitespace-pre-wrap min-h-36 max-h-64 overflow-y-auto'
    : 'bg-gray-900 p-2 rounded opacity-80 text-yellow-300 text-[10px] whitespace-pre-wrap'

  return (
    <div className={`${layoutClass} ${className}`}>
      <div className="flex justify-between items-center border-b border-green-500/50 pb-2 mb-2">
        <h2 className="font-bold text-sm">{title}</h2>
        <span className={`w-3 h-3 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
      </div>
      <div className="mb-4">
        <h3 className="text-gray-400 mb-1">[PERCEPTION]</h3>
        <pre className={perceptionClass}>
          {observation ? JSON.stringify(observation, null, 2) : 'Initializing...'}
        </pre>
      </div>
      <div>
        <h3 className="text-gray-400 mb-1">[INTENT]</h3>
        <pre className={intentClass}>
          {action ? JSON.stringify(action, null, 2) : 'Waiting...'}
        </pre>
      </div>
    </div>
  )
}

export function AgentStatusDisplay({
  agentState,
  userInstruction,
  isThinking,
  autoLoop,
  lastAction,
  className = ''
}) {
  return (
    <div className={`absolute top-4 left-4 z-50 bg-black/80 text-green-400 p-3 rounded-lg font-mono text-xs max-w-xs ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'}`}></span>
        <span className="font-bold">Agent Status</span>
      </div>
      <div className="text-gray-300 text-[10px]">
        <div>Location: {agentState?.location || 'unknown'}</div>
        <div>Holding: {agentState?.holding || 'empty'}</div>
        <div>Task: {userInstruction || 'none'}</div>
        <div>Mode: {autoLoop ? 'auto' : 'manual'}</div>
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
