package common

import (
	"testing"
	"time"
)

func TestNewEntity(t *testing.T) {
	entity := NewEntity()

	// 验证 ID 不为空
	if entity.ID == "" {
		t.Error("expected entity ID to not be empty")
	}

	// 验证时间戳已设置
	if entity.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if entity.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}

	// 验证创建和更新时间相等
	if !entity.CreatedAt.Equal(entity.UpdatedAt) {
		t.Error("expected CreatedAt and UpdatedAt to be equal on new entity")
	}
}

func TestEntityIDUniqueness(t *testing.T) {
	// 创建多个实体，验证 ID 不重复
	entity1 := NewEntity()
	entity2 := NewEntity()
	entity3 := NewEntity()

	if entity1.ID == entity2.ID {
		t.Error("entity IDs should be unique")
	}
	if entity1.ID == entity3.ID {
		t.Error("entity IDs should be unique")
	}
	if entity2.ID == entity3.ID {
		t.Error("entity IDs should be unique")
	}
}

func TestUpdateTimestamp(t *testing.T) {
	entity := NewEntity()
	originalUpdatedAt := entity.UpdatedAt

	// 等待一小段时间确保时间变化
	time.Sleep(10 * time.Millisecond)

	entity.UpdateTimestamp()

	// 验证 UpdatedAt 已更新
	if !entity.UpdatedAt.After(originalUpdatedAt) {
		t.Error("expected UpdatedAt to be updated after calling UpdateTimestamp")
	}

	// 验证 CreatedAt 未变
	if !entity.CreatedAt.Equal(entity.CreatedAt) {
		t.Error("expected CreatedAt to remain unchanged")
	}
}
