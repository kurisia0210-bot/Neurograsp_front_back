"""
Reasoning v2 (post-processing pipeline).

P2 goals:
- Keep proposer/guard/route boundaries explicit.
- Keep behavior rollback-friendly.
- Add deterministic FinishGuard so completion is system-decided.

Runtime switches:
- REASONING_V2_PROPOSER=mock (default) | v1 | llm
- REASONING_V2_MOCK_SCRIPT=<json_file_path>  # optional for golden tests
- REASONING_V2_STAGNATION_WINDOW=4            # state stagnation window (N)
- REASONING_V2_STAGNATION_OVERRIDE=THINK|SPEAK
- REASONING_V2_EXECUTION_MODE=INSTRUCT(default)|ACT
- REASONING_V2_MACRO_PLANNER=auto(default)|always|never
"""

from __future__ import annotations

import os
from typing import Optional

from core.pipeline.adapters_v2 import InstructAdapter
from core.pipeline.common_v2 import make_action
from core.pipeline.complex_actions_v2 import ComplexActionPlanner
from core.safety.guards_v2 import (
    FinishGuard,
    GuardCheckResult,
    StateStagnationGuard,
    build_state_stagnation_guard_from_env,
)
from core.pipeline.proposers_v2 import LLMProposer, MockProposer, Proposer, V1Proposer, build_proposer_from_env
from schema.payload import ActionPayload, ObservationPayload


class ReasoningV2Pipeline:
    """
    P2 minimal pipeline:
    0) finish_guard(obs)           # deterministic completion short-circuit
    1) proposal = complex planner OR proposer.propose(obs)
    2) guard_check(proposal, obs)  # noop + state stagnation guard
    3) actuation_route(...)        # passthrough + override support
    """

    def __init__(
        self,
        proposer: Optional[Proposer] = None,
        finish_guard: Optional[FinishGuard] = None,
        state_guard: Optional[StateStagnationGuard] = None,
        instruct_adapter: Optional[InstructAdapter] = None,
        complex_action_planner: Optional[ComplexActionPlanner] = None,
        execution_mode: Optional[str] = None,
        macro_planner_mode: Optional[str] = None,
    ) -> None:
        self._proposer = proposer or build_proposer_from_env()
        self._finish_guard = finish_guard or FinishGuard()
        self._state_guard = state_guard or build_state_stagnation_guard_from_env()
        self._instruct_adapter = instruct_adapter or InstructAdapter()
        self._complex_action_planner = complex_action_planner or ComplexActionPlanner()

        mode_raw = (execution_mode or os.getenv("REASONING_V2_EXECUTION_MODE", "INSTRUCT")).strip().upper()
        self._execution_mode = "INSTRUCT" if mode_raw == "INSTRUCT" else "ACT"
        planner_mode_raw = (macro_planner_mode or os.getenv("REASONING_V2_MACRO_PLANNER", "auto")).strip().lower()
        if planner_mode_raw in {"auto", "always", "never"}:
            self._macro_planner_mode = planner_mode_raw
        else:
            print(
                f"[ReasoningV2] Unknown REASONING_V2_MACRO_PLANNER={planner_mode_raw!r}, fallback to 'auto'"
            )
            self._macro_planner_mode = "auto"

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        return await self._proposer.propose(obs)

    async def guard_check(self, proposal: ActionPayload, obs: ObservationPayload) -> GuardCheckResult:
        return self._state_guard.check(proposal, obs)

    async def actuation_route(self, check: GuardCheckResult, obs: ObservationPayload) -> ActionPayload:
        routed = check.override if check.override is not None else check.proposal
        if self._execution_mode == "INSTRUCT":
            return self._instruct_adapter.to_instruction(routed, obs)
        return routed

    def _should_use_complex_planner(self) -> bool:
        if self._macro_planner_mode == "always":
            return True
        if self._macro_planner_mode == "never":
            return False
        # auto mode: always try deterministic planner first.
        # ComplexActionPlanner only emits for supported macro goals
        # (currently PUT_IN / OPEN_THEN_PUT_IN), otherwise returns None.
        return True

    @staticmethod
    def _debounce_redundant_move(proposal: ActionPayload, obs: ObservationPayload) -> ActionPayload:
        action_type = proposal.type.value if hasattr(proposal.type, "value") else proposal.type
        if action_type != "MOVE_TO":
            return proposal

        target_poi = proposal.target_poi.value if hasattr(proposal.target_poi, "value") else proposal.target_poi
        current_location = (
            obs.agent.location.value if hasattr(obs.agent.location, "value") else obs.agent.location
        )
        if target_poi and current_location and target_poi == current_location:
            return make_action(
                obs,
                type="THINK",
                content=f"Debounce: already at {target_poi}, skip repeated MOVE_TO.",
            )
        return proposal

    async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
        print(f"[DEBUG ReasoningV2] analyze_and_propose: goal_spec={obs.goal_spec}")
        finish_action = self._finish_guard.check(obs)
        if finish_action is not None:
            if obs.episode_id is not None:
                self._finish_guard.reset(obs.session_id, int(obs.episode_id))
                self._state_guard.reset(obs.session_id, int(obs.episode_id))
                self._complex_action_planner.reset(obs.session_id, int(obs.episode_id))
            return finish_action

        proposal = None
        if self._should_use_complex_planner():
            proposal = self._complex_action_planner.next_atomic(obs)
        if proposal is None:
            proposal = await self.propose(obs)
        proposal = self._debounce_redundant_move(proposal, obs)
        check = await self.guard_check(proposal, obs)
        action = await self.actuation_route(check, obs)
        if self._is_finish_action(action) and obs.episode_id is not None:
            self._finish_guard.reset(obs.session_id, int(obs.episode_id))
            self._state_guard.reset(obs.session_id, int(obs.episode_id))
            self._complex_action_planner.reset(obs.session_id, int(obs.episode_id))
        print(f"[DEBUG ReasoningV2] final action: {action.type}, content={action.content}")
        return action

    @staticmethod
    def _is_finish_action(action: ActionPayload) -> bool:
        action_type = action.type.value if hasattr(action.type, "value") else action.type
        return action_type == "FINISH"


_pipeline = ReasoningV2Pipeline()


async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    return await _pipeline.analyze_and_propose(obs)


__all__ = [
    "Proposer",
    "V1Proposer",
    "LLMProposer",
    "MockProposer",
    "build_proposer_from_env",
    "GuardCheckResult",
    "FinishGuard",
    "StateStagnationGuard",
    "InstructAdapter",
    "ComplexActionPlanner",
    "ReasoningV2Pipeline",
    "analyze_and_propose",
]

