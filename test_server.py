# test_server.py
# 这是一个独立的测试服务器，用来验证端口和数据格式
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# 1. 允许跨域 (CORS) - 允许前端从任意地方访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 定义一个简单的数据模型 (Schema)
# 如果前端发的 JSON 不包含 "msg" 字段，这里就会报 422
class TestPayload(BaseModel):
    msg: str
    count: int

@app.get("/")
def read_root():
    return {"status": "Server is running!"}

@app.post("/api/ping")
def ping(data: TestPayload):
    print(f"✅ [Server Received]: {data}")
    return {
        "reply": f"I received: {data.msg}", 
        "new_count": data.count + 1
    }

if __name__ == "__main__":
    # 强制监听 127.0.0.1:8000
    print("🚀 Test Server starting on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)