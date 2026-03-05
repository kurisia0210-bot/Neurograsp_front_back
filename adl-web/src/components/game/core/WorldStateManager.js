import { useState, useCallback, useRef } from 'react'
import { buildWorldFacts, isPositionTriplet } from './worldFacts'

// ============================================================================
// WORLD STATE MANAGER (Simplified for MVP)
// ============================================================================
// 轻量级世界状态管理器，只负责：
// 1. 管理游戏对象的状态（方块、冰箱、Agent位置）
// 2. 处理鼠标交互（拾取、放置、开门）
// 3. 提供 World Facts 查询接口
// 
// MVP原则：
// - 不包含后端通信逻辑（由 AgentSystem 负责）
// - 不包含复杂动画（由渲染组件负责）
// - 纯状态管理，简单直接
// ============================================================================

// 默认Agent状态
const DEFAULT_AGENT_STATE = {
  location: 'table_center',
  holding: null
}

/**
 * 从方块列表中推断Agent手中持有的方块
 */
function inferHoldingFromCubes(cubeList = []) {
  const holdingCube = cubeList.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

/**
 * 规范化Agent状态
 */
function normalizeAgentState(rawAgentState, cubes = []) {
  const safeRaw = rawAgentState || {}
  const hasHolding = Object.prototype.hasOwnProperty.call(safeRaw, 'holding')
  return {
    location: safeRaw.location || DEFAULT_AGENT_STATE.location,
    holding: hasHolding ? safeRaw.holding : inferHoldingFromCubes(cubes)
  }
}

/**
 * Simplified World State Manager Hook (MVP)
 */
export function useWorldStateManager(options = {}) {
  const {
    initialFridgeOpen = false,
    initialAgentState = DEFAULT_AGENT_STATE,
    initialCubes = [
      {
        id: 'red_cube',
        name: 'Red Cube',
        color: '#ff6b6b',
        position: [-0.4, 1.7 + 0.125, -0.5],
        state: 'on_table',
        dragHeight: 1.7 + 0.125
      }
    ]
  } = options

  const initialStateRef = useRef({
    agentState: normalizeAgentState(initialAgentState, initialCubes),
    fridgeOpen: initialFridgeOpen,
    cubes: initialCubes
  })

  const [agentState, setAgentState] = useState(initialStateRef.current.agentState)
  const [fridgeOpen, setFridgeOpen] = useState(initialStateRef.current.fridgeOpen)
  const [cubes, setCubes] = useState(initialStateRef.current.cubes)

  // ==================== Mouse Interactions ====================
  const getHoldingCube = useCallback(() => {
    return cubes.find((cube) => cube.state === 'in_hand')
  }, [cubes])

  const pickUpCube = useCallback((cubeId) => {
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'on_table') {
          console.log(`PICK: ${cube.name}`)
          return { ...cube, state: 'in_hand' }
        }
        return cube
      })
    )
    setAgentState((prev) => ({ ...prev, holding: cubeId }))
  }, [])

  const placeCube = useCallback((cubeId, position, newState = 'on_table') => {
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'in_hand') {
          console.log(`PLACE: ${cube.name} -> ${newState}`)
          return { ...cube, state: newState, position }
        }
        return cube
      })
    )
    setAgentState((prev) => ({ ...prev, holding: null }))
  }, [])

  const updateCubePosition = useCallback((cubeId, position) => {
    if (!isPositionTriplet(position)) return false
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId) {
          return { ...cube, position }
        }
        return cube
      })
    )
    return true
  }, [])

  const toggleFridgeDoor = useCallback(() => {
    setFridgeOpen((prev) => {
      const next = !prev
      console.log(`${next ? 'OPEN' : 'CLOSE'} fridge_door`)
      return next
    })
  }, [])

  // ==================== World Facts Interface ====================
  const getWorldFacts = useCallback(() => {
    const resolvedAgentState = normalizeAgentState(agentState, cubes)
    return buildWorldFacts({
      agentState: resolvedAgentState,
      cubes,
      fridgeOpen,
      timestamp: Date.now() / 1000
    })
  }, [agentState, cubes, fridgeOpen])

  const resetWorldState = useCallback(() => {
    setFridgeOpen(initialStateRef.current.fridgeOpen)
    setAgentState(initialStateRef.current.agentState)
    setCubes(initialStateRef.current.cubes.map(c => ({ ...c, position: [...c.position] })))
    console.log('World state reset')
  }, [])

  return {
    agentState,
    fridgeOpen,
    cubes,
    holdingCube: getHoldingCube(),

    pickUpCube,
    placeCube,
    updateCubePosition,
    toggleFridgeDoor,
    getWorldFacts,
    resetWorldState,
    getHoldingCube
  }
}
