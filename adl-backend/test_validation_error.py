#!/usr/bin/env python3
"""
测试ValidationError修复效果
模拟LLM返回无效JSON导致ValidationError的场景
"""

import sys
import asyncio
import json
sys.path.insert(0, '.')

from schema.payload import (
    ObservationPayload, AgentSelfState, VisibleObject,
    PoiName, ItemName, ObjectState, ActionPayload, AgentActionType
)
from core.agent import step
from core.memory import episodic_memory

# 模拟一个返回无效JSON的LLM客户端
original_get_completion = None

async def mock_get_completion_invalid_json(messages):
    """模拟LLM返回无效的JSON（包含不存在的枚举值）"""
    print("🤖 [Mock LLM] 返回无效JSON...")
    # 返回一个包含无效枚举值的JSON
    invalid_json = {
        "type": "INTERACT",
        "target_poi": None,
        "target_item": "INVALID_ITEM",  # 这个值不在ItemName枚举中
        "content": "Trying to interact with invalid item"
    }
    return json.dumps(invalid_json)

async def test_validation_error_fix():
    print("🧪 测试ValidationError修复效果")
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
            ),
            VisibleObject(
                id=ItemName.FRIDGE_DOOR,
                state=ObjectState.OPEN,
                relation="front of agent"
            )
        ],
        global_task="Put red cube in fridge"
    )
    
    print("✅ 观察数据创建成功")
    
    # 3. 临时替换LLM客户端为模拟版本
    print("\n🔄 替换LLM客户端为模拟版本...")
    from service import llm_client
    global original_get_completion
    original_get_completion = llm_client.get_completion
    llm_client.get_completion = mock_get_completion_invalid_json
    print("✅ LLM客户端已替换")
    
    try:
        # 4. 调用step函数（应该会触发ValidationError）
        print("\n🤖 调用step函数（预期触发ValidationError）...")
        response = await step(obs)
        
        print("✅ step函数调用完成")
        print(f"   返回动作类型: {response.intent.type}")
        print(f"   返回内容: {response.intent.content}")
        print(f"   判决结果: {response.reflex_verdict.verdict}")
        print(f"   错误信息: {response.reflex_verdict.message}")
        
        # 5. 检查记忆系统
        print("\n🔍 检查记忆系统...")
        history = episodic_memory.get_history()
        print(f"   记忆历史数量: {len(history)}")
        
        if len(history) > 0:
            last_episode = history[-1]
            print(f"   ✅ 最后一条记忆已记录")
            print(f"      动作: {last_episode.action.type}")
            print(f"      内容: {last_episode.action.content}")
            print(f"      执行结果: {'成功' if last_episode.execution_result.success else '失败'}")
            print(f"      失败类型: {last_episode.execution_result.failure_type}")
            print(f"      失败原因: {last_episode.execution_result.failure_reason}")
        else:
            print("   ❌ 记忆系统未记录失败")
            
        # 6. 测试get_last_failure
        print("\n🔍 测试get_last_failure()...")
        last_fail = episodic_memory.get_last_failure()
        if last_fail:
            print(f"   ✅ 成功检索到失败Episode")
            print(f"      失败类型: {last_fail.execution_result.failure_type}")
            print(f"      失败原因: {last_fail.execution_result.failure_reason}")
        else:
            print("   ❌ 未找到失败Episode")
            
        # 7. 测试第二次调用（验证错误反馈是否有效）
        print("\n🔄 第二次调用step函数（验证错误反馈）...")
        response2 = await step(obs)
        print(f"   第二次返回动作: {response2.intent.type}")
        print(f"   第二次返回内容: {response2.intent.content}")
        
    except Exception as e:
        print(f"❌ 测试过程中出现异常: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # 8. 恢复原始LLM客户端
        print("\n🔄 恢复原始LLM客户端...")
        llm_client.get_completion = original_get_completion
        print("✅ LLM客户端已恢复")
    
    print("\n🎉 ValidationError修复测试完成！")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_validation_error_fix())
    sys.exit(0 if success else 1)