# [海马体] 记忆系统
# 职责：管理工作记忆/情景记忆/语义记忆。
# 理由：隔离状态持久性。允许稍后交换向量数据库。
import time
from typing import List, Optional
from pydantic import BaseModel, Field
from schema.payload import ObservationPayload, ActionPayload

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
    
    # Post-State (S_{t+1})
    # 注意：这是 Action 执行后的结果。在 Web 架构中，这通常是下一次请求的 Input。
    post_observation: ObservationPayload

class EpisodicMemory:
    def __init__(self):
        self._history: List[Episode] = []
        self._counter: int = 0
        
        # 暂存区：用于处理 HTTP 无状态请求的跨周期间隙
        # 我们发出 Action 时，还不知道结果（Post-State），需要等到下一次请求
        self._pending_pre_obs: Optional[ObservationPayload] = None
        self._pending_action: Optional[ActionPayload] = None

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

    def stage_action(self, action: ActionPayload) -> None:
        """
        [暂存逻辑]
        Agent 决定了动作，但还没执行，结果未定。
        """
        self._pending_action = action

    def get_history(self) -> List[Episode]:
        """
        [Replay] 获取完整磁带
        """
        return self._history
    
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