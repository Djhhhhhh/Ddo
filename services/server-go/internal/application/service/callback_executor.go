package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/queue"
)

// CallbackExecutor 回调执行器
// 订阅定时任务队列消息，执行 HTTP 回调，记录执行日志
type CallbackExecutor struct {
	queue        queue.Queue
	timerLogRepo repository.TimerLogRepository
	logger       *zap.Logger
	httpClient   *http.Client
	ctx          context.Context
	cancel       context.CancelFunc
}

// TimerPayload 定时任务消息载荷
type TimerPayload struct {
	TimerUUID       string `json:"timer_uuid"`
	Name            string `json:"name"`
	CallbackURL     string `json:"callback_url"`
	CallbackMethod  string `json:"callback_method"`
	CallbackHeaders string `json:"callback_headers"`
	CallbackBody    string `json:"callback_body"`
}

// NewCallbackExecutor 创建回调执行器
func NewCallbackExecutor(
	queue queue.Queue,
	timerLogRepo repository.TimerLogRepository,
	logger *zap.Logger,
) *CallbackExecutor {
	ctx, cancel := context.WithCancel(context.Background())
	return &CallbackExecutor{
		queue:        queue,
		timerLogRepo: timerLogRepo,
		logger:       logger.With(zap.String("service", "callback_executor")),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		ctx:    ctx,
		cancel: cancel,
	}
}

// Start 启动回调执行器
func (e *CallbackExecutor) Start() {
	e.logger.Info("Starting callback executor...")

	// 创建消息处理器
	handler := queue.HandlerFunc(e.handleMessage)

	// 订阅 timer topic
	if err := e.queue.Subscribe(e.ctx, "timer", handler); err != nil {
		e.logger.Error("Failed to subscribe to timer topic", zap.Error(err))
		return
	}

	e.logger.Info("Callback executor started, subscribed to 'timer' topic")
}

// Stop 停止回调执行器
func (e *CallbackExecutor) Stop() {
	e.logger.Info("Stopping callback executor...")
	e.cancel()

	// 取消订阅
	if err := e.queue.Unsubscribe("timer"); err != nil {
		e.logger.Error("Failed to unsubscribe from timer topic", zap.Error(err))
	}

	e.logger.Info("Callback executor stopped")
}

// handleMessage 处理队列消息
func (e *CallbackExecutor) handleMessage(ctx context.Context, msg *queue.Message) error {
	e.logger.Debug("Received message",
		zap.String("id", msg.ID),
		zap.String("topic", msg.Topic),
	)

	// 解析消息
	var payload TimerPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		e.logger.Error("Failed to unmarshal timer payload", zap.Error(err))
		return fmt.Errorf("unmarshal payload failed: %w", err)
	}

	// 执行回调
	if err := e.executeCallback(ctx, &payload); err != nil {
		e.logger.Error("Execute callback failed",
			zap.String("timer_uuid", payload.TimerUUID),
			zap.Error(err),
		)
		return err
	}

	return nil
}

// ExecuteCallback 立即执行回调（供手动触发使用）
func (e *CallbackExecutor) ExecuteCallback(ctx context.Context, payload *TimerPayload) (*models.TimerLog, error) {
	log := e.executeCallbackWithLog(ctx, payload)
	return log, nil
}

// executeCallbackWithLog 执行 HTTP 回调并记录日志
func (e *CallbackExecutor) executeCallbackWithLog(ctx context.Context, payload *TimerPayload) *models.TimerLog {
	start := time.Now()

	log := &models.TimerLog{
		TimerUUID: payload.TimerUUID,
		Status:    models.TimerLogStatusSuccess,
	}

	// 解析 Headers
	var headers map[string]string
	if payload.CallbackHeaders != "" {
		if err := json.Unmarshal([]byte(payload.CallbackHeaders), &headers); err != nil {
			e.logger.Warn("Failed to parse callback headers",
				zap.String("timer_uuid", payload.TimerUUID),
				zap.Error(err),
			)
		}
	}

	// 构建请求
	method := payload.CallbackMethod
	if method == "" {
		method = "POST"
	}

	var bodyReader io.Reader
	if payload.CallbackBody != "" {
		bodyReader = bytes.NewBufferString(payload.CallbackBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, payload.CallbackURL, bodyReader)
	if err != nil {
		duration := time.Since(start).Milliseconds()
		log.Status = models.TimerLogStatusFailed
		log.Error = fmt.Sprintf("Failed to create request: %v", err)
		log.Duration = duration
		e.saveLog(log)
		return log
	}

	// 设置 Headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// 执行请求
	resp, err := e.httpClient.Do(req)
	duration := time.Since(start).Milliseconds()
	log.Duration = duration

	if err != nil {
		log.Status = models.TimerLogStatusFailed
		log.Error = fmt.Sprintf("HTTP request failed: %v", err)
		e.saveLog(log)
		return log
	}
	defer resp.Body.Close()

	// 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		e.logger.Warn("Failed to read response body",
			zap.String("timer_uuid", payload.TimerUUID),
			zap.Error(err),
		)
	}

	log.Output = string(respBody)

	// 检查响应状态
	if resp.StatusCode >= 400 {
		log.Status = models.TimerLogStatusFailed
		log.Error = fmt.Sprintf("HTTP error: %d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
	} else {
		log.Status = models.TimerLogStatusSuccess
	}

	e.saveLog(log)

	e.logger.Info("Callback executed",
		zap.String("timer_uuid", payload.TimerUUID),
		zap.String("url", payload.CallbackURL),
		zap.Int("status_code", resp.StatusCode),
		zap.Int64("duration_ms", duration),
	)

	return log
}

// executeCallback 执行 HTTP 回调并返回日志
func (e *CallbackExecutor) executeCallback(ctx context.Context, payload *TimerPayload) error {
	log := e.executeCallbackWithLog(ctx, payload)
	if log.Status == models.TimerLogStatusFailed {
		return fmt.Errorf("callback failed: %s", log.Error)
	}
	return nil
}

// saveLog 保存执行日志
func (e *CallbackExecutor) saveLog(log *models.TimerLog) {
	if e.timerLogRepo == nil {
		e.logger.Warn("TimerLogRepository not available, skipping log save")
		return
	}

	ctx := context.Background()
	if err := e.timerLogRepo.Create(ctx, log); err != nil {
		e.logger.Error("Failed to save timer log",
			zap.String("timer_uuid", log.TimerUUID),
			zap.Error(err),
		)
	}
}

// ManualTrigger 手动触发定时任务
// 直接执行回调，不通过队列
func (e *CallbackExecutor) ManualTrigger(timer *models.Timer) *models.TimerLog {
	ctx := context.Background()

	payload := &TimerPayload{
		TimerUUID:       timer.UUID,
		Name:            timer.Name,
		CallbackURL:     timer.CallbackURL,
		CallbackMethod:  timer.CallbackMethod,
		CallbackHeaders: timer.CallbackHeaders,
		CallbackBody:    timer.CallbackBody,
	}

	log := e.executeCallbackWithLog(ctx, payload)

	// 如果是手动触发，在输出中添加标记
	log.Output = "[Manual Trigger] " + log.Output

	return log
}
