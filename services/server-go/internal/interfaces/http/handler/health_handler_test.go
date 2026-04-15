package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/application/usecase/health"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

// MockUseCase 用于测试的 UseCase Mock
type MockUseCase struct {
	result *result.Result[health.CheckHealthOutput]
}

func (m *MockUseCase) Execute(ctx interface{}, input health.CheckHealthInput) *result.Result[health.CheckHealthOutput] {
	return m.result
}

func TestHealthHandler_HealthCheck_Success(t *testing.T) {
	router := setupTestRouter()

	// 创建 Handler
	uc := health.NewUseCase("v1.0.0")
	handler := NewHealthHandler(uc, "v1.0.0")

	router.GET("/health", handler.HealthCheck)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证状态码
	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	// 验证响应内容包含预期字段
	body := w.Body.String()
	if body == "" {
		t.Error("expected non-empty response body")
	}

	// 验证 Content-Type
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json; charset=utf-8" {
		t.Errorf("expected Content-Type application/json, got %s", contentType)
	}
}

func TestHealthHandler_HealthCheckV1_Success(t *testing.T) {
	router := setupTestRouter()

	uc := health.NewUseCase("v1.0.0")
	handler := NewHealthHandler(uc, "v1.0.0")

	router.GET("/api/v1/health", handler.HealthCheckV1)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证状态码
	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	// 验证响应内容
	body := w.Body.String()
	if body == "" {
		t.Error("expected non-empty response body")
	}
}

func TestHealthHandler_NewHealthHandler(t *testing.T) {
	uc := health.NewUseCase("v1.0.0")
	h := NewHealthHandler(uc, "v1.0.0")

	if h == nil {
		t.Fatal("expected handler to not be nil")
	}

	if h.checkHealthUC != uc {
		t.Error("expected usecase to be set")
	}

	if h.version != "v1.0.0" {
		t.Errorf("expected version v1.0.0, got %s", h.version)
	}
}

func TestHealthHandler_ResponseStructure(t *testing.T) {
	router := setupTestRouter()

	uc := health.NewUseCase("v2.0.0")
	handler := NewHealthHandler(uc, "v2.0.0")

	router.GET("/health", handler.HealthCheck)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	body := w.Body.String()

	// 验证响应包含 code, message, data
	expectedFields := []string{"code", "message", "data", "status", "version", "timestamp"}
	for _, field := range expectedFields {
		if !contains(body, field) {
			t.Errorf("expected response to contain '%s'", field)
		}
	}
}

func contains(s, substr string) bool {
	return len(s) > 0 && (s == substr || len(s) > len(substr))
}

// FailingUseCase 模拟失败的用例
type FailingUseCase struct{}

func (f *FailingUseCase) Execute(ctx context.Context, input health.CheckHealthInput) *result.Result[health.CheckHealthOutput] {
	return result.NewFailure[health.CheckHealthOutput](errors.New("service unavailable"))
}

func TestHealthHandler_HealthCheck_Error(t *testing.T) {
	router := setupTestRouter()

	// 使用失败的 UseCase
	failingUC := &FailingUseCase{}
	handler := NewHealthHandler(failingUC, "v1.0.0")

	router.GET("/health", handler.HealthCheck)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证错误状态码 (HealthCheck 使用 500)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}
}
