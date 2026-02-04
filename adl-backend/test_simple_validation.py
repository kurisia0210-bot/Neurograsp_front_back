#!/usr/bin/env python3
"""
简单测试ValidationError处理
"""

import sys
import asyncio
sys.path.insert(0, '.')

from schema.payload import (
    ObservationPayload, AgentSelfState, VisibleObject,
    PoiName, ItemName, ObjectState, ActionPayload, AgentActionType,
    ActionExecutionResult, FailureType
)
from core.agent import step
from core.memory import episodic_memory

async def test_simple():
    print("🧪 简单测试ValidationError处理")
    print("=" * 50)
    
    # 1. 清空记忆
    episodic_memory.clear()
    print("✅ 记忆已清空")
    
    # 2. 创建观察数据
    print("\n📝 创建观察数据...")
    obs = ObservationPayload(
        timestamp=1234567890.0,
        agent=AgentSelfState(
            location=PoiName.TABLE_CENTER,
            holding=None
        ),
        nearby_objects=[
            VisibleObject(
                id=ItemName.RED_CUBE,
                state=ObjectState.ON_TABLE,
                relation="on the table"
            )
        ],
        global_task="Test task"
    )
    
    print("✅ 观察数据创建成功")
    
    # 3. 测试：直接创建一个无效的ActionPayload
    print("\n🔍 测试直接创建无效ActionPayload...")
    try:
        # 尝试创建一个包含无效枚举值的ActionPayload
        invalid_intent = ActionPayload(
            type=AgentActionType.INTERACT,
            target_item="INVALID_ITEM",  # 这个值不在ItemName枚举中
            content="Testing invalid item"
        )
        print("❌ 意外成功：不应该能创建无效的ActionPayload")
    except Exception as e:
        print(f"✅ 预期失败：{type(e).__name__}: {e}")
    
    # 4. 测试记忆系统
    print("\n🔍 测试记忆系统...")
    try:
        # 创建一个有效的intent
        valid_intent = ActionPayload(
            type=AgentActionType.THINK,
            content="Test thought"
        )
        
        # 创建一个失败结果
        failure_result = ActionExecutionResult(
            success=False,
            failure_type=FailureType.SCHEMA_ERROR,
            failure_reason="Test failure reason"
        )
        
        # 测试stage_action
        episodic_memory.stage_action(valid_intent, failure_result)
        print("✅ stage_action调用成功")
        
        # 提交记忆
        episodic_memory.commit(obs)
        print("✅ 记忆提交成功")
        
        # 检查记忆
        history = episodic_memory.get_history()
        print(f"✅ 记忆历史数量: {len(history)}")
        
        if len(history) > 0:
            last = history[-1]
            print(f"   最后记忆: {last.action.type} -> {last.execution_result.success}")
            print(f"   失败原因: {last.execution_result.failure_reason}")
        
    except Exception as e:
        print(f"❌ 记忆系统测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n🎉 简单测试完成！")

if __name__ == "__main__":
    asyncio.run(test_simple())