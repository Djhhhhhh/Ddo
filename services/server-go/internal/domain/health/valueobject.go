package health

import "time"

// Status 健康状态值对象
type Status string

const (
	// StatusHealthy 健康
	StatusHealthy Status = "healthy"
	// StatusUnhealthy 不健康
	StatusUnhealthy Status = "unhealthy"
	// StatusDegraded 降级
	StatusDegraded Status = "degraded"
)

// HealthStatus 健康状态值对象
type HealthStatus struct {
	Status    Status
	Version   string
	Timestamp time.Time
}

// NewHealthStatus 创建健康状态值对象
func NewHealthStatus(status Status, version string) HealthStatus {
	return HealthStatus{
		Status:    status,
		Version:   version,
		Timestamp: time.Now(),
	}
}

// Healthy 创建健康状态
func Healthy(version string) HealthStatus {
	return NewHealthStatus(StatusHealthy, version)
}

// Unhealthy 创建不健康状态
func Unhealthy(version string) HealthStatus {
	return NewHealthStatus(StatusUnhealthy, version)
}

// Equals 值对象相等比较
func (h HealthStatus) Equals(other interface{}) bool {
	v, ok := other.(HealthStatus)
	if !ok {
		return false
	}
	return h.Status == v.Status && h.Version == v.Version
}

// IsHealthy 是否健康
func (h HealthStatus) IsHealthy() bool {
	return h.Status == StatusHealthy
}
