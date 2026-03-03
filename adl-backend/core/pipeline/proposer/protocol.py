from __future__ import annotations

from typing import Optional, Protocol

from core.world_facts import WorldFacts
from schema.payload import ActionPayload, ObservationPayload


class Proposer(Protocol):
    async def propose(self, obs: ObservationPayload, facts: Optional[WorldFacts] = None) -> ActionPayload:
        ...

