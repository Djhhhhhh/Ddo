# Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：2026-04-14

## 架构规则

- **分层架构**：FastAPI "大门"层 (`app/api/`) + LangChain "大脑"层 (`app/core/`)
  - FastAPI 负责：HTTP 路由、请求验证、并发控制、部署运维
  - LangChain 负责：提示模板、模型调用、逻辑编排、流式处理（2026-04-15）
  - **RAG Embedder**：`app/core/embedder.py` 配置化 embedding 服务，支持批处理和自动重试（2026-04-15）

- FastAPI 应用结构：app/main.py 创建实例，app/api/ 存放路由，app/core/ 存放配置和核心逻辑（2026-04-14）
- 路由聚合模式：在 app/api/__init__.py 中使用 APIRouter 聚合所有子路由，统一 prefix="/api"（2026-04-14）
- 配置管理：使用 Pydantic Settings 统一处理环境变量和 .env 文件，通过 `@lru_cache` 缓存配置实例（2026-04-14）
- 生命周期管理：使用 FastAPI 的 lifespan 上下文管理器处理启动/关闭逻辑（2026-04-15）
- 占位实现：未实现的功能返回 HTTP 501，并在错误信息中注明对应的 Task ID（2026-04-14）

### LangChain 架构规则（新增）

- **LLM Factory 模式**：创建 `app/core/llm_factory.py` 统一管理模型实例创建和链式编排（2026-04-15）
- **Embedder 模式**：创建 `app/core/embedder.py` 封装 Embedding 服务，支持 OpenRouter 和批处理（2026-04-15）
- **链式调用**：使用 `|` 操作符组合 Prompt → Model → Parser 链条（2026-04-15）
- **流式处理**：使用 LangChain的 `ainvoke` / `astream` 方法，FastAPI 层只做 SSE 包装（2026-04-15）
- **提示模板**：所有系统提示必须定义为 `ChatPromptTemplate`，支持 MessagesPlaceholder（2026-04-15）
- **模型路由**：通过 `langchain-openrouter` 或 fallback 到 `ChatOpenAI` + OpenRouter base_url（2026-04-15）

### LangChain 提示词模板规则（新增 2026-04-16）

- **禁止在提示词中直接使用 JSON 示例**：LangChain 使用 `{}` 作为变量占位符，直接写 JSON 会导致 "Nested replacement fields are not allowed" 错误
- **正确做法**：
  ```python
  # 错误 ❌ - 会导致解析错误
  "Example: {'intent': 'kb.add', 'parameters': {'title': '...'}"
  
  # 正确 ✓ - 用文字描述代替
  "Example: parameters with title and content at top level"
  ```
- **如果必须展示 JSON 结构**：使用字典对象而非字符串，让模型自己序列化
- **变量占位符**：只用 `{variable_name}` 格式，不要嵌套大括号

### NLP 参数契约（新增 2026-04-16）

**意图识别（Intent Recognition）** 参数命名规范：
- KB 命令：`title`（标题）、`content`（内容）、`tags`（标签数组）
- Timer 命令：`name`（名称）、`cron`（cron 表达式）、`url`（回调 URL）、`method`（HTTP 方法）
- MCP 命令：`name`（名称）、`type`（类型）、`config`（配置）

**重要**：NLP 提示词必须强调：
1. 返回扁平 JSON 对象，禁止嵌套参数
2. 使用标准参数名（见上方规范）
3. 不使用 markdown 格式包裹 JSON

**示例提示词片段**：
```
**IMPORTANT - Parameter Naming Convention**:
- Use "title" for knowledge base entry title
- Use "content" for knowledge base entry content
- Use "cron" for cron expression

**IMPORTANT - Return a FLAT JSON object only**:
- Do NOT nest parameters inside "params", "data", or "metadata"
- Always return parameters directly in the top-level object
```

## 代码规范

- 类型注解：所有函数参数和返回值使用类型注解，请求/响应模型继承自 pydantic.BaseModel（2026-04-14）
- 路由文档：每个 endpoint 必须包含 summary 和 description，使用 Field 描述模型字段（2026-04-14）
- 日志格式：使用 [event_name] key=value 格式，便于后续日志分析（2026-04-14）
  - embedder 日志：`[embedder_start] documents=N`, `[embedder_success] duration_ms=X`
  - API 日志：`[embed_api_success] documents=N`
  - 错误日志：`[embedder_error] error_type=X message=Y`
- 配置命名：环境变量使用大写下划线，Settings 类属性使用小写下划线（2026-04-14）
- 错误处理：使用 FastAPI 的 HTTPException，明确返回合适的 HTTP 状态码（2026-04-14）
  - 400 Bad Request: 请求参数验证失败
  - 429 Too Many Requests: API 限流
  - 503 Service Unavailable: 服务临时不可用
  - 500 Internal Server Error: 内部错误
- 自定义异常：外部 API 错误封装为自定义异常类，映射到合适的 HTTP 状态码（2026-04-15）
  - EmbeddingError: 基础 embedding 异常，带 status_code 属性
  - RateLimitError: 限流错误 (429)
  - NetworkError: 网络错误 (503)
- 缓存管理：缓存需记录时间戳，支持 TTL 和手动刷新，日志记录缓存命中/未命中（2026-04-15）
## 常见陷阱

- OpenRouter API Key 不要硬编码，必须使用环境变量或 .env 文件（2026-04-14）
- Uvicorn 的 reload=True 只适合开发，生产环境必须禁用（2026-04-14）
- CORS 中间件配置：开发可用 allow_origins=["*"]，生产必须限制具体域名（2026-04-14）
- Pydantic Settings 的 `extra="ignore"` 避免未定义配置项报错（2026-04-14）
- tenacity 重试必须指定 `retry_if_exception_type`，否则默认重试所有异常可能导致死循环（2026-04-15）
- httpx.AsyncClient 流式读取必须用 `async with client.stream()` 上下文，否则连接可能泄漏（2026-04-15）
- Embedding 批处理：OpenRouter 有批量限制，必须分批处理大量文档（2026-04-15）
- **RAG Architecture Pattern**: RAG Engine 分为三层：VectorStore (存储) -> Retriever (检索) -> Generator (生成)，每个层级独立测试（2026-04-15）
- **Vector Store Abstraction**: 定义 `BaseVectorStore` 接口，支持多后端切换 (Chroma/FAISS)，通过 `get_vector_store()` 工厂方法获取实例（2026-04-15）
- **RAG Prompt Template**: 使用 LangChain `ChatPromptTemplate` 定义 RAG 系统提示，包含 Context 和 Question 变量（2026-04-15）
- **Cosine Distance Conversion**: Chroma 返回 distance，需转换为 similarity: `score = 1 - distance`（2026-04-15）

### API Endpoint 定义示例

```python
@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns service health status.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")
```
（2026-04-14）

### 配置定义示例

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: Optional[str] = Field(default=None)

    @property
    def openrouter_enabled(self) -> bool:
        return self.openrouter_api_key is not None and len(self.openrouter_api_key) > 0
```
（2026-04-14）

### 重试配置示例 (OpenRouter)

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    retry=retry_if_exception_type((httpx.NetworkError, MyRateLimitError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
async def call_api():
    # 网络错误或限流时自动重试
    pass
```
（2026-04-15）

### 流式 SSE 响应示例

```python
from fastapi.responses import StreamingResponse

async def event_stream():
    async for chunk in client.chat_completion_stream(...):
        yield f"data: {chunk}\n\n"
    yield "data: [DONE]\n\n"

return StreamingResponse(
    event_stream(),
    media_type="text/event-stream",
    headers={"Cache-Control": "no-cache"},
)
```
（2026-04-15）

### Embedder Service 使用示例

```python
from app.core.embedder import get_embedder_service

embedder = get_embedder_service()
docs = await embedder.embed_documents(
    documents=["Hello world", "Another document"],
    metadata=[{"source": "test"}, {"source": "test2"}]
)
# docs: List[DocumentEmbedding] with document_id, content, embedding, metadata
```
（2026-04-15）

### 异常处理模式

```python
try:
    result = await some_operation()
except RateLimitError as e:
    # 已重试失败，返回 429
    raise HTTPException(status_code=429, detail="Rate limited")
except NetworkError as e:
    # 已重试失败，返回 503
    raise HTTPException(status_code=503, detail="Service unavailable")
except EmbeddingError as e:
    # 其他 embedding 错误，使用其 status_code
    raise HTTPException(status_code=e.status_code, detail=str(e))
```
（2026-04-15）

### Retriever 使用示例

```python
from app.core.rag import get_retriever_service

retriever = get_retriever_service()
documents = await retriever.search(
    query="What is RAG?",
    collection="default",
    top_k=5,
    min_score=0.5,
)
# documents: List[RetrievedDocument] with score metadata
```
（2026-04-15）

### Generator 使用示例

```python
from app.core.rag import get_generator_service
from app.core.rag.retriever import RetrievedDocument

generator = get_generator_service()

# Non-streaming
answer = await generator.generate(
    question="What is RAG?",
    documents=documents,  # List[RetrievedDocument]
    model="anthropic/claude-3.5-sonnet",
)

# Streaming
async for chunk in generator.generate_stream(
    question="What is RAG?",
    documents=documents,
):
    print(chunk, end="")
```
（2026-04-15）

### Vector Store 使用示例

```python
from app.core.rag import get_vector_store, StoredDocument

# Get configured store (Chroma or FAISS based on config)
store = get_vector_store()

# Add documents
docs = [StoredDocument(document_id="1", content="text", embedding=[...], metadata={})]
await store.add_documents(docs, collection="default")

# Search
results = await store.search(
    query_embedding=[...],
    top_k=5,
    collection="default",
    min_score=0.5,
)
# results: List[(StoredDocument, score)]
```
（2026-04-15）
