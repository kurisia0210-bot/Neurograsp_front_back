// ==========================================
// World Facts Ontology (世界事实本体领域模型)
// Architecture Role: Domain Dictionary & Constants
// 架构角色：物理世界的“宪法与字典”。这里没有任何业务逻辑，
// 只定义绝对的真理（常量）和最基础的数据清洗规则，防止“魔法字符串”引发的幻觉。
// ==========================================

// Version of the World Facts snapshot format.
// 世界事实快照格式的版本号（用于前后端数据契约版本控制）。
export const WORLD_FACTS_VERSION = 2

// Stable IDs for built-in entities.
// 内置实体的绝对稳定ID。大模型和物理引擎交互时，必须严格使用这些ID。
export const WORLD_FACT_ENTITY_IDS = Object.freeze({
  AGENT: 'agent',           // 智能体（玩家/角色）
  FRIDGE_MAIN: 'fridge_main', // 冰箱主体
  FRIDGE_DOOR: 'fridge_door', // 冰箱门
  TABLE_SURFACE: 'table_surface' // 桌面
})


// Normalize agent input so downstream code always gets the same shape.
// 规范化输入（防腐层）：确保进入流水线的 Agent 状态始终具有标准的数据结构。
export const DEFAULT_AGENT_FACT = Object.freeze({
  location: 'table_center', // 默认位置：桌子中心
  holding: null             // 默认手持物品：无
})

// True if value is [x, y, z] and all numbers are finite.
// 判断值是否为有效的三维坐标 [x, y, z]，且所有数字都是有限值。
export function isPositionTriplet(value) {
  return Array.isArray(value) && value.length === 3 && value.every((n) => Number.isFinite(n))
}

// Normalize agent input so downstream code always gets the same shape.
// 规范化智能体输入，确保下游代码始终获得相同的数据结构。
export function normalizeAgentFact(rawAgent = {}) {
  const safe = rawAgent || {}
  return {
    location: safe.location || DEFAULT_AGENT_FACT.location,
    holding: Object.prototype.hasOwnProperty.call(safe, 'holding')
      ? safe.holding
      : DEFAULT_AGENT_FACT.holding
  }
}

// Helper to build one relation object.
// 辅助函数：构建一个关系对象。
export function createRelation(subject, predicate, object) {
  return { subject, predicate, object }
}
