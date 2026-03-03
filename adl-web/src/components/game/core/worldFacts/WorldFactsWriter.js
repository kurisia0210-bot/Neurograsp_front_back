import {
  WORLD_FACTS_VERSION,
  normalizeAgentFact,
  buildNearbyObjects
} from './WorldFactsTable'

function inferHoldingFromCubes(cubes = []) {
  const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

function cloneNearbyObjects(nearbyObjects = []) {
  return nearbyObjects.map((fact) => {
    const { position: _position, rotation: _rotation, ...semanticFact } = fact || {}
    return { ...semanticFact }
  })
}

function buildSnapshot({ version, timestamp, agent, nearby_objects }) {
  return {
    version,
    timestamp,
    agent: { ...agent },
    nearby_objects: cloneNearbyObjects(nearby_objects)
  }
}

export function writeWorldFacts(table, { agentState, cubes = [], fridgeOpen = false, timestamp } = {}) {
  if (!table || typeof table !== 'object') {
    throw new Error('writeWorldFacts requires a mutable table object')
  }

  const safeCubes = Array.isArray(cubes) ? cubes : []
  const normalizedAgent = normalizeAgentFact(agentState)
  const inferredHolding = inferHoldingFromCubes(safeCubes)
  const effectiveAgent = {
    ...normalizedAgent,
    holding: inferredHolding || normalizedAgent.holding || null
  }

  table.version = WORLD_FACTS_VERSION
  table.timestamp = typeof timestamp === 'number' ? timestamp : Date.now() / 1000
  table.agent = effectiveAgent
  table.nearby_objects = buildNearbyObjects(safeCubes, Boolean(fridgeOpen))
  if (!table.initial_snapshot) {
    table.initial_snapshot = buildSnapshot(table)
  }

  return table
}
