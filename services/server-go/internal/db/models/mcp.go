package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MCPConfig MCP 配置表
type MCPConfig struct {
	ID          string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	UUID        string         `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	Name        string         `gorm:"type:varchar(100);not null;index" json:"name"`
	Description string         `gorm:"type:varchar(500)" json:"description"`
	Type        string         `gorm:"type:varchar(20);not null;index" json:"type"` // stdio, http, streamable_http, sse
	// 连接配置（根据 Type 不同使用不同字段）
	Command     string         `gorm:"type:varchar(500)" json:"command"`     // stdio 类型：命令
	Args        string         `gorm:"type:json" json:"args"`                // stdio 类型：参数数组
	Env         string         `gorm:"type:json" json:"env"`                 // stdio 类型：环境变量
	URL         string         `gorm:"type:varchar(500)" json:"url"`         // http/sse 类型：URL
	Headers     string         `gorm:"type:json" json:"headers"`             // http/sse 类型：请求头
	// 状态
	Status      string         `gorm:"type:varchar(20);default:'inactive';index" json:"status"` // inactive, active, error
	LastError   string         `gorm:"type:text" json:"last_error"`
	LastTestAt  *time.Time     `json:"last_test_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName 返回表名
func (MCPConfig) TableName() string {
	return "mcp_configs"
}

// BeforeCreate 创建前钩子，生成 UUID
func (m *MCPConfig) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	if m.UUID == "" {
		m.UUID = uuid.New().String()
	}
	return nil
}

// MCPType MCP 类型常量
const (
	MCPTypeStdio         = "stdio"
	MCPTypeHTTP          = "http"
	MCPTypeStreamableHTTP = "streamable_http"
	MCPTypeSSE           = "sse"
)

// MCPStatus MCP 状态常量
const (
	MCPStatusInactive = "inactive"
	MCPStatusActive   = "active"
	MCPStatusError    = "error"
)
