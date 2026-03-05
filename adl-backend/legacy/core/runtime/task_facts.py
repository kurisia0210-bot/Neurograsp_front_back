from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


def _enum_to_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _extract_relations_from_text(relation_text: str) -> Dict[str, Optional[str]]:
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


def normalize_task_facts(obs: Any) -> Dict[str, Any]:
    """
    Normalize task-relevant world facts into a stable shape.

    Shape:
    {
      "agent": {"location": str|None, "holding": str|None},
      "objects": {obj_id: {"state": str|None, "relation": str|None}},
      "relations": {"inside": {obj_id: container}, "on": {obj_id: surface}}
    }
    """
    facts_in = getattr(obs, "task_facts", None)
    if isinstance(facts_in, dict):
        agent = dict(facts_in.get("agent") or {})
        objects = dict(facts_in.get("objects") or {})
        relations = dict(facts_in.get("relations") or {})
        inside = dict(relations.get("inside") or {})
        on = dict(relations.get("on") or {})
    else:
        agent = {}
        objects = {}
        inside = {}
        on = {}

    if "location" not in agent:
        agent["location"] = _enum_to_value(getattr(getattr(obs, "agent", None), "location", None))
    if "holding" not in agent:
        agent["holding"] = _enum_to_value(getattr(getattr(obs, "agent", None), "holding", None))

    nearby = getattr(obs, "nearby_objects", None) or []
    for obj in nearby:
        obj_id = _enum_to_value(getattr(obj, "id", None))
        if not obj_id:
            continue
        state = _enum_to_value(getattr(obj, "state", None))
        relation = getattr(obj, "relation", None)

        existing = objects.get(obj_id)
        if not isinstance(existing, dict):
            existing = {}
        if "state" not in existing or existing.get("state") in {None, ""}:
            existing["state"] = state
        if "relation" not in existing or existing.get("relation") in {None, ""}:
            existing["relation"] = relation
        objects[obj_id] = existing

        rel_parts = _extract_relations_from_text(str(relation or ""))
        if rel_parts["inside"] and obj_id not in inside:
            inside[obj_id] = rel_parts["inside"]
        if rel_parts["on"] and obj_id not in on:
            on[obj_id] = rel_parts["on"]

    return {
        "agent": {
            "location": agent.get("location"),
            "holding": agent.get("holding"),
        },
        "objects": objects,
        "relations": {
            "inside": inside,
            "on": on,
        },
    }


def get_agent_location(obs: Any) -> Optional[str]:
    facts = normalize_task_facts(obs)
    location = facts.get("agent", {}).get("location")
    if location is not None:
        return str(location)
    return None


def get_agent_holding(obs: Any) -> Optional[str]:
    facts = normalize_task_facts(obs)
    holding = facts.get("agent", {}).get("holding")
    if holding is not None:
        return str(holding)
    return None


def get_object_state_relation(obs: Any, item_id: str) -> Tuple[str, str]:
    facts = normalize_task_facts(obs)
    obj = facts.get("objects", {}).get(item_id)
    if isinstance(obj, dict):
        state = obj.get("state")
        relation = obj.get("relation")
        if state is not None or relation:
            return str(state) if state is not None else "MISSING", str(relation or "").strip().lower()
    return "MISSING", ""


def summarize_task_facts(obs: Any, *, max_objects: int = 8) -> Dict[str, Any]:
    facts = normalize_task_facts(obs)
    objects = facts.get("objects", {})
    selected = {}
    for idx, key in enumerate(sorted(objects.keys())):
        if idx >= max_objects:
            break
        value = objects.get(key) or {}
        if isinstance(value, dict):
            selected[key] = {
                "state": value.get("state"),
                "relation": value.get("relation"),
            }

    return {
        "agent": facts.get("agent", {}),
        "objects": selected,
        "object_count": len(objects),
        "relations": facts.get("relations", {}),
    }

