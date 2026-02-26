from __future__ import annotations

from typing import Protocol

from schema.payload import ActionPayload, ObservationPayload


class Proposer(Protocol):
    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        ...

