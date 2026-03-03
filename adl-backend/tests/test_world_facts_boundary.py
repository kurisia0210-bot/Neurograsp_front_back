from __future__ import annotations

from pathlib import Path
import re


PROJECT_ROOT = Path(__file__).resolve().parents[1]

# These files are the v2 execution path we tightened in this change.
V2_BOUNDARY_FILES = [
    PROJECT_ROOT / "core" / "reasoning_v2.py",
    PROJECT_ROOT / "core" / "safety" / "guards_v2.py",
    PROJECT_ROOT / "core" / "pipeline" / "complex_actions_v2.py",
    PROJECT_ROOT / "core" / "pipeline" / "proposer" / "mock.py",
    PROJECT_ROOT / "core" / "pipeline" / "proposer" / "prompt_builder.py",
]

FORBIDDEN_PATTERNS = [
    re.compile(r"\bobs\.agent\b"),
    re.compile(r"\bobs\.nearby_objects\b"),
]


def test_v2_world_state_reads_are_facts_only() -> None:
    violations: list[str] = []
    for file_path in V2_BOUNDARY_FILES:
        text = file_path.read_text(encoding="utf-8")
        for pattern in FORBIDDEN_PATTERNS:
            for match in pattern.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                violations.append(f"{file_path}:{line} matched {pattern.pattern!r}")

    assert not violations, "Raw ObservationPayload state reads found:\n" + "\n".join(violations)

