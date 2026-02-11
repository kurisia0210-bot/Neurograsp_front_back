# adl-backend/schema/payload.py
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict 

# ==========================================
# 1. 枚举定义 (Enum Definitions)
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
    # 🎮 [Task 1 NEW] 游戏控制权
    ADJUST_DIFFICULTY = "ADJUST_DIFFICULTY" # 调整目标长度
    AUTO_PASS = "AUTO_PASS"                 # 自动通关 (预留给 Task 2)

class ItemName(str, Enum):
    RED_CUBE = "red_cube"
    HALF_CUBE_LEFT = "half_cube_left"
    HALF_CUBE_RIGHT = "half_cube_right"
    FRIDGE_MAIN = "fridge_main"
    FRIDGE_DOOR = "fridge_door"
    STOVE = "stove"
    # ✅ 让桌子成为合法的交互对象
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
    """INTERACT 动作的具体意图"""
    PICK = "PICK"     # 拾取物品
    PLACE = "PLACE"   # 放置物品
    SLICE = "SLICE"   # 切割
    COOK = "COOK"     # 烹饪
    OPEN = "OPEN"     # 打开（门/盖子）
    CLOSE = "CLOSE"   # 关闭
    TOGGLE = "TOGGLE" # 开关（灯/炉子）
    NONE = "NONE"     # 普通交互/默认（向后兼容）

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

# ✅ [M8] 失败类型分类学 (Agent 自身的失败 - L1/L2)
class FailureType(str, Enum):
    # 1. 认知层面的失败 (脑子乱了 - L2)
    SCHEMA_ERROR = "SCHEMA_ERROR"       # JSON 格式错误
    REASONING_ERROR = "REASONING_ERROR" # 逻辑自相矛盾
    GOAL_AMBIGUOUS = "GOAL_AMBIGUOUS"   # 目标模糊
    
    # 2. 物理层面的失败 (被规则阻挡 - L1)
    REFLEX_BLOCK = "REFLEX_BLOCK"       # 违反物理规则 (手短、门没开)

# ✅ [M8] 行动结果元数据
class ActionExecutionResult(BaseModel):
    success: bool
    failure_type: Optional[FailureType] = None
    failure_reason: str = "" # 可读错误信息

class ObservationPayload(BaseModel):
    timestamp: float
    agent: AgentSelfState
    nearby_objects: List[VisibleObject]
    global_task: str

class ActionPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    type: AgentActionType = Field(..., description="动作类型")
    
    # --- 现有字段 ---
    target_poi: Optional[PoiName] = Field(None, description="移动目标点")
    target_item: Optional[ItemName] = Field(None, description="交互目标物")
    
    # --- ✅ 新增：动作细节参数 ---
    interaction_type: InteractionType = Field(
        default=InteractionType.NONE, 
        description="Specific intent for INTERACT action (e.g., SLICE, OPEN, TOGGLE)"
    )
    
    # --- 🎮 [Task 1 NEW] 游戏控制字段 ---
    target_length: Optional[int] = Field(
        None, 
        ge=3, 
        le=11, 
        description="目标电话号码长度 (仅用于 ADJUST_DIFFICULTY)"
    )

    # --- 基础字段 ---
    content: str = Field(..., description="思考内容、解释原因或气泡文字")

# ==========================================
# 3. 系统响应常量 & 判决模型
# ==========================================

class SystemResponses:
    pass

# 先定义类，再赋值常量，避免 Pydantic 初始化问题
SystemResponses.CONFUSED = ActionPayload(
    type=AgentActionType.THINK,
    content="System Confused"
)
SystemResponses.SILENCE = ActionPayload(
    type=AgentActionType.IDLE, 
    content="..."
)

class ReflexVerdict(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    IGNORE = "IGNORE"

class ReflexVerdictModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)
    verdict: ReflexVerdict = Field(..., description="规则引擎的判决结果")
    message: str = Field(..., description="判决理由")

class AgentStepResponse(BaseModel):
    intent: ActionPayload
    reflex_verdict: ReflexVerdictModel