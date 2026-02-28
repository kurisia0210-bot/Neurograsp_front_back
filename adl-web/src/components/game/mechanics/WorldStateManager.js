import { useState, useCallback, useEffect, useRef } from 'react'

const DOOR_OPEN_ANGLE = 2.0
const DOOR_CLOSED_ANGLE = 0
const DOOR_ANIM_STEP = 0.14
const DOOR_ANIM_INTERVAL_MS = 16
const DEFAULT_AGENT_STATE = {
  location: 'table_center',
  holding: null
}

function inferHoldingFromCubes(cubeList = []) {
  const holdingCube = cubeList.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

function normalizeAgentState(rawAgentState, cubes = []) {
  const safeRaw = rawAgentState || {}
  const hasHolding = Object.prototype.hasOwnProperty.call(safeRaw, 'holding')
  return {
    location: safeRaw.location || DEFAULT_AGENT_STATE.location,
    holding: hasHolding ? safeRaw.holding : inferHoldingFromCubes(cubes)
  }
}

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
    console.log('[World] Executing:', actionPayload)

    const actionType = String(actionPayload?.type || 'INTERACT').toUpperCase()
    if (actionType === 'MOVE_TO') {
      const targetPoi = actionPayload?.target_poi
      if (!targetPoi) {
        return { success: false, failure_reason: 'MOVE_TO missing target_poi' }
      }
      setAgentState((prev) => ({ ...prev, location: targetPoi }))
      return { success: true }
    }

    if (actionType === 'THINK' || actionType === 'SPEAK' || actionType === 'IDLE' || actionType === 'FINISH') {
      return { success: true }
    }

    if (actionType !== 'INTERACT') {
      return { success: false, failure_reason: `Unsupported action type: ${actionType}` }
    }

    const interactionType = String(actionPayload.interaction_type || 'NONE').toUpperCase()
    const targetItem = actionPayload.target_item
    const targetLocation = actionPayload.target_location || actionPayload.target_poi || targetItem
    const holdingCube = cubes.find((cube) => cube.state === 'in_hand')

    switch (interactionType) {
      case 'PICK': {
        const pickTarget = cubes.find((cube) => cube.id === targetItem && cube.state === 'on_table')
        if (!pickTarget) {
          return { success: false, failure_reason: `PICK precondition failed for ${targetItem}` }
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
        setAgentState((prev) => ({ ...prev, holding: targetItem }))
        return { success: true }
      }

      case 'PLACE': {
        if (!holdingCube) {
          return { success: false, failure_reason: 'PLACE precondition failed: no item in hand' }
        }
        if (targetLocation === 'fridge_main' && !fridgeOpen) {
          return { success: false, failure_reason: 'PLACE precondition failed: fridge door is closed' }
        }

        const heldCubeId = holdingCube.id
        setCubes((prevCubes) =>
          prevCubes.map((cube) => {
            if (cube.id === heldCubeId && cube.state === 'in_hand') {
              if (targetLocation === 'fridge_main') {
                console.log(`Placed ${cube.name} in fridge`)
                return { ...cube, state: 'in_fridge', position: [-1.8, 1.2, -0.5] }
              }
              if (targetLocation === 'table_surface') {
                console.log(`Placed ${cube.name} on table`)
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
        if (targetLocation === 'fridge_main' || targetLocation === 'table_surface') {
          setAgentState((prev) => ({ ...prev, holding: null }))
        }
        if (targetLocation === 'fridge_main' || targetLocation === 'table_surface') {
          return { success: true }
        }
        return { success: false, failure_reason: `PLACE unsupported target: ${targetLocation}` }
      }

      case 'OPEN':
        if (targetItem === 'fridge_door') {
          if (fridgeOpen) {
            return { success: false, failure_reason: 'OPEN precondition failed: fridge door already open' }
          }
          openFridgeDoor('agent')
          return { success: true }
        }
        return { success: false, failure_reason: `OPEN unsupported target: ${targetItem}` }

      case 'CLOSE':
        if (targetItem === 'fridge_door') {
          if (!fridgeOpen) {
            return { success: false, failure_reason: 'CLOSE precondition failed: fridge door already closed' }
          }
          closeFridgeDoor('agent')
          return { success: true }
        }
        return { success: false, failure_reason: `CLOSE unsupported target: ${targetItem}` }

      case 'NONE':
        if (targetItem === 'fridge_door') {
          toggleFridgeDoor()
          return { success: true }
        }
        return { success: false, failure_reason: `NONE unsupported target: ${targetItem}` }

      default:
        console.log(`Unknown interaction: ${interactionType}`)
        return { success: false, failure_reason: `Unknown interaction: ${interactionType}` }
    }
  }, [openFridgeDoor, closeFridgeDoor, toggleFridgeDoor, cubes, fridgeOpen])

  const getWorldState = useCallback(() => {
    const nearby_objects = []
    const holdingCube = getHoldingCube()
    const inferredHolding = holdingCube?.id || null
    const resolvedAgentState = normalizeAgentState(agentState, cubes)
    const effectiveHolding = inferredHolding || resolvedAgentState.holding || null

    cubes.forEach((cube) => {
      const relation =
        cube.state === 'in_hand'
          ? 'held by agent'
          : cube.state === 'in_fridge'
            ? 'inside fridge_main'
            : 'on table_surface'
      nearby_objects.push({
        id: cube.id,
        state: cube.state,
        relation
      })
    })

    nearby_objects.push({
      id: 'fridge_door',
      state: fridgeOpen ? 'open' : 'closed',
      relation: 'front of agent'
    })

    nearby_objects.push({
      id: 'fridge_main',
      state: 'installed',
      relation: 'kitchen appliance'
    })

    nearby_objects.push({
      id: 'table_surface',
      state: 'installed',
      relation: 'support surface'
    })

    return {
      agent: {
        location: resolvedAgentState.location,
        holding: effectiveHolding
      },
      nearby_objects
    }
  }, [agentState, cubes, fridgeOpen, getHoldingCube])

  const getWorldFacts = useCallback(() => {
    return getWorldState()
  }, [getWorldState])

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

    setFridgeOpen,
    setCubes,
    pickUpCube,
    placeCube,
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

export function useHoldingItemManager(cubes, setCubes) {
  const holdingCube = cubes.find((cube) => cube.state === 'in_hand')

  const pickUpCube = (cubeId) => {
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'on_table') {
          console.log(`Mouse PICK: ${cube.name}`)
          return { ...cube, state: 'in_hand' }
        }
        return cube
      })
    )
  }

  const placeCube = (cubeId, position, newState = 'on_table') => {
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (cube.id === cubeId && cube.state === 'in_hand') {
          console.log(`Mouse PLACE: ${cube.name} -> ${newState}`)
          return { ...cube, state: newState, position }
        }
        return cube
      })
    )
  }

  const isHolding = (cubeId) => holdingCube?.id === cubeId

  return {
    holdingCube,
    pickUpCube,
    placeCube,
    isHolding
  }
}

export default {
  useWorldStateManager,
  useHoldingItemManager
}
