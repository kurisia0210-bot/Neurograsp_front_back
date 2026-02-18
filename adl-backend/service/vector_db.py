# service/vector_db.py
# Milestone 9: The Long-Term Memory (Hippocampus & Neocortex)
# Responsibilities:
# 1) Persist episodes for "seen similar situation" retrieval
# 2) Persist semantic rules/biases for constraint injection

import os
import sys
import hashlib
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schema.db_memory import MemoryRecord, MemorySearchResult
from schema.payload import ObservationPayload


try:
    import chromadb
    CHROMADB_AVAILABLE = True
    print("[VectorDB] ChromaDB available, using persistent storage")
except ImportError:
    CHROMADB_AVAILABLE = False
    print("[VectorDB] ChromaDB not available, using in-memory mock mode")

    class MockCollection:
        def __init__(self):
            self._count = 0

        def count(self):
            return self._count

        def add(self, documents=None, metadatas=None, ids=None):
            self._count += 1

        def upsert(self, documents=None, metadatas=None, ids=None):
            self._count += 1

        def query(self, query_texts=None, n_results=None, where=None):
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}


class VectorDBService:
    def __init__(self, db_path: str = "./chroma_db"):
        print(f"[VectorDB] Initializing memory at {db_path}...")

        if not CHROMADB_AVAILABLE:
            self.client = None
            self.episodes_collection = MockCollection()
            self.semantics_collection = MockCollection()
            print("[VectorDB] Mock mode enabled")
            return

        self.client = chromadb.PersistentClient(path=db_path)

        self.episodes_collection = self.client.get_or_create_collection(
            name="neuro_episodes",
            metadata={"hnsw:space": "cosine"},
        )

        self.semantics_collection = self.client.get_or_create_collection(
            name="neuro_semantics",
            metadata={"hnsw:space": "cosine"},
        )

        print(
            f"[VectorDB] Memory loaded. Episodes: {self.episodes_collection.count()}, "
            f"Semantics: {self.semantics_collection.count()}"
        )

    # ==========================================
    # Episodic Memory
    # ==========================================

    def _serialize_observation(self, obs: ObservationPayload) -> str:
        nearby_str = ", ".join([f"{o.id}({o.state})" for o in obs.nearby_objects])
        return (
            f"Location: {obs.agent.location}. "
            f"Nearby: {nearby_str}. "
            f"Holding: {obs.agent.holding}. "
            f"Task: {obs.global_task}"
        )

    def add_episode(self, episode_id, pre_obs, action, result):
        record = MemoryRecord(
            embedding_text=self._serialize_observation(pre_obs),
            session_id=pre_obs.session_id,
            episode_id=episode_id,
            step_id=pre_obs.step_id,
            timestamp=pre_obs.timestamp,
            action_type=action.type,
            target=action.target_item or "None",
            success=result.success,
            failure_reason=result.failure_reason,
            raw_observation_json=pre_obs.model_dump_json(),
        )

        payload = record.to_chroma_payload()
        self.episodes_collection.add(**payload)

    def query_similar_failures(self, current_obs: ObservationPayload, top_k: int = 3) -> List[MemorySearchResult]:
        query_text = self._serialize_observation(current_obs)

        results = self.episodes_collection.query(
            query_texts=[query_text],
            n_results=top_k,
            where={"success": False},
        )

        ids = results["ids"][0] if results["ids"] else []
        docs = results["documents"][0] if results["documents"] else []
        metas = results["metadatas"][0] if results["metadatas"] else []
        dists = results["distances"][0] if results["distances"] else []

        return [
            MemorySearchResult(
                id=ids[i],
                distance=dists[i],
                content=docs[i],
                metadata=metas[i],
            )
            for i in range(len(ids))
        ]

    # ==========================================
    # Semantic Memory
    # ==========================================

    @staticmethod
    def _normalize_rule(rule_content: str) -> str:
        return " ".join(rule_content.strip().split()).lower()

    @classmethod
    def _stable_rule_id(cls, rule_content: str) -> str:
        digest = hashlib.sha1(cls._normalize_rule(rule_content).encode("utf-8")).hexdigest()
        return f"rule_{digest[:16]}"

    def add_semantic_rule(self, rule_content: str, source: str = "manual"):
        rule_id = self._stable_rule_id(rule_content)
        if hasattr(self.semantics_collection, "upsert"):
            self.semantics_collection.upsert(
                documents=[rule_content],
                metadatas=[{"source": source}],
                ids=[rule_id],
            )
        else:
            self.semantics_collection.add(
                documents=[rule_content],
                metadatas=[{"source": source}],
                ids=[rule_id],
            )
        print(f"[VectorDB] Learned new rule: {rule_content}")

    def query_relevant_rules(self, query_context: str, top_k: int = 2) -> List[str]:
        results = self.semantics_collection.query(
            query_texts=[query_context],
            n_results=max(top_k * 2, top_k),
        )

        rules: List[str] = []
        if results["documents"] and results["documents"][0]:
            raw_rules = results["documents"][0]
            seen = set()
            for rule in raw_rules:
                key = self._normalize_rule(rule)
                if key in seen:
                    continue
                seen.add(key)
                rules.append(rule)
                if len(rules) >= top_k:
                    break

        return rules


vector_db = VectorDBService()
