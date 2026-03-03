// Registry stores static world semantics only.

// Static world rules only: object kind, allowed actions, static preconditions, human-readable semantics.
export const OBJECT_RULES_REGISTRY = Object.freeze({
  red_cube: Object.freeze({
    kind: 'item',
    displayName: 'Red Cube',
    coachAliases: Object.freeze(['red cube', 'cube']),
    allowedActions: Object.freeze(['PICK', 'PLACE']),
    constraints: Object.freeze({
      PICK: Object.freeze(['requires_agent_near_table', 'requires_empty_hand']),
      PLACE: Object.freeze(['requires_holding_item'])
    })
  }),
  half_cube_left: Object.freeze({
    kind: 'item',
    displayName: 'Half Cube Left',
    coachAliases: Object.freeze(['left half cube']),
    allowedActions: Object.freeze(['PICK', 'PLACE']),
    constraints: Object.freeze({
      PICK: Object.freeze(['requires_agent_near_table', 'requires_empty_hand']),
      PLACE: Object.freeze(['requires_holding_item'])
    })
  }),
  half_cube_right: Object.freeze({
    kind: 'item',
    displayName: 'Half Cube Right',
    coachAliases: Object.freeze(['right half cube']),
    allowedActions: Object.freeze(['PICK', 'PLACE']),
    constraints: Object.freeze({
      PICK: Object.freeze(['requires_agent_near_table', 'requires_empty_hand']),
      PLACE: Object.freeze(['requires_holding_item'])
    })
  }),

  fridge_main: Object.freeze({
    kind: 'container',
    displayName: 'Fridge',
    coachAliases: Object.freeze(['fridge', 'refrigerator', 'fridge main']),
    allowedActions: Object.freeze(['PLACE']),
    constraints: Object.freeze({
      PLACE: Object.freeze([
        'requires_holding_item',
        'requires_fridge_door_open',
        'requires_agent_near_fridge_zone'
      ])
    })
  }),
  fridge_door: Object.freeze({
    kind: 'door',
    displayName: 'Fridge Door',
    coachAliases: Object.freeze(['fridge door', 'door']),
    allowedActions: Object.freeze(['OPEN', 'CLOSE', 'TOGGLE']),
    constraints: Object.freeze({
      OPEN: Object.freeze(['requires_agent_near_fridge_zone', 'requires_fridge_door_closed']),
      CLOSE: Object.freeze(['requires_agent_near_fridge_zone', 'requires_fridge_door_open']),
      TOGGLE: Object.freeze(['requires_agent_near_fridge_zone'])
    })
  }),
  table_surface: Object.freeze({
    kind: 'surface',
    displayName: 'Table Surface',
    coachAliases: Object.freeze(['table', 'table surface']),
    allowedActions: Object.freeze(['PLACE']),
    constraints: Object.freeze({
      PLACE: Object.freeze(['requires_holding_item', 'requires_agent_near_table'])
    })
  }),
  stove: Object.freeze({
    kind: 'container',
    displayName: 'Stove',
    coachAliases: Object.freeze(['stove']),
    allowedActions: Object.freeze(['PLACE', 'COOK']),
    constraints: Object.freeze({
      PLACE: Object.freeze(['requires_holding_item', 'requires_agent_near_stove_zone']),
      COOK: Object.freeze(['requires_agent_near_stove_zone'])
    })
  }),
  fridge_zone: Object.freeze({
    kind: 'zone',
    displayName: 'Fridge Zone',
    coachAliases: Object.freeze(['fridge zone']),
    allowedActions: Object.freeze(['MOVE_TO']),
    constraints: Object.freeze({})
  }),
  table_center: Object.freeze({
    kind: 'zone',
    displayName: 'Table Center',
    coachAliases: Object.freeze(['table center']),
    allowedActions: Object.freeze(['MOVE_TO']),
    constraints: Object.freeze({})
  }),
  stove_zone: Object.freeze({
    kind: 'zone',
    displayName: 'Stove Zone',
    coachAliases: Object.freeze(['stove zone']),
    allowedActions: Object.freeze(['MOVE_TO']),
    constraints: Object.freeze({})
  })
})

const OBJECT_ALIAS_TO_ID = Object.freeze({
  red_cube: 'red_cube',
  'red cube': 'red_cube',
  cube: 'red_cube',
  half_cube_left: 'half_cube_left',
  'half cube left': 'half_cube_left',
  'left half cube': 'half_cube_left',
  half_cube_right: 'half_cube_right',
  'half cube right': 'half_cube_right',
  'right half cube': 'half_cube_right',
  fridge_main: 'fridge_main',
  'fridge main': 'fridge_main',
  fridge: 'fridge_main',
  refrigerator: 'fridge_main',
  fridge_door: 'fridge_door',
  'fridge door': 'fridge_door',
  door: 'fridge_door',
  table_surface: 'table_surface',
  'table surface': 'table_surface',
  table: 'table_surface',
  stove: 'stove',
  fridge_zone: 'fridge_zone',
  'fridge zone': 'fridge_zone',
  table_center: 'table_center',
  'table center': 'table_center',
  stove_zone: 'stove_zone',
  'stove zone': 'stove_zone'
})

const CONSTRAINT_MESSAGES = Object.freeze({
  requires_holding_item: 'must hold an item first',
  requires_empty_hand: 'hands must be empty',
  requires_fridge_door_open: 'fridge door must be open',
  requires_fridge_door_closed: 'fridge door must be closed',
  requires_agent_near_fridge_zone: 'agent must be near fridge_zone',
  requires_agent_near_table: 'agent must be near table_center',
  requires_agent_near_stove_zone: 'agent must be near stove_zone'
})

function normalizeObjectToken(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
}

function normalizeActionToken(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
}

export function resolveObjectRuleId(rawObjectId) {
  const token = normalizeObjectToken(rawObjectId)
  if (!token) return null
  const aliased = OBJECT_ALIAS_TO_ID[token]
  if (aliased) return aliased
  const canonical = token.replace(/\s+/g, '_')
  return OBJECT_RULES_REGISTRY[canonical] ? canonical : null
}

export function getObjectRule(rawObjectId) {
  const objectId = resolveObjectRuleId(rawObjectId)
  return objectId ? OBJECT_RULES_REGISTRY[objectId] : null
}

export function getObjectKind(rawObjectId) {
  const rule = getObjectRule(rawObjectId)
  return rule?.kind || null
}

export function getAllowedObjectActions(rawObjectId) {
  const rule = getObjectRule(rawObjectId)
  return rule?.allowedActions || []
}

export function isObjectActionAllowed(rawObjectId, rawActionType) {
  const actionType = normalizeActionToken(rawActionType)
  if (!actionType) return false
  const allowedActions = getAllowedObjectActions(rawObjectId)
  return allowedActions.includes(actionType)
}

export function getObjectActionConstraints(rawObjectId, rawActionType) {
  const actionType = normalizeActionToken(rawActionType)
  const rule = getObjectRule(rawObjectId)
  if (!rule || !actionType) return []
  return rule.constraints?.[actionType] || []
}

function isConstraintMet(constraint, runtimeContext = {}) {
  const agentState = runtimeContext.agentState || {}
  const holding = Object.prototype.hasOwnProperty.call(runtimeContext, 'holding')
    ? runtimeContext.holding
    : agentState.holding
  const fridgeOpen = Boolean(runtimeContext.fridgeOpen)
  const location = agentState.location || null

  switch (constraint) {
    case 'requires_holding_item':
      return Boolean(holding)
    case 'requires_empty_hand':
      return !holding
    case 'requires_fridge_door_open':
      return fridgeOpen
    case 'requires_fridge_door_closed':
      return !fridgeOpen
    case 'requires_agent_near_fridge_zone':
      return location === 'fridge_zone'
    case 'requires_agent_near_table':
      return location === 'table_center'
    case 'requires_agent_near_stove_zone':
      return location === 'stove_zone'
    default:
      return true
  }
}

export function evaluateObjectActionConstraints(rawObjectId, rawActionType, runtimeContext = {}) {
  const constraints = getObjectActionConstraints(rawObjectId, rawActionType)
  if (constraints.length === 0) {
    return {
      ok: true,
      failed: []
    }
  }

  const failed = constraints
    .filter((constraint) => !isConstraintMet(constraint, runtimeContext))
    .map((constraint) => ({
      key: constraint,
      message: CONSTRAINT_MESSAGES[constraint] || constraint
    }))

  return {
    ok: failed.length === 0,
    failed
  }
}
