package mcp

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
	mcpclient "github.com/ddo/server-go/internal/mcp"
)

// ListMCPToolsInput 列出 MCP 工具输入
type ListMCPToolsInput struct {
	UUID string
}

// ListMCPToolsOutput 列出 MCP 工具输出
type ListMCPToolsOutput struct {
	ServerID string          `json:"server_id"`
	Tools    []mcpclient.Tool `json:"tools"`
}

// ListMCPToolsUseCase 列出 MCP 工具用例
type ListMCPToolsUseCase interface {
	Execute(ctx context.Context, input ListMCPToolsInput) *result.Result[ListMCPToolsOutput]
}

// listMCPToolsUseCase 列出 MCP 工具用例实现
type listMCPToolsUseCase struct {
	mcpRepo   repository.MCPRepository
	mcpClient *mcpclient.ClientPool
}

// NewListMCPToolsUseCase 创建用例实例
func NewListMCPToolsUseCase(mcpRepo repository.MCPRepository, mcpClient *mcpclient.ClientPool) ListMCPToolsUseCase {
	return &listMCPToolsUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行列出 MCP 工具
func (uc *listMCPToolsUseCase) Execute(ctx context.Context, input ListMCPToolsInput) *result.Result[ListMCPToolsOutput] {
	if input.UUID == "" {
		return result.NewFailure[ListMCPToolsOutput](fmt.Errorf("uuid is required"))
	}

	mcpCfg, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[ListMCPToolsOutput](err)
	}

	tools, err := uc.mcpClient.GetTools(ctx, mcpCfg)
	if err != nil {
		return result.NewFailure[ListMCPToolsOutput](fmt.Errorf("get tools failed: %w", err))
	}

	return result.NewSuccess(ListMCPToolsOutput{
		ServerID: input.UUID,
		Tools:    tools,
	})
}
