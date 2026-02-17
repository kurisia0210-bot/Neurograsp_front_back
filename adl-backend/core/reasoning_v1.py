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
        ⚠️ 关键：如果动作包含报警消息，立即放行，避免死锁！
        """
        
        # === 🚨 死锁防护：如果是 Watchdog 自己的报警消息，直接放行 ===
        if action.type == "THINK" and action.content and ("STAGNATION" in action.content or "SYSTEM ERROR" in action.content):
            return False  # 这是报警消息，不再二次检测
        
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
            # 💤 只是在走位或发呆 (MOVE_TO, THINK, IDLE)
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
    
    def _make_action(self, obs: ObservationPayload, **kwargs) -> ActionPayload:
        """辅助方法：自动注入 session_id 和 step_id"""
        return ActionPayload(
            session_id=obs.session_id,
            episode_id=obs.episode_id,
            step_id=obs.step_id,
            **kwargs
        )
    
    # System Prompt (Game 1: Kitchen)
    SYSTEM_PROMPT = """
You are COALA, an embodied intelligent agent helper.
Your goal is to help the user with kitchen tasks.

### CRITICAL THINKING RULES
1. ACTION > NARRATION: Do not describe what you are going to do. JUST DO IT.
2. PRECONDITION CHECKING: Before performing an action, ensure all preconditions are met.
3. EXPLICIT INTENT: You must explicitly specify the interaction type (PICK, PLACE, SLICE, etc.).
4. ADAPTIVE PLANNING: If you receive a [SYSTEM ERROR], switch strategies immediately.

### CAPABILITIES & CONSTRAINTS
- You can MOVE_TO(target_poi)
- You can INTERACT(target_item, interaction_type)
- **Constraint**: `INTERACT` with `interaction_type="NONE"` implies only touching/inspecting. It does NOT pick up items.

### ACTION RULES - INTERACT (CRITICAL)
The 'INTERACT' action requires a specific `interaction_type` to change the physical world.
**You MUST use one of the following types:**

1. **PICK**: To pick up an item (e.g., cube, knife).
   - Correct: `{"type": "INTERACT", "target_item": "red_cube", "interaction_type": "PICK"}`
   - Precondition: Hands must be empty.

2. **PLACE**: To put down the held item onto a surface or into a container.
   - Correct: `{"type": "INTERACT", "target_item": "table_surface", "interaction_type": "PLACE"}`
   - Precondition: Must be holding an item.

3. **SLICE**: To cut an item (Must be on cutting board).
   - Correct: `{"type": "INTERACT", "target_item": "red_cube", "interaction_type": "SLICE"}`

4. **OPEN / CLOSE / TOGGLE**: For doors, lids, or appliances.
   - Correct: `{"type": "INTERACT", "target_item": "fridge_door", "interaction_type": "OPEN"}`

**NEVER use "NONE" if you intend to move or change an item.**

### FORMAT INSTRUCTIONS
1. Output ONLY a valid JSON object.
2. NO Markdown code blocks.
3. NO conversational filler.

### JSON SCHEMA
{
  "type": "MOVE_TO" | "INTERACT" | "THINK" | "FINISH",
  "target_poi": "fridge_zone" | "table_center" | "stove_zone" | null,
  "target_item": "red_cube" | "fridge_main" | "fridge_door" | "stove" | "table_surface" | null,
  "interaction_type": "PICK" | "PLACE" | "SLICE" | "OPEN" | "CLOSE" | "TOGGLE" | "NONE",
  "content": "Brief reasoning (Keep it under 10 words)"
}

### [ANTI-STAGNATION PROTOCOLS]

**RULE 1: NO "HAMLET" LOOPS (Action > Planning)**
If you know the first step (e.g., Pick up the cube), **DO NOT output a 'THINK' action** to announce it.
- ❌ BAD: `{"type": "THINK", "content": "I will pick up the red cube now."}`
- ✅ GOOD: `{"type": "INTERACT", "target_item": "red_cube", "interaction_type": "PICK"}`

**RULE 2: HANDLING MISSING ITEMS**
If a target container is not visible:
1. First, `PICK` up the item you need to transport.
2. Then, `MOVE_TO` different zones to search.
3. Do NOT freeze in 'THINK' mode.

**RULE 3: EMERGENCY ERROR HANDLING**
If you receive a **[SYSTEM ERROR]** regarding "Stagnation", "Loop", or "Wandering":
1. **STOP** your current plan immediately.
2. **SWITCH STRATEGY**: If you were moving back and forth, stop. If you were trying to pick something up and failed, move closer first.
3. **FORCE ACTION**: Output a physical action (`MOVE` or `INTERACT`), not `THINK`.
"""

    def __init__(self):
        """初始化推理引擎，并创建 Watchdog 实例"""
        self.watchdog = Watchdog(history_limit=6, move_threshold=4)
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
            return self._make_action(obs,
                type="FINISH", 
                content="I have successfully placed the red cube in the fridge."
            )
        
        # 2. 构建 Prompt（集成记忆检索）
        prompt_messages = await self._construct_game1_prompt(obs)
        
        # 3. 调用 LLM 并解析
        action_payload = await self._call_llm_and_parse(obs, prompt_messages)
        
        # ==========================================
        # 🛡️ 看门狗介入 (WATCHDOG CHECK)
        # ==========================================
        # ✅ 新代码: 传入 action_payload 和 obs
        if self.watchdog.inspect(action_payload, obs):
            print("🛑 L2 STAGNATION DETECTED. OVERRIDING ACTION.")
            return self._make_action(obs,
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
                return self._make_action(obs,
                    type=AgentActionType.ADJUST_DIFFICULTY,
                    target_length=new_len,
                    content=message
                )
            else:
                # 已经是最低难度
                return self._make_action(obs,
                    type=AgentActionType.THINK,
                    content="Don't give up! We are learning together. Take your time."
                )
        
        # 3. 未触发规则，保持安静
        return self._make_action(obs,
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
        last_fail_ep = episodic_memory.get_last_failure(
            session_id=obs.session_id,
            episode_id=obs.episode_id
        )
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
    
    async def _call_llm_and_parse(self, obs: ObservationPayload, messages: list) -> ActionPayload:
        """
        调用 LLM 并解析 JSON 响应
        """
        raw_content = await get_completion(messages)
        
        if not raw_content:
            return self._make_action(obs, type="IDLE", content="...")
        
        try:
            clean_content = re.sub(r"```json|```", "", raw_content).strip()
            data = json.loads(clean_content)
            # 注入 trace keys
            data['session_id'] = obs.session_id
            data['episode_id'] = obs.episode_id
            data['step_id'] = obs.step_id
            return ActionPayload(**data)
        except Exception as e:
            print(f"❌ Reasoning Error: {e}")
            return self._make_action(obs, type="THINK", content=f"Schema Error: {str(e)[:100]}")


# ==========================================
# 向后兼容：保留全局函数接口
# ==========================================
_reasoning_engine = ReasoningEngine()

async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    向后兼容的全局函数接口，内部调用 ReasoningEngine 实例
    """
    return await _reasoning_engine.analyze_and_propose(obs)
