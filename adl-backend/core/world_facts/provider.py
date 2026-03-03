from __future__ import annotations

from typing import Any, Dict, Optional, Protocol

from core.world_facts.constants import WORLD_FACTS_VERSION
from core.world_facts.models import WorldFacts
from core.world_facts.serde import enum_to_value, to_text, world_facts_from_dict


def extract_relations_from_text(relation_text: str) -> Dict[str, Optional[str]]:
    text = (relation_text or "").strip().lower()
    tokens = text.replace(",", " ").split()
    inside_target = None
    on_target = None
    for idx, token in enumerate(tokens):
        if token == "inside" and idx + 1 < len(tokens):
            inside_target = tokens[idx + 1]
        if token == "on" and idx + 1 < len(tokens):
            on_target = tokens[idx + 1]
    return {"inside": inside_target, "on": on_target}


def build_world_facts_from_observation(obs: Any) -> WorldFacts:
    facts_in = getattr(obs, "task_facts", None)
    if isinstance(facts_in, dict):
        facts = dict(facts_in)
    else:
        facts = {}

    agent_in = dict(facts.get("agent") or {})
    objects_in = dict(facts.get("objects") or {})
    relations_in = dict(facts.get("relations") or {})
    inside_in = dict(relations_in.get("inside") or {})
    on_in = dict(relations_in.get("on") or {})

    if "location" not in agent_in:
        agent_in["location"] = enum_to_value(getattr(getattr(obs, "agent", None), "location", None))
    if "holding" not in agent_in:
        agent_in["holding"] = enum_to_value(getattr(getattr(obs, "agent", None), "holding", None))

    nearby = getattr(obs, "nearby_objects", None) or []
    for raw_obj in nearby:
        item_id = to_text(getattr(raw_obj, "id", None))
        if not item_id:
            continue

        state = to_text(getattr(raw_obj, "state", None))
        relation = (to_text(getattr(raw_obj, "relation", None)) or "").strip().lower()

        existing = objects_in.get(item_id)
        if not isinstance(existing, dict):
            existing = {}
        if "state" not in existing or existing.get("state") in {None, ""}:
            existing["state"] = state
        if "relation" not in existing or existing.get("relation") in {None, ""}:
            existing["relation"] = relation
        objects_in[item_id] = existing

        rel_parts = extract_relations_from_text(relation)
        if rel_parts["inside"] and item_id not in inside_in:
            inside_in[item_id] = rel_parts["inside"]
        if rel_parts["on"] and item_id not in on_in:
            on_in[item_id] = rel_parts["on"]

    return world_facts_from_dict(
        {
            "version": facts.get("version", WORLD_FACTS_VERSION),
            "timestamp": getattr(obs, "timestamp", None),
            "agent": {
                "location": agent_in.get("location"),
                "holding": agent_in.get("holding"),
            },
            "objects": objects_in,
            "relations": {
                "inside": inside_in,
                "on": on_in,
            },
        }
    )


class FactsProvider(Protocol):
    def provide(self, obs: Any) -> WorldFacts:
        ...


class ObservationFactsProvider:
    # Single default provider for ObservationPayload -> WorldFacts.
    def provide(self, obs: Any) -> WorldFacts:
        return build_world_facts_from_observation(obs)


__all__ = [
    "FactsProvider",
    "ObservationFactsProvider",
    "extract_relations_from_text",
    "build_world_facts_from_observation",
]
