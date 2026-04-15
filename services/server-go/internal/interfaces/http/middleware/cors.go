package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS 跨域中间件
// 允许本地开发环境跨域请求
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 允许的源（开发环境放宽限制，生产环境应严格限制）
		allowedOrigins := []string{
			"http://localhost:3000",
			"http://localhost:8080",
			"http://localhost:5173", // Vite 默认端口
			"http://127.0.0.1:3000",
			"http://127.0.0.1:8080",
		}

		// 检查 Origin 是否允许
		allowOrigin := ""
		for _, o := range allowedOrigins {
			if origin == o {
				allowOrigin = origin
				break
			}
		}

		// 如果没有匹配的 Origin，使用通配符（仅允许简单请求）
		if allowOrigin == "" {
			allowOrigin = "*"
		}

		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, Accept, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
