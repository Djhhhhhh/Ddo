"""
Intent Recognition Chain - 意图识别链

负责：
- 分析用户输入意图
- 判断是否需要知识库检索
- 提取实体和参数
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSerializable

from app.core.llm_factory import LLMFactory, get_llm_factory
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IntentResult(BaseModel):
    """意图识别结果"""
    intent: str = Field(..., description="主意图类型")
    sub_intent: str = Field(default="", description="子意图")
    need_knowledge: bool = Field(default=False, description="是否需要知识库检索")
    confidence: float = Field(default=0.0, ge=0, le=1, description="置信度")
    entities: List[Dict[str, Any]] = Field(default_factory=list, description="提取的实体")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="提取的参数")
    suggested_reply: str = Field(default="", description="给用户的建议回复")


INTENT_RECOGNITION_PROMPT = """你是一个智能助手的意图识别模块。请分析用户输入，判断：
1. 用户的主要意图是什么？
2. 是否需要检索知识库才能回答？
3. 提取关键实体和参数

## 意图分类

### 对话类 (chat)
- 问候、闲聊 "你好" / "在吗"
- 简单问答 "今天几号" / "你会什么"
- 无明确知识需求的开放式对话

### 知识查询类 (knowledge.query)
- 询问已有知识 "怎么配置xxx" / "xxx的原理是什么"
- 需要基于已有知识库回答的问题
- **需要知识库检索**

### 知识添加类 (knowledge.add)
- 保存信息 "帮我记一下..." / "添加知识库"
- 要求记录内容
- **工具调用**，打开添加向导

### 定时任务类 (timer.add)
- 创建定时任务 "每小时提醒我..."
- **工具调用**，打开timer添加

### 定时任务查询 (timer.list)
- 查看任务列表 "有哪些定时任务"
- **工具调用**

## 知识需求判断 (need_knowledge)

回答以下问题判断是否需要知识检索：
- 这个问题是否涉及专业领域知识？
- 回答是否需要参考已有文档/笔记？
- 如果仅凭常识能回答，则不需要

## 输出格式

只输出JSON，格式如下：
{{
    "intent": "knowledge.query",
    "sub_intent": "how_to",
    "need_knowledge": true,
    "confidence": 0.95,
    "entities": [
        {{"type": "topic", "value": "定时任务配置"}}
    ],
    "parameters": {{
        "topic": "定时任务配置",
        "frequency": "每小时"
    }},
    "suggested_reply": "我来帮您查找定时任务的配置方法..."
}}

## 示例

输入: "你好"
输出:
{{
    "intent": "chat.greeting",
    "sub_intent": "",
    "need_knowledge": false,
    "confidence": 1.0,
    "entities": [],
    "parameters": {{}},
    "suggested_reply": "你好！有什么可以帮助你的吗？"
}}

输入: "怎么配置定时任务每小时执行一次？"
输出:
{{
    "intent": "knowledge.query",
    "sub_intent": "how_to",
    "need_knowledge": true,
    "confidence": 0.93,
    "entities": [
        {{"type": "feature", "value": "定时任务"}},
        {{"type": "schedule", "value": "每小时"}}
    ],
    "parameters": {{
        "feature": "定时任务",
        "cron": "0 * * * *"
    }},
    "suggested_reply": "我来查找定时任务的配置方法..."
}}

请分析以下用户输入：

{text}

只输出JSON，不要其他解释。"""


class IntentRecognitionChain:
    """意图识别链"""

    def __init__(self, model: Optional[str] = None):
        self.factory = get_llm_factory()
        self.model = model
        self._chain: Optional[RunnableSerializable] = None

    def _get_chain(self) -> RunnableSerializable:
        if self._chain is None:
            chat_model = self.factory._create_chat_model(self.model, temperature=0.1)

            prompt = ChatPromptTemplate.from_messages([
                ("system", INTENT_RECOGNITION_PROMPT),
                ("human", "{text}"),
            ])

            self._chain = prompt | chat_model | StrOutputParser()

        return self._chain

    async def recognize(self, text: str) -> IntentResult:
        """
        识别用户输入的意图

        Args:
            text: 用户输入文本

        Returns:
            IntentResult: 意图识别结果
        """
        logger.info(f"[intent_recognize] text_length={len(text)}")

        try:
            chain = self._get_chain()
            output = await chain.ainvoke({"text": text})

            # 解析JSON输出
            result_dict = self._parse_output(output)

            # 构建结果对象
            result = IntentResult(
                intent=result_dict.get("intent", "unknown"),
                sub_intent=result_dict.get("sub_intent", ""),
                need_knowledge=result_dict.get("need_knowledge", False),
                confidence=result_dict.get("confidence", 0.0),
                entities=result_dict.get("entities", []),
                parameters=result_dict.get("parameters", {}),
                suggested_reply=result_dict.get("suggested_reply", ""),
            )

            logger.info(f"[intent_complete] intent={result.intent} need_knowledge={result.need_knowledge} confidence={result.confidence}")

            return result

        except Exception as e:
            logger.error(f"[intent_error] error={str(e)}")
            # 返回默认结果
            return IntentResult(
                intent="unknown",
                confidence=0.0,
                suggested_reply="抱歉，我理解您的意思时出了问题。"
            )

    def _parse_output(self, output: str) -> Dict[str, Any]:
        """解析模型输出"""
        import json

        if isinstance(output, dict):
            return output

        text = output.strip()

        # 尝试直接JSON解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 尝试从markdown代码块提取
        if "```json" in text:
            try:
                json_text = text.split("```json")[1].split("```")[0].strip()
                return json.loads(json_text)
            except:
                pass

        if "```" in text:
            try:
                json_text = text.split("```")[1].split("```")[0].strip()
                return json.loads(json_text)
            except:
                pass

        # 查找JSON对象
        try:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                return json.loads(text[start:end+1])
        except:
            pass

        # 兜底：返回基础结构
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "need_knowledge": False,
            "entities": [],
            "parameters": {},
            "suggested_reply": text[:100] if text else ""
        }


# 全局实例
_intent_chain: Optional[IntentRecognitionChain] = None


def get_intent_chain(model: Optional[str] = None) -> IntentRecognitionChain:
    """获取意图识别链实例"""
    global _intent_chain
    if _intent_chain is None:
        _intent_chain = IntentRecognitionChain(model)
    return _intent_chain
