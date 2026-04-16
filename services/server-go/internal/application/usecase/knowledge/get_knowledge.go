package knowledge

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/db/repository"
)

// GetKnowledgeInput 获取知识详情输入
type GetKnowledgeInput struct {
	UUID string
}

// KnowledgeDetail 知识详情
type KnowledgeDetail struct {
	UUID        string   `json:"uuid"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Category    string   `json:"category"`
	Tags        []string `json:"tags"`
	Source      string   `json:"source"`
	EmbeddingID string   `json:"embedding_id,omitempty"`
	Status      string   `json:"status"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// GetKnowledgeOutput 获取知识详情输出
type GetKnowledgeOutput struct {
	Knowledge KnowledgeDetail `json:"knowledge"`
}

// GetKnowledgeUseCase 获取知识详情用例
type GetKnowledgeUseCase interface {
	Execute(ctx context.Context, input GetKnowledgeInput) *result.Result[GetKnowledgeOutput]
}

// getKnowledgeUseCase 获取知识详情用例实现
type getKnowledgeUseCase struct {
	knowledgeRepo repository.KnowledgeRepository
}

// NewGetKnowledgeUseCase 创建用例实例
func NewGetKnowledgeUseCase(knowledgeRepo repository.KnowledgeRepository) GetKnowledgeUseCase {
	return &getKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
	}
}

// Execute 执行获取详情
func (uc *getKnowledgeUseCase) Execute(ctx context.Context, input GetKnowledgeInput) *result.Result[GetKnowledgeOutput] {
	if input.UUID == "" {
		return result.NewFailure[GetKnowledgeOutput](fmt.Errorf("uuid is required"))
	}

	knowledge, err := uc.knowledgeRepo.GetByUUID(ctx, input.UUID)
	if err != nil {
		return result.NewFailure[GetKnowledgeOutput](err)
	}

	// 解析标签
	tags := []string{}
	if knowledge.Tags != "" {
		_ = json.Unmarshal([]byte(knowledge.Tags), &tags)
	}

	detail := KnowledgeDetail{
		UUID:        knowledge.UUID,
		Title:       knowledge.Title,
		Content:     knowledge.Content,
		Category:    knowledge.Category,
		Tags:        tags,
		Source:      knowledge.Source,
		EmbeddingID: knowledge.EmbeddingID,
		Status:      knowledge.Status,
		CreatedAt:   knowledge.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   knowledge.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	return result.NewSuccess(GetKnowledgeOutput{
		Knowledge: detail,
	})
}
