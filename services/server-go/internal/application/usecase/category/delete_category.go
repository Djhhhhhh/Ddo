package category

import (
	"context"
	"errors"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// DeleteCategoryUseCase 删除分类用例
type DeleteCategoryUseCase interface {
	Execute(ctx context.Context, id string) *result.Result[struct{}]
}

type deleteCategoryUseCase struct {
	categoryRepo repository.CategoryRepository
}

// NewDeleteCategoryUseCase 创建删除分类用例
func NewDeleteCategoryUseCase(categoryRepo repository.CategoryRepository) DeleteCategoryUseCase {
	return &deleteCategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

// Execute 执行删除分类
func (uc *deleteCategoryUseCase) Execute(ctx context.Context, id string) *result.Result[struct{}] {
	// 检查分类是否存在
	existing, err := uc.categoryRepo.GetByID(ctx, id)
	if err != nil {
		return result.NewFailure[struct{}](errors.New("category not found"))
	}

	// 删除分类（级联删除会自动删除关联）
	err = uc.categoryRepo.Delete(ctx, existing.ID)
	if err != nil {
		return result.NewFailure[struct{}](errors.New("failed to delete category: " + err.Error()))
	}

	return result.NewSuccess(struct{}{})
}