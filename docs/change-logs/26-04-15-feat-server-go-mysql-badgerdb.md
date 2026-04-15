# 变更日志

**提交信息**: feat(server-go): 实现 MySQL 连接和 BadgerDB 队列

**分支**: main
**日期**: 2026-04-15
**作者**: Claude

## 变更文件

### 新增文件
- `services/server-go/internal/db/mysql.go` - GORM MySQL 连接管理
- `services/server-go/internal/db/models/knowledge.go` - 知识库模型
- `services/server-go/internal/db/models/timer.go` - 定时任务模型
- `services/server-go/internal/db/models/timer_log.go` - 任务日志模型
- `services/server-go/internal/db/models/mcp.go` - MCP 配置模型
- `services/server-go/internal/queue/queue.go` - Queue 接口定义
- `services/server-go/internal/queue/badger_queue.go` - BadgerDB 队列实现
- `services/server-go/internal/scheduler/scheduler.go` - 任务调度器框架
- `services/server-go/docs/feature/2026-04-15-mysql-connection/技术方案.md`
- `services/server-go/docs/feature/2026-04-15-mysql-connection/review-list.md`
- `services/server-go/docs/feature/2026-04-15-badgerdb-queue/技术方案.md`
- `services/server-go/docs/feature/2026-04-15-badgerdb-queue/review-list.md`

### 修改文件
- `services/server-go/cmd/server/main.go` - 修复 flag 冲突，-v → -version
- `services/server-go/cmd/server/wire.go` - 添加 MySQL 和 Queue Provider
- `services/server-go/cmd/server/wire_gen.go` - Wire 生成代码更新
- `services/server-go/internal/bootstrap/app.go` - 数据库自动迁移、优雅关闭
- `services/server-go/internal/application/usecase/health/check_health.go` - MySQL 状态检查
- `services/server-go/internal/interfaces/http/handler/health_handler.go` - 503 状态码处理
- `services/server-go/internal/interfaces/http/dto/health_dto.go` - 添加 MySQL 字段
- `services/server-go/internal/infrastructure/config/config.go` - 添加 MySQLDSN 方法
- `services/server-go/configs/config.yaml` - 更新数据库密码配置
- `services/server-go/Makefile` - 修复 flag 参数
- `services/server-go/go.mod` - 添加 GORM、BadgerDB 依赖
- `services/server-go/.claude/rules/rules.md` - 新增架构规则
- `services/server-go/AGENTS.md` - 更新目录结构
- `docs/roadmap/todo-list/ddo-tasks.json` - 更新 p2-12, p2-17 状态为 done

## 统计
- 新增文件: 19
- 修改文件: 15
- 删除文件: 0
- 代码行数: +2172 / -71

## 描述

本次提交完成了 Phase 2 的两个核心任务：

### p2-12: server-go MySQL 连接
- 实现 GORM v2 + MySQL 8.0 连接池管理
- 连接池配置：MaxOpenConns=100, MaxIdleConns=10, ConnMaxLifetime=1h
- 数据库模型定义：Knowledge、Timer、TimerLog、MCPConfig
- 自动迁移表结构（AutoMigrate）
- 健康检查集成，MySQL 断开返回 503
- 优雅关闭支持

### p2-17: server-go BadgerDB 队列
- 基于 BadgerDB v4 的嵌入式消息队列
- 支持延时任务投递（秒级精度）
- 支持 Topic 订阅/取消订阅
- 支持消息优先级（0-9，数字越小越优先）
- 消息重试机制（默认最大 3 次，延时 5 秒）
- 调度器轮询处理延时消息
- 优雅关闭，资源清理

### 其他修复
- 修复 `-v` flag 与 Go 内置 flag 冲突 → `-version`
- 修复 `-c` flag → `-config`
- 修复 `BeforeCreate` 钩子参数类型
- 修复 Go 代码编译错误（time 指针、strconv）

相关任务: p2-12, p2-17
