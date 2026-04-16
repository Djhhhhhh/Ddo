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
	ragProxy      service.RAGProxy
}

// NewCreateKnowledgeUseCase 创建用例实例
func NewCreateKnowledgeUseCase(
	knowledgeRepo repository.KnowledgeRepository,
	ragProxy service.RAGProxy,
) CreateKnowledgeUseCase {
	return &createKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
		ragProxy:      ragProxy,
	}
}

// Execute 执行创建知识
func (uc *createKnowledgeUseCase) Execute(ctx context.Context, input CreateKnowledgeInput) *result.Result[CreateKnowledgeOutput] {
	// 1. 参数验证
	if input.Title == "" {
		return result.NewFailure[CreateKnowledgeOutput](fmt.Errorf("title is required"))
	}

	// 2. 序列化标签
	tagsJSON, err := json.Marshal(input.Tags)
	if err != nil {
		return result.NewFailure[CreateKnowledgeOutput](fmt.Errorf("marshal tags failed: %w", err))
	}

	// 3. 创建知识记录
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

	// 4. 调用 RAG 代理生成向量
	var embeddingID string
	if input.Content != "" {
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

	// 5. 返回结果
	return result.NewSuccess(CreateKnowledgeOutput{
		UUID:        knowledge.UUID,
		Title:       knowledge.Title,
		Category:    knowledge.Category,
		Tags:        input.Tags,
		Status:      knowledge.Status,
		EmbeddingID: embeddingID,
	})
}
