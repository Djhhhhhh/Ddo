package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Category 分类实体
type Category struct {
	ID          string         `gorm:"type:varchar(36);primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// TableName 返回表名
func (Category) TableName() string {
	return "categories"
}

// BeforeCreate 创建前钩子，生成 UUID
func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// KnowledgeCategory 知识-分类关联表
type KnowledgeCategory struct {
	KnowledgeID string    `gorm:"primaryKey" json:"knowledge_id"`
	CategoryID  string    `gorm:"primaryKey" json:"category_id"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName 返回表名
func (KnowledgeCategory) TableName() string {
	return "knowledge_categories"
}