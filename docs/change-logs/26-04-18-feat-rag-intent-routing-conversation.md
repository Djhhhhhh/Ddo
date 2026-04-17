# 变更日志

**提交信息**: feat: RAG 意图路由与对话服务集成
**分支**: main
**日期**: 2026-04-18
**作者**: Djhhh

## 变更文件
- .claude/scheduled_tasks.lock (new)
- .claude/settings.local.json (modified)
- services/cli/dist/repl/commands/index.js (modified)
- services/cli/dist/repl/conversation-handler.js (new)
- services/cli/dist/repl/conversation-handler.d.ts (new)
- services/cli/dist/repl/index.js (modified)
- services/cli/dist/services/api-client.js (modified)
- services/cli/dist/services/api-client.d.ts (modified)
- services/cli/src/repl/commands/index.ts (modified)
- services/cli/src/repl/conversation-handler.ts (new)
- services/cli/src/repl/index.ts (modified)
- services/cli/src/services/api-client.ts (modified)
- services/llm-py/app/api/chat.py (modified)
- services/llm-py/app/api/nlp.py (modified)
- services/llm-py/app/core/chains/__init__.py (new)
- services/llm-py/app/core/chains/intent_chain.py (new)
- services/llm-py/app/core/rag/generator.py (modified)
- services/other/docs/feature/2026-04-17-rag-intent-routing/* (new)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/server-go/internal/application/service/conversation_service.go (new)
- services/server-go/internal/application/service/intent_proxy.go (new)
- services/server-go/internal/application/service/llm_proxy.go (modified)
- services/server-go/internal/interfaces/http/handler/conversation_handler.go (new)
- services/server-go/internal/interfaces/http/router.go (modified)
- services/server-go/server.exe (modified)

## 统计
- 新增文件: 约 12 个
- 修改文件: 约 15 个
- 删除文件: 0
- 代码行数: +4543 / -297

## 描述
RAG 意图路由与对话服务集成
- CLI REPL 交互增强：Shift+Tab 切换和 conversation-handler
- LLM Python intent_chain 意图路由链实现
- Server Go 对话服务与意图代理
- 包含技术方案文档和审查清单
