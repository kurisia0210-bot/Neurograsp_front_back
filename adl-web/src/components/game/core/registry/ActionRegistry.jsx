import { normalizeBackendIntent } from '../ActionContract'

// Registry is routing metadata only. Validation/preconditions belong to world execution.
export const ACTION_REGISTRY = Object.freeze({
  PICK: 'PICK',
  HOLD: 'HOLD',
  PLACE: 'PLACE',
  OPEN: 'OPEN',
  CLOSE: 'CLOSE',
  TOGGLE: 'TOGGLE',
  SLICE: 'SLICE',
  COOK: 'COOK',
  MOVE_TO: 'MOVE_TO',
  EXPLAIN: 'EXPLAIN',
  FINISH: 'FINISH',
  INTERACT: 'INTERACT'
})

export function resolveActionKey(intent) {
  if (!intent || !intent.type) return null

  const normalizedIntent = normalizeBackendIntent(intent)
  const actionType = String(normalizedIntent.type).toUpperCase()
  if (actionType === 'INTERACT') {
    const interactionType = String(normalizedIntent.interaction_type || 'INTERACT').toUpperCase()
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
  return ACTION_REGISTRY[actionType] || null
}

export function resolveRegisteredAction(intent) {
  if (!intent || !intent.type) {
    return {
      handled: false,
      status: 'NO_INTENT',
      message: 'No intent to resolve',
      actionKey: null,
      intent: null
    }
  }

  const normalizedIntent = normalizeBackendIntent(intent)
  const actionKey = resolveActionKey(normalizedIntent)
  if (!actionKey) {
    return {
      handled: false,
      status: 'NO_HANDLER',
      message: `No handler for action type: ${normalizedIntent.type}`,
      actionKey: null,
      intent: normalizedIntent
    }
  }

  return {
    handled: true,
    status: 'RESOLVED',
    message: `Resolved action: ${actionKey}`,
    actionKey,
    intent: normalizedIntent
  }
}

