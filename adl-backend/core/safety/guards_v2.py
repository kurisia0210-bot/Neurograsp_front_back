from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
import os
import re
from typing import Deque, Dict, List, Optional, Set, Tuple

from core.pipeline.common_v2 import make_action
from core.goal.goal_registry import GoalRegistry, GoalSpec
from schema.payload import ActionPayload, ObservationPayload


@dataclass(kw_only=True)
class GuardCheckResult:
    """Structured Stage-2 result for logs/metrics and policy evolution."""

    passed: bool
    codes: List[str] = field(default_factory=list)
    message: str = ""
    proposal: ActionPayload
    override: Optional[ActionPayload] = None


class FinishGuard:
    """Deterministic finish guard: system decides completion before proposer."""

    def __init__(self, registry: Optional[GoalRegistry] = None) -> None:
        self._registry = registry or GoalRegistry()
        self._goal_cache: Dict[Tuple[str, int], Tuple[str, GoalSpec]] = {}

    def check(self, obs: ObservationPayload) -> Optional[ActionPayload]:
        goal = self._resolve_goal(obs)
        if goal is None:
            return None

        validation = self._registry.validate(goal)
        if not validation.valid:
            print(f"[FinishGuard] INVALID_GOAL: {validation.code} issues={validation.issues}")
            return None

        report = self._registry.is_done(obs, goal)
        if not report.satisfied:
            return None

        print(f"[FinishGuard] {report.code}: {report.message}")
        return make_action(obs, type="FINISH", content=report.message)

    def reset(self, session_id: str, episode_id: int) -> None:
        key = (session_id, int(episode_id))
        cached = self._goal_cache.pop(key, None)
        if cached is not None:
            _, goal = cached
            self._registry.reset_goal_progress(session_id, int(episode_id), goal)

    def _resolve_goal(self, obs: ObservationPayload) -> Optional[GoalSpec]:
        if obs.episode_id is None:
            return self._registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))

        key = (obs.session_id, int(obs.episode_id))
        source = self._goal_source_signature(obs)
        cached = self._goal_cache.get(key)
        if cached is not None and cached[0] == source:
            return cached[1]

        resolved = self._registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))
        if resolved is not None:
            self._goal_cache[key] = (source, resolved)
        return resolved

    @staticmethod
    def _goal_source_signature(obs: ObservationPayload) -> str:
        goal_hint = getattr(obs, "goal_spec", None)
        if goal_hint is not None and hasattr(goal_hint, "model_dump_json"):
            return "hint:" + goal_hint.model_dump_json()
        if isinstance(goal_hint, dict):
            return f"hint:{goal_hint}"
        return f"task:{(obs.global_task or '').strip().lower()}"


class StateStagnationGuard:
    """
    Guard for no task-relevant world-state changes across a sliding window.

    It also preserves watchdog system errors by avoiding additional overrides.
    """

    def __init__(
        self,
        window: int = 4,
        override_type: str = "THINK",
        *,
        registry: Optional[GoalRegistry] = None,
        max_keys: int = 256,
    ) -> None:
        self._window = max(2, int(window))
        self._override_type = "SPEAK" if str(override_type).upper() == "SPEAK" else "THINK"
        self._registry = registry or GoalRegistry()
        self._max_keys = max(16, int(max_keys))
        self._state_history: Dict[Tuple[str, int], Deque[str]] = {}
        self._last_step_seen: Dict[Tuple[str, int], int] = {}
        self._last_known_object_state: Dict[Tuple[str, int, str], Tuple[str, str]] = {}
        self._key_order: Deque[Tuple[str, int]] = deque()
        self._key_seen: Set[Tuple[str, int]] = set()
        self._goal_identity_cache: Dict[Tuple[str, int], Tuple[str, str]] = {}

    @property
    def window(self) -> int:
        return self._window

    def check(self, proposal: ActionPayload, obs: ObservationPayload) -> GuardCheckResult:
        if self._is_watchdog_system_error(proposal):
            return GuardCheckResult(
                passed=True,
                codes=["NOOP_GUARD", "WATCHDOG_SYSTEM_ERROR_PRESENT"],
                message="Guard skipped override because watchdog already produced a system error.",
                proposal=proposal,
                override=None,
            )

        if obs.episode_id is None:
            return GuardCheckResult(
                passed=True,
                codes=["NOOP_GUARD", "MISSING_EPISODE_ID"],
                message="Skipped stagnation check because episode_id is missing.",
                proposal=proposal,
                override=None,
            )

        if self._detect_no_state_change(obs):
            message = f"No task-relevant state change for {self._window} steps. Try a different strategy."
            override = make_action(
                obs,
                type=self._override_type,
                content=message,
            )
            return GuardCheckResult(
                passed=False,
                codes=["NO_STATE_CHANGE"],
                message=message,
                proposal=proposal,
                override=override,
            )

        return GuardCheckResult(
            passed=True,
            codes=["NOOP_GUARD"],
            message="Guard check is pass-through in P2-1.",
            proposal=proposal,
            override=None,
        )

    def reset(self, session_id: str, episode_id: int) -> None:
        key = (session_id, int(episode_id))
        self._state_history.pop(key, None)
        self._last_step_seen.pop(key, None)
        self._goal_identity_cache.pop(key, None)
        stale_obj_keys = [k for k in self._last_known_object_state if k[0] == key[0] and k[1] == key[1]]
        for stale in stale_obj_keys:
            self._last_known_object_state.pop(stale, None)
        self._key_seen.discard(key)
        if key in self._key_order:
            self._key_order = deque(x for x in self._key_order if x != key)

    def _detect_no_state_change(self, obs: ObservationPayload) -> bool:
        key = (obs.session_id, int(obs.episode_id))
        step_id = int(obs.step_id)
        self._track_key_for_eviction(key)

        last_step = self._last_step_seen.get(key)
        if last_step == step_id:
            return False
        self._last_step_seen[key] = step_id

        history = self._state_history.get(key)
        if history is None:
            history = deque(maxlen=self._window)
            self._state_history[key] = history

        history.append(self._state_signature(obs))
        if len(history) < self._window:
            return False
        return len(set(history)) == 1

    def _state_signature(self, obs: ObservationPayload) -> str:
        episode_id = int(obs.episode_id)
        location = obs.agent.location.value if hasattr(obs.agent.location, "value") else obs.agent.location
        holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding

        red_cube_state, red_cube_rel = self._object_state_and_relation(obs, episode_id, "red_cube")
        door_state, _ = self._object_state_and_relation(obs, episode_id, "fridge_door")
        left_state, _ = self._object_state_and_relation(obs, episode_id, "half_cube_left")
        right_state, _ = self._object_state_and_relation(obs, episode_id, "half_cube_right")
        task_key = self._task_signature_key(obs)

        return "|".join(
            [
                f"task={task_key}",
                f"loc={location}",
                f"hold={holding}",
                f"red={red_cube_state}",
                f"red_rel={red_cube_rel}",
                f"door={door_state}",
                f"half_l={left_state}",
                f"half_r={right_state}",
            ]
        )

    @staticmethod
    def _is_watchdog_system_error(proposal: ActionPayload) -> bool:
        action_type = proposal.type.value if hasattr(proposal.type, "value") else proposal.type
        content = proposal.content or ""
        return action_type == "THINK" and "[SYSTEM ERROR]" in content

    def _object_state_and_relation(
        self, obs: ObservationPayload, episode_id: int, item_id: str
    ) -> Tuple[str, str]:
        cache_key = (obs.session_id, episode_id, item_id)
        for obj in obs.nearby_objects:
            oid = obj.id.value if hasattr(obj.id, "value") else obj.id
            if oid == item_id:
                state = obj.state.value if hasattr(obj.state, "value") else obj.state
                relation = (obj.relation or "").strip().lower()
                result = (str(state), relation)
                self._last_known_object_state[cache_key] = result
                return result

        cached = self._last_known_object_state.get(cache_key)
        if cached is not None:
            return cached

        return "MISSING", ""

    def _task_signature_key(self, obs: ObservationPayload) -> str:
        if obs.episode_id is not None:
            key = (obs.session_id, int(obs.episode_id))
            source = self._goal_source_signature(obs)
            cached = self._goal_identity_cache.get(key)
            if cached is not None and cached[0] == source:
                return cached[1]

            resolved = self._registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))
            if resolved is not None:
                identity = f"goal={resolved.goal_id}"
                self._goal_identity_cache[key] = (source, identity)
                return identity

        resolved = self._registry.resolve_with_hint(obs.global_task, getattr(obs, "goal_spec", None))
        if resolved is not None:
            return f"goal={resolved.goal_id}"

        text = (obs.global_task or "").strip().lower()
        text = re.sub(r"\d+", "#", text)
        text = re.sub(r"\s+", " ", text)
        return f"raw={text}"

    @staticmethod
    def _goal_source_signature(obs: ObservationPayload) -> str:
        goal_hint = getattr(obs, "goal_spec", None)
        if goal_hint is not None and hasattr(goal_hint, "model_dump_json"):
            return "hint:" + goal_hint.model_dump_json()
        if isinstance(goal_hint, dict):
            return f"hint:{goal_hint}"
        return f"task:{(obs.global_task or '').strip().lower()}"

    def _track_key_for_eviction(self, key: Tuple[str, int]) -> None:
        if key not in self._key_seen:
            self._key_seen.add(key)
            self._key_order.append(key)
        while len(self._key_order) > self._max_keys:
            old_key = self._key_order.popleft()
            self.reset(old_key[0], old_key[1])


def build_state_stagnation_guard_from_env() -> StateStagnationGuard:
    window = int(os.getenv("REASONING_V2_STAGNATION_WINDOW", "4"))
    override = os.getenv("REASONING_V2_STAGNATION_OVERRIDE", "THINK").strip().upper()
    max_keys = int(os.getenv("REASONING_V2_STAGNATION_MAX_KEYS", "256"))
    return StateStagnationGuard(window=window, override_type=override, max_keys=max_keys)


__all__ = [
    "GuardCheckResult",
    "FinishGuard",
    "StateStagnationGuard",
    "build_state_stagnation_guard_from_env",
]
