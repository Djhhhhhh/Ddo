package knowledge

import (
	"context"
	"fmt"

	"github.com/ddo/server-go/internal/application/result"
	"github.com/ddo/server-go/internal/application/service"
)

// AskKnowledgeInput RAG 问答输入
type AskKnowledgeInput struct {
	Question     string
	ContextLimit int
	MinScore     float64 // 最小相似度阈值 (0.0-1.0)
}

// AskKnowledgeOutput RAG 问答输出
type AskKnowledgeOutput struct {
	Answer  string   `json:"answer"`
	Sources []string `json:"sources"`
}

// AskKnowledgeUseCase RAG 问答用例
type AskKnowledgeUseCase interface {
	Execute(ctx context.Context, input AskKnowledgeInput) *result.Result[AskKnowledgeOutput]
}

// askKnowledgeUseCase RAG 问答用例实现
type askKnowledgeUseCase struct {
	ragProxy service.RAGProxy
}

// NewAskKnowledgeUseCase 创建用例实例
func NewAskKnowledgeUseCase(ragProxy service.RAGProxy) AskKnowledgeUseCase {
	return &askKnowledgeUseCase{
		ragProxy: ragProxy,
	}
}

// Execute 执行问答
func (uc *askKnowledgeUseCase) Execute(ctx context.Context, input AskKnowledgeInput) *result.Result[AskKnowledgeOutput] {
	if input.Question == "" {
		return result.NewFailure[AskKnowledgeOutput](fmt.Errorf("question is required"))
	}

	// 1. 先搜索相关文档
	searchLimit := input.ContextLimit
	if searchLimit < 1 || searchLimit > 10 {
		searchLimit = 3
	}
	// 使用传入的 minScore，默认 0.3
	minScore := input.MinScore
	if minScore <= 0 || minScore > 1 {
		minScore = 0.3
	}

	searchResults, err := uc.ragProxy.SearchVector(ctx, input.Question, searchLimit, minScore)
	if err != nil {
		// 搜索失败也可以继续，只是没有上下文
		searchResults = []service.SearchResult{}
	}

	// 2. 提取上下文文档
	contextDocs := make([]string, 0, len(searchResults))
	for _, sr := range searchResults {
		if sr.Content != "" {
			contextDocs = append(contextDocs, sr.Content)
		}
	}

	// 3. 调用 RAG 问答
	askResp, err := uc.ragProxy.AskRAG(ctx, input.Question, contextDocs, minScore)
	if err != nil {
		return result.NewFailure[AskKnowledgeOutput](fmt.Errorf("rag ask failed: %w", err))
	}

	return result.NewSuccess(AskKnowledgeOutput{
		Answer:  askResp.Answer,
		Sources: askResp.Sources,
	})
}
