package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/application/service"
)

// ConversationHandler 统一对话处理器
type ConversationHandler struct {
	conversationSvc service.ConversationService
}

// NewConversationHandler 创建对话处理器
func NewConversationHandler(conversationSvc service.ConversationService) *ConversationHandler {
	return &ConversationHandler{
		conversationSvc: conversationSvc,
	}
}

// ChatRequest 对话请求
type ChatRequest struct {
	Query          string `json:"query" binding:"required"`
	ConversationID string `json:"conversation_id,omitempty"`
	Model          string `json:"model,omitempty"`
	Stream         bool   `json:"stream,omitempty"`
	KBPriority     bool   `json:"kb_priority,omitempty"`
}

// ChatResponse 对话响应
type ChatResponse struct {
	Decision      string                 `json:"decision"`
	Intent        IntentDetail           `json:"intent"`
	Answer        string                 `json:"answer"`
	Sources       []string               `json:"sources,omitempty"`
	RetrievedDocs []RetrievedDoc         `json:"retrieved_docs,omitempty"`
}

// IntentDetail 意图详情
type IntentDetail struct {
	Type          string  `json:"type"`
	SubIntent     string  `json:"sub_intent,omitempty"`
	NeedKnowledge bool    `json:"need_knowledge"`
	Confidence    float64 `json:"confidence"`
}

// RetrievedDoc 检索到的文档
type RetrievedDoc struct {
	ID      string  `json:"id"`
	Content string  `json:"content"`
	Score   float64 `json:"score"`
}

// Chat 统一对话接口（非流式）
func (h *ConversationHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	ctx := c.Request.Context()

	svcReq := &service.ConversationRequest{
		Query:          req.Query,
		ConversationID: req.ConversationID,
		Model:          req.Model,
		KBPriority:     req.KBPriority,
	}

	result := h.conversationSvc.ProcessQuery(ctx, svcReq)

	if !result.IsSuccess() {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "处理失败: " + result.Error.Error(),
		})
		return
	}

	resp := result.Data
	c.JSON(http.StatusOK, gin.H{
		"code":    200,
		"message": "success",
		"data": ChatResponse{
			Decision: string(resp.Decision),
			Intent: IntentDetail{
				Type:          resp.Intent.Type,
				SubIntent:     resp.Intent.SubIntent,
				NeedKnowledge: resp.Intent.NeedKnowledge,
				Confidence:    resp.Intent.Confidence,
			},
			Answer:        resp.Answer,
			Sources:       resp.Sources,
			RetrievedDocs: convertRetrievedDocs(resp.RetrievedDocs),
		},
	})
}

// ChatStream 统一对话接口（流式SSE）
func (h *ConversationHandler) ChatStream(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    400,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	ctx := c.Request.Context()

	svcReq := &service.ConversationRequest{
		Query:          req.Query,
		ConversationID: req.ConversationID,
		Model:          req.Model,
		KBPriority:     req.KBPriority,
	}

	eventChan, err := h.conversationSvc.ProcessQueryStream(ctx, svcReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    500,
			"message": "启动流失败: " + err.Error(),
		})
		return
	}

	// 设置SSE响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// 流式发送事件
	c.Stream(func(w io.Writer) bool {
		select {
		case event, ok := <-eventChan:
			if !ok {
				return false
			}

			data, _ := json.Marshal(event.Data)
			c.SSEvent(event.Type, string(data))
			return true

		case <-ctx.Done():
			return false
		}
	})
}

// convertRetrievedDocs 转换检索文档
func convertRetrievedDocs(docs []service.RetrievedDoc) []RetrievedDoc {
	result := make([]RetrievedDoc, 0, len(docs))
	for _, doc := range docs {
		result = append(result, RetrievedDoc{
			ID:      doc.ID,
			Content: doc.Content,
			Score:   doc.Score,
		})
	}
	return result
}
