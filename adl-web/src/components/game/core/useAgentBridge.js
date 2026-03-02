// src/hooks/useAgentBridge.js
import { useState, useCallback } from 'react';

export function useAgentBridge() {
  const [isThinking, setIsThinking] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [verdict, setVerdict] = useState(null); // 存储规则引擎的判决 (ALLOW/BLOCK)

  // 核心通信函数：相当于之前的 tick
  const callAgent = useCallback(async (observation) => {
    if (isThinking) return;
    
    setIsThinking(true);
    setLastAction(null); // 清空上一次动作，避免重复执行
    setVerdict(null);

    try {
      // 1. 发送观察数据
      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(observation)
      });

      if (!response.ok) throw new Error(`Brain Error: ${response.status}`);
      
      const data = await response.json();

      // 2. 解析回包 (处理 M8 的 Reflex Verdict)
      const reflex = data.reflex_verdict;
      const intent = data.intent;

      setVerdict(reflex); // 把判决存起来，UI 可以根据这个显示红/绿灯

      if (reflex?.verdict === "BLOCK") {
        console.warn(`🛡️ Agent Blocked: ${reflex.message}`);
        // 即使被 Block，我们也把意图传回去，但标记为 blocked
        setLastAction({ ...intent, _status: 'BLOCKED', _reason: reflex.message });
      } else {
        // ALLOW
        setLastAction(intent);
      }

    } catch (e) {
      console.error("🔌 Disconnected:", e);
      setLastAction({ type: "THINK", content: `Connection Failed: ${e.message}` });
    } finally {
      setIsThinking(false);
    }
  }, [isThinking]); // 依赖 isThinking 防止连点

  return {
    isThinking,
    lastAction,
    verdict,
    callAgent // 暴露给组件调用
  };
}