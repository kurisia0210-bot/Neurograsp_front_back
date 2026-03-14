import React, { useState, useEffect } from 'react';
import { Moon, Sun, BookOpen, LayoutTemplate, Info } from 'lucide-react';

// ==========================================
// 全局环境动画 (极致缓慢、克制)
// ==========================================
const styles = `
  /* 云朵缓慢漂浮 */
  @keyframes float-cloud {
    from { transform: translateX(-5%); }
    to { transform: translateX(105%); }
  }
  .animate-slow-cloud {
    animation: float-cloud 40s linear infinite;
  }

  /* 呼吸灯效果 (用于夜灯) */
  @keyframes breathe-glow {
    0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 10px rgba(253, 224, 71, 0.4)); }
    50% { opacity: 0.8; filter: drop-shadow(0 0 20px rgba(253, 224, 71, 0.8)); }
  }
  .animate-breathe {
    animation: breathe-glow 4s ease-in-out infinite;
  }

  /* 树叶轻微摇曳 */
  @keyframes gentle-sway {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(2deg); }
  }
  .animate-sway {
    transform-origin: bottom center;
    animation: gentle-sway 6s ease-in-out infinite;
  }
`;

// ==========================================
// 场景 1: 安静的卧室 (夜晚/睡眠过渡训练)
// 审美特点：深邃蓝紫调，高对比度但极低亮度，传递安全感
// ==========================================
const BedroomScene = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full drop-shadow-2xl">
    {/* 墙壁背景 */}
    <rect width="160" height="90" fill="#1e1b4b" />
    
    {/* 地板 */}
    <polygon points="0,70 160,70 160,90 0,90" fill="#312e81" />
    <polygon points="0,70 160,70 160,72 0,72" fill="#3730a3" />

    {/* 窗户与夜空 */}
    <g transform="translate(10, 10)">
      <rect width="40" height="50" fill="#0f172a" rx="2" stroke="#4c1d95" strokeWidth="2" />
      {/* 窗外星星 (静态点缀) */}
      <circle cx="10" cy="15" r="0.5" fill="#fef08a" opacity="0.6" />
      <circle cx="30" cy="25" r="0.8" fill="#fef08a" opacity="0.4" />
      <circle cx="20" cy="40" r="0.5" fill="#fef08a" opacity="0.8" />
      {/* 弯月 */}
      <path d="M25 15 A 8 8 0 1 0 35 25 A 10 10 0 0 1 25 15 Z" fill="#fde047" opacity="0.9" />
      {/* 窗框 */}
      <line x1="20" y1="0" x2="20" y2="50" stroke="#4c1d95" strokeWidth="2" />
      <line x1="0" y1="25" x2="40" y2="25" stroke="#4c1d95" strokeWidth="2" />
      {/* 窗帘 */}
      <path d="M-2 0 Q 5 25 -2 50 L 8 50 Q 15 25 8 0 Z" fill="#5b21b6" opacity="0.9" />
    </g>

    {/* 卧室床 (2.5D 极简风格) */}
    <g transform="translate(70, 45)">
      {/* 床头板 */}
      <rect x="70" y="-10" width="10" height="35" fill="#8b5cf6" rx="2" />
      {/* 床体侧面阴影 */}
      <polygon points="0,20 75,20 75,30 0,30" fill="#4c1d95" />
      {/* 床垫/被子顶部 */}
      <polygon points="-5,15 70,15 75,20 0,20" fill="#ddd6fe" />
      {/* 翻折的被角 */}
      <polygon points="40,15 70,15 75,20 45,20" fill="#c4b5fd" />
      <polygon points="40,15 45,20 40,25" fill="#a78bfa" />
      {/* 枕头 */}
      <rect x="55" y="10" width="15" height="8" rx="3" fill="#ffffff" opacity="0.9" transform="rotate(-5 55 10)" />
    </g>

    {/* 床头柜与夜灯 */}
    <g transform="translate(145, 55)">
      {/* 柜体 */}
      <rect x="0" y="10" width="15" height="20" fill="#6d28d9" rx="1" />
      <rect x="0" y="8" width="15" height="2" fill="#8b5cf6" />
      {/* 抽屉缝隙 */}
      <line x1="2" y1="18" x2="13" y2="18" stroke="#5b21b6" strokeWidth="1" />
      <circle cx="7.5" cy="14" r="1" fill="#4c1d95" />
      {/* 夜灯 (动态呼吸发光) */}
      <path d="M 4 8 L 5 2 L 10 2 L 11 8 Z" fill="#fde047" className="animate-breathe" />
      <rect x="6.5" y="8" width="2" height="2" fill="#4c1d95" />
    </g>
  </svg>
);

// ==========================================
// 场景 2: 午后公园 (户外泛化/放松训练)
// 审美特点：大面积柔和的草绿色和天空蓝，曲线主导，带来开阔感
// ==========================================
const ParkScene = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full drop-shadow-2xl overflow-hidden">
    {/* 天空渐变 */}
    <defs>
      <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="100%" stopColor="#e0f2fe" />
      </linearGradient>
    </defs>
    <rect width="160" height="90" fill="url(#sky)" />

    {/* 太阳 */}
    <circle cx="130" cy="20" r="12" fill="#fef08a" opacity="0.8" />

    {/* 云朵 (极慢速飘动) */}
    <g className="animate-slow-cloud" fill="#ffffff" opacity="0.9">
      <path d="M -20 20 Q -15 15 -10 20 Q -5 12 5 20 Q 15 18 10 25 L -20 25 Z" />
      <path d="M 60 15 Q 65 10 70 15 Q 75 8 85 15 Q 95 13 90 20 L 60 20 Z" transform="scale(0.8) translate(20, -5)" opacity="0.7" />
    </g>

    {/* 远山/草坡 (曲线层次) */}
    <path d="M 0 50 Q 40 40 80 50 T 160 45 L 160 90 L 0 90 Z" fill="#bbf7d0" />
    <path d="M 0 65 Q 60 55 100 65 T 160 60 L 160 90 L 0 90 Z" fill="#86efac" />
    <path d="M 0 80 Q 80 70 160 85 L 160 90 L 0 90 Z" fill="#4ade80" />

    {/* 树木 (整体轻微摇曳) */}
    <g transform="translate(120, 35)" className="animate-sway">
      {/* 树干 */}
      <rect x="18" y="20" width="4" height="30" fill="#78350f" rx="1" />
      {/* 树冠 (几何重叠) */}
      <circle cx="20" cy="15" r="18" fill="#22c55e" />
      <circle cx="10" cy="25" r="12" fill="#16a34a" />
      <circle cx="30" cy="25" r="12" fill="#15803d" />
      <circle cx="20" cy="5" r="10" fill="#4ade80" opacity="0.5" />
    </g>

    {/* 公园长椅 (2.5D 原木风) */}
    <g transform="translate(30, 65)">
      {/* 阴影 */}
      <ellipse cx="25" cy="18" rx="20" ry="4" fill="#16a34a" opacity="0.5" />
      {/* 腿 */}
      <rect x="8" y="10" width="3" height="8" fill="#52525b" />
      <rect x="38" y="10" width="3" height="8" fill="#52525b" />
      {/* 座板 */}
      <polygon points="5,8 45,8 42,12 8,12" fill="#d97706" />
      <polygon points="5,8 8,12 42,12 45,8" fill="#f59e0b" /> {/* 顶部高光 */}
      {/* 靠背支撑 */}
      <rect x="10" y="0" width="2" height="10" fill="#52525b" transform="skewX(15) translate(-2, 0)" />
      <rect x="38" y="0" width="2" height="10" fill="#52525b" transform="skewX(15) translate(-2, 0)" />
      {/* 靠背木条 */}
      <rect x="12" y="0" width="28" height="3" fill="#f59e0b" rx="1" />
      <rect x="10" y="5" width="28" height="3" fill="#d97706" rx="1" />
    </g>
  </svg>
);

// ==========================================
// 场景 3: 结构化教室 (学习/专注力训练)
// 审美特点：中性暖灰与木色，强调方正的结构和空间秩序感
// ==========================================
const ClassroomScene = () => (
  <svg viewBox="0 0 160 90" className="w-full h-full drop-shadow-2xl">
    {/* 墙壁 */}
    <rect width="160" height="90" fill="#f8fafc" />
    {/* 护墙板 */}
    <rect y="50" width="160" height="40" fill="#e2e8f0" />
    <line x1="0" y1="50" x2="160" y2="50" stroke="#cbd5e1" strokeWidth="2" />
    <line x1="0" y1="85" x2="160" y2="85" stroke="#94a3b8" strokeWidth="3" /> {/* 踢脚线 */}

    {/* 黑板 (中心视觉锚点) */}
    <g transform="translate(40, 10)">
      {/* 阴影 */}
      <rect x="2" y="2" width="80" height="35" fill="#cbd5e1" />
      {/* 边框 */}
      <rect x="0" y="0" width="80" height="35" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="2" rx="1" />
      {/* 板面 */}
      <rect x="2" y="2" width="76" height="31" fill="#334155" />
      {/* 粉笔槽 */}
      <rect x="0" y="35" width="80" height="2" fill="#a1a1aa" />
      {/* 槽里的粉笔和板擦 */}
      <rect x="10" y="33" width="4" height="2" fill="#ffffff" />
      <rect x="16" y="33" width="2" height="2" fill="#fca5a5" />
      <rect x="60" y="32" width="8" height="3" fill="#fb923c" rx="0.5" />
      
      {/* 黑板上的内容 (简单的几何认知，适合ASD) */}
      <circle cx="20" cy="17" r="8" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
      <rect x="35" y="9" width="16" height="16" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
      <polygon points="65,9 73,25 57,25" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.8" />
    </g>

    {/* 教室挂钟 */}
    <g transform="translate(15, 15)">
      <circle cx="10" cy="10" r="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1" fill="#334155" />
      {/* 时针分针 */}
      <line x1="10" y1="10" x2="10" y2="5" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="10" x2="14" y2="10" stroke="#334155" strokeWidth="1" strokeLinecap="round" />
    </g>

    {/* 学生课桌 (位于右前方的透视视角) */}
    <g transform="translate(90, 60)">
      {/* 阴影 */}
      <ellipse cx="25" cy="28" rx="20" ry="4" fill="#cbd5e1" opacity="0.8" />
      {/* 桌腿 */}
      <rect x="8" y="10" width="3" height="18" fill="#94a3b8" />
      <rect x="38" y="10" width="3" height="18" fill="#94a3b8" />
      {/* 桌面屉斗 */}
      <polygon points="0,5 50,5 45,12 5,12" fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="1" />
      {/* 桌面板 */}
      <polygon points="-5,0 45,0 50,5 0,5" fill="#fde68a" stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
      {/* 桌上的书本 */}
      <polygon points="10,2 25,2 28,4 13,4" fill="#38bdf8" />
      <polygon points="9,1.5 24,1.5 25,2 10,2" fill="#ffffff" />
    </g>
  </svg>
);


// ==========================================
// 容器与画廊逻辑
// ==========================================
export default function App() {
  const [activeScene, setActiveScene] = useState('bedroom');

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  const scenes = [
    { id: 'bedroom', name: '安静卧室', icon: Moon, component: BedroomScene, desc: '低照度、冷色调，适合睡前/放松场景的训练。' },
    { id: 'park', name: '午后公园', icon: Sun, component: ParkScene, desc: '开阔的视野与柔和的自然色，适合泛化训练与脱敏。' },
    { id: 'classroom', name: '结构化教室', icon: BookOpen, component: ClassroomScene, desc: '明确的边界与几何锚点，适合专注力与社交预演。' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      
      {/* 顶部标题区 */}
      <div className="w-full max-w-4xl mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-blue-500" />
            康复场景画廊 (Aesthetics Demo)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            "低唤醒度、高结构化" —— 为自闭症(ASD)儿童设计的纯2D交互环境美学。
          </p>
        </div>
      </div>

      {/* 主展示区 */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
        
        {/* 导航 Tab 区 */}
        <div className="flex bg-slate-50 border-b border-slate-200 p-2 gap-2">
          {scenes.map((scene) => {
            const isActive = activeScene === scene.id;
            const Icon = scene.icon;
            return (
              <button
                key={scene.id}
                onClick={() => setActiveScene(scene.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-medium transition-all ${
                  isActive 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200 scale-[1.02]' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
                {scene.name}
              </button>
            );
          })}
        </div>

        {/* 场景渲染区 (锁定 16:9 比例，确保在任何屏幕上构图不乱) */}
        <div className="w-full aspect-[16/9] relative bg-slate-100 overflow-hidden">
          {scenes.map((scene) => {
            // 使用大写变量名来符合 React 组件的渲染规范
            const SceneComponent = scene.component;
            return (
              <div 
                key={scene.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  activeScene === scene.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <SceneComponent />
              </div>
            );
          })}
        </div>

        {/* 底部设计解说区 (PM Rationale) */}
        <div className="p-6 bg-white flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <Info className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              当前场景：{scenes.find(s => s.id === activeScene)?.name}
            </h3>
            <p className="text-slate-600 leading-relaxed">
              {scenes.find(s => s.id === activeScene)?.desc}
            </p>
            <div className="mt-3 flex gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">纯 SVG 绘制</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">2.5D 几何透视</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">CSS 无痛微动效</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}