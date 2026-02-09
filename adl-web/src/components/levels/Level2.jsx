import React, { useState, useEffect } from 'react'
import { Cellphone } from '../Cellphone'
import { TargetBoard } from '../game/mechanics/TargetBoard';
import { DoctorAvatar } from '../game/avatar/DoctorAvatar';
import { useAgentBridge } from '../game/hook/useAgentBridge';

// 🛠️ 定义 Payload 构造器 (放在组件外)
const buildObservation = (level, targetNum, currentInput, failStreak, event) => {
  const length = targetNum ? targetNum.length : (3 + level - 1);
  return {
    timestamp: Date.now() / 1000,
    agent: { location: "table_center", holding: null },
    nearby_objects: [],
    global_task: `Game: Memory Dialing. Target Number: ${targetNum} (Length: ${length}). Recent Failures: ${failStreak}. Event: ${event}.`
  };
};

export function Level2({ onBack }) {
  const TOTAL_ROUNDS = 4;
  
  // === 1. 游戏状态 ===
  const [level, setLevel] = useState(1);
  const [targetNum, setTargetNum] = useState(""); 
  const [currentInput, setCurrentInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState('waiting'); // 语义状态：waiting, processing, completed, supporting
  const [shake, setShake] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 📉 L3 数据：记录连续失败次数，这是发给 Agent 的核心信号
  const [failStreak, setFailStreak] = useState(0);
  // 💬 Agent 的话：用于显示气泡
  const [agentMessage, setAgentMessage] = useState("");

  // === 2. 植入 Agent 神经接口 ===
  const { isThinking, lastAction, callAgent } = useAgentBridge();

  // === 3. 生成题目逻辑 ===
  useEffect(() => {
    // 难度公式: Level 1 = 3 digits, Level 2 = 4 digits...
    const length = 3 + Math.min(level - 1, 8); 
    let num = "";
    for (let i = 0; i < length; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    setTargetNum(num);
    setCurrentInput("");
    setIsSuccess(false);
    // 注意：不要在这里重置 failStreak，因为降级后可能保留之前的挫败感，或者由 Agent 决定
  }, [level]);

  // === 4. 👂 Listener: 监听 Agent 的大脑指令 ===
  useEffect(() => {
    if (!lastAction) return;
    
    console.log("🤖 Agent Instruction:", lastAction);

    // 气泡显示 Agent 的思考/鼓励内容
    if (lastAction.content) {
        setAgentMessage(lastAction.content);
        // 3秒后自动消失，或者保留直到下一次操作
        setTimeout(() => setAgentMessage(""), 5000); 
    }

    // 处理难度调整
    if (lastAction.type === 'ADJUST_DIFFICULTY') {
        const newLen = lastAction.target_length;
        if (newLen) {
            // 反推 Level: Length 3 -> Level 1
            const newLevel = Math.max(1, newLen - 2);
            if (newLevel !== level) {
                console.log(`📉 Agent lowering difficulty to Level ${newLevel}`);
                setLevel(newLevel);
                setFailStreak(0); // 难度调整后，重置挫败计数
                setShake(true); setTimeout(() => setShake(false), 500); // 视觉反馈
            }
        }
    }
  }, [lastAction]);

  const handleDial = (key) => {
    // 如果已经赢了，或者正在校验中，锁死键盘
    if (isSuccess || isEvaluating) return;
    
    // 防御性检查：防止超长
    if (currentInput.length >= targetNum.length) return;

    setAvatarStatus('processing'); // 语义状态：processing
    setCurrentInput(prev => prev + key);
    // ❌ 删掉这里所有的 if (length === target) ... 逻辑
    // 让 React 去渲染这个新数字
  };

  // ==========================================
  // 2. 触发器 (The Trigger) - useEffect
  // ==========================================
  // 监听 currentInput 的变化。只要它变了，我们就看看是不是输完了。
  // 这保证了：数字一定先上屏，然后才会触发这个逻辑。
  useEffect(() => {
    // 🛑 保险栓：只有当题目(targetNum)存在且长度大于0时，才开始工作
    if (!targetNum || targetNum.length === 0) return;

    // 触发条件：长度达标 且 当前不在校验状态 且 还没赢
    if (currentInput.length === targetNum.length && !isEvaluating && !isSuccess) {
        
        console.log("🔒 Trigger: Input Complete. Locking & Evaluating...");
        setIsEvaluating(true); 

        const evaluationTimer = setTimeout(() => {
            evaluateResult();
        }, 500); 

        return () => clearTimeout(evaluationTimer);
    }
  }, [currentInput, targetNum]); // 这里依赖项不变

  // ==========================================
  // 3. 结算逻辑 (独立函数)
  // ==========================================
  const evaluateResult = () => {
       const isCorrect = currentInput === targetNum;
       
       // === L3 数据记录 ===
       const newFailCount = isCorrect ? 0 : failStreak + 1;
       setFailStreak(newFailCount);
       
       callAgent(buildObservation(
           level, 
           targetNum, 
           currentInput, 
           newFailCount, 
           isCorrect ? "SUCCESS" : "WRONG_BUT_PASSED"
       ));

       // === UI 反馈 ===
       if (isCorrect) {
           setAvatarStatus('completed'); // 语义状态：completed
           setAgentMessage("Perfect!"); 
       } else {
           setShake(true); setTimeout(() => setShake(false), 500);
           setAvatarStatus('supporting'); // 语义状态：supporting
           setAgentMessage("Nice try! Let's continue."); 
       }

       // 🎉 状态流转：校验结束 -> 胜利/结算
       setIsEvaluating(false); // 结束校验
       setIsSuccess(true);     // 进入结算界面
  };

  // 下一轮逻辑
  const handleNextLevel = () => {
    if (successCount + 1 >= TOTAL_ROUNDS) {
      alert("恭喜完成今日康复训练！");
      return; 
    }
    setSuccessCount(p => p + 1);
    setLevel(l => l + 1);
    setCurrentInput("");
    setIsSuccess(false);
    setAvatarStatus('waiting'); // 语义状态：waiting
  };

  // 进度条逻辑
  const calculateProgress = () => {
    const baseProgress = (successCount / TOTAL_ROUNDS) * 100;
    const currentRatio = targetNum.length > 0 ? currentInput.length / targetNum.length : 0;
    return Math.min(baseProgress + currentRatio * (100 / TOTAL_ROUNDS), 100);
  };

  return (
    <div className="w-full h-full bg-[#edf3f7] relative overflow-hidden">
      
      {/* 返回按钮 */}
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-full shadow text-slate-600 font-bold hover:bg-slate-50">
            ⬅️ 返回
        </button>
      </div>

      {/* 🧠 Agent 气泡 (浮在 Avatar 头顶) */}
      {agentMessage && (
          <div className="absolute top-20 right-20 z-50 max-w-xs animate-bounce-in">
              <div className="bg-white border-2 border-emerald-400 px-6 py-4 rounded-t-2xl rounded-bl-2xl shadow-lg relative">
                  <p className="text-slate-700 font-medium text-lg">
                      {isThinking ? "Thinking..." : agentMessage}
                  </p>
                  {/* 小三角 */}
                  <div className="absolute -bottom-2 right-0 w-4 h-4 bg-white border-b-2 border-r-2 border-emerald-400 transform rotate-45"></div>
              </div>
          </div>
      )}

      {/* 主布局 */}
      <div className="grid grid-cols-[1fr_auto_1fr] w-full h-full items-center justify-items-center px-10">
        
        {/* Task Board */}
        <div className="justify-self-end pr-10">
            <TargetBoard 
              targetNum={targetNum} 
              currentInput={currentInput} 
              isSuccess={isSuccess} 
            />
            {/* Debug: 显示挫败值 */}
            <div className="mt-4 text-center text-slate-400 text-sm">
                Fails: {failStreak} | Level: {level}
            </div>
        </div>

        {/* Cellphone */}
        <div className="relative z-10">
            <Cellphone 
              targetNum={targetNum} 
              currentInput={currentInput}
              isShake={shake}
              onDial={handleDial}
              progress={calculateProgress()} 
              disabled={isEvaluating || isSuccess}
            />
        </div>

        {/* Doctor Avatar */}
        <div className="justify-self-start pl-10 h-[600px] w-[400px] flex items-center relative">
            <div className="scale-90 origin-left transition-all duration-500">
                <DoctorAvatar status={isThinking ? 'speaking' : avatarStatus} />
            </div>
        </div>

      </div>

      {/* 成功弹窗 */}
      {isSuccess && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
           <button 
             onClick={handleNextLevel}
             className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xl font-bold rounded-2xl shadow-xl transition-all"
           >
             {successCount + 1 === TOTAL_ROUNDS ? '🎉 完成训练' : '下一轮 ➡️'}
           </button>
        </div>
      )}

    </div>
  )
}