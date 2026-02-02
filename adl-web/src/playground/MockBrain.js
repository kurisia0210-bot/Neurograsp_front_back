// src/playground/MockBrain.js

/**
 * 🧠 模拟 Python 后端的简单的状态机
 * 它可以验证我们的 Schema 是否足够让 Agent 完成任务
 */
export async function mockPythonBackend(observationJSON) {
  console.log("🐍 [Mock Python] Received:", observationJSON)

  // 模拟网络延迟 (500ms)
  await new Promise(resolve => setTimeout(resolve, 500))

  const { agent, nearby_objects } = observationJSON
  
  // === 简单的规则引擎 (Rule-Based Agent) ===
  
  // 1. 如果手里没东西，就找红方块
  if (agent.holding === null) {
    const cube = nearby_objects.find(o => o.id === "red_cube")
    
    // 如果看到方块，且方块在桌上 -> 捡起来
    if (cube && cube.state === "on_table") {
      return {
        type: "INTERACT",
        target_item: "red_cube",
        content: "I see the cube. Picking it up."
      }
    }
  }

  // 2. 如果手里拿着红方块
  if (agent.holding === "red_cube") {
    // 如果没在冰箱门口 -> 走过去
    if (agent.location !== "fridge_zone") {
      return {
        type: "MOVE_TO",
        target_poi: "fridge_zone",
        content: "Moving to fridge to store the cube."
      }
    }

    // 如果到了冰箱门口
    if (agent.location === "fridge_zone") {
      const fridge = nearby_objects.find(o => o.id === "fridge_door")
      
      // 如果冰箱关着 -> 打开
      if (fridge && fridge.state === "closed") {
        return {
          type: "INTERACT",
          target_item: "fridge_door",
          content: "Opening the fridge."
        }
      }
      
      // 如果冰箱开着 -> 放进去 (任务完成)
      if (fridge && fridge.state === "open") {
        return {
          type: "INTERACT",
          target_item: "fridge_main", // 放入冰箱主体
          content: "Putting cube inside."
        }
      }
    }
  }

  // 默认发呆
  return { type: "IDLE", content: "Waiting..." }
}