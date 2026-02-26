# Tests目录测试脚本技术文档

## 概述

`adl-backend/tests/` 目录包含了智能体系统的完整测试套件，采用分层测试架构设计。测试覆盖了从单元测试到压力测试的多个层面，确保系统的可靠性、性能和正确性。

## 测试架构设计

### 分层测试策略

```
tests/
├── harness/          # 测试框架和工具
├── smoke/           # 冒烟测试和基础功能验证
└── stress/          # 压力测试和性能测试
```

### 设计原则

1. **确定性优先**：Mock模式提供确定性输出
2. **分层覆盖**：从单元到集成到压力测试
3. **性能监控**：包含延迟和并发测试
4. **可配置性**：支持多种运行模式和场景

## 测试模块详解

### 1. 测试框架模块 (harness/)

#### pipeline_test_harness.py - 统一管道测试框架

**职责**：提供完整的推理v2管道测试框架

**核心功能**：
- 组件级测试（Proposer、Guard、Adapter等）
- 端到端集成测试
- 性能基准测试（延迟统计）
- 自定义测试注册

**测试用例**：
```python
# 核心测试用例
test_stage1_proposer()      # 提案器功能测试
test_stage2_guard()         # 安全检查测试
test_stage3_route()         # 路由逻辑测试
test_finish_guard()         # 完成检测测试
test_state_stagnation_guard() # 状态停滞检测
test_watchdog_precedence()  # 看门狗优先级测试
test_instruct_adapter()     # 指令适配器测试
test_complex_put_in_sequence() # 复杂动作序列测试
test_end_to_end()           # 端到端管道测试
```

**性能指标**：
- 平均延迟（avg_ms）
- P50延迟（中位数）
- P95延迟（95百分位）
- 最小/最大延迟
- 运行次数统计

**使用示例**：
```bash
# 基本测试
python pipeline_test_harness.py

# 使用V1提案器测试
python pipeline_test_harness.py --proposer v1

# 使用Mock脚本测试
python pipeline_test_harness.py --proposer mock --mock-script ./golden/mock_script.json

# JSON输出格式
python pipeline_test_harness.py --json

# 自定义重复次数
python pipeline_test_harness.py --repeat 50 --warmup 5
```

### 2. 冒烟测试模块 (smoke/)

#### test_e2e_mock.py - 端到端Mock测试

**职责**：验证基础功能是否正常

**测试场景**：
- 设置Mock模式环境变量
- 创建标准观察输入
- 调用推理v1引擎
- 验证输出格式

**关键特性**：
- 使用Mock LLM避免API依赖
- 验证ActionPayload结构完整性
- 确保trace字段对齐

**使用示例**：
```bash
python test_e2e_mock.py
```

#### v1_llm_smoke.py - LLM链冒烟测试

**职责**：测试LLM集成和错误处理

**测试模式**：
1. **Mock valid_json**：验证JSON解析功能
2. **Mock invalid_json**：验证错误处理机制
3. **DeepSeek真实API**：测试真实LLM集成

**环境变量控制**：
```bash
# Mock模式测试
export LLM_MODE=mock
export LLM_MOCK_SCENARIO=valid_json

# DeepSeek模式测试
export LLM_MODE=deepseek
export DEEPSEEK_API_KEY=your_api_key
```

**使用示例**：
```bash
# 基本测试（跳过缺失API密钥）
python v1_llm_smoke.py

# 严格模式测试（要求API密钥）
python v1_llm_smoke.py --strict-deepseek
```

#### test_prompt.py - 提示词模板测试

**职责**：验证提示词模板的正确性

**测试内容**：
- 提示词模板加载
- 变量替换功能
- 格式一致性检查

### 3. 压力测试模块 (stress/)

#### tick_concurrency_stress.py - 并发压力测试

**职责**：测试系统在高并发下的表现

**测试策略**：
- 多轮并发请求
- 统计延迟指标（P50、P95）
- 错误率监控
- 超时处理测试

**测试参数**：
```bash
# 基本压力测试
python tick_concurrency_stress.py

# 自定义并发和轮次
python tick_concurrency_stress.py --concurrency 20 --rounds 5

# 指定后端URL
python tick_concurrency_stress.py --url http://localhost:8001

# 自定义超时时间
python tick_concurrency_stress.py --timeout-seconds 30
```

**性能指标**：
- 总请求数
- 成功/失败计数
- 延迟分布（min、p50、p95、max）
- 错误详情分析

## 测试数据模型

### ObservationPayload测试数据

**标准测试观察**：
```python
{
    "session_id": "test-session",
    "episode_id": 1,
    "step_id": 1,
    "timestamp": time.time(),
    "agent": {
        "location": "table_center",
        "holding": None
    },
    "nearby_objects": [
        {"id": "red_cube", "state": "on_table", "relation": "on_table"},
        {"id": "fridge_door", "state": "closed", "relation": "front"},
        {"id": "fridge_main", "state": "installed", "relation": "storage"},
        {"id": "table_surface", "state": "installed", "relation": "surface"},
        {"id": "stove", "state": "installed", "relation": "appliance"}
    ],
    "global_task": "Put red cube in fridge"
}
```

### 测试场景配置

**状态配置**：
- 红色方块状态：`on_table`、`in_hand`、`in_fridge`
- 冰箱门状态：`closed`、`open`
- 智能体位置：`table_center`、`fridge_zone`、`stove_zone`
- 手持物品：`None`、`red_cube`、`knife`等

## 测试运行环境

### 环境变量配置

| 变量 | 作用 | 测试值 |
|------|------|--------|
| `LLM_MODE` | LLM运行模式 | `mock`、`deepseek` |
| `LLM_MOCK_SCENARIO` | Mock场景 | `valid_json`、`invalid_json` |
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | 实际密钥或空 |
| `REASONING_V2_PROPOSER` | 提案器类型 | `mock`、`v1` |
| `REASONING_V2_EXECUTION_MODE` | 执行模式 | `ACT`、`INSTRUCT` |

### 编码处理

**Windows兼容性**：
```python
# 确保UTF-8编码输出
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
```

## 测试执行流程

### 1. 单元测试执行流程
```
设置环境变量 → 创建测试观察 → 调用被测组件 → 验证输出 → 统计性能
```

### 2. 集成测试执行流程
```
初始化测试框架 → 注册测试用例 → 执行预热运行 → 执行测量运行 → 生成报告
```

### 3. 压力测试执行流程
```
解析参数 → 创建HTTP客户端 → 生成并发任务 → 收集结果 → 统计分析
```

## 测试验证标准

### 功能正确性验证

**提案器验证**：
- 返回有效的ActionPayload
- 动作类型符合预期
- Trace字段正确对齐

**安全检查验证**：
- Guard检查通过/失败逻辑正确
- 状态停滞检测准确
- 看门狗优先级正确处理

**适配器验证**：
- INSTRUCT模式生成中文指令
- ACT模式保持原始动作
- 模板替换正确

### 性能标准验证

**延迟标准**：
- 单次推理延迟 < 100ms（Mock模式）
- P95延迟 < 200ms
- 无内存泄漏

**并发标准**：
- 支持10+并发请求
- 错误率 < 1%
- 无死锁或资源竞争

## 自定义测试扩展

### 注册自定义测试

```python
# 在pipeline_test_harness中注册自定义测试
harness = PipelineTestHarness()
harness.register_custom_test(
    "my_custom_test",
    async def my_test():
        # 自定义测试逻辑
        return ComponentTestResult(...)
)
```

### 创建新的测试场景

1. **定义测试数据**：创建特定的ObservationPayload
2. **实现测试逻辑**：编写异步测试函数
3. **集成到框架**：注册到测试框架
4. **验证结果**：定义通过/失败标准

## 故障排除指南

### 常见问题及解决方案

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 导入错误 | Python路径问题 | 添加项目根目录到sys.path |
| 编码错误 | Windows控制台编码 | 配置stdout/stderr的UTF-8编码 |
| API密钥缺失 | 环境变量未设置 | 设置DEEPSEEK_API_KEY或使用Mock模式 |
| 超时错误 | 网络或性能问题 | 增加超时时间或减少并发数 |
| JSON解析错误 | Mock数据格式错误 | 检查Mock脚本JSON格式 |

### 调试技巧

1. **启用详细日志**：
   ```python
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

2. **检查环境变量**：
   ```python
   import os
   print("LLM_MODE:", os.getenv("LLM_MODE"))
   ```

3. **验证数据格式**：
   ```python
   import json
   print(json.dumps(obs.dict(), indent=2))
   ```

## 最佳实践

### 测试编写指南

1. **使用确定性Mock**：避免依赖外部服务
2. **覆盖边界条件**：测试正常和异常情况
3. **包含性能测试**：监控延迟和资源使用
4. **保持测试独立**：每个测试不依赖其他测试状态
5. **提供清晰报告**：包含通过/失败详情和性能指标

### 测试执行建议

1. **开发阶段**：频繁运行单元测试
2. **集成阶段**：运行端到端测试
3. **发布前**：执行完整测试套件和压力测试
4. **性能监控**：定期运行基准测试记录性能趋势

## 未来扩展方向

### 测试覆盖增强
- 添加更多边界条件测试
- 增加错误注入测试
- 扩展多智能体场景测试

### 性能测试扩展
- 添加内存使用监控
- 实现长期稳定性测试
- 添加分布式压力测试

### 自动化集成
- CI/CD流水线集成
- 自动化测试报告生成
- 性能回归检测

## 总结

Tests目录提供了一个完整的分层测试体系，从基础的冒烟测试到复杂的压力测试，全面覆盖了智能体系统的功能、性能和可靠性需求。通过模块化的测试框架设计和丰富的测试场景，确保了系统在各种条件下的正确性和稳定性。

测试架构的关键优势：
1. **分层设计**：清晰的测试层次结构
2. **确定性测试**：Mock模式确保可重复性
3. **性能监控**：全面的延迟和并发测试
4. **易于扩展**：支持自定义测试和场景
5. **实用性强**：提供详细的故障排除指南

这套测试体系为智能体系统的开发和维护提供了坚实的基础保障。