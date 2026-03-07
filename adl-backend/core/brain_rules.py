from __future__ import annotations

from typing import Optional

from schema.payload import (
    ActionPayload,
    AgentActionType,
    InteractionType,
    ObservationPayload,
)


def decide_rule_action(obs: ObservationPayload) -> ActionPayload:
    task = _normalize_task(obs.global_task)

    if task.startswith("pick"):
        return _rule_pick_red_cube(obs)

    if task.startswith("open"):
        return _rule_open_fridge_door(obs)

    if task.startswith("close"):
        return _rule_close_fridge_door(obs)

    if task.startswith("place") or task.startswith("put"):
        return _rule_place_red_cube(obs)

    if task.startswith("move") or task.startswith("go"):
        return _rule_move_to(obs, task)

    return _think(obs, f"No atomic rule matched for task: {obs.global_task}")


def _rule_pick_red_cube(obs: ObservationPayload) -> ActionPayload:
    holding = _get_holding(obs)
    red_cube_state = _get_object_state(obs, "red_cube")

    if holding == "red_cube" or red_cube_state == "in_hand":
        return _finish(obs, "Success: holding red_cube.")

    if red_cube_state == "on_table":
        return _interact(obs, InteractionType.PICK, "red_cube", "Pick red_cube")

    return _think(obs, f"Cannot pick red_cube from state={red_cube_state}")


def _rule_open_fridge_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, "fridge_door")

    if door_state == "open":
        return _finish(obs, "Success: fridge_door is open.")

    if door_state == "closed":
        return _interact(obs, InteractionType.OPEN, "fridge_door", "Open fridge_door")

    return _think(obs, f"Cannot open fridge_door from state={door_state}")


def _rule_close_fridge_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, "fridge_door")

    if door_state == "closed":
        return _finish(obs, "Success: fridge_door is closed.")

    if door_state == "open":
        return _interact(obs, InteractionType.CLOSE, "fridge_door", "Close fridge_door")

    return _think(obs, f"Cannot close fridge_door from state={door_state}")


def _rule_place_red_cube(obs: ObservationPayload) -> ActionPayload:
    holding = _get_holding(obs)
    red_cube_state = _get_object_state(obs, "red_cube")

    if red_cube_state == "in_fridge":
        return _finish(obs, "Success: red_cube is in fridge.")

    if holding == "red_cube" or red_cube_state == "in_hand":
        return _interact(obs, InteractionType.PLACE, "fridge_main", "Place red_cube in fridge_main")

    return _think(obs, "Cannot place: red_cube is not in hand.")


def _rule_move_to(obs: ObservationPayload, task: str) -> ActionPayload:
    current_location = _get_location(obs)

    target_poi = None
    if "fridge" in task:
        target_poi = "fridge_zone"
    elif "table" in task:
        target_poi = "table_center"
    elif "stove" in task:
        target_poi = "stove_zone"

    if not target_poi:
        return _think(obs, "Unsupported move target.")

    if current_location == target_poi:
        return _finish(obs, f"Success: already at {target_poi}.")

    return _move_to(obs, target_poi, f"Move to {target_poi}")


def _normalize_task(task: str) -> str:
    return (task or "").strip().lower().replace("_", " ")


def _get_location(obs: ObservationPayload) -> str:
    location = obs.agent.location
    return location.value if hasattr(location, "value") else str(location)


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


def _move_to(obs: ObservationPayload, target_poi: str, content: str) -> ActionPayload:
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.MOVE_TO,
        target_poi=target_poi,
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


def _finish(obs: ObservationPayload, content: str) -> ActionPayload:
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.FINISH,
        content=content,
    )


__all__ = ["decide_rule_action"]