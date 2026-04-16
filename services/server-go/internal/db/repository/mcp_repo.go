package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/ddo/server-go/internal/db/models"
)

// MCPRepository MCP 配置数据访问接口
type MCPRepository interface {
	Create(ctx context.Context, mcp *models.MCPConfig) error
	GetByUUID(ctx context.Context, uuid string) (*models.MCPConfig, error)
	List(ctx context.Context, filter MCPFilter) (*ListResult[models.MCPConfig], error)
	Update(ctx context.Context, mcp *models.MCPConfig) error
	Delete(ctx context.Context, uuid string) error
	UpdateStatus(ctx context.Context, uuid, status, lastError string) error
}

// MCPFilter MCP 查询过滤条件
type MCPFilter struct {
	Type   string
	Status string
	Page   int
	PageSize int
}

// mcpRepository MCP 数据访问实现
type mcpRepository struct {
	db *gorm.DB
}

// NewMCPRepository 创建 MCP 仓库
func NewMCPRepository(db *gorm.DB) MCPRepository {
	return &mcpRepository{db: db}
}

// Create 创建 MCP 配置
func (r *mcpRepository) Create(ctx context.Context, mcp *models.MCPConfig) error {
	return r.db.WithContext(ctx).Create(mcp).Error
}

// GetByUUID 根据 UUID 获取 MCP 配置
func (r *mcpRepository) GetByUUID(ctx context.Context, uuid string) (*models.MCPConfig, error) {
	var mcp models.MCPConfig
	err := r.db.WithContext(ctx).Where("uuid = ?", uuid).First(&mcp).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("mcp not found: %s", uuid)
		}
		return nil, err
	}
	return &mcp, nil
}

// List 分页查询 MCP 列表
func (r *mcpRepository) List(ctx context.Context, filter MCPFilter) (*ListResult[models.MCPConfig], error) {
	query := r.db.WithContext(ctx).Model(&models.MCPConfig{})

	// 应用过滤条件
	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
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
	var items []models.MCPConfig
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, err
	}

	return &ListResult[models.MCPConfig]{
		Total: total,
		Items: items,
	}, nil
}

// Update 更新 MCP 配置
func (r *mcpRepository) Update(ctx context.Context, mcp *models.MCPConfig) error {
	return r.db.WithContext(ctx).Save(mcp).Error
}

// Delete 软删除 MCP 配置（更新 status 为 deleted）
func (r *mcpRepository) Delete(ctx context.Context, uuid string) error {
	return r.db.WithContext(ctx).Model(&models.MCPConfig{}).
		Where("uuid = ?", uuid).
		Update("status", models.MCPStatusInactive).Error
}

// UpdateStatus 更新 MCP 状态
func (r *mcpRepository) UpdateStatus(ctx context.Context, uuid, status, lastError string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if lastError != "" {
		updates["last_error"] = lastError
	}
	return r.db.WithContext(ctx).Model(&models.MCPConfig{}).
		Where("uuid = ?", uuid).
		Updates(updates).Error
}