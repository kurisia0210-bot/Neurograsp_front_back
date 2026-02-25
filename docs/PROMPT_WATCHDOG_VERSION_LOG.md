# Prompt 与 Watchdog 版本日志（手工维护）

用途：
- 仅用于人工记录 Prompt 和 Watchdog 的实验变更。
- 该文件不会被运行时代码读取。

## 记录范围
- 组件 A：Prompt（Game 1 系统提示词）
- 组件 B：Watchdog（停滞/循环/回退检测器）

## Prompt 版本

| 版本 | 日期 | 负责人 | 源文件 | 变更摘要 | 预期影响 | 实验 ID |
|---|---|---|---|---|---|---|
| P1.0 | 2026-02-18 | 我 | `adl-backend/core/prompt_templates.py` | 从 `reasoning_v1.py` 抽离；文本保持不变 | 行为不漂移，仅做结构解耦 | TBD |

## Watchdog 版本

| 版本 | 日期 | 负责人 | 源文件 | 变更摘要 | 预期影响 | 实验 ID |
|---|---|---|---|---|---|---|
| W1.0 | 2026-02-18 | 我 | `adl-backend/core/watchdog.py` | 从 `reasoning_v1.py` 抽离；逻辑保持不变 | 行为不漂移，仅做结构解耦 | TBD |

## 实验记录模板

### 实验：<ID>
- 日期：
- 分支/提交：
- Prompt 版本：
- Watchdog 版本：
- 场景集：
- 指标：
- 结果摘要：
- 回归风险：
- 结论：

## 记录规则
1. 每次改 Prompt 内容，新增一条 Prompt 版本记录。
2. 每次改 Watchdog 判定逻辑，新增一条 Watchdog 版本记录。
3. 纯重构（移动/重命名）也要记录。
4. 若同时改了 Prompt 与 Watchdog，必须分两条版本记录。
