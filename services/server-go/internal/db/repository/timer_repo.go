package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/ddo/server-go/internal/db/models"
)

// TimerRepository 定时任务数据访问接口
type TimerRepository interface {
	Create(ctx context.Context, timer *models.Timer) error
	GetByUUID(ctx context.Context, uuid string) (*models.Timer, error)
	List(ctx context.Context, filter TimerFilter) (*ListResult[models.Timer], error)
	Update(ctx context.Context, timer *models.Timer) error
	UpdateStatus(ctx context.Context, uuid string, status string) error
	Delete(ctx context.Context, uuid string) error
	ListActive(ctx context.Context) ([]models.Timer, error)
}

// TimerFilter 定时任务查询过滤条件
type TimerFilter struct {
	Status   string
	Page     int
	PageSize int
}

// timerRepository 定时任务数据访问实现
type timerRepository struct {
	db *gorm.DB
}

// NewTimerRepository 创建定时任务仓库
func NewTimerRepository(db *gorm.DB) TimerRepository {
	return &timerRepository{db: db}
}

// Create 创建定时任务
func (r *timerRepository) Create(ctx context.Context, timer *models.Timer) error {
	return r.db.WithContext(ctx).Create(timer).Error
}

// GetByUUID 根据 UUID 获取定时任务
func (r *timerRepository) GetByUUID(ctx context.Context, uuid string) (*models.Timer, error) {
	var timer models.Timer
	err := r.db.WithContext(ctx).Where("uuid = ?", uuid).First(&timer).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("timer not found: %s", uuid)
		}
		return nil, err
	}
	return &timer, nil
}

// List 分页查询定时任务列表
func (r *timerRepository) List(ctx context.Context, filter TimerFilter) (*ListResult[models.Timer], error) {
	query := r.db.WithContext(ctx).Model(&models.Timer{})

	// 应用过滤条件
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	// 排除已删除的
	query = query.Where("status != ?", models.TimerStatusDeleted)

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
	var items []models.Timer
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, err
	}

	return &ListResult[models.Timer]{
		Total: total,
		Items: items,
	}, nil
}

// Update 更新定时任务
func (r *timerRepository) Update(ctx context.Context, timer *models.Timer) error {
	return r.db.WithContext(ctx).Save(timer).Error
}

// UpdateStatus 更新状态
func (r *timerRepository) UpdateStatus(ctx context.Context, uuid string, status string) error {
	return r.db.WithContext(ctx).Model(&models.Timer{}).
		Where("uuid = ?", uuid).
		Update("status", status).Error
}

// Delete 软删除定时任务
func (r *timerRepository) Delete(ctx context.Context, uuid string) error {
	return r.db.WithContext(ctx).Model(&models.Timer{}).
		Where("uuid = ?", uuid).
		Update("status", models.TimerStatusDeleted).Error
}

// ListActive 查询所有活跃任务
func (r *timerRepository) ListActive(ctx context.Context) ([]models.Timer, error) {
	var timers []models.Timer
	if err := r.db.WithContext(ctx).Where("status = ?", models.TimerStatusActive).Find(&timers).Error; err != nil {
		return nil, err
	}
	return timers, nil
}
