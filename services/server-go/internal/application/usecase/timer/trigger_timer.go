package timer

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/queue"
)

// TriggerTimerInput 手动触发定时任务输入
type TriggerTimerInput struct {
	UUID string
}

// TriggerTimerOutput 手动触发定时任务输出
type TriggerTimerOutput struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// TriggerTimerUseCase 手动触发定时任务用例接口
type TriggerTimerUseCase interface {
	Execute(ctx context.Context, input TriggerTimerInput) *result.Result[TriggerTimerOutput]
}

// triggerTimerUseCase 手动触发定时任务用例实现
type triggerTimerUseCase struct {
	timerRepo repository.TimerRepository
	queue     queue.Queue
}

// NewTriggerTimerUseCase 创建用例实例
func NewTriggerTimerUseCase(
	timerRepo repository.TimerRepository,
	queue queue.Queue,
) TriggerTimerUseCase {
	return &triggerTimerUseCase{
		timerRepo: timerRepo,
		queue:     queue,
	}
}

// Execute 执行手动触发定时任务
func (uc *triggerTimerUseCase) Execute(ctx context.Context, input TriggerTimerInput) *result.Result[TriggerTimerOutput] {
	// 1. 参数验证
	if input.UUID == "" {
		return result.NewFailure[TriggerTimerOutput](fmt.Errorf("uuid is required"))
	}

	// 2. 查询定时任务
	timer, err := uc.timerRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[TriggerTimerOutput](err)
	}

	// 3. 检查任务状态（已删除的任务不能触发）
	if timer.Status == models.TimerStatusDeleted {
		return result.NewFailure[TriggerTimerOutput](fmt.Errorf("timer has been deleted"))
	}

	// 4. 构造消息载荷
	type TimerPayload struct {
		TimerUUID       string `json:"timer_uuid"`
		Name            string `json:"name"`
		CallbackURL     string `json:"callback_url"`
		CallbackMethod  string `json:"callback_method"`
		CallbackHeaders string `json:"callback_headers"`
		CallbackBody    string `json:"callback_body"`
	}

	payload := TimerPayload{
		TimerUUID:       timer.UUID,
		Name:            timer.Name,
		CallbackURL:     timer.CallbackURL,
		CallbackMethod:  timer.CallbackMethod,
		CallbackHeaders: timer.CallbackHeaders,
		CallbackBody:    timer.CallbackBody,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return result.NewFailure[TriggerTimerOutput](fmt.Errorf("marshal payload failed: %w", err))
	}

	// 5. 投递到消息队列
	if uc.queue != nil {
		if err := uc.queue.Publish(ctx, "timer", payloadBytes, 0, 0); err != nil {
			return result.NewFailure[TriggerTimerOutput](fmt.Errorf("publish message failed: %w", err))
		}
	} else {
		return result.NewFailure[TriggerTimerOutput](fmt.Errorf("queue not available"))
	}

	// 6. 返回结果
	return result.NewSuccess(TriggerTimerOutput{
		UUID:   timer.UUID,
		Status: "triggered",
	})
}
