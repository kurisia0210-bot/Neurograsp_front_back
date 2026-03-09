import React from 'react'

export function CandyTabletPanel({ className = '' }) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-[24px] ${className}`}
      style={{ backgroundColor: '#45d6b5' }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 700 450"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <g id="candyStar">
            <path
              d="M 0 -15 L 4.5 -4.5 L 15 -3.5 L 7 4 L 9.5 15 L 0 9 L -9.5 15 L -7 4 L -15 -3.5 L -4.5 -4.5 Z"
              fill="#fdf2c8"
              stroke="#fdf2c8"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
          <g id="candyStarPink">
            <path
              d="M 0 -12 L 3.5 -3.5 L 12 -3 L 6 3.5 L 7.5 12 L 0 7.5 L -7.5 12 L -6 3.5 L -12 -3 L -3.5 -3.5 Z"
              fill="#ffa1d4"
              stroke="#ffa1d4"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        </defs>

        <g transform="rotate(-30, 350, 225)">
          <line x1="-150" y1="280" x2="400" y2="280" stroke="#ffa1d4" strokeWidth="28" strokeLinecap="round" />
          <circle cx="460" cy="280" r="14" fill="#ffa1d4" />
          <circle cx="505" cy="280" r="10" fill="#ffa1d4" />
          <circle cx="535" cy="280" r="6" fill="#ffa1d4" />

          <line x1="150" y1="120" x2="700" y2="120" stroke="#fdf2c8" strokeWidth="28" strokeLinecap="round" />
          <circle cx="760" cy="120" r="14" fill="#fdf2c8" />
          <circle cx="805" cy="120" r="10" fill="#fdf2c8" />

          <circle cx="100" cy="400" r="12" fill="#a1eadb" opacity="0.8" />
          <circle cx="140" cy="400" r="8" fill="#a1eadb" opacity="0.8" />
          <circle cx="170" cy="400" r="5" fill="#a1eadb" opacity="0.8" />

          <circle cx="450" cy="-50" r="15" fill="#a1eadb" opacity="0.8" />
          <circle cx="500" cy="-50" r="10" fill="#a1eadb" opacity="0.8" />
          <circle cx="540" cy="-50" r="6" fill="#a1eadb" opacity="0.8" />

          <circle cx="300" cy="350" r="8" fill="#fdf2c8" />
          <circle cx="200" cy="200" r="12" fill="#ffa1d4" />
          <circle cx="650" cy="250" r="16" fill="#a1eadb" />

          <use href="#candyStar" x="80" y="200" transform="rotate(15, 80, 200) scale(0.8)" />
          <use href="#candyStar" x="550" y="380" transform="rotate(-20, 550, 380) scale(1)" />
          <use href="#candyStar" x="350" y="-10" transform="rotate(45, 350, -10) scale(0.6)" />

          <use href="#candyStarPink" x="650" y="100" transform="rotate(-10, 650, 100) scale(0.9)" />
          <use href="#candyStarPink" x="250" y="450" transform="rotate(25, 250, 450) scale(0.7)" />
        </g>
      </svg>
    </div>
  )
}
