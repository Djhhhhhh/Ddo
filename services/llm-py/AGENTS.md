# llm-py

## 📌 作用

llm-py 是 Ddo 项目的 LLM 代理服务，基于 FastAPI 构建。

**核心职责**：
- 代理 OpenRouter API 调用（Chat Completions）
- 提供 RAG（检索增强生成）知识库服务
- 为 CLI/server-go 提供 NLP 意图识别能力
- 本地存储对话历史记录，支持趋势统计

**边界**：
- 只负责 LLM 相关功能，不处理业务逻辑
- 不直接对外暴露，通过 server-go 代理

**调用关系**：
- 被：server-go (Go) 调用
- 调用：OpenRouter API (外部)

## 📂 目录结构

```
services/llm-py/
├── app/                           # 主应用包
│   ├── __init__.py               # 包初始化
│   ├── main.py                   # Uvicorn 启动脚本 - 从配置文件读取端口（2026-04-22）
│   ├── api/                      # API 路由模块 (FastAPI "大门" 层)
│   │   ├── __init__.py          # 路由聚合 (api_router)
│   │   ├── health.py            # /api/health - 健康检查
│   │   ├── chat.py              # /api/chat/* - Chat Completions LangChain 实现，含对话存储
│   │   ├── conversation.py      # /api/conversations/* - 对话历史管理 p2-9 新增
│   │   ├── models.py            # /api/models/* - 模型管理
│   │   ├── nlp.py               # /api/nlp/* - NLP 意图识别 LangChain 实现
│   │   ├── analyze.py           # /api/analyze/* - 知识分析（标签/分类提取）知识库增强功能
│   │   ├── rag.py               # /api/rag/* - RAG 知识库 p2-8 Retriever / p2-9 Generator 已实现
│   │   └── stats.py             # /api/stats/* - LLM 使用统计 p2-9 新增
│   ├── core/                     # 核心模块 (LangChain "大脑" 层)
│   │   ├── __init__.py
│   │   ├── chains/               # LangChain 业务链封装
│   │   │   ├── __init__.py      # Chain 模块导出
│   │   │   └── intent_chain.py  # NLP 意图识别链封装
│   │   ├── config.py            # Pydantic Settings 配置管理 (含数据库配置)
│   │   ├── llm_factory.py       # LangChain 核心：模型工厂、链式编排、提示管理
│   │   ├── embedder.py          # RAG Embedder 服务核心 - 文本向量化 (p2-7)
│   │   ├── document_store.py    # 文档存储（临时内存实现）- 将被 RAG vector_store 替代 (p2-7)
│   │   ├── lifespan.py          # FastAPI lifespan 生命周期（含数据库初始化）
│   │   ├── openrouter.py        # OpenRouter API 客户端管理
│   │   └── rag/                  # RAG Engine 核心模块 (p2-8/p2-9)
│   │       ├── __init__.py      # RAG 模块导出
│   │       ├── vector_store.py  # 向量存储封装 - Chroma/FAISS 双实现
│   │       ├── retriever.py     # 语义检索服务 - 向量相似度搜索
│   │       └── generator.py     # RAG 生成服务 - 上下文组装 + LLM 调用
│   ├── db/                       # ← 新增：数据库层（对话存储）
│   │   ├── __init__.py          # 数据库模块导出
│   │   ├── models.py            # SQLAlchemy 模型 (Conversation/Message/Stats)
│   │   └── session.py           # 异步会话管理
│   ├── models/                   # Pydantic 数据模型定义
│   │   ├── __init__.py          # 模型包导出
│   │   ├── document.py          # RAG 文档/向量存储共享数据模型
│   │   └── rag.py               # RAG 相关 Pydantic 模型
│   ├── services/                 # ← 新增：业务服务层
│   │   ├── __init__.py          # 服务模块导出
│   │   ├── conversation_service.py  # 对话存储服务
│   │   └── stats_service.py     # 统计计算服务
│   └── utils/                    # 工具模块
│       ├── __init__.py
│       └── logger.py            # 日志配置和工具函数
├── docs/
│   ├── roadmap/
│   │   └── mvp.md               # MVP 需求文档
│   └── feature/
│       ├── 2026-04-14-fastapi-framework/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-15-openrouter-proxy/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-15-rag-embedder/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-15-rag-retriever-generator/
│       │   ├── review-list.md
│       │   └── 技术方案.md
│       ├── 2026-04-20-llm-session-save/
│       │   └── 技术方案.md
│       └── 2026-04-21-llm-conversation-storage/
│           ├── review-list-go.md
│           ├── review-list.md
│           └── 技术方案.md
├── .claude/
│   └── rules/
│       └── rules.md             # 服务规则文件
├── main.py                       # Uvicorn 启动脚本
├── requirements.txt              # Python 依赖 (langchain, langchain-openrouter)
├── .env                          # 本地环境变量配置（开发用，不提交）
├── .env.example                  # 环境变量示例
└── AGENTS.md (本文件)
```

## 架构分工

- **FastAPI "大门"** (`app/api/`): 负责 HTTP 路由、请求验证、并发控制、序列化
- **LangChain "大脑"** (`app/core/`):
  - `llm_factory.py`: 负责 Chat/NLP 模型管理、链式编排、流式处理
  - `embedder.py`: 负责 RAG 文档向量化、Embedding API 调用、批量处理
- **RAG Engine** (`app/core/rag/`):
  - `vector_store.py`: 向量存储抽象 + Chroma/FAISS 双实现
  - `retriever.py`: 语义检索服务，将查询转为向量并搜索相似文档
  - `generator.py`: RAG 生成服务，组装上下文并调用 LLM 生成回答
- **OpenRouter 接入**: 通过 `langchain-openrouter` / `langchain-openai` 包实现

## 关键文件说明

- `app/main.py`: FastAPI 实例创建、CORS 中间件、路由挂载
- `app/core/config.py`: 统一配置管理，支持环境变量和 .env 文件
- `app/api/__init__.py`: 路由聚合，所有 API 通过 `api_router` 注册
- `main.py`: 开发启动入口，使用 Uvicorn 运行
- `.env`: 本地配置文件（不提交到 git）
- `app/core/rag/`: RAG 核心引擎，实现检索增强生成的完整流程

## 规则

- 所有路径、目录和文件说明必须以 `services/llm-py` 的真实内容为准，禁止补写不存在的路由、模型、链路或文档。
- llm-py 只负责 LLM、NLP、RAG、对话存储与统计相关能力，不在文档中扩展为业务编排服务。
- 更新文档时优先维护 `AGENTS.md` 的目录结构、边界和流程，再补充 `.claude/rules/rules.md` 的架构规则与经验结论。
- 面向用户的文案不能泄露内部约束；服务级文档必须明确 API 边界、配置来源和安全要求。

## 开发流程

1. 开发前先阅读本文件，确认 llm-py 的职责边界、目录结构和禁止事项。
2. 仅在 `services/llm-py` 目录内实施修改，不跨 service 读取或写入实现细节。
3. 若新增 API、核心模块、配置项、数据模型或文档目录，完成代码后同步更新 `## 目录结构`。
4. 若沉淀出新的架构规则、代码规范或常见陷阱，同步更新 `.claude/rules/rules.md`。
5. 提交前确认 API 路由、配置来源、模型契约和文档内容与当前代码一致。

## Rules 自维护

- Rules 文件位置：[.claude/rules/rules.md](.claude/rules/rules.md)
- 触发时机：新增目录结构、引入新架构模式、调整代码规范、出现可复用经验时必须追加。
- 追加格式：`- 规则描述（发现日期：YYYY-MM-DD）`
- 维护原则：只增量补充，不覆盖仍然有效的历史规则。

## 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md

## 禁止

硬性红线（违反会导致架构混乱）：
- 跨 service import（只能调 API，不能 import 包）
- 直接修改其他 service 的代码
- 将 OpenRouter API Key 提交到 Git
- 在生产环境启用 `reload=True`
- 直接暴露 llm-py 端口到外网（必须走 server-go 代理）

## 最后更新时间

2026-04-22 20:14

- 同步 `services/llm-py` 真实目录结构，补充 `app/core/chains/`、`app/models/document.py`、`.env`、`.claude/rules/` 与 `docs/feature/*` 条目
- 补齐 规则、开发流程 章节，使服务文档结构与 `doc-fix` 要求一致
- 保留原有职责边界、检查清单与禁止事项，避免文档修复改变服务定义
