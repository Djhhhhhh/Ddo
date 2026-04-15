package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dgraph-io/badger/v4"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// BadgerQueue BadgerDB 实现的队列
type BadgerQueue struct {
	db     *badger.DB
	config *Config
	logger *zap.Logger

	// 订阅管理
	subscribers map[string][]subscription
	mu          sync.RWMutex

	// 运行状态
	started bool
	closed  bool
	done    chan struct{}
}

// subscription 订阅信息
type subscription struct {
	handler Handler
	ctx     context.Context
	cancel  context.CancelFunc
}

// key prefixes for different data types
const (
	keyPrefixDelayed  = "delayed:"   // delayed:{timestamp}:{uuid} -> Message
	keyPrefixPending  = "pending:"   // pending:{topic}:{priority}:{uuid} -> Message
	keyPrefixProcessing = "processing:" // processing:{uuid} -> Message with lease
	keyPrefixMeta     = "meta:"      // meta:topics -> []string, meta:stats:{topic} -> Stats
)

// NewBadgerQueue 创建 BadgerDB 队列
func NewBadgerQueue(config *Config, logger *zap.Logger) (*BadgerQueue, func(), error) {
	if config == nil {
		config = DefaultConfig(filepath.Join(os.Getenv("HOME"), ".ddo", "data", "badger", "queue"))
	}

	// 创建数据目录
	if err := os.MkdirAll(config.DataDir, 0755); err != nil {
		return nil, nil, fmt.Errorf("create queue data dir failed: %w", err)
	}

	// BadgerDB 选项
	options := badger.DefaultOptions(config.DataDir).
		WithSyncWrites(config.SyncWrites).
		WithLogger(nil) // 使用 zap 日志

	// 打开数据库
	db, err := badger.Open(options)
	if err != nil {
		return nil, nil, fmt.Errorf("open badger db failed: %w", err)
	}

	q := &BadgerQueue{
		db:          db,
		config:      config,
		logger:      logger.With(zap.String("component", "queue")),
		subscribers: make(map[string][]subscription),
		done:        make(chan struct{}),
	}

	// 启动后台调度器
	q.started = true
	go q.schedulerLoop()

	cleanup := func() {
		_ = q.Close()
	}

	logger.Info("BadgerDB queue initialized",
		zap.String("data_dir", config.DataDir),
	)

	return q, cleanup, nil
}

// Publish 发布消息
func (q *BadgerQueue) Publish(ctx context.Context, topic string, payload []byte, priority int, delay time.Duration) error {
	if q.isClosed() {
		return fmt.Errorf("queue is closed")
	}

	msg := &Message{
		ID:        uuid.New().String(),
		Topic:     topic,
		Payload:   payload,
		Priority:  priority,
		CreatedAt: time.Now(),
		Attempts:  0,
	}

	if delay > 0 {
		delayAt := time.Now().Add(delay)
		msg.DelayAt = &delayAt
	}

	// 序列化消息
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message failed: %w", err)
	}

	// 存储消息
	key := q.buildMessageKey(msg)

	err = q.db.Update(func(txn *badger.Txn) error {
		return txn.Set(key, data)
	})
	if err != nil {
		return fmt.Errorf("store message failed: %w", err)
	}

	q.logger.Debug("Message published",
		zap.String("id", msg.ID),
		zap.String("topic", topic),
		zap.Duration("delay", delay),
	)

	return nil
}

// Subscribe 订阅 Topic
func (q *BadgerQueue) Subscribe(ctx context.Context, topic string, handler Handler) error {
	if q.isClosed() {
		return fmt.Errorf("queue is closed")
	}

	q.mu.Lock()
	defer q.mu.Unlock()

	ctx, cancel := context.WithCancel(ctx)
	sub := subscription{
		handler: handler,
		ctx:     ctx,
		cancel:  cancel,
	}

	q.subscribers[topic] = append(q.subscribers[topic], sub)

	// 启动消费者 goroutine
	go q.consumerLoop(topic, &sub)

	q.logger.Info("Subscribed to topic",
		zap.String("topic", topic),
	)

	return nil
}

// Unsubscribe 取消订阅
func (q *BadgerQueue) Unsubscribe(topic string) error {
	q.mu.Lock()
	defer q.mu.Unlock()

	subs, ok := q.subscribers[topic]
	if !ok {
		return nil
	}

	// 取消所有订阅
	for _, sub := range subs {
		sub.cancel()
	}

	delete(q.subscribers, topic)

	q.logger.Info("Unsubscribed from topic",
		zap.String("topic", topic),
	)

	return nil
}

// Close 关闭队列
func (q *BadgerQueue) Close() error {
	q.mu.Lock()
	if q.closed {
		q.mu.Unlock()
		return nil
	}
	q.closed = true
	q.started = false
	q.mu.Unlock()

	// 关闭 done channel 通知 scheduler 退出
	close(q.done)

	// 取消所有订阅
	for topic, subs := range q.subscribers {
		for _, sub := range subs {
			sub.cancel()
		}
		q.logger.Info("Cancelled subscribers", zap.String("topic", topic))
	}

	// 关闭数据库
	if err := q.db.Close(); err != nil {
		return fmt.Errorf("close badger db failed: %w", err)
	}

	q.logger.Info("BadgerDB queue closed")
	return nil
}

// Stats 获取队列统计信息
func (q *BadgerQueue) Stats() Stats {
	q.mu.RLock()
	defer q.mu.RUnlock()

	stats := Stats{
		Topics: make([]TopicStats, 0, len(q.subscribers)),
	}

	for topic := range q.subscribers {
		q.db.View(func(txn *badger.Txn) error {
			ts := TopicStats{Topic: topic}

			// 统计 pending 消息
			prefix := []byte(keyPrefixPending + topic + ":")
			iter := txn.NewIterator(badger.DefaultIteratorOptions)
			defer iter.Close()
			for iter.Seek(prefix); iter.ValidForPrefix(prefix); iter.Next() {
				ts.Pending++
			}

			// 统计 delayed 消息
			prefixDelayed := []byte(keyPrefixDelayed)
			iter2 := txn.NewIterator(badger.DefaultIteratorOptions)
			defer iter2.Close()
			for iter2.Seek(prefixDelayed); iter2.ValidForPrefix(prefixDelayed); iter2.Next() {
				item := iter2.Item()
				val, err := item.ValueCopy(nil)
				if err == nil {
					var msg Message
					if err := json.Unmarshal(val, &msg); err == nil && msg.Topic == topic && msg.DelayAt != nil && msg.DelayAt.After(time.Now()) {
						ts.Delayed++
					}
				}
			}

			stats.Topics = append(stats.Topics, ts)
			return nil
		})
	}

	return stats
}

// buildMessageKey 根据消息构建存储 key
func (q *BadgerQueue) buildMessageKey(msg *Message) []byte {
	if msg.DelayAt != nil && msg.DelayAt.After(time.Now()) {
		// 延时消息: delayed:{unix_timestamp}:{uuid}
		timestamp := msg.DelayAt.Unix()
		return []byte(fmt.Sprintf("%s%d:%s", keyPrefixDelayed, timestamp, msg.ID))
	}
	// 立即消息: pending:{topic}:{priority}:{uuid}
	return []byte(fmt.Sprintf("%s%s:%d:%s", keyPrefixPending, msg.Topic, msg.Priority, msg.ID))
}

// schedulerLoop 调度器循环
// 扫描延时消息，到期的移动到 pending 队列
func (q *BadgerQueue) schedulerLoop() {
	ticker := time.NewTicker(q.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-q.done:
			return
		case <-ticker.C:
			q.processDelayedMessages()
		}
	}
}

// processDelayedMessages 处理延时消息
func (q *BadgerQueue) processDelayedMessages() {
	now := time.Now()
	nowUnix := now.Unix()

	err := q.db.Update(func(txn *badger.Txn) error {
		iter := txn.NewIterator(badger.DefaultIteratorOptions)
		defer iter.Close()

		prefix := []byte(keyPrefixDelayed)
		for iter.Seek(prefix); iter.ValidForPrefix(prefix); iter.Next() {
			item := iter.Item()
			key := item.KeyCopy(nil)

			// 解析 key: delayed:{timestamp}:{uuid}
			parts := strings.Split(string(key), ":")
			if len(parts) != 3 {
				continue
			}

			timestamp, err := strconv.ParseInt(parts[1], 10, 64)
			if err != nil {
				continue
			}

			// 如果消息还未到执行时间，跳过
			if timestamp > nowUnix {
				continue
			}

			// 读取消息
			val, err := item.ValueCopy(nil)
			if err != nil {
				continue
			}

			var msg Message
			if err := json.Unmarshal(val, &msg); err != nil {
				continue
			}

			// 移动到 pending 队列
			msg.DelayAt = nil
			newData, _ := json.Marshal(msg)
			newKey := []byte(fmt.Sprintf("%s%s:%d:%s", keyPrefixPending, msg.Topic, msg.Priority, msg.ID))

			// 写入新 key，删除旧 key
			if err := txn.Set(newKey, newData); err != nil {
				continue
			}
			if err := txn.Delete(key); err != nil {
				continue
			}

			q.logger.Debug("Moved delayed message to pending",
				zap.String("id", msg.ID),
				zap.String("topic", msg.Topic),
			)
		}
		return nil
	})

	if err != nil {
		q.logger.Error("Failed to process delayed messages", zap.Error(err))
	}
}

// consumerLoop 消费者循环
func (q *BadgerQueue) consumerLoop(topic string, sub *subscription) {
	ticker := time.NewTicker(q.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-sub.ctx.Done():
			return
		case <-q.done:
			return
		case <-ticker.C:
			q.processPendingMessages(topic, sub)
		}
	}
}

// processPendingMessages 处理待处理消息
func (q *BadgerQueue) processPendingMessages(topic string, sub *subscription) {
	// 查找最高优先级的消息
	prefix := []byte(fmt.Sprintf("%s%s:", keyPrefixPending, topic))

	err := q.db.Update(func(txn *badger.Txn) error {
		iter := txn.NewIterator(badger.IteratorOptions{
			PrefetchValues: true,
			PrefetchSize:   1,
			Reverse:        false, // 从小到大，优先级数字小者优先
		})
		defer iter.Close()

		for iter.Seek(prefix); iter.ValidForPrefix(prefix); iter.Next() {
			item := iter.Item()
			key := item.KeyCopy(nil)

			// 读取消息
			val, err := item.ValueCopy(nil)
			if err != nil {
				continue
			}

			var msg Message
			if err := json.Unmarshal(val, &msg); err != nil {
				continue
			}

			// 删除消息（消费）
			if err := txn.Delete(key); err != nil {
				continue
			}

			// 调用 handler
			msg.Attempts++
			handlerErr := sub.handler.Handle(sub.ctx, &msg)

			if handlerErr != nil {
				q.logger.Error("Message handler failed",
					zap.String("id", msg.ID),
					zap.String("topic", topic),
					zap.Error(handlerErr),
					zap.Int("attempts", msg.Attempts),
				)

				// 重试逻辑
				if msg.Attempts < q.config.MaxRetries {
					// 重新投递，延时重试
					delayAt := time.Now().Add(q.config.RetryDelay)
					msg.DelayAt = &delayAt
					newData, _ := json.Marshal(msg)
					newKey := q.buildMessageKey(&msg)
					_ = txn.Set(newKey, newData)
				} else {
					// 超过最大重试次数，记录死信
					q.logger.Warn("Message exceeded max retries",
						zap.String("id", msg.ID),
						zap.String("topic", topic),
					)
				}
			} else {
				q.logger.Debug("Message consumed successfully",
					zap.String("id", msg.ID),
					zap.String("topic", topic),
				)
			}

			// 每次只处理一条消息
			break
		}
		return nil
	})

	if err != nil {
		q.logger.Error("Failed to process pending messages",
			zap.String("topic", topic),
			zap.Error(err),
		)
	}
}

// isClosed 检查队列是否已关闭
func (q *BadgerQueue) isClosed() bool {
	q.mu.RLock()
	defer q.mu.RUnlock()
	return q.closed
}
