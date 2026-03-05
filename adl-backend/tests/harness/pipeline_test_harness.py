"""
Unified pipeline test harness for the single reasoning pipeline.

Usage:
    python pipeline_test_harness.py
        python pipeline_test_harness.py --proposer llm
    python pipeline_test_harness.py --proposer mock --mock-script ./golden/mock_script.json
    python pipeline_test_harness.py --json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import sys
import time
from dataclasses import asdict, dataclass
from typing import Awaitable, Callable, Dict, List, Optional


# Windows/GBK consoles can fail on emoji logs emitted by imported modules.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from core.reasoning_pipeline import LLMProposer, MockProposer, ReasoningPipeline
from core.pipeline.proposer.prompt_builder import LLMProposerPromptBuilder
from core.pipeline.proposer.response_parser import LLMProposerResponseParser
from schema.payload import ActionPayload, ObservationPayload


@dataclass
class ComponentTestResult:
    name: str
    passed: bool
    duration_ms: float
    runs: int = 1
    min_ms: float = 0.0
    p50_ms: float = 0.0
    p95_ms: float = 0.0
    max_ms: float = 0.0
    detail: str = ""
    expected: str = ""
    actual: str = ""


class PipelineTestHarness:
    """
    General test harness for pipeline components.

    Core methods:
    - test_stage1_proposer
    - test_stage2_guard
    - test_stage3_route
    - test_end_to_end
    - run_all

    Extension point:
    - register_custom_test(name, async_callable)
    """

    def __init__(
        self,
        proposer: str = "mock",
        mock_script: Optional[str] = None,
        repeat: int = 20,
        warmup: int = 3,
    ) -> None:
        self.pipeline = ReasoningPipeline(proposer=self._build_proposer(proposer, mock_script))
        self.repeat = max(1, int(repeat))
        self.warmup = max(0, int(warmup))
        self._custom_tests: Dict[str, Callable[[], Awaitable[ComponentTestResult]]] = {}

    def register_custom_test(
        self, name: str, test_func: Callable[[], Awaitable[ComponentTestResult]]
    ) -> None:
        self._custom_tests[name] = test_func

    def _build_proposer(self, proposer: str, mock_script: Optional[str]):
        proposer_norm = proposer.strip().lower()
        if proposer_norm == "llm":
            return LLMProposer()
        return MockProposer(script_path=mock_script)

    def _make_obs(
        self,
        *,
        session_id: str = "test-session",
        episode_id: int = 1,
        step_id: int = 1,
        location: str = "table_center",
        holding: Optional[str] = None,
        cube_state: str = "on_table",
        fridge_door_state: str = "closed",
        global_task: str = "Put red cube in fridge",
    ) -> ObservationPayload:
        return ObservationPayload(
            session_id=session_id,
            episode_id=episode_id,
            step_id=step_id,
            timestamp=time.time(),
            agent={"location": location, "holding": holding},
            nearby_objects=[
                {"id": "red_cube", "state": cube_state, "relation": "on_table"},
                {"id": "fridge_door", "state": fridge_door_state, "relation": "front"},
                {"id": "fridge_main", "state": "installed", "relation": "storage"},
                {"id": "table_surface", "state": "installed", "relation": "surface"},
                {"id": "stove", "state": "installed", "relation": "appliance"},
            ],
            global_task=global_task,
        )

    async def test_stage1_proposer(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "stage1_proposer"
        try:
            obs = self._make_obs(session_id="stage1-session", step_id=1)
            proposal = await self.pipeline.propose(obs)
            passed = isinstance(proposal, ActionPayload)
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="propose() should return ActionPayload",
                expected="ActionPayload",
                actual=type(proposal).__name__,
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_stage2_guard(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "stage2_guard"
        try:
            obs = self._make_obs(session_id="stage2-session", step_id=2)
            proposal = await self.pipeline.propose(obs)
            check = await self.pipeline.guard_check(proposal, obs)
            passed = (
                bool(check.passed)
                and check.proposal == proposal
                and check.codes[0] == "NOOP_GUARD"
                and isinstance(check.message, str)
                and check.override is None
            )
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="guard_check() should currently be passthrough",
                expected="passed=True, codes starts with NOOP_GUARD, proposal unchanged, override=None",
                actual=(
                    f"passed={check.passed}, codes={check.codes}, "
                    f"unchanged={check.proposal == proposal}, override_is_none={check.override is None}"
                ),
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_stage3_route(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "stage3_route"
        try:
            act_pipeline = ReasoningPipeline(
                proposer=self._build_proposer("mock", None),
                execution_mode="ACT",
            )
            obs = self._make_obs(session_id="stage3-session", step_id=3)
            proposal = await act_pipeline.propose(obs)
            check = await act_pipeline.guard_check(proposal, obs)
            routed = await act_pipeline.actuation_route(check, obs)
            passed = routed == proposal
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="actuation_route() should return original proposal in ACT mode",
                expected="routed == proposal",
                actual=str(routed == proposal),
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_finish_guard(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "finish_guard_system_decision"
        try:
            obs = self._make_obs(
                session_id="finish-session",
                step_id=4,
                cube_state="in_fridge",
                global_task="Put red cube in fridge",
            )
            action = await self.pipeline.analyze_and_propose(obs)
            passed = action.type == "FINISH"
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="FinishGuard should short-circuit to FINISH before proposer output is used.",
                expected="type=FINISH",
                actual=f"type={action.type}, content={action.content}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_state_stagnation_guard(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "state_stagnation_guard"
        try:
            trigger_check = None
            for step in range(1, 7):
                obs = self._make_obs(
                    session_id="stagnation-session",
                    episode_id=1,
                    step_id=step,
                    location="table_center",
                    holding=None,
                    cube_state="on_table",
                    fridge_door_state="closed",
                    global_task="Put red cube in fridge",
                )
                proposal = await self.pipeline.propose(obs)
                check = await self.pipeline.guard_check(proposal, obs)
                if "NO_STATE_CHANGE" in check.codes:
                    trigger_check = check
                    break

            passed = (
                trigger_check is not None
                and trigger_check.override is not None
                and trigger_check.override.type in ("THINK", "SPEAK")
            )
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="Guard should detect unchanged state signature and produce override.",
                expected="codes contains NO_STATE_CHANGE + override type THINK/SPEAK",
                actual=(
                    "no_trigger"
                    if trigger_check is None
                    else f"codes={trigger_check.codes}, override_type={trigger_check.override.type}"
                ),
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_watchdog_precedence(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "watchdog_precedence_over_stagnation"
        try:
            obs = self._make_obs(
                session_id="watchdog-session",
                step_id=1,
                global_task="Put red cube in fridge",
            )
            proposal = ActionPayload(
                session_id=obs.session_id,
                episode_id=obs.episode_id,
                step_id=obs.step_id,
                type="THINK",
                content="[SYSTEM ERROR]: Cognitive Stagnation Detected. Rule=ACTION_LOOP. Reason=test.",
            )
            check = await self.pipeline.guard_check(proposal, obs)

            passed = (
                check.override is None
                and "WATCHDOG_SYSTEM_ERROR_PRESENT" in check.codes
                and check.proposal == proposal
            )
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="Guard should not override watchdog-originated system error actions.",
                expected="override=None and code WATCHDOG_SYSTEM_ERROR_PRESENT",
                actual=f"codes={check.codes}, override_is_none={check.override is None}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_instruct_adapter(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "instruct_adapter_speak_output"
        try:
            instruct_pipeline = ReasoningPipeline(
                proposer=self._build_proposer("mock", None),
                execution_mode="INSTRUCT",
            )
            obs = self._make_obs(
                session_id="instruct-session",
                step_id=1,
                location="table_center",
                holding=None,
                cube_state="on_table",
                fridge_door_state="closed",
                global_task="Put red cube in fridge",
            )
            action = await instruct_pipeline.analyze_and_propose(obs)
            action_type = action.type.value if hasattr(action.type, "value") else action.type
            passed = action_type == "SPEAK" and "\u8bf7" in (action.content or "")
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="INSTRUCT mode should adapt physical proposal into SPEAK instruction.",
                expected="type=SPEAK and content contains instruction template",
                actual=f"type={action_type}, content={action.content}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_complex_put_in_sequence(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "complex_put_in_sequence"
        try:
            act_pipeline = ReasoningPipeline(
                proposer=self._build_proposer("mock", None),
                execution_mode="ACT",
            )

            obs1 = self._make_obs(
                session_id="complex-session",
                episode_id=1,
                step_id=1,
                holding=None,
                cube_state="on_table",
                fridge_door_state="closed",
                global_task="Put red cube in fridge",
            )
            a1 = await act_pipeline.analyze_and_propose(obs1)

            obs2 = self._make_obs(
                session_id="complex-session",
                episode_id=1,
                step_id=2,
                holding="red_cube",
                cube_state="in_hand",
                fridge_door_state="closed",
                global_task="Put red cube in fridge",
            )
            a2 = await act_pipeline.analyze_and_propose(obs2)

            obs3 = self._make_obs(
                session_id="complex-session",
                episode_id=1,
                step_id=3,
                holding="red_cube",
                cube_state="in_hand",
                fridge_door_state="open",
                global_task="Put red cube in fridge",
            )
            a3 = await act_pipeline.analyze_and_propose(obs3)

            seq = [
                (a1.type, a1.interaction_type, a1.target_item),
                (a2.type, a2.interaction_type, a2.target_item),
                (a3.type, a3.interaction_type, a3.target_item),
            ]
            expected = [
                ("INTERACT", "PICK", "red_cube"),
                ("INTERACT", "OPEN", "fridge_door"),
                ("INTERACT", "PLACE", "fridge_main"),
            ]
            passed = seq == expected
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="Complex planner should decompose PUT_IN(fridge) into PICK -> OPEN -> PLACE.",
                expected=str(expected),
                actual=str(seq),
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_end_to_end(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "pipeline_end_to_end"
        try:
            obs = self._make_obs(session_id="e2e-session", step_id=4)
            action = await self.pipeline.analyze_and_propose(obs)
            trace_ok = (
                action.session_id == obs.session_id
                and action.episode_id == obs.episode_id
                and action.step_id == obs.step_id
            )
            passed = isinstance(action, ActionPayload) and trace_ok
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="analyze_and_propose() should return trace-aligned ActionPayload",
                expected="valid ActionPayload + trace fields aligned",
                actual=f"type={action.type}, trace_ok={trace_ok}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_llm_parser_blocks_finish(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "llm_parser_blocks_finish"
        try:
            obs = self._make_obs(session_id="llm-parser-finish", step_id=1)
            parser = LLMProposerResponseParser()
            action = parser.parse_to_action(obs, '{"type":"FINISH","content":"done"}')
            action_type = action.type.value if hasattr(action.type, "value") else action.type
            passed = action_type == "THINK" and "non-delegable" in (action.content or "").lower()
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="LLM parser should block FINISH from proposer output.",
                expected="type=THINK with non-delegable message",
                actual=f"type={action_type}, content={action.content!r}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_llm_parser_rejects_unknown_type(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "llm_parser_rejects_unknown_type"
        try:
            obs = self._make_obs(session_id="llm-parser-unknown", step_id=1)
            parser = LLMProposerResponseParser()
            action = parser.parse_to_action(obs, '{"type":"HACK","content":"oops"}')
            action_type = action.type.value if hasattr(action.type, "value") else action.type
            passed = action_type == "THINK" and "unsupported proposer action type" in (
                action.content or ""
            ).lower()
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="LLM parser should downgrade unknown action types to THINK.",
                expected="type=THINK with unsupported-type message",
                actual=f"type={action_type}, content={action.content!r}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_llm_parser_normalizes_pick_alias(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "llm_parser_normalizes_pick_alias"
        try:
            obs = self._make_obs(session_id="llm-parser-pick-alias", step_id=1)
            parser = LLMProposerResponseParser()
            action = parser.parse_to_action(
                obs,
                '{"type":"PICK","target_item":"red_cube","content":"pick cube"}',
            )
            action_type = action.type.value if hasattr(action.type, "value") else action.type
            interaction_type = (
                action.interaction_type.value
                if hasattr(action.interaction_type, "value")
                else action.interaction_type
            )
            passed = action_type == "INTERACT" and interaction_type == "PICK"
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="Parser should normalize shorthand type PICK into INTERACT/PICK.",
                expected="type=INTERACT and interaction_type=PICK",
                actual=f"type={action_type}, interaction_type={interaction_type}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def test_prompt_builder_goal_and_last_step(self) -> ComponentTestResult:
        started = time.perf_counter()
        name = "prompt_builder_goal_and_last_step"
        try:
            long_action = ("ACT " * 120) + "TAIL_ACTION_MARK"
            long_failure = ("FAIL " * 140) + "TAIL_FAILURE_MARK"
            obs = ObservationPayload(
                session_id="prompt-session",
                episode_id=1,
                step_id=7,
                timestamp=time.time(),
                agent={"location": "table_center", "holding": "red_cube"},
                nearby_objects=[
                    {"id": "red_cube", "state": "in_hand", "relation": "hand"},
                    {"id": "fridge_door", "state": "closed", "relation": "front"},
                    {"id": "fridge_main", "state": "installed", "relation": "storage"},
                ],
                global_task="Put red cube in fridge",
                goal_spec={
                    "goal_type": "PUT_IN",
                    "goal_id": "goal_put_in_fridge",
                    "dsl": "inside(red_cube, fridge_main)",
                    "params": {"item": "red_cube", "container": "fridge_main"},
                },
                last_action={
                    "session_id": "prompt-session",
                    "episode_id": 1,
                    "step_id": 6,
                    "type": "INTERACT",
                    "target_item": "fridge_main",
                    "interaction_type": "PLACE",
                    "content": long_action,
                },
                last_result={
                    "success": False,
                    "failure_type": "REFLEX_BLOCK",
                    "failure_reason": long_failure,
                },
            )
            builder = LLMProposerPromptBuilder()
            messages = builder.build_messages(obs)
            user_msg = messages[1]["content"]
            passed = (
                "goal_spec=" in user_msg
                and "last_action=(" in user_msg
                and "last_result=(" in user_msg
                and "TAIL_ACTION_MARK" not in user_msg
                and "TAIL_FAILURE_MARK" not in user_msg
            )
            return ComponentTestResult(
                name=name,
                passed=passed,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail="Prompt should prioritize goal_spec and include bounded last-step context.",
                expected="goal_spec + last_action/last_result present; long tails truncated",
                actual=f"user_msg_preview={user_msg[:240]!r}",
            )
        except Exception as exc:
            return ComponentTestResult(
                name=name,
                passed=False,
                duration_ms=(time.perf_counter() - started) * 1000,
                detail=f"Exception: {exc}",
                expected="No exception",
                actual=type(exc).__name__,
            )

    async def run_all(self) -> List[ComponentTestResult]:
        tests: List[Callable[[], Awaitable[ComponentTestResult]]] = [
            self.test_stage1_proposer,
            self.test_stage2_guard,
            self.test_stage3_route,
            self.test_finish_guard,
            self.test_state_stagnation_guard,
            self.test_watchdog_precedence,
            self.test_instruct_adapter,
            self.test_complex_put_in_sequence,
            self.test_end_to_end,
            self.test_llm_parser_blocks_finish,
            self.test_llm_parser_rejects_unknown_type,
            self.test_llm_parser_normalizes_pick_alias,
            self.test_prompt_builder_goal_and_last_step,
        ]
        tests.extend(self._custom_tests.values())

        results: List[ComponentTestResult] = []
        for test_func in tests:
            for _ in range(self.warmup):
                await test_func()

            runs: List[ComponentTestResult] = []
            for _ in range(self.repeat):
                runs.append(await test_func())

            durations = sorted(item.duration_ms for item in runs)
            p50_index = int(math.floor(0.50 * (len(durations) - 1)))
            p95_index = int(math.floor(0.95 * (len(durations) - 1)))
            first = runs[0]

            results.append(
                ComponentTestResult(
                    name=first.name,
                    passed=all(item.passed for item in runs),
                    duration_ms=sum(durations) / len(durations),
                    runs=len(runs),
                    min_ms=durations[0],
                    p50_ms=durations[p50_index],
                    p95_ms=durations[p95_index],
                    max_ms=durations[-1],
                    detail=first.detail,
                    expected=first.expected,
                    actual=first.actual,
                )
            )
        return results


def _print_human_readable(results: List[ComponentTestResult]) -> None:
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    print(f"[PipelineTestHarness] {passed}/{total} passed")
    print("[Note] Latency here is logic-only in-process timing (no HTTP/network/UI).")
    for item in results:
        mark = "PASS" if item.passed else "FAIL"
        print(
            f"- {mark} {item.name} "
            f"(avg={item.duration_ms:.3f}ms p50={item.p50_ms:.3f}ms p95={item.p95_ms:.3f}ms "
            f"min={item.min_ms:.3f}ms max={item.max_ms:.3f}ms runs={item.runs})"
        )
        if not item.passed:
            print(f"  expected={item.expected}")
            print(f"  actual={item.actual}")
            print(f"  detail={item.detail}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run reasoning pipeline component tests.")
    parser.add_argument(
        "--proposer",
        default="mock",
        choices=["mock", "llm"],
        help="Which proposer strategy to test.",
    )
    parser.add_argument(
        "--mock-script",
        default=None,
        help="Optional JSON script path for MockProposer.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print results as JSON.",
    )
    parser.add_argument(
        "--repeat",
        type=int,
        default=20,
        help="How many measured runs per test (default: 20).",
    )
    parser.add_argument(
        "--warmup",
        type=int,
        default=3,
        help="How many warmup runs before measurement (default: 3).",
    )
    return parser.parse_args()


async def _main_async() -> int:
    args = parse_args()
    harness = PipelineTestHarness(
        proposer=args.proposer,
        mock_script=args.mock_script,
        repeat=args.repeat,
        warmup=args.warmup,
    )
    results = await harness.run_all()

    if args.json:
        print(json.dumps([asdict(item) for item in results], ensure_ascii=False, indent=2))
    else:
        _print_human_readable(results)

    return 0 if all(item.passed for item in results) else 1


def main() -> None:
    raise SystemExit(asyncio.run(_main_async()))


if __name__ == "__main__":
    main()



