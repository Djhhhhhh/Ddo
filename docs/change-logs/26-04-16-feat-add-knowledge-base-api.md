# 变更日志

**提交信息**: feat(knowledge): 实现知识库 CRUD API 和相关技术方案
**分支**: main
**日期**: 2026-04-16
**作者**: Djhhh

## 变更文件
- .gitignore (modified)
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- services/llm-py/app/core/config.py (modified)
- services/server-go/.claude/rules/rules.md (modified)
- services/server-go/AGENTS.md (modified)
- services/server-go/cmd/server/wire.go (deleted)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/server-go/ddo/000002.vlog (deleted)
- services/server-go/ddo/000003.vlog (deleted)
- services/server-go/ddo/000013.vlog (added)
- services/server-go/ddo/000014.vlog (added)
- services/server-go/docs/feature/2026-04-15-knowledge-base-crud/review-list.md (added)
- services/server-go/docs/feature/2026-04-15-knowledge-base-crud/test-commands.bat (added)
- services/server-go/docs/feature/2026-04-15-knowledge-base-crud/test-commands.sh (added)
- services/server-go/docs/feature/2026-04-15-knowledge-base-crud/技术方案.md (added)
- services/server-go/docs/feature/2026-04-15-mcp-management/技术方案.md (added)
- services/server-go/docs/feature/2026-04-15-timer-api/技术方案.md (added)
- services/server-go/internal/application/service/rag_proxy.go (added)
- services/server-go/internal/application/usecase/knowledge/ask_knowledge.go (added)
- services/server-go/internal/application/usecase/knowledge/create_knowledge.go (added)
- services/server-go/internal/application/usecase/knowledge/delete_knowledge.go (added)
- services/server-go/internal/application/usecase/knowledge/get_knowledge.go (added)
- services/server-go/internal/application/usecase/knowledge/list_knowledge.go (added)
- services/server-go/internal/application/usecase/knowledge/search_knowledge.go (added)
- services/server-go/internal/db/repository/knowledge_repo.go (added)
- services/server-go/internal/db/repository/timer_repo.go (added)
- services/server-go/internal/infrastructure/config/config.go (modified)
- services/server-go/internal/interfaces/http/dto/knowledge_dto.go (added)
- services/server-go/internal/interfaces/http/handler/knowledge_handler.go (added)
- services/server-go/internal/interfaces/http/router.go (modified)

## 统计
- 新增文件: 20
- 修改文件: 8
- 删除文件: 3
- 代码行数: +2651 / -135

## 描述
本次提交主要包含以下内容：
1. 实现知识库完整 CRUD API（创建、查询、列表、删除、搜索、问答）
2. 新增 Timer 和 MCP 管理技术方案文档
3. 新增 RAG Proxy 服务调用 llm-py 向量化服务
4. 完善 timer 和 knowledge 的数据仓储层
5. 更新 server-go 路由注册知识库相关接口
6. 删除废弃的 wire.go 文件，更新依赖注入代码
7. 更新 AGENTS.md 和 rules.md 文档
