"""
测试 P0-1: session_id + step_id 追踪
验证前后端能否正确对齐"第几步做了什么"
"""

import asyncio
from schema.payload import ObservationPayload, AgentSelfState, VisibleObject
from core.reasoning import analyze_and_propose

async def test_session_tracking():
    print("🧪 Testing Session Tracking (P0-1)")
    print("=" * 50)
    
    # 模拟一个会话的3个步骤
    session_id = "test-session-123"
    
    for step in range(1, 4):
        print(f"\n📍 Step {step}")
        print("-" * 30)
        
        # 构造观察
        obs = ObservationPayload(
            session_id=session_id,
            step_id=step,
            timestamp=1234567890.0 + step,
            agent=AgentSelfState(
                location="table_center",
                holding=None
            ),
            nearby_objects=[
                VisibleObject(id="red_cube", state="on_table")
            ],
            global_task="Put red cube in fridge"
        )
        
        # 调用推理引擎
        action = await analyze_and_propose(obs)
        
        # 验证 session_id 和 step_id 是否正确回传
        print(f"✅ Request:  session_id={obs.session_id}, step_id={obs.step_id}")
        print(f"✅ Response: session_id={action.session_id}, step_id={action.step_id}")
        
        # 验证匹配
        assert action.session_id == obs.session_id, "❌ session_id mismatch!"
        assert action.step_id == obs.step_id, "❌ step_id mismatch!"
        
        print(f"💡 Action: {action.type} - {action.content[:50]}")
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! Session tracking works correctly.")

if __name__ == "__main__":
    asyncio.run(test_session_tracking())
