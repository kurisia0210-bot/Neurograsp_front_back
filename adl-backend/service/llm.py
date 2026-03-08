from __future__ import annotations

import os
from typing import Sequence

from dotenv import load_dotenv

try:
    from openai import AsyncOpenAI
    _OPENAI_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    AsyncOpenAI = None
    _OPENAI_IMPORT_ERROR = exc


load_dotenv()

_DEEPSEEK_BASE_URL_DEFAULT = "https://api.deepseek.com"
_DEEPSEEK_MODEL_DEFAULT = "deepseek-chat"

_GREETING_FALLBACK = "Nice to meet you too."
_GREETING_SYSTEM_PROMPT = (
    "You are a polite assistant. "
    "Reply with one short, friendly greeting sentence only."
)
_FINISH_SYSTEM_PROMPT = (
    "You are a concise game coach. "
    "Given a completed task, write one short success message for the player. "
    "Use varied wording and avoid fixed templates."
)


class LLMError(RuntimeError):
    """Raised when DeepSeek call cannot produce a valid reply."""


def build_greeting_messages(task: str) -> list[dict]:
    return [
        {"role": "system", "content": _GREETING_SYSTEM_PROMPT},
        {"role": "user", "content": f"User says: {task or 'hello'}"},
    ]


def build_finish_messages(task: str, finish_reason: str) -> list[dict]:
    return [
        {"role": "system", "content": _FINISH_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Task: {task or 'unknown task'}\n"
                f"Finish signal: {finish_reason or 'completed'}\n"
                "Write one short success message in natural language."
            ),
        },
    ]


async def complete(
    *,
    messages: Sequence[dict],
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 64,
) -> str:
    if _OPENAI_IMPORT_ERROR is not None or AsyncOpenAI is None:
        raise LLMError(f"LLM SDK import failed: {_OPENAI_IMPORT_ERROR}")

    resolved_model = model or os.getenv("DEEPSEEK_MODEL", _DEEPSEEK_MODEL_DEFAULT)
    resolved_base_url = os.getenv("DEEPSEEK_BASE_URL", _DEEPSEEK_BASE_URL_DEFAULT)
    resolved_api_key = os.getenv("DEEPSEEK_API_KEY")

    if not resolved_api_key:
        raise LLMError("DEEPSEEK_API_KEY missing")

    try:
        client = AsyncOpenAI(api_key=resolved_api_key, base_url=resolved_base_url)
        resp = await client.chat.completions.create(
            model=resolved_model,
            messages=list(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        text = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        raise LLMError(f"DeepSeek request failed: {exc}") from exc

    if not text:
        raise LLMError("DeepSeek returned empty text")

    return text


async def greeting_strict(task: str) -> str:
    return await complete(messages=build_greeting_messages(task))


async def finish_feedback(task: str, finish_reason: str) -> str:
    return await complete(
        messages=build_finish_messages(task, finish_reason),
        temperature=0.9,
        max_tokens=96,
    )


async def greeting(task: str) -> str:
    """Compatibility helper with fallback."""
    try:
        return await greeting_strict(task)
    except LLMError as exc:
        print(f"[WARN] greeting fallback: {exc}")
        return _GREETING_FALLBACK


__all__ = [
    "LLMError",
    "build_greeting_messages",
    "build_finish_messages",
    "complete",
    "finish_feedback",
    "greeting",
    "greeting_strict",
]
