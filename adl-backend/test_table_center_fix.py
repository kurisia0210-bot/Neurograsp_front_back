#!/usr/bin/env python3
"""
测试table_center Schema错误修复
"""

import sys
import asyncio
import json
sys.path.insert(0, '.')

from schema.payload import (
    ObservationPayload, AgentSelfState, VisibleObject,
    PoiName, ItemName, ObjectState
)
from core.agent import step
from core.memory import episodic_memory

# 模拟LLM返回table_center作为target_item
async def mock_get_completion_table_center(messages):
    """模拟LLM返回table_center作为target_item（这是错误的）"""
    print("🤖 [Mock LLM] 返回table_center作为target_item...")
    invalid_json = {
        "type": "INTERACT",
        "target_poi": None,
        "target_item": "table_center",  # 错误：table_center是PoiName，不是ItemName
        "content": "Trying to interact with table_center"
    }
    return json.dumps(invalid_json)

# 模拟LLM返回正确的table_surface
async def mock_get_completion_table_surface(messages):
    """模拟LLM返回正确的table_surface作为target_item"""
    print("🤖 [Mock LLM] 返回正确的table_surface...")
    valid_json = {
        "type": "INTERACT",
        "target_poi": None,
        "target_item": "table_surface",  # 正确：table_surface是ItemName
        "content": "Interacting with table surface"
    }
    return json.dumps(valid_json)

async def test_table_center_fix():
    print("🧪 测试table_center Schema错误修复")
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
                id=ItemName.TABLE_SURFACE,
                state=ObjectState.INSTALLED,
                relation="support surface"
            )
        ],
        global_task="Test interacting with table"
    )
    
    print("✅ 观察数据创建成功")
    
    # 3. 临时替换LLM客户端
    print("\n🔄 替换LLM客户端为模拟版本...")
    from service import llm_client
    original_get_completion = llm_client.get_completion
    
    # 第一次测试：错误的table_center
    print("\n🔍 测试1：LLM返回错误的table_center...")
    llm_client.get_completion = mock_get_completion_table_center
    
    try:
        response1 = await step(obs)
        print(f"✅ step函数调用完成")
        print(f"   返回动作类型: {response1.intent.type}")
        print(f"   返回内容: {response1.intent.content}")
        print(f"   判决结果: {response1.reflex_verdict.verdict}")
        
        # 检查记忆
        history = episodic_memory.get_history()
        print(f"   记忆历史数量: {len(history)}")
        
        if len(history) > 0:
            last = history[-1]
            print(f"   最后记忆: {last.action.type} -> {last.execution_result.success}")
            if not last.execution_result.success:
                print(f"   失败类型: {last.execution_result.failure_type}")
                print(f"   失败原因: {last.execution_result.failure_reason}")
        
        # 检查get_last_failure
        last_fail = episodic_memory.get_last_failure()
        if last_fail:
            print(f"   ✅ 成功检索到失败Episode")
            print(f"      失败类型: {last_fail.execution_result.failure_type}")
            print(f"      失败原因: {last_fail.execution_result.failure_reason}")
        else:
            print("   ❌ 未找到失败Episode")
            
    except Exception as e:
        print(f"❌ 测试1失败: {e}")
        import traceback
        traceback.print_exc()
    
    # 第二次测试：正确的table_surface
    print("\n🔍 测试2：LLM返回正确的table_surface...")
    llm_client.get_completion = mock_get_completion_table_surface
    
    try:
        response2 = await step(obs)
        print(f"✅ step函数调用完成")
        print(f"   返回动作类型: {response2.intent.type}")
        print(f"   目标物品: {response2.intent.target_item}")
        print(f"   返回内容: {response2.intent.content}")
        print(f"   判决结果: {response2.reflex_verdict.verdict}")
        
        # 检查记忆
        history = episodic_memory.get_history()
        print(f"   记忆历史数量: {len(history)}")
        
        if len(history) > 0:
            last = history[-1]
            print(f"   最后记忆: {last.action.type}({last.action.target_item}) -> {last.execution_result.success}")
        
    except Exception as e:
        print(f"❌ 测试2失败: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # 恢复原始LLM客户端
        print("\n🔄 恢复原始LLM客户端...")
        llm_client.get_completion = original_get_completion
        print("✅ LLM客户端已恢复")
    
    print("\n🎉 table_center Schema错误修复测试完成！")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_table_center_fix())
    sys.exit(0 if success else 1)