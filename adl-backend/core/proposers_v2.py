from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol

from core.common_v2 import make_action
from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1
from schema.payload import ActionPayload, ObservationPayload


class Proposer(Protocol):
    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        ...


class V1Proposer:
    """Production proposer: delegate to v1 reasoning."""

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        return await analyze_and_propose_v1(obs)


class MockProposer:
    """
    Deterministic proposer for golden tests.

    Priority:
    1) scripted output (if REASONING_V2_MOCK_SCRIPT is valid)
    2) rule-based fallback
    """

    def __init__(self, script_path: Optional[str] = None) -> None:
        self._script = self._load_script(script_path)

    def _load_script(self, script_path: Optional[str]) -> List[Dict[str, Any]]:
        if not script_path:
            return []
        path = Path(script_path)
        if not path.exists():
            print(f"[ReasoningV2] Mock script not found: {script_path!r}, fallback to rules.")
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
            if not isinstance(data, list):
                print("[ReasoningV2] Mock script must be a JSON list, fallback to rules.")
                return []
            normalized = [x for x in data if isinstance(x, dict)]
            if not normalized:
                print("[ReasoningV2] Mock script is empty, fallback to rules.")
            return normalized
        except Exception as exc:
            print(f"[ReasoningV2] Failed to load mock script: {exc}, fallback to rules.")
            return []

    def _from_script(self, obs: ObservationPayload) -> Optional[ActionPayload]:
        if not self._script:
            return None
        index = max(obs.step_id - 1, 0) % len(self._script)
        step_data = dict(self._script[index])
        step_data.setdefault("content", f"Mock script step #{index + 1}")
        try:
            return make_action(obs, **step_data)
        except Exception as exc:
            print(f"[ReasoningV2] Invalid mock script action at idx={index}: {exc}")
            return None

    def _find_state(self, obs: ObservationPayload, item_id: str) -> Optional[str]:
        for obj in obs.nearby_objects:
            obj_id = obj.id.value if hasattr(obj.id, "value") else obj.id
            if obj_id == item_id:
                return obj.state.value if hasattr(obj.state, "value") else obj.state
        return None

    def _from_rules(self, obs: ObservationPayload) -> ActionPayload:
        if self._find_state(obs, "red_cube") == "in_fridge":
            return make_action(obs, type="THINK", content="MockRule: waiting for FinishGuard.")

        holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding
        fridge_door_state = self._find_state(obs, "fridge_door")
        red_cube_state = self._find_state(obs, "red_cube")

        if holding is None and red_cube_state == "on_table":
            return make_action(
                obs,
                type="INTERACT",
                target_item="red_cube",
                interaction_type="PICK",
                content="MockRule: pick red cube first.",
            )

        if holding == "red_cube" and fridge_door_state != "open":
            return make_action(
                obs,
                type="INTERACT",
                target_item="fridge_door",
                interaction_type="OPEN",
                content="MockRule: open fridge door before placing.",
            )

        if holding == "red_cube" and fridge_door_state == "open":
            return make_action(
                obs,
                type="INTERACT",
                target_item="fridge_main",
                interaction_type="PLACE",
                content="MockRule: place red cube into fridge.",
            )

        return make_action(
            obs,
            type="THINK",
            content="MockRule: waiting for deterministic next condition.",
        )

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        scripted = self._from_script(obs)
        if scripted is not None:
            return scripted
        return self._from_rules(obs)


def build_proposer_from_env() -> Proposer:
    proposer_name = os.getenv("REASONING_V2_PROPOSER", "mock").strip().lower()
    if proposer_name == "v1":
        print("[ReasoningV2] Proposer: V1Proposer")
        return V1Proposer()
    if proposer_name != "mock":
        print(f"[ReasoningV2] Unknown proposer={proposer_name!r}, fallback to MockProposer")
    script_path = os.getenv("REASONING_V2_MOCK_SCRIPT", "").strip() or None
    print("[ReasoningV2] Proposer: MockProposer")
    return MockProposer(script_path=script_path)


__all__ = ["Proposer", "V1Proposer", "MockProposer", "build_proposer_from_env"]
