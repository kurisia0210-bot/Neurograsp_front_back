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

