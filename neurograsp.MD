## 📋 NeuroWeb项目技术文档

### 1️⃣ **项目概述**
- **名称**：NeuroWeb (ADL智能体系统)
- **架构**：前后端分离的CoALA架构实现
- **目标**：厨房环境中的具身智能体任务执行

### 2️⃣ **目录结构**

#### **后端 (adl-backend)**
```
adl-backend/
├── app.py              # FastAPI入口 (M5: I/O层)
├── core/               # 核心逻辑层
│   ├── agent.py       # 主控制器 (M3: 流水线)
│   ├── reasoning.py   # LLM推理层 (M7: 咨询层)
│   └── memory.py      # 记忆系统
├── schema/            # 数据契约层
│   └── payload.py     # Pydantic模型 (M1: 地基)
├── service/           # 服务层
│   ├── adl_rules.py   # 反射规则 (M4: 小脑)
│   ├── llm_client.py  # LLM客户端 (M6: 纯语言能力)
│   └── stub_brain.py  # 存根脑
└── infrastructure/    # 基础设施
    └── db/           # 数据库层
```

#### **前端 (adl-web)**
```
adl-web/
├── src/
│   ├── playground/    # 测试环境
│   │   └── AgentPlayground.jsx  # 主测试界面
│   ├── components/    # 3D组件
│   │   ├── game/      # 游戏逻辑组件
│   │   └── ui/        # UI组件
│   ├── ai/           # AI相关组件
│   └── store/        # 状态管理
├── public/           # 静态资源
│   └── models/       # 3D模型文件
└── package.json      # React + Three.js项目
```

### 3️⃣ **核心架构模块**

#### **M1: Payload & Schema层**
- 职责：数据契约定义
- 技术：Pydantic + Enum
- 特点：类型安全，前后端一致

#### **M3: Agent.step() 流水线**
```
Observation → Reasoning → Reflex → Structured Response
```
- 协调者：`core/agent.py`
- 特点：清晰的责任链

#### **M4: Reflex层 (小脑)**
- 文件：`service/adl_rules.py`
- 特点：纯函数，无LLM，确定性规则
- 规则：物理/安全/解剖学法则

#### **M5: API/I-O层**
- 文件：`app.py`
- 特点：纯管道，无业务逻辑
- 端口：8001

#### **M6: LLM客户端**
- 文件：`service/llm_client.py`
- 特点：纯语言能力，可切换模型
- 提供商：DeepSeek API

#### **M7: Reasoning层 (咨询层)**
- 文件：`core/reasoning.py`
- 定位：LLM = 咨询顾问
- 输出：Proposal，非最终行动

### 4️⃣ **技术栈**

#### **后端技术栈**
- **框架**：FastAPI + Uvicorn
- **验证**：Pydantic V2
- **LLM**：DeepSeek API (OpenAI兼容)
- **异步**：async/await
- **数据库**：PostgreSQL + pgvector (规划中)

#### **前端技术栈**
- **框架**：React 19 + Vite
- **3D引擎**：Three.js + @react-three/fiber
- **UI**：Tailwind CSS
- **状态管理**：Zustand

### 5️⃣ **数据流**
```
前端感知 → ObservationPayload → API层 → Agent.step()
      ↓
LLM建议 → Reflex审查 → AgentStepResponse → 前端执行
```

### 6️⃣ **安全设计**
1. **Reflex层保护**：物理规则强制执行
2. **类型安全**：Enum验证所有输入
3. **LLM隔离**：建议≠执行，Reflex有否决权
4. **错误处理**：JSON解析失败→安全退化

### 7️⃣ **部署信息**
- **后端端口**：8001
- **前端端口**：5173 (Vite开发)
- **API端点**：`POST /api/tick`
- **响应模型**：`AgentStepResponse`

### 8️⃣ **项目状态**
- ✅ 架构完整，符合CoALA设计
- ✅ 类型安全，契约明确
- ✅ 前后端分离，职责清晰
- ✅ 安全机制完善
- ⚠️ 数据库层待完善
- ⚠️ 测试覆盖待加强

### 9️⃣ **关键设计原则**
1. **关注点分离**：每层单一职责
2. **类型驱动**：Pydantic确保数据契约
3. **安全第一**：Reflex层保护物理安全
4. **可解释性**：每一步都可追踪
5. **可替换性**：LLM/前端可独立更换

---

**文档版本**：v1.0  
**最后更新**：2026-02-03  
**项目健康度**：8.5/10