# service/vector_db.py
# Milestone 9: The Long-Term Memory (Hippocampus & Neocortex)
# 职责：
# 1. 持久化存储 Episodes (流水账) -> 支持"似曾相识"的检索
# 2. 持久化存储 Semantics (规则/偏置) -> 支持"生存智慧"的检索

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chromadb
import uuid
from typing import List, Dict, Optional
from schema.payload import ObservationPayload, ActionPayload, ActionExecutionResult

class VectorDBService:
    def __init__(self, db_path: str = "./chroma_db"):
        """
        初始化 ChromaDB 客户端 (Persistent 模式)
        数据将保存在本地文件夹，无需 Docker，无需显卡。
        """
        print(f"🧠 [VectorDB] Initializing memory at {db_path}...")
        self.client = chromadb.PersistentClient(path=db_path)
        
        # 1. 初始化 Episodic Memory Collection (海马体)
        # 存什么: 完整的 (State, Action, Result)
        # 查什么: "我以前在这个场景下做过什么？"
        self.episodes_collection = self.client.get_or_create_collection(
            name="neuro_episodes",
            metadata={"hnsw:space": "cosine"} # 使用余弦相似度
        )
        
        # 2. 初始化 Semantic Memory Collection (大脑皮层)
        # 存什么: 提炼后的 Rule / Bias
        # 查什么: "关于'冰箱'我有什忌讳？"
        self.semantics_collection = self.client.get_or_create_collection(
            name="neuro_semantics",
            metadata={"hnsw:space": "cosine"}
        )
        print(f"🧠 [VectorDB] Memory loaded. Episodes: {self.episodes_collection.count()}, Semantics: {self.semantics_collection.count()}")

    # ==========================================
    # 🌊 Episodic Memory (流水账)
    # ==========================================
    
    def _serialize_observation(self, obs: ObservationPayload) -> str:
        """
        [关键] 将 Observation 压缩成一段富含语义的文本 (Embedding Target)。
        这决定了 AI 能否通过"语义相似性"找到以前的场景。
        """
        # 提取关键物体
        nearby_str = ", ".join([f"{o.id}({o.state})" for o in obs.nearby_objects])
        
        # 格式：Location + Nearby + Holding + Task
        # 这种格式让向量数据库知道"站在桌子前"和"站在冰箱前"是完全不同的
        return f"Location: {obs.agent.location}. Nearby: {nearby_str}. Holding: {obs.agent.holding}. Task: {obs.global_task}"

    def add_episode(self, 
                    episode_id: int, 
                    pre_obs: ObservationPayload, 
                    action: ActionPayload, 
                    result: ActionExecutionResult):
        """
        将一次完整的经历存入向量库
        """
        # 1. 准备文档内容 (用于向量化搜索)
        # 我们把 Context 和 Action 结合起来，这样我们就能搜到"在桌子前(Context)做了交互(Action)"的记录
        document_text = self._serialize_observation(pre_obs) + f" -> Action: {action.type} {action.target_item or action.target_poi}"
        
        # 2. 准备元数据 (用于过滤和逻辑判断)
        # Chroma 的 metadata 只支持 int, float, str, bool
        meta = {
            "episode_id": episode_id,
            "timestamp": pre_obs.timestamp,
            "action_type": action.type.value,
            "action_target": action.target_item or action.target_poi or "None",
            "success": result.success,
            "failure_reason": result.failure_reason[:200] if result.failure_reason else "" # 截断防止过长
        }
        
        # 3. 写入 Chroma
        # 使用 UUID 防止冲突，虽然逻辑上我们用 episode_id 也可以
        doc_id = f"ep_{episode_id}_{uuid.uuid4().hex[:8]}"
        
        self.episodes_collection.add(
            documents=[document_text],
            metadatas=[meta],
            ids=[doc_id]
        )
        # print(f"💾 [VectorDB] Saved Episode #{episode_id} (Success: {result.success})")

    def query_similar_failures(self, current_obs: ObservationPayload, top_k: int = 3) -> List[Dict]:
        """
        [M9 核心] 在做决策前，查查以前有没有在这里栽过跟头。
        只返回 result.success == False 的记录。
        """
        query_text = self._serialize_observation(current_obs)
        
        results = self.episodes_collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where={"success": False} # ✅ Chroma 的过滤器：只看失败案例
        )
        
        # 解析 Chroma 的返回结构
        history = []
        if results["ids"] and results["ids"][0]:
            for i in range(len(results["ids"][0])):
                history.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] # 距离越小越相似
                })
        return history

    # ==========================================
    # 💡 Semantic Memory (规则/偏置)
    # ==========================================

    def add_semantic_rule(self, rule_content: str, source: str = "manual"):
        """
        添加一条通用规则。
        例如: "NEVER interact with 'table_center', use 'table_surface'."
        """
        self.semantics_collection.add(
            documents=[rule_content],
            metadatas=[{"source": source}],
            ids=[f"rule_{uuid.uuid4().hex[:8]}"]
        )
        print(f"📘 [VectorDB] Learned new rule: {rule_content}")

    def query_relevant_rules(self, query_context: str, top_k: int = 2) -> List[str]:
        """
        根据当前情境，检索最相关的几条生存法则。
        """
        results = self.semantics_collection.query(
            query_texts=[query_context],
            n_results=top_k
        )
        
        rules = []
        if results["documents"] and results["documents"][0]:
            rules = results["documents"][0] # 直接返回规则文本列表
            
        return rules

# 单例模式
vector_db = VectorDBService()