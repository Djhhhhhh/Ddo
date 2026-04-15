package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Knowledge 知识库元数据表
type Knowledge struct {
	ID          string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	UUID        string         `gorm:"type:varchar(36);uniqueIndex;not null" json:"uuid"`
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Content     string         `gorm:"type:text" json:"content"`
	Category    string         `gorm:"type:varchar(100);index" json:"category"`
	Tags        string         `gorm:"type:json" json:"tags"` // JSON 数组存储
	Source      string         `gorm:"type:varchar(500)" json:"source"`
	EmbeddingID string         `gorm:"type:varchar(36);index" json:"embedding_id"` // llm-py 中的向量 ID
	Status      string         `gorm:"type:varchar(20);default:'active';index" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName 返回表名
func (Knowledge) TableName() string {
	return "knowledge"
}

// BeforeCreate 创建前钩子，生成 UUID
func (k *Knowledge) BeforeCreate(tx *gorm.DB) error {
	if k.ID == "" {
		k.ID = uuid.New().String()
	}
	if k.UUID == "" {
		k.UUID = uuid.New().String()
	}
	return nil
}

// KnowledgeStatus 知识状态常量
const (
	KnowledgeStatusActive   = "active"
	KnowledgeStatusArchived = "archived"
	KnowledgeStatusDeleted  = "deleted"
)
