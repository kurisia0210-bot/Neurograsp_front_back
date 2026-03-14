import React, { useState, useEffect } from 'react';
import { 
  COLORS, HAIR_BACK_1, HAIR_BACK_2, SKIN_BASE, HAIR_FRONT, 
  BROWS, NOSE, FACE_OUTLINE, MOUTH_PATHS 
} from '../assets/avatars/DoctorParts'; 

/**
 * 👨‍⚕️ DoctorAvatar (语义状态版)
 * ---------------------------
 * 状态映射:
 * - 'waiting' → 空闲等待 (原'idle')
 * - 'processing' → 处理输入 (原'inputting')
 * - 'completed' → 任务完成 (原'calling')
 * - 'supporting' → 提供支持 (原'encouraging')
 * - 'speaking' → 正在说话 (保持不变)
 */
export function DoctorAvatar({ status = 'waiting', className = '', disableEyeTracking = false }) {
  // === 🔒 内部状态 ===
  const [eyeOffsetX, setEyeOffsetX] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthVariant, setMouthVariant] = useState('idle'); // MOUTH_PATHS有'idle'键
  
  // 向后兼容:将旧状态映射到新状态
  const semanticStatus = (() => {
    switch(status) {
      case 'idle': return 'waiting';
      case 'inputting': return 'processing';
      case 'calling': return 'completed';
      case 'encouraging': return 'supporting';
      case 'speaking': return 'speaking';
      default: return status;
    }
  })();

  // === 🧠 逻辑 1: 眼神追踪 (保持不变) ===
  useEffect(() => {
    if (disableEyeTracking) return;
    const handleMouseMove = (e) => {
      const { innerWidth } = window;
      const distFromRight = e.clientX - innerWidth; 
      const x = Math.max(-14, distFromRight / 55); 
      setEyeOffsetX(x);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [disableEyeTracking]);

  // === 🧠 逻辑 2: 眨眼 (保持不变) ===
  useEffect(() => {
    const blinkLoop = setInterval(() => {
      if (Math.random() > 0.7) { 
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    }, 2000);
    return () => clearInterval(blinkLoop);
  }, []);

  // === 🧠 逻辑 3: 嘴型 (修复:使用正确的MOUTH_PATHS键) ===
  useEffect(() => {
    let interval;
    
    // 使用语义状态进行判断,但映射到正确的MOUTH_PATHS键
    if (semanticStatus === 'processing') { 
      interval = setInterval(() => {
        setMouthVariant(prev => prev === 'speaking' ? 'idle' : 'speaking');
      }, 150);
    } else if (semanticStatus === 'completed') {
      setMouthVariant('success');
    } else {
      setMouthVariant('idle'); // MOUTH_PATHS有'idle'键
    }
    return () => clearInterval(interval);
  }, [semanticStatus]);

  // === 🎨 渲染层 ===
  return (
    <div className={`relative overflow-hidden rounded-full ${className}`} style={{ backgroundColor: COLORS.bg }}>
      
      {/* ✨ 注入 CSS 动画样式 */}
      <style>{`
        /* 1. 身体律动 (包含点头效果) */
        @keyframes gentle-nod {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(2px) rotate(0.5deg); } 
        }

        /* 2. 头发飘动 (风吹效果) */
        @keyframes hair-sway-back {
          0%, 100% { transform: rotate(-1deg) skewX(0deg); }
          50% { transform: rotate(2deg) skewX(1deg); }
        }
        @keyframes hair-sway-front {
          0%, 100% { transform: rotate(0.5deg) translateX(0); }
          50% { transform: rotate(-1.5deg) translateX(1px); }
        }

        /* 3. 手臂上举动画 */
        @keyframes arm-up {
          0% {
            transform: translateY(100%) rotate(10deg);
            opacity: 0;
          }
          100% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
        }

        /* 应用类 */
        .anim-nod {
          animation: gentle-nod 4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        
        .anim-hair-back {
          animation: hair-sway-back 3s ease-in-out infinite;
          transform-origin: center top; /* 头发根部不动 */
          transform-box: fill-box;
        }
        
        .anim-hair-front {
          animation: hair-sway-front 2.5s ease-in-out infinite;
          animation-delay: 0.5s; /* 稍微错开一点时间,更有层次感 */
          transform-origin: center top;
          transform-box: fill-box;
        }
        
        .animate-arm-up {
          animation: arm-up 0.5s ease-out forwards;
        }
      `}</style>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 980 980"
        fill="none"
        className="w-full h-full"
      >
        <mask id="avatar-mask">
          <rect width={980} height={980} fill="#fff" />
        </mask>
        <g mask="url(#avatar-mask)">
          <path fill={COLORS.bg} d="M0 0H980V980H0z" />

          {/* ✨ 将所有部件包裹在 Nod 组中 */}
          <g className="anim-nod">
            
            {/* 💇‍♂️ 后面的头发 (添加摆动动画) */}
            <g className="anim-hair-back">
              <path d={HAIR_BACK_1} fill={COLORS.hair} transform="translate(10 -60)" />
              <path d={HAIR_BACK_2} fill={COLORS.hair} transform="translate(10 -60)" />
            </g>

            <path d={SKIN_BASE} fill={COLORS.skin} transform="translate(10 -60)" />
            
            {/* 💇‍♂️ 前面的刘海 (添加独立的摆动动画,显得头发很软) */}
            <g className="anim-hair-front">
               <path d={HAIR_FRONT} fill={COLORS.hair} transform="translate(10 -60)" />
            </g>

            <path d={BROWS} fill={COLORS.stroke} transform="translate(10 -60)" />
            <path d={NOSE} fill={COLORS.stroke} transform="translate(10 -60)" />
            <path d={FACE_OUTLINE} fill={COLORS.stroke} transform="translate(10 -60)" />

            {/* 嘴巴 */}
            <path 
              d={MOUTH_PATHS[mouthVariant]} 
              fill={COLORS.stroke} 
              transform="translate(10 -60)" 
            />

            {/* 眼睛 (跟随 Nod 一起动) */}
            <g
              id="Eyes_Group"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center',
                transform: `translate(${eyeOffsetX}px, 0px) scaleY(${isBlinking ? 0.15 : 1})`,
                transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <path
                d="M665 473c7-1 15-1 22 3 6 4 10 9 11 16l17 3c-4 4-11 6-17 6-5 0-11-1-15-4l-10-8c-6-3-11-2-17 0 3 3 6 6 7 10 4 12 3 25-2 36l10-5c1 6-1 10-5 13-8 9-21 10-33 10-4-1-10-3-12-7-3-4-1-8-3-12s-1-9 0-13a70 70 0 0147-48zm-208 11c27 1 52 18 64 42 2 2 3 6 1 9-3 0-5-4-7-6-6-10-14-18-23-24-10-6-21-8-32-8 6 10 9 22 8 33-1 9-5 19-12 25l9 4c-6 3-12 3-18 2-11-3-21-8-30-15-9-6-16-15-19-25-14 0-29-2-43-8 3-2 5-2 8-2l28-4c4-1 8-1 11-4 15-13 35-20 55-19z"
                fill="#000"
                stroke={isBlinking ? "#000" : "none"}
                strokeWidth={isBlinking ? 5 : 0} 
                transform="translate(10 -60)"
              />
            </g>
          </g>
        </g>
      </svg>

      {/* 📱 手机动画:只在 completed 状态下触发 */}
      {semanticStatus === 'completed' && (
        <div className="absolute bottom-[10%] right-[40%] w-[60%] h-[60%] z-20 animate-arm-up pointer-events-none">
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(-20 100 100)">
                <rect x="80" y="40" width="60" height="90" rx="6" fill="white" stroke={COLORS.stroke || "#2d3748"} strokeWidth="3"/>
                <rect x="97" y="50" width="20" height="3" rx="1.5" fill="black" opacity="0.6"/>
            </g>
          </svg>
        </div>
      )}

    </div>
  );
}
