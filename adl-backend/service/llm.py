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

_DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
_DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
_DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

_GREETING_FALLBACK = "Nice to meet you too."
_GREETING_SYSTEM_PROMPT = (
    "You are a polite assistant. "
    "Reply with one short, friendly greeting sentence only."
)


def build_greeting_messages(task: str) -> list[dict]:
    return [
        {"role": "system", "content": _GREETING_SYSTEM_PROMPT},
        {"role": "user", "content": f"User says: {task or 'hello'}"},
    ]


async def complete(
    *,
    messages: Sequence[dict],
    model: str = _DEEPSEEK_MODEL,
    temperature: float = 0.2,
    max_tokens: int = 64,
) -> str:
    if _OPENAI_IMPORT_ERROR is not None or AsyncOpenAI is None:
        print(f"[WARN] LLM SDK import failed: {_OPENAI_IMPORT_ERROR}")
        return ""

    if not _DEEPSEEK_API_KEY:
        print("[WARN] DEEPSEEK_API_KEY missing")
        return ""

    try:
        client = AsyncOpenAI(api_key=_DEEPSEEK_API_KEY, base_url=_DEEPSEEK_BASE_URL)
        resp = await client.chat.completions.create(
            model=model,
            messages=list(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        print(f"[LLM ERROR] model={model} err={exc}")
        return ""


async def greeting(task: str) -> str:
    text = await complete(messages=build_greeting_messages(task))
    return text or _GREETING_FALLBACK


__all__ = [
    "build_greeting_messages",
    "complete",
    "greeting",
]
