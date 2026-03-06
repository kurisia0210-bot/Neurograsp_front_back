from __future__ import annotations

import os

from core.pipeline.proposer import LLMProposer, MockProposer, Proposer


def build_proposer_from_env() -> Proposer:
    proposer_name = os.getenv("REASONING_PROPOSER", "mock").strip().lower()
    if proposer_name == "llm":
        print("[Reasoning] Proposer: LLMProposer")
        return LLMProposer()
    if proposer_name != "mock":
        print(f"[Reasoning] Unknown proposer={proposer_name!r}, fallback to MockProposer")
    script_path = os.getenv("REASONING_MOCK_SCRIPT", "").strip() or None
    print("[Reasoning] Proposer: MockProposer")
    return MockProposer(script_path=script_path)


__all__ = ["Proposer", "LLMProposer", "MockProposer", "build_proposer_from_env"]
