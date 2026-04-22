"""
Chains - LangChain 链式调用封装

提供各种特定用途的LangChain Chain：
- IntentRecognitionChain: 意图识别
"""

from .intent_chain import IntentRecognitionChain, IntentResult, get_intent_chain

__all__ = [
    "IntentRecognitionChain",
    "IntentResult",
    "get_intent_chain",
]
