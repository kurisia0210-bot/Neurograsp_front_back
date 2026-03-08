from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time

from dotenv import load_dotenv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check DeepSeek API connectivity.")
    parser.add_argument("--model", default=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"), help="DeepSeek model name")
    parser.add_argument("--base-url", default=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"), help="DeepSeek base URL")
    parser.add_argument("--prompt", default="Please reply with exactly: CONNECTION_OK", help="Test prompt")
    parser.add_argument("--timeout", type=float, default=20.0, help="Request timeout seconds")
    return parser.parse_args()


async def run_check(args: argparse.Namespace) -> int:
    load_dotenv()

    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        print("[FAIL] DEEPSEEK_API_KEY is missing")
        return 1

    try:
        from openai import AsyncOpenAI
    except Exception as exc:  # pragma: no cover
        print(f"[FAIL] openai import error: {exc}")
        return 1

    client = AsyncOpenAI(api_key=api_key, base_url=args.base_url, timeout=args.timeout)
    started = time.perf_counter()

    try:
        response = await client.chat.completions.create(
            model=args.model,
            messages=[
                {"role": "system", "content": "You are a concise assistant."},
                {"role": "user", "content": args.prompt},
            ],
            temperature=0.0,
            max_tokens=64,
            stream=False,
        )
    except Exception as exc:
        print(f"[FAIL] request error: {exc}")
        return 1

    elapsed_ms = (time.perf_counter() - started) * 1000
    text = (response.choices[0].message.content or "").strip()

    print("[OK] DeepSeek connection succeeded")
    print(f"model={args.model}")
    print(f"base_url={args.base_url}")
    print(f"latency_ms={elapsed_ms:.1f}")
    print("reply=")
    print(text)
    return 0


def main() -> None:
    args = parse_args()
    code = asyncio.run(run_check(args))
    raise SystemExit(code)


if __name__ == "__main__":
    main()
