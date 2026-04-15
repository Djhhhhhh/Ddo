package queue

import (
	"context"
	"time"
)

// Queue 消息队列接口
type Queue interface {
	// Publish 发布消息，delay 为 0 表示立即投递
	Publish(ctx context.Context, topic string, payload []byte, priority int, delay time.Duration) error

	// Subscribe 订阅指定 topics，handler 处理消息
	Subscribe(ctx context.Context, topic string, handler Handler) error

	// Unsubscribe 取消订阅
	Unsubscribe(topic string) error

	// Close 关闭队列连接
	Close() error

	// Stats 获取队列统计信息
	Stats() Stats
}

// Handler 消息处理函数
type Handler interface {
	// Handle 处理消息，返回错误会触发重试
	Handle(ctx context.Context, msg *Message) error
}

// HandlerFunc 消息处理函数类型
type HandlerFunc func(ctx context.Context, msg *Message) error

// Handle 实现 Handler 接口
func (f HandlerFunc) Handle(ctx context.Context, msg *Message) error {
	return f(ctx, msg)
}

// Message 消息结构
type Message struct {
	ID        string     `json:"id"`
	Topic     string     `json:"topic"`
	Payload   []byte     `json:"payload"`
	Priority  int        `json:"priority"`
	DelayAt   *time.Time `json:"delay_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	Attempts  int        `json:"attempts"`
}

// Stats 队列统计信息
type Stats struct {
	Topics []TopicStats `json:"topics"`
}

// TopicStats Topic 统计信息
type TopicStats struct {
	Topic    string `json:"topic"`
	Pending  int    `json:"pending"`
	Delayed  int    `json:"delayed"`
	Consumed int    `json:"consumed"`
	Failed   int    `json:"failed"`
}

// Config 队列配置
type Config struct {
	// DataDir 数据目录
	DataDir string
	// SyncWrites 是否同步写入（默认 true）
	SyncWrites bool
	// MaxRetries 最大重试次数（默认 3）
	MaxRetries int
	// RetryDelay 重试延迟（默认 5 秒）
	RetryDelay time.Duration
	// PollInterval 轮询间隔（默认 1 秒）
	PollInterval time.Duration
}

// DefaultConfig 返回默认配置
func DefaultConfig(dataDir string) *Config {
	return &Config{
		DataDir:      dataDir,
		SyncWrites:   true,
		MaxRetries:   3,
		RetryDelay:   5 * time.Second,
		PollInterval: 1 * time.Second,
	}
}
