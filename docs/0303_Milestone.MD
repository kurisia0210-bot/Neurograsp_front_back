基于我对系统的理解,让我为你提供 **World Facts + Registry 架构重构的里程碑汇总**:

---

## 🎯 **World Facts + Registry 架构重构里程碑**

### **架构愿景**
将当前分散的状态管理、规则硬编码、目标处理统一为:
- **World Facts**: 作为唯一的真实世界状态源
- **Registry 系统**: 作为可扩展的规则、目标、行为注册中心

---

### **Phase 1: 基础设施层 - World Facts 体系**

#### 🔹 Milestone 1.1: World Facts 核心设计
**目标**: 建立统一的世界状态抽象层

- 设计 `WorldFacts` 核心数据结构
- 定义 Facts 的标准化访问接口
- 实现 Facts 的不可变性保证
- 建立 Facts 的序列化/反序列化机制

**验收标准**:
- World Facts 可完整表达所有物理状态
- 所有状态查询通过统一接口
- Facts 更新遵循不可变原则

---

#### 🔹 Milestone 1.2: Facts Provider 抽象
**目标**: 解耦状态来源与状态使用

- 设计 `FactsProvider` 接口
- 实现从 `ObservationPayload` 到 Facts 的转换
- 实现从 `task_facts` 到统一 Facts 的迁移
- 支持多源 Facts 合并策略

**验收标准**:
- 现有 `task_facts.py` 逻辑完全迁移
- 支持前端、模拟器、测试等多种数据源
- Facts 提取逻辑与业务逻辑解耦

---

#### 🔹 Milestone 1.3: Facts Query Layer
**目标**: 提供高效的状态查询能力

- 实现常用查询方法 (location, holding, object_state)
- 实现关系查询 (inside, on, near)
- 实现状态历史查询
- 支持复杂条件查询

**验收标准**:
- 替换所有 `_location()`, `_holding()` 等手工方法
- 查询接口统一且类型安全
- 支持查询性能优化

---

### **Phase 2: Registry 系统 - 可扩展规则引擎**

#### 🔹 Milestone 2.1: Base Registry 架构
**目标**: 建立通用 Registry 基础设施

- 设计 `BaseRegistry` 抽象类
- 实现注册、查询、匹配机制
- 支持优先级和冲突解决
- 实现 Registry 的序列化持久化

**验收标准**:
- 提供统一的注册器模式
- 支持动态注册与查询
- 所有 Registry 继承自统一基类

---

#### 🔹 Milestone 2.2: Goal Registry 重构
**目标**: 将现有 Goal 系统迁移到 Registry

- 将 `GoalRegistry` 重构为基于 BaseRegistry
- `GoalHandler` 作为可注册的组件
- 目标解析器 (resolve) 作为可插拔策略
- 别名系统 (alias_registry) 并入 Registry

**验收标准**:
- 现有 Goal 功能完全保持
- 新增目标类型无需修改核心代码
- 目标解析器可独立配置

---

#### 🔹 Milestone 2.3: Action Registry
**目标**: 统一动作类型和执行策略管理

- 实现 `ActionRegistry`
- 注册所有 `AgentActionType`
- 为每个动作注册验证器、执行器、适配器
- 整合 `adapters_v2.py` 逻辑

**验收标准**:
- 动作类型扩展通过注册完成
- 动作验证规则可配置
- 动作适配逻辑模块化

---

#### 🔹 Milestone 2.4: Rule Registry (Safety & ADL)
**目标**: 将硬编码规则变为可注册规则

- 实现 `RuleRegistry`
- 迁移 `adl_rules.py` 为可注册规则
- 迁移 Guards (`FinishGuard`, `StagnationGuard`)
- 支持规则的条件、优先级、组合

**验收标准**:
- 所有安全规则可动态注册
- 规则执行顺序可配置
- 新规则无需修改核心逻辑

---

### **Phase 3: 集成层 - 打通 Facts 与 Registry**

#### 🔹 Milestone 3.1: Facts-Aware Registry
**目标**: Registry 的所有操作基于 World Facts

- 所有 Handler 接收 `WorldFacts` 而非 `ObservationPayload`
- Goal 评估基于 Facts 查询
- Rule 判断基于 Facts 查询
- 移除所有 `obs.agent.location` 等直接访问

**验收标准**:
- 核心模块不再依赖 `ObservationPayload` 结构
- 所有状态访问通过 Facts 接口
- 测试可通过 Mock Facts 完成

---

#### 🔹 Milestone 3.2: Reasoning 层重构
**目标**: 推理层完全基于 Facts + Registry

- `reasoning_v2.py` 接收 `WorldFacts`
- Proposer 基于 Facts 生成建议
- Guards 基于 Facts 验证状态
- 移除对 Payload 的直接依赖

**验收标准**:
- Reasoning 流程与数据格式解耦
- 可独立测试推理逻辑
- 支持不同 Facts 源切换

---

#### 🔹 Milestone 3.3: Memory 系统适配
**目标**: 记忆系统存储和查询 Facts

- `episodic_memory` 存储 Facts 快照
- 支持基于 Facts 的记忆回放
- 实现 Facts 差异计算
- 支持基于 Facts 的记忆检索

**验收标准**:
- 历史状态可精确重建
- 记忆查询返回 Facts 对象
- 支持 Facts 的增量存储

---

### **Phase 4: 生态扩展 - 可配置性与可扩展性**

#### 🔹 Milestone 4.1: Configuration System
**目标**: 通过配置而非代码扩展系统

- 实现 Registry 的配置文件加载
- 支持 YAML/JSON 配置目标、规则
- 实现配置热重载
- 提供配置验证工具

**验收标准**:
- 新场景无需修改 Python 代码
- 配置变更可即时生效
- 配置错误有清晰提示

---

#### 🔹 Milestone 4.2: Plugin System
**目标**: 支持第三方扩展

- 设计插件接口
- 实现插件加载机制
- 提供插件开发模板
- 实现插件隔离和安全

**验收标准**:
- 外部开发者可编写插件
- 插件可独立安装、卸载
- 插件异常不影响核心系统

---

#### 🔹 Milestone 4.3: Domain-Specific Registry
**目标**: 支持垂直领域扩展

- 实现 `KitchenRegistry` (当前场景)
- 实现 `PhoneGameRegistry` (游戏场景)
- 设计跨域 Registry 组合机制
- 支持运行时 Registry 切换

**验收标准**:
- 不同场景使用独立 Registry
- Registry 可按需加载
- 支持多 Registry 并存

---

### **Phase 5: 验证与优化**

#### 🔹 Milestone 5.1: 端到端验证
**目标**: 确保重构后系统功能完整

- 所有现有测试用例通过
- 性能基准不低于重构前
- 行为语义完全一致
- 生成完整的迁移报告

---

#### 🔹 Milestone 5.2: 文档与范例
**目标**: 知识转移与最佳实践

- 编写架构设计文档
- 提供 Registry 开发指南
- 创建典型场景示例
- 录制开发者教程

---

#### 🔹 Milestone 5.3: 清理与优化
**目标**: 代码质量与性能提升

- 移除废弃代码路径
- 统一命名和代码风格
- 性能热点优化
- 增强错误提示

---

## 🎉 **最终愿景**

重构完成后的系统特征:

✅ **单一真实源**: World Facts 是唯一的状态来源  
✅ **可扩展性**: 新功能通过注册而非修改代码  
✅ **可配置性**: 场景、规则、目标通过配置定义  
✅ **可测试性**: 所有组件可独立测试  
✅ **类型安全**: 强类型约束减少运行时错误  
✅ **清晰职责**: Facts 管状态, Registry 管规则

---

这个里程碑路线图覆盖了从基础设施到生态扩展的完整重构路径,每个里程碑都有明确的目标和验收标准。