import {
  WORLD_FACTS_VERSION,
  WORLD_FACT_ENTITY_IDS,
  normalizeAgentFact,
  isPositionTriplet,
  createRelation
} from './WorldFactsOntology'

// Infer what the agent is holding from cube state.
function inferHoldingFromCubes(cubes = []) {
  const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

// Build the main storage: Entity Map.
function buildEntitiesMap({ agentState, cubes = [], fridgeOpen = false }) {
  const normalizedAgent = normalizeAgentFact(agentState)
  const inferredHolding = inferHoldingFromCubes(cubes)
  const effectiveAgent = {
    id: WORLD_FACT_ENTITY_IDS.AGENT,
    type: 'agent',
    location: normalizedAgent.location,
    holding: inferredHolding || normalizedAgent.holding || null
  }

  const entities = {
    [WORLD_FACT_ENTITY_IDS.AGENT]: effectiveAgent,
    [WORLD_FACT_ENTITY_IDS.FRIDGE_MAIN]: {
      id: WORLD_FACT_ENTITY_IDS.FRIDGE_MAIN,
      type: 'appliance',
      state: 'installed'
    },
    [WORLD_FACT_ENTITY_IDS.FRIDGE_DOOR]: {
      id: WORLD_FACT_ENTITY_IDS.FRIDGE_DOOR,
      type: 'door',
      state: fridgeOpen ? 'open' : 'closed'
    },
    [WORLD_FACT_ENTITY_IDS.TABLE_SURFACE]: {
      id: WORLD_FACT_ENTITY_IDS.TABLE_SURFACE,
      type: 'surface',
      state: 'installed'
    }
  }

  for (const cube of cubes) {
    entities[cube.id] = {
      id: cube.id,
      type: 'item',
      name: cube.name || cube.id,
      state: cube.state,
      position: isPositionTriplet(cube.position) ? cube.position : null,
      color: cube.color || null
    }
  }

  return entities
}

// Build the second main storage: Relation List.
function buildRelationsList({ cubes = [] }) {
  const relations = [
    createRelation(WORLD_FACT_ENTITY_IDS.FRIDGE_DOOR, 'in_front_of', WORLD_FACT_ENTITY_IDS.AGENT),
    createRelation(WORLD_FACT_ENTITY_IDS.FRIDGE_MAIN, 'is_a', 'kitchen_appliance'),
    createRelation(WORLD_FACT_ENTITY_IDS.TABLE_SURFACE, 'is_a', 'support_surface')
  ]

  for (const cube of cubes) {
    if (cube.state === 'in_hand') {
      relations.push(createRelation(cube.id, 'held_by', WORLD_FACT_ENTITY_IDS.AGENT))
    } else if (cube.state === 'in_fridge') {
      relations.push(createRelation(cube.id, 'inside', WORLD_FACT_ENTITY_IDS.FRIDGE_MAIN))
    } else {
      relations.push(createRelation(cube.id, 'on', WORLD_FACT_ENTITY_IDS.TABLE_SURFACE))
    }
  }

  return relations
}

// Convert relation object to a short text used by the legacy table view.
function relationToLegacyText(relation) {
  if (!relation) return 'unknown'

  if (relation.predicate === 'held_by') return `held by ${relation.object}`
  if (relation.predicate === 'inside') return `inside ${relation.object}`
  if (relation.predicate === 'on') return `on ${relation.object}`
  if (relation.predicate === 'in_front_of') return `front of ${relation.object}`
  if (relation.predicate === 'is_a' && relation.object === 'kitchen_appliance') return 'kitchen appliance'
  if (relation.predicate === 'is_a' && relation.object === 'support_surface') return 'support surface'

  return `${relation.predicate} ${relation.object}`
}

// Legacy projection only.
// Main storage is entities + relations.
export function projectNearbyObjectsTable(snapshot) {
  const entities = snapshot?.entities || {}
  const relations = Array.isArray(snapshot?.relations) ? snapshot.relations : []

  return Object.values(entities)
    .filter((entity) => entity.id !== WORLD_FACT_ENTITY_IDS.AGENT)
    .map((entity) => {
      const relation = relations.find((r) => r.subject === entity.id)
      return {
        id: entity.id,
        state: entity.state || 'unknown',
        relation: relationToLegacyText(relation),
        position: entity.position || null
      }
    })
}

// Build one world snapshot.
// Main shape: { entities, relations }.
// Compatibility fields: { agent, nearby_objects }.
export function readWorldFactsSnapshot({ agentState, cubes = [], fridgeOpen = false, timestamp } = {}) {
  const entities = buildEntitiesMap({ agentState, cubes, fridgeOpen })
  const relations = buildRelationsList({ cubes })

  const snapshot = {
    version: WORLD_FACTS_VERSION,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
    entities,
    relations
  }

  const agentEntity = entities[WORLD_FACT_ENTITY_IDS.AGENT]
  return {
    ...snapshot,
    // Keep old fields so current AgentSystem keeps working.
    agent: {
      location: agentEntity.location,
      holding: agentEntity.holding
    },
    nearby_objects: projectNearbyObjectsTable(snapshot)
  }
}

// Factory used by runtime modules.
export function createWorldFactsReader({ getAgentState, getCubes, getFridgeOpen } = {}) {
  return {
    readSnapshot() {
      return readWorldFactsSnapshot({
        agentState: typeof getAgentState === 'function' ? getAgentState() : null,
        cubes: typeof getCubes === 'function' ? getCubes() : [],
        fridgeOpen: typeof getFridgeOpen === 'function' ? getFridgeOpen() : false,
        timestamp: Date.now() / 1000
      })
    }
  }
}