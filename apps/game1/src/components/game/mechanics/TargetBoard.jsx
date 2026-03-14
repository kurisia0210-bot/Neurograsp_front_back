// src/components/game/levels/TargetBoard.jsx
import React from 'react';

export function TargetBoard({ targetNum, currentInput, isSuccess }) {
  return (
    <div className={`
        flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border-4 border-white
        transition-all duration-500 min-w-[300px]
        ${isSuccess ? 'scale-105 shadow-emerald-200 border-emerald-400' : ''}
    `}>
        <h2 className="text-slate-400 text-lg font-bold tracking-widest uppercase mb-4">
            {isSuccess ? 'Completed' : 'Mission'}
        </h2>
        
        {/* 数字区域 */}
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

        <p className="mt-6 text-slate-500 font-medium text-center">
            {isSuccess ? "太棒了！请点击下一轮" : "请在手机上输入数字"}
        </p>
    </div>
  );
}