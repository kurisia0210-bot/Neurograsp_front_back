import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const PRESETS = {
  lively: {
    keyIntensity: 2.35,
    fillIntensity: 0.55,
    bounceIntensity: 0.2,
    accentIntensity: 0.32,
    exposure: 1.08,
    keyAngleDeg: 38,
    keyPenumbra: 0.92,
  },
  neutral: {
    keyIntensity: 1.85,
    fillIntensity: 0.42,
    bounceIntensity: 0.14,
    accentIntensity: 0.22,
    exposure: 1.0,
    keyAngleDeg: 40,
    keyPenumbra: 0.9,
  },
  moody: {
    keyIntensity: 1.5,
    fillIntensity: 0.26,
    bounceIntensity: 0.08,
    accentIntensity: 0.18,
    exposure: 0.95,
    keyAngleDeg: 32,
    keyPenumbra: 0.85,
  },
};

function RendererSettings({ exposure }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;

    // Compatibility: some preview runtimes use older Three versions
    if ("outputColorSpace" in gl && THREE.SRGBColorSpace) {
      gl.outputColorSpace = THREE.SRGBColorSpace;
    } else if ("outputEncoding" in gl && THREE.sRGBEncoding) {
      gl.outputEncoding = THREE.sRGBEncoding;
    }
  }, [gl, exposure]);

  useEffect(() => {
    scene.background = new THREE.Color("#e9eef1");
  }, [scene]);

  return null;
}

function DebugAxes() {
  return (
    <group position={[-2.3, 0.01, 2.2]}>
      <mesh>
        <boxGeometry args={[0.02, 0.02, 0.4]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.02, 0.02, 0.4]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.02, 0.02, 0.4]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

function RoomShell() {
  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[8, 0.08, 8]} />
        <meshStandardMaterial color="#eef0ee" roughness={0.95} />
      </mesh>

      {/* Back wall */}
      <mesh receiveShadow position={[0, 2.1, -2.1]}>
        <boxGeometry args={[8, 4.2, 0.08]} />
        <meshStandardMaterial color="#dce5ea" roughness={0.98} />
      </mesh>

      {/* Right wall */}
      <mesh receiveShadow position={[2.4, 2.1, 0]}>
        <boxGeometry args={[0.08, 4.2, 8]} />
        <meshStandardMaterial color="#d5dfe5" roughness={0.98} />
      </mesh>

      {/* Left foreground mass (like your screenshot block) */}
      <mesh receiveShadow castShadow position={[-2.65, 0.95, 1.55]}>
        <boxGeometry args={[1.0, 1.9, 1.2]} />
        <meshStandardMaterial color="#cad4da" roughness={0.9} />
      </mesh>

      {/* Window recess / frame on right wall */}
      <group position={[2.36, 2.05, -0.1]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Outer frame */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[1.6, 1.05, 0.05]} />
          <meshStandardMaterial color="#0d1727" roughness={0.55} metalness={0.05} />
        </mesh>
        {/* Hollow out with inner opening colored like wall (cheap fake) */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[1.38, 0.82, 0.04]} />
          <meshStandardMaterial color="#dce5ea" roughness={0.98} />
        </mesh>
        {/* Mullion bars */}
        <mesh position={[0, 0, 0.055]}>
          <boxGeometry args={[0.08, 0.82, 0.03]} />
          <meshStandardMaterial color="#0d1727" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.28, 0.055]}>
          <boxGeometry args={[1.38, 0.06, 0.03]} />
          <meshStandardMaterial color="#1a2537" roughness={0.5} />
        </mesh>
      </group>

      {/* Window outside bright card (the cheat) */}
      <mesh position={[2.72, 2.12, -0.1]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 1.15]} />
        <meshBasicMaterial color="#eaf4ff" />
      </mesh>
      {/* Slight sky gradient card behind */}
      <mesh position={[2.95, 2.18, -0.15]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 1.8]} />
        <meshBasicMaterial color="#f2fbff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function TableAndProps() {
  return (
    <group position={[-0.35, 0.02, -0.35]}>
      {/* tabletop */}
      <mesh castShadow receiveShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[2.2, 0.1, 1.2]} />
        <meshStandardMaterial color="#f4f4f1" roughness={0.9} />
      </mesh>

      {/* back lip */}
      <mesh castShadow receiveShadow position={[0, 1.12, -0.55]}>
        <boxGeometry args={[2.2, 0.12, 0.05]} />
        <meshStandardMaterial color="#d8d7cf" roughness={0.9} />
      </mesh>

      {/* lower shelf */}
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[2.1, 0.08, 1.1]} />
        <meshStandardMaterial color="#efefec" roughness={0.94} />
      </mesh>

      {/* legs */}
      {[
        [-0.9, 0.58, -0.45],
        [0.9, 0.58, -0.45],
        [-0.9, 0.58, 0.45],
        [0.9, 0.58, 0.45],
      ].map((p, i) => (
        <mesh key={i} castShadow receiveShadow position={p}>
          <cylinderGeometry args={[0.045, 0.045, 1.15, 18]} />
          <meshStandardMaterial color="#cfd6cc" roughness={0.85} />
        </mesh>
      ))}

      {/* chopping board */}
      <mesh castShadow receiveShadow position={[0.15, 1.065, -0.03]} rotation={[-Math.PI / 2, 0, 0.02]}>
        <boxGeometry args={[1.1, 0.03, 0.7]} />
        <meshStandardMaterial color="#eadfb7" roughness={0.88} />
      </mesh>

      {/* board hole */}
      <mesh position={[0.38, 1.083, -0.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.04, 0.008, 12, 24]} />
        <meshStandardMaterial color="#bda86d" roughness={0.7} />
      </mesh>

      {/* red cube */}
      <mesh castShadow receiveShadow position={[-0.55, 1.18, -0.1]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#d96a6a" roughness={0.65} />
      </mesh>
    </group>
  );
}

function LivelyLights(props) {
  const keyRef = useRef(null);
  const accentRef = useRef(null);
  const keyTarget = useMemo(() => new THREE.Object3D(), []);
  const accentTarget = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    keyTarget.position.set(-0.25, 1.02, -0.35); // table center-ish
    accentTarget.position.set(-0.05, 1.07, -0.2); // chopping board focus
  }, [keyTarget, accentTarget]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Very subtle living movement (optional-feel, tiny amplitude)
    if (keyRef.current) {
      keyRef.current.intensity = props.keyIntensity * (1 + Math.sin(t * 0.35) * 0.01);
    }
    if (accentRef.current) {
      accentRef.current.intensity = props.accentIntensity * (1 + Math.sin(t * 0.55 + 1.1) * 0.015);
    }
  });

  return (
    <group>
      <primitive object={keyTarget} />
      <primitive object={accentTarget} />

      {/* Tiny base ambient just to avoid clipping to black */}
      <ambientLight intensity={0.06} color="#f5f8ff" />

      {/* B. Sky fill (critical for 'lively' feeling) */}
      <hemisphereLight
        args={["#dceeff", "#e6dfd2", props.fillIntensity]}
        position={[0, 4.5, 0]}
      />

      {/* A. Key light = warm sun through window */}
      <spotLight
        ref={keyRef}
        castShadow
        color="#fff0d8"
        intensity={props.keyIntensity}
        position={[2.85, 3.55, 0.25]}
        angle={THREE.MathUtils.degToRad(props.keyAngleDeg)}
        penumbra={props.keyPenumbra}
        distance={14}
        decay={1.2}
        target={keyTarget}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00012}
      />

      {/* C. Bounce light = warm floor/table rebound (no shadow) */}
      <pointLight
        color="#f1e8d7"
        intensity={props.bounceIntensity}
        position={[-0.25, 0.6, 0.65]}
        distance={4.2}
        decay={1.5}
      />

      {/* D. Task accent = narrow, gentle focus on desk area */}
      <spotLight
        ref={accentRef}
        color="#fff3df"
        intensity={props.accentIntensity}
        position={[0.95, 2.15, 0.8]}
        angle={THREE.MathUtils.degToRad(24)}
        penumbra={0.95}
        distance={6}
        decay={1.4}
        target={accentTarget}
      />
    </group>
  );
}

function Scene(props) {
  return (
    <>
      <RendererSettings exposure={props.exposure} />

      <RoomShell />
      <TableAndProps />
      <LivelyLights {...props} />
      {/* ContactShadows removed for preview compatibility; your project can add it back later */}

      {props.showAxes && <DebugAxes />}

      {/* Html labels removed for preview compatibility */}
    </>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function LivelyLightingComboPreview({ onBack }) {
  const [presetName, setPresetName] = useState("lively");
  const [params, setParams] = useState(PRESETS.lively);
  const [showAxes, setShowAxes] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    setParams(PRESETS[presetName]);
  }, [presetName]);

  const uiCard = {
    background: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(8px)",
    border: "1px solid #dbe2ea",
    borderRadius: 16,
    boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
    padding: 12,
  };

  return (
    <div className="w-full h-screen bg-[#edf1f3] relative">
      {/* 返回按钮 */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-gray-700 rounded-full shadow-sm hover:bg-gray-100 font-bold transition-all"
        >
          <span>{"<-"}</span> Back
        </button>
      )}
      
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [2.8, 2.35, 3.35], fov: 40 }}
      >
        <Suspense fallback={null}>
          <Scene {...params} showAxes={showAxes} showLabels={showLabels} />
          <OrbitControls
            makeDefault
            target={[-0.15, 1.0, -0.2]}
            minDistance={2.4}
            maxDistance={7.2}
            minPolarAngle={0.35}
            maxPolarAngle={1.45}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.35}
          />
        </Suspense>
      </Canvas>

      <div className="absolute top-3 left-3 z-10 w-[340px] max-w-[calc(100%-24px)]" style={uiCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Lively Lighting Combo</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Key + Sky Fill + Bounce + Accent + Window Card</div>
          </div>
          <button
            onClick={() => setParams(PRESETS[presetName])}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 10, border: "1px solid #d7dfe8", background: "#fff" }}
          >
            Reset
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {Object.keys(PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => setPresetName(name)}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #d7dfe8",
                background: presetName === name ? "#e9f3ff" : "#fff",
                color: "#334155",
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <Slider label="Key Intensity" value={params.keyIntensity} min={0} max={4} onChange={(v) => setParams((p) => ({ ...p, keyIntensity: v }))} />
          <Slider label="Sky Fill" value={params.fillIntensity} min={0} max={1.2} onChange={(v) => setParams((p) => ({ ...p, fillIntensity: v }))} />
          <Slider label="Bounce" value={params.bounceIntensity} min={0} max={0.8} onChange={(v) => setParams((p) => ({ ...p, bounceIntensity: v }))} />
          <Slider label="Task Accent" value={params.accentIntensity} min={0} max={1} onChange={(v) => setParams((p) => ({ ...p, accentIntensity: v }))} />
          <Slider label="Exposure" value={params.exposure} min={0.7} max={1.4} step={0.01} onChange={(v) => setParams((p) => ({ ...p, exposure: v }))} />
          <Slider label="Key Angle" value={params.keyAngleDeg} min={18} max={70} step={1} onChange={(v) => setParams((p) => ({ ...p, keyAngleDeg: v }))} />
          <Slider label="Key Penumbra" value={params.keyPenumbra} min={0} max={1} onChange={(v) => setParams((p) => ({ ...p, keyPenumbra: v }))} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowLabels((v) => !v)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 10, border: "1px solid #d7dfe8", background: showLabels ? "#eefcf1" : "#fff" }}
          >
            {showLabels ? "Labels ✓" : "Labels"}
          </button>
          <button
            onClick={() => setShowAxes((v) => !v)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 10, border: "1px solid #d7dfe8", background: showAxes ? "#eef4ff" : "#fff" }}
          >
            {showAxes ? "Axes ✓" : "Axes"}
          </button>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 10, border: "1px solid #d7dfe8", background: autoRotate ? "#fff7ed" : "#fff" }}
          >
            {autoRotate ? "AutoRotate ✓" : "AutoRotate"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
          ✅ Cheat included: bright window card + hidden bounce + task accent. <br />
          🎯 Recommended baseline: <b>lively</b> preset, then only tweak Key Intensity / Fill / Exposure.
        </div>
      </div>
    </div>
  );
}
