import React from 'react'

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
    const _ = context
    const poi = intent?.target_poi || 'target_poi'
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
    const _ = context
    const target = intent?.target_item || intent?.target_poi || 'target'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `PLACE triggered: ${target}`
    }
  }
}

class OpenHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const target = intent?.target_item || 'target_item'
    return {
      handled: true,
      status: 'SUCCESS',
      message: `OPEN triggered: ${target}`
    }
  }
}

class CloseHandler extends BaseActionHandler {
  run(intent, context = {}) {
    const _ = context
    const target = intent?.target_item || 'target_item'
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

export function executeRegisteredAction(intent, context = {}) {
  if (!intent || !intent.type) {
    return {
      handled: false,
      status: 'NO_INTENT',
      message: 'No intent to trigger'
    }
  }

  const actionKey = resolveActionKey(intent)
  const handler = ACTION_REGISTRY[actionKey]
  if (!handler) {
    return {
      handled: false,
      status: 'NO_HANDLER',
      message: `No handler for action key: ${actionKey}`
    }
  }

  return handler.run(intent, context)
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
