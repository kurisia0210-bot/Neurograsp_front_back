from __future__ import annotations

from typing import Optional

from core.pipeline.proposer.prompt_builder import LLMProposerPromptBuilder
from core.pipeline.proposer.response_parser import LLMProposerResponseParser
from service.llm_client import get_completion
from schema.payload import ActionPayload, ObservationPayload


class LLMProposer:
    """
    LLM-based proposer for v2 pipeline.
    
    基于LLM的v2管道提案器。
    
    职责：
    1. 接收观察数据（ObservationPayload）
    2. 构建LLM提示词
    3. 调用LLM服务获取原始响应
    4. 解析响应为动作（ActionPayload）
    
    设计原则：
    - 自包含设计：可以独立测试，不依赖环境路由
    - 职责分离：提示词构建和响应解析由专门的类处理
    - 错误处理：在解析层处理LLM响应错误
    
    注意：提案器不能决定任务完成（FINISH动作），这是FinishGuard的职责。
    """

    # 不可委托的动作类型：提案器不能生成这些动作
    NON_DELEGABLE_ACTION_TYPES = LLMProposerResponseParser.NON_DELEGABLE_ACTION_TYPES
    # 允许的提案器动作类型
    ALLOWED_PROPOSER_ACTION_TYPES = LLMProposerResponseParser.ALLOWED_PROPOSER_ACTION_TYPES
    # 默认系统提示词
    DEFAULT_SYSTEM_PROMPT = LLMProposerPromptBuilder.DEFAULT_SYSTEM_PROMPT

    def __init__(
        self,
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
        system_prompt: Optional[str] = None,
    ) -> None:
        """
        初始化LLM提案器。
        
        参数：
        - model: LLM模型名称，默认使用deepseek-chat
        - temperature: 温度参数，控制输出的随机性（0.0-1.0）
        - system_prompt: 自定义系统提示词，如果为None则使用默认提示词
        """
        self._model = model
        self._temperature = temperature
        self._prompt_builder = LLMProposerPromptBuilder(system_prompt=system_prompt)
        self._response_parser = LLMProposerResponseParser()

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        """
        根据观察数据生成下一个动作提案。
        
        处理流程：
        1. 使用PromptBuilder构建LLM消息
        2. 调用LLM服务获取原始响应
        3. 使用ResponseParser解析响应为ActionPayload
        4. 返回解析后的动作
        
        参数：
        - obs: 观察数据，包含智能体状态、世界状态、任务信息等
        
        返回：
        - ActionPayload: 解析后的动作，如果解析失败则返回THINK动作
        """
        # 步骤1：构建LLM提示词
        messages = self._prompt_builder.build_messages(obs)
        
        # 步骤2：调用LLM服务
        raw = await get_completion(messages, model=self._model, temperature=self._temperature)
        
        # 步骤3：解析响应
        return self._response_parser.parse_to_action(obs, raw)