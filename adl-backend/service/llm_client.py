from __future__ import annotations

import os
from typing import Sequence

from dotenv import load_dotenv

try:
    from openai import AsyncOpenAI, APIConnectionError, RateLimitError
    _OPENAI_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    AsyncOpenAI = None
    APIConnectionError = Exception
    RateLimitError = Exception
    _OPENAI_IMPORT_ERROR = exc


# services/llm_client.py
# Responsibility: network call + plain text exchange only.
load_dotenv()

BASE_URL = "https://api.deepseek.com"
API_KEY = os.getenv("DEEPSEEK_API_KEY")
ALLOWED_MODES = {"mock", "deepseek", "disabled"}


class BaseLLMClient:
    async def complete(
        self,
        messages: Sequence[dict],
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
    ) -> str:
        raise NotImplementedError


class DisabledLLMClient(BaseLLMClient):
    async def complete(
        self,
        messages: Sequence[dict],
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
    ) -> str:
        _ = (messages, model, temperature)
        return ""


class MockLLMClient(BaseLLMClient):
    """
    Deterministic mock output for v1 chain tests.
    Scenarios:
    - valid_json: parse should pass.
    - invalid_json: parse should fail and trigger JSON error branch.
    """

    def __init__(self, scenario: str = "valid_json") -> None:
        self._scenario = (scenario or "valid_json").strip().lower()

    async def complete(
        self,
        messages: Sequence[dict],
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
    ) -> str:
        _ = (messages, model, temperature)
        if self._scenario == "invalid_json":
            return '{"type":"MOVE_TO","target_poi":"fridge_zone","content":"Mock invalid JSON"'
        return (
            '{'
            '"type":"MOVE_TO",'
            '"target_poi":"fridge_zone",'
            '"content":"Mock: moving to fridge"'
            '}'
        )


class DeepSeekLLMClient(BaseLLMClient):
    def __init__(self, *, api_key: str | None, base_url: str) -> None:
        self._client = None
        if _OPENAI_IMPORT_ERROR is not None:
            print(f"[WARN] LLM SDK import failed: {_OPENAI_IMPORT_ERROR}")
            return
        if not api_key:
            print("[WARN] DEEPSEEK_API_KEY missing. LLM client disabled.")
            return
        try:
            self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        except Exception as exc:
            print(f"[WARN] LLM Client Init Failed: {exc}")
            self._client = None

    async def complete(
        self,
        messages: Sequence[dict],
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
    ) -> str:
        if not self._client:
            return ""

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=list(messages),
                temperature=temperature,
                max_tokens=500,
                stream=False,
            )
            return response.choices[0].message.content
        except APIConnectionError:
            print("[NETWORK] Cannot connect to DeepSeek")
            return ""
        except RateLimitError:
            print("[RATE_LIMIT] Slow down")
            return ""
        except Exception as exc:
            print(f"[LLM ERROR] {exc}")
            return ""


def _resolve_llm_mode() -> str:
    """
    Canonical switch for LLM runtime.
    Priority:
    1) LLM_MODE=mock|deepseek|disabled
    2) legacy USE_MOCK_LLM=true -> mock
    3) default deepseek
    """
    mode = os.getenv("LLM_MODE", "").strip().lower()
    if mode:
        if mode in ALLOWED_MODES:
            return mode
        print(f"[WARN] Unknown LLM_MODE={mode!r}, fallback to disabled.")
        return "disabled"

    if os.getenv("USE_MOCK_LLM", "false").strip().lower() == "true":
        return "mock"
    return "deepseek"


def build_llm_client(*, mode: str | None = None, mock_scenario: str | None = None) -> BaseLLMClient:
    resolved_mode = (mode or _resolve_llm_mode()).strip().lower()
    if resolved_mode == "mock":
        scenario = (mock_scenario or os.getenv("LLM_MOCK_SCENARIO", "valid_json")).strip().lower()
        return MockLLMClient(scenario=scenario)
    if resolved_mode == "deepseek":
        return DeepSeekLLMClient(api_key=API_KEY, base_url=BASE_URL)
    return DisabledLLMClient()


LLM_MODE = _resolve_llm_mode()
LLM_MOCK_SCENARIO = os.getenv("LLM_MOCK_SCENARIO", "valid_json").strip().lower()
_llm_client: BaseLLMClient = build_llm_client(mode=LLM_MODE, mock_scenario=LLM_MOCK_SCENARIO)


def set_llm_client_for_test(client: BaseLLMClient) -> None:
    global _llm_client
    _llm_client = client


async def get_completion(messages: list, model: str = "deepseek-chat", temperature: float = 0.1) -> str:
    """
    Backward-compatible entry for existing reasoning code.
    """
    return await _llm_client.complete(messages, model=model, temperature=temperature)
