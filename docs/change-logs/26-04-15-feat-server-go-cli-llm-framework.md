# 变更日志

**提交信息**: feat(server-go, cli, llm-py): 实现服务端框架和 CLI 基础功能
**分支**: main
**日期**: 2026-04-15
**作者**: Djhhh

## 变更文件

### 新增文件 (48)
- .gitignore
- docs/change-logs/26-04-14-feat-cli-repl-command-framework.md
- docs/change-logs/26-04-14-feat-llm-py-fastapi-framework.md
- services/server-go/Makefile
- services/server-go/build/server.exe
- services/server-go/cmd/server/main.go
- services/server-go/cmd/server/wire.go
- services/server-go/cmd/server/wire_gen.go
- services/server-go/configs/config.yaml
- services/server-go/docs/feature/2026-04-14-gin-framework/review-list.md
- services/server-go/docs/feature/2026-04-14-gin-framework/技术方案.md
- services/server-go/go.mod
- services/server-go/go.sum
- services/server-go/internal/application/result/result.go
- services/server-go/internal/application/result/result_test.go
- services/server-go/internal/application/usecase/health/check_health.go
- services/server-go/internal/application/usecase/health/check_health_test.go
- services/server-go/internal/bootstrap/app.go
- services/server-go/internal/domain/common/entity.go
- services/server-go/internal/domain/common/entity_test.go
- services/server-go/internal/domain/common/errors.go
- services/server-go/internal/domain/common/errors_test.go
- services/server-go/internal/domain/common/event.go
- services/server-go/internal/domain/common/event_test.go
- services/server-go/internal/domain/common/valueobject.go
- services/server-go/internal/domain/health/aggregate.go
- services/server-go/internal/domain/health/aggregate_test.go
- services/server-go/internal/domain/health/valueobject.go
- services/server-go/internal/domain/health/valueobject_test.go
- services/server-go/internal/infrastructure/config/config.go
- services/server-go/internal/infrastructure/config/config_test.go
- services/server-go/internal/infrastructure/logger/logger.go
- services/server-go/internal/infrastructure/logger/logger_test.go
- services/server-go/internal/infrastructure/server/gin_server.go
- services/server-go/internal/interfaces/http/dto/health_dto.go
- services/server-go/internal/interfaces/http/handler/health_handler.go
- services/server-go/internal/interfaces/http/handler/health_handler_test.go
- services/server-go/internal/interfaces/http/middleware/cors.go
- services/server-go/internal/interfaces/http/middleware/cors_test.go
- services/server-go/internal/interfaces/http/middleware/logger.go
- services/server-go/internal/interfaces/http/middleware/logger_test.go
- services/server-go/internal/interfaces/http/middleware/recovery.go
- services/server-go/internal/interfaces/http/middleware/recovery_test.go
- services/server-go/internal/interfaces/http/middleware/request_id.go
- services/server-go/internal/interfaces/http/middleware/request_id_test.go
- services/server-go/internal/interfaces/http/router.go
- services/server-go/pkg/utils/validator.go

### 修改文件 (4)
- .claude/settings.local.json
- docs/roadmap/todo-list/ddo-tasks.json
- services/server-go/.claude/rules/rules.md
- services/server-go/AGENTS.md

## 统计
- 新增文件: 48
- 修改文件: 4
- 删除文件: 0
- 代码行数: +4313 / -15

## 描述

本次提交实现了三大核心功能：

### 1. server-go 服务端框架 (Clean Architecture + DDD)
- 基于 Gin 框架的 HTTP 服务架构
- Wire 依赖注入实现
- 完整的分层架构：Domain → Application → Infrastructure → Interfaces
- Health Check 端点实现
- 中间件：CORS、日志、恢复、请求 ID
- 完整的单元测试覆盖

### 2. CLI REPL 命令框架
- 实现 REPL 交互式命令解析
- 支持子命令模式（start/stop/status/logs）
- 服务生命周期管理

### 3. llm-py FastAPI 框架基础
- Python 服务基础架构
- FastAPI 框架集成

### 4. 技能服务文档完善
- check-todo 技能：任务进度检查和方案生成
- code-review 技能：代码审查评分标准
- do-code 技能：基于技术方案的自动编码
- file-index 技能：AGENTS.md 索引维护
