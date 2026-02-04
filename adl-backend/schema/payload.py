from enum import Enum
from typing import List, Optional, Any
# 👇 新增：必须导入 Pydantic 组件
from pydantic import BaseModel, Field, ConfigDict 

# ❌ 删除：from schema.enums import ... (因为都在下面定义了)

# ==========================================
# 1. 枚举定义 (Enum Definitions)
# ==========================================

class AgentActionType(str, Enum):
    MOVE_TO = "MOVE_TO"
    INTERACT = "INTERACT"
    THINK = "THINK"
    SPEAK = "SPEAK"
    IDLE = "IDLE"
    FINISH = "FINISH"

class ItemName(str, Enum):
    RED_CUBE = "red_cube"
    HALF_CUBE_LEFT = "half_cube_left"
    HALF_CUBE_RIGHT = "half_cube_right"
    FRIDGE_MAIN = "fridge_main"
    FRIDGE_DOOR = "fridge_door"
    STOVE = "stove"
    # ✅ 新增：让桌子成为合法的交互对象
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

# ==========================================
# 2. 数据模型 (Strict Schemas)
# ==========================================

class AgentSelfState(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    location: PoiName = Field(..., description="Agent当前所在的兴趣点")
    holding: Optional[ItemName] = Field(None, description="Agent手里拿的东西")

class VisibleObject(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: ItemName = Field(..., description="物体的唯一ID")
    state: ObjectState = Field(..., description="物体的物理状态")
    relation: Optional[str] = None

# ✅ [M8] 新增：失败类型分类学
class FailureType(str, Enum):
    # 1. 认知层面的失败 (脑子乱了)
    SCHEMA_ERROR = "SCHEMA_ERROR"       # 输出的 JSON 格式不对，或者字段校验失败 (System Confused)
    REASONING_ERROR = "REASONING_ERROR" # 输出了合法的 JSON，但逻辑不通 (如 target=null 但 type=INTERACT)
    
    # 2. 物理层面的失败 (被物理引擎拒绝)
    REFLEX_BLOCK = "REFLEX_BLOCK"       # 被 adl_rules 驳回 (门没开，手不够长)
    
    # 3. 任务层面的失败
    GOAL_AMBIGUOUS = "GOAL_AMBIGUOUS"   # 根本不知道要干嘛

# ✅ [M8] 新增：行动结果的元数据
# 我们需要把它存进记忆里，而不仅仅是 ActionPayload
class ActionExecutionResult(BaseModel):
    success: bool
    failure_type: Optional[FailureType] = None
    failure_reason: str = "" # 可读的错误信息 (给 LLM 看的)

class ObservationPayload(BaseModel):
    timestamp: float
    agent: AgentSelfState
    nearby_objects: List[VisibleObject]
    global_task: str

class ActionPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    type: AgentActionType = Field(..., description="动作类型")
    target_poi: Optional[PoiName] = Field(None, description="移动目标点")
    target_item: Optional[ItemName] = Field(None, description="交互目标物")
    content: str = Field(..., description="思考内容或补充信息")

# ==========================================
# 3. 系统响应常量 (System Responses)
# ==========================================
class SystemResponses:
    # 必须在 ActionPayload 定义之后初始化
    pass

SystemResponses.CONFUSED = ActionPayload(
    type=AgentActionType.THINK, # 最好显式使用 Enum
    content="System Confused"
)
SystemResponses.SILENCE = ActionPayload(
    type=AgentActionType.IDLE, 
    content="..."
)

# 确保导入 ReflexVerdict (如果它定义在别的地方，可能需要调整导入结构，
# 或者简单点，我们在这里定义一个简化的 verdict 模型，或者直接引用 adl_rules 的定义会循环引用)
# 为了解耦，我们在 payload.py 定义一个数据传输用的 Verdict 模型

class ReflexVerdict(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    IGNORE = "IGNORE"
    # 未来可能还有 WARN, MANUAL_REVIEW 等

# ... (AgentSelfState 等模型) ...

# 👇 修改这个模型
class ReflexVerdictModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    # ❌ 旧代码: verdict: str
    # ✅ 新代码: 使用枚举，彻底消灭魔法字符串
    verdict: ReflexVerdict = Field(..., description="规则引擎的判决结果")
    message: str = Field(..., description="判决理由")

class AgentStepResponse(BaseModel):
    intent: ActionPayload
    reflex_verdict: ReflexVerdictModel
