"""Centralized domain constants for the current kitchen MVP."""

# Primary interactive item (canonical id + backward-compatible ids).
OBJECT_ID_PRIMARY_ITEM = "apple_1"
OBJECT_ID_PRIMARY_ITEM_ALIASES = ("apple_1", "red_cube")
ITEM_NL_LABEL = "apple"

# Heat target (plane mapped as meat).
OBJECT_ID_MEAT_RAW = "meat_raw"
OBJECT_ID_MEAT_HEATED = "meat_heated"
OBJECT_ID_HEAT_TARGET_ALIASES = (OBJECT_ID_MEAT_RAW, OBJECT_ID_MEAT_HEATED)

# Other object ids
OBJECT_ID_FRIDGE_MAIN = "fridge_main"
OBJECT_ID_FRIDGE_DOOR = "fridge_door"
OBJECT_ID_TABLE_SURFACE = "table_surface"
OBJECT_ID_OVEN = "oven"
OBJECT_ID_OVEN_DOOR = "oven_door"

# POI ids
POI_TABLE_CENTER = "table_center"
POI_FRIDGE_ZONE = "fridge_zone"
POI_STOVE_ZONE = "stove_zone"

# Object states
STATE_ON_TABLE = "on_table"
STATE_IN_HAND = "in_hand"
STATE_IN_FRIDGE = "in_fridge"
STATE_OPEN = "open"
STATE_CLOSED = "closed"

# Task keywords
TASK_VERB_PICK = "pick"
TASK_VERB_OPEN = "open"
TASK_VERB_CLOSE = "close"
TASK_VERB_HEAT = "heat"
TASK_VERBS_PLACE = ("place", "put")
TASK_VERBS_MOVE = ("move", "go")
TASK_VERBS_COOK = ("cook", "heat")

TASK_TOKENS_PUT_VERBS = ("put", "place")
TASK_TOKENS_ITEM = ("apple", "apple_1", "red cube", "red_cube", "cube")
TASK_TOKENS_FRIDGE = ("fridge",)
TASK_TOKENS_OVEN = ("oven", "stove")
TASK_TOKENS_HEAT = ("meat", "meat_raw", "meat_heated", "plane", "plate")

MOVE_TARGET_BY_KEYWORD = {
    "fridge": POI_FRIDGE_ZONE,
    "table": POI_TABLE_CENTER,
    "stove": POI_STOVE_ZONE,
    "oven": POI_STOVE_ZONE,
}


__all__ = [
    "OBJECT_ID_PRIMARY_ITEM",
    "OBJECT_ID_PRIMARY_ITEM_ALIASES",
    "ITEM_NL_LABEL",
    "OBJECT_ID_MEAT_RAW",
    "OBJECT_ID_MEAT_HEATED",
    "OBJECT_ID_HEAT_TARGET_ALIASES",
    "OBJECT_ID_FRIDGE_MAIN",
    "OBJECT_ID_FRIDGE_DOOR",
    "OBJECT_ID_TABLE_SURFACE",
    "OBJECT_ID_OVEN",
    "OBJECT_ID_OVEN_DOOR",
    "POI_TABLE_CENTER",
    "POI_FRIDGE_ZONE",
    "POI_STOVE_ZONE",
    "STATE_ON_TABLE",
    "STATE_IN_HAND",
    "STATE_IN_FRIDGE",
    "STATE_OPEN",
    "STATE_CLOSED",
    "TASK_VERB_PICK",
    "TASK_VERB_OPEN",
    "TASK_VERB_CLOSE",
    "TASK_VERB_HEAT",
    "TASK_VERBS_PLACE",
    "TASK_VERBS_MOVE",
    "TASK_VERBS_COOK",
    "TASK_TOKENS_PUT_VERBS",
    "TASK_TOKENS_ITEM",
    "TASK_TOKENS_FRIDGE",
    "TASK_TOKENS_OVEN",
    "TASK_TOKENS_HEAT",
    "MOVE_TARGET_BY_KEYWORD",
]

