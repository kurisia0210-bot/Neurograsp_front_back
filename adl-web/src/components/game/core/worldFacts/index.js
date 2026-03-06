export {
  WORLD_FACTS_VERSION,
  WORLD_FACT_ENTITY_IDS,
  DEFAULT_AGENT_FACT,
  isPositionTriplet,
  normalizeAgentFact,
  createRelation
} from './WorldFactsOntology'

export {
  readWorldFactsSnapshot,
  projectNearbyObjectsTable,
  createWorldFactsReader
} from './WorldFactsReader'

export { createWorldFactsWriter } from './WorldFactsWriter'
