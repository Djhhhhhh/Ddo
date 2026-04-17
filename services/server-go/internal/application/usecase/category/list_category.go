package category

import (
	"context"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// ListCategoryUseCase 列出分类用例
type ListCategoryUseCase interface {
	Execute(ctx context.Context) *result.Result[[]models.Category]
}

type listCategoryUseCase struct {
	categoryRepo repository.CategoryRepository
}

// NewListCategoryUseCase 创建列出分类用例
func NewListCategoryUseCase(categoryRepo repository.CategoryRepository) ListCategoryUseCase {
	return &listCategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

// Execute 执行列出分类
func (uc *listCategoryUseCase) Execute(ctx context.Context) *result.Result[[]models.Category] {
	categories, err := uc.categoryRepo.List(ctx)
	if err != nil {
		return result.NewFailure[[]models.Category](err)
	}
	return result.NewSuccess(categories)
}