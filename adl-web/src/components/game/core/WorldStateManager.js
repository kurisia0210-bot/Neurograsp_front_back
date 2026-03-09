import { useState, useCallback, useMemo, useRef } from 'react'
import { isPositionTriplet, createWorldFactsReader } from './worldFacts'

const DEFAULT_AGENT_STATE = {
  location: 'table_center',
  holding: null
}

const DEFAULT_PLANE_STATE = {
  position: [0.4, 1.701, -0.4],
  isHeated: false,
  state: 'on_table'
}

function inferHoldingFromCubes() {
  return null
}

function normalizeAgentState(rawAgentState, cubes = []) {
  const safeRaw = rawAgentState || {}
  const hasHolding = Object.prototype.hasOwnProperty.call(safeRaw, 'holding')
  return {
    location: safeRaw.location || DEFAULT_AGENT_STATE.location,
    holding: hasHolding ? safeRaw.holding : inferHoldingFromCubes(cubes)
  }
}

function normalizePlaneState(rawPlaneState) {
  const safeRaw = rawPlaneState || {}
  const safeState =
    safeRaw.state === 'picked' || safeRaw.state === 'in_fridge' ? safeRaw.state : 'on_table'

  return {
    position: isPositionTriplet(safeRaw.position) ? safeRaw.position : [...DEFAULT_PLANE_STATE.position],
    isHeated: Boolean(safeRaw.isHeated),
    state: safeState
  }
}

function isPlaneInOvenZone(position) {
  if (!isPositionTriplet(position)) return false
  const [x] = position
  return x >= 1.6
}

export function useWorldStateManager(options = {}) {
  const {
    initialFridgeOpen = false,
    initialOvenOpen = false,
    initialAgentState = DEFAULT_AGENT_STATE,
    initialPlaneState = DEFAULT_PLANE_STATE,
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
    ovenOpen: initialOvenOpen,
    cubes: initialCubes,
    planeState: normalizePlaneState(initialPlaneState)
  })

  const [agentState, setAgentState] = useState(initialStateRef.current.agentState)
  const [fridgeOpen, setFridgeOpen] = useState(initialStateRef.current.fridgeOpen)
  const [ovenOpen, setOvenOpen] = useState(initialStateRef.current.ovenOpen)
  const [cubes, setCubes] = useState(initialStateRef.current.cubes)
  const [planeState, setPlaneState] = useState(initialStateRef.current.planeState)

  const getHoldingCube = useCallback(() => {
    return null
  }, [])

  const pickUpCube = useCallback((cubeId) => {
    if (!cubeId) return false

    const canPick = cubes.some((cube) => cube.id === cubeId && cube.state !== 'picked')
    if (!canPick) return false

    setCubes((prevCubes) => {
      let pickedOne = false

      return prevCubes.map((cube) => {
        const shouldPickThisCube = !pickedOne && cube.id === cubeId && cube.state !== 'picked'
        if (shouldPickThisCube) {
          pickedOne = true
          console.log(`PICK: ${cube.name}`)
          return { ...cube, state: 'picked' }
        }

        return cube
      })
    })

    setAgentState((prev) => ({ ...prev, holding: null }))
    return true
  }, [cubes])

  const placeCube = useCallback((cubeId, position, newState = 'on_table') => {
    if (!cubeId) return false

    let placed = false
    setCubes((prevCubes) =>
      prevCubes.map((cube) => {
        if (!placed && cube.id === cubeId && cube.state === 'picked') {
          placed = true
          console.log(`PLACE: ${cube.name} -> ${newState}`)
          return { ...cube, state: newState, position }
        }
        return cube
      })
    )

    setAgentState((prev) => ({ ...prev, holding: null }))
    return placed
  }, [])

  const pickPlane = useCallback(() => {
    if (planeState.state === 'picked') return false

    setPlaneState((prev) => ({
      ...prev,
      state: 'picked'
    }))
    setAgentState((prev) => ({ ...prev, holding: null }))
    return true
  }, [planeState.state])

  const placePlane = useCallback((newState = 'on_table', position = null) => {
    if (planeState.state !== 'picked') return false

    const safeNextState = newState === 'in_fridge' ? 'in_fridge' : 'on_table'
    setPlaneState((prev) => ({
      ...prev,
      state: safeNextState,
      position: isPositionTriplet(position) ? [...position] : prev.position
    }))
    setAgentState((prev) => ({ ...prev, holding: null }))
    return true
  }, [planeState.state])

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

  const toggleOvenDoor = useCallback(() => {
    setOvenOpen((prev) => {
      const next = !prev

      if (!next) {
        setPlaneState((prevPlane) => {
          if (prevPlane.state !== 'on_table') return prevPlane
          if (prevPlane.isHeated) return prevPlane
          if (!isPlaneInOvenZone(prevPlane.position)) return prevPlane

          console.log('AUTO_HEAT: meat_raw -> meat_heated (oven_door closed)')
          return {
            ...prevPlane,
            isHeated: true
          }
        })
      }

      console.log(`${next ? 'OPEN' : 'CLOSE'} oven_door`)
      return next
    })
  }, [])

  const setAgentLocation = useCallback((location) => {
    if (!location || typeof location !== 'string') return false
    setAgentState((prev) => ({ ...prev, location }))
    return true
  }, [])

  const setPlanePosition = useCallback((position) => {
    if (!isPositionTriplet(position)) return false
    setPlaneState((prev) => ({
      ...prev,
      position: [...position]
    }))
    return true
  }, [])

  const setPlaneHeated = useCallback((isHeated) => {
    setPlaneState((prev) => ({
      ...prev,
      isHeated: Boolean(isHeated)
    }))
    return true
  }, [])

  const worldFactsReader = useMemo(() => {
    return createWorldFactsReader({
      getAgentState: () => normalizeAgentState(agentState, cubes),
      getCubes: () => cubes,
      getFridgeOpen: () => fridgeOpen,
      getOvenOpen: () => ovenOpen,
      getPlaneState: () => planeState
    })
  }, [agentState, cubes, fridgeOpen, ovenOpen, planeState])

  const getWorldFacts = useCallback(() => {
    return worldFactsReader.readSnapshot()
  }, [worldFactsReader])

  const resetWorldState = useCallback(() => {
    setFridgeOpen(initialStateRef.current.fridgeOpen)
    setOvenOpen(initialStateRef.current.ovenOpen)
    setAgentState(initialStateRef.current.agentState)
    setCubes(initialStateRef.current.cubes.map((c) => ({ ...c, position: [...c.position] })))
    setPlaneState({
      position: [...initialStateRef.current.planeState.position],
      isHeated: initialStateRef.current.planeState.isHeated,
      state: initialStateRef.current.planeState.state || 'on_table'
    })
    console.log('World state reset')
  }, [])

  return {
    agentState,
    fridgeOpen,
    ovenOpen,
    cubes,
    planeState,
    holdingCube: getHoldingCube(),

    pickUpCube,
    placeCube,
    pickPlane,
    placePlane,
    updateCubePosition,
    toggleFridgeDoor,
    toggleOvenDoor,
    setAgentLocation,
    setPlanePosition,
    setPlaneHeated,
    getWorldFacts,
    resetWorldState,
    getHoldingCube
  }
}
