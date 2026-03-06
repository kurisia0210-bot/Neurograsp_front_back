# service/stub_brain.py
# 这是一个“机械脑”，完全没有智能，只有固定的脚本。
# 用于验证 Milestone 4：不依赖 LLM 的闭环能力。

from schema.payload import ObservationPayload, ActionPayload, SystemResponses

async def think(obs: ObservationPayload) -> ActionPayload:
    """
    Stub Logic: 硬编码的任务脚本
    任务目标: 把桌子上的红方块 (red_cube) 放到冰箱 (fridge_main) 里
    """
    
    # 获取当前状态的简化变量
    loc = obs.agent.location
    hand = obs.agent.holding
    
    # 查找红方块的状态
    cube = next((obj for obj in obs.nearby_objects if obj.id == "red_cube"), None)
    door = next((obj for obj in obs.nearby_objects if obj.id == "fridge_door"), None)
    
    print(f"⚙️ [Stub Brain]: Analyzing State -> Loc:{loc}, Hand:{hand}")

    # ==========================================
    # 脚本逻辑 (Scripted Policy)
    # ==========================================

    # ==========================================
    # 👇 新增：第 0 步 - 胜利结算 (Victory Condition)
    # ==========================================
    # 如果方块已经在冰箱里了，直接收工！
    if cube and cube.state == "in_fridge":
         return ActionPayload(type="FINISH", content="MISSION COMPLETE: The cube is in the fridge!")

    # 1. 如果手里没东西，且还没到桌子边 -> 去桌子边
    if hand is None and loc != "table_center":
        return ActionPayload(type="MOVE_TO", target_poi="table_center", content="Stub: Going to table")

    # 2. 如果到了桌子边，且手里没东西 -> 捡起方块
    if hand is None and loc == "table_center":
        # 简单检查一下方块是不是在桌上
        if cube and cube.state == "on_table":
            return ActionPayload(type="INTERACT", target_item="red_cube", content="Stub: Picking up cube")
        else:
             return ActionPayload(type="THINK", content="Stub: Where is the cube?")

    # 3. 如果手里拿着方块，且不在冰箱边 -> 去冰箱边
    if hand == "red_cube" and loc != "fridge_zone":
         return ActionPayload(type="MOVE_TO", target_poi="fridge_zone", content="Stub: Carrying cube to fridge")

    # 4. 如果拿着方块在冰箱边 -> 放入冰箱
    if hand == "red_cube" and loc == "fridge_zone":
        # 先检查门的状态
        if door and door.state == "closed":
            # 💡 Vibe: 门关着？那就开门！
            return ActionPayload(type="INTERACT", target_item="fridge_door", content="Stub: Opening fridge door")
        
        # 💡 Vibe: 门开了？那就可以放进去了！
        elif door and door.state == "open":
            return ActionPayload(type="INTERACT", target_item="fridge_main", content="Stub: Putting cube in fridge")
    
    # 5. 任务似乎完成了
    return ActionPayload(type="FINISH", content="Stub: Task Complete!")