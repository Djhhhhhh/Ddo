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

// CreateTimerInput 创建定时任务输入
type CreateTimerInput struct {
	Name            string
	Description     string
	CronExpr        string
	Timezone        string
	CallbackURL     string
	CallbackMethod  string
	CallbackHeaders map[string]string
	CallbackBody    string
}

// CreateTimerOutput 创建定时任务输出
type CreateTimerOutput struct {
	UUID      string     `json:"uuid"`
	Name      string     `json:"name"`
	Status    string     `json:"status"`
	NextRunAt *time.Time `json:"next_run_at,omitempty"`
}

// CreateTimerUseCase 创建定时任务用例接口
type CreateTimerUseCase interface {
	Execute(ctx context.Context, input CreateTimerInput) *result.Result[CreateTimerOutput]
}

// createTimerUseCase 创建定时任务用例实现
type createTimerUseCase struct {
	timerRepo repository.TimerRepository
	scheduler *scheduler.Scheduler
}

// NewCreateTimerUseCase 创建用例实例
func NewCreateTimerUseCase(
	timerRepo repository.TimerRepository,
	scheduler *scheduler.Scheduler,
) CreateTimerUseCase {
	return &createTimerUseCase{
		timerRepo: timerRepo,
		scheduler: scheduler,
	}
}

// Execute 执行创建定时任务
func (uc *createTimerUseCase) Execute(ctx context.Context, input CreateTimerInput) *result.Result[CreateTimerOutput] {
	// 1. 参数验证
	if input.Name == "" {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("name is required"))
	}
	if input.CronExpr == "" {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("cron_expr is required"))
	}
	if input.CallbackURL == "" {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("callback_url is required"))
	}

	// 2. 验证 Cron 表达式
	schedule, err := cron.ParseStandard(input.CronExpr)
	if err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("invalid cron expression: %w", err))
	}

	// 3. 序列化 Headers
	headersJSON, err := json.Marshal(input.CallbackHeaders)
	if err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("marshal headers failed: %w", err))
	}

	// 4. 创建定时任务
	timer := &models.Timer{
		Name:            input.Name,
		Description:     input.Description,
		CronExpr:        input.CronExpr,
		Timezone:        input.Timezone,
		CallbackURL:     input.CallbackURL,
		CallbackMethod:  input.CallbackMethod,
		CallbackHeaders: string(headersJSON),
		CallbackBody:    input.CallbackBody,
		Status:          models.TimerStatusActive,
	}

	if err := uc.timerRepo.Create(ctx, timer); err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("create timer failed: %w", err))
	}

	// 5. 添加到调度器
	if uc.scheduler != nil {
		if err := uc.scheduler.AddJob(timer); err != nil {
			// 调度失败不阻止任务创建，只记录错误
			fmt.Printf("Failed to add timer to scheduler: %v\n", err)
		}
	}

	// 6. 计算下次执行时间
	loc := time.Local
	if timer.Timezone != "" && timer.Timezone != "Local" {
		if parsedLoc, err := time.LoadLocation(timer.Timezone); err == nil {
			loc = parsedLoc
		}
	}
	nextRun := schedule.Next(time.Now().In(loc))

	// 7. 返回结果
	return result.NewSuccess(CreateTimerOutput{
		UUID:      timer.UUID,
		Name:      timer.Name,
		Status:    timer.Status,
		NextRunAt: &nextRun,
	})
}
