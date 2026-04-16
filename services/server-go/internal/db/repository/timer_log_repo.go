package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/ddo/server-go/internal/db/models"
)

// TimerLogRepository 定时任务执行日志数据访问接口
type TimerLogRepository interface {
	Create(ctx context.Context, log *models.TimerLog) error
	GetByUUID(ctx context.Context, uuid string) (*models.TimerLog, error)
	ListByTimerUUID(ctx context.Context, timerUUID string, filter TimerLogFilter) (*ListResult[models.TimerLog], error)
}

// TimerLogFilter 执行日志查询过滤条件
type TimerLogFilter struct {
	Status   string
	Page     int
	PageSize int
}

// timerLogRepository 定时任务执行日志数据访问实现
type timerLogRepository struct {
	db *gorm.DB
}

// NewTimerLogRepository 创建定时任务执行日志仓库
func NewTimerLogRepository(db *gorm.DB) TimerLogRepository {
	return &timerLogRepository{db: db}
}

// Create 创建执行日志
func (r *timerLogRepository) Create(ctx context.Context, log *models.TimerLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// GetByUUID 根据 UUID 获取执行日志
func (r *timerLogRepository) GetByUUID(ctx context.Context, uuid string) (*models.TimerLog, error) {
	var log models.TimerLog
	err := r.db.WithContext(ctx).Where("id = ?", uuid).First(&log).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &log, nil
}

// ListByTimerUUID 分页查询指定定时任务的执行日志
func (r *timerLogRepository) ListByTimerUUID(ctx context.Context, timerUUID string, filter TimerLogFilter) (*ListResult[models.TimerLog], error) {
	query := r.db.WithContext(ctx).Model(&models.TimerLog{}).
		Where("timer_uuid = ?", timerUUID)

	// 应用状态过滤
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

	// 查询数据，按创建时间倒序
	var items []models.TimerLog
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, err
	}

	return &ListResult[models.TimerLog]{
		Total: total,
		Items: items,
	}, nil
}
