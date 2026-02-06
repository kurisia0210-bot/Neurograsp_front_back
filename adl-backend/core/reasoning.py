# [额叶] 决策与推理。
# 职责：纯逻辑和 LLM 提示策略。
# 理由：将"如何思考"（提示）与"何时思考"（循环）分开。

# core/reasoning.py
# Milestone 7: The Advisory Layer
# 职责：它是 LLM 和 Agent 之间的中间人。它负责构建 Context 并解析 Proposal。

import json
import re
from schema.payload import ObservationPayload, ActionPayload, SystemResponses
from service.llm_client import get_completion
from core.memory import episodic_memory # 导入
from service.vector_db import vector_db

# ==========================================
# 1. System Prompt (灵魂)
# ==========================================
SYSTEM_PROMPT = """
You are COALA, an embodied intelligent agent helper.
Your goal is to help the user with kitchen tasks.

### CRITICAL THINKING RULES
1. TASK DECOMPOSITION: Break complex tasks into atomic steps
2. PRECONDITION CHECKING: Before performing an action, ensure all preconditions are met
3. FAILURE ANALYSIS: When an action fails, analyze WHY and propose a FIX
4. ADAPTIVE PLANNING: If stuck, reconsider your approach

### COMMON PRECONDITIONS
- To INTERACT with an item (e.g., put cube in fridge), you must HOLD the item first
- If hands are empty, you must INTERACT with the item to pick it up
- To MOVE_TO a location, you must not already be there
- If an action fails due to "hands empty", the solution is to PICK UP the item

### CAPABILITIES
- You can MOVE_TO(target_poi)
- You can INTERACT(target_item) - to pick up, put down, or use items
- You can THINK(content) if confused
- You can FINISH(content) if task is done

### FORMAT INSTRUCTIONS
1. Output ONLY a valid JSON object.
2. NO Markdown code blocks.
3. NO conversational filler.

### JSON SCHEMA
{
  "type": "MOVE_TO" | "INTERACT" | "THINK" | "FINISH",
  "target_poi": "fridge_zone" | "table_center" | "stove_zone" | null,
  "target_item": "red_cube" | "half_cube_left" | "half_cube_right" | "fridge_main" | "fridge_door" | "stove" | "table_surface" | null,
  "content": "Short reasoning for this action"
}
"""

async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    接收观察 -> 检索记忆(M8+M9) -> 构建提示词 -> 获取建议
    """
    
    cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
    
    if cube and cube.state == "in_fridge":
        print("🏆 [Reasoning]: Victory condition met. Stopping LLM.")
        return ActionPayload(
            type="FINISH", 
            content="I have successfully placed the red cube in the fridge."
        )
        
    # ==========================================
    # 🧠 [M9] 语义记忆检索 (Semantic Retrieval) 👈 NEW
    # ==========================================
    # 1. 构造查询意图
 # 1. 构造查询上下文 (Query Context)
    # 我们想问数据库："我现在在 {location}，周围有 {objects}，以前有没有学到什么教训？"
    nearby_names = ", ".join([obj.id for obj in obs.nearby_objects])
    query_context = f"Action at {obs.agent.location}. Nearby: {nearby_names}. Holding: {obs.agent.holding}"
    
    # 2. 去 Vector DB 查 Top-3 规则
    # 比如：如果 current_location 是 table_center，它应该能把 "NEVER interact with table_center" 捞出来
    relevant_rules = vector_db.query_relevant_rules(query_context, top_k=3)
    
    # ✅ FIX: 统一变量名为 semantic_block
    semantic_block = "" 
    if relevant_rules:
        rules_str = "\n".join([f"- {rule}" for rule in relevant_rules])
        semantic_block = f"""
[🧠 KNOWN CONSTRAINTS / LEARNED BIAS]
The following are critical rules learned from past experience. You MUST follow them:
{rules_str}
"""
        print(f"📘 [M9] Injected {len(relevant_rules)} semantic rules: {rules_str}")
    else:
        # 可选：打印日志确认没有查到规则，防止"以为查到了其实没查到"
        print(f"📘 [M9] No semantic rules found for context.")

    # [M8] 检索上次失败
    last_fail_ep = episodic_memory.get_last_failure()
    failure_context = ""
    
    if last_fail_ep:
        res = last_fail_ep.execution_result
        act = last_fail_ep.action
        failure_context = f"""
[❌ LAST ACTION FAILED]
- Action: {act.type} {act.target_item or act.target_poi}
- Error: {res.failure_reason}
(Immediate Correction Required!)
"""
        
        # 针对不同失败类型给出具体建议
        advice = ""
        if res.failure_type == "SCHEMA_ERROR":
            advice = "CRITICAL: Your previous JSON was INVALID. You used a value not allowed by the Enum. Check the error message strictly!"
        elif res.failure_type == "REFLEX_BLOCK":
            # 针对"手是空的"错误给出具体指导
            if "hands empty" in res.failure_reason.lower() or "hand is empty" in res.failure_reason.lower():
                advice = "CRITICAL: Your hands are empty! To put something somewhere, you must FIRST pick it up. The solution is to INTERACT with the item to pick it up."
            elif "door closed" in res.failure_reason.lower():
                advice = "CRITICAL: The fridge door is closed! To put something in the fridge, you must FIRST open the door. The solution is to INTERACT with fridge_door."
            elif "already at" in res.failure_reason.lower() or "already there" in res.failure_reason.lower():
                advice = "CRITICAL: You are already at that location! Do not MOVE_TO the same place. Choose a different action."
            else:
                advice = "Analyze the failure reason and propose a concrete fix."
        
        failure_context = f"""
[⚠️ LAST ACTION FAILED]
- Action Attempted: {act.type} ({act.target_item or act.target_poi})
- Failure Type: {res.failure_type}
- Error Message: {res.failure_reason} 

{advice}
"""
        print(f"🛡️ [M8] Injecting Failure Context: {res.failure_reason}")
        if advice:
            print(f"💡 [M8] Advice: {advice}")

    # ==========================================
    # 📝 构建最终 Prompt
    # ==========================================
    # 辅助信息构建
    nearby_desc = []
    for obj in obs.nearby_objects:
        desc = f"{obj.id}({obj.state})"
        if obj.relation:
            desc += f" [{obj.relation}]"
        nearby_desc.append(desc)
    nearby_str = ", ".join(nearby_desc) if nearby_desc else "Nothing special"

# ✅ 核心修复：把 semantic_block 塞进 user_msg
    # 这里的顺序体现了认知优先级：
    # 1. 长期记忆 (Semantic Block) -> 告诉我一般不能做什么
    # 2. 短期记忆 (Failure Context) -> 告诉我刚才做错了什么
    # 3. 当前状态 (Current State) -> 告诉我现在的环境
    user_msg = f"""
    {semantic_block} 
    
    {failure_context}
    
    [CURRENT STATE]
    - Time: {obs.timestamp}
    - Location: {obs.agent.location}
    - Holding: {obs.agent.holding}
    - Nearby: {nearby_str}
    
    [GLOBAL TASK]
    {obs.global_task}
    
    Based on the Known Constraints and State, what is the next ATOMIC action?
    """

    print(f"🤔 [Reasoning] Context loaded. Semantic Injection: {'YES' if semantic_block else 'NO'}")

    # 3. 调用 LLM (使用刚刚写的 Milestone 6)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg}
    ]
    
    raw_content = await get_completion(messages)
    
    # 4. 解析与清洗 (Parsing & Cleaning)
    if not raw_content:
        return SystemResponses.SILENCE

    print(f"💡 [LLM Proposal]: {raw_content}")

    try:
        # 去掉可能存在的 markdown 符号
        clean_content = re.sub(r"```json|```", "", raw_content).strip()
        data = json.loads(clean_content)
        
        # 转换为标准的动作载荷
        return ActionPayload(**data)

    except json.JSONDecodeError:
        print(f"❌ JSON Parse Error. Raw: {raw_content}")
        return SystemResponses.CONFUSED
    except Exception as e:
        print(f"❌ Reasoning Error: {e}")
        # 如果是ValidationError，提供更详细的错误信息
        if "ValidationError" in str(type(e).__name__):
            error_msg = f"Schema Validation Failed: {str(e)}"
            print(f"🔥 [Schema Error Details]: {error_msg}")
            # 返回一个包含详细错误信息的CONFUSED响应
            return ActionPayload(
                type="THINK",
                content=f"Schema Error: {str(e)[:100]}..."  # 截断以避免过长
            )
        return SystemResponses.CONFUSED
