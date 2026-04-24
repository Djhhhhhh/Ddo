package mcp

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	mcpclient "github.com/ddo/server-go/internal/mcp"
)

// ConnectMCPInput 连接 MCP 输入
type ConnectMCPInput struct {
	UUID string
}

// ConnectMCPOutput 连接 MCP 输出
type ConnectMCPOutput struct {
	Status string `json:"status"`
}

// ConnectMCPUseCase 连接 MCP 用例
type ConnectMCPUseCase interface {
	Execute(ctx context.Context, input ConnectMCPInput) *result.Result[ConnectMCPOutput]
}

// connectMCPUseCase 连接 MCP 用例实现
type connectMCPUseCase struct {
	mcpRepo   repository.MCPRepository
	mcpClient *mcpclient.ClientPool
}

// NewConnectMCPUseCase 创建用例实例
func NewConnectMCPUseCase(mcpRepo repository.MCPRepository, mcpClient *mcpclient.ClientPool) ConnectMCPUseCase {
	return &connectMCPUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行连接 MCP
func (uc *connectMCPUseCase) Execute(ctx context.Context, input ConnectMCPInput) *result.Result[ConnectMCPOutput] {
	if input.UUID == "" {
		return result.NewFailure[ConnectMCPOutput](fmt.Errorf("uuid is required"))
	}

	mcpCfg, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[ConnectMCPOutput](err)
	}

	// 建立连接
	if err := uc.mcpClient.Connect(ctx, mcpCfg); err != nil {
		_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusError, err.Error())
		return result.NewFailure[ConnectMCPOutput](err)
	}

	// 更新数据库状态
	_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusActive, "")

	output := ConnectMCPOutput{
		Status: models.MCPStatusActive,
	}

	return result.NewSuccess(output)
}
