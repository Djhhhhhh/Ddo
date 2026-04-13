# Ddo llm-py MVP需求文档 v1.0

## 1. 目标与指标

- 核心问题：提供统一的 LLM 代理服务，支持 OpenRouter API 转发、多模型管理、流式响应，以及 **RAG（检索增强生成）知识库服务**。
- 目标用户：server-go 网关服务，直接调用 Python 服务的内部组件（不对外暴露）。

**技术决策**：
- 服务绑定：`127.0.0.1:8000`，仅接收来自 server-go 的请求
- 入口统一：所有 AI 能力通过 server-go 代理，llm-py 不直接对外提供服务
- **RAG 架构**：llm-py 内置 RAG Engine，负责知识库的嵌入(Embedding)、向量存储、语义检索和上下文生成

- 成功指标：
  - API 响应时间（首 token）< 3 秒
  - 流式响应延迟 < 100ms/token
  - 服务可用性 > 99%
  - OpenRouter 调用成功率 > 98%

## 2. 核心流程（仅主要路径）

> 用户旅程图：服务启动 → 加载模型配置 → 接收对话请求 → 调用 OpenRouter → 流式返回响应

1. 步骤一：服务启动
   - 加载环境变量和配置文件
   - 验证 OpenRouter API Key
   - 初始化模型配置缓存
   - 启动 FastAPI 服务（Uvicorn）
   - 监听端口（默认 8000）

2. 步骤二：对话请求
   - 接收 POST `/api/chat` 请求
   - 验证请求参数（messages, model, stream）
   - 转发到 OpenRouter API
   - 流式（SSE）或非流式返回响应
   - 记录调用日志

3. 步骤三：模型管理
   - 定期（或按需）获取可用模型列表
   - 缓存模型信息（带 TTL）
   - 提供给 server-go 查询

4. 步骤四：**RAG 知识库处理**（新增）
   - 接收知识库文档，调用 Embedding API 生成向量
   - 将向量存入 Chroma/FAISS 本地向量数据库
   - 接收用户查询，进行向量相似度检索
   - 将检索结果与问题组合，生成上下文
   - 调用 LLM 生成带引用的回答

5. 步骤五：健康检查
   - 提供 `/health` 健康检查端点
   - 检测 OpenRouter 连接状态
   - 检测向量数据库状态
   - 返回服务运行状态

## 3. 功能列表（MoSCoW）

| 模块 | 功能点 | 优先级 | 描述 | 验收标准 |
|------|--------|--------|------|----------|
| 基础框架 | FastAPI 服务 | P0 | 基于 FastAPI 搭建 API 服务 | 1. 自动生成 OpenAPI 文档 2. 支持 CORS 配置 3. 统一异常处理 |
| 基础框架 | Uvicorn 运行 | P0 | ASGI 服务器运行 | 1. 支持热重载（开发模式）2. 支持多 worker 3. 支持 graceful shutdown |
| 对话服务 | Chat Completion | P0 | OpenRouter 代理转发 | 1. POST `/api/chat` 接口 2. 支持 messages 参数 3. 支持 model 参数 4. 支持 stream 参数 |
| 对话服务 | 流式响应 | P0 | Server-Sent Events 流式输出 | 1. `stream=true` 返回 SSE 格式 2. token 延迟 < 100ms 3. 支持客户端断开检测 |
| 对话服务 | 非流式响应 | P0 | 完整响应 JSON | 1. `stream=false` 返回完整 JSON 2. 包含 content 和 usage 3. 响应时间 < 30 秒 |
| 对话服务 | 模型配置 | P1 | 支持从配置读取默认模型 | 1. 支持 `config.yaml` 配置 2. 支持环境变量覆盖 3. 支持请求级别指定模型 |
| 对话服务 | 自动重试 | P1 | OpenRouter 失败自动重试 | 1. 网络错误自动重试 3 次 2. 指数退避策略 3. 可配置重试次数 |
| 模型管理 | 获取模型列表 | P1 | `/api/models` 接口 | 1. GET `/api/models` 2. 带缓存（TTL 1 小时） 3. 返回 model id 和 description |
| 模型管理 | 模型配置缓存 | P1 | 缓存模型信息 | 1. 本地内存缓存 2. 支持配置 TTL 3. 支持手动刷新 |
| 健康检查 | `/health` 接口 | P0 | 服务健康状态 | 1. GET `/health` 2. 返回 status 和 version 3. 检测 OpenRouter 连接 |
| 监控日志 | 请求日志 | P1 | 记录 LLM 调用日志 | 1. 记录请求参数（脱敏） 2. 记录响应时间和 token 数 3. 存储到本地文件 |
| 监控日志 | 错误日志 | P1 | 详细错误记录 | 1. OpenRouter 错误详情 2. 堆栈跟踪 3. 支持日志级别配置 |
| NLP 支持 | 意图识别 | P0 | NLP 接口供 server-go 调用 | 1. POST `/api/nlp` 内部接口 2. 解析用户意图和参数 3. 返回 intent 和 entities |
| **RAG 知识库** | **文档嵌入** | **P0** | **文本向量化存储** | 1. POST `/api/rag/embed` 接收文档 2. 调用 OpenRouter/Embedding API 生成向量 3. 存储到 Chroma/FAISS |
| **RAG 知识库** | **语义检索** | **P0** | **向量相似度搜索** | 1. POST `/api/rag/search` 接收查询 2. 生成查询向量 3. 返回 Top-K 相似文档 |
| **RAG 知识库** | **RAG 问答** | **P0** | **检索+生成回答** | 1. POST `/api/rag/ask` 接收问题 2. 检索相关文档 3. 组合上下文调用 LLM 4. 返回带引用的回答 |
| **RAG 知识库** | **知识库管理** | **P1** | **CRUD 操作** | 1. POST `/api/rag/documents` 添加 2. DELETE `/api/rag/documents/:id` 删除 3. GET `/api/rag/documents` 列表 |
| **RAG 知识库** | **向量存储管理** | **P1** | **Chroma/FAISS 管理** | 1. 支持本地持久化 2. 支持集合(Collection)管理 3. 存储路径可配置 |

## 4. 本期不做（明确排除）

- 本地模型加载（LLaMA、Ollama 等）
- Function Calling 原生实现（通过 MCP 代理）
- ~~Embedding 向量生成服务~~（本期已实现，通过 OpenRouter 调用）
- 多模态输入（图片、音频）
- 对话历史持久化（由 server-go 管理）
- 提示词模板引擎（Prompt Template）
- 模型微调（Fine-tuning）支持
- 完整的 OpenAI API 兼容层
- 负载均衡和多实例协调
- 高级 RAG 特性（重排序/Rerank、查询扩展、多跳推理）

## 5. 底线要求

- 性能：
  - 首 token 响应时间 < 3 秒
  - 流式 token 延迟 < 100ms
  - 非流式响应超时 30 秒
  - 并发处理 20+ 同时请求
- 可用性：
  - OpenRouter 连接断开自动恢复
  - API Key 失效友好提示
  - Rate Limit 自动处理（429 错误）
  - 优雅关闭，不中断正在处理的请求
- 埋点事件：
  - `llm_request_start`: 请求开始
  - `llm_request_complete`: 请求完成（含 token 数、耗时）
  - `llm_request_error`: 请求错误（含错误类型）
  - `llm_stream_chunk`: 流式 chunk 发送
  - `rag_document_embedded`: 文档嵌入完成（含文档数、token数）
  - `rag_search_executed`: 语义检索完成（含查询耗时、返回文档数）
  - `rag_answer_generated`: RAG 问答完成（含检索耗时、生成耗时）

## 附录

- 目录结构图：
  ```
  llm-py/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py              # FastAPI 入口
  │   ├── api/
  │   │   ├── __init__.py
  │   │   ├── chat.py          # Chat API 路由
  │   │   ├── models.py        # Models API 路由
  │   │   ├── health.py        # Health check
  │   │   ├── nlp.py           # NLP 意图识别
  │   │   └── rag.py           # RAG 知识库 API（新增）
  │   ├── core/
  │   │   ├── __init__.py
  │   │   ├── config.py        # 配置管理
  │   │   ├── openrouter.py    # OpenRouter 客户端
  │   │   ├── nlp_engine.py    # NLP 意图识别引擎
  │   │   └── rag/             # RAG Engine（新增）
  │   │       ├── __init__.py
  │   │       ├── embedder.py  # 文本向量化
  │   │       ├── vector_store.py  # 向量存储(Chroma/FAISS)
  │   │       ├── retriever.py     # 语义检索
  │   │       └── generator.py     # 上下文生成+LLM调用
  │   └── utils/
  │       ├── __init__.py
  │       └── logger.py        # 日志工具
  ├── config.yaml              # 配置文件
  ├── requirements.txt
  └── Dockerfile
  ```
  
- 向量存储配置：
  ```yaml
  # config.yaml
  rag:
    enabled: true
    vector_store: "chroma"  # 或 "faiss"
    store_path: "~/.ddo/data/vector/"  # 向量数据存储路径
    embedding_model: "openai/text-embedding-3-small"  # 向量化模型
    top_k: 5  # 检索返回文档数
    chunk_size: 500  # 文档分块大小
  ```
- 环境变量：
  - `OPENROUTER_API_KEY`: OpenRouter API Key（必需）
  - `LLM_DEFAULT_MODEL`: 默认模型（默认：anthropic/claude-3.5-sonnet）
  - `LLM_TIMEOUT`: 请求超时（默认：30）
  - `LOG_LEVEL`: 日志级别（默认：INFO）
- 相关文档：
  - [MVP 总览](../../../docs/roadmap/mvp.md)
  - [CLI MVP](../../cli/docs/roadmap/mvp.md)
  - [server-go MVP](../../server-go/docs/roadmap/mvp.md)
  - [web-ui MVP](../../web-ui/docs/roadmap/mvp.md)
