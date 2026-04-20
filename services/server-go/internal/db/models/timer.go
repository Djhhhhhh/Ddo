package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Timer 定时任务配置表
type Timer struct {
	ID              string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	UUID            string         `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	Name            string         `gorm:"type:varchar(100);not null" json:"name"`
	Description     string         `gorm:"type:varchar(500)" json:"description"`
	TriggerType     string         `gorm:"type:varchar(20);not null;default:'cron'" json:"trigger_type"` // cron, periodic, delayed
	CronExpr        string         `gorm:"type:varchar(100)" json:"cron_expr"`
	IntervalSeconds int64          `gorm:"type:bigint;default:0" json:"interval_seconds"`
	DelaySeconds    int64          `gorm:"type:bigint;default:0" json:"delay_seconds"`
	Timezone        string         `gorm:"type:varchar(50);default:'Local'" json:"timezone"`
	CallbackURL     string         `gorm:"type:varchar(500)" json:"callback_url"`
	CallbackMethod  string         `gorm:"type:varchar(10);default:'POST'" json:"callback_method"`
	CallbackHeaders string         `gorm:"type:json" json:"callback_headers"` // JSON 存储
	CallbackBody    string         `gorm:"type:text" json:"callback_body"`
	Status          string         `gorm:"type:varchar(20);default:'active';index" json:"status"` // active, paused, deleted
	LastRunAt       *time.Time     `json:"last_run_at,omitempty"`
	NextRunAt       *time.Time     `json:"next_run_at,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName 返回表名
func (Timer) TableName() string {
	return "timers"
}

// BeforeCreate 创建前钩子，生成 UUID
func (t *Timer) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	if t.UUID == "" {
		t.UUID = uuid.New().String()
	}
	// 设置默认值
	if t.TriggerType == "" {
		t.TriggerType = TriggerTypeCron
	}
	if t.Timezone == "" {
		t.Timezone = "Local"
	}
	if t.CallbackMethod == "" {
		t.CallbackMethod = "POST"
	}
	return nil
}

// TimerStatus 定时任务状态常量
const (
	TimerStatusActive   = "active"
	TimerStatusPaused   = "paused"
	TimerStatusDeleted  = "deleted"
)

// TriggerType 触发类型常量
const (
	TriggerTypeCron     = "cron"
	TriggerTypePeriodic = "periodic"
	TriggerTypeDelayed  = "delayed"
)
