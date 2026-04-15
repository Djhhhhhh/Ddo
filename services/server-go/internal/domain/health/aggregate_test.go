package health

import (
	"testing"
	"time"
)

func TestNewAggregate(t *testing.T) {
	agg := NewAggregate("v1.0.0")

	// 验证 ID 已生成
	if agg.ID == "" {
		t.Error("expected aggregate ID to be set")
	}

	// 验证初始状态为 healthy
	if !agg.Status().IsHealthy() {
		t.Error("expected initial status to be healthy")
	}

	// 验证版本正确
	if agg.Status().Version != "v1.0.0" {
		t.Errorf("expected version v1.0.0, got %s", agg.Status().Version)
	}

	// 验证检查列表为空
	if len(agg.Checks()) != 0 {
		t.Errorf("expected empty checks, got %d", len(agg.Checks()))
	}
}

func TestAggregate_UpdateStatus(t *testing.T) {
	agg := NewAggregate("v1.0.0")
	_ = agg.LastUpdated() // 记录初始时间

	// 等待以确保时间变化
	time.Sleep(10 * time.Millisecond)

	newStatus := Unhealthy("v1.0.0")
	agg.UpdateStatus(newStatus)

	// 验证状态已更新
	if agg.Status().IsHealthy() {
		t.Error("expected status to be unhealthy after update")
	}

	// 验证 UpdatedAt 时间戳已更新（通过 Entity 基类）
	if !agg.UpdatedAt.After(agg.CreatedAt) && agg.UpdatedAt == agg.CreatedAt {
		t.Error("expected UpdatedAt to be updated")
	}
}

func TestAggregate_AddComponentCheck(t *testing.T) {
	agg := NewAggregate("v1.0.0")

	// 添加一个健康的组件检查
	check1 := ComponentCheck{
		Name:      "database",
		Status:    StatusHealthy,
		Message:   "Database connection OK",
		LatencyMs: 10,
	}
	agg.AddComponentCheck(check1)

	checks := agg.Checks()
	if len(checks) != 1 {
		t.Errorf("expected 1 check, got %d", len(checks))
	}

	// 验证状态仍然是 healthy（因为所有组件都健康）
	if !agg.Status().IsHealthy() {
		t.Error("expected status to still be healthy when all components are healthy")
	}

	// 添加一个不健康的组件检查
	check2 := ComponentCheck{
		Name:      "cache",
		Status:    StatusUnhealthy,
		Message:   "Cache connection failed",
		LatencyMs: 0,
	}
	agg.AddComponentCheck(check2)

	// 验证状态变为 unhealthy
	if agg.Status().IsHealthy() {
		t.Error("expected status to be unhealthy when any component is unhealthy")
	}

	// 验证检查列表更新
	checks = agg.Checks()
	if len(checks) != 2 {
		t.Errorf("expected 2 checks, got %d", len(checks))
	}
}

func TestAggregate_recalculateStatus_AllHealthy(t *testing.T) {
	agg := NewAggregate("v1.0.0")

	// 添加多个健康组件
	agg.AddComponentCheck(ComponentCheck{Name: "db", Status: StatusHealthy})
	agg.AddComponentCheck(ComponentCheck{Name: "cache", Status: StatusHealthy})
	agg.AddComponentCheck(ComponentCheck{Name: "queue", Status: StatusHealthy})

	// 状态应该保持 healthy
	if !agg.Status().IsHealthy() {
		t.Error("expected healthy when all components are healthy")
	}
}

func TestAggregate_recalculateStatus_WithUnhealthy(t *testing.T) {
	agg := NewAggregate("v1.0.0")

	// 添加健康和不健康的组件
	agg.AddComponentCheck(ComponentCheck{Name: "db", Status: StatusHealthy})
	agg.AddComponentCheck(ComponentCheck{Name: "cache", Status: StatusUnhealthy})
	agg.AddComponentCheck(ComponentCheck{Name: "queue", Status: StatusHealthy})

	// 状态应该变为 unhealthy
	if agg.Status().IsHealthy() {
		t.Error("expected unhealthy when any component is unhealthy")
	}

	// 检查状态具体值
	if agg.Status().Status != StatusUnhealthy {
		t.Errorf("expected status %s, got %s", StatusUnhealthy, agg.Status().Status)
	}
}

func TestAggregate_recalculateStatus_WithDegraded(t *testing.T) {
	agg := NewAggregate("v1.0.0")

	// 添加降级状态的组件
	agg.AddComponentCheck(ComponentCheck{Name: "db", Status: StatusHealthy})
	agg.AddComponentCheck(ComponentCheck{Name: "cache", Status: StatusDegraded})

	// 状态应该变为 unhealthy（因为 degraded 不等于 healthy）
	if agg.Status().IsHealthy() {
		t.Error("expected unhealthy when component is degraded")
	}
}

func TestAggregate_LastUpdated(t *testing.T) {
	agg := NewAggregate("v1.0.0")
	originalLastUpdated := agg.LastUpdated()

	// 等待
	time.Sleep(10 * time.Millisecond)

	// 更新状态
	agg.UpdateStatus(Healthy("v1.0.0"))

	// 验证 LastUpdated 已更新
	if !agg.LastUpdated().After(originalLastUpdated) {
		t.Error("expected LastUpdated to be updated")
	}
}
