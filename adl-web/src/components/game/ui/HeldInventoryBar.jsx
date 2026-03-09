import React, { useState } from 'react'

export function HeldInventoryBar({ items = [], maxSlots = 5, activeIndex, onActiveChange }) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(0)
  const currentActiveIndex = typeof activeIndex === 'number' ? activeIndex : internalActiveIndex

  const slots = Array.from({ length: maxSlots }, (_, index) => items[index] || null)

  const handleSlotClick = (index) => {
    if (typeof onActiveChange === 'function') {
      onActiveChange(index)
      return
    }
    setInternalActiveIndex(index)
  }

  return (
    <div
      className="flex gap-3 px-5 py-4 rounded-[32px] border-4 border-[#2ba68e] shadow-[0_8px_0_#2ba68e,0_15px_25px_rgba(0,0,0,0.15)]"
      style={{
        backgroundColor: '#4cd1b6',
        backgroundImage:
          'radial-gradient(circle at 8% 25%, #ff99c8 4px, transparent 5px), radial-gradient(circle at 92% 75%, #ffd166 5px, transparent 6px), radial-gradient(circle at 85% 18%, #fdf5c9 3px, transparent 4px), radial-gradient(circle at 15% 80%, #cdb4db 4px, transparent 5px), repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(253,245,201,0.35) 30px, rgba(253,245,201,0.35) 60px)'
      }}
    >
      {slots.map((item, index) => {
        const isFilled = Boolean(item)
        const isActive = currentActiveIndex === index

        const baseClass =
          'w-[72px] h-[72px] rounded-[20px] flex items-center justify-center transition-all duration-200'
        const filledClass = isFilled
          ? 'bg-white border-[3px] border-[#ffd166] shadow-[0_4px_0_#ffd166]'
          : 'bg-[#fdf5c9] border-[3px] border-dashed border-[#ff99c8] shadow-[inset_0_4px_8px_rgba(255,153,200,0.25)]'
        const activeClass = isActive
          ? 'translate-y-[-8px] bg-[#fff0f5] border-[#ff99c8] shadow-[0_8px_0_#ff99c8,0_12px_18px_rgba(255,153,200,0.35)]'
          : ''

        return (
          <button
            key={`inventory-slot-${index}`}
            type="button"
            onClick={() => handleSlotClick(index)}
            className={`${baseClass} ${filledClass} ${activeClass}`}
          >
            {isFilled ? (
              <span className="px-1 text-[11px] font-bold leading-tight text-center text-slate-700 break-all">
                {item.label || item.id || 'item'}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
