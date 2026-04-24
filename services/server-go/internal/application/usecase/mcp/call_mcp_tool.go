package mcp

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
	mcpclient "github.com/ddo/server-go/internal/mcp"
)

// CallMCPToolInput 调用 MCP 工具输入
type CallMCPToolInput struct {
	UUID     string
	ToolName string
	Args     map[string]interface{}
}

// CallMCPToolOutput 调用 MCP 工具输出
type CallMCPToolOutput struct {
	Content          interface{} `json:"content,omitempty"`
	StructuredContent interface{} `json:"structured_content,omitempty"`
	Raw              interface{} `json:"raw,omitempty"`
	IsError          bool        `json:"is_error"`
	Error            string      `json:"error,omitempty"`
}

// CallMCPToolUseCase 调用 MCP 工具用例
type CallMCPToolUseCase interface {
	Execute(ctx context.Context, input CallMCPToolInput) *result.Result[CallMCPToolOutput]
}

// callMCPToolUseCase 调用 MCP 工具用例实现
type callMCPToolUseCase struct {
	mcpRepo   repository.MCPRepository
	mcpClient *mcpclient.ClientPool
}

// NewCallMCPToolUseCase 创建用例实例
func NewCallMCPToolUseCase(mcpRepo repository.MCPRepository, mcpClient *mcpclient.ClientPool) CallMCPToolUseCase {
	return &callMCPToolUseCase{
		mcpRepo:   mcpRepo,
		mcpClient: mcpClient,
	}
}

// Execute 执行调用 MCP 工具
func (uc *callMCPToolUseCase) Execute(ctx context.Context, input CallMCPToolInput) *result.Result[CallMCPToolOutput] {
	if input.UUID == "" {
		return result.NewFailure[CallMCPToolOutput](fmt.Errorf("uuid is required"))
	}
	if input.ToolName == "" {
		return result.NewFailure[CallMCPToolOutput](fmt.Errorf("tool name is required"))
	}

	mcpCfg, err := uc.mcpRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[CallMCPToolOutput](err)
	}

	resultMap, err := uc.mcpClient.CallTool(ctx, mcpCfg, input.ToolName, input.Args)
	if err != nil {
		return result.NewSuccess(CallMCPToolOutput{
			IsError: true,
			Error:   err.Error(),
		})
	}

	output := CallMCPToolOutput{
		IsError: false,
	}

	if content, ok := resultMap["content"]; ok {
		output.Content = content
	}
	if structuredContent, ok := resultMap["structuredContent"]; ok {
		output.StructuredContent = structuredContent
	}
	if isError, ok := resultMap["isError"]; ok {
		if b, ok := isError.(bool); ok {
			output.IsError = b
		}
	}
	if errStr, ok := resultMap["error"]; ok {
		if s, ok := errStr.(string); ok {
			output.Error = s
		}
	}

	output.Raw = resultMap

	return result.NewSuccess(output)
}
