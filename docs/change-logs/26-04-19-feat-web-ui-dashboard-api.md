# 变更日志

**提交信息**: feat(web-ui): Dashboard 页面和 API 对接
**分支**: main
**日期**: 2026-04-19
**作者**: Djhhh

## 变更文件
- AGENTS.md (modified)
- package.json (modified)
- package-lock.json (modified)
- DashboardView.vue (modified)
- docs/feature/2026-04-19-api-integration/ (added)
- docs/feature/2026-04-19-dashboard-page/ (added)
- src/api/ (added)
- src/components/Charts/ (added)
- src/components/ServiceCard.vue (added)
- src/components/StatCard.vue (added)
- src/stores/dashboard.ts (added)

## 统计
- 新增文件: 15
- 修改文件: 6
- 删除文件: 0
- 代码行数: +982 / -47

## 描述
Web UI Dashboard 页面开发：
- 实现 Dashboard 页面，展示服务状态、统计数据、定时任务、MCP 配置
- 创建完整的 API 模块（health、metrics、timer、mcp、knowledge）
- 添加 ServiceCard、StatCard、BarChart、LineChart 组件
- 实现 Dashboard Pinia Store 状态管理
- 更新 AGENTS.md 目录结构