function buildCubeRelation(cube) {
  if (cube.state === 'in_hand') return 'held by agent'
  if (cube.state === 'in_fridge') return 'inside fridge_main'
  return 'on table_surface'
}

function cubeToNearbyObject(cube) {
  return {
    id: cube.id,
    state: cube.state,
    relation: buildCubeRelation(cube),
    position: cube.position || null
  }
}

function fridgeDoorFact(fridgeOpen) {
  return {
    id: 'fridge_door',
    state: fridgeOpen ? 'open' : 'closed',
    relation: 'front of agent'
  }
}

function staticObjectFacts() {
  return [
    {
      id: 'fridge_main',
      state: 'installed',
      relation: 'kitchen appliance'
    },
    {
      id: 'table_surface',
      state: 'installed',
      relation: 'support surface'
    }
  ]
}

export const WORLD_FACT_REGISTRY = Object.freeze({
  cubes: (context) => (context.cubes || []).map(cubeToNearbyObject),
  fridgeDoor: (context) => [fridgeDoorFact(Boolean(context.fridgeOpen))],
  staticObjects: () => staticObjectFacts()
})

export function buildNearbyObjectsFromRegistry(context) {
  return [
    ...WORLD_FACT_REGISTRY.cubes(context),
    ...WORLD_FACT_REGISTRY.fridgeDoor(context),
    ...WORLD_FACT_REGISTRY.staticObjects(context)
  ]
}

