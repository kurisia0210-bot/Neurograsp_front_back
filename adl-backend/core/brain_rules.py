from __future__ import annotations

from typing import Optional

from schema.payload import (
    ActionPayload,
    AgentActionType,
    InteractionType,
    ObservationPayload,
)


def decide_rule_action(obs: ObservationPayload) -> ActionPayload:
    task = obs.global_task.lower()
    location = _get_location(obs)
    holding = _get_holding(obs)

    if "put" in task and "red_cube" in task and "fridge" in task:
        return rule_put_in_fridge(obs, location=location, holding=holding)

    if "open" in task and "door" in task:
        return _interact(obs, InteractionType.OPEN, "fridge_door", "Open fridge door")

    return _think(obs, f"No rule matched for task: {obs.global_task}")


def rule_put_in_fridge(
    obs: ObservationPayload,
    location: str,
    holding: Optional[str],
) -> ActionPayload:
    if holding != "red_cube":
        return _interact(obs, InteractionType.PICK, "red_cube", "Pick up red cube")

    door_state = _get_object_state(obs, "fridge_door")
    if door_state == "closed":
        return _interact(obs, InteractionType.OPEN, "fridge_door", "Open fridge door")

    _ = location
    return _interact(obs, InteractionType.PLACE, "fridge_main", "Place cube in fridge")


def _get_location(obs: ObservationPayload) -> str:
    loc = obs.agent.location
    return loc.value if hasattr(loc, "value") else str(loc)


def _get_holding(obs: ObservationPayload) -> Optional[str]:
    holding = obs.agent.holding
    if holding is None:
        return None
    return holding.value if hasattr(holding, "value") else str(holding)


def _get_object_state(obs: ObservationPayload, object_id: str) -> Optional[str]:
    for obj in obs.nearby_objects:
        oid = obj.id.value if hasattr(obj.id, "value") else str(obj.id)
        if oid == object_id:
            state = obj.state
            return state.value if hasattr(state, "value") else str(state)
    return None


def _interact(
    obs: ObservationPayload,
    interaction_type: InteractionType,
    target_item: str,
    content: str,
) -> ActionPayload:
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.INTERACT,
        interaction_type=interaction_type,
        target_item=target_item,
        content=content,
    )


def _think(obs: ObservationPayload, content: str) -> ActionPayload:
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.THINK,
        content=content,
    )


__all__ = ["decide_rule_action", "rule_put_in_fridge"]