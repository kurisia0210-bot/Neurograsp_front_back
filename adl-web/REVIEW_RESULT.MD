## Review Record

- Target: Level2及其import的组件（Level2.jsx, TargetBoard.jsx, Cellphone.jsx, DoctorAvatar.jsx, useAgentBridge.js）
- Change：审查现有代码的宪法符合情况

### Constitution
- Explicit state only: PASS
- Semantic state (not animation): FAIL
- Monotonic & explainable change: PASS
- Pure render(state): PASS
- Minimal abstraction: PASS
- Behavior-based tests: N/A

### Decision
REFACTOR

### Violations
- 语义状态（不是动画）→ DoctorAvatar.jsx使用动画名称（'idle', 'inputting', 'calling', 'encouraging'）作为状态，而不是语义状态
- 语义状态（不是动画）→ Level2.jsx中avatarStatus使用动画名称而不是语义状态

### Lesson
状态应该描述意图（如'waiting', 'processing', 'completed'）而不是动画效果，确保逻辑不依赖于动画名称。