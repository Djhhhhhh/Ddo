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

	// 转换 MySQL 状态
	mysqlStatus := "disconnected"
	if output.MySQL != nil {
		if connected, ok := output.MySQL["connected"].(bool); ok && connected {
			mysqlStatus = "connected"
		}
	}

	response := dto.ToHealthCheckResponse(dto.HealthCheckResponseData{
		Status:    output.Status,
		Version:   output.Version,
		Timestamp: output.Timestamp,
		MySQL:     mysqlStatus,
		BadgerDB:  "ok",
	})

	// 如果 MySQL 未连接，返回 503
	if mysqlStatus != "connected" {
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}

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

	// 转换 MySQL 状态
	mysqlStatus := "disconnected"
	if output.MySQL != nil {
		if connected, ok := output.MySQL["connected"].(bool); ok && connected {
			mysqlStatus = "connected"
		}
	}

	response := dto.ToHealthCheckV1Response(dto.HealthCheckResponseData{
		Status:    output.Status,
		Version:   output.Version,
		Timestamp: output.Timestamp,
		MySQL:     mysqlStatus,
		BadgerDB:  "ok", // BadgerDB 启动时已验证，暂视为正常
	})

	// 如果 MySQL 未连接，返回 503
	if mysqlStatus != "connected" {
		c.JSON(http.StatusServiceUnavailable, response)
		return
	}

	c.JSON(http.StatusOK, response)
}
