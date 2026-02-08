import React from 'react';
import { WaveBackground } from './ui/WaveBackground';

export function Cellphone({ 
  currentInput, 
  targetNum, // ✅ 需要传回来进行对比
  isShake, 
  onDial,
  progress = 0 
}) {
  // ⌨️ 新键盘布局：只保留数字
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className={`
      relative w-[320px] h-[640px] bg-white rounded-[2.5rem] border-[6px] border-[#d1d5db] shadow-2xl flex flex-col overflow-hidden transition-transform duration-100 shrink-0
      ${isShake ? 'translate-x-2' : ''}
    `}>
      
      {/* 🔼 额头 */}
      <div className="h-[60px] bg-[#f3f4f6] flex flex-col items-center justify-center border-b border-gray-200 z-20 shrink-0">
        <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-[#374151] rounded-full"></div>
             <div className="w-14 h-1.5 bg-[#9ca3af] rounded-full"></div>
        </div>
      </div>

      {/* 📺 屏幕区域 */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden border-x-4 border-black/5">
        
        {/* 🌊 波浪背景 */}
        <div className="absolute inset-0 z-0">
          <WaveBackground progress={progress} />
        </div>

        {/* ⌨️ UI 层 */}
        <div className="relative z-10 flex flex-col h-full p-4 justify-end pb-8">
          
          {/* 📝 输入显示区 (核心修改) */}
          <div className="flex-1 flex items-center justify-center">
             <div className="flex items-center justify-center gap-1 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/30 shadow-sm min-h-[80px] min-w-[200px]">
                  
                  {/* 遍历输入，逐个比对 */}
                  {currentInput.split('').map((char, index) => {
                    // 🎯 判断是否正确
                    const isCorrect = targetNum && char === targetNum[index];
                    
                    return (
                      <span key={index} className={`
                        text-5xl font-mono font-light tracking-widest
                        ${isCorrect ? 'text-slate-800' : 'text-white-500'} // 错误显示为红色 *
                      `}>
                        {isCorrect ? char : '*'}
                      </span>
                    );
                  })}

                  {/* 光标 */}
                  {progress < 100 && <div className="w-1 h-10 bg-emerald-600 animate-pulse ml-1 rounded-full"></div>}
             </div>
          </div>

          {/* 🎹 拨号键盘 (去掉了 * 和 #) */}
          <div className="grid grid-cols-3 gap-3 px-2">
             {/* 1-9 */}
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

             {/* 0 单独处理，居中 */}
             {/* col-start-2: 让它从第2列开始，也就是中间那一列 */}
             <button
                onClick={() => onDial('0')}
                className="col-start-2 w-16 h-16 rounded-full mx-auto
                  bg-white/40 backdrop-blur-md hover:bg-white/60 active:bg-emerald-200
                  text-slate-800 text-2xl font-medium
                  border border-white/50 shadow-sm
                  flex items-center justify-center
                  transition-all active:scale-90"
              >
                0
              </button>
          </div>

        </div>
      </div>

      {/* 🔽 下巴 */}
      <div className="h-[70px] bg-[#f3f4f6] flex items-center justify-center border-t border-gray-200 z-20 shrink-0">
         <div className="w-14 h-14 bg-white rounded-full border-[3px] border-[#d1d5db] flex items-center justify-center shadow-inner active:bg-gray-100 cursor-pointer">
            <div className="w-4 h-4 rounded-[4px] border-[2px] border-[#9ca3af]"></div>
         </div>
      </div>

    </div>
  );
}