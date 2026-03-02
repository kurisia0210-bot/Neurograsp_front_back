Test1:
Input:python pipeline_test_harness.py
python pipeline_test_harness.py --json

Output1:
python pipeline_test_harness.py
[VectorDB] ChromaDB available, using persistent storage
[VectorDB] Initializing memory at ./chroma_db...
[VectorDB] Memory loaded. Episodes: 1, Semantics: 6
🧠 ReasoningEngine Initialized with Watchdog.
[ReasoningV2] Proposer: MockProposer
[PipelineTestHarness] 4/4 passed
- PASS stage1_proposer (25.92ms)   
- PASS stage2_guard (0.03ms)       
- PASS stage3_route (0.02ms)       
- PASS pipeline_end_to_end (0.02ms)

Output2:
[ReasoningV2] Proposer: MockProposer
[
  {
    "name": "stage1_proposer",
    "passed": true,
    "duration_ms": 0.07660000119358301,
    "detail": "propose() should return ActionPayload",
    "expected": "ActionPayload",
    "actual": "ActionPayload"
  },
  {
    "name": "stage2_guard",
    "passed": true,
    "duration_ms": 0.02340000355616212,
    "detail": "guard_check() should currently be passthrough",
    "expected": "passed=True, reason=NOOP_GUARD, proposal unchanged",
    "actual": "passed=True, reason=NOOP_GUARD, unchanged=True"
  },
  {
    "name": "stage3_route",
    "passed": true,
    "duration_ms": 0.02069998299703002,
    "detail": "actuation_route() should currently return original proposal",
    "expected": "routed == proposal",
    "actual": "True"
  },
  {
    "name": "pipeline_end_to_end",
    "passed": true,
    "duration_ms": 0.016400008462369442,
    "detail": "analyze_and_propose() should return trace-aligned ActionPayload",
    "expected": "valid ActionPayload + trace fields aligned",
    "actual": "type=INTERACT, trace_ok=True"
  }
]

Test2:
Input1:
cd e:\neuroweb\adl-backend
$env:REASONING_PIPELINE="v2"
$env:REASONING_V2_PROPOSER="mock"
python app.py

Input2:
$obs = @{
  session_id   = "manual-session-1"
  episode_id   = $null
  step_id      = 1
  timestamp    = [double]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
  agent        = @{ location="table_center"; holding=$null }
  nearby_objects = @(
    @{ id="red_cube"; state="on_table"; relation="on table" }
    @{ id="fridge_door"; state="closed"; relation="front" }
    @{ id="fridge_main"; state="installed"; relation="storage" }
    @{ id="table_surface"; state="installed"; relation="surface" }
    @{ id="stove"; state="installed"; relation="appliance" }
  )
  global_task  = "Put red cube in fridge"
  last_action  = $null
  last_result  = $null
}
$body = $obs | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://127.0.0.1:8001/api/tick" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10

Output:
[StepSummary] {"event":"step_summary","ts":1771501593.714173,"session_id":"manual-session-1","episode_id":1,"step_id":1,"global_task":"Put red cube in fridge","input":{"last_action":{},"last_result":{},"agent_location":"table_center","agent_holding":null},"output":{"intent":{"type":"INTERACT","target_poi":null,"target_item":"red_cube","interaction_type":"PICK","target_length":null,"content":"MockRule: pick red cube first."},"execution_result":{"success":true,"failure_type":null,"failure_reason":""},"reflex_verdict":{"verdict":"ALLOW","message":""},"error":{"error_code":"OK","module":"none","severity":"INFO","description":"Step completed without error.","detail":"","extra":{}}}}

Test3:
Input1:
$env:REASONING_PIPELINE="v2"
$env:REASONING_V2_PROPOSER="v1"
python app.py
Input2:
$obs = @{
  session_id   = "manual-session-1"
  episode_id   = $null
  step_id      = 1
  timestamp    = [double]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
  agent        = @{ location="table_center"; holding=$null }
  nearby_objects = @(
    @{ id="red_cube"; state="on_table"; relation="on table" }
    @{ id="fridge_door"; state="closed"; relation="front" }
    @{ id="fridge_main"; state="installed"; relation="storage" }
    @{ id="table_surface"; state="installed"; relation="surface" }
    @{ id="stove"; state="installed"; relation="appliance" }
  )
  global_task  = "Put red cube in fridge"
  last_action  = $null
  last_result  = $null
}
$body = $obs | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://127.0.0.1:8001/api/tick" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10

Output:
[StepSummary] {"event":"step_summary","ts":1771501817.9275413,"session_id":"manual-session-1","episode_id":1,"step_id":1,"global_task":"Put red cube in fridge","input":{"last_action":{},"last_result":{},"agent_location":"table_center","agent_holding":null},"output":{"intent":{"type":"INTERACT","target_poi":null,"target_item":"red_cube","interaction_type":"PICK","target_length":null,"content":"Pick up cube first"},"execution_result":{"success":true,"failure_type":null,"failure_reason":""},"reflex_verdict":{"verdict":"ALLOW","message":""},"error":{"error_code":"OK","module":"none","severity":"INFO","description":"Step completed without error.","detail":"","extra":{}}}}

---

## 🔍 测试数据分析报告

### **📊 测试概览**
- **总测试轮次**: 3轮
- **测试类型**: 单元测试 + 集成测试 + 端到端测试
- **测试结果**: 全部通过，系统功能正常

### **🎯 关键发现**

#### **1. 测试工具性能异常（Test1）**
- **人类可读输出**: stage1_proposer耗时25.92ms，其他测试<0.1ms
- **JSON输出**: 所有测试耗时<0.1ms（包括stage1_proposer）
- **分析**: 存在明显的**缓存效应**，第二次运行（JSON模式）利用了缓存

#### **2. MockProposer vs V1Proposer对比（Test2 vs Test3）**
- **MockProposer输出**: `"content":"MockRule: pick red cube first."`
- **V1Proposer输出**: `"content":"Pick up cube first"`
- **分析**: 两者逻辑一致，但V1Proposer使用更自然的语言

#### **3. 系统集成验证成功**
- ✅ 环境变量切换正常（REASONING_PIPELINE="v2"）
- ✅ Proposer切换正常（mock ↔ v1）
- ✅ API接口工作正常（/api/tick）
- ✅ 记忆系统加载正常（ChromaDB初始化）

### **⚠️ 潜在问题识别**

#### **1. 测试缓存问题**
- **症状**: 连续测试时间差异巨大（25.92ms → 0.076ms）
- **影响**: 性能测量不准确，可能掩盖真实性能问题
- **建议**: 每个测试使用独立的pipeline实例

#### **2. 测试覆盖不足**
- **当前**: 只验证类型和基本字段
- **缺失**: 动作内容验证、边界条件、错误处理
- **建议**: 添加黄金测试和场景测试

#### **3. 时间测量精度**
- **问题**: 使用`time.perf_counter()`但受缓存影响
- **建议**: 添加预热阶段或重置机制

### **🚀 系统状态评估**

#### **架构层面 ✅**
- 策略模式实现正确（Proposer协议）
- 管道模式工作正常（三阶段处理）
- 环境变量配置有效

#### **功能层面 ✅**
- MockProposer规则引擎正确
- V1Proposer委托调用正常
- API接口响应正确

#### **性能层面 ⚠️**
- 缓存效应明显，需要进一步分析
- 真实性能需要更准确的测量

### **📋 改进建议**

#### **立即行动（高优先级）**
1. 修复测试缓存问题
2. 添加测试隔离机制
3. 验证端到端场景的正确性

#### **中期改进**
1. 添加内容验证测试
2. 创建黄金测试套件
3. 添加性能基准测试

#### **长期规划**
1. 集成到CI/CD流水线
2. 添加覆盖率报告
3. 创建压力测试场景

### **🎯 结论**
推理v2架构实现正确，核心功能工作正常。主要问题在于测试工具的缓存效应，需要修复以确保测试的准确性和可靠性。系统已具备从mock到v1的无缝切换能力，为后续开发奠定了良好基础。

**总体评分**: 8.5/10 ✅

Round2:
test1:
input:
cd e:\neuroweb\adl-backend
python pipeline_test_harness.py
python pipeline_test_harness.py --json
python pipeline_test_harness.py --repeat 100 --warmup 10

Output:
[VectorDB] ChromaDB available, using persistent storage
[VectorDB] Initializing memory at ./chroma_db...
[VectorDB] Memory loaded. Episodes: 1, Semantics: 6
🧠 ReasoningEngine Initialized with Watchdog.
[ReasoningV2] Proposer: MockProposer
[PipelineTestHarness] 4/4 passed
[Note] Latency here is logic-only in-process timing (no HTTP/network/UI).
- PASS stage1_proposer (avg=0.013ms p50=0.012ms p95=0.015ms min=0.012ms max=0.015ms runs=20)
- PASS stage2_guard (avg=0.015ms p50=0.014ms p95=0.016ms min=0.013ms max=0.017ms runs=20)
- PASS stage3_route (avg=0.014ms p50=0.013ms p95=0.014ms min=0.013ms max=0.014ms runs=20)
- PASS pipeline_end_to_end (avg=0.013ms p50=0.013ms p95=0.014ms min=0.013ms max=0.015ms runs=20)
(E:\conda_envs\ng) PS E:\neuroweb\adl-backend> python pipeline_test_harness.py --json
[VectorDB] ChromaDB available, using persistent storage
[VectorDB] Initializing memory at ./chroma_db...
[VectorDB] Memory loaded. Episodes: 1, Semantics: 6
🧠 ReasoningEngine Initialized with Watchdog.
[ReasoningV2] Proposer: MockProposer
[
  {
    "name": "stage1_proposer",
    "passed": true,
    "duration_ms": 0.0122300029033795,
    "runs": 20,
    "min_ms": 0.011899974197149277,
    "p50_ms": 0.012100033927708864,
    "p95_ms": 0.012599979527294636,
    "max_ms": 0.012699980288743973,
    "detail": "propose() should return ActionPayload",
    "expected": "ActionPayload",
    "actual": "ActionPayload"
  },
  {
    "name": "stage2_guard",
    "passed": true,
    "duration_ms": 0.013655005022883415,
    "runs": 20,
    "min_ms": 0.013399985618889332,
    "p50_ms": 0.01360004534944892,
    "p95_ms": 0.013899989426136017,
    "max_ms": 0.013899989426136017,
    "detail": "guard_check() should currently be passthrough",
    "expected": "passed=True, reason=NOOP_GUARD, proposal unchanged",
    "actual": "passed=True, reason=NOOP_GUARD, unchanged=True"
  },
  {
    "name": "stage3_route",
    "passed": true,
    "duration_ms": 0.014024999109096825,
    "runs": 20,
    "min_ms": 0.01309998333454132,
    "p50_ms": 0.013599987141788006,
    "p95_ms": 0.014500052202492952,
    "max_ms": 0.02099998528137803,
    "detail": "actuation_route() should currently return original proposal",
    "expected": "routed == proposal",
    "actual": "True"
  {
    "name": "pipeline_end_to_end",
    "passed": true,
    "duration_ms": 0.01361999602522701,
    "runs": 20,
    "min_ms": 0.01279998105019331,
    "p50_ms": 0.013299984857439995,
    "p95_ms": 0.015300000086426735,
    "max_ms": 0.015500001609325409,
    "detail": "analyze_and_propose() should return trace-aligned ActionPayload",
    "expected": "valid ActionPayload + trace fields aligned",
    "actual": "type=INTERACT, trace_ok=True"
  }
]
(E:\conda_envs\ng) PS E:\neuroweb\adl-backend> python pipeline_test_harness.py --repeat 100 --warmup 10      
[VectorDB] ChromaDB available, using persistent storage
[VectorDB] Initializing memory at ./chroma_db...
[VectorDB] Memory loaded. Episodes: 1, Semantics: 6
🧠 ReasoningEngine Initialized with Watchdog.
[ReasoningV2] Proposer: MockProposer
[PipelineTestHarness] 4/4 passed
[Note] Latency here is logic-only in-process timing (no HTTP/network/UI).
- PASS stage1_proposer (avg=0.014ms p50=0.013ms p95=0.016ms min=0.013ms max=0.026ms runs=100)
- PASS stage2_guard (avg=0.015ms p50=0.015ms p95=0.015ms min=0.014ms max=0.019ms runs=100)
- PASS stage3_route (avg=0.015ms p50=0.015ms p95=0.015ms min=0.014ms max=0.018ms runs=100)
- PASS pipeline_end_to_end (avg=0.014ms p50=0.014ms p95=0.016ms min=0.013ms max=0.022ms runs=100)