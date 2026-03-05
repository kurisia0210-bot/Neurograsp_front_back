"""
Reasoning single entry.

Runtime switches:
- REASONING_PROPOSER=mock(default)|llm
- REASONING_MOCK_SCRIPT=<json_file_path> (optional)
- REASONING_STAGNATION_WINDOW=4 (optional)
- REASONING_STAGNATION_OVERRIDE=THINK|SPEAK (optional)
- REASONING_EXECUTION_MODE=INSTRUCT(default)|ACT (optional)
- REASONING_MACRO_PLANNER=auto(default)|always|never (optional)
"""

from schema.payload import ActionPayload, ObservationPayload
from core.reasoning_pipeline import analyze_and_propose as _analyze_and_propose


async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    return await _analyze_and_propose(obs)


__all__ = ["analyze_and_propose"]
