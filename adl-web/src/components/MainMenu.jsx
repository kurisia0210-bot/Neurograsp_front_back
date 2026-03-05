import React from 'react'
import { motion } from 'framer-motion' // 馃憟 寮曞叆鍔ㄦ晥搴?
import { VitalityLines } from './ui/VitalityLines'
import { PetalsBackground } from './ui/PetalsBackground'

// ============ 鍔ㄧ敾鍙樹綋閰嶇疆 (Animation Variants) ============

// 1. 瀹瑰櫒鍙樹綋锛氭帶鍒跺瓙鍏冪礌鐨勯敊钀藉叆鍦?
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // 姣忎釜瀛愬厓绱犻棿闅?0.15绉掑叆鍦?
      delayChildren: 0.3,
    },
  },
}

// 2. 閫氱敤鍏冪礌鍏ュ満鍙樹綋锛堝悜涓婃诞鐜帮級
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15 }, // 寮规€х墿鐞嗘晥鏋?
  },
}


// 3. 鑳屾櫙鏋佸厜鎱㈠姩鍙樹綋
const auroraVariants = {
  animate: {
    scale: [1, 1.1, 0.9, 1],
    x: [0, 50, -50, 0],
    y: [0, -30, 30, 0],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 20, // 鏋佹參閫熸祦鍔?
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
}

export function MainMenu({ onStartLevel }) {
  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
      
      {/* ============ 鉁?鑳屾櫙鍚堟垚灞?============ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         
         {/* 1. 鏋佸厜搴曡壊 (绋嶅井鍑忔贰锛屼綔涓烘皼鍥村厜) */}
         <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white/50"></div>

         {/* 2. 鏃嬭浆鐨勭敓鍛戒箣鑺?(Petals) */}
         <PetalsBackground />

         {/* 3. 鐏靛姩鐨勭嚎鏉?(Vitality Lines) - 鍙犲姞鍦ㄨ姳鐡ｄ箣涓?*/}
         <VitalityLines />

         {/* 4. 鍣偣绾圭悊 (澧炲姞璐ㄦ劅) */}
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay z-20"></div>
      </div>


      {/* ============ 馃専 UI 鍐呭灞?============ */}
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

      {/* 鍏冲崱閫夋嫨鍖?*/}
      <motion.div 
        className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        
        {/* ============ 鍗＄墖 1: 鏋佽嚧閫忔槑鍖栧鐞?============ */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ 
            scale: 1.03, 
            y: -5, 
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" 
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLevel(1)}
          // 馃憞 鍏抽敭淇敼锛歜g-white/40 (鏇撮€?, backdrop-blur-xl (寮烘ā绯?
          className="group relative bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-white/60 cursor-pointer flex items-center gap-6 overflow-hidden hover:bg-white/50 transition-colors"
        >
          {/* 鍐呴儴楂樺厜娴?*/}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent opacity-50"></div>
          
          <motion.div 
            whileHover={{ y: -8, rotate: [0, -5, 5, 0] }}
            className="relative w-24 h-24 bg-gradient-to-tr from-blue-100/80 to-white/80 rounded-2xl flex items-center justify-center text-5xl shadow-sm backdrop-blur-md"
          >
            馃嵆
          </motion.div>
          
          <div className="text-left relative z-10">
            <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-700">鍘ㄦ埧鏁寸悊</h3>
            <p className="text-slate-600 text-sm mt-2 font-medium">浠诲姟锛氬皢鐗╁搧褰掍綅锛屾仮澶嶇敓娲荤З搴忋€?/p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Badge color="white">馃 璁ょ煡璁粌</Badge>
              <Badge color="white">馃 鎷栨嫿鎺у埗</Badge>
            </div>
          </div>
        </motion.div>

          {/* ============ 鍗＄墖 2: 绱ф€ヨ仈缁?(宸茶В閿? ============ */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ 
            scale: 1.03, 
            y: -5, 
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" 
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLevel('level2-disabled')} // 馃憟 缁戝畾鐐瑰嚮浜嬩欢
          // 馃憞 绉婚櫎鐏拌壊婊ら暅锛屾敼涓烘縺娲绘牱寮?
          className="group relative bg-white/40 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-white/60 cursor-pointer flex items-center gap-6 overflow-hidden hover:bg-white/50 transition-colors"
        >
          {/* 鍐呴儴楂樺厜娴?*/}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <motion.div 
            whileHover={{ y: -8, rotate: [0, 5, -5, 0] }}
            // 鏀逛负绱壊绯诲浘鏍囪儗鏅?
            className="relative w-24 h-24 bg-gradient-to-tr from-purple-100/80 to-white/80 rounded-2xl flex items-center justify-center text-5xl shadow-sm backdrop-blur-md"
          >
            鈽庯笍
          </motion.div>
          
          <div className="text-left relative z-10">
            <h3 className="text-2xl font-bold text-slate-800 group-hover:text-purple-700">绱ф€ユ嫧鍙?/h3>
            <p className="text-slate-600 text-sm mt-2 font-medium">浠诲姟锛氳蹇嗗苟鎷ㄦ墦鍙风爜锛岄敾鐐肩簿缁嗗姩浣溿€?/p>
            <div className="mt-4 flex gap-3 flex-wrap">
              <Badge color="white">馃 璁板繂璁粌</Badge>
              <Badge color="white">馃憜 绮剧粏鎺у埗</Badge>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* 馃И 寮€鍙戣€呭疄楠屽鍗＄墖 */}
      <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          // 馃憞 浼犲弬 'playground' 瀵瑰簲 App.jsx 閲岀殑璺敱
          onClick={() => onStartLevel('playground')} 
          className="col-span-1 md:col-span-2 mt-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-600 cursor-pointer flex items-center justify-center gap-4 group hover:bg-slate-800 transition-all"
        >
          <span className="text-2xl group-hover:rotate-12 transition-transform">馃И</span>
          <span className="text-slate-200 font-bold font-mono group-hover:text-white">
            杩涘叆寮€鍙戣€呰瘯楠屽満 (Playground)
          </span>
        </motion.div>

      {/* 馃 Agent Playground 鍗＄墖 */}
      <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStartLevel('agent-playground')} 
          className="col-span-1 md:col-span-2 mt-2 bg-gradient-to-r from-blue-800/80 to-cyan-700/80 backdrop-blur-md p-4 rounded-2xl border border-blue-600/60 cursor-pointer flex items-center justify-center gap-4 group hover:from-blue-800 hover:to-cyan-700 transition-all"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">馃</span>
          <span className="text-blue-100 font-bold font-mono group-hover:text-white">
            杩涘叆Agent娴嬭瘯鍦?(Agent Playground)
          </span>
        </motion.div>

      <motion.div variants={itemVariants} className="absolute bottom-6 text-slate-500/80 text-xs font-bold tracking-wider uppercase bg-white/30 px-4 py-1 rounded-full backdrop-blur-sm">
        Designed for Stroke Rehabilitation
      </motion.div>
    </div>
  )
}

// Badge 缁勪欢绋嶅井鏀逛竴涓嬮厤鑹诧紝閫傚簲閫忔槑鑳屾櫙
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
