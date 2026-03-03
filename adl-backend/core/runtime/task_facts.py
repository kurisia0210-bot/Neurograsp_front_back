from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from core.world_facts import (
    build_task_facts_dict,
    build_world_facts_from_observation,
    summarize_world_facts,
)


def normalize_task_facts(obs: Any) -> Dict[str, Any]:
    # Backward-compatible API: legacy callers still get a dict shape.
    facts = build_world_facts_from_observation(obs)
    return build_task_facts_dict(facts)


def get_agent_location(obs: Any) -> Optional[str]:
    facts = build_world_facts_from_observation(obs)
    return facts.agent.location


def get_agent_holding(obs: Any) -> Optional[str]:
    facts = build_world_facts_from_observation(obs)
    return facts.agent.holding


def get_object_state_relation(obs: Any, item_id: str) -> Tuple[str, str]:
    facts = build_world_facts_from_observation(obs)
    return facts.get_object_state_relation(item_id)


def summarize_task_facts(obs: Any, *, max_objects: int = 8) -> Dict[str, Any]:
    facts = build_world_facts_from_observation(obs)
    return summarize_world_facts(facts, max_objects=max_objects)
