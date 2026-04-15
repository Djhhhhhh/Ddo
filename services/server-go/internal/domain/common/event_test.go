package common

import (
	"context"
	"testing"
	"time"
)

func TestBaseDomainEvent_Interface(t *testing.T) {
	event := BaseDomainEvent{
		ID:            "evt-123",
		Type:          "test.event",
		Timestamp:     time.Now(),
		AggID:         "agg-456",
		AggregateType: "TestAggregate",
	}

	// 测试接口方法
	if event.EventID() != "evt-123" {
		t.Errorf("expected EventID evt-123, got %s", event.EventID())
	}

	if event.EventType() != "test.event" {
		t.Errorf("expected EventType test.event, got %s", event.EventType())
	}

	if event.AggregateID() != "agg-456" {
		t.Errorf("expected AggregateID agg-456, got %s", event.AggregateID())
	}

	if event.EventTimestamp().IsZero() {
		t.Error("expected EventTimestamp to be set")
	}
}

// MockEventBus 用于测试的事件总线 mock
type MockEventBus struct {
	published []DomainEvent
}

func (m *MockEventBus) Publish(ctx context.Context, event DomainEvent) error {
	m.published = append(m.published, event)
	return nil
}

func (m *MockEventBus) Subscribe(eventType string, handler EventHandler) error {
	return nil
}

func TestEventBus_Publish(t *testing.T) {
	bus := &MockEventBus{}
	event := BaseDomainEvent{
		ID:        "evt-1",
		Type:      "test.event",
		Timestamp: time.Now(),
		AggID:     "agg-1",
	}

	err := bus.Publish(context.Background(), event)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	if len(bus.published) != 1 {
		t.Errorf("expected 1 published event, got %d", len(bus.published))
	}
}
