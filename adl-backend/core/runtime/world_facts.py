from __future__ import annotations

# Compatibility shim: keep old import path working during migration.
from core.world_facts import (
    WORLD_FACTS_VERSION,
    FactsProvider,
    ObservationFactsProvider,
    WorldFactAgent,
    WorldFactObject,
    WorldFacts,
    build_task_facts_dict,
    build_world_facts_from_observation,
    summarize_world_facts,
    to_observation_world_view,
    world_facts_from_dict,
    world_facts_from_json,
    world_facts_from_objects,
    world_facts_to_dict,
    world_facts_to_json,
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
    "world_facts_to_dict",
    "world_facts_to_json",
    "build_world_facts_from_observation",
    "build_task_facts_dict",
    "summarize_world_facts",
    "to_observation_world_view",
]
