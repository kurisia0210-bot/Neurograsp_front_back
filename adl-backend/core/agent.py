from pydantic import ValidationError

from core.memory import episodic_memory
from core.reasoning import analyze_and_propose
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

    # 5) Response
    return AgentStepResponse(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        intent=intent,
        execution_result=exec_result,
        reflex_verdict=ReflexVerdictModel(
            verdict="BLOCK" if not exec_result.success else "ALLOW",
            message=exec_result.failure_reason,
        ),
    )
