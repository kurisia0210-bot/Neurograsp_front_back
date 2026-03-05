from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Protocol, Tuple

from core.goal.goal_dsl import GoalDslEvaluator, GoalDslParser, GoalEvalReport, GoalExpr
from core.goal.alias_registry import (
    BACKEND_CONTAINER_ALIASES,
    BACKEND_ITEM_ALIASES,
    BACKEND_POI_ALIASES,
)
from schema.payload import ObservationPayload


@dataclass(frozen=True)
class GoalSpec:
    goal_type: str
    goal_id: str
    dsl: str
    goal: GoalExpr
    params: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class GoalValidationResult:
    valid: bool
    code: str
    issues: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class GoalProgressResult:
    score: float
    stage: str
    message: str


class GoalHandler(Protocol):
    goal_type: str

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        ...

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        ...

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        ...

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        ...


class _GoalHandlerBase:
    def _location(self, obs: ObservationPayload) -> Optional[str]:
        loc = getattr(obs.agent, "location", None)
        return loc.value if hasattr(loc, "value") else loc

    def _holding(self, obs: ObservationPayload) -> Optional[str]:
        h = getattr(obs.agent, "holding", None)
        return h.value if hasattr(h, "value") else h

    def _object_state_relation(self, obs: ObservationPayload, item_id: str) -> Tuple[str, str]:
        for obj in obs.nearby_objects:
            oid = obj.id.value if hasattr(obj.id, "value") else obj.id
            if oid == item_id:
                state = obj.state.value if hasattr(obj.state, "value") else obj.state
                relation = (obj.relation or "").strip().lower()
                return str(state), relation
        return "MISSING", ""


class MoveToGoalHandler(_GoalHandlerBase):
    goal_type = "MOVE_TO"

    def __init__(self, allowed_pois: set[str]) -> None:
        self._pois = allowed_pois

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        poi = goal.params.get("poi", "")
        issues: list[str] = []
        if not poi:
            issues.append("missing poi")
        elif poi not in self._pois:
            issues.append(f"invalid poi={poi}")
        return GoalValidationResult(
            valid=not issues,
            code="GOAL_VALID" if not issues else "GOAL_INVALID_MOVE_TO",
            issues=issues,
        )

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        _ = evaluator
        poi = goal.params.get("poi", "")
        current = self._location(obs)
        done = current == poi
        return GoalEvalReport(
            satisfied=done,
            code="GOAL_DONE_MOVE_TO" if done else "GOAL_PENDING_MOVE_TO",
            message=(f"Reached {poi}." if done else f"Current={current}, target={poi}."),
        )

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        _ = evaluator
        poi = goal.params.get("poi", "")
        current = self._location(obs)
        if current == poi:
            return GoalProgressResult(score=1.0, stage="done", message="At target POI.")
        return GoalProgressResult(score=0.0, stage="move_to_target", message=f"Need to move to {poi}.")

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        _ = evaluator
        poi = goal.params.get("poi", "target")
        if self._location(obs) == poi:
            return f"已到达 {poi}，可以继续下一步。"
        return f"请先移动到 {poi}。"


class OpenGoalHandler(_GoalHandlerBase):
    goal_type = "OPEN"

    def __init__(self, allowed_items: set[str]) -> None:
        self._items = allowed_items

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        item = goal.params.get("item", "")
        issues: list[str] = []
        if item not in self._items:
            issues.append(f"invalid item={item}")
        return GoalValidationResult(
            valid=not issues,
            code="GOAL_VALID" if not issues else "GOAL_INVALID_OPEN",
            issues=issues,
        )

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        _ = evaluator
        item = goal.params.get("item", "")
        state, _ = self._object_state_relation(obs, item)
        done = state == "open"
        return GoalEvalReport(
            satisfied=done,
            code="GOAL_DONE_OPEN" if done else "GOAL_PENDING_OPEN",
            message=(f"{item} is open." if done else f"{item} is not open yet."),
        )

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        done = self.is_done(obs, goal, evaluator).satisfied
        return GoalProgressResult(
            score=1.0 if done else 0.0,
            stage="done" if done else "need_open",
            message="Open target reached." if done else "Need to open target item.",
        )

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        item = goal.params.get("item", "item")
        if self.is_done(obs, goal, evaluator).satisfied:
            return f"{item} 已经是打开状态。"
        return f"请打开 {item}。"


class CloseGoalHandler(_GoalHandlerBase):
    goal_type = "CLOSE"

    def __init__(self, allowed_items: set[str]) -> None:
        self._items = allowed_items

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        item = goal.params.get("item", "")
        issues: list[str] = []
        if item not in self._items:
            issues.append(f"invalid item={item}")
        return GoalValidationResult(
            valid=not issues,
            code="GOAL_VALID" if not issues else "GOAL_INVALID_CLOSE",
            issues=issues,
        )

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        _ = evaluator
        item = goal.params.get("item", "")
        state, _ = self._object_state_relation(obs, item)
        done = state == "closed"
        return GoalEvalReport(
            satisfied=done,
            code="GOAL_DONE_CLOSE" if done else "GOAL_PENDING_CLOSE",
            message=(f"{item} is closed." if done else f"{item} is not closed yet."),
        )

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        done = self.is_done(obs, goal, evaluator).satisfied
        return GoalProgressResult(
            score=1.0 if done else 0.0,
            stage="done" if done else "need_close",
            message="Close target reached." if done else "Need to close target item.",
        )

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        item = goal.params.get("item", "item")
        if self.is_done(obs, goal, evaluator).satisfied:
            return f"{item} 已经是关闭状态。"
        return f"请关闭 {item}。"


class PutInGoalHandler(_GoalHandlerBase):
    goal_type = "PUT_IN"

    def __init__(self, allowed_items: set[str], allowed_containers: set[str]) -> None:
        self._items = allowed_items
        self._containers = allowed_containers

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        item = goal.params.get("item", "")
        container = goal.params.get("container", "")
        issues: list[str] = []
        if item not in self._items:
            issues.append(f"invalid item={item}")
        if container not in self._containers:
            issues.append(f"invalid container={container}")
        return GoalValidationResult(
            valid=not issues,
            code="GOAL_VALID" if not issues else "GOAL_INVALID_PUT_IN",
            issues=issues,
        )

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        report = evaluator.satisfied(obs, goal.goal, goal_key=goal.goal_id)
        return GoalEvalReport(
            satisfied=report.satisfied,
            code="GOAL_DONE_PUT_IN" if report.satisfied else "GOAL_PENDING_PUT_IN",
            message=(
                f"{goal.params.get('item')} is inside {goal.params.get('container')}."
                if report.satisfied
                else f"Need {goal.params.get('item')} inside {goal.params.get('container')}."
            ),
            progress=report.progress,
        )

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        done = self.is_done(obs, goal, evaluator).satisfied
        if done:
            return GoalProgressResult(score=1.0, stage="done", message="Goal completed.")

        item = goal.params.get("item", "")
        container = goal.params.get("container", "")
        holding = self._holding(obs)
        door_state, _ = self._object_state_relation(obs, "fridge_door")

        if holding != item:
            return GoalProgressResult(score=0.2, stage="need_pick", message=f"Need to pick {item} first.")

        if container == "fridge_main" and door_state != "open":
            return GoalProgressResult(score=0.6, stage="need_open", message="Open fridge door before placing.")

        return GoalProgressResult(score=0.85, stage="ready_to_place", message=f"Ready to place into {container}.")

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        item = goal.params.get("item", "item")
        container = goal.params.get("container", "container")

        if self.is_done(obs, goal, evaluator).satisfied:
            return f"目标已完成：{item} 已在 {container}。"

        holding = self._holding(obs)
        if holding != item:
            return f"请先拿起 {item}。"

        if container == "fridge_main":
            door_state, _ = self._object_state_relation(obs, "fridge_door")
            if door_state != "open":
                return "请先打开 fridge_door。"

        return f"请把 {item} 放入 {container}。"


class OpenThenPutInGoalHandler(_GoalHandlerBase):
    goal_type = "OPEN_THEN_PUT_IN"

    def __init__(self, allowed_items: set[str], allowed_containers: set[str]) -> None:
        self._items = allowed_items
        self._containers = allowed_containers

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        door = goal.params.get("door", "")
        item = goal.params.get("item", "")
        container = goal.params.get("container", "")
        issues: list[str] = []

        if door not in self._items:
            issues.append(f"invalid door={door}")
        if item not in self._items:
            issues.append(f"invalid item={item}")
        if container not in self._containers:
            issues.append(f"invalid container={container}")

        return GoalValidationResult(
            valid=not issues,
            code="GOAL_VALID" if not issues else "GOAL_INVALID_OPEN_THEN_PUT_IN",
            issues=issues,
        )

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        report = evaluator.satisfied(obs, goal.goal, goal_key=goal.goal_id)
        return GoalEvalReport(
            satisfied=report.satisfied,
            code="GOAL_DONE_OPEN_THEN_PUT_IN" if report.satisfied else "GOAL_PENDING_OPEN_THEN_PUT_IN",
            message=("Sequential goal completed." if report.satisfied else "Sequential goal in progress."),
            progress=report.progress,
        )

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        door = goal.params.get("door", "fridge_door")
        item = goal.params.get("item", "red_cube")
        container = goal.params.get("container", "fridge_main")

        door_state, _ = self._object_state_relation(obs, door)
        item_state, item_rel = self._object_state_relation(obs, item)

        if door_state != "open":
            return GoalProgressResult(score=0.2, stage="open_door", message=f"Need to open {door}.")

        in_container = (container == "fridge_main" and item_state == "in_fridge") or (container in item_rel)
        if in_container:
            return GoalProgressResult(score=1.0, stage="done", message="Sequential goal completed.")

        return GoalProgressResult(score=0.7, stage="put_item", message=f"Need to put {item} into {container}.")

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        door = goal.params.get("door", "fridge_door")
        item = goal.params.get("item", "red_cube")
        container = goal.params.get("container", "fridge_main")

        if self.is_done(obs, goal, evaluator).satisfied:
            return "目标已完成。"

        door_state, _ = self._object_state_relation(obs, door)
        if door_state != "open":
            return f"请先打开 {door}。"

        holding = self._holding(obs)
        if holding != item:
            return f"请先拿起 {item}。"

        return f"请把 {item} 放入 {container}。"


class DslRawGoalHandler(_GoalHandlerBase):
    goal_type = "DSL_RAW"

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        return GoalValidationResult(valid=True, code="GOAL_VALID", issues=[])

    def is_done(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalEvalReport:
        return evaluator.satisfied(obs, goal.goal, goal_key=goal.goal_id)

    def progress(self, obs: ObservationPayload, goal: GoalSpec, evaluator: GoalDslEvaluator) -> GoalProgressResult:
        report = evaluator.satisfied(obs, goal.goal, goal_key=goal.goal_id)
        if report.satisfied:
            return GoalProgressResult(score=1.0, stage="done", message=report.message)
        if report.progress and "/" in report.progress:
            try:
                left, right = report.progress.split("/", 1)
                score = float(left) / max(float(right), 1.0)
                return GoalProgressResult(score=score, stage="in_progress", message=report.message)
            except Exception:
                pass
        return GoalProgressResult(score=0.0, stage="pending", message=report.message)

    def coach(self, goal: GoalSpec, obs: ObservationPayload, evaluator: GoalDslEvaluator) -> str:
        report = evaluator.satisfied(obs, goal.goal, goal_key=goal.goal_id)
        if report.satisfied:
            return "目标已完成。"
        return f"当前目标尚未完成：{goal.dsl}。"


class GoalRegistry:
    """
    Task text -> GoalSpec resolver + goal semantic function registry.

    Each goal type is backed by 4 functions:
    - validate(goal)
    - is_done(obs, goal)
    - progress(obs, goal)
    - coach(goal, obs)
    """

    _POIS = {"table_center", "fridge_zone", "stove_zone"}
    _ITEMS = {"red_cube", "half_cube_left", "half_cube_right", "fridge_door", "fridge_main", "table_surface", "stove"}
    _CONTAINERS = {"fridge_main", "table_surface", "stove"}

    _POI_ALIASES = BACKEND_POI_ALIASES
    _ITEM_ALIASES = BACKEND_ITEM_ALIASES
    _CONTAINER_ALIASES = BACKEND_CONTAINER_ALIASES

    def __init__(
        self,
        parser: Optional[GoalDslParser] = None,
        evaluator: Optional[GoalDslEvaluator] = None,
    ) -> None:
        self._parser = parser or GoalDslParser()
        self._evaluator = evaluator or GoalDslEvaluator()
        self._handlers: Dict[str, GoalHandler] = {}
        self._register_default_handlers()

    def _register_default_handlers(self) -> None:
        self.register_handler(MoveToGoalHandler(self._POIS))
        self.register_handler(OpenGoalHandler(self._ITEMS))
        self.register_handler(CloseGoalHandler(self._ITEMS))
        self.register_handler(PutInGoalHandler(self._ITEMS, self._CONTAINERS))
        self.register_handler(OpenThenPutInGoalHandler(self._ITEMS, self._CONTAINERS))
        self.register_handler(DslRawGoalHandler())

    def register_handler(self, handler: GoalHandler) -> None:
        self._handlers[handler.goal_type] = handler

    def resolve(self, task: str) -> Optional[GoalSpec]:
        text = (task or "").strip()
        if not text:
            return None

        dsl_goal = self._try_parse_dsl(text)
        if dsl_goal is not None:
            return GoalSpec(goal_type="DSL_RAW", goal_id="DSL_RAW", dsl=text, goal=dsl_goal, params={})

        low = text.lower()

        m = re.search(
            r"open\s+([a-z_ ]+?)\s+then\s+(?:put|place)\s+([a-z_ ]+?)\s+(?:in|into)\s+([a-z_ ]+)",
            low,
        )
        if m:
            door = self._normalize_openable_item(m.group(1))
            item = self._normalize_item(m.group(2))
            container = self._normalize_container(m.group(3))
            if door and item and container:
                dsl = f"THEN([open({door}), inside({item}, {container})])"
                goal_id = f"OPEN_THEN_PUT_IN:{door}:{item}:{container}"
                return GoalSpec(
                    goal_type="OPEN_THEN_PUT_IN",
                    goal_id=goal_id,
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"door": door, "item": item, "container": container},
                )

        m = re.search(r"^\s*open\s+([a-z_ ]+)\s*$", low)
        if m:
            item = self._normalize_openable_item(m.group(1))
            if item:
                dsl = f"open({item})"
                return GoalSpec(
                    goal_type="OPEN",
                    goal_id=f"OPEN:{item}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item},
                )

        m = re.search(r"^\s*close\s+([a-z_ ]+)\s*$", low)
        if m:
            item = self._normalize_openable_item(m.group(1))
            if item:
                dsl = f"closed({item})"
                return GoalSpec(
                    goal_type="CLOSE",
                    goal_id=f"CLOSE:{item}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item},
                )

        m = re.search(r"move_to\s*\(\s*([a-z_ ]+)\s*\)", low)
        if m:
            poi = self._normalize_poi(m.group(1))
            if poi:
                dsl = f"at(agent, {poi})"
                return GoalSpec(
                    goal_type="MOVE_TO",
                    goal_id=f"MOVE_TO:{poi}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"poi": poi},
                )

        m = re.search(r"(?:move|go|walk|mv)\s*(?:to)?\s+([a-z_ ]+)", low)
        if m:
            poi = self._normalize_poi(m.group(1))
            if poi:
                dsl = f"at(agent, {poi})"
                return GoalSpec(
                    goal_type="MOVE_TO",
                    goal_id=f"MOVE_TO:{poi}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"poi": poi},
                )

        m = re.search(r"put_in\s*\(\s*([a-z_ ]+)\s*,\s*([a-z_ ]+)\s*\)", low)
        if m:
            item = self._normalize_item(m.group(1))
            container = self._normalize_container(m.group(2))
            if item and container:
                dsl = f"inside({item}, {container})"
                return GoalSpec(
                    goal_type="PUT_IN",
                    goal_id=f"PUT_IN:{item}:{container}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item, "container": container},
                )

        m = re.search(r"(?:put|place)\s+([a-z_ ]+?)\s+(?:in|into)\s+([a-z_ ]+)", low)
        if m:
            item = self._normalize_item(m.group(1))
            container = self._normalize_container(m.group(2))
            if item and container:
                dsl = f"inside({item}, {container})"
                return GoalSpec(
                    goal_type="PUT_IN",
                    goal_id=f"PUT_IN:{item}:{container}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item, "container": container},
                )

        return None

    def resolve_with_hint(self, task: str, goal_hint: Optional[Any]) -> Optional[GoalSpec]:
        """
        Resolve goal using optional structured hint first, then fallback to task text.

        goal_hint accepts any object/dict with fields:
        - goal_type (optional)
        - goal_id (optional)
        - dsl (optional)
        - params (optional dict)
        """
        try:
            hinted = self._resolve_from_hint(goal_hint)
        except Exception:
            hinted = None
        if hinted is not None:
            return hinted
        return self.resolve(task)

    def validate(self, goal: GoalSpec) -> GoalValidationResult:
        return self._handler_for(goal.goal_type).validate(goal)

    def is_done(self, obs: ObservationPayload, goal: GoalSpec) -> GoalEvalReport:
        return self._handler_for(goal.goal_type).is_done(obs, goal, self._evaluator)

    def progress(self, obs: ObservationPayload, goal: GoalSpec) -> GoalProgressResult:
        return self._handler_for(goal.goal_type).progress(obs, goal, self._evaluator)

    def coach(self, goal: GoalSpec, obs: ObservationPayload) -> str:
        return self._handler_for(goal.goal_type).coach(goal, obs, self._evaluator)

    def reset_goal_progress(self, session_id: str, episode_id: int, goal: Optional[GoalSpec] = None) -> None:
        goal_key = goal.goal_id if goal is not None else "default"
        self._evaluator.reset(session_id, episode_id, goal_key)

    def _handler_for(self, goal_type: str) -> GoalHandler:
        handler = self._handlers.get(goal_type)
        if handler is not None:
            return handler
        fallback = self._handlers.get("DSL_RAW")
        if fallback is None:
            raise KeyError(f"No goal handler for type={goal_type!r}")
        return fallback

    def _resolve_from_hint(self, goal_hint: Optional[Any]) -> Optional[GoalSpec]:
        if goal_hint is None:
            return None

        if hasattr(goal_hint, "model_dump"):
            data = goal_hint.model_dump()
        elif isinstance(goal_hint, dict):
            data = dict(goal_hint)
        else:
            data = {
                "goal_type": getattr(goal_hint, "goal_type", None),
                "goal_id": getattr(goal_hint, "goal_id", None),
                "dsl": getattr(goal_hint, "dsl", None),
                "params": getattr(goal_hint, "params", None),
            }

        goal_type = str(data.get("goal_type") or "").strip().upper() or None
        goal_id = str(data.get("goal_id") or "").strip() or None
        dsl = str(data.get("dsl") or "").strip() or None
        params_raw = data.get("params")
        params = dict(params_raw) if isinstance(params_raw, dict) else {}

        if dsl:
            parsed = self._parser.parse(dsl)
            inferred_type = goal_type or "DSL_RAW"
            inferred_id = goal_id or (f"{inferred_type}:{dsl}" if inferred_type != "DSL_RAW" else "DSL_RAW")
            return GoalSpec(
                goal_type=inferred_type,
                goal_id=inferred_id,
                dsl=dsl,
                goal=parsed,
                params={str(k): str(v) for k, v in params.items()},
            )

        if goal_type == "MOVE_TO":
            poi = str(params.get("poi") or "").strip()
            if poi:
                dsl = f"at(agent, {poi})"
                return GoalSpec(
                    goal_type="MOVE_TO",
                    goal_id=goal_id or f"MOVE_TO:{poi}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"poi": poi},
                )

        if goal_type == "OPEN":
            item = self._normalize_openable_from_value(str(params.get("item") or "").strip())
            if item:
                dsl = f"open({item})"
                return GoalSpec(
                    goal_type="OPEN",
                    goal_id=goal_id or f"OPEN:{item}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item},
                )

        if goal_type == "CLOSE":
            item = self._normalize_openable_from_value(str(params.get("item") or "").strip())
            if item:
                dsl = f"closed({item})"
                return GoalSpec(
                    goal_type="CLOSE",
                    goal_id=goal_id or f"CLOSE:{item}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item},
                )

        if goal_type == "PUT_IN":
            item = str(params.get("item") or "").strip()
            container = str(params.get("container") or "").strip()
            if item and container:
                dsl = f"inside({item}, {container})"
                return GoalSpec(
                    goal_type="PUT_IN",
                    goal_id=goal_id or f"PUT_IN:{item}:{container}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"item": item, "container": container},
                )

        if goal_type == "OPEN_THEN_PUT_IN":
            door = self._normalize_openable_from_value(str(params.get("door") or "").strip())
            item = str(params.get("item") or "").strip()
            container = str(params.get("container") or "").strip()
            if door and item and container:
                dsl = f"THEN([open({door}), inside({item}, {container})])"
                return GoalSpec(
                    goal_type="OPEN_THEN_PUT_IN",
                    goal_id=goal_id or f"OPEN_THEN_PUT_IN:{door}:{item}:{container}",
                    dsl=dsl,
                    goal=self._parser.parse(dsl),
                    params={"door": door, "item": item, "container": container},
                )

        return None

    def _try_parse_dsl(self, text: str) -> Optional[GoalExpr]:
        if "(" not in text or ")" not in text:
            return None
        try:
            return self._parser.parse(text)
        except Exception:
            return None

    def _normalize_poi(self, token: str) -> Optional[str]:
        t = self._normalize_token(token)
        mapped = self._POI_ALIASES.get(t, t)
        return mapped if mapped in self._POIS else None

    def _normalize_item(self, token: str) -> Optional[str]:
        t = self._normalize_token(token, keep_space=True)
        mapped = self._ITEM_ALIASES.get(t, t.replace(" ", "_"))
        return mapped if mapped in self._ITEMS else None

    def _normalize_openable_item(self, token: str) -> Optional[str]:
        item = self._normalize_item(token)
        return self._normalize_openable_from_value(item)

    @staticmethod
    def _normalize_openable_from_value(item: Optional[str]) -> Optional[str]:
        if not item:
            return None
        if item == "fridge_main":
            return "fridge_door"
        return item

    def _normalize_container(self, token: str) -> Optional[str]:
        t = self._normalize_token(token, keep_space=True)
        mapped = self._CONTAINER_ALIASES.get(t, t.replace(" ", "_"))
        return mapped if mapped in self._CONTAINERS else None

    @staticmethod
    def _normalize_token(token: str, keep_space: bool = False) -> str:
        t = re.sub(r"[^a-zA-Z0-9_ ]+", "", token.strip().lower())
        t = re.sub(r"\s+", " ", t).strip()
        if keep_space:
            return t
        return t.replace(" ", "_")


__all__ = [
    "GoalSpec",
    "GoalValidationResult",
    "GoalProgressResult",
    "GoalRegistry",
    "GoalHandler",
]
