"""
NLP Intent Recognition API - "大门"层

FastAPI 职责：
- HTTP 路由和请求验证
- 请求/响应序列化
- 错误处理

NLP 逻辑由 LangChain "大脑"层处理 (app/core/llm_factory.py, app/core/chains/)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.core.llm_factory import get_llm_factory, LLMFactoryError
from app.core.chains.intent_chain import get_intent_chain, IntentResult
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class NLPRequest(BaseModel):
    """NLP intent recognition request."""

    text: str = Field(..., description="User input text to analyze")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional context")
    model: Optional[str] = Field(None, description="Model ID for intent recognition")


class Entity(BaseModel):
    """Extracted entity."""

    type: str = Field(..., description="Entity type")
    value: str = Field(..., description="Entity value")
    start: Optional[int] = Field(None, description="Start position in text")
    end: Optional[int] = Field(None, description="End position in text")


class NLPResponse(BaseModel):
    """NLP processing response with LangChain intent analysis."""

    intent: str = Field(..., description="Detected intent (e.g., 'timer.create', 'kb.add', 'chat')")
    confidence: float = Field(default=0.9, ge=0, le=1, description="Confidence score")
    entities: List[Entity] = Field(default_factory=list, description="Extracted entities")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Extracted parameters")
    reply: str = Field(default="", description="Suggested reply to user")


class IntentRecognitionRequest(BaseModel):
    """意图识别请求"""
    text: str = Field(..., description="用户输入文本", min_length=1)
    model: Optional[str] = Field(None, description="模型ID")
    context: Optional[Dict[str, Any]] = Field(None, description="可选上下文")


class IntentRecognitionResponse(BaseModel):
    """意图识别响应"""
    intent: str = Field(..., description="主意图类型")
    sub_intent: str = Field(default="", description="子意图")
    need_knowledge: bool = Field(default=False, description="是否需要知识库检索")
    confidence: float = Field(default=0.0, description="置信度 (0-1)")
    entities: List[Dict[str, Any]] = Field(default_factory=list, description="提取的实体")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="提取的参数")
    suggested_reply: str = Field(default="", description="建议回复")


@router.post(
    "/",
    response_model=NLPResponse,
    status_code=status.HTTP_200_OK,
    summary="NLP processing",
    description="Process natural language text and extract intent/entities using LangChain.",
)
async def nlp_process(request: NLPRequest) -> NLPResponse:
    """
    NLP processing endpoint for CLI command interpretation.

    Uses LangChain for structured output parsing and intent recognition.

    Args:
        request: NLP request with text to analyze.

    Returns:
        NLP response with intent, entities, and parameters.
    """
    factory = get_llm_factory()

    try:
        # Create NLP chain from LangChain brain
        chain = factory.create_nlp_intent_chain(model=request.model)

        logger.info(f"[nlp_analyze] text_length={len(request.text)}")

        # Execute LangChain analysis
        result = await chain.ainvoke({"text": request.text})

        intent = result.get("intent", "unknown")
        logger.info(f"[nlp_complete] intent={intent}")

        # Convert entities if present
        entities = []
        if "entities" in result:
            for ent in result.get("entities", []):
                entities.append(Entity(
                    type=ent.get("type", "unknown"),
                    value=ent.get("value", ""),
                    start=ent.get("start"),
                    end=ent.get("end"),
                ))

        return NLPResponse(
            intent=intent,
            confidence=result.get("confidence", 0.9),
            entities=entities,
            parameters=result.get("parameters", {}),
            reply=result.get("reply", ""),
        )

    except LLMFactoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"NLP configuration error: {e}",
        )
    except Exception as e:
        logger.error(f"[nlp_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NLP processing error: {str(e)}",
        )


@router.post(
    "/intent",
    response_model=IntentRecognitionResponse,
    status_code=status.HTTP_200_OK,
    summary="意图识别",
    description="分析用户输入意图，判断是否需要知识库检索",
)
async def intent_recognition(request: IntentRecognitionRequest) -> IntentRecognitionResponse:
    """
    意图识别API - RAG意图路由的核心组件

    分析用户输入，返回：
    - 意图类型 (intent)
    - 是否需要知识库 (need_knowledge)
    - 置信度 (confidence)
    - 提取的实体和参数

    Args:
        request: 包含用户输入文本的请求

    Returns:
        IntentRecognitionResponse: 意图识别结果
    """
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文本内容不能为空"
        )

    try:
        # 使用意图识别链
        intent_chain = get_intent_chain(model=request.model)
        result: IntentResult = await intent_chain.recognize(request.text)

        return IntentRecognitionResponse(
            intent=result.intent,
            sub_intent=result.sub_intent,
            need_knowledge=result.need_knowledge,
            confidence=result.confidence,
            entities=result.entities,
            parameters=result.parameters,
            suggested_reply=result.suggested_reply,
        )

    except LLMFactoryError as e:
        logger.error(f"[intent_recognition_config_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"意图识别配置错误: {e}",
        )
    except Exception as e:
        logger.error(f"[intent_recognition_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"意图识别失败: {str(e)}",
        )


class NLPParseRequest(BaseModel):
    """NLP parse request for command parsing."""

    command: str = Field(..., description="Command string to parse")
    available_commands: List[str] = Field(default_factory=list, description="Available command patterns")
    model: Optional[str] = Field(None, description="Model ID for parsing")


class NLPParseResponse(BaseModel):
    """NLP parse response."""

    command: str = Field(..., description="Matched command")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Parsed arguments")
    is_ambiguous: bool = Field(False, description="Whether the command is ambiguous")
    suggestions: List[str] = Field(default_factory=list, description="Suggested commands if ambiguous")


@router.post(
    "/parse",
    response_model=NLPParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse command",
    description="Parse a natural language command into structured command and arguments using LangChain.",
)
async def nlp_parse(request: NLPParseRequest) -> NLPParseResponse:
    """
    NLP command parsing endpoint.

    Uses LangChain to match natural language to available commands.

    Args:
        request: Parse request with command string.

    Returns:
        Parsed command with arguments.
    """
    factory = get_llm_factory()

    try:
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import JsonOutputParser

        # Create parsing chain
        chat_model = factory._create_chat_model(request.model, temperature=0.1)

        parse_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a command parser. Match the user's input to the most appropriate command.

Available commands: {available_commands}

Respond in JSON format:
{{
    "command": "matched_command",
    "arguments": {{"arg1": "value1"}},
    "is_ambiguous": false,
    "suggestions": []
}}"""),
            ("human", "{command}"),
        ])

        chain = parse_prompt | chat_model | JsonOutputParser()

        logger.info(f"[nlp_parse] command_length={len(request.command)}")

        result = await chain.ainvoke({
            "command": request.command,
            "available_commands": ", ".join(request.available_commands) if request.available_commands else "None specified",
        })

        logger.info(f"[nlp_parse_complete] matched={result.get('command')}")

        return NLPParseResponse(
            command=result.get("command", "unknown"),
            arguments=result.get("arguments", {}),
            is_ambiguous=result.get("is_ambiguous", False),
            suggestions=result.get("suggestions", []),
        )

    except LLMFactoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"NLP configuration error: {e}",
        )
    except Exception as e:
        logger.error(f"[nlp_parse_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"NLP parsing error: {str(e)}",
        )
