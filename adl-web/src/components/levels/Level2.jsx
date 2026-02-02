import React, { useState, useEffect } from 'react'
import { DoctorAvatar } from '../game/avatar/DoctorAvatar'

export function Level2({ onBack }) {
  // ============ 🧠 游戏逻辑 ============
  const [level, setLevel] = useState(3)
  const [targetNum, setTargetNum] = useState("") 
  const [currentInput, setCurrentInput] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [shake, setShake] = useState(false)

  // 🎭 Avatar 状态控制
  const [avatarStatus, setAvatarStatus] = useState('idle') 

  // 初始化关卡
  useEffect(() => {
    let num = ""
    for(let i=0; i<level; i++) num += Math.floor(Math.random() * 10).toString()
    setTargetNum(num)
    setCurrentInput("")
    setIsSuccess(false)
  }, [level])

  // 拨号处理
  const handleDial = (key) => {
    if (isSuccess) return

    const expectedKey = targetNum[currentInput.length]

    if (key === expectedKey) {
      const newInput = currentInput + key
      setCurrentInput(newInput)
      
      if (newInput === targetNum) {
        setIsSuccess(true)
        setTimeout(() => {
          setLevel(l => Math.min(l + 1, 11)) 
        }, 1500)
      }
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setCurrentInput("")
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

  return (
    <div className="w-full h-full bg-[#edf3f7] flex relative overflow-hidden">
      
      {/* 背景装饰：保留一点氛围感 */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-100 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-[100px] opacity-40 pointer-events-none" />

      {/* ⬅️ 返回按钮 */}
      <button 
        onClick={onBack} 
        className="absolute top-6 left-6 z-50 px-5 py-2 bg-white/80 backdrop-blur-md text-slate-600 rounded-full shadow-sm hover:shadow-md font-bold transition-all border border-white"
      >
        ⬅️ 返回
      </button>

      {/* === 左侧主内容区域 === */}
      <div className="flex-1 flex items-center justify-center">
        {/* 📱 核心拨号盘组件 (去掉了手机外壳) */}
        <div className={`
          relative w-[340px] bg-[#1a1a1a] rounded-[2.5rem] p-6 shadow-2xl border border-[#333]
          flex flex-col gap-6 transform transition-transform duration-100
          ${shake ? 'translate-x-2' : ''} 
        `}>
        
        {/* === 📺 显示屏区域 === */}
        <div className="bg-[#0f0f0f] rounded-2xl p-5 h-36 flex flex-col justify-between relative border border-[#262626] shadow-inner">
            
            {/* 🎯 任务目标：左上角 */}
            <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Number</span>
                <div className="flex gap-1 font-mono text-sm">
                    {targetNum.split('').map((n, i) => (
                        <span key={i} className={`transition-colors duration-300 ${
                            i < currentInput.length ? 'text-emerald-500' : 'text-gray-600'
                        }`}>
                            {n}
                        </span>
                    ))}
                </div>
            </div>

            {/* ⌨️ 当前输入：居中显示大字 */}
            <div className="self-center w-full text-center overflow-hidden">
                <span className="text-5xl text-white font-light tracking-widest font-mono">
                    {currentInput}
                    <span className="animate-pulse text-emerald-500">_</span>
                </span>
            </div>
        </div>

        {/* === 🎹 键盘区域 === */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-4 px-2">
            {keys.map((key) => (
            <button
                key={key}
                onClick={() => handleDial(key)}
                className="w-20 h-20 rounded-full bg-[#262626] text-white text-3xl font-normal hover:bg-[#333] active:bg-emerald-600 active:scale-95 transition-all shadow-lg flex items-center justify-center select-none border border-[#333] mx-auto"
            >
                {key}
            </button>
            ))}
        </div>

        {/* === 📞 呼叫按钮 === */}
        <div className="flex justify-center mb-2">
            <button 
            className={`
                w-full h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition-all text-white tracking-widest uppercase
                ${isSuccess 
                    ? 'bg-emerald-500 animate-bounce shadow-emerald-500/50' 
                    : 'bg-[#262626] hover:bg-[#333] active:scale-95 border border-[#333] text-emerald-500'
                }
            `}
            >
            {isSuccess ? 'Connecting...' : 'Call'}
            </button>
        </div>

        </div>
      </div>

      {/* === 右侧 Avatar 侧边栏 (350px 固定宽度) === */}
      <div className="w-[350px] bg-white/50 backdrop-blur-md border-l border-white/60 shadow-xl flex flex-col">
        
        {/* Avatar 显示区域 */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-64 h-64 shadow-2xl rounded-full border-4 border-white">
            <DoctorAvatar status={avatarStatus} />
          </div>
        </div>

        {/* 调试控制器 */}
        <div className="p-6 border-t border-white/40">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-3">Avatar Debug</p>
          <div className="flex flex-col gap-2">
            {['idle', 'inputting', 'success'].map((s) => (
              <button
                key={s}
                onClick={() => setAvatarStatus(s)}
                className={`px-4 py-2 rounded-lg font-medium capitalize text-sm transition-all ${
                  avatarStatus === s 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-white/60 text-gray-700 hover:bg-white/80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🎉 成功遮罩 (保留) */}
      {isSuccess && (
        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] z-40 flex items-center justify-center pointer-events-none">
           {/* 这里以后可以放数字人 */}
        </div>
      )}

    </div>
  )
}