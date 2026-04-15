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
