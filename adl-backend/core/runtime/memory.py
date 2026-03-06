import time
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from schema.payload import ActionExecutionResult, ActionPayload, ObservationPayload


class Episode(BaseModel):
    """
    原子事实单元：表示一个完整的动作执行周期（前状态-动作-后状态）
    
    这是记忆系统的基本存储单元，用于记录代理的完整执行轨迹。
    每个Episode对应一个动作从计划到执行再到结果观察的完整周期。
    
    Attributes:
        id (int): 全局单调递增的episode记录ID，确保时序性
        timestamp (float): 记录创建时间戳，用于时序分析
        pre_observation (ObservationPayload): 动作执行前的观察状态
        action (ActionPayload): 执行的动作
        execution_result (Optional[ActionExecutionResult]): 动作执行结果，可能为空
        post_observation (Optional[ObservationPayload]): 动作执行后的观察状态
    """

    id: int = Field(..., description="Global monotonically increasing episode record id")
    timestamp: float = Field(default_factory=time.time)

    pre_observation: ObservationPayload
    action: ActionPayload
    execution_result: Optional[ActionExecutionResult] = None
    post_observation: Optional[ObservationPayload] = None


class EpisodicMemory:
    """
    情节记忆系统，负责管理代理的执行历史
    
    核心功能：
    1. 存储完整的动作执行轨迹（Episode）
    2. 管理session/episode层级结构
    3. 提供失败学习和历史查询接口
    4. 支持跨session的隔离存储
    
    设计模式：单例模式 + 观察者模式
    """
    
    def __init__(self):
        """
        初始化情节记忆系统
        
        创建内部数据结构：
        - 历史记录存储
        - 会话隔离的待处理缓冲区
        - session/episode追踪计数器
        """
        self._history: List[Episode] = []
        self._counter: int = 0

        # 待处理缓冲区按session隔离，避免跨session污染
        self._pending_pre_obs_by_session: Dict[str, ObservationPayload] = {}
        self._pending_action_by_session: Dict[str, ActionPayload] = {}
        self._pending_result_by_session: Dict[str, ActionExecutionResult] = {}

        # session_id -> 最新分配的episode_id
        self._session_episode_counter: Dict[str, int] = {}
        # session_id -> 当前活跃的episode_id
        self._active_episode_by_session: Dict[str, int] = {}

    def resolve_episode_id(self, obs: ObservationPayload) -> int:
        """
        解析当前观察对应的episode ID
        
        优先级逻辑：
        1) 客户端提供的episode_id（最高优先级）
        2) 当前session中活跃的episode
        3) 在当前session中分配新的episode_id
        
        Args:
            obs: 观察对象，包含session_id和可能的episode_id
            
        Returns:
            int: 解析后的episode ID
            
        Note:
            此方法维护session级别的episode计数器，确保ID单调递增
        """
        sid = obs.session_id

        if obs.episode_id is not None:
            self._active_episode_by_session[sid] = int(obs.episode_id)
            self._session_episode_counter[sid] = max(
                int(obs.episode_id), self._session_episode_counter.get(sid, 0)
            )
            return int(obs.episode_id)

        if sid in self._active_episode_by_session:
            return self._active_episode_by_session[sid]

        next_episode = self._session_episode_counter.get(sid, 0) + 1
        self._session_episode_counter[sid] = next_episode
        self._active_episode_by_session[sid] = next_episode
        return next_episode

    def close_episode(self, session_id: str) -> None:
        """
        关闭指定session的当前活跃episode
        
        调用此方法后，下一次tick将为该session分配新的episode_id
        用于显式结束一个任务单元或重置状态
        
        Args:
            session_id: 要关闭episode的session标识符
        """
        self._active_episode_by_session.pop(session_id, None)

    def commit(self, new_observation: ObservationPayload) -> None:
        """
        闭环提交：将待处理的动作和结果提交为完整的Episode
        
        处理逻辑：
        1. 当前观察作为前一个步骤的后状态
        2. 结合待处理的前状态、动作和结果创建完整Episode
        3. 更新待处理缓冲区为当前观察（作为下一个Episode的前状态）
        
        Args:
            new_observation: 新的观察对象，包含last_action和last_result
            
        Note:
            这是记忆系统的核心方法，实现动作-观察的闭环记录
        """
        sid = new_observation.session_id

        pending_pre = self._pending_pre_obs_by_session.get(sid)
        action_for_commit = new_observation.last_action or self._pending_action_by_session.get(sid)
        result_for_commit = new_observation.last_result or self._pending_result_by_session.get(sid)

        if pending_pre and action_for_commit:
            episode = Episode(
                id=self._counter,
                pre_observation=pending_pre,
                action=action_for_commit,
                execution_result=result_for_commit,
                post_observation=new_observation,
            )
            self._history.append(episode)
            self._counter += 1
            print(
                "[Memory Commit] "
                f"Record#{episode.id} "
                f"(session={episode.pre_observation.session_id}, "
                f"episode={episode.pre_observation.episode_id}, "
                f"step={episode.pre_observation.step_id}) "
                f"{episode.action.type} -> {len(self._history)} records"
            )

        self._pending_pre_obs_by_session[sid] = new_observation
        self._pending_action_by_session.pop(sid, None)
        self._pending_result_by_session.pop(sid, None)

    def stage_action(self, action: ActionPayload, result: Optional[ActionExecutionResult] = None) -> None:
        """
        暂存动作和结果，等待下一个观察到达后提交
        
        这是commit方法的前置步骤，将动作和结果保存在session隔离的缓冲区中
        当下一个观察到达时，commit方法会使用这些暂存数据创建完整Episode
        
        Args:
            action: 要暂存的动作
            result: 动作执行结果，可选
        """
        sid = action.session_id
        self._pending_action_by_session[sid] = action
        if result is not None:
            self._pending_result_by_session[sid] = result
        else:
            self._pending_result_by_session.pop(sid, None)

    def get_history(self) -> List[Episode]:
        """
        获取完整的历史记录
        
        Returns:
            List[Episode]: 按时间顺序排列的所有Episode记录
        """
        return self._history

    def get_last_failure(
        self,
        session_id: Optional[str] = None,
        episode_id: Optional[int] = None,
    ) -> Optional[Episode]:
        """
        获取最近的失败记录
        
        支持按session和episode过滤，用于失败学习（M8）机制
        
        Args:
            session_id: 可选的session过滤条件
            episode_id: 可选的episode过滤条件
            
        Returns:
            Optional[Episode]: 最近的失败Episode，如果没有则返回None
        """
        for ep in reversed(self._history):
            if not ep.execution_result or ep.execution_result.success:
                continue
            if session_id is not None and ep.pre_observation.session_id != session_id:
                continue
            if episode_id is not None and ep.pre_observation.episode_id != episode_id:
                continue
            return ep
        return None

    def get_latest(self) -> Optional[Episode]:
        """
        获取最新的Episode记录
        
        Returns:
            Optional[Episode]: 最新的Episode，如果历史为空则返回None
        """
        return self._history[-1] if self._history else None

    def clear(self):
        """
        清空所有记忆数据
        
        重置所有内部状态，用于系统重置或测试
        """
        self._history = []
        self._counter = 0
        self._pending_pre_obs_by_session = {}
        self._pending_action_by_session = {}
        self._pending_result_by_session = {}
        self._session_episode_counter = {}
        self._active_episode_by_session = {}


# Global singleton
episodic_memory = EpisodicMemory()
"""
全局情节记忆单例

这是整个系统共享的记忆实例，提供统一的记忆存储和查询接口。
所有模块都应通过此单例访问记忆系统，确保数据一致性。

使用示例：
    from core.runtime.memory import episodic_memory
    episodic_memory.commit(observation)
    last_fail = episodic_memory.get_last_failure(session_id="test")
"""
