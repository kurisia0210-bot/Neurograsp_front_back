import json
import re
from schema.payload import ObservationPayload, ActionPayload, SystemResponses, AgentActionType
from service.llm_client import get_completion
from core.memory import episodic_memory 
from service.vector_db import vector_db

# ==========================================
# 1. System Prompt (Game 1: Kitchen)
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
    接收观察 -> (Game 2 短路判断) -> (Game 1 深度推理)
    """

    # ==============================================================================
    # 🎮 [Game 2 Short Circuit] Memory Dialing Logic
    # ------------------------------------------------------------------------------
    # 这是一个 MVP 实现：
    # 1. 纯 Python 逻辑控制难度 (可控、可解释)
    # 2. 仅在需要安抚时调用 LLM (情感支持)
    # ==============================================================================
    if "Game: Memory Dialing" in obs.global_task:
        # 1. 解析状态 (从字符串中提取数字)
        # 假设 global_task 格式: "... (Length: 3)... Recent Failures: 3."
        current_len = 3
        fail_count = 0
        
        len_match = re.search(r"Length: (\d+)", obs.global_task)
        if len_match: current_len = int(len_match.group(1))
            
        fail_match = re.search(r"Recent Failures: (\d+)", obs.global_task)
        if fail_match: fail_count = int(fail_match.group(1))

        # 2. 规则判断 (Rule Engine)
        if fail_count >= 3:
            # 🛑 触发降级机制
            if current_len > 3:
                new_len = current_len - 1
                intent = f"User failed {fail_count} times. I am lowering difficulty to {new_len}. Write a very short encouraging message (max 15 words)."
                
                # 3. 调用 LLM 生成台词 (Empathy Engine)
                # MVP 提示词：只负责说话，不负责决策
                empathy_msgs = [
                    {"role": "system", "content": "You are a warm rehab coach. Output ONLY the message string."},
                    {"role": "user", "content": intent}
                ]
                # 这是一个"快思考"，不需要复杂的 Reasoning 逻辑
                raw_msg = await get_completion(empathy_msgs)
                message = raw_msg.strip().replace('"', '') if raw_msg else "Let's try an easier level. You can do this!"

                print(f"⚡ [Short Circuit] Lowering difficulty: {current_len} -> {new_len}")
                return ActionPayload(
                    type=AgentActionType.ADJUST_DIFFICULTY, # 确保 payload.py 里有这个枚举
                    target_length=new_len,
                    content=message
                )
            else:
                # 已经是最低难度，只鼓励不降级
                return ActionPayload(
                    type=AgentActionType.THINK,
                    content="Don't give up! We are learning together. Take your time."
                )
        
        # 3. 如果没触发规则，保持安静 (Pass)
        # 这里返回 IDLE，避免 LLM 产生幻觉
        return ActionPayload(type=AgentActionType.THINK, content="Monitoring user progress...")

    # ==============================================================================
    # 🧠 [Game 1 Logic] Deep Reasoning (Kitchen Tasks)
    # ------------------------------------------------------------------------------
    # 以下是原有的复杂推理逻辑，只有非 Game 2 任务会走到这里
    # ==============================================================================
    
    cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
    
    if cube and cube.state == "in_fridge":
        print("🏆 [Reasoning]: Victory condition met. Stopping LLM.")
        return ActionPayload(
            type="FINISH", 
            content="I have successfully placed the red cube in the fridge."
        )
        
    # [M9] 语义记忆检索
    nearby_names = ", ".join([obj.id for obj in obs.nearby_objects])
    query_context = f"Action at {obs.agent.location}. Nearby: {nearby_names}. Holding: {obs.agent.holding}"
    
    relevant_rules = vector_db.query_relevant_rules(query_context, top_k=3)
    
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
        print(f"📘 [M9] No semantic rules found for context.")

    # [M8] 检索上次失败
    last_fail_ep = episodic_memory.get_last_failure()
    failure_context = ""
    
    if last_fail_ep:
        res = last_fail_ep.execution_result
        act = last_fail_ep.action
        
        advice = ""
        if res.failure_type == "SCHEMA_ERROR":
            advice = "CRITICAL: Your previous JSON was INVALID. Check schema!"
        elif res.failure_type == "REFLEX_BLOCK":
            if "hands empty" in res.failure_reason.lower():
                advice = "CRITICAL: Pick up item first!"
            elif "door closed" in res.failure_reason.lower():
                advice = "CRITICAL: Open door first!"
            else:
                advice = "Analyze failure and fix."
        
        failure_context = f"""
[❌ LAST ACTION FAILED]
- Action: {act.type} {act.target_item or act.target_poi}
- Error: {res.failure_reason} 
{advice}
"""

    # 构建 Prompt
    nearby_desc = []
    for obj in obs.nearby_objects:
        desc = f"{obj.id}({obj.state})"
        if obj.relation: desc += f" [{obj.relation}]"
        nearby_desc.append(desc)
    nearby_str = ", ".join(nearby_desc) if nearby_desc else "Nothing special"

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

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg}
    ]
    
    raw_content = await get_completion(messages)
    
    if not raw_content:
        return SystemResponses.SILENCE

    try:
        clean_content = re.sub(r"```json|```", "", raw_content).strip()
        data = json.loads(clean_content)
        return ActionPayload(**data)
    except Exception as e:
        print(f"❌ Reasoning Error: {e}")
        return ActionPayload(type="THINK", content=f"Schema Error: {str(e)[:100]}")