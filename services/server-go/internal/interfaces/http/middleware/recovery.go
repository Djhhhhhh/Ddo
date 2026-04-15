package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// Recovery 异常恢复中间件
// 捕获 panic 并返回统一错误响应
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(
					500,
					"Internal server error",
					nil,
				))
				c.Abort()
			}
		}()
		c.Next()
	}
}
