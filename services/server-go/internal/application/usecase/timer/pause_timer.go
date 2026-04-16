package timer

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/scheduler"
)

// PauseTimerInput 暂停定时任务输入
type PauseTimerInput struct {
	UUID string
}

// PauseTimerOutput 暂停定时任务输出
type PauseTimerOutput struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// PauseTimerUseCase 暂停定时任务用例接口
type PauseTimerUseCase interface {
	Execute(ctx context.Context, input PauseTimerInput) *result.Result[PauseTimerOutput]
}

// pauseTimerUseCase 暂停定时任务用例实现
type pauseTimerUseCase struct {
	timerRepo repository.TimerRepository
	scheduler *scheduler.Scheduler
}

// NewPauseTimerUseCase 创建用例实例
func NewPauseTimerUseCase(
	timerRepo repository.TimerRepository,
	scheduler *scheduler.Scheduler,
) PauseTimerUseCase {
	return &pauseTimerUseCase{
		timerRepo: timerRepo,
		scheduler: scheduler,
	}
}

// Execute 执行暂停定时任务
func (uc *pauseTimerUseCase) Execute(ctx context.Context, input PauseTimerInput) *result.Result[PauseTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[PauseTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询定时任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[PauseTimerOutput](err)
	}

	// 3. 检查当前状态
	if timer.Status == models.TimerStatusDeleted {
		return result.NewFailure[PauseTimerOutput](fmt.Errorf("timer has been deleted"))
	}
	if timer.Status == models.TimerStatusPaused {
		return result.NewFailure[PauseTimerOutput](fmt.Errorf("timer is already paused"))
	}

	// 4. 更新状态
	if err := uc.timerRepo.UpdateStatus(ctx, timer.UUID, models.TimerStatusPaused); err != nil {
		return result.NewFailure[PauseTimerOutput](fmt.Errorf("update timer status failed: %w", err))
	}

	// 5. 从调度器移除
	if uc.scheduler != nil {
		if err := uc.scheduler.RemoveJob(timer.UUID); err != nil {
			// 移除失败不阻止暂停操作
			fmt.Printf("Failed to remove job from scheduler: %v\n", err)
		}
	}

	// 6. 返回结果
	return result.NewSuccess(PauseTimerOutput{
		UUID:   timer.UUID,
		Status: models.TimerStatusPaused,
	})
}
