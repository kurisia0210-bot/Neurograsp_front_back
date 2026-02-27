from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from schema.payload import ObservationPayload


class LLMProposerPromptBuilder:
    """
    LLM提案器提示词构建器。
    
    职责：
    1. 将观察数据（ObservationPayload）转换为LLM可理解的格式
    2. 构建系统提示词和用户提示词
    3. 处理文本清理和长度限制
    4. 格式化目标信息和历史步骤信息
    
    设计特点：
    - 文本清理：防止过长文本和格式问题
    - 结构化输出：确保LLM输出符合JSON格式要求
    - 上下文完整：包含智能体状态、世界状态、任务目标和历史信息
    """
    
    # 文本长度限制常量
    MAX_TASK_CHARS = 240          # 任务描述最大字符数
    MAX_ACTION_CONTENT_CHARS = 120  # 动作内容最大字符数
    MAX_FAILURE_REASON_CHARS = 160  # 失败原因最大字符数
    
    # 默认系统提示词
    DEFAULT_SYSTEM_PROMPT = (
        "You are a safe embodied agent planner. "  # 你是安全的具身智能体规划器
        "Output only one JSON object. "            # 只输出一个JSON对象
        "Schema keys: type, target_poi, target_item, interaction_type, target_length, content. "  # 模式键
        "Allowed type: MOVE_TO, INTERACT, THINK, IDLE, SPEAK. "  # 允许的动作类型
        "NEVER output FINISH. "                    # 永远不要输出FINISH
        "Use short content text."                  # 使用简短的内容文本
    )

    def __init__(self, system_prompt: Optional[str] = None) -> None:
        """
        初始化提示词构建器。
        
        参数：
        - system_prompt: 自定义系统提示词，如果为None则使用默认提示词
        """
        self._system_prompt = system_prompt or self.DEFAULT_SYSTEM_PROMPT

    @staticmethod
    def _enum_value(value) -> str:
        """
        提取枚举值。
        
        处理Pydantic枚举类型，如果值是枚举则提取其value属性，否则直接转换为字符串。
        
        参数：
        - value: 可能是枚举或普通值的输入
        
        返回：
        - 字符串表示的值
        """
        return value.value if hasattr(value, "value") else value

    @staticmethod
    def _sanitize_text(value: object, *, max_chars: int) -> str:
        """
        清理和截断文本。
        
        处理流程：
        1. 将值转换为字符串（None转换为空字符串）
        2. 替换连续空白字符为单个空格
        3. 去除首尾空格
        4. 如果超过最大长度则截断并添加"..."
        
        参数：
        - value: 要清理的值
        - max_chars: 最大字符数限制
        
        返回：
        - 清理后的文本
        """
        text = "" if value is None else str(value)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > max_chars:
            return text[: max_chars - 3] + "..."
        return text

    def _build_goal_input(self, obs: ObservationPayload) -> str:
        """
        构建目标输入信息。
        
        根据观察数据构建任务目标描述，支持两种格式：
        1. 如果有goal_spec：使用结构化JSON格式
        2. 如果没有goal_spec：使用简单的global_task文本
        
        参数：
        - obs: 观察数据
        
        返回：
        - 格式化后的目标描述字符串
        """
        global_task = self._sanitize_text(obs.global_task, max_chars=self.MAX_TASK_CHARS)
        
        # 如果没有目标规范，只使用全局任务
        if obs.goal_spec is None:
            return f'global_task="{global_task}"'

        # 如果有目标规范，构建结构化JSON
        goal_type = self._sanitize_text(obs.goal_spec.goal_type, max_chars=48)
        goal_id = self._sanitize_text(obs.goal_spec.goal_id, max_chars=80)
        goal_dsl = self._sanitize_text(obs.goal_spec.dsl, max_chars=240)
        
        # 处理目标参数
        goal_params = {
            self._sanitize_text(k, max_chars=40): self._sanitize_text(v, max_chars=80)
            for k, v in dict(obs.goal_spec.params or {}).items()
        }
        
        # 构建JSON负载
        payload = {
            "goal_type": goal_type,
            "goal_id": goal_id,
            "dsl": goal_dsl,
            "params": goal_params,
        }
        
        # 转换为紧凑的JSON格式
        goal_spec_json = json.dumps(payload, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
        return f"goal_spec={goal_spec_json} ; global_task_fallback={global_task!r}"

    def _build_last_step_input(self, obs: ObservationPayload) -> str:
        """
        构建上一步骤输入信息。
        
        包含上一次执行的动作和结果，用于提供上下文历史。
        
        参数：
        - obs: 观察数据
        
        返回：
        - 格式化后的历史步骤描述字符串
        """
        # 如果没有历史信息
        if obs.last_action is None and obs.last_result is None:
            return "last_step=none"

        # 构建动作描述
        if obs.last_action is not None:
            action_type = self._enum_value(obs.last_action.type)
            target_item = self._enum_value(obs.last_action.target_item)
            target_poi = self._enum_value(obs.last_action.target_poi)
            interaction_type = self._enum_value(obs.last_action.interaction_type)
            action_content = self._sanitize_text(
                obs.last_action.content,
                max_chars=self.MAX_ACTION_CONTENT_CHARS,
            )
            action_text = (
                f"type={action_type}, target_item={target_item}, "
                f"target_poi={target_poi}, interaction_type={interaction_type}, "
                f"content={action_content!r}"
            )
        else:
            action_text = "none"

        # 构建结果描述
        if obs.last_result is not None:
            failure_type = self._enum_value(obs.last_result.failure_type)
            failure_reason = self._sanitize_text(
                obs.last_result.failure_reason,
                max_chars=self.MAX_FAILURE_REASON_CHARS,
            )
            result_text = (
                f"success={obs.last_result.success}, "
                f"failure_type={failure_type}, "
                f"failure_reason={failure_reason!r}"
            )
        else:
            result_text = "none"

        return f"last_action=({action_text}); last_result=({result_text})"

    def build_messages(self, obs: ObservationPayload) -> List[Dict[str, str]]:
        """
        构建LLM消息列表。
        
        构建完整的对话消息，包含系统提示词和用户提示词。
        用户提示词包含：
        1. 目标信息（任务描述或结构化目标）
        2. 智能体状态（位置、手持物）
        3. 附近物体状态
        4. 历史步骤信息
        
        参数：
        - obs: 观察数据
        
        返回：
        - LLM消息列表，格式为 [{"role": "system", "content": ...}, {"role": "user", "content": ...}]
        """
        # 构建附近物体描述
        nearby_parts: List[str] = []
        for obj in obs.nearby_objects:
            obj_id = self._enum_value(obj.id)
            obj_state = self._enum_value(obj.state)
            relation = f", relation={obj.relation}" if obj.relation else ""
            nearby_parts.append(f"{obj_id}(state={obj_state}{relation})")
        nearby_text = "; ".join(nearby_parts) if nearby_parts else "none"

        # 获取智能体状态
        holding = self._enum_value(obs.agent.holding)
        location = self._enum_value(obs.agent.location)
        
        # 构建目标信息和历史信息
        goal_input = self._build_goal_input(obs)
        last_step_input = self._build_last_step_input(obs)

        # 构建完整的用户提示词
        user_prompt = (
            f"{goal_input}\n"
            f"agent.location={location}\n"
            f"agent.holding={holding}\n"
            f"nearby_objects={nearby_text}\n"
            f"{last_step_input}\n"
            "Return the next atomic action."  # 返回下一个原子动作
        )
        
        # 返回消息列表
        return [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_prompt},
        ]
