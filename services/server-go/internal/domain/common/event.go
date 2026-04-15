package common

import (
	"context"
	"time"
)

// DomainEvent 领域事件接口
type DomainEvent interface {
	// EventID 事件唯一标识
	EventID() string
	// EventType 事件类型
	EventType() string
	// EventTimestamp 事件发生时间
	EventTimestamp() time.Time
	// AggregateID 关联聚合根ID
	AggregateID() string
}

// BaseDomainEvent 领域事件基类
type BaseDomainEvent struct {
	ID            string
	Type          string
	Timestamp     time.Time
	AggID         string
	AggregateType string
}

// EventID 实现 DomainEvent 接口
func (e BaseDomainEvent) EventID() string {
	return e.ID
}

// EventType 实现 DomainEvent 接口
func (e BaseDomainEvent) EventType() string {
	return e.Type
}

// EventTimestamp 实现 DomainEvent 接口
func (e BaseDomainEvent) EventTimestamp() time.Time {
	return e.Timestamp
}

// AggregateID 实现 DomainEvent 接口
func (e BaseDomainEvent) AggregateID() string {
	return e.AggID
}

// EventHandler 领域事件处理器接口
type EventHandler interface {
	Handle(ctx context.Context, event DomainEvent) error
}

// EventBus 领域事件总线接口
type EventBus interface {
	// Publish 发布事件
	Publish(ctx context.Context, event DomainEvent) error
	// Subscribe 订阅事件
	Subscribe(eventType string, handler EventHandler) error
}
