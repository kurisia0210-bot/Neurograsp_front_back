from __future__ import annotations

from typing import Iterable, Optional

from core.domain_config import (
    ITEM_NL_LABEL,
    MOVE_TARGET_BY_KEYWORD,
    OBJECT_ID_FRIDGE_DOOR,
    OBJECT_ID_FRIDGE_MAIN,
    OBJECT_ID_MEAT_HEATED,
    OBJECT_ID_MEAT_RAW,
    OBJECT_ID_OVEN,
    OBJECT_ID_OVEN_DOOR,
    OBJECT_ID_PRIMARY_ITEM,
    OBJECT_ID_PRIMARY_ITEM_ALIASES,
    POI_FRIDGE_ZONE,
    POI_STOVE_ZONE,
    POI_TABLE_CENTER,
    STATE_CLOSED,
    STATE_IN_FRIDGE,
    STATE_IN_HAND,
    STATE_ON_TABLE,
    STATE_OPEN,
    TASK_TOKENS_FRIDGE,
    TASK_TOKENS_HEAT,
    TASK_TOKENS_ITEM,
    TASK_TOKENS_OVEN,
    TASK_TOKENS_PUT_VERBS,
    TASK_VERB_CLOSE,
    TASK_VERB_HEAT,
    TASK_VERB_OPEN,
    TASK_VERB_PICK,
    TASK_VERBS_COOK,
    TASK_VERBS_MOVE,
    TASK_VERBS_PLACE,
)
from schema.payload import (
    ActionPayload,
    AgentActionType,
    InteractionType,
    ObservationPayload,
)


def decide_rule_action(obs: ObservationPayload) -> ActionPayload:
    task = _normalize_task(obs.global_task)

    if _is_put_primary_item_in_fridge_task(task):
        return _rule_put_primary_item_in_fridge(obs)

    if _is_heat_meat_task(task):
        return _rule_heat_meat(obs)

    if task.startswith(TASK_VERB_PICK):
        return _rule_pick_primary_item(obs)

    if task.startswith(TASK_VERB_OPEN):
        if _task_mentions_oven(task):
            return _rule_open_oven_door(obs)
        return _rule_open_fridge_door(obs)

    if task.startswith(TASK_VERB_CLOSE):
        if _task_mentions_oven(task):
            return _rule_close_oven_door(obs)
        return _rule_close_fridge_door(obs)

    if task.startswith(TASK_VERBS_PLACE):
        return _rule_place_primary_item(obs)

    if task.startswith(TASK_VERBS_MOVE):
        return _rule_move_to(obs, task)

    return _think(obs, f"No atomic rule matched for task: {obs.global_task}")


def _is_put_primary_item_in_fridge_task(task: str) -> bool:
    has_verb = any(verb in task for verb in TASK_TOKENS_PUT_VERBS)
    has_item = any(token in task for token in TASK_TOKENS_ITEM)
    has_fridge = any(token in task for token in TASK_TOKENS_FRIDGE)
    return has_verb and has_item and has_fridge


def _is_heat_meat_task(task: str) -> bool:
    if task.startswith(TASK_VERB_HEAT):
        return True
    has_verb = any(verb in task for verb in TASK_VERBS_COOK)
    has_target = any(token in task for token in TASK_TOKENS_HEAT)
    return has_verb and has_target


def _task_mentions_oven(task: str) -> bool:
    return any(token in task for token in TASK_TOKENS_OVEN)


def _rule_put_primary_item_in_fridge(obs: ObservationPayload) -> ActionPayload:
    holding = _get_holding(obs)
    item_id = _resolve_primary_item_id(obs, holding)
    item_state = _get_object_state_by_ids(obs, OBJECT_ID_PRIMARY_ITEM_ALIASES)
    door_state = _get_object_state(obs, OBJECT_ID_FRIDGE_DOOR)
    location = _get_location(obs)

    if item_state == STATE_IN_FRIDGE:
        if door_state == STATE_OPEN:
            return _interact(obs, InteractionType.CLOSE, OBJECT_ID_FRIDGE_DOOR, f"Close {OBJECT_ID_FRIDGE_DOOR}")
        return _finish(obs, f"Success: {ITEM_NL_LABEL} is in fridge.")

    if not _item_is_in_hand(holding, item_state):
        if location != POI_TABLE_CENTER:
            return _move_to(obs, POI_TABLE_CENTER, f"Move to {POI_TABLE_CENTER}")
        if item_state == STATE_ON_TABLE:
            return _interact(obs, InteractionType.PICK, item_id, f"Pick {ITEM_NL_LABEL}")
        return _think(obs, f"Cannot pick {ITEM_NL_LABEL} from state={item_state}")

    if location != POI_FRIDGE_ZONE:
        return _move_to(obs, POI_FRIDGE_ZONE, f"Move to {POI_FRIDGE_ZONE}")

    if door_state == STATE_CLOSED:
        return _interact(obs, InteractionType.OPEN, OBJECT_ID_FRIDGE_DOOR, f"Open {OBJECT_ID_FRIDGE_DOOR}")

    if door_state not in (None, STATE_OPEN):
        return _think(obs, f"Cannot place because {OBJECT_ID_FRIDGE_DOOR} state={door_state}")

    return _interact(
        obs,
        InteractionType.PLACE,
        OBJECT_ID_FRIDGE_MAIN,
        f"Place {ITEM_NL_LABEL} in {OBJECT_ID_FRIDGE_MAIN}",
    )


def _rule_heat_meat(obs: ObservationPayload) -> ActionPayload:
    location = _get_location(obs)
    oven_door_state = _get_object_state(obs, OBJECT_ID_OVEN_DOOR)

    heated_state = _get_object_state(obs, OBJECT_ID_MEAT_HEATED)
    if heated_state is not None:
        return _finish(obs, "Success: meat is heated.")

    raw_state = _get_object_state(obs, OBJECT_ID_MEAT_RAW)
    if raw_state is None:
        return _think(obs, f"Cannot heat: {OBJECT_ID_MEAT_RAW} not found.")

    meat_on_oven = _is_object_on_target(obs, OBJECT_ID_MEAT_RAW, OBJECT_ID_OVEN)

    if not meat_on_oven:
        if location == POI_TABLE_CENTER and not _last_action_is_pick_meat(obs):
            return _interact(obs, InteractionType.PICK, OBJECT_ID_MEAT_RAW, f"Pick {OBJECT_ID_MEAT_RAW}")

        if location != POI_STOVE_ZONE:
            return _move_to(obs, POI_STOVE_ZONE, f"Move to {POI_STOVE_ZONE}")

        if oven_door_state == STATE_CLOSED:
            return _interact(obs, InteractionType.OPEN, OBJECT_ID_OVEN_DOOR, f"Open {OBJECT_ID_OVEN_DOOR}")

        return _interact(obs, InteractionType.PLACE, OBJECT_ID_OVEN, f"Place {OBJECT_ID_MEAT_RAW} on {OBJECT_ID_OVEN}")

    if oven_door_state == STATE_OPEN:
        return _interact(obs, InteractionType.CLOSE, OBJECT_ID_OVEN_DOOR, f"Close {OBJECT_ID_OVEN_DOOR}")

    if oven_door_state == STATE_CLOSED:
        return _interact(obs, InteractionType.OPEN, OBJECT_ID_OVEN_DOOR, f"Open {OBJECT_ID_OVEN_DOOR}")

    return _think(obs, "Waiting for oven heating result.")


def _rule_pick_primary_item(obs: ObservationPayload) -> ActionPayload:
    holding = _get_holding(obs)
    item_state = _get_object_state_by_ids(obs, OBJECT_ID_PRIMARY_ITEM_ALIASES)
    item_id = _resolve_primary_item_id(obs, holding)

    if _item_is_in_hand(holding, item_state):
        return _finish(obs, f"Success: holding {ITEM_NL_LABEL}.")

    if item_state == STATE_ON_TABLE:
        return _interact(obs, InteractionType.PICK, item_id, f"Pick {ITEM_NL_LABEL}")

    return _think(obs, f"Cannot pick {ITEM_NL_LABEL} from state={item_state}")


def _rule_open_fridge_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, OBJECT_ID_FRIDGE_DOOR)

    if door_state == STATE_OPEN:
        return _finish(obs, f"Success: {OBJECT_ID_FRIDGE_DOOR} is open.")

    if door_state == STATE_CLOSED:
        return _interact(obs, InteractionType.OPEN, OBJECT_ID_FRIDGE_DOOR, f"Open {OBJECT_ID_FRIDGE_DOOR}")

    return _think(obs, f"Cannot open {OBJECT_ID_FRIDGE_DOOR} from state={door_state}")


def _rule_open_oven_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, OBJECT_ID_OVEN_DOOR)

    if door_state == STATE_OPEN:
        return _finish(obs, f"Success: {OBJECT_ID_OVEN_DOOR} is open.")

    if door_state == STATE_CLOSED:
        return _interact(obs, InteractionType.OPEN, OBJECT_ID_OVEN_DOOR, f"Open {OBJECT_ID_OVEN_DOOR}")

    return _think(obs, f"Cannot open {OBJECT_ID_OVEN_DOOR} from state={door_state}")


def _rule_close_fridge_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, OBJECT_ID_FRIDGE_DOOR)

    if door_state == STATE_CLOSED:
        return _finish(obs, f"Success: {OBJECT_ID_FRIDGE_DOOR} is closed.")

    if door_state == STATE_OPEN:
        return _interact(obs, InteractionType.CLOSE, OBJECT_ID_FRIDGE_DOOR, f"Close {OBJECT_ID_FRIDGE_DOOR}")

    return _think(obs, f"Cannot close {OBJECT_ID_FRIDGE_DOOR} from state={door_state}")


def _rule_close_oven_door(obs: ObservationPayload) -> ActionPayload:
    door_state = _get_object_state(obs, OBJECT_ID_OVEN_DOOR)

    if door_state == STATE_CLOSED:
        return _finish(obs, f"Success: {OBJECT_ID_OVEN_DOOR} is closed.")

    if door_state == STATE_OPEN:
        return _interact(obs, InteractionType.CLOSE, OBJECT_ID_OVEN_DOOR, f"Close {OBJECT_ID_OVEN_DOOR}")

    return _think(obs, f"Cannot close {OBJECT_ID_OVEN_DOOR} from state={door_state}")


def _rule_place_primary_item(obs: ObservationPayload) -> ActionPayload:
    holding = _get_holding(obs)
    item_state = _get_object_state_by_ids(obs, OBJECT_ID_PRIMARY_ITEM_ALIASES)

    if item_state == STATE_IN_FRIDGE:
        return _finish(obs, f"Success: {ITEM_NL_LABEL} is in fridge.")

    if _item_is_in_hand(holding, item_state):
        return _interact(
            obs,
            InteractionType.PLACE,
            OBJECT_ID_FRIDGE_MAIN,
            f"Place {ITEM_NL_LABEL} in {OBJECT_ID_FRIDGE_MAIN}",
        )

    return _think(obs, f"Cannot place: {ITEM_NL_LABEL} is not in hand.")


def _rule_move_to(obs: ObservationPayload, task: str) -> ActionPayload:
    current_location = _get_location(obs)

    target_poi = None
    for keyword, poi in MOVE_TARGET_BY_KEYWORD.items():
        if keyword in task:
            target_poi = poi
            break

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


def _get_object_relation(obs: ObservationPayload, object_id: str) -> str:
    for obj in obs.nearby_objects:
        oid = obj.id.value if hasattr(obj.id, "value") else str(obj.id)
        if oid == object_id:
            return str(getattr(obj, "relation", "") or "")
    return ""


def _is_object_on_target(obs: ObservationPayload, object_id: str, target_id: str) -> bool:
    relation = _get_object_relation(obs, object_id).lower()
    return relation == f"on {target_id}".lower()


def _last_action_is_pick_meat(obs: ObservationPayload) -> bool:
    action = obs.last_action
    result = obs.last_result
    if action is None or result is None or result.success is not True:
        return False

    action_type = action.type.value if hasattr(action.type, "value") else str(action.type)
    if action_type != AgentActionType.INTERACT.value:
        return False

    interaction_type = action.interaction_type.value if hasattr(action.interaction_type, "value") else str(action.interaction_type)
    target_item = action.target_item.value if hasattr(action.target_item, "value") else str(action.target_item)

    return interaction_type == InteractionType.PICK.value and target_item in (OBJECT_ID_MEAT_RAW, OBJECT_ID_MEAT_HEATED)


def _get_object_state_by_ids(obs: ObservationPayload, object_ids: Iterable[str]) -> Optional[str]:
    for object_id in object_ids:
        state = _get_object_state(obs, object_id)
        if state is not None:
            return state
    return None


def _resolve_primary_item_id(obs: ObservationPayload, holding: Optional[str]) -> str:
    for obj in obs.nearby_objects:
        oid = obj.id.value if hasattr(obj.id, "value") else str(obj.id)
        if oid in OBJECT_ID_PRIMARY_ITEM_ALIASES:
            return oid

    if holding in OBJECT_ID_PRIMARY_ITEM_ALIASES:
        return holding

    return OBJECT_ID_PRIMARY_ITEM


def _item_is_in_hand(holding: Optional[str], item_state: Optional[str]) -> bool:
    return item_state == STATE_IN_HAND or holding in OBJECT_ID_PRIMARY_ITEM_ALIASES


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

