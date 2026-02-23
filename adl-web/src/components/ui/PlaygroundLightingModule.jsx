import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { GameLighting } from './GameLighting'

export const DEFAULT_PLAYGROUND_LIGHTING = {
  useBaseLighting: true,
  showHelper: true,
  key: {
    enabled: true,
    color: '#f3d500',
    intensity: 5.0,
    angleDeg: 73,
    penumbra: 0.84,
    distance: 15.0,
    decay: 1.13,
    posX: 2.65,
    posY: 4.4,
    posZ: 0.25,
    targetX: -0.25,
    targetY: 1.02,
    targetZ: -0.35
  },
  fill: {
    enabled: true,
    color: '#b9ccdc',
    intensity: 4.2,
    angleDeg: 65,
    penumbra: 0.95,
    distance: 12.0,
    decay: 1.2,
    posX: 1.05,
    posY: 3.85,
    posZ: -0.15,
    targetX: -0.25,
    targetY: 2.4,
    targetZ: -0.55
  },
  accent: {
    enabled: true,
    color: '#e8ddc8',
    intensity: 2.55,
    angleDeg: 28,
    penumbra: 0.95,
    distance: 6.0,
    decay: 1.4,
    posX: 0.7,
    posY: 2.35,
    posZ: 0.8,
    targetX: 0.6,
    targetY: 1.95,
    targetZ: -0.05
  }
}

function Slider({ label, value, min, max, step, onChange, digits = 2 }) {
  return (
    <label className="block mb-1">
      {label}: {Number(value).toFixed(digits)}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  )
}

function SpotSection({ title, description, config, onUpdate }) {
  return (
    <div className="mb-3 border-t border-gray-200 pt-2">
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-xs text-gray-500 mb-2">{description}</div>
      <label className="flex items-center justify-between mb-2">
        <span>Enabled</span>
        <input type="checkbox" checked={config.enabled} onChange={(e) => onUpdate('enabled', e.target.checked)} />
      </label>
      <label className="flex items-center justify-between gap-2 mb-2">
        <span>Color</span>
        <input
          type="color"
          value={config.color}
          onChange={(e) => onUpdate('color', e.target.value)}
          className="w-12 h-6 bg-transparent border border-gray-300 rounded"
        />
      </label>

      <Slider label="Intensity" value={config.intensity} min={0} max={5} step={0.05} onChange={(v) => onUpdate('intensity', v)} />
      <Slider label="Angle" value={config.angleDeg} min={10} max={80} step={1} digits={0} onChange={(v) => onUpdate('angleDeg', v)} />
      <Slider label="Penumbra" value={config.penumbra} min={0} max={1} step={0.01} onChange={(v) => onUpdate('penumbra', v)} />
      <Slider label="Distance" value={config.distance} min={0} max={15} step={0.1} digits={1} onChange={(v) => onUpdate('distance', v)} />
      <Slider label="Decay" value={config.decay} min={1} max={2.5} step={0.01} onChange={(v) => onUpdate('decay', v)} />

      <Slider label="Pos X" value={config.posX} min={-3} max={3} step={0.05} onChange={(v) => onUpdate('posX', v)} />
      <Slider label="Pos Y" value={config.posY} min={0.5} max={5} step={0.05} onChange={(v) => onUpdate('posY', v)} />
      <Slider label="Pos Z" value={config.posZ} min={-4} max={2} step={0.05} onChange={(v) => onUpdate('posZ', v)} />

      <Slider label="Target X" value={config.targetX} min={-3} max={3} step={0.05} onChange={(v) => onUpdate('targetX', v)} />
      <Slider label="Target Y" value={config.targetY} min={0.5} max={3} step={0.05} onChange={(v) => onUpdate('targetY', v)} />
      <Slider label="Target Z" value={config.targetZ} min={-4} max={2} step={0.05} onChange={(v) => onUpdate('targetZ', v)} />
    </div>
  )
}

function SpotDebugger({ config, showHelper, helperColor = '#f59e0b', markerColor = '#06b6d4' }) {
  const { scene } = useThree()
  const lightRef = useRef(null)
  const helperRef = useRef(null)
  const targetRef = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!config.enabled) return undefined
    scene.add(targetRef)
    return () => scene.remove(targetRef)
  }, [config.enabled, scene, targetRef])

  useEffect(() => {
    targetRef.position.set(config.targetX, config.targetY, config.targetZ)
    targetRef.updateMatrixWorld()
    if (lightRef.current) {
      lightRef.current.target = targetRef
      lightRef.current.target.updateMatrixWorld()
    }
  }, [config.targetX, config.targetY, config.targetZ, targetRef])

  useEffect(() => {
    if (!config.enabled || !showHelper || !lightRef.current) return undefined
    const helper = new THREE.SpotLightHelper(lightRef.current, helperColor)
    helperRef.current = helper
    scene.add(helper)
    return () => {
      scene.remove(helper)
      helperRef.current = null
    }
  }, [config.enabled, helperColor, scene, showHelper])

  useFrame(() => {
    if (helperRef.current) helperRef.current.update()
  })

  if (!config.enabled) return null

  return (
    <>
      <spotLight
        ref={lightRef}
        position={[config.posX, config.posY, config.posZ]}
        color={config.color}
        intensity={config.intensity}
        angle={THREE.MathUtils.degToRad(config.angleDeg)}
        penumbra={config.penumbra}
        distance={config.distance}
        decay={config.decay}
      />
      <mesh position={[config.posX, config.posY, config.posZ]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color={helperColor} toneMapped={false} />
      </mesh>
      <mesh position={[config.targetX, config.targetY, config.targetZ]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshBasicMaterial color={markerColor} toneMapped={false} />
      </mesh>
    </>
  )
}

export function usePlaygroundLightingSettings() {
  const [settings, setSettings] = useState(DEFAULT_PLAYGROUND_LIGHTING)

  const updateTopField = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const updateSpotField = (spotName, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [spotName]: {
        ...prev[spotName],
        [field]: value
      }
    }))
  }

  const resetDefaults = () => setSettings(DEFAULT_PLAYGROUND_LIGHTING)

  return { settings, updateTopField, updateSpotField, resetDefaults }
}

export function PlaygroundLightingPanel({ lighting }) {
  const { settings, updateTopField, updateSpotField, resetDefaults } = lighting

  return (
    <>
      <div className="mb-3 border-t border-gray-200 pt-2">
        <div className="font-semibold mb-2">Lighting Module</div>
        <label className="flex items-center justify-between mb-2">
          <span>Base Lighting</span>
          <input
            type="checkbox"
            checked={settings.useBaseLighting}
            onChange={(e) => updateTopField('useBaseLighting', e.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between mb-2">
          <span>Show Helper</span>
          <input
            type="checkbox"
            checked={settings.showHelper}
            onChange={(e) => updateTopField('showHelper', e.target.checked)}
          />
        </label>
        <button onClick={resetDefaults} className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">
          Reset Lighting Preset
        </button>
      </div>

      <SpotSection
        title="A. KeyLight"
        description='Main directional light for the table.'
        config={settings.key}
        onUpdate={(field, value) => updateSpotField('key', field, value)}
      />
      <SpotSection
        title="B. FillLight"
        description='Sky-like fill to lift dark regions.'
        config={settings.fill}
        onUpdate={(field, value) => updateSpotField('fill', field, value)}
      />
      <SpotSection
        title="C. AccentLight"
        description='Task emphasis light for work area readability.'
        config={settings.accent}
        onUpdate={(field, value) => updateSpotField('accent', field, value)}
      />
    </>
  )
}

export function PlaygroundLightingRig({ lighting, rawColorMode }) {
  const { settings } = lighting

  if (rawColorMode) return null

  return (
    <>
      <ambientLight intensity={0.08} color="#f5f8ff" />
      {settings.useBaseLighting && <GameLighting />}
      <SpotDebugger
        config={settings.key}
        showHelper={settings.showHelper}
        helperColor="#f59e0b"
        markerColor="#06b6d4"
      />
      <SpotDebugger
        config={settings.fill}
        showHelper={settings.showHelper}
        helperColor="#60a5fa"
        markerColor="#22d3ee"
      />
      <SpotDebugger
        config={settings.accent}
        showHelper={settings.showHelper}
        helperColor="#f97316"
        markerColor="#fb7185"
      />
    </>
  )
}
