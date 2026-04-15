package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger 请求日志中间件
// 记录请求信息、耗时、状态码
func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// 处理请求
		c.Next()

		// 记录响应信息
		duration := time.Since(start)
		status := c.Writer.Status()
		clientIP := c.ClientIP()

		fields := []zap.Field{
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("duration", duration),
			zap.String("client_ip", clientIP),
		}

		// 根据状态码选择日志级别
		if status >= 500 {
			logger.Error("HTTP Request", fields...)
		} else if status >= 400 {
			logger.Warn("HTTP Request", fields...)
		} else {
			logger.Info("HTTP Request", fields...)
		}
	}
}
