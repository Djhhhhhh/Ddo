package mcp

import (
	"context"
	"fmt"
	"time"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	mcpclient "github.com/ddo/server-go/internal/mcp"
)

// ConnectTestMCPInput 连接测试 MCP 输入
type ConnectTestMCPInput struct {
	UUID    string
	Timeout int
}

// ConnectTestMCPOutput 连接测试 MCP 输出
type ConnectTestMCPOutput struct {
	Status              string                 `json:"status"`
	Reachable           bool                   `json:"reachable"`
	InitializeSucceeded bool                   `json:"initialize_succeeded"`
	ProtocolReady       bool                   `json:"protocol_ready"`
	LatencyMs           int64                  `json:"latency_ms"`
	ServerInfo          map[string]interface{} `json:"server_info,omitempty"`
	ServerProtocolVersion string             `json:"server_protocol_version,omitempty"`
	ServerCapabilities  map[string]interface{} `json:"server_capabilities,omitempty"`
	Tools               []string               `json:"tools,omitempty"`
	Error               string                 `json:"error,omitempty"`
}

// ConnectTestMCPUseCase 连接测试 MCP 用例
type ConnectTestMCPUseCase interface {
	Execute(ctx context.Context, input ConnectTestMCPInput) *result.Result[ConnectTestMCPOutput]
}

// connectTestMCPUseCase 连接测试 MCP 用例实现
type connectTestMCPUseCase struct {
	mcpRepo   repository.MCPRepository
	mcpClient *mcpclient.ClientPool
}

// NewConnectTestMCPUseCase 创建用例实例
func NewConnectTestMCPUseCase(mcpRepo repository.MCPRepository, mcpClient *mcpclient.ClientPool) ConnectTestMCPUseCase {
	return &connectTestMCPUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行连接测试 MCP
func (uc *connectTestMCPUseCase) Execute(ctx context.Context, input ConnectTestMCPInput) *result.Result[ConnectTestMCPOutput] {
	if input.UUID == "" {
		return result.NewFailure[ConnectTestMCPOutput](fmt.Errorf("uuid is required"))
	}

	if input.Timeout <= 0 {
		input.Timeout = 10
	}

	mcpCfg, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[ConnectTestMCPOutput](err)
	}

	start := time.Now()
	tools, testErr := uc.mcpClient.TestConnection(ctx, mcpCfg)
	elapsed := time.Since(start).Milliseconds()

	output := ConnectTestMCPOutput{
		LatencyMs: elapsed,
	}

	if testErr != nil {
		output.Status = models.MCPStatusError
		output.Reachable = false
		output.InitializeSucceeded = false
		output.ProtocolReady = false
		output.Error = testErr.Error()
		_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusError, testErr.Error())
		return result.NewSuccess(output)
	}

	output.Status = models.MCPStatusActive
	output.Reachable = true
	output.InitializeSucceeded = true
	output.ProtocolReady = true
	output.Tools = tools

	_ = uc.mcpRepo.UpdateStatus(ctx, input.UUID, models.MCPStatusActive, "")

	return result.NewSuccess(output)
}
