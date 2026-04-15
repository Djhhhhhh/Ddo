# llm-py

## 📌 作用

llm-py 是 Ddo 项目的 LLM 代理服务，基于 FastAPI 构建。

**核心职责**：
- 代理 OpenRouter API 调用（Chat Completions）
- 提供 RAG（检索增强生成）知识库服务
- 为 CLI/server-go 提供 NLP 意图识别能力

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
│   ├── main.py                   # FastAPI 主应用入口
│   ├── api/                      # API 路由模块 (FastAPI "大门" 层)
│   │   ├── __init__.py          # 路由聚合 (api_router)
│   │   ├── health.py            # /api/health - 健康检查
│   │   ├── chat.py              # /api/chat/* - Chat Completions ✅ LangChain 实现
│   │   ├── models.py            # /api/models/* - 模型管理
│   │   ├── nlp.py               # /api/nlp/* - NLP 意图识别 ✅ LangChain 实现
│   │   └── rag.py               # /api/rag/* - RAG 知识库 ✅ p2-8 Retriever / p2-9 Generator 已实现
│   ├── core/                     # 核心模块 (LangChain "大脑" 层)
│   │   ├── __init__.py
│   │   ├── config.py            # Pydantic Settings 配置管理
│   │   ├── llm_factory.py       # LangChain 核心：模型工厂、链式编排、提示管理
│   │   ├── embedder.py          # RAG Embedder 服务核心 - 文本向量化 (p2-7)
│   │   ├── document_store.py    # 文档存储（临时内存实现）- 将被 RAG vector_store 替代 (p2-7)
│   │   ├── lifespan.py          # FastAPI lifespan 生命周期
│   │   └── rag/                  # ← 新增：RAG Engine 核心模块 (p2-8/p2-9)
│   │       ├── __init__.py      # RAG 模块导出
│   │       ├── vector_store.py  # 向量存储封装 - Chroma/FAISS 双实现
│   │       ├── retriever.py     # 语义检索服务 - 向量相似度搜索
│   │       └── generator.py     # RAG 生成服务 - 上下文组装 + LLM 调用
│   ├── models/                   # ← 新增：数据模型定义
│   │   ├── __init__.py          # 模型包导出
│   │   └── rag.py               # RAG 相关 Pydantic 模型
│   └── utils/                    # 工具模块
│       ├── __init__.py
│       └── logger.py            # 日志配置和工具函数
├── main.py                       # Uvicorn 启动脚本
├── requirements.txt              # Python 依赖 (langchain, langchain-openrouter)
├── .env.example                  # 环境变量示例
└── AGENTS.md (本文件)
```

**架构分工**:
- **FastAPI "大门"** (`app/api/`): 负责 HTTP 路由、请求验证、并发控制、序列化
- **LangChain "大脑"** (`app/core/`):
  - `llm_factory.py`: 负责 Chat/NLP 模型管理、链式编排、流式处理
  - `embedder.py`: 负责 RAG 文档向量化、Embedding API 调用、批量处理
- **RAG Engine** (`app/core/rag/`):
  - `vector_store.py`: 向量存储抽象 + Chroma/FAISS 双实现
  - `retriever.py`: 语义检索服务，将查询转为向量并搜索相似文档
  - `generator.py`: RAG 生成服务，组装上下文并调用 LLM 生成回答
- **OpenRouter 接入**: 通过 `langchain-openrouter` / `langchain-openai` 包实现

**关键文件说明**：
- `app/main.py`: FastAPI 实例创建、CORS 中间件、路由挂载
- `app/core/config.py`: 统一配置管理，支持环境变量和 .env 文件
- `app/api/__init__.py`: 路由聚合，所有 API 通过 `api_router` 注册
- `main.py`: 开发启动入口，使用 Uvicorn 运行
- `.env`: 本地配置文件（不提交到 git）
- `app/core/rag/`: RAG 核心引擎，实现检索增强生成的完整流程

## 🧠 Rules 自维护

**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

### 何时更新 Rules
开发完成后，如果满足以下条件之一，**必须**更新 Rules：
- 🆕 引入新的架构模式
- 📁 新增目录结构
- 📋 改变代码规范
- 🔁 出现重复实现（需要抽象规则）

### 如何更新 Rules
1. 打开 [.claude/rules/rules.md](.claude/rules/rules.md)
2. 在对应类别下追加新规则（不要覆盖）
3. 格式：`- 规则描述（发现日期：YYYY-MM-DD）`

> 💡 提示：每次开发完成后问自己：这次我学到了什么模式值得记录？

## ✅ 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/<service>.md

## 🚫 禁止

硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ 将 OpenRouter API Key 提交到 Git
- ❌ 在生产环境启用 `reload=True`
- ❌ 直接暴露 llm-py 端口到外网（必须走 server-go 代理）

## 🕒 最后更新时间

2026-04-15 23:30:00
