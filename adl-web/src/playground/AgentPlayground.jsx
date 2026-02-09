import React, { useState, useEffect } from 'react';
import { useAgentBridge } from '../components/game/hook/useAgentBridge';

export function AgentPlayground() {
  // === 1. 使用 Agent Bridge Hook ===
  const { isThinking, lastAction, verdict, callAgent } = useAgentBridge();
  
  // === 2. 游戏状态 ===
  const [targetLength, setTargetLength] = useState(3); // 默认难度 3
  const [targetNum, setTargetNum] = useState("123");
  const [lastObs, setLastObs] = useState(null);
  
  // 用于模拟连续失败次数，辅助生成 Observation
  const [failCount, setFailCount] = useState(0);

  // 初始化生成数字
  useEffect(() => {
    generateNewTarget(targetLength);
  }, []);

  const generateNewTarget = (len) => {
    let num = "";
    for (let i = 0; i < len; i++) num += Math.floor(Math.random() * 10).toString();
    setTargetNum(num);
  };

  // === 2. 模拟感知 (Perception) ===
  const perceiveWorld = (event) => {
    // 这里的格式必须精确，一个标点都不能错，否则正则抓不到
    const taskString = `Game: Memory Dialing. 
  Target Number: ${targetNum} (Length: ${targetLength}). 
  Current Event: User input was ${event}. 
  Recent Failures: ${failCount}.`; // 👈 关键点：必须包含 "Recent Failures: 数字"

    return {
      timestamp: Date.now() / 1000,
      agent: { location: "table_center", holding: null }, // 假装在桌子旁
      nearby_objects: [], 
      global_task: taskString // 👈 发给后端的暗号
    };
  };
  // === 3. 使用 Agent Bridge 的新 Tick 逻辑 ===
  const tick = async (event) => {
    // 1. 感知
    const obs = perceiveWorld(event);
    setLastObs(obs);
    
    // 更新本地计数器 (仅用于 UI 显示和辅助)
    if (event === 'WRONG') setFailCount(c => c + 1);
    if (event === 'CORRECT') setFailCount(0);

    // 2. 使用 Agent Bridge 发送给大脑
    await callAgent(obs);
    
    // 3. 执行动作 (在 useEffect 中处理)
  };

  // === 4. 监听 lastAction 变化并执行动作 ===
  useEffect(() => {
    if (!lastAction) return;
    
    console.log("🦾 Processing action from hook:", lastAction);
    
    // 检查是否被 Block
    if (lastAction._status === 'BLOCKED') {
      console.warn(`🛡️ Action blocked: ${lastAction._reason}`);
      return;
    }
    
    // 执行动作
    switch (lastAction.type) {
      case 'ADJUST_DIFFICULTY':
        // 🎮 [Task 1 验证点] Agent 修改了 React 的状态
        const newLen = lastAction.target_length;
        if (newLen && newLen !== targetLength) {
          setTargetLength(newLen);
          generateNewTarget(newLen);
          setFailCount(0); // 重置失败计数
          alert(`🤖 Agent 介入：难度调整为 ${newLen} 位数！\n原因: ${lastAction.content}`);
        }
        break;
        
      case 'THINK':
      case 'IDLE':
        // 只是思考，不改变游戏状态
        break;

      default:
        console.log("Unmapped action type:", lastAction.type);
    }
  }, [lastAction, targetLength]);

  // === 5. 极简 UI ===
  return (
    <div className="p-10 font-mono bg-slate-100 h-screen flex gap-10">
      
      {/* 左侧：模拟游戏机 */}
      <div className="w-1/2 bg-white p-8 rounded shadow-xl flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-bold text-slate-700">Level 2 Simulator</h1>
        
        <div className="p-6 bg-slate-800 text-emerald-400 text-6xl font-bold rounded tracking-widest">
          {targetNum}
        </div>
        
        <div className="text-sm text-slate-500">Current Difficulty (Length): {targetLength}</div>
        <div className="text-sm text-red-500">Consecutive Fails: {failCount}</div>

        <div className="flex gap-4 w-full mt-4">
          <button 
            onClick={() => tick('WRONG')}
            className="flex-1 py-4 bg-red-100 text-red-700 font-bold rounded hover:bg-red-200 border border-red-300"
            disabled={isThinking}
          >
            ❌ 模拟输入错误 (Fail)
          </button>
          
          <button 
            onClick={() => tick('CORRECT')}
            className="flex-1 py-4 bg-emerald-100 text-emerald-700 font-bold rounded hover:bg-emerald-200 border border-emerald-300"
            disabled={isThinking}
          >
            ✅ 模拟输入正确 (Success)
          </button>
        </div>

        {isThinking && <div className="text-blue-500 animate-pulse">🧠 Agent is thinking...</div>}
      </div>

      {/* 右侧：大脑监控 */}
      <div className="w-1/2 bg-black text-green-400 p-6 rounded shadow-xl overflow-auto text-sm">
        <h2 className="border-b border-gray-700 pb-2 mb-4">Terminal Output</h2>
        
        {/* Verdict 状态指示器 */}
        <div className="mb-4">
          <div className="text-gray-500">[Reflex Verdict]</div>
          {verdict ? (
            <div className={`p-2 rounded ${verdict.verdict === 'BLOCK' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
              <div className="font-bold">
                {verdict.verdict === 'BLOCK' ? '🛡️ BLOCKED' : '✅ ALLOWED'}
              </div>
              {verdict.message && <div className="text-sm mt-1">{verdict.message}</div>}
            </div>
          ) : (
            <div className="text-gray-600">Waiting for verdict...</div>
          )}
        </div>
        
        <div className="mb-4">
          <div className="text-gray-500">[Last Observation]</div>
          <div className="whitespace-pre-wrap text-xs bg-gray-900 p-2 rounded mt-1">
            {lastObs?.global_task || "Waiting..."}
          </div>
        </div>

        <div>
          <div className="text-gray-500">[Last Action]</div>
          {lastAction ? (
            <div className={`p-2 rounded mt-1 ${lastAction._status === 'BLOCKED' ? 'bg-red-900/30 border border-red-700' : lastAction.type === 'ADJUST_DIFFICULTY' ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-900/50'}`}>
              <div className="font-bold">
                {lastAction._status === 'BLOCKED' ? '🚫 BLOCKED: ' : ''}{lastAction.type}
              </div>
              {lastAction.content && <div className="text-sm mt-1">Content: {lastAction.content}</div>}
              {lastAction.target_length && <div className="text-sm">Target Length: {lastAction.target_length}</div>}
              {lastAction._reason && <div className="text-sm text-red-400 mt-1">Reason: {lastAction._reason}</div>}
            </div>
          ) : (
            <div className="text-gray-600">No action yet</div>
          )}
        </div>
      </div>
    </div>
  );
}