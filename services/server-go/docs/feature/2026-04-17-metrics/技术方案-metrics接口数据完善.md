# 技术方案：Metrics 接口数据完善

> 状态：待评审
> 创建时间：2026-04-20
> 服务：server-go

## 1. 背景与目标

### 1.1 当前问题

`/api/v1/metrics` 接口返回的 `timers`、`knowledge`、`mcps` 数据都是 mock 值（硬编码为 0），无法反映系统的真实状态。

### 1.2 目标

1. **服务状态监控**：返回 go、llm、cli、web 的服务健康状态
2. **统计数据**：实时统计 timers、knowledge、mcps 的数量信息
3. **可扩展性**：预留接口便于后续添加新的统计指标

## 2. 设计方案

### 2.1 接口响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "ok",
    "version": "0.1.0",
    "timestamp": "2026-04-20T10:00:00Z",
    "services": {
      "server_go": "running",
      "llm_py": "running|stopped",
      "mysql": "connected|disconnected",
      "cli": "running",
      "web": "running"
    },
    "metrics": {
      "timers": {
        "total": 10,
        "active": 5
      },
      "knowledge": {
        "total": 100
      },
      "mcps": {
        "total": 5
      }
    }
  }
}
```

### 2.2 服务状态检测策略

| 服务 | 检测方式 | 实现说明 |
|------|---------|---------|
| server-go | 固定 "running" | 本身在运行才响应请求 |
| llm-py | HTTP GET /health | 已有逻辑，超时 2s |
| mysql | dbConn.GetMySQLStatus() | 已有逻辑 |
| cli | 固定 "running" | Claude Code REPL，无需检测 |
| web | 固定 "running" | 前端 SPA，无需检测 |

**说明**：cli 和 web 服务作为前端组件，默认运行状态即可，无需健康检查。

### 2.3 统计指标获取

新增 `MetricsRepository` 提供统计聚合能力：

```go
// MetricsRepository 统计指标数据访问接口
type MetricsRepository interface {
    CountTimers(ctx context.Context) (total, active int64, err error)
    CountKnowledge(ctx context.Context) (total int64, err error)
    CountMCPs(ctx context.Context) (total int64, err error)
}
```

复用现有 Repository 的 `List()` 方法统计总数：
- Timer: `List(filter{TimerFilter{}})` 获取 total
- Timer: `ListActive()` 获取 active
- Knowledge: `List(filter{KnowledgeFilter{}})` 获取 total
- MCP: `List(filter{MCPFilter{}})` 获取 total

### 2.4 模块依赖

```
metrics_handler.go
    ├── dbConn (*db.MySQLConn)
    ├── queue (queue.Queue)
    ├── llmPyURL (string)
    └── timerRepo (repository.TimerRepository)      # 新增
    └── knowledgeRepo (repository.KnowledgeRepository) # 新增
    └── mcpRepo (repository.MCPRepository)          # 新增
```

## 3. 实施步骤

### 3.1 第一步：重构 MetricsHandler 依赖注入

**文件**：`internal/interfaces/http/handler/metrics_handler.go`

1. 添加 Repository 依赖字段
2. 修改 `NewMetricsHandler` 构造函数
3. 更新 wire.go 依赖注入

```go
// MetricsHandler metrics 请求处理
type MetricsHandler struct {
    dbConn        *db.MySQLConn
    queue         queue.Queue
    llmPyURL      string
    timerRepo     repository.TimerRepository
    knowledgeRepo repository.KnowledgeRepository
    mcpRepo       repository.MCPRepository
}

// NewMetricsHandler 创建 metrics 处理器
func NewMetricsHandler(
    dbConn *db.MySQLConn,
    queue queue.Queue,
    llmPyURL string,
    timerRepo repository.TimerRepository,
    knowledgeRepo repository.KnowledgeRepository,
    mcpRepo repository.MCPRepository,
) *MetricsHandler {
    return &MetricsHandler{
        dbConn:        dbConn,
        queue:         queue,
        llmPyURL:      llmPyURL,
        timerRepo:     timerRepo,
        knowledgeRepo: knowledgeRepo,
        mcpRepo:       mcpRepo,
    }
}
```

### 3.2 第二步：添加统计查询方法

**文件**：`internal/db/repository/metrics_repo.go`（新建）

提供聚合统计方法：

```go
package repository

// MetricsRepository 统计指标数据访问接口
type MetricsRepository interface {
    CountTimers(ctx context.Context) (total, active int64, err error)
    CountKnowledge(ctx context.Context) (total int64, err error)
    CountMCPs(ctx context.Context) (total int64, err error)
}
```

实现复用现有方法，避免重复代码。

### 3.3 第三步：更新 Metrics 响应逻辑

**文件**：`internal/interfaces/http/handler/metrics_handler.go`

1. cli/web 服务状态固定为 "running"
2. 查询真实统计数据填充响应

```go
func (h *MetricsHandler) Metrics(c *gin.Context) {
    ctx := c.Request.Context()

    // 1. 服务状态检测
    services := h.getServicesStatus()

    // 2. 统计指标
    timers := h.getTimersMetrics(ctx)
    knowledge := h.getKnowledgeMetrics(ctx)
    mcps := h.getMcpsMetrics(ctx)

    response := MetricsResponse{
        Code:    0,
        Message: "ok",
        Data: MetricsData{
            Status:    "ok",
            Version:   "0.1.0",
            Timestamp: time.Now().Format(time.RFC3339),
            Services:  services,
            Timers:     timers,
            Knowledge: knowledge,
            Mcps:      mcps,
        },
    }

    c.JSON(http.StatusOK, response)
}
```

### 3.4 第四步：更新 wire.go 依赖注入

**文件**：`wire.go`（或 `internal/wire.go`）

```go
func NewMetricsHandler(
    dbConn *db.MySQLConn,
    queue queue.Queue,
    cfg *config.Config,
    timerRepo repository.TimerRepository,
    knowledgeRepo repository.KnowledgeRepository,
    mcpRepo repository.MCPRepository,
) *handler.MetricsHandler {
    return handler.NewMetricsHandler(
        dbConn, queue, cfg.LLMPyURL,
        timerRepo, knowledgeRepo, mcpRepo,
    )
}
```

## 4. 扩展性设计

### 4.1 添加新统计指标

后续添加新指标只需：

1. 在 `MetricsData` 结构体添加新字段
2. 在 `MetricsRepository` 添加新统计方法
3. 在 `Metrics()` handler 调用新统计方法

### 4.2 服务状态扩展

`ServicesMetrics` 结构体预留 `Extra` 字段：

```go
type ServicesMetrics struct {
    ServerGo string            `json:"server_go"`
    LlmPy    string            `json:"llm_py"`
    MySQL    string            `json:"mysql"`
    CLI      string            `json:"cli"`
    Web      string            `json:"web"`
    Extra    map[string]string `json:"extra,omitempty"`
}
```

## 5. 文件清单

| 操作 | 文件路径 |
|------|---------|
| 修改 | `internal/interfaces/http/handler/metrics_handler.go` |
| 新建 | `internal/db/repository/metrics_repo.go` |
| 修改 | `wire.go` (依赖注入) |
| 修改 | `docs/roadmap/todo-list/ddo-tasks.json` (添加任务) |

## 6. 测试清单

- [ ] metrics 接口返回 200 状态码
- [ ] timers.total 和 timers.active 返回真实计数
- [ ] knowledge.total 返回真实计数
- [ ] mcps.total 返回真实计数
- [ ] 服务状态检测正确（server_go/llm_py/mysql 运行状态）
- [ ] cli/web 默认显示 running
- [ ] 数据库无数据时返回 0

## 7. 风险与注意事项

1. **数据库查询性能**：metrics 接口可能被高频调用，需要注意查询效率
2. **并发安全**：统计查询不应锁定资源太久

---

**待评审后执行编码**
