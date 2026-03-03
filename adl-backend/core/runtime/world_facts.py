from __future__ import annotations

from dataclasses import dataclass
import json
import time
from types import SimpleNamespace
from typing import Any, Dict, Iterable, Optional, Protocol, Tuple


WORLD_FACTS_VERSION = 1


def _enum_to_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _to_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(_enum_to_value(value)).strip()
    return text if text != "" else None


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


@dataclass(frozen=True)
class WorldFactAgent:
    location: Optional[str]
    holding: Optional[str]

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {
            "location": self.location,
            "holding": self.holding,
        }


@dataclass(frozen=True)
class WorldFactObject:
    item_id: str
    state: Optional[str] = None
    relation: str = ""

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {
            "state": self.state,
            "relation": self.relation,
        }


@dataclass(frozen=True)
class WorldFacts:
    version: int
    timestamp: float
    agent: WorldFactAgent
    objects: Tuple[WorldFactObject, ...]
    relations_inside: Tuple[Tuple[str, str], ...]
    relations_on: Tuple[Tuple[str, str], ...]

    # Keep lookups centralized so business modules do not parse raw payload fields.
    def get_object(self, item_id: str) -> Optional[WorldFactObject]:
        for obj in self.objects:
            if obj.item_id == item_id:
                return obj
        return None

    def get_object_state_relation(self, item_id: str) -> Tuple[str, str]:
        obj = self.get_object(item_id)
        if obj is None:
            return "MISSING", ""
        state = obj.state if obj.state is not None else "MISSING"
        relation = (obj.relation or "").strip().lower()
        return state, relation

    def inside_target_of(self, item_id: str) -> Optional[str]:
        for source, target in self.relations_inside:
            if source == item_id:
                return target
        return None

    def on_target_of(self, item_id: str) -> Optional[str]:
        for source, target in self.relations_on:
            if source == item_id:
                return target
        return None

    def to_dict(self) -> Dict[str, Any]:
        objects = {
            obj.item_id: obj.to_dict()
            for obj in self.objects
        }
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "agent": self.agent.to_dict(),
            "objects": objects,
            "relations": {
                "inside": dict(self.relations_inside),
                "on": dict(self.relations_on),
            },
        }

    def to_json(self, *, ensure_ascii: bool = True) -> str:
        return json.dumps(
            self.to_dict(),
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
        state = _to_text(value.get("state"))
        relation = (_to_text(value.get("relation")) or "").strip().lower()
        objects.append(WorldFactObject(item_id=str(item_id), state=state, relation=relation))

    return WorldFacts(
        version=int(data.get("version") or WORLD_FACTS_VERSION),
        timestamp=float(data.get("timestamp") or time.time()),
        agent=WorldFactAgent(
            location=_to_text(agent_raw.get("location")),
            holding=_to_text(agent_raw.get("holding")),
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
        agent_in["location"] = _enum_to_value(getattr(getattr(obs, "agent", None), "location", None))
    if "holding" not in agent_in:
        agent_in["holding"] = _enum_to_value(getattr(getattr(obs, "agent", None), "holding", None))

    nearby = getattr(obs, "nearby_objects", None) or []
    for raw_obj in nearby:
        item_id = _to_text(getattr(raw_obj, "id", None))
        if not item_id:
            continue

        state = _to_text(getattr(raw_obj, "state", None))
        relation = (_to_text(getattr(raw_obj, "relation", None)) or "").strip().lower()

        existing = objects_in.get(item_id)
        if not isinstance(existing, dict):
            existing = {}
        if "state" not in existing or existing.get("state") in {None, ""}:
            existing["state"] = state
        if "relation" not in existing or existing.get("relation") in {None, ""}:
            existing["relation"] = relation
        objects_in[item_id] = existing

        rel_parts = _extract_relations_from_text(relation)
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
    def provide(self, obs: Any) -> WorldFacts:
        return build_world_facts_from_observation(obs)


def build_task_facts_dict(facts: WorldFacts) -> Dict[str, Any]:
    return facts.to_dict()


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


def to_observation_world_view(obs: Any, facts: WorldFacts) -> Any:
    # This adapter preserves trace/task fields while forcing state reads to come from WorldFacts.
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


def world_facts_from_objects(
    *,
    version: int = WORLD_FACTS_VERSION,
    timestamp: Optional[float] = None,
    location: Optional[str] = None,
    holding: Optional[str] = None,
    objects: Optional[Iterable[WorldFactObject]] = None,
    relations_inside: Optional[Iterable[Tuple[str, str]]] = None,
    relations_on: Optional[Iterable[Tuple[str, str]]] = None,
) -> WorldFacts:
    return WorldFacts(
        version=int(version),
        timestamp=float(timestamp if timestamp is not None else time.time()),
        agent=WorldFactAgent(location=location, holding=holding),
        objects=tuple(sorted(objects or (), key=lambda x: x.item_id)),
        relations_inside=tuple(sorted(relations_inside or ())),
        relations_on=tuple(sorted(relations_on or ())),
    )


__all__ = [
    "WORLD_FACTS_VERSION",
    "WorldFactAgent",
    "WorldFactObject",
    "WorldFacts",
    "FactsProvider",
    "ObservationFactsProvider",
    "world_facts_from_dict",
    "world_facts_from_json",
    "world_facts_from_objects",
    "build_world_facts_from_observation",
    "build_task_facts_dict",
    "summarize_world_facts",
    "to_observation_world_view",
]
