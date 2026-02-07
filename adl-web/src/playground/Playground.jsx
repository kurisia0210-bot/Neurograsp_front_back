import React, { useState } from 'react';
import { WaveBackground } from '../components/ui/WaveBackground'; 

export function Playground() {
  const [progress, setProgress] = useState(0);

  return (
    <div className="w-full min-h-screen bg-slate-800 flex flex-col items-center justify-center gap-12 p-10">
      
      {/* 📱 iPhone 5 Mockup (White) */}
      {/* 外壳：改为白色背景，银色边框，圆角稍微收紧一点符合 iPhone 5 风格 */}
      <div className="relative w-[320px] h-[640px] bg-white rounded-[2rem] border-[6px] border-slate-300 shadow-2xl shadow-slate-900/50 flex flex-col overflow-hidden">
        
        {/* === 🔼 Top Bezel (额头) === */}
        <div className="h-20 bg-[#f0f0f0] flex flex-col items-center justify-center gap-2 pt-1 relative z-20 border-b border-slate-200">
           {/* 听筒和传感器 */}
           <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-slate-800 rounded-full"></div> {/* Facetime Camera */}
             <div className="w-14 h-1.5 bg-slate-400 rounded-full"></div>   {/* Speaker */}
           </div>
        </div>


        {/* === 📺 Screen Area (显示屏) === */}
        {/* 核心区域：WaveBackground 被限制在这里面 */}
        {/* 设置黑色背景模拟熄屏状态，并加一点内边框模拟屏幕黑边 */}
        <div className="flex-1 relative bg-black overflow-hidden border-x-2 border-black">
            
            {/* 🌊 屏幕背景层 (波浪) */}
            <div className="absolute inset-0 z-0">
                 <WaveBackground progress={progress} />
            </div>

            {/* 📱 屏幕 UI 层 (文字等) */}
            {/* 注意：字体颜色改为深色，以适应浅色的波浪背景 */}
            <div className="relative z-10 flex flex-col h-full p-5 text-slate-800 transition-colors duration-500">
                
                {/* 状态栏 (当进度低时，为了在黑底上看清，可以加个动态颜色，这里暂用深色) */}
                <div className={`flex justify-between text-xs font-medium mb-8 ${progress < 20 ? 'text-white/80' : 'text-slate-800/80'}`}>
                    <span>9:41 AM</span>
                    <span>100% 🔋</span>
                </div>

                {/* 中间内容 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    {/* 模拟一个充电图标 */}
                    <div className={`text-6xl mb-4 transition-all ${progress === 100 ? 'scale-110 text-emerald-600 animate-pulse' : 'text-slate-800'}`}>
                        ⚡️
                    </div>
                    <div className="text-5xl font-light tracking-tighter">
                        {progress}%
                    </div>
                    <div className="text-sm font-bold uppercase tracking-widest opacity-60">
                        {progress === 100 ? 'Fully Charged' : 'Charging...'}
                    </div>
                </div>
            </div>
        </div>


        {/* === 🔽 Bottom Bezel (下巴) === */}
        <div className="h-24 bg-[#f0f0f0] flex items-center justify-center relative z-20 border-t border-slate-200">
           {/* Home Button */}
           <button 
             onClick={() => setProgress(0)} // 点击 Home 键重置，增加一点交互趣味
             className="w-16 h-16 bg-white rounded-full border-[3px] border-slate-300 flex items-center justify-center shadow-sm active:bg-slate-100 active:scale-95 transition-all cursor-pointer"
           >
              {/* Home 键中间的方块图标 */}
              <div className="w-5 h-5 rounded-[4px] border-[2px] border-slate-400"></div> 
           </button>
        </div>

      </div>

      {/* 🎛️ 外部控制台 */}
      <div className="bg-slate-700/50 backdrop-blur-md border border-slate-600 p-6 rounded-2xl flex gap-4">
        {[0, 25, 50, 75, 100].map((val) => (
          <button
            key={val}
            onClick={() => setProgress(val)}
            className={`
              px-5 py-2 rounded-xl font-bold transition-all border-b-4 active:border-b-0 active:translate-y-1 text-sm
              ${progress === val 
                ? 'bg-emerald-500 text-white border-emerald-700 shadow-lg' 
                : 'bg-slate-800 text-slate-300 border-slate-900 hover:bg-slate-700'}
            `}
          >
            {val}%
          </button>
        ))}
      </div>

    </div>
  );
}