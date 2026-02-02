# core/agent.py
# Milestone 7: The Integration
# 核心控制器现在的职责：
# 1. 问军师 (Reasoning Layer) -> 拿到建议
# 2. 问宪法 (Reflex Layer) -> 拿到判决
# 3. 执行或驳回

from schema.payload import ObservationPayload, AgentStepResponse, ReflexVerdictModel # 导入新模型
from service.adl_rules import evaluate_reflex

# ❌ 移除旧的机械脑
# from service.stub_brain import think as brain_think

# ✅ 接入新的 LLM 推理层
from core.reasoning import analyze_and_propose

# async def step(obs: ObservationPayload) -> dict:
#     """
#     Agent 的主循环 (The Loop)
#     """
    
#     # 1. 认知与提案 (Reasoning)
#     # 以前是直接下命令，现在是“提出建议” (Proposal)
#     # 这里会通过 llm_client 调用 DeepSeek
#     intent: ActionPayload = await analyze_and_propose(obs)
    
#     # 2. 反射与审查 (Reflex)
#     # 无论 LLM 多聪明，它的建议必须经过规则引擎的审查
#     # 如果 LLM 产生幻觉（比如想穿墙），这里会返回 BLOCK
#     verdict = evaluate_reflex(intent, obs)
    
#     # 3. 构造返回结果
#     return {
#         "intent": intent,
#         "reflex_verdict": verdict
#     }

async def step(obs: ObservationPayload) -> AgentStepResponse: # ✅ 强类型
    # ... (原有逻辑)
    intent = await analyze_and_propose(obs)
    verdict = evaluate_reflex(intent, obs)
    
    # 构造强类型响应
    return AgentStepResponse(
        intent=intent,
        # 假设 verdict 对象有 .verdict 和 .message 属性
        reflex_verdict=ReflexVerdictModel(
            verdict=verdict.verdict, 
            message=verdict.message
        )
    )