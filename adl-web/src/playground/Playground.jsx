import React, { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrthographicCamera } from '@react-three/drei'
import {
  ActionTriggerBubble,
  executeRegisteredAction
} from '../components/game/mechanics/ActionRegistry'

const POI_TO_SCENE_POSITION = {
  table_center: [0, 1, 2],
  fridge_zone: [-3, 1, 0],
  stove_zone: [3, 1, 0]
}

const TABLE_CUBE_POSITION = [-0.4, 1.825, -0.5]
const HOLD_AREA_POSITION = [2.8, 0.02, -1.2]
const HOLD_CUBE_POSITION = [2.8, 1.1, -1.2]

export function Playground() {
  const [taskInput, setTaskInput] = useState('go to fridge')
  const [isParsing, setIsParsing] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [parseHistory, setParseHistory] = useState([])
  const [actionBubble, setActionBubble] = useState({
    visible: false,
    status: 'NO_INTENT',
    message: ''
  })
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false)
  const [fridgeOpen, setFridgeOpen] = useState(false)
  const [agentLocation, setAgentLocation] = useState('table_center')
  const [stepId, setStepId] = useState(0)
  const [holdingItem, setHoldingItem] = useState(null)

  const exampleTasks = [
    'go to fridge',
    'move to table',
    'go to stove',
    'open fridge door',
    'close fridge door',
    'pick red cube',
    'put red cube in fridge',
    'mv to fridge',
    'open fridge door then put red cube in fridge',
    'at(agent, fridge_zone)',
    'inside(red_cube, fridge_main)',
    'THEN([open(fridge_door), inside(red_cube, fridge_main)])'
  ]

  const parseTask = async () => {
    if (!taskInput.trim()) return

    setIsParsing(true)
    setParseError(null)

    try {
      const nextStepId = stepId + 1
      setStepId(nextStepId)

      const observationPayload = {
        session_id: 'goal-dsl-test',
        episode_id: 1,
        step_id: nextStepId,
        timestamp: Date.now() / 1000,
        agent: {
          location: agentLocation,
          holding: holdingItem
        },
        nearby_objects: [
          {
            id: 'red_cube',
            state: holdingItem === 'red_cube' ? 'in_hand' : 'on_table',
            relation: holdingItem === 'red_cube' ? 'held by agent' : 'on table_surface'
          },
          { id: 'fridge_door', state: fridgeOpen ? 'open' : 'closed', relation: 'front' },
          { id: 'fridge_main', state: 'installed', relation: 'storage' },
          { id: 'table_surface', state: 'installed', relation: 'surface' }
        ],
        global_task: taskInput.trim()
      }

      const response = await fetch('http://127.0.0.1:8001/api/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(observationPayload)
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`)
      }

      const data = await response.json()

      const result = {
        task: taskInput.trim(),
        timestamp: new Date().toLocaleTimeString(),
        rawResponse: data,
        intent: data.intent,
        reflexVerdict: data.reflex_verdict,
        stepId: data.step_id
      }

      setParseResult(result)
      setParseHistory(prev => [result, ...prev].slice(0, 10))
      applyIntentToWorld(data.intent)

      const triggerResult = executeRegisteredAction(data.intent, {
        onHold: (targetItem) => {
          if (targetItem === 'red_cube') {
            setHoldingItem('red_cube')
          }
        }
      })
      setActionBubble({
        visible: true,
        status: triggerResult.status,
        message: triggerResult.message
      })
    } catch (error) {
      console.error('Parse error:', error)
      setParseError(error.message)
      setParseResult(null)
    } finally {
      setIsParsing(false)
    }
  }

  const applyIntentToWorld = (intent) => {
    if (!intent || !intent.type) return

    if (intent.type === 'MOVE_TO' && intent.target_poi) {
      if (POI_TO_SCENE_POSITION[intent.target_poi]) {
        setAgentLocation(intent.target_poi)
      }
      return
    }

    if (intent.type === 'INTERACT' && intent.target_item === 'fridge_door') {
      const interactionType = String(intent.interaction_type || 'NONE').toUpperCase()
      if (interactionType === 'OPEN') setFridgeOpen(true)
      if (interactionType === 'CLOSE') setFridgeOpen(false)
      if (interactionType === 'TOGGLE') setFridgeOpen(prev => !prev)
    }

    if (intent.type === 'INTERACT') {
      const interactionType = String(intent.interaction_type || 'NONE').toUpperCase()
      if (interactionType === 'PLACE' && intent.target_item === 'table_surface') {
        setHoldingItem(null)
      }
    }
  }

  useEffect(() => {
    if (!actionBubble.visible) return
    const timer = setTimeout(() => {
      setActionBubble(prev => ({ ...prev, visible: false }))
    }, 1400)
    return () => clearTimeout(timer)
  }, [actionBubble.visible])

  const agentScenePosition = POI_TO_SCENE_POSITION[agentLocation] || POI_TO_SCENE_POSITION.table_center

  const renderEmptyScene = () => (
    <Canvas className="w-full h-full" style={{ background: '#1a1a2e' }}>
      <OrthographicCamera
        makeDefault
        position={[10, 10, 10]}
        zoom={60}
        onUpdate={c => c.lookAt(0, 0, 0)}
      />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#4cc9f0" />

      <Grid args={[20, 20]} cellColor="#2d3748" sectionColor="#4a5568" />

      {/* 桌子区域 - 用网格表示 */}
      <group position={[0, 0.01, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4, 0.02, 2]} />
          <meshStandardMaterial color="#e2e8f0" wireframe={true} transparent={true} opacity={0.6} />
        </mesh>
        {/* 桌子区域标记 */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[4.2, 0.1, 2.2]} />
          <meshStandardMaterial color="#e2e8f0" wireframe={true} transparent={true} opacity={0.3} />
        </mesh>
      </group>

      {/* Agent胶囊体 - 纯边框 */}
      <group position={agentScenePosition}>
        <mesh position={[0, 1, 0]}>
          <capsuleGeometry args={[0.3, 1, 4]} />
          <meshStandardMaterial color="#fbbf24" wireframe={true} />
        </mesh>
      </group>

      {/* 冰箱区域 - 用网格表示 */}
      <group position={[-3, 0, -0.5]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#60a5fa" wireframe={true} transparent={true} opacity={0.6} />
        </mesh>
        <mesh position={[0.5, 0.5, 0.52]} rotation={[0, fridgeOpen ? 1.6 : 0, 0]}>
          <mesh position={[-0.5, 0, 0]}>
            <boxGeometry args={[1, 1, 0.05]} />
            <meshStandardMaterial color="#94a3b8" wireframe={true} transparent={true} opacity={0.9} />
          </mesh>
        </mesh>
        {/* 冰箱区域标记 */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[1.2, 0.1, 1.2]} />
          <meshStandardMaterial color="#60a5fa" wireframe={true} transparent={true} opacity={0.3} />
        </mesh>
      </group>

      {/* Hold area */}
      <group position={HOLD_AREA_POSITION}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.1, 0.04, 1.1]} />
          <meshStandardMaterial color="#fbbf24" wireframe={true} transparent={true} opacity={0.7} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[1.2, 0.1, 1.2]} />
          <meshStandardMaterial color="#f59e0b" wireframe={true} transparent={true} opacity={0.25} />
        </mesh>
      </group>

      {/* Red cube on table */}
      {holdingItem !== 'red_cube' && (
        <mesh position={TABLE_CUBE_POSITION}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" wireframe={true} />
        </mesh>
      )}

      {/* Red cube in hold area */}
      {holdingItem === 'red_cube' && (
        <mesh position={HOLD_CUBE_POSITION}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" wireframe={true} />
        </mesh>
      )}

      {/* 区域标记 */}
      <group>
        {/* 桌子区域标记 */}
        <mesh position={[0, 0.2, 1.2]}>
          <boxGeometry args={[0.3, 0.05, 0.3]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        {/* 冰箱区域标记 */}
        <mesh position={[-3, 0.2, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.3]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
      </group>
    </Canvas>
  )

  const renderDashboard = () => {
    if (dashboardCollapsed) {
      return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-500 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Goal DSL Tester</h1>
                  <p className="text-gray-600 text-xs">Collapsed - Click to expand</p>
                </div>
              </div>
              <button
                onClick={() => setDashboardCollapsed(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-colors"
              >
                Expand
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        {/* 主Dashboard */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm border-2 border-blue-500 rounded-xl p-4 shadow-2xl min-w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Goal DSL MVP Tester</h1>
                  <p className="text-gray-600 text-sm">Reuse /api/tick for task parsing validation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Route B: Existing API
                </div>
                <button
                  onClick={() => setDashboardCollapsed(true)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg shadow transition-colors"
                >
                  Collapse
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && parseTask()}
                  placeholder="Enter a task, e.g. Put red cube in fridge"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                  disabled={isParsing}
                />
                <button
                  onClick={parseTask}
                  disabled={isParsing || !taskInput.trim()}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-lg transition-colors"
                >
                  {isParsing ? 'Parsing...' : 'Parse'}
                </button>
              </div>

              <div className="mt-3">
                <p className="text-gray-600 text-sm mb-2">Example tasks:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleTasks.map((task, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTaskInput(task)
                        setTimeout(() => parseTask(), 100)
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {task.length > 30 ? task.substring(0, 30) + '...' : task}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-800">Parse Result</h2>
                {parseResult && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">OK</span>
                )}
              </div>

              {parseError ? (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-red-700 font-bold mb-1">Parse failed</div>
                  <p className="text-red-600 text-sm">{parseError}</p>
                  <p className="text-red-500 text-xs mt-2">Ensure backend is running on 127.0.0.1:8001</p>
                </div>
              ) : parseResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500 text-xs mb-1">Task</p>
                      <p className="font-mono text-gray-800 break-words">{parseResult.task}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500 text-xs mb-1">Time</p>
                      <p className="text-gray-800">{parseResult.timestamp}</p>
                    </div>
                  </div>

                  {parseResult.intent && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500 text-xs mb-2">Intent</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Type</span>
                          <span className="font-mono text-gray-800">{parseResult.intent.type || 'N/A'}</span>
                        </div>
                        {parseResult.intent.target_poi && (
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Target POI</span>
                            <span className="font-mono text-gray-800">{parseResult.intent.target_poi}</span>
                          </div>
                        )}
                        {parseResult.intent.target_item && (
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Target Item</span>
                            <span className="font-mono text-gray-800">{parseResult.intent.target_item}</span>
                          </div>
                        )}
                        {parseResult.intent.content && (
                          <div className="mt-2">
                            <p className="text-gray-500 text-xs mb-1">Reasoning</p>
                            <p className="text-gray-700 text-sm">{parseResult.intent.content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {parseResult.reflexVerdict && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-gray-500 text-xs mb-2">Reflex Verdict</p>
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            'px-2 py-1 text-xs rounded',
                            parseResult.reflexVerdict.verdict === 'ALLOW'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          ].join(' ')}
                        >
                          {parseResult.reflexVerdict.verdict}
                        </span>
                        <span className="text-gray-600 text-sm">{parseResult.reflexVerdict.message || 'No message'}</span>
                      </div>
                    </div>
                  )}

                  <details className="bg-gray-100 rounded">
                    <summary className="px-3 py-2 text-gray-700 text-sm cursor-pointer hover:bg-gray-200 rounded">
                      Show raw response JSON
                    </summary>
                    <pre className="p-3 text-xs bg-gray-900 text-gray-300 rounded-b overflow-auto max-h-60">
                      {JSON.stringify(parseResult.rawResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">G</div>
                  <p>Enter a task and click Parse</p>
                  <p className="text-sm mt-2">The backend will return parsed intent and verdict.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 历史记录 */}
        {parseHistory.length > 0 && (
          <div className="absolute bottom-4 right-4 z-50 pointer-events-auto w-96">
            <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Parse History</h3>
                <button
                  onClick={() => setParseHistory([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parseHistory.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-3 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setTaskInput(item.task)
                      setParseResult(item)
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-sm text-gray-800 truncate">{item.task}</span>
                      <span className="text-xs text-gray-500">{item.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'text-xs px-2 py-0.5 rounded',
                          item.intent?.type ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        ].join(' ')}
                      >
                        {item.intent?.type || 'NO_TYPE'}
                      </span>
                      {item.intent?.target_poi && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {item.intent.target_poi}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      )}

      {/* 后端状态 */}
      <div className="absolute bottom-4 left-4 z-50 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isParsing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            <div>
              <p className="text-sm font-bold text-gray-800">Backend Status</p>
              <p className="text-xs text-gray-600">127.0.0.1:8001/api/tick</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">{isParsing ? 'Parsing task...' : 'Ready'}</div>
          <div className="mt-1 text-xs text-gray-600">
            Agent: {agentLocation} | Fridge door: {fridgeOpen ? 'open' : 'closed'}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Hold: {holdingItem || 'empty'}
          </div>
        </div>
      </div>

      {/* 3D场景信息 */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto w-64">
        <div className="bg-white/90 backdrop-blur-sm border-2 border-purple-300 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-600 text-lg">🎮</span>
            <h3 className="font-bold text-gray-800">3D Game Scene</h3>
          </div>
          <p className="text-xs text-gray-600 mb-2">Scene includes:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>- Table area (4x2 grid)</li>
            <li>- Hold area (gold wireframe)</li>
            <li>- Agent capsule (yellow wireframe)</li>
            <li>- Fridge area (blue wireframe)</li>
            <li>- Red cube (table or hold zone)</li>
            <li>- Grid floor</li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">Try "go to fridge" or "pick red cube"</p>
        </div>
      </div>
    </>
  )
}

  return (
    <div className="w-full h-screen relative bg-gradient-to-br from-gray-100 to-gray-300">
      <ActionTriggerBubble bubble={actionBubble} />
      <div className="absolute inset-0">{renderEmptyScene()}</div>
      {renderDashboard()}
    </div>
  )
}
