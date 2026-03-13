import React from 'react'

export function CandyTabletPanel({ className = '' }) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[36px] border-[2px] ${className}`}
      style={{
        backgroundColor: '#f3eee5',
        borderColor: '#e8e0d5',
        boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.12), inset 0 3px 6px rgba(255, 255, 255, 0.9)'
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox="0 0 700 450"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <g id="tabletStar" transform="scale(1)">
            <path
              d="M 0 -14 L 4 -4 L 14 -3 L 6 4 L 8 14 L 0 8 L -8 14 L -6 4 L -14 -3 L -4 -4 Z"
              fill="#f6dd9f"
              stroke="#f1cf7a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
          <g id="tabletShell">
            <path
              d="M 0 22 C 6 6, 16 -6, 30 -8 C 44 -6, 54 6, 60 22 Z"
              fill="#f2c2bc"
              opacity="0.95"
            />
            <path d="M 30 -8 L 30 22" stroke="#e7a7a0" strokeWidth="2" strokeLinecap="round" />
            <path d="M 20 -6 L 16 22" stroke="#e7a7a0" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 40 -6 L 44 22" stroke="#e7a7a0" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 10 -2 L 6 22" stroke="#e7a7a0" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 50 -2 L 54 22" stroke="#e7a7a0" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </defs>

        <circle cx="630" cy="70" r="190" fill="#ebe0ca" opacity="0.9" />
        <circle cx="88" cy="395" r="190" fill="#dce6df" opacity="0.9" />
        <circle cx="640" cy="390" r="120" fill="#efe7d7" opacity="0.75" />

        <path
          d="M 36 95 C 120 40, 210 38, 298 84"
          fill="none"
          stroke="#e9dcc5"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M 435 374 C 525 332, 612 332, 674 360"
          fill="none"
          stroke="#d6e2d9"
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.95"
        />

        <use href="#tabletShell" x="72" y="300" transform="rotate(-14 102 314)" opacity="0.92" />
        <use href="#tabletShell" x="566" y="72" transform="rotate(16 596 86) scale(0.88)" opacity="0.9" />

        <use href="#tabletStar" x="558" y="330" transform="rotate(-12 558 330) scale(0.95)" />
        <use href="#tabletStar" x="126" y="112" transform="rotate(14 126 112) scale(0.8)" />
        <use href="#tabletStar" x="620" y="188" transform="rotate(4 620 188) scale(0.65)" />

        <circle cx="540" cy="360" r="14" fill="#de9a95" opacity="0.8" />
        <circle cx="578" cy="356" r="8" fill="#de9a95" opacity="0.7" />
        <circle cx="110" cy="82" r="12" fill="#9fb39a" opacity="0.75" />
        <circle cx="144" cy="78" r="7" fill="#e8d9ac" opacity="0.85" />
      </svg>
    </div>
  )
}
