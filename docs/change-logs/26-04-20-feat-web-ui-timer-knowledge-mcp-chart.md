# 变更日志

**提交信息**: feat(web-ui): Timer、Knowledge、MCP 功能增强与图表组件
**分支**: main
**日期**: 2026-04-20
**作者**: Djhhh

## 变更文件

### 新增文件
- services/web-ui/docs/feature/2026-04-20-chart-components/review-list.md (added)
- services/web-ui/docs/feature/2026-04-20-chart-components/技术方案.md (added)
- services/web-ui/docs/feature/2026-04-20-knowledge-info-page/review-list.md (added)
- services/web-ui/docs/feature/2026-04-20-knowledge-info-page/技术方案.md (added)
- services/web-ui/docs/feature/2026-04-20-mcp-timer-config-form/review-list.md (added)
- services/web-ui/docs/feature/2026-04-20-mcp-timer-config-form/技术方案.md (added)
- services/web-ui/src/components/Charts/PieChart.vue (added)
- services/web-ui/src/components/Form/McpForm.vue (added)
- services/web-ui/src/components/Form/TimerForm.vue (added)
- services/web-ui/src/components/Knowledge/RagChat.vue (added)
- services/web-ui/src/components/ui/Badge.vue (added)
- services/web-ui/src/components/ui/Modal.vue (added)
- services/web-ui/src/components/ui/Select.vue (added)
- services/web-ui/src/views/Knowledge/KnowledgePage.vue (added)

### 修改文件
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- services/server-go/internal/application/usecase/timer/create_timer.go (modified)
- services/server-go/internal/application/usecase/timer/get_timer.go (modified)
- services/server-go/internal/application/usecase/timer/list_timer.go (modified)
- services/server-go/internal/application/usecase/timer/update_timer.go (modified)
- services/server-go/internal/db/models/timer.go (modified)
- services/server-go/internal/interfaces/http/dto/timer_dto.go (modified)
- services/server-go/internal/interfaces/http/handler/timer_handler.go (modified)
- services/web-ui/AGENTS.md (modified)
- services/web-ui/src/api/client.ts (modified)
- services/web-ui/src/api/knowledge.ts (modified)
- services/web-ui/src/api/mcp.ts (modified)
- services/web-ui/src/api/timer.ts (modified)
- services/web-ui/src/api/types.ts (modified)
- services/web-ui/src/components/Layout/Layout.vue (modified)
- services/web-ui/src/components/ui/Button.vue (modified)
- services/web-ui/src/router/index.ts (modified)
- services/web-ui/src/views/Dashboard/DashboardView.vue (modified)
- services/web-ui/src/views/MCP/MCPView.vue (modified)
- services/web-ui/src/views/Timer/TimerView.vue (modified)

## 统计
- 新增文件: 14
- 修改文件: 20
- 删除文件: 0
- 代码行数: +4038 / -185

## 描述
web-ui 功能增强：新增知识页面（KnowledgePage、RagChat）、MCP 定时器配置表单（TimerForm、McpForm）、图表组件（PieChart）；Timer API 和前端增强；新增 UI 组件（Badge、Modal、Select）；后端 timer 相关功能完善
