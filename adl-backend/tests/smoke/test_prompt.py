from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from core.reasoning_v1 import ReasoningEngine
from schema.payload import AgentSelfState, ObservationPayload, VisibleObject


async def main() -> None:
    engine = ReasoningEngine()
    obs = ObservationPayload(
        timestamp=1234567890.0,
        session_id="test",
        episode_id=1,
        step_id=1,
        agent=AgentSelfState(location="table_center", holding=None),
        nearby_objects=[
            VisibleObject(id="red_cube", state="on_table"),
            VisibleObject(id="fridge_main", state="installed"),
        ],
        global_task="Put red cube in fridge",
    )

    messages = await engine._construct_game1_prompt(obs)
    print("=" * 60)
    print("SYSTEM PROMPT:")
    print(messages[0]["content"][:300])
    print("=" * 60)
    print("USER MESSAGE:")
    print(messages[1]["content"])


if __name__ == "__main__":
    asyncio.run(main())
