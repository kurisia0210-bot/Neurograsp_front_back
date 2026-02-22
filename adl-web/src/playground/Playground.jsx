import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { GameCamera } from '../components/game/GameCamera'
import { GameLighting } from '../components/ui/GameLighting'
import { Floor } from '../components/Floor'
import { Wall } from '../components/Wall'
import { Table } from '../components/Table'

const TABLE_HEIGHT = 0.85
const EFFECTIVE_HEIGHT = TABLE_HEIGHT * 2

const CUBE_POS_TABLE = [-0.4, EFFECTIVE_HEIGHT + 0.125, -0.5]
const CUBE_POS_HAND = [1.3, 1.2, 0.4]
const CUBE_POS_FRIDGE = [-1.8, 1.2, -0.5]

function InteractiveFridge({ position, isOpen, onToggle }) {
  const doorGroupRef = useRef(null)

  useFrame((_, delta) => {
    if (!doorGroupRef.current) return
    const targetRot = isOpen ? 2.0 : 0
    doorGroupRef.current.rotation.y = THREE.MathUtils.lerp(doorGroupRef.current.rotation.y, targetRot, delta * 4)
  })

  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="#dfe6e9" />
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
          <meshStandardMaterial color={isOpen ? '#b2bec3' : '#dfe6e9'} />
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

function TableLightDebugger({
  enabled,
  color,
  intensity,
  angleDeg,
  penumbra,
  distance,
  decay,
  posX,
  posY,
  posZ,
  targetX,
  targetY,
  targetZ,
  showHelper
}) {
  const { scene } = useThree()
  const lightRef = useRef(null)
  const helperRef = useRef(null)
  const targetRef = useRef(new THREE.Object3D())

  useEffect(() => {
    if (!enabled) return undefined
    scene.add(targetRef.current)
    return () => {
      scene.remove(targetRef.current)
    }
  }, [enabled, scene])

  useEffect(() => {
    targetRef.current.position.set(targetX, targetY, targetZ)
    targetRef.current.updateMatrixWorld()
    if (lightRef.current) {
      lightRef.current.target = targetRef.current
      lightRef.current.target.updateMatrixWorld()
    }
  }, [targetX, targetY, targetZ])

  useEffect(() => {
    if (!enabled || !showHelper || !lightRef.current) return undefined
    const helper = new THREE.SpotLightHelper(lightRef.current, '#f59e0b')
    helperRef.current = helper
    scene.add(helper)
    return () => {
      scene.remove(helper)
      helperRef.current = null
    }
  }, [enabled, showHelper, scene])

  useFrame(() => {
    if (helperRef.current) helperRef.current.update()
  })

  if (!enabled) return null

  return (
    <>
      <spotLight
        ref={lightRef}
        position={[posX, posY, posZ]}
        color={color}
        intensity={intensity}
        angle={THREE.MathUtils.degToRad(angleDeg)}
        penumbra={penumbra}
        distance={distance}
        decay={decay}
        castShadow
      />
      <mesh position={[posX, posY, posZ]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color="#f59e0b" toneMapped={false} />
      </mesh>
      <mesh position={[targetX, targetY, targetZ]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshBasicMaterial color="#06b6d4" toneMapped={false} />
      </mesh>
    </>
  )
}

export function Playground({ onBack }) {
  const [fridgeDoorOpen, setFridgeDoorOpen] = useState(false)
  const [cubeState, setCubeState] = useState('on_table')
  const [debugColor, setDebugColor] = useState('#edf3f7')
  const [showColorDebugger, setShowColorDebugger] = useState(true)
  const [rawColorMode, setRawColorMode] = useState(false)
  const [useBaseLighting, setUseBaseLighting] = useState(true)
  const [lightDebugEnabled, setLightDebugEnabled] = useState(true)
  const [lightColor, setLightColor] = useState('#fff3cc')
  const [lightIntensity, setLightIntensity] = useState(2.2)
  const [lightAngleDeg, setLightAngleDeg] = useState(36)
  const [lightPenumbra, setLightPenumbra] = useState(0.55)
  const [lightDistance, setLightDistance] = useState(8)
  const [lightDecay, setLightDecay] = useState(1.6)
  const [lightPosX, setLightPosX] = useState(0.2)
  const [lightPosY, setLightPosY] = useState(3.3)
  const [lightPosZ, setLightPosZ] = useState(-0.6)
  const [lightTargetX, setLightTargetX] = useState(0.05)
  const [lightTargetY, setLightTargetY] = useState(1.75)
  const [lightTargetZ, setLightTargetZ] = useState(-1.65)
  const [showLightHelper, setShowLightHelper] = useState(true)

  const cubePosition =
    cubeState === 'in_hand' ? CUBE_POS_HAND : cubeState === 'in_fridge' ? CUBE_POS_FRIDGE : CUBE_POS_TABLE

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
          <div className="font-semibold mb-2">Wall Color Debug</div>
          <label className="flex items-center justify-between mb-2">
            <span>Raw Color Mode</span>
            <input type="checkbox" checked={rawColorMode} onChange={(e) => setRawColorMode(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between mb-2">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={showColorDebugger}
              onChange={(e) => setShowColorDebugger(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-2 mb-2">
            <span>Input Color</span>
            <input
              type="color"
              value={debugColor}
              onChange={(e) => setDebugColor(e.target.value)}
              className="w-12 h-6 bg-transparent border border-gray-300 rounded"
            />
          </label>
          <div className="text-[11px] text-gray-500">Wall patch is on the back wall (right side). Raw mode bypasses lighting.</div>
        </div>
        <div className="mb-3 border-t border-gray-200 pt-2">
          <div className="font-semibold mb-2">Lighting Debug (Table)</div>
          <label className="flex items-center justify-between mb-2">
            <span>Base Lighting</span>
            <input type="checkbox" checked={useBaseLighting} onChange={(e) => setUseBaseLighting(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between mb-2">
            <span>Table Spot</span>
            <input type="checkbox" checked={lightDebugEnabled} onChange={(e) => setLightDebugEnabled(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between mb-2">
            <span>Show Helper</span>
            <input type="checkbox" checked={showLightHelper} onChange={(e) => setShowLightHelper(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-2 mb-2">
            <span>Light Color</span>
            <input
              type="color"
              value={lightColor}
              onChange={(e) => setLightColor(e.target.value)}
              className="w-12 h-6 bg-transparent border border-gray-300 rounded"
            />
          </label>
          <label className="block mb-1">
            Intensity: {lightIntensity.toFixed(2)}
            <input
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Angle: {lightAngleDeg.toFixed(0)}°
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={lightAngleDeg}
              onChange={(e) => setLightAngleDeg(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Penumbra: {lightPenumbra.toFixed(2)}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lightPenumbra}
              onChange={(e) => setLightPenumbra(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Distance: {lightDistance.toFixed(1)}
            <input
              type="range"
              min="0"
              max="15"
              step="0.1"
              value={lightDistance}
              onChange={(e) => setLightDistance(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Decay: {lightDecay.toFixed(2)}
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={lightDecay}
              onChange={(e) => setLightDecay(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Pos X: {lightPosX.toFixed(2)}
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              value={lightPosX}
              onChange={(e) => setLightPosX(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Pos Y: {lightPosY.toFixed(2)}
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.05"
              value={lightPosY}
              onChange={(e) => setLightPosY(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Pos Z: {lightPosZ.toFixed(2)}
            <input
              type="range"
              min="-4"
              max="2"
              step="0.05"
              value={lightPosZ}
              onChange={(e) => setLightPosZ(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Target X: {lightTargetX.toFixed(2)}
            <input
              type="range"
              min="-3"
              max="3"
              step="0.05"
              value={lightTargetX}
              onChange={(e) => setLightTargetX(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Target Y: {lightTargetY.toFixed(2)}
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={lightTargetY}
              onChange={(e) => setLightTargetY(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block mb-1">
            Target Z: {lightTargetZ.toFixed(2)}
            <input
              type="range"
              min="-4"
              max="2"
              step="0.05"
              value={lightTargetZ}
              onChange={(e) => setLightTargetZ(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
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

      <Canvas orthographic flat={rawColorMode} gl={rawColorMode ? { toneMapping: THREE.NoToneMapping } : undefined}>
        <GameCamera />
        {!rawColorMode && useBaseLighting && <GameLighting />}
        <RawColorOverride enabled={rawColorMode} />
        <RawEdgeOverlay enabled={rawColorMode} />
        {!rawColorMode && (
          <TableLightDebugger
            enabled={lightDebugEnabled}
            color={lightColor}
            intensity={lightIntensity}
            angleDeg={lightAngleDeg}
            penumbra={lightPenumbra}
            distance={lightDistance}
            decay={lightDecay}
            posX={lightPosX}
            posY={lightPosY}
            posZ={lightPosZ}
            targetX={lightTargetX}
            targetY={lightTargetY}
            targetZ={lightTargetZ}
            showHelper={showLightHelper}
          />
        )}

        <Floor width={12} depth={12} color="#dcd7cf" />
        <Wall position={[-3, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={10} height={5} />
        <Wall position={[0, 2.5, -2.5]} hasWindow={true} />
        <WallColorDebugger color={debugColor} visible={showColorDebugger} />

        <Table position={[0, 0, -1.68]} scale={[1.2, 1.2, 1.44]} />
        <InteractiveFridge
          position={[-2, 0, -0.5]}
          isOpen={fridgeDoorOpen}
          onToggle={() => setFridgeDoorOpen((prev) => !prev)}
        />

        <mesh position={cubePosition}>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </Canvas>
    </div>
  )
}
