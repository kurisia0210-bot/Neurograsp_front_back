from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path


# Allow running this file directly from any working directory.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.pipeline.proposer.llm import LLMProposer
import core.pipeline.proposer.llm as llm_module
from schema.payload import (
    ActionExecutionResult,
    AgentSelfState,
    GoalSpecPayload,
    ObservationPayload,
    VisibleObject,
)


SESSION_ID = "llm-decompose-test"
EPISODE_ID = 1
GLOBAL_TASK = "Put red cube in fridge"


def _make_obs(
    *,
    step_id: int,
    holding: str | None,
    door_state: str,
    cube_state: str,
    last_action=None,
    last_result=None,
) -> ObservationPayload:
    return ObservationPayload(
        session_id=SESSION_ID,
        episode_id=EPISODE_ID,
        step_id=step_id,
        timestamp=1700000000.0 + step_id,
        agent=AgentSelfState(location="table_center", holding=holding),
        nearby_objects=[
            VisibleObject(id="red_cube", state=cube_state, relation="on table_surface"),
            VisibleObject(id="fridge_door", state=door_state, relation="front of agent"),
            VisibleObject(id="fridge_main", state="installed", relation="kitchen appliance"),
            VisibleObject(id="table_surface", state="installed", relation="support surface"),
        ],
        global_task=GLOBAL_TASK,
        goal_spec=GoalSpecPayload(
            goal_type="PUT_IN",
            goal_id="PUT_IN:red_cube:fridge_main",
            dsl="inside(red_cube, fridge_main)",
            params={"item": "red_cube", "container": "fridge_main"},
        ),
        last_action=last_action,
        last_result=last_result,
    )


async def _run_test() -> None:
    # LLM mock returns top-level verbs intentionally; parser should normalize
    # into INTERACT + interaction_type.
    scripted = [
        {
            "type": "PICK",
            "target_item": "red_cube",
            "content": "Pick cube first",
        },
        {
            "type": "OPEN",
            "target_item": "fridge_door",
            "content": "Open fridge door",
        },
        {
            "type": "PLACE",
            "target_item": "fridge_main",
            "content": "Place cube into fridge",
        },
    ]

    call_index = {"i": 0}

    async def fake_get_completion(messages, model="deepseek-chat", temperature=0.1):
        _ = (messages, model, temperature)
        i = call_index["i"]
        if i >= len(scripted):
            i = len(scripted) - 1
        call_index["i"] += 1
        return json.dumps(scripted[i], ensure_ascii=False)

    original_get_completion = llm_module.get_completion
    llm_module.get_completion = fake_get_completion
    try:
        proposer = LLMProposer()

        # Step 1: empty hand, closed door -> expect PICK
        obs1 = _make_obs(step_id=1, holding=None, door_state="closed", cube_state="on_table")
        a1 = await proposer.propose(obs1)
        assert a1.type == "INTERACT", f"step1 type expected INTERACT, got {a1.type}"
        assert a1.interaction_type == "PICK", f"step1 interaction expected PICK, got {a1.interaction_type}"
        assert a1.target_item == "red_cube", f"step1 target expected red_cube, got {a1.target_item}"

        # Step 2: holding cube, door still closed -> expect OPEN
        obs2 = _make_obs(
            step_id=2,
            holding="red_cube",
            door_state="closed",
            cube_state="in_hand",
            last_action=a1,
            last_result=ActionExecutionResult(success=True),
        )
        a2 = await proposer.propose(obs2)
        assert a2.type == "INTERACT", f"step2 type expected INTERACT, got {a2.type}"
        assert a2.interaction_type == "OPEN", f"step2 interaction expected OPEN, got {a2.interaction_type}"
        assert a2.target_item == "fridge_door", f"step2 target expected fridge_door, got {a2.target_item}"

        # Step 3: holding cube, door open -> expect PLACE
        obs3 = _make_obs(
            step_id=3,
            holding="red_cube",
            door_state="open",
            cube_state="in_hand",
            last_action=a2,
            last_result=ActionExecutionResult(success=True),
        )
        a3 = await proposer.propose(obs3)
        assert a3.type == "INTERACT", f"step3 type expected INTERACT, got {a3.type}"
        assert a3.interaction_type == "PLACE", f"step3 interaction expected PLACE, got {a3.interaction_type}"
        assert a3.target_item == "fridge_main", f"step3 target expected fridge_main, got {a3.target_item}"

    finally:
        llm_module.get_completion = original_get_completion


def main() -> None:
    asyncio.run(_run_test())
    print("PASS test_llm_decomposition")


if __name__ == "__main__":
    main()
