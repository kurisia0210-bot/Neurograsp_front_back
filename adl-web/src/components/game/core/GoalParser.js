/**
 * 目标解析器 - 从自然语言指令解析为结构化目标
 */

// 别名映射常量
export const POI_ALIAS = {
  table: 'table_center',
  table_center: 'table_center',
  fridge: 'fridge_zone',
  fridge_zone: 'fridge_zone',
  stove: 'stove_zone',
  stove_zone: 'stove_zone'
}

export const ITEM_ALIAS = {
  'red cube': 'red_cube',
  red_cube: 'red_cube',
  cube: 'red_cube',
  'fridge door': 'fridge_door',
  fridge_door: 'fridge_door',
  door: 'fridge_door',
  fridge: 'fridge_main',
  fridge_main: 'fridge_main',
  table: 'table_surface',
  table_surface: 'table_surface',
  stove: 'stove'
}

export const CONTAINER_ALIAS = {
  fridge: 'fridge_main',
  refrigerator: 'fridge_main',
  fridge_main: 'fridge_main',
  table: 'table_surface',
  table_surface: 'table_surface',
  stove: 'stove'
}

/**
 * 标准化令牌
 * @param {string} raw - 原始字符串
 * @param {boolean} keepSpace - 是否保留空格
 * @returns {string} 标准化后的字符串
 */
export function normalizeToken(raw, keepSpace = false) {
  const safe = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9_ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return keepSpace ? safe : safe.replace(/ /g, '_')
}

/**
 * 标准化POI（兴趣点）
 */
export function normalizePoi(raw) {
  const key = normalizeToken(raw)
  return POI_ALIAS[key] || null
}

/**
 * 标准化物品
 */
export function normalizeItem(raw) {
  const key = normalizeToken(raw, true)
  const mapped = ITEM_ALIAS[key] || null
  return mapped
}

/**
 * 标准化容器
 */
export function normalizeContainer(raw) {
  const key = normalizeToken(raw, true)
  const mapped = CONTAINER_ALIAS[key] || null
  return mapped
}

/**
 * For open/close semantics, plain "fridge" should map to the door.
 * Keep this context-specific so PUT_IN still uses fridge_main.
 */
export function normalizeOpenableItem(raw) {
  const item = normalizeItem(raw)
  if (item === 'fridge_main') return 'fridge_door'
  return item
}

/**
 * 从自然语言指令构建目标规范
 * @param {string} task - 自然语言任务描述
 * @returns {object|null} 目标规范对象
 */
export function buildGoalSpecFromInstruction(task) {
  const text = String(task || '').trim()
  if (!text) return null
  const low = text.toLowerCase()

  // 1. 检查是否是DSL原始格式
  if (low.includes('(') && low.includes(')')) {
    return {
      goal_type: 'DSL_RAW',
      goal_id: 'DSL_RAW',
      dsl: text,
      params: {}
    }
  }

  // 2. 匹配 "open X then put Y in Z" 模式
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

  // 3. 匹配 "open X" 模式
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

  // 4. 匹配 "close X" 模式
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

  // 5. 匹配 "pick/hold/grab X" 模式
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

  // 6. 匹配 "move/go/walk/mv to X" 模式
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

  // 7. 匹配 "put/place X in/into Y" 模式
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

/**
 * 解析指令并返回目标规范
 * @param {string} instruction - 用户指令
 * @param {object} agentState - Agent当前状态
 * @param {object} worldState - 世界状态
 * @returns {object|null} 目标规范
 */
export function resolveGoalSpec(instruction, agentState, worldState) {
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
