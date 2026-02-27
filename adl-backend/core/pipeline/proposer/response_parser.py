from __future__ import annotations

import json
import re
from typing import Set

from core.pipeline.common_v2 import make_action
from schema.payload import ActionPayload, ObservationPayload


class LLMProposerResponseParser:
    """
    LLM提案器响应解析器。
    
    职责：
    1. 解析LLM的原始响应文本
    2. 验证响应格式和内容
    3. 过滤不允许的动作类型
    4. 处理解析错误并返回安全的默认动作
    
    设计原则：
    - 安全性优先：严格限制提案器可以生成的动作类型
    - 错误容忍：对解析错误有完善的错误处理机制
    - 日志记录：记录解析错误以便调试
    - 职责分离：提案器不能决定任务完成，这是FinishGuard的职责
    """
    
    # 硬边界：提案器只能建议操作性的下一步动作
    # 最终完成决定属于FinishGuard，而不是提案器
    NON_DELEGABLE_ACTION_TYPES: Set[str] = {"FINISH"}
    
    # 允许的提案器动作类型
    ALLOWED_PROPOSER_ACTION_TYPES: Set[str] = {"MOVE_TO", "INTERACT", "THINK", "IDLE", "SPEAK"}

    def parse_to_action(self, obs: ObservationPayload, raw_content: str) -> ActionPayload:
        """
        解析LLM原始响应为动作。
        
        处理流程：
        1. 检查空响应
        2. 清理响应文本（移除代码块标记）
        3. 解析JSON
        4. 验证数据结构
        5. 过滤允许的字段
        6. 验证动作类型
        7. 返回解析后的动作或错误处理
        
        参数：
        - obs: 观察数据，用于创建动作的trace字段
        - raw_content: LLM的原始响应文本
        
        返回：
        - ActionPayload: 解析后的动作，如果解析失败则返回THINK动作
        """
        # 1. 检查空响应
        if not raw_content:
            return make_action(obs, type="THINK", content="LLM returned empty content.")

        try:
            # 2. 清理响应文本：移除可能的代码块标记
            clean = re.sub(r"```json|```", "", raw_content).strip()
            
            # 3. 解析JSON
            data = json.loads(clean)
            
            # 4. 验证数据结构
            if not isinstance(data, dict):
                raise ValueError("LLM output must be a JSON object.")

            # 5. 过滤允许的字段
            allowed = {
                "type",           # 动作类型
                "target_poi",     # 目标位置
                "target_item",    # 目标物品
                "interaction_type", # 交互类型
                "target_length",  # 目标长度
                "content",        # 内容描述
            }
            payload_data = {k: v for k, v in data.items() if k in allowed}
            
            # 设置默认值
            payload_data.setdefault("type", "THINK")
            payload_data.setdefault("content", "LLM proposal parsed with defaults.")
            
            # 6. 验证动作类型
            raw_type = payload_data.get("type", "THINK")
            action_type = str(raw_type).upper()

            # 检查不可委托的动作类型（如FINISH）
            if action_type in self.NON_DELEGABLE_ACTION_TYPES:
                return make_action(
                    obs,
                    type="THINK",
                    content=f"Blocked non-delegable action from proposer: {action_type}.",
                )

            # 检查是否在允许的动作类型范围内
            if action_type not in self.ALLOWED_PROPOSER_ACTION_TYPES:
                return make_action(
                    obs,
                    type="THINK",
                    content=f"Unsupported proposer action type: {action_type}.",
                )

            # 7. 返回解析后的动作
            payload_data["type"] = action_type
            return make_action(obs, **payload_data)
            
        except json.JSONDecodeError as exc:
            # JSON解析错误处理
            preview = raw_content[:300].replace("\n", "\\n")
            print(f"[ReasoningV2][LLMProposer] JSON ERROR: {exc}")
            print(f"[ReasoningV2][LLMProposer] RAW: {preview}")
            return make_action(obs, type="THINK", content=f"Invalid JSON from LLM: {str(exc)[:120]}")
            
        except Exception as exc:
            # 其他解析错误处理
            preview = raw_content[:300].replace("\n", "\\n")
            print(f"[ReasoningV2][LLMProposer] PARSE ERROR: {exc}")
            print(f"[ReasoningV2][LLMProposer] RAW: {preview}")
            return make_action(obs, type="THINK", content=f"LLM parse error: {str(exc)[:120]}")

