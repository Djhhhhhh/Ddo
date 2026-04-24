package mcp

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	mcpclient "github.com/ddo/server-go/internal/mcp"
)

// DisconnectMCPInput 断开连接 MCP 输入
type DisconnectMCPInput struct {
	UUID string
}

// DisconnectMCPOutput 断开连接 MCP 输出
type DisconnectMCPOutput struct {
	Status string `json:"status"`
}

// DisconnectMCPUseCase 断开连接 MCP 用例
type DisconnectMCPUseCase interface {
	Execute(ctx context.Context, input DisconnectMCPInput) *result.Result[DisconnectMCPOutput]
}

// disconnectMCPUseCase 断开连接 MCP 用例实现
type disconnectMCPUseCase struct {
	mcpRepo   repository.MCPRepository
	mcpClient *mcpclient.ClientPool
}

// NewDisconnectMCPUseCase 创建用例实例
func NewDisconnectMCPUseCase(mcpRepo repository.MCPRepository, mcpClient *mcpclient.ClientPool) DisconnectMCPUseCase {
	return &disconnectMCPUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行断开连接 MCP
func (uc *disconnectMCPUseCase) Execute(ctx context.Context, input DisconnectMCPInput) *result.Result[DisconnectMCPOutput] {
	if input.UUID == "" {
		return result.NewFailure[DisconnectMCPOutput](fmt.Errorf("uuid is required"))
	}

	// 断开连接
	uc.mcpClient.Disconnect(input.UUID)

	// 更新数据库状态
	_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusInactive, "")

	output := DisconnectMCPOutput{
		Status: models.MCPStatusInactive,
	}

	return result.NewSuccess(output)
}
