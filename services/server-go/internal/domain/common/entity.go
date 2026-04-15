package common

import (
	"time"

	"github.com/google/uuid"
)

// Entity 领域实体基类
type Entity struct {
	ID        string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// NewEntity 创建新实体
func NewEntity() Entity {
	now := time.Now()
	return Entity{
		ID:        uuid.New().String(),
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// UpdateTimestamp 更新时间戳
func (e *Entity) UpdateTimestamp() {
	e.UpdatedAt = time.Now()
}
