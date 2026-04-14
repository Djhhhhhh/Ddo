# 变更日志

**提交信息**: feat(cli): 实现 ddo logs 命令用于查看服务日志
**分支**: main
**日期**: 2026-04-14
**作者**: Djhhh

## 变更文件
- docs/roadmap/todo-list/TODO_LIST.html (modified)
- docs/roadmap/todo-list/app.js (modified)
- docs/roadmap/todo-list/ddo-tasks.json (modified)
- docs/roadmap/todo-list/server.js (added)
- services/cli/AGENTS.md (modified)
- services/cli/dist/commands/logs.d.ts (added)
- services/cli/dist/commands/logs.d.ts.map (added)
- services/cli/dist/commands/logs.js (added)
- services/cli/dist/commands/logs.js.map (added)
- services/cli/dist/index.js (modified)
- services/cli/dist/index.js.map (modified)
- services/cli/dist/types/index.d.ts (modified)
- services/cli/dist/types/index.d.ts.map (modified)
- services/cli/dist/utils/index.d.ts (modified)
- services/cli/dist/utils/index.d.ts.map (modified)
- services/cli/dist/utils/index.js (modified)
- services/cli/dist/utils/index.js.map (modified)
- services/cli/dist/utils/log-reader.d.ts (added)
- services/cli/dist/utils/log-reader.d.ts.map (added)
- services/cli/dist/utils/log-reader.js (added)
- services/cli/dist/utils/log-reader.js.map (added)
- services/cli/docs/feature/2026-04-14-ddo-logs/review-list.md (added)
- services/cli/docs/feature/2026-04-14-ddo-logs/技术方案.md (added)
- services/cli/src/commands/logs.ts (added)
- services/cli/src/index.ts (modified)
- services/cli/src/types/index.ts (modified)
- services/cli/src/utils/index.ts (modified)
- services/cli/src/utils/log-reader.ts (added)

## 统计
- 新增文件: 13
- 修改文件: 15
- 删除文件: 0
- 代码行数: +1875 / -58

## 描述
实现了 ddo logs 命令，支持多种日志查看模式：
- 实时跟踪模式 (--follow)
- 关键词过滤 (--grep)
- 行数限制 (--lines)
- 时间过滤 (--since, --until)

新增技术方案文档和测试清单，完善 CLI 日志功能。
