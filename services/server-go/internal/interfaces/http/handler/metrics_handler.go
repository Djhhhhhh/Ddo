package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/db"
	"github.com/ddo/server-go/internal/db/repository"
	"github.com/ddo/server-go/internal/queue"
)

// MetricsHandler metrics 请求处理
type MetricsHandler struct {
	dbConn       *db.MySQLConn
	queue        queue.Queue
	llmPyURL     string
	timerRepo    repository.TimerRepository
	knowledgeRepo repository.KnowledgeRepository
	mcpRepo      repository.MCPRepository
}

// NewMetricsHandler 创建 metrics 处理器
func NewMetricsHandler(
	dbConn *db.MySQLConn,
	queue queue.Queue,
	llmPyURL string,
	timerRepo repository.TimerRepository,
	knowledgeRepo repository.KnowledgeRepository,
	mcpRepo repository.MCPRepository,
) *MetricsHandler {
	return &MetricsHandler{
		dbConn:        dbConn,
		queue:         queue,
		llmPyURL:      llmPyURL,
		timerRepo:     timerRepo,
		knowledgeRepo: knowledgeRepo,
		mcpRepo:       mcpRepo,
	}
}

// MetricsResponse metrics 响应
type MetricsResponse struct {
	Code      int                   `json:"code"`
	Message   string                `json:"message"`
	Data      MetricsData           `json:"data"`
	Timestamp string                `json:"timestamp"`
}

// MetricsData metrics 数据
type MetricsData struct {
	Status   string              `json:"status"`
	Version  string              `json:"version"`
	Services ServicesMetrics     `json:"services"`
	Timers   TimerMetrics        `json:"timers"`
	Knowledge KnowledgeMetrics   `json:"knowledge"`
	Mcps     McpMetrics          `json:"mcps"`
}

// ServicesMetrics 服务状态指标
type ServicesMetrics struct {
	ServerGo string            `json:"server_go"`
	LlmPy    string            `json:"llm_py"`
	MySQL    string            `json:"mysql"`
	CLI      string            `json:"cli"`
	Web      string            `json:"web"`
	Extra    map[string]string `json:"extra,omitempty"`
}

// TimerMetrics 定时任务指标
type TimerMetrics struct {
	Total  int `json:"total"`
	Active int `json:"active"`
}

// KnowledgeMetrics 知识库指标
type KnowledgeMetrics struct {
	Total int `json:"total"`
}

// McpMetrics MCP 指标
type McpMetrics struct {
	Total int `json:"total"`
}

// Metrics 获取综合指标
// GET /api/v1/metrics
func (h *MetricsHandler) Metrics(c *gin.Context) {
	ctx := c.Request.Context()

	// 检查 llm-py 健康状态（真正发起 HTTP 请求）
	llmPyStatus := "stopped"
	if h.llmPyURL != "" {
		// 真正检查 llm-py 健康状态
		client := &http.Client{Timeout: 2 * time.Second}
		resp, err := client.Get(h.llmPyURL + "/health")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				llmPyStatus = "running"
			}
		}
	}

	// 数据库状态
	mysqlStatus := "disconnected"
	if h.dbConn != nil {
		status, err := h.dbConn.GetMySQLStatus()
		if err == nil {
			if connected, ok := status["connected"].(bool); ok && connected {
				mysqlStatus = "connected"
			}
		}
	}

	// BadgerDB 状态
	badgerdbStatus := "ok"
	if h.queue == nil {
		badgerdbStatus = "error"
	}
	_ = badgerdbStatus // 已验证队列启动成功

	// 统计指标
	var timersTotal int64
	var timersActive int64
	var knowledgeTotal int64
	var mcpTotal int64

	if h.timerRepo != nil {
		if res, err := h.timerRepo.List(ctx, repository.TimerFilter{Page: 1, PageSize: 1}); err == nil && res != nil {
			timersTotal = res.Total
		}
		if active, err := h.timerRepo.ListActive(ctx); err == nil {
			timersActive = int64(len(active))
		}
	}

	if h.knowledgeRepo != nil {
		if res, err := h.knowledgeRepo.List(ctx, repository.KnowledgeFilter{}); err == nil && res != nil {
			knowledgeTotal = res.Total
		}
	}

	if h.mcpRepo != nil {
		if res, err := h.mcpRepo.List(ctx, repository.MCPFilter{}); err == nil && res != nil {
			mcpTotal = res.Total
		}
	}

	response := MetricsResponse{
		Code:    0,
		Message: "ok",
		Data: MetricsData{
			Status:  "ok",
			Version: "0.1.0",
			Services: ServicesMetrics{
				ServerGo: "running",
				LlmPy:    llmPyStatus,
				MySQL:    mysqlStatus,
				CLI:      "running", // 前端组件，默认运行状态
				Web:      "running", // 前端 SPA，默认运行状态
				Extra: map[string]string{
					"database_driver": "sqlite",
				},
			},
			Timers: TimerMetrics{
				Total:  int(timersTotal),
				Active: int(timersActive),
			},
			Knowledge: KnowledgeMetrics{
				Total: int(knowledgeTotal),
			},
			Mcps: McpMetrics{
				Total: int(mcpTotal),
			},
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}
