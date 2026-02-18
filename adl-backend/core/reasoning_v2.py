"""
Reasoning v2 (post-processing pipeline).

Goal:
- Keep behavior aligned with v1 for now.
- Introduce stage boundaries for future guard/routing evolution.
"""

from dataclasses import dataclass

from schema.payload import ActionPayload, ObservationPayload
from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1


@dataclass
class GuardCheckResult:
    """Placeholder result for Stage-2 guard checks."""

    proposal: ActionPayload
    passed: bool = True
    reason: str = "NOOP_GUARD"


class ReasoningV2Pipeline:
    """
    P2-1 minimal pipeline:
    1) proposal = v1.propose(obs)
    2) guard_check(proposal, obs)  # currently noop
    3) actuation_route(...)        # currently passthrough
    """

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        return await analyze_and_propose_v1(obs)

    async def guard_check(
        self, proposal: ActionPayload, obs: ObservationPayload
    ) -> GuardCheckResult:
        _ = obs
        return GuardCheckResult(proposal=proposal, passed=True, reason="NOOP_GUARD")

    async def actuation_route(
        self, check: GuardCheckResult, obs: ObservationPayload
    ) -> ActionPayload:
        _ = obs
        # P2-1: no rewrite/no block, return proposal as-is.
        return check.proposal

    async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
        proposal = await self.propose(obs)
        check = await self.guard_check(proposal, obs)
        return await self.actuation_route(check, obs)


_pipeline = ReasoningV2Pipeline()


async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    return await _pipeline.analyze_and_propose(obs)

