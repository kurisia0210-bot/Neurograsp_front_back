import React, { useState } from 'react';
import { useAgentBridge } from '../components/game/hook/useAgentBridge';

export function Playground() {
  const { isThinking, lastAction, verdict, callAgent } = useAgentBridge();
  const [failCount, setFailCount] = useState(0);
  const [triggered, setTriggered] = useState(false);

  // 符合后端Schema的测试数据
  const testObservation = {
    timestamp: Date.now() / 1000,
    agent: { 
      location: "table_center",  // 必须是 PoiName 枚举值
      holding: null              // 必须是 ItemName 枚举值或 null
    },
    nearby_objects: [
      {
        id: "red_cube",          // 必须是 ItemName 枚举值
        state: "on_table",       // 必须是 ObjectState 枚举值
        relation: "on the table"
      },
      {
        id: "fridge_door",       // 必须是 ItemName 枚举值
        state: "closed",         // 必须是 ObjectState 枚举值
        relation: "front of agent"
      }
    ],
    global_task: `MVP Test: Fail count = ${failCount}. ${failCount >= 3 ? 'Triggering Agent encouragement!' : 'Keep trying...'}`
  };

  const handleFailClick = async () => {
    const newFailCount = failCount + 1;
    setFailCount(newFailCount);
    
    console.log(`🎯 Fail count: ${newFailCount}`);
    
    // 短路逻辑：当fail=3时触发通信
    if (newFailCount === 3 && !triggered) {
      setTriggered(true);
      console.log("🎯 触发短路逻辑：fail=3，请求Agent鼓励");
      await callAgent(testObservation);
    }
  };

  const handleReset = () => {
    setFailCount(0);
    setTriggered(false);
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold text-white mb-8">🎯 MVP Short-Circuit Test</h1>
      
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
        {/* MVP测试区域 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Fail Counter</h2>
            <div className={`text-2xl font-bold ${failCount >= 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              {failCount} / 3
            </div>
          </div>
          
          {/* Fail按钮 */}
          <button
            onClick={handleFailClick}
            disabled={failCount >= 3 || isThinking}
            className={`w-full py-4 rounded-lg font-bold text-lg mb-4 transition-all ${
              failCount >= 3 
                ? 'bg-red-700 cursor-not-allowed' 
                : isThinking
                ? 'bg-yellow-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 active:scale-95'
            }`}
          >
            {failCount >= 3 ? '🎯 Triggered!' : '➕ Add Fail'}
          </button>
          
          {/* 重置按钮 */}
          <button
            onClick={handleReset}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-all"
          >
            🔄 Reset Test
          </button>
          
          {/* 短路逻辑状态 */}
          <div className={`mt-4 p-3 rounded text-center ${failCount >= 3 ? 'bg-red-900/30 text-red-300' : 'bg-gray-900/30 text-gray-400'}`}>
            {failCount >= 3 
              ? '🎯 Short-circuit triggered! Agent called for encouragement.' 
              : `Need ${3 - failCount} more fails to trigger Agent`}
          </div>
        </div>

        {/* 状态显示 */}
        <div className="space-y-4 border-t border-gray-700 pt-6">
          <div className="flex justify-between">
            <span className="text-gray-400">Agent Status:</span>
            <span className={isThinking ? 'text-yellow-400' : 'text-green-400'}>
              {isThinking ? 'Thinking...' : 'Ready'}
            </span>
          </div>

          {verdict && (
            <div className={`p-3 rounded ${verdict.verdict === 'BLOCK' ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
              <div className="font-bold">
                {verdict.verdict === 'BLOCK' ? '🛡️ BLOCKED' : '✅ ALLOWED'}
              </div>
              {verdict.message && (
                <div className="text-sm mt-1 text-gray-300">{verdict.message}</div>
              )}
            </div>
          )}

          {lastAction && (
            <div className="border-t border-gray-700 pt-4">
              <div className="text-gray-400 text-sm mb-1">Last Action:</div>
              <div className="font-mono text-sm bg-gray-900 p-3 rounded">
                <div>Type: <span className="text-blue-400">{lastAction.type}</span></div>
                {lastAction.content && (
                  <div className="mt-1">Content: {lastAction.content}</div>
                )}
                {lastAction._status === 'BLOCKED' && (
                  <div className="mt-1 text-red-400">Reason: {lastAction._reason}</div>
                )}
              </div>
            </div>
          )}

          {/* 测试说明 */}
          <div className="text-xs text-gray-500 mt-4">
            <p className="mb-1">🎯 <strong>MVP Test Logic:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Click "Add Fail" to increment counter</li>
              <li>When fail count reaches 3, Agent is automatically called</li>
              <li>Only one communication per trigger cycle</li>
              <li>Reset to test again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}