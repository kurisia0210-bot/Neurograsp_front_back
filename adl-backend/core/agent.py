from pydantic import ValidationError

from core.safety.error_dictionary import classify_step_error
from core.reasoning import analyze_and_propose
from core.runtime.step_logger import emit_step_summary
from schema.payload import (
    ActionExecutionResult,
    ActionPayload,
    AgentActionType,
    AgentStepResponse,
    FailureType,
    ObservationPayload,
)


async def step(obs: ObservationPayload) -> AgentStepResponse:
    # Stateless mode: keep client episode_id when provided, fallback to 1.
    obs.episode_id = int(obs.episode_id) if obs.episode_id is not None else 1

    # Debug trace: frontend-fed last action content
    if obs.last_action is not None:
        print(
            "[Tick Input] "
            f"(session={obs.session_id}, episode={obs.episode_id}, step={obs.step_id}) "
            f"last_action.content={obs.last_action.content!r}"
        )

    intent = None
    exec_result = None

    try:
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

    if exec_result is None:
        exec_result = ActionExecutionResult(success=True)

    error_payload = classify_step_error(intent, exec_result)
    emit_step_summary(
        obs=obs,
        intent=intent,
        exec_result=exec_result,
        error=error_payload,
    )

    return AgentStepResponse(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        intent=intent,
        execution_result=exec_result,
        effects=getattr(obs, "last_effects", []) or [],
        error=error_payload,
    )
