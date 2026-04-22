"""
Knowledge Analysis API - "大门"层

FastAPI 职责：
- HTTP 路由和请求验证
- 请求/响应序列化
- 错误处理

知识分析逻辑由 LangChain "大脑"层处理 (app/core/llm_factory.py)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

from app.core.llm_factory import get_llm_factory, LLMFactoryError
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class AnalyzeRequest(BaseModel):
    """知识分析请求。"""

    content: str = Field(..., description="知识内容")
    title: Optional[str] = Field(None, description="知识标题")
    context: Optional[str] = Field("knowledge_base", description="分析上下文")


class AnalyzeResponse(BaseModel):
    """知识分析响应。"""

    tags: List[str] = Field(..., description="推荐标签列表")
    categories: List[str] = Field(..., description="推荐分类列表")
    is_new_categories: List[bool] = Field(..., description="对应分类是否为新创建")
    suggested_reply: str = Field(default="", description="建议回复")


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze knowledge content",
    description="Analyze knowledge content and extract tags and categories.",
)
async def analyze_knowledge(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    分析知识内容，提取标签和分类。

    Args:
        request: 包含 content 和 title 的分析请求。

    Returns:
        分析结果，包含 tags、categories、是否为新分类、建议回复。
    """
    factory = get_llm_factory()

    try:
        # 构建要分析的文本
        text_to_analyze = f"标题: {request.title}\n内容: {request.content}" if request.title else request.content

        logger.info(f"[analyze_knowledge] content_length={len(request.content)}")

        # 使用 LLM 分析
        chain = factory.create_knowledge_analysis_chain(context=request.context)

        result = await chain.ainvoke({"text": text_to_analyze})

        tags = result.get("tags", [])
        categories = result.get("categories", [])
        is_new_categories = result.get("is_new_categories", [False] * len(categories))
        suggested_reply = result.get("suggested_reply", "")

        logger.info(f"[analyze_complete] tags_count={len(tags)}, categories_count={len(categories)}")

        return AnalyzeResponse(
            tags=tags,
            categories=categories,
            is_new_categories=is_new_categories,
            suggested_reply=suggested_reply,
        )

    except LLMFactoryError as e:
        logger.error(f"[analyze_llm_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LLM configuration error: {e}",
        )
    except Exception as e:
        logger.error(f"[analyze_error] error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Knowledge analysis error: {str(e)}",
        )