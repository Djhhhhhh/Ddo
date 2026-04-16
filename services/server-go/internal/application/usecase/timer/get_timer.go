package timer

import (
	"context"
	"fmt"
	"time"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// GetTimerInput 获取定时任务详情输入
type GetTimerInput struct {
	UUID string
}

// TimerStatsOutput 定时任务统计输出
type TimerStatsOutput struct {
	TotalRuns   int64   `json:"total_runs"`
	SuccessRate float64 `json:"success_rate"`
	AvgDuration int64   `json:"avg_duration_ms"`
	LastStatus  string  `json:"last_status,omitempty"`
}

// GetTimerOutput 获取定时任务详情输出
type GetTimerOutput struct {
	UUID            string           `json:"uuid"`
	Name            string           `json:"name"`
	Description     string           `json:"description,omitempty"`
	CronExpr        string           `json:"cron_expr"`
	Timezone        string           `json:"timezone"`
	CallbackURL     string           `json:"callback_url"`
	CallbackMethod  string           `json:"callback_method"`
	CallbackHeaders string           `json:"callback_headers,omitempty"`
	CallbackBody    string           `json:"callback_body,omitempty"`
	Status          string           `json:"status"`
	LastRunAt       *time.Time       `json:"last_run_at,omitempty"`
	NextRunAt       *time.Time       `json:"next_run_at,omitempty"`
	Stats           TimerStatsOutput `json:"stats"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// GetTimerUseCase 获取定时任务详情用例接口
type GetTimerUseCase interface {
	Execute(ctx context.Context, input GetTimerInput) *result.Result[GetTimerOutput]
}

// getTimerUseCase 获取定时任务详情用例实现
type getTimerUseCase struct {
	timerRepo    repository.TimerRepository
	timerLogRepo repository.TimerLogRepository
}

// NewGetTimerUseCase 创建用例实例
func NewGetTimerUseCase(
	timerRepo repository.TimerRepository,
	timerLogRepo repository.TimerLogRepository,
) GetTimerUseCase {
	return &getTimerUseCase{
		timerRepo:    timerRepo,
		timerLogRepo: timerLogRepo,
	}
}

// Execute 执行获取定时任务详情
func (uc *getTimerUseCase) Execute(ctx context.Context, input GetTimerInput) *result.Result[GetTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[GetTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询定时任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[GetTimerOutput](err)
	}

	// 3. 查询统计信息
	stats := uc.calculateStats(ctx, input.UUID)

	// 4. 构建输出
	output := GetTimerOutput{
		UUID:            timer.UUID,
		Name:            timer.Name,
		Description:     timer.Description,
		CronExpr:        timer.CronExpr,
		Timezone:        timer.Timezone,
		CallbackURL:     timer.CallbackURL,
		CallbackMethod:  timer.CallbackMethod,
		CallbackHeaders: timer.CallbackHeaders,
		CallbackBody:    timer.CallbackBody,
		Status:          timer.Status,
		LastRunAt:       timer.LastRunAt,
		NextRunAt:       timer.NextRunAt,
		Stats:           stats,
		CreatedAt:       timer.CreatedAt,
		UpdatedAt:       timer.UpdatedAt,
	}

	// 5. 返回结果
	return result.NewSuccess(output)
}

// calculateStats 计算定时任务统计信息
func (uc *getTimerUseCase) calculateStats(ctx context.Context, timerUUID string) TimerStatsOutput {
	if uc.timerLogRepo == nil {
		return TimerStatsOutput{}
	}

	// 查询执行日志（最多1000条用于统计）
	logs, err := uc.timerLogRepo.ListByTimerUUID(ctx, timerUUID, repository.TimerLogFilter{
		Page:     1,
		PageSize: 1000,
	})
	if err != nil {
		return TimerStatsOutput{}
	}

	totalRuns := len(logs.Items)
	if totalRuns == 0 {
		return TimerStatsOutput{}
	}

	// 计算成功次数和平均耗时
	successCount := 0
	var totalDuration int64
	var lastStatus string

	for _, log := range logs.Items {
		if log.Status == models.TimerLogStatusSuccess {
			successCount++
		}
		totalDuration += log.Duration
		lastStatus = log.Status
	}

	successRate := float64(successCount) / float64(totalRuns) * 100
	avgDuration := totalDuration / int64(totalRuns)

	return TimerStatsOutput{
		TotalRuns:   int64(totalRuns),
		SuccessRate: successRate,
		AvgDuration: avgDuration,
		LastStatus:  lastStatus,
	}
}
