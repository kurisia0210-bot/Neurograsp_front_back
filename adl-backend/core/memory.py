# [海马体] 记忆系统
# 职责：管理工作记忆/情景记忆/语义记忆。
# 理由：隔离状态持久性。允许稍后交换向量数据库。
import time
from typing import List, Optional
from pydantic import BaseModel, Field
from schema.payload import ObservationPayload, ActionPayload, ActionExecutionResult

class Episode(BaseModel):
    """
    原子化的事实单元。
    定义：在时间点 T，世界状态是 S，Agent 做了 A，导致世界状态变成了 S'。
    公式：E_t = (S_t, A_t, S_{t+1})
    """
    id: int = Field(..., description="自增序列号，保证严格的时序单调性")
    timestamp: float = Field(default_factory=time.time)
    
    # Pre-State (S_t)
    pre_observation: ObservationPayload
    
    # Action (A_t)
    action: ActionPayload

    # ✅ [M8] 新增：这次行动的直接结果（裁判判决）
    # 注意：post_observation 是物理结果，execution_result 是逻辑结果
    execution_result: Optional[ActionExecutionResult] = None
    
    # Post-State (S_{t+1})
    # 注意：这是 Action 执行后的结果。在 Web 架构中，这通常是下一次请求的 Input。
    post_observation: Optional[ObservationPayload] = None # 改为 Optional，因为第一帧可能还没产生结果

class EpisodicMemory:
    def __init__(self):
        self._history: List[Episode] = []
        self._counter: int = 0
        
        # 暂存区：用于处理 HTTP 无状态请求的跨周期间隙
        # 我们发出 Action 时，还不知道结果（Post-State），需要等到下一次请求
        self._pending_pre_obs: Optional[ObservationPayload] = None
        self._pending_action: Optional[ActionPayload] = None
        self._pending_result: Optional[ActionExecutionResult] = None

    def commit(self, new_observation: ObservationPayload) -> None:
        """
        [核心逻辑] 闭环提交
        当新的观察到达时，它实际上是'上一个动作'的后果 (Post-State)。
        """
        # 如果有挂起的动作（说明这是上一个 tick 的后续）
        if self._pending_pre_obs and self._pending_action:
            episode = Episode(
                id=self._counter,
                pre_observation=self._pending_pre_obs,
                action=self._pending_action,
                # ✅ [M8] 归档结果
                execution_result=self._pending_result,
                post_observation=new_observation
            )
            self._history.append(episode)
            self._counter += 1
            
            # 📜 实时日志 (可选)
            print(f"📼 [Memory Commit] Ep#{episode.id}: {episode.action.type} -> {len(self._history)} records")

        # 无论是否 Commit，当前的 Observation 都是下一个 tick 的 Pre-State
        # 清空 Action 等待新的决策
        self._pending_pre_obs = new_observation
        self._pending_action = None
        self._pending_result = None # 清空

    def stage_action(self, action: ActionPayload, result: Optional[ActionExecutionResult] = None) -> None:
        """
        [暂存逻辑]
        Agent 决定了动作，但还没执行，结果未定。
        """
        """
        [M8 Update] 暂存决策 + 判决结果
        """
        self._pending_action = action
        self._pending_result = result # 记下来：这次动作是被 BLOCK 了还是 ALLOW 了

    def get_history(self) -> List[Episode]:
        """
        [Replay] 获取完整磁带
        """
        return self._history
    
    # ✅ [M8] 给 Reasoning 用的接口
    def get_last_failure(self) -> Optional[Episode]:
        """获取最近一次失败的 Episode (如果有)"""
        if not self._history:
            return None
        last_ep = self._history[-1]
        if last_ep.execution_result and not last_ep.execution_result.success:
            return last_ep
        return None
    
    def get_latest(self) -> Optional[Episode]:
        return self._history[-1] if self._history else None
    
    def clear(self):
        """重置记忆 (仅调试用)"""
        self._history = []
        self._counter = 0
        self._pending_pre_obs = None
        self._pending_action = None

# 全局单例 (在这个简单架构中)
episodic_memory = EpisodicMemory()