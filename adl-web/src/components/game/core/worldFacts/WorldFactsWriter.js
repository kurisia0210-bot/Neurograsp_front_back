import { normalizeBackendIntent } from '../ActionContract'


// ==========================================
// CQRS: Command Side (状态写入器 / 物理安检员)
// Architecture Role: Action Execution & Fact-based Guard
// 架构角色：整个 3D 引擎的唯一修改入口。
// 它冷酷无情：不盲信大模型，只根据物理事实决定动作是否成功，并将结果返回给总控。
// ==========================================


// Read current agent state in a safe, stable shape.
function getSafeAgentState(getAgentState) {
  const state = typeof getAgentState === 'function' ? getAgentState() : null
  return {
    location: state?.location || 'table_center',
    holding: Object.prototype.hasOwnProperty.call(state || {}, 'holding') ? state.holding : null
  }
}

// Writer receives world update functions.
// It executes normalized intents and updates world state.
// Writer receives world update functions.
// It executes normalized intents and updates world state.
// 依赖注入 (DI)：接收底层的物理操作函数，封装成高层的执行器。

export function createWorldFactsWriter({
  getAgentState,
  getCubes,
  getFridgeOpen,
  setAgentLocation,
  pickUpCube,
  placeCube,
  toggleFridgeDoor,
  updateCubePosition
} = {}) {
  // Move agent to a target point of interest.
  const moveAgentTo = (targetPoi) => {
    if (typeof setAgentLocation !== 'function' || !targetPoi) {
      return {
        success: false,
        failure_reason: 'MOVE_TO not supported in current world writer'
      }
    }

    const moved = setAgentLocation(targetPoi)
    if (!moved) {
      return {
        success: false,
        failure_reason: `MOVE_TO failed: invalid target_poi ${targetPoi}`
      }
    }

    return {
      success: true,
      next_agent_state: {
        ...getSafeAgentState(getAgentState),
        location: targetPoi
      }
    }
  }

  // Put one cube into agent hand.
  const pickCube = (cubeId) => {
    if (typeof pickUpCube !== 'function' || !cubeId) return false
    pickUpCube(cubeId)
    return true
  }

  // Place one held cube to target place/state.
  const placeHeldCube = (cubeId, position, newState = 'on_table') => {
    if (typeof placeCube !== 'function' || !cubeId) return false
    placeCube(cubeId, position, newState)
    return true
  }

  // Update drag position while user is moving a cube.
  const updateCubeDragPosition = (cubeId, position) => {
    if (typeof updateCubePosition !== 'function') return false
    return Boolean(updateCubePosition(cubeId, position))
  }

  // Main write entry. Execute one intent and return result.
  // 核心执行中枢：大模型的所有动作意图 (Intent) 都在这里被解析和执行。
  const executeIntent = (actionPayload) => {
    const normalizedAction = normalizeBackendIntent(actionPayload)
    const actionType = String(normalizedAction?.type || 'INTERACT').toUpperCase()

    // These actions do not change world state.
    if (actionType === 'THINK' || actionType === 'SPEAK' || actionType === 'IDLE' || actionType === 'FINISH') {
      return {
        success: true,
        next_agent_state: getSafeAgentState(getAgentState)
      }
    }

    if (actionType === 'MOVE_TO') {
      return moveAgentTo(normalizedAction.target_poi)
    }

    if (actionType !== 'INTERACT') {
      return {
        success: false,
        failure_reason: `Unsupported action type: ${actionType}`
      }
    }

    const cubes = typeof getCubes === 'function' ? getCubes() : []
    const fridgeOpen = Boolean(typeof getFridgeOpen === 'function' ? getFridgeOpen() : false)
    const interactionType = String(normalizedAction.interaction_type || 'NONE').toUpperCase()
    const targetItem = normalizedAction.target_item

    switch (interactionType) {
      case 'PICK': {
        const pickTarget = cubes.find((cube) => cube.id === targetItem && cube.state === 'on_table')
        if (!pickTarget) {
          return {
            success: false,
            failure_reason: `PICK failed: ${targetItem} not on table`
          }
        }

        pickCube(targetItem)
        return {
          success: true,
          next_agent_state: {
            ...getSafeAgentState(getAgentState),
            holding: targetItem
          }
        }
      }

      case 'PLACE': {
        const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
        if (!holdingCube) {
          return {
            success: false,
            failure_reason: 'PLACE failed: no item in hand'
          }
        }

        if (targetItem === 'fridge_main') {
          if (!fridgeOpen) {
            return {
              success: false,
              failure_reason: 'PLACE failed: fridge door is closed'
            }
          }

          placeHeldCube(holdingCube.id, [-1.8, 1.2, -0.5], 'in_fridge')
          return {
            success: true,
            next_agent_state: {
              ...getSafeAgentState(getAgentState),
              holding: null
            }
          }
        }

        if (targetItem === 'table_surface') {
          placeHeldCube(holdingCube.id, holdingCube.position, 'on_table')
          return {
            success: true,
            next_agent_state: {
              ...getSafeAgentState(getAgentState),
              holding: null
            }
          }
        }

        return {
          success: false,
          failure_reason: `PLACE unsupported target: ${targetItem}`
        }
      }

      case 'OPEN': {
        if (targetItem !== 'fridge_door') {
          return {
            success: false,
            failure_reason: `OPEN unsupported target: ${targetItem}`
          }
        }
        if (fridgeOpen) {
          return {
            success: false,
            failure_reason: 'OPEN failed: fridge door already open'
          }
        }

        if (typeof toggleFridgeDoor === 'function') {
          toggleFridgeDoor()
        }
        return {
          success: true,
          next_agent_state: getSafeAgentState(getAgentState)
        }
      }

      case 'CLOSE': {
        if (targetItem !== 'fridge_door') {
          return {
            success: false,
            failure_reason: `CLOSE unsupported target: ${targetItem}`
          }
        }
        if (!fridgeOpen) {
          return {
            success: false,
            failure_reason: 'CLOSE failed: fridge door already closed'
          }
        }

        if (typeof toggleFridgeDoor === 'function') {
          toggleFridgeDoor()
        }
        return {
          success: true,
          next_agent_state: getSafeAgentState(getAgentState)
        }
      }

      case 'NONE': {
        if (targetItem === 'fridge_door' && typeof toggleFridgeDoor === 'function') {
          toggleFridgeDoor()
          return {
            success: true,
            next_agent_state: getSafeAgentState(getAgentState)
          }
        }

        return {
          success: false,
          failure_reason: `NONE unsupported target: ${targetItem}`
        }
      }

      default:
        return {
          success: false,
          failure_reason: `Unknown interaction: ${interactionType}`
        }
    }
  }

  return {
    moveAgentTo,
    pickCube,
    placeHeldCube,
    updateCubeDragPosition,
    executeIntent
  }
}