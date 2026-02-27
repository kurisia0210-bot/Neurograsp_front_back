from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from core.pipeline.common_v2 import make_action
from service.llm_client import get_completion
from schema.payload import ActionPayload, ObservationPayload


class LLMProposer:
    """
    LLM-based proposer for v2 pipeline.

    This class is intentionally self-contained so it can be tested
    standalone before being wired into env routing.
    """

    # Hard boundary: proposer can suggest only operational next-step actions.
    # Final completion decision belongs to FinishGuard, not proposer.
    NON_DELEGABLE_ACTION_TYPES = {"FINISH"}
    ALLOWED_PROPOSER_ACTION_TYPES = {"MOVE_TO", "INTERACT", "THINK", "IDLE", "SPEAK"}

    DEFAULT_SYSTEM_PROMPT = (
        "You are a safe embodied agent planner. "
        "Output only one JSON object. "
        "Schema keys: type, target_poi, target_item, interaction_type, target_length, content. "
        "Allowed type: MOVE_TO, INTERACT, THINK, IDLE, SPEAK. "
        "NEVER output FINISH. "
        "Use short content text."
    )

    def __init__(
        self,
        *,
        model: str = "deepseek-chat",
        temperature: float = 0.1,
        system_prompt: Optional[str] = None,
    ) -> None:
        self._model = model
        self._temperature = temperature
        self._system_prompt = system_prompt or self.DEFAULT_SYSTEM_PROMPT

    def _build_messages(self, obs: ObservationPayload) -> List[Dict[str, str]]:
        nearby_parts: List[str] = []
        for obj in obs.nearby_objects:
            obj_id = obj.id.value if hasattr(obj.id, "value") else obj.id
            obj_state = obj.state.value if hasattr(obj.state, "value") else obj.state
            relation = f", relation={obj.relation}" if obj.relation else ""
            nearby_parts.append(f"{obj_id}(state={obj_state}{relation})")
        nearby_text = "; ".join(nearby_parts) if nearby_parts else "none"

        holding = obs.agent.holding.value if hasattr(obs.agent.holding, "value") else obs.agent.holding
        location = obs.agent.location.value if hasattr(obs.agent.location, "value") else obs.agent.location

        user_prompt = (
            f"task={obs.global_task}\n"
            f"agent.location={location}\n"
            f"agent.holding={holding}\n"
            f"nearby_objects={nearby_text}\n"
            "Return the next atomic action."
        )
        return [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _parse_to_action(self, obs: ObservationPayload, raw_content: str) -> ActionPayload:
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

    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        messages = self._build_messages(obs)
        raw = await get_completion(messages, model=self._model, temperature=self._temperature)
        return self._parse_to_action(obs, raw)
