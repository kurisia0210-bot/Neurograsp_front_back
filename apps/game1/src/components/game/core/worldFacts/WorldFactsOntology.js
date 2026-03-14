export const WORLD_FACTS_VERSION = 2

export const WORLD_FACT_ENTITY_IDS = Object.freeze({
  AGENT: 'agent',
  FRIDGE_MAIN: 'fridge_main',
  FRIDGE_DOOR: 'fridge_door',
  TABLE_SURFACE: 'table_surface',
  OVEN: 'oven',
  OVEN_DOOR: 'oven_door',
  MEAT_RAW: 'meat_raw',
  MEAT_HEATED: 'meat_heated'
})

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

export function createRelation(subject, predicate, object) {
  return { subject, predicate, object }
}
