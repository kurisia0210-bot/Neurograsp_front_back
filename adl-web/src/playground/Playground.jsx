import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

import { GameCamera } from '../components/game/GameCamera'
import {
  PlaygroundLightingPanel,
  PlaygroundLightingRig,
  usePlaygroundLightingSettings
} from '../components/ui/PlaygroundLightingModule'
import { Floor } from '../components/Floor'
import { Wall } from '../components/Wall'
import { Table } from '../components/Table'

const TABLE_HEIGHT = 0.85
const EFFECTIVE_HEIGHT = TABLE_HEIGHT * 2

const CUBE_POS_TABLE = [-0.4, EFFECTIVE_HEIGHT + 0.125, -0.5]
const CUBE_POS_HAND = [1.3, 1.2, 0.4]
const CUBE_POS_FRIDGE = [-1.8, 1.2, -0.5]
const DEFAULT_SURFACE_COLORS = {
  wallMain: '#f8dec2',
  wallTest: '#ffc697',
  floor: '#8199aa',
  fridge: '#dfe6e9'
}
const WINDOW_IMAGE_DEFAULT_POS = { x: 1.08, y: 2.58, z: -2.29 }
const WINDOW_IMAGE_PIXEL_SIZE = 7540


function shadeHex(hex, factor) {
  const c = new THREE.Color(hex)
  c.r = Math.min(1, Math.max(0, c.r * factor))
  c.g = Math.min(1, Math.max(0, c.g * factor))
  c.b = Math.min(1, Math.max(0, c.b * factor))
  return `#${c.getHexString()}`
}

function InteractiveFridge({ position, isOpen, onToggle, color = DEFAULT_SURFACE_COLORS.fridge }) {
  const doorGroupRef = useRef(null)
  const doorColor = isOpen ? shadeHex(color, 0.8) : color

  useFrame((_, delta) => {
    if (!doorGroupRef.current) return
    const targetRot = isOpen ? 2.0 : 0
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetRot, delta * 4)
  })

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <group
        ref={doorGroupRef}
        position={[0.5, 1, 0.51]}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <mesh position={[-0.5, 0, 0]}>
          <boxGeometry args={[1, 2, 0.05]} />
          <meshStandardMaterial color={doorColor} />
        </mesh>
        <mesh position={[-0.9, 0, 0.05]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color="#636e72" />
        </mesh>
      </group>
    </group>
  )
}

function WallColorDebugger({ color, visible }) {
  if (!visible) return null

  return (
    <group position={[2.85, 2.1, -2.31]}>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[1.9, 1.1, 0.02]} />
        <meshBasicMaterial color="#111827" />
      </mesh>

      <mesh position={[-0.45, 0, 0]}>
        <boxGeometry args={[0.7, 0.7, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh position={[0.45, 0, 0]}>
        <boxGeometry args={[0.7, 0.7, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0} />
      </mesh>

      <mesh position={[-0.45, -0.48, 0.01]}>
        <boxGeometry args={[0.72, 0.08, 0.01]} />
        <meshBasicMaterial color="#4b5563" />
      </mesh>
      <mesh position={[0.45, -0.48, 0.01]}>
        <boxGeometry args={[0.72, 0.08, 0.01]} />
        <meshBasicMaterial color="#6b7280" />
      </mesh>
    </group>
  )
}

function RawColorOverride({ enabled }) {
  const { scene } = useThree()
  const originalMaterialsRef = useRef(new Map())
  const overriddenMaterialsRef = useRef([])

  useEffect(() => {
    const restoreMaterials = () => {
      scene.traverse((obj) => {
        if (!obj.isMesh) return
        const originalMaterial = originalMaterialsRef.current.get(obj.uuid)
        if (!originalMaterial) return
        obj.material = originalMaterial
        originalMaterialsRef.current.delete(obj.uuid)
      })

      overriddenMaterialsRef.current.forEach((mat) => mat.dispose())
      overriddenMaterialsRef.current = []
    }

    if (!enabled) {
      restoreMaterials()
      return restoreMaterials
    }

    restoreMaterials()

    scene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return

      const currentMaterial = obj.material
      originalMaterialsRef.current.set(obj.uuid, currentMaterial)

      const materialList = Array.isArray(currentMaterial) ? currentMaterial : [currentMaterial]
      const basicList = materialList.map((mat) => {
        const basic = new THREE.MeshBasicMaterial({
          color: mat?.color ? mat.color.clone() : new THREE.Color('#ffffff'),
          map: mat?.map || null,
          transparent: Boolean(mat?.transparent),
          opacity: typeof mat?.opacity === 'number' ? mat.opacity : 1,
          side: mat?.side ?? THREE.FrontSide,
          vertexColors: Boolean(mat?.vertexColors)
        })
        basic.toneMapped = false
        overriddenMaterialsRef.current.push(basic)
        return basic
      })

      obj.material = Array.isArray(currentMaterial) ? basicList : basicList[0]
    })

    return restoreMaterials
  }, [enabled, scene])

  return null
}

function RawEdgeOverlay({ enabled }) {
  const { scene } = useThree()
  const overlaysRef = useRef([])

  useEffect(() => {
    const clearOverlays = () => {
      overlaysRef.current.forEach(({ mesh, lines, edgesGeometry, lineMaterial }) => {
        if (mesh && lines) mesh.remove(lines)
        edgesGeometry?.dispose?.()
        lineMaterial?.dispose?.()
      })
      overlaysRef.current = []
    }

    if (!enabled) {
      clearOverlays()
      return clearOverlays
    }

    clearOverlays()

    scene.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return

      const edgesGeometry = new THREE.EdgesGeometry(obj.geometry, 30)
      const lineMaterial = new THREE.LineBasicMaterial({
        color: '#111827',
        transparent: true,
        opacity: 0.35,
        toneMapped: false
      })
      const lines = new THREE.LineSegments(edgesGeometry, lineMaterial)
      lines.renderOrder = 999
      obj.add(lines)

      overlaysRef.current.push({ mesh: obj, lines, edgesGeometry, lineMaterial })
    })

    return clearOverlays
  }, [enabled, scene])

  return null
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || '').trim()
  const shortHex = /^#([0-9a-fA-F]{3})$/
  const longHex = /^#([0-9a-fA-F]{6})$/
  if (longHex.test(raw)) return raw.toLowerCase()
  if (shortHex.test(raw)) {
    const m = raw.slice(1)
    return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`.toLowerCase()
  }
  return fallback
}

function WindowImagePlane({ position, size }) {
  return (
    <Html
      position={[position.x, position.y, position.z]}
      transform
      center
      scale={0.01}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          width: size,
          height: size,
          overflow: 'hidden'
        }}
      >
        <img
          src="/outside-window-scene.svg"
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            maxWidth: 'none',
            maxHeight: 'none',
            display: 'block'
          }}
        />
      </div>
    </Html>
  )
}

export function Playground({ onBack }) {
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false)
  const [cubeState, setCubeState] = useState('on_table')
  const [rawColorMode, setRawColorMode] = useState(false)
  const [surfaceColors, setSurfaceColors] = useState(DEFAULT_SURFACE_COLORS)
  const [wallMainHex, setWallMainHex] = useState(DEFAULT_SURFACE_COLORS.wallMain)
  const [wallTestHex, setWallTestHex] = useState(DEFAULT_SURFACE_COLORS.wallTest)
  const [floorHex, setFloorHex] = useState(DEFAULT_SURFACE_COLORS.floor)
  const [fridgeHex, setFridgeHex] = useState(DEFAULT_SURFACE_COLORS.fridge)
  const [showColorDebugger, setShowColorDebugger] = useState(false)
  const [windowImagePos, setWindowImagePos] = useState(WINDOW_IMAGE_DEFAULT_POS)
  const [windowImageSize, setWindowImageSize] = useState(WINDOW_IMAGE_PIXEL_SIZE)
  const lighting = usePlaygroundLightingSettings()

  const applyHexColor = (key, value) => {
    setSurfaceColors((prev) => ({
      ...prev,
      [key]: normalizeHexColor(value, prev[key])
    }))
  }

  const applyAllHexColors = () => {
    setSurfaceColors((prev) => ({
      wallMain: normalizeHexColor(wallMainHex, prev.wallMain),
      wallTest: normalizeHexColor(wallTestHex, prev.wallTest),
      floor: normalizeHexColor(floorHex, prev.floor),
      fridge: normalizeHexColor(fridgeHex, prev.fridge)
    }))
  }

  const resetSurfaceColors = () => {
    setSurfaceColors(DEFAULT_SURFACE_COLORS)
    setWallMainHex(DEFAULT_SURFACE_COLORS.wallMain)
    setWallTestHex(DEFAULT_SURFACE_COLORS.wallTest)
    setFloorHex(DEFAULT_SURFACE_COLORS.floor)
    setFridgeHex(DEFAULT_SURFACE_COLORS.fridge)
  }

  const cubePosition =
    cubeState === 'in_hand' ? CUBE_POS_HAND : cubeState === 'in_fridge' ? CUBE_POS_FRIDGE : CUBE_POS_TABLE


  const updateWindowImageAxis = (axis, value) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    setWindowImagePos((prev) => ({ ...prev, [axis]: numeric }))
  }

  const updateWindowImageSize = (value) => {
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return
    const clamped = Math.max(120, Math.min(50000, numeric))
    setWindowImageSize(clamped)
  }

  return (
    <div className="w-full h-screen relative bg-[#edf3f7] overflow-hidden">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/90 text-gray-700 rounded-full shadow font-semibold hover:bg-white"
        >
          {'<-'} Back
        </button>
      )}

      <div className="absolute top-4 right-4 z-50 bg-white/90 border border-gray-200 rounded-xl p-3 shadow text-xs text-gray-700 w-80 max-h-[92vh] overflow-y-auto">
        <div className="font-bold text-sm mb-2">Playground (Level1 Layout)</div>
        <div className="mb-2">Door: {fridgeDoorOpen ? 'open' : 'closed'}</div>
        <div className="mb-3">Cube: {cubeState}</div>


        <div className="mb-3 border-t border-gray-200 pt-2">
          <div className="font-semibold mb-2">Window Image Position Test</div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">X</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-1"
                max="3"
                step="0.01"
                value={windowImagePos.x}
                onChange={(e) => updateWindowImageAxis('x', e.target.value)}
                className="flex-1"
              />
              <input
                type="number"
                step="0.01"
                value={windowImagePos.x}
                onChange={(e) => updateWindowImageAxis('x', e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">Y</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={windowImagePos.y}
                onChange={(e) => updateWindowImageAxis('y', e.target.value)}
                className="flex-1"
              />
              <input
                type="number"
                step="0.01"
                value={windowImagePos.y}
                onChange={(e) => updateWindowImageAxis('y', e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">Z</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-50"
                max="-2.3"
                step="0.01"
                value={windowImagePos.z}
                onChange={(e) => updateWindowImageAxis('z', e.target.value)}
                className="flex-1"
              />
              <input
                type="number"
                step="0.01"
                value={windowImagePos.z}
                onChange={(e) => updateWindowImageAxis('z', e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setWindowImagePos(WINDOW_IMAGE_DEFAULT_POS)}
              className="px-2 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Reset XYZ
            </button>
          </div>
          <div className="text-[11px] text-gray-500">
            Current: [{windowImagePos.x.toFixed(2)}, {windowImagePos.y.toFixed(2)}, {windowImagePos.z.toFixed(2)}]
          </div>
        </div>

        <div className="mb-3 border-t border-gray-200 pt-2">
          <div className="font-semibold mb-2">Window Image Size</div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">Window Size (px)</div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="120"
                max="50000"
                step="1"
                value={windowImageSize}
                onChange={(e) => updateWindowImageSize(e.target.value)}
                className="flex-1"
              />
              <input
                type="number"
                step="1"
                value={windowImageSize}
                onChange={(e) => updateWindowImageSize(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded font-mono"
              />
            </div>
          </div>
          <div className="text-[11px] text-gray-500">Current size: {windowImageSize}px</div>
        </div>

        <div className="mb-3 border-t border-gray-200 pt-2">
          <div className="font-semibold mb-2">Surface Color Painter</div>
          <label className="flex items-center justify-between mb-2">
            <span>Raw Color Mode</span>
            <input type="checkbox" checked={rawColorMode} onChange={(e) => setRawColorMode(e.target.checked)} />
          </label>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-1">Main Wall HEX (With Window)</div>
            <div className="flex items-center gap-2">
              <input type="color" value={wallMainHex} onChange={(e) => setWallMainHex(e.target.value)} className="w-10 h-7 border border-gray-300 rounded" />
              <input
                type="text"
                value={wallMainHex}
                onChange={(e) => setWallMainHex(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded font-mono"
                placeholder="#edf3f7"
              />
              <button onClick={() => applyHexColor('wallMain', wallMainHex)} className="px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600">
                Apply
              </button>
            </div>
          </div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-1">Test Wall HEX (No Window)</div>
            <div className="flex items-center gap-2">
              <input type="color" value={wallTestHex} onChange={(e) => setWallTestHex(e.target.value)} className="w-10 h-7 border border-gray-300 rounded" />
              <input
                type="text"
                value={wallTestHex}
                onChange={(e) => setWallTestHex(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded font-mono"
                placeholder="#edf3f7"
              />
              <button onClick={() => applyHexColor('wallTest', wallTestHex)} className="px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600">
                Apply
              </button>
            </div>
          </div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-1">Floor HEX</div>
            <div className="flex items-center gap-2">
              <input type="color" value={floorHex} onChange={(e) => setFloorHex(e.target.value)} className="w-10 h-7 border border-gray-300 rounded" />
              <input
                type="text"
                value={floorHex}
                onChange={(e) => setFloorHex(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded font-mono"
                placeholder="#dcd7cf"
              />
              <button onClick={() => applyHexColor('floor', floorHex)} className="px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600">
                Apply
              </button>
            </div>
          </div>
          <div className="mb-2 p-2 rounded border border-gray-200 bg-white/70">
            <div className="text-[11px] font-semibold text-gray-700 mb-1">Fridge HEX</div>
            <div className="flex items-center gap-2">
              <input type="color" value={fridgeHex} onChange={(e) => setFridgeHex(e.target.value)} className="w-10 h-7 border border-gray-300 rounded" />
              <input
                type="text"
                value={fridgeHex}
                onChange={(e) => setFridgeHex(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded font-mono"
                placeholder="#dfe6e9"
              />
              <button onClick={() => applyHexColor('fridge', fridgeHex)} className="px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600">
                Apply
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={applyAllHexColors}
              className="px-2 py-1 rounded bg-sky-500 text-white hover:bg-sky-600"
            >
              Apply All
            </button>
            <button
              onClick={resetSurfaceColors}
              className="px-2 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Reset
            </button>
            <button
              onClick={() => setShowColorDebugger((prev) => !prev)}
              className="px-2 py-1 rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              {showColorDebugger ? 'Hide Patch' : 'Show Patch'}
            </button>
          </div>
          <div className="text-[11px] text-gray-500">
            Current: mainWall {surfaceColors.wallMain} / testWall {surfaceColors.wallTest} / floor {surfaceColors.floor} / fridge {surfaceColors.fridge}
          </div>
        </div>

        <PlaygroundLightingPanel lighting={lighting} />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFridgeDoorOpen((prev) => !prev)}
            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
          >
            Toggle Door
          </button>
          <button onClick={() => setCubeState('on_table')} className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">
            Cube: Table
          </button>
          <button onClick={() => setCubeState('in_hand')} className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300">
            Cube: Hand
          </button>
          <button
            onClick={() => setCubeState('in_fridge')}
            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
          >
            Cube: Fridge
          </button>
        </div>
      </div>

      <Canvas
        orthographic
        shadows={false}
        flat={rawColorMode}
        gl={rawColorMode ? { toneMapping: THREE.NoToneMapping } : undefined}
      >
        <color attach="background" args={['#e9eef1']} />
        <GameCamera />
        <PlaygroundLightingRig lighting={lighting} rawColorMode={rawColorMode} />
        <RawColorOverride enabled={rawColorMode} />
        <RawEdgeOverlay enabled={rawColorMode} />

        <Floor width={12} depth={12} color={surfaceColors.floor} />
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={10} height={5} color={surfaceColors.wallTest} />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} color={surfaceColors.wallMain} />
        <WindowImagePlane position={windowImagePos} size={windowImageSize} />
        <WallColorDebugger color={surfaceColors.wallMain} visible={showColorDebugger} />

        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} />
        <InteractiveFridge
          position={[-2, 0, -0.5]}
          isOpen={fridgeDoorOpen}
          onToggle={() => setFridgeDoorOpen((prev) => !prev)}
          color={surfaceColors.fridge}
        />

        <mesh position={cubePosition}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </Canvas>
    </div>
  )
}

