# 在 adl-backend 目录下创建 debug_rules.py
from service.vector_db import vector_db

# 查看规则总数
print(f"📘 Total semantic rules: {vector_db.semantics_collection.count()}")

# 查询所有规则（设置一个大的 n_results）
results = vector_db.semantics_collection.query(
    query_texts=["show me all rules"],  # 随便一个查询
    n_results=100  # 获取最多100条
)

print("\n=== All Semantic Rules ===")
if results["documents"] and results["documents"][0]:
    for idx, rule in enumerate(results["documents"][0], 1):
        metadata = results["metadatas"][0][idx-1] if results["metadatas"] else {}
        distance = results["distances"][0][idx-1] if results["distances"] else "N/A"
        print(f"\n[{idx}] Distance: {distance:.4f}")
        print(f"    Source: {metadata.get('source', 'unknown')}")
        print(f"    Rule: {rule}")
else:
    print("No rules found!")