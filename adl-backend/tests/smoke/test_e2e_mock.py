from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Set mock mode before importing reasoning_v1 -> llm_client.
os.environ["LLM_MODE"] = "mock"
os.environ["LLM_MOCK_SCENARIO"] = "valid_json"

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from core.reasoning_v1 import analyze_and_propose
from schema.payload import AgentSelfState, ObservationPayload, VisibleObject


async def main() -> None:
    obs = ObservationPayload(
        timestamp=1234567890.0,
        session_id="test",
        episode_id=1,
        step_id=1,
        agent=AgentSelfState(location="table_center", holding=None),
        nearby_objects=[
            VisibleObject(id="red_cube", state="on_table"),
            VisibleObject(id="fridge_main", state="installed"),
            VisibleObject(id="fridge_door", state="closed"),
        ],
        global_task="Put red cube in fridge",
    )

    action = await analyze_and_propose(obs)
    print(f"Action Type: {action.type}")
    print(f"Content: {action.content}")
    print(f"Session ID: {action.session_id}")
    print(f"Episode ID: {action.episode_id}")
    print(f"Step ID: {action.step_id}")


if __name__ == "__main__":
    asyncio.run(main())
