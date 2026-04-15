package health

import (
	"time"

	"github.com/ddo/server-go/internal/domain/common"
)

// Aggregate 健康检查聚合根
// 演示 DDD 聚合根的概念，虽然健康检查比较简单，但展示了完整结构
type Aggregate struct {
	common.Entity
	status    HealthStatus
	checks    []ComponentCheck
	updatedAt time.Time
}

// ComponentCheck 组件健康检查
type ComponentCheck struct {
	Name      string
	Status    Status
	Message   string
	LatencyMs int64
}

// NewAggregate 创建健康检查聚合根
func NewAggregate(version string) *Aggregate {
	return &Aggregate{
		Entity:    common.NewEntity(),
		status:    Healthy(version),
		checks:    make([]ComponentCheck, 0),
		updatedAt: time.Now(),
	}
}

// Status 获取健康状态
func (a *Aggregate) Status() HealthStatus {
	return a.status
}

// UpdateStatus 更新健康状态
func (a *Aggregate) UpdateStatus(status HealthStatus) {
	a.status = status
	a.updatedAt = time.Now()
	a.UpdateTimestamp()
}

// AddComponentCheck 添加组件检查
func (a *Aggregate) AddComponentCheck(check ComponentCheck) {
	a.checks = append(a.checks, check)
	a.recalculateStatus()
	a.updatedAt = time.Now()
	a.UpdateTimestamp()
}

// recalculateStatus 根据组件检查重新计算状态
func (a *Aggregate) recalculateStatus() {
	allHealthy := true
	for _, check := range a.checks {
		if check.Status != StatusHealthy {
			allHealthy = false
			break
		}
	}

	if allHealthy {
		a.status.Status = StatusHealthy
	} else {
		a.status.Status = StatusUnhealthy
	}
}

// Checks 获取组件检查列表
func (a *Aggregate) Checks() []ComponentCheck {
	return a.checks
}

// LastUpdated 获取最后更新时间
func (a *Aggregate) LastUpdated() time.Time {
	return a.updatedAt
}
