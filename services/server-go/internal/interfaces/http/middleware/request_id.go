package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// RequestIDHeader 请求 ID Header 名称
	RequestIDHeader = "X-Request-ID"
	// RequestIDContextKey 请求 ID 在 Context 中的键
	RequestIDContextKey = "request_id"
)

// RequestID 请求 ID 中间件
// 为每个请求生成唯一 ID，用于链路追踪
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 Header 中获取，如果没有则生成
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// 设置到 Context 和 Header
		c.Set(RequestIDContextKey, requestID)
		c.Writer.Header().Set(RequestIDHeader, requestID)

		c.Next()
	}
}

// GetRequestID 从 Context 获取请求 ID
func GetRequestID(c *gin.Context) string {
	if id, exists := c.Get(RequestIDContextKey); exists {
		if str, ok := id.(string); ok {
			return str
		}
	}
	return ""
}
