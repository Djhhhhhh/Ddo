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
func (r *Router) RegisterRoutes(
	healthHandler *handler.HealthHandler,
	knowledgeHandler *handler.KnowledgeHandler,
	timerHandler *handler.TimerHandler,
	mcpHandler *handler.MCPHandler,
	llmHandler *handler.LLMHandler,
	metricsHandler *handler.MetricsHandler,
	categoryHandler *handler.CategoryHandler,
	conversationHandler *handler.ConversationHandler,
	notificationHandler *handler.NotificationHandler,
	llmStatsHandler *handler.LLMStatsHandler,
) {
	// 健康检查
	r.engine.GET("/health", healthHandler.HealthCheck)

	// API v1 路由组
	v1 := r.engine.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.HealthCheckV1)
		v1.GET("/metrics", metricsHandler.Metrics)

		// LLM 代理路由
		v1.POST("/chat", llmHandler.Chat)                    // 对话
		v1.POST("/chat/nlp", llmHandler.NLP)                 // NLP 意图识别
		v1.POST("/chat/stream", conversationHandler.ChatStream)  // 流式对话

		// 统一对话路由
		conversation := v1.Group("/conversation")
		{
			conversation.POST("/chat", conversationHandler.Chat)       // 统一对话接口
			conversation.POST("/chat/stream", conversationHandler.ChatStream) // 流式对话接口
		}

		// 知识库路由组
		knowledge := v1.Group("/knowledge")
		{
			knowledge.POST("", knowledgeHandler.CreateKnowledge)                // 创建知识
			knowledge.GET("", knowledgeHandler.ListKnowledge)                   // 查询列表
			knowledge.GET("/search", knowledgeHandler.SearchKnowledge)          // 语义搜索
			knowledge.POST("/ask", knowledgeHandler.AskKnowledge)               // RAG 问答
			knowledge.GET("/:uuid", knowledgeHandler.GetKnowledge)              // 获取详情
			knowledge.POST("/:uuid/delete", knowledgeHandler.DeleteKnowledge)   // 删除知识
		}

		// 定时任务路由组
		timers := v1.Group("/timers")
		{
			timers.POST("", timerHandler.CreateTimer)                    // 创建定时任务
			timers.GET("", timerHandler.ListTimers)                      // 查询列表
			timers.GET("/:uuid", timerHandler.GetTimer)                  // 获取详情
			timers.POST("/:uuid/update", timerHandler.UpdateTimer)      // 更新定时任务
			timers.POST("/:uuid/pause", timerHandler.PauseTimer)        // 暂停定时任务
			timers.POST("/:uuid/resume", timerHandler.ResumeTimer)      // 恢复定时任务
			timers.POST("/:uuid/delete", timerHandler.DeleteTimer)      // 删除定时任务
			timers.POST("/:uuid/trigger", timerHandler.TriggerTimer)    // 手动触发
			timers.GET("/:uuid/logs", timerHandler.ListTimerLogs)       // 查询执行日志
		}

		// MCP 管理路由组
		mcps := v1.Group("/mcps")
		{
			mcps.POST("", mcpHandler.CreateMCP)                    // 创建 MCP 配置
			mcps.GET("", mcpHandler.ListMCP)                      // 查询 MCP 列表
			mcps.GET("/:uuid", mcpHandler.GetMCP)                  // 获取 MCP 详情
			mcps.POST("/:uuid/delete", mcpHandler.DeleteMCP)      // 删除 MCP 配置
			mcps.POST("/:uuid/test", mcpHandler.TestMCP)          // 测试 MCP 连接
		}

		// 分类管理路由组
		categories := v1.Group("/categories")
		{
			categories.POST("", categoryHandler.CreateCategory)                           // 创建分类
			categories.GET("", categoryHandler.ListCategories)                            // 查询分类列表
			categories.GET("/:id/knowledge", categoryHandler.GetKnowledgeByCategory)      // 获取某分类下的知识
			categories.DELETE("/:id", categoryHandler.DeleteCategory)                     // 删除分类
		}

		// 通知路由组
		notifications := v1.Group("/notifications")
		{
			notifications.GET("/subscribe", notificationHandler.SubscribeNotifications)   // 订阅通知（轮询接口）
			notifications.POST("/:id/read", notificationHandler.MarkAsRead)              // 标记通知为已读
		}

		// LLM 统计路由组（Dashboard 用）
		llmStats := v1.Group("/llm")
		{
			llmStats.GET("/stats/overview", llmStatsHandler.GetOverview)    // 概览统计
			llmStats.GET("/stats/trend", llmStatsHandler.GetTrend)          // 趋势数据
			llmStats.GET("/conversations", llmStatsHandler.ListConversations) // 对话列表
			llmStats.GET("/conversations/:id", llmStatsHandler.GetConversationDetail) // 对话详情
		}
	}
}

// Engine 获取 gin.Engine
func (r *Router) Engine() *gin.Engine {
	return r.engine
}
