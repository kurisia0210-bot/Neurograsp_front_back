"""
Brain - Agent Decision Core

这是Agent的决策核心，替代了复杂的流水线架构，提供简化的推理引擎。

数据流:
    ObservationPayload (世界事实) → analyze() → ActionPayload

设计哲学:
- 直接函数调用，无流水线抽象
- 默认基于规则，LLM可选
- 所有决策逻辑在一个文件中（约200行）
- 遵循Constitution：显式状态、语义状态驱动

环境变量:
- BRAIN_MODE=rule (默认) | llm
- BRAIN_USE_GOAL_REGISTRY=true (默认) | false

架构演进:
1. 从复杂的流水线架构（adapters/proposers/guards）简化而来
2. 保留了规则引擎和LLM引擎两种决策模式
3. 支持目标注册表集成（TODO）

关键特性:
- ✅ 规则引擎：硬编码的if-else逻辑，快速可靠
- ✅ LLM引擎：自然语言推理，灵活但较慢
- ✅ 世界事实查询：统一的辅助函数
- ✅ 动作构建器：标准化的动作生成
- ⚠️ 目标注册表：待集成（legacy/core/goal/）

使用场景:
- 厨房环境中的Agent决策
- 支持"把红方块放进冰箱"等任务分解
- 可扩展为更复杂的任务推理
"""

from __future__ import annotations

import os
from typing import Optional

from schema.payload import (
    ActionPayload,
    AgentActionType,
    InteractionType,
    ObservationPayload,
)
from service.llm_client import get_completion


# ============================================================================
# Configuration
# ============================================================================

# 决策模式：rule（规则引擎）或 llm（LLM推理）
# 默认使用规则引擎，因为更快速可靠
BRAIN_MODE = os.getenv("BRAIN_MODE", "rule").strip().lower()

# 是否使用目标注册表（legacy/core/goal/）
# 如果启用，会尝试从目标注册表解析任务
USE_GOAL_REGISTRY = os.getenv("BRAIN_USE_GOAL_REGISTRY", "true").strip().lower() == "true"


# ============================================================================
# Main Entry Point
# ============================================================================

async def analyze(obs: ObservationPayload) -> ActionPayload:
    """
    Main decision function: World Facts → Action
    
    Args:
        obs: Observation payload containing World Facts
        
    Returns:
        ActionPayload: Next action to execute
    """
    # Goal Registry integration (if enabled)
    if USE_GOAL_REGISTRY:
        # TODO: Import and use GoalRegistry from legacy/core/goal/
        # goal = _parse_goal_from_registry(obs)
        # if _is_goal_done(obs, goal):
        #     return _finish(obs)
        pass
    
    # Decision routing
    if BRAIN_MODE == "llm":
        return await _llm_decide(obs)
    else:
        return _rule_decide(obs)


# ============================================================================
# Rule-Based Decision Engine
# ============================================================================

def _rule_decide(obs: ObservationPayload) -> ActionPayload:
    """
    基于规则的决策引擎，使用硬编码的if-else逻辑。
    
    设计思路:
    1. 从复杂流水线架构简化而来，保持核心逻辑
    2. 每个规则对应一个具体的任务模式
    3. 规则可以嵌套调用，支持任务分解
    
    来源:
    - legacy/core/pipeline/complex_actions.py (动作分解逻辑)
    - legacy/core/safety/guards.py (前置条件检查)
    
    当前支持的规则:
    1. PUT_IN(item, container) 分解 - 把物品放入容器
    2. OPEN_THEN_PUT_IN(door, item, container) 分解 - 开门后放入物品
    
    扩展方法:
    1. 添加新的if分支处理新任务
    2. 创建新的规则函数（如_rule_put_in_fridge）
    3. 在规则函数中实现任务分解步骤
    
    注意:
    - 规则匹配使用简单的字符串包含检查
    - 对于复杂任务，建议使用LLM模式
    - 保持规则简单、可维护
    """
    task = obs.global_task.lower()
    location = _get_location(obs)
    holding = _get_holding(obs)
    
    # ==================== 规则1: 把红方块放进冰箱 ====================
    # 匹配任务描述中包含"put"、"red_cube"和"fridge"的情况
    if "put" in task and "red_cube" in task and "fridge" in task:
        return _rule_put_in_fridge(obs, location, holding)
    
    # ==================== 规则2: 开门 ====================
    # 匹配任务描述中包含"open"和"door"的情况
    if "open" in task and "door" in task:
        return _interact(obs, InteractionType.OPEN, "fridge_door", "Open fridge door")
    
    # ==================== 默认: 思考 ====================
    # 没有匹配的规则时，返回THINK动作让Agent思考
    return _think(obs, f"No rule matched for task: {obs.global_task}")


def _rule_put_in_fridge(
    obs: ObservationPayload,
    location: str,
    holding: Optional[str]
) -> ActionPayload:
    """
    分解规则：PUT_IN(red_cube, fridge_main) - 把红方块放进冰箱
    
    任务分解步骤:
    1. 如果没有拿着红方块 → 捡起红方块 (PICK red_cube)
    2. 如果冰箱门关着 → 打开冰箱门 (OPEN fridge_door)
    3. 如果拿着红方块且门开着 → 放入冰箱 (PLACE in fridge_main)
    
    设计模式:
    - 这是典型的"任务分解"模式
    - 每个步骤检查前置条件
    - 返回当前应该执行的动作
    
    扩展思路:
    - 可以添加更多检查（如Agent位置、距离等）
    - 可以支持更多物品和容器组合
    - 可以添加错误处理（如物品不存在、门打不开等）
    
    注意:
    - 这是一个线性分解，实际任务可能有并行步骤
    - 假设冰箱门是唯一需要打开的门
    - 假设冰箱内部容器是"fridge_main"
    """
    # 步骤1: 检查是否拿着红方块
    if holding != "red_cube":
        # 需要先捡起红方块
        return _interact(obs, InteractionType.PICK, "red_cube", "Pick up red cube")
    
    # 步骤2: 检查冰箱门是否开着
    door_state = _get_object_state(obs, "fridge_door")
    if door_state == "closed":
        # 需要先打开冰箱门
        return _interact(obs, InteractionType.OPEN, "fridge_door", "Open fridge door")
    
    # 步骤3: 把方块放进冰箱
    return _interact(obs, InteractionType.PLACE, "fridge_main", "Place cube in fridge")


# ============================================================================
# LLM-Based Decision Engine
# ============================================================================

async def _llm_decide(obs: ObservationPayload) -> ActionPayload:
    """
    LLM-based decision using natural language reasoning.
    
    This is extracted from:
    - legacy/core/pipeline/proposer/prompt_builder.py (prompt construction)
    - legacy/core/pipeline/proposer/response_parser.py (output parsing)
    """
    prompt = _build_llm_prompt(obs)
    
    try:
        response = await get_completion(prompt)
        return _parse_llm_response(obs, response)
    except Exception as e:
        return _think(obs, f"LLM error: {str(e)}")


def _build_llm_prompt(obs: ObservationPayload) -> list[dict]:
    """
    Build LLM prompt from World Facts.
    
    TODO: Extract better prompt template from legacy/core/pipeline/proposer/prompt_builder.py
    """
    nearby = "; ".join([f"{obj.id}:{obj.state}" for obj in obs.nearby_objects])
    
    return [
        {
            "role": "system",
            "content": (
                "You are a kitchen AI agent. "
                "Respond with JSON: {type, interaction_type, target_item, content}. "
                "Types: MOVE_TO, INTERACT, THINK, FINISH. "
                "Interactions: PICK, PLACE, OPEN, CLOSE."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Task: {obs.global_task}\n"
                f"Location: {obs.agent.location}\n"
                f"Holding: {obs.agent.holding or 'nothing'}\n"
                f"Nearby: {nearby}\n"
                "What should I do next?"
            ),
        },
    ]


def _parse_llm_response(obs: ObservationPayload, response: str) -> ActionPayload:
    """
    Parse LLM JSON response into ActionPayload.
    
    TODO: Extract robust parsing from legacy/core/pipeline/proposer/response_parser.py
    """
    import json
    
    try:
        data = json.loads(response)
        action_type = str(data.get("type", "THINK")).upper()
        interaction_type = str(data.get("interaction_type", "NONE")).upper()
        target_item = data.get("target_item")
        content = str(data.get("content", "LLM action"))
        
        return ActionPayload(
            session_id=obs.session_id,
            episode_id=obs.episode_id,
            step_id=obs.step_id,
            type=action_type,
            interaction_type=interaction_type,
            target_item=target_item,
            content=content,
        )
    except Exception as e:
        return _think(obs, f"LLM parse error: {str(e)}")


# ============================================================================
# Goal Registry Integration (TODO)
# ============================================================================

def _parse_goal_from_registry(obs: ObservationPayload):
    """
    TODO: Integrate with legacy/core/goal/goal_registry.py
    
    Should:
    1. Parse obs.global_task into GoalSpec
    2. Use GoalRegistry.resolve_with_hint()
    3. Return structured goal
    """
    pass


def _is_goal_done(obs: ObservationPayload, goal) -> bool:
    """
    TODO: Check if goal is completed using GoalRegistry
    
    Should call goal_handler.is_done(obs, goal)
    """
    return False


# ============================================================================
# Helper Functions - World Facts Queries
# ============================================================================

def _get_location(obs: ObservationPayload) -> str:
    """Get agent's current location"""
    loc = obs.agent.location
    return loc.value if hasattr(loc, "value") else str(loc)


def _get_holding(obs: ObservationPayload) -> Optional[str]:
    """Get item agent is currently holding"""
    holding = obs.agent.holding
    if holding is None:
        return None
    return holding.value if hasattr(holding, "value") else str(holding)


def _get_object_state(obs: ObservationPayload, object_id: str) -> Optional[str]:
    """
    Get state of a specific object from nearby_objects.
    
    Args:
        obs: Observation payload
        object_id: Object ID to search for (e.g., "fridge_door")
        
    Returns:
        Object state string (e.g., "open", "closed") or None if not found
    """
    for obj in obs.nearby_objects:
        oid = obj.id.value if hasattr(obj.id, "value") else str(obj.id)
        if oid == object_id:
            state = obj.state
            return state.value if hasattr(state, "value") else str(state)
    return None


def _find_object(obs: ObservationPayload, object_id: str):
    """Find object in nearby_objects by ID"""
    for obj in obs.nearby_objects:
        oid = obj.id.value if hasattr(obj.id, "value") else str(obj.id)
        if oid == object_id:
            return obj
    return None


# ============================================================================
# Helper Functions - Action Builders
# ============================================================================

def _interact(
    obs: ObservationPayload,
    interaction_type: InteractionType,
    target_item: str,
    content: str,
) -> ActionPayload:
    """Build an INTERACT action"""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.INTERACT,
        interaction_type=interaction_type,
        target_item=target_item,
        content=content,
    )


def _move_to(
    obs: ObservationPayload,
    target_poi: str,
    content: str,
) -> ActionPayload:
    """Build a MOVE_TO action"""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.MOVE_TO,
        target_poi=target_poi,
        content=content,
    )


def _think(obs: ObservationPayload, content: str) -> ActionPayload:
    """Build a THINK action (internal reasoning)"""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.THINK,
        content=content,
    )


def _finish(obs: ObservationPayload) -> ActionPayload:
    """Build a FINISH action (goal completed)"""
    return ActionPayload(
        session_id=obs.session_id,
        episode_id=obs.episode_id,
        step_id=obs.step_id,
        type=AgentActionType.FINISH,
        content="Goal completed",
    )


# ============================================================================
# Public API
# ============================================================================

__all__ = ["analyze"]
