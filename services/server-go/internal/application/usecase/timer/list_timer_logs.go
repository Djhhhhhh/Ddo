package timer

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// ListTimerLogsInput 查询定时任务日志输入
type ListTimerLogsInput struct {
	TimerUUID string
	Status    string
	Page      int
	PageSize  int
}

// TimerLogItemOutput 定时任务日志项输出
type TimerLogItemOutput struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Output    string `json:"output,omitempty"`
	Error     string `json:"error,omitempty"`
	Duration  int64  `json:"duration"` // 毫秒
	CreatedAt string `json:"created_at"`
}

// ListTimerLogsOutput 查询定时任务日志输出
type ListTimerLogsOutput struct {
	Total int64                  `json:"total"`
	Items []TimerLogItemOutput   `json:"items"`
}

// ListTimerLogsUseCase 查询定时任务日志用例接口
type ListTimerLogsUseCase interface {
	Execute(ctx context.Context, input ListTimerLogsInput) *result.Result[ListTimerLogsOutput]
}

// listTimerLogsUseCase 查询定时任务日志用例实现
type listTimerLogsUseCase struct {
	timerLogRepo repository.TimerLogRepository
}

// NewListTimerLogsUseCase 创建用例实例
func NewListTimerLogsUseCase(timerLogRepo repository.TimerLogRepository) ListTimerLogsUseCase {
	return &listTimerLogsUseCase{timerLogRepo: timerLogRepo}
}

// Execute 执行查询定时任务日志
func (uc *listTimerLogsUseCase) Execute(ctx context.Context, input ListTimerLogsInput) *result.Result[ListTimerLogsOutput] {
	// 1. 参数验证
	if input.TimerUUID == "" {
		return result.NewFailure[ListTimerLogsOutput](fmt.Errorf("timer_uuid is required"))
	}

	// 2. 查询日志
	filter := repository.TimerLogFilter{
		Status:   input.Status,
		Page:     input.Page,
		PageSize: input.PageSize,
	}

	result_iface, err := uc.timerLogRepo.ListByTimerUUID(ctx, input.TimerUUID, filter)
	if err != nil {
		return result.NewFailure[ListTimerLogsOutput](err)
	}

	// 3. 转换为输出格式
	items := make([]TimerLogItemOutput, 0, len(result_iface.Items))
	for _, log := range result_iface.Items {
		item := TimerLogItemOutput{
			ID:        log.ID,
			Status:    log.Status,
			Output:    log.Output,
			Error:     log.Error,
			Duration:  log.Duration,
			CreatedAt: log.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		// 截断过长的输出
		if len(item.Output) > 1000 {
			item.Output = item.Output[:1000] + "... [truncated]"
		}
		items = append(items, item)
	}

	// 4. 返回结果
	return result.NewSuccess(ListTimerLogsOutput{
		Total: result_iface.Total,
		Items: items,
	})
}

// Stop 停止用例（实现 graceful shutdown）
func (uc *listTimerLogsUseCase) Stop() {
	// 无需清理资源
}
