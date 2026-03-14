import {
  ITEM_NAMES as SHARED_ITEM_NAMES,
  POI_NAMES as SHARED_POI_NAMES,
  ITEM_ALIAS as SHARED_ITEM_ALIAS,
  POI_ALIAS as SHARED_POI_ALIAS
} from './domainVocabulary'

export const ActionType = Object.freeze({
  MOVE_TO: 'MOVE_TO',
  INTERACT: 'INTERACT',
  THINK: 'THINK',
  SPEAK: 'SPEAK',
  IDLE: 'IDLE',
  FINISH: 'FINISH',
  ADJUST_DIFFICULTY: 'ADJUST_DIFFICULTY',
  AUTO_PASS: 'AUTO_PASS'
})

export const InteractionType = Object.freeze({
  PICK: 'PICK',
  PLACE: 'PLACE',
  SLICE: 'SLICE',
  COOK: 'COOK',
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  TOGGLE: 'TOGGLE',
  NONE: 'NONE'
})

export const ACTION_TYPES = Object.freeze(Object.values(ActionType))
export const INTERACTION_TYPES = Object.freeze(Object.values(InteractionType))

export const CANONICAL_ACTION_FIELDS = Object.freeze({
  MOVE_TO: Object.freeze(['type', 'target_poi']),
  INTERACT: Object.freeze(['type', 'interaction_type', 'target_item'])
})

export const ITEM_NAMES = SHARED_ITEM_NAMES
export const POI_NAMES = SHARED_POI_NAMES

const ACTION_SET = new Set(ACTION_TYPES)
const INTERACTION_SET = new Set(INTERACTION_TYPES)
const ITEM_SET = new Set(ITEM_NAMES)
const POI_SET = new Set(POI_NAMES)

const INTERACTION_ACTION_ALIAS = Object.freeze({
  PICK: 'PICK',
  HOLD: 'PICK',
  PLACE: 'PLACE',
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  TOGGLE: 'TOGGLE',
  SLICE: 'SLICE',
  COOK: 'COOK'
})

const ITEM_ALIAS = SHARED_ITEM_ALIAS
const POI_ALIAS = SHARED_POI_ALIAS

function normalizeText(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
}

function normalizeType(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
}

function stripLegacyFields(intent) {
  const { target_location: _legacyTargetLocation, ...rest } = intent || {}
  return rest
}

function fallbackThink(intent, reason) {
  const baseIntent = stripLegacyFields(intent)
  return {
    ...baseIntent,
    type: 'THINK',
    target_poi: null,
    target_item: null,
    interaction_type: 'NONE',
    content: reason || 'Unsupported intent payload.'
  }
}

export function normalizeItemName(raw) {
  const token = normalizeText(raw)
  if (!token) return null
  const mapped = ITEM_ALIAS[token] || token.replace(/\s+/g, '_')
  return ITEM_SET.has(mapped) ? mapped : null
}

export function normalizePoiName(raw) {
  const token = normalizeText(raw)
  if (!token) return null
  const mapped = POI_ALIAS[token] || token.replace(/\s+/g, '_')
  return POI_SET.has(mapped) ? mapped : null
}

export function normalizeInteractionType(raw) {
  const upper = normalizeType(raw)
  if (INTERACTION_SET.has(upper)) return upper
  return 'NONE'
}

export function normalizeBackendIntent(intent) {
  if (!intent || typeof intent !== 'object') {
    return fallbackThink({}, 'Invalid intent payload: empty or non-object.')
  }
  const baseIntent = stripLegacyFields(intent)

  const rawType = normalizeType(intent.type)
  let actionType = rawType
  let interactionType = normalizeInteractionType(intent.interaction_type)

  if (INTERACTION_ACTION_ALIAS[actionType]) {
    actionType = 'INTERACT'
    interactionType = INTERACTION_ACTION_ALIAS[rawType]
  }

  if (!ACTION_SET.has(actionType)) {
    return fallbackThink(intent, `Unsupported action type: ${intent.type}`)
  }

  if (actionType === 'MOVE_TO') {
    const poi = normalizePoiName(intent.target_poi)
    if (!poi) {
      return fallbackThink(intent, 'MOVE_TO requires a valid target_poi.')
    }
    return {
      ...baseIntent,
      type: 'MOVE_TO',
      target_poi: poi,
      target_item: null,
      interaction_type: 'NONE'
    }
  }

  if (actionType === 'INTERACT') {
    const rawTarget = intent.target_item ?? intent.target_location ?? intent.target_poi
    let targetItem = normalizeItemName(rawTarget)

    if (interactionType === 'OPEN' || interactionType === 'CLOSE') {
      if (targetItem === 'fridge_main') {
        targetItem = 'fridge_door'
      }
      if (targetItem === 'oven') {
        targetItem = 'oven_door'
      }
    }

    if (interactionType !== 'NONE' && !targetItem) {
      return fallbackThink(intent, `INTERACT(${interactionType}) requires a valid target_item.`)
    }

    return {
      ...baseIntent,
      type: 'INTERACT',
      interaction_type: interactionType,
      target_item: targetItem,
      target_poi: null
    }
  }

  return {
    ...baseIntent,
    type: actionType,
    interaction_type: 'NONE'
  }
}
