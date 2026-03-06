from __future__ import annotations

import os

from core.pipeline.proposer import LLMProposer, MockProposer, Proposer, V1Proposer


def build_proposer_from_env() -> Proposer:
    proposer_name = os.getenv("REASONING_V2_PROPOSER", "mock").strip().lower()
    if proposer_name == "v1":
        print("[ReasoningV2] Proposer: V1Proposer")
        return V1Proposer()
    if proposer_name == "llm":
        print("[ReasoningV2] Proposer: LLMProposer")
        return LLMProposer()
    if proposer_name != "mock":
        print(f"[ReasoningV2] Unknown proposer={proposer_name!r}, fallback to MockProposer")
    script_path = os.getenv("REASONING_V2_MOCK_SCRIPT", "").strip() or None
    print("[ReasoningV2] Proposer: MockProposer")
    return MockProposer(script_path=script_path)


__all__ = ["Proposer", "V1Proposer", "LLMProposer", "MockProposer", "build_proposer_from_env"]
