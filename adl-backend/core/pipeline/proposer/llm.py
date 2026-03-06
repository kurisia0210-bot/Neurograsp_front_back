from __future__ import annotations

from typing import Optional

from core.pipeline.proposer.prompt_builder import LLMProposerPromptBuilder
from core.pipeline.proposer.response_parser import LLMProposerResponseParser
from service.llm_client import get_completion
from schema.payload import ActionPayload, ObservationPayload


class LLMProposer:
    """LLM-based proposer."""

    NON_DELEGABLE_ACTION_TYPES = LLMProposerResponseParser.NON_DELEGABLE_ACTION_TYPES
    ALLOWED_PROPOSER_ACTION_TYPES = LLMProposerResponseParser.ALLOWED_PROPOSER_ACTION_TYPES
    DEFAULT_SYSTEM_PROMPT = LLMProposerPromptBuilder.DEFAULT_SYSTEM_PROMPT

    def __init__(
        self,
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
        system_prompt: Optional[str] = None,
    ) -> None:
        self._model = model
        self._temperature = temperature
        self._prompt_builder = LLMProposerPromptBuilder(system_prompt=system_prompt)
        self._response_parser = LLMProposerResponseParser()

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        print(f"[DEBUG LLMProposer] propose: goal_spec={obs.goal_spec}")
        messages = self._prompt_builder.build_messages(obs)
        raw = await get_completion(messages, model=self._model, temperature=self._temperature)
        print(f"[DEBUG LLMProposer] raw response: {raw[:200]}")
        return self._response_parser.parse_to_action(obs, raw)
