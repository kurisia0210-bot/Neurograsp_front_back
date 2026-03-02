import React from 'react'

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

