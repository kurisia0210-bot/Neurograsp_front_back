# services/llm_client.py
# Milestone 6: Pure Language Capability
# 职责：只负责网络通信和基础的文本交换。不知道 Agent 的存在。

import os
from openai import OpenAI, APIConnectionError, RateLimitError
from dotenv import load_dotenv

# 配置 (从环境变量读取更安全，这里为了方便硬编码)
load_dotenv()
API_KEY = os.getenv("DEEPSEEK_API_KEY")
BASE_URL = "https://api.deepseek.com"
if not API_KEY:
    raise ValueError("API Key not found! Check your .env file.")

# 初始化客户端
try:
    client = OpenAI(api_key=API_KEY, base_url=BASE_URL)
except Exception as e:
    print(f"⚠️ LLM Client Init Failed: {e}")
    client = None

async def get_completion(messages: list, model: str = "deepseek-chat", temperature: float = 0.1) -> str:
    """
    通用的大模型调用接口。
    Input: 消息列表
    Output: 纯文本内容 (String)
    """
    if not client:
        raise RuntimeError("LLM Client not initialized")

    try:
        # 同步调用 SDK (FastAPI 会自动在线程池运行)
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=500, # 给够思考空间
            stream=False
        )
        return response.choices[0].message.content

    except APIConnectionError:
        print("💥 Network Error: Cannot connect to DeepSeek")
        return ""
    except RateLimitError:
        print("⏳ Rate Limit: Slow down")
        return ""
    except Exception as e:
        print(f"💥 LLM Unknown Error: {e}")
        return ""