from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from schema.payload import ObservationPayload


class LLMProposerPromptBuilder:
    """
    Builds structured prompt messages for the v2 LLM proposer.

    Responsibilities:
    1. Convert `ObservationPayload` into an LLM-friendly context block.
    2. Build system and user messages with explicit schema constraints.
    3. Sanitize text fields and apply size limits.
    4. Include task and previous-step context in a stable format.
    """

    # Text length limits
    MAX_TASK_CHARS = 240
    MAX_ACTION_CONTENT_CHARS = 120
    MAX_FAILURE_REASON_CHARS = 160

    # Default system prompt for constrained action proposal
    DEFAULT_SYSTEM_PROMPT = (
        "You are a safe embodied agent planner. "
        "Output only one JSON object. "
        "Schema keys: type, target_poi, target_item, interaction_type, target_length, content. "
        "Allowed type: MOVE_TO, INTERACT, THINK, IDLE, SPEAK. "
        "Allowed target_poi: table_center, fridge_zone, stove_zone. "
        "Allowed target_item: red_cube, half_cube_left, half_cube_right, fridge_main, fridge_door, stove, table_surface. "
        "Allowed interaction_type: PICK, PLACE, SLICE, COOK, OPEN, CLOSE, TOGGLE, NONE. "
        "If the intent is PICK/PLACE/OPEN/CLOSE/TOGGLE/SLICE/COOK, set type=INTERACT and put the verb in interaction_type. "
        "NEVER output FINISH. "
        "Use short content text."
    )

    def __init__(self, system_prompt: Optional[str] = None) -> None:
        """Initialize prompt builder with an optional custom system prompt."""
        self._system_prompt = system_prompt or self.DEFAULT_SYSTEM_PROMPT

    @staticmethod
    def _enum_value(value) -> str:
        """Return enum `.value` when available, otherwise return the original value."""
        return value.value if hasattr(value, "value") else value

    @staticmethod
    def _sanitize_text(value: object, *, max_chars: int) -> str:
        """
        Normalize whitespace and truncate long text to `max_chars`.

        - Converts `None` to empty string.
        - Collapses repeated whitespace.
        - Appends `...` when truncated.
        """
        text = "" if value is None else str(value)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > max_chars:
            return text[: max_chars - 3] + "..."
        return text

    def _build_goal_input(self, obs: ObservationPayload) -> str:
        """
        Build task input block.

        Priority:
        1. Structured `goal_spec` (if provided)
        2. Fallback to `global_task` text
        """
        global_task = self._sanitize_text(obs.global_task, max_chars=self.MAX_TASK_CHARS)

        if obs.goal_spec is None:
            return f'global_task="{global_task}"'

        goal_type = self._sanitize_text(obs.goal_spec.goal_type, max_chars=48)
        goal_id = self._sanitize_text(obs.goal_spec.goal_id, max_chars=80)
        goal_dsl = self._sanitize_text(obs.goal_spec.dsl, max_chars=240)

        goal_params = {
            self._sanitize_text(k, max_chars=40): self._sanitize_text(v, max_chars=80)
            for k, v in dict(obs.goal_spec.params or {}).items()
        }

        payload = {
            "goal_type": goal_type,
            "goal_id": goal_id,
            "dsl": goal_dsl,
            "params": goal_params,
        }

        goal_spec_json = json.dumps(payload, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
        return f"goal_spec={goal_spec_json} ; global_task_fallback={global_task!r}"

    def _build_last_step_input(self, obs: ObservationPayload) -> str:
        """Build previous-step block from `last_action` and `last_result`."""
        if obs.last_action is None and obs.last_result is None:
            return "last_step=none"

        if obs.last_action is not None:
            action_type = self._enum_value(obs.last_action.type)
            target_item = self._enum_value(obs.last_action.target_item)
            target_poi = self._enum_value(obs.last_action.target_poi)
            interaction_type = self._enum_value(obs.last_action.interaction_type)
            action_content = self._sanitize_text(
                obs.last_action.content,
                max_chars=self.MAX_ACTION_CONTENT_CHARS,
            )
            action_text = (
                f"type={action_type}, target_item={target_item}, "
                f"target_poi={target_poi}, interaction_type={interaction_type}, "
                f"content={action_content!r}"
            )
        else:
            action_text = "none"

        if obs.last_result is not None:
            failure_type = self._enum_value(obs.last_result.failure_type)
            failure_reason = self._sanitize_text(
                obs.last_result.failure_reason,
                max_chars=self.MAX_FAILURE_REASON_CHARS,
            )
            result_text = (
                f"success={obs.last_result.success}, "
                f"failure_type={failure_type}, "
                f"failure_reason={failure_reason!r}"
            )
        else:
            result_text = "none"

        return f"last_action=({action_text}); last_result=({result_text})"

    def build_messages(self, obs: ObservationPayload) -> List[Dict[str, str]]:
        """Assemble final `[system, user]` message list for LLM completion."""
        nearby_parts: List[str] = []
        for obj in obs.nearby_objects:
            obj_id = self._enum_value(obj.id)
            obj_state = self._enum_value(obj.state)
            relation = f", relation={obj.relation}" if obj.relation else ""
            nearby_parts.append(f"{obj_id}(state={obj_state}{relation})")
        nearby_text = "; ".join(nearby_parts) if nearby_parts else "none"

        holding = self._enum_value(obs.agent.holding)
        location = self._enum_value(obs.agent.location)

        goal_input = self._build_goal_input(obs)
        last_step_input = self._build_last_step_input(obs)

        user_prompt = (
            f"{goal_input}\n"
            f"agent.location={location}\n"
            f"agent.holding={holding}\n"
            f"nearby_objects={nearby_text}\n"
            f"{last_step_input}\n"
            "Return the next atomic action."
        )

        return [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_prompt},
        ]
