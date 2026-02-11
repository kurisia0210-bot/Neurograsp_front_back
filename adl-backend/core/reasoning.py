import json
import re
from collections import deque
from schema.payload import ObservationPayload, ActionPayload, SystemResponses, AgentActionType
from service.llm_client import get_completion
from core.memory import episodic_memory 
from service.vector_db import vector_db
from typing import Optional


class Watchdog:
    def __init__(self, history_limit=6, move_threshold=4):
        """
        :param move_threshold: 允许连续移动/思考的最大次数。
                               厨房很小，连续移动 4 次通常意味着迷路或瞎逛。
        """
        self.history_limit = history_limit
        self.move_threshold = move_threshold
        
        # 1. 基础循环检测 (保留)
        self.action_window = deque(maxlen=history_limit)
        self.state_window = deque(maxlen=history_limit)
        
        # 2. 🆕 生产力剃刀 (解决无效序列 & 进度倒退)
        self.non_productive_streak = 0
        self.last_holding = False # 记忆上一帧的手持状态

    def _get_action_signature(self, action) -> str:
        t_item = getattr(action, 'target_item', 'None')
        t_poi = getattr(action, 'target_poi', 'None')
        return f"{action.type}:{t_item}:{t_poi}"

    def _get_world_hash(self, obs) -> str:
        if not obs or not obs.agent: return "UNKNOWN"
        loc = obs.agent.location
        holding = str(obs.agent.holding)
        return f"LOC:{loc}|HOLD:{holding}"

    def inspect(self, action, obs) -> bool:
        """
        全能审查逻辑
        """
        # ======================================================
        # 🛡️ 逻辑 A: 生产力剃刀 (The Productivity Razor)
        # 解决: 1. 无效动作序列 (乱跑)
        #       2. 进度倒退 (掉落)
        # ======================================================
        
        current_holding = bool(obs.agent.holding)
        
        # [检测进度倒退]: 手里东西没了 (True -> False) 且不是完成任务
        # 这比乱跑更严重，属于"负生产力"，直接报警
        if self.last_holding and not current_holding and action.type != "FINISH":
            print(f"🐕 Watchdog: PROGRESS REGRESSION! Item dropped/lost -> BARK!")
            # 更新状态，防止连续报错
            self.last_holding = current_holding 
            self.non_productive_streak = 0 # 重置计数
            return True

        # 更新记忆
        self.last_holding = current_holding

        # [检测无效序列]: 区分生产性动作
        if action.type in ["PICK", "PLACE", "INTERACT", "FINISH"]:
            # 🎉 做了有意义的事，计数器归零
            self.non_productive_streak = 0
        else:
            # 💤 只是在走位或发呆 (MOVE, THINK, IDLE)
            self.non_productive_streak += 1
            if self.non_productive_streak > self.move_threshold:
                print(f"🐕 Watchdog: Wandering detected! {self.non_productive_streak} steps without interaction -> BARK!")
                return True

        # ======================================================
        # 🛡️ 逻辑 B: 循环与停滞 (原有逻辑，兜底用)
        # ======================================================
        
        # 1. 动作循环 (鬼打墙)
        act_sig = self._get_action_signature(action)
        self.action_window.append(act_sig)
        if len(self.action_window) >= self.history_limit:
            if len(set(self.action_window)) <= 2:
                print(f"🐕 Watchdog: Action Loop -> BARK!")
                return True

        # 2. 状态停滞 (西西弗斯) - 只有非思考动作才检查
        if action.type not in ["THINK", "IDLE"]:
            state_hash = self._get_world_hash(obs)
            self.state_window.append(state_hash)
            if len(self.state_window) >= self.history_limit:
                # 统计状态频率
                counts = {}
                for s in self.state_window: counts[s] = counts.get(s, 0) + 1
                for s, c in counts.items():
                    if c >= 3:
                        print(f"🐕 Watchdog: State Stagnation ({s} x{c}) -> BARK!")
                        return True

        return False

# ==========================================
# ReasoningEngine Class
# ==========================================
class ReasoningEngine:
    """
    推理引擎：负责接收观察、调用 LLM、检索记忆、并通过 Watchdog 监控行为异常。
    """
    
    # System Prompt (Game 1: Kitchen)
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

[CRITICAL INSTRUCTION FOR MULTI-STEP TASKS]
If the task requires multiple steps (e.g., Pick -> Move -> Put) and you can perform the FIRST step immediately:
1. Do NOT output a 'THINK' action to describe the plan.
2. **EXECUTE the first step IMMEDIATELY.**
3. Example: If you need to "put cube in box" and you are empty-handed, do NOT say "I need to pick up the cube". Instead, output specific action: {"type": "INTERACT", "target_item": "red_cube"}.

[HANDLING MISSING ITEMS]
If the target container (e.g., 'magic_box') is NOT visible:
1. Do NOT freeze or just think about it.
2. First, acquire the item (Pick up the cube).
3. Then, start exploring/searching for the missing container.
4. **Action > Planning.**
"""

    def __init__(self):
        """初始化推理引擎，并创建 Watchdog 实例"""
        self.watchdog = Watchdog(history_limit=5, idle_threshold=3)
        print("🧠 ReasoningEngine Initialized with Watchdog.")

    async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
        """
        接收观察 -> (Game 2 短路判断) -> (Game 1 深度推理 + 看门狗审查)
        """
        
        # ==============================================================================
        # 🎮 [Game 2 Short Circuit] Memory Dialing Logic
        # ==============================================================================
        if "Game: Memory Dialing" in obs.global_task:
            return await self._handle_game2(obs)
        
        # ==============================================================================
        # 🧠 [Game 1 Logic] Deep Reasoning (Kitchen Tasks)
        # ==============================================================================
        
        # 1. 胜利检测
        cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
        if cube and cube.state == "in_fridge":
            print("🏆 [Reasoning]: Victory condition met.")
            return ActionPayload(
                type="FINISH", 
                content="I have successfully placed the red cube in the fridge."
            )
        
        # 2. 构建 Prompt（集成记忆检索）
        prompt_messages = await self._construct_game1_prompt(obs)
        
        # 3. 调用 LLM 并解析
        action_payload = await self._call_llm_and_parse(prompt_messages)
        
        # ==========================================
        # 🛡️ 看门狗介入 (WATCHDOG CHECK)
        # ==========================================
        # ✅ 新代码: 传入 action_payload 和 obs
        if self.watchdog.inspect(action_payload, obs):
            print("🛑 L2 STAGNATION DETECTED. OVERRIDING ACTION.")
            return ActionPayload(
                type="THINK",
                content="[SYSTEM ERROR]: Cognitive Stagnation Detected. You are repeating actions or idling without progress. STOP and choose a DIFFERENT strategy."
            )
        
        return action_payload

    # ==========================================
    # 辅助方法 (Helper Methods)
    # ==========================================
    
    async def _handle_game2(self, obs: ObservationPayload) -> ActionPayload:
        """
        Game 2: Memory Dialing 的短路逻辑
        纯 Python 规则引擎 + LLM 情感支持
        """
        # 1. 解析状态
        current_len = 3
        fail_count = 0
        
        len_match = re.search(r"Length: (\d+)", obs.global_task)
        if len_match: 
            current_len = int(len_match.group(1))
        
        fail_match = re.search(r"Recent Failures: (\d+)", obs.global_task)
        if fail_match: 
            fail_count = int(fail_match.group(1))
        
        # 2. 规则判断
        if fail_count >= 3:
            # 触发降级机制
            if current_len > 3:
                new_len = current_len - 1
                intent = f"User failed {fail_count} times. I am lowering difficulty to {new_len}. Write a very short encouraging message (max 15 words)."
                
                # 调用 LLM 生成鼓励台词
                empathy_msgs = [
                    {"role": "system", "content": "You are a warm rehab coach. Output ONLY the message string."},
                    {"role": "user", "content": intent}
                ]
                raw_msg = await get_completion(empathy_msgs)
                message = raw_msg.strip().replace('"', '') if raw_msg else "Let's try an easier level. You can do this!"
                
                print(f"⚡ [Short Circuit] Lowering difficulty: {current_len} -> {new_len}")
                return ActionPayload(
                    type=AgentActionType.ADJUST_DIFFICULTY,
                    target_length=new_len,
                    content=message
                )
            else:
                # 已经是最低难度
                return ActionPayload(
                    type=AgentActionType.THINK,
                    content="Don't give up! We are learning together. Take your time."
                )
        
        # 3. 未触发规则，保持安静
        return ActionPayload(
            type=AgentActionType.THINK, 
            content="Monitoring user progress..."
        )
    
    async def _construct_game1_prompt(self, obs: ObservationPayload) -> list:
        """
        构建 Game 1 的 LLM Prompt，集成 M8/M9 记忆检索
        """
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
        
        # 构建场景描述
        nearby_desc = []
        for obj in obs.nearby_objects:
            desc = f"{obj.id}({obj.state})"
            if obj.relation: 
                desc += f" [{obj.relation}]"
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
        
        return [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ]
    
    async def _call_llm_and_parse(self, messages: list) -> ActionPayload:
        """
        调用 LLM 并解析 JSON 响应
        """
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


# ==========================================
# 向后兼容：保留全局函数接口
# ==========================================
_reasoning_engine = ReasoningEngine()

async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    向后兼容的全局函数接口，内部调用 ReasoningEngine 实例
    """
    return await _reasoning_engine.analyze_and_propose(obs)