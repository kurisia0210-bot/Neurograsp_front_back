from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AgentActionType(str, Enum):
    MOVE_TO = "MOVE_TO"
    INTERACT = "INTERACT"
    THINK = "THINK"
    SPEAK = "SPEAK"
    IDLE = "IDLE"
    FINISH = "FINISH"


class ItemName(str, Enum):
    APPLE_1 = "apple_1"
    RED_CUBE = "red_cube"
    MEAT_RAW = "meat_raw"
    MEAT_HEATED = "meat_heated"
    HALF_CUBE_LEFT = "half_cube_left"
    HALF_CUBE_RIGHT = "half_cube_right"
    FRIDGE_MAIN = "fridge_main"
    FRIDGE_DOOR = "fridge_door"
    OVEN = "oven"
    OVEN_DOOR = "oven_door"
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


class ActionExecutionResult(BaseModel):
    success: bool
    failure_type: Optional[FailureType] = None
    failure_reason: str = ""


class WorldEffect(BaseModel):
    key: str = Field(..., description="Effect key, e.g. agent.location / interact.pick")
    before: Optional[str] = Field(default=None, description="Before value")
    after: Optional[str] = Field(default=None, description="After value")
    ok: Optional[bool] = Field(default=None, description="Whether this effect succeeded")
    detail: str = Field(default="", description="Optional effect detail")


class GoalSpecPayload(BaseModel):
    goal_type: Optional[str] = Field(default=None, description="Goal type, e.g. MOVE_TO/PUT_IN")
    goal_id: Optional[str] = Field(default=None, description="Stable goal identifier")
    dsl: Optional[str] = Field(default=None, description="Goal DSL expression")
    params: Dict[str, str] = Field(default_factory=dict, description="Goal parameters")


class ObservationPayload(BaseModel):
    session_id: str = Field(..., description="Session UUID")
    episode_id: Optional[int] = Field(
        default=None,
        description="Episode id within this session. Optional in request; backend assigns when missing",
    )
    step_id: int = Field(..., description="Step number in this episode")

    timestamp: float
    agent: AgentSelfState
    nearby_objects: List[VisibleObject]
    global_task: str
    goal_spec: Optional[GoalSpecPayload] = Field(
        default=None,
        description="Optional structured goal hint to avoid per-tick NL parsing",
    )

    last_action: Optional["ActionPayload"] = Field(
        default=None,
        description="Last executed/adjudicated action",
    )
    last_result: Optional[ActionExecutionResult] = Field(
        default=None,
        description="Last action execution result",
    )
    last_effects: List[WorldEffect] = Field(
        default_factory=list,
        description="Last action world effects for observability/replay",
    )


class ActionPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    session_id: str = Field(..., description="Session UUID")
    episode_id: Optional[int] = Field(default=None, description="Episode id in session")
    step_id: int = Field(..., description="Step number in episode")

    type: AgentActionType = Field(..., description="Action type")
    target_poi: Optional[PoiName] = Field(None, description="Move target POI")
    target_item: Optional[ItemName] = Field(None, description="Interaction target item")

    interaction_type: InteractionType = Field(
        default=InteractionType.NONE,
        description="Specific intent for INTERACT",
    )

    content: str = Field(..., description="Reasoning/explanation text")


class SystemResponses:
    pass


SystemResponses.CONFUSED = ActionPayload(
    session_id="SYSTEM",
    episode_id=0,
    step_id=0,
    type=AgentActionType.THINK,
    content="System Confused",
)
SystemResponses.SILENCE = ActionPayload(
    session_id="SYSTEM",
    episode_id=0,
    step_id=0,
    type=AgentActionType.IDLE,
    content="...",
)


class StepErrorPayload(BaseModel):
    error_code: str = Field(..., description="Unified error code")
    module: str = Field(..., description="Module that produced the error")
    severity: str = Field(..., description="Severity level")
    description: str = Field(..., description="Human-readable summary")
    detail: str = Field(default="", description="Detailed message")
    extra: Dict[str, Any] = Field(default_factory=dict, description="Extensible metadata")


class AgentStepResponse(BaseModel):
    session_id: str = Field(..., description="Session UUID")
    episode_id: int = Field(..., description="Episode id in session")
    step_id: int = Field(..., description="Step number in episode")

    intent: ActionPayload
    execution_result: ActionExecutionResult
    effects: List[WorldEffect] = Field(
        default_factory=list,
        description="Observed world effects from previous step closure data",
    )
    error: StepErrorPayload


ObservationPayload.model_rebuild()



