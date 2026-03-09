from __future__ import annotations

import ast
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Union

from schema.payload import ItemName, ObjectState, PoiName
from schema.payload import ObservationPayload


@dataclass(frozen=True)
class AtPredicate:
    agent: str
    poi: str


@dataclass(frozen=True)
class HoldingPredicate:
    agent: str
    item: str


@dataclass(frozen=True)
class OpenPredicate:
    item: str


@dataclass(frozen=True)
class ClosedPredicate:
    item: str


@dataclass(frozen=True)
class InsidePredicate:
    item: str
    container: str


@dataclass(frozen=True)
class OnPredicate:
    item: str
    surface: str


@dataclass(frozen=True)
class StatePredicate:
    item: str
    state: str


@dataclass(frozen=True)
class AndGoal:
    goals: List["GoalExpr"]


@dataclass(frozen=True)
class ThenGoal:
    goals: List["GoalExpr"]


@dataclass(frozen=True)
class CountGoal:
    k: int
    goals: List["GoalExpr"]


GoalExpr = Union[
    AtPredicate,
    HoldingPredicate,
    OpenPredicate,
    ClosedPredicate,
    InsidePredicate,
    OnPredicate,
    StatePredicate,
    AndGoal,
    ThenGoal,
    CountGoal,
]


@dataclass
class GoalEvalReport:
    satisfied: bool
    code: str
    message: str
    progress: Optional[str] = None


@dataclass(frozen=True)
class AlignmentIssue:
    code: str
    path: str
    token: str
    expected: str
    message: str


class GoalAlignmentChecker:
    """
    Validate Goal DSL tokens against payload contract (enums + domain constraints).
    """

    def __init__(
        self,
        *,
        allowed_containers: Optional[set[str]] = None,
        allowed_surfaces: Optional[set[str]] = None,
    ) -> None:
        self._pois = {x.value for x in PoiName}
        self._items = {x.value for x in ItemName}
        self._states = {x.value for x in ObjectState}
        self._containers = allowed_containers or {"fridge_main", "table_surface", "stove"}
        self._surfaces = allowed_surfaces or {"table_surface"}

    def validate(self, goal: "GoalExpr") -> List[AlignmentIssue]:
        issues: List[AlignmentIssue] = []
        self._validate(goal, path="root", issues=issues)
        return issues

    def _validate(self, goal: "GoalExpr", *, path: str, issues: List[AlignmentIssue]) -> None:
        if isinstance(goal, AtPredicate):
            if goal.agent != "agent":
                issues.append(
                    AlignmentIssue(
                        code="INVALID_AGENT",
                        path=path,
                        token=goal.agent,
                        expected="agent",
                        message="Only 'agent' is supported in this domain.",
                    )
                )
            if goal.poi not in self._pois:
                issues.append(
                    AlignmentIssue(
                        code="INVALID_POI",
                        path=path,
                        token=goal.poi,
                        expected=f"one of {sorted(self._pois)}",
                        message="POI token is not in payload PoiName enum.",
                    )
                )
            return

        if isinstance(goal, HoldingPredicate):
            if goal.agent != "agent":
                issues.append(
                    AlignmentIssue(
                        code="INVALID_AGENT",
                        path=path,
                        token=goal.agent,
                        expected="agent",
                        message="Only 'agent' is supported in this domain.",
                    )
                )
            if goal.item not in self._items:
                issues.append(
                    AlignmentIssue(
                        code="INVALID_ITEM",
                        path=path,
                        token=goal.item,
                        expected=f"one of {sorted(self._items)}",
                        message="Item token is not in payload ItemName enum.",
                    )
                )
            return

        if isinstance(goal, OpenPredicate):
            self._expect_item(goal.item, path=path, issues=issues)
            return

        if isinstance(goal, ClosedPredicate):
            self._expect_item(goal.item, path=path, issues=issues)
            return

        if isinstance(goal, InsidePredicate):
            self._expect_item(goal.item, path=path, issues=issues)
            if goal.container not in self._containers:
                issues.append(
                    AlignmentIssue(
                        code="INVALID_CONTAINER",
                        path=path,
                        token=goal.container,
                        expected=f"one of {sorted(self._containers)}",
                        message="Container token is outside allowed container domain.",
                    )
                )
            return

        if isinstance(goal, OnPredicate):
            self._expect_item(goal.item, path=path, issues=issues)
            if goal.surface not in self._surfaces:
                issues.append(
                    AlignmentIssue(
                        code="INVALID_SURFACE",
                        path=path,
                        token=goal.surface,
                        expected=f"one of {sorted(self._surfaces)}",
                        message="Surface token is outside allowed surface domain.",
                    )
                )
            return

        if isinstance(goal, StatePredicate):
            self._expect_item(goal.item, path=path, issues=issues)
            if goal.state not in self._states:
                issues.append(
                    AlignmentIssue(
                        code="INVALID_STATE",
                        path=path,
                        token=goal.state,
                        expected=f"one of {sorted(self._states)}",
                        message="State token is not in payload ObjectState enum.",
                    )
                )
            return

        if isinstance(goal, AndGoal):
            if not goal.goals:
                issues.append(
                    AlignmentIssue(
                        code="EMPTY_COMBINATOR",
                        path=path,
                        token="AND",
                        expected="at least one child goal",
                        message="AND must contain at least one goal.",
                    )
                )
            for i, child in enumerate(goal.goals):
                self._validate(child, path=f"{path}.AND[{i}]", issues=issues)
            return

        if isinstance(goal, ThenGoal):
            if not goal.goals:
                issues.append(
                    AlignmentIssue(
                        code="EMPTY_COMBINATOR",
                        path=path,
                        token="THEN",
                        expected="at least one child goal",
                        message="THEN must contain at least one goal.",
                    )
                )
            for i, child in enumerate(goal.goals):
                self._validate(child, path=f"{path}.THEN[{i}]", issues=issues)
            return

        if isinstance(goal, CountGoal):
            if not goal.goals:
                issues.append(
                    AlignmentIssue(
                        code="EMPTY_COMBINATOR",
                        path=path,
                        token="COUNT",
                        expected="at least one child goal",
                        message="COUNT must contain at least one goal.",
                    )
                )
            if goal.k <= 0 or goal.k > len(goal.goals):
                issues.append(
                    AlignmentIssue(
                        code="INVALID_COUNT_K",
                        path=path,
                        token=str(goal.k),
                        expected=f"1..{max(len(goal.goals), 1)}",
                        message="COUNT(k, goals) has invalid k.",
                    )
                )
            for i, child in enumerate(goal.goals):
                self._validate(child, path=f"{path}.COUNT[{i}]", issues=issues)
            return

    def _expect_item(self, item: str, *, path: str, issues: List[AlignmentIssue]) -> None:
        if item not in self._items:
            issues.append(
                AlignmentIssue(
                    code="INVALID_ITEM",
                    path=path,
                    token=item,
                    expected=f"one of {sorted(self._items)}",
                    message="Item token is not in payload ItemName enum.",
                )
            )


class GoalDslParser:
    """
    Parse Goal DSL text into typed GoalExpr tree.

    Supported atoms:
    - at(agent, poi)
    - holding(agent, item)
    - open(item) / closed(item)
    - inside(item, container)
    - on(item, surface)
    - state(item, "value")

    Supported combinators:
    - AND([g1, g2, ...]) or AND(g1, g2, ...)
    - THEN([g1, g2, ...]) or THEN(g1, g2, ...)
    - COUNT(k, [g1, g2, ...]) or COUNT(k, g1, g2, ...)
    """

    def __init__(
        self,
        *,
        alignment_checker: Optional[GoalAlignmentChecker] = None,
        strict_alignment: bool = True,
    ) -> None:
        self._alignment_checker = alignment_checker or GoalAlignmentChecker()
        self._strict_alignment = strict_alignment

    def parse(self, text: str) -> GoalExpr:
        node = ast.parse(text, mode="eval").body
        goal = self._parse_expr(node)
        issues = self._alignment_checker.validate(goal)
        if issues and self._strict_alignment:
            raise ValueError(self._format_alignment_issues(issues))
        return goal

    def parse_with_alignment(self, text: str) -> Tuple[GoalExpr, List[AlignmentIssue]]:
        node = ast.parse(text, mode="eval").body
        goal = self._parse_expr(node)
        issues = self._alignment_checker.validate(goal)
        return goal, issues

    def _parse_expr(self, node: ast.AST) -> GoalExpr:
        if not isinstance(node, ast.Call):
            raise ValueError(f"Goal expression must be a function call, got: {ast.dump(node)}")
        name = self._call_name(node.func)
        if name == "at":
            return AtPredicate(agent=self._arg_text(node, 0), poi=self._arg_text(node, 1))
        if name == "holding":
            return HoldingPredicate(agent=self._arg_text(node, 0), item=self._arg_text(node, 1))
        if name == "open":
            return OpenPredicate(item=self._arg_text(node, 0))
        if name == "closed":
            return ClosedPredicate(item=self._arg_text(node, 0))
        if name == "inside":
            return InsidePredicate(item=self._arg_text(node, 0), container=self._arg_text(node, 1))
        if name == "on":
            return OnPredicate(item=self._arg_text(node, 0), surface=self._arg_text(node, 1))
        if name == "state":
            return StatePredicate(item=self._arg_text(node, 0), state=self._arg_text(node, 1))
        if name == "AND":
            return AndGoal(goals=self._goal_list(node, start_index=0))
        if name == "THEN":
            return ThenGoal(goals=self._goal_list(node, start_index=0))
        if name == "COUNT":
            k = self._arg_int(node, 0)
            goals = self._goal_list(node, start_index=1)
            return CountGoal(k=k, goals=goals)
        raise ValueError(f"Unsupported goal function: {name}")

    @staticmethod
    def _call_name(node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return node.id
        raise ValueError(f"Unsupported function node: {ast.dump(node)}")

    def _goal_list(self, call: ast.Call, *, start_index: int) -> List[GoalExpr]:
        if len(call.args) <= start_index:
            return []
        first = call.args[start_index]
        if isinstance(first, ast.List):
            return [self._parse_expr(x) for x in first.elts]
        return [self._parse_expr(x) for x in call.args[start_index:]]

    def _arg_text(self, call: ast.Call, index: int) -> str:
        if index >= len(call.args):
            raise ValueError(f"Missing argument #{index + 1} for {self._call_name(call.func)}")
        node = call.args[index]
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        raise ValueError(f"Argument #{index + 1} must be identifier/string, got: {ast.dump(node)}")

    def _arg_int(self, call: ast.Call, index: int) -> int:
        if index >= len(call.args):
            raise ValueError(f"Missing argument #{index + 1} for {self._call_name(call.func)}")
        node = call.args[index]
        if isinstance(node, ast.Constant) and isinstance(node.value, int):
            return int(node.value)
        raise ValueError(f"Argument #{index + 1} must be int, got: {ast.dump(node)}")

    @staticmethod
    def _format_alignment_issues(issues: List[AlignmentIssue]) -> str:
        parts = []
        for x in issues:
            parts.append(
                f"{x.code}@{x.path}: token={x.token!r}, expected={x.expected}. {x.message}"
            )
        return "Goal DSL alignment check failed: " + " | ".join(parts)


class GoalDslEvaluator:
    """
    Evaluate GoalExpr over ObservationPayload.

    THEN progression is stateful by default and keyed by:
    session_id + episode_id + goal_key.
    """

    def __init__(self) -> None:
        self._then_progress: Dict[str, int] = {}

    def reset(self, session_id: str, episode_id: Optional[int], goal_key: str = "default") -> None:
        key = self._progress_key(session_id, episode_id, goal_key)
        self._then_progress.pop(key, None)

    def satisfied(self, obs: ObservationPayload, goal: GoalExpr, *, goal_key: str = "default") -> GoalEvalReport:
        if isinstance(goal, ThenGoal):
            done, idx, total = self._eval_then(obs, goal, goal_key=goal_key)
            if done:
                return GoalEvalReport(
                    satisfied=True,
                    code="GOAL_DONE_THEN",
                    message="Sequential goal completed.",
                    progress=f"{idx}/{total}",
                )
            return GoalEvalReport(
                satisfied=False,
                code="GOAL_PENDING_THEN",
                message="Sequential goal in progress.",
                progress=f"{idx}/{total}",
            )

        ok = self._eval_expr(obs, goal)
        return GoalEvalReport(
            satisfied=ok,
            code="GOAL_DONE" if ok else "GOAL_PENDING",
            message="Goal satisfied." if ok else "Goal not satisfied yet.",
            progress=None,
        )

    def _eval_then(self, obs: ObservationPayload, goal: ThenGoal, *, goal_key: str) -> Tuple[bool, int, int]:
        total = len(goal.goals)
        if total == 0:
            return True, 0, 0

        key = self._progress_key(obs.session_id, obs.episode_id, goal_key)
        idx = self._then_progress.get(key, 0)

        while idx < total and self._eval_expr(obs, goal.goals[idx]):
            idx += 1

        self._then_progress[key] = idx
        return idx >= total, idx, total

    def _eval_expr(self, obs: ObservationPayload, goal: GoalExpr) -> bool:
        if isinstance(goal, AtPredicate):
            current = _to_str(getattr(obs.agent, "location", None))
            return current == goal.poi

        if isinstance(goal, HoldingPredicate):
            current = _to_str(getattr(obs.agent, "holding", None))
            return current == goal.item

        if isinstance(goal, OpenPredicate):
            state, _ = self._object_state_and_relation(obs, goal.item)
            return state == "open"

        if isinstance(goal, ClosedPredicate):
            state, _ = self._object_state_and_relation(obs, goal.item)
            return state == "closed"

        if isinstance(goal, InsidePredicate):
            state, relation = self._object_state_and_relation(obs, goal.item)
            if goal.container == "fridge_main" and state == "in_fridge":
                return True
            if goal.container and goal.container in relation:
                return True
            return False

        if isinstance(goal, OnPredicate):
            state, relation = self._object_state_and_relation(obs, goal.item)
            if goal.surface and goal.surface in relation:
                return True
            if goal.surface in {"table_surface", "table"} and state == "on_table":
                return True
            return False

        if isinstance(goal, StatePredicate):
            state, _ = self._object_state_and_relation(obs, goal.item)
            return state == goal.state

        if isinstance(goal, AndGoal):
            return all(self._eval_expr(obs, child) for child in goal.goals)

        if isinstance(goal, CountGoal):
            hit = sum(1 for child in goal.goals if self._eval_expr(obs, child))
            return hit >= goal.k

        if isinstance(goal, ThenGoal):
            # Stateless fallback (used only in nested cases): all must hold now.
            return all(self._eval_expr(obs, child) for child in goal.goals)

        raise TypeError(f"Unsupported goal node type: {type(goal)!r}")

    @staticmethod
    def _progress_key(session_id: str, episode_id: Optional[int], goal_key: str) -> str:
        ep = int(episode_id) if episode_id is not None else -1
        return f"{session_id}:{ep}:{goal_key}"

    @staticmethod
    def _object_state_and_relation(obs: ObservationPayload, item_id: str) -> Tuple[str, str]:
        wf = obs.world_facts or {}
        entities = wf.get("entities") if isinstance(wf, dict) else None
        relations = wf.get("relations") if isinstance(wf, dict) else None

        entity = entities.get(item_id) if isinstance(entities, dict) else None
        state = _to_str(entity.get("state")) if isinstance(entity, dict) else None

        relation_text = ""
        if isinstance(relations, list):
            for rel in relations:
                if not isinstance(rel, dict):
                    continue
                if _to_str(rel.get("subject")) != item_id:
                    continue
                pred = (_to_str(rel.get("predicate")) or "").strip().lower()
                obj = (_to_str(rel.get("object")) or "").strip().lower()
                if pred == "on":
                    relation_text = f"on {obj}"
                elif pred == "inside":
                    relation_text = f"inside {obj}"
                elif pred == "held_by":
                    relation_text = f"held by {obj}"
                else:
                    relation_text = f"{pred} {obj}".strip()
                break

        return (state or "MISSING"), relation_text


def _to_str(value: object) -> Optional[str]:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else str(value)


__all__ = [
    "GoalExpr",
    "GoalDslParser",
    "GoalDslEvaluator",
    "GoalEvalReport",
    "AlignmentIssue",
    "GoalAlignmentChecker",
    "AtPredicate",
    "HoldingPredicate",
    "OpenPredicate",
    "ClosedPredicate",
    "InsidePredicate",
    "OnPredicate",
    "StatePredicate",
    "AndGoal",
    "ThenGoal",
    "CountGoal",
]


