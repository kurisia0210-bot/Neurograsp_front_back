from __future__ import annotations

from typing import Optional

from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1
from core.world_facts import WorldFacts
from schema.payload import ActionPayload, ObservationPayload


class V1Proposer:
    """Production proposer: delegate to v1 reasoning."""

    async def propose(self, obs: ObservationPayload, facts: Optional[WorldFacts] = None) -> ActionPayload:
        _ = facts
        return await analyze_and_propose_v1(obs)

