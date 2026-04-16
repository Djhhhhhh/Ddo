# 变更日志

**提交信息**: feat(timer): 实现完整的定时任务 API 和队列消费机制
**分支**: main
**日期**: 2026-04-16
**作者**: Djhhh

## 变更文件
- services/server-go/cmd/server/wire_gen.go (modified) - 注入 timer 依赖
- services/server-go/go.mod (modified) - 添加 cron 依赖
- services/server-go/go.sum (modified) - 更新依赖版本
- services/server-go/internal/bootstrap/app.go (modified) - 添加 scheduler 和 callback executor 生命周期管理
- services/server-go/internal/interfaces/http/router.go (modified) - 注册 timer 路由
- services/server-go/internal/scheduler/scheduler.go (modified) - 实现基于 robfig/cron 的调度器
- services/server-go/internal/application/service/callback_executor.go (added) - 队列消息消费和执行日志记录
- services/server-go/internal/application/usecase/timer/create_timer.go (added) - 创建定时任务
- services/server-go/internal/application/usecase/timer/delete_timer.go (added) - 删除定时任务
- services/server-go/internal/application/usecase/timer/get_timer.go (added) - 获取定时任务详情
- services/server-go/internal/application/usecase/timer/list_timer.go (added) - 查询定时任务列表
- services/server-go/internal/application/usecase/timer/list_timer_logs.go (added) - 查询执行日志
- services/server-go/internal/application/usecase/timer/pause_timer.go (added) - 暂停定时任务
- services/server-go/internal/application/usecase/timer/resume_timer.go (added) - 恢复定时任务
- services/server-go/internal/application/usecase/timer/trigger_timer.go (added) - 手动触发任务
- services/server-go/internal/application/usecase/timer/update_timer.go (added) - 更新定时任务
- services/server-go/internal/db/repository/timer_log_repo.go (added) - 定时任务日志仓库
- services/server-go/internal/interfaces/http/dto/timer_dto.go (added) - Timer 请求/响应 DTO
- services/server-go/internal/interfaces/http/handler/timer_handler.go (added) - Timer HTTP 处理器
- services/server-go/docs/feature/2026-04-15-timer-api/review-list.md (added) - 完整 API 测试文档
- .gitignore (modified) - 更新忽略规则

## 统计
- 新增文件: 15
- 修改文件: 9
- 删除文件: 0
- 代码行数: +3000 / -147

## 描述
1. 实现完整的 Timer API（CRUD、暂停/恢复、手动触发）
2. 基于 robfig/cron 实现 Cron 表达式调度器
3. 集成 BadgerDB 队列实现消息异步消费
4. CallbackExecutor 订阅队列并执行 HTTP 回调，记录执行日志到 MySQL
5. 修复了错误的嵌套 services 目录结构
6. 更新 Wire 依赖注入配置，支持 Scheduler 和 CallbackExecutor
7. 添加完整的 API 测试文档和 curl 测试命令