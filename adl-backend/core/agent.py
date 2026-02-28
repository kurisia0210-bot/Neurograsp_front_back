from pydantic import ValidationError

from core.safety.error_dictionary import classify_step_error
from core.runtime.memory import episodic_memory
from core.runtime.task_facts import summarize_task_facts
from core.reasoning import analyze_and_propose
from core.runtime.step_logger import emit_step_summary
from schema.payload import (
    ActionExecutionResult,
    ActionPayload,
    AgentActionType,
    AgentStepResponse,
    FailureType,
    ObservationPayload,
    ReflexVerdictModel,
)
from service.adl_rules import evaluate_reflex


async def step(obs: ObservationPayload) -> AgentStepResponse:
    # Resolve hierarchy key: session -> episode -> step
    obs.episode_id = episodic_memory.resolve_episode_id(obs)

    # Debug trace: frontend-fed last action content
    if obs.last_action is not None:
        print(
            "[Tick Input] "
            f"(session={obs.session_id}, episode={obs.episode_id}, step={obs.step_id}) "
            f"last_action.content={obs.last_action.content!r}"
        )

    goal_type = None
    goal_id = None
    if obs.goal_spec is not None:
        goal_type = getattr(obs.goal_spec, "goal_type", None)
        goal_id = getattr(obs.goal_spec, "goal_id", None)
    print(
        "[Tick Goal] "
        f"(session={obs.session_id}, episode={obs.episode_id}, step={obs.step_id}) "
        f"goal_type={goal_type!r} goal_id={goal_id!r} global_task={obs.global_task!r}"
    )
    facts = summarize_task_facts(obs, max_objects=4)
    print(
        "[Tick Facts] "
        f"(session={obs.session_id}, episode={obs.episode_id}, step={obs.step_id}) "
        f"agent={facts.get('agent')} objects={facts.get('objects')}"
    )

    # 1) Commit previous staged action with current observation as post-state
    episodic_memory.commit(obs)

    intent = None
    exec_result = None

    try:
        # 2) Reasoning
        intent = await analyze_and_propose(obs)

        if intent.type == AgentActionType.THINK and "Confused" in intent.content:
            exec_result = ActionExecutionResult(
                success=False,
                failure_type=FailureType.SCHEMA_ERROR,
                failure_reason=intent.content,
            )

    except ValidationError as e:
        print(f"[M8] Schema Error Caught: {e}")
        intent = ActionPayload(
            session_id=obs.session_id,
            episode_id=obs.episode_id,
            step_id=obs.step_id,
            type=AgentActionType.THINK,
            content=f"Schema Validation Failed: {str(e)}",
        )
        exec_result = ActionExecutionResult(
            success=False,
            failure_type=FailureType.SCHEMA_ERROR,
            failure_reason=f"System Rejection: {str(e)}",
        )
    except Exception as e:
        print(f"[Reasoning Runtime Error] {e}")
        intent = ActionPayload(
            session_id=obs.session_id,
            episode_id=obs.episode_id,
            step_id=obs.step_id,
            type=AgentActionType.THINK,
            content=f"Reasoning Runtime Error: {str(e)}",
        )
        exec_result = ActionExecutionResult(
            success=False,
            failure_type=FailureType.REASONING_ERROR,
            failure_reason=f"System Exception: {str(e)}",
        )

    # 3) Reflex
    if exec_result is None:
        verdict_resp = evaluate_reflex(intent, obs)

        if verdict_resp.verdict == "BLOCK":
            exec_result = ActionExecutionResult(
                success=False,
                failure_type=FailureType.REFLEX_BLOCK,
                failure_reason=verdict_resp.message,
            )
        else:
            exec_result = ActionExecutionResult(success=True)

    # 4) Stage for next commit
    episodic_memory.stage_action(intent, exec_result)

    # Episode boundary implemented for FINISH.
    # NOTE(super-ahead, skipped): RESET/EXIT-driven server-side boundary is not implemented yet,
    # because protocol currently has no explicit RESET/EXIT action/event.
    if intent.type == AgentActionType.FINISH:
        episodic_memory.close_episode(obs.session_id)

    reflex_model = ReflexVerdictModel(
        verdict="BLOCK" if not exec_result.success else "ALLOW",
        message=exec_result.failure_reason,
    )
    error_payload = classify_step_error(intent, exec_result)
    emit_step_summary(
        obs=obs,
        intent=intent,
        exec_result=exec_result,
        reflex_verdict=reflex_model,
        error=error_payload,
    )

    # 5) Response
    return AgentStepResponse(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        intent=intent,
        execution_result=exec_result,
        reflex_verdict=reflex_model,
        error=error_payload,
    )
