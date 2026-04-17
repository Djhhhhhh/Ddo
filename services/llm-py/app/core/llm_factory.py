"""
LangChain LLM Factory - "大脑"层

负责：
- 模型实例创建和管理
- 提示模板管理
- 链式调用编排
- 记忆管理
"""

from typing import Optional, List, Dict, Any, AsyncGenerator
from functools import lru_cache

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSerializable

from app.core.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class LLMFactoryError(Exception):
    """LLM Factory related errors."""
    pass


class LLMFactory:
    """
    LangChain LLM Factory.

    Responsibilities:
    1. Create and manage ChatModel instances
    2. Build prompt templates
    3. Compose chains for different use cases
    4. Manage conversation memory
    """

    def __init__(self):
        self.settings = get_settings()
        self._model_cache: Dict[str, Any] = {}

    def _create_chat_model(self, model: Optional[str] = None, temperature: float = 0.7):
        """
        Create a ChatModel instance using OpenRouter.

        Args:
            model: Model ID, defaults to settings.llm_default_model
            temperature: Sampling temperature

        Returns:
            ChatOpenRouter instance
        """
        model_id = model or self.settings.llm_default_model

        if not self.settings.openrouter_enabled:
            raise LLMFactoryError(
                "DDO_OPENROUTER_API_KEY not configured. "
                "Please set your OpenRouter API key."
            )

        if not model_id:
            raise LLMFactoryError(
                "No LLM model specified. Please set DDO_LLM_MODEL environment variable "
                "or provide 'model' parameter. "
                "Example: DDO_LLM_MODEL=anthropic/claude-3.5-sonnet"
            )

        try:
            from langchain_openrouter import ChatOpenRouter

            chat_model = ChatOpenRouter(
                model=model_id,
                api_key=self.settings.openrouter_api_key,
                temperature=temperature,
            )
            logger.debug(f"[llm_factory] Created ChatOpenRouter model={model_id}")
            return chat_model

        except ImportError:
            # Fallback: use ChatOpenAI with OpenRouter base URL
            from langchain_openai import ChatOpenAI

            chat_model = ChatOpenAI(
                model=model_id,
                api_key=self.settings.openrouter_api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=temperature,
            )
            logger.debug(f"[llm_factory] Created ChatOpenAI model={model_id} (OpenRouter)")
            return chat_model

    def create_chat_chain(
        self,
        model: Optional[str] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
    ) -> RunnableSerializable:
        """
        Create a simple chat completion chain.

        Chain: Prompt Template → ChatModel → OutputParser

        Args:
            model: Model ID
            temperature: Sampling temperature
            system_prompt: Optional system prompt

        Returns:
            Runnable chain
        """
        # Create model
        chat_model = self._create_chat_model(model, temperature)

        # Build prompt template
        if system_prompt:
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                MessagesPlaceholder(variable_name="messages"),
            ])
        else:
            prompt = ChatPromptTemplate.from_messages([
                MessagesPlaceholder(variable_name="messages"),
            ])

        # Compose chain: Prompt → Model → Parser
        chain = prompt | chat_model | StrOutputParser()

        return chain

    def create_rag_chain(
        self,
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> RunnableSerializable:
        """
        Create a RAG (Retrieval Augmented Generation) chain.

        Chain: Context + Question → Prompt → Model → Parser

        Args:
            model: Model ID
            temperature: Sampling temperature

        Returns:
            Runnable chain
        """
        chat_model = self._create_chat_model(model, temperature)

        # RAG prompt template with context
        rag_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Use the following context to answer the question:\n\n{context}"),
            ("human", "{question}"),
        ])

        chain = rag_prompt | chat_model | StrOutputParser()

        return chain

    def create_knowledge_analysis_chain(
        self,
        model: Optional[str] = None,
        context: str = "knowledge_base",
    ) -> RunnableSerializable:
        """
        Create a knowledge analysis chain for extracting tags and categories.

        Chain: Text → Structured Prompt → Model → JSON Parser

        Args:
            model: Model ID
            context: Analysis context (e.g., "knowledge_base")

        Returns:
            Runnable chain that extracts tags and categories
        """
        chat_model = self._create_chat_model(model, temperature=0.3)

        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """你是一个知识库管理员。请分析以下知识内容，提取：

1. tags（标签）：3~8个，简短描述性词汇，用于"精确检索"
2. categories（分类）：1~3个，宽泛组织词汇，用于"按领域浏览"
3. is_new_categories：每个分类是否需要新建（如果系统中还没有该分类则为 true）
4. suggested_reply：给用户的建议回复

输出 JSON 格式（不要使用 markdown 包裹）：
{{
    "tags": ["tag1", "tag2", ...],
    "categories": ["分类1", "分类2", ...],
    "is_new_categories": [false, true, ...],
    "suggested_reply": "..."
}}

注意：
- tags 使用英文逗号分隔的词汇
- categories 使用中文分类名称
- 如果内容无法归类到任何现有分类，is_new_categories 对应位置设为 true"""),
            ("human", "{text}"),
        ])

        import json

        def parse_analysis_output(output: str) -> dict:
            """Parse JSON from model output."""
            if isinstance(output, dict):
                return _normalize_result(output)

            text = output.strip()

            # Try direct JSON parsing
            try:
                result = json.loads(text)
                return _normalize_result(result)
            except json.JSONDecodeError:
                pass

            # Try extracting JSON from markdown code blocks
            if "```json" in text:
                json_text = text.split("```json")[1].split("```")[0].strip()
                try:
                    result = json.loads(json_text)
                    return _normalize_result(result)
                except:
                    pass

            if "```" in text:
                json_text = text.split("```")[1].split("```")[0].strip()
                try:
                    result = json.loads(json_text)
                    return _normalize_result(result)
                except:
                    pass

            # Fallback: return empty result
            return {
                "tags": [],
                "categories": [],
                "is_new_categories": [],
                "suggested_reply": "分析失败，请手动添加标签和分类",
            }

        def _normalize_result(result: dict) -> dict:
            """Normalize tags and categories to always be lists."""
            # Handle tags - may be string or list
            tags = result.get("tags")
            if isinstance(tags, str):
                # Split comma-separated string into list
                result["tags"] = [t.strip() for t in tags.split(",") if t.strip()]
            elif not isinstance(tags, list):
                result["tags"] = []

            # Handle categories - may be string or list
            categories = result.get("categories")
            if isinstance(categories, str):
                result["categories"] = [c.strip() for c in categories.split(",") if c.strip()]
            elif not isinstance(categories, list):
                result["categories"] = []

            # Ensure is_new_categories is list
            is_new = result.get("is_new_categories")
            if not isinstance(is_new, list):
                result["is_new_categories"] = [False] * len(result.get("categories", []))

            return result

        from langchain_core.output_parsers import StrOutputParser

        chain = analysis_prompt | chat_model | StrOutputParser() | parse_analysis_output

        return chain

    def create_nlp_intent_chain(self, model: Optional[str] = None) -> RunnableSerializable:
        """
        Create an NLP intent recognition chain.

        Chain: Text → Structured Prompt → Model → JSON Parser

        Args:
            model: Model ID

        Returns:
            Runnable chain that extracts intent and entities
        """
        chat_model = self._create_chat_model(model, temperature=0.1)

        intent_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an intent recognition assistant.
Analyze the user's input and extract:
1. intent: The main intent (e.g., "timer.create", "kb.add", "chat")
2. parameters: Relevant parameters as key-value pairs
3. reply: A friendly response to the user

**IMPORTANT - Parameter Naming Convention**:
- Use "title" for knowledge base entry title
- Use "content" for knowledge base entry content
- Use "tags" for tags array (comma-separated string)
- Use "cron" for cron expression (e.g., "0 * * * *")
- Use "url" for callback URL
- Use "name" for entity name
- Use "method" for HTTP method (GET/POST/PUT/DELETE)

**IMPORTANT - Return a FLAT JSON object only**:
- Do NOT nest parameters inside "params", "data", or "metadata"
- Always return parameters directly in the top-level object
- Example: parameters with title and content at top level

Respond in JSON format with no markdown formatting."""),
            ("human", "{text}"),
        ])

        # Chain returns string, parse manually to handle different model outputs
        from langchain_core.output_parsers import StrOutputParser
        import json

        def parse_json_output(output: str) -> dict:
            """Parse JSON from model output, handling various formats."""
            if isinstance(output, dict):
                return output

            text = output.strip()

            # Try direct JSON parsing
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass

            # Try extracting JSON from markdown code blocks
            if "```json" in text:
                json_text = text.split("```json")[1].split("```")[0].strip()
                try:
                    return json.loads(json_text)
                except:
                    pass

            if "```" in text:
                json_text = text.split("```")[1].split("```")[0].strip()
                try:
                    return json.loads(json_text)
                except:
                    pass

            # Fallback: wrap in generic structure
            return {
                "intent": "unknown",
                "parameters": {},
                "reply": text
            }

        # Use string parser + custom formatter
        chain = intent_prompt | chat_model | StrOutputParser() | parse_json_output

        return chain

    @staticmethod
    def convert_messages_to_langchain(messages: List[Dict[str, str]]) -> List[Any]:
        """
        Convert API message format to LangChain message format.

        Args:
            messages: List of {"role": "user|assistant|system", "content": "..."}

        Returns:
            List of LangChain message objects
        """
        lc_messages = []
        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:  # user or default
                lc_messages.append(HumanMessage(content=content))

        return lc_messages

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response.

        Args:
            messages: Conversation history
            model: Model ID
            temperature: Sampling temperature
            system_prompt: Optional system prompt

        Yields:
            Response content chunks
        """
        chain = self.create_chat_chain(model, temperature, system_prompt)
        lc_messages = self.convert_messages_to_langchain(messages)

        async for chunk in chain.astream({"messages": lc_messages}):
            yield chunk

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Non-streaming chat completion.

        Args:
            messages: Conversation history
            model: Model ID
            temperature: Sampling temperature
            system_prompt: Optional system prompt

        Returns:
            Complete response text
        """
        chain = self.create_chat_chain(model, temperature, system_prompt)
        lc_messages = self.convert_messages_to_langchain(messages)

        response = await chain.ainvoke({"messages": lc_messages})
        return response


# Global factory instance
_llm_factory: Optional[LLMFactory] = None


def get_llm_factory() -> LLMFactory:
    """Get or create global LLM Factory."""
    global _llm_factory
    if _llm_factory is None:
        _llm_factory = LLMFactory()
    return _llm_factory
