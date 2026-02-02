import React from 'react'
import { motion } from 'framer-motion'

// ============ 动画配置 (保持不变) ============
// 线条生长
const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { delay: i * 0.3, type: 'spring', duration: 5, bounce: 0 }, // 稍微调慢一点，更优雅
      opacity: { delay: i * 0.3, duration: 0.1 },
    },
  }),
}

// 呼吸脉动
const pulse = {
  initial: { strokeWidth: 2, opacity: 0.8 },
  animate: {
    strokeWidth: [2, 4, 2],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 4, // 呼吸更缓慢深沉
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
}

export function VitalityLines() {
  // 通用 Path 属性
  const pathProps = {
    stroke: "url(#vitality-gradient)",
    strokeLinecap: "round",
    filter: "url(#glow)",
    variants: draw,
    initial: "hidden",
    animate: "visible",
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full z-10 pointer-events-none mix-blend-screen"
      viewBox="0 0 1440 900" // 确保视口固定，方便控制边界
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 发光滤镜 */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* 生机渐变色 (嫩绿 -> 翠绿) */}
        <linearGradient id="vitality-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#a3e635" /> 
          <stop offset="100%" stopColor="#34d399" /> 
        </linearGradient>
      </defs>

      {/* ============ 🌸 5根生机花瓣线条 ============ 
         路径设计思路：起点都在底部中心附近，通过多段贝塞尔曲线(C/S)实现复杂的向内卷曲。
      */}

      {/* 1. 中心花蕊 (直立向上，微卷) */}
      <motion.path
        d="M720 980 C 720 800, 700 500, 720 300 C 730 250, 700 200, 720 150"
        strokeWidth="3"
        custom={0} // 最先出场
        {...pathProps}
      >
         <motion.animate variants={pulse} initial="initial" animate="animate" />
      </motion.path>

      {/* 2. 内层左花瓣 (向左上，再向内卷) */}
      <motion.path
        d="M700 950 C 600 750, 500 550, 600 350 C 650 250, 750 300, 700 400"
        strokeWidth="2.5"
        custom={1}
        {...pathProps}
      >
         <motion.animate variants={pulse} initial="initial" animate="animate" />
      </motion.path>

      {/* 3. 内层右花瓣 (镜像对称) */}
      <motion.path
        d="M740 950 C 840 750, 940 550, 840 350 C 790 250, 690 300, 740 400"
        strokeWidth="2.5"
        custom={1.2}
        {...pathProps}
      >
         <motion.animate variants={pulse} initial="initial" animate="animate" />
      </motion.path>

      {/* 4. 外层左大卷 (宽幅向左，顶部大螺旋向内，不超出边界) */}
      <motion.path
        // 起点 -> 宽幅腰部(x=200) -> 顶部高点(x=300,y=100) -> 向内螺旋卷曲
        d="M680 960 C 400 850, 200 650, 300 300 C 350 150, 550 100, 650 250 C 700 350, 550 450, 450 350"
        strokeWidth="2"
        custom={2}
        {...pathProps}
      >
         <motion.animate variants={pulse} initial="initial" animate="animate" />
      </motion.path>

      {/* 5. 外层右大卷 (镜像对称) */}
      <motion.path
        // 起点 -> 宽幅腰部(x=1240) -> 顶部高点(x=1140,y=100) -> 向内螺旋卷曲
        d="M760 960 C 1040 850, 1240 650, 1140 300 C 1090 150, 890 100, 790 250 C 740 350, 890 450, 990 350"
        strokeWidth="2"
        custom={2.2}
        {...pathProps}
      >
         <motion.animate variants={pulse} initial="initial" animate="animate" />
      </motion.path>

    </svg>
  )
}