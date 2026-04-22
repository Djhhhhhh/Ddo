# Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：2026-04-14

## 架构规则

### DDD 四层架构依赖关系（2026-04-14）
依赖方向：接口层 → 应用层 → 领域层 → （不依赖外层）
- 领域层是核心业务，不依赖任何外层
- 应用层编排用例，依赖领域层
- 接口层适配协议，依赖应用层
- 基础设施层实现技术细节，依赖领域层定义的接口

### Wire 依赖注入最佳实践（2026-04-14）
- Provider 函数放在 wire.go 中，生成的代码放在 wire_gen.go
- wire_gen.go 手动维护时，确保 Provider 调用顺序正确
- 路由注册应在 Engine 创建后、Server 启动前完成
- 使用 cleanup 函数处理资源释放（如日志 flush）

### GORM 模型定义规范（2026-04-15）
- 使用 `uuid.New()` 生成主键，字段类型 `varchar(36)`
- 每个模型添加 `TableName()` 返回小写蛇形表名
- 时间戳字段使用 `time.Time` 类型，GORM 自动管理
- 软删除使用 `gorm.DeletedAt` 和 `gorm:"index"`
- JSON 字段使用 `string` 类型存储，应用层序列化/反序列化
- BeforeCreate 钩子中自动生成 UUID 主键

### BadgerDB Key 设计规范（2026-04-15）
- 使用冒号分隔的层级结构：`{type}:{topic}:{id}`
- 延时消息：`delayed:{timestamp}:{uuid}` 按时间排序
- 待处理消息：`pending:{topic}:{priority}:{uuid}` 按优先级排序
- 元数据：`meta:{type}:{key}` 存储配置和统计
- Key 前缀定义在常量中，避免硬编码

## 代码规范

### Go 项目目录规范（2026-04-14）
- `cmd/server/main.go` - 单一入口，处理命令行参数
- `internal/` - 私有代码，按 DDD 分层组织
- `pkg/` - 可共享的公共工具（不依赖 internal）
- `configs/` - 配置文件模板

### 错误处理规范（2026-04-14）
- 领域层使用 DomainError 定义业务错误
- 应用层返回 Result[T] 统一结果封装
- 接口层将错误转换为 HTTP 响应

### 数据库连接管理规范（2026-04-15）
- 连接池参数设置默认值常量（MaxOpenConns 100，MaxIdleConns 10）
- 提供 Ping 方法用于健康检查
- 提供 Close 方法优雅关闭，返回 cleanup 函数
- 失败时返回详细错误信息，不 panic

### SQLite 本地存储规范（2026-04-21）
- server-go 默认使用 SQLite 文件数据库，配置项优先读取 `database.path`
- SQLite 连接初始化时统一开启 `WAL` 和 `busy_timeout`，降低本地并发写入冲突
- Repository 构造函数优先依赖 `*gorm.DB`，避免与具体数据库连接包装类型耦合

### 队列消息处理规范（2026-04-15）
- Handler 接口分离，支持函数和结构体实现
- 消息失败时根据重试次数决定是否重新投递
- 消费确认后删除消息，保证 at-least-once 语义
- 调度器轮询间隔可配置，默认 1 秒

## 常见陷阱

### Wire 注入循环依赖（2026-04-14）
**问题**：Router 依赖 Handler，Handler 依赖 UseCase，但 Router 需要在 Server 启动前注册路由
**解决**：在 wire_gen.go 中按顺序初始化：Router → Handler → RegisterRoutes → Server

### Gin Engine 模式设置（2026-04-14）
**问题**：Gin 默认是 Debug 模式，生产环境需要显式设置 ReleaseMode
**解决**：在 NewRouter 中调用 `gin.SetMode(gin.ReleaseMode)` 或根据配置设置

### 日志 Sync 错误（2026-04-14）
**问题**：zap.Logger.Sync() 在标准输出上会返回错误
**解决**：优雅关闭时忽略 Sync 错误，或检查输出类型

### BadgerDB 数据目录创建（2026-04-15）
**问题**：BadgerDB 打开不存在的目录会报错
**解决**：NewBadgerQueue 中使用 `os.MkdirAll` 预先创建数据目录

### GORM BeforeCreate 钩子参数类型（2026-04-15）
**问题**：GORM v2 的 BeforeCreate 钩子参数类型不正确会导致警告
**解决**：使用 `*gorm.DB` 作为参数类型，`func (m *Model) BeforeCreate(tx *gorm.DB) error`
**错误示例**：`BeforeCreate(tx interface{})` 会触发 GORM 警告

### MySQL 连接失败处理（2026-04-15）
**问题**：MySQL 连接失败会导致服务无法启动
**解决**：在 provideMySQLConn 中捕获错误，返回 nil 和空 cleanup，让健康检查报告状态

### LLM 代理服务硬编码地址（2026-04-22）
**问题**：llm_proxy/rag_proxy/intent_proxy 中硬编码 localhost:8000 导致连接失败
**解决**：统一使用 resolveLLMBaseURL() 函数，优先级：环境变量 DDO_LLM_HOST > config.yaml llm_py_url > 默认值

## 示例参考

### 用例实现模板（2026-04-14）
```go
// internal/application/usecase/feature/action.go
type UseCase interface {
    Execute(ctx context.Context, input Input) *result.Result[Output]
}

type useCase struct {
    // 依赖注入
}

func NewUseCase(...) UseCase {
    return &useCase{...}
}

func (uc *useCase) Execute(ctx context.Context, input Input) *result.Result[Output] {
    // 1. 参数验证
    // 2. 调用领域层
    // 3. 返回结果
    return result.NewSuccess(output)
}
```

### Handler 实现模板（2026-04-14）
```go
// internal/interfaces/http/handler/feature_handler.go
type FeatureHandler struct {
    useCase feature.UseCase
}

func NewFeatureHandler(uc feature.UseCase) *FeatureHandler {
    return &FeatureHandler{useCase: uc}
}

func (h *FeatureHandler) Handle(c *gin.Context) {
    ctx := c.Request.Context()
    result := h.useCase.Execute(ctx, input)

    if !result.IsSuccess() {
        c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(...))
        return
    }

    c.JSON(http.StatusOK, dto.ToResponse(result.Data))
}
```

### GORM 模型定义模板（2026-04-15）
```go
// internal/db/models/model.go
type Model struct {
    ID        string         `gorm:"type:varchar(36);primaryKey" json:"id"`
    UUID      string         `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (m *Model) BeforeCreate(tx *gorm.DB) error {
    if m.ID == "" {
        m.ID = uuid.New().String()
    }
    return nil
}
```

### 队列 Publisher 使用示例（2026-04-15）
```go
// 发布立即消息
err := queue.Publish(ctx, "timer", payload, 0, 0)

// 发布延时消息（5秒后投递）
err := queue.Publish(ctx, "notify", payload, 0, 5*time.Second)

// 发布高优先级消息
err := queue.Publish(ctx, "critical", payload, 1, 0)
```

### 知识库模块依赖注入模式（2026-04-15）
Repository 模式 + UseCase 编排 + Handler 适配：
```go
// Repository 定义接口和实现分离
type KnowledgeRepository interface {
    Create(ctx context.Context, knowledge *models.Knowledge) error
    GetByUUID(ctx context.Context, uuid string) (*models.Knowledge, error)
    // ...
}

// UseCase 组合 Repository 和 Service
func NewCreateKnowledgeUseCase(
    knowledgeRepo repository.KnowledgeRepository,
    ragProxy service.RAGProxy,
) CreateKnowledgeUseCase {
    return &createKnowledgeUseCase{
        knowledgeRepo: knowledgeRepo,
        ragProxy:      ragProxy,
    }
}

// Handler 聚合所有 UseCase
type KnowledgeHandler struct {
    createUseCase  knowledge.CreateKnowledgeUseCase
    listUseCase    knowledge.ListKnowledgeUseCase
    // ...
}
```
