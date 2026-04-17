package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/knowledge"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// KnowledgeHandler 知识库处理器
type KnowledgeHandler struct {
	createUseCase  knowledge.CreateKnowledgeUseCase
	listUseCase    knowledge.ListKnowledgeUseCase
	getUseCase     knowledge.GetKnowledgeUseCase
	deleteUseCase  knowledge.DeleteKnowledgeUseCase
	searchUseCase  knowledge.SearchKnowledgeUseCase
	askUseCase     knowledge.AskKnowledgeUseCase
	logger         *zap.Logger
}

// NewKnowledgeHandler 创建知识库处理器
func NewKnowledgeHandler(
	createUseCase knowledge.CreateKnowledgeUseCase,
	listUseCase knowledge.ListKnowledgeUseCase,
	getUseCase knowledge.GetKnowledgeUseCase,
	deleteUseCase knowledge.DeleteKnowledgeUseCase,
	searchUseCase knowledge.SearchKnowledgeUseCase,
	askUseCase knowledge.AskKnowledgeUseCase,
	logger *zap.Logger,
) *KnowledgeHandler {
	return &KnowledgeHandler{
		createUseCase:  createUseCase,
		listUseCase:    listUseCase,
		getUseCase:     getUseCase,
		deleteUseCase:  deleteUseCase,
		searchUseCase:  searchUseCase,
		askUseCase:     askUseCase,
		logger:         logger.With(zap.String("handler", "knowledge")),
	}
}

// CreateKnowledge 创建知识
func (h *KnowledgeHandler) CreateKnowledge(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.CreateKnowledgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.createUseCase.Execute(ctx, knowledge.CreateKnowledgeInput{
		Title:    req.Title,
		Content:  req.Content,
		Category: req.Category,
		Tags:     req.Tags,
		Source:   req.Source,
	})

	if !result.IsSuccess() {
		h.logger.Error("create knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.CreateKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.CreateKnowledgeData{
			UUID:        data.UUID,
			Title:       data.Title,
			Category:    data.Category,
			Categories:  data.Categories,
			Tags:        data.Tags,
			Status:      data.Status,
			EmbeddingID: data.EmbeddingID,
		},
		Timestamp: time.Now(),
	})
}

// ListKnowledge 查询知识列表
func (h *KnowledgeHandler) ListKnowledge(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.ListKnowledgeRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.listUseCase.Execute(ctx, knowledge.ListKnowledgeInput{
		Category: req.Category,
		Tag:      req.Tag,
		Keyword:  req.Keyword,
		Page:     req.Page,
		PageSize: req.PageSize,
	})

	if !result.IsSuccess() {
		h.logger.Error("list knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	items := make([]dto.KnowledgeItemDTO, 0, len(data.Items))
	for _, item := range data.Items {
		items = append(items, dto.KnowledgeItemDTO{
			UUID:     item.UUID,
			Title:    item.Title,
			Category: item.Category,
			Tags:     item.Tags,
			Source:   item.Source,
			Status:   item.Status,
		})
	}

	c.JSON(http.StatusOK, dto.ListKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListKnowledgeData{
			Total: data.Total,
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// GetKnowledge 获取知识详情
func (h *KnowledgeHandler) GetKnowledge(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.getUseCase.Execute(ctx, knowledge.GetKnowledgeInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("get knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusNotFound, dto.ErrorResponse{
			Code:    404,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	k := data.Knowledge
	c.JSON(http.StatusOK, dto.GetKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.KnowledgeDetailData{
			Knowledge: dto.KnowledgeDetailDTO{
				UUID:        k.UUID,
				Title:       k.Title,
				Content:     k.Content,
				Category:    k.Category,
				Tags:        k.Tags,
				Source:      k.Source,
				EmbeddingID: k.EmbeddingID,
				Status:      k.Status,
				CreatedAt:   k.CreatedAt,
				UpdatedAt:   k.UpdatedAt,
			},
		},
		Timestamp: time.Now(),
	})
}

// DeleteKnowledge 删除知识
func (h *KnowledgeHandler) DeleteKnowledge(c *gin.Context) {
	ctx := c.Request.Context()
	uuid := c.Param("uuid")

	if uuid == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "uuid is required",
			Data:    nil,
		})
		return
	}

	result := h.deleteUseCase.Execute(ctx, knowledge.DeleteKnowledgeInput{
		UUID: uuid,
	})

	if !result.IsSuccess() {
		h.logger.Error("delete knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, dto.DeleteKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.DeleteKnowledgeData{
			Success: result.Data.Success,
		},
		Timestamp: time.Now(),
	})
}

// SearchKnowledge 语义搜索
func (h *KnowledgeHandler) SearchKnowledge(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.SearchKnowledgeRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.searchUseCase.Execute(ctx, knowledge.SearchKnowledgeInput{
		Query:    req.Query,
		Limit:    req.Limit,
		MinScore: req.MinScore,
	})

	if !result.IsSuccess() {
		h.logger.Error("search knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	results := make([]dto.SearchResultItemDTO, 0, len(data.Results))
	for _, r := range data.Results {
		results = append(results, dto.SearchResultItemDTO{
			UUID:        r.UUID,
			Title:       r.Title,
			Category:    r.Category,
			Score:       r.Score,
			Content:     r.Content,
			EmbeddingID: r.EmbeddingID,
		})
	}

	c.JSON(http.StatusOK, dto.SearchKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.SearchKnowledgeData{
			Results: results,
		},
		Timestamp: time.Now(),
	})
}

// AskKnowledge RAG 问答
func (h *KnowledgeHandler) AskKnowledge(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.AskKnowledgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.askUseCase.Execute(ctx, knowledge.AskKnowledgeInput{
		Question:     req.Question,
		ContextLimit: req.ContextLimit,
		MinScore:     req.MinScore,
	})

	if !result.IsSuccess() {
		h.logger.Error("ask knowledge failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	data := result.Data
	c.JSON(http.StatusOK, dto.AskKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.AskKnowledgeData{
			Answer:  data.Answer,
			Sources: data.Sources,
		},
		Timestamp: time.Now(),
	})
}
