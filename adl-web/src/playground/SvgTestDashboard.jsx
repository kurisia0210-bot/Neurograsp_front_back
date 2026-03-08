import React, { useMemo, useState } from 'react'

const DEFAULT_SVG = `<svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="200" height="200" rx="24" fill="#0f172a"/>
  <circle cx="110" cy="90" r="48" fill="#22d3ee"/>
  <path d="M56 168 Q110 130 164 168" stroke="#a7f3d0" stroke-width="14" fill="none" stroke-linecap="round"/>
</svg>`

function buildSvgDataUrl(svgCode) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode)}`
}

export function SvgTestDashboard({ onBack }) {
  const [svgCode, setSvgCode] = useState(DEFAULT_SVG)

  const trimmedCode = svgCode.trim()
  const hasSvgRoot = trimmedCode.startsWith('<svg')

  const previewUrl = useMemo(() => {
    if (!hasSvgRoot) return ''
    return buildSvgDataUrl(trimmedCode)
  }, [trimmedCode, hasSvgRoot])

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 p-6 overflow-auto">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">SVG Test</h1>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Back
            </button>
          )}
        </div>

        <p className="text-sm text-slate-300 mb-4">
          Paste SVG code on the left. The preview will render on the right.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
            <div className="text-xs text-slate-300 mb-2">SVG Code</div>
            <textarea
              value={svgCode}
              onChange={(e) => setSvgCode(e.target.value)}
              spellCheck={false}
              className="w-full h-[520px] resize-none bg-slate-950 text-emerald-200 font-mono text-xs p-3 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Paste <svg ...>...</svg> here"
            />
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
            <div className="text-xs text-slate-300 mb-2">Preview</div>
            <div className="h-[520px] rounded border border-slate-700 bg-[linear-gradient(45deg,#0b1220_25%,#111827_25%,#111827_50%,#0b1220_50%,#0b1220_75%,#111827_75%,#111827_100%)] bg-[length:24px_24px] flex items-center justify-center p-3 overflow-hidden">
              {!trimmedCode ? (
                <div className="text-slate-400 text-sm">Input is empty.</div>
              ) : !hasSvgRoot ? (
                <div className="text-amber-300 text-sm">Code must start with {'<svg ...>'}.</div>
              ) : (
                <img src={previewUrl} alt="SVG Preview" className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}