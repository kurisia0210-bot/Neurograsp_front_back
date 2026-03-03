export const WORLD_FACTS_VERSION = 1

export const DEFAULT_AGENT_FACT = Object.freeze({
  location: 'table_center',
  holding: null
})

export function isPositionTriplet(value) {
  return Array.isArray(value) && value.length === 3 && value.every((n) => Number.isFinite(n))
}

export function normalizeAgentFact(rawAgent = {}) {
  const safe = rawAgent || {}
  return {
    location: safe.location || DEFAULT_AGENT_FACT.location,
    holding: Object.prototype.hasOwnProperty.call(safe, 'holding')
      ? safe.holding
      : DEFAULT_AGENT_FACT.holding
  }
}

function buildCubeRelation(cube) {
  if (cube.state === 'in_hand') return 'held by agent'
  if (cube.state === 'in_fridge') return 'inside fridge_main'
  return 'on table_surface'
}

function cubeToNearbyObject(cube) {
  return {
    id: cube.id,
    state: cube.state,
    relation: buildCubeRelation(cube)
  }
}

export function buildNearbyObjects(cubes = [], fridgeOpen = false) {
  const cubeFacts = cubes.map(cubeToNearbyObject)
  return [
    ...cubeFacts,
    {
      id: 'fridge_door',
      state: fridgeOpen ? 'open' : 'closed',
      relation: 'front of agent'
    },
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

export function createWorldFactsTable() {
  return {
    version: WORLD_FACTS_VERSION,
    timestamp: Date.now() / 1000,
    agent: { ...DEFAULT_AGENT_FACT },
    nearby_objects: [],
    initial_snapshot: null
  }
}
