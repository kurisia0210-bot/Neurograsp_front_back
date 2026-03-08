import {
  WORLD_FACTS_VERSION,
  WORLD_FACT_ENTITY_IDS,
  normalizeAgentFact,
  isPositionTriplet,
  createRelation
} from './WorldFactsOntology'

function inferHoldingFromCubes(cubes = []) {
  const holdingCube = cubes.find((cube) => cube.state === 'in_hand')
  return holdingCube?.id || null
}

function getMeatEntityId(planeState) {
  if (!planeState) return null
  return planeState.isHeated ? WORLD_FACT_ENTITY_IDS.MEAT_HEATED : WORLD_FACT_ENTITY_IDS.MEAT_RAW
}

function inferMeatSurface(planeState) {
  const pos = planeState?.position
  if (!isPositionTriplet(pos)) return WORLD_FACT_ENTITY_IDS.TABLE_SURFACE

  const [x] = pos
  if (x >= 1.6) return WORLD_FACT_ENTITY_IDS.OVEN
  return WORLD_FACT_ENTITY_IDS.TABLE_SURFACE
}

function buildEntitiesMap({
  agentState,
  cubes = [],
  fridgeOpen = false,
  ovenOpen = false,
  planeState = null
}) {
  const normalizedAgent = normalizeAgentFact(agentState)
  const inferredHolding = inferHoldingFromCubes(cubes)

  const entities = {
    [WORLD_FACT_ENTITY_IDS.AGENT]: {
      id: WORLD_FACT_ENTITY_IDS.AGENT,
      type: 'human',
      location: normalizedAgent.location,
      holding: inferredHolding || normalizedAgent.holding || null
    },
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
    },
    [WORLD_FACT_ENTITY_IDS.OVEN]: {
      id: WORLD_FACT_ENTITY_IDS.OVEN,
      type: 'appliance',
      state: 'installed'
    },
    [WORLD_FACT_ENTITY_IDS.OVEN_DOOR]: {
      id: WORLD_FACT_ENTITY_IDS.OVEN_DOOR,
      type: 'door',
      state: ovenOpen ? 'open' : 'closed'
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

  const meatId = getMeatEntityId(planeState)
  if (meatId) {
    entities[meatId] = {
      id: meatId,
      type: 'item',
      name: meatId,
      state: 'on_table',
      position: isPositionTriplet(planeState.position) ? planeState.position : null,
      color: planeState.isHeated ? '#f97316' : '#22c55e'
    }
  }

  return entities
}

function buildRelationsList({ cubes = [], planeState = null }) {
  const relations = [
    createRelation(WORLD_FACT_ENTITY_IDS.FRIDGE_DOOR, 'in_front_of', WORLD_FACT_ENTITY_IDS.AGENT),
    createRelation(WORLD_FACT_ENTITY_IDS.FRIDGE_MAIN, 'is_a', 'kitchen_appliance'),
    createRelation(WORLD_FACT_ENTITY_IDS.OVEN, 'is_a', 'kitchen_appliance'),
    createRelation(WORLD_FACT_ENTITY_IDS.OVEN_DOOR, 'attached_to', WORLD_FACT_ENTITY_IDS.OVEN),
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

  const meatId = getMeatEntityId(planeState)
  if (meatId) {
    relations.push(createRelation(meatId, 'on', inferMeatSurface(planeState)))
  }

  return relations
}

function relationToLegacyText(relation) {
  if (!relation) return 'unknown'

  if (relation.predicate === 'held_by') return `held by ${relation.object}`
  if (relation.predicate === 'inside') return `inside ${relation.object}`
  if (relation.predicate === 'on') return `on ${relation.object}`
  if (relation.predicate === 'in_front_of') return `front of ${relation.object}`
  if (relation.predicate === 'attached_to') return `attached to ${relation.object}`
  if (relation.predicate === 'is_a' && relation.object === 'kitchen_appliance') return 'kitchen appliance'
  if (relation.predicate === 'is_a' && relation.object === 'support_surface') return 'support surface'

  return `${relation.predicate} ${relation.object}`
}

function getAgentPositionFromLocation(location) {
  if (location === 'fridge_zone') return [-2, 0, 1]
  if (location === 'stove_zone') return [2, 0, 1]
  if (location === 'table_center') return [1.5, 0, 2]
  return null
}

export function projectNearbyObjectsTable(snapshot) {
  const entities = snapshot?.entities || {}
  const relations = Array.isArray(snapshot?.relations) ? snapshot.relations : []

  return Object.values(entities).map((entity) => {
    const relation = relations.find((r) => r.subject === entity.id)
    const isAgent = entity.id === WORLD_FACT_ENTITY_IDS.AGENT
    return {
      id: isAgent ? 'human' : entity.id,
      state: isAgent ? (entity.holding ? `holding:${entity.holding}` : 'idle') : (entity.state || 'unknown'),
      relation: isAgent ? `at ${entity.location || 'unknown'}` : relationToLegacyText(relation),
      position: isAgent ? getAgentPositionFromLocation(entity.location) : (entity.position || null)
    }
  })
}

export function readWorldFactsSnapshot({
  agentState,
  cubes = [],
  fridgeOpen = false,
  ovenOpen = false,
  planeState = null,
  timestamp
} = {}) {
  const entities = buildEntitiesMap({ agentState, cubes, fridgeOpen, ovenOpen, planeState })
  const relations = buildRelationsList({ cubes, planeState })
  const nearbyObjectsForBackend = projectNearbyObjectsTable({
    entities,
    relations
  }).filter((row) => row.id !== 'human')

  const snapshot = {
    version: WORLD_FACTS_VERSION,
    timestamp: typeof timestamp === 'number' ? timestamp : Date.now() / 1000,
    entities,
    relations
  }

  const agentEntity = entities[WORLD_FACT_ENTITY_IDS.AGENT]
  return {
    ...snapshot,
    agent: {
      location: agentEntity.location,
      holding: agentEntity.holding
    },
    nearby_objects: nearbyObjectsForBackend
  }
}

export function createWorldFactsReader({
  getAgentState,
  getCubes,
  getFridgeOpen,
  getOvenOpen,
  getPlaneState
} = {}) {
  return {
    readSnapshot() {
      return readWorldFactsSnapshot({
        agentState: typeof getAgentState === 'function' ? getAgentState() : null,
        cubes: typeof getCubes === 'function' ? getCubes() : [],
        fridgeOpen: typeof getFridgeOpen === 'function' ? getFridgeOpen() : false,
        ovenOpen: typeof getOvenOpen === 'function' ? getOvenOpen() : false,
        planeState: typeof getPlaneState === 'function' ? getPlaneState() : null,
        timestamp: Date.now() / 1000
      })
    }
  }
}
