 # [Cerebellum] 硬编码反射
# 职责：快速、确定性的 ADL 规则（安全检查）。
# 理由：并非所有操作都需要昂贵的 LLM 调用。

from enum import Enum
from typing import Optional, Tuple
from schema.payload import (
    ActionPayload, ObservationPayload, AgentActionType, 
    ItemName, ObjectState, PoiName,ReflexVerdict
)

# class ReflexVerdict(str, Enum):
#     ALLOW = "ALLOW"     # ✅ 通过：交给 React 执行
#     BLOCK = "BLOCK"     # 🛑 驳回：违反物理/安全规则 (Feedback to Brain)
#     IGNORE = "IGNORE"   # 😴 忽略：无意义操作 (如移动到当前位置)

class ReflexResponse:
    def __init__(self, verdict: ReflexVerdict, message: str = ""):
        self.verdict = verdict
        self.message = message

def evaluate_reflex(action: ActionPayload, obs: ObservationPayload) -> ReflexResponse:
    """
    [纯函数] 脊髓反射检查器
    输入: 想要做什么 (Action) + 世界现状 (Observation)
    输出: 允许吗 (Verdict)
    
    不涉及任何 LLM，不涉及任何概率。唯物理法则至上。
    """
    
    # ========================================================
    # 1. 移动反射 (Locomotion Reflexes)
    # ========================================================
    if action.type == AgentActionType.MOVE_TO:
        # [IGNORE] 已经在目的地了
        if action.target_poi == obs.agent.location:
            return ReflexResponse(ReflexVerdict.IGNORE, "Already at destination.")
            
        # [BLOCK] 试图去不存在的地方 (理论上 Pydantic 已拦截，但作为双重保险)
        if not action.target_poi:
            return ReflexResponse(ReflexVerdict.BLOCK, "Destination unknown.")

        return ReflexResponse(ReflexVerdict.ALLOW)

    # ========================================================
    # 2. 交互反射 (Interaction Reflexes)
    # ========================================================
    if action.type == AgentActionType.INTERACT:
        target_id = action.target_item
        agent_holding = obs.agent.holding
        
        # --- 2.1 空间距离法则 (The "Long Arm" Rule) ---
        # 必须能够看到/接触到物体才能交互
        # 这里的 nearby_objects 就是"触达范围"
        nearby_ids = [obj.id for obj in obs.nearby_objects]
        
        # 特例：如果是要把手里的东西放进容器(比如冰箱)，我们交互的对象是容器
        if target_id not in nearby_ids:
             return ReflexResponse(ReflexVerdict.BLOCK, f"Target {target_id} is out of reach.")

        # 获取目标物体的当前状态
        target_obj = next((o for o in obs.nearby_objects if o.id == target_id), None)
        if not target_obj:
            return ReflexResponse(ReflexVerdict.BLOCK, "Object vanished?")

        # --- 2.2 解剖学法则 (The "Two Hands" Rule) ---
        
        # CASE A: 试图拾取 (Interact with Item)
        # 识别特征：目标是物体(Cube/Apple) + 手是空的
        if target_id in [ItemName.RED_CUBE, ItemName.HALF_CUBE_LEFT, ItemName.HALF_CUBE_RIGHT]:
            if agent_holding is not None:
                return ReflexResponse(ReflexVerdict.BLOCK, "Hands are full. Cannot pick up.")
            if target_obj.state != ObjectState.ON_TABLE: # 只能在桌上捡，不能捡已经在冰箱里的（简化逻辑）
                 # 除非我们允许从冰箱拿出来，这里暂时从严
                 pass 
            return ReflexResponse(ReflexVerdict.ALLOW)

        # CASE B: 试图放置 (Interact with Container/Surface)
        # 识别特征：目标是容器(Fridge_Main/Stove) + 手里有东西
        if target_id in [ItemName.FRIDGE_MAIN, ItemName.STOVE]:
            if agent_holding is None:
                return ReflexResponse(ReflexVerdict.BLOCK, "Hands are empty. Nothing to place.")
            
            # 物理约束：如果不打开门，没法放进去
            # 我们需要检查 Fridge Door 的状态
            # 注意：Observation 必须包含门的状态
            fridge_door = next((o for o in obs.nearby_objects if o.id == ItemName.FRIDGE_DOOR), None)
            if target_id == ItemName.FRIDGE_MAIN:
                if fridge_door and fridge_door.state == ObjectState.CLOSED:
                    return ReflexResponse(ReflexVerdict.BLOCK, "Fridge door is closed.")
            
            return ReflexResponse(ReflexVerdict.ALLOW)

        # CASE C: 试图操作开关 (Interact with Mechanism)
        # 识别特征：目标是门/把手
        if target_id == ItemName.FRIDGE_DOOR:
            # 门总是可以开/关，除非...有什么东西挡住了？暂无
            # [IGNORE] 如果试图打开已经开的门
            # 前端逻辑通常是 Toggle，但如果是 LLM 显式发指令，我们需要检查状态
            # 这里简化为 ALLOW，交给前端 Toggle
            return ReflexResponse(ReflexVerdict.ALLOW)

    # ========================================================
    # 3. 默认安全网
    # ========================================================
    # 如果是 THINK 或 SPEAK，永远允许
    if action.type in [AgentActionType.THINK, AgentActionType.SPEAK, AgentActionType.FINISH, AgentActionType.IDLE]:
        return ReflexResponse(ReflexVerdict.ALLOW)

    return ReflexResponse(ReflexVerdict.BLOCK, "Unknown interaction pattern.")