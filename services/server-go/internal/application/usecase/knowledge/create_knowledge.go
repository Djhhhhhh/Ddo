package knowledge

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/application/service"
	"github.com/ddo/server-go/internal/db/models"
	"github.com/ddo/server-go/internal/db/repository"
)

// CreateKnowledgeInput 创建知识输入
type CreateKnowledgeInput struct {
	Title    string
	Content  string
	Category string
	Tags     []string
	Source   string
}

// CreateKnowledgeOutput 创建知识输出
type CreateKnowledgeOutput struct {
	UUID        string   `json:"uuid"`
	Title       string   `json:"title"`
	Category    string   `json:"category"`
	Categories  []string `json:"categories"`
	Tags        []string `json:"tags"`
	Status      string   `json:"status"`
	EmbeddingID string   `json:"embedding_id,omitempty"`
}

// CreateKnowledgeUseCase 创建知识用例
type CreateKnowledgeUseCase interface {
	Execute(ctx context.Context, input CreateKnowledgeInput) *result.Result[CreateKnowledgeOutput]
}

// createKnowledgeUseCase 创建知识用例实现
type createKnowledgeUseCase struct {
	knowledgeRepo repository.KnowledgeRepository
	categoryRepo  repository.CategoryRepository
	ragProxy      service.RAGProxy
	llmProxy      service.LLMProxy
}

// NewCreateKnowledgeUseCase 创建用例实例
func NewCreateKnowledgeUseCase(
	knowledgeRepo repository.KnowledgeRepository,
	categoryRepo repository.CategoryRepository,
	ragProxy service.RAGProxy,
	llmProxy service.LLMProxy,
) CreateKnowledgeUseCase {
	return &createKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
		categoryRepo:  categoryRepo,
		ragProxy:      ragProxy,
		llmProxy:      llmProxy,
	}
}

// Execute 执行创建知识
func (uc *createKnowledgeUseCase) Execute(ctx context.Context, input CreateKnowledgeInput) *result.Result[CreateKnowledgeOutput] {
	// 1. 参数验证
	if input.Title == "" {
		return result.NewFailure[CreateKnowledgeOutput](fmt.Errorf("title is required"))
	}

	// 2. 调用 llm-py 分析 tags 和 categories（如果内容不为空）
	var aiTags []string
	var aiCategories []string
	var isNewCategories []bool

	if input.Content != "" && uc.llmProxy != nil {
		analyzeResp, err := uc.llmProxy.AnalyzeKnowledge(ctx, &service.AnalyzeRequest{
			Content: input.Content,
			Title:   input.Title,
			Context: "knowledge_base",
		})
		if err == nil && analyzeResp != nil {
			aiTags = analyzeResp.Tags
			aiCategories = analyzeResp.Categories
			isNewCategories = analyzeResp.IsNewCategories
			// 如果用户没有提供 tags，使用 AI 分析的 tags
			if len(input.Tags) == 0 {
				input.Tags = aiTags
			}
			// 如果用户没有提供 category，使用第一个 AI 分类
			if input.Category == "" && len(aiCategories) > 0 {
				input.Category = aiCategories[0]
			}
		}
		// 注意：AI 分析失败不影响知识创建，使用用户提供的值
	}

	// 3. 处理 category 自动创建
	var categoryIDs []string
	if len(aiCategories) > 0 {
		for i, catName := range aiCategories {
			var catID string
			// 尝试获取已有分类
			existing, err := uc.categoryRepo.GetByName(ctx, catName)
			if err != nil {
				// 分类不存在，需要创建
				if isNewCategories == nil || len(isNewCategories) <= i || isNewCategories[i] {
					newCat := &models.Category{
						Name: catName,
					}
					if err := uc.categoryRepo.Create(ctx, newCat); err == nil {
						catID = newCat.ID
					}
				}
			} else {
				catID = existing.ID
			}
			if catID != "" {
				categoryIDs = append(categoryIDs, catID)
			}
		}
	}

	// 4. 序列化标签
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return result.NewFailure[CreateKnowledgeOutput](fmt.Errorf("marshal tags failed: %w", err))
	}

	// 5. 创建知识记录
	knowledge := &models.Knowledge{
		Title:    input.Title,
		Content:  input.Content,
		Category: input.Category,
		Tags:     string(tagsJSON),
		Source:   input.Source,
		Status:   models.KnowledgeStatusActive,
	}

	if err := uc.knowledgeRepo.Create(ctx, knowledge); err != nil {
		return result.NewFailure[CreateKnowledgeOutput](fmt.Errorf("create knowledge failed: %w", err))
	}

	// 6. 创建知识-分类关联
	for _, catID := range categoryIDs {
		_ = uc.categoryRepo.AddKnowledgeCategory(ctx, knowledge.UUID, catID)
	}

	// 7. 调用 RAG 代理生成向量
	var embeddingID string
	if input.Content != "" && uc.ragProxy != nil {
		metadata := map[string]interface{}{
			"knowledge_uuid": knowledge.UUID,
			"title":          knowledge.Title,
			"category":       knowledge.Category,
		}

		ragResp, err := uc.ragProxy.EmbedDocument(ctx, input.Content, metadata)
		if err == nil && ragResp != nil {
			embeddingID = ragResp.GetEmbeddingID()
			// 更新 embedding_id
			_ = uc.knowledgeRepo.UpdateEmbeddingID(ctx, knowledge.UUID, embeddingID)
		}
		// 注意：嵌入失败不影响知识创建，只记录日志即可
	}

	// 8. 返回结果
	return result.NewSuccess(CreateKnowledgeOutput{
		UUID:        knowledge.UUID,
		Title:       knowledge.Title,
		Category:    knowledge.Category,
		Categories:  aiCategories,
		Tags:        input.Tags,
		Status:      knowledge.Status,
		EmbeddingID: embeddingID,
	})
}
