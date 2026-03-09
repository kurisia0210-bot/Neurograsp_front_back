import React from 'react'

export function OutsideWindowSceneBackground({
  className = 'inset-0 z-0 bg-[#d8dcd6]',
  sceneInsetClassName = 'absolute inset-[-8%]'
}) {
  return (
    <div className={`absolute overflow-hidden pointer-events-none ${className}`}>
      <div
        className={sceneInsetClassName}
        style={{
          transform: 'scaleX(0.85) skewY(15deg)',
          transformOrigin: 'center',
          filter: 'drop-shadow(-10px 15px 15px rgba(0,0,0,0.1))'
        }}
      >
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id="outsideSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          </defs>

          <rect width="1200" height="800" fill="url(#outsideSkyGrad)" />

          <circle cx="800" cy="300" r="80" fill="#ffffff" opacity="0.8" />
          <circle cx="800" cy="300" r="40" fill="#ffffff" />

          <path d="M 200 250 Q 230 220 270 250 Q 320 230 340 270 Q 370 270 360 300 L 180 300 Q 160 270 200 250 Z" fill="#ffffff" opacity="0.6" />
          <path d="M -100 800 L -100 450 Q 150 350 400 480 T 900 400 L 1300 550 L 1300 800 Z" fill="#93c5fd" opacity="0.8" />

          <path d="M -100 800 L -100 550 Q 200 450 500 600 T 1300 500 L 1300 800 Z" fill="#6ee7b7" />
          <path d="M -100 800 L -100 650 Q 300 700 600 550 T 1300 650 L 1300 800 Z" fill="#34d399" opacity="0.9" />

          <path d="M -100 800 L -100 700 Q 400 600 800 750 T 1300 700 L 1300 800 Z" fill="#10b981" />

          <g transform="translate(150, 650)">
            <rect x="-10" y="-80" width="20" height="80" fill="#78350f" rx="5" />
            <circle cx="0" cy="-80" r="50" fill="#059669" />
            <circle cx="-30" cy="-60" r="40" fill="#047857" />
            <circle cx="30" cy="-50" r="35" fill="#059669" />
          </g>

          <g transform="translate(1000, 680) scale(1.2)">
            <rect x="-15" y="-100" width="30" height="100" fill="#78350f" rx="5" />
            <circle cx="0" cy="-100" r="60" fill="#047857" />
            <circle cx="-40" cy="-80" r="45" fill="#065f46" />
            <circle cx="40" cy="-70" r="50" fill="#059669" />
          </g>
        </svg>
      </div>
    </div>
  )
}