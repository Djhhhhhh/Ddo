package scheduler

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/queue"
)

// Scheduler 定时任务调度器
// 基于 Cron 表达式调度任务，触发时投递到消息队列
type Scheduler struct {
	queue  queue.Queue
	logger *zap.Logger
	mu     sync.RWMutex
	jobs   map[string]*Job
	running bool
	stopCh  chan struct{}
}

// Job 调度任务
type Job struct {
	ID         string
	TimerUUID  string
	Name       string
	CronExpr   string
	Timezone   string
	Callback   CallbackConfig
	NextRunAt  *time.Time
	Status     string
}

// CallbackConfig 回调配置
type CallbackConfig struct {
	URL     string
	Method  string
	Headers map[string]string
	Body    string
}

// NewScheduler 创建调度器
func NewScheduler(queue queue.Queue, logger *zap.Logger) *Scheduler {
	return &Scheduler{
		queue:  queue,
		logger: logger.With(zap.String("component", "scheduler")),
		jobs:   make(map[string]*Job),
		stopCh: make(chan struct{}),
	}
}

// Start 启动调度器
func (s *Scheduler) Start() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("scheduler already running")
	}

	s.running = true
	s.logger.Info("Starting scheduler...")

	// TODO: 从数据库加载活跃任务
	// 1. 查询 models.Timer 状态为 active 的任务
	// 2. 注册到调度器
	// 3. 启动调度循环

	go s.scheduleLoop()

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
	s.running = false
	close(s.stopCh)

	return nil
}

// AddJob 添加调度任务
func (s *Scheduler) AddJob(timer *models.Timer) error {
	// TODO: 解析 Cron 表达式，注册任务
	return fmt.Errorf("not implemented")
}

// RemoveJob 移除调度任务
func (s *Scheduler) RemoveJob(timerUUID string) error {
	// TODO: 从调度器中移除任务
	return fmt.Errorf("not implemented")
}

// scheduleLoop 调度循环
// 定期检查任务是否到达执行时间
func (s *Scheduler) scheduleLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.checkAndTriggerJobs()
		}
	}
}

// checkAndTriggerJobs 检查并触发到期的任务
func (s *Scheduler) checkAndTriggerJobs() {
	now := time.Now()

	s.mu.RLock()
	jobs := make([]*Job, 0, len(s.jobs))
	for _, job := range s.jobs {
		jobs = append(jobs, job)
	}
	s.mu.RUnlock()

	for _, job := range jobs {
		if job.NextRunAt == nil || job.NextRunAt.After(now) {
			continue
		}

		// 触发任务：投递到队列
		s.triggerJob(job)
	}
}

// triggerJob 触发任务执行
func (s *Scheduler) triggerJob(job *Job) {
	s.logger.Info("Triggering job",
		zap.String("job_id", job.ID),
		zap.String("name", job.Name),
	)

	// TODO: 构造消息并投递到队列
	// payload, _ := json.Marshal(job.Callback)
	// s.queue.Publish(context.Background(), "timer", payload, 0, 0)

	// TODO: 更新下次执行时间
	// job.NextRunAt = calculateNextRun(job.CronExpr, job.Timezone)
}

// calculateNextRun 计算下次执行时间（预留接口）
// 需要使用 robfig/cron 解析 Cron 表达式
func calculateNextRun(cronExpr, timezone string) *time.Time {
	// TODO: 实现 Cron 解析
	return nil
}
