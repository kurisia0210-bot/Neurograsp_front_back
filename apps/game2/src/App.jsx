import { useState } from 'react'
import { DoctorAvatar } from './components/DoctorAvatar'

function App() {
  const [status, setStatus] = useState('waiting')

  const statusOptions = [
    { value: 'waiting', label: '等待中', color: 'bg-gray-500' },
    { value: 'processing', label: '处理中', color: 'bg-blue-500' },
    { value: 'completed', label: '已完成', color: 'bg-green-500' },
    { value: 'supporting', label: '支持中', color: 'bg-purple-500' },
    { value: 'speaking', label: '说话中', color: 'bg-pink-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* 顶部标题 */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Game 2 - Avatar 展示</h1>
        <p className="text-gray-600">
          这是从 Game1 移植过来的 Doctor Avatar SVG 组件
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        {/* 左侧: Avatar 展示 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-700 mb-4">Avatar 预览</h2>
          <div className="w-64 h-64 mx-auto">
            <DoctorAvatar status={status} className="w-full h-full" />
          </div>
        </div>

        {/* 右侧: 状态控制 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-700 mb-4">状态控制</h2>
          <p className="text-sm text-gray-500 mb-6">点击按钮切换 Avatar 状态</p>
          
          <div className="space-y-3">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
                  status === option.value 
                    ? `${option.color} scale-105 shadow-lg` 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                {option.label}
                {status === option.value && ' ✓'}
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2">当前状态:</h3>
            <code className="text-sm text-indigo-600 font-mono">
              status = "{status}"
            </code>
            
            <div className="mt-4 text-xs text-gray-600">
              <p className="font-semibold mb-1">特性:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>眼神追踪 (跟随鼠标)</li>
                <li>自动眨眼动画</li>
                <li>头发飘动效果</li>
                <li>状态切换嘴型变化</li>
                <li>完成状态显示手机</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="max-w-4xl mx-auto mt-8 bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-700 mb-2">资源位置</h3>
        <div className="text-sm text-gray-600 space-y-1 font-mono">
          <p>📁 apps/game2/src/assets/avatars/DoctorParts.jsx - SVG 路径数据</p>
          <p>📁 apps/game2/src/components/DoctorAvatar.jsx - Avatar 组件</p>
        </div>
      </div>
    </div>
  )
}

export default App
