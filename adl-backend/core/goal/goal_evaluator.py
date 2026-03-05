from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from core.goal.alias_registry import (
    BACKEND_CONTAINER_ALIASES,
    BACKEND_ITEM_ALIASES,
    BACKEND_POI_ALIASES,
)
from schema.payload import ObservationPayload


@dataclass
class ParsedGoal:
    goal_type: str
    target_poi: Optional[str] = None
    target_item: Optional[str] = None
    target_container: Optional[str] = None
    raw_task: str = ""


@dataclass
class GoalEvalResult:
    done: bool
    code: str
    message: str
    goal: Optional[ParsedGoal] = None


class GoalEvaluator:
    """
    MVP evaluator for deterministic "done" checks.

    Supported goals:
    - MOVE_TO(target_poi)
    - PUT_IN(item, container)
    """

    _POIS = {"table_center", "fridge_zone", "stove_zone"}
    _ITEMS = {"red_cube", "half_cube_left", "half_cube_right"}
    _CONTAINERS = {"fridge_main", "table_surface", "stove"}

    _POI_ALIASES = BACKEND_POI_ALIASES
    _ITEM_ALIASES = BACKEND_ITEM_ALIASES
    _CONTAINER_ALIASES = BACKEND_CONTAINER_ALIASES

    def parse_goal(self, task: str) -> Optional[ParsedGoal]:
        if not task:
            return None

        text = task.strip().lower()

        # MOVE_TO(x)
        m = re.search(r"move_to\s*\(\s*([a-z_ ]+)\s*\)", text)
        if m:
            target = self._normalize_poi(m.group(1))
            if target:
                return ParsedGoal(goal_type="MOVE_TO", target_poi=target, raw_task=task)

        # move/go/walk/mv to x
        m = re.search(r"(?:move|go|walk|mv)\s*(?:to)?\s+([a-z_ ]+)", text)
        if m:
            target = self._normalize_poi(m.group(1))
            if target:
                return ParsedGoal(goal_type="MOVE_TO", target_poi=target, raw_task=task)

        # PUT_IN(item, container)
        m = re.search(r"put_in\s*\(\s*([a-z_ ]+)\s*,\s*([a-z_ ]+)\s*\)", text)
        if m:
            item = self._normalize_item(m.group(1))
            container = self._normalize_container(m.group(2))
            if item and container:
                return ParsedGoal(
                    goal_type="PUT_IN",
                    target_item=item,
                    target_container=container,
                    raw_task=task,
                )

        # put/place item in/into container
        m = re.search(r"(?:put|place)\s+([a-z_ ]+?)\s+(?:in|into)\s+([a-z_ ]+)", text)
        if m:
            item = self._normalize_item(m.group(1))
            container = self._normalize_container(m.group(2))
            if item and container:
                return ParsedGoal(
                    goal_type="PUT_IN",
                    target_item=item,
                    target_container=container,
                    raw_task=task,
                )

        return None

    def is_done(self, obs: ObservationPayload) -> GoalEvalResult:
        goal = self.parse_goal(obs.global_task)
        if goal is None:
            return GoalEvalResult(
                done=False,
                code="GOAL_UNPARSED",
                message="Goal not parsed by MVP evaluator.",
                goal=None,
            )

        if goal.goal_type == "MOVE_TO":
            current = obs.agent.location.value if hasattr(obs.agent.location, "value") else obs.agent.location
            if current == goal.target_poi:
                return GoalEvalResult(
                    done=True,
                    code="GOAL_DONE_MOVE_TO",
                    message=f"Goal completed: reached {goal.target_poi}.",
                    goal=goal,
                )
            return GoalEvalResult(
                done=False,
                code="GOAL_PENDING_MOVE_TO",
                message=f"Goal pending: current={current}, target={goal.target_poi}.",
                goal=goal,
            )

        if goal.goal_type == "PUT_IN":
            item_obj = self._find_object(obs, goal.target_item or "")
            if item_obj is None:
                return GoalEvalResult(
                    done=False,
                    code="GOAL_PENDING_ITEM_NOT_VISIBLE",
                    message=f"Goal pending: item {goal.target_item} not visible.",
                    goal=goal,
                )

            state = item_obj.state.value if hasattr(item_obj.state, "value") else item_obj.state
            relation = (item_obj.relation or "").lower()
            container = goal.target_container or ""

            if container == "fridge_main" and state == "in_fridge":
                return GoalEvalResult(
                    done=True,
                    code="GOAL_DONE_PUT_IN",
                    message=f"Goal completed: {goal.target_item} is in {container}.",
                    goal=goal,
                )

            if container in relation:
                return GoalEvalResult(
                    done=True,
                    code="GOAL_DONE_PUT_IN_BY_RELATION",
                    message=f"Goal completed by relation: {goal.target_item} in {container}.",
                    goal=goal,
                )

            return GoalEvalResult(
                done=False,
                code="GOAL_PENDING_PUT_IN",
                message=f"Goal pending: {goal.target_item} state={state}, relation={relation}.",
                goal=goal,
            )

        return GoalEvalResult(
            done=False,
            code="GOAL_UNSUPPORTED",
            message=f"Unsupported goal type: {goal.goal_type}.",
            goal=goal,
        )

    def _find_object(self, obs: ObservationPayload, item_id: str):
        for obj in obs.nearby_objects:
            obj_id = obj.id.value if hasattr(obj.id, "value") else obj.id
            if obj_id == item_id:
                return obj
        return None

    def _normalize_poi(self, token: str) -> Optional[str]:
        t = self._normalize_token(token)
        mapped = self._POI_ALIASES.get(t, t)
        return mapped if mapped in self._POIS else None

    def _normalize_item(self, token: str) -> Optional[str]:
        t = self._normalize_token(token, keep_space=True)
        mapped = self._ITEM_ALIASES.get(t, t.replace(" ", "_"))
        return mapped if mapped in self._ITEMS else None

    def _normalize_container(self, token: str) -> Optional[str]:
        t = self._normalize_token(token, keep_space=True)
        mapped = self._CONTAINER_ALIASES.get(t, t.replace(" ", "_"))
        return mapped if mapped in self._CONTAINERS else None

    @staticmethod
    def _normalize_token(token: str, keep_space: bool = False) -> str:
        t = re.sub(r"[^a-zA-Z0-9_ ]+", "", token.strip().lower())
        t = re.sub(r"\s+", " ", t).strip()
        if keep_space:
            return t
        return t.replace(" ", "_")

