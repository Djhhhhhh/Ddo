package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"go.uber.org/zap"
)

// NotificationService 通知服务
// 管理通知的创建、查询和过期清理
type NotificationService struct {
	repo   repository.NotificationRepository
	logger *zap.Logger
	mu     sync.RWMutex
}

// NewNotificationService 创建通知服务实例
func NewNotificationService(repo repository.NotificationRepository, logger *zap.Logger) *NotificationService {
	return &NotificationService{
		repo:   repo,
		logger: logger.With(zap.String("service", "notification")),
	}
}

// AddNotification 添加新通知
// 定时任务执行时调用此方法创建通知
func (s *NotificationService) AddNotification(ctx context.Context, notification *models.Notification) error {
	if notification.Title == "" {
		return fmt.Errorf("notification title is required")
	}
	if notification.Level == "" {
		notification.Level = models.NotificationLevelNormal
	}
	if err := s.repo.Create(ctx, notification); err != nil {
		s.logger.Error("Failed to create notification",
			zap.String("title", notification.Title),
			zap.Error(err))
		return fmt.Errorf("create notification failed: %w", err)
	}
	s.logger.Info("Notification created",
		zap.String("id", notification.ID),
		zap.String("title", notification.Title),
		zap.String("level", notification.Level),
		zap.String("type", notification.Type))
	return nil
}

// GetUnreadNotifications 获取未读且未过期的通知列表
// Electron 轮询接口调用此方法
func (s *NotificationService) GetUnreadNotifications(ctx context.Context) ([]models.Notification, error) {
	notifications, err := s.repo.ListUnreadAndNotExpired(ctx)
	if err != nil {
		s.logger.Error("Failed to list notifications", zap.Error(err))
		return nil, fmt.Errorf("list notifications failed: %w", err)
	}
	return notifications, nil
}

// MarkAsRead 标记通知为已读
func (s *NotificationService) MarkAsRead(ctx context.Context, id string) error {
	if err := s.repo.MarkAsRead(ctx, id); err != nil {
		s.logger.Error("Failed to mark notification as read",
			zap.String("id", id),
			zap.Error(err))
		return fmt.Errorf("mark as read failed: %w", err)
	}
	return nil
}

// MarkMultipleAsRead 批量标记通知为已读
func (s *NotificationService) MarkMultipleAsRead(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	if err := s.repo.MarkMultipleAsRead(ctx, ids); err != nil {
		s.logger.Error("Failed to mark multiple notifications as read",
			zap.Int("count", len(ids)),
			zap.Error(err))
		return fmt.Errorf("mark multiple as read failed: %w", err)
	}
	s.logger.Info("Notifications marked as read", zap.Int("count", len(ids)))
	return nil
}

// CleanupExpired 清理过期通知
// 建议作为定时任务定期执行
func (s *NotificationService) CleanupExpired(ctx context.Context) error {
	deletedCount, err := s.repo.DeleteExpired(ctx)
	if err != nil {
		s.logger.Error("Failed to cleanup expired notifications", zap.Error(err))
		return fmt.Errorf("cleanup expired notifications failed: %w", err)
	}
	if deletedCount > 0 {
		s.logger.Info("Cleaned up expired notifications", zap.Int64("count", deletedCount))
	}
	return nil
}

// CreateTimerNotification 创建定时任务通知的便捷方法
func (s *NotificationService) CreateTimerNotification(
	ctx context.Context,
	timerUUID string,
	taskName string,
	description string,
	status string,
	triggerSource string,
	notifyConfig models.TimerNotifyConfig,
	body string,
) (*models.Notification, error) {
	if !shouldCreateTimerNotification(status, triggerSource, notifyConfig) {
		return nil, nil
	}

	// 检查是否已存在相同状态的未读通知（防止队列重试导致重复通知）
	exists, err := s.repo.CheckUnreadNotificationByTimerUUID(ctx, timerUUID, status)
	if err != nil {
		s.logger.Warn("Failed to check existing notification",
			zap.String("timer_uuid", timerUUID),
			zap.Error(err))
		// 继续执行，不要因为检查失败而阻止通知创建
	}
	if exists {
		s.logger.Info("Duplicate notification skipped",
			zap.String("timer_uuid", timerUUID),
			zap.String("status", status))
		return nil, nil
	}

	var level string
	var title string

	switch status {
	case models.NotificationStatusStarted:
		level = models.NotificationLevelNormal
		title = fmt.Sprintf("【%s】任务开始执行", taskName)
	case models.NotificationStatusCompleted:
		level = models.NotificationLevelImportant
		title = fmt.Sprintf("【%s】任务执行成功", taskName)
	case models.NotificationStatusFailed:
		level = models.NotificationLevelUrgent
		title = fmt.Sprintf("【%s】任务执行失败", taskName)
	default:
		level = models.NotificationLevelNormal
		title = fmt.Sprintf("【%s】任务状态更新", taskName)
	}

	notification := &models.Notification{
		Title:         title,
		Body:          body,
		Level:         level,
		Type:          models.NotificationTypeScheduledTask,
		TaskName:      taskName,
		Description:   description,
		Status:        status,
		TimerUUID:     timerUUID,
		IslandEnabled: notifyConfig.IslandEnabled,
		SystemEnabled: notifyConfig.SystemEnabled,
		ExpiredAt:     time.Now().Add(5 * time.Minute),
	}

	if err := s.AddNotification(ctx, notification); err != nil {
		return nil, err
	}

	return notification, nil
}

func shouldCreateTimerNotification(status string, triggerSource string, notifyConfig models.TimerNotifyConfig) bool {
	if !notifyConfig.Enabled {
		return false
	}
	if !notifyConfig.IslandEnabled && !notifyConfig.SystemEnabled {
		return false
	}

	switch notifyConfig.NotifyOn {
	case models.TimerNotifyOnFailure:
		return status == models.NotificationStatusFailed
	case models.TimerNotifyOnSuccess:
		return status == models.NotificationStatusCompleted
	case models.TimerNotifyOnManual:
		return triggerSource == models.TimerTriggerSourceManual
	case models.TimerNotifyOnAll, "":
		return true
	default:
		return true
	}
}
