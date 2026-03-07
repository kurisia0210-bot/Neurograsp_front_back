from __future__ import annotations

from schema.payload import ActionPayload, ObservationPayload
from core.brain_rules import decide_rule_action


async def analyze(obs: ObservationPayload) -> ActionPayload:
    """Game-only reasoning entry. Uses world-fact rules only."""
    return decide_rule_action(obs)


__all__ = ["analyze"]
