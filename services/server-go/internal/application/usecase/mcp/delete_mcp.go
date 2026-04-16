package mcp

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// DeleteMCPInput 删除 MCP 输入
type DeleteMCPInput struct {
	UUID string
}

// DeleteMCPOutput 删除 MCP 输出
type DeleteMCPOutput struct {
	Success bool `json:"success"`
}

// DeleteMCPUseCase 删除 MCP 用例
type DeleteMCPUseCase interface {
	Execute(ctx context.Context, input DeleteMCPInput) *result.Result[DeleteMCPOutput]
}

// deleteMCPUseCase 删除 MCP 用例实现
type deleteMCPUseCase struct {
	mcpRepo repository.MCPRepository
}

// NewDeleteMCPUseCase 创建用例实例
func NewDeleteMCPUseCase(mcpRepo repository.MCPRepository) DeleteMCPUseCase {
	return &deleteMCPUseCase{mcpRepo: mcpRepo}
}

// Execute 执行删除 MCP
func (uc *deleteMCPUseCase) Execute(ctx context.Context, input DeleteMCPInput) *result.Result[DeleteMCPOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[DeleteMCPOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 验证 MCP 存在
	_, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[DeleteMCPOutput](err)
	}

	// 3. 软删除
	if err := uc.mcpRepo.Delete(ctx, input.UUID); err != nil {
		return result.NewFailure[DeleteMCPOutput](fmt.Errorf("delete mcp failed: %w", err))
	}

	return result.NewSuccess(DeleteMCPOutput{Success: true})
}
