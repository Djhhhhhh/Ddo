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
	createUseCase       mcp.CreateMCPUseCase
	listUseCase         mcp.ListMCPUseCase
	getUseCase          mcp.GetMCPUseCase
	deleteUseCase       mcp.DeleteMCPUseCase
	testUseCase         mcp.TestMCPUseCase
	connectTestUseCase  mcp.ConnectTestMCPUseCase
	listToolsUseCase    mcp.ListMCPToolsUseCase
	callToolUseCase     mcp.CallMCPToolUseCase
	connectUseCase      mcp.ConnectMCPUseCase
	disconnectUseCase   mcp.DisconnectMCPUseCase
	logger              *zap.Logger
}

// NewMCPHandler 创建 MCP 处理器
func NewMCPHandler(
	createUseCase mcp.CreateMCPUseCase,
	listUseCase mcp.ListMCPUseCase,
	getUseCase mcp.GetMCPUseCase,
	deleteUseCase mcp.DeleteMCPUseCase,
	testUseCase mcp.TestMCPUseCase,
	connectTestUseCase mcp.ConnectTestMCPUseCase,
	listToolsUseCase mcp.ListMCPToolsUseCase,
	callToolUseCase mcp.CallMCPToolUseCase,
	connectUseCase mcp.ConnectMCPUseCase,
	disconnectUseCase mcp.DisconnectMCPUseCase,
	logger *zap.Logger,
) *MCPHandler {
	return &MCPHandler{
		createUseCase:      createUseCase,
		listUseCase:        listUseCase,
		getUseCase:         getUseCase,
		deleteUseCase:      deleteUseCase,
		testUseCase:        testUseCase,
		connectTestUseCase: connectTestUseCase,
		listToolsUseCase:   listToolsUseCase,
		callToolUseCase:    callToolUseCase,
		connectUseCase:     connectUseCase,
		disconnectUseCase:  disconnectUseCase,
		logger:             logger.With(zap.String("handler", "mcp")),
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

// DeleteMCP 删除 MCP 配置（支持 POST /:uuid/delete 和 DELETE /:uuid）
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

// ConnectTestMCP 连接存活测试
func (h *MCPHandler) ConnectTestMCP(c *gin.Context) {
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

	var req dto.ConnectTestMCPRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		req.Timeout = 10
	}

	result := h.connectTestUseCase.Execute(ctx, mcp.ConnectTestMCPInput{
		UUID:    uuid,
		Timeout: req.Timeout,
	})

	if !result.IsSuccess() {
		h.logger.Error("connect test mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.ConnectTestMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.ConnectTestMCPData{
			Status:                data.Status,
			Reachable:            data.Reachable,
			InitializeSucceeded:  data.InitializeSucceeded,
			ProtocolReady:        data.ProtocolReady,
			LatencyMs:            data.LatencyMs,
			ServerInfo:           data.ServerInfo,
			ServerProtocolVersion: data.ServerProtocolVersion,
			ServerCapabilities:   data.ServerCapabilities,
			Tools:                data.Tools,
			Error:                data.Error,
		},
		Timestamp: time.Now(),
	})
}

// ListMCPTools 获取 MCP 工具列表
func (h *MCPHandler) ListMCPTools(c *gin.Context) {
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

	result := h.listToolsUseCase.Execute(ctx, mcp.ListMCPToolsInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("list mcp tools failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	tools := make([]dto.MCPToolDTO, 0, len(data.Tools))
	for _, t := range data.Tools {
		tools = append(tools, dto.MCPToolDTO{
			Name:        t.Name,
			Title:       t.Name,
			Description: t.Description,
			InputSchema: t.InputSchema,
		})
	}

	c.JSON(http.StatusOK, dto.ListMCPToolsResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListMCPToolsData{
			ServerID: data.ServerID,
			Tools:    tools,
		},
		Timestamp: time.Now(),
	})
}

// CallMCPTool 测试调用 MCP 工具
func (h *MCPHandler) CallMCPTool(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")
	toolName := c.Param("tool_name")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}
	if toolName == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "tool name is required",
			Data:    nil,
		})
		return
	}

	var req dto.CallMCPToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.callToolUseCase.Execute(ctx, mcp.CallMCPToolInput{
		UUID:     uuid,
		ToolName: toolName,
		Args:     req.Arguments,
	})

	if !result.IsSuccess() {
		h.logger.Error("call mcp tool failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.CallMCPToolResponse{
		Code:    200,
		Message: "success",
		Data: dto.CallMCPToolData{
			Content:          data.Content,
			StructuredContent: data.StructuredContent,
			Raw:              data.Raw,
			IsError:          data.IsError,
			Error:            data.Error,
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

// ConnectMCP 建立 MCP 连接
func (h *MCPHandler) ConnectMCP(c *gin.Context) {
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

	result := h.connectUseCase.Execute(ctx, mcp.ConnectMCPInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("connect mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.ConnectMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.ConnectMCPData{
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

// DisconnectMCP 断开 MCP 连接
func (h *MCPHandler) DisconnectMCP(c *gin.Context) {
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

	result := h.disconnectUseCase.Execute(ctx, mcp.DisconnectMCPInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("disconnect mcp failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.DisconnectMCPResponse{
		Code:    200,
		Message: "success",
		Data: dto.DisconnectMCPData{
			Status: data.Status,
		},
		Timestamp: time.Now(),
	})
}

