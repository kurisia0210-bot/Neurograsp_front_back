from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

from core.world_facts.constants import WORLD_FACTS_VERSION
from core.world_facts.models import WorldFactAgent, WorldFactObject, WorldFacts


def enum_to_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def to_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(enum_to_value(value)).strip()
    return text if text != "" else None


def world_facts_to_dict(facts: WorldFacts) -> Dict[str, Any]:
    objects = {
        obj.item_id: obj.to_dict()
        for obj in facts.objects
    }
    return {
        "version": facts.version,
        "timestamp": facts.timestamp,
        "agent": facts.agent.to_dict(),
        "objects": objects,
        "relations": {
            "inside": dict(facts.relations_inside),
            "on": dict(facts.relations_on),
        },
    }


def world_facts_to_json(facts: WorldFacts, *, ensure_ascii: bool = True) -> str:
    return json.dumps(
        world_facts_to_dict(facts),
        ensure_ascii=ensure_ascii,
        separators=(",", ":"),
        sort_keys=True,
    )


def world_facts_from_dict(payload: Dict[str, Any]) -> WorldFacts:
    data = dict(payload or {})
    agent_raw = dict(data.get("agent") or {})
    objects_raw = dict(data.get("objects") or {})

    relations_raw = dict(data.get("relations") or {})
    inside_raw = dict(relations_raw.get("inside") or {})
    on_raw = dict(relations_raw.get("on") or {})

    objects: list[WorldFactObject] = []
    for item_id in sorted(objects_raw.keys()):
        value = objects_raw.get(item_id)
        if not isinstance(value, dict):
            value = {}
        state = to_text(value.get("state"))
        relation = (to_text(value.get("relation")) or "").strip().lower()
        objects.append(WorldFactObject(item_id=str(item_id), state=state, relation=relation))

    return WorldFacts(
        version=int(data.get("version") or WORLD_FACTS_VERSION),
        timestamp=float(data.get("timestamp") or time.time()),
        agent=WorldFactAgent(
            location=to_text(agent_raw.get("location")),
            holding=to_text(agent_raw.get("holding")),
        ),
        objects=tuple(objects),
        relations_inside=tuple(sorted((str(k), str(v)) for k, v in inside_raw.items() if k and v)),
        relations_on=tuple(sorted((str(k), str(v)) for k, v in on_raw.items() if k and v)),
    )


def world_facts_from_json(text: str) -> WorldFacts:
    data = json.loads(text or "{}")
    if not isinstance(data, dict):
        raise ValueError("WorldFacts JSON payload must be an object.")
    return world_facts_from_dict(data)


__all__ = [
    "enum_to_value",
    "to_text",
    "world_facts_to_dict",
    "world_facts_to_json",
    "world_facts_from_dict",
    "world_facts_from_json",
]
