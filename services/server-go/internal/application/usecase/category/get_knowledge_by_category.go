package category

import (
	"context"
	"errors"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// GetKnowledgeByCategoryUseCase 按分类获取知识用例
type GetKnowledgeByCategoryUseCase interface {
	Execute(ctx context.Context, categoryID string) *result.Result[[]models.Knowledge]
}

type getKnowledgeByCategoryUseCase struct {
	categoryRepo repository.CategoryRepository
}

// NewGetKnowledgeByCategoryUseCase 创建按分类获取知识用例
func NewGetKnowledgeByCategoryUseCase(categoryRepo repository.CategoryRepository) GetKnowledgeByCategoryUseCase {
	return &getKnowledgeByCategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

// Execute 执行按分类获取知识
func (uc *getKnowledgeByCategoryUseCase) Execute(ctx context.Context, categoryID string) *result.Result[[]models.Knowledge] {
	// 检查分类是否存在
	existing, err := uc.categoryRepo.GetByID(ctx, categoryID)
	if err != nil {
		return result.NewFailure[[]models.Knowledge](errors.New("category not found"))
	}

	// 获取该分类下的知识
	knowledge, err := uc.categoryRepo.GetKnowledgeByCategory(ctx, existing.ID)
	if err != nil {
		return result.NewFailure[[]models.Knowledge](errors.New("failed to get knowledge: " + err.Error()))
	}

	return result.NewSuccess(knowledge)
}