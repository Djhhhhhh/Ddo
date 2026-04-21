package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/application/usecase/llm_stats"
)

// LLMStatsHandler LLM 统计处理器
type LLMStatsHandler struct {
	overviewUC         *llm_stats.GetOverviewUseCase
	trendUC            *llm_stats.GetTrendUseCase
	listConversationsUC *llm_stats.ListConversationsUseCase
}

// NewLLMStatsHandler 创建处理器
func NewLLMStatsHandler(llmPyURL string) *LLMStatsHandler {
	return &LLMStatsHandler{
		overviewUC:         llm_stats.NewGetOverviewUseCase(llmPyURL),
		trendUC:            llm_stats.NewGetTrendUseCase(llmPyURL),
		listConversationsUC: llm_stats.NewListConversationsUseCase(llmPyURL),
	}
}

// GetOverview 获取概览统计
// GET /api/v1/llm/stats/overview
func (h *LLMStatsHandler) GetOverview(c *gin.Context) {
	ctx := c.Request.Context()

	result := h.overviewUC.Execute(ctx)

	if result == nil || !result.IsSuccess() {
		errMsg := "获取统计失败"
		if result != nil && result.Error != nil {
			errMsg = errMsg + ": " + result.Error.Error()
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": errMsg,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    result.Data,
	})
}

// GetTrend 获取趋势数据
// GET /api/v1/llm/stats/trend
func (h *LLMStatsHandler) GetTrend(c *gin.Context) {
	ctx := c.Request.Context()

	// 解析参数
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	if days < 1 || days > 90 {
		days = 7
	}

	groupBy := c.DefaultQuery("group_by", "day")
	if groupBy != "day" && groupBy != "week" && groupBy != "month" {
		groupBy = "day"
	}

	req := llm_stats.TrendRequest{
		Days:    days,
		GroupBy: groupBy,
	}

	result := h.trendUC.Execute(ctx, req)

	if result == nil || !result.IsSuccess() {
		errMsg := "获取趋势失败"
		if result != nil && result.Error != nil {
			errMsg = errMsg + ": " + result.Error.Error()
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": errMsg,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    result.Data,
	})
}

// ListConversations 获取对话列表
// GET /api/v1/llm/conversations
func (h *LLMStatsHandler) ListConversations(c *gin.Context) {
	ctx := c.Request.Context()

	// 解析参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}

	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	req := llm_stats.ListRequest{
		Page:      page,
		PageSize:  pageSize,
		SessionID: c.Query("session_id"),
		Source:    c.Query("source"),
	}

	result := h.listConversationsUC.Execute(ctx, req)

	if result == nil || !result.IsSuccess() {
		errMsg := "获取对话列表失败"
		if result != nil && result.Error != nil {
			errMsg = errMsg + ": " + result.Error.Error()
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": errMsg,
		})
		return
	}

	// Ensure items is not nil
	data := result.Data
	if data.Items == nil {
		data.Items = []llm_stats.ConversationItem{}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "ok",
		"data":    data,
	})
}
