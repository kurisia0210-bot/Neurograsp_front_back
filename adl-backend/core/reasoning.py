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

# ==========================================
# 1. System Prompt (灵魂)
# ==========================================
SYSTEM_PROMPT = """
You are COALA, an embodied intelligent agent helper.
Your goal is to help the user with kitchen tasks.

### CAPABILITIES
- You can MOVE_TO(target_poi)
- You can INTERACT(target_item)
- You can THINK(content) if confused
- You can FINISH(content) if task is done

### FORMAT INSTRUCTIONS
1. Output ONLY a valid JSON object.
2. NO Markdown code blocks.
3. NO conversational filler.

### JSON SCHEMA
{
  "type": "MOVE_TO" | "INTERACT" | "THINK" | "FINISH",
  "target_poi": "fridge_zone" | "table_center" | null,
  "target_item": "red_cube" | "fridge_door" | "fridge_main" | null,
  "content": "Short reasoning for this action"
}
"""

async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    接收观察 -> 构建提示词 -> 获取建议 -> 解析为意图
    """
    
    cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
    
    if cube and cube.state == "in_fridge":
        print("🏆 [Reasoning]: Victory condition met. Stopping LLM.")
        return ActionPayload(
            type="FINISH", 
            content="I have successfully placed the red cube in the fridge."
        )

    # 1. 上下文构建 (Context Construction)
    # 把复杂的对象列表变成简单的描述字符串
    nearby_desc = []
    for obj in obs.nearby_objects:
        desc = f"{obj.id}({obj.state})"
        if obj.relation:
            desc += f" [{obj.relation}]"
        nearby_desc.append(desc)
    
    nearby_str = ", ".join(nearby_desc) if nearby_desc else "Nothing special"

    # 2. 构建 User Message
    user_msg = f"""
    [CURRENT STATE]
    - Time: {obs.timestamp}
    - Location: {obs.agent.location}
    - Holding: {obs.agent.holding}
    - Nearby: {nearby_str}
    
    [GLOBAL TASK]
    {obs.global_task}
    
    Based on the state, what is the next ATOMIC action?
    """

    print(f"🤔 [Reasoning] Asking LLM...")

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
        return SystemResponses.CONFUSED