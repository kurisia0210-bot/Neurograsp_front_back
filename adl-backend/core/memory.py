import time
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from schema.payload import ActionExecutionResult, ActionPayload, ObservationPayload


class Episode(BaseModel):
    """Atomic fact unit: (pre_state, action, post_state)."""

    id: int = Field(..., description="Global monotonically increasing episode record id")
    timestamp: float = Field(default_factory=time.time)

    pre_observation: ObservationPayload
    action: ActionPayload
    execution_result: Optional[ActionExecutionResult] = None
    post_observation: Optional[ObservationPayload] = None


class EpisodicMemory:
    def __init__(self):
        self._history: List[Episode] = []
        self._counter: int = 0

        # Pending buffers are isolated by session to avoid cross-session contamination.
        self._pending_pre_obs_by_session: Dict[str, ObservationPayload] = {}
        self._pending_action_by_session: Dict[str, ActionPayload] = {}
        self._pending_result_by_session: Dict[str, ActionExecutionResult] = {}

        # session_id -> latest assigned episode_id
        self._session_episode_counter: Dict[str, int] = {}
        # session_id -> currently active episode_id
        self._active_episode_by_session: Dict[str, int] = {}

    def resolve_episode_id(self, obs: ObservationPayload) -> int:
        """
        Resolve episode id for current observation.
        Priority:
        1) client-provided episode_id
        2) current active episode in this session
        3) allocate new episode_id in this session
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
        """Close active episode for a session. Next tick can allocate a new one."""
        self._active_episode_by_session.pop(session_id, None)

    def commit(self, new_observation: ObservationPayload) -> None:
        """
        Close-loop commit:
        current observation is the post-state of previous step in this session.
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
            print(f"[Memory Commit] Ep#{episode.id}: {episode.action.type} -> {len(self._history)} records")

        self._pending_pre_obs_by_session[sid] = new_observation
        self._pending_action_by_session.pop(sid, None)
        self._pending_result_by_session.pop(sid, None)

    def stage_action(self, action: ActionPayload, result: Optional[ActionExecutionResult] = None) -> None:
        """Stage action/result until next observation arrives."""
        sid = action.session_id
        self._pending_action_by_session[sid] = action
        if result is not None:
            self._pending_result_by_session[sid] = result
        else:
            self._pending_result_by_session.pop(sid, None)

    def get_history(self) -> List[Episode]:
        return self._history

    def get_last_failure(
        self,
        session_id: Optional[str] = None,
        episode_id: Optional[int] = None,
    ) -> Optional[Episode]:
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
        return self._history[-1] if self._history else None

    def clear(self):
        self._history = []
        self._counter = 0
        self._pending_pre_obs_by_session = {}
        self._pending_action_by_session = {}
        self._pending_result_by_session = {}
        self._session_episode_counter = {}
        self._active_episode_by_session = {}


# Global singleton
episodic_memory = EpisodicMemory()
