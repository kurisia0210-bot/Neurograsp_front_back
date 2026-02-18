"""
Reasoning entry router.

Feature flag:
- REASONING_PIPELINE=v1 (default)
- REASONING_PIPELINE=v2
"""

import os

from schema.payload import ActionPayload, ObservationPayload
from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1
from core.reasoning_v2 import analyze_and_propose as analyze_and_propose_v2


def _pipeline_version() -> str:
    return os.getenv("REASONING_PIPELINE", "v1").strip().lower()


async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    Backward-compatible global function.
    v1 remains default for zero-drift rollout and easy rollback.
    """
    version = _pipeline_version()
    if version == "v2":
        return await analyze_and_propose_v2(obs)
    if version != "v1":
        print(f"[Reasoning Router] Unknown REASONING_PIPELINE={version!r}, fallback to 'v1'")
    return await analyze_and_propose_v1(obs)


__all__ = ["analyze_and_propose"]
