package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TimerLog 定时任务执行日志表
type TimerLog struct {
	ID        string    `gorm:"type:varchar(36);primaryKey" json:"id"`
	TimerUUID string    `gorm:"type:varchar(36);index;not null" json:"timer_uuid"`
	Status    string    `gorm:"type:varchar(20);not null;index" json:"status"` // success, failed
	Output    string    `gorm:"type:text" json:"output"`
	Error     string    `gorm:"type:text" json:"error"`
	Duration  int64     `json:"duration"` // 执行耗时（毫秒）
	CreatedAt time.Time `json:"created_at"`
}

// TableName 返回表名
func (TimerLog) TableName() string {
	return "timer_logs"
}

// BeforeCreate 创建前钩子，生成 ID
func (tl *TimerLog) BeforeCreate(tx *gorm.DB) error {
	if tl.ID == "" {
		tl.ID = uuid.New().String()
	}
	return nil
}

// TimerLogStatus 日志状态常量
const (
	TimerLogStatusSuccess = "success"
	TimerLogStatusFailed  = "failed"
	TimerLogStatusTimeout = "timeout"
)
