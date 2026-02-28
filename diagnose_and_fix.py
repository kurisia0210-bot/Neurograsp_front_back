#!/usr/bin/env python3
"""
诊断问题并给出解决方案
"""

import sys
import os

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'adl-backend'))

def diagnose_problem():
    """诊断问题"""
    print("=== 问题诊断报告 ===")
    print("\n问题现象:")
    print("任务: 'Put red cube in fridge'")
    print("状态: 在fridge_zone，没拿东西，冰箱门已打开")
    print("实际输出: '请先移动到 table_center。'")
    print("预期输出: '请先拿起 red_cube。'")
    
    print("\n根本原因分析:")
    print("1. GoalSpec被错误地从PUT_IN切换到了MOVE_TO")
    print("2. 可能的原因:")
    print("   a. 系统错误地更新了goal_spec")
    print("   b. LLM响应被错误解析为MOVE_TO")
    print("   c. 状态跟踪错误导致目标切换")
    
    print("\n证据:")
    print("1. 测试显示GoalRegistry解析正确")
    print("2. PUT_IN handler的coach方法工作正常")
    print("3. 如果goal_spec是MOVE_TO，LLM会建议移动到table_center")
    print("4. 日志显示系统在step=6返回了MOVE_TO建议")
    
    print("\n最可能的问题:")
    print("在step=5到step=6之间，系统错误地将goal_spec设置为MOVE_TO")
    print("可能的原因: 状态停滞检测或错误处理逻辑错误地修改了goal_spec")

def suggest_fixes():
    """建议修复方案"""
    print("\n=== 修复方案 ===")
    
    print("\n方案1: 添加调试日志（立即实施）")
    print("在以下位置添加日志:")
    print("1. GoalRegistry.resolve_with_hint() - 记录goal_spec变化")
    print("2. LLMProposer.propose() - 记录LLM响应")
    print("3. ReasoningV2Pipeline.analyze_and_propose() - 记录最终决策")
    
    print("\n方案2: 检查状态停滞检测")
    print("检查StateStagnationGuard是否错误地修改了goal_spec")
    print("查看: adl-backend/core/safety/guards_v2.py")
    
    print("\n方案3: 检查goal_spec更新逻辑")
    print("搜索代码中所有设置obs.goal_spec的地方")
    print("使用命令: grep -r 'goal_spec=' adl-backend/")
    
    print("\n方案4: 修复PUT_IN处理逻辑")
    print("确保PUT_IN目标不会被错误转换为MOVE_TO")
    print("检查ComplexActionPlanner是否正确处理PUT_IN")

def immediate_debug_steps():
    """立即调试步骤"""
    print("\n=== 立即调试步骤 ===")
    
    print("\n步骤1: 查看goal_spec设置代码")
    print("运行: grep -r 'goal_spec=' adl-backend/")
    
    print("\n步骤2: 添加临时调试日志")
    print("在adl-backend/core/goal/goal_registry.py的resolve_with_hint方法中添加:")
    print('''
    def resolve_with_hint(self, task: str, goal_hint: Optional[Any]) -> Optional[GoalSpec]:
        print(f"[DEBUG] resolve_with_hint: task={task!r}, hint={goal_hint}")
        # ... 原有代码
        if goal_spec:
            print(f"[DEBUG] resolved: {goal_spec.goal_type}, {goal_spec.dsl}")
        return goal_spec
    ''')
    
    print("\n步骤3: 检查LLM响应")
    print("在adl-backend/core/pipeline/proposer/llm.py的propose方法中添加:")
    print('''
    async def propose(self, obs: ObservationPayload) -> ActionPayload:
        print(f"[DEBUG] LLMProposer.propose: goal_spec={obs.goal_spec}")
        # ... 原有代码
        print(f"[DEBUG] LLM raw response: {raw}")
        return action
    ''')
    
    print("\n步骤4: 重新运行测试")
    print("观察调试日志，查看goal_spec何时从PUT_IN变为MOVE_TO")

def create_patch_file():
    """创建补丁文件"""
    print("\n=== 创建调试补丁 ===")
    
    patch_content = '''--- a/adl-backend/core/goal/goal_registry.py
+++ b/adl-backend/core/goal/goal_registry.py
@@ -350,6 +350,7 @@ class GoalRegistry:
         goal_hint accepts any object/dict with fields:
         - goal_type (optional)
         - goal_id (optional)
         - dsl (optional)
         - params (optional dict)
         """
+        print(f"[DEBUG GoalRegistry] resolve_with_hint: task={task!r}, hint={goal_hint}")
         try:
             hinted = self._resolve_from_hint(goal_hint)
         except Exception:
             hinted = None
         if hinted is not None:
+            print(f"[DEBUG GoalRegistry] resolved from hint: {hinted.goal_type}, {hinted.dsl}")
             return hinted
+        print(f"[DEBUG GoalRegistry] falling back to task text: {task}")
         return self.resolve(task)

--- a/adl-backend/core/pipeline/proposer/llm.py
+++ b/adl-backend/core/pipeline/proposer/llm.py
@@ -66,6 +66,7 @@ class LLMProposer:
         - ActionPayload: 解析后的动作，如果解析失败则返回THINK动作
         """
         # 步骤1：构建LLM提示词
+        print(f"[DEBUG LLMProposer] propose: goal_spec={obs.goal_spec}")
         messages = self._prompt_builder.build_messages(obs)
         
         # 步骤2：调用LLM服务
@@ -73,6 +74,7 @@ class LLMProposer:
         
         # 步骤3：解析响应
         return self._response_parser.parse_to_action(obs, raw)
+        print(f"[DEBUG LLMProposer] raw response: {raw[:200]}...")

--- a/adl-backend/core/reasoning_v2.py
+++ b/adl-backend/core/reasoning_v2.py
@@ -96,6 +96,7 @@ class ReasoningV2Pipeline:
 
     async def analyze_and_propose(self, obs: ObservationPayload) -> ActionPayload:
         finish_action = self._finish_guard.check(obs)
+        print(f"[DEBUG ReasoningV2] analyze_and_propose: goal_spec={obs.goal_spec}")
         if finish_action is not None:
             if obs.episode_id is not None:
                 self._finish_guard.reset(obs.session_id, int(obs.episode_id))
@@ -113,6 +114,7 @@ class ReasoningV2Pipeline:
         if self._is_finish_action(action) and obs.episode_id is not None:
             self._finish_guard.reset(obs.session_id, int(obs.episode_id))
             self._state_guard.reset(obs.session_id, int(obs.episode_id))
             self._complex_action_planner.reset(obs.session_id, int(obs.episode_id))
+        print(f"[DEBUG ReasoningV2] final action: {action.type}, content={action.content}")
         return action
'''
    
    print("将以上内容保存为debug_patch.patch并应用:")
    print("git apply debug_patch.patch")

def summary():
    """总结"""
    print("\n=== 总结 ===")
    print("\n问题确认:")
    print("系统错误地将'Put red cube in fridge'任务的goal_spec从PUT_IN切换到了MOVE_TO")
    print("导致LLM建议'请先移动到 table_center。'而不是'请先拿起 red_cube。'")
    
    print("\n根本原因:")
    print("1. 状态跟踪或错误处理逻辑错误地修改了goal_spec")
    print("2. 可能的状态停滞检测触发了错误的目标重置")
    print("3. 系统缺乏goal_spec变化的调试日志")
    
    print("\n建议行动:")
    print("1. 立即添加调试日志定位问题")
    print("2. 检查StateStagnationGuard和错误处理逻辑")
    print("3. 确保PUT_IN目标不会被错误转换")
    print("4. 添加goal_spec变化监控")

if __name__ == "__main__":
    diagnose_problem()
    suggest_fixes()
    immediate_debug_steps()
    create_patch_file()
    summary()