from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass, fields, is_dataclass
from typing import Any, Callable, Dict, List, Optional

from core.goal_dsl import GoalDslEvaluator, GoalDslParser
from core.goal_registry import GoalRegistry
from schema.payload import ObservationPayload


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str
    duration_ms: float


def _make_obs(
    *,
    session_id: str = "dsl-test-session",
    episode_id: int = 1,
    step_id: int = 1,
    location: str = "table_center",
    holding: Optional[str] = None,
    red_cube_state: str = "on_table",
    red_cube_relation: str = "on table_surface",
    door_state: str = "closed",
    global_task: str = "Put red cube in fridge",
) -> ObservationPayload:
    return ObservationPayload(
        session_id=session_id,
        episode_id=episode_id,
        step_id=step_id,
        timestamp=time.time(),
        agent={"location": location, "holding": holding},
        nearby_objects=[
            {"id": "red_cube", "state": red_cube_state, "relation": red_cube_relation},
            {"id": "fridge_door", "state": door_state, "relation": "front"},
            {"id": "fridge_main", "state": "installed", "relation": "storage"},
            {"id": "table_surface", "state": "installed", "relation": "surface"},
            {"id": "stove", "state": "installed", "relation": "appliance"},
        ],
        global_task=global_task,
    )


class GoalDslHarness:
    def __init__(self) -> None:
        self.parser = GoalDslParser()
        self.evaluator = GoalDslEvaluator()
        self.registry = GoalRegistry(parser=self.parser, evaluator=self.evaluator)

    def run_all(self) -> List[TestResult]:
        tests: List[Callable[[], TestResult]] = [
            self.test_parse_atomic,
            self.test_parse_combinators,
            self.test_alignment_invalid_token,
            self.test_registry_move_to,
            self.test_registry_put_in,
            self.test_registry_then,
            self.test_evaluate_atomic,
            self.test_evaluate_count,
            self.test_evaluate_then_progression,
        ]
        return [t() for t in tests]

    def run_flow(self, tasks: List[str], as_json: bool = False) -> int:
        """
        Show end-to-end dataflow:
        natural language task -> GoalSpec(goal_id + DSL + parsed tree) -> evaluation reports
        """
        if not tasks:
            tasks = [
                "Put red cube in fridge",
                "mv to fridge",
                "open fridge door then put red cube in fridge",
            ]

        rows: List[Dict[str, Any]] = []
        for idx, task in enumerate(tasks, start=1):
            rows.append(self._flow_for_task(task, seq=idx))

        if as_json:
            print(json.dumps(rows, ensure_ascii=False, indent=2))
        else:
            self._print_flow_text(rows)
        return 0

    def test_parse_atomic(self) -> TestResult:
        return self._run("parse_atomic", lambda: self.parser.parse("at(agent, fridge_zone)"))

    def test_parse_combinators(self) -> TestResult:
        return self._run(
            "parse_combinators",
            lambda: self.parser.parse(
                "THEN([AND([at(agent, table_center), open(fridge_door)]), inside(red_cube, fridge_main)])"
            ),
        )

    def test_alignment_invalid_token(self) -> TestResult:
        def _check():
            try:
                self.parser.parse("inside(red_cube, moon)")
            except ValueError as exc:
                assert "INVALID_CONTAINER" in str(exc)
                return
            raise AssertionError("Expected alignment failure for invalid container token")

        return self._run("alignment_invalid_token", _check)

    def test_registry_move_to(self) -> TestResult:
        def _check():
            spec = self.registry.resolve("mv to fridge")
            assert spec is not None
            assert spec.goal_id.startswith("MOVE_TO:")
            assert spec.dsl == "at(agent, fridge_zone)"

        return self._run("registry_move_to", _check)

    def test_registry_put_in(self) -> TestResult:
        def _check():
            spec = self.registry.resolve("Put red cube in fridge")
            assert spec is not None
            assert spec.goal_id.startswith("PUT_IN:")
            assert spec.dsl == "inside(red_cube, fridge_main)"

        return self._run("registry_put_in", _check)

    def test_registry_then(self) -> TestResult:
        def _check():
            spec = self.registry.resolve("open fridge door then put red cube in fridge")
            assert spec is not None
            assert spec.goal_id.startswith("OPEN_THEN_PUT_IN:")
            assert spec.dsl.startswith("THEN([open(fridge_door), inside(red_cube, fridge_main)])")

        return self._run("registry_then", _check)

    def test_evaluate_atomic(self) -> TestResult:
        def _check():
            goal = self.parser.parse("inside(red_cube, fridge_main)")
            obs = _make_obs(red_cube_state="in_fridge", red_cube_relation="inside fridge_main")
            report = self.evaluator.satisfied(obs, goal, goal_key="atomic")
            assert report.satisfied is True

        return self._run("evaluate_atomic", _check)

    def test_evaluate_count(self) -> TestResult:
        def _check():
            goal = self.parser.parse("COUNT(2, [open(fridge_door), at(agent, table_center), inside(red_cube, fridge_main)])")
            obs = _make_obs(door_state="open", red_cube_state="on_table", location="table_center")
            report = self.evaluator.satisfied(obs, goal, goal_key="count")
            assert report.satisfied is True

        return self._run("evaluate_count", _check)

    def test_evaluate_then_progression(self) -> TestResult:
        def _check():
            goal = self.parser.parse("THEN([open(fridge_door), inside(red_cube, fridge_main)])")
            sid = "then-session"
            obs1 = _make_obs(
                session_id=sid,
                episode_id=7,
                step_id=1,
                door_state="open",
                red_cube_state="on_table",
            )
            r1 = self.evaluator.satisfied(obs1, goal, goal_key="then_put_in")
            assert r1.satisfied is False
            assert r1.progress == "1/2"

            obs2 = _make_obs(
                session_id=sid,
                episode_id=7,
                step_id=2,
                door_state="open",
                red_cube_state="in_fridge",
                red_cube_relation="inside fridge_main",
            )
            r2 = self.evaluator.satisfied(obs2, goal, goal_key="then_put_in")
            assert r2.satisfied is True
            assert r2.progress == "2/2"

            self.evaluator.reset(sid, 7, "then_put_in")
            obs3 = _make_obs(
                session_id=sid,
                episode_id=7,
                step_id=3,
                door_state="closed",
                red_cube_state="in_fridge",
                red_cube_relation="inside fridge_main",
            )
            r3 = self.evaluator.satisfied(obs3, goal, goal_key="then_put_in")
            assert r3.satisfied is False
            assert r3.progress == "0/2"

        return self._run("evaluate_then_progression", _check)

    @staticmethod
    def _run(name: str, fn: Callable[[], object]) -> TestResult:
        started = time.perf_counter()
        try:
            fn()
            return TestResult(
                name=name,
                passed=True,
                detail="OK",
                duration_ms=(time.perf_counter() - started) * 1000.0,
            )
        except Exception as exc:
            return TestResult(
                name=name,
                passed=False,
                detail=f"{type(exc).__name__}: {exc}",
                duration_ms=(time.perf_counter() - started) * 1000.0,
            )

    def _flow_for_task(self, task: str, *, seq: int) -> Dict[str, Any]:
        spec = self.registry.resolve(task)
        if spec is None:
            if "(" in task and ")" in task:
                try:
                    _, issues = self.parser.parse_with_alignment(task)
                    return {
                        "seq": seq,
                        "task": task,
                        "resolved": False,
                        "error": "TASK_NOT_RESOLVED_BY_REGISTRY",
                        "alignment_issues": [self._issue_to_dict(x) for x in issues],
                    }
                except Exception as exc:
                    return {
                        "seq": seq,
                        "task": task,
                        "resolved": False,
                        "error": f"TASK_NOT_RESOLVED_BY_REGISTRY: {type(exc).__name__}: {exc}",
                    }
            return {
                "seq": seq,
                "task": task,
                "resolved": False,
                "error": "TASK_NOT_RESOLVED_BY_REGISTRY",
            }

        goal_tree = self._goal_to_dict(spec.goal)
        validation = self.registry.validate(spec)
        evaluations = self._build_eval_flow(spec, task)
        return {
            "seq": seq,
            "task": task,
            "resolved": True,
            "goal_type": spec.goal_type,
            "goal_id": spec.goal_id,
            "dsl": spec.dsl,
            "params": spec.params,
            "validation": {
                "valid": validation.valid,
                "code": validation.code,
                "issues": validation.issues,
            },
            "goal_tree": goal_tree,
            "evaluations": evaluations,
        }

    @staticmethod
    def _issue_to_dict(issue: Any) -> Dict[str, Any]:
        return {
            "code": getattr(issue, "code", ""),
            "path": getattr(issue, "path", ""),
            "token": getattr(issue, "token", ""),
            "expected": getattr(issue, "expected", ""),
            "message": getattr(issue, "message", ""),
        }

    def _build_eval_flow(self, spec: Any, task: str) -> List[Dict[str, Any]]:
        sid = f"flow-{spec.goal_id}"
        key = spec.goal_id
        self.evaluator.reset(sid, 1, key)

        if spec.goal_id.startswith("OPEN_THEN_PUT_IN:"):
            obs1 = _make_obs(
                session_id=sid,
                episode_id=1,
                step_id=1,
                door_state="open",
                red_cube_state="on_table",
                red_cube_relation="on table_surface",
                global_task=task,
            )
            done1 = self.registry.is_done(obs1, spec)
            progress1 = self.registry.progress(obs1, spec)
            coach1 = self.registry.coach(spec, obs1)

            obs2 = _make_obs(
                session_id=sid,
                episode_id=1,
                step_id=2,
                door_state="open",
                red_cube_state="in_fridge",
                red_cube_relation="inside fridge_main",
                global_task=task,
            )
            done2 = self.registry.is_done(obs2, spec)
            progress2 = self.registry.progress(obs2, spec)
            coach2 = self.registry.coach(spec, obs2)
            return [
                self._eval_row("step1", obs1, done1, progress1, coach1),
                self._eval_row("step2", obs2, done2, progress2, coach2),
            ]

        obs_pending = _make_obs(
            session_id=sid,
            episode_id=1,
            step_id=1,
            door_state="closed",
            red_cube_state="on_table",
            red_cube_relation="on table_surface",
            global_task=task,
        )
        done_pending = self.registry.is_done(obs_pending, spec)
        progress_pending = self.registry.progress(obs_pending, spec)
        coach_pending = self.registry.coach(spec, obs_pending)

        obs_done = self._make_done_obs(goal_id=spec.goal_id, task=task, sid=sid)
        done_done = self.registry.is_done(obs_done, spec)
        progress_done = self.registry.progress(obs_done, spec)
        coach_done = self.registry.coach(spec, obs_done)

        return [
            self._eval_row("pending", obs_pending, done_pending, progress_pending, coach_pending),
            self._eval_row("done", obs_done, done_done, progress_done, coach_done),
        ]

    @staticmethod
    def _eval_row(label: str, obs: ObservationPayload, report: Any, progress: Any, coach: str) -> Dict[str, Any]:
        return {
            "label": label,
            "obs": {
                "location": obs.agent.location,
                "holding": obs.agent.holding,
                "red_cube_state": next((x.state for x in obs.nearby_objects if str(x.id) == "red_cube"), None),
                "door_state": next((x.state for x in obs.nearby_objects if str(x.id) == "fridge_door"), None),
            },
            "report": {
                "satisfied": report.satisfied,
                "code": report.code,
                "message": report.message,
                "progress": report.progress,
            },
            "progress_metric": {
                "score": getattr(progress, "score", None),
                "stage": getattr(progress, "stage", None),
                "message": getattr(progress, "message", None),
            },
            "coach": coach,
        }

    @staticmethod
    def _goal_to_dict(goal: Any) -> Any:
        if is_dataclass(goal):
            out = {"node": goal.__class__.__name__}
            for f in fields(goal):
                out[f.name] = GoalDslHarness._goal_to_dict(getattr(goal, f.name))
            return out
        if isinstance(goal, list):
            return [GoalDslHarness._goal_to_dict(x) for x in goal]
        return goal

    @staticmethod
    def _make_done_obs(goal_id: str, task: str, sid: str) -> ObservationPayload:
        if goal_id.startswith("MOVE_TO:"):
            poi = goal_id.split(":", 1)[1]
            return _make_obs(
                session_id=sid,
                episode_id=1,
                step_id=2,
                location=poi,
                global_task=task,
            )
        if goal_id.startswith("PUT_IN:"):
            return _make_obs(
                session_id=sid,
                episode_id=1,
                step_id=2,
                red_cube_state="in_fridge",
                red_cube_relation="inside fridge_main",
                global_task=task,
            )
        return _make_obs(
            session_id=sid,
            episode_id=1,
            step_id=2,
            global_task=task,
        )

    @staticmethod
    def _print_flow_text(rows: List[Dict[str, Any]]) -> None:
        print("[GoalDslFlow]")
        for row in rows:
            print("=" * 72)
            print(f"Task[{row.get('seq')}]: {row.get('task')}")
            print(f"Resolved: {row.get('resolved')}")
            if not row.get("resolved"):
                print(f"Error: {row.get('error')}")
                continue
            print(f"GoalId: {row.get('goal_id')}")
            print(f"DSL: {row.get('dsl')}")
            print(f"Validation: {row.get('validation')}")
            print("GoalTree:")
            print(json.dumps(row.get("goal_tree"), ensure_ascii=False, indent=2))
            print("Evaluations:")
            for ev in row.get("evaluations", []):
                rpt = ev.get("report", {})
                p = ev.get("progress_metric", {})
                print(
                    f"  - {ev.get('label')}: satisfied={rpt.get('satisfied')} "
                    f"code={rpt.get('code')} progress={rpt.get('progress')} "
                    f"score={p.get('score')} stage={p.get('stage')} "
                    f"obs={ev.get('obs')} coach={ev.get('coach')!r}"
                )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Goal DSL standalone harness")
    parser.add_argument("--flow", action="store_true", help="Show task->DSL->AST->evaluation dataflow")
    parser.add_argument("--task", action="append", help="Task text for --flow (repeatable)")
    parser.add_argument("--json", action="store_true", help="Use JSON output format in --flow mode")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    harness = GoalDslHarness()

    if args.flow:
        return harness.run_flow(tasks=args.task or [], as_json=args.json)

    results = harness.run_all()
    passed = sum(1 for x in results if x.passed)
    total = len(results)
    print(f"[GoalDslHarness] {passed}/{total} passed")
    for item in results:
        flag = "PASS" if item.passed else "FAIL"
        print(f"- {flag} {item.name} ({item.duration_ms:.3f}ms) {item.detail}")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
