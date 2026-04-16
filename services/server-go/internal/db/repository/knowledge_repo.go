package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/ddo/server-go/internal/db/models"
)

// KnowledgeRepository 知识库数据访问接口
type KnowledgeRepository interface {
	Create(ctx context.Context, knowledge *models.Knowledge) error
	GetByUUID(ctx context.Context, uuid string) (*models.Knowledge, error)
	List(ctx context.Context, filter KnowledgeFilter) (*ListResult[models.Knowledge], error)
	Update(ctx context.Context, knowledge *models.Knowledge) error
	Delete(ctx context.Context, uuid string) error
	UpdateEmbeddingID(ctx context.Context, uuid, embeddingID string) error
}

// KnowledgeFilter 知识库查询过滤条件
type KnowledgeFilter struct {
	Category string
	Tag      string
	Status   string
	Keyword  string
	Page     int
	PageSize int
}

// ListResult 列表查询结果
type ListResult[T any] struct {
	Total int64
	Items []T
}

// knowledgeRepository 知识库数据访问实现
type knowledgeRepository struct {
	db *gorm.DB
}

// NewKnowledgeRepository 创建知识库仓库
func NewKnowledgeRepository(db *gorm.DB) KnowledgeRepository {
	return &knowledgeRepository{db: db}
}

// Create 创建知识条目
func (r *knowledgeRepository) Create(ctx context.Context, knowledge *models.Knowledge) error {
	return r.db.WithContext(ctx).Create(knowledge).Error
}

// GetByUUID 根据 UUID 获取知识条目
func (r *knowledgeRepository) GetByUUID(ctx context.Context, uuid string) (*models.Knowledge, error) {
	var knowledge models.Knowledge
	err := r.db.WithContext(ctx).Where("uuid = ?", uuid).First(&knowledge).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("knowledge not found: %s", uuid)
		}
		return nil, err
	}
	return &knowledge, nil
}

// List 分页查询知识列表
func (r *knowledgeRepository) List(ctx context.Context, filter KnowledgeFilter) (*ListResult[models.Knowledge], error) {
	query := r.db.WithContext(ctx).Model(&models.Knowledge{})

	// 应用过滤条件
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	} else {
		// 默认只查询 active 状态
		query = query.Where("status = ?", models.KnowledgeStatusActive)
	}
	if filter.Tag != "" {
		query = query.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, filter.Tag))
	}
	if filter.Keyword != "" {
		query = query.Where("title LIKE ? OR content LIKE ?",
			fmt.Sprintf("%%%s%%", filter.Keyword),
			fmt.Sprintf("%%%s%%", filter.Keyword))
	}

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 分页参数
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 查询数据
	var items []models.Knowledge
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, err
	}

	return &ListResult[models.Knowledge]{
		Total: total,
		Items: items,
	}, nil
}

// Update 更新知识条目
func (r *knowledgeRepository) Update(ctx context.Context, knowledge *models.Knowledge) error {
	return r.db.WithContext(ctx).Save(knowledge).Error
}

// Delete 软删除知识条目
func (r *knowledgeRepository) Delete(ctx context.Context, uuid string) error {
	return r.db.WithContext(ctx).Model(&models.Knowledge{}).
		Where("uuid = ?", uuid).
		Update("status", models.KnowledgeStatusDeleted).Error
}

// UpdateEmbeddingID 更新向量 ID
func (r *knowledgeRepository) UpdateEmbeddingID(ctx context.Context, uuid, embeddingID string) error {
	return r.db.WithContext(ctx).Model(&models.Knowledge{}).
		Where("uuid = ?", uuid).
		Update("embedding_id", embeddingID).Error
}
