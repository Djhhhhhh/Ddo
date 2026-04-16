# 变更日志

**提交信息**: feat(server): 实现 MCP 管理 API (p2-16)
**分支**: main
**日期**: 2026-04-16
**作者**: Djhhh

## 变更文件

### 新增文件 (11)
- services/server-go/docs/feature/2026-04-16-mcp-admin-api/技术方案.md (added)
- services/server-go/docs/feature/2026-04-16-mcp-admin-api/review-list.md (added)
- services/server-go/internal/application/usecase/mcp/create_mcp.go (added)
- services/server-go/internal/application/usecase/mcp/delete_mcp.go (added)
- services/server-go/internal/application/usecase/mcp/get_mcp.go (added)
- services/server-go/internal/application/usecase/mcp/list_mcp.go (added)
- services/server-go/internal/application/usecase/mcp/test_mcp.go (added)
- services/server-go/internal/db/repository/mcp_repo.go (added)
- services/server-go/internal/interfaces/http/dto/mcp_dto.go (added)
- services/server-go/internal/interfaces/http/handler/mcp_handler.go (added)
- services/server-go/internal/mcp/client.go (added)
- services/server-go/internal/mcp/http.go (added)
- services/server-go/internal/mcp/stdio.go (added)

### 修改文件 (4)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/server-go/internal/interfaces/http/router.go (modified)
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- .claude/skills/do-code/SKILL.md (modified)

## 统计
- 新增文件: 13
- 修改文件: 4
- 删除文件: 0
- 代码行数: +1980 / -7

## 描述

实现 server-go MCP 管理 API，包含：
- MCP 配置 CRUD API（创建/列表/获取/删除）
- MCP 连接池管理（支持 stdio/http/sse 三种类型）
- MCP 连接测试接口

API 端点：
- POST /api/v1/mcps - 创建 MCP 配置
- GET /api/v1/mcps - 查询 MCP 列表
- GET /api/v1/mcps/:uuid - 获取 MCP 详情
- POST /api/v1/mcps/:uuid/delete - 删除 MCP 配置
- POST /api/v1/mcps/:uuid/test - 测试 MCP 连接