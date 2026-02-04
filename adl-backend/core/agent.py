# core/agent.py
# Milestone 7: The Integration (Fixed for Traceability)
# 核心控制器职责：
# 1. 记忆归档 (Commit Memory) 👈 NEW
# 2. 问军师 (Reasoning Layer) -> 拿到建议
# 3. 问宪法 (Reflex Layer) -> 拿到判决
# 4. 记忆暂存 (Stage Memory) 👈 NEW
# 5. 执行或驳回

from pydantic import ValidationError
from schema.payload import (
    ObservationPayload, AgentStepResponse, ReflexVerdictModel,
    AgentActionType, ActionPayload, ActionExecutionResult, FailureType
)
from service.adl_rules import evaluate_reflex
from core.reasoning import analyze_and_propose

# ✅ 修复 1: 导入记忆单例，解决"幽灵记忆"问题
from core.memory import episodic_memory

async def step(obs: ObservationPayload) -> AgentStepResponse:
    # 1. 归档上一帧 (Keep)
    episodic_memory.commit(obs)

    # [M8] 初始化变量
    intent = None
    exec_result = None

    try:
        # 2. Reasoning (可能会爆 Schema Error)
        intent = await analyze_and_propose(obs)
        
        # 处理 Reasoning 返回的 CONFUSED (DoD 8.1)
        if intent.type == AgentActionType.THINK and "Confused" in intent.content:
             # 如果是 SystemResponses.CONFUSED
             exec_result = ActionExecutionResult(
                 success=False,
                 failure_type=FailureType.SCHEMA_ERROR,
                 failure_reason=intent.content
             )
        
    except ValidationError as e:
        print(f"🔥 [M8] Schema Error Caught: {e}")
        
        # ✅ 修复：创建完整的intent对象，避免intent为None
        intent = ActionPayload(
            type=AgentActionType.THINK,
            content=f"Schema Validation Failed: {str(e)}"
        )
        
        # ✅ 正确写法：把整个 Pydantic 的报错甩给 LLM
        # 这样它才能看到 "input_value='table_center'" 这个关键信息
        exec_result = ActionExecutionResult(
            success=False,
            failure_type=FailureType.SCHEMA_ERROR,
            failure_reason=f"System Rejection: {str(e)}"
        )
    
    # 3. Reflex (如果 Schema 没挂，继续检查物理规则)
    if exec_result is None: # 说明 Reasoning 成功了
        verdict_resp = evaluate_reflex(intent, obs)
        
        if verdict_resp.verdict == "BLOCK":
            # [M8] 记录 Reflex 拒绝
            exec_result = ActionExecutionResult(
                success=False,
                failure_type=FailureType.REFLEX_BLOCK,
                failure_reason=verdict_resp.message
            )
        else:
            # 成功
            exec_result = ActionExecutionResult(success=True)

    # 4. [M8] 暂存记忆 (带上结果！)
    # 无论成功还是失败，都要记下来。
    # 如果是 BLOCK，下一次 LLM 就能看到 "Last Action: INTERACT -> Result: BLOCKED (Door closed)"
    episodic_memory.stage_action(intent, exec_result)
    
    # 5. 返回给前端
    # (注意：如果发生了 Schema Error，我们可能需要构造一个兜底的 AgentStepResponse)
    return AgentStepResponse(
        intent=intent,
        reflex_verdict=ReflexVerdictModel(
            verdict="BLOCK" if not exec_result.success else "ALLOW",
            message=exec_result.failure_reason
        )
    )