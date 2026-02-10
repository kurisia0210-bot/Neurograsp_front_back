import json
import re
from collections import deque
from schema.payload import ObservationPayload, ActionPayload, SystemResponses, AgentActionType
from service.llm_client import get_completion
from core.memory import episodic_memory 
from service.vector_db import vector_db


class Watchdog:
    def __init__(self, history_limit=5, idle_threshold=3):
        """
        :param history_limit: 滑动窗口大小，用于检测循环 (Loop)
        :param idle_threshold: 连续空转阈值，用于检测犹豫 (Hesitation)
        """
        self.history_limit = history_limit
        self.idle_threshold = idle_threshold
        
        # 1. 针对“光想不做”：连续 IDLE/THINK 计数器
        self.idle_streak = 0
        
        # 2. 针对“鬼打墙”：保留最近 N 次动作的签名 (Signature)
        # deque 是一个双端队列，maxlen 会自动挤掉旧数据，非常适合做滑动窗口
        self.action_window = deque(maxlen=history_limit)

    def _get_signature(self, action: ActionPayload) -> str:
        """
        提取动作的'指纹'。
        关键：必须忽略 action.content (LLM的碎碎念)，只看它实际上想干嘛。
        """
        # 格式：TYPE:TARGET_ITEM:TARGET_POI
        # 例如：MOVE_TO:None:fridge_zone 或 INTERACT:fridge_main:None
        return f"{action.type}:{action.target_item}:{action.target_poi}"

    def inspect(self, action: ActionPayload) -> bool:
        """
        审查当前的动作。
        如果发现异常（死循环/空转），返回 True (报警)。
        """
        signature = self._get_signature(action)

        # === 🕵️‍♂️ 检测 1: 思想巨人 (Consecutive Thinking) ===
        if action.type in ["THINK", "IDLE"]:
            self.idle_streak += 1
            if self.idle_streak >= self.idle_threshold:
                print(f"🐕 Watchdog Barking: Agent is idling too long! ({self.idle_streak})")
                return True # 报警！
        else:
            self.idle_streak = 0 # 只要动手了，空转计数归零

        # === 🕵️‍♂️ 检测 2: 鬼打墙 (Loop Detection) ===
        self.action_window.append(signature)
        
        # 只有当窗口填满时（收集了足够多的证据）才开始判断
        if len(self.action_window) == self.history_limit:
            unique_moves = set(self.action_window)
            # 判定逻辑：如果你走了 5 步，但实际上只在 1-2 种操作里打转
            # 比如: A -> B -> A -> B -> A (5步，只有 A,B 两种) -> 判定为 Loop
            if len(unique_moves) <= 2:
                print(f"🐕 Watchdog Barking: Agent is running in circles! {list(unique_moves)}")
                return True # 报警！

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
        if self.watchdog.inspect(action_payload):
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