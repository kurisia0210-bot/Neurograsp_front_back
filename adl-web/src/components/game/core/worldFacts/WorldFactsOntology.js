// World Facts Ontology
// This file defines shared constants and small helper functions.
// Keep it simple: no game logic here.
// 世界事实本体
// 此文件定义共享常量和小型辅助函数。
// 保持简单：不包含游戏逻辑。

// Version of the World Facts snapshot format.
// 世界事实快照格式的版本号。
export const WORLD_FACTS_VERSION = 2

// Stable IDs for built-in entities.
// 内置实体的稳定ID。
export const WORLD_FACT_ENTITY_IDS = Object.freeze({
  AGENT: 'agent',           // 智能体（玩家/角色）
  FRIDGE_MAIN: 'fridge_main', // 冰箱主体
  FRIDGE_DOOR: 'fridge_door', // 冰箱门
  TABLE_SURFACE: 'table_surface' // 桌面
})

// Default values used when agent data is missing.
// 当智能体数据缺失时使用的默认值。
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
