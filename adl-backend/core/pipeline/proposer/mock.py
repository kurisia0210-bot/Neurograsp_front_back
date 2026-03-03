from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional

from core.pipeline.common_v2 import make_action
from core.goal.goal_registry import GoalRegistry
from core.runtime.world_facts import WorldFacts, build_world_facts_from_observation
from schema.payload import ActionPayload, ObservationPayload


class MockProposer:
    """
    Deterministic proposer for golden tests.

    Priority:
    1) scripted output (if REASONING_V2_MOCK_SCRIPT is valid)
    2) rule-based fallback
    """

    def __init__(self, script_path: Optional[str] = None) -> None:
        self._script = self._load_script(script_path)
        self._goal_registry = GoalRegistry()

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

    def _find_state(self, facts: WorldFacts, item_id: str) -> Optional[str]:
        obj = facts.get_object(item_id)
        if obj is None:
            return None
        return obj.state

    def _from_rules(self, obs: ObservationPayload, facts: WorldFacts) -> ActionPayload:
        goal = self._goal_registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))
        if goal is not None and goal.goal_type == "MOVE_TO":
            poi = goal.params.get("poi")
            return make_action(
                obs,
                type="MOVE_TO",
                target_poi=poi,
                content=f"MockRule: move to {poi}.",
            )

        if goal is not None and goal.goal_type == "OPEN":
            item = goal.params.get("item")
            return make_action(
                obs,
                type="INTERACT",
                target_item=item,
                interaction_type="OPEN",
                content=f"MockRule: open {item}.",
            )

        if goal is not None and goal.goal_type == "CLOSE":
            item = goal.params.get("item")
            return make_action(
                obs,
                type="INTERACT",
                target_item=item,
                interaction_type="CLOSE",
                content=f"MockRule: close {item}.",
            )

        if goal is not None and goal.goal_type in {"PUT_IN", "OPEN_THEN_PUT_IN"}:
            item = goal.params.get("item", "red_cube")
            container = goal.params.get("container", "fridge_main")
            return make_action(
                obs,
                type="INTERACT",
                target_item=container,
                interaction_type="PLACE",
                content=f"MockRule: place {item} into {container}.",
            )

        if goal is None and self._looks_like_move_task(obs.global_task):
            return make_action(
                obs,
                type="THINK",
                content=(
                    "Unsupported MOVE_TO target. "
                    "Use one of: table_center, fridge_zone, stove_zone."
                ),
            )

        if goal is None and self._looks_like_open_task(obs.global_task):
            return make_action(
                obs,
                type="THINK",
                content=(
                    "Unsupported OPEN target. "
                    "Use one of: fridge_door, red_cube, half_cube_left, half_cube_right."
                ),
            )

        if goal is None and self._looks_like_close_task(obs.global_task):
            return make_action(
                obs,
                type="THINK",
                content=(
                    "Unsupported CLOSE target. "
                    "Use one of: fridge_door, red_cube, half_cube_left, half_cube_right."
                ),
            )

        if goal is None and self._looks_like_place_task(obs.global_task):
            return make_action(
                obs,
                type="THINK",
                content=(
                    "Unsupported PLACE target. "
                    "Use: place <item> in <container>, e.g. place red cube in fridge."
                ),
            )

        if self._find_state(facts, "red_cube") == "in_fridge":
            return make_action(obs, type="THINK", content="MockRule: waiting for FinishGuard.")

        holding = facts.agent.holding
        fridge_door_state = self._find_state(facts, "fridge_door")
        red_cube_state = self._find_state(facts, "red_cube")

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

    @staticmethod
    def _looks_like_move_task(task: str) -> bool:
        text = (task or "").strip().lower()
        return bool(re.search(r"(?:^|\b)(?:move|go|walk|mv)\b", text))

    @staticmethod
    def _looks_like_open_task(task: str) -> bool:
        text = (task or "").strip().lower()
        return bool(re.search(r"(?:^|\b)open\b", text))

    @staticmethod
    def _looks_like_close_task(task: str) -> bool:
        text = (task or "").strip().lower()
        return bool(re.search(r"(?:^|\b)close\b", text))

    @staticmethod
    def _looks_like_place_task(task: str) -> bool:
        text = (task or "").strip().lower()
        return bool(re.search(r"(?:^|\b)(?:place|put)\b", text))

    async def propose(self, obs: ObservationPayload, facts: Optional[WorldFacts] = None) -> ActionPayload:
        facts = facts or build_world_facts_from_observation(obs)
        scripted = self._from_script(obs)
        if scripted is not None:
            return scripted
        return self._from_rules(obs, facts)

