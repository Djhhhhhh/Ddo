package timer

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/scheduler"
)

// DeleteTimerInput 删除定时任务输入
type DeleteTimerInput struct {
	UUID string
}

// DeleteTimerOutput 删除定时任务输出
type DeleteTimerOutput struct {
	Success bool `json:"success"`
}

// DeleteTimerUseCase 删除定时任务用例接口
type DeleteTimerUseCase interface {
	Execute(ctx context.Context, input DeleteTimerInput) *result.Result[DeleteTimerOutput]
}

// deleteTimerUseCase 删除定时任务用例实现
type deleteTimerUseCase struct {
	timerRepo repository.TimerRepository
	scheduler *scheduler.Scheduler
}

// NewDeleteTimerUseCase 创建用例实例
func NewDeleteTimerUseCase(
	timerRepo repository.TimerRepository,
	scheduler *scheduler.Scheduler,
) DeleteTimerUseCase {
	return &deleteTimerUseCase{
		timerRepo: timerRepo,
		scheduler: scheduler,
	}
}

// Execute 执行删除定时任务
func (uc *deleteTimerUseCase) Execute(ctx context.Context, input DeleteTimerInput) *result.Result[DeleteTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[DeleteTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询定时任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[DeleteTimerOutput](err)
	}

	// 3. 从调度器移除（状态为 active 或 paused 都需要移除）
	if uc.scheduler != nil {
		if err := uc.scheduler.RemoveJob(timer.UUID); err != nil {
			// 移除失败继续删除操作
			fmt.Printf("Failed to remove job from scheduler: %v\n", err)
		}
	}

	// 4. 软删除（更新状态为 deleted）
	if err := uc.timerRepo.Delete(ctx, timer.UUID); err != nil {
		return result.NewFailure[DeleteTimerOutput](fmt.Errorf("delete timer failed: %w", err))
	}

	// 5. 返回结果
	return result.NewSuccess(DeleteTimerOutput{
		Success: true,
	})
}
