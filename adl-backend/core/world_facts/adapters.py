from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from core.world_facts.models import WorldFacts


def to_observation_world_view(obs: Any, facts: WorldFacts) -> Any:
    # Preserve trace/task fields while forcing state reads through WorldFacts.
    nearby = tuple(
        SimpleNamespace(id=obj.item_id, state=obj.state, relation=obj.relation)
        for obj in facts.objects
    )
    agent = SimpleNamespace(location=facts.agent.location, holding=facts.agent.holding)
    return SimpleNamespace(
        session_id=getattr(obs, "session_id", ""),
        episode_id=getattr(obs, "episode_id", None),
        step_id=getattr(obs, "step_id", 0),
        timestamp=getattr(obs, "timestamp", facts.timestamp),
        global_task=getattr(obs, "global_task", ""),
        goal_spec=getattr(obs, "goal_spec", None),
        agent=agent,
        nearby_objects=nearby,
    )


__all__ = ["to_observation_world_view"]
