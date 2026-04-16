package timer

import (
	"context"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// ListTimerInput 查询定时任务列表输入
type ListTimerInput struct {
	Status   string
	Page     int
	PageSize int
}

// TimerItemOutput 定时任务项输出
type TimerItemOutput struct {
	UUID       string `json:"uuid"`
	Name       string `json:"name"`
	Description string `json:"description,omitempty"`
	CronExpr   string `json:"cron_expr"`
	Timezone   string `json:"timezone"`
	Status     string `json:"status"`
	LastRunAt  string `json:"last_run_at,omitempty"`
	NextRunAt  string `json:"next_run_at,omitempty"`
}

// ListTimerOutput 查询定时任务列表输出
type ListTimerOutput struct {
	Total int64             `json:"total"`
	Items []TimerItemOutput `json:"items"`
}

// ListTimerUseCase 查询定时任务列表用例接口
type ListTimerUseCase interface {
	Execute(ctx context.Context, input ListTimerInput) *result.Result[ListTimerOutput]
}

// listTimerUseCase 查询定时任务列表用例实现
type listTimerUseCase struct {
	timerRepo repository.TimerRepository
}

// NewListTimerUseCase 创建用例实例
func NewListTimerUseCase(timerRepo repository.TimerRepository) ListTimerUseCase {
	return &listTimerUseCase{timerRepo: timerRepo}
}

// Execute 执行查询定时任务列表
func (uc *listTimerUseCase) Execute(ctx context.Context, input ListTimerInput) *result.Result[ListTimerOutput] {
	// 1. 查询列表
	filter := repository.TimerFilter{
		Status:   input.Status,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	result_iface, err := uc.timerRepo.List(ctx, filter)
	if err != nil {
		return result.NewFailure[ListTimerOutput](err)
	}

	// 2. 转换为输出格式
	items := make([]TimerItemOutput, 0, len(result_iface.Items))
	for _, timer := range result_iface.Items {
		item := TimerItemOutput{
			UUID:        timer.UUID,
			Name:        timer.Name,
			Description: timer.Description,
			CronExpr:    timer.CronExpr,
			Timezone:    timer.Timezone,
			Status:      timer.Status,
		}

		if timer.LastRunAt != nil {
			item.LastRunAt = timer.LastRunAt.Format("2006-01-02T15:04:05Z07:00")
		}
		if timer.NextRunAt != nil {
			item.NextRunAt = timer.NextRunAt.Format("2006-01-02T15:04:05Z07:00")
		}

		items = append(items, item)
	}

	// 3. 返回结果
	return result.NewSuccess(ListTimerOutput{
		Total: result_iface.Total,
		Items: items,
	})
}
