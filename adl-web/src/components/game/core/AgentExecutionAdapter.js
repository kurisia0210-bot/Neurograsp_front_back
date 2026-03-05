// ============================================================================
// AGENT EXECUTION ADAPTER (for AgentSystem compatibility)
// ============================================================================
// 这个适配器为 AgentSystem 提供 executeWorldAction 接口
// 因为 WorldStateManager 已简化，只保留鼠标交互
// 这个适配器将 Agent 的动作转换为状态更新
// ============================================================================

import { normalizeBackendIntent } from './ActionContract'

/**
 * 创建 Agent 执行适配器
 * @param {Object} worldState - WorldStateManager 实例
 * @returns {Function} executeWorldAction 函数
 */
export function createAgentExecutionAdapter(worldState) {
  const { cubes, agentState, fridgeOpen, pickUpCube, placeCube, toggleFridgeDoor } = worldState

  return function executeWorldAction(actionPayload) {
    const normalizedAction = normalizeBackendIntent(actionPayload)
    console.log('[AgentAdapter] Executing:', normalizedAction)

    const actionType = String(normalizedAction?.type || 'INTERACT').toUpperCase()

    // 非交互动作直接返回成功
    if (actionType === 'THINK' || actionType === 'SPEAK' || actionType === 'IDLE' || actionType === 'FINISH') {
      return {
        success: true,
        next_agent_state: agentState
      }
    }

    if (actionType === 'MOVE_TO') {
      // MVP: 暂时不支持 MOVE_TO（需要更新 agentState.location）
      return {
        success: false,
        failure_reason: 'MOVE_TO not supported in MVP WorldStateManager'
      }
    }

    if (actionType !== 'INTERACT') {
      return {
        success: false,
        failure_reason: `Unsupported action type: ${actionType}`
      }
    }

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
        pickUpCube(targetItem)
        return {
          success: true,
          next_agent_state: { ...agentState, holding: targetItem }
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
          placeCube(holdingCube.id, [-1.8, 1.2, -0.5], 'in_fridge')
          return {
            success: true,
            next_agent_state: { ...agentState, holding: null }
          }
        }

        if (targetItem === 'table_surface') {
          const currentPos = holdingCube.position
          placeCube(holdingCube.id, currentPos, 'on_table')
          return {
            success: true,
            next_agent_state: { ...agentState, holding: null }
          }
        }

        return {
          success: false,
          failure_reason: `PLACE unsupported target: ${targetItem}`
        }
      }

      case 'OPEN':
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
        toggleFridgeDoor()
        return {
          success: true,
          next_agent_state: agentState
        }

      case 'CLOSE':
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
        toggleFridgeDoor()
        return {
          success: true,
          next_agent_state: agentState
        }

      case 'NONE':
        if (targetItem === 'fridge_door') {
          toggleFridgeDoor()
          return {
            success: true,
            next_agent_state: agentState
          }
        }
        return {
          success: false,
          failure_reason: `NONE unsupported target: ${targetItem}`
        }

      default:
        return {
          success: false,
          failure_reason: `Unknown interaction: ${interactionType}`
        }
    }
  }
}
