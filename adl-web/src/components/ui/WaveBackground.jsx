import React from 'react';

/**
 * 🌊 WaveBackground (Morandi Light Edition)
 * 1. 物理：100% 时彻底填满屏幕 (TranslateY -> 0)
 * 2. 视觉：全屏提亮，采用莫兰迪“奶白绿”色系，打造无菌、治愈的康复环境
 */
export function WaveBackground({ className = "", progress = 0 }) {
  
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  
  // 🧮 物理计算修正 V4 (Final)
  // 容器高度：120vh (保持不变，防止杠杆效应)
  
  // 映射逻辑：
  // Start (0%): translateY(95%) -> 沉在底部，只露一点浪花 (约 5vh)
  // End (100%): translateY(0%)  -> 彻底归位，顶部与屏幕顶部对齐，完全覆盖
  // 跨度: 95个单位
  // 公式: 95 - (p * 0.95)
  
  const translateY = 95 - (safeProgress * 0.95); 

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none ${className}`}>
      
      <div 
        className="absolute left-0 w-full h-[120%] transition-transform duration-[2000ms] cubic-bezier(0.4, 0, 0.2, 1)"
        style={{ 
          bottom: 0, 
          transform: `translateY(${translateY}%)` 
        }}
      >
        <svg 
          className="w-full h-full"
          version="1.1" 
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink" 
          viewBox="0 0 1600 900" 
          preserveAspectRatio="xMidYMin slice"
        >
          <defs>
            {/* 🎨 配色升级：Morandi Morning Mist (莫兰迪晨雾) */}
            {/* 整体提亮，去除深色，让界面看起来像发光的玉石 */}
            <linearGradient id="wave-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="800">
              
              {/* 0%: 浪尖 - 接近纯白的淡青色 (Off-White Green) */}
              {/* 视觉感受：通透、高光 */}
              <stop offset="0%" stopColor="#F0FDF4" stopOpacity="0.95" /> 
              
              {/* 40%: 中层 - 柔和的莫兰迪浅绿 (Pale Sage) */}
              {/* 视觉感受：温润、不刺眼 */}
              <stop offset="40%" stopColor="#D1FAE5" stopOpacity="0.9" />
              
              {/* 100%: 深水 - 稍有分量的豆沙绿，但依然保持明亮 */}
              {/* 视觉感受：稳重但不压抑 */}
              <stop offset="100%" stopColor="#00FF7F" stopOpacity="0.95" />
            
            </linearGradient>
            
            <path 
              id="wave-path" 
              fill="url(#wave-grad)" 
              d="M-363.852,502.589c0,0,236.988-41.997,505.475,0
              s371.981,38.998,575.971,0s293.985-39.278,505.474,5.859s493.475,48.368,716.963-4.995
              v5000H-363.852V502.589z" 
            />
          </defs>

          {/* 📍 位置对齐 */}
          <g transform="translate(0, -480)">
            <use href="#wave-path" opacity=".6">
              <animateTransform attributeName="transform" attributeType="XML" type="translate" dur="10s" calcMode="spline" values="270 0; -334 20; 270 0" keyTimes="0; .5; 1" keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0" repeatCount="indefinite" />
            </use>
            <use href="#wave-path" opacity=".8">
              <animateTransform attributeName="transform" attributeType="XML" type="translate" dur="8s" calcMode="spline" values="-270 10; 243 0; -270 10" keyTimes="0; .6; 1" keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0" repeatCount="indefinite" />
            </use>
            <use href="#wave-path" opacity="1">
              <animateTransform attributeName="transform" attributeType="XML" type="translate" dur="6s" calcMode="spline" values="0 0; -140 20; 0 0" keyTimes="0; .4; 1" keySplines="0.42, 0, 0.58, 1.0;0.42, 0, 0.58, 1.0" repeatCount="indefinite" />
            </use>
          </g>
        </svg>
      </div>
    </div>
  );
}