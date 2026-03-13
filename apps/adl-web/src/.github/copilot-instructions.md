# NeuroGrasp Codebase Guide for AI Agents

This is a **React + Three.js + Zustand** therapeutic game for stroke rehabilitation. Understand these architectural patterns before making changes.

## 🏗️ Architecture Overview

### Application Structure
- **Entry**: [main.jsx](../main.jsx) → [App.jsx](../App.jsx) (route orchestrator)
- **State**: [useStore.js](../store/useStore.js) (Zustand for game state: `isOpen`, `score`)
- **Routing**: Simple state-machine in `App.jsx`: `'menu' | 'level1' | 'level2' | 'playground' | 'bubble-test'`

### Component Layers
```
components/
├── UI Layer (MainMenu, Level1, Level2) - React + Framer Motion
├── 3D Canvas (Canvas from @react-three/fiber)
│   ├── game/mechanics/ - Pure game logic (BladeMachine, GameCube)
│   ├── game/avatar/ - DoctorAvatar visual component
│   ├── Rotator.jsx - Core animation abstraction
│   └── furniture/ - GLTF models (Fridge, Stove, Pot, Table)
└── ui/ - Visual effects (GameLighting, VitalityLines, PetalsBackground)
```

## 🎮 Key Design Patterns

### 1. **Event-Driven Rotator (Core Animation Primitive)**
[Rotator.jsx](../components/game/Rotator.jsx) is the foundational animation component:
- Uses `useFrame` + THREE.MathUtils.lerp for smooth rotation
- Fires `onComplete` callback when rotation reaches target (threshold: 0.01 rad ≈ 0.5°)
- Controls interactive objects: doors, oven, etc.
- **Pattern**: `<Rotator active={isOpen} axis="y" angle={90} speed={4} onComplete={callback}>`

### 2. **State Machine for Game Flow**
Each level maintains explicit state for progression:
- [Level1.jsx](../components/levels/level1.jsx): `isTriggered → isSliced → leftPlaced/rightPlaced → victory`
- [Level2.jsx](../components/levels/Level2.jsx): `level → targetNum → currentInput → isSuccess → level++`
- No implicit timing; events trigger state transitions

### 3. **No Physics Engine**
- Removed `@react-three/rapier` entirely (comments document this)
- Uses raycasting + manual collision detection in [GameCube.jsx](../components/game/mechanics/GameCube.jsx)
- Simplifies performance for older users on rehab hardware

### 4. **Canvas-Based Dragging**
[GameCube.jsx](../components/game/mechanics/GameCube.jsx) implements drag via `useFrame`:
- Raycaster intersects with invisible plane at `dragHeight`
- `onDrag` callback returns `{position, shouldSlice}`
- Two cube variants: `WholeCube` (before slice) → `HalfCube` (after slice)

## 🎨 Visual System

### Lighting Theme
[GameLighting.jsx](../components/ui/GameLighting.jsx) uses state-based theme switching:
```javascript
THEME = {
  playing: { ambient: '#1e3a8a', ambientIntensity: 0.3, sun: '#10b981' },
  success: { ambient: '#ffaa55', ambientIntensity: 0.5, sun: '#ff8800' }
}
```
- Pass `isSuccess` boolean to auto-switch mood
- Never adjust lighting directly in level code; use theme system

### Animation with Framer Motion
[MainMenu.jsx](../components/MainMenu.jsx) demonstrates pattern:
- Define `variants` separately (e.g., `containerVariants`, `itemVariants`)
- Use `staggerChildren` for cascading animations
- Combine with `whileHover`, `whileTap` for interactions

## 🧠 Level Architecture

### Level1: Blade Machine
- Drag cube into slicing zone → machine activates
- `BladeMachine` component cuts in half (visual only)
- Two half-cubes appear in targetable zones
- Victory: both halves placed correctly

### Level2: Telephone
- Memorize & enter number sequence (3-11 digits)
- Success triggers avatar reaction, then increments level
- Uses non-Canvas React for simplicity (no 3D needed)

## 📋 GLTF Model Loading Pattern

All 3D models follow this pattern:
```jsx
import { useGLTF } from '@react-three/drei'

export function ModelName(props) {
  const { nodes, materials } = useGLTF('/model.glb')
  // Use nodes.PartName and materials directly
  return <group {...props} dispose={null}>{/* mesh hierarchy */}</group>
}
useGLTF.preload('/model.glb')  // Preload for smoother loading
```
- Models are in `/public/` folder (not tracked in src)
- Always add `.preload()` at end of file

## 🎯 Development Workflow

### Quick Testing
- [BubbleTestDashboard.jsx](../playground/BubbleTestDashboard.jsx) for isolated component testing
- [Playground.jsx](../playground/Playground.jsx) for full scene prototyping
- Red button in menu jumps to bubble-test (dev convenience)

### Debugging State
- `useStore()` hook available everywhere for score/door status
- Check [App.jsx](../App.jsx) comments for route string format issues (e.g., `levelplayground` bug fix)

### Camera System
[GameCamera.jsx](../components/game/GameCamera.jsx) locks orthographic view:
- All tweaks in `FIX_POS`, `FIX_FOCUS`, `FIX_ZOOM` constants
- Disabled all user interaction (`enabled={false}`)
- Change focal point in one place; updates across all scenes

## 🌐 Naming & Code Style Conventions

1. **Component names**: PascalCase, export as named exports
2. **State variables**: camelCase with semantic prefixes (`isTriggered`, `cubePos`, `avatarStatus`)
3. **Comments**: Use emojis (📍🎯🧠✨) for quick visual scanning
4. **Chinese comments** throughout codebase—keep this style for consistency
5. **Magic numbers**: Define as constants at component top (e.g., `TABLE_HEIGHT = 0.85`)

## ⚙️ Critical Dependencies

- `@react-three/fiber` - Canvas orchestration
- `@react-three/drei` - Utilities (OrbitControls, GLTF loader, Html)
- `framer-motion` - UI animations
- `zustand` - State management
- `tailwindcss` - Styling

## 🚫 Anti-Patterns to Avoid

1. **Don't add physics back** - Scene is optimized for no physics
2. **Don't hardcode colors** - Use `GameLighting` theme system
3. **Don't put game logic in render** - Use `useFrame` hooks
4. **Don't forget model disposal** - Always add `dispose={null}` to groups
5. **Don't modify global rotation** - Use `Rotator` component instead
