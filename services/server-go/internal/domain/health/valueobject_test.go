package health

import (
	"testing"
	"time"
)

func TestNewHealthStatus(t *testing.T) {
	status := NewHealthStatus(StatusHealthy, "v1.0.0")

	if status.Status != StatusHealthy {
		t.Errorf("expected status %s, got %s", StatusHealthy, status.Status)
	}

	if status.Version != "v1.0.0" {
		t.Errorf("expected version v1.0.0, got %s", status.Version)
	}

	if status.Timestamp.IsZero() {
		t.Error("expected timestamp to be set")
	}
}

func TestHealthy(t *testing.T) {
	status := Healthy("v2.0.0")

	if status.Status != StatusHealthy {
		t.Errorf("expected status %s, got %s", StatusHealthy, status.Status)
	}

	if status.Version != "v2.0.0" {
		t.Errorf("expected version v2.0.0, got %s", status.Version)
	}
}

func TestUnhealthy(t *testing.T) {
	status := Unhealthy("v2.0.0")

	if status.Status != StatusUnhealthy {
		t.Errorf("expected status %s, got %s", StatusUnhealthy, status.Status)
	}

	if status.Version != "v2.0.0" {
		t.Errorf("expected version v2.0.0, got %s", status.Version)
	}
}

func TestHealthStatus_Equals(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name     string
		a        HealthStatus
		b        interface{}
		expected bool
	}{
		{
			name:     "相同状态和版本",
			a:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0", Timestamp: now},
			b:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0", Timestamp: now},
			expected: true,
		},
		{
			name:     "不同状态",
			a:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0"},
			b:        HealthStatus{Status: StatusUnhealthy, Version: "v1.0.0"},
			expected: false,
		},
		{
			name:     "不同版本",
			a:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0"},
			b:        HealthStatus{Status: StatusHealthy, Version: "v2.0.0"},
			expected: false,
		},
		{
			name:     "不同类型",
			a:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0"},
			b:        "not a HealthStatus",
			expected: false,
		},
		{
			name:     "nil",
			a:        HealthStatus{Status: StatusHealthy, Version: "v1.0.0"},
			b:        nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.a.Equals(tt.b)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestHealthStatus_IsHealthy(t *testing.T) {
	tests := []struct {
		name     string
		status   Status
		expected bool
	}{
		{"healthy", StatusHealthy, true},
		{"unhealthy", StatusUnhealthy, false},
		{"degraded", StatusDegraded, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hs := HealthStatus{Status: tt.status}
			if hs.IsHealthy() != tt.expected {
				t.Errorf("expected IsHealthy() = %v for status %s", tt.expected, tt.status)
			}
		})
	}
}

func TestHealthStatus_Immutability(t *testing.T) {
	// 值对象应该是不可变的（通过创建新实例而不是修改）
	status1 := Healthy("v1.0.0")

	// 创建一个新状态而不是修改现有的
	status2 := HealthStatus{
		Status:    StatusUnhealthy,
		Version:   status1.Version,
		Timestamp: status1.Timestamp,
	}

	// 验证原始状态未被修改
	if !status1.IsHealthy() {
		t.Error("original status should still be healthy")
	}

	// 验证新状态是独立的
	if status2.IsHealthy() {
		t.Error("new status should be unhealthy")
	}
}
