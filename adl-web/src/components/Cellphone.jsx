import React from 'react';
import { WaveBackground } from './ui/WaveBackground';

export function Cellphone({ 
  currentInput, 
  isShake, 
  onDial,
  progress = 0 
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    // 📱 iPhone 5 白色外壳
    <div className={`
      relative w-[320px] h-[640px] bg-white rounded-[2.5rem] border-[6px] border-[#d1d5db] shadow-2xl flex flex-col overflow-hidden transition-transform duration-100 shrink-0
      ${isShake ? 'translate-x-2' : ''}
    `}>
      
      {/* 🔼 额头 (Top Bezel) */}
      <div className="h-[60px] bg-[#f3f4f6] flex flex-col items-center justify-center border-b border-gray-200 z-20 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-[#374151] rounded-full"></div>
             <div className="w-14 h-1.5 bg-[#9ca3af] rounded-full"></div>
        </div>
      </div>

      {/* 📺 屏幕区域 */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden border-x-4 border-black/5">
        
        {/* 🌊 波浪层 */}
        <div className="absolute inset-0 z-0">
          <WaveBackground progress={progress} />
        </div>

        {/* ⌨️ UI 层 */}
        <div className="relative z-10 flex flex-col h-full p-4 justify-end pb-8">
          
          {/* ❌ 删除了顶部的状态栏 (Level/5G) */}
          {/* ❌ 删除了内部的目标显示框 (Target) */}

          {/* ⌨️ 当前输入显示 (保留，作为按键反馈) */}
          {/* 放在屏幕中间偏上位置，留白多一点，减少视觉干扰 */}
          <div className="flex-1 flex items-center justify-center">
             <span className="text-5xl font-light tracking-widest font-mono text-slate-800 drop-shadow-md bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30">
                  {currentInput}
                  {/* 只有未满时才闪烁光标 */}
                  {progress < 100 && <span className="animate-pulse text-emerald-600">|</span>}
             </span>
          </div>

          {/* 🎹 拨号键盘 */}
          <div className="grid grid-cols-3 gap-3 px-2">
             {keys.map((key) => (
              <button
                  key={key}
                  onClick={() => onDial(key)}
                  className="
                    w-16 h-16 rounded-full mx-auto
                    bg-white/40 backdrop-blur-md hover:bg-white/60 active:bg-emerald-200
                    text-slate-800 text-2xl font-medium
                    border border-white/50 shadow-sm
                    flex items-center justify-center
                    transition-all active:scale-90
                  "
              >
                  {key}
              </button>
             ))}
          </div>

        </div>
      </div>

      {/* 🔽 下巴 (Bottom Bezel) */}
      <div className="h-[70px] bg-[#f3f4f6] flex items-center justify-center border-t border-gray-200 z-20 shrink-0">
         <div className="w-14 h-14 bg-white rounded-full border-[3px] border-[#d1d5db] flex items-center justify-center shadow-inner active:bg-gray-100 cursor-pointer">
            <div className="w-4 h-4 rounded-[4px] border-[2px] border-[#9ca3af]"></div>
         </div>
      </div>

    </div>
  );
}