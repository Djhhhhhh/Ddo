package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// GetMCPInput 获取 MCP 输入
type GetMCPInput struct {
	UUID string
}

// GetMCPOutput 获取 MCP 输出
type GetMCPOutput struct {
	MCP MCPDetailOutput `json:"mcp"`
}

// MCPDetailOutput MCP 详情输出
type MCPDetailOutput struct {
	UUID        string            `json:"uuid"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        string            `json:"type"`
	Command     string            `json:"command,omitempty"`
	Args        []string          `json:"args,omitempty"`
	Env         []string          `json:"env,omitempty"`
	URL         string            `json:"url,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Status      string            `json:"status"`
	LastError   string            `json:"last_error,omitempty"`
	LastTestAt  string            `json:"last_test_at,omitempty"`
	CreatedAt   string            `json:"created_at"`
	UpdatedAt   string            `json:"updated_at"`
}

// GetMCPUseCase 获取 MCP 用例
type GetMCPUseCase interface {
	Execute(ctx context.Context, input GetMCPInput) *result.Result[GetMCPOutput]
}

// getMCPUseCase 获取 MCP 用例实现
type getMCPUseCase struct {
	mcpRepo repository.MCPRepository
}

// NewGetMCPUseCase 创建用例实例
func NewGetMCPUseCase(mcpRepo repository.MCPRepository) GetMCPUseCase {
	return &getMCPUseCase{mcpRepo: mcpRepo}
}

// Execute 执行获取 MCP
func (uc *getMCPUseCase) Execute(ctx context.Context, input GetMCPInput) *result.Result[GetMCPOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[GetMCPOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询详情
	mcp, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[GetMCPOutput](err)
	}

	// 3. 反序列化数组字段
	var args []string
	var env []string
	var headers map[string]string
	json.Unmarshal([]byte(mcp.Args), &args)
	json.Unmarshal([]byte(mcp.Env), &env)
	json.Unmarshal([]byte(mcp.Headers), &headers)

	// 4. 构建输出
	output := MCPDetailOutput{
		UUID:        mcp.UUID,
		Name:        mcp.Name,
		Description: mcp.Description,
		Type:        mcp.Type,
		Command:     mcp.Command,
		Args:        args,
		Env:         env,
		URL:         mcp.URL,
		Headers:     headers,
		Status:      mcp.Status,
		LastError:   mcp.LastError,
		CreatedAt:   mcp.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   mcp.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
	if mcp.LastTestAt != nil {
		output.LastTestAt = mcp.LastTestAt.Format("2006-01-02 15:04:05")
	}

	return result.NewSuccess(GetMCPOutput{MCP: output})
}
