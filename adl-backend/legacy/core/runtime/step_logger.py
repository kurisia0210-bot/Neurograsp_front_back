from __future__ import annotations

import json
import os
import time
from typing import Any, Dict


def _enum_to_value(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _shorten(text: str, max_len: int = 88) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _safe_action(action: Any) -> Dict[str, Any]:
    if action is None:
        return {}
    return {
        "type": _enum_to_value(getattr(action, "type", None)),
        "target_poi": _enum_to_value(getattr(action, "target_poi", None)),
        "target_item": _enum_to_value(getattr(action, "target_item", None)),
        "interaction_type": _enum_to_value(getattr(action, "interaction_type", None)),
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


def _safe_effects(effects: Any) -> list[Dict[str, Any]]:
    if not effects:
        return []

    normalized: list[Dict[str, Any]] = []
    for effect in effects:
        normalized.append(
            {
                "key": getattr(effect, "key", None),
                "before": getattr(effect, "before", None),
                "after": getattr(effect, "after", None),
                "ok": getattr(effect, "ok", None),
                "detail": getattr(effect, "detail", ""),
            }
        )
    return normalized


def emit_step_summary(
    *,
    obs: Any,
    intent: Any,
    exec_result: Any,
    error: Dict[str, Any],
) -> None:
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
            "last_effects": _safe_effects(getattr(obs, "last_effects", [])),
            "agent_location": _enum_to_value(getattr(getattr(obs, "agent", None), "location", None)),
            "agent_holding": _enum_to_value(getattr(getattr(obs, "agent", None), "holding", None)),
        },
        "output": {
            "intent": _safe_action(intent),
            "execution_result": _safe_result(exec_result),
            "error": error,
        },
    }

    if _env_bool("STEP_SUMMARY_BRIEF", True):
        sid = summary["session_id"]
        eid = summary["episode_id"]
        step = summary["step_id"]
        intent_safe = summary["output"]["intent"]
        exec_result_safe = summary["output"]["execution_result"]
        err = summary["output"]["error"] or {}
        content = _shorten(str(intent_safe.get("content", "")))
        print(
            "[StepSummaryBrief] "
            f"s={sid} ep={eid} step={step} "
            f"intent={intent_safe.get('type')}({intent_safe.get('interaction_type')}) "
            f"target={intent_safe.get('target_item') or intent_safe.get('target_poi')} "
            f"ok={exec_result_safe.get('success')} "
            f"err={err.get('error_code')} msg={content!r}"
        )

    if _env_bool("STEP_SUMMARY_JSON", True):
        print("[StepSummary] " + json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

    if _env_bool("STEP_SUMMARY_PRETTY", False):
        print("[StepSummaryPretty]\n" + json.dumps(summary, ensure_ascii=False, indent=2))

    if _env_bool("STEP_TRACE_JSON", True):
        trace = {
            "event": "step_trace",
            "ts": summary["ts"],
            "session_id": summary["session_id"],
            "episode_id": summary["episode_id"],
            "step_id": summary["step_id"],
            "intent": summary["output"]["intent"],
            "effects": summary["input"]["last_effects"],
            "result": summary["output"]["execution_result"],
        }
        print("[StepTrace] " + json.dumps(trace, ensure_ascii=False, separators=(",", ":")))
