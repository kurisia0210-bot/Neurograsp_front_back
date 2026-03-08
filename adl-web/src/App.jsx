import React, { useState } from 'react'
// 棣冩啚 鐠囬攱鐗撮幑顔荤稑閻ㄥ嫬鐤勯梽鍛扮熅瀵板嫭顥呴弻銉礉婵″倹鐏?MainMenu 閸?ui 閺傚洣娆㈡径鐧哥礉鐠囬攱鏁兼稉?'./components/ui/MainMenu'
import { MainMenu } from './components/MainMenu'
import { Level1 } from './components/levels/level1'
import { Playground } from './playground/Playground'
import { BubbleTestDashboard } from './playground/BubbleTestDashboard'
import { SvgTestDashboard } from './playground/SvgTestDashboard'
import { AgentPlayground } from './playground/AgentPlayground'
import LivelyLightingComboPreview from './components/ui/light_test'

export default function App() {
  // 棣冃?鐠侯垳鏁遍悩鑸碘偓? 'menu' | 'level1' | 'playground' | 'bubble-test'
  // 棣冃?瀵偓閸欐垶膩瀵骏绱伴惄瀛樺复閸氼垰濮╁ù瀣槸妞ょ敻娼伴敍灞炬暭娑?'bubble-test'
  const [currentScreen, setCurrentScreen] = useState('menu')

  // 棣冾潵 閺嶇绺炬穱顔碱槻閿涙碍娅ら懗鍊熺熅閻㈠崬顦╅悶鍡楀毐閺?
  // 鏉╂瑤閲滈崙鑺ユ殶鐟欙絽鍠呮禍?Cursor 閹稿洤鍤惃?"levelplayground" 閹峰吋甯撮柨娆掝嚖
  const handleStartLevel = (levelId) => {
    if (levelId === 'playground') {
      // 婵″倹鐏夐弰?playground閿涘瞼娲块幒銉ㄧ儲鏉烆剨绱濇稉宥堫洣閸旂姴澧犵紓鈧?
      setCurrentScreen('playground')
    } else if (levelId === 'agent-playground') {
      // 婵″倹鐏夐弰?agent-playground閿涘瞼娲块幒銉ㄧ儲鏉?
      setCurrentScreen('agent-playground')
    } else {
      // 婵″倹鐏夐弰顖涙殶鐎涙鍙ч崡?(1)閿涘苯濮炴稉濠傚缂傗偓閸欐ɑ鍨?'level1'
      setCurrentScreen(`level${levelId}`)
    }
  }

  return (
    // 閸忔娊鏁悙鐧哥窗w-full h-screen overflow-hidden 绾喕绻氭稉宥勭窗閸戣櫣骞囬崣灞剧泊閸斻劍娼?
    <div className="w-full h-screen font-sans overflow-hidden bg-slate-50">
      
      {/* 棣冃?瀵偓閸欐垼鈧懎鎻╅幑閿嬪瘻闁?*/}
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
            Agent Playground
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
            SVG Test
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
            Light Test
          </button>
        </div>
      )}
      
      {/* 棣冩磧 闁插秶鍋ｅΛ鈧弻銉ㄧ箹闁插矉绱?
         娴ｇ姳绠ｉ崜宥囨畱娴狅絿鐖滈崣顖濆厴娑撳秴鐨箛鍐ㄥ灩閹哄绨?`{currentScreen === 'menu' && ...}` 鏉╂瑥鐪伴崠鍛帮紮閵?
         韫囧懘銆忛張澶庣箹娑擃亜鍨介弬顓ㄧ礉閼挎粌宕熼幍宥勭窗閸︺劏绻橀崗銉︾埗閹村繐鎮楀☉鍫濄亼閵?
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

      {/* 閸忓啿宕辩捄顖滄暠 */}
      {currentScreen === 'level1' && (
        <Level1 onBack={() => setCurrentScreen('menu')} />
      )}
      
      
      {/* 鐠囨洟鐛欓崷楦跨熅閻?*/}
      {currentScreen === 'playground' && (
        <Playground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 棣冃?Bubble 濞村鐦禒顏囥€冮惄?*/}
      {currentScreen === 'bubble-test' && (
        <BubbleTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}

            SVG Test
      {currentScreen === 'svg-test' && (
        <SvgTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}

            Agent Playground
      {currentScreen === 'agent-playground' && (
        <AgentPlayground onBack={() => setCurrentScreen('menu')} />
      )}

            Light Test
      {currentScreen === 'light-test' && (
        <LivelyLightingComboPreview onBack={() => setCurrentScreen('menu')} />
      )}

    </div>
  )
}
