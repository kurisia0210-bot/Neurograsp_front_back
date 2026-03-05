import React, { useState, useEffect, useCallback } from 'react'
import { Cellphone } from '../Cellphone'
import { TargetBoard } from '../game/mechanics/TargetBoard';
import { DoctorAvatar } from '../game/avatar/DoctorAvatar';

// 馃洜锔?瀹氫箟 Payload 鏋勯€犲櫒 (鏀惧湪缁勪欢澶?
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
  
  // === 1. 娓告垙鐘舵€?===
  const [level, setLevel] = useState(1);
  const [targetNum, setTargetNum] = useState(""); 
  const [currentInput, setCurrentInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState('waiting'); // 璇箟鐘舵€侊細waiting, processing, completed, supporting
  const [shake, setShake] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 馃搲 L3 鏁版嵁锛氳褰曡繛缁け璐ユ鏁帮紝杩欐槸鍙戠粰 Agent 鐨勬牳蹇冧俊鍙?
  const [failStreak, setFailStreak] = useState(0);
  // 馃挰 Agent 鐨勮瘽锛氱敤浜庢樉绀烘皵娉?
  const [agentMessage, setAgentMessage] = useState("");

  // === 2. 妞嶅叆 Agent 绁炵粡鎺ュ彛 ===
  const [isThinking, setIsThinking] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const callAgent = useCallback(async (observation) => {
    if (isThinking) return;

    setIsThinking(true);
    setLastAction(null);

    try {
      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(observation)
      });

      if (!response.ok) throw new Error(`Brain Error: ${response.status}`);
      const data = await response.json();
      const reflex = data?.reflex_verdict;
      const intent = data?.intent;

      if (reflex?.verdict === 'BLOCK') {
        setLastAction({ ...intent, _status: 'BLOCKED', _reason: reflex.message });
      } else {
        setLastAction(intent || null);
      }
    } catch (e) {
      console.error('Agent Disconnected:', e);
      setLastAction({ type: 'THINK', content: `Connection Failed: ${e.message}` });
    } finally {
      setIsThinking(false);
    }
  }, [isThinking]);

  // === 3. 鐢熸垚棰樼洰閫昏緫 ===
  useEffect(() => {
    // 闅惧害鍏紡: Level 1 = 3 digits, Level 2 = 4 digits...
    const length = 3 + Math.min(level - 1, 8); 
    let num = "";
    for (let i = 0; i < length; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    setTargetNum(num);
    setCurrentInput("");
    setIsSuccess(false);
    // 娉ㄦ剰锛氫笉瑕佸湪杩欓噷閲嶇疆 failStreak锛屽洜涓洪檷绾у悗鍙兘淇濈暀涔嬪墠鐨勬尗璐ユ劅锛屾垨鑰呯敱 Agent 鍐冲畾
  }, [level]);

  // === 4. 馃憘 Listener: 鐩戝惉 Agent 鐨勫ぇ鑴戞寚浠?===
  useEffect(() => {
    if (!lastAction) return;
    
    console.log("馃 Agent Instruction:", lastAction);

    // 姘旀场鏄剧ず Agent 鐨勬€濊€?榧撳姳鍐呭
    if (lastAction.content) {
        setAgentMessage(lastAction.content);
        // 3绉掑悗鑷姩娑堝け锛屾垨鑰呬繚鐣欑洿鍒颁笅涓€娆℃搷浣?
        setTimeout(() => setAgentMessage(""), 5000); 
    }

    // 澶勭悊闅惧害璋冩暣
    if (lastAction.type === 'ADJUST_DIFFICULTY') {
        const newLen = lastAction.target_length;
        if (newLen) {
            // 鍙嶆帹 Level: Length 3 -> Level 1
            const newLevel = Math.max(1, newLen - 2);
            if (newLevel !== level) {
                console.log(`馃搲 Agent lowering difficulty to Level ${newLevel}`);
                setLevel(newLevel);
                setFailStreak(0); // 闅惧害璋冩暣鍚庯紝閲嶇疆鎸触璁℃暟
                setShake(true); setTimeout(() => setShake(false), 500); // 瑙嗚鍙嶉
            }
        }
    }
  }, [lastAction]);

  const handleDial = (key) => {
    // 濡傛灉宸茬粡璧簡锛屾垨鑰呮鍦ㄦ牎楠屼腑锛岄攣姝婚敭鐩?
    if (isSuccess || isEvaluating) return;
    
    // 闃插尽鎬ф鏌ワ細闃叉瓒呴暱
    if (currentInput.length >= targetNum.length) return;

    setAvatarStatus('processing'); // 璇箟鐘舵€侊細processing
    setCurrentInput(prev => prev + key);
    // 鉂?鍒犳帀杩欓噷鎵€鏈夌殑 if (length === target) ... 閫昏緫
    // 璁?React 鍘绘覆鏌撹繖涓柊鏁板瓧
  };

  // ==========================================
  // 2. 瑙﹀彂鍣?(The Trigger) - useEffect
  // ==========================================
  // 鐩戝惉 currentInput 鐨勫彉鍖栥€傚彧瑕佸畠鍙樹簡锛屾垜浠氨鐪嬬湅鏄笉鏄緭瀹屼簡銆?
  // 杩欎繚璇佷簡锛氭暟瀛椾竴瀹氬厛涓婂睆锛岀劧鍚庢墠浼氳Е鍙戣繖涓€昏緫銆?
  useEffect(() => {
    // 馃洃 淇濋櫓鏍擄細鍙湁褰撻鐩?targetNum)瀛樺湪涓旈暱搴﹀ぇ浜?鏃讹紝鎵嶅紑濮嬪伐浣?
    if (!targetNum || targetNum.length === 0) return;

    // 瑙﹀彂鏉′欢锛氶暱搴﹁揪鏍?涓?褰撳墠涓嶅湪鏍￠獙鐘舵€?涓?杩樻病璧?
    if (currentInput.length === targetNum.length && !isEvaluating && !isSuccess) {
        
        console.log("馃敀 Trigger: Input Complete. Locking & Evaluating...");
        setIsEvaluating(true); 

        const evaluationTimer = setTimeout(() => {
            evaluateResult();
        }, 500); 

        return () => clearTimeout(evaluationTimer);
    }
  }, [currentInput, targetNum]); // 杩欓噷渚濊禆椤逛笉鍙?

  // ==========================================
  // 3. 缁撶畻閫昏緫 (鐙珛鍑芥暟)
  // ==========================================
  const evaluateResult = () => {
       const isCorrect = currentInput === targetNum;
       
       // === L3 鏁版嵁璁板綍 ===
       const newFailCount = isCorrect ? 0 : failStreak + 1;
       setFailStreak(newFailCount);
       
       callAgent(buildObservation(
           level, 
           targetNum, 
           currentInput, 
           newFailCount, 
           isCorrect ? "SUCCESS" : "WRONG_BUT_PASSED"
       ));

       // === UI 鍙嶉 ===
       if (isCorrect) {
           setAvatarStatus('completed'); // 璇箟鐘舵€侊細completed
           setAgentMessage("Perfect!"); 
       } else {
           setShake(true); setTimeout(() => setShake(false), 500);
           setAvatarStatus('supporting'); // 璇箟鐘舵€侊細supporting
           setAgentMessage("Nice try! Let's continue."); 
       }

       // 馃帀 鐘舵€佹祦杞細鏍￠獙缁撴潫 -> 鑳滃埄/缁撶畻
       setIsEvaluating(false); // 缁撴潫鏍￠獙
       setIsSuccess(true);     // 杩涘叆缁撶畻鐣岄潰
  };

  // 涓嬩竴杞€昏緫
  const handleNextLevel = () => {
    if (successCount + 1 >= TOTAL_ROUNDS) {
      alert("鎭枩瀹屾垚浠婃棩搴峰璁粌锛?);
      return; 
    }
    setSuccessCount(p => p + 1);
    setLevel(l => l + 1);
    setCurrentInput("");
    setIsSuccess(false);
    setAvatarStatus('waiting'); // 璇箟鐘舵€侊細waiting
  };

  // 杩涘害鏉￠€昏緫
  const calculateProgress = () => {
    const baseProgress = (successCount / TOTAL_ROUNDS) * 100;
    const currentRatio = targetNum.length > 0 ? currentInput.length / targetNum.length : 0;
    return Math.min(baseProgress + currentRatio * (100 / TOTAL_ROUNDS), 100);
  };

  return (
    <div className="w-full h-full bg-[#edf3f7] relative overflow-hidden">
      
      {/* 杩斿洖鎸夐挳 */}
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-full shadow text-slate-600 font-bold hover:bg-slate-50">
            猬咃笍 杩斿洖
        </button>
      </div>

      {/* 馃 Agent 姘旀场 (娴湪 Avatar 澶撮《) */}
      {agentMessage && (
          <div className="absolute top-20 right-20 z-50 max-w-xs animate-bounce-in">
              <div className="bg-white border-2 border-emerald-400 px-6 py-4 rounded-t-2xl rounded-bl-2xl shadow-lg relative">
                  <p className="text-slate-700 font-medium text-lg">
                      {isThinking ? "Thinking..." : agentMessage}
                  </p>
                  {/* 灏忎笁瑙?*/}
                  <div className="absolute -bottom-2 right-0 w-4 h-4 bg-white border-b-2 border-r-2 border-emerald-400 transform rotate-45"></div>
              </div>
          </div>
      )}

      {/* 涓诲竷灞€ */}
      <div className="grid grid-cols-[1fr_auto_1fr] w-full h-full items-center justify-items-center px-10">
        
        {/* Task Board */}
        <div className="justify-self-end pr-10">
            <TargetBoard 
              targetNum={targetNum} 
              currentInput={currentInput} 
              isSuccess={isSuccess} 
            />
            {/* Debug: 鏄剧ず鎸触鍊?*/}
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

      {/* 鎴愬姛寮圭獥 */}
      {isSuccess && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
           <button 
             onClick={handleNextLevel}
             className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xl font-bold rounded-2xl shadow-xl transition-all"
           >
             {successCount + 1 === TOTAL_ROUNDS ? '馃帀 瀹屾垚璁粌' : '涓嬩竴杞?鉃★笍'}
           </button>
        </div>
      )}

    </div>
  )
}
