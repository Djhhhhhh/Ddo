package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func TestRecovery_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	logger := zap.NewNop()

	router := gin.New()
	router.Use(Recovery(logger))
	router.GET("/panic", func(c *gin.Context) {
		panic("test panic")
	})
	router.GET("/ok", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// 测试正常请求
	t.Run("normal request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/ok", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
		}
	})

	// 测试 panic 恢复
	t.Run("panic recovery", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/panic", nil)
		w := httptest.NewRecorder()

		// 不应该导致测试崩溃
		router.ServeHTTP(w, req)

		// 验证返回 500
		if w.Code != http.StatusInternalServerError {
			t.Errorf("expected status %d after panic, got %d", http.StatusInternalServerError, w.Code)
		}

		// 验证响应体包含错误信息
		body := w.Body.String()
		if body == "" {
			t.Error("expected error response body after panic")
		}
	})
}
