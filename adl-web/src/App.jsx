import React, { useState } from 'react'
// 妫ｅ啯鍟?閻犲洭鏀遍悧鎾箲椤旇崵绋戦柣銊ュ閻ゅ嫰姊介崨鎵唴鐎垫澘瀚ˉ鍛村蓟閵夘垳绀夊┑鈥冲€归悘?MainMenu 闁?ui 闁哄倸娲ｅ▎銏″緞閻у摜绀夐悹鍥敱閺佸吋绋?'./components/ui/MainMenu'
import { MainMenu } from './components/MainMenu'
import { Level1 } from './components/levels/level1'
import { Playground } from './playground/Playground'
import { BubbleTestDashboard } from './playground/BubbleTestDashboard'
import { SvgTestDashboard } from './playground/SvgTestDashboard'
import { AgentPlayground } from './playground/AgentPlayground'
import LivelyLightingComboPreview from './components/ui/light_test'

export default function App() {
  // 妫ｅ唭?閻犱警鍨抽弫閬嶆偐閼哥鍋? 'menu' | 'level1' | 'playground' | 'bubble-test'
  // 妫ｅ唭?鐎殿喒鍋撻柛娆愬灦鑶╃€殿喖楠忕槐浼存儎鐎涙ê澶嶉柛姘煎灠婵晛霉鐎ｎ厾妲稿銈囨暬濞间即鏁嶇仦鐐毉濞?'bubble-test'
  const [currentScreen, setCurrentScreen] = useState('menu')

  // 妫ｅ喚娼?闁哄秶顭堢缓鐐┍椤旂⒈妲婚柨娑欑濞呫倝鎳楅崐鐔虹唴闁汇垹宕ˇ鈺呮偠閸℃姣愰柡?
  // 閺夆晜鐟ら柌婊堝礄閼恒儲娈堕悷娆欑到閸犲懏绂?Cursor 闁圭娲ら崵顓㈡儍?"levelplayground" 闁瑰嘲鍚嬬敮鎾煥濞嗘帩鍤?
  const handleStartLevel = (levelId) => {
    if (levelId === 'playground') {
      // 濠碘€冲€归悘澶愬及?playground闁挎稑鐬煎ú鍧楀箳閵夈劎鍎查弶鐑嗗墾缁辨繃绋夊鍫矗闁告梻濮存晶鐘电磽閳?
      setCurrentScreen('playground')
    } else if (levelId === 'agent-playground') {
      // 濠碘€冲€归悘澶愬及?agent-playground闁挎稑鐬煎ú鍧楀箳閵夈劎鍎查弶?
      setCurrentScreen('agent-playground')
    } else {
      // 濠碘€冲€归悘澶愬及椤栨稒娈堕悗娑欘殔閸櫻囧础?(1)闁挎稑鑻慨鐐寸▔婵犲倸顤呯紓鍌楀亾闁告瑦蓱閸?'level1'
      setCurrentScreen(`level${levelId}`)
    }
  }

  return (
    // 闁稿繑濞婇弫顓㈡倷閻у摜绐梬-full h-screen overflow-hidden 缁绢収鍠曠换姘▔瀹ュ嫮绐楅柛鎴ｆ楠炲洭宕ｇ仦鍓ф硦闁告柣鍔嶅?
    <div className="w-full h-screen font-sans overflow-hidden bg-slate-50">
      
      {/* 妫ｅ唭?鐎殿喒鍋撻柛娆愬灱閳ь剙鎳庨幓鈺呭箲闁垮鐦婚梺?*/}
      {currentScreen === 'menu' && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999 }}>
          <button
            onClick={() => setCurrentScreen('agent-playground')}
            style={{
              padding: '12px 20px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(52, 152, 219, 0.4)'
            }}
          >
          </button>
          <button
            onClick={() => setCurrentScreen('svg-test')}
            style={{
              padding: '12px 20px',
              background: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(155, 89, 182, 0.4)'
            }}
          >
          </button>
          <button
            onClick={() => setCurrentScreen('bubble-test')}
            style={{
              padding: '12px 20px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(231, 76, 60, 0.4)'
            }}
          >
            Bubble Test
          </button>
          <button
            onClick={() => setCurrentScreen('light-test')}
            style={{
              padding: '12px 20px',
              background: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(243, 156, 18, 0.4)'
            }}
          >
          </button>
        </div>
      )}
      
      {/* 妫ｅ啯纾?闂佹彃绉堕崑锝呂涢埀顒勫蓟閵夈劎绠归梺鎻掔焿缁?
         濞达絿濮崇粻锝夊礈瀹ュ洦鐣卞ù鐙呯悼閻栨粓宕ｉ婵嗗幋濞戞挸绉撮惃顒冪疀閸愩劌鐏╅柟鍝勵槷缁?`{currentScreen === 'menu' && ...}` 閺夆晜鐟ラ惇浼村礌閸涘府绱柕?
         闊洤鎳橀妴蹇涘嫉婢跺海绠瑰☉鎿冧簻閸ㄤ粙寮銊х闁兼寧绮屽畷鐔煎箥瀹ュ嫮绐楅柛锔哄姀缁绘﹢宕楅妷锔惧煑闁规潙绻愰幃妤€鈽夐崼婵勪杭闁?
      */}
      {currentScreen === 'menu' && (
        <MainMenu onStartLevel={handleStartLevel} />
      )}

      {currentScreen === 'menu' && (
        <div
          style={{
            position: 'fixed',
            left: '16px',
            bottom: '10px',
            zIndex: 10000,
            fontSize: '11px',
            lineHeight: 1.35,
            maxWidth: '560px',
            color: '#334155',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div>
            Copyright {new Date().getFullYear()} Wang Junhao. All rights reserved.
          </div>
          <div>
            Unauthorized copy, redistribution, reverse engineering, or commercial use is prohibited.
          </div>
          <div style={{ marginTop: '4px' }}>
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              ICP 2026009520
            </a>
          </div>
        </div>
      )}

      {/* 闁稿繐鍟垮畷杈╂崉椤栨粍鏆?*/}
      {currentScreen === 'level1' && (
        <Level1 onBack={() => setCurrentScreen('menu')} />
      )}
      
      
      {/* 閻犲洦娲熼悰娆撳捶妤﹁法鐔呴柣?*/}
      {currentScreen === 'playground' && (
        <Playground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 妫ｅ唭?Bubble 婵炴潙顑堥惁顖涚椤忓洢鈧啴鎯?*/}
      {currentScreen === 'bubble-test' && (
        <BubbleTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}
      {currentScreen === 'svg-test' && (
        <SvgTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}
      {currentScreen === 'agent-playground' && (
        <AgentPlayground onBack={() => setCurrentScreen('menu')} />
      )}
      {currentScreen === 'light-test' && (
        <LivelyLightingComboPreview onBack={() => setCurrentScreen('menu')} />
      )}

    </div>
  )
}
