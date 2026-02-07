import React, { useState, useEffect } from 'react'
import { Cellphone } from '../Cellphone'

export function Level2({ onBack }) {
  const TOTAL_ROUNDS = 4;
  
  const [level, setLevel] = useState(1)
  const [targetNum, setTargetNum] = useState("") 
  const [currentInput, setCurrentInput] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState('idle')
  const [shake, setShake] = useState(false)
  const [successCount, setSuccessCount] = useState(0)

  // 生成目标 (保持不变)
  useEffect(() => {
    const length = 3 + Math.min(level - 1, 4) 
    let num = ""
    for (let i = 0; i < length; i++) {
      num += Math.floor(Math.random() * 10).toString()
    }
    setTargetNum(num)
  }, [level])

  // 计算进度 (保持不变)
  const calculateProgress = () => {
    const baseProgress = (successCount / TOTAL_ROUNDS) * 100;
    const currentRatio = targetNum.length > 0 ? currentInput.length / targetNum.length : 0;
    const stepProgress = currentRatio * (100 / TOTAL_ROUNDS);
    return Math.min(baseProgress + stepProgress, 100);
  };
  const progress = calculateProgress();

  // 🧠 核心修改：无挫败逻辑 (No Failure Logic)
  const handleDial = (key) => {
    if (isSuccess) return

    setAvatarStatus('inputting') 
    
    // 不管按什么，只要还没满，就往上加显示
    if (currentInput.length < targetNum.length) {
       // 甚至我们可以只显示 key，或者显示 targetNum 对应的那个数字(如果想让用户觉得自己按对了)
       // 但为了真实反馈，显示用户实际按的键更好
       const newInput = currentInput + key
       setCurrentInput(newInput)

       // ✅ 判定胜利：只看长度，不看内容
       // 只要按键次数达到了目标长度，就视为成功
       if (newInput.length === targetNum.length) {
         setIsSuccess(true)
         setAvatarStatus('calling') 
       }
    }
  }

  const handleNextLevel = () => {
    if (successCount + 1 >= TOTAL_ROUNDS) {
      alert("恭喜完成今日康复训练！")
      return; 
    }
    setSuccessCount(prev => prev + 1)
    setIsSuccess(false)
    setCurrentInput("") 
    setAvatarStatus('idle')
    setLevel(l => l + 1)
  }

  return (
    <div className="w-full h-full bg-[#edf3f7] flex relative overflow-hidden">
      
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-full shadow text-slate-600 font-bold hover:bg-slate-50">
            ⬅️ 返回
        </button>
      </div>

      {/* === 主要布局容器：左侧任务卡 + 右侧手机 === */}
      <div className="flex-1 flex items-center justify-center gap-16 p-8">
        
        {/* 📋 新增：外部任务显示板 (Target Board) */}
        {/* 设计成类似便签或医嘱卡的样式，字体巨大 */}
        <div className={`
            flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border-4 border-white
            transition-all duration-500
            ${isSuccess ? 'scale-110 shadow-emerald-200 border-emerald-400' : ''}
        `}>
            <h2 className="text-slate-400 text-lg font-bold tracking-widest uppercase mb-4">
                {isSuccess ? 'Completed' : 'Mission'}
            </h2>
            
            {/* 这里的数字是巨大的，方便看 */}
            <div className="flex gap-3 text-6xl font-mono font-bold text-slate-800">
                {targetNum.split('').map((n, i) => (
                    <div key={i} className={`
                        w-16 h-20 flex items-center justify-center rounded-xl bg-slate-100 border-b-4 border-slate-200
                        transition-all duration-300
                        ${i < currentInput.length ? 'bg-emerald-100 text-emerald-600 border-emerald-400 transform -translate-y-2' : ''}
                    `}>
                        {n}
                    </div>
                ))}
            </div>

            <p className="mt-6 text-slate-500 font-medium">
                {isSuccess ? "太棒了！请点击下一轮" : "请在手机上输入以上数字"}
            </p>
        </div>

        {/* 📱 手机组件 (现在的 Target 是空的，因为移出去了) */}
        <Cellphone 
          // targetNum={targetNum} // ❌ 不需要传了，手机里不显示目标
          currentInput={currentInput}
          isSuccess={isSuccess}
          isShake={shake}
          onDial={handleDial}
          progress={progress} 
        />
      </div>

      {/* (右侧 Avatar 代码保持不变) */}

      {/* 成功弹窗按钮 */}
      {isSuccess && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
           <button 
             onClick={handleNextLevel}
             className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xl font-bold rounded-2xl shadow-xl border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all"
           >
             {successCount + 1 === TOTAL_ROUNDS ? '🎉 完成训练' : '下一轮 ➡️'}
           </button>
        </div>
      )}

    </div>
  )
}