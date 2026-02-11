## 📋 NeuroWeb项目技术文档

### 1️⃣ **项目概述**
- **名称**：NeuroWeb (ADL智能体系统)
- **架构**：前后端分离的CoALA架构实现
- **目标**：厨房环境中的具身智能体任务执行
- **里程碑**：已完成M1-M10，实现完整的智能体认知监控系统

### 2️⃣ **目录结构**

#### **后端 (adl-backend)**
```
adl-backend/
├── app.py              # FastAPI入口 (M5: I/O层)
├── core/               # 核心逻辑层
│   ├── agent.py       # 主控制器 (M3: 流水线)
│   ├── reasoning.py   # LLM推理层 (M7: 咨询层 + M10: 看门狗)
│   └── memory.py      # 记忆系统 (M8: 失败记忆)
├── schema/            # 数据契约层
│   ├── payload.py     # Pydantic模型 (M1: 地基)
│   └── db_memory.py   # 数据库记忆模型
├── service/           # 服务层
│   ├── adl_rules.py   # 反射规则 (M4: 小脑)
│   ├── llm_client.py  # LLM客户端 (M6: 纯语言能力)
│   ├── stub_brain.py  # 存根脑
│   └── vector_db.py   # 向量数据库 (M9: 语义记忆)
├── debug_rule.py      # 调试工具：查看语义规则
└── chroma_db/         # ChromaDB向量数据库存储
```

#### **前端 (adl-web)**
```
adl-web/
├── src/
│   ├── playground/    # 测试环境
│   │   ├── AgentPlayground.jsx      # 3D智能体测试环境
│   │   ├── Playground.jsx           # Holdable交互测试
│   │   ├── BubbleTestDashboard.jsx  # 气泡测试
│   │   └── HoldableComparison.jsx   # 交互对比
│   ├── components/    # 组件库
│   │   ├── game/      # 游戏逻辑组件
│   │   │   ├── avatar/     # 医生头像组件
│   │   │   ├── interaction/# 交互组件 (Holdable)
│   │   │   ├── items/      # 游戏物品
│   │   │   ├── mechanics/  # 游戏机制
│   │   │   └── hook/       # React钩子 (useAgentBridge)
│   │   ├── levels/    # 关卡组件
│   │   │   ├── level1.jsx  # Level 1: 切苹果游戏
│   │   │   └── Level2.jsx  # Level 2: 记忆拨号游戏
│   │   └── ui/        # UI组件
│   ├── store/         # 状态管理 (Zustand)
│   └── ai/            # AI相关组件
├── public/            # 静态资源
│   └── models/        # 3D模型文件 (.glb)
└── package.json       # React + Three.js项目
```

### 3️⃣ **核心架构模块**

#### **M1: Payload & Schema层**
- 职责：数据契约定义
- 技术：Pydantic V2 + Enum
- 特点：类型安全，前后端一致，支持JSON Schema验证

#### **M3: Agent.step() 流水线**
```
Observation → Reasoning → Reflex → Structured Response
```
- 协调者：`core/agent.py`
- 特点：清晰的责任链，异步处理

#### **M4: Reflex层 (小脑)**
- 文件：`service/adl_rules.py`
- 特点：纯函数，无LLM，确定性规则
- 规则：物理/安全/解剖学法则，实时保护

#### **M5: API/I-O层**
- 文件：`app.py`
- 特点：纯管道，无业务逻辑
- 端口：8001，支持CORS

#### **M6: LLM客户端**
- 文件：`service/llm_client.py`
- 特点：纯语言能力，可切换模型
- 提供商：DeepSeek API (OpenAI兼容接口)

#### **M7: Reasoning层 (咨询层)**
- 文件：`core/reasoning.py`
- 定位：LLM = 咨询顾问
- 输出：Proposal，非最终行动
- 集成：M8失败记忆 + M9语义规则

#### **M8: 失败记忆系统**
- 文件：`core/memory.py`
- 特点：记录执行失败，提供失败分析
- 存储：Episodic Memory，支持上次失败检索

#### **M9: 语义规则向量数据库**
- 文件：`service/vector_db.py`
- 技术：ChromaDB + 文本嵌入
- 功能：语义规则检索，上下文相关约束注入
- 调试：`debug_rule.py`查看所有规则

#### **M10: L2停滞检测系统 (看门狗)**
- 文件：`core/reasoning.py` (Watchdog类)
- 功能：
  - **思想巨人检测**：连续IDLE/THINK动作监控
  - **鬼打墙检测**：动作循环识别 (滑动窗口分析)
  - **自动干预**：检测到停滞时强制THINK动作
- 阈值：连续3次空转或5步内只有1-2种不同动作

### 4️⃣ **智能体认知监控系统**

#### **Watchdog看门狗机制**
```python
class Watchdog:
    def __init__(self, history_limit=5, idle_threshold=3):
        self.idle_streak = 0          # 连续空转计数
        self.action_window = deque(maxlen=history_limit)  # 动作滑动窗口
    
    def inspect(self, action) -> bool:
        # 1. 检测思想巨人 (连续思考不行动)
        # 2. 检测鬼打墙 (动作循环)
        # 返回True表示检测到停滞
```

#### **Game 2短路逻辑**
- **场景**：记忆拨号游戏 (Level 2)
- **规则**：连续失败3次 → 自动降低难度
- **实现**：纯Python正则解析 + LLM情感支持
- **输出**：ADJUST_DIFFICULTY动作 + 鼓励消息

#### **语义规则注入**
- **检索**：基于当前上下文查询相关规则
- **注入**：将规则作为"已知约束"加入Prompt
- **效果**：引导LLM遵循学习到的经验

### 5️⃣ **技术栈**

#### **后端技术栈**
- **框架**：FastAPI + Uvicorn
- **验证**：Pydantic V2 + JSON Schema
- **LLM**：DeepSeek API (OpenAI兼容)
- **向量数据库**：ChromaDB + sentence-transformers
- **异步**：async/await全链路
- **数据库**：SQLite (ChromaDB) + 向量存储

#### **前端技术栈**
- **框架**：React 19 + Vite
- **3D引擎**：Three.js + @react-three/fiber + @react-three/drei
- **UI**：Tailwind CSS
- **状态管理**：Zustand
- **交互组件**：自定义Holdable悬停交互系统
- **动画**：CSS动画 + Three.js动画

#### **开发工具**
- **代码规范**：ESLint + 项目宪法 (CONSTITUTION.md)
- **版本控制**：Git + GitHub
- **文档**：Markdown技术文档
- **调试**：专用调试工具和规则查看器

### 6️⃣ **数据流**
```
前端感知 → ObservationPayload → API层 (8001) → Agent.step()
      ↓
LLM建议 → Reflex审查 → Watchdog监控 → AgentStepResponse → 前端执行
      ↓
失败记录 → 语义规则学习 → 下次推理改进
```

### 7️⃣ **安全设计**
1. **Reflex层保护**：物理规则强制执行，绝对安全
2. **Watchdog监控**：认知停滞检测和干预
3. **类型安全**：Pydantic Enum验证所有输入
4. **LLM隔离**：建议≠执行，Reflex有否决权
5. **错误处理**：JSON解析失败→安全退化到THINK
6. **语义约束**：向量数据库提供经验约束

### 8️⃣ **部署信息**
- **后端端口**：8001 (http://127.0.0.1:8001)
- **前端端口**：5173 (Vite开发服务器)
- **API端点**：`POST /api/tick` (主交互接口)
- **响应模型**：`AgentStepResponse` (标准化响应)
- **数据库**：ChromaDB本地存储 (chroma_db/)

### 9️⃣ **项目状态**

#### **已完成里程碑**
- ✅ **M1-M7**: 基础CoALA架构实现
- ✅ **M8**: 失败记忆系统
- ✅ **M9**: 语义规则向量数据库
- ✅ **M10**: L2停滞检测系统 (看门狗)
- ✅ **宪法符合性**: 语义状态重构，符合项目宪法

#### **核心功能**
- ✅ 完整的感知-推理-动作流水线
- ✅ 物理安全规则 (Reflex层)
- ✅ 智能体认知监控 (Watchdog)
- ✅ 语义规则学习和检索
- ✅ 失败分析和记忆
- ✅ 3D前端交互环境
- ✅ Level 1 & 2游戏实现

#### **测试环境**
- ✅ AgentPlayground: 3D智能体测试
- ✅ Playground: Holdable交互测试
- ✅ Level 1: 切苹果游戏 (ADL训练)
- ✅ Level 2: 记忆拨号游戏 (认知训练)

#### **待完善**
- ⚠️ 数据库持久化优化
- ⚠️ 更多测试用例覆盖
- ⚠️ 性能监控和日志系统
- ⚠️ 部署和CI/CD流水线

### 🔟 **关键设计原则**
1. **关注点分离**：每层单一职责，清晰边界
2. **类型驱动开发**：Pydantic确保数据契约
3. **安全第一**：多层保护 (Reflex + Watchdog)
4. **可解释性**：每一步都可追踪，有明确理由
5. **可替换性**：LLM/前端/数据库可独立更换
6. **渐进增强**：从简单规则到复杂学习
7. **宪法符合**：严格遵循项目宪法原则

### 🎯 **智能体能力总结**
1. **基础行动**：MOVE_TO, INTERACT, THINK, FINISH
2. **游戏特定**：ADJUST_DIFFICULTY (Level 2)
3. **认知监控**：停滞检测和自动干预
4. **学习能力**：从失败中学习语义规则
5. **情感支持**：LLM生成鼓励和指导消息
6. **安全保证**：物理规则 + 认知监控双重保护

---

**文档版本**：v2.0  
**最后更新**：2026-02-11  
**项目健康度**：9.0/10  
**当前分支**：feat/add-agent-M10-L2fail-stag  
**最新提交**：finish the detection of L2 failure:stag  

**项目活跃度**：高 - 持续开发中，已完成10个核心里程碑