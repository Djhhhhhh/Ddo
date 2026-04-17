package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/ddo/server-go/internal/application/usecase/category"
	"github.com/ddo/server-go/internal/interfaces/http/dto"
)

// CategoryHandler 分类处理器
type CategoryHandler struct {
	listUseCase    category.ListCategoryUseCase
	createUseCase  category.CreateCategoryUseCase
	deleteUseCase  category.DeleteCategoryUseCase
	getKnowledgeUseCase category.GetKnowledgeByCategoryUseCase
	logger         *zap.Logger
}

// NewCategoryHandler 创建分类处理器
func NewCategoryHandler(
	listUseCase category.ListCategoryUseCase,
	createUseCase category.CreateCategoryUseCase,
	deleteUseCase category.DeleteCategoryUseCase,
	getKnowledgeUseCase category.GetKnowledgeByCategoryUseCase,
	logger *zap.Logger,
) *CategoryHandler {
	return &CategoryHandler{
		listUseCase:           listUseCase,
		createUseCase:         createUseCase,
		deleteUseCase:         deleteUseCase,
		getKnowledgeUseCase:   getKnowledgeUseCase,
		logger:                logger.With(zap.String("handler", "category")),
	}
}

// ListCategories 获取分类列表
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	ctx := c.Request.Context()

	result := h.listUseCase.Execute(ctx)

	if !result.IsSuccess() {
		h.logger.Error("list categories failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	categories := result.Data
	items := make([]dto.CategoryItemDTO, len(categories))
	for i, cat := range categories {
		items[i] = dto.CategoryItemDTO{
			ID:          cat.ID,
			Name:        cat.Name,
			Description: cat.Description,
			CreatedAt:   cat.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, dto.ListCategoryResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListCategoryData{
			Total: int64(len(categories)),
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// CreateCategory 创建分类
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	ctx := c.Request.Context()

	var req dto.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "invalid request: " + err.Error(),
			Data:    nil,
		})
		return
	}

	result := h.createUseCase.Execute(ctx, category.CreateCategoryInput{
		Name:        req.Name,
		Description: req.Description,
	})

	if !result.IsSuccess() {
		h.logger.Error("create category failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	cat := result.Data
	c.JSON(http.StatusOK, dto.CategoryResponse{
		Code:    200,
		Message: "success",
		Data: dto.CategoryData{
			ID:          cat.ID,
			Name:        cat.Name,
			Description: cat.Description,
			CreatedAt:   cat.CreatedAt,
			UpdatedAt:   cat.UpdatedAt,
		},
		Timestamp: time.Now(),
	})
}

// DeleteCategory 删除分类
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	ctx := c.Request.Context()

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "category id is required",
			Data:    nil,
		})
		return
	}

	result := h.deleteUseCase.Execute(ctx, id)

	if !result.IsSuccess() {
		h.logger.Error("delete category failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	c.JSON(http.StatusOK, dto.CategoryResponse{
		Code:    200,
		Message: "success",
		Data:    dto.CategoryData{},
		Timestamp: time.Now(),
	})
}

// GetKnowledgeByCategory 获取某分类下的知识列表
func (h *CategoryHandler) GetKnowledgeByCategory(c *gin.Context) {
	ctx := c.Request.Context()

	categoryID := c.Param("id")
	if categoryID == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Code:    400,
			Message: "category id is required",
			Data:    nil,
		})
		return
	}

	result := h.getKnowledgeUseCase.Execute(ctx, categoryID)

	if !result.IsSuccess() {
		h.logger.Error("get knowledge by category failed", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Code:    500,
			Message: result.Error.Error(),
			Data:    nil,
		})
		return
	}

	knowledgeList := result.Data
	items := make([]dto.KnowledgeItemDTO, len(knowledgeList))
	for i, k := range knowledgeList {
		items[i] = dto.KnowledgeItemDTO{
			UUID:     k.UUID,
			Title:    k.Title,
			Category: k.Category,
			Tags:     parseTags(k.Tags),
		}
	}

	c.JSON(http.StatusOK, dto.ListKnowledgeResponse{
		Code:    200,
		Message: "success",
		Data: dto.ListKnowledgeData{
			Total: int64(len(knowledgeList)),
			Items: items,
		},
		Timestamp: time.Now(),
	})
}

// parseTags 解析 JSON 标签字符串
func parseTags(tagsJSON string) []string {
	if tagsJSON == "" || tagsJSON == "[]" {
		return nil
	}
	// 简单解析：去掉首尾的中括号
	if len(tagsJSON) >= 2 && tagsJSON[0] == '[' && tagsJSON[len(tagsJSON)-1] == ']' {
		tagsJSON = tagsJSON[1 : len(tagsJSON)-1]
	}
	// 解析引号包裹的字符串
	var tags []string
	start := -1
	for i, ch := range tagsJSON {
		if ch == '"' && start == -1 {
			start = i + 1
		} else if ch == '"' && start != -1 {
			tags = append(tags, tagsJSON[start:i])
			start = -1
		}
	}
	return tags
}