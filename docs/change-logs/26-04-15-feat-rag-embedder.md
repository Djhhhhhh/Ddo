# 变更日志

**提交信息**: feat(llm-py): 实现 RAG Embedder 文本向量化服务
**分支**: main
**日期**: 2026-04-15
**作者**: Djhhh

## 变更文件
- docs/change-logs/26-04-15-feat-server-go-mysql-badgerdb.md (added)
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- services/llm-py/.claude/rules/rules.md (modified)
- services/llm-py/AGENTS.md (modified)
- services/llm-py/app/api/rag.py (modified)
- services/llm-py/app/core/config.py (modified)
- services/llm-py/app/core/document_store.py (added)
- services/llm-py/app/core/embedder.py (added)
- services/llm-py/app/core/openrouter.py (added)
- services/llm-py/docs/feature/2026-04-15-rag-embedder/review-list.md (added)
- services/llm-py/docs/feature/2026-04-15-rag-embedder/技术方案.md (added)
- services/llm-py/requirements.txt (modified)

## 统计
- 新增文件: 7
- 修改文件: 5
- 删除文件: 0
- 代码行数: +1182 / -22

## 描述
实现 RAG (Retrieval-Augmented Generation) Engine 的第一个组件 Embedder，负责将文本转换为向量嵌入。

**核心功能**:
- 支持 OpenRouter Embedding API 调用
- 模型优先级：请求体 model 字段 > DDO_LLM_MODEL 环境变量 > 系统默认
- 批量处理和自动重试机制（tenacity）
- 临时内存文档存储（为 p2-8 Retriever 做准备）

**API 端点**:
- POST /api/rag/embed - 文档嵌入（已实现）

**任务状态**: p2-7 已完成 ✅
