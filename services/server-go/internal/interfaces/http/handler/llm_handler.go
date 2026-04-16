package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ddo/server-go/internal/application/service"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// LLMHandler LLM 请求处理
type LLMHandler struct {
	llmProxy service.LLMProxy
}

// NewLLMHandler 创建 LLM 处理器
func NewLLMHandler(llmProxy service.LLMProxy) *LLMHandler {
	return &LLMHandler{
		llmProxy: llmProxy,
	}
}

// Chat Chat 对话
// POST /api/v1/chat
func (h *LLMHandler) Chat(c *gin.Context) {
	var req service.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse(400, "invalid request: "+err.Error(), nil))
		return
	}

	ctx := c.Request.Context()

	// 检查是否流式请求
	stream := req.Stream

	if stream {
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")

		streamChan, err := h.llmProxy.ChatStream(ctx, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(500, err.Error(), nil))
			return
		}

		for chunk := range streamChan {
			c.Writer.Write([]byte("data: " + chunk + "\n\n"))
			c.Writer.Flush()
		}
		c.Writer.Write([]byte("data: [DONE]\n\n"))
		c.Writer.Flush()
		return
	}

	resp, err := h.llmProxy.Chat(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(500, err.Error(), nil))
		return
	}

	// 转换为统一的 DTO 格式
	inputTokens := 0
	outputTokens := 0
	if resp.Usage != nil {
		inputTokens = resp.Usage.InputTokens
		outputTokens = resp.Usage.OutputTokens
	}
	c.JSON(http.StatusOK, dto.ToChatResponse(resp.Content, inputTokens, outputTokens))
}

// NLP NLP 意图识别
// POST /api/v1/chat/nlp
func (h *LLMHandler) NLP(c *gin.Context) {
	var req service.NLPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse(400, "invalid request: "+err.Error(), nil))
		return
	}

	ctx := c.Request.Context()
	resp, err := h.llmProxy.NLP(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(500, err.Error(), nil))
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ChatStream 流式对话（备用方法）
// POST /api/v1/chat/stream
func (h *LLMHandler) ChatStream(c *gin.Context) {
	var req service.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse(400, "invalid request: "+err.Error(), nil))
		return
	}

	req.Stream = true

	ctx := c.Request.Context()
	streamChan, err := h.llmProxy.ChatStream(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.NewErrorResponse(500, err.Error(), nil))
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	for chunk := range streamChan {
		c.Writer.Write([]byte("data: " + chunk + "\n\n"))
		c.Writer.Flush()
	}
	c.Writer.Write([]byte("data: [DONE]\n\n"))
	c.Writer.Flush()
}
