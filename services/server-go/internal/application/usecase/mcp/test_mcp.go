package mcp

import (
	"context"
	"fmt"
	"time"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/mcp"
)

// TestMCPInput 测试 MCP 输入
type TestMCPInput struct {
	UUID    string
	Timeout int
}

// TestMCPOutput 测试 MCP 输出
type TestMCPOutput struct {
	Status    string   `json:"status"`
	Tools     []string `json:"tools"`
	ElapsedMs int64    `json:"elapsed_ms"`
	Error     string   `json:"error,omitempty"`
}

// TestMCPUseCase 测试 MCP 用例
type TestMCPUseCase interface {
	Execute(ctx context.Context, input TestMCPInput) *result.Result[TestMCPOutput]
}

// testMCPUseCase 测试 MCP 用例实现
type testMCPUseCase struct {
	mcpRepo    repository.MCPRepository
	mcpClient  *mcp.ClientPool
}

// NewTestMCPUseCase 创建用例实例
func NewTestMCPUseCase(mcpRepo repository.MCPRepository, mcpClient *mcp.ClientPool) TestMCPUseCase {
	return &testMCPUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行测试 MCP
func (uc *testMCPUseCase) Execute(ctx context.Context, input TestMCPInput) *result.Result[TestMCPOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[TestMCPOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 超时默认值
	if input.Timeout <= 0 {
		input.Timeout = 10
	}

	// 3. 获取 MCP 配置
	mcpCfg, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[TestMCPOutput](err)
	}

	// 4. 测试连接
	start := time.Now()
	tools, testErr := uc.mcpClient.TestConnection(ctx, mcpCfg)
	elapsed := time.Since(start).Milliseconds()

	output := TestMCPOutput{
		ElapsedMs: elapsed,
	}

	if testErr != nil {
		output.Status = models.MCPStatusError
		output.Error = testErr.Error()
		// 更新数据库状态
		_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusError, testErr.Error())
		return result.NewSuccess(output)
	}

	output.Status = models.MCPStatusActive
	output.Tools = tools

	// 更新数据库状态
	_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusActive, "")

	return result.NewSuccess(output)
}
