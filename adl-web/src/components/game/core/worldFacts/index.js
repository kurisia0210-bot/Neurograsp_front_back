import {
  WORLD_FACTS_VERSION,
  normalizeAgentFact,
  buildNearbyObjects
} from './WorldFactsTable'

export {
  WORLD_FACTS_VERSION,
  DEFAULT_AGENT_FACT,
  isPositionTriplet,
  normalizeAgentFact,
  buildNearbyObjects
} from './WorldFactsTable'

// Simple builder for MVP (no table persistence)
export function buildWorldFacts({ agentState, cubes = [], fridgeOpen = false, timestamp } = {}) {
  const safeCubes = Array.isArray(cubes) ? cubes : []
  const normalizedAgent = normalizeAgentFact(agentState)
  
  const inferHoldingFromCubes = (cubes) => {
    const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
    return holdingCube?.id || null
  }
  
  const inferredHolding = inferHoldingFromCubes(safeCubes)
  const effectiveAgent = {
    ...normalizedAgent,
    holding: inferredHolding || normalizedAgent.holding || null
  }

  return {
    version: WORLD_FACTS_VERSION,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
    agent: effectiveAgent,
    nearby_objects: buildNearbyObjects(safeCubes, Boolean(fridgeOpen))
  }
}

