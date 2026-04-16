package knowledge

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/application/service"
	"github.com/ddo/server-go/internal/db/repository"
)

// SearchKnowledgeInput 语义搜索输入
type SearchKnowledgeInput struct {
	Query    string
	Limit    int
	MinScore float64 // 最小相似度阈值 (0.0-1.0)
}

// SearchResultItem 搜索结果项
type SearchResultItem struct {
	UUID        string  `json:"uuid"`
	Title       string  `json:"title"`
	Category    string  `json:"category"`
	Score       float64 `json:"score"`
	Content     string  `json:"content,omitempty"`
	EmbeddingID string  `json:"embedding_id"`
}

// SearchKnowledgeOutput 语义搜索输出
type SearchKnowledgeOutput struct {
	Results []SearchResultItem `json:"results"`
}

// SearchKnowledgeUseCase 语义搜索用例
type SearchKnowledgeUseCase interface {
	Execute(ctx context.Context, input SearchKnowledgeInput) *result.Result[SearchKnowledgeOutput]
}

// searchKnowledgeUseCase 语义搜索用例实现
type searchKnowledgeUseCase struct {
	knowledgeRepo repository.KnowledgeRepository
	ragProxy      service.RAGProxy
}

// NewSearchKnowledgeUseCase 创建用例实例
func NewSearchKnowledgeUseCase(
	knowledgeRepo repository.KnowledgeRepository,
	ragProxy service.RAGProxy,
) SearchKnowledgeUseCase {
	return &searchKnowledgeUseCase{
		knowledgeRepo: knowledgeRepo,
		ragProxy:      ragProxy,
	}
}

// Execute 执行搜索
func (uc *searchKnowledgeUseCase) Execute(ctx context.Context, input SearchKnowledgeInput) *result.Result[SearchKnowledgeOutput] {
	if input.Query == "" {
		return result.NewFailure[SearchKnowledgeOutput](fmt.Errorf("query is required"))
	}

	// 1. 调用 RAG 代理进行向量搜索
	vectorResults, err := uc.ragProxy.SearchVector(ctx, input.Query, input.Limit, input.MinScore)
	if err != nil {
		return result.NewFailure[SearchKnowledgeOutput](fmt.Errorf("vector search failed: %w", err))
	}

	// 2. 根据 embedding_id 查询 MySQL 补全元数据
	results := make([]SearchResultItem, 0, len(vectorResults))
	for _, vr := range vectorResults {
		// TODO: 可以通过 embedding_id 查询 knowledge 表获取 UUID
		// 目前简化处理，直接返回向量搜索结果
		results = append(results, SearchResultItem{
			UUID:        "", // 需要从 metadata 中获取
			Title:       "", // 需要从知识库反查
			Category:    "",
			Score:       vr.Score,
			Content:     vr.Content,
			EmbeddingID: vr.EmbeddingID,
		})
	}

	return result.NewSuccess(SearchKnowledgeOutput{
		Results: results,
	})
}
