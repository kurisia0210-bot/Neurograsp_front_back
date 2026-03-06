from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional, Set, Tuple

from core.pipeline.common_v2 import make_action
from schema.payload import ActionPayload, ObservationPayload


class LLMProposerResponseParser:
    """
    Parses raw LLM output into `ActionPayload` with strict safety checks.

    Responsibilities:
    1. Parse raw JSON text from LLM.
    2. Normalize common aliases to schema-compliant values.
    3. Enforce proposer action boundary (no FINISH decision).
    4. Return safe THINK fallback on parse/validation errors.
    """

    # Proposer must not decide completion.
    NON_DELEGABLE_ACTION_TYPES: Set[str] = {"FINISH"}

    # Action types allowed at proposer output boundary.
    ALLOWED_PROPOSER_ACTION_TYPES: Set[str] = {"MOVE_TO", "INTERACT", "THINK", "IDLE", "SPEAK"}

    # Shorthand action aliases from LLM output.
    ACTION_TYPE_ALIASES: Dict[str, Tuple[str, Optional[str]]] = {
        "move": ("MOVE_TO", None),
        "go": ("MOVE_TO", None),
        "walk": ("MOVE_TO", None),
        "mv": ("MOVE_TO", None),
        "pick": ("INTERACT", "PICK"),
        "pickup": ("INTERACT", "PICK"),
        "pick_up": ("INTERACT", "PICK"),
        "hold": ("INTERACT", "PICK"),
        "grab": ("INTERACT", "PICK"),
        "place": ("INTERACT", "PLACE"),
        "put": ("INTERACT", "PLACE"),
        "open": ("INTERACT", "OPEN"),
        "close": ("INTERACT", "CLOSE"),
        "toggle": ("INTERACT", "TOGGLE"),
        "slice": ("INTERACT", "SLICE"),
        "cook": ("INTERACT", "COOK"),
    }

    # Value alias normalizers.
    POI_ALIASES: Dict[str, str] = {
        "table": "table_center",
        "table_center": "table_center",
        "center_table": "table_center",
        "fridge": "fridge_zone",
        "fridge_zone": "fridge_zone",
        "refrigerator": "fridge_zone",
        "stove": "stove_zone",
        "stove_zone": "stove_zone",
    }
    ITEM_ALIASES: Dict[str, str] = {
        "red_cube": "red_cube",
        "redcube": "red_cube",
        "red_cube_block": "red_cube",
        "fridge": "fridge_main",
        "fridge_main": "fridge_main",
        "fridge_door": "fridge_door",
        "table": "table_surface",
        "table_surface": "table_surface",
        "stove": "stove",
    }
    INTERACTION_ALIASES: Dict[str, str] = {
        "pick": "PICK",
        "pickup": "PICK",
        "pick_up": "PICK",
        "place": "PLACE",
        "put": "PLACE",
        "open": "OPEN",
        "close": "CLOSE",
        "toggle": "TOGGLE",
        "slice": "SLICE",
        "cook": "COOK",
        "none": "NONE",
    }

    @staticmethod
    def _to_key(value: Any) -> str:
        """Lowercase + underscore + strip non-identifier characters."""
        text = str(value).strip().lower()
        text = text.replace("-", "_").replace(" ", "_")
        text = re.sub(r"[^a-z0-9_]", "", text)
        return text

    def _normalize_payload(self, payload_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize action type, target aliases, interaction aliases, and target_length."""
        raw_type = payload_data.get("type")
        if raw_type not in (None, ""):
            type_key = self._to_key(raw_type)
            canonical = self.ACTION_TYPE_ALIASES.get(type_key)
            if canonical is not None:
                canonical_type, implied_interaction = canonical
                payload_data["type"] = canonical_type
                if implied_interaction and payload_data.get("interaction_type") in (None, ""):
                    payload_data["interaction_type"] = implied_interaction
            else:
                payload_data["type"] = str(raw_type).strip().upper()

        target_poi = payload_data.get("target_poi")
        if target_poi not in (None, ""):
            poi_key = self._to_key(target_poi)
            payload_data["target_poi"] = self.POI_ALIASES.get(poi_key, poi_key)

        target_item = payload_data.get("target_item")
        if target_item not in (None, ""):
            item_key = self._to_key(target_item)
            payload_data["target_item"] = self.ITEM_ALIASES.get(item_key, item_key)

        interaction_type = payload_data.get("interaction_type")
        if interaction_type not in (None, ""):
            interaction_key = self._to_key(interaction_type)
            payload_data["interaction_type"] = self.INTERACTION_ALIASES.get(
                interaction_key, interaction_key.upper()
            )

        target_length = payload_data.get("target_length")
        if isinstance(target_length, str) and target_length.strip().isdigit():
            payload_data["target_length"] = int(target_length.strip())
            target_length = payload_data["target_length"]
        if isinstance(target_length, int) and not (3 <= target_length <= 11):
            payload_data.pop("target_length", None)
        elif target_length is not None and not isinstance(target_length, int):
            payload_data.pop("target_length", None)

        return payload_data

    def parse_to_action(self, obs: ObservationPayload, raw_content: str) -> ActionPayload:
        """Parse and validate LLM output, then return a safe `ActionPayload`."""
        if not raw_content:
            return make_action(obs, type="THINK", content="LLM returned empty content.")

        try:
            clean = re.sub(r"```json|```", "", raw_content).strip()
            data = json.loads(clean)

            if not isinstance(data, dict):
                raise ValueError("LLM output must be a JSON object.")

            allowed = {
                "type",
                "target_poi",
                "target_item",
                "interaction_type",
                "target_length",
                "content",
            }
            payload_data = {k: v for k, v in data.items() if k in allowed}
            payload_data = self._normalize_payload(payload_data)

            payload_data.setdefault("type", "THINK")
            payload_data.setdefault("content", "LLM proposal parsed with defaults.")

            raw_type = payload_data.get("type", "THINK")
            action_type = str(raw_type).upper()

            if action_type in self.NON_DELEGABLE_ACTION_TYPES:
                return make_action(
                    obs,
                    type="THINK",
                    content=f"Blocked non-delegable action from proposer: {action_type}.",
                )

            if action_type not in self.ALLOWED_PROPOSER_ACTION_TYPES:
                # Strip accidental punctuation, e.g. `PICK."` -> `PICK`.
                cleaned_action_type = re.sub(r"[^A-Z_]", "", action_type)
                if cleaned_action_type:
                    action_type = cleaned_action_type

            if action_type not in self.ALLOWED_PROPOSER_ACTION_TYPES:
                # Compatibility fallback: top-level interaction verbs.
                if action_type in set(self.INTERACTION_ALIASES.values()):
                    payload_data.setdefault("interaction_type", action_type)
                    action_type = "INTERACT"
                else:
                    return make_action(
                        obs,
                        type="THINK",
                        content=f"Unsupported proposer action type: {action_type}.",
                    )

            payload_data["type"] = action_type
            return make_action(obs, **payload_data)

        except json.JSONDecodeError as exc:
            preview = raw_content[:300].replace("\n", "\\n")
            print(f"[ReasoningV2][LLMProposer] JSON ERROR: {exc}")
            print(f"[ReasoningV2][LLMProposer] RAW: {preview}")
            return make_action(obs, type="THINK", content=f"Invalid JSON from LLM: {str(exc)[:120]}")

        except Exception as exc:
            preview = raw_content[:300].replace("\n", "\\n")
            print(f"[ReasoningV2][LLMProposer] PARSE ERROR: {exc}")
            print(f"[ReasoningV2][LLMProposer] RAW: {preview}")
            return make_action(obs, type="THINK", content=f"LLM parse error: {str(exc)[:120]}")
