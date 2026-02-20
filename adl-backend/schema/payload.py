from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# 1. Enum Definitions
# ==========================================


class AgentActionType(str, Enum):
    # Level 1 (Kitchen)
    MOVE_TO = "MOVE_TO"
    INTERACT = "INTERACT"
    THINK = "THINK"
    SPEAK = "SPEAK"
    IDLE = "IDLE"
    FINISH = "FINISH"

    # Level 2 (Phone Game)
    ADJUST_DIFFICULTY = "ADJUST_DIFFICULTY"
    AUTO_PASS = "AUTO_PASS"


class ItemName(str, Enum):
    RED_CUBE = "red_cube"
    HALF_CUBE_LEFT = "half_cube_left"
    HALF_CUBE_RIGHT = "half_cube_right"
    FRIDGE_MAIN = "fridge_main"
    FRIDGE_DOOR = "fridge_door"
    STOVE = "stove"
    TABLE_SURFACE = "table_surface"


class PoiName(str, Enum):
    TABLE_CENTER = "table_center"
    FRIDGE_ZONE = "fridge_zone"
    STOVE_ZONE = "stove_zone"


class ObjectState(str, Enum):
    ON_TABLE = "on_table"
    IN_HAND = "in_hand"
    IN_FRIDGE = "in_fridge"
    CLOSED = "closed"
    OPEN = "open"
    INSTALLED = "installed"


class InteractionType(str, Enum):
    PICK = "PICK"
    PLACE = "PLACE"
    SLICE = "SLICE"
    COOK = "COOK"
    OPEN = "OPEN"
    CLOSE = "CLOSE"
    TOGGLE = "TOGGLE"
    NONE = "NONE"


# ==========================================
# 2. Strict Schemas
# ==========================================


class AgentSelfState(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    location: PoiName = Field(..., description="Agent current location")
    holding: Optional[ItemName] = Field(None, description="Item currently held by agent")


class VisibleObject(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: ItemName = Field(..., description="Object unique id")
    state: ObjectState = Field(..., description="Object state")
    relation: Optional[str] = None


class FailureType(str, Enum):
    SCHEMA_ERROR = "SCHEMA_ERROR"
    REASONING_ERROR = "REASONING_ERROR"
    GOAL_AMBIGUOUS = "GOAL_AMBIGUOUS"
    REFLEX_BLOCK = "REFLEX_BLOCK"


class ActionExecutionResult(BaseModel):
    success: bool
    failure_type: Optional[FailureType] = None
    failure_reason: str = ""


class GoalSpecPayload(BaseModel):
    """
    Optional structured goal hint sent by frontend.
    Backend still validates/resolves this into canonical GoalSpec.
    """

    goal_type: Optional[str] = Field(default=None, description="Goal type, e.g. MOVE_TO/PUT_IN")
    goal_id: Optional[str] = Field(default=None, description="Stable goal identifier")
    dsl: Optional[str] = Field(default=None, description="Goal DSL expression")
    params: Dict[str, str] = Field(default_factory=dict, description="Goal parameters")


class ObservationPayload(BaseModel):
    # P0-1/P0-3: hierarchical trace keys
    session_id: str = Field(..., description="Session UUID")
    episode_id: Optional[int] = Field(
        default=None,
        description="Episode id within this session. Optional in request; backend assigns when missing"
    )
    step_id: int = Field(..., description="Step number in this episode")

    timestamp: float
    agent: AgentSelfState
    nearby_objects: List[VisibleObject]
    global_task: str
    goal_spec: Optional[GoalSpecPayload] = Field(
        default=None,
        description="Optional structured goal hint to avoid per-tick NL parsing"
    )

    # P0-2: previous-step closure data
    last_action: Optional["ActionPayload"] = Field(
        default=None,
        description="Last executed/adjudicated action"
    )
    last_result: Optional[ActionExecutionResult] = Field(
        default=None,
        description="Last action execution result"
    )


class ActionPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    # trace keys copied from request
    session_id: str = Field(..., description="Session UUID")
    episode_id: Optional[int] = Field(default=None, description="Episode id in session")
    step_id: int = Field(..., description="Step number in episode")

    type: AgentActionType = Field(..., description="Action type")
    target_poi: Optional[PoiName] = Field(None, description="Move target POI")
    target_item: Optional[ItemName] = Field(None, description="Interaction target item")

    interaction_type: InteractionType = Field(
        default=InteractionType.NONE,
        description="Specific intent for INTERACT"
    )

    target_length: Optional[int] = Field(
        None,
        ge=3,
        le=11,
        description="Target phone number length (for ADJUST_DIFFICULTY)"
    )

    content: str = Field(..., description="Reasoning/explanation text")


# ==========================================
# 3. System Responses / Verdicts
# ==========================================


class SystemResponses:
    pass


# Placeholder constants; must be overwritten with real trace ids before use.
SystemResponses.CONFUSED = ActionPayload(
    session_id="SYSTEM",
    episode_id=0,
    step_id=0,
    type=AgentActionType.THINK,
    content="System Confused"
)
SystemResponses.SILENCE = ActionPayload(
    session_id="SYSTEM",
    episode_id=0,
    step_id=0,
    type=AgentActionType.IDLE,
    content="..."
)


class ReflexVerdict(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    IGNORE = "IGNORE"


class ReflexVerdictModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    verdict: ReflexVerdict = Field(..., description="Reflex verdict")
    message: str = Field(..., description="Reflex verdict reason")


class StepErrorPayload(BaseModel):
    error_code: str = Field(..., description="Unified error code")
    module: str = Field(..., description="Module that produced the error")
    severity: str = Field(..., description="Severity level")
    description: str = Field(..., description="Human-readable summary")
    detail: str = Field(default="", description="Detailed message")
    extra: Dict[str, Any] = Field(default_factory=dict, description="Extensible metadata")


class AgentStepResponse(BaseModel):
    # top-level trace keys for observability
    session_id: str = Field(..., description="Session UUID")
    episode_id: int = Field(..., description="Episode id in session")
    step_id: int = Field(..., description="Step number in episode")

    intent: ActionPayload
    execution_result: ActionExecutionResult
    reflex_verdict: ReflexVerdictModel
    error: StepErrorPayload


# Resolve forward references used by ObservationPayload.last_action
ObservationPayload.model_rebuild()
