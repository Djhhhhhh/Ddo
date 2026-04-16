package timer

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/scheduler"
)

// ResumeTimerInput 恢复定时任务输入
type ResumeTimerInput struct {
	UUID string
}

// ResumeTimerOutput 恢复定时任务输出
type ResumeTimerOutput struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// ResumeTimerUseCase 恢复定时任务用例接口
type ResumeTimerUseCase interface {
	Execute(ctx context.Context, input ResumeTimerInput) *result.Result[ResumeTimerOutput]
}

// resumeTimerUseCase 恢复定时任务用例实现
type resumeTimerUseCase struct {
	timerRepo repository.TimerRepository
	scheduler *scheduler.Scheduler
}

// NewResumeTimerUseCase 创建用例实例
func NewResumeTimerUseCase(
	timerRepo repository.TimerRepository,
	scheduler *scheduler.Scheduler,
) ResumeTimerUseCase {
	return &resumeTimerUseCase{
		timerRepo: timerRepo,
		scheduler: scheduler,
	}
}

// Execute 执行恢复定时任务
func (uc *resumeTimerUseCase) Execute(ctx context.Context, input ResumeTimerInput) *result.Result[ResumeTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[ResumeTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询定时任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[ResumeTimerOutput](err)
	}

	// 3. 检查当前状态
	if timer.Status == models.TimerStatusDeleted {
		return result.NewFailure[ResumeTimerOutput](fmt.Errorf("timer has been deleted"))
	}
	if timer.Status == models.TimerStatusActive {
		return result.NewFailure[ResumeTimerOutput](fmt.Errorf("timer is already active"))
	}

	// 4. 更新状态
	if err := uc.timerRepo.UpdateStatus(ctx, timer.UUID, models.TimerStatusActive); err != nil {
		return result.NewFailure[ResumeTimerOutput](fmt.Errorf("update timer status failed: %w", err))
	}

	// 5. 重新添加到调度器
	if uc.scheduler != nil {
		// 重新加载完整的任务信息
		timer.Status = models.TimerStatusActive
		if err := uc.scheduler.AddJob(timer); err != nil {
			return result.NewFailure[ResumeTimerOutput](fmt.Errorf("failed to add timer to scheduler: %w", err))
		}
	}

	// 6. 返回结果
	return result.NewSuccess(ResumeTimerOutput{
		UUID:   timer.UUID,
		Status: models.TimerStatusActive,
	})
}
