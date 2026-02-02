import os
import sys
from openai import OpenAI
from colorama import Fore, Style, init

# 初始化颜色输出（Windows上必须）
init(autoreset=True)

# 配置 DeepSeek
client = OpenAI(
    api_key="sk-9ec782025abd4c72ad1e2de862d26cd4",
    base_url="https://api.deepseek.com/v1"
)

def chat_loop():
    print(f"{Fore.CYAN}=== DeepSeek Terminal (V3) ==={Style.RESET_ALL}")
    print("输入 'exit' 退出，输入 'r1' 切换到深度思考模型\n")

    model = "deepseek-chat"
    history = [
        {"role": "system", "content": "你是一个资深全栈工程师，擅长React, Three.js和Unity。请直接给出代码，不要废话。"}
    ]

    while True:
        try:
            user_input = input(f"{Fore.GREEN}You: {Style.RESET_ALL}")
            if not user_input: continue
            if user_input.lower() in ["exit", "quit"]: break
            
            # 切换模型的小彩蛋
            if user_input.lower() == "r1":
                model = "deepseek-reasoner"
                print(f"{Fore.YELLOW}已切换到 DeepSeek-R1 (推理模型){Style.RESET_ALL}")
                continue

            history.append({"role": "user", "content": user_input})

            print(f"{Fore.BLUE}DeepSeek: {Style.RESET_ALL}", end="", flush=True)
            
            # 流式输出 (Streaming) - 这才是灵魂！
            stream = client.chat.completions.create(
                model=model,
                messages=history,
                stream=True
            )

            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    print(content, end="", flush=True)
                    full_response += content
            
            print("\n")
            history.append({"role": "assistant", "content": full_response})

        except KeyboardInterrupt:
            print("\nBye!")
            break
        except Exception as e:
            print(f"\n{Fore.RED}Error: {e}{Style.RESET_ALL}")

def one_shot_chat(prompt):
    """处理单次命令行提问"""
    try:
        # 1. 拼接命令行参数（比如 ds 怎么 居中 div）
        full_prompt = " ".join(prompt)
        
        print(f"{Fore.BLUE}DeepSeek (One-Shot): {Style.RESET_ALL}", end="", flush=True)
        
        # 2. 发送请求
        stream = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个命令行助手，请直接给出简洁的代码或命令，不要废话。"},
                {"role": "user", "content": full_prompt}
            ],
            stream=True
        )

        # 3. 流式输出
        for chunk in stream:
            if chunk.choices[0].delta.content:
                print(chunk.choices[0].delta.content, end="", flush=True)
        print("\n")
        
    except Exception as e:
        print(f"\n{Fore.RED}Error: {e}{Style.RESET_ALL}")

if __name__ == "__main__":
    # 如果用户后面跟了参数（例如 python ds.py 这里的字）
    if len(sys.argv) > 1:
        one_shot_chat(sys.argv[1:])
    # 如果没参数，进入交互模式
    else:
        chat_loop()