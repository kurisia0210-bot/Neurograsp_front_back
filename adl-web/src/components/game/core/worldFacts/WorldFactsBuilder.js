import {
  WORLD_FACTS_VERSION,
  normalizeAgentFact
} from './WorldFactsContract'
import { buildNearbyObjectsFromRegistry } from './WorldFactsRegistry'

function inferHoldingFromCubes(cubes = []) {
  const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

export function buildWorldFacts({ agentState, cubes = [], fridgeOpen = false, timestamp } = {}) {
  const normalizedAgent = normalizeAgentFact(agentState)
  const inferredHolding = inferHoldingFromCubes(cubes)
  const effectiveHolding = inferredHolding || normalizedAgent.holding || null
  const effectiveAgent = {
    ...normalizedAgent,
    holding: effectiveHolding
  }

  return {
    version: WORLD_FACTS_VERSION,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
    agent: effectiveAgent,
    nearby_objects: buildNearbyObjectsFromRegistry({
      agent: effectiveAgent,
      cubes,
      fridgeOpen
    })
  }
}

