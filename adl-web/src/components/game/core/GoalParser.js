import { POI_ALIAS, ITEM_ALIAS, CONTAINER_ALIAS } from './domainVocabulary'

export { POI_ALIAS, ITEM_ALIAS, CONTAINER_ALIAS }

export function normalizeToken(raw, keepSpace = false) {
  const safe = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return keepSpace ? safe : safe.replace(/ /g, '_')
}

export function normalizePoi(raw) {
  const key = normalizeToken(raw)
  return POI_ALIAS[key] || null
}

export function normalizeItem(raw) {
  const key = normalizeToken(raw, true)
  return ITEM_ALIAS[key] || null
}

export function normalizeContainer(raw) {
  const key = normalizeToken(raw, true)
  return CONTAINER_ALIAS[key] || null
}

export function normalizeOpenableItem(raw) {
  const item = normalizeItem(raw)
  if (item === 'fridge_main') return 'fridge_door'
  return item
}

export function buildGoalSpecFromInstruction(task) {
  const text = String(task || '').trim()
  if (!text) return null
  const low = text.toLowerCase()

  if (low.includes('(') && low.includes(')')) {
    return {
      goal_type: 'DSL_RAW',
      goal_id: 'DSL_RAW',
      dsl: text,
      params: {}
    }
  }

  const openThenPut = low.match(/open\s+([a-z_ ]+?)\s+then\s+(?:put|place)\s+([a-z_ ]+?)\s+(?:in|into)\s+([a-z_ ]+)/)
  if (openThenPut) {
    const door = normalizeOpenableItem(openThenPut[1])
    const item = normalizeItem(openThenPut[2])
    const container = normalizeContainer(openThenPut[3])
    if (door && item && container) {
      return {
        goal_type: 'OPEN_THEN_PUT_IN',
        goal_id: `OPEN_THEN_PUT_IN:${door}:${item}:${container}`,
        dsl: `THEN([open(${door}), inside(${item}, ${container})])`,
        params: { door, item, container }
      }
    }
  }

  const openMatch = low.match(/^\s*open\s+([a-z_ ]+)\s*$/)
  if (openMatch) {
    const item = normalizeOpenableItem(openMatch[1])
    if (item) {
      return {
        goal_type: 'OPEN',
        goal_id: `OPEN:${item}`,
        dsl: `open(${item})`,
        params: { item }
      }
    }
  }

  const closeMatch = low.match(/^\s*close\s+([a-z_ ]+)\s*$/)
  if (closeMatch) {
    const item = normalizeOpenableItem(closeMatch[1])
    if (item) {
      return {
        goal_type: 'CLOSE',
        goal_id: `CLOSE:${item}`,
        dsl: `closed(${item})`,
        params: { item }
      }
    }
  }

  const pickMatch = low.match(/(?:pick|hold|grab)\s+([a-z_ ]+)/)
  if (pickMatch) {
    const item = normalizeItem(pickMatch[1])
    if (item) {
      return {
        goal_type: 'DSL_RAW',
        goal_id: `HOLD:${item}`,
        dsl: `holding(agent, ${item})`,
        params: { item }
      }
    }
  }

  const moveMatch = low.match(/(?:move|go|walk|mv)\s*(?:to)?\s+([a-z_ ]+)/)
  if (moveMatch) {
    const poi = normalizePoi(moveMatch[1])
    if (poi) {
      return {
        goal_type: 'MOVE_TO',
        goal_id: `MOVE_TO:${poi}`,
        dsl: `at(agent, ${poi})`,
        params: { poi }
      }
    }
  }

  const putMatch = low.match(/(?:put|place)\s+([a-z_ ]+?)\s+(?:in|into)\s+([a-z_ ]+)/)
  if (putMatch) {
    const item = normalizeItem(putMatch[1])
    const container = normalizeContainer(putMatch[2])
    if (item && container) {
      return {
        goal_type: 'PUT_IN',
        goal_id: `PUT_IN:${item}:${container}`,
        dsl: `inside(${item}, ${container})`,
        params: { item, container }
      }
    }
  }

  return null
}

export function resolveGoalSpec(instruction, agentState, worldState) {
  const _ = agentState
  const __ = worldState
  return buildGoalSpecFromInstruction(instruction)
}

export default {
  POI_ALIAS,
  ITEM_ALIAS,
  CONTAINER_ALIAS,
  normalizeToken,
  normalizePoi,
  normalizeItem,
  normalizeContainer,
  normalizeOpenableItem,
  buildGoalSpecFromInstruction,
  resolveGoalSpec
}

