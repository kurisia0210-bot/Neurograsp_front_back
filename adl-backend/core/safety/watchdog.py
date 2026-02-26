"""
Explainable Watchdog for stagnation and regression detection.

This module keeps the original rule behavior while adding structured,
traceable verdicts for every inspection pass.
"""

from __future__ import annotations

import time
from collections import deque
from copy import deepcopy
from typing import Any, Deque, Dict, List, Optional


class Watchdog:
    """Rule-based watchdog with explainable verdict traces."""

    def __init__(self, history_limit: int = 6, move_threshold: int = 4, trace_limit: int = 256):
        self.history_limit = history_limit
        self.move_threshold = move_threshold

        # Sliding windows used by loop/stagnation rules.
        self.action_window: Deque[str] = deque(maxlen=history_limit)
        self.state_window: Deque[str] = deque(maxlen=history_limit)

        # Counters and previous-state memory.
        self.non_productive_streak = 0
        self.last_holding = False

        # Explainability state.
        self._trace_log: Deque[Dict[str, Any]] = deque(maxlen=trace_limit)
        self._last_verdict: Optional[Dict[str, Any]] = None

    def _get_action_signature(self, action) -> str:
        t_item = getattr(action, "target_item", "None")
        t_poi = getattr(action, "target_poi", "None")
        return f"{action.type}:{t_item}:{t_poi}"

    def _get_world_hash(self, obs) -> str:
        if not obs or not obs.agent:
            return "UNKNOWN"
        loc = obs.agent.location
        holding = str(obs.agent.holding)
        return f"LOC:{loc}|HOLD:{holding}"

    def _record(
        self,
        *,
        triggered: bool,
        rule_id: str,
        reason: str,
        evidence: Dict[str, Any],
        action,
        obs,
    ) -> bool:
        verdict = {
            "ts": time.time(),
            "triggered": triggered,
            "rule_id": rule_id,
            "reason": reason,
            "action_type": getattr(action, "type", "UNKNOWN"),
            "session_id": getattr(obs, "session_id", None),
            "episode_id": getattr(obs, "episode_id", None),
            "step_id": getattr(obs, "step_id", None),
            "evidence": evidence,
        }
        self._last_verdict = verdict
        self._trace_log.append(verdict)
        return triggered

    def get_last_verdict(self) -> Optional[Dict[str, Any]]:
        if self._last_verdict is None:
            return None
        return deepcopy(self._last_verdict)

    def get_trace(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        data = [deepcopy(v) for v in self._trace_log]
        if limit is None or limit <= 0:
            return data
        return data[-limit:]

    def clear_trace(self) -> None:
        self._trace_log.clear()
        self._last_verdict = None

    def explain_last(self) -> str:
        """
        Human-readable one-line explanation for the latest verdict.
        """
        if not self._last_verdict:
            return "Watchdog: no verdict yet."
        v = self._last_verdict
        evidence = v.get("evidence", {})
        # Keep output compact for console readability.
        compact_keys = [
            "non_productive_streak",
            "move_threshold",
            "unique_action_count",
            "stagnant_state",
            "stagnant_count",
            "last_holding",
            "current_holding",
            "was_expected_place",
        ]
        compact = {k: evidence[k] for k in compact_keys if k in evidence}
        return (
            f"Watchdog verdict(triggered={v.get('triggered')}, "
            f"rule={v.get('rule_id')}, reason={v.get('reason')}, "
            f"session={v.get('session_id')}, episode={v.get('episode_id')}, "
            f"step={v.get('step_id')}, evidence={compact})"
        )

    def inspect(self, action, obs) -> bool:
        """
        Return True when watchdog should intervene.
        Always records a structured verdict for explainability.
        """
        action_sig = self._get_action_signature(action)
        current_state_hash = self._get_world_hash(obs)

        # 0) Ignore watchdog-generated system alarm actions.
        if (
            action.type == "THINK"
            and action.content
            and ("STAGNATION" in action.content or "SYSTEM ERROR" in action.content)
        ):
            return self._record(
                triggered=False,
                rule_id="SYSTEM_ALARM_BYPASS",
                reason="Bypass watchdog for system-generated alarm THINK action.",
                evidence={
                    "action_signature": action_sig,
                    "state_hash": current_state_hash,
                },
                action=action,
                obs=obs,
            )

        # 1) Progress regression rule.
        current_holding = bool(obs.agent.holding)
        last_action = obs.last_action
        last_result = obs.last_result
        was_expected_place = (
            bool(last_action)
            and last_action.type == "INTERACT"
            and getattr(last_action, "interaction_type", "NONE") == "PLACE"
            and bool(last_result)
            and bool(last_result.success)
        )

        if self.last_holding and not current_holding and action.type != "FINISH" and not was_expected_place:
            self.last_holding = current_holding
            self.non_productive_streak = 0
            print("[Watchdog] PROGRESS_REGRESSION: item lost outside expected place/finish flow")
            return self._record(
                triggered=True,
                rule_id="PROGRESS_REGRESSION",
                reason="Holding changed True->False without FINISH or successful PLACE.",
                evidence={
                    "last_holding": True,
                    "current_holding": current_holding,
                    "action_type": action.type,
                    "was_expected_place": was_expected_place,
                    "last_action_type": getattr(last_action, "type", None),
                    "last_result_success": getattr(last_result, "success", None),
                    "action_signature": action_sig,
                    "state_hash": current_state_hash,
                },
                action=action,
                obs=obs,
            )

        self.last_holding = current_holding

        # 2) Wandering rule.
        if action.type in ["PICK", "PLACE", "INTERACT", "FINISH"]:
            self.non_productive_streak = 0
        else:
            self.non_productive_streak += 1
            if self.non_productive_streak > self.move_threshold:
                print(f"[Watchdog] WANDERING: {self.non_productive_streak} non-productive steps")
                return self._record(
                    triggered=True,
                    rule_id="WANDERING",
                    reason="Exceeded non-productive action streak threshold.",
                    evidence={
                        "non_productive_streak": self.non_productive_streak,
                        "move_threshold": self.move_threshold,
                        "action_type": action.type,
                        "action_signature": action_sig,
                        "state_hash": current_state_hash,
                    },
                    action=action,
                    obs=obs,
                )

        # 3) Action loop rule.
        self.action_window.append(action_sig)
        if len(self.action_window) >= self.history_limit and len(set(self.action_window)) <= 2:
            print("[Watchdog] ACTION_LOOP: repeated action pattern")
            return self._record(
                triggered=True,
                rule_id="ACTION_LOOP",
                reason="Action window has <=2 unique signatures.",
                evidence={
                    "history_limit": self.history_limit,
                    "action_window": list(self.action_window),
                    "unique_action_count": len(set(self.action_window)),
                    "action_signature": action_sig,
                    "state_hash": current_state_hash,
                },
                action=action,
                obs=obs,
            )

        # 4) State stagnation rule.
        if action.type not in ["THINK", "IDLE"]:
            self.state_window.append(current_state_hash)
            if len(self.state_window) >= self.history_limit:
                counts: Dict[str, int] = {}
                for state in self.state_window:
                    counts[state] = counts.get(state, 0) + 1
                stagnant = next(((state, c) for state, c in counts.items() if c >= 3), None)
                if stagnant:
                    print(f"[Watchdog] STATE_STAGNATION: {stagnant[0]} x{stagnant[1]}")
                    return self._record(
                        triggered=True,
                        rule_id="STATE_STAGNATION",
                        reason="State hash repeats >=3 times in the state window.",
                        evidence={
                            "history_limit": self.history_limit,
                            "state_window": list(self.state_window),
                            "stagnant_state": stagnant[0],
                            "stagnant_count": stagnant[1],
                            "action_signature": action_sig,
                            "state_hash": current_state_hash,
                        },
                        action=action,
                        obs=obs,
                    )

        # PASS verdict.
        return self._record(
            triggered=False,
            rule_id="PASS",
            reason="No watchdog rule triggered.",
            evidence={
                "non_productive_streak": self.non_productive_streak,
                "move_threshold": self.move_threshold,
                "history_limit": self.history_limit,
                "action_signature": action_sig,
                "state_hash": current_state_hash,
            },
            action=action,
            obs=obs,
        )
