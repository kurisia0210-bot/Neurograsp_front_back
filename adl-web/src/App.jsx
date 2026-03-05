import React, { useState } from 'react'
// 👇 请根据你的实际路径检查，如果 MainMenu 在 ui 文件夹，请改为 './components/ui/MainMenu'
import { MainMenu } from './components/MainMenu'
import { Level1 } from './components/levels/level1'
import { Level2 } from './components/levels/Level2'
import { Playground } from './playground/Playground'
import { BubbleTestDashboard } from './playground/BubbleTestDashboard'
import { HoldableComparison } from './playground/HoldableComparison'
import { AgentPlayground } from './playground/AgentPlayground'
import LivelyLightingComboPreview from './components/ui/light_test'

export default function App() {
  // 🧭 路由状态: 'menu' | 'level1' | 'level2' | 'playground' | 'bubble-test'
  // 🧪 开发模式：直接启动测试页面，改为 'bubble-test'
  const [currentScreen, setCurrentScreen] = useState('menu')

  // 🧠 核心修复：智能路由处理函数
  // 这个函数解决了 Cursor 指出的 "levelplayground" 拼接错误
  const handleStartLevel = (levelId) => {
    if (levelId === 'playground') {
      // 如果是 playground，直接跳转，不要加前缀
      setCurrentScreen('playground')
    } else if (levelId === 'agent-playground') {
      // 如果是 agent-playground，直接跳转
      setCurrentScreen('agent-playground')
    } else {
      // 如果是数字关卡 (1, 2)，加上前缀变成 'level1', 'level2'
      setCurrentScreen(`level${levelId}`)
    }
  }

  return (
    // 关键点：w-full h-screen overflow-hidden 确保不会出现双滚动条
    <div className="w-full h-screen font-sans overflow-hidden bg-slate-50">
      
      {/* 🧪 开发者快捷按钮 */}
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
            🤖 Agent Playground
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
            🔄 Holdable对比测试
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
            🧪 Bubble Test
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
            💡 Light Test
          </button>
        </div>
      )}
      
      {/* 🛑 重点检查这里！
         你之前的代码可能不小心删掉了 `{currentScreen === 'menu' && ...}` 这层包裹。
         必须有这个判断，菜单才会在进入游戏后消失。
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
            © {new Date().getFullYear()} 王俊鹏 版权所有
          </div>
          <div>
            未经书面许可，禁止对本项目的全部或部分内容进行复制、转载、修改、反向工程或商业使用。
          </div>
          <div style={{ marginTop: '4px' }}>
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              浙ICP备2026009520号
            </a>
          </div>
        </div>
      )}

      {/* 关卡路由 */}
      {currentScreen === 'level1' && (
        <Level1 onBack={() => setCurrentScreen('menu')} />
      )}
      
      {currentScreen === 'level2' && (
        <Level2 onBack={() => setCurrentScreen('menu')} />
      )}
      
      {/* 试验场路由 */}
      {currentScreen === 'playground' && (
        <Playground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 🧪 Bubble 测试仪表盘 */}
      {currentScreen === 'bubble-test' && (
        <BubbleTestDashboard onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 🔄 Holdable对比测试 */}
      {currentScreen === 'holdable-comparison' && (
        <HoldableComparison onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 🤖 Agent Playground */}
      {currentScreen === 'agent-playground' && (
        <AgentPlayground onBack={() => setCurrentScreen('menu')} />
      )}

      {/* 💡 Light Test */}
      {currentScreen === 'light-test' && (
        <LivelyLightingComboPreview onBack={() => setCurrentScreen('menu')} />
      )}

    </div>
  )
}