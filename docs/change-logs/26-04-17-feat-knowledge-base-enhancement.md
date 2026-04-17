# 变更日志

**提交信息**: feat: 知识库增强功能 - 智能分类和标签
**分支**: main
**日期**: 2026-04-17
**作者**: Djhhh

## 变更文件
- services/llm-py/app/api/analyze.py (added)
- services/llm-py/app/api/__init__.py (modified)
- services/llm-py/app/core/llm_factory.py (modified)
- services/llm-py/AGENTS.md (modified)
- services/server-go/internal/db/models/category.go (added)
- services/server-go/internal/db/repository/category_repo.go (added)
- services/server-go/internal/interfaces/http/dto/category_dto.go (added)
- services/server-go/internal/interfaces/http/dto/knowledge_dto.go (modified)
- services/server-go/internal/interfaces/http/handler/category_handler.go (added)
- services/server-go/internal/interfaces/http/handler/knowledge_handler.go (modified)
- services/server-go/internal/interfaces/http/router.go (modified)
- services/server-go/internal/application/usecase/category/ (added - 4 files)
- services/server-go/internal/application/usecase/knowledge/create_knowledge.go (modified)
- services/server-go/internal/application/service/llm_proxy.go (modified)
- services/server-go/internal/bootstrap/app.go (modified)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/server-go/AGENTS.md (modified)
- services/cli/src/repl/commands/kb-commands.ts (modified)
- services/cli/src/services/api-client.ts (modified)
- services/cli/AGENTS.md (modified)
- services/other/docs/feature/2026-04-17-knowledge-base-enhancement/ (added - 3 files)

## 统计
- 新增文件: 16
- 修改文件: 18
- 删除文件: 0
- 代码行数: +1848 / -18

## 描述
知识库增强功能，支持 AI 自动分析提取 tags 和 categories：
- llm-py: 新增 /api/analyze/analyze 接口
- server-go: 新增 category 表和多对多关联，集成 AI 分析
- cli: kb-add 命令自动添加 source 字段