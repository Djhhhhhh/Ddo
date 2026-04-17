package category

import (
	"context"
	"errors"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// CreateCategoryInput 创建分类输入
type CreateCategoryInput struct {
	Name        string
	Description string
}

// CreateCategoryUseCase 创建分类用例
type CreateCategoryUseCase interface {
	Execute(ctx context.Context, input CreateCategoryInput) *result.Result[models.Category]
}

type createCategoryUseCase struct {
	categoryRepo repository.CategoryRepository
}

// NewCreateCategoryUseCase 创建创建分类用例
func NewCreateCategoryUseCase(categoryRepo repository.CategoryRepository) CreateCategoryUseCase {
	return &createCategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

// Execute 执行创建分类
func (uc *createCategoryUseCase) Execute(ctx context.Context, input CreateCategoryInput) *result.Result[models.Category] {
	// 检查是否已存在同名分类
	existing, err := uc.categoryRepo.GetByName(ctx, input.Name)
	if err == nil && existing != nil {
		return result.NewSuccess(*existing)
	}

	// 创建新分类
	category := &models.Category{
		Name:        input.Name,
		Description: input.Description,
	}

	err = uc.categoryRepo.Create(ctx, category)
	if err != nil {
		return result.NewFailure[models.Category](errors.New("failed to create category: " + err.Error()))
	}

	return result.NewSuccess(*category)
}