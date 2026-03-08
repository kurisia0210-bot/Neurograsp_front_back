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
    """Raised when LLM call cannot produce a valid reply."""


def _resolve_channel_config(channel: str, default_model: str) -> tuple[str, str, str]:
    model = os.getenv(f"{channel}_LLM_MODEL", default_model)
    base_url = os.getenv(
        f"{channel}_LLM_BASE_URL",
        os.getenv("DEEPSEEK_BASE_URL", _DEEPSEEK_BASE_URL_DEFAULT),
    )
    api_key = os.getenv(f"{channel}_LLM_API_KEY", os.getenv("DEEPSEEK_API_KEY", ""))
    return model, base_url, api_key


def chat_source() -> str:
    model, _, _ = _resolve_channel_config("CHAT", _DEEPSEEK_MODEL_DEFAULT)
    return model


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
    model: str,
    base_url: str,
    api_key: str,
    temperature: float = 0.2,
    max_tokens: int = 64,
) -> str:
    if _OPENAI_IMPORT_ERROR is not None or AsyncOpenAI is None:
        raise LLMError(f"LLM SDK import failed: {_OPENAI_IMPORT_ERROR}")

    if not api_key:
        raise LLMError("LLM API key missing")

    try:
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        resp = await client.chat.completions.create(
            model=model,
            messages=list(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        text = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        raise LLMError(f"LLM request failed: {exc}") from exc

    if not text:
        raise LLMError("LLM returned empty text")

    return text


async def game_complete(
    *,
    messages: Sequence[dict],
    temperature: float = 0.2,
    max_tokens: int = 64,
) -> str:
    model, base_url, api_key = _resolve_channel_config("GAME", _DEEPSEEK_MODEL_DEFAULT)
    return await complete(
        messages=messages,
        model=model,
        base_url=base_url,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def chat_complete(
    *,
    messages: Sequence[dict],
    temperature: float = 0.2,
    max_tokens: int = 64,
) -> str:
    model, base_url, api_key = _resolve_channel_config("CHAT", _DEEPSEEK_MODEL_DEFAULT)
    return await complete(
        messages=messages,
        model=model,
        base_url=base_url,
        api_key=api_key,
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def greeting_strict(task: str) -> str:
    return await chat_complete(messages=build_greeting_messages(task))


async def finish_feedback(task: str, finish_reason: str) -> str:
    return await game_complete(
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
    "chat_complete",
    "chat_source",
    "complete",
    "finish_feedback",
    "game_complete",
    "greeting",
    "greeting_strict",
]
