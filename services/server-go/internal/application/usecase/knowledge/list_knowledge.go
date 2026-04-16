package knowledge

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// ListKnowledgeInput 查询知识列表输入
type ListKnowledgeInput struct {
	Category string
	Tag      string
	Keyword  string
	Page     int
	PageSize int
}

// KnowledgeItem 知识列表项
type KnowledgeItem struct {
	UUID     string   `json:"uuid"`
	Title    string   `json:"title"`
	Category string   `json:"category"`
	Tags     []string `json:"tags"`
	Source   string   `json:"source"`
	Status   string   `json:"status"`
}

// ListKnowledgeOutput 查询知识列表输出
type ListKnowledgeOutput struct {
	Total int64           `json:"total"`
	Items []KnowledgeItem `json:"items"`
}

// ListKnowledgeUseCase 查询知识列表用例
type ListKnowledgeUseCase interface {
	Execute(ctx context.Context, input ListKnowledgeInput) *result.Result[ListKnowledgeOutput]
}

// listKnowledgeUseCase 查询知识列表用例实现
type listKnowledgeUseCase struct {
	knowledgeRepo repository.KnowledgeRepository
}

// NewListKnowledgeUseCase 创建用例实例
func NewListKnowledgeUseCase(knowledgeRepo repository.KnowledgeRepository) ListKnowledgeUseCase {
	return &listKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
	}
}

// Execute 执行查询
func (uc *listKnowledgeUseCase) Execute(ctx context.Context, input ListKnowledgeInput) *result.Result[ListKnowledgeOutput] {
	filter := repository.KnowledgeFilter{
		Category: input.Category,
		Tag:      input.Tag,
		Keyword:  input.Keyword,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	listResult, err := uc.knowledgeRepo.List(ctx, filter)
	if err != nil {
		return result.NewFailure[ListKnowledgeOutput](fmt.Errorf("list knowledge failed: %w", err))
	}

	// 转换为输出格式
	items := make([]KnowledgeItem, 0, len(listResult.Items))
	for _, k := range listResult.Items {
		tags := []string{}
		if k.Tags != "" {
			_ = json.Unmarshal([]byte(k.Tags), &tags)
		}

		items = append(items, KnowledgeItem{
			UUID:     k.UUID,
			Title:    k.Title,
			Category: k.Category,
			Tags:     tags,
			Source:   k.Source,
			Status:   k.Status,
		})
	}

	return result.NewSuccess(ListKnowledgeOutput{
		Total: listResult.Total,
		Items: items,
	})
}
