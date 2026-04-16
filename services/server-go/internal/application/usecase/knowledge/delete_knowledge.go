package knowledge

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// DeleteKnowledgeInput 删除知识输入
type DeleteKnowledgeInput struct {
	UUID string
}

// DeleteKnowledgeOutput 删除知识输出
type DeleteKnowledgeOutput struct {
	Success bool `json:"success"`
}

// DeleteKnowledgeUseCase 删除知识用例
type DeleteKnowledgeUseCase interface {
	Execute(ctx context.Context, input DeleteKnowledgeInput) *result.Result[DeleteKnowledgeOutput]
}

// deleteKnowledgeUseCase 删除知识用例实现
type deleteKnowledgeUseCase struct {
	knowledgeRepo repository.KnowledgeRepository
}

// NewDeleteKnowledgeUseCase 创建用例实例
func NewDeleteKnowledgeUseCase(knowledgeRepo repository.KnowledgeRepository) DeleteKnowledgeUseCase {
	return &deleteKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
	}
}

// Execute 执行删除
func (uc *deleteKnowledgeUseCase) Execute(ctx context.Context, input DeleteKnowledgeInput) *result.Result[DeleteKnowledgeOutput] {
	if input.UUID == "" {
		return result.NewFailure[DeleteKnowledgeOutput](fmt.Errorf("uuid is required"))
	}

	// 先检查是否存在
	_, err := uc.knowledgeRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[DeleteKnowledgeOutput](err)
	}

	// 软删除
	if err := uc.knowledgeRepo.Delete(ctx, input.UUID); err != nil {
		return result.NewFailure[DeleteKnowledgeOutput](fmt.Errorf("delete knowledge failed: %w", err))
	}

	return result.NewSuccess(DeleteKnowledgeOutput{
		Success: true,
	})
}
