from __future__ import annotations

import argparse
import asyncio
import importlib
import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from schema.payload import ObservationPayload


@dataclass
class SmokeResult:
    case: str
    passed: bool
    detail: str
    action_type: str
    content: str
    expected: str


def _make_obs(step_id: int, task: str = "Put red cube in fridge") -> ObservationPayload:
    return ObservationPayload(
        session_id="smoke-session",
        episode_id=1,
        step_id=step_id,
        timestamp=0.0,
        agent={"location": "table_center", "holding": None},
        nearby_objects=[
            {"id": "red_cube", "state": "on_table", "relation": "on table_surface"},
            {"id": "fridge_door", "state": "closed", "relation": "front"},
            {"id": "fridge_main", "state": "installed", "relation": "storage"},
            {"id": "table_surface", "state": "installed", "relation": "surface"},
            {"id": "stove", "state": "installed", "relation": "appliance"},
        ],
        global_task=task,
    )


async def _run_case(mode: str, scenario: Optional[str], *, step_id: int, strict_deepseek: bool) -> SmokeResult:
    os.environ["LLM_MODE"] = mode
    if scenario:
        os.environ["LLM_MOCK_SCENARIO"] = scenario
    elif "LLM_MOCK_SCENARIO" in os.environ:
        del os.environ["LLM_MOCK_SCENARIO"]

    import service.llm_client as llm_client
    import core.reasoning_v1 as reasoning_v1

    importlib.reload(llm_client)
    importlib.reload(reasoning_v1)

    engine = reasoning_v1.ReasoningEngine()
    obs = _make_obs(step_id=step_id)
    messages = await engine._construct_game1_prompt(obs)
    action = await engine._call_llm_and_parse(obs, messages)

    case = f"{mode}:{scenario or '-'}"
    action_type = str(action.type)
    content = action.content or ""

    if mode == "mock" and scenario == "valid_json":
        passed = action_type == "MOVE_TO" and (action.target_poi == "fridge_zone")
        return SmokeResult(
            case=case,
            passed=passed,
            detail="Mock valid_json should parse into MOVE_TO action.",
            action_type=action_type,
            content=content,
            expected="type=MOVE_TO, target_poi=fridge_zone",
        )

    if mode == "mock" and scenario == "invalid_json":
        passed = action_type == "THINK" and content.startswith("Invalid JSON from LLM")
        return SmokeResult(
            case=case,
            passed=passed,
            detail="Mock invalid_json should trigger JSON parse error fallback.",
            action_type=action_type,
            content=content,
            expected="type=THINK and content starts with 'Invalid JSON from LLM'",
        )

    # deepseek mode
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key and not strict_deepseek:
        return SmokeResult(
            case=case,
            passed=True,
            detail="DEEPSEEK_API_KEY missing; treated as skipped in non-strict mode.",
            action_type=action_type,
            content=content,
            expected="skip when API key is missing",
        )

    passed = action_type in {"MOVE_TO", "INTERACT", "THINK", "IDLE", "FINISH", "SPEAK"}
    return SmokeResult(
        case=case,
        passed=passed,
        detail="DeepSeek call path should return ActionPayload without exceptions.",
        action_type=action_type,
        content=content,
        expected="a valid ActionPayload type",
    )


async def _main_async(strict_deepseek: bool) -> int:
    cases = [
        ("mock", "valid_json"),
        ("mock", "invalid_json"),
        ("deepseek", None),
    ]

    results = []
    step_id = 1
    for mode, scenario in cases:
        results.append(
            await _run_case(mode, scenario, step_id=step_id, strict_deepseek=strict_deepseek)
        )
        step_id += 1

    print("[V1LLMSmoke]")
    for r in results:
        state = "PASS" if r.passed else "FAIL"
        print(
            f"{state} {r.case} expected={r.expected} actual=type={r.action_type} content={r.content!r}"
        )

    if any(not x.passed for x in results):
        print(json.dumps([asdict(x) for x in results], ensure_ascii=False, indent=2))
        return 1
    return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="V1 LLM chain smoke test.")
    parser.add_argument(
        "--strict-deepseek",
        action="store_true",
        help="Fail deepseek case when DEEPSEEK_API_KEY is missing.",
    )
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    args = _parse_args()
    return asyncio.run(_main_async(strict_deepseek=args.strict_deepseek))


if __name__ == "__main__":
    raise SystemExit(main())

