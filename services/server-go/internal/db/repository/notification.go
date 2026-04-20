package repository

import (
	"context"
	"time"

	"github.com/ddo/server-go/internal/db"
	"github.com/ddo/server-go/internal/db/models"
	"gorm.io/gorm"
)

// NotificationRepository 通知数据访问接口
type NotificationRepository interface {
	Create(ctx context.Context, notification *models.Notification) error
	ListUnreadAndNotExpired(ctx context.Context) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkMultipleAsRead(ctx context.Context, ids []string) error
	DeleteExpired(ctx context.Context) (int64, error)
}

// notificationRepository 通知数据访问实现
type notificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository 创建通知仓库实例
func NewNotificationRepository(dbConn *db.MySQLConn) NotificationRepository {
	return &notificationRepository{
		db: dbConn.DB(),
	}
}

// Create 创建通知
func (r *notificationRepository) Create(ctx context.Context, notification *models.Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

// ListUnreadAndNotExpired 获取未读且未过期的通知
func (r *notificationRepository) ListUnreadAndNotExpired(ctx context.Context) ([]models.Notification, error) {
	var notifications []models.Notification
	err := r.db.WithContext(ctx).
		Where("is_read = ? AND expired_at > ?", false, time.Now()).
		Order("created_at DESC").
		Find(&notifications).Error
	return notifications, err
}

// MarkAsRead 标记通知为已读
func (r *notificationRepository) MarkAsRead(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("id = ?", id).
		Update("is_read", true).Error
}

// MarkMultipleAsRead 批量标记通知为已读
func (r *notificationRepository) MarkMultipleAsRead(ctx context.Context, ids []string) error {
	return r.db.WithContext(ctx).
		Model(&models.Notification{}).
		Where("id IN ?", ids).
		Update("is_read", true).Error
}

// DeleteExpired 删除过期通知
func (r *notificationRepository) DeleteExpired(ctx context.Context) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("expired_at < ? OR is_read = ?", time.Now(), true).
		Delete(&models.Notification{})
	return result.RowsAffected, result.Error
}
