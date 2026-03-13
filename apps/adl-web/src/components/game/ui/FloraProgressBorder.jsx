import React, { useEffect, useMemo, useState } from 'react'

const DECORATION_DENSITY = 0.75
const FLOWER_RATIO = 0.58
const FLOWER_COLORS = ['#fda4af', '#fb7185', '#f97316', '#fb923c', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#ec4899']

function buildBorderData(viewportWidth, viewportHeight) {
  const padding = 20
  const waveLength = 40
  const amplitude = 6

  const width = Math.max(0, viewportWidth - padding * 2)
  const height = Math.max(0, viewportHeight - padding * 2)
  const startX = padding
  const startY = padding

  let path = `M ${startX} ${startY} `
  let flip = 1
  const points = []

  for (let x = startX; x < startX + width; x += waveLength) {
    const endX = Math.min(x + waveLength, startX + width)
    const cpX = x + (endX - x) / 2
    const cpY = startY - amplitude * flip
    path += `Q ${cpX} ${cpY}, ${endX} ${startY} `
    points.push({ x: cpX, y: cpY })
    flip *= -1
  }

  for (let y = startY; y < startY + height; y += waveLength) {
    const endY = Math.min(y + waveLength, startY + height)
    const cpY = y + (endY - y) / 2
    const cpX = startX + width + amplitude * flip
    path += `Q ${cpX} ${cpY}, ${startX + width} ${endY} `
    points.push({ x: cpX, y: cpY })
    flip *= -1
  }

  for (let x = startX + width; x > startX; x -= waveLength) {
    const endX = Math.max(x - waveLength, startX)
    const cpX = x - (x - endX) / 2
    const cpY = startY + height + amplitude * flip
    path += `Q ${cpX} ${cpY}, ${endX} ${startY + height} `
    points.push({ x: cpX, y: cpY })
    flip *= -1
  }

  for (let y = startY + height; y > startY; y -= waveLength) {
    const endY = Math.max(y - waveLength, startY)
    const cpY = y - (y - endY) / 2
    const cpX = startX - amplitude * flip
    path += `Q ${cpX} ${cpY}, ${startX} ${endY} `
    points.push({ x: cpX, y: cpY })
    flip *= -1
  }

  const shuffled = [...points].sort(() => Math.random() - 0.5)
  const total = Math.floor(shuffled.length * DECORATION_DENSITY)
  const active = shuffled.slice(0, total)

  const decorations = active.map((point, index) => {
    const threshold = total <= 0 ? 100 : (index / total) * 100
    const isFlower = Math.random() < FLOWER_RATIO
    const scale = 0.7 + Math.random() * 0.6
    const rotation = Math.random() * 360
    const flowerColor = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)]

    return {
      id: `${index}_${point.x}_${point.y}`,
      x: point.x,
      y: point.y,
      threshold,
      isFlower,
      scale,
      rotation,
      flowerColor
    }
  })

  return {
    path: `${path}Z`,
    decorations
  }
}

function Flower({ color }) {
  return (
    <>
      <circle cx="0" cy="-5" r="5" fill={color} stroke="#f472b6" strokeWidth="1" />
      <circle cx="4.7" cy="-1.5" r="5" fill={color} stroke="#f472b6" strokeWidth="1" />
      <circle cx="2.9" cy="4" r="5" fill={color} stroke="#f472b6" strokeWidth="1" />
      <circle cx="-2.9" cy="4" r="5" fill={color} stroke="#f472b6" strokeWidth="1" />
      <circle cx="-4.7" cy="-1.5" r="5" fill={color} stroke="#f472b6" strokeWidth="1" />
      <circle cx="0" cy="0" r="3" fill="#fbbf24" />
    </>
  )
}

function Leaf() {
  return (
    <>
      <path d="M 0 0 C 4 -8, 12 -8, 16 0 C 12 8, 4 8, 0 0 Z" fill="#bbf7d0" stroke="#4ade80" strokeWidth="1" />
      <path d="M 0 0 L 14 0" stroke="#4ade80" strokeWidth="1" />
    </>
  )
}

export function FloraProgressBorder() {
  const [progress, setProgress] = useState(0)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    let timer = null

    const handleResize = () => {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        setViewport({ width: window.innerWidth, height: window.innerHeight })
      }, 200)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const borderData = useMemo(() => {
    return buildBorderData(viewport.width, viewport.height)
  }, [viewport.width, viewport.height])

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <path d={borderData.path} fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <g>
          {borderData.decorations.map((decoration) => {
            const growth = Math.min(1, Math.max(0, (progress - decoration.threshold) / 10))
            const currentScale = decoration.scale * growth

            return (
              <g key={decoration.id} transform={`translate(${decoration.x}, ${decoration.y})`}>
                <g transform={`rotate(${decoration.rotation})`}>
                  <g transform={`scale(${currentScale})`} opacity={growth}>
                    {decoration.isFlower ? <Flower color={decoration.flowerColor} /> : <Leaf />}
                  </g>
                </g>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="absolute top-24 left-8 pointer-events-auto">
        <h1 className="text-[1.2rem] font-semibold text-green-600 m-0">Rehab Feedback (Flora)</h1>
        <p className="text-sm text-slate-500 mt-1 mb-0">Plant border progress module for Level1.</p>

        <div className="mt-4 flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            className="w-[200px]"
            style={{ accentColor: '#4ade80' }}
          />
          <span className="font-bold text-green-600 min-w-[45px]">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  )
}