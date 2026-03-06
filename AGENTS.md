# AGENTS.md

## Engineering Constitution

This repository follows strict engineering principles.
All AI agents working on this codebase MUST follow these rules.

### 1. No Speculative Programming

Do not implement features that are not explicitly required.

Forbidden behaviors:
- Adding future-proof structures without a current use case
- Implementing "just in case" functionality
- Adding configuration options that are not needed now

Allowed behavior:
- Implement only what the current task requires
- Prefer minimal solutions

---

### 2. No Premature Abstraction

Do not introduce abstractions unless duplication already exists.

Rules:
- Do not create frameworks
- Do not create generic utilities without at least two real use cases
- Avoid class hierarchies unless clearly required

Prefer:
- simple functions
- direct implementations
- explicit logic

---

### 3. Readability First

Readable code is more important than clever code.

Guidelines:
- Code should be understandable in under 30 seconds
- Prefer explicit names over short names
- Prefer simple control flow over complex patterns
- Avoid deep indirection

Forbidden patterns:
- unnecessary design patterns
- meta-programming
- complex generics

---

### 4. Small Changes

Changes should be minimal and focused.

Rules:
- Do not refactor unrelated code
- Avoid touching multiple modules unless necessary
- Prefer incremental improvements

---

### 5. When Unsure

When the correct architecture is unclear:

1. Implement the simplest working solution.
2. Document assumptions.
3. Leave refactoring for future iterations.

### 6. Avoid Overengineering

This project values shipping working code over designing perfect systems.

Prefer:
- simple modules
- direct logic
- minimal dependencies

Avoid:
- architecture redesigns
- speculative refactors
- unnecessary modularization

### 7. Respect Existing Code

Before modifying code:

1. Understand the current implementation
2. Preserve existing behavior
3. Avoid rewriting working modules

Do NOT guess the "future architecture".
State changes must go through WorldFacts.