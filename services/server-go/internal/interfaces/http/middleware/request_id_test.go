package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestID_GeneratesNewID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/test", func(c *gin.Context) {
		// 从 context 获取 request ID
		id := GetRequestID(c)
		c.String(http.StatusOK, id)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证响应头包含 X-Request-ID
	requestID := w.Header().Get(RequestIDHeader)
	if requestID == "" {
		t.Error("expected X-Request-ID header to be set")
	}

	// 验证 ID 格式（UUID 长度应该是 36 字符）
	if len(requestID) != 36 {
		t.Errorf("expected UUID length 36, got %d", len(requestID))
	}
}

func TestRequestID_PreservesExistingID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(RequestID())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, GetRequestID(c))
	})

	// 发送带 X-Request-ID 的请求
	existingID := "my-custom-request-id"
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set(RequestIDHeader, existingID)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证返回的 ID 与发送的一致
	returnedID := w.Header().Get(RequestIDHeader)
	if returnedID != existingID {
		t.Errorf("expected request ID %s, got %s", existingID, returnedID)
	}

	body := w.Body.String()
	if body != existingID {
		t.Errorf("expected body to contain %s, got %s", existingID, body)
	}
}

func TestGetRequestID_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	// 不使用 RequestID 中间件
	router.GET("/test", func(c *gin.Context) {
		id := GetRequestID(c)
		c.String(http.StatusOK, id)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 应该返回空字符串
	if w.Body.String() != "" {
		t.Errorf("expected empty body, got %s", w.Body.String())
	}
}

func TestGetRequestID_WrongType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		// 设置一个非字符串类型的值
		c.Set(RequestIDContextKey, 123)
		c.Next()
	})
	router.GET("/test", func(c *gin.Context) {
		id := GetRequestID(c)
		c.String(http.StatusOK, id)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 非字符串类型应该返回空字符串
	if w.Body.String() != "" {
		t.Errorf("expected empty body for non-string type, got %s", w.Body.String())
	}
}

func TestRequestID_ConstantValues(t *testing.T) {
	// 验证常量定义
	if RequestIDHeader != "X-Request-ID" {
		t.Errorf("expected RequestIDHeader to be 'X-Request-ID', got %s", RequestIDHeader)
	}

	if RequestIDContextKey != "request_id" {
		t.Errorf("expected RequestIDContextKey to be 'request_id', got %s", RequestIDContextKey)
	}
}
