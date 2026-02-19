"""
Reasoning entry router.

Feature flag:
- REASONING_PIPELINE=v1 (default)
- REASONING_PIPELINE=v2

For v2 proposer strategy:
- REASONING_V2_PROPOSER=mock (default) | v1
- REASONING_V2_MOCK_SCRIPT=<json_file_path> (optional)

For v2 guard strategy:
- REASONING_V2_STAGNATION_WINDOW=4 (optional)
- REASONING_V2_STAGNATION_OVERRIDE=THINK|SPEAK (optional)

For v2 output adapter:
- REASONING_V2_EXECUTION_MODE=INSTRUCT(default)|ACT (optional)
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
