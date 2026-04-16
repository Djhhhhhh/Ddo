package mcp

import (
	"context"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// ListMCPInput 列表 MCP 输入
type ListMCPInput struct {
	Type     string
	Status   string
	Page     int
	PageSize int
}

// ListMCPOutput 列表 MCP 输出
type ListMCPOutput struct {
	Total int64          `json:"total"`
	Items []MCPItemOutput `json:"items"`
}

// MCPItemOutput MCP 项输出
type MCPItemOutput struct {
	UUID        string `json:"uuid"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	LastTestAt  string `json:"last_test_at,omitempty"`
}

// ListMCPUseCase 列表 MCP 用例
type ListMCPUseCase interface {
	Execute(ctx context.Context, input ListMCPInput) *result.Result[ListMCPOutput]
}

// listMCPUseCase 列表 MCP 用例实现
type listMCPUseCase struct {
	mcpRepo repository.MCPRepository
}

// NewListMCPUseCase 创建用例实例
func NewListMCPUseCase(mcpRepo repository.MCPRepository) ListMCPUseCase {
	return &listMCPUseCase{mcpRepo: mcpRepo}
}

// Execute 执行列表 MCP
func (uc *listMCPUseCase) Execute(ctx context.Context, input ListMCPInput) *result.Result[ListMCPOutput] {
	// 1. 分页参数默认值
	if input.Page < 1 {
		input.Page = 1
	}
	if input.PageSize < 1 {
		input.PageSize = 20
	}

	// 2. 查询列表
	filter := repository.MCPFilter{
		Type:     input.Type,
		Status:   input.Status,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	listResult, err := uc.mcpRepo.List(ctx, filter)
	if err != nil {
		return result.NewFailure[ListMCPOutput](err)
	}

	// 3. 转换输出
	items := make([]MCPItemOutput, 0, len(listResult.Items))
	for _, m := range listResult.Items {
		item := MCPItemOutput{
			UUID:        m.UUID,
			Name:        m.Name,
			Description: m.Description,
			Type:        m.Type,
			Status:      m.Status,
		}
		if m.LastTestAt != nil {
			item.LastTestAt = m.LastTestAt.Format("2006-01-02 15:04:05")
		}
		items = append(items, item)
	}

	return result.NewSuccess(ListMCPOutput{
		Total: listResult.Total,
		Items: items,
	})
}
