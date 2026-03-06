import React from 'react'
import { motion } from 'framer-motion' // 👈 引入动效库
import { VitalityLines } from './ui/VitalityLines'
import { PetalsBackground } from './ui/PetalsBackground'

// ============ 动画变体配置 (Animation Variants) ============

// 1. 容器变体：控制子元素的错落入场
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // 每个子元素间隔 0.15秒入场
      delayChildren: 0.3,
    },
  },
}

// 2. 通用元素入场变体（向上浮现）
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15 }, // 弹性物理效果
  },
}


// 3. 背景极光慢动变体
const auroraVariants = {
  animate: {
    scale: [1, 1.1, 0.9, 1],
    x: [0, 50, -50, 0],
    y: [0, -30, 30, 0],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 20, // 极慢速流动
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
}

export function MainMenu({ onStartLevel }) {
  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      
      {/* ============ ✨ 背景合成层 ============ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         
         {/* 1. 极光底色 (稍微减淡，作为氛围光) */}
         <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white/50"></div>

         {/* 2. 旋转的生命之花 (Petals) */}
         <PetalsBackground />

         {/* 3. 灵动的线条 (Vitality Lines) - 叠加在花瓣之上 */}
         <VitalityLines />

         {/* 4. 噪点纹理 (增加质感) */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay z-20"></div>
      </div>


      {/* ============ 🌟 UI 内容层 ============ */}
      <motion.div 
        className="z-10 text-center mb-12"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1 variants={itemVariants} className="text-6xl font-extrabold text-slate-800 mb-4 tracking-tight drop-shadow-sm relative">
          <span className="relative z-10">Neuro</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 relative z-10">Grasp</span>
        </motion.h1>
        <motion.p variants={itemVariants} className="text-slate-600 font-medium text-lg bg-white/30 backdrop-blur-sm px-6 py-2 rounded-full inline-block border border-white/40">
        </motion.p>
      </motion.div>

      {/* 关卡选择区 */}
      <motion.div 
        className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* ============ 卡片 1: 极致透明化处理 ============ */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ 
            scale: 1.03, 
            y: -5, 
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" 
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLevel(1)}
          // 👇 关键修改：bg-white/40 (更透), backdrop-blur-xl (强模糊)
          className="group relative bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-white/60 cursor-pointer flex items-center gap-6 overflow-hidden hover:bg-white/50 transition-colors"
        >
          {/* 内部高光流 */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent opacity-50"></div>
          
          <motion.div 
            whileHover={{ y: -8, rotate: [0, -5, 5, 0] }}
            className="relative w-24 h-24 bg-gradient-to-tr from-blue-100/80 to-white/80 rounded-2xl flex items-center justify-center text-5xl shadow-sm backdrop-blur-md"
          >
            🍳
          </motion.div>
          
          <div className="text-left relative z-10">
            <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-700">厨房整理</h3>
            <p className="text-slate-600 text-sm mt-2 font-medium">任务：将物品归位，恢复生活秩序。</p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Badge color="white">🧠 认知训练</Badge>
              <Badge color="white">🤏 拖拽控制</Badge>
            </div>
          </div>
        </motion.div>


      </motion.div>

      {/* 🧪 开发者实验室卡片 */}
      <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          // 👇 传参 'playground' 对应 App.jsx 里的路由
          onClick={() => onStartLevel('playground')} 
          className="col-span-1 md:col-span-2 mt-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-600 cursor-pointer flex items-center justify-center gap-4 group hover:bg-slate-800 transition-all"
        >
          <span className="text-2xl group-hover:rotate-12 transition-transform">🧪</span>
          <span className="text-slate-200 font-bold font-mono group-hover:text-white">
            进入开发者试验场 (Playground)
          </span>
        </motion.div>

      {/* 🤖 Agent Playground 卡片 */}
      <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLevel('agent-playground')} 
          className="col-span-1 md:col-span-2 mt-2 bg-gradient-to-r from-blue-800/80 to-cyan-700/80 backdrop-blur-md p-4 rounded-2xl border border-blue-600/60 cursor-pointer flex items-center justify-center gap-4 group hover:from-blue-800 hover:to-cyan-700 transition-all"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-blue-100 font-bold font-mono group-hover:text-white">
            进入Agent测试场 (Agent Playground)
          </span>
        </motion.div>

      <motion.div variants={itemVariants} className="absolute bottom-6 text-slate-500/80 text-xs font-bold tracking-wider uppercase bg-white/30 px-4 py-1 rounded-full backdrop-blur-sm">
        Designed for Stroke Rehabilitation
      </motion.div>
    </div>
  )
}

// Badge 组件稍微改一下配色，适应透明背景
function Badge({ children, color }) {
  const colorMap = {
    white: "bg-white/60 text-slate-700 border-white/50 backdrop-blur-sm",
    gray: "bg-slate-200/50 text-slate-500 border-transparent",
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorMap[color]} shadow-sm`}>
      {children}
    </span>
  )
}
