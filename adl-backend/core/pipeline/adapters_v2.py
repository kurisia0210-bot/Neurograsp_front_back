from __future__ import annotations

from typing import Optional

from core.pipeline.common_v2 import make_action
from schema.payload import ActionPayload, ObservationPayload


class InstructAdapter:
    """
    Template-first adapter: physical proposal -> user-facing instruction (SPEAK).
    """

    def to_instruction(self, proposal: ActionPayload, obs: ObservationPayload) -> ActionPayload:
        action_type = proposal.type.value if hasattr(proposal.type, "value") else proposal.type
        if action_type in {"THINK", "SPEAK", "IDLE", "FINISH"}:
            return proposal

        interaction = (
            proposal.interaction_type.value
            if hasattr(proposal.interaction_type, "value")
            else proposal.interaction_type
        )
        target_item = proposal.target_item.value if hasattr(proposal.target_item, "value") else proposal.target_item
        target_poi = proposal.target_poi.value if hasattr(proposal.target_poi, "value") else proposal.target_poi

        if action_type == "MOVE_TO":
            text = f"\u8bf7\u5148\u79fb\u52a8\u5230 {target_poi or 'target_poi'}\u3002"
        elif action_type == "INTERACT":
            text = self._interaction_template(interaction or "NONE", target_item)
        else:
            text = f"\u8bf7\u6267\u884c\u4e0b\u4e00\u6b65\u64cd\u4f5c\uff1a{action_type}\u3002"

        return make_action(obs, type="SPEAK", content=text)

    @staticmethod
    def _interaction_template(interaction: str, target_item: Optional[str]) -> str:
        item = target_item or "target_item"
        templates = {
            "PICK": f"\u8bf7\u62ff\u8d77 {item}\u3002",
            "PLACE": f"\u8bf7\u628a\u5f53\u524d\u7269\u4f53\u653e\u5230 {item}\u3002",
            "OPEN": f"\u8bf7\u6253\u5f00 {item}\u3002",
            "CLOSE": f"\u8bf7\u5173\u95ed {item}\u3002",
            "SLICE": f"\u8bf7\u5207\u5272 {item}\u3002",
            "COOK": f"\u8bf7\u70f9\u9970 {item}\u3002",
            "TOGGLE": f"\u8bf7\u5207\u6362 {item} \u7684\u72b6\u6001\u3002",
            "NONE": f"\u8bf7\u4e0e {item} \u4ea4\u4e92\u3002",
        }
        return templates.get(interaction, f"\u8bf7\u6267\u884c {interaction} \u4e8e {item}\u3002")


__all__ = ["InstructAdapter"]
