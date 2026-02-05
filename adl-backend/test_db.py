# test_db.py
from service.vector_db import vector_db

# 看看刚才存了多少
print("Total Episodes:", vector_db.episodes_collection.count())

# 假装这是 M9 的检索
results = vector_db.query_relevant_rules("I am at table_center")
print("Relevant Rules:", results)