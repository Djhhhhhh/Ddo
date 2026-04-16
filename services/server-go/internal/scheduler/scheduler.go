package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/queue"
)

// Scheduler 定时任务调度器
// 基于 robfig/cron 实现 Cron 表达式调度
type Scheduler struct {
	cron      *cron.Cron
	queue     queue.Queue
	timerRepo repository.TimerRepository
	logger    *zap.Logger
	mu        sync.RWMutex
	entryIDs  map[string]cron.EntryID // timerUUID -> entryID
	running   bool
}

// TimerPayload 定时任务消息载荷
type TimerPayload struct {
	TimerUUID      string            `json:"timer_uuid"`
	Name           string            `json:"name"`
	CallbackURL    string            `json:"callback_url"`
	CallbackMethod string            `json:"callback_method"`
	CallbackHeaders string           `json:"callback_headers"`
	CallbackBody   string            `json:"callback_body"`
}

// NewScheduler 创建调度器
func NewScheduler(queue queue.Queue, timerRepo repository.TimerRepository, logger *zap.Logger) *Scheduler {
	return &Scheduler{
		queue:     queue,
		timerRepo: timerRepo,
		logger:    logger.With(zap.String("component", "scheduler")),
		entryIDs:  make(map[string]cron.EntryID),
	}
}

// Start 启动调度器
func (s *Scheduler) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("scheduler already running")
	}

	s.logger.Info("Starting scheduler...")

	// 创建 cron 调度器，使用本地时区作为默认
	loc := time.Local
	s.cron = cron.New(cron.WithLocation(loc), cron.WithSeconds())

	// 从数据库加载活跃任务
	if s.timerRepo != nil {
		timers, err := s.timerRepo.ListActive(ctx)
		if err != nil {
			s.logger.Error("Failed to load active timers", zap.Error(err))
		} else {
			s.logger.Info("Loading active timers", zap.Int("count", len(timers)))
			for _, timer := range timers {
				if err := s.addJobInternal(&timer); err != nil {
					s.logger.Error("Failed to add timer job",
						zap.String("uuid", timer.UUID),
						zap.Error(err),
					)
				}
			}
		}
	}

	// 启动 cron 调度
	s.cron.Start()
	s.running = true
	s.logger.Info("Scheduler started")

	return nil
}

// Stop 停止调度器
func (s *Scheduler) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return nil
	}

	s.logger.Info("Stopping scheduler...")

	// 停止 cron 调度
	ctx := s.cron.Stop()
	select {
	case <-ctx.Done():
		s.logger.Info("Scheduler stopped gracefully")
	case <-time.After(5 * time.Second):
		s.logger.Warn("Scheduler stop timeout")
	}

	s.running = false
	s.entryIDs = make(map[string]cron.EntryID)

	return nil
}

// AddJob 添加定时任务到调度器
func (s *Scheduler) AddJob(timer *models.Timer) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.addJobInternal(timer)
}

// addJobInternal 内部添加任务（调用前需要加锁）
func (s *Scheduler) addJobInternal(timer *models.Timer) error {
	if s.cron == nil {
		return fmt.Errorf("scheduler not started")
	}

	// 解析时区
	loc := time.Local
	if timer.Timezone != "" && timer.Timezone != "Local" {
		if parsedLoc, err := time.LoadLocation(timer.Timezone); err == nil {
			loc = parsedLoc
		} else {
			s.logger.Warn("Invalid timezone, using Local",
				zap.String("timezone", timer.Timezone),
				zap.Error(err),
			)
		}
	}

	// 创建带时区的 cron 调度
	schedule, err := cron.ParseStandard(timer.CronExpr)
	if err != nil {
		return fmt.Errorf("invalid cron expression %s: %w", timer.CronExpr, err)
	}

	// 包装任务函数，捕获 timer 信息
	timerCopy := *timer
	jobFunc := func() {
		s.triggerJob(&timerCopy)
	}

	// 使用 cron.WithLocation 来包装 schedule
	// 注意：robfig/cron v3 的 AddFunc 不支持按任务设置时区
	// 这里我们使用 Schedule 接口手动处理时区
	wrappedSchedule := &locationSchedule{
		Schedule: schedule,
		Location: loc,
	}

	entryID := s.cron.Schedule(wrappedSchedule, cron.FuncJob(jobFunc))

	s.entryIDs[timer.UUID] = entryID

	// 计算并更新下次执行时间
	nextRun := schedule.Next(time.Now().In(loc))
	s.updateNextRunTime(timer.UUID, nextRun)

	s.logger.Info("Timer job added",
		zap.String("uuid", timer.UUID),
		zap.String("name", timer.Name),
		zap.String("cron", timer.CronExpr),
		zap.Time("next_run", nextRun),
	)

	return nil
}

// RemoveJob 从调度器移除定时任务
func (s *Scheduler) RemoveJob(timerUUID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cron == nil {
		return fmt.Errorf("scheduler not started")
	}

	entryID, exists := s.entryIDs[timerUUID]
	if !exists {
		return fmt.Errorf("timer job not found: %s", timerUUID)
	}

	s.cron.Remove(entryID)
	delete(s.entryIDs, timerUUID)

	s.logger.Info("Timer job removed", zap.String("uuid", timerUUID))

	return nil
}

// triggerJob 触发任务执行
func (s *Scheduler) triggerJob(timer *models.Timer) {
	s.logger.Info("Triggering timer job",
		zap.String("uuid", timer.UUID),
		zap.String("name", timer.Name),
	)

	// 构造消息载荷
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
		s.logger.Error("Failed to marshal timer payload",
			zap.String("uuid", timer.UUID),
			zap.Error(err),
		)
		return
	}

	// 投递到消息队列
	ctx := context.Background()
	if err := s.queue.Publish(ctx, "timer", payloadBytes, 0, 0); err != nil {
		s.logger.Error("Failed to publish timer message",
			zap.String("uuid", timer.UUID),
			zap.Error(err),
		)
		return
	}

	s.logger.Info("Timer message published",
		zap.String("uuid", timer.UUID),
		zap.String("queue", "timer"),
	)

	// 更新最后执行时间和下次执行时间
	now := time.Now()
	s.updateLastRunTime(timer.UUID, now)
}

// updateLastRunTime 更新任务的最后一次执行时间
func (s *Scheduler) updateLastRunTime(timerUUID string, t time.Time) {
	if s.timerRepo == nil {
		return
	}

	ctx := context.Background()
	timer, err := s.timerRepo.GetByUUID(ctx, timerUUID)
	if err != nil {
		s.logger.Error("Failed to get timer for update",
			zap.String("uuid", timerUUID),
			zap.Error(err),
		)
		return
	}

	timer.LastRunAt = &t

	// 计算下次执行时间
	if entryID, exists := s.entryIDs[timerUUID]; exists {
		if entry := s.cron.Entry(entryID); entry.ID == entryID {
			nextRun := entry.Next
			timer.NextRunAt = &nextRun
		}
	}

	if err := s.timerRepo.Update(ctx, timer); err != nil {
		s.logger.Error("Failed to update timer last_run_at",
			zap.String("uuid", timerUUID),
			zap.Error(err),
		)
	}
}

// updateNextRunTime 更新任务的下次执行时间
func (s *Scheduler) updateNextRunTime(timerUUID string, nextRun time.Time) {
	if s.timerRepo == nil {
		return
	}

	ctx := context.Background()
	timer, err := s.timerRepo.GetByUUID(ctx, timerUUID)
	if err != nil {
		s.logger.Error("Failed to get timer for update",
			zap.String("uuid", timerUUID),
			zap.Error(err),
		)
		return
	}

	timer.NextRunAt = &nextRun

	if err := s.timerRepo.Update(ctx, timer); err != nil {
		s.logger.Error("Failed to update timer next_run_at",
			zap.String("uuid", timerUUID),
			zap.Error(err),
		)
	}
}

// locationSchedule 包装 schedule，支持时区转换
type locationSchedule struct {
	cron.Schedule
	Location *time.Location
}

// Next 返回下一个执行时间（转换到指定时区）
func (ls *locationSchedule) Next(t time.Time) time.Time {
	return ls.Schedule.Next(t.In(ls.Location))
}

// ValidateCron 验证 Cron 表达式是否有效
func ValidateCron(expr string) error {
	_, err := cron.ParseStandard(expr)
	return err
}
