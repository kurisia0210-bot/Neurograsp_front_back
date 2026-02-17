"""
推理引擎路由
保持向后兼容，调用 reasoning_v1.py
"""

from schema.payload import ObservationPayload, ActionPayload
from core.reasoning_v1 import analyze_and_propose as analyze_and_propose_v1

# 简单路由：直接调用 v1 引擎
async def analyze_and_propose(obs: ObservationPayload) -> ActionPayload:
    """
    向后兼容的全局函数接口
    直接调用 reasoning_v1.py 的 analyze_and_propose
    """
    return await analyze_and_propose_v1(obs)

# 导出其他可能需要的方法（保持向后兼容）
__all__ = ['analyze_and_propose']