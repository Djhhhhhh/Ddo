package timer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/robfig/cron/v3"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/scheduler"
)

// UpdateTimerInput 更新定时任务输入
type UpdateTimerInput struct {
	UUID            string
	Name            string
	Description     string
	TriggerType     string
	CronExpr        string
	IntervalSeconds int64
	DelaySeconds    int64
	Timezone        string
	CallbackURL     string
	CallbackMethod  string
	CallbackHeaders map[string]string
	CallbackBody    string
}

// UpdateTimerOutput 更新定时任务输出
type UpdateTimerOutput struct {
	UUID   string `json:"uuid"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

// UpdateTimerUseCase 更新定时任务用例接口
type UpdateTimerUseCase interface {
	Execute(ctx context.Context, input UpdateTimerInput) *result.Result[UpdateTimerOutput]
}

// updateTimerUseCase 更新定时任务用例实现
type updateTimerUseCase struct {
	timerRepo repository.TimerRepository
	scheduler *scheduler.Scheduler
}

// NewUpdateTimerUseCase 创建用例实例
func NewUpdateTimerUseCase(
	timerRepo repository.TimerRepository,
	scheduler *scheduler.Scheduler,
) UpdateTimerUseCase {
	return &updateTimerUseCase{
		timerRepo: timerRepo,
		scheduler: scheduler,
	}
}

// Execute 执行更新定时任务
func (uc *updateTimerUseCase) Execute(ctx context.Context, input UpdateTimerInput) *result.Result[UpdateTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[UpdateTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询现有任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[UpdateTimerOutput](err)
	}

	// 3. 检查任务是否可以更新
	if timer.Status == models.TimerStatusDeleted {
		return result.NewFailure[UpdateTimerOutput](fmt.Errorf("timer has been deleted"))
	}

	// 4. 更新字段
	needReschedule := false

	if input.Name != "" {
		timer.Name = input.Name
	}
	if input.Description != "" || input.Description != timer.Description {
		timer.Description = input.Description
	}
	if input.TriggerType != "" && input.TriggerType != timer.TriggerType {
		timer.TriggerType = input.TriggerType
		needReschedule = true
	}
	if input.CronExpr != "" && input.CronExpr != timer.CronExpr {
		// 验证新的 Cron 表达式
		if err := scheduler.ValidateCron(input.CronExpr); err != nil {
			return result.NewFailure[UpdateTimerOutput](fmt.Errorf("invalid cron expression: %w", err))
		}
		timer.CronExpr = input.CronExpr
		needReschedule = true
	}
	if input.IntervalSeconds > 0 && input.IntervalSeconds != timer.IntervalSeconds {
		timer.IntervalSeconds = input.IntervalSeconds
		needReschedule = true
	}
	if input.DelaySeconds > 0 && input.DelaySeconds != timer.DelaySeconds {
		timer.DelaySeconds = input.DelaySeconds
		needReschedule = true
	}
	if input.Timezone != "" && input.Timezone != timer.Timezone {
		timer.Timezone = input.Timezone
		needReschedule = true
	}
	if input.CallbackURL != "" {
		timer.CallbackURL = input.CallbackURL
	}
	if input.CallbackMethod != "" {
		timer.CallbackMethod = input.CallbackMethod
	}
	if input.CallbackHeaders != nil {
		headersJSON, err := json.Marshal(input.CallbackHeaders)
		if err != nil {
			return result.NewFailure[UpdateTimerOutput](fmt.Errorf("marshal headers failed: %w", err))
		}
		timer.CallbackHeaders = string(headersJSON)
	}
	if input.CallbackBody != "" {
		timer.CallbackBody = input.CallbackBody
	}

	// 5. 如果需要重新调度，先计算下次执行时间
	if needReschedule && timer.Status == models.TimerStatusActive {
		loc := time.Local
		if timer.Timezone != "" && timer.Timezone != "Local" {
			if parsedLoc, err := time.LoadLocation(timer.Timezone); err == nil {
				loc = parsedLoc
			}
		}

		var nextRun time.Time
		switch timer.TriggerType {
		case TriggerTypeCron:
			if timer.CronExpr != "" {
				schedule, _ := cron.ParseStandard(timer.CronExpr)
				nextRun = schedule.Next(time.Now().In(loc))
			}
		case TriggerTypePeriodic:
			nextRun = time.Now().Add(time.Duration(timer.IntervalSeconds) * time.Second)
		case TriggerTypeDelayed:
			nextRun = time.Now().Add(time.Duration(timer.DelaySeconds) * time.Second)
		}
		timer.NextRunAt = &nextRun
	}

	// 6. 保存更新
	if err := uc.timerRepo.Update(ctx, timer); err != nil {
		return result.NewFailure[UpdateTimerOutput](fmt.Errorf("update timer failed: %w", err))
	}

	// 7. 如果需要重新调度
	if needReschedule && timer.Status == models.TimerStatusActive && uc.scheduler != nil {
		uc.scheduler.RemoveJob(timer.UUID)
		if err := uc.scheduler.AddJob(timer); err != nil {
			fmt.Printf("Failed to reschedule timer: %v\n", err)
		}
	}

	// 8. 返回结果
	return result.NewSuccess(UpdateTimerOutput{
		UUID:   timer.UUID,
		Name:   timer.Name,
		Status: timer.Status,
	})
}
