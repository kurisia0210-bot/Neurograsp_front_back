import React, { useState, useEffect } from 'react';

export function AgentPlayground() {
  // === 1. 最简状态 ===
  const [targetLength, setTargetLength] = useState(3); // 默认难度 3
  const [targetNum, setTargetNum] = useState("123");
  const [lastObs, setLastObs] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  
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
    return {
      timestamp: Date.now() / 1000,
      // 必须符合 Python 的 AgentSelfState Schema，虽然这里没用
      agent: { location: "table_center", holding: null }, 
      // 必须符合 Python 的 VisibleObject Schema，传空数组
      nearby_objects: [], 
      // 🌟 核心：把当前的游戏情况告诉 Agent
      global_task: `Game: Memory Dialing. 
Target Number: ${targetNum} (Length: ${targetLength}). 
Current Event: User input was ${event}. 
Recent Failures: ${event === 'WRONG' ? failCount + 1 : 0}.`
    };
  };

  // === 3. 你的标准 Tick 逻辑 (原封不动 + Action 处理) ===
  const tick = async (event) => {
    if (isThinking) return;
    setIsThinking(true);

    try {
      // 1. 感知
      const obs = perceiveWorld(event);
      setLastObs(obs);
      
      // 更新本地计数器 (仅用于 UI 显示和辅助)
      if (event === 'WRONG') setFailCount(c => c + 1);
      if (event === 'CORRECT') setFailCount(0);

      // 2. 发送给大脑
      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obs)
      });

      if (!response.ok) throw new Error("Brain Network Error");
      const data = await response.json();
      
      // 3. 处理判决 (你的标准代码)
      const verdict = data.reflex_verdict?.verdict || "ALLOW"; // 简化兼容
      const realAction = data.intent;

      if (verdict === "BLOCK") {
          console.warn(`🛡️ Blocked: ${data.reflex_verdict.message}`);
          setLastAction({ ...realAction, blocked: true, reason: data.reflex_verdict.message });
      } else {
          // ✅ 4. 执行动作 (Execution)
          setLastAction(realAction);
          executeAction(realAction);
      }

    } catch (e) {
      console.error("🔌 Brain disconnected:", e);
      setLastAction({ type: "THINK", content: `Error: ${e.message}` });
    } finally {
      setIsThinking(false);
    }
  };

  // === 4. 执行 Agent 的指令 ===
  const executeAction = (action) => {
    console.log("🦾 Executing:", action);

    switch (action.type) {
      case 'ADJUST_DIFFICULTY':
        // 🎮 [Task 1 验证点] Agent 修改了 React 的状态
        const newLen = action.target_length;
        if (newLen && newLen !== targetLength) {
          setTargetLength(newLen);
          generateNewTarget(newLen);
          setFailCount(0); // 重置失败计数
          alert(`🤖 Agent 介入：难度调整为 ${newLen} 位数！\n原因: ${action.content}`);
        }
        break;
        
      case 'THINK':
      case 'IDLE':
        // 只是思考，不改变游戏状态
        break;

      default:
        console.log("Unmapped action:", action.type);
    }
  };

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
        
        <div className="mb-4">
          <div className="text-gray-500">[Last Observation]</div>
          <div className="whitespace-pre-wrap">{lastObs?.global_task || "Waiting..."}</div>
        </div>

        <div>
          <div className="text-gray-500">[Last Action]</div>
          {lastAction ? (
             <div className={lastAction.type === 'ADJUST_DIFFICULTY' ? "text-yellow-400 font-bold" : ""}>
               {`Type: ${lastAction.type}`}
               <br/>
               {`Content: ${lastAction.content}`}
               {lastAction.target_length && <><br/>{`Target Length: ${lastAction.target_length}`}</>}
             </div>
          ) : "None"}
        </div>
      </div>
    </div>
  );
}