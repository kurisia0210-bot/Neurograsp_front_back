import { useState, useCallback, useEffect, useRef } from 'react'
import { buildWorldFacts, isPositionTriplet } from './worldFacts'
import { normalizeBackendIntent } from './ActionContract'

// ============================================================================
// WORLD STATE MANAGER
// ============================================================================
// 这是游戏世界的状态管理器，负责：
// 1. 管理所有游戏对象的状态（方块、冰箱、Agent位置等）
// 2. 处理游戏对象的交互逻辑（拾取、放置、开门等）
// 3. 执行来自AgentSystem的动作指令
// 4. 提供世界状态查询接口
// 
// 设计原则：
// - 单一真相源：所有世界状态集中管理
// - 纯状态操作：状态变更通过setState完成
// - 与渲染分离：不包含任何Three.js渲染逻辑
// - 遵循Constitution：显式状态、语义状态驱动
// ============================================================================


// 冰箱门动画常量
const DOOR_OPEN_ANGLE = 2.0      // 开门角度（弧度）
const DOOR_CLOSED_ANGLE = 0      // 关门角度
const DOOR_ANIM_STEP = 0.14      // 每帧动画步长
const DOOR_ANIM_INTERVAL_MS = 16 // 动画间隔（约60fps）

// 默认Agent状态
const DEFAULT_AGENT_STATE = {
  location: 'table_center',  // 默认位置：桌子中心
  holding: null              // 默认手中无物品
}

/**
 * 从方块列表中推断Agent手中持有的方块
 * @param {Array} cubeList - 方块列表
 * @returns {string|null} 持有的方块ID，无则为null
 */

function inferHoldingFromCubes(cubeList = []) {
  const holdingCube = cubeList.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

/**
 * 规范化Agent状态
 * 确保Agent状态数据结构一致，处理缺失字段
 * @param {Object} rawAgentState - 原始Agent状态
 * @param {Array} cubes - 方块列表，用于推断持有状态
 * @returns {Object} 规范化后的Agent状态
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
 * World State Manager Hook
 * 管理游戏世界的所有状态，包括：
 * - Agent位置和持有状态
 * - 冰箱门开关状态和动画
 * - 所有方块的状态和位置
 * 
 * @param {Object} options - 配置选项
 * @param {boolean} options.initialFridgeOpen - 初始冰箱门状态
 * @param {Object} options.initialAgentState - 初始Agent状态
 * @param {Array} options.initialCubes - 初始方块配置
 * @returns {Object} 世界状态管理器的API接口
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

  const [agentState, setAgentState] = useState(() => normalizeAgentState(initialAgentState, initialCubes))
  const [fridgeOpen, setFridgeOpen] = useState(initialFridgeOpen)
  const [fridgeDoorAngle, setFridgeDoorAngle] = useState(initialFridgeOpen ? DOOR_OPEN_ANGLE : DOOR_CLOSED_ANGLE)
  const [cubes, setCubes] = useState(initialCubes)

  const doorAnimTimerRef = useRef(null)

  const stopDoorAnimation = useCallback(() => {
    if (doorAnimTimerRef.current) {
      clearInterval(doorAnimTimerRef.current)
      doorAnimTimerRef.current = null
    }
  }, [])

  const animateFridgeDoorTo = useCallback((targetAngle) => {
    stopDoorAnimation()

    doorAnimTimerRef.current = setInterval(() => {
      setFridgeDoorAngle((prev) => {
        const diff = targetAngle - prev
        if (Math.abs(diff) <= 0.01) {
          stopDoorAnimation()
          return targetAngle
        }
        const step = Math.sign(diff) * Math.min(Math.abs(diff), DOOR_ANIM_STEP)
        return prev + step
      })
    }, DOOR_ANIM_INTERVAL_MS)
  }, [stopDoorAnimation])

  useEffect(() => {
    return () => stopDoorAnimation()
  }, [stopDoorAnimation])

  const getHoldingCube = useCallback(() => {
    return cubes.find((cube) => cube.state === 'in_hand')
  }, [cubes])

  const pickUpCube = useCallback((cubeId) => {
    let didPick = false
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'on_table') {
          didPick = true
          console.log(`Mouse PICK: ${cube.name}`)
          return { ...cube, state: 'in_hand' }
        }
        return cube
      })
    )
    if (didPick) {
      setAgentState((prev) => ({ ...prev, holding: cubeId }))
    }
  }, [])

  const placeCube = useCallback((cubeId, position, newState = 'on_table') => {
    let didPlace = false
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'in_hand') {
          didPlace = true
          console.log(`Mouse PLACE: ${cube.name} -> ${newState}`)
          return { ...cube, state: newState, position }
        }
        return cube
      })
    )
    if (didPlace) {
      setAgentState((prev) => ({ ...prev, holding: null }))
    }
  }, [])

  const isHolding = useCallback((cubeId) => {
    const holdingCube = getHoldingCube()
    return holdingCube?.id === cubeId
  }, [getHoldingCube])

  const updateCubePosition = useCallback((cubeId, position, epsilon = 0) => {
    if (!isPositionTriplet(position)) return false
    let didUpdate = false
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id !== cubeId) return cube
        const currentPos = cube.position
        if (
          isPositionTriplet(currentPos) &&
          Math.abs(currentPos[0] - position[0]) <= epsilon &&
          Math.abs(currentPos[1] - position[1]) <= epsilon &&
          Math.abs(currentPos[2] - position[2]) <= epsilon
        ) {
          return cube
        }
        didUpdate = true
        return { ...cube, position }
      })
    )
    return didUpdate
  }, [])

  const openFridgeDoor = useCallback((source = 'agent') => {
    setFridgeOpen((prev) => {
      if (prev) return prev
      animateFridgeDoorTo(DOOR_OPEN_ANGLE)
      console.log(`OPEN fridge_door (${source})`)
      return true
    })
  }, [animateFridgeDoorTo])

  const closeFridgeDoor = useCallback((source = 'agent') => {
    setFridgeOpen((prev) => {
      if (!prev) return prev
      animateFridgeDoorTo(DOOR_CLOSED_ANGLE)
      console.log(`CLOSE fridge_door (${source})`)
      return false
    })
  }, [animateFridgeDoorTo])

  const toggleFridgeDoor = useCallback(() => {
    setFridgeOpen((prev) => {
      const next = !prev
      animateFridgeDoorTo(next ? DOOR_OPEN_ANGLE : DOOR_CLOSED_ANGLE)
      console.log(`Mouse TOGGLE fridge_door -> ${next ? 'open' : 'closed'}`)
      return next
    })
  }, [animateFridgeDoorTo])

  const executeWorldAction = useCallback((actionPayload) => {
    const normalizedAction = normalizeBackendIntent(actionPayload)
    console.log('[World] Executing:', normalizedAction)
    const currentAgentState = normalizeAgentState(agentState, cubes)
    const withAgentState = (result, nextAgentState = currentAgentState) => ({
      ...result,
      next_agent_state: normalizeAgentState(nextAgentState, cubes)
    })

    const rawType = String(actionPayload?.type || '').toUpperCase()
    if (normalizedAction.type === 'THINK' && rawType !== 'THINK') {
      return withAgentState({
        success: false,
        failure_type: 'INVALID_ACTION_PAYLOAD',
        failure_reason: normalizedAction.content || 'Invalid action payload'
      })
    }

    const actionType = String(normalizedAction?.type || 'INTERACT').toUpperCase()
    if (actionType === 'MOVE_TO') {
      const targetPoi = normalizedAction?.target_poi
      if (!targetPoi) {
        return withAgentState({ success: false, failure_reason: 'MOVE_TO missing target_poi' })
      }
      const nextAgentState = { ...currentAgentState, location: targetPoi }
      setAgentState(nextAgentState)
      return withAgentState({ success: true }, nextAgentState)
    }

    if (actionType === 'THINK' || actionType === 'SPEAK' || actionType === 'IDLE' || actionType === 'FINISH') {
      return withAgentState({ success: true })
    }

    if (actionType !== 'INTERACT') {
      return withAgentState({ success: false, failure_reason: `Unsupported action type: ${actionType}` })
    }

    const interactionType = String(normalizedAction.interaction_type || 'NONE').toUpperCase()
    const targetItem = normalizedAction.target_item
    const holdingCube = cubes.find((cube) => cube.state === 'in_hand')

    switch (interactionType) {
      case 'PICK': {
        const pickTarget = cubes.find((cube) => cube.id === targetItem && cube.state === 'on_table')
        if (!pickTarget) {
          return withAgentState({ success: false, failure_reason: `PICK precondition failed for ${targetItem}` })
        }
        setCubes((prevCubes) =>
          prevCubes.map((cube) => {
            if (cube.id === targetItem && cube.state === 'on_table') {
              console.log(`Picked up ${cube.name}`)
              return { ...cube, state: 'in_hand' }
            }
            return cube
          })
        )
        const nextAgentState = { ...currentAgentState, holding: targetItem }
        setAgentState(nextAgentState)
        return withAgentState({ success: true }, nextAgentState)
      }

      case 'PLACE': {
        if (!holdingCube) {
          return withAgentState({ success: false, failure_reason: 'PLACE precondition failed: no item in hand' })
        }
        if (targetItem === 'fridge_main' && !fridgeOpen) {
          return withAgentState({ success: false, failure_reason: 'PLACE precondition failed: fridge door is closed' })
        }

        const heldCubeId = holdingCube.id
        setCubes((prevCubes) =>
          prevCubes.map((cube) => {
            if (cube.id === heldCubeId && cube.state === 'in_hand') {
              if (targetItem === 'fridge_main') {
                console.log(`Placed ${cube.name} in fridge`)
                return { ...cube, state: 'in_fridge', position: [-1.8, 1.2, -0.5] }
              }
              if (targetItem === 'table_surface') {
                console.log(`Placed ${cube.name} on table`)
                const explicitTargetPosition = normalizedAction?.target_position
                if (isPositionTriplet(explicitTargetPosition)) {
                  return { ...cube, state: 'on_table', position: explicitTargetPosition }
                }
                const tablePositions = [
                  [-0.8, 1.7 + 0.125, -0.5],
                  [-0.4, 1.7 + 0.125, -0.5],
                  [0, 1.7 + 0.125, -0.5],
                  [0.4, 1.7 + 0.125, -0.5]
                ]
                const occupiedPositions = prevCubes
                  .filter((c) => c.state === 'on_table' && c.id !== cube.id)
                  .map((c) => c.position.toString())
                const freePosition = tablePositions.find((pos) => !occupiedPositions.includes(pos.toString())) || tablePositions[0]
                return { ...cube, state: 'on_table', position: freePosition }
              }
            }
            return cube
          })
        )
        const nextAgentState = { ...currentAgentState, holding: null }
        if (targetItem === 'fridge_main' || targetItem === 'table_surface') {
          setAgentState(nextAgentState)
        }
        if (targetItem === 'fridge_main' || targetItem === 'table_surface') {
          return withAgentState({ success: true }, nextAgentState)
        }
        return withAgentState({ success: false, failure_reason: `PLACE unsupported target: ${targetItem}` })
      }

      case 'OPEN':
        if (targetItem === 'fridge_door') {
          if (fridgeOpen) {
            return withAgentState({ success: false, failure_reason: 'OPEN precondition failed: fridge door already open' })
          }
          openFridgeDoor('agent')
          return withAgentState({ success: true })
        }
        return withAgentState({ success: false, failure_reason: `OPEN unsupported target: ${targetItem}` })

      case 'CLOSE':
        if (targetItem === 'fridge_door') {
          if (!fridgeOpen) {
            return withAgentState({ success: false, failure_reason: 'CLOSE precondition failed: fridge door already closed' })
          }
          closeFridgeDoor('agent')
          return withAgentState({ success: true })
        }
        return withAgentState({ success: false, failure_reason: `CLOSE unsupported target: ${targetItem}` })

      case 'NONE':
        if (targetItem === 'fridge_door') {
          toggleFridgeDoor()
          return withAgentState({ success: true })
        }
        return withAgentState({ success: false, failure_reason: `NONE unsupported target: ${targetItem}` })

      default:
        console.log(`Unknown interaction: ${interactionType}`)
        return withAgentState({ success: false, failure_reason: `Unknown interaction: ${interactionType}` })
    }
  }, [agentState, openFridgeDoor, closeFridgeDoor, toggleFridgeDoor, cubes, fridgeOpen])

  const getWorldFacts = useCallback((customAgentState = null) => {
    const resolvedAgentState = normalizeAgentState(customAgentState || agentState, cubes)
    return buildWorldFacts({
      agentState: resolvedAgentState,
      cubes,
      fridgeOpen
    })
  }, [agentState, cubes, fridgeOpen])

  // Backward-compatible alias: existing callers still use getWorldState.
  const getWorldState = useCallback((customAgentState = null) => {
    return getWorldFacts(customAgentState)
  }, [getWorldFacts])

  const resetWorldState = useCallback(() => {
    stopDoorAnimation()
    setFridgeOpen(initialFridgeOpen)
    setFridgeDoorAngle(initialFridgeOpen ? DOOR_OPEN_ANGLE : DOOR_CLOSED_ANGLE)
    setAgentState(normalizeAgentState(initialAgentState, initialCubes))
    setCubes(initialCubes)
    console.log('World state reset')
  }, [initialFridgeOpen, initialAgentState, initialCubes, stopDoorAnimation])

  return {
    agentState,
    fridgeOpen,
    fridgeDoorAngle,
    cubes,
    holdingCube: getHoldingCube(),

    pickUpCube,
    placeCube,
    updateCubePosition,
    isHolding,
    openFridgeDoor,
    closeFridgeDoor,
    toggleFridgeDoor,
    executeWorldAction,
    getWorldState,
    getWorldFacts,
    resetWorldState,

    getHoldingCube
  }
}
