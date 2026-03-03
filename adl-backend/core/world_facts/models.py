from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any, Dict, Iterable, Optional, Tuple

from core.world_facts.constants import WORLD_FACTS_VERSION


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

    # Keep object lookups centralized for a stable query boundary.
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
        # Local import avoids an import cycle between models and serde.
        from core.world_facts.serde import world_facts_to_dict

        return world_facts_to_dict(self)

    def to_json(self, *, ensure_ascii: bool = True) -> str:
        # Local import avoids an import cycle between models and serde.
        from core.world_facts.serde import world_facts_to_json

        return world_facts_to_json(self, ensure_ascii=ensure_ascii)


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
    "WorldFactAgent",
    "WorldFactObject",
    "WorldFacts",
    "world_facts_from_objects",
]
