import React from 'react'

export const VERDICT_ALLOW = 'ALLOW'
export const VERDICT_BLOCK = 'BLOCK'

function readFlag(valueOrGetter, fallback = false) {
  if (typeof valueOrGetter === 'function') return !!valueOrGetter()
  if (typeof valueOrGetter === 'boolean') return valueOrGetter
  return fallback
}

function readText(valueOrGetter, fallback = null) {
  if (typeof valueOrGetter === 'function') {
    const value = valueOrGetter()
    return value == null ? fallback : String(value)
  }
  if (valueOrGetter == null) return fallback
  return String(valueOrGetter)
}

function toLegacyStatus(verdict, code) {
  if (verdict === VERDICT_ALLOW) return 'SUCCESS'
  return code || 'BLOCKED_PRECONDITION'
}

function makeDecision({ verdict, reason, effects = [], code = null }) {
  const safeVerdict = verdict === VERDICT_ALLOW ? VERDICT_ALLOW : VERDICT_BLOCK
  const safeReason = String(reason || (safeVerdict === VERDICT_ALLOW ? 'Action allowed' : 'Action blocked'))
  const safeEffects = Array.isArray(effects) ? effects : []
  return {
    verdict: safeVerdict,
    reason: safeReason,
    effects: safeEffects,

    // Backward-compatible fields for existing UI code paths.
    handled: safeVerdict === VERDICT_ALLOW,
    status: toLegacyStatus(safeVerdict, code),
    message: safeReason
  }
}

function getObjectState(worldFacts, objectId) {
  const nearby = worldFacts?.nearby_objects || []
  const match = nearby.find((obj) => obj?.id === objectId)
  if (match && match.state != null) return String(match.state)

  const objectFromFacts = worldFacts?.task_facts?.objects?.[objectId]
  if (objectFromFacts?.state != null) return String(objectFromFacts.state)
  return null
}

function getFridgeOpen(worldFacts) {
  return getObjectState(worldFacts, 'fridge_door') === 'open'
}

function getHoldingItem(worldFacts) {
  const directHolding = worldFacts?.agent?.holding
  if (directHolding != null) return String(directHolding)
  const factsHolding = worldFacts?.task_facts?.agent?.holding
  if (factsHolding != null) return String(factsHolding)
  return null
}

export function normalizeRegistryWorldFacts(worldFactsOrContext = {}) {
  if (worldFactsOrContext && Array.isArray(worldFactsOrContext.nearby_objects)) {
    return worldFactsOrContext
  }

  if (worldFactsOrContext?.worldFacts && Array.isArray(worldFactsOrContext.worldFacts.nearby_objects)) {
    return worldFactsOrContext.worldFacts
  }

  const holdingItem = readText(
    worldFactsOrContext.getHoldingItem ?? worldFactsOrContext.holdingItem,
    null
  )
  const fridgeOpen = readFlag(
    worldFactsOrContext.isFridgeOpen ?? worldFactsOrContext.fridgeOpen,
    false
  )

  return {
    agent: {
      location: null,
      holding: holdingItem
    },
    nearby_objects: [
      {
        id: 'fridge_door',
        state: fridgeOpen ? 'open' : 'closed',
        relation: 'front of agent'
      }
    ]
  }
}

class BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const actionType = intent?.type || 'UNKNOWN'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `Action validated: ${actionType}`,
      effects: [{ kind: 'NO_OP', action: actionType }]
    })
  }
}

class MoveHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const poi = intent?.target_poi
    if (!poi) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'MOVE_TO blocked: missing target_poi',
        code: 'INVALID_MOVE'
      })
    }
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `MOVE_TO allowed: ${poi}`,
      effects: [{ kind: 'MOVE_TO', target_poi: poi }]
    })
  }
}

class HoldHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const target = intent?.target_item
    if (!target) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'PICK blocked: missing target_item',
        code: 'INVALID_INTERACT'
      })
    }

    const holdingItem = getHoldingItem(worldFacts)
    if (holdingItem && holdingItem !== String(target)) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: `PICK blocked: already holding ${holdingItem}`
      })
    }

    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `PICK allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'PICK', target_item: target }]
    })
  }
}

class PlaceHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const targetContainer =
      intent?.target_location || intent?.target_item || intent?.target_poi || 'target'
    const holdingItem = getHoldingItem(worldFacts)

    if (!holdingItem) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'PLACE blocked: pick item first'
      })
    }

    if (targetContainer === 'fridge_main' && !getFridgeOpen(worldFacts)) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'PLACE blocked: open fridge door first'
      })
    }

    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `PLACE allowed: ${holdingItem} -> ${targetContainer}`,
      effects: [
        {
          kind: 'INTERACT',
          interaction_type: 'PLACE',
          source_item: holdingItem,
          target_location: targetContainer,
          target_item: intent?.target_item || targetContainer
        }
      ]
    })
  }
}

class OpenHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const target = intent?.target_item || 'target_item'
    if (target === 'fridge_door' && getFridgeOpen(worldFacts)) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'OPEN blocked: fridge door is already open'
      })
    }
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `OPEN allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'OPEN', target_item: target }]
    })
  }
}

class CloseHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const target = intent?.target_item || 'target_item'

    if (target === 'fridge_door' && !getFridgeOpen(worldFacts)) {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: 'CLOSE blocked: fridge door is already closed'
      })
    }

    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `CLOSE allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'CLOSE', target_item: target }]
    })
  }
}

class ToggleHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const target = intent?.target_item || 'target_item'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `TOGGLE allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'TOGGLE', target_item: target }]
    })
  }
}

class SliceHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const target = intent?.target_item || 'target_item'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `SLICE allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'SLICE', target_item: target }]
    })
  }
}

class CookHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const target = intent?.target_item || 'target_item'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `COOK allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'COOK', target_item: target }]
    })
  }
}

class ExplainHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const text = intent?.content || 'No explanation content'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `EXPLAIN allowed: ${text}`,
      effects: [{ kind: 'EXPLAIN', content: text }]
    })
  }
}

class FinishHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const text = intent?.content || 'Task finished'
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `FINISH allowed: ${text}`,
      effects: [{ kind: 'FINISH', content: text }]
    })
  }
}

class InteractFallbackHandler extends BaseActionHandler {
  run(intent, worldFacts = {}) {
    const _ = worldFacts
    const interactionType = String(intent?.interaction_type || 'NONE').toUpperCase()
    const target = intent?.target_item || intent?.target_poi || 'target'
    if (interactionType !== 'NONE') {
      return makeDecision({
        verdict: VERDICT_BLOCK,
        reason: `No handler for INTERACT(${interactionType}) -> ${target}`,
        code: 'NO_HANDLER'
      })
    }
    return makeDecision({
      verdict: VERDICT_ALLOW,
      reason: `INTERACT allowed: ${target}`,
      effects: [{ kind: 'INTERACT', interaction_type: 'NONE', target_item: target }]
    })
  }
}

const holdHandler = new HoldHandler()
const explainHandler = new ExplainHandler()
const fallbackInteractHandler = new InteractFallbackHandler()

export const ACTION_REGISTRY = {
  PICK: holdHandler,
  HOLD: holdHandler,
  PLACE: new PlaceHandler(),
  OPEN: new OpenHandler(),
  CLOSE: new CloseHandler(),
  TOGGLE: new ToggleHandler(),
  SLICE: new SliceHandler(),
  COOK: new CookHandler(),
  MOVE_TO: new MoveHandler(),
  EXPLAIN: explainHandler,
  FINISH: new FinishHandler(),
  INTERACT: fallbackInteractHandler
}

export function resolveActionKey(intent) {
  if (!intent || !intent.type) return null

  const actionType = String(intent.type).toUpperCase()
  if (actionType === 'INTERACT') {
    const interactionType = String(intent.interaction_type || 'INTERACT').toUpperCase()
    return ACTION_REGISTRY[interactionType] ? interactionType : 'INTERACT'
  }
  if (
    actionType === 'THINK' ||
    actionType === 'SPEAK' ||
    actionType === 'IDLE' ||
    actionType === 'ADJUST_DIFFICULTY' ||
    actionType === 'AUTO_PASS'
  ) {
    return 'EXPLAIN'
  }
  return actionType
}

export function executeRegisteredAction(intent, worldFactsOrContext = {}) {
  if (!intent || !intent.type) {
    return makeDecision({
      verdict: VERDICT_BLOCK,
      reason: 'No intent to validate',
      code: 'NO_INTENT'
    })
  }

  const actionKey = resolveActionKey(intent)
  const handler = ACTION_REGISTRY[actionKey]
  if (!handler) {
    return makeDecision({
      verdict: VERDICT_BLOCK,
      reason: `No handler for action key: ${actionKey}`,
      code: 'NO_HANDLER'
    })
  }

  const worldFacts = normalizeRegistryWorldFacts(worldFactsOrContext)
  const result = handler.run(intent, worldFacts)
  if (result?.verdict) return result

  // Safety net for malformed custom handlers.
  return makeDecision({
    verdict: result?.handled ? VERDICT_ALLOW : VERDICT_BLOCK,
    reason: result?.message || 'Handler returned legacy result',
    effects: result?.effects || []
  })
}

export function isActionAllowed(result) {
  if (!result || typeof result !== 'object') return false
  if (result.verdict) return result.verdict === VERDICT_ALLOW
  return !!(result.handled && result.status === 'SUCCESS')
}

export function ActionTriggerBubble({ bubble }) {
  if (!bubble?.visible) return null

  const isSuccess = bubble.verdict
    ? bubble.verdict === VERDICT_ALLOW
    : bubble.status === 'SUCCESS'
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
      <div
        className={[
          'px-4 py-2 rounded-full text-sm font-semibold shadow-xl border backdrop-blur-sm',
          isSuccess
            ? 'bg-emerald-500/90 border-emerald-200 text-white'
            : 'bg-amber-500/90 border-amber-200 text-white'
        ].join(' ')}
      >
        {bubble.message}
      </div>
    </div>
  )
}

