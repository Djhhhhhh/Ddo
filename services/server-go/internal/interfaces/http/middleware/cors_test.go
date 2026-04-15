package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORS_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	tests := []struct {
		name string
		origin string
		expectOrigin string
	}{
		{"localhost:3000", "http://localhost:3000", "http://localhost:3000"},
		{"localhost:8080", "http://localhost:8080", "http://localhost:8080"},
		{"localhost:5173", "http://localhost:5173", "http://localhost:5173"},
		{"unknown origin", "http://example.com", "*"},
		{"empty origin", "", "*"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// 验证 CORS 头
			origin := w.Header().Get("Access-Control-Allow-Origin")
			if origin != tt.expectOrigin {
				t.Errorf("expected Access-Control-Allow-Origin %s, got %s", tt.expectOrigin, origin)
			}

			// 验证其他必要 CORS 头
			if w.Header().Get("Access-Control-Allow-Methods") == "" {
				t.Error("expected Access-Control-Allow-Methods header")
			}

			if w.Header().Get("Access-Control-Allow-Headers") == "" {
				t.Error("expected Access-Control-Allow-Headers header")
			}
		})
	}
}

func TestCORS_PreflightRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	req := httptest.NewRequest(http.MethodOptions, "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证 OPTIONS 请求返回 204
	if w.Code != 204 {
		t.Errorf("expected status 204 for OPTIONS, got %d", w.Code)
	}

	// 验证 CORS 头存在
	if w.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Error("expected Access-Control-Allow-Origin header for preflight")
	}
}

func TestCORS_Credentials(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	// 验证允许携带凭证
	credentials := w.Header().Get("Access-Control-Allow-Credentials")
	if credentials != "true" {
		t.Errorf("expected Access-Control-Allow-Credentials to be 'true', got %s", credentials)
	}
}

func TestCORS_127_0_0_1(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(CORS())
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Origin", "http://127.0.0.1:3000")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://127.0.0.1:3000" {
		t.Errorf("expected origin to match 127.0.0.1, got %s", origin)
	}
}
