#!/usr/bin/env python3
"""
测试失败记忆检索功能
"""

import sys
import asyncio
sys.path.insert(0, '.')

from schema.payload import (
    ObservationPayload, ActionPayload, AgentSelfState, VisibleObject,
    PoiName, ItemName, ObjectState, ActionExecutionResult, FailureType
)
from core.memory import episodic_memory
from core.reasoning import analyze_and_propose

async def test_failure_memory():
    print("🧪 测试失败记忆检索功能")
    print("=" * 50)
    
    # 1. 清空记忆
    episodic_memory.clear()
    print("✅ 记忆已清空")
    
    # 2. 创建一个失败的Episode
    print("\n📝 创建失败的Episode...")
    
    # 创建观察数据
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
            ),
            VisibleObject(
                id=ItemName.FRIDGE_DOOR,
                state=ObjectState.CLOSED,
                relation="front of agent"
            )
        ],
        global_task="Put red cube in fridge"
    )
    
    # 创建一个失败的动作
    failed_action = ActionPayload(
        type="INTERACT",
        target_item=ItemName.FRIDGE_MAIN,
        content="Trying to put cube in closed fridge"
    )
    
    # 创建失败结果
    failure_result = ActionExecutionResult(
        success=False,
        failure_type=FailureType.REFLEX_BLOCK,
        failure_reason="Cannot put cube in fridge when door is closed"
    )
    
    # 模拟记忆提交过程
    episodic_memory._pending_pre_obs = obs
    episodic_memory._pending_action = failed_action
    episodic_memory._pending_result = failure_result
    
    # 提交记忆
    episodic_memory.commit(obs)
    
    print(f"✅ 失败的Episode已创建: {failed_action.type}({failed_action.target_item})")
    print(f"   失败原因: {failure_result.failure_reason}")
    
    # 3. 测试get_last_failure
    print("\n🔍 测试get_last_failure()...")
    last_fail = episodic_memory.get_last_failure()
    if last_fail:
        print(f"✅ 成功检索到失败Episode")
        print(f"   动作: {last_fail.action.type}({last_fail.action.target_item})")
        print(f"   失败类型: {last_fail.execution_result.failure_type}")
        print(f"   失败原因: {last_fail.execution_result.failure_reason}")
    else:
        print("❌ 未找到失败Episode")
    
    # 4. 测试reasoning模块是否能正确使用失败记忆
    print("\n🤖 测试reasoning模块...")
    
    # 创建新的观察（冰箱门已打开）
    new_obs = ObservationPayload(
        timestamp=1234567891.0,
        agent=AgentSelfState(
            location=PoiName.TABLE_CENTER,
            holding=None
        ),
        nearby_objects=[
            VisibleObject(
                id=ItemName.RED_CUBE,
                state=ObjectState.ON_TABLE,
                relation="on the table"
            ),
            VisibleObject(
                id=ItemName.FRIDGE_DOOR,
                state=ObjectState.OPEN,
                relation="front of agent"
            ),
            VisibleObject(
                id=ItemName.FRIDGE_MAIN,
                state=ObjectState.INSTALLED,
                relation="kitchen appliance"
            )
        ],
        global_task="Put red cube in fridge"
    )
    
    print("📤 调用analyze_and_propose()...")
    try:
        # 注意：这里需要实际的LLM服务，所以可能会失败
        # 但我们主要测试的是失败记忆的注入
        result = await analyze_and_propose(new_obs)
        print(f"✅ reasoning模块调用成功")
        print(f"   返回动作: {result.type}")
        print(f"   内容: {result.content}")
    except Exception as e:
        print(f"⚠️ reasoning模块调用异常（可能是LLM服务未启动）: {e}")
        print("   但失败记忆注入逻辑应该已经执行")
    
    # 5. 检查记忆历史
    print("\n📊 记忆历史统计:")
    history = episodic_memory.get_history()
    print(f"   总Episode数: {len(history)}")
    for i, ep in enumerate(history):
        print(f"   Ep#{i}: {ep.action.type}({ep.action.target_item}) -> {'成功' if ep.execution_result.success else '失败'}")
    
    print("\n🎉 测试完成！")

if __name__ == "__main__":
    asyncio.run(test_failure_memory())