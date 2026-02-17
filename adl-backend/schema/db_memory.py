# schema/memory.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class MemoryRecord(BaseModel):
    """
    [数据库契约] 定义存入 Chroma 的标准格式
    我们不直接存 ObservationPayload，而是存"消化"后的数据
    """
    # 1. 向量化目标 (Embedding Content)
    # 这是最关键的字段，决定了"以后怎么搜到它"
    # 比如: "Location: table. Task: put cube."
    embedding_text: str 
    
    # 2. 结构化元数据 (Metadata)
    # 用于过滤 (Where success=False)
    session_id: str
    episode_id: int
    step_id: int
    timestamp: float
    action_type: str
    target: str
    success: bool
    failure_reason: str = ""
    
    # 3. 原始数据快照 (Payload)
    # 这是一个高级技巧：把原始 JSON 序列化存进去，
    # 这样取出来时能直接还原成 Python 对象，而不用去拼凑字符串
    raw_observation_json: str 

    def to_chroma_payload(self) -> Dict[str, Any]:
        """转化为 Chroma 接收的字典格式"""
        return {
            "documents": [self.embedding_text],
            "metadatas": [{
                "episode_id": self.episode_id,
                "step_id": self.step_id,
                "session_id": self.session_id,
                "timestamp": self.timestamp,
                "action_type": self.action_type,
                "target": self.target,
                "success": self.success,
                "failure_reason": self.failure_reason,
                "raw_json": self.raw_observation_json # 👈 这里
            }],
            "ids": [f"sess_{self.session_id}_ep_{self.episode_id}_step_{self.step_id}"]
        }

class MemorySearchResult(BaseModel):
    """
    [数据库契约] 定义检索回来的结果
    """
    id: str
    distance: float # 相似度距离 (越小越相似)
    content: str    # 当时的场景描述
    metadata: Dict[str, Any] # 各种字段
    
    # 快捷访问辅助属性
    @property
    def is_failure(self) -> bool:
        return not self.metadata.get("success", True)
        
    @property
    def reason(self) -> str:
        return self.metadata.get("failure_reason", "")
