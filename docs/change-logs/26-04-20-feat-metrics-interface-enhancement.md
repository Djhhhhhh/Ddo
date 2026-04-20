# 变更日志

**提交信息**: feat(server-go): Metrics 接口数据完善与 Dashboard 优化
**分支**: main
**日期**: 2026-04-20
**作者**: Djhhh

## 变更文件
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- docs/roadmap/todo-list/server.js (modified)
- services/server-go/AGENTS.md (modified)
- services/server-go/cmd/server/wire_gen.go (modified)
- services/server-go/docs/feature/2026-04-17-metrics/review-list.md (added)
- services/server-go/docs/feature/2026-04-17-metrics/技术方案-metrics接口数据完善.md (added)
- services/server-go/internal/infrastructure/config/config.go (modified)
- services/server-go/internal/interfaces/http/handler/metrics_handler.go (modified)
- services/web-ui/src/api/types.ts (modified)
- services/web-ui/src/stores/dashboard.ts (modified)
- services/web-ui/src/views/Dashboard/DashboardView.vue (modified)

## 统计
- 新增文件: 2
- 修改文件: 9
- 删除文件: 0
- 代码行数: +421 / -144

## 描述
完善 Metrics 接口数据：
- 修复并发计数错误，移除误导性字段
- 新增请求成功率、平均响应时间等统计指标
- 添加 MetricsConfig 配置结构
- 优化 Dashboard 页面展示和状态管理
