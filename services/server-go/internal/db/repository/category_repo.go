package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/ddo/server-go/internal/db/models"
)

// CategoryRepository 分类数据访问接口
type CategoryRepository interface {
	Create(ctx context.Context, category *models.Category) error
	GetByID(ctx context.Context, id string) (*models.Category, error)
	GetByName(ctx context.Context, name string) (*models.Category, error)
	List(ctx context.Context) ([]models.Category, error)
	Delete(ctx context.Context, id string) error
	AddKnowledgeCategory(ctx context.Context, knowledgeID, categoryID string) error
	RemoveKnowledgeCategory(ctx context.Context, knowledgeID, categoryID string) error
	GetKnowledgeCategories(ctx context.Context, knowledgeID string) ([]models.Category, error)
	GetKnowledgeByCategory(ctx context.Context, categoryID string) ([]models.Knowledge, error)
}

// categoryRepository 分类数据访问实现
type categoryRepository struct {
	db *gorm.DB
}

// NewCategoryRepository 创建分类仓库
func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

// Create 创建分类
func (r *categoryRepository) Create(ctx context.Context, category *models.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

// GetByID 根据 ID 获取分类
func (r *categoryRepository) GetByID(ctx context.Context, id string) (*models.Category, error) {
	var category models.Category
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

// GetByName 根据名称获取分类
func (r *categoryRepository) GetByName(ctx context.Context, name string) (*models.Category, error) {
	var category models.Category
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

// List 获取所有分类
func (r *categoryRepository) List(ctx context.Context) ([]models.Category, error) {
	var categories []models.Category
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&categories).Error
	return categories, err
}

// Delete 删除分类
func (r *categoryRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Category{}, "id = ?", id).Error
}

// AddKnowledgeCategory 添加知识-分类关联
func (r *categoryRepository) AddKnowledgeCategory(ctx context.Context, knowledgeID, categoryID string) error {
	kc := &models.KnowledgeCategory{
		KnowledgeID: knowledgeID,
		CategoryID:  categoryID,
	}
	return r.db.WithContext(ctx).FirstOrCreate(kc,
		models.KnowledgeCategory{KnowledgeID: knowledgeID, CategoryID: categoryID}).Error
}

// RemoveKnowledgeCategory 移除知识-分类关联
func (r *categoryRepository) RemoveKnowledgeCategory(ctx context.Context, knowledgeID, categoryID string) error {
	return r.db.WithContext(ctx).
		Where("knowledge_id = ? AND category_id = ?", knowledgeID, categoryID).
		Delete(&models.KnowledgeCategory{}).Error
}

// GetKnowledgeCategories 获取知识的所有分类
func (r *categoryRepository) GetKnowledgeCategories(ctx context.Context, knowledgeID string) ([]models.Category, error) {
	var categories []models.Category
	err := r.db.WithContext(ctx).
		Joins("JOIN knowledge_categories ON knowledge_categories.category_id = categories.id").
		Where("knowledge_categories.knowledge_id = ?", knowledgeID).
		Find(&categories).Error
	return categories, err
}

// GetKnowledgeByCategory 获取某分类下的所有知识
func (r *categoryRepository) GetKnowledgeByCategory(ctx context.Context, categoryID string) ([]models.Knowledge, error) {
	var knowledge []models.Knowledge
	err := r.db.WithContext(ctx).
		Joins("JOIN knowledge_categories ON knowledge_categories.knowledge_id = knowledge.uuid").
		Where("knowledge_categories.category_id = ? AND knowledge.status = ?", categoryID, models.KnowledgeStatusActive).
		Find(&knowledge).Error
	return knowledge, err
}