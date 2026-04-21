package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/application/service"
)

// NotificationHandler 通知 Handler
type NotificationHandler struct {
	notificationService *service.NotificationService
}

// NewNotificationHandler 创建通知 Handler
func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// SubscribeNotifications 订阅通知（轮询接口）
// GET /api/notifications/subscribe
func (h *NotificationHandler) SubscribeNotifications(c *gin.Context) {
	ctx := c.Request.Context()

	// 获取未读且未过期的通知
	notifications, err := h.notificationService.GetUnreadNotifications(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get notifications",
		})
		return
	}

	// 如果没有通知，返回空数组
	if len(notifications) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"notifications": []interface{}{},
		})
		return
	}

	// 转换为响应格式
	responseNotifications := make([]gin.H, len(notifications))
	notificationIDs := make([]string, len(notifications))

	for i, n := range notifications {
		responseNotifications[i] = gin.H{
			"id":          n.ID,
			"title":       n.Title,
			"body":        n.Body,
			"level":       n.Level,
			"timestamp":   n.CreatedAt.UnixMilli(),
			"type":        n.Type,
			"taskName":    n.TaskName,
			"description": n.Description,
			"status":      n.Status,
			"timerUUID":   n.TimerUUID,
			"channels": gin.H{
				"island": n.IslandEnabled,
				"system": n.SystemEnabled,
			},
		}
		notificationIDs[i] = n.ID
	}

	// 标记为已读（因为已经返回给客户端）
	// 使用独立的 background context，避免 HTTP 请求结束后 context 被取消
	go func() {
		markCtx := context.Background()
		h.notificationService.MarkMultipleAsRead(markCtx, notificationIDs)
	}()

	c.JSON(http.StatusOK, gin.H{
		"notifications": responseNotifications,
	})
}

// MarkAsRead 标记通知为已读
// POST /api/notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Notification ID is required",
		})
		return
	}

	if err := h.notificationService.MarkAsRead(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to mark notification as read",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
