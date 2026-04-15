package http

import (
	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/interfaces/http/handler"
	"github.com/ddo/server-go/internal/interfaces/http/middleware"
	"go.uber.org/zap"
)

// Router HTTP 路由器
type Router struct {
	engine *gin.Engine
	logger *zap.Logger
}

// NewRouter 创建路由器
func NewRouter(logger *zap.Logger) *Router {
	// 设置 Gin 模式
	gin.SetMode(gin.ReleaseMode)

	engine := gin.New()

	// 注册全局中间件（按执行顺序：越早注册的越早执行）
	engine.Use(
		middleware.RequestID(),      // 1. 请求 ID（最早执行，确保后续都能获取）
		middleware.CORS(),           // 2. 跨域支持
		middleware.Logger(logger),   // 3. 日志（记录完整请求）
		middleware.Recovery(logger), // 4. 异常恢复（最后执行，捕获所有 panic）
	)

	return &Router{
		engine: engine,
		logger: logger,
	}
}

// RegisterRoutes 注册路由
func (r *Router) RegisterRoutes(healthHandler *handler.HealthHandler) {
	// 健康检查
	r.engine.GET("/health", healthHandler.HealthCheck)

	// API v1 路由组
	v1 := r.engine.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.HealthCheckV1)
	}
}

// Engine 获取 gin.Engine
func (r *Router) Engine() *gin.Engine {
	return r.engine
}
