# app.py
# Milestone 5: Pure I/O Layer
# 没有任何业务逻辑，只有 HTTP 协议转换

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schema.payload import ObservationPayload
import core.agent as agent  # 👈 唯一依赖

app = FastAPI()

# CORS 设置 (保持不变)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "COALA Agent System Online"}

from schema.payload import ObservationPayload, AgentStepResponse # 导入

@app.post("/api/tick", response_model=AgentStepResponse) # ✅ FastAPI 文档会自动更新
async def tick(obs: ObservationPayload):
    return await agent.step(obs)

if __name__ == "__main__":
    print("⚡ COALA I/O Layer Starting...")
    # 生产环境/CLI 兼容模式
    uvicorn.run(app, host="127.0.0.1", port=8001)