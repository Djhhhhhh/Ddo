package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NotificationLevel 通知级别常量
const (
	NotificationLevelNormal    = "normal"    // 普通级别 - 系统通知
	NotificationLevelImportant = "important" // 重要级别 - 灵动岛
	NotificationLevelUrgent    = "urgent"    // 紧急级别 - 灵动岛 + 系统通知
)

// NotificationType 通知类型常量
const (
	NotificationTypeScheduledTask = "scheduled_task" // 定时任务通知
)

// NotificationStatus 通知状态常量
const (
	NotificationStatusStarted   = "started"   // 任务开始
	NotificationStatusCompleted = "completed" // 任务完成
	NotificationStatusFailed    = "failed"    // 任务失败
)

// Notification 通知数据模型
// 用于存储定时任务等系统通知，供 Electron 轮询获取
type Notification struct {
	ID          string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	Title       string    `gorm:"type:varchar(200);not null" json:"title"`
	Body        string    `gorm:"type:text" json:"body"`
	Level       string    `gorm:"type:varchar(20);not null;index" json:"level"` // normal | important | urgent
	Type        string    `gorm:"type:varchar(50);not null;index" json:"type"`   // scheduled_task
	TaskName    string    `gorm:"type:varchar(100)" json:"taskName"`
	Description string    `gorm:"type:varchar(500)" json:"description"` // 任务描述
	Status      string    `gorm:"type:varchar(20)" json:"status"` // started | completed | failed
	TimerUUID   string    `gorm:"type:varchar(36);index" json:"timerUUID"`
	IslandEnabled bool    `gorm:"default:false" json:"islandEnabled"`
	SystemEnabled bool    `gorm:"default:false" json:"systemEnabled"`
	IsRead      bool      `gorm:"default:false;index" json:"isRead"`
	ExpiredAt   time.Time `json:"expiredAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

// TableName 返回表名
func (Notification) TableName() string {
	return "notifications"
}

// BeforeCreate 创建前钩子，生成 ID 和过期时间
func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	// 默认过期时间为 5 分钟后
	if n.ExpiredAt.IsZero() {
		n.ExpiredAt = time.Now().Add(5 * time.Minute)
	}
	return nil
}

// IsExpired 检查通知是否已过期
func (n *Notification) IsExpired() bool {
	return time.Now().After(n.ExpiredAt)
}
