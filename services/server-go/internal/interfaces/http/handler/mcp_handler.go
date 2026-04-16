package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/mcp"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// MCPHandler MCP 处理器
type MCPHandler struct {
	createUseCase mcp.CreateMCPUseCase
	listUseCase   mcp.ListMCPUseCase
	getUseCase    mcp.GetMCPUseCase
	deleteUseCase mcp.DeleteMCPUseCase
	testUseCase   mcp.TestMCPUseCase
	logger        *zap.Logger
}

// NewMCPHandler 创建 MCP 处理器
func NewMCPHandler(
	createUseCase mcp.CreateMCPUseCase,
	listUseCase mcp.ListMCPUseCase,
	getUseCase mcp.GetMCPUseCase,
	deleteUseCase mcp.DeleteMCPUseCase,
	testUseCase mcp.TestMCPUseCase,
	logger *zap.Logger,
) *MCPHandler {
	return &MCPHandler{
		createUseCase: createUseCase,
		listUseCase:   listUseCase,
		getUseCase:    getUseCase,
		deleteUseCase: deleteUseCase,
		testUseCase:   testUseCase,
		logger:        logger.With(zap.String("handler", "mcp")),
	}
}

// CreateMCP 创建 MCP 配置
func (h *MCPHandler) CreateMCP(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.CreateMCPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.createUseCase.Execute(ctx, mcp.CreateMCPInput{
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		Command:     req.Command,
		Args:        req.Args,
		Env:         req.Env,
		URL:         req.URL,
		Headers:     req.Headers,
	})

	if !result.IsSuccess() {
		h.logger.Error("create mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.CreateMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.CreateMCPData{
			UUID:   data.UUID,
			Name:   data.Name,
			Type:   data.Type,
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// ListMCP 查询 MCP 列表
func (h *MCPHandler) ListMCP(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.ListMCPRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.listUseCase.Execute(ctx, mcp.ListMCPInput{
		Type:     req.Type,
		Status:   req.Status,
		Page:     req.Page,
		PageSize: req.PageSize,
	})

	if !result.IsSuccess() {
		h.logger.Error("list mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	items := make([]dto.MCPItemDTO, 0, len(data.Items))
	for _, item := range data.Items {
		items = append(items, dto.MCPItemDTO{
			UUID:        item.UUID,
			Name:        item.Name,
			Description: item.Description,
			Type:        item.Type,
			Status:      item.Status,
			LastTestAt:  item.LastTestAt,
		})
	}

	c.JSON(http.StatusOK, dto.ListMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListMCPData{
			Total: data.Total,
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// GetMCP 获取 MCP 详情
func (h *MCPHandler) GetMCP(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.getUseCase.Execute(ctx, mcp.GetMCPInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("get mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Code:    404,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	k := data.MCP
	c.JSON(http.StatusOK, dto.GetMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.GetMCPData{
			MCP: dto.MCPDetailDTO{
				UUID:        k.UUID,
				Name:        k.Name,
				Description: k.Description,
				Type:        k.Type,
				Command:     k.Command,
				Args:        k.Args,
				Env:         k.Env,
				URL:         k.URL,
				Headers:     k.Headers,
				Status:      k.Status,
				LastError:   k.LastError,
				LastTestAt:  k.LastTestAt,
				CreatedAt:   k.CreatedAt,
				UpdatedAt:   k.UpdatedAt,
			},
		},
		Timestamp: time.Now(),
	})
}

// DeleteMCP 删除 MCP 配置
func (h *MCPHandler) DeleteMCP(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.deleteUseCase.Execute(ctx, mcp.DeleteMCPInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("delete mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, dto.DeleteMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.DeleteMCPData{
			Success: result.Data.Success,
		},
		Timestamp: time.Now(),
	})
}

// TestMCP 测试 MCP 连接
func (h *MCPHandler) TestMCP(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	var req dto.TestMCPRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		// 超时参数可选，不影响主要功能
		req.Timeout = 10
	}

	result := h.testUseCase.Execute(ctx, mcp.TestMCPInput{
		UUID:    uuid,
		Timeout: req.Timeout,
	})

	if !result.IsSuccess() {
		h.logger.Error("test mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.TestMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.TestMCPData{
			Status:    data.Status,
			Tools:     data.Tools,
			ElapsedMs: data.ElapsedMs,
			Error:     data.Error,
		},
		Timestamp: time.Now(),
	})
}
