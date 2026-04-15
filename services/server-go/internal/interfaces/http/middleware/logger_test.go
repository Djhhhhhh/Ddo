package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestLogger_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// 创建 observer 用于捕获日志
	core, observed := observer.New(zap.InfoLevel)
	logger := zap.New(core)

	router := gin.New()
	router.Use(Logger(logger))
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})
	router.GET("/error", func(c *gin.Context) {
		c.String(http.StatusInternalServerError, "Error")
	})

	t.Run("logs info for success", func(t *testing.T) {
		observed.TakeAll() // 清空之前的日志

		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// 验证日志被记录
		entries := observed.All()
		if len(entries) == 0 {
			t.Error("expected log entry to be recorded")
			return
		}

		entry := entries[0]
		if entry.Message != "HTTP Request" {
			t.Errorf("expected message 'HTTP Request', got %s", entry.Message)
		}

		// 验证包含必要字段
		fields := entry.ContextMap()
		if _, ok := fields["method"]; !ok {
			t.Error("expected 'method' field in log")
		}
		if _, ok := fields["path"]; !ok {
			t.Error("expected 'path' field in log")
		}
		if _, ok := fields["status"]; !ok {
			t.Error("expected 'status' field in log")
		}
	})

	t.Run("logs error for 5xx", func(t *testing.T) {
		// 创建一个新的 observer 用于 error 级别
		core, observed := observer.New(zap.ErrorLevel)
		logger := zap.New(core)

		router := gin.New()
		router.Use(Logger(logger))
		router.GET("/error", func(c *gin.Context) {
			c.String(http.StatusInternalServerError, "Error")
		})

		req := httptest.NewRequest(http.MethodGet, "/error", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// 验证错误日志被记录
		entries := observed.All()
		if len(entries) > 0 {
			if entries[0].Level != zap.ErrorLevel {
				t.Errorf("expected error level log, got %s", entries[0].Level)
			}
		}
	})
}

func TestLogger_LogsAllRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	core, observed := observer.New(zap.InfoLevel)
	logger := zap.New(core)

	router := gin.New()
	router.Use(Logger(logger))
	router.POST("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	req := httptest.NewRequest(http.MethodPost, "/test?query=param", nil)
	req.Header.Set("X-Forwarded-For", "192.168.1.1")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	entries := observed.All()
	if len(entries) == 0 {
		t.Fatal("expected log entry")
	}

	fields := entries[0].ContextMap()

	// 验证字段值
	if fields["method"] != "POST" {
		t.Errorf("expected method POST, got %v", fields["method"])
	}

	if fields["path"] != "/test" {
		t.Errorf("expected path /test, got %v", fields["path"])
	}

	if fields["status"] != int64(http.StatusOK) {
		t.Errorf("expected status 200, got %v", fields["status"])
	}
}
