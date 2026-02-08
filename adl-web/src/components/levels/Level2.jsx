import React, { useState, useEffect } from 'react'
import { Cellphone } from '../Cellphone'
import { TargetBoard } from '../game/mechanics/TargetBoard';
import { DoctorAvatar } from '../game/avatar/DoctorAvatar';


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
    <div className="w-full h-full bg-[#edf3f7] relative overflow-hidden">
      
      {/* 返回按钮 */}
      <div className="absolute top-4 left-4 z-50">
        <button onClick={onBack} className="px-4 py-2 bg-white rounded-full shadow text-slate-600 font-bold hover:bg-slate-50">
            ⬅️ 返回
        </button>
      </div>

      {/* 📐 布局核心：CSS Grid 
         grid-cols-[1fr_auto_1fr]:
         - 左侧 (1fr): 自动填满剩余空间，放 TaskBoard
         - 中间 (auto): 根据手机宽度自适应，永远居中
         - 右侧 (1fr): 自动填满剩余空间，放 Avatar
         
         gap-8: 组件之间的间距
      */}
      <div className="grid grid-cols-[1fr_auto_1fr] w-full h-full items-center justify-items-center px-10">
        
        {/* 👈 左侧：任务板 (TargetBoard) */}
        {/* justify-self-end: 让它尽量靠右（靠近手机），视觉上更紧凑 */}
        {/* 左侧：任务板 */}
        <div className="justify-self-end pr-10">
            <TargetBoard 
              targetNum={targetNum} 
              currentInput={currentInput} 
              isSuccess={isSuccess} 
            />
        </div>

        {/* 📱 中间：手机 */}
        <div className="relative z-10">
            <Cellphone 
              targetNum={targetNum} // ✅ 关键：把目标号码传给手机，用于判断显示 *
              currentInput={currentInput}
              isShake={shake}
              onDial={handleDial}
              progress={progress} 
            />
        </div>

        {/* 右侧：Avatar */}
        <div className="justify-self-start pl-10 h-[600px] w-[400px] flex items-center relative">
            <div className="scale-90 origin-left">
                <DoctorAvatar status={avatarStatus} />
            </div>
        </div>

      </div>

      {/* 🎉 成功弹窗按钮 (居中悬浮) */}
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