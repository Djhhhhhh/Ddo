package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/application/usecase/health"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// HealthHandler 健康检查 Handler
type HealthHandler struct {
	checkHealthUC health.UseCase
	version       string
}

// NewHealthHandler 创建健康检查 Handler
// 构造函数注入用例，支持依赖注入
func NewHealthHandler(checkHealthUC health.UseCase, version string) *HealthHandler {
	return &HealthHandler{
		checkHealthUC: checkHealthUC,
		version:       version,
	}
}

// HealthCheck 健康检查处理
// GET /health
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	ctx := c.Request.Context()
	result := h.checkHealthUC.Execute(ctx, health.CheckHealthInput{})

	if !result.IsSuccess() {
		c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(
			500,
			"Service unavailable",
			nil,
		))
		return
	}

	output := result.Data
	response := dto.ToHealthCheckResponse(
		output.Status,
		output.Version,
		output.Timestamp,
	)
	c.JSON(http.StatusOK, response)
}

// HealthCheckV1 健康检查处理 (v1 版本)
// GET /api/v1/health
func (h *HealthHandler) HealthCheckV1(c *gin.Context) {
	ctx := c.Request.Context()
	result := h.checkHealthUC.Execute(ctx, health.CheckHealthInput{})

	if !result.IsSuccess() {
		c.JSON(http.StatusServiceUnavailable, dto.NewErrorResponse(
			503,
			"Service unavailable",
			nil,
		))
		return
	}

	output := result.Data
	response := dto.ToHealthCheckV1Response(
		output.Status,
		output.Timestamp,
	)
	c.JSON(http.StatusOK, response)
}
