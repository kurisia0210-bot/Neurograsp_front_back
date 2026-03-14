import React, { useState } from 'react'
import { DoctorAvatar } from './components/DoctorAvatar'
import ScenesApp from './assets/backgrounds/scenes'

function App() {
  const [currentPage, setCurrentPage] = useState('avatar') // 'avatar', 'svg-preview', or 'jsx-preview'
  const [status, setStatus] = useState('waiting')

  const statusOptions = [
    { value: 'waiting', label: '等待中', color: 'bg-gray-500' },
    { value: 'processing', label: '处理中', color: 'bg-blue-500' },
    { value: 'completed', label: '已完成', color: 'bg-green-500' },
    { value: 'speaking', label: '说话中', color: 'bg-pink-500' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-4">
          <button
            onClick={() => setCurrentPage('avatar')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              currentPage === 'avatar'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Avatar 展示
          </button>
          <button
            onClick={() => setCurrentPage('svg-preview')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              currentPage === 'svg-preview'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            SVG 预览器
          </button>
          <button
            onClick={() => setCurrentPage('jsx-preview')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              currentPage === 'jsx-preview'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            资源浏览器
          </button>
          <button
            onClick={() => setCurrentPage('scenes')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              currentPage === 'scenes'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            场景画廊
          </button>
        </div>
      </nav>

      {/* 页面内容 */}
      {currentPage === 'scenes' ? (
        <ScenesApp />
      ) : (
        <div className="p-8">
          {currentPage === 'avatar' && <AvatarPage status={status} setStatus={setStatus} statusOptions={statusOptions} />}
          {currentPage === 'svg-preview' && <SvgPreviewPage />}
          {currentPage === 'jsx-preview' && <JsxPreviewPage />}
        </div>
      )}
    </div>
  )
}

// Avatar 展示页面
function AvatarPage({ status, setStatus, statusOptions }) {
  return (
    <>
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Avatar 展示</h1>
        <p className="text-gray-600">
          Doctor Avatar SVG 组件
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
    </>
  )
}

// SVG 预览页面
function SvgPreviewPage() {
  const [svgCode, setSvgCode] = useState(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#4F46E5" />
  <circle cx="35" cy="40" r="5" fill="white" />
  <circle cx="65" cy="40" r="5" fill="white" />
  <path d="M 30 60 Q 50 75 70 60" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>`)
  const [selectedFile, setSelectedFile] = useState('')

  // 可用的 SVG 文件
  const availableSvgs = [
    { 
      label: 'Doctor Avatar', 
      value: 'doctor-avatar',
      path: '/src/assets/avatars/doctor-avatar.svg'
    },
    { 
      label: 'Bird Icon', 
      value: 'bird',
      path: '/src/assets/icons/bird.svg'
    },
    { 
      label: 'Bear Icon', 
      value: 'bear',
      path: '/src/assets/icons/bear.svg'
    }
  ]

  // 加载 SVG 文件内容
  const loadSvgFile = async (path) => {
    try {
      const response = await fetch(path)
      const text = await response.text()
      setSvgCode(text)
    } catch (error) {
      console.error('加载 SVG 文件失败:', error)
      alert('加载文件失败,请确保文件存在')
    }
  }

  return (
    <>
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">SVG 预览器</h1>
        <p className="text-gray-600">
          在这里测试和预览你的 SVG 代码
        </p>
      </div>

      {/* 快速选择文件 */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            加载项目中的 SVG 文件:
          </label>
          <select
            value={selectedFile}
            onChange={(e) => {
              const selected = availableSvgs.find(s => s.value === e.target.value)
              if (selected) {
                loadSvgFile(selected.path)
                setSelectedFile(e.target.value)
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- 选择一个 SVG 文件 --</option>
            {availableSvgs.map((svg) => (
              <option key={svg.value} value={svg.value}>
                {svg.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
        {/* 左侧: SVG 代码编辑 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4">SVG 代码</h2>
          <textarea
            value={svgCode}
            onChange={(e) => setSvgCode(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="在这里粘贴或编辑 SVG 代码..."
            spellCheck={false}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setSvgCode('')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              清空
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(svgCode)
                alert('SVG 代码已复制到剪贴板!')
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              复制代码
            </button>
            <button
              onClick={() => {
                const blob = new Blob([svgCode], { type: 'image/svg+xml' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'edited.svg'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              下载 SVG
            </button>
          </div>
        </div>

        {/* 右侧: SVG 预览 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-700 mb-4">实时预览</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-96 flex items-center justify-center bg-gray-50">
            <div 
              className="max-w-full max-h-full"
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-semibold mb-2">提示:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>从下拉菜单加载项目中的 SVG 文件</li>
              <li>修改左侧代码,右侧会实时预览</li>
              <li>建议设置 viewBox 以便缩放</li>
              <li>可以下载编辑后的 SVG 文件</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// JSX 预览页面 - 改为文件树浏览方式
function JsxPreviewPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [previewType, setPreviewType] = useState('code') // 'code' or 'render'

  // 构建文件树结构
  const fileTree = {
    avatars: [
      { name: 'doctor-avatar.svg', type: 'svg', path: '/src/assets/avatars/doctor-avatar.svg' },
      { name: 'DoctorParts.jsx', type: 'jsx', path: '/src/assets/avatars/DoctorParts.jsx' }
    ],
    icons: [
      { name: 'bird.svg', type: 'svg', path: '/src/assets/icons/bird.svg' },
      { name: 'bear.svg', type: 'svg', path: '/src/assets/icons/bear.svg' }
    ],
    backgrounds: [
      { name: 'scenes.jsx', type: 'jsx', path: '/src/assets/backgrounds/scenes.jsx' }
    ],
    decorations: [
      { name: 'rabbit.svg', type: 'svg', path: '/src/assets/decorations/rabbit.svg' },
      { name: 'rainbow-cloud.svg', type: 'svg', path: '/src/assets/decorations/rainbow-cloud.svg' },
      { name: 'underwater-world.svg', type: 'svg', path: '/src/assets/decorations/underwater-world.svg' }
    ]
  }

  // 加载文件内容
  const loadFile = async (file) => {
    try {
      const response = await fetch(file.path)
      const text = await response.text()
      setFileContent(text)
      setSelectedFile(file)
      setPreviewType('code')
    } catch (error) {
      console.error('加载文件失败:', error)
      setFileContent('// 加载失败,请检查文件路径')
    }
  }

  return (
    <>
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">资源浏览器</h1>
        <p className="text-gray-600">
          浏览 assets 目录下的所有 SVG 和 JSX 文件
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* 左侧: 文件树 */}
        <div className="col-span-3 bg-white rounded-2xl shadow-xl p-4 max-h-[600px] overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            assets/
          </h2>
          
          {Object.entries(fileTree).map(([folder, files]) => (
            <div key={folder} className="mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {folder}/
              </div>
              <div className="ml-6 space-y-1">
                {files.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => loadFile(file)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                      selectedFile?.name === file.name
                        ? 'bg-indigo-100 text-indigo-700 font-semibold'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {file.type === 'svg' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 右侧: 内容显示区 */}
        <div className="col-span-9">
          {selectedFile ? (
            <>
              {/* 顶部工具栏 */}
              <div className="bg-white rounded-t-2xl shadow-xl p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{selectedFile.name}</h2>
                    <p className="text-sm text-gray-500">{selectedFile.path}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewType('code')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        previewType === 'code'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      代码
                    </button>
                    {selectedFile.type === 'svg' && (
                      <button
                        onClick={() => setPreviewType('render')}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          previewType === 'render'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        预览
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fileContent)
                        alert('代码已复制!')
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                    >
                      复制
                    </button>
                  </div>
                </div>
              </div>

              {/* 内容区 */}
              <div className="bg-white rounded-b-2xl shadow-xl p-6">
                {previewType === 'code' ? (
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[500px]">
                    <pre className="text-sm text-gray-100 font-mono whitespace-pre">
                      {fileContent}
                    </pre>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center bg-gray-50 min-h-[500px]">
                    <div 
                      className="max-w-full max-h-full"
                      dangerouslySetInnerHTML={{ __html: fileContent }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-600 mb-2">选择一个文件</h3>
              <p className="text-gray-500">点击左侧文件树中的文件查看内容</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App
