# server-go

## 📌 作用

server-go 是 Ddo 平台的核心网关服务，负责提供统一的 API 路由、定时任务调度、消息队列、知识库管理和 MCP 管理能力。采用 DDD（领域驱动设计）四层架构，为业务功能开发提供清晰的领域边界和分层结构。

- 边界：负责 HTTP API 路由、配置管理、日志等基础设施能力
- 调用关系：被上层服务调用，调用数据库和外部 API

## 📂 目录结构

```
server-go/
├── cmd/
│   └── server/
│       └── main.go                          # 服务启动入口（2026-04-14）
├── configs/
│   └── config.yaml                          # 配置文件模板（2026-04-14）
├── internal/
│   ├── bootstrap/                           # ← 更新：应用引导层（2026-04-15）
│   │   ├── app.go                           # 应用生命周期管理
│   │   ├── wire.go                          # Wire 依赖注入配置
│   │   └── wire_gen.go                      # Wire 生成的代码（手动维护）
│   ├── domain/                              # ★ 领域层（核心业务）
│   │   ├── common/                          # 领域共享组件（2026-04-14）
│   │   │   ├── entity.go                    # 实体基类
│   │   │   ├── valueobject.go               # 值对象基类
│   │   │   ├── event.go                     # 领域事件接口
│   │   │   └── errors.go                    # 领域错误定义
│   │   └── health/                          # 健康检查领域（2026-04-14）
│   │       ├── aggregate.go                 # Health 聚合根
│   │       └── valueobject.go               # HealthStatus 值对象
│   ├── application/                         # 应用层（用例编排）
│   │   ├── result/
│   │   │   └── result.go                    # 统一响应结果封装（2026-04-14）
│   │   ├── service/
│   │   │   └── rag_proxy.go                 # RAG 代理服务，转发到 llm-py（2026-04-15）
│   │   └── usecase/
│   │       ├── health/
│   │       │   └── check_health.go          # CheckHealth 用例实现（2026-04-15）
│   │       └── knowledge/                   # ← 新增：知识库用例层（2026-04-15）
│   │           ├── create_knowledge.go      # 创建知识条目（含 AI 分析）
│   │           ├── list_knowledge.go        # 查询知识列表
│   │           ├── get_knowledge.go         # 获取知识详情
│   │           ├── delete_knowledge.go      # 删除知识条目
│   │           ├── search_knowledge.go      # 语义搜索
│   │           └── ask_knowledge.go         # RAG 问答
│   │       └── category/                    # ← 新增：分类用例层（2026-04-17）
│   │           ├── list_category.go         # 列出分类
│   │           ├── create_category.go       # 创建分类
│   │           ├── delete_category.go       # 删除分类
│   │           └── get_knowledge_by_category.go  # 按分类查询知识
│   ├── interfaces/                          # 接口层（协议适配）
│   │   └── http/
│   │       ├── handler/
│   │       │   ├── health_handler.go        # 健康检查 Handler（2026-04-15）
│   │       │   ├── knowledge_handler.go     # 知识库 Handler（2026-04-15）
│   │       │   ├── timer_handler.go          # 定时任务 Handler（2026-04-15）
│   │       │   ├── mcp_handler.go           # MCP Handler（2026-04-15）
│   │       │   ├── llm_handler.go           # LLM Handler（2026-04-15）
│   │       │   ├── metrics_handler.go       # Metrics Handler（2026-04-20）
│   │       │   ├── category_handler.go      # 分类 Handler（2026-04-17）
│   │       │   ├── conversation_handler.go  # 对话 Handler（2026-04-17）
│   │       │   └── notification_handler.go  # 通知 Handler（2026-04-20）
│   │       ├── middleware/
│   │       │   ├── recovery.go              # 异常恢复（2026-04-14）
│   │       │   ├── logger.go                # 请求日志（2026-04-14）
│   │       │   ├── cors.go                  # 跨域支持（2026-04-14）
│   │       │   └── request_id.go            # 请求ID追踪（2026-04-14）
│   │       ├── dto/
│   │       │   ├── health_dto.go            # HTTP DTO（2026-04-15）
│   │       │   └── knowledge_dto.go         # ← 新增：知识库 DTO（2026-04-15）
│   │       └── router.go                    # 路由注册（2026-04-14）
│   ├── infrastructure/                      # 基础设施层（技术实现）
│   │   ├── config/
│   │   │   └── config.go                    # Viper 配置管理（2026-04-15）
│   │   ├── logger/
│   │   │   └── logger.go                    # Zap 日志实现（2026-04-14）
│   │   └── server/
│   │       └── gin_server.go                # Gin HTTP 服务器适配器（2026-04-14）
│   ├── db/                                  # ← 新增：数据库层（2026-04-15）
│   │   ├── mysql.go                         # GORM MySQL 连接管理
│   │   ├── models/                          # 数据模型定义
│   │   │   ├── knowledge.go                 # 知识库模型
│   │   │   ├── timer.go                     # 定时任务模型
│   │   │   ├── timer_log.go                 # 定时任务日志模型
│   │   │   ├── mcp.go                       # MCP 配置模型
│   │   │   ├── category.go                  # 分类模型（2026-04-17）
│   │   │   └── notification.go              # 通知模型（2026-04-20）
│   │   └── repository/                      # ← 新增：数据访问层（2026-04-15）
│   │       ├── knowledge_repo.go            # 知识库 Repository
│   │       ├── timer_repo.go                # 定时任务 Repository
│   │       ├── timer_log_repo.go            # 定时任务日志 Repository
│   │       ├── mcp_repo.go                  # MCP Repository
│   │       ├── category_repo.go             # 分类 Repository（2026-04-17）
│   │       └── notification_repo.go         # 通知 Repository（2026-04-20）
│   ├── queue/                               # ← 新增：消息队列层（2026-04-15）
│   │   ├── queue.go                         # Queue 接口定义
│   │   └── badger_queue.go                  # BadgerDB 队列实现
│   └── scheduler/                           # ← 新增：任务调度层（2026-04-15）
│       └── scheduler.go                     # Cron 调度器
│   ├── application/service/                  # 应用层服务（2026-04-20）
│   │   ├── callback_executor.go              # 回调执行器
│   │   └── notification.go                   # 通知服务（新增）
├── pkg/
│   └── utils/
│       └── validator.go                     # 通用验证工具（2026-04-14）
├── docs/
│   └── feature/                             # 技术方案文档
├── .claude/
│   └── rules/
│       └── rules.md                         # 服务规则文件（2026-04-15）
├── go.mod                                   # Go 模块定义
├── Makefile                                 # 构建脚本（2026-04-14）
└── AGENTS.md                                # 本文件
```

## 🧠 Rules 自维护

**此章节指导 AI 如何自动维护本服务的规则。**

### Rules 文件位置
- 本服务规则：[.claude/rules/rules.md](.claude/rules/rules.md)

### 何时更新 Rules
开发完成后，如果满足以下条件之一，**必须**更新 Rules：
- 🆕 引入新的架构模式
- 📁 新增目录结构
- 📋 改变代码规范
- 🔁 出现重复实现（需要抽象规则）

### 如何更新 Rules
1. 打开 [.claude/rules/rules.md](.claude/rules/rules.md)
2. 在对应类别下追加新规则（不要覆盖）
3. 格式：`- 规则描述（发现日期：YYYY-MM-DD）`

### 新增规则速查（2026-04-15）
- GORM 模型定义规范：UUID 主键、TableName、时间戳、软删除、BeforeCreate 钩子
- BadgerDB Key 设计规范：层级结构、类型前缀、常量定义
- 数据库连接管理规范：连接池默认值、Ping 健康检查、优雅关闭
- 队列消息处理规范：Handler 接口分离、重试机制、消费确认

> 💡 提示：每次开发完成后问自己：这次我学到了什么模式值得记录？

## ✅ 开发检查清单

提交前检查：
- [ ] 本次修改只在当前 service 目录内
- [ ] 新加文件已更新上面的目录结构
- [ ] 如涉及新架构/规范，已更新 .claude/rules/rules.md

## 🚫 禁止

硬性红线（违反会导致架构混乱）：
- ❌ 跨 service import（只能调 API，不能 import 包）
- ❌ 直接修改其他 service 的代码
- ❌ 在 domain 层引用 infrastructure 层（违反 DDD）
- ❌ 在 repository 中直接暴露数据库实现细节

## 🕒 最后更新时间

2026-04-20 23:35:00
