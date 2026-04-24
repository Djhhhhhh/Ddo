package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// CreateMCPInput 创建 MCP 输入
type CreateMCPInput struct {
	Name        string
	Description string
	Type        string
	Command     string
	Args        []string
	Env         []string
	URL         string
	Headers     map[string]string
}

// CreateMCPOutput 创建 MCP 输出
type CreateMCPOutput struct {
	UUID   string `json:"uuid"`
	Name   string `json:"name"`
	Type   string `json:"type"`
	Status string `json:"status"`
}

// CreateMCPUseCase 创建 MCP 配置用例
type CreateMCPUseCase interface {
	Execute(ctx context.Context, input CreateMCPInput) *result.Result[CreateMCPOutput]
}

// createMCPUseCase 创建 MCP 配置用例实现
type createMCPUseCase struct {
	mcpRepo repository.MCPRepository
}

// NewCreateMCPUseCase 创建用例实例
func NewCreateMCPUseCase(mcpRepo repository.MCPRepository) CreateMCPUseCase {
	return &createMCPUseCase{mcpRepo: mcpRepo}
}

// Execute 执行创建 MCP 配置
func (uc *createMCPUseCase) Execute(ctx context.Context, input CreateMCPInput) *result.Result[CreateMCPOutput] {
	// 1. 参数验证
	if input.Name == "" {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("name is required"))
	}
	if input.Type == "" {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("type is required"))
	}
	if input.Type != models.MCPTypeStdio && input.Type != models.MCPTypeHTTP && input.Type != models.MCPTypeStreamableHTTP && input.Type != models.MCPTypeSSE {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("invalid type: %s, must be one of: stdio, http, streamable_http, sse", input.Type))
	}

	// 2. stdio 类型验证
	if input.Type == models.MCPTypeStdio && input.Command == "" {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("command is required for stdio type"))
	}

	// 3. http/streamable_http/sse 类型验证
	if (input.Type == models.MCPTypeHTTP || input.Type == models.MCPTypeStreamableHTTP || input.Type == models.MCPTypeSSE) && input.URL == "" {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("url is required for http/streamable_http/sse type"))
	}

	// 4. 序列化数组字段
	argsJSON, _ := json.Marshal(input.Args)
	envJSON, _ := json.Marshal(input.Env)
	headersJSON, _ := json.Marshal(input.Headers)

	// 5. 创建 MCP 配置
	mcp := &models.MCPConfig{
		Name:        input.Name,
		Description: input.Description,
		Type:        input.Type,
		Command:     input.Command,
		Args:        string(argsJSON),
		Env:         string(envJSON),
		URL:         input.URL,
		Headers:     string(headersJSON),
		Status:      models.MCPStatusInactive,
	}

	if err := uc.mcpRepo.Create(ctx, mcp); err != nil {
		return result.NewFailure[CreateMCPOutput](fmt.Errorf("create mcp failed: %w", err))
	}

	// 6. 返回结果
	return result.NewSuccess(CreateMCPOutput{
		UUID:   mcp.UUID,
		Name:   mcp.Name,
		Type:   mcp.Type,
		Status: mcp.Status,
	})
}
