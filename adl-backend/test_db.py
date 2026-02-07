# test_db.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from service.vector_db import vector_db
    print("✅ VectorDB导入成功")
    
    # 看看刚才存了多少
    print("Total Episodes:", vector_db.episodes_collection.count())
    print("Total Semantics:", vector_db.semantics_collection.count())
    
    # 添加一些测试数据
    from schema.payload import (
        ObservationPayload, AgentSelfState, VisibleObject,
        PoiName, ItemName, ObjectState, ActionPayload, 
        AgentActionType, ActionExecutionResult, FailureType
    )
    
    # 创建测试观察
    test_obs = ObservationPayload(
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
    
    # 创建测试动作
    test_action = ActionPayload(
        type=AgentActionType.INTERACT,
        target_item=ItemName.RED_CUBE,
        content="Testing vector db"
    )
    
    # 创建测试结果
    test_result = ActionExecutionResult(
        success=False,
        failure_type=FailureType.REFLEX_BLOCK,
        failure_reason="Hands empty. Nothing to place."
    )
    
    # 添加一个测试episode
    vector_db.add_episode(1, test_obs, test_action, test_result)
    print("✅ 测试Episode添加成功")
    
    # 查询相似失败
    similar_failures = vector_db.query_similar_failures(test_obs, top_k=2)
    print(f"✅ 查询到 {len(similar_failures)} 个相似失败")
    for failure in similar_failures:
        print(f"  - {failure.metadata.get('action_type', 'unknown')}({failure.metadata.get('target', 'unknown')}): {failure.metadata.get('failure_reason', 'no reason')}")
        print(f"    距离: {failure.distance:.4f}, 是否失败: {failure.is_failure}")
    
    # 添加一些语义规则
    vector_db.add_semantic_rule("NEVER interact with 'table_center', use 'table_surface' instead.")
    vector_db.add_semantic_rule("If hands are empty, pick up item first before trying to place it.")
    vector_db.add_semantic_rule("CONSTRAINT: You CANNOT put items into 'fridge_main' if 'fridge_door' is CLOSED. You must OPEN 'fridge_door' first.")
    
    # 测试不同场景的检索
    print("\n=== 测试不同场景的Semantic Memory检索 ===")
    
    # 场景1: 在桌子中心
    results1 = vector_db.query_relevant_rules("I am at table_center")
    print("✅ 场景1 (table_center) Relevant Rules:", results1)
    
    # 场景2: 在冰箱区域，手拿物品
    results2 = vector_db.query_relevant_rules("Action at fridge_zone. Nearby: fridge_main, fridge_door. Holding: red_cube")
    print("✅ 场景2 (fridge_zone with item) Relevant Rules:", results2)
    
    # 场景3: 手空的时候
    results3 = vector_db.query_relevant_rules("Action at table_center. Nearby: red_cube. Holding: None")
    print("✅ 场景3 (empty hands) Relevant Rules:", results3)
    
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("⚠️ 可能是SQLite DLL问题，尝试以下解决方案:")
    print("1. conda install -c conda-forge sqlite")
    print("2. pip uninstall chromadb && pip install chromadb")
    print("3. 或者使用系统Python: python -m venv venv")
    
except Exception as e:
    print(f"❌ 运行错误: {e}")
    import traceback
    traceback.print_exc()
