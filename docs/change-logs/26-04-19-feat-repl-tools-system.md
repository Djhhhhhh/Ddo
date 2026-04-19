# 变更日志

**提交信息**: feat(cli): 实现 REPL 工具注册系统和命令重构
**分支**: main
**日期**: 2026-04-19
**作者**: Djhhh

## 变更文件
- DESIGN.md (added)
- services/cli/src/repl/tools/index.ts (added)
- services/cli/src/repl/tools/registry.ts (added)
- services/cli/src/repl/commands/index.ts (modified)
- services/cli/src/repl/conversation-handler.ts (modified)
- services/cli/src/repl/index.ts (modified)
- services/cli/dist/repl/tools/*.js (added)
- services/cli/dist/repl/tools/*.map (added)
- services/cli/dist/repl/commands/*.js (modified)
- services/cli/dist/repl/commands/*.map (modified)
- services/cli/dist/repl/conversation-handler.* (modified)
- services/cli/dist/repl/index.* (modified)
- services/llm-py/app/core/config.py (modified)
- services/llm-py/app/core/rag/retriever.py (modified)
- services/llm-py/app/models/rag.py (modified)
- services/llm-py/.claude/rules/rules.md (modified)
- services/server-go/internal/application/service/conversation_service.go (modified)
- services/server-go/internal/application/service/llm_proxy.go (modified)
- services/server-go/internal/application/service/rag_proxy.go (modified)
- services/server-go/internal/interfaces/http/dto/knowledge_dto.go (modified)

## 统计
- 新增文件: 6
- 修改文件: 26
- 删除文件: 0
- 代码行数: +902 / -58

## 描述
实现 CLI REPL 工具注册系统，重构命令处理流程，添加工具注册表和索引，支持动态工具管理。同时更新 LLM 和 RAG 相关配置。
