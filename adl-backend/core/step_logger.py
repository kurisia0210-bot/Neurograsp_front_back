from __future__ import annotations

import json
import time
from typing import Any, Dict


def _enum_to_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _safe_action(action: Any) -> Dict[str, Any]:
    if action is None:
        return {}
    return {
        "type": _enum_to_value(getattr(action, "type", None)),
        "target_poi": _enum_to_value(getattr(action, "target_poi", None)),
        "target_item": _enum_to_value(getattr(action, "target_item", None)),
        "interaction_type": _enum_to_value(getattr(action, "interaction_type", None)),
        "target_length": getattr(action, "target_length", None),
        "content": getattr(action, "content", ""),
    }


def _safe_result(result: Any) -> Dict[str, Any]:
    if result is None:
        return {}
    return {
        "success": bool(getattr(result, "success", False)),
        "failure_type": _enum_to_value(getattr(result, "failure_type", None)),
        "failure_reason": getattr(result, "failure_reason", ""),
    }


def _safe_reflex(reflex: Any) -> Dict[str, Any]:
    if reflex is None:
        return {}
    return {
        "verdict": _enum_to_value(getattr(reflex, "verdict", None)),
        "message": getattr(reflex, "message", ""),
    }


def emit_step_summary(
    *,
    obs: Any,
    intent: Any,
    exec_result: Any,
    reflex_verdict: Any,
    error: Dict[str, Any],
) -> None:
    """
    Emit exactly one structured JSON line per step for rapid diagnosis.
    """
    summary = {
        "event": "step_summary",
        "ts": time.time(),
        "session_id": getattr(obs, "session_id", None),
        "episode_id": getattr(obs, "episode_id", None),
        "step_id": getattr(obs, "step_id", None),
        "global_task": getattr(obs, "global_task", ""),
        "input": {
            "last_action": _safe_action(getattr(obs, "last_action", None)),
            "last_result": _safe_result(getattr(obs, "last_result", None)),
            "agent_location": _enum_to_value(getattr(getattr(obs, "agent", None), "location", None)),
            "agent_holding": _enum_to_value(getattr(getattr(obs, "agent", None), "holding", None)),
        },
        "output": {
            "intent": _safe_action(intent),
            "execution_result": _safe_result(exec_result),
            "reflex_verdict": _safe_reflex(reflex_verdict),
            "error": error,
        },
    }
    print("[StepSummary] " + json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

