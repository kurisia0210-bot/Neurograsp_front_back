import { normalizeBackendIntent } from '../ActionContract'
import { WORLD_FACT_ENTITY_IDS } from './WorldFactsOntology'

function getSafeAgentState(getAgentState) {
  const state = typeof getAgentState === 'function' ? getAgentState() : null
  return {
    location: state?.location || 'table_center',
    holding: Object.prototype.hasOwnProperty.call(state || {}, 'holding') ? state.holding : null
  }
}

function isMeatItemId(itemId) {
  return itemId === WORLD_FACT_ENTITY_IDS.MEAT_RAW || itemId === WORLD_FACT_ENTITY_IDS.MEAT_HEATED
}

function isPlateItemId(itemId) {
  return itemId === 'plate'
}

function isMeatLikeItemId(itemId) {
  return isMeatItemId(itemId) || isPlateItemId(itemId)
}

function getCurrentMeatId(planeState) {
  if (!planeState) return null
  return planeState.isHeated ? WORLD_FACT_ENTITY_IDS.MEAT_HEATED : WORLD_FACT_ENTITY_IDS.MEAT_RAW
}

function resolveLegacyCubeId(targetItem, cubes) {
  if (!targetItem) return targetItem

  const hasExact = cubes.some((cube) => cube.id === targetItem)
  if (hasExact) return targetItem

  if ((targetItem === 'apple' || targetItem === 'apple_1') && cubes.some((cube) => cube.id === 'red_cube')) {
    return 'red_cube'
  }

  return targetItem
}
export function createWorldFactsWriter({
  getAgentState,
  getCubes,
  getFridgeOpen,
  getOvenOpen,
  getPlaneState,
  setAgentLocation,
  pickUpCube,
  placeCube,
  pickPlane,
  placePlane,
  toggleFridgeDoor,
  toggleOvenDoor,
  updateCubePosition,
  setPlaneHeated
} = {}) {
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

  const pickCube = (cubeId) => {
    if (typeof pickUpCube !== 'function' || !cubeId) return false
    pickUpCube(cubeId)
    return true
  }

  const placeHeldCube = (cubeId, position, newState = 'on_table') => {
    if (typeof placeCube !== 'function' || !cubeId) return false
    placeCube(cubeId, position, newState)
    return true
  }

  const updateCubeDragPosition = (cubeId, position) => {
    if (typeof updateCubePosition !== 'function') return false
    return Boolean(updateCubePosition(cubeId, position))
  }

  const cookMeat = (targetItem) => {
    const safeTarget = String(targetItem || '').toLowerCase()
    const validTargets = new Set([
      WORLD_FACT_ENTITY_IDS.MEAT_RAW,
      WORLD_FACT_ENTITY_IDS.MEAT_HEATED,
      'plate',
      WORLD_FACT_ENTITY_IDS.OVEN
    ])

    if (!validTargets.has(safeTarget)) {
      return {
        success: false,
        failure_reason: `COOK unsupported target: ${targetItem}`
      }
    }

    const agent = getSafeAgentState(getAgentState)
    if (agent.location !== 'stove_zone') {
      return {
        success: false,
        failure_reason: 'COOK failed: move to stove_zone first'
      }
    }

    const planeState = typeof getPlaneState === 'function' ? getPlaneState() : null
    if (!planeState) {
      return {
        success: false,
        failure_reason: 'COOK failed: plane state not available'
      }
    }

    if (planeState.state !== 'on_table') {
      return {
        success: false,
        failure_reason: 'COOK failed: plate is not on table'
      }
    }

    if (planeState.isHeated) {
      return {
        success: true,
        next_agent_state: agent
      }
    }

    if (typeof setPlaneHeated !== 'function') {
      return {
        success: false,
        failure_reason: 'COOK not supported in current world writer'
      }
    }

    setPlaneHeated(true)
    return {
      success: true,
      next_agent_state: agent
    }
  }

  const executeIntent = (actionPayload) => {
    const normalizedAction = normalizeBackendIntent(actionPayload)
    const actionType = String(normalizedAction?.type || 'INTERACT').toUpperCase()

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
    const ovenOpen = Boolean(typeof getOvenOpen === 'function' ? getOvenOpen() : false)
    const planeState = typeof getPlaneState === 'function' ? getPlaneState() : null
    const currentMeatId = getCurrentMeatId(planeState)

    const interactionType = String(normalizedAction.interaction_type || 'NONE').toUpperCase()
    const targetItem = normalizedAction.target_item

    switch (interactionType) {
      case 'PICK': {
        if (isMeatLikeItemId(targetItem)) {
          if (!planeState || planeState.state === 'picked') {
            return {
              success: false,
              failure_reason: `PICK failed: ${targetItem} is not pickable`
            }
          }

          if (typeof pickPlane !== 'function' || !pickPlane()) {
            return {
              success: false,
              failure_reason: `PICK failed: ${targetItem} state update failed`
            }
          }

          return {
            success: true,
            next_agent_state: {
              ...getSafeAgentState(getAgentState),
              holding: null
            }
          }
        }

        const cubeTargetId = resolveLegacyCubeId(targetItem, cubes)
        const pickTarget = cubes.find((cube) => cube.id === cubeTargetId && cube.state !== 'picked')
        if (!pickTarget) {
          return {
            success: false,
            failure_reason: `PICK failed: ${targetItem} is not pickable`
          }
        }

        if (!pickCube(pickTarget.id)) {
          return {
            success: false,
            failure_reason: `PICK failed: ${targetItem} state update failed`
          }
        }

        return {
          success: true,
          next_agent_state: {
            ...getSafeAgentState(getAgentState),
            holding: null
          }
        }
      }

      case 'PLACE': {
        const requestedSourceId = normalizedAction.source_item
        const sourceCubeId = resolveLegacyCubeId(requestedSourceId, cubes)

        const pickedCube = sourceCubeId
          ? cubes.find((cube) => cube.id === sourceCubeId && cube.state === 'picked')
          : cubes.find((cube) => cube.state === 'picked')

        const meatPicked = Boolean(planeState && planeState.state === 'picked')
        const requestIsMeat = isMeatLikeItemId(requestedSourceId)

        let sourceType = null
        let sourceId = null

        if (pickedCube) {
          sourceType = 'cube'
          sourceId = pickedCube.id
        } else if ((requestIsMeat || !requestedSourceId) && meatPicked) {
          sourceType = 'meat'
          sourceId = currentMeatId
        }

        if (!sourceType) {
          return {
            success: false,
            failure_reason: 'PLACE failed: no picked item'
          }
        }

        if (targetItem === 'fridge_main') {
          if (!fridgeOpen) {
            return {
              success: false,
              failure_reason: 'PLACE failed: fridge door is closed'
            }
          }

          if (sourceType === 'cube') {
            if (!placeHeldCube(sourceId, [-1.8, 1.2, -0.5], 'in_fridge')) {
              return {
                success: false,
                failure_reason: `PLACE failed: cannot place ${sourceId}`
              }
            }
          } else {
            if (typeof placePlane !== 'function' || !placePlane('in_fridge')) {
              return {
                success: false,
                failure_reason: `PLACE failed: cannot place ${sourceId}`
              }
            }
          }

          return {
            success: true,
            next_agent_state: {
              ...getSafeAgentState(getAgentState),
              holding: null
            }
          }
        }

        if (targetItem === 'table_surface') {
          if (sourceType === 'cube') {
            const cubePosition = pickedCube?.position || null
            if (!placeHeldCube(sourceId, cubePosition, 'on_table')) {
              return {
                success: false,
                failure_reason: `PLACE failed: cannot place ${sourceId}`
              }
            }
          } else {
            if (typeof placePlane !== 'function' || !placePlane('on_table')) {
              return {
                success: false,
                failure_reason: `PLACE failed: cannot place ${sourceId}`
              }
            }
          }

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
        if (targetItem === 'fridge_door') {
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

        if (targetItem === 'oven_door') {
          if (ovenOpen) {
            return {
              success: false,
              failure_reason: 'OPEN failed: oven door already open'
            }
          }
          if (typeof toggleOvenDoor === 'function') {
            toggleOvenDoor()
          }
          return {
            success: true,
            next_agent_state: getSafeAgentState(getAgentState)
          }
        }

        return {
          success: false,
          failure_reason: `OPEN unsupported target: ${targetItem}`
        }
      }

      case 'CLOSE': {
        if (targetItem === 'fridge_door') {
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

        if (targetItem === 'oven_door') {
          if (!ovenOpen) {
            return {
              success: false,
              failure_reason: 'CLOSE failed: oven door already closed'
            }
          }
          if (typeof toggleOvenDoor === 'function') {
            toggleOvenDoor()
          }
          return {
            success: true,
            next_agent_state: getSafeAgentState(getAgentState)
          }
        }

        return {
          success: false,
          failure_reason: `CLOSE unsupported target: ${targetItem}`
        }
      }

      case 'COOK': {
        return cookMeat(targetItem)
      }

      case 'NONE': {
        if (targetItem === 'fridge_door' && typeof toggleFridgeDoor === 'function') {
          toggleFridgeDoor()
          return {
            success: true,
            next_agent_state: getSafeAgentState(getAgentState)
          }
        }

        if (targetItem === 'oven_door' && typeof toggleOvenDoor === 'function') {
          toggleOvenDoor()
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






