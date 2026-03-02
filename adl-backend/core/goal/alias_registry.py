from __future__ import annotations

# Canonical alias tables shared by goal components.

BACKEND_POI_ALIASES = {
    "table": "table_center",
    "center": "table_center",
    "table_center": "table_center",
    "fridge": "fridge_zone",
    "fridge_zone": "fridge_zone",
    "stove": "stove_zone",
    "stove_zone": "stove_zone",
}

BACKEND_ITEM_ALIASES = {
    "red cube": "red_cube",
    "cube": "red_cube",
    "red_cube": "red_cube",
    "left half cube": "half_cube_left",
    "right half cube": "half_cube_right",
    "fridge door": "fridge_door",
    "door": "fridge_door",
    "fridge_door": "fridge_door",
    "fridge": "fridge_main",
    "fridge_main": "fridge_main",
    "table": "table_surface",
    "table_surface": "table_surface",
    "stove": "stove",
}

BACKEND_CONTAINER_ALIASES = {
    "fridge": "fridge_main",
    "refrigerator": "fridge_main",
    "fridge_main": "fridge_main",
    "table": "table_surface",
    "table_surface": "table_surface",
    "stove": "stove",
}


__all__ = [
    "BACKEND_POI_ALIASES",
    "BACKEND_ITEM_ALIASES",
    "BACKEND_CONTAINER_ALIASES",
]
