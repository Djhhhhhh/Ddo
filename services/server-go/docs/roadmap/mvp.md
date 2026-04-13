# Ddo server-go MVP需求文档 v1.0

## 1. 目标与指标

- 核心问题：作为 Ddo 平台的核心网关，提供统一的 API 路由、定时任务调度、消息队列、知识库管理和 MCP 管理能力，支撑 CLI 和 Web UI 的功能需求。
- 目标用户：CLI 和 Web UI 客户端，以及需要直接调用 REST API 的开发者。

**技术决策**：
- 数据库：MySQL 8.0（由 CLI 通过 Docker 管理，server-go 仅负责连接）
- **知识库**：server-go 只做元数据管理（CRUD），**RAG 检索交由 llm-py 处理**
- 鉴权：无鉴权，开源本地项目。服务绑定 `127.0.0.1:8080`，不对外开放
- 消息队列：BadgerDB 嵌入式，server-go 内部使用

- 成功指标：
  - API 响应时间 P99 < 200ms
  - 定时任务执行准确率 > 99.5%
  - 服务可用性（uptime）> 99%
  - 并发处理支持 100+ 同时连接

## 2. 核心流程（仅主要路径）

> 用户旅程图：服务启动 → 初始化数据库 → 启动调度器 → 接收 API 请求 → 业务处理 → 返回响应

1. 步骤一：服务启动
   - 加载配置文件和命令行参数
   - 初始化 MySQL 连接池（GORM）
   - 初始化 BadgerDB 嵌入式队列
   - 启动定时任务调度器（robfig/cron）
   - 注册 HTTP 路由（Gin 框架）
   - 监听端口（默认 8080）

2. 步骤二：API 请求处理
   - 接收来自 CLI/Web UI 的 HTTP 请求
   - JWT/Token 验证（预留）
   - 路由分发到对应 Handler
   - 业务逻辑处理（Service 层）
   - 统一响应格式返回

3. 步骤三：定时任务调度
   - 从数据库加载活跃定时任务
   - 解析 Cron 表达式，注册到调度器
   - 触发时投递到 BadgerDB 队列
   - 消费者执行回调（HTTP/Webhook）
   - 记录执行日志到 MySQL

4. 步骤四：MCP 管理
   - 维护 MCP 配置连接池
   - 支持 stdio/http/sse 三种类型
   - 提供 MCP 测试和工具发现接口

## 3. 功能列表（MoSCoW）

| 模块 | 功能点 | 优先级 | 描述 | 验收标准 |
|------|--------|--------|------|----------|
| 基础框架 | Gin HTTP 服务 | P0 | 基于 Gin 搭建 API 服务 | 1. 支持路由分组和中间件 2. 统一错误处理和响应格式 3. 支持 CORS 配置 |
| 基础框架 | 数据库连接池 | P0 | GORM + MySQL 连接管理 | 1. GORM 连接 MySQL（DSN 从配置文件/env读取） 2. 连接池自动管理 3. 连接断开自动重连 |
| 基础框架 | 数据库自动迁移 | P0 | GORM AutoMigrate | 1. 启动时自动创建表 2. 支持表结构演进 3. MySQL 由 CLI 启动，server-go 只负责连接 |
| 基础框架 | 服务绑定 | P0 | 绑定 127.0.0.1 | 1. 不监听 0.0.0.0，仅限本机访问 2. 默认端口 8080 3. 端口可配置 |
| 基础框架 | 健康检查 | P0 | `/health` 和 `/api/v1/health` | 1. 返回服务状态和各依赖状态 2. 支持 MySQL 连接检查 3. HTTP 200/503 状态码 |
| API 网关 | 统一路由管理 | P0 | RESTful API 路由注册 | 1. `/api/v1/*` 路由前缀 2. 仅支持 GET/POST 方法 3. 路由文档自动生成 |
| API 网关 | 统一响应格式 | P0 | 标准化 JSON 响应 | 1. `{code, message, data}` 格式 2. 分页响应格式统一 3. 错误响应格式统一 |
| 知识库 | 知识 CRUD | P0 | 知识条目元数据管理（存储在 MySQL） | 1. POST `/api/v1/knowledge` 创建 2. GET `/api/v1/knowledge` 分页查询 3. GET `/api/v1/knowledge/:uuid` 获取单条 4. POST `/api/v1/knowledge/:uuid/delete` 删除 |
| 知识库 | 分类和标签 | P1 | 知识的元数据管理 | 1. 支持 category 字段 2. 支持 tags JSON 数组 3. 支持按标签聚合统计 |
| **RAG 代理** | **文档嵌入** | **P0** | **代理到 llm-py 生成向量** | 1. 知识创建时转发到 llm-py `/api/rag/embed` 2. 存储向量到 Chroma/FAISS |
| **RAG 代理** | **语义搜索** | **P0** | **代理到 llm-py 检索** | 1. GET `/api/v1/knowledge/search?q=xxx` 代理到 llm-py 2. 返回语义相似结果 |
| **RAG 代理** | **RAG 问答** | **P0** | **代理到 llm-py 生成回答** | 1. POST `/api/v1/knowledge/ask` 代理到 llm-py 2. 返回带上下文的 AI 回答 |
| 定时任务 | 任务 CRUD | P0 | 定时任务的增删改查 | 1. POST `/api/v1/timers` 创建 2. GET `/api/v1/timers` 分页查询 3. POST `/api/v1/timers/:uuid/pause` 暂停 4. POST `/api/v1/timers/:uuid/resume` 恢复 5. POST `/api/v1/timers/:uuid/delete` 删除 |
| 定时任务 | Cron 调度 | P0 | 基于 robfig/cron 的调度 | 1. 支持标准 Cron 表达式 2. 调度精度分钟级 3. 支持时区配置 |
| 定时任务 | HTTP 回调 | P0 | 触发时执行 HTTP 回调 | 1. 支持 POST/GET 方法 2. 支持自定义 Headers 3. 支持 JSON body 模板 |
| 定时任务 | 执行日志 | P0 | 记录任务执行历史 | 1. GET `/api/v1/timers/:uuid/logs` 分页查询 2. 记录状态、输出、错误、耗时 3. 自动清理 30 天前日志 |
| MPC 管理 | MCP CRUD | P0 | MCP 配置的增删改查 | 1. POST `/api/v1/mcps` 创建 2. GET `/api/v1/mcps` 列表查询 3. POST `/api/v1/mcps/:uuid/delete` 删除 |
| MPC 管理 | 连接池 | P0 | MCP 连接生命周期管理 | 1. stdio 类型支持进程管理 2. http/sse 类型支持连接复用 3. 自动重连机制 |
| MPC 管理 | MCP 测试 | P0 | 测试 MCP 连接 | 1. POST `/api/v1/mcps/:uuid/test` 2. 返回连接状态和可用工具列表 3. 记录测试耗时 |
| MPC 管理 | 工具调用 | P1 | 代理 MCP 工具调用 | 1. POST `/api/v1/mcps/:uuid/call` 2. 支持工具发现和调用 3. 超时控制和错误处理 |
| 消息队列 | BadgerDB 队列 | P0 | 嵌入式延时队列 | 1. 支持立即发布和延时发布 2. 支持优先级队列 3. 支持 Topic 订阅 |
| 消息队列 | 延时任务调度 | P0 | 定时任务触发投递 | 1. Cron 触发写入延时队列 2. 调度器轮询执行 3. 支持任务重试 |
| LLM 代理 | 对话转发 | P0 | 转发到 llm-py 服务 | 1. POST `/api/v1/chat` 代理 2. 支持流式（SSE）和非流式 3. 支持 MCP tools 参数 |
| LLM 代理 | NLP 意图识别 | P0 | 自然语言理解接口 | 1. POST `/api/v1/chat/nlp` 2. 识别 intent 和 parameters 3. 返回友好的 reply |
| 监控指标 | Metrics API | P0 | `/api/v1/metrics` | 1. 返回服务健康状态汇总 2. 返回定时任务统计 3. 返回知识库统计 4. 返回 MCP 连接状态 5. 返回 LLM 调用趋势 |
| 配置管理 | Settings API | P1 | 系统配置管理 | 1. GET `/api/v1/settings` 获取所有 2. POST `/api/v1/settings` 设置键值 3. GET `/api/v1/preferences` 用户偏好 |

## 4. 本期不做（明确排除）

> 注意：本期为**开源本地项目**，以下功能本期不做，但设计时预留扩展空间

- ~~JWT 认证和鉴权~~（开源本地项目，无需鉴权，服务绑定 127.0.0.1）
- ~~Elasticsearch 向量搜索~~（本期使用 llm-py + Chroma/FAISS 实现 RAG）
- 分布式锁和多实例部署
- 自定义中间件插件机制
- WebSocket 实时推送（预留接口，本期仅 HTTP，Electron 通知用轮询）
- 完整的 RBAC 权限系统
- 数据备份和恢复 API（放到 CLI 层实现）
- 消息队列的持久化高可用（BadgerDB 单点）

## 5. 底线要求

- 性能：
  - API 响应时间 P99 < 200ms
  - 数据库查询优化，慢查询（>100ms）比例 < 1%
  - 并发处理 100+ 连接
- 可用性：
  - MySQL 断开自动重连
  - Goroutine 泄露防护
  - 优雅关闭（Graceful Shutdown）支持
  - 关键错误告警（预留接口）
- 埋点事件：
  - `api_request`: API 请求（含路径、耗时、状态码）
  - `timer_executed`: 定时任务执行（含状态、耗时）
  - `mcp_connected`: MCP 连接成功
  - `mcp_call`: MCP 工具调用
  - `llm_proxy_request`: LLM 代理请求
  - `rag_proxy_request`: RAG 代理请求（转发到 llm-py）

## 附录

- 目录结构图：
  ```
  server-go/
  ├── cmd/server/
  │   └── main.go           # 入口
  ├── internal/
  │   ├── api/              # HTTP 路由和 Handler
  │   │   ├── router.go
  │   │   ├── knowledge.go
  │   │   ├── timer.go
  │   │   ├── mcp.go
  │   │   ├── health.go
  │   │   └── metrics.go
  │   ├── service/          # 业务逻辑层
  │   │   ├── knowledge_service.go
  │   │   ├── timer_service.go
  │   │   ├── mcp_service.go
  │   │   ├── llm_proxy.go
  │   │   └── metrics_service.go
  │   ├── scheduler/        # 定时任务调度器
  │   │   └── scheduler.go
  │   ├── queue/            # BadgerDB 队列实现
  │   │   └── queue.go
  │   ├── mcp/              # MCP 客户端实现
  │   │   ├── client.go
  │   │   └── stdio.go
  │   ├── db/               # 数据库连接和模型
  │   │   ├── mysql.go
  │   │   └── models/
  │   └── config/           # 配置管理
  │       └── config.go
  ├── go.mod
  └── docker-compose.yml    # MySQL 启动配置
  ```
- 相关文档：
  - [MVP 总览](../../../docs/roadmap/mvp.md)
  - [CLI MVP](../../cli/docs/roadmap/mvp.md)
  - [llm-py MVP](../../llm-py/docs/roadmap/mvp.md)
  - [web-ui MVP](../../web-ui/docs/roadmap/mvp.md)
