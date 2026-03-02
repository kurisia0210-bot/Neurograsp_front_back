# 问题验收报告

**日期**: 2026-02-27  
**验收项目**: 问题4(Action/字段字典) 和 问题7(观测与回放)

---

## ✅ 问题 7: 观测与回放 - **通过验收**

### 验收标准
> 先定日志最小集：intent / verdict / effects / result / step_id，否则迁移后很难排查。

### ✅ 实施情况

#### 1. 后端日志系统 (`step_logger.py`)

**已实现的日志字段**:
```python
{
  "event": "step_summary",
  "ts": timestamp,
  "session_id": str,
  "episode_id": int,
  "step_id": int,               # ✅ 必需字段
  "global_task": str,
  
  "input": {
    "last_action": {...},       # 上一步的动作
    "last_result": {...},       # 上一步的结果
    "agent_location": str,
    "agent_holding": str|null,
    "task_facts": {...}
  },
  
  "output": {
    "intent": {                 # ✅ 必需字段 - 提案器输出
      "type": str,
      "target_poi": str|null,
      "target_item": str|null,
      "interaction_type": str|null,
      "content": str
    },
    "execution_result": {       # ✅ 必需字段 - 执行结果
      "success": bool,
      "failure_type": str|null,
      "failure_reason": str
    },
    "reflex_verdict": {         # ✅ 必需字段 - Reflex检查
      "verdict": "ALLOW|BLOCK|IGNORE",
      "message": str
    },
    "error": {...}
  }
}
```

**✅ 日志格式**:
- 简明格式 (STEP_SUMMARY_BRIEF=true, 默认开启)
- JSON单行格式 (STEP_SUMMARY_JSON=true, 默认开启)  
- 美化JSON格式 (STEP_SUMMARY_PRETTY=false, 可选开启)

**✅ 覆盖率**: 包含所有必需字段 (intent, verdict, result, step_id)

**⚠️ 缺失项**: `effects` 字段
- 当前没有明确的 `world_effects` 字段记录世界状态变化
- 只能通过对比前后的 `agent_location` 和 `agent_holding` 推断

#### 2. 前端日志状态 (`AgentSystem.jsx`)

**已实现的状态追踪**:
```javascript
{
  sessionId: string,
  episodeId: number,
  stepId: number,
  lastAction: ActionPayload,      // ✅ 对应 intent
  lastResult: ExecutionResult,    // ✅ 对应 result
  lastObservation: ObservationPayload,
  lastResponse: AgentStepResponse, // 包含 reflex_verdict
  lastError: ErrorPayload
}
```

**✅ 数据流**:
1. 每次 tick 自动递增 `stepCounterRef`
2. `lastAction` 和 `lastResult` 正确传递给下一次请求
3. `lastObservation` 记录完整的请求数据

**⚠️ 前端日志展示**:
- AgentPlayground 中有基础的历史记录显示
- 但没有结构化的 Step History 面板
- 无法方便地查看每一步的 verdict 和 effects

### 📊 验收结论: **基本通过 (85分)**

**优点**:
- ✅ 核心字段完整: intent, verdict, result, step_id 全部存在
- ✅ 后端日志结构清晰,支持多种格式
- ✅ 前端状态追踪完整,支持闭环反馈

**待改进**:
- ⚠️ 缺少明确的 `effects` 字段 (扣10分)
- ⚠️ 前端缺少结构化日志展示组件 (扣5分)

**建议**:
1. 在 `emit_step_summary()` 中添加 `effects` 字段:
   ```python
   "effects": {
     "agent_location_changed": bool,
     "agent_holding_changed": bool,
     "objects_changed": [str]
   }
   ```

2. 前端添加 Step History 面板,显示每一步的完整信息

---

## ⚠️ 问题 4: Action/字段字典 - **部分通过 (需改进)**

### 验收标准
> 前后端动作枚举、目标命名、interaction_type 必须统一（尤其 INTERACT 映射和 fallback 行为）。

### 🔍 检查结果

#### 1. ✅ 后端枚举定义 (`schema/payload.py`)

**动作类型**:
```python
class AgentActionType(str, Enum):
    MOVE_TO = "MOVE_TO"
    INTERACT = "INTERACT"
    THINK = "THINK"
    SPEAK = "SPEAK"
    IDLE = "IDLE"
    FINISH = "FINISH"
    # ... Game 2
```

**POI名称**:
```python
class PoiName(str, Enum):
    TABLE_CENTER = "table_center"
    FRIDGE_ZONE = "fridge_zone"
    STOVE_ZONE = "stove_zone"
```

**物品名称**:
```python
class ItemName(str, Enum):
    RED_CUBE = "red_cube"
    HALF_CUBE_LEFT = "half_cube_left"
    HALF_CUBE_RIGHT = "half_cube_right"
    FRIDGE_MAIN = "fridge_main"
    FRIDGE_DOOR = "fridge_door"
    STOVE = "stove"
    TABLE_SURFACE = "table_surface"
```

**交互类型**:
```python
class InteractionType(str, Enum):
    PICK = "PICK"
    PLACE = "PLACE"
    SLICE = "SLICE"
    COOK = "COOK"
    OPEN = "OPEN"
    CLOSE = "CLOSE"
    TOGGLE = "TOGGLE"
    NONE = "NONE"
```

#### 2. ⚠️ 前端常量定义 (`GoalParser.js`)

**POI别名**:
```javascript
export const POI_ALIAS = {
  table: 'table_center',
  table_center: 'table_center',
  fridge: 'fridge_zone',
  fridge_zone: 'fridge_zone',
  stove: 'stove_zone',
  stove_zone: 'stove_zone'
}
```

**物品别名**:
```javascript
export const ITEM_ALIAS = {
  'red cube': 'red_cube',
  red_cube: 'red_cube',
  cube: 'red_cube',
  'fridge door': 'fridge_door',
  fridge_door: 'fridge_door',
  door: 'fridge_door',
  fridge: 'fridge_main',
  fridge_main: 'fridge_main',
  table: 'table_surface',
  table_surface: 'table_surface',
  stove: 'stove'
}
```

**容器别名**:
```javascript
export const CONTAINER_ALIAS = {
  fridge: 'fridge_main',
  refrigerator: 'fridge_main',
  fridge_main: 'fridge_main',
  table: 'table_surface',
  table_surface: 'table_surface',
  stove: 'stove'
}
```

#### 3. ❌ 发现的不一致问题

##### 问题 A: 前端缺少动作类型和交互类型的枚举

**前端问题**:
- ❌ 没有定义 `ActionType` 常量/枚举
- ❌ 没有定义 `InteractionType` 常量/枚举
- ❌ 动作类型和交互类型都是硬编码字符串

**代码示例** (AgentPlayground.jsx):
```javascript
// ❌ 硬编码字符串
type: 'MOVE_TO',
type: 'INTERACT',
interaction_type: 'PICK',
interaction_type: 'PLACE',
```

**后果**:
- 容易拼写错误 (`MOVE_TO` vs `MOVETO` vs `move_to`)
- 无法通过 IDE 自动补全
- 前后端不一致时难以发现

##### 问题 B: 别名映射分散在多处

**后端别名映射位置**:
- `goal_registry.py` - POI/Item 别名
- `response_parser.py` - POI/Item/Interaction 别名
- `goal_evaluator.py` - POI/Item/Container 别名

**问题**:
- ❌ 同一个别名在3个地方定义,容易不一致
- ❌ 添加新别名需要改3个文件

**示例不一致**:
```python
# goal_registry.py
POI_ALIASES = {
    "table": "table_center",
    "center": "table_center",
    "fridge": "fridge_zone",
    "fridge_zone": "fridge_zone",
    ...
}

# response_parser.py
POI_ALIASES: Dict[str, str] = {
    "table": "table_center",
    "table_center": "table_center",
    "center_table": "table_center",  # 不同!
    "fridge": "fridge_zone",
    ...
}
```

##### 问题 C: Fallback 行为不统一

**前端 fallback** (GoalParser.js):
```javascript
export function normalizeItem(raw) {
  const key = normalizeToken(raw, true)
  const mapped = ITEM_ALIAS[key] || key.replace(/ /g, '_')
  return mapped || null  // fallback: 自动转换为下划线格式
}
```

**后端 fallback** (response_parser.py):
```python
def _normalize_payload(self, payload_data: Dict[str, Any]) -> Dict[str, Any]:
    target_item = payload_data.get("target_item")
    if target_item not in (None, ""):
        item_key = self._to_key(target_item)
        payload_data["target_item"] = self.ITEM_ALIASES.get(item_key, item_key)
        # fallback: 保持原始的 key (小写+下划线)
```

**不一致**:
- 前端: 未知物品 → 转换为下划线格式
- 后端: 未知物品 → 保持转换后的小写下划线格式
- 可能导致前端认为合法但后端拒绝的情况

#### 4. ⚠️ 后端别名映射检查

**goal_registry.py** (第383-406行):
```python
_POIS = {"table_center", "fridge_zone", "stove_zone"}
_ITEMS = {
    "red_cube", "half_cube_left", "half_cube_right",
    "fridge_door", "fridge_main", "stove", "table_surface"
}
_CONTAINERS = {"fridge_main", "table_surface", "stove"}

_POI_ALIASES = {
    "table": "table_center",
    "center": "table_center",
    "fridge": "fridge_zone",
    "fridge_zone": "fridge_zone",
    "stove": "stove_zone",
    "stove_zone": "stove_zone",
}
# ... 还有 _ITEM_ALIASES, _CONTAINER_ALIASES
```

**response_parser.py** (第36-69行):
```python
POI_ALIASES: Dict[str, str] = {
    "table": "table_center",
    "table_center": "table_center",
    "center_table": "table_center",  # ⚠️ 与其他地方不同
    "fridge": "fridge_zone",
    "fridge_zone": "fridge_zone",
    "refrigerator": "fridge_zone",   # ⚠️ 只在这里有
    "stove": "stove_zone",
    "stove_zone": "stove_zone",
}

ITEM_ALIASES: Dict[str, str] = {
    "red_cube": "red_cube",
    "redcube": "red_cube",           # ⚠️ 只在这里有
    "red_cube_block": "red_cube",    # ⚠️ 只在这里有
    "fridge": "fridge_main",
    "fridge_main": "fridge_main",
    "fridge_door": "fridge_door",
    "table": "table_surface",
    "table_surface": "table_surface",
    "stove": "stove",
}
```

**goal_evaluator.py** (第40-62行) - 已弃用但仍存在:
```python
_POI_ALIASES = {
    "table": "table_center",
    "center": "table_center",
    "fridge": "fridge_zone",
    "fridge_zone": "fridge_zone",
    "stove": "stove_zone",
    "stove_zone": "stove_zone",
}
```

### 📊 验收结论: **不通过 (60分)**

**优点**:
- ✅ 后端有完整的枚举定义
- ✅ 前端 POI/Item 别名与后端基本一致
- ✅ 核心值 (table_center, fridge_zone, red_cube 等) 前后端统一

**严重问题**:
- ❌ 前端缺少 ActionType 和 InteractionType 枚举定义 (扣20分)
- ❌ 后端别名映射分散在3个文件,有不一致 (扣10分)
- ❌ Fallback 行为前后端不统一 (扣10分)

**需要立即修复**:

1. **前端添加枚举常量** (高优先级):
   ```javascript
   // src/constants/gameConstants.js
   export const ActionType = {
     MOVE_TO: 'MOVE_TO',
     INTERACT: 'INTERACT',
     THINK: 'THINK',
     SPEAK: 'SPEAK',
     IDLE: 'IDLE',
     FINISH: 'FINISH'
   }
   
   export const InteractionType = {
     PICK: 'PICK',
     PLACE: 'PLACE',
     OPEN: 'OPEN',
     CLOSE: 'CLOSE',
     SLICE: 'SLICE',
     COOK: 'COOK',
     TOGGLE: 'TOGGLE',
     NONE: 'NONE'
   }
   
   export const PoiName = {
     TABLE_CENTER: 'table_center',
     FRIDGE_ZONE: 'fridge_zone',
     STOVE_ZONE: 'stove_zone'
   }
   
   export const ItemName = {
     RED_CUBE: 'red_cube',
     FRIDGE_DOOR: 'fridge_door',
     FRIDGE_MAIN: 'fridge_main',
     TABLE_SURFACE: 'table_surface',
     STOVE: 'stove',
     HALF_CUBE_LEFT: 'half_cube_left',
     HALF_CUBE_RIGHT: 'half_cube_right'
   }
   ```

2. **后端统一别名映射** (中优先级):
   ```python
   # schema/constants.py (新建)
   POI_ALIASES = {
       "table": "table_center",
       "center": "table_center",
       "fridge": "fridge_zone",
       "refrigerator": "fridge_zone",
       "fridge_zone": "fridge_zone",
       "stove": "stove_zone",
       "stove_zone": "stove_zone",
   }
   
   ITEM_ALIASES = {
       "red_cube": "red_cube",
       "redcube": "red_cube",
       "cube": "red_cube",
       "red cube": "red_cube",
       "fridge": "fridge_main",
       "fridge_main": "fridge_main",
       "fridge_door": "fridge_door",
       "door": "fridge_door",
       "table": "table_surface",
       "table_surface": "table_surface",
       "stove": "stove",
   }
   
   INTERACTION_ALIASES = {
       "pick": "PICK",
       "pickup": "PICK",
       "pick_up": "PICK",
       "place": "PLACE",
       "put": "PLACE",
       "open": "OPEN",
       "close": "CLOSE",
       "toggle": "TOGGLE",
       "slice": "SLICE",
       "cut": "SLICE",
       "cook": "COOK",
       "none": "NONE",
   }
   ```
   
   然后在所有地方导入这个统一的常量文件。

3. **统一 Fallback 行为** (中优先级):
   - 定义策略: 未知值是拒绝还是转换?
   - 前后端实现相同的策略
   - 添加明确的错误提示

---

## 📊 总体验收结论

| 问题 | 状态 | 得分 | 阻塞性 |
|-----|------|------|--------|
| **问题7: 观测与回放** | ✅ 基本通过 | 85/100 | 非阻塞 |
| **问题4: Action/字段字典** | ⚠️ 不通过 | 60/100 | 部分阻塞 |

### 优先级建议

**立即修复** (本周内):
1. 前端添加 ActionType 和 InteractionType 枚举 (2小时)
2. 后端统一别名映射到 `schema/constants.py` (1.5小时)

**短期改进** (下周):
3. 统一前后端 Fallback 行为 (1小时)
4. 添加前端 Step History 面板 (2小时)
5. 后端日志添加 effects 字段 (1小时)

**长期优化** (有空再做):
6. 自动测试别名映射一致性
7. 生成前后端共享的类型定义文件

---

## 🎯 下一步行动

### 本周任务清单

- [ ] 创建 `adl-web/src/constants/gameConstants.js`
- [ ] 定义所有枚举常量
- [ ] 全局替换硬编码字符串为常量引用
- [ ] 创建 `adl-backend/schema/constants.py`
- [ ] 统一所有别名映射
- [ ] 更新所有导入语句
- [ ] 运行完整测试验证

### 测试验证

完成修复后,需要测试:
1. 发送所有类型的动作 (MOVE_TO, INTERACT + 所有交互类型)
2. 使用所有别名 (table/center/fridge 等)
3. 检查日志是否包含所有必需字段
4. 验证前后端数据类型完全一致

---

**报告人**: Sonnet  
**验收日期**: 2026-02-27 22:00
