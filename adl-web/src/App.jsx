import React, { useState } from 'react'
// 馃憞 璇锋牴鎹綘鐨勫疄闄呰矾寰勬鏌ワ紝濡傛灉 MainMenu 鍦?ui 鏂囦欢澶癸紝璇锋敼涓?'./components/ui/MainMenu'
import { MainMenu } from './components/MainMenu'
import { Level1 } from './components/levels/level1'
import { Playground } from './playground/Playground'
import { BubbleTestDashboard } from './playground/BubbleTestDashboard'
import { HoldableComparison } from './playground/HoldableComparison'
import { AgentPlayground } from './playground/AgentPlayground'
import LivelyLightingComboPreview from './components/ui/light_test'

export default function App() {
  // 馃Л 璺敱鐘舵€? 'menu' | 'level1' | 'level2' | 'playground' | 'bubble-test'
  // 馃И 寮€鍙戞ā寮忥細鐩存帴鍚姩娴嬭瘯椤甸潰锛屾敼涓?'bubble-test'
  const [currentScreen, setCurrentScreen] = useState('menu')

  // 馃 鏍稿績淇锛氭櫤鑳借矾鐢卞鐞嗗嚱鏁?
  // 杩欎釜鍑芥暟瑙ｅ喅浜?Cursor 鎸囧嚭鐨?"levelplayground" 鎷兼帴閿欒
  const handleStartLevel = (levelId) => {
    if (levelId === 2 || levelId === 'level2' || levelId === 'level2-disabled') {
      console.info('[App] Level2 is temporarily disabled.')
      return
    }
    if (levelId === 'playground') {
      // 濡傛灉鏄?playground锛岀洿鎺ヨ烦杞紝涓嶈鍔犲墠缂€
      setCurrentScreen('playground')
    } else if (levelId === 'agent-playground') {
      // 濡傛灉鏄?agent-playground锛岀洿鎺ヨ烦杞?
      setCurrentScreen('agent-playground')
    } else {
      // 濡傛灉鏄暟瀛楀叧鍗?(1, 2)锛屽姞涓婂墠缂€鍙樻垚 'level1', 'level2'
      setCurrentScreen(`level${levelId}`)
    }
  }

  return (
    // 鍏抽敭鐐癸細w-full h-screen overflow-hidden 纭繚涓嶄細鍑虹幇鍙屾粴鍔ㄦ潯
    <div className="w-full h-screen font-sans overflow-hidden bg-slate-50">
      
      {/* 馃И 寮€鍙戣€呭揩鎹锋寜閽?*/}
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
            馃 Agent Playground
          </button>
          <button
            onClick={() => setCurrentScreen('holdable-comparison')}
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
            馃攧 Holdable瀵规瘮娴嬭瘯
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
            馃И Bubble Test
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
            馃挕 Light Test
          </button>
        </div>
      )}
      
      {/* 馃洃 閲嶇偣妫€鏌ヨ繖閲岋紒
         浣犱箣鍓嶇殑浠ｇ爜鍙兘涓嶅皬蹇冨垹鎺変簡 `{currentScreen === 'menu' && ...}` 杩欏眰鍖呰９銆?
         蹇呴』鏈夎繖涓垽鏂紝鑿滃崟鎵嶄細鍦ㄨ繘鍏ユ父鎴忓悗娑堝け銆?
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
            漏 {new Date().getFullYear()} 鐜嬩繆楣?鐗堟潈鎵€鏈?
          </div>
          <div>
            鏈粡涔﹂潰璁稿彲锛岀姝㈠鏈」鐩殑鍏ㄩ儴鎴栭儴鍒嗗唴瀹硅繘琛屽鍒躲€佽浆杞姐€佷慨鏀广€佸弽鍚戝伐绋嬫垨鍟嗕笟浣跨敤銆?
          </div>
          <div style={{ marginTop: '4px' }}>
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              娴橧CP澶?026009520鍙?
            </a>
          </div>
        </div>
      )}

      {/* 鍏冲崱璺敱 */}
      {currentScreen === 'level1' && (
        <Level1 onBack={() => setCurrentScreen('menu')} />
      )}
      
      {/* 璇曢獙鍦鸿矾鐢?*/}
      {currentScreen === 'playground' && (
        <Playground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 馃И Bubble 娴嬭瘯浠〃鐩?*/}
      {currentScreen === 'bubble-test' && (
        <BubbleTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 馃攧 Holdable瀵规瘮娴嬭瘯 */}
      {currentScreen === 'holdable-comparison' && (
        <HoldableComparison onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 馃 Agent Playground */}
      {currentScreen === 'agent-playground' && (
        <AgentPlayground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 馃挕 Light Test */}
      {currentScreen === 'light-test' && (
        <LivelyLightingComboPreview onBack={() => setCurrentScreen('menu')} />
      )}

    </div>
  )
}

