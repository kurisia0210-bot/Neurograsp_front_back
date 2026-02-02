# 里程碑 1：NeuroGrasp 后端架构设计（RFC）

**日期**：2026-01-30

**状态**：已批准

**背景**：从 Unity 迁移到 Web（React/Three.js）+ Python（CoALA）

## 1. 摘要

本文档概述了 NeuroGrasp 的"分脑"架构背后的设计理念。我们将 Python 后端的角色定义为实现 CoALA 架构的**认知皮层**，而非简单的 API 服务器。此设计严格遵循项目章程："所有行为均来自显式状态"。

## 2. 结构（目录结构说明）

我们采用受生物学启发的模块化结构，以确保关注点分离。

```
backend/
├── app.py                # [Nerves] API 接口
│                         # 职责：仅 I/O，无逻辑。
│                         # 理由：将 HTTP 协议与认知逻辑解耦。
│
├── core/
│   ├── agent.py          # [皮层] CoALA 主循环（OODA 循环）
│   │                     # 职责：协调感知 -> 记忆 -> 推理 -> 行动。
│   │                     # 理由：集中 CoALA 论文中定义的"决策周期"。
│   │
│   ├── memory.py         # [海马体] 记忆系统
│   │                     # 职责：管理工作记忆/情景记忆/语义记忆。
│   │                     # 理由：隔离状态持久性。允许稍后交换向量数据库。
│   │
│   └── reasoning.py      # [额叶] 决策与推理
│                         # 职责：纯逻辑和 LLM 提示策略。
│                         # 理由：将"如何思考"（提示）与"何时思考"（循环）分开。
│
├── services/
│   ├── llm_client.py     # [Language Center] 模型网关
│   │                     # 职责：处理上下文窗口、令牌和重试。
│   │                     # 理由：防止厂商锁定（DeepSeek 和 GPT-4 之间的切换）。
│   │
│   └── adl_rules.py      # [Cerebellum] 硬编码反射
│                         # 职责：快速、确定性的 ADL 规则（安全检查）。
│                         # 理由：并非所有操作都需要昂贵的 LLM 调用。
│
└── schemas/
    └── payload.py        # [神经递质] 数据契约
                          # 责任：严格的 Pydantic 模型用于前端-后端通信。
                          # 理由：强制执行"语义状态"，而非松散的 JSON 字符串。
```

## 3. 关键架构决策（"为什么"）

### 决策 3.1：状态主权（物理状态 vs. 认知状态）

**问题**：我们有两个真理来源。前端（React）知道烤箱是开着的。后端（Python）认为它知道用户正在做什么。谁是对的？

**解决方案**：单向主权协议。

- **物理真理（上游）**：前端是物理状态（位置、旋转、交互）的绝对掌控者。后端接受这些作为不可更改的事实。
- **认知真理（下游）**：后端完全掌控语义（情绪、引导、任务进度）。前端无条件地渲染这些信息。
- **修正**：后端无法"强制"改变物理状态（例如，后端不能直接说"开门"）。它只能"建议"或"引导"（例如，"请开门"），前端则等待用户输入。

### 决策 3.2：时间不匹配（60 FPS 与 LLM 时间）

**问题**：React 的运行速度为 16 毫秒/帧。LLM 推理需要 2-5 秒。当系统响应"你打开烤箱了！"时，用户可能已经关上了烤箱。

**解决方案**：使用快照 ID 进行逻辑锁定。

1. 前端发送的每个观察值都包含一个 `snapshot_id`（时间戳 + 状态哈希）。
2. 后端处理此快照。
3. 返回的 `AgentAction` 包含 `ref_snapshot_id`。
4. **验证规则**：前端将 `ref_snapshot_id` 与当前状态进行比较。如果物理状态发生显著变化（例如，烤箱打开 -> 烤箱关闭），则丢弃该建议或将其标记为"延迟"。

### 决策 3.3：动作空间原子性

**问题**：LLM 是非确定性的。如果 LLM 输出"跳高"，但 Avatar 仅支持"跳跃"，则系统会崩溃。

**解决方案**：在 `schemas/payload.py` 中严格执行枚举。

- 我们定义了允许动作的严格枚举：`[GUIDANCE, ENCOURAGE, SILENCE]`
- 我们定义了允许情绪的严格枚举：`[HAPPY, CONFUSED, NEUTRAL]`
- **防御层**：`reasoning.py` 必须对 LLM 输出进行清理。如果 LLM 出现未知行为的幻觉，则默认处于"沉默 + 困惑"状态。这保证了系统的稳定性。

## 4. 为什么选择 Python？（技术契合度）

虽然 Node.js 在 I/O 方面更胜一筹，但我们选择 Python 的原因有三点，与 CoALA 的理念相符：

1. **生态系统**：原生支持 LangChain、LlamaIndex 和向量数据库（Chroma/Faiss），这些都是情景记忆所必需的。
2. **多模态**：未来扩展到视觉语言模型 (VLM) 以分析屏幕截图，在 Python (PyTorch) 中非常容易，而在 Node.js 中则较为困难。
3. **学术标准**：大多数智能体研究（包括 CoALA 参考实现）都使用 Python。

## 5. 风险评估

- **状态**: ⏳ WAITING_FOR_REVIEW 
- **背景**: 这是一个严格限制 LLM 权限、基于 CoALA 论文 的 NeuroGrasp 后端架构设计。

## 1. 核心原则 (The Constitution)

- **物理真理 (Physical Truth)**：前端 (React) 是物理世界的唯一主宰。
- **显式状态 (Explicit State)**：所有行为必须源于显式的状态定义，而非隐式的 LLM 推理。
- **权限隔离 (Separation of Powers)**：推理模块 (Reasoning) 只有"建议权"，没有"执行权"。

## 2. 针对性架构修正 (Architectural Fixes)

### 修正点 3.1: 观察数据的"去语义化" (Purification of Observation)

**⚠ 风险**: 如果前端发送 `{"state": "user_is_cooking"}`，这是在前端做"猜测"，污染了客观事实。

**✅ 决议**: 前端只发送 **Raw Physical Data** 或 **Strict Geometric Facts**。

- **❌ 禁止**: `user_is_cooking` (主观推断), `user_is_confused` (主观推断)
- **✔ 允许**:
  - `oven_door: "OPEN"` (物理状态)
  - `distance_to_oven: 0.5` (几何数据)
  - `hand_position: [x, y, z]` (原始数据)
- **职责修正**: "语义理解" (Interpretation) 是大脑 (Backend) 的工作，前端只负责做一个诚实的传感器。

### 修正点 3.2: 记忆写入的"原子性提交" (Atomic Memory Commit)

**⚠ 风险**: 快照过期导致 Action 被丢弃，但大脑却错误地记住了"我夸奖了用户"。导致记忆与现实不符。

**✅ 决议**: **事务性记忆写入 (Transactional Memory Write)**。

- **规则**: `Observation` 总是无条件写入记忆（因为它确实发生了）。
- **规则**: `AgentAction` 只有在 **Snapshot Check 通过** 且 **决定执行** 之后，才能写入情景记忆 (Episodic Memory)。
- **流程**:
  1. 接收 Observation -> 写入记忆。
  2. LLM 生成 Proposal。
  3. **Snapshot Check (逻辑锁)**: 检查当前时间是否已过时?
  4. **IF Pass**: 发送指令给前端 -> **写入 "Action Taken" 到记忆**。
  5. **IF Fail**: 丢弃指令 -> **不写入 Action** (在大脑中这件事从未发生)。

### 修正点 3.3: 推理层的"非权力化" (Demoting Reasoning)

**⚠ 风险**: `reasoning.py` 如果权力过大，LLM 可能会绕过规则直接指挥身体。

**✅ 决议**: **Reasoning ≠ Authority**。

- **Role Definition**:
  - `reasoning.py`: **Proposal Generator (提案生成器)**。它输出的是 `DraftAction`。它不仅不负责执行，甚至不负责决定是否执行。
  - `agent.py` (The Loop): **Executor & Committer (执行官)**。它是唯一的权力中心。它接收 `DraftAction`，进行安全检查 (Safety Check)、快照检查 (Snapshot Check)、状态机验证 (FSM Validation)，最后决定是否 commit。

## 3. 目录结构职责重定义 (Directory Responsibility)

```
backend/
├── app.py                # [神经末梢] 仅负责 I/O 搬运，无任何业务逻辑。
│
├── core/
│   ├── agent.py          # [大脑皮层 - 唯一权力中心]
│   │                     # 职责: 维护 OODA 循环。
│   │                     # 权限: 只有它能调用 memory.save() 和 发送 Response。
│   │                     # 逻辑: if reasoning_proposal is safe and snapshot_valid: execute()
│   │
│   ├── memory.py         # [海马体 - 数据库接口]
│   │                     # 职责: 忠实记录。Observation 必记，Action 选记。
│   │
│   └── reasoning.py      # [额叶 - 提案生成器]
│                         # 职责: 纯函数 (Pure Function)。输入 Context -> 输出 Proposal。
│                         # 限制: 禁止任何副作用 (No Side Effects)。不能读写数据库，不能发请求。
│
├── services/
│   └── adl_rules.py      # [小脑 - 膝跳反射]
│                         # 职责: 硬编码的物理安全规则 (如: 手离火太近 -> 警告)。
│
└── schemas/
    └── payload.py        # [宪法] 数据契约
                          # 职责: 定义 Observation 必须是 Physical Raw Data。
```



# ADL × COALA 后端开发里程碑表（含 DoD）

> **总原则**：
>  每一步 *必须在不引入 LLM 的情况下通过*，
>  否则该步骤视为 **未完成**。

------

## 🧱 Milestone 1 — Schema / Constitution Layer

**对应模块**：`schemas/payload.py`

### 目标

确立**世界能被谈论的全部合法方式**。

### 必须完成（DoD）

-  所有 API 输入 / 输出均有显式 schema
-  Action / Guidance 使用 Enum（无自由字符串）
-  非法值 → 明确 fallback（如 `SILENCE + CONFUSED`）
-  Schema **不包含任何渲染/动画/引擎字段**

### 验收问题（全部必须答 Yes）

- “我能否用 schema **穷举 Agent 可能说的所有话**？”
- “LLM 能否通过 schema **凭空编造新行为**？” → ❌

------

## 🧠 Milestone 2 — Reflex / ADL Rules Layer

**对应模块**：`services/adl_rules.py`

### 目标

定义**哪些事情根本不允许进入‘思考’阶段**。

### 必须完成（DoD）

-  所有安全相关判断为 **纯函数**
-  同样输入 → 永远同样输出
-  Rules 可在 **无 Agent / 无 LLM** 情况下独立运行
-  明确区分：`ALLOW / BLOCK / IGNORE`

### 验收问题

- “如果现在 LLM 崩了，危险行为还能被阻止吗？” → ✅
- “Rules 是否引用了任何历史/上下文/概率？” → ❌

------

## 🧾 Milestone 3 — Episode Memory（事实层）

**对应模块**：`core/memory.py`（先 Episode）

### 目标

建立**不可篡改的因果记录系统**。

### 必须完成（DoD）

-  Episode Memory 是 **append-only**
-  每条记录 = `(pre_state, action, post_state)`
-  可 replay 成世界状态
-  不含总结、解释、评价字段

### 验收问题

- “我能否仅用 Episode Memory 重建整个任务过程？” → ✅
- “这里是否出现了‘我认为 / 应该 / 可能’？” → ❌

------

## 🧩 Milestone 4 — Agent Loop（无 LLM Stub）

**对应模块**：`core/agent.py`

### 目标

证明**系统在没有 LLM 时仍是一个完整 Agent**。

### 必须完成（DoD）

-  OODA Loop 完整（Observe–Orient–Decide–Act）
-  Reasoning 阶段为 stub（固定返回）
-  所有状态更新通过 rules + memory
-  Agent 能完成一次完整 ADL 任务

### 验收问题

- “删掉 reasoning.py，系统还能跑完一次任务吗？” → ✅
- “Agent 是否在任何地方直接调用 LLM？” → ❌

------

## 🌐 Milestone 5 — API / I-O Layer

**对应模块**：`app.py`

### 目标

把系统**暴露为纯粹的管道接口**。

### 必须完成（DoD）

-  `app.py` 不包含任何认知逻辑
-  所有字段来自 schema
-  API 不解释、不推理、不缓存
-  能独立 mock 前端调用

### 验收问题

- “我能否把 app.py 换成 CLI / Socket 而不改核心逻辑？” → ✅
- “这里有没有 if/else 在‘理解’用户？” → ❌

------

## 🗣 Milestone 6 — LLM Client（语言能力）

**对应模块**：`services/llm_client.py`

### 目标

引入**语言能力，但不引入权力**。

### 必须完成（DoD）

-  LLM Client 不知道 Agent 存在
-  不读写任何 Memory
-  只负责 prompt → completion
-  可无痛切换模型提供商

### 验收问题

- “这个模块能否被别的项目复用？” → ✅
- “它是否知道‘现在在干什么任务’？” → ❌

------

## 🧠 Milestone 7 — Reasoning / Advisory Layer

**对应模块**：`core/reasoning.py`

### 目标

允许 LLM **提出建议，但永远不能决定事实**。

### 必须完成（DoD）

-  LLM 输入只读（state + episode slice）
-  输出为结构化 proposal（非 action）
-  proposal 必须经过 rules + agent 决策
-  reasoning 可随时整体关闭

### 验收问题（最重要）

- “LLM 的输出是否**永远可以被拒绝**？” → ✅
- “删掉 reasoning.py，系统是否仍然‘正确但不聪明’？” → ✅

------

# 最终系统健康检查（终极 DoD）

你可以用这 **3 个问题** 做最终验收：

1. **可拔性**：

   > 拔掉 LLM，系统是否仍合法运行？

2. **可追责性**：

   > 每个行为是否都能追溯到显式状态与规则？

3. **可解释性**：

   > 是否存在“发生了，但系统说不清为什么”的行为？

只要有一个答不上来，
 **说明你放权过早。**