from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, Optional, Tuple

from core.pipeline.common_v2 import make_action
from core.goal.goal_registry import GoalRegistry, GoalSpec
from schema.payload import ActionPayload, ObservationPayload


@dataclass(frozen=True)
class AtomicActionSpec:
    action_type: str
    content: str
    interaction_type: Optional[str] = None
    target_item: Optional[str] = None
    target_poi: Optional[str] = None
    done_kind: str = "none"
    done_item: Optional[str] = None
    done_container: Optional[str] = None


@dataclass
class _PlanState:
    signature: str
    steps: Deque[AtomicActionSpec]


class ComplexActionPlanner:
    """
    Deterministic macro-to-atomic decomposer for v2.

    Current MVP scope:
    - PUT_IN(item, container)
    - OPEN_THEN_PUT_IN(door, item, container)
    """

    def __init__(self, registry: Optional[GoalRegistry] = None) -> None:
        self._registry = registry or GoalRegistry()
        self._plans: Dict[Tuple[str, int], _PlanState] = {}

    def next_atomic(self, obs: ObservationPayload) -> Optional[ActionPayload]:
        if obs.episode_id is None:
            return None

        key = (obs.session_id, int(obs.episode_id))
        goal = self._registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))
        if goal is None:
            self._plans.pop(key, None)
            return None

        if goal.goal_type not in {"PUT_IN", "OPEN_THEN_PUT_IN"}:
            self._plans.pop(key, None)
            return None

        signature = self._goal_signature(obs, goal)
        state = self._plans.get(key)
        if state is None or state.signature != signature:
            state = self._build_plan_state(goal, obs, signature)
            if state is None:
                self._plans.pop(key, None)
                return None
            self._plans[key] = state

        self._consume_completed_steps(state, obs)
        if not state.steps:
            return None

        spec = state.steps[0]
        if spec.action_type == "MOVE_TO":
            return make_action(
                obs,
                type="MOVE_TO",
                target_poi=spec.target_poi,
                content=spec.content,
            )

        return make_action(
            obs,
            type=spec.action_type,
            target_item=spec.target_item,
            interaction_type=spec.interaction_type or "NONE",
            content=spec.content,
        )

    def reset(self, session_id: str, episode_id: int) -> None:
        self._plans.pop((session_id, int(episode_id)), None)

    def _build_plan_state(self, goal: GoalSpec, obs: ObservationPayload, signature: str) -> Optional[_PlanState]:
        if goal.goal_type == "PUT_IN":
            # PUT_IN short-circuit disabled: delegate to proposer/LLM.
            return None

        if goal.goal_type == "OPEN_THEN_PUT_IN":
            steps = deque(self._plan_open_then_put_in(goal))
            state = _PlanState(signature=signature, steps=steps)
            self._consume_completed_steps(state, obs)
            return state

        return None

    def _plan_put_in(self, goal: GoalSpec) -> list[AtomicActionSpec]:
        item = goal.params.get("item", "red_cube")
        container = goal.params.get("container", "fridge_main")
        plan = [
            AtomicActionSpec(
                action_type="INTERACT",
                interaction_type="PICK",
                target_item=item,
                content=f"MacroPlan: pick {item} first.",
                done_kind="holding",
                done_item=item,
            )
        ]
        if container == "fridge_main":
            plan.append(
                AtomicActionSpec(
                    action_type="INTERACT",
                    interaction_type="OPEN",
                    target_item="fridge_door",
                    content="MacroPlan: open fridge_door before placing.",
                    done_kind="open",
                    done_item="fridge_door",
                )
            )
        plan.append(
            AtomicActionSpec(
                action_type="INTERACT",
                interaction_type="PLACE",
                target_item=container,
                content=f"MacroPlan: place {item} into {container}.",
                done_kind="inside",
                done_item=item,
                done_container=container,
            )
        )
        return plan

    def _plan_open_then_put_in(self, goal: GoalSpec) -> list[AtomicActionSpec]:
        door = goal.params.get("door", "fridge_door")
        item = goal.params.get("item", "red_cube")
        container = goal.params.get("container", "fridge_main")
        return [
            AtomicActionSpec(
                action_type="INTERACT",
                interaction_type="OPEN",
                target_item=door,
                content=f"MacroPlan: open {door}.",
                done_kind="open",
                done_item=door,
            ),
            AtomicActionSpec(
                action_type="INTERACT",
                interaction_type="PICK",
                target_item=item,
                content=f"MacroPlan: pick {item}.",
                done_kind="holding",
                done_item=item,
            ),
            AtomicActionSpec(
                action_type="INTERACT",
                interaction_type="PLACE",
                target_item=container,
                content=f"MacroPlan: place {item} into {container}.",
                done_kind="inside",
                done_item=item,
                done_container=container,
            ),
        ]

    def _consume_completed_steps(self, state: _PlanState, obs: ObservationPayload) -> None:
        while state.steps and self._is_step_done(state.steps[0], obs):
            state.steps.popleft()

    def _is_step_done(self, step: AtomicActionSpec, obs: ObservationPayload) -> bool:
        if step.done_kind == "none":
            return False

        if step.done_kind == "holding":
            holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding
            return holding == step.done_item

        if step.done_kind == "open":
            state, _ = self._object_state_and_relation(obs, step.done_item or "")
            return state == "open"

        if step.done_kind == "inside":
            state, relation = self._object_state_and_relation(obs, step.done_item or "")
            container = step.done_container or ""
            if container == "fridge_main" and state == "in_fridge":
                return True
            return bool(container and container in relation)

        return False

    @staticmethod
    def _goal_signature(obs: ObservationPayload, goal: GoalSpec) -> str:
        goal_hint = getattr(obs, "goal_spec", None)
        if goal_hint is not None and hasattr(goal_hint, "model_dump_json"):
            return f"{goal.goal_id}|hint={goal_hint.model_dump_json()}"
        if isinstance(goal_hint, dict):
            return f"{goal.goal_id}|hint={goal_hint}"
        return f"{goal.goal_id}|task={(obs.global_task or '').strip().lower()}"

    @staticmethod
    def _object_state_and_relation(obs: ObservationPayload, item_id: str) -> tuple[str, str]:
        for obj in obs.nearby_objects:
            oid = obj.id.value if hasattr(obj.id, "value") else obj.id
            if oid == item_id:
                state = obj.state.value if hasattr(obj.state, "value") else obj.state
                relation = (obj.relation or "").strip().lower()
                return str(state), relation
        return "MISSING", ""


__all__ = ["AtomicActionSpec", "ComplexActionPlanner"]


