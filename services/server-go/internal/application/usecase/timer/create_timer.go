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

// TriggerType 触发类型常量
const (
	TriggerTypeCron     = "cron"     // Cron 表达式调度
	TriggerTypePeriodic = "periodic" // 固定间隔重复触发
	TriggerTypeDelayed  = "delayed"  // 延迟一次性触发
)

// CreateTimerInput 创建定时任务输入
type CreateTimerInput struct {
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
	NotifyConfig    *models.TimerNotifyConfig
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
	if input.TriggerType == "" {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("trigger_type is required"))
	}
	// 2. 根据 TriggerType 验证特定参数
	var timer *models.Timer
	var nextRun *time.Time

	switch input.TriggerType {
	case TriggerTypeCron:
		if input.CronExpr == "" {
			return result.NewFailure[CreateTimerOutput](fmt.Errorf("cron_expr is required for cron trigger"))
		}
		schedule, err := cron.ParseStandard(input.CronExpr)
		if err != nil {
			return result.NewFailure[CreateTimerOutput](fmt.Errorf("invalid cron expression: %w", err))
		}
		loc := time.Local
		if input.Timezone != "" && input.Timezone != "Local" {
			if parsedLoc, err := time.LoadLocation(input.Timezone); err == nil {
				loc = parsedLoc
			}
		}
		nextRunVal := schedule.Next(time.Now().In(loc))
		nextRun = &nextRunVal

		timer = &models.Timer{
			Name:            input.Name,
			Description:     input.Description,
			TriggerType:     input.TriggerType,
			CronExpr:        input.CronExpr,
			Timezone:        input.Timezone,
			CallbackURL:     input.CallbackURL,
			CallbackMethod:  input.CallbackMethod,
			Status:          models.TimerStatusActive,
		}

	case TriggerTypePeriodic:
		if input.IntervalSeconds <= 0 {
			return result.NewFailure[CreateTimerOutput](fmt.Errorf("interval_seconds must be greater than 0"))
		}
		// 计算下次执行时间：当前时间 + 间隔
		nextRunVal := time.Now().Add(time.Duration(input.IntervalSeconds) * time.Second)
		nextRun = &nextRunVal

		timer = &models.Timer{
			Name:            input.Name,
			Description:     input.Description,
			TriggerType:     input.TriggerType,
			IntervalSeconds: input.IntervalSeconds,
			Timezone:        input.Timezone,
			CallbackURL:     input.CallbackURL,
			CallbackMethod:  input.CallbackMethod,
			Status:          models.TimerStatusActive,
		}

	case TriggerTypeDelayed:
		if input.DelaySeconds <= 0 {
			return result.NewFailure[CreateTimerOutput](fmt.Errorf("delay_seconds must be greater than 0"))
		}
		// 计算延迟触发时间
		triggerAt := time.Now().Add(time.Duration(input.DelaySeconds) * time.Second)
		nextRun = &triggerAt

		timer = &models.Timer{
			Name:            input.Name,
			Description:     input.Description,
			TriggerType:     input.TriggerType,
			DelaySeconds:    input.DelaySeconds,
			Timezone:        input.Timezone,
			CallbackURL:     input.CallbackURL,
			CallbackMethod:  input.CallbackMethod,
			Status:          models.TimerStatusActive,
		}

	default:
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("invalid trigger_type: %s", input.TriggerType))
	}

	// 3. 序列化 Headers
	headersJSON, err := json.Marshal(input.CallbackHeaders)
	if err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("marshal headers failed: %w", err))
	}
	timer.CallbackHeaders = string(headersJSON)
	timer.CallbackBody = input.CallbackBody

	notifyConfigJSON, err := models.EncodeTimerNotifyConfig(input.NotifyConfig)
	if err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("marshal notify config failed: %w", err))
	}
	timer.NotifyConfig = notifyConfigJSON

	// 4. 创建定时任务
	if err := uc.timerRepo.Create(ctx, timer); err != nil {
		return result.NewFailure[CreateTimerOutput](fmt.Errorf("create timer failed: %w", err))
	}

	// 5. 添加到调度器
	if uc.scheduler != nil {
		if err := uc.scheduler.AddJob(timer); err != nil {
			fmt.Printf("Failed to add timer to scheduler: %v\n", err)
		}
	}

	// 6. 返回结果
	return result.NewSuccess(CreateTimerOutput{
		UUID:      timer.UUID,
		Name:      timer.Name,
		Status:    timer.Status,
		NextRunAt: nextRun,
	})
}
