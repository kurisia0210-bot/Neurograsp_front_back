"""
Reasoning v2 (post-processing pipeline).

P2 goals:
- Keep proposer/guard/route boundaries explicit.
- Keep behavior rollback-friendly.
- Add deterministic FinishGuard so completion is system-decided.

Runtime switches:
- REASONING_V2_PROPOSER=mock (default) | v1
- REASONING_V2_MOCK_SCRIPT=<json_file_path>  # optional for golden tests
- REASONING_V2_STAGNATION_WINDOW=4            # state stagnation window (N)
- REASONING_V2_STAGNATION_OVERRIDE=THINK|SPEAK
- REASONING_V2_EXECUTION_MODE=INSTRUCT(default)|ACT
"""

from __future__ import annotations

from collections import deque
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Protocol, Tuple

from core.goal_evaluator import GoalEvaluator
from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1
from schema.payload import ActionPayload, ObservationPayload


def _make_action(obs: ObservationPayload, **kwargs: Any) -> ActionPayload:
    """Build an action with trace keys copied from observation."""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        **kwargs,
    )


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
            return _make_action(obs, **step_data)
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
        # Rule 0: if task already done, let FinishGuard handle FINISH; here keep safe fallback.
        if self._find_state(obs, "red_cube") == "in_fridge":
            return _make_action(obs, type="THINK", content="MockRule: waiting for FinishGuard.")

        holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding
        fridge_door_state = self._find_state(obs, "fridge_door")
        red_cube_state = self._find_state(obs, "red_cube")

        if holding is None and red_cube_state == "on_table":
            return _make_action(
                obs,
                type="INTERACT",
                target_item="red_cube",
                interaction_type="PICK",
                content="MockRule: pick red cube first.",
            )

        if holding == "red_cube" and fridge_door_state != "open":
            return _make_action(
                obs,
                type="INTERACT",
                target_item="fridge_door",
                interaction_type="OPEN",
                content="MockRule: open fridge door before placing.",
            )

        if holding == "red_cube" and fridge_door_state == "open":
            return _make_action(
                obs,
                type="INTERACT",
                target_item="fridge_main",
                interaction_type="PLACE",
                content="MockRule: place red cube into fridge.",
            )

        return _make_action(
            obs,
            type="THINK",
            content="MockRule: waiting for deterministic next condition.",
        )

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        scripted = self._from_script(obs)
        if scripted is not None:
            return scripted
        return self._from_rules(obs)


def _build_proposer() -> Proposer:
    proposer_name = os.getenv("REASONING_V2_PROPOSER", "mock").strip().lower()
    if proposer_name == "v1":
        print("[ReasoningV2] Proposer: V1Proposer")
        return V1Proposer()
    if proposer_name != "mock":
        print(f"[ReasoningV2] Unknown proposer={proposer_name!r}, fallback to MockProposer")
    script_path = os.getenv("REASONING_V2_MOCK_SCRIPT", "").strip() or None
    print("[ReasoningV2] Proposer: MockProposer")
    return MockProposer(script_path=script_path)


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

    def __init__(self, evaluator: Optional[GoalEvaluator] = None) -> None:
        self._evaluator = evaluator or GoalEvaluator()

    def check(self, obs: ObservationPayload) -> Optional[ActionPayload]:
        result = self._evaluator.is_done(obs)
        if not result.done:
            return None
        print(f"[FinishGuard] {result.code}: {result.message}")
        return _make_action(obs, type="FINISH", content=result.message)


class InstructAdapter:
    """
    Template-first adapter: physical proposal -> user-facing instruction (SPEAK).
    """

    def to_instruction(self, proposal: ActionPayload, obs: ObservationPayload) -> ActionPayload:
        action_type = proposal.type.value if hasattr(proposal.type, "value") else proposal.type
        if action_type in {"THINK", "SPEAK", "IDLE", "FINISH"}:
            return proposal

        interaction = (
            proposal.interaction_type.value
            if hasattr(proposal.interaction_type, "value")
            else proposal.interaction_type
        )
        target_item = proposal.target_item.value if hasattr(proposal.target_item, "value") else proposal.target_item
        target_poi = proposal.target_poi.value if hasattr(proposal.target_poi, "value") else proposal.target_poi

        if action_type == "MOVE_TO":
            text = f"请先移动到 {target_poi or 'target_poi'}。"
        elif action_type == "INTERACT":
            text = self._interaction_template(interaction or "NONE", target_item)
        else:
            text = f"请执行下一步操作：{action_type}。"

        return _make_action(obs, type="SPEAK", content=text)

    @staticmethod
    def _interaction_template(interaction: str, target_item: Optional[str]) -> str:
        item = target_item or "target_item"
        templates = {
            "PICK": f"请拿起 {item}。",
            "PLACE": f"请把当前物体放到 {item}。",
            "OPEN": f"请打开 {item}。",
            "CLOSE": f"请关闭 {item}。",
            "SLICE": f"请切割 {item}。",
            "COOK": f"请烹饪 {item}。",
            "TOGGLE": f"请切换 {item} 的状态。",
            "NONE": f"请与 {item} 互动。",
        }
        return templates.get(interaction, f"请执行 {interaction} 于 {item}。")



class ReasoningV2Pipeline:
    """
    P2 minimal pipeline:
    0) finish_guard(obs)           # deterministic completion short-circuit
    1) proposal = proposer.propose(obs)
    2) guard_check(proposal, obs)  # noop + state stagnation guard
    3) actuation_route(...)        # passthrough + override support
    """

    def __init__(
        self,
        proposer: Optional[Proposer] = None,
        finish_guard: Optional[FinishGuard] = None,
        instruct_adapter: Optional[InstructAdapter] = None,
        execution_mode: Optional[str] = None,
    ) -> None:
        self._proposer = proposer or _build_proposer()
        self._finish_guard = finish_guard or FinishGuard()
        self._instruct_adapter = instruct_adapter or InstructAdapter()
        self._stagnation_window = max(2, int(os.getenv("REASONING_V2_STAGNATION_WINDOW", "4")))
        self._stagnation_override_type = (
            "SPEAK"
            if os.getenv("REASONING_V2_STAGNATION_OVERRIDE", "THINK").strip().upper() == "SPEAK"
            else "THINK"
        )
        mode_raw = (execution_mode or os.getenv("REASONING_V2_EXECUTION_MODE", "INSTRUCT")).strip().upper()
        self._execution_mode = "INSTRUCT" if mode_raw == "INSTRUCT" else "ACT"
        self._state_history: Dict[Tuple[str, int], Deque[str]] = {}
        self._last_step_seen: Dict[Tuple[str, int], int] = {}

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        return await self._proposer.propose(obs)

    async def guard_check(self, proposal: ActionPayload, obs: ObservationPayload) -> GuardCheckResult:
        if self._is_watchdog_system_error(proposal):
            # Keep watchdog diagnostics untouched; only annotate guard pass-through.
            return GuardCheckResult(
                passed=True,
                codes=["NOOP_GUARD", "WATCHDOG_SYSTEM_ERROR_PRESENT"],
                message="Guard skipped override because watchdog already produced a system error.",
                proposal=proposal,
                override=None,
            )

        if self._detect_no_state_change(obs):
            message = (
                f"No task-relevant state change for {self._stagnation_window} steps. "
                "Try a different strategy."
            )
            override = _make_action(
                obs,
                type=self._stagnation_override_type,
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

    async def actuation_route(self, check: GuardCheckResult, obs: ObservationPayload) -> ActionPayload:
        _ = obs
        routed = check.override if check.override is not None else check.proposal
        if self._execution_mode == "INSTRUCT":
            return self._instruct_adapter.to_instruction(routed, obs)
        return routed

    def _detect_no_state_change(self, obs: ObservationPayload) -> bool:
        key = (obs.session_id, int(obs.episode_id or 0))
        step_id = int(obs.step_id)

        # Ignore duplicate processing for the same step key.
        last_step = self._last_step_seen.get(key)
        if last_step == step_id:
            return False
        self._last_step_seen[key] = step_id

        history = self._state_history.get(key)
        if history is None:
            history = deque(maxlen=self._stagnation_window)
            self._state_history[key] = history

        history.append(self._state_signature(obs))
        if len(history) < self._stagnation_window:
            return False
        return len(set(history)) == 1

    def _state_signature(self, obs: ObservationPayload) -> str:
        location = obs.agent.location.value if hasattr(obs.agent.location, "value") else obs.agent.location
        holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding

        red_cube_state, red_cube_rel = self._object_state_and_relation(obs, "red_cube")
        door_state, _ = self._object_state_and_relation(obs, "fridge_door")
        left_state, _ = self._object_state_and_relation(obs, "half_cube_left")
        right_state, _ = self._object_state_and_relation(obs, "half_cube_right")

        return "|".join(
            [
                f"task={obs.global_task.strip().lower()}",
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

    @staticmethod
    def _object_state_and_relation(obs: ObservationPayload, item_id: str) -> Tuple[str, str]:
        for obj in obs.nearby_objects:
            oid = obj.id.value if hasattr(obj.id, "value") else obj.id
            if oid == item_id:
                state = obj.state.value if hasattr(obj.state, "value") else obj.state
                relation = (obj.relation or "").strip().lower()
                return str(state), relation
        return "MISSING", ""

    async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
        finish_action = self._finish_guard.check(obs)
        if finish_action is not None:
            return finish_action

        proposal = await self.propose(obs)
        check = await self.guard_check(proposal, obs)
        return await self.actuation_route(check, obs)


_pipeline = ReasoningV2Pipeline()


async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    return await _pipeline.analyze_and_propose(obs)
