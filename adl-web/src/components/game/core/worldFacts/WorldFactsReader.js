import {
  WORLD_FACTS_VERSION,
  DEFAULT_AGENT_FACT,
  normalizeAgentFact
} from './WorldFactsTable'

function cloneNearbyObjects(nearbyObjects = []) {
  return nearbyObjects.map((fact) => {
    const { position: _position, rotation: _rotation, ...semanticFact } = fact || {}
    return { ...semanticFact }
  })
}

function normalizeSnapshot(rawSnapshot) {
  const safeSnapshot = rawSnapshot && typeof rawSnapshot === 'object' ? rawSnapshot : {}
  return {
    version: Number.isFinite(safeSnapshot.version) ? safeSnapshot.version : WORLD_FACTS_VERSION,
    timestamp: Number.isFinite(safeSnapshot.timestamp) ? safeSnapshot.timestamp : Date.now() / 1000,
    agent: normalizeAgentFact(safeSnapshot.agent || DEFAULT_AGENT_FACT),
    nearby_objects: cloneNearbyObjects(Array.isArray(safeSnapshot.nearby_objects) ? safeSnapshot.nearby_objects : [])
  }
}

export function readWorldFacts(table) {
  return normalizeSnapshot(table)
}

export function readInitialWorldFacts(table) {
  const safeTable = table && typeof table === 'object' ? table : {}
  if (!safeTable.initial_snapshot || typeof safeTable.initial_snapshot !== 'object') {
    return null
  }
  return normalizeSnapshot(safeTable.initial_snapshot)
}
