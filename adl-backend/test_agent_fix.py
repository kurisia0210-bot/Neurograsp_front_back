#!/usr/bin/env python3
"""
测试agent.py修复结果
"""

import sys
import asyncio
sys.path.insert(0, '.')

from schema.payload import (
    ObservationPayload, AgentSelfState, VisibleObject,
    PoiName, ItemName, ObjectState
)
from core.agent import step

async def test_agent_fix():
    print("🧪 测试agent.py修复结果")
    print("=" * 50)
    
    # 1. 创建正常的观察数据
    print("\n📝 创建正常观察数据...")
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
            ),
            VisibleObject(
                id=ItemName.FRIDGE_MAIN,
                state=ObjectState.INSTALLED,
                relation="kitchen appliance"
            ),
            VisibleObject(
                id=ItemName.TABLE_SURFACE,
                state=ObjectState.INSTALLED,
                relation="support surface"
            )
        ],
        global_task="Put red cube in fridge"
    )
    
    print("✅ 观察数据创建成功")
    print(f"   Agent位置: {obs.agent.location}")
    print(f"   附近物体: {len(obs.nearby_objects)}个")
    print(f"   任务: {obs.global_task}")
    
    # 2. 测试step函数
    print("\n🤖 测试step函数...")
    try:
        response = await step(obs)
        print("✅ step函数调用成功")
        print(f"   返回动作: {response.intent.type}")
        print(f"   目标物品: {response.intent.target_item}")
        print(f"   判决结果: {response.reflex_verdict.verdict}")
        print(f"   判决消息: {response.reflex_verdict.message}")
    except Exception as e:
        print(f"❌ step函数调用失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 3. 测试导入是否完整
    print("\n🔍 测试导入完整性...")
    try:
        from pydantic import ValidationError
        print("✅ ValidationError导入成功")
        
        from schema.payload import (
            AgentActionType, ActionPayload, ActionExecutionResult, FailureType
        )
        print("✅ 所有payload类导入成功")
        
        from core.memory import episodic_memory
        print("✅ episodic_memory导入成功")
        
        print("\n✅ 所有导入检查通过！")
        
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        return False
    
    print("\n🎉 agent.py修复测试完成！")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_agent_fix())
    sys.exit(0 if success else 1)