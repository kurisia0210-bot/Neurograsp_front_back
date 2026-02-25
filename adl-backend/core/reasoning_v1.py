import json
import re
from schema.payload import ObservationPayload, ActionPayload, SystemResponses, AgentActionType
from service.llm_client import get_completion
from core.memory import episodic_memory 
from service.vector_db import vector_db
from core.watchdog import Watchdog
from core.prompt_templates import GAME1_SYSTEM_PROMPT
from typing import Optional



# ==========================================
# ReasoningEngine Class
# ==========================================
class ReasoningEngine:
    """
    推理引擎核心类，负责处理观察并生成动作建议
    
    主要职责：
    1. 多游戏模式路由（厨房任务 vs 记忆拨号）
    2. 集成M8（失败学习）和M9（语义规则）到提示工程
    3. 调用LLM生成动作建议
    4. 通过Watchdog监控认知停滞
    
    设计模式：策略模式 + 模板方法模式
    """
    
    def _make_action(self, obs: ObservationPayload, **kwargs) -> ActionPayload:
        """
        创建带有追踪键的动作对象
        
        Args:
            obs: 观察对象，包含session/episode/step追踪信息
            **kwargs: 动作的其他参数
            
        Returns:
            ActionPayload: 包含完整追踪信息的标准动作对象
        """
        return ActionPayload(
            session_id=obs.session_id,
            episode_id=obs.episode_id,
            step_id=obs.step_id,
            **kwargs
        )
    
    # System Prompt (Game 1: Kitchen)
    SYSTEM_PROMPT = GAME1_SYSTEM_PROMPT

    def __init__(self):
        """
        初始化推理引擎
        
        创建Watchdog实例用于监控认知停滞，设置默认参数：
        - history_limit=6: 历史窗口大小
        - move_threshold=4: 徘徊检测阈值
        """
        self.watchdog = Watchdog(history_limit=6, move_threshold=4)
        print("🧠 ReasoningEngine Initialized with Watchdog.")

    async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
        """
        主推理方法：处理观察并生成下一个动作建议
        
        处理流程：
        1. 游戏模式路由：检查是否为Game 2（记忆拨号）
        2. 胜利条件检测：检查红方块是否已在冰箱中
        3. 提示工程：构建包含M8/M9信息的LLM提示
        4. LLM调用：获取动作建议
        5. Watchdog检查：检测认知停滞，必要时覆盖动作
        
        Args:
            obs: 观察对象，包含当前世界状态和追踪信息
            
        Returns:
            ActionPayload: 建议的下一个动作
            
        Raises:
            无显式异常抛出，但内部错误会返回THINK动作包含错误信息
        """
        
        # ==============================================================================
        # [Game 2] Short Circuit: Memory Dialing 快速路径
        # ==============================================================================
        if "Game: Memory Dialing" in obs.global_task:
            return await self._handle_game2(obs)
        
        # ==============================================================================
        # [Game 1] Kitchen 标准推理路径
        # ==============================================================================
        
        # 1) 胜利条件检测：检查red_cube是否已在冰箱中
        cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
        if cube and cube.state == "in_fridge":
            print("🏆 [Reasoning]: Victory condition met.")
            return self._make_action(obs,
                type="FINISH", 
                content="I have successfully placed the red cube in the fridge."
            )
        
        # 2) 提示工程：集成M8（失败学习）和M9（语义规则）
        prompt_messages = await self._construct_game1_prompt(obs)
        
        # 3) LLM调用：获取动作建议并解析为ActionPayload
        action_payload = await self._call_llm_and_parse(obs, prompt_messages)
        
        # ==========================================
        # 4) Watchdog 认知停滞检测与干预
        # ==========================================
        #    如果检测到停滞模式，用系统错误提示覆盖原动作
        if self.watchdog.inspect(action_payload, obs):
            verdict = self.watchdog.get_last_verdict() or {}
            rule_id = verdict.get("rule_id", "UNKNOWN")
            reason = verdict.get("reason", "No reason provided")
            print(f"[Watchdog] L2 STAGNATION DETECTED. rule={rule_id} reason={reason}")
            print(self.watchdog.explain_last())
            return self._make_action(
                obs,
                type="THINK",
                content=(
                    "[SYSTEM ERROR]: Cognitive Stagnation Detected. "
                    f"Rule={rule_id}. Reason={reason}. "
                    "STOP and choose a DIFFERENT strategy."
                ),
            )
        
        return action_payload

    # ==========================================
    # ======================== Helper Methods ========================
    # ==========================================
    
    async def _handle_game2(self, obs: ObservationPayload) -> ActionPayload:
        """
        处理Game 2（记忆拨号）的快速路径逻辑
        
        实现自适应难度调整：
        1. 解析当前任务长度和失败次数
        2. 如果连续失败3次以上，降低难度
        3. 使用LLM生成鼓励性消息
        4. 返回调整难度或监控动作
        
        Args:
            obs: 观察对象，包含全局任务描述
            
        Returns:
            ActionPayload: 调整难度动作或监控思考动作
        """
        # 1) 解析任务参数：当前长度和失败次数
        current_len = 3
        fail_count = 0
        
        len_match = re.search(r"Length: (\d+)", obs.global_task)
        if len_match: 
            current_len = int(len_match.group(1))
        
        fail_match = re.search(r"Recent Failures: (\d+)", obs.global_task)
        if fail_match: 
            fail_count = int(fail_match.group(1))
        
        # 2) 自适应难度调整逻辑
        if fail_count >= 3:
            # 降低难度：如果当前长度大于最小值
            if current_len > 3:
                new_len = current_len - 1
                intent = f"User failed {fail_count} times. I am lowering difficulty to {new_len}. Write a very short encouraging message (max 15 words)."
                
                # 调用LLM生成鼓励性消息
                empathy_msgs = [
                    {"role": "system", "content": "You are a warm rehab coach. Output ONLY the message string."},
                    {"role": "user", "content": intent}
                ]
                raw_msg = await get_completion(empathy_msgs)
                message = raw_msg.strip().replace('"', '') if raw_msg else "Let's try an easier level. You can do this!"
                
                print(f"📉 [Short Circuit] Lowering difficulty: {current_len} -> {new_len}")
                return self._make_action(obs,
                    type=AgentActionType.ADJUST_DIFFICULTY,
                    target_length=new_len,
                    content=message
                )
            else:
                # 已经是最低难度，返回鼓励消息
                return self._make_action(obs,
                    type=AgentActionType.THINK,
                    content="Don't give up! We are learning together. Take your time."
                )
        
        # 3) 正常监控状态
        return self._make_action(obs,
            type=AgentActionType.THINK, 
            content="Monitoring user progress..."
        )
    
    async def _construct_game1_prompt(self, obs: ObservationPayload) -> list:
        """
        构建Game 1（厨房任务）的LLM提示
        
        集成两个关键学习机制：
        1. M9（语义规则）：从向量数据库检索相关规则
        2. M8（失败学习）：从记忆系统获取最近失败信息
        
        Args:
            obs: 观察对象，包含当前世界状态
            
        Returns:
            list: 包含系统提示和用户消息的对话列表
        """
        # [M9] 语义规则检索：基于当前上下文查询相关规则
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
        
        # [M8] 失败学习：从当前session/episode获取最近失败
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
[⚠️ LAST ACTION FAILED]
- Action: {act.type} {act.target_item or act.target_poi}
- Error: {res.failure_reason} 
{advice}
"""
        
        # 构建世界状态描述
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
        调用LLM并解析响应为ActionPayload
        
        处理流程：
        1. 调用LLM获取原始响应
        2. 清理响应内容（移除JSON代码块标记）
        3. 解析JSON为字典
        4. 注入追踪键（session_id, episode_id, step_id）
        5. 验证并返回ActionPayload
        
        Args:
            obs: 观察对象，用于获取追踪信息
            messages: LLM对话消息列表
            
        Returns:
            ActionPayload: 解析后的动作对象
            
        Note:
            如果解析失败，返回包含错误信息的THINK动作
        """
        raw_content = await get_completion(messages)
        
        if not raw_content:
            return self._make_action(obs, type="IDLE", content="...")
        
        try:
            clean_content = re.sub(r"```json|```", "", raw_content).strip()
            data = json.loads(clean_content)
            # Inject trace keys from observation.
            data['session_id'] = obs.session_id
            data['episode_id'] = obs.episode_id
            data['step_id'] = obs.step_id
            return ActionPayload(**data)
        except json.JSONDecodeError as e:
            raw_preview = raw_content[:500].replace("\n", "\\n")
            print(f"[JSON ERROR] {e}")
            print(f"[LLM RAW] {raw_preview}")
            return self._make_action(obs, type="THINK", content=f"Invalid JSON from LLM: {str(e)[:100]}")
        except Exception as e:
            raw_preview = raw_content[:500].replace("\n", "\\n")
            print(f"[REASONING ERROR] {e}")
            print(f"[LLM RAW] {raw_preview}")
            return self._make_action(obs, type="THINK", content=f"Schema Error: {str(e)[:100]}")


# ==========================================
# ==================== Backward-Compatible Global API ====================
# ==========================================
_reasoning_engine = ReasoningEngine()

async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    向后兼容的全局API函数
    
    提供与旧版本代码兼容的接口，内部委托给ReasoningEngine实例
    
    Args:
        obs: 观察对象，包含当前世界状态和追踪信息
        
    Returns:
        ActionPayload: 建议的下一个动作
        
    Note:
        这是模块的公共接口，确保与现有调用代码兼容
    """
    return await _reasoning_engine.analyze_and_propose(obs)
