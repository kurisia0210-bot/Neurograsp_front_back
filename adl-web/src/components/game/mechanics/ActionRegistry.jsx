import React from 'react'
import { normalizeBackendIntent } from '../core/ActionContract'

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

class BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const actionType = intent?.type || 'UNKNOWN'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `Action handler triggered: ${actionType}`
    }
  }
}

class MoveHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const poi = intent?.target_poi
    if (!poi) {
      return {
        handled: false,
        status: 'INVALID_MOVE',
        message: 'MOVE_TO missing target_poi'
      }
    }
    if (typeof context.onMove === 'function') {
      context.onMove(poi, intent)
    }
    return {
      handled: true,
      status: 'SUCCESS',
      message: `MOVE_TO triggered: ${poi}`
    }
  }
}

class HoldHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const target = intent?.target_item || 'target_item'
    if (typeof context.onHold === 'function') {
      context.onHold(target, intent)
    }
    return {
      handled: true,
      status: 'SUCCESS',
      message: `HOLD triggered: ${target}`
    }
  }
}

class PlaceHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const targetContainer =
      intent?.target_location || intent?.target_item || intent?.target_poi || 'target'
    const holdingItem = readText(context.getHoldingItem ?? context.holdingItem, null)
    const fridgeOpen = readFlag(context.isFridgeOpen ?? context.fridgeOpen, false)

    if (!holdingItem) {
      return {
        handled: false,
        status: 'BLOCKED_PRECONDITION',
        message: 'PLACE blocked: pick item first'
      }
    }

    if (targetContainer === 'fridge_main' && !fridgeOpen) {
      return {
        handled: false,
        status: 'BLOCKED_PRECONDITION',
        message: 'PLACE blocked: open fridge door first'
      }
    }

    if (typeof context.onPlace === 'function') {
      context.onPlace(holdingItem, targetContainer, intent)
    }

    return {
      handled: true,
      status: 'SUCCESS',
      message: `PLACE triggered: ${holdingItem} -> ${targetContainer}`
    }
  }
}

class OpenHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const target = intent?.target_item || 'target_item'
    if (typeof context.onOpen === 'function') {
      context.onOpen(target, intent)
    }
    return {
      handled: true,
      status: 'SUCCESS',
      message: `OPEN triggered: ${target}`
    }
  }
}

class CloseHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const target = intent?.target_item || 'target_item'

    if (target === 'fridge_door') {
      const fridgeOpen = readFlag(context.isFridgeOpen ?? context.fridgeOpen, false)
      if (!fridgeOpen) {
        return {
          handled: false,
          status: 'BLOCKED_PRECONDITION',
          message: 'CLOSE blocked: fridge door is already closed'
        }
      }
    }

    if (typeof context.onClose === 'function') {
      context.onClose(target, intent)
    }

    return {
      handled: true,
      status: 'SUCCESS',
      message: `CLOSE triggered: ${target}`
    }
  }
}

class ToggleHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const target = intent?.target_item || 'target_item'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `TOGGLE triggered: ${target}`
    }
  }
}

class SliceHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const target = intent?.target_item || 'target_item'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `SLICE triggered: ${target}`
    }
  }
}

class CookHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const target = intent?.target_item || 'target_item'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `COOK triggered: ${target}`
    }
  }
}

class ExplainHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const text = intent?.content || 'No explanation content'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `EXPLAIN: ${text}`
    }
  }
}

class FinishHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const text = intent?.content || 'Task finished'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `FINISH: ${text}`
    }
  }
}

class InteractFallbackHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const interactionType = String(intent?.interaction_type || 'NONE').toUpperCase()
    const target = intent?.target_item || intent?.target_poi || 'target'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `INTERACT(${interactionType}) -> ${target}`
    }
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
  return actionType
}

export function executeRegisteredAction(intent, context = {}) {
  if (!intent || !intent.type) {
    return {
      handled: false,
      status: 'NO_INTENT',
      message: 'No intent to trigger'
    }
  }

  const normalizedIntent = normalizeBackendIntent(intent)
  const actionKey = resolveActionKey(normalizedIntent)
  const handler = ACTION_REGISTRY[actionKey]
  if (!handler) {
    return {
      handled: false,
      status: 'NO_HANDLER',
      message: `No handler for action key: ${actionKey}`
    }
  }

  if (normalizedIntent.type === 'THINK' && String(intent.type || '').toUpperCase() !== 'THINK') {
    return {
      handled: false,
      status: 'INVALID_INTENT',
      message: normalizedIntent.content || 'Invalid intent payload'
    }
  }

  return handler.run(normalizedIntent, context)
}

export function ActionTriggerBubble({ bubble }) {
  if (!bubble?.visible) return null

  const isSuccess = bubble.status === 'SUCCESS'
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
