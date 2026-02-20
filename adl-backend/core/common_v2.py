from __future__ import annotations

from typing import Any

from schema.payload import ActionPayload, ObservationPayload


def make_action(obs: ObservationPayload, **kwargs: Any) -> ActionPayload:
    """Build an action with trace keys copied from observation."""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        **kwargs,
    )


__all__ = ["make_action"]
