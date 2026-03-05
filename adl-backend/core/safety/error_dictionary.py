from __future__ import annotations

import re
from typing import Any, Dict, Optional


ERROR_DICTIONARY: Dict[str, Dict[str, str]] = {
    "OK": {
        "module": "none",
        "severity": "INFO",
        "description": "Step completed without error.",
    },
    "E_REASONING_SCHEMA": {
        "module": "reasoning",
        "severity": "ERROR",
        "description": "Schema validation failed while building/parsing intent.",
    },
    "E_REASONING_RUNTIME": {
        "module": "reasoning",
        "severity": "ERROR",
        "description": "Unhandled runtime exception in reasoning path.",
    },
    "E_GOAL_AMBIGUOUS": {
        "module": "goal",
        "severity": "WARN",
        "description": "Goal/task cannot be resolved unambiguously.",
    },
    "E_WATCHDOG_STAGNATION": {
        "module": "watchdog",
        "severity": "WARN",
        "description": "Watchdog detected stagnation/regression pattern.",
    },
    "E_UNKNOWN": {
        "module": "agent",
        "severity": "ERROR",
        "description": "Unknown failure not mapped in dictionary.",
    },
}


def _failure_type_name(exec_result: Any) -> str:
    failure_type = getattr(exec_result, "failure_type", None)
    if failure_type is None:
        return ""
    return failure_type.value if hasattr(failure_type, "value") else str(failure_type)


def _parse_watchdog_detail(content: str) -> Dict[str, Optional[str]]:
    rule_match = re.search(r"Rule=([^\.]+)\.", content or "")
    reason_match = re.search(r"Reason=(.+?)\.\s+STOP", content or "")
    return {
        "watchdog_rule": rule_match.group(1).strip() if rule_match else None,
        "watchdog_reason": reason_match.group(1).strip() if reason_match else None,
    }


def classify_step_error(intent: Any, exec_result: Any) -> Dict[str, Any]:
    default = ERROR_DICTIONARY["E_UNKNOWN"]

    intent_type = getattr(intent, "type", "")
    intent_content = getattr(intent, "content", "") or ""
    success = bool(getattr(exec_result, "success", False))

    if intent_type == "THINK" and "[SYSTEM ERROR]" in intent_content:
        spec = ERROR_DICTIONARY["E_WATCHDOG_STAGNATION"]
        return {
            "error_code": "E_WATCHDOG_STAGNATION",
            "module": spec["module"],
            "severity": spec["severity"],
            "description": spec["description"],
            "detail": intent_content,
            "extra": _parse_watchdog_detail(intent_content),
        }

    if success:
        spec = ERROR_DICTIONARY["OK"]
        return {
            "error_code": "OK",
            "module": spec["module"],
            "severity": spec["severity"],
            "description": spec["description"],
            "detail": "",
            "extra": {},
        }

    failure_type = _failure_type_name(exec_result)
    failure_reason = getattr(exec_result, "failure_reason", "") or ""

    if failure_type == "SCHEMA_ERROR":
        code = "E_REASONING_SCHEMA"
    elif failure_type == "REASONING_ERROR":
        code = "E_REASONING_RUNTIME"
    elif failure_type == "GOAL_AMBIGUOUS":
        code = "E_GOAL_AMBIGUOUS"
    else:
        code = "E_UNKNOWN"

    spec = ERROR_DICTIONARY.get(code, default)
    return {
        "error_code": code,
        "module": spec["module"],
        "severity": spec["severity"],
        "description": spec["description"],
        "detail": failure_reason,
        "extra": {"failure_type": failure_type},
    }
