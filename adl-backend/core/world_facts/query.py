from __future__ import annotations

from typing import Any, Dict

from core.world_facts.models import WorldFacts
from core.world_facts.serde import world_facts_to_dict


def build_task_facts_dict(facts: WorldFacts) -> Dict[str, Any]:
    return world_facts_to_dict(facts)


def summarize_world_facts(facts: WorldFacts, *, max_objects: int = 8) -> Dict[str, Any]:
    selected = {}
    for idx, obj in enumerate(facts.objects):
        if idx >= max_objects:
            break
        selected[obj.item_id] = {
            "state": obj.state,
            "relation": obj.relation,
        }
    return {
        "agent": facts.agent.to_dict(),
        "objects": selected,
        "object_count": len(facts.objects),
        "relations": {
            "inside": dict(facts.relations_inside),
            "on": dict(facts.relations_on),
        },
    }


__all__ = ["build_task_facts_dict", "summarize_world_facts"]
